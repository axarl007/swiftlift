// Swiftlift — localStorage persistence layer (plain JS, no React)

const _SK = {
  sessions:  'swiftlift_sessions',
  hiit:      'swiftlift_hiit',
  profile:   'swiftlift_profile',
  log:       'swiftlift_log',
  overload:  'swiftlift_overload',
  settings:  'swiftlift_settings',
  presets:   'swiftlift_presets',
  reminder:  'swiftlift_reminder_dismissed',
  weightLog: 'swiftlift_weight_log',
};

function _sl(key, fallback) {
  try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function _ss(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// ---- Sessions ----
// [{id, date, type, focus, durationMin, source, setsCompleted, totalSets, completed, note}]
const loadSessions = () => _sl(_SK.sessions, []);
const saveSessions = v  => _ss(_SK.sessions, v);
function addSession(s) {
  const arr = loadSessions();
  const isDup = s.id
    ? arr.some(x => x.id === s.id)
    : arr.some(x => x.date === s.date && x.focus === s.focus && x.completed);
  if (isDup) return;
  arr.push(s);
  saveSessions(arr);
}
function todaySessionDone() {
  const iso = new Date().toISOString().slice(0, 10);
  return loadSessions().some(s => s.date === iso && s.completed);
}

// ---- HIIT state ----
// {level, rotationIndex, overrides: {[level]: {added:[], removed:[]}}}
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
// {[exerciseName]: {lastPbDate, snoozedUntil, history:[{date, reps, weightKg}]}}
const loadOverload = () => _sl(_SK.overload, {});
const saveOverload = v  => _ss(_SK.overload, v);

// ---- Reminder dismissed date ----
const loadReminderDismissed = () => _sl(_SK.reminder, null);
const saveReminderDismissed = v  => _ss(_SK.reminder, v);

// ---- Weight log ----
// [{id, date, kg}] — one entry per day max, always stored in kg
const loadWeightLog = () => _sl(_SK.weightLog, []);
const saveWeightLog = v  => _ss(_SK.weightLog, v);

// ---- Schema migration ----
function migrateSchemaV2() {
  const profile = loadProfile({});
  if ((profile.schemaVersion || 0) >= 2) return;

  // 1. Move profile.weight → weight log
  if (profile.weight != null) {
    const kg = profile.weightUnit === 'lb' ? profile.weight * 0.4536 : profile.weight;
    const today = new Date().toISOString().slice(0, 10);
    // Use join date as the entry date if available; fall back to today
    const entryDate = parseSinceDate(profile.since) || today;
    const wl = loadWeightLog();
    if (!wl.some(e => e.date === entryDate)) {
      wl.push({ id: 'wl_' + Math.random().toString(36).slice(2, 9), date: entryDate, kg: Math.round(kg * 10) / 10 });
      wl.sort((a, b) => a.date.localeCompare(b.date));
      saveWeightLog(wl);
    }
    delete profile.weight;
  }

  // 2. Migrate overload field names: lastEventDate → lastPbDate, weight → weightKg in history
  const overload = loadOverload();
  Object.keys(overload).forEach(ex => {
    const entry = overload[ex];
    if (entry.lastEventDate && !entry.lastPbDate) {
      entry.lastPbDate = entry.lastEventDate;
      delete entry.lastEventDate;
    }
    (entry.history || []).forEach(h => {
      if (h.weight != null && h.weightKg == null) {
        h.weightKg = h.weight;
        delete h.weight;
      }
    });
  });
  saveOverload(overload);

  // 3. Remove settings keys that moved to profile
  const settings = loadSettings({});
  delete settings.weightUnit;
  delete settings.distanceUnit;
  saveSettings(settings);

  // 4. Mark migration done
  profile.schemaVersion = 2;
  saveProfile(profile);
}

function migrateSchemaV3() {
  const profile = loadProfile({});
  if ((profile.schemaVersion || 0) >= 3) return;
  profile.since = '2026-04-27';
  profile.schemaVersion = 3;
  saveProfile(profile);
}

function migrateSchemaV4() {
  const profile = loadProfile({});
  if ((profile.schemaVersion || 0) >= 4) return;
  // v3 wrongly overwrote profile.since with APP_START_ISO for all users.
  // Restore to first completed session date, or today if no sessions yet.
  if (profile.since === '2026-04-27') {
    const sessions = loadSessions();
    const completed = sessions.filter(s => s.completed).sort((a, b) => a.date.localeCompare(b.date));
    profile.since = completed.length > 0 ? completed[0].date : new Date().toISOString().slice(0, 10);
  }
  profile.schemaVersion = 4;
  saveProfile(profile);
}

// ---- WEEK-derived helpers (lazily evaluated — WEEK loads after this file) ----

function _trainingDowSet() {
  const KEYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  return new Set(WEEK.filter(d => d.type !== 'rest').map(d => KEYS.indexOf(d.key)));
}

function _focusForDowArray() {
  const KEYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const map = [null,null,null,null,null,null,null];
  WEEK.forEach(d => { map[KEYS.indexOf(d.key)] = d.focus; });
  return map;
}

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

// Day keys completed for the week at weekOffset (0=current, -1=last, +1=next), capped at join date.
// Uses UTC dates to stay consistent with how session dates (ISO strings) are stored.
function getCompletedForWeek(sinceIso, weekOffset) {
  const sessions = loadSessions();
  const todayIso = new Date().toISOString().slice(0, 10);
  const todayUtc = new Date(todayIso + 'T12:00:00Z');
  const dow = todayUtc.getUTCDay();
  const mondayUtc = new Date(todayUtc);
  mondayUtc.setUTCDate(todayUtc.getUTCDate() - (dow === 0 ? 6 : dow - 1) + weekOffset * 7);
  const mondayIso = mondayUtc.toISOString().slice(0, 10);
  const sundayUtc = new Date(mondayUtc);
  sundayUtc.setUTCDate(mondayUtc.getUTCDate() + 6);
  const sundayIso = sundayUtc.toISOString().slice(0, 10);
  const KEYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return sessions
    .filter(s => s.date >= mondayIso && s.date <= sundayIso && s.completed)
    .map(s => KEYS[new Date(s.date + 'T12:00:00Z').getUTCDay()]);
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
      return d >= monday && d <= sunday && s.completed;
    })
    .map(s => KEYS[new Date(s.date + 'T00:00:00').getDay()]);
}

// Consecutive training days streak (rest days are skipped, not counted as breaks).
// Streak cannot extend before sinceIso (join date).
function getCurrentStreak(sinceIso) {
  const sessions = loadSessions();
  const done = new Set(sessions.filter(s => s.completed).map(s => s.date));
  // Don't let profile.since cut off backdated sessions — use whichever is earlier
  const firstDoneDate = done.size > 0 ? [...done].sort()[0] : null;
  const effectiveSince = firstDoneDate && sinceIso && sinceIso > firstDoneDate ? firstDoneDate : sinceIso;
  const TRAINING = _trainingDowSet();
  let streak = 0;
  const todayIso = new Date().toISOString().slice(0, 10);
  let cursorUtc = new Date(todayIso + 'T12:00:00Z');
  // If today is a training day but not yet done, start checking from yesterday
  if (TRAINING.has(cursorUtc.getUTCDay()) && !done.has(todayIso)) {
    cursorUtc.setUTCDate(cursorUtc.getUTCDate() - 1);
  }
  for (let i = 0; i < 365; i++) {
    const iso = cursorUtc.toISOString().slice(0, 10);
    if (effectiveSince && iso < effectiveSince) break;
    if (TRAINING.has(cursorUtc.getUTCDay())) {
      if (done.has(iso)) { streak++; }
      else { break; }
    }
    cursorUtc.setUTCDate(cursorUtc.getUTCDate() - 1);
  }
  return streak;
}

// Build activity history array for ActivityTab from real localStorage sessions.
// Returns up to last 35 days. If no completed sessions exist, returns empty array.
// "Missed" entries only appear from the first completed session date onwards.
function buildActivityHistory(sinceIso) {
  const sessions = loadSessions();
  const completedSessions = sessions.filter(s => s.completed);
  if (completedSessions.length === 0) return [];
  const firstSessionDate = completedSessions.reduce(
    (min, s) => s.date < min ? s.date : min, completedSessions[0].date);
  const effectiveSince = firstSessionDate;
  const byDate = new Map(sessions.map(s => [s.date, s]));
  const TRAINING = _trainingDowSet();
  const FOCUS_FOR_DOW = _focusForDowArray();
  const todayIso = new Date().toISOString().slice(0, 10);
  const todayUtc = new Date(todayIso + 'T12:00:00Z');
  const out = [];
  for (let i = 34; i >= 0; i--) {
    const d = new Date(todayUtc);
    d.setUTCDate(todayUtc.getUTCDate() - i);
    const iso = d.toISOString().slice(0, 10);
    if (iso < effectiveSince) continue;
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
  if (!_trainingDowSet().has(now.getDay())) return false;
  if (now.getHours() < 8) return false;
  if (todaySessionDone()) return false;
  const todayIso = now.toISOString().slice(0, 10);
  if (loadReminderDismissed() === todayIso) return false;
  return true;
}

// Record one exercise set log and update overload tracking.
// weightKg must already be in kg — caller converts if the user's unit is lb.
// PB = new volume (weightKg × reps) strictly exceeds previous best, or first entry.
function recordExerciseLog(exerciseName, reps, weightKg) {
  const overload = loadOverload();
  const today = new Date().toISOString().slice(0, 10);
  const entry = overload[exerciseName] || { lastPbDate: today, history: [] };

  // For weighted sets use volume (kg × reps); for bodyweight use reps alone
  function _vol(wkg, r) { return wkg > 0 ? wkg * (r || 0) : (r || 0); }
  const prevBestVolume = entry.history.reduce((best, h) => {
    const v = _vol(h.weightKg || 0, h.reps);
    return v > best ? v : best;
  }, 0);
  const newVolume = _vol(weightKg || 0, reps);

  entry.history.push({ date: today, reps: reps || 0, weightKg: weightKg || 0 });
  if (newVolume > prevBestVolume || entry.history.length === 1) {
    entry.lastPbDate = today;
  }

  overload[exerciseName] = entry;
  saveOverload(overload);
}

// Snooze an overload alert for 7 days (persisted to storage)
function snoozeOverloadAlert(exerciseName) {
  const overload = loadOverload();
  if (!overload[exerciseName]) return;
  const snoozeUntil = new Date();
  snoozeUntil.setDate(snoozeUntil.getDate() + 7);
  overload[exerciseName].snoozedUntil = snoozeUntil.toISOString().slice(0, 10);
  saveOverload(overload);
}

// Returns [{exercise, daysSince}] for exercises due a progressive overload.
// Skips exercises that are currently snoozed.
function getOverloadAlerts() {
  const overload = loadOverload();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = new Date().toISOString().slice(0, 10);
  const alerts = [];
  ['PUSH', 'LEGS', 'PULL'].forEach(focus => {
    const session = (typeof SESSIONS !== 'undefined') ? SESSIONS[focus] : null;
    if (!session) return;
    session.exercises.forEach(ex => {
      const data = overload[ex.name];
      if (!data || data.history.length < 4) return;
      // Skip if snoozed
      if (data.snoozedUntil && data.snoozedUntil >= todayIso) return;
      // Support both old (lastEventDate) and new (lastPbDate) field names
      const pbDate = data.lastPbDate || data.lastEventDate;
      if (!pbDate) return;
      const lastDate = new Date(pbDate + 'T00:00:00');
      const daysSince = Math.round((today - lastDate) / 86400000);
      if (daysSince >= 14) alerts.push({ exercise: ex.name, daysSince });
    });
  });
  return alerts;
}

// Prune old data to keep localStorage lean:
// - Nutrition log: entries older than 90 days
// - Sessions: entries older than 365 days
// - Overload history: cap at 50 entries per exercise (keep newest)
function pruneOldLogs() {
  // Nutrition log (90 days)
  const log = loadLog();
  const cutoff90 = new Date();
  cutoff90.setDate(cutoff90.getDate() - 90);
  const cutoff90Iso = cutoff90.toISOString().slice(0, 10);
  let prunedLog = false;
  Object.keys(log).forEach(iso => {
    if (iso < cutoff90Iso) { delete log[iso]; prunedLog = true; }
  });
  if (prunedLog) saveLog(log);

  // Sessions (365 days)
  const sessions = loadSessions();
  const cutoff365 = new Date();
  cutoff365.setDate(cutoff365.getDate() - 365);
  const cutoff365Iso = cutoff365.toISOString().slice(0, 10);
  const trimmedSessions = sessions.filter(s => s.date >= cutoff365Iso);
  if (trimmedSessions.length < sessions.length) saveSessions(trimmedSessions);

  // Overload history (cap at 50 per exercise)
  const overload = loadOverload();
  let prunedOverload = false;
  Object.keys(overload).forEach(ex => {
    const hist = overload[ex].history;
    if (hist && hist.length > 50) {
      overload[ex].history = hist.slice(-50);
      prunedOverload = true;
    }
  });
  if (prunedOverload) saveOverload(overload);
}

// Check localStorage usage — returns { usedKB, warning }
function checkStorageHealth() {
  try {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      total += (key.length + (localStorage.getItem(key) || '').length) * 2;
    }
    const usedKB = Math.round(total / 1024);
    return { usedKB, warning: usedKB > 4000 };
  } catch { return { usedKB: 0, warning: false }; }
}

// Run maintenance on load
pruneOldLogs();

Object.assign(window, {
  loadSessions, saveSessions, addSession, todaySessionDone,
  loadHiitState, saveHiitState,
  loadProfile, saveProfile,
  loadSettings, saveSettings,
  loadPresets, savePresets,
  loadLog, saveLog,
  loadOverload, saveOverload,
  loadReminderDismissed, saveReminderDismissed,
  loadWeightLog, saveWeightLog,
  parseSinceDate, resetAllData,
  getCompletedForWeek, getCompletedThisWeek, getCurrentStreak, buildActivityHistory, shouldShowReminder,
  recordExerciseLog, getOverloadAlerts, checkStorageHealth,
  migrateSchemaV2, migrateSchemaV3, migrateSchemaV4, snoozeOverloadAlert,
});
