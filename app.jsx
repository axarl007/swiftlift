// Main Swiftlift app — tab routing, home view, exercise video links

const { useState, useEffect, useMemo } = React;

// Dynamic today key (Mon/Tue/.../Sun)
function getTodayKey() {
  return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date().getDay()];
}

const DEFAULT_PROFILE = {
  name: "Axar",
  level: "Beginner",
  height: 175, heightUnit: "cm",
  weightUnit: "kg",
  age: 30,
  waterTarget: 2500,
  since: new Date().toISOString().slice(0, 10),
  schemaVersion: 4,
};

const DEFAULT_SETTINGS = {
  timerSound: true,
  timerHaptic: false,
  timerAutoStart: false,
};

function App() {
  const todayKey = getTodayKey();

  const [tab, setTab] = useState("home");
  const [selectedDay, setSelectedDay] = useState(todayKey);
  const [activeSession, setActiveSession] = useState(null);
  const [circuitOverrideDate, setCircuitOverrideDate] = useState(null);

  // localStorage-backed state
  const [hiitState, setHiitState] = useState(() => loadHiitState());
  const [settings, setSettings] = useState(() => loadSettings(DEFAULT_SETTINGS));
  const [profile, setProfile] = useState(() => loadProfile(DEFAULT_PROFILE));
  const [log, setLog] = useState(() => loadLog());
  const [presets, setPresets] = useState(() => loadPresets({ protein: DEFAULT_PROTEIN_PRESETS, water: DEFAULT_WATER_PRESETS }));
  const [hiitOverrides, setHiitOverrides] = useState(() => {
    const s = loadHiitState();
    return s.overrides || {};
  });
  const [weightLog, setWeightLog] = useState(() => loadWeightLog());
  const [weekOffset, setWeekOffset] = useState(0);
  const [sessionVersion, setSessionVersion] = useState(0);

  // Reminder banner visibility
  const [reminderVisible, setReminderVisible] = useState(() => shouldShowReminder());

  // Overload alerts (refreshed after sessions saved)
  const [overloadAlerts, setOverloadAlerts] = useState(() => getOverloadAlerts());

  // Completed days this week (refreshed on mount and after session save)
  const [completedThisWeek, setCompletedThisWeek] = useState(() => getCompletedThisWeek(parseSinceDate(profile.since)));
  // Completed days for the currently-viewed week (follows weekOffset)
  const [completedForViewed, setCompletedForViewed] = useState(() => getCompletedForWeek(parseSinceDate(profile.since), 0));

  // Sync state to localStorage
  useEffect(() => { saveSettings(settings); }, [settings]);
  useEffect(() => { saveProfile(profile); }, [profile]);
  useEffect(() => { saveLog(log); }, [log]);
  useEffect(() => { savePresets(presets); }, [presets]);
  useEffect(() => { saveHiitState({ ...hiitState, overrides: hiitOverrides }); }, [hiitState, hiitOverrides]);
  useEffect(() => { saveWeightLog(weightLog); }, [weightLog]);

  // Run migrations once on mount, then re-read affected state from storage
  useEffect(() => {
    migrateSchemaV2();
    migrateSchemaV3();
    migrateSchemaV4();
    migrateSchemaV5();
    setProfile(loadProfile(DEFAULT_PROFILE));
    setSettings(loadSettings(DEFAULT_SETTINGS));
    setWeightLog(loadWeightLog());
  }, []);

  // Sync WEEK to active plan on every render so all globals stay consistent.
  const planHistory = profile.planHistory || [{ planId: 'standard', from: APP_START_ISO }];
  const _activePlanId = planHistory.at(-1)?.planId || 'standard';
  WEEK = (PLANS[_activePlanId] && PLANS[_activePlanId].week) || PLANS.standard.week;

  const sinceIso = parseSinceDate(profile.since);

  useEffect(() => {
    setCompletedForViewed(getCompletedForWeek(sinceIso, weekOffset));
  }, [weekOffset, sinceIso, _activePlanId]);

  useEffect(() => {
    setCompletedThisWeek(getCompletedThisWeek(sinceIso));
  }, [sinceIso, _activePlanId]);

  // Activity history — invalidated by sessionVersion so it refreshes on every session save
  const activityHistory = useMemo(() => buildActivityHistory(sinceIso, planHistory), [sessionVersion, sinceIso, planHistory]);

  const [logOpen, setLogOpen] = useState(null); // null | 'protein' | 'water'

  const todayIso = new Date().toISOString().slice(0, 10);
  // Selected day ISO (respects weekOffset for multi-week navigation)
  const selectedIdx = WEEK.findIndex(d => d.key === selectedDay);
  const selectedIso = getWeekIsos(weekOffset)[selectedIdx];

  const sessionForDate = useMemo(
    () => loadSessions().find(s => s.date === selectedIso && s.completed) || null,
    [sessionVersion, selectedIso]
  );

  const minWeekOffset = getMinWeekOffset();
  const canGoPrev = weekOffset > minWeekOffset;
  const canGoNext = weekOffset < 1;

  const latestWeightKg = (weightLog || []).at(-1)?.kg ?? 75;
  const proteinTarget = Math.round(latestWeightKg * 1.6);

  function jumpToDay(key) { setSelectedDay(key); setTab("home"); }

  function handleReset() {
    resetAllData();
    const freshProfile = { ...DEFAULT_PROFILE, since: new Date().toISOString().slice(0, 10) };
    setProfile(freshProfile);
    setSettings(DEFAULT_SETTINGS);
    setHiitState({ level: 'easy', rotationIndex: 0 });
    setHiitOverrides({});
    setLog({});
    setWeightLog([]);
    setPresets({ protein: DEFAULT_PROTEIN_PRESETS, water: DEFAULT_WATER_PRESETS });
    setWeekOffset(0);
    setCompletedThisWeek([]);
    setCompletedForViewed([]);
    setOverloadAlerts([]);
    setReminderVisible(shouldShowReminder());
    setSessionVersion(v => v + 1);
  }

  function handleSessionComplete(sessionData) {
    if (circuitOverrideDate) {
      replaceSession(circuitOverrideDate, { ...sessionData, date: circuitOverrideDate });
      setCircuitOverrideDate(null);
    } else {
      const existing = loadSessions();
      if (existing.some(s => s.date === sessionData.date && s.focus === sessionData.focus && s.completed)) {
        setActiveSession(null);
        return;
      }
      addSession(sessionData);
    }
    setSessionVersion(v => v + 1);
    setCompletedForViewed(getCompletedForWeek(sinceIso, weekOffset));
    setCompletedThisWeek(getCompletedThisWeek(sinceIso));
    setOverloadAlerts(getOverloadAlerts());
    setReminderVisible(false);
    setActiveSession(null);
  }

  function handleHiitDone(targetIso) {
    const _today = new Date().toISOString().slice(0, 10);
    if (loadSessions().some(s => s.date === targetIso && s.focus === 'HIIT' && s.completed)) return;
    addSession({
      id: crypto.randomUUID(),
      source: 'manual',
      date: targetIso,
      type: 'hiit',
      focus: 'HIIT',
      durationMin: 18,
      setsCompleted: 1,
      totalSets: 1,
      completed: true,
      note: '',
    });
    setSessionVersion(v => v + 1);
    setCompletedForViewed(getCompletedForWeek(sinceIso, weekOffset));
    setCompletedThisWeek(getCompletedThisWeek(sinceIso));
    if (targetIso === _today) setReminderVisible(false);
  }

  function handleStrengthMarkDone(targetIso, focus) {
    const _today = new Date().toISOString().slice(0, 10);
    if (loadSessions().some(s => s.date === targetIso && s.focus === focus && s.completed)) return;
    addSession({
      id: crypto.randomUUID(),
      source: 'manual',
      date: targetIso,
      type: 'strength',
      focus,
      durationMin: 18,
      setsCompleted: 9,
      totalSets: 9,
      completed: true,
      note: '',
    });
    setSessionVersion(v => v + 1);
    setCompletedForViewed(getCompletedForWeek(sinceIso, weekOffset));
    setCompletedThisWeek(getCompletedThisWeek(sinceIso));
    setOverloadAlerts(getOverloadAlerts());
    if (targetIso === _today) setReminderVisible(false);
  }

  function handleLogOverride(dateIso, type, focus) {
    const sessionData = type === 'rest'
      ? { id: crypto.randomUUID(), source: 'manual', date: dateIso, type: 'rest', focus: 'REST', durationMin: 0, setsCompleted: 0, totalSets: 0, completed: true, note: '' }
      : type === 'hiit'
        ? { id: crypto.randomUUID(), source: 'manual', date: dateIso, type: 'hiit', focus: 'HIIT', durationMin: 18, setsCompleted: 1, totalSets: 1, completed: true, note: '' }
        : { id: crypto.randomUUID(), source: 'manual', date: dateIso, type: 'strength', focus, durationMin: 18, setsCompleted: 9, totalSets: 9, completed: true, note: '' };
    replaceSession(dateIso, sessionData);
    setSessionVersion(v => v + 1);
    setCompletedForViewed(getCompletedForWeek(sinceIso, weekOffset));
    setCompletedThisWeek(getCompletedThisWeek(sinceIso));
    setOverloadAlerts(getOverloadAlerts());
    const _today = new Date().toISOString().slice(0, 10);
    if (dateIso === _today) setReminderVisible(false);
  }

  function handleLaunchCircuitOverride(focus, dateIso) {
    setCircuitOverrideDate(dateIso);
    setActiveSession(SESSIONS[focus]);
  }

  function handleRemoveSession(dateIso) {
    removeSession(dateIso);
    setSessionVersion(v => v + 1);
    setCompletedForViewed(getCompletedForWeek(sinceIso, weekOffset));
    setCompletedThisWeek(getCompletedThisWeek(sinceIso));
    setOverloadAlerts(getOverloadAlerts());
    const _today = new Date().toISOString().slice(0, 10);
    if (dateIso === _today) setReminderVisible(shouldShowReminder());
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <div className="max-w-md mx-auto px-5 pt-8 pb-40">
        {tab === "home" &&
          <HomeView
            todayKey={todayKey}
            selectedDay={selectedDay} setSelectedDay={setSelectedDay}
            selectedIso={selectedIso}
            hiitState={hiitState} setHiitState={setHiitState}
            hiitOverrides={hiitOverrides}
            onStart={(s) => setActiveSession(s)}
            log={log}
            proteinTarget={proteinTarget}
            waterTarget={profile.waterTarget}
            openLog={(k) => setLogOpen(k)}
            completedThisWeek={completedThisWeek}
            completedForViewed={completedForViewed}
            weekOffset={weekOffset}
            canGoPrev={canGoPrev}
            canGoNext={canGoNext}
            onPrevWeek={() => { if (canGoPrev) setWeekOffset(w => w - 1); }}
            onNextWeek={() => { if (canGoNext) setWeekOffset(w => w + 1); }}
            profile={profile}
            planHistory={planHistory}
            overloadAlerts={overloadAlerts}
            onDismissOverload={(ex) => {
              snoozeOverloadAlert(ex);
              setOverloadAlerts(a => a.filter(x => x.exercise !== ex));
            }}
            onHiitDone={handleHiitDone}
            onStrengthMarkDone={handleStrengthMarkDone}
            onOverride={handleLogOverride}
            onLaunchCircuit={handleLaunchCircuitOverride}
            sessionForDate={sessionForDate}
            onRemoveSession={handleRemoveSession}
            reminderVisible={reminderVisible}
            onDismissReminder={() => {
              saveReminderDismissed(new Date().toISOString().slice(0, 10));
              setReminderVisible(false);
            }}
          />
        }

        {tab === "activity" &&
          <ActivityTab history={activityHistory} layout="heatmap-first" sinceIso={sinceIso} planHistory={planHistory} />
        }

        {tab === "profile" &&
          <ProfileTab
            hiitOverrides={hiitOverrides} setHiitOverrides={setHiitOverrides}
            settings={settings} setSettings={setSettings}
            history={activityHistory}
            profile={profile} setProfile={setProfile}
            presets={presets} setPresets={setPresets}
            weightLog={weightLog} setWeightLog={setWeightLog}
            onReset={handleReset} />
        }
      </div>

      <BottomNav tab={tab} setTab={setTab} />

      {activeSession &&
        <CircuitView
          session={activeSession}
          onClose={() => { setActiveSession(null); setCircuitOverrideDate(null); }}
          onSave={handleSessionComplete}
          overrideMode={!!circuitOverrideDate}
          settings={settings}
          weightUnit={profile.weightUnit}
        />
      }

      {logOpen &&
        <LogScreen onClose={() => setLogOpen(null)} initialKind={logOpen}
          initialWeekOffset={weekOffset}
          initialSelectedDay={selectedDay}
          log={log} setLog={setLog} presets={presets} profile={profile} weightLog={weightLog} />
      }
    </div>
  );
}

// ---------- Home view ----------
function HomeView({
  todayKey, selectedDay, setSelectedDay, selectedIso,
  hiitState, setHiitState, hiitOverrides,
  onStart, log, proteinTarget, waterTarget, openLog,
  completedThisWeek, completedForViewed, weekOffset, onPrevWeek, onNextWeek, canGoPrev, canGoNext,
  profile, planHistory, overloadAlerts, onDismissOverload, onHiitDone, onStrengthMarkDone, onOverride, onLaunchCircuit,
  sessionForDate, onRemoveSession,
  reminderVisible, onDismissReminder,
}) {
  const day = WEEK.find((d) => d.key === selectedDay);
  const todayIso = new Date().toISOString().slice(0, 10);
  const isToday = selectedIso === todayIso;
  const isFuture = selectedIso > todayIso;
  const sinceIso = parseSinceDate(profile.since);
  const weekIsos = getWeekIsos(weekOffset);
  const weekDates = getWeekDates(weekOffset);
  const weekRange = getWeekRange(weekOffset);
  const trainingDays = WEEK.filter((d, i) => d.type !== "rest" && (!sinceIso || weekIsos[i] >= sinceIso)).length;
  const session = day.type === "strength" ? SESSIONS[day.focus] : null;
  const streak = getCurrentStreak(sinceIso, planHistory);
  const todayDone = completedForViewed.includes(selectedDay);

  // Protein/water for the selected day (not hardcoded to today)
  const selectedDayLog = log[selectedIso] || { protein: [], water: [] };
  const proteinSelected = (selectedDayLog.protein || []).reduce((s, e) => s + e.grams, 0);
  const waterSelected = (selectedDayLog.water || []).reduce((s, e) => s + e.ml, 0);

  return (
    <>
      <Header
        name={profile.name}
        completed={completedThisWeek.length}
        target={trainingDays}
        streak={streak}
      />

      {reminderVisible &&
        <ReminderBanner onDismiss={onDismissReminder} />
      }

      {overloadAlerts.length > 0 &&
        <OverloadAlerts alerts={overloadAlerts} onDismiss={onDismissOverload} />
      }

      <WeeklyTracker
        selectedDay={selectedDay}
        todayKey={todayKey}
        onSelect={setSelectedDay}
        completedForViewed={completedForViewed}
        weekOffset={weekOffset}
        weekIsos={weekIsos}
        weekDates={weekDates}
        weekRange={weekRange}
        onPrevWeek={onPrevWeek}
        onNextWeek={onNextWeek}
        canGoPrev={canGoPrev}
        canGoNext={canGoNext}
      />

      {day.type === "rest" ?
        <RestCard day={day} isToday={isToday} isFuture={isFuture} selectedIso={selectedIso} onOverride={onOverride} onLaunchCircuit={onLaunchCircuit} sessionForDate={sessionForDate} onRemoveSession={onRemoveSession} /> :
        day.type === "strength" ?
        <StrengthCard
          session={session} isToday={isToday} isFuture={isFuture}
          dayName={day.full} onStart={() => onStart(session)}
          done={todayDone}
          onMarkDone={() => onStrengthMarkDone(selectedIso, session.focus)}
          selectedIso={selectedIso} onOverride={onOverride} onLaunchCircuit={onLaunchCircuit}
          sessionForDate={sessionForDate} onRemoveSession={onRemoveSession}
        /> :
        <HiitCard
          isToday={isToday}
          isFuture={isFuture}
          dayName={day.full}
          hiitState={hiitState}
          setHiitState={setHiitState}
          overrides={hiitOverrides}
          done={todayDone}
          onDone={() => onHiitDone(selectedIso)}
          onJump={() => document.getElementById("hiit-module")?.scrollIntoView({ behavior: "smooth" })}
          selectedIso={selectedIso} onOverride={onOverride} onLaunchCircuit={onLaunchCircuit}
          sessionForDate={sessionForDate} onRemoveSession={onRemoveSession}
        />
      }

      <SectionHeader title="Recovery" subtitle="Tap to log · Edit any day" />
      <div className="grid grid-cols-2 gap-3 mb-4">
        <ProteinWidget current={proteinSelected} target={proteinTarget} onOpen={() => openLog("protein")} />
        <WaterWidget current={waterSelected} target={waterTarget} onOpen={() => openLog("water")} />
      </div>

      <SectionHeader title="HIIT library" subtitle="Cardio routines for HIIT days" />
      <HiitModule
        level={hiitState.level}
        setLevel={(lvl) => setHiitState(s => ({ ...s, level: lvl }))}
        id="hiit-module"
        overrides={hiitOverrides}
      />

      <PrincipleCard />
      <div className="text-center text-xs text-stone-400 mt-8">Swiftlift · 15–20 min sessions · {WEEK.filter(d => d.type !== 'rest').length} days a week</div>
    </>
  );
}

// ---------- Overload alerts ----------
function OverloadAlerts({ alerts, onDismiss }) {
  return (
    <div className="space-y-2 mb-4">
      {alerts.map(a => (
        <div key={a.exercise} className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <div className="text-amber-600 text-lg leading-none mt-0.5">📈</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-stone-900">Time to level up!</div>
            <div className="text-xs text-stone-600 mt-0.5 leading-relaxed">
              <span className="font-semibold">{a.exercise}</span> — it's been {a.daysSince} days. Add 1–2 reps or increase weight.
            </div>
          </div>
          <button onClick={() => onDismiss(a.exercise)}
            className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 active:scale-95 transition flex-shrink-0">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
      ))}
    </div>
  );
}

// ---------- Reminder banner ----------
function ReminderBanner({ onDismiss }) {
  return (
    <div className="bg-orange-500 text-white rounded-2xl p-4 mb-4 flex items-center justify-between">
      <div>
        <div className="font-bold text-sm">Time to train! 💪</div>
        <div className="text-xs text-orange-100 mt-0.5">You haven't worked out yet today.</div>
      </div>
      <button onClick={onDismiss}
        className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center active:scale-95 transition">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
      </button>
    </div>
  );
}

// ---------- Header ----------
function Header({ name, completed, target, streak }) {
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const firstName = (name || 'You').split(' ')[0];
  const initials = (name || '?').split(' ').map(s => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  return (
    <div className="flex items-center justify-between mb-7">
      <div>
        <div className="text-stone-500 text-sm">{dateStr}</div>
        <div className="text-2xl font-bold tracking-tight mt-0.5">Hey, {firstName} 👋</div>
        <div className="text-stone-600 text-sm mt-1">
          <span className="font-semibold text-orange-600">{completed} of {target}</span> sessions done this week
          {streak > 0 && <span className="ml-2 text-stone-500">· 🔥 {streak} day streak</span>}
        </div>
      </div>
      <div className="relative">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold shadow-lg shadow-orange-500/30">{initials || '?'}</div>
        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white shadow flex items-center justify-center">
          <span className="text-[10px]">🔥</span>
        </div>
      </div>
    </div>
  );
}

// ---------- Weekly tracker ----------
function WeeklyTracker({
  selectedDay, todayKey, onSelect,
  completedForViewed, weekOffset, weekIsos, weekDates, weekRange,
  onPrevWeek, onNextWeek, canGoPrev, canGoNext,
}) {
  const todayIso = new Date().toISOString().slice(0, 10);
  const weekLabel = weekOffset === 0 ? 'This week'
    : weekOffset === -1 ? 'Last week'
    : weekOffset === 1 ? 'Next week'
    : `${Math.abs(weekOffset)} weeks ${weekOffset < 0 ? 'ago' : 'ahead'}`;
  return (
    <div className="bg-white rounded-3xl shadow-sm p-4 mb-4">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <button onClick={onPrevWeek} disabled={!canGoPrev} aria-label="Previous week"
            className={`w-6 h-6 rounded-lg flex items-center justify-center transition active:scale-90 ${canGoPrev ? 'text-stone-400 hover:bg-stone-100' : 'text-stone-200 cursor-default'}`}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">{weekLabel}</div>
          <button onClick={onNextWeek} disabled={!canGoNext} aria-label="Next week"
            className={`w-6 h-6 rounded-lg flex items-center justify-center transition active:scale-90 ${canGoNext ? 'text-stone-400 hover:bg-stone-100' : 'text-stone-200 cursor-default'}`}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </div>
        <div className="text-xs font-medium text-stone-400">{weekRange}</div>
      </div>
      <div className="flex justify-between gap-1.5">
        {WEEK.map((d, i) => {
          const cellIso = weekIsos[i];
          const isToday = cellIso === todayIso;
          const isSelected = d.key === selectedDay;
          const isCompleted = completedForViewed.includes(d.key);
          const isFuture = cellIso > todayIso;
          return (
            <button key={d.key} onClick={() => onSelect(d.key)}
              className={`flex-1 flex flex-col items-center py-2 rounded-2xl transition-all active:scale-95 ${isSelected ? "bg-stone-900 text-white" : "text-stone-500 hover:bg-stone-50"}`}>
              <div className={`text-[10px] font-semibold tracking-wider uppercase ${isSelected ? "text-stone-300" : "text-stone-400"}`}>{d.key}</div>
              <div className={`mt-1.5 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                isSelected ? "bg-orange-500 text-white" :
                isCompleted ? "bg-orange-100 text-orange-600" :
                isToday ? "border-2 border-orange-500 text-orange-600" :
                isFuture ? "text-stone-300" : "text-stone-400"}`}>
                {isCompleted && !isSelected ?
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg> :
                  weekDates[i]}
              </div>
              <div className={`mt-1.5 w-1 h-1 rounded-full ${d.type === "rest" ? "bg-stone-200" : d.type === "hiit" ? "bg-cyan-400" : "bg-orange-400"}`} />
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-stone-100">
        <Legend dot="bg-orange-400" label="Strength" />
        <Legend dot="bg-cyan-400" label="HIIT" />
        <Legend dot="bg-stone-200" label="Rest" />
      </div>
    </div>
  );
}
function Legend({ dot, label }) {
  return <div className="flex items-center gap-1.5"><span className={`w-1.5 h-1.5 rounded-full ${dot}`} /><span className="text-[11px] font-medium text-stone-500">{label}</span></div>;
}

// ---------- Daily action cards ----------

function LoggedDifferentBody({ loggedFocus, plannedTitle, dayLabel, isFuture, selectedIso, onOverride, onLaunchCircuit, onRemoveSession }) {
  const loggedSession = SESSIONS[loggedFocus];
  const title    = loggedSession ? loggedSession.title    : loggedFocus === 'HIIT' ? 'HIIT' : loggedFocus === 'REST' ? 'Intentional Rest' : loggedFocus;
  const subtitle = loggedSession ? loggedSession.subtitle : loggedFocus === 'HIIT' ? 'Fat burn + Cardio' : loggedFocus === 'REST' ? 'Recovery day' : '';
  const accentCls = loggedFocus === 'REST' ? 'text-stone-400'
    : loggedFocus === 'HIIT' ? 'text-cyan-600'
    : 'text-orange-600';
  return (
    <>
      <div className={`text-[11px] tracking-[0.2em] font-semibold ${accentCls}`}>{dayLabel} · {loggedFocus}</div>
      <div className="text-3xl font-bold tracking-tight leading-tight mt-2">{title}</div>
      {subtitle && <div className="text-stone-500 mt-1">{subtitle}</div>}
      <div className="text-xs text-stone-400 mt-1">Planned: {plannedTitle}</div>
      <div className="mt-5 w-full py-4 rounded-2xl bg-emerald-500 text-white font-bold text-base flex items-center justify-center gap-2">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
        Done
      </div>
      {!isFuture &&
        <OverridePicker selectedIso={selectedIso} onOverride={onOverride} onLaunchCircuit={onLaunchCircuit} includeRest={true} label="Did something different?" />
      }
      {!isFuture && (
        <button onClick={() => onRemoveSession(selectedIso)}
          className="mt-1 text-xs text-stone-300 underline underline-offset-2 w-full text-center active:text-rose-400 transition">
          Remove log
        </button>
      )}
    </>
  );
}

function StrengthCard({ session, isToday, isFuture, dayName, onStart, done, onMarkDone, selectedIso, onOverride, onLaunchCircuit, sessionForDate, onRemoveSession }) {
  const loggedFocus = sessionForDate?.focus;
  const hasDifferentLog = sessionForDate?.completed && loggedFocus !== session.focus;
  const dayLabel = isToday ? "TODAY" : dayName.toUpperCase();

  return (
    <div className="bg-white rounded-3xl shadow-sm p-6 mb-6 relative overflow-hidden">
      <div className="absolute -right-12 -top-12 w-44 h-44 rounded-full bg-orange-500/10 pointer-events-none" />
      <div className="absolute right-6 top-6 w-12 h-12 rounded-full bg-orange-500/15 pointer-events-none" />
      <div className="relative">
        {hasDifferentLog ? (
          <LoggedDifferentBody loggedFocus={loggedFocus} plannedTitle={session.title} dayLabel={dayLabel} isFuture={isFuture} selectedIso={selectedIso} onOverride={onOverride} onLaunchCircuit={onLaunchCircuit} onRemoveSession={onRemoveSession} />
        ) : (
          <>
            <div className="text-[11px] tracking-[0.2em] font-semibold text-orange-600">{dayLabel} · STRENGTH</div>
            <div className="text-3xl font-bold tracking-tight leading-tight mt-2">{session.title}</div>
            <div className="text-stone-500 mt-1">{session.subtitle}</div>

            <div className="flex gap-2 mt-5 flex-wrap">
              <Chip icon="⏱" label={`${session.duration} min`} />
              <Chip icon="🏋️" label={session.equipment.join(" + ")} />
              <Chip icon="●" label={`${session.exercises.length} exercises`} />
            </div>

            <div className="mt-6 space-y-1">
              {session.exercises.map((e, i) =>
                <div key={i} className="flex items-center gap-3 py-2">
                  <div className="w-7 h-7 rounded-lg bg-stone-100 flex items-center justify-center text-xs font-bold text-stone-600 flex-shrink-0">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-stone-800 truncate">{e.name}</div>
                  </div>
                  <div className="text-xs text-stone-500 font-medium tabular-nums flex-shrink-0">{e.sets} × {e.reps}</div>
                  {e.youtubeId &&
                    <a href={`https://www.youtube.com/watch?v=${e.youtubeId}`} target="_blank" rel="noopener noreferrer"
                      onClick={(ev) => ev.stopPropagation()}
                      title="Watch form tutorial on YouTube"
                      className="w-8 h-8 rounded-lg bg-rose-50 hover:bg-rose-100 active:scale-95 transition flex items-center justify-center text-rose-600 flex-shrink-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M23 12s0-3.8-.5-5.6c-.3-1-1-1.8-2-2C18.8 4 12 4 12 4s-6.8 0-8.5.4c-1 .2-1.7 1-2 2C1 8.2 1 12 1 12s0 3.8.5 5.6c.3 1 1 1.8 2 2C5.2 20 12 20 12 20s6.8 0 8.5-.4c1-.2 1.7-1 2-2 .5-1.8.5-5.6.5-5.6Zm-13 3.5v-7l6 3.5-6 3.5Z" /></svg>
                    </a>
                  }
                </div>
              )}
            </div>

            <div className="mt-4 -mx-1 px-3 py-2 rounded-xl bg-stone-50 text-[11px] text-stone-600 flex items-center gap-2">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-rose-500 flex-shrink-0"><path d="M23 12s0-3.8-.5-5.6c-.3-1-1-1.8-2-2C18.8 4 12 4 12 4s-6.8 0-8.5.4c-1 .2-1.7 1-2 2C1 8.2 1 12 1 12s0 3.8.5 5.6c.3 1 1 1.8 2 2C5.2 20 12 20 12 20s6.8 0 8.5-.4c1-.2 1.7-1 2-2 .5-1.8.5-5.6.5-5.6Zm-13 3.5v-7l6 3.5-6 3.5Z" /></svg>
              Tap the play icon to watch a form tutorial on YouTube
            </div>

            {done ? (
              <div className="mt-5 w-full py-4 rounded-2xl bg-emerald-500 text-white font-bold text-base flex items-center justify-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                Done
              </div>
            ) : isToday ? (
              <button onClick={onStart} className="mt-5 w-full py-4 rounded-2xl bg-orange-500 text-white font-bold text-base shadow-lg shadow-orange-500/30 active:scale-[0.98] transition flex items-center justify-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                Start workout
              </button>
            ) : !isFuture ? (
              <button onClick={onMarkDone}
                className="mt-5 w-full py-3 rounded-2xl border-2 border-emerald-300 text-emerald-700 font-semibold text-sm active:scale-[0.98] transition">
                ✓ Mark as done
              </button>
            ) : null}
            {!isFuture &&
              <OverridePicker selectedIso={selectedIso} onOverride={onOverride} onLaunchCircuit={onLaunchCircuit} includeRest={true} label="Did something different?" />
            }
            {sessionForDate && !isFuture && (
              <button onClick={() => onRemoveSession(selectedIso)}
                className="mt-1 text-xs text-stone-300 underline underline-offset-2 w-full text-center active:text-rose-400 transition">
                Remove log
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Pick a video for a given date deterministically. Adding/removing videos may
// remap past dates since the pool size changes — this is an acceptable tradeoff.
function hiitVideoForDate(iso, vids) {
  if (!vids.length) return null;
  let h = 0;
  for (let i = 0; i < iso.length; i++) h = (h * 31 + iso.charCodeAt(i)) >>> 0;
  return vids[h % vids.length];
}

function HiitCard({ isToday, isFuture, dayName, hiitState, setHiitState, overrides, done, onDone, onJump, selectedIso, onOverride, onLaunchCircuit, sessionForDate, onRemoveSession }) {
  const loggedFocus = sessionForDate?.focus;
  const hasDifferentLog = sessionForDate?.completed && loggedFocus !== 'HIIT';
  const dayLabel = isToday ? "TODAY" : dayName.toUpperCase();

  // Pick video for this date from the available pool (deterministic hash).
  const lvl = HIIT_LIBRARY[hiitState.level];
  const ov = overrides?.[hiitState.level] || { added: [], removed: [] };
  const vids = [...lvl.videos.filter(v => !(ov.removed || []).includes(v.id)), ...(ov.added || [])];
  const nextVideo = hiitVideoForDate(selectedIso, vids);

  return (
    <div className="bg-white rounded-3xl shadow-sm p-6 mb-6 relative overflow-hidden">
      <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-cyan-500/10 pointer-events-none" />
      <div className="relative">
        {hasDifferentLog ? (
          <LoggedDifferentBody loggedFocus={loggedFocus} plannedTitle="HIIT" dayLabel={dayLabel} isFuture={isFuture} selectedIso={selectedIso} onOverride={onOverride} onLaunchCircuit={onLaunchCircuit} onRemoveSession={onRemoveSession} />
        ) : (
          <>
            <div className="text-[11px] tracking-[0.2em] font-semibold text-cyan-600 mb-2">{dayLabel} · HIIT</div>
            <div className="text-3xl font-bold tracking-tight leading-tight">Fat burn + cardio</div>
            <div className="text-stone-500 mt-1">Pick a routine. Go hard.</div>
            <div className="flex gap-2 mt-5 flex-wrap">
              <Chip icon="⏱" label="15–20 min" />
              <Chip icon="●" label="No equipment" />
              <Chip icon="♥" label="HR target: 80%+" />
            </div>

            {nextVideo && (
              <div className="mt-5 bg-cyan-50 rounded-2xl p-4 flex items-center gap-3">
                <div className="relative w-20 h-14 rounded-xl bg-stone-200 overflow-hidden flex-shrink-0">
                  <img src={`https://i.ytimg.com/vi/${nextVideo.id}/mqdefault.jpg`} alt="" className="w-full h-full object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full bg-white/95 flex items-center justify-center">
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="black"><path d="M8 5v14l11-7z" /></svg>
                    </div>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-semibold text-cyan-700 uppercase tracking-wider mb-0.5">Up next · {lvl.label}</div>
                  <div className="text-xs font-semibold text-stone-800 leading-snug line-clamp-2">{nextVideo.title}</div>
                </div>
              </div>
            )}

            {done ? (
              <div className="mt-5 w-full py-4 rounded-2xl bg-emerald-500 text-white font-bold text-base flex items-center justify-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                Done for today
              </div>
            ) : (
              <div className="flex gap-3 mt-5">
                {nextVideo && (
                  <a href={`https://www.youtube.com/watch?v=${nextVideo.id}`} target="_blank" rel="noopener noreferrer"
                    className="flex-1 py-4 rounded-2xl bg-cyan-500 text-white font-bold text-base shadow-lg shadow-cyan-500/30 active:scale-[0.98] transition flex items-center justify-center gap-2">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                    Open in YouTube
                  </a>
                )}
                <button onClick={onJump} className="px-4 py-4 rounded-2xl bg-stone-100 text-stone-600 font-semibold active:scale-[0.98] transition text-sm">
                  All videos
                </button>
              </div>
            )}

            {!done && !isFuture && (
              <button onClick={onDone}
                className="mt-3 w-full py-3 rounded-2xl border-2 border-emerald-300 text-emerald-700 font-semibold text-sm active:scale-[0.98] transition">
                ✓ Mark HIIT done
              </button>
            )}
            {!isFuture &&
              <OverridePicker selectedIso={selectedIso} onOverride={onOverride} onLaunchCircuit={onLaunchCircuit} includeRest={true} label="Did something different?" />
            }
            {sessionForDate && !isFuture && (
              <button onClick={() => onRemoveSession(selectedIso)}
                className="mt-1 text-xs text-stone-300 underline underline-offset-2 w-full text-center active:text-rose-400 transition">
                Remove log
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function OverridePicker({ selectedIso, onOverride, onLaunchCircuit, includeRest, label }) {
  const [open, setOpen] = useState(false);
  const options = [
    { label: 'PUSH', type: 'strength', focus: 'PUSH' },
    { label: 'LEGS', type: 'strength', focus: 'LEGS' },
    { label: 'PULL', type: 'strength', focus: 'PULL' },
    { label: 'HIIT', type: 'hiit', focus: 'HIIT' },
    ...(includeRest ? [{ label: 'Rest', type: 'rest', focus: 'REST' }] : []),
  ];
  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="mt-3 text-xs text-stone-400 underline underline-offset-2 w-full text-center active:text-stone-600 transition">
      {label}
    </button>
  );
  return (
    <div className="mt-3">
      <div className="text-[10px] text-stone-400 text-center mb-2">What did you actually do?</div>
      <div className="flex flex-wrap gap-2 justify-center">
        {options.map(o => (
          <button key={o.focus} onClick={() => { if (o.type === 'strength' && onLaunchCircuit) { onLaunchCircuit(o.focus, selectedIso); } else { onOverride(selectedIso, o.type, o.focus); } setOpen(false); }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold active:scale-95 transition ${
              o.focus === 'REST' ? 'bg-stone-100 text-stone-600' :
              o.type === 'hiit' ? 'bg-cyan-100 text-cyan-700' :
              'bg-orange-100 text-orange-700'
            }`}>
            {o.label}
          </button>
        ))}
        <button onClick={() => setOpen(false)}
          className="px-3 py-1.5 rounded-full text-xs font-semibold bg-stone-50 text-stone-400 active:scale-95 transition">
          Cancel
        </button>
      </div>
    </div>
  );
}

function RestCard({ day, isToday, isFuture, selectedIso, onOverride, onLaunchCircuit, sessionForDate, onRemoveSession }) {
  const loggedWorkout = sessionForDate?.completed && sessionForDate.focus !== 'REST' ? sessionForDate : null;
  const loggedDisplay = loggedWorkout && SESSIONS[loggedWorkout.focus];

  return (
    <div className="bg-white rounded-3xl shadow-sm p-6 mb-6 text-center">
      {loggedWorkout ? (
        <>
          <div className="text-5xl mb-3">🏋️</div>
          <div className="text-[11px] tracking-[0.2em] font-semibold text-orange-500 mb-1">TRAINED ANYWAY</div>
          <div className="text-2xl font-bold tracking-tight">
            {loggedDisplay ? loggedDisplay.title : loggedWorkout.focus + ' done'}
          </div>
          <div className="text-stone-500 text-sm mt-1">
            {loggedDisplay ? loggedDisplay.subtitle : 'Nice work!'}
          </div>
          <div className="text-xs text-stone-400 mt-1">Planned: Rest day</div>
        </>
      ) : (
        <>
          <div className="text-5xl mb-3">😴</div>
          <div className="text-[11px] tracking-[0.2em] font-semibold text-stone-400 mb-1">{isToday ? "TODAY" : day.full.toUpperCase()}</div>
          <div className="text-2xl font-bold tracking-tight">Rest day</div>
          <div className="text-stone-500 text-sm mt-2 max-w-xs mx-auto">80% of muscle repair happens during sleep. Hydrate, eat protein, recover.</div>
        </>
      )}
      {!isFuture &&
        <OverridePicker selectedIso={selectedIso} onOverride={onOverride} onLaunchCircuit={onLaunchCircuit} includeRest={false} label="I trained anyway" />
      }
      {loggedWorkout && !isFuture && (
        <button onClick={() => onRemoveSession(selectedIso)}
          className="mt-1 text-xs text-stone-300 underline underline-offset-2 w-full text-center active:text-rose-400 transition">
          Remove log
        </button>
      )}
    </div>
  );
}

function Chip({ icon, label }) {
  return <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-100 text-stone-700 text-xs font-semibold"><span className="text-stone-500">{icon}</span>{label}</span>;
}

function SectionHeader({ title, subtitle }) {
  return (
    <div className="flex items-end justify-between mb-3 mt-2 px-1">
      <div>
        <div className="text-lg font-bold text-stone-900 tracking-tight">{title}</div>
        {subtitle && <div className="text-xs text-stone-500 mt-0.5">{subtitle}</div>}
      </div>
    </div>
  );
}

// ---------- HIIT picker ----------
function HiitModule({ level, setLevel, id, overrides }) {
  const lvl = HIIT_LIBRARY[level];
  const ov = overrides?.[level] || { added: [], removed: [] };
  const baseVids = lvl.videos.filter((v) => !(ov.removed||[]).includes(v.id));
  const allVids = [...baseVids, ...(ov.added||[])];
  return (
    <div id={id} className="bg-white rounded-3xl shadow-sm p-4 mb-6">
      <div className="flex gap-1.5 bg-stone-100 rounded-2xl p-1 mb-4">
        {Object.entries(HIIT_LIBRARY).map(([key, val]) =>
          <button key={key} onClick={() => setLevel(key)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${
              level === key ?
              key === "easy" ? "bg-emerald-500 text-white shadow" :
              key === "medium" ? "bg-amber-500 text-white shadow" :
              "bg-rose-500 text-white shadow" :
              "text-stone-600"}`}>{val.label}</button>
        )}
      </div>
      <div className="px-1 mb-3 text-xs text-stone-500">{lvl.sublabel}</div>
      <div className="space-y-2.5">
        {allVids.map((v) =>
          <a key={v.id} href={`https://www.youtube.com/watch?v=${v.id}`} target="_blank" rel="noopener noreferrer"
            className="flex gap-3 p-2 rounded-2xl hover:bg-stone-50 active:bg-stone-100 transition">
            <div className="relative w-24 h-16 rounded-xl bg-stone-200 overflow-hidden flex-shrink-0">
              <img src={`https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`} alt="" className="w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <div className="w-7 h-7 rounded-full bg-white/95 flex items-center justify-center">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="black"><path d="M8 5v14l11-7z" /></svg>
                </div>
              </div>
              <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">{v.duration}</div>
            </div>
            <div className="flex-1 min-w-0 py-0.5">
              <div className="text-[10px] font-semibold text-stone-400 tracking-wider uppercase mb-0.5">{v.code || "CUSTOM"} · {v.channel}</div>
              <div className="text-sm font-semibold text-stone-800 leading-snug line-clamp-2">{v.title}</div>
            </div>
          </a>
        )}
      </div>
    </div>
  );
}

// ---------- Recovery widgets ----------
function ProteinWidget({ current, target, onOpen }) {
  const pct = Math.min(100, current / target * 100);
  return (
    <button onClick={onOpen} className="text-left bg-white rounded-3xl shadow-sm p-5 active:scale-[0.98] hover:shadow transition relative">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] font-semibold text-stone-400 tracking-wider uppercase">Protein</div>
          <div className="text-2xl font-bold tracking-tight mt-0.5 tabular-nums">{current}<span className="text-sm font-medium text-stone-400">g</span></div>
        </div>
        <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
        </div>
      </div>
      <div className="mt-3 h-1.5 bg-stone-100 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <div className="text-[11px] text-stone-500 mt-2">of <span className="font-semibold text-stone-700 tabular-nums">{target}g</span> · 1.6g/kg</div>
    </button>
  );
}

function WaterWidget({ current, target, onOpen }) {
  const pct = Math.min(100, current / target * 100);
  const liters = (current / 1000).toFixed(current % 1000 === 0 ? 1 : 2);
  return (
    <button onClick={onOpen} className="text-left bg-white rounded-3xl shadow-sm p-5 active:scale-[0.98] hover:shadow transition relative">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] font-semibold text-stone-400 tracking-wider uppercase">Water</div>
          <div className="text-2xl font-bold tracking-tight mt-0.5 tabular-nums">{liters}<span className="text-sm font-medium text-stone-400">L</span></div>
        </div>
        <div className="w-9 h-9 rounded-xl bg-cyan-500 flex items-center justify-center text-white shadow-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
        </div>
      </div>
      <div className="mt-3 h-1.5 bg-stone-100 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-cyan-400 to-cyan-500 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <div className="text-[11px] text-stone-500 mt-2">of <span className="font-semibold text-stone-700 tabular-nums">{(target/1000).toFixed(1)}L</span> · daily target</div>
    </button>
  );
}

function PrincipleCard() {
  return (
    <div className="bg-stone-900 text-white rounded-3xl p-6 mb-4 relative overflow-hidden">
      <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-orange-500/20 blur-2xl pointer-events-none" />
      <div className="relative">
        <div className="text-[11px] tracking-[0.2em] font-semibold text-orange-400 mb-2">PRINCIPLE</div>
        <div className="text-xl font-bold leading-snug">Muscle is your body's pharmacy.</div>
        <div className="text-stone-400 text-sm mt-2 leading-relaxed">60 min/week of resistance training cuts all-cause mortality risk by 33%. Abs are decoration, muscle is infrastructure.</div>
      </div>
    </div>
  );
}


// ---------- Bottom nav ----------
function BottomNav({ tab, setTab }) {
  const items = [
    { key: "home", icon: "M3 12 12 4l9 8M5 10v10h14V10", label: "Home" },
    { key: "activity", icon: "M22 12h-4l-3 9L9 3l-3 9H2", label: "Activity" },
    { key: "profile", icon: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z", label: "Profile" },
  ];
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none">
      <div className="max-w-md mx-auto px-5 pb-5 pointer-events-auto">
        <div className="bg-white rounded-3xl shadow-xl shadow-stone-900/10 border border-stone-100 px-3 py-2 flex items-center justify-between">
          {items.map((it) =>
            <button key={it.key} onClick={() => setTab(it.key)}
              className={`flex-1 flex flex-col items-center py-2 rounded-2xl transition ${tab === it.key ? "text-orange-500" : "text-stone-400"}`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={it.icon} /></svg>
              <span className="text-[10px] font-semibold mt-0.5">{it.label}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return React.createElement('div', { className: 'min-h-screen flex items-center justify-center bg-stone-50 px-6' },
        React.createElement('div', { className: 'text-center' },
          React.createElement('div', { className: 'text-5xl mb-4' }, '⚠️'),
          React.createElement('div', { className: 'text-xl font-bold text-stone-900 mb-2' }, 'Something went wrong'),
          React.createElement('div', { className: 'text-stone-500 mb-6' }, 'The app hit an unexpected error.'),
          React.createElement('button', {
            onClick: () => window.location.reload(),
            className: 'px-6 py-3 rounded-2xl bg-orange-500 text-white font-bold active:scale-95 transition'
          }, 'Tap to reload')
        )
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  React.createElement(ErrorBoundary, null, React.createElement(App))
);
