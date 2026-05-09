// Swiftlift — localStorage persistence layer (plain JS, no React)

const _SK = {
  sessions: 'swiftlift_sessions',
  hiit:     'swiftlift_hiit',
  profile:  'swiftlift_profile',
  log:      'swiftlift_log',
  overload: 'swiftlift_overload',
  settings: 'swiftlift_settings',
  presets:  'swiftlift_presets',
  reminder: 'swiftlift_reminder_dismissed',
};

function _sl(key, fallback) {
  try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function _ss(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// ---- Sessions ----
// [{date, type, focus, durationMin, completed, note}]
const loadSessions = () => _sl(_SK.sessions, []);
const saveSessions = v  => _ss(_SK.sessions, v);
function addSession(s) { const arr = loadSessions(); arr.push(s); saveSessions(arr); }
function todaySessionDone() {
  const iso = new Date().toISOString().slice(0, 10);
  return loadSessions().some(s => s.date === iso && s.completed);
}

// ---- HIIT state ----
// {level, rotationIndex}
const loadHiitState = () => _sl(_SK.hiit, { level: 'easy', rotationIndex: 0 });
const saveHiitState = v  => _ss(_SK.hiit, v);

// ---- Profile ----
const loadProfile  = fallback => _sl(_SK.profile, fallback);
const saveProfile  = v        => _ss(_SK.profile, v);

// ---- Settings ----
const loadSettings = fallback => _sl(_SK.settings, fallback);
const saveSettings = v        => _ss(_SK.settings, v);

// ---- Presets ----
const loadPresets  = fallback => _sl(_SK.presets, fallback);
const savePresets  = v        => _ss(_SK.presets, v);

// ---- Nutrition log ----
// {[isoDate]: {protein:[...], water:[...]}}
const loadLog = () => _sl(_SK.log, {});
const saveLog = v  => _ss(_SK.log, v);

// ---- Overload tracking ----
// {[exerciseName]: {lastEventDate, history:[{date, reps, weight}]}}
const loadOverload = () => _sl(_SK.overload, {});
const saveOverload = v  => _ss(_SK.overload, v);

// ---- Reminder dismissed date ----
const loadReminderDismissed = () => _sl(_SK.reminder, null);
const saveReminderDismissed = v  => _ss(_SK.reminder, v);

// ---- Derived helpers ----

// Parse profile.since to an ISO date string, handling both "2026-05-09" and legacy "May 2026".
// Returns null for unparseable values (no filter applied = safe fallback).
function parseSinceDate(since) {
  if (!since) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(since)) {
    const d = new Date(since + 'T00:00:00');
    return isNaN(d.getTime()) ? null : since;
  }
  // Legacy "Mon YYYY" format → first of that month
  const m = since.match(/^([A-Za-z]{3})\s+(\d{4})$/);
  if (m) {
    const idx = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(m[1]);
    if (idx !== -1) return `${m[2]}-${String(idx + 1).padStart(2, '0')}-01`;
  }
  return null;
}

// Day keys completed this calendar week (Mon–Sun), optionally capped at join date.
function getCompletedThisWeek(sinceIso) {
  const sessions = loadSessions();
  const today = new Date();
  const dow = today.getDay(); // 0=Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  const KEYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return sessions
    .filter(s => {
      const d = new Date(s.date + 'T00:00:00');
      return d >= monday && d <= sunday && s.completed && (!sinceIso || s.date >= sinceIso);
    })
    .map(s => KEYS[new Date(s.date + 'T00:00:00').getDay()]);
}

// Consecutive training days streak (rest days are skipped, not counted as breaks).
// Streak cannot extend before sinceIso (join date).
function getCurrentStreak(sinceIso) {
  const sessions = loadSessions();
  const done = new Set(sessions.filter(s => s.completed).map(s => s.date));
  const TRAINING = new Set([1, 2, 3, 5, 6]); // Mon Tue Wed Fri Sat
  let streak = 0;
  const todayIso = new Date().toISOString().slice(0, 10);
  let cursorUtc = new Date(todayIso + 'T12:00:00Z');
  // If today is a training day but not yet done, start checking from yesterday
  if (TRAINING.has(cursorUtc.getUTCDay()) && !done.has(todayIso)) {
    cursorUtc.setUTCDate(cursorUtc.getUTCDate() - 1);
  }
  for (let i = 0; i < 365; i++) {
    const iso = cursorUtc.toISOString().slice(0, 10);
    if (sinceIso && iso < sinceIso) break;
    if (TRAINING.has(cursorUtc.getUTCDay())) {
      if (done.has(iso)) { streak++; }
      else { break; }
    }
    cursorUtc.setUTCDate(cursorUtc.getUTCDate() - 1);
  }
  return streak;
}

// Build activity history array for ActivityTab from real localStorage sessions.
// Returns up to last 35 days (capped at sinceIso if provided).
function buildActivityHistory(sinceIso) {
  const sessions = loadSessions();
  const byDate = new Map(sessions.map(s => [s.date, s]));
  const TRAINING = new Set([1, 2, 3, 5, 6]);
  const FOCUS_FOR_DOW = [null, 'PUSH', 'HIIT', 'LEGS', null, 'PULL', 'HIIT'];
  const todayIso = new Date().toISOString().slice(0, 10);
  const todayUtc = new Date(todayIso + 'T12:00:00Z');
  const out = [];
  for (let i = 34; i >= 0; i--) {
    const d = new Date(todayUtc);
    d.setUTCDate(todayUtc.getUTCDate() - i);
    const iso = d.toISOString().slice(0, 10);
    if (sinceIso && iso < sinceIso) continue;
    const dow = d.getUTCDay();
    if (!TRAINING.has(dow)) {
      out.push({ date: iso, type: 'rest' });
      continue;
    }
    const s = byDate.get(iso);
    if (s && s.completed) {
      out.push({
        date: iso,
        type: s.type || 'strength',
        focus: s.focus,
        duration: s.durationMin || 18,
        setsCompleted: s.setsCompleted || 9,
        totalSets: s.totalSets || 9,
      });
    } else if (i > 0) {
      // Past day with no completion = missed
      out.push({ date: iso, type: 'missed', focus: FOCUS_FOR_DOW[dow] });
    }
    // Today's not-yet-completed session: omit (don't mark as missed yet)
  }
  return out;
}

// Wipe all swiftlift_* keys from localStorage (full reset to new-user state)
function resetAllData() {
  Object.values(_SK).forEach(key => localStorage.removeItem(key));
}

// Check if reminder banner should show
// True when: training day + hour >= 8 + today not done + not dismissed today
function shouldShowReminder() {
  const now = new Date();
  const dow = now.getDay();
  if (![1, 2, 3, 5, 6].includes(dow)) return false;
  if (now.getHours() < 8) return false;
  if (todaySessionDone()) return false;
  const todayIso = now.toISOString().slice(0, 10);
  if (loadReminderDismissed() === todayIso) return false;
  return true;
}

// Record one exercise set log and update overload tracking.
// A "personal best event" resets the 14-day clock.
function recordExerciseLog(exerciseName, reps, weight) {
  const overload = loadOverload();
  const today = new Date().toISOString().slice(0, 10);
  const entry = overload[exerciseName] || { lastEventDate: today, history: [] };

  const prevBestScore = entry.history.reduce((best, h) => {
    const score = (h.weight || 0) * 1000 + (h.reps || 0);
    return score > best ? score : best;
  }, 0);
  const newScore = (weight || 0) * 1000 + (reps || 0);

  entry.history.push({ date: today, reps: reps || 0, weight: weight || 0 });
  if (newScore > prevBestScore || entry.history.length === 1) {
    entry.lastEventDate = today; // reset 14-day clock on new PB
  }

  overload[exerciseName] = entry;
  saveOverload(overload);
}

// Returns [{exercise, daysSince}] for exercises due a progressive overload
function getOverloadAlerts() {
  const overload = loadOverload();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const alerts = [];
  // Check all exercises across all sessions
  ['PUSH', 'LEGS', 'PULL'].forEach(focus => {
    const session = (typeof SESSIONS !== 'undefined') ? SESSIONS[focus] : null;
    if (!session) return;
    session.exercises.forEach(ex => {
      const data = overload[ex.name];
      if (!data || data.history.length < 4) return;
      const lastDate = new Date(data.lastEventDate + 'T00:00:00');
      const daysSince = Math.round((today - lastDate) / 86400000);
      if (daysSince >= 14) alerts.push({ exercise: ex.name, daysSince });
    });
  });
  return alerts;
}

Object.assign(window, {
  loadSessions, saveSessions, addSession, todaySessionDone,
  loadHiitState, saveHiitState,
  loadProfile, saveProfile,
  loadSettings, saveSettings,
  loadPresets, savePresets,
  loadLog, saveLog,
  loadOverload, saveOverload,
  loadReminderDismissed, saveReminderDismissed,
  parseSinceDate, resetAllData,
  getCompletedThisWeek, getCurrentStreak, buildActivityHistory, shouldShowReminder,
  recordExerciseLog, getOverloadAlerts,
});
