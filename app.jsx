// Main Swiftlift app — tab routing, home view, exercise video links

const { useState, useEffect, useMemo } = React;

// Dynamic today key (Mon/Tue/.../Sun)
function getTodayKey() {
  return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date().getDay()];
}

// Monday-aligned week start date string for display
function getWeekRange() {
  const today = new Date();
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(monday)} – ${fmt(sunday)}`;
}

// Day-of-month numbers for this week (Mon..Sun)
function getWeekDates() {
  const today = new Date();
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  return WEEK.map((_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.getDate();
  });
}

const DEFAULT_PROFILE = {
  name: "Axar",
  level: "Beginner",
  height: 175, heightUnit: "cm",
  weight: 75, weightUnit: "kg",
  age: 30,
  waterTarget: 2500,
  since: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
};

const DEFAULT_SETTINGS = {
  weightUnit: "kg",
  distanceUnit: "km",
  timerSound: true,
  timerHaptic: false,
  timerAutoStart: false,
};

function App() {
  const todayKey = getTodayKey();

  const [tab, setTab] = useState("home");
  const [selectedDay, setSelectedDay] = useState(todayKey);
  const [activeSession, setActiveSession] = useState(null);

  // localStorage-backed state
  const [hiitState, setHiitState] = useState(() => loadHiitState());
  const [settings, setSettings] = useState(() => loadSettings(DEFAULT_SETTINGS));
  const [profile, setProfile] = useState(() => loadProfile(DEFAULT_PROFILE));
  const [log, setLog] = useState(() => {
    const stored = loadLog();
    // Seed demo data on first launch (today has no entries)
    const todayIso = new Date().toISOString().slice(0, 10);
    if (!stored[todayIso]) return { ...SEED_LOG, ...stored };
    return stored;
  });
  const [presets, setPresets] = useState(() => loadPresets({ protein: DEFAULT_PROTEIN_PRESETS, water: DEFAULT_WATER_PRESETS }));
  const [hiitOverrides, setHiitOverrides] = useState(() => {
    const s = loadHiitState();
    return s.overrides || {};
  });

  // Reminder banner visibility
  const [reminderVisible, setReminderVisible] = useState(() => shouldShowReminder());

  // Overload alerts (refreshed after sessions saved)
  const [overloadAlerts, setOverloadAlerts] = useState(() => getOverloadAlerts());

  // Completed days this week (refreshed on mount and after session save)
  const [completedThisWeek, setCompletedThisWeek] = useState(() => getCompletedThisWeek());

  // Sync state to localStorage
  useEffect(() => { saveSettings(settings); }, [settings]);
  useEffect(() => { saveProfile(profile); }, [profile]);
  useEffect(() => { saveLog(log); }, [log]);
  useEffect(() => { savePresets(presets); }, [presets]);
  useEffect(() => {
    saveHiitState({ ...hiitState, overrides: hiitOverrides });
  }, [hiitState, hiitOverrides]);

  // Activity history — always read fresh from localStorage
  const activityHistory = useMemo(() => buildActivityHistory(), [completedThisWeek]);

  const [activityLayout, setActivityLayout] = useState("heatmap-first");
  const [logOpen, setLogOpen] = useState(null); // null | 'protein' | 'water'

  const todayIso = new Date().toISOString().slice(0, 10);
  const todayLog = log[todayIso] || { protein: [], water: [] };
  const proteinToday = (todayLog.protein || []).reduce((s, e) => s + e.grams, 0);
  const waterToday = (todayLog.water || []).reduce((s, e) => s + e.ml, 0);
  const proteinTarget = Math.round(profile.weight * 1.6);

  function jumpToDay(key) { setSelectedDay(key); setTab("home"); }

  function handleSessionComplete(sessionData) {
    addSession(sessionData);
    setCompletedThisWeek(getCompletedThisWeek());
    setOverloadAlerts(getOverloadAlerts());
    setReminderVisible(false);
    setActiveSession(null);
  }

  function handleHiitDone() {
    addSession({
      date: new Date().toISOString().slice(0, 10),
      type: 'hiit',
      focus: 'HIIT',
      durationMin: 18,
      setsCompleted: 1,
      totalSets: 1,
      completed: true,
      note: '',
    });
    setCompletedThisWeek(getCompletedThisWeek());
    setReminderVisible(false);
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <div className="max-w-md mx-auto px-5 pt-8 pb-40">
        {tab === "home" &&
          <HomeView
            todayKey={todayKey}
            selectedDay={selectedDay} setSelectedDay={setSelectedDay}
            hiitState={hiitState} setHiitState={setHiitState}
            hiitOverrides={hiitOverrides}
            onStart={(s) => setActiveSession(s)}
            proteinToday={proteinToday} proteinTarget={proteinTarget}
            waterToday={waterToday} waterTarget={profile.waterTarget}
            openLog={(k) => setLogOpen(k)}
            completedThisWeek={completedThisWeek}
            profile={profile}
            overloadAlerts={overloadAlerts}
            onDismissOverload={(ex) => setOverloadAlerts(a => a.filter(x => x.exercise !== ex))}
            onHiitDone={handleHiitDone}
            reminderVisible={reminderVisible}
            onDismissReminder={() => {
              saveReminderDismissed(new Date().toISOString().slice(0, 10));
              setReminderVisible(false);
            }}
          />
        }

        {tab === "activity" &&
          <>
            <LayoutToggle value={activityLayout} onChange={setActivityLayout} />
            <ActivityTab history={activityHistory} layout={activityLayout} />
          </>
        }

        {tab === "profile" &&
          <ProfileTab
            hiitOverrides={hiitOverrides} setHiitOverrides={setHiitOverrides}
            settings={settings} setSettings={setSettings}
            history={activityHistory}
            profile={profile} setProfile={setProfile}
            presets={presets} setPresets={setPresets} />
        }
      </div>

      <BottomNav tab={tab} setTab={setTab} />

      {activeSession &&
        <CircuitView
          session={activeSession}
          onClose={() => setActiveSession(null)}
          onSave={handleSessionComplete}
        />
      }

      {logOpen &&
        <LogScreen onClose={() => setLogOpen(null)} initialKind={logOpen}
          log={log} setLog={setLog} presets={presets} profile={profile} />
      }
    </div>
  );
}

// ---------- Home view ----------
function HomeView({
  todayKey, selectedDay, setSelectedDay,
  hiitState, setHiitState, hiitOverrides,
  onStart, proteinToday, proteinTarget, waterToday, waterTarget, openLog,
  completedThisWeek, profile, overloadAlerts, onDismissOverload, onHiitDone,
  reminderVisible, onDismissReminder,
}) {
  const day = WEEK.find((d) => d.key === selectedDay);
  const isToday = selectedDay === todayKey;
  const trainingDays = WEEK.filter((d) => d.type !== "rest").length;
  const session = day.type === "strength" ? SESSIONS[day.focus] : null;
  const streak = getCurrentStreak();
  const todayDone = completedThisWeek.includes(todayKey);

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
        completedThisWeek={completedThisWeek}
      />

      {day.type === "rest" ?
        <RestCard day={day} isToday={isToday} /> :
        day.type === "strength" ?
        <StrengthCard session={session} isToday={isToday} dayName={day.full} onStart={() => onStart(session)} done={isToday && todayDone} /> :
        <HiitCard
          isToday={isToday}
          dayName={day.full}
          hiitState={hiitState}
          setHiitState={setHiitState}
          overrides={hiitOverrides}
          done={isToday && todayDone}
          onDone={onHiitDone}
          onJump={() => document.getElementById("hiit-module")?.scrollIntoView({ behavior: "smooth" })}
        />
      }

      <SectionHeader title="HIIT library" subtitle="Cardio routines for HIIT days" />
      <HiitModule
        level={hiitState.level}
        setLevel={(lvl) => setHiitState(s => ({ ...s, level: lvl }))}
        id="hiit-module"
        overrides={hiitOverrides}
      />

      <SectionHeader title="Recovery" subtitle="Tap to log · Edit any day in the last 30" />
      <div className="grid grid-cols-2 gap-3 mb-4">
        <ProteinWidget current={proteinToday} target={proteinTarget} onOpen={() => openLog("protein")} />
        <WaterWidget current={waterToday} target={waterTarget} onOpen={() => openLog("water")} />
      </div>

      <PrincipleCard />
      <div className="text-center text-xs text-stone-400 mt-8">Swiftlift · 15–20 min sessions · 5 days a week</div>
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
function WeeklyTracker({ selectedDay, todayKey, onSelect, completedThisWeek }) {
  const todayIdx = WEEK.findIndex((d) => d.key === todayKey);
  const weekDates = getWeekDates();
  return (
    <div className="bg-white rounded-3xl shadow-sm p-4 mb-4">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">This week</div>
        <div className="text-xs font-medium text-stone-400">{getWeekRange()}</div>
      </div>
      <div className="flex justify-between gap-1.5">
        {WEEK.map((d, i) => {
          const isToday = d.key === todayKey;
          const isSelected = d.key === selectedDay;
          const isCompleted = completedThisWeek.includes(d.key);
          const isFuture = i > todayIdx;
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
function StrengthCard({ session, isToday, dayName, onStart, done }) {
  return (
    <div className="bg-white rounded-3xl shadow-sm p-6 mb-6 relative overflow-hidden">
      <div className="absolute -right-12 -top-12 w-44 h-44 rounded-full bg-orange-500/10 pointer-events-none" />
      <div className="absolute right-6 top-6 w-12 h-12 rounded-full bg-orange-500/15 pointer-events-none" />
      <div className="relative">
        <div className="text-[11px] tracking-[0.2em] font-semibold text-orange-600">{isToday ? "TODAY" : dayName.toUpperCase()} · STRENGTH</div>
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
            Done for today
          </div>
        ) : (
          <button onClick={onStart} className="mt-5 w-full py-4 rounded-2xl bg-orange-500 text-white font-bold text-base shadow-lg shadow-orange-500/30 active:scale-[0.98] transition flex items-center justify-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            Start workout
          </button>
        )}
      </div>
    </div>
  );
}

function HiitCard({ isToday, dayName, hiitState, setHiitState, overrides, done, onDone, onJump }) {
  // Compute next video in rotation
  const lvl = HIIT_LIBRARY[hiitState.level];
  const ov = overrides?.[hiitState.level] || { added: [], removed: [] };
  const vids = [...lvl.videos.filter(v => !(ov.removed || []).includes(v.id)), ...(ov.added || [])];
  const nextVideo = vids[hiitState.rotationIndex % vids.length];

  return (
    <div className="bg-white rounded-3xl shadow-sm p-6 mb-6 relative overflow-hidden">
      <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-cyan-500/10 pointer-events-none" />
      <div className="relative">
        <div className="text-[11px] tracking-[0.2em] font-semibold text-cyan-600 mb-2">{isToday ? "TODAY" : dayName.toUpperCase()} · HIIT</div>
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
                onClick={() => {
                  const ov2 = overrides?.[hiitState.level] || { added: [], removed: [] };
                  const vids2 = [...HIIT_LIBRARY[hiitState.level].videos.filter(v => !(ov2.removed||[]).includes(v.id)), ...(ov2.added||[])];
                  setHiitState(s => ({ ...s, rotationIndex: (s.rotationIndex + 1) % vids2.length }));
                }}
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

        {!done && isToday && (
          <button onClick={onDone}
            className="mt-3 w-full py-3 rounded-2xl border-2 border-emerald-300 text-emerald-700 font-semibold text-sm active:scale-[0.98] transition">
            ✓ Mark HIIT done
          </button>
        )}
      </div>
    </div>
  );
}

function RestCard({ day, isToday }) {
  return (
    <div className="bg-white rounded-3xl shadow-sm p-6 mb-6 text-center">
      <div className="text-5xl mb-3">😴</div>
      <div className="text-[11px] tracking-[0.2em] font-semibold text-stone-400 mb-1">{isToday ? "TODAY" : day.full.toUpperCase()}</div>
      <div className="text-2xl font-bold tracking-tight">Rest day</div>
      <div className="text-stone-500 text-sm mt-2 max-w-xs mx-auto">80% of muscle repair happens during sleep. Hydrate, eat protein, recover.</div>
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

// ---------- Activity layout toggle ----------
function LayoutToggle({ value, onChange }) {
  return (
    <div className="flex items-center justify-end mb-3">
      <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm">
        <button onClick={() => onChange("list-first")}
          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition ${value === "list-first" ? "bg-stone-900 text-white" : "text-stone-500"}`}>Layout A</button>
        <button onClick={() => onChange("heatmap-first")}
          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition ${value === "heatmap-first" ? "bg-stone-900 text-white" : "text-stone-500"}`}>Layout B</button>
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

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
