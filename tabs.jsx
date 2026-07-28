// Plan, Activity, Profile tabs for Swiftlift
// All views are mobile-first cards on stone-50, max-w-md container handled by parent.
//
// HANDOFF NOTES (for Claude Code):
// - State that persists in localStorage in production: HIIT library overrides, profile stats, settings.
//   This prototype uses in-memory React state only. Swap useState -> useLocalStorageState in real app.
// - CSV export uses a Blob URL + temporary <a download>. Works in all evergreen browsers.
// - YouTube parse: accepts youtu.be/, watch?v=, /shorts/, /embed/ URLs. Returns videoId or null.

const { useState: useS, useMemo: useM, useEffect: useE } = React;

// ---------- shared helpers ----------
function parseYouTubeId(url) {
  if (!url) return null;
  const patterns = [
  /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([\w-]{11})/,
  /youtu\.be\/([\w-]{11})/];

  for (const p of patterns) {const m = url.match(p);if (m) return m[1];}
  // Last resort: 11-char id alone
  if (/^[\w-]{11}$/.test(url.trim())) return url.trim();
  return null;
}

function fmtDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function relDay(iso) {
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(iso + "T00:00:00");
  const diff = Math.round((today - d) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return `${diff} days ago`;
  if (diff < 14) return "Last week";
  return `${Math.floor(diff / 7)} weeks ago`;
}

// ============================================================
// PLAN TAB
// ============================================================
function PlanTab({ todayKey, onPickDay }) {
  // Calendar shows current week + program progression card
  const week = WEEK; // imported globally
  const programWeek = 6,programTotal = 12;

  return (
    <>
      <PageHeader title="Your plan" subtitle="5 days a week · 15–20 min sessions" />

      {/* Program progression */}
      <div className="bg-stone-900 text-white rounded-3xl p-6 mb-4 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-orange-500/30 blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="flex items-baseline justify-between mb-1">
            <div className="text-[11px] tracking-[0.2em] font-semibold text-orange-400">PROGRAM</div>
            <div className="text-xs font-semibold text-stone-400 tabular-nums">Week {programWeek} / {programTotal}</div>
          </div>
          <div className="text-2xl font-bold tracking-tight">Build muscle + burn fat</div>
          <div className="text-stone-400 text-sm mt-1">Dumbbells + bench · Beginner</div>
          <div className="mt-4 h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-orange-500 rounded-full" style={{ width: `${programWeek / programTotal * 100}%` }} />
          </div>
          <div className="flex items-center justify-between text-xs text-stone-400 mt-2">
            <span>Halfway through</span>
            <span className="text-orange-400 font-semibold">+1 rep next week</span>
          </div>
        </div>
      </div>

      {/* Weekly schedule list */}
      <SectionHeader title="This week" subtitle="Tap any day for full session" />
      <div className="bg-white rounded-3xl shadow-sm divide-y divide-stone-100 mb-6 overflow-hidden">
        {week.map((d) => {
          const isToday = d.key === todayKey;
          const meta = d.type === "rest" ?
          { color: "text-stone-400", bg: "bg-stone-100", icon: "😴" } :
          d.type === "hiit" ?
          { color: "text-cyan-700", bg: "bg-cyan-100", icon: "🔥" } :
          { color: "text-orange-700", bg: "bg-orange-100", icon: "💪" };
          return (
            <button key={d.key} onClick={() => onPickDay(d.key)}
            className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-stone-50 active:bg-stone-100 transition">
              <div className={`w-11 h-11 rounded-2xl ${meta.bg} ${meta.color} flex items-center justify-center text-lg`}>{meta.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="font-semibold text-stone-900">{d.full}</div>
                  {isToday && <span className="text-[10px] font-bold tracking-wider uppercase bg-orange-500 text-white px-1.5 py-0.5 rounded">Today</span>}
                </div>
                <div className="text-xs text-stone-500 mt-0.5 truncate">{d.title}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-xs font-semibold text-stone-700 tabular-nums">{d.duration ? `${d.duration} min` : "—"}</div>
                <div className="text-[10px] text-stone-400 uppercase tracking-wider mt-0.5">{d.type}</div>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-stone-300 ml-1"><path d="m9 18 6-6-6-6" /></svg>
            </button>);

        })}
      </div>

      {/* Progressive overload tip */}
      <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex gap-3 mb-6">
        <div className="text-orange-600 text-lg">📈</div>
        <div>
          <div className="text-sm font-semibold text-stone-900">Progressive overload</div>
          <div className="text-xs text-stone-600 mt-0.5 leading-relaxed">Every 2 weeks: add 1–2 reps to each set, or move up to the next dumbbell weight.</div>
        </div>
      </div>
    </>);

}

// Format an ISO or legacy "Mon YYYY" since date for display as "Mon YYYY"
function formatSince(since) {
  if (!since) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(since)) {
    const d = new Date(since + 'T00:00:00');
    if (isNaN(d.getTime())) return since;
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }
  return since; // already display format (legacy "May 2026")
}

// ============================================================
// ACTIVITY TAB — supports two layouts: 'list-first' or 'heatmap-first'
// ============================================================
function ActivityTab({ history, layout, sinceIso, planHistory }) {
  const completed = history.filter((h) => h.type === "strength" || h.type === "hiit");
  const totalMin = completed.reduce((s, h) => s + (h.duration || 0), 0);
  const trainingDays = history.filter((h) => h.type !== "rest").length;
  const consistency = trainingDays > 0 ? Math.round(completed.length / trainingDays * 100) : 0;
  const streak = getCurrentStreak(sinceIso, planHistory);
  const daysSince = sinceIso
    ? Math.ceil((Date.now() - new Date(sinceIso + 'T00:00:00').getTime()) / 86400000)
    : 35;
  const sessionsSub = `last ${Math.min(35, Math.max(1, daysSince))} days`;

  const Stats =
  <div className="grid grid-cols-3 gap-2.5 mb-4">
      <StatCard label="Sessions" value={completed.length} sub={sessionsSub} tone="orange" />
      <StatCard label="Minutes" value={totalMin} sub="trained" tone="cyan" />
      <StatCard label="Streak" value={streak} sub="days" tone="stone" suffix="🔥" />
    </div>;

  if (completed.length === 0) {
    return (
      <>
        <PageHeader title="Activity" subtitle="Your training history" />
        <div className="bg-white rounded-3xl shadow-sm p-8 text-center">
          <div className="text-5xl mb-4">🏋️</div>
          <div className="text-xl font-bold text-stone-900 mb-2">No sessions yet</div>
          <div className="text-sm text-stone-500 max-w-xs mx-auto">Complete your first workout to start tracking your progress here.</div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Activity" subtitle={`${consistency}% consistency · 30-day window`}
      action={<ExportCSVButton history={history} />} />

      {layout === "heatmap-first" ?
      <>
          <HeatmapCard history={history} sinceIso={sinceIso} />
          {Stats}
          <SectionHeader title="History" />
          <HistoryList history={history} />
        </> :

      <>
          {Stats}
          <SectionHeader title="History" />
          <HistoryList history={history} />
          <SectionHeader title="Consistency" />
          <HeatmapCard history={history} sinceIso={sinceIso} compact />
        </>
      }
    </>);

}

function StatCard({ label, value, sub, tone, suffix }) {
  const toneMap = {
    orange: "from-orange-400 to-orange-500",
    cyan: "from-cyan-400 to-cyan-500",
    stone: "from-stone-700 to-stone-900"
  };
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <div className="text-[10px] font-semibold text-stone-400 tracking-wider uppercase">{label}</div>
      <div className="flex items-baseline gap-1 mt-1">
        <div className={`text-2xl font-bold bg-gradient-to-br ${toneMap[tone]} bg-clip-text text-transparent tabular-nums`}>{value}</div>
        {suffix && <span className="text-base">{suffix}</span>}
      </div>
      <div className="text-[10px] text-stone-500 mt-0.5">{sub}</div>
    </div>);

}

function HistoryList({ history }) {
  // Newest first
  const items = [...history].reverse().filter((h) => h.type !== "rest");
  return (
    <div className="bg-white rounded-3xl shadow-sm divide-y divide-stone-100 mb-6 overflow-hidden">
      {items.slice(0, 12).map((h, i) => {
        const missed = h.type === "missed";
        const intentionalRest = h.type === "intentional-rest";
        const isHiit = h.type === "hiit";
        return (
          <div key={i} className="flex items-center gap-4 px-5 py-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
            missed ? "bg-stone-100 text-stone-400" :
            intentionalRest ? "bg-stone-100 text-stone-500" :
            isHiit ? "bg-cyan-100 text-cyan-700" :
            "bg-orange-100 text-orange-700"}`
            }>{missed ? "—" : intentionalRest ? "😴" : isHiit ? "🔥" : "💪"}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="font-semibold text-sm text-stone-900">{missed ? "Skipped" : intentionalRest ? "Rest" : h.focus}</div>
                {missed && <span className="text-[10px] font-bold tracking-wider uppercase bg-stone-200 text-stone-500 px-1.5 py-0.5 rounded">Missed</span>}
                {intentionalRest && <span className="text-[10px] font-bold tracking-wider uppercase bg-stone-100 text-stone-400 px-1.5 py-0.5 rounded">Intentional</span>}
              </div>
              <div className="text-xs text-stone-500 mt-0.5">{relDay(h.date)} · {fmtDate(h.date)}</div>
            </div>
            {!missed && !intentionalRest &&
            <div className="text-right flex-shrink-0">
                <div className="text-sm font-semibold text-stone-900 tabular-nums">{h.duration} min</div>
                <div className="text-[10px] text-stone-400 mt-0.5 tabular-nums">{h.setsCompleted}/{h.totalSets} sets</div>
              </div>
            }
          </div>);

      })}
    </div>);

}

function HeatmapCard({ history, compact, sinceIso }) {
  const map = new Map();
  history.forEach((h) => map.set(h.date, h));
  const todayIso = new Date().toISOString().slice(0, 10);
  const todayUtc = new Date(todayIso + 'T12:00:00Z');
  // Start from APP_START_ISO (always a Monday); switch to rolling 35-week window once exceeded
  const appStartUtc = new Date(APP_START_ISO + 'T12:00:00Z');
  const MAX_WEEKS = 35;
  const daysSinceStart = Math.round((todayUtc - appStartUtc) / 86400000);
  const startUtc = daysSinceStart <= MAX_WEEKS * 7
    ? new Date(appStartUtc)
    : getMondayUtc(-(MAX_WEEKS - 1));
  const days = Math.round((todayUtc - startUtc) / 86400000) + 1;
  const cells = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(startUtc);
    d.setUTCDate(startUtc.getUTCDate() + i);
    const iso = d.toISOString().slice(0, 10);
    const preJoin = sinceIso ? iso < sinceIso : false;
    const isFuture = iso > todayIso;
    cells.push({ iso, dayOfMonth: d.getUTCDate(),
      monthShort: d.toLocaleString("en-US", { month: "short", timeZone: "UTC" }),
      h: map.get(iso), isToday: iso === todayIso, future: isFuture, preJoin });
  }
  while (cells.length % 7 !== 0) cells.push({ pad: true });

  // Group into rows (one row = one week, earliest first)
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  function tone(c) {
    if (c.pad || c.future) return { bg: "bg-stone-100/60", text: "text-stone-300" };
    if (c.h?.type === "hiit") return { bg: "bg-cyan-400", text: "text-white" };
    if (c.h?.type === "strength") return { bg: "bg-orange-500", text: "text-white" };
    if (c.preJoin) return { bg: "bg-stone-100/60", text: "text-stone-300" };
    if (!c.h) return { bg: "bg-stone-100", text: "text-stone-400" };
    if (c.h.type === "missed") return { bg: "bg-rose-100 ring-1 ring-rose-200", text: "text-rose-500" };
    if (c.h.type === "intentional-rest") return { bg: "bg-stone-200", text: "text-stone-500" };
    if (c.h.type === "rest") return { bg: "bg-stone-100", text: "text-stone-400" };
    return { bg: "bg-stone-100", text: "text-stone-400" };
  }

  // Label for a row: month + start-day of that week
  function rowLabel(week) {
    const first = week.find(c => !c.pad);
    if (!first) return "";
    return `${first.monthShort} ${first.dayOfMonth}`;
  }

  return (
    <div className="bg-white rounded-3xl shadow-sm p-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-sm font-bold text-stone-900">Recent activity</div>
          <div className="text-xs text-stone-500 mt-0.5">Each square is one day · Newest at bottom</div>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-stone-500">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-orange-500" />Strength</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-cyan-400" />HIIT</span>
        </div>
      </div>

      {/* Day-of-week column headers */}
      <div className="flex items-center gap-1.5 mb-2">
        <div className="w-12 flex-shrink-0" />
        {["M","T","W","T","F","S","S"].map((l, i) => (
          <div key={i} className="flex-1 text-center text-[9px] font-semibold text-stone-400 uppercase tracking-wider">{l}</div>
        ))}
      </div>

      {/* Grid: weeks = rows */}
      <div className="flex flex-col gap-1.5">
        {weeks.map((w, wi) => (
          <div key={wi} className="flex items-center gap-1.5">
            {/* Row label = week-start date */}
            <div className="w-12 flex-shrink-0 text-[10px] font-semibold text-stone-400 tabular-nums">{rowLabel(w)}</div>
            {w.map((c, ci) => {
              const t = tone(c);
              return (
                <div key={ci}
                  title={c.iso ? `${c.iso}${c.h ? ` · ${c.h.type}${c.h.focus ? " · "+c.h.focus : ""}` : ""}` : ""}
                  className={`flex-1 aspect-square rounded-md ${t.bg} ${c.isToday ? "ring-2 ring-stone-900 ring-offset-1" : ""} flex items-center justify-center`}>
                  {!c.pad && (
                    <span className={`text-[10px] font-bold tabular-nums ${t.text}`}>{c.dayOfMonth}</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {!compact && (
        <div className="mt-4 pt-4 border-t border-stone-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-rose-100 ring-1 ring-rose-200" />
            <span className="text-stone-600 font-semibold">Missed</span>
            <span className="text-stone-500 tabular-nums">· {history.filter(h => h.type === 'missed').length} days</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-stone-100" />
            <span className="text-stone-600 font-semibold">Rest</span>
          </div>
        </div>
      )}
    </div>);

}

function ExportCSVButton({ history }) {
  function exportCsv() {
    const headers = ["date", "type", "focus", "duration_min", "sets_completed", "total_sets"];
    const rows = history.map((h) => [
    h.date,
    h.type,
    h.focus || "",
    h.duration ?? "",
    h.setsCompleted ?? "",
    h.totalSets ?? ""].
    join(","));
    const csv = headers.join(",") + "\n" + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;a.download = `swiftlift-activity-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <button onClick={exportCsv} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-900 text-white text-xs font-semibold active:scale-95 transition">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
      Export CSV
    </button>);

}

// ============================================================
// PROFILE TAB — stats, settings, HIIT manager, export
// ============================================================
function ProfileTab({ hiitOverrides, setHiitOverrides, settings, setSettings, history, profile, setProfile, presets, setPresets, weightLog, setWeightLog, onReset }) {
  const [section, setSection] = useS("overview");
  const [confirmReset, setConfirmReset] = useS(false);

  const planHistory = profile.planHistory || [{ planId: 'standard', from: APP_START_ISO }];

  if (section === "hiit") {
    return <HiitManager onBack={() => setSection("overview")} hiitOverrides={hiitOverrides} setHiitOverrides={setHiitOverrides} />;
  }
  if (section === "settings") {
    return <SettingsScreen onBack={() => setSection("overview")} settings={settings} setSettings={setSettings} />;
  }
  if (section === "edit") {
    return <EditProfileScreen onBack={() => setSection("overview")} profile={profile} setProfile={setProfile} weightLog={weightLog} setWeightLog={setWeightLog} />;
  }
  if (section === "presets") {
    return <PresetsManagerScreen onBack={() => setSection("overview")} presets={presets} setPresets={setPresets} />;
  }
  if (section === "plan") {
    return <PlanSelectorScreen onBack={() => setSection("overview")} planHistory={planHistory} profile={profile} setProfile={setProfile} />;
  }
  if (section === "nutrition") {
    return <NutritionScreen onBack={() => setSection("overview")} profile={profile} setProfile={setProfile} weightLog={weightLog} />;
  }

  const initials = profile.name.split(" ").map(s => s[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  const latestWeightEntry = (weightLog || []).at(-1);
  const latestWeightKg = latestWeightEntry?.kg ?? 75;
  const latestWeightDisplay = latestWeightEntry
    ? (profile.weightUnit === 'lb' ? Math.round(latestWeightEntry.kg * 2.2046 * 10) / 10 : Math.round(latestWeightEntry.kg * 10) / 10)
    : '—';
  const proteinTarget = Math.round(latestWeightKg * 1.6);
  const effectiveCalTarget = window.getEffectiveCalTarget ? window.getEffectiveCalTarget(profile, weightLog) : 1800;
  const activityLabel = { sedentary: 'Sedentary', lightly_active: 'Lightly active', active: 'Active' }[profile.activityLevel || 'lightly_active'] || 'Lightly active';

  return (
    <>
      <PageHeader title="Profile" action={
        <button onClick={() => setSection("edit")} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-900 text-white text-xs font-semibold active:scale-95 transition">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z"/></svg>
          Edit
        </button>
      } />

      {/* Avatar header */}
      <div className="bg-white rounded-3xl shadow-sm p-6 mb-4 flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-orange-500/30">{initials || "?"}</div>
        <div className="flex-1 min-w-0">
          <div className="text-xl font-bold text-stone-900 truncate">{profile.name}</div>
          <div className="text-xs text-stone-500 mt-0.5">{profile.level} · Training since {formatSince(profile.since)}</div>
        </div>
      </div>

      {/* User stats */}
      <div className="grid grid-cols-3 gap-2.5 mb-4">
        <MiniStat label="Height" value={profile.height} unit={profile.heightUnit} />
        <MiniStat label="Weight" value={latestWeightDisplay} unit={latestWeightEntry ? profile.weightUnit : ''} />
        <MiniStat label="Age"    value={profile.age}    unit="yrs" />
      </div>

      {/* Goals chip card */}
      {(() => {
        const activePlan = PLANS[planHistory.at(-1)?.planId] || PLANS.standard;
        return (
          <div className="bg-white rounded-3xl shadow-sm p-5 mb-4">
            <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Goals</div>
            <div className="space-y-3">
              <GoalRow label="Daily protein"   value={`${proteinTarget}g`}         sub={`1.6g × ${Math.round(latestWeightKg)}kg`} />
              <GoalRow label="Daily calories"   value={`${effectiveCalTarget} kcal`}  sub={profile.calorieTargetOverride ? 'Manual override' : `Auto · ${activityLabel}`} />
              <GoalRow label="Sessions / week"  value={String(activePlan.days)}        sub={activePlan.description} />
              <GoalRow label="Body composition" value="Build muscle"                   sub="Reduce body fat" />
            </div>
          </div>
        );
      })()}

      {/* Section list */}
      <div className="bg-white rounded-3xl shadow-sm divide-y divide-stone-100 mb-4 overflow-hidden">
        <ProfileRow icon="🗓" label="Workout plan"
        sub={`${(PLANS[planHistory.at(-1)?.planId] || PLANS.standard).label} · ${(PLANS[planHistory.at(-1)?.planId] || PLANS.standard).days} days a week`}
        onClick={() => setSection("plan")} />
        <ProfileRow icon="🎬" label="HIIT video library"
        sub={`${countAllHiit(hiitOverrides)} videos · Add or remove routines`}
        onClick={() => setSection("hiit")} />
        <ProfileRow icon="🥗" label="Meal planner"
        sub={`${effectiveCalTarget} kcal target · ${activityLabel}`}
        onClick={() => setSection("nutrition")} />
        <ProfileRow icon="🍽" label="Manage presets"
        sub={`${presets.protein.length} protein · ${presets.water.length} water · Quick-add items`}
        onClick={() => setSection("presets")} />
        <ProfileRow icon="⚙️" label="Settings"
        sub="Rest timer · Water target"
        onClick={() => setSection("settings")} />
        <ExportRow history={history} />
      </div>

      {/* Danger zone */}
      <div style={{ borderRadius: 14, border: '1px solid #fee2e2', background: '#fff5f5', padding: '4px 0', marginBottom: 8 }}>
        {!confirmReset ? (
          <button onClick={() => setConfirmReset(true)}
            style={{ width: '100%', padding: '14px 20px', background: 'none', border: 'none',
                     color: '#ef4444', fontSize: 15, fontWeight: 600, textAlign: 'left', cursor: 'pointer' }}>
            Reset all data
          </button>
        ) : (
          <div style={{ padding: '12px 20px' }}>
            <p style={{ margin: '0 0 12px', fontSize: 14, color: '#374151', fontWeight: 500 }}>
              This will erase all sessions, logs, and settings. Are you sure?
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { onReset(); setConfirmReset(false); }}
                style={{ flex: 1, padding: '10px 0', borderRadius: 10, background: '#ef4444',
                         color: '#fff', border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                Yes, reset
              </button>
              <button onClick={() => setConfirmReset(false)}
                style={{ flex: 1, padding: '10px 0', borderRadius: 10, background: '#f3f4f6',
                         color: '#374151', border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="text-center text-[11px] text-stone-400 mt-2 mb-2">Swiftlift v1.0 · Built on Krish Ashok's workout plan</div>
    </>);

}

// ============================================================
// EDIT PROFILE SCREEN
// ============================================================
// ── Nutrition / Calorie target screen ──────────────────────────────────────
function NutritionScreen({ onBack, profile, setProfile, weightLog }) {
  const kg             = (weightLog || []).at(-1)?.kg ?? 75;
  const computedTDEE   = window.calculateTDEE ? window.calculateTDEE(profile, kg, profile.activityLevel || 'lightly_active') : 1800;
  const [activity, setActivity]   = useS(profile.activityLevel || 'lightly_active');
  const [calInput, setCalInput]   = useS(String(profile.calorieTargetOverride ?? computedTDEE));
  const [saved, setSaved]         = useS(false);

  const activityOptions = [
    { key: 'sedentary',      icon: '🛋',  label: 'Sedentary',       sub: 'Desk job, minimal movement' },
    { key: 'lightly_active', icon: '🚶',  label: 'Lightly active',  sub: 'Some walking, light activity' },
    { key: 'active',         icon: '🏃',  label: 'Active',          sub: 'On your feet most of the day' },
  ];

  // Recompute TDEE preview when activity changes
  const previewTDEE = window.calculateTDEE ? window.calculateTDEE(profile, kg, activity) : 1800;

  function handleActivityChange(key) {
    setActivity(key);
    // Only reset calInput to new TDEE if user hasn't overridden manually
    if (!profile.calorieTargetOverride) {
      const newTDEE = window.calculateTDEE ? window.calculateTDEE(profile, kg, key) : 1800;
      setCalInput(String(newTDEE));
    }
  }

  function handleSave() {
    const parsed = parseInt(calInput, 10);
    const isOverride = !isNaN(parsed) && parsed !== previewTDEE;
    setProfile(p => ({
      ...p,
      activityLevel: activity,
      calorieTargetOverride: isOverride ? parsed : null,
    }));
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <>
      <SubpageHeader title="Meal planner settings" onBack={onBack} />

      {/* Activity level */}
      <div className="bg-white rounded-3xl shadow-sm p-5 mb-4">
        <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-4">Activity level</div>
        <div className="space-y-2">
          {activityOptions.map(opt => (
            <button key={opt.key} onClick={() => handleActivityChange(opt.key)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition ${
                activity === opt.key ? 'border-orange-500 bg-orange-50' : 'border-stone-100 hover:border-stone-200'
              }`}>
              <span className="text-2xl">{opt.icon}</span>
              <div className="flex-1 text-left">
                <div className="text-sm font-bold text-stone-900">{opt.label}</div>
                <div className="text-xs text-stone-500">{opt.sub}</div>
              </div>
              {activity === opt.key && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-orange-500"><path d="M20 6 9 17l-5-5"/></svg>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Calorie target */}
      <div className="bg-white rounded-3xl shadow-sm p-5 mb-4">
        <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Daily calorie target</div>
        <div className="text-xs text-stone-400 mb-4">
          Auto-calculated: <span className="font-semibold text-stone-600">{previewTDEE} kcal</span>
          {' '}(Mifflin-St Jeor · {activityOptions.find(o => o.key === activity)?.label} · −200 kcal deficit)
        </div>
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={calInput}
            onChange={e => setCalInput(e.target.value)}
            className="flex-1 px-4 py-3 rounded-2xl border border-stone-200 text-lg font-bold text-stone-900 text-center tabular-nums focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          />
          <div className="text-sm text-stone-500 font-medium">kcal</div>
        </div>
        {profile.calorieTargetOverride && (
          <button onClick={() => { setCalInput(String(previewTDEE)); }}
            className="mt-2 text-xs text-orange-500 underline underline-offset-2">
            Reset to auto ({previewTDEE} kcal)
          </button>
        )}
        <div className="mt-3 text-xs text-stone-400">
          {parseInt(calInput, 10) !== previewTDEE
            ? `⚡ Manual override — auto value is ${previewTDEE} kcal`
            : '✓ Using auto-calculated value'}
        </div>
      </div>

      <button onClick={handleSave}
        className={`w-full py-4 rounded-2xl font-bold text-base active:scale-[0.98] transition shadow-lg ${
          saved ? 'bg-emerald-500 text-white shadow-emerald-500/30' : 'bg-orange-500 text-white shadow-orange-500/30'
        }`}>
        {saved ? '✓ Saved!' : 'Save changes'}
      </button>
    </>
  );
}

function EditProfileScreen({ onBack, profile, setProfile, weightLog, setWeightLog }) {
  const [draft, setDraft] = useS(profile);
  const [weightInput, setWeightInput] = useS("");
  const dirty = JSON.stringify(draft) !== JSON.stringify(profile);
  const valid = draft.name.trim() && draft.height > 0 && draft.age > 0;

  function save() { if (valid) { setProfile(draft); onBack(); } }
  function set(k, v) { setDraft({ ...draft, [k]: v }); }

  function logWeight() {
    const num = parseFloat(weightInput);
    if (!num || num <= 0) return;
    const kg = draft.weightUnit === 'lb' ? num * 0.4536 : num;
    const today = new Date().toISOString().slice(0, 10);
    const entry = { id: crypto.randomUUID(), date: today, kg: Math.round(kg * 10) / 10 };
    setWeightLog(prev => {
      const deduped = (prev || []).filter(e => e.date !== today);
      return [...deduped, entry].sort((a, b) => a.date.localeCompare(b.date));
    });
    setWeightInput("");
  }

  const recentWeights = [...(weightLog || [])].reverse().slice(0, 5);
  const latestKgForHint = (weightLog || []).at(-1)?.kg ?? 75;

  return (
    <>
      <SubpageHeader title="Edit profile" onBack={onBack} />

      <SettingsGroup title="Identity">
        <div className="px-5 py-4">
          <div className="text-[10px] font-semibold text-stone-500 tracking-wider uppercase mb-1.5">Name</div>
          <input type="text" value={draft.name} onChange={e => set("name", e.target.value)}
            placeholder="Your name"
            className="w-full bg-stone-50 rounded-xl px-3 py-3 text-sm font-semibold border border-stone-200 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100" />
        </div>
        <div className="px-5 py-4">
          <div className="text-[10px] font-semibold text-stone-500 tracking-wider uppercase mb-1.5">Experience level</div>
          <div className="flex gap-2">
            {["Beginner", "Intermediate", "Advanced"].map(lvl => (
              <button key={lvl} onClick={() => set("level", lvl)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition ${draft.level === lvl ? "bg-orange-500 text-white shadow" : "bg-stone-100 text-stone-600"}`}>{lvl}</button>
            ))}
          </div>
        </div>
      </SettingsGroup>

      <SettingsGroup title="Body stats">
        <NumberField label="Height" value={draft.height} onChange={v => set("height", v)}
          unitOptions={[["cm","cm"],["in","in"]]} unitValue={draft.heightUnit} onUnit={v => set("heightUnit", v)} min={50} max={250} />
        <RadioRow label="Weight unit" value={draft.weightUnit} onChange={v => set("weightUnit", v)}
          options={[["kg","kg"],["lb","lb"]]} />
        <NumberField label="Age" value={draft.age} onChange={v => set("age", v)} unit="yrs" min={10} max={120} />
      </SettingsGroup>

      <SettingsGroup title="Body weight">
        <div className="px-5 py-4">
          <div className="flex gap-2 mb-3">
            <input
              type="number" inputMode="decimal" min="0" max="999" step="0.1"
              value={weightInput}
              onChange={e => setWeightInput(e.target.value)}
              placeholder={`Today's weight in ${draft.weightUnit}`}
              className="flex-1 bg-stone-50 rounded-xl px-3 py-2.5 text-sm font-bold tabular-nums border border-stone-200 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
            />
            <button onClick={logWeight} disabled={!parseFloat(weightInput)}
              className="px-4 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-bold disabled:bg-stone-200 disabled:text-stone-400 active:scale-95 transition">
              Log
            </button>
          </div>
          {recentWeights.length > 0 ? (
            <div className="space-y-1.5">
              {recentWeights.map(e => {
                const display = draft.weightUnit === 'lb'
                  ? Math.round(e.kg * 2.2046 * 10) / 10
                  : Math.round(e.kg * 10) / 10;
                return (
                  <div key={e.id} className="flex items-center justify-between text-xs text-stone-500">
                    <span>{fmtDate(e.date)}</span>
                    <span className="font-semibold tabular-nums text-stone-700">{display} {draft.weightUnit}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-stone-400 text-center py-1">No entries yet.</div>
          )}
        </div>
      </SettingsGroup>

      <SettingsGroup title="Hydration">
        <NumberField label="Water target" value={draft.waterTarget} onChange={v => set("waterTarget", v)} unit="ml" min={500} max={6000} step={100} />
      </SettingsGroup>

      <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 mt-4 flex gap-3">
        <div className="text-orange-600 text-lg">🥚</div>
        <div className="text-xs text-stone-700 leading-relaxed">
          <span className="font-semibold">Protein target updates automatically.</span> 1.6g × {Math.round(latestKgForHint)}kg = <span className="font-bold tabular-nums">{Math.round(latestKgForHint * 1.6)}g</span>/day
        </div>
      </div>

      <div className="flex gap-3 mt-5">
        <button onClick={onBack}
          className="flex-1 py-4 rounded-2xl bg-stone-100 text-stone-700 font-bold active:scale-[0.98] transition">Cancel</button>
        <button onClick={save} disabled={!valid || !dirty}
          className="flex-1 py-4 rounded-2xl bg-orange-500 text-white font-bold disabled:bg-stone-200 disabled:text-stone-400 shadow-lg shadow-orange-500/30 disabled:shadow-none active:scale-[0.98] transition">
          Save changes
        </button>
      </div>
    </>
  );
}

function NumberField({ label, value, onChange, unit, unitOptions, unitValue, onUnit, min, max }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <div className="flex-1 text-sm font-semibold text-stone-900">{label}</div>
      <input type="number" value={value} onChange={e => onChange(Number(e.target.value))} min={min} max={max}
        className="w-20 bg-stone-50 rounded-xl px-3 py-2 text-right text-sm font-bold tabular-nums border border-stone-200 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100" />
      {unitOptions ? (
        <div className="flex bg-stone-100 rounded-xl p-0.5">
          {unitOptions.map(([k, v]) => (
            <button key={k} onClick={() => onUnit(k)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${unitValue === k ? "bg-white shadow text-stone-900" : "text-stone-500"}`}>{v}</button>
          ))}
        </div>
      ) : (
        <span className="text-xs font-semibold text-stone-400 w-8">{unit}</span>
      )}
    </div>
  );
}

function MiniStat({ label, value, unit }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <div className="text-[10px] font-semibold text-stone-400 tracking-wider uppercase">{label}</div>
      <div className="flex items-baseline gap-1 mt-1">
        <div className="text-2xl font-bold text-stone-900 tabular-nums">{value}</div>
        <div className="text-xs text-stone-400 font-medium">{unit}</div>
      </div>
    </div>);

}

function GoalRow({ label, value, sub }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm font-semibold text-stone-800">{label}</div>
        <div className="text-[11px] text-stone-500 mt-0.5">{sub}</div>
      </div>
      <div className="text-sm font-bold text-orange-600 tabular-nums">{value}</div>
    </div>);

}

function ProfileRow({ icon, label, sub, onClick }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-stone-50 active:bg-stone-100 transition">
      <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-lg">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-stone-900">{label}</div>
        <div className="text-xs text-stone-500 mt-0.5 truncate">{sub}</div>
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-stone-300"><path d="m9 18 6-6-6-6" /></svg>
    </button>);

}

// Builds the full backup payload fresh from localStorage (every domain in
// BACKUP_DOMAINS), not from React state, so export is never stale relative
// to what's actually persisted.
function buildBackupPayload() {
  const domains = {};
  window.BACKUP_DOMAINS.forEach(d => {
    const raw = localStorage.getItem(d.storageKey);
    if (raw === null) return;
    try { domains[d.key] = JSON.parse(raw); } catch (_) { /* skip corrupted local value */ }
  });
  return {
    exportedAt: new Date().toISOString(),
    backupSchemaVersion: window.BACKUP_SCHEMA_VERSION,
    ...domains,
  };
}

async function downloadBackupJson() {
  const payload = JSON.stringify(buildBackupPayload(), null, 2);
  const filename = `swiftlift-backup-${new Date().toISOString().slice(0, 10)}.json`;
  if (window.showSaveFilePicker) {
    try {
      const fh = await window.showSaveFilePicker({ suggestedName: filename, types: [{ description: "JSON", accept: { "application/json": [".json"] } }] });
      const w = await fh.createWritable();
      await w.write(payload);
      await w.close();
      return;
    } catch (_) {}
  }
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function ExportRow({ history }) {
  const [importError, setImportError] = useS(null);
  const [pendingImport, setPendingImport] = useS(null); // validated backup awaiting confirmation
  const fileInputRef = React.useRef(null);

  function exportCsv() {
    const headers = ["date", "type", "focus", "duration_min", "sets_completed", "total_sets"];
    const rows = history.map((h) => [h.date, h.type, h.focus || "", h.duration ?? "", h.setsCompleted ?? "", h.totalSets ?? ""].join(","));
    const csv = headers.join(",") + "\n" + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `swiftlift-activity-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function handleImportFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file if the user cancels and retries
    if (!file) return;
    setImportError(null);
    if (file.size > window.MAX_BACKUP_FILE_BYTES) {
      setImportError(`File is too large (max ${Math.round(window.MAX_BACKUP_FILE_BYTES / (1024 * 1024))} MB).`);
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      const result = window.validateBackupJson(ev.target.result);
      if (!result.valid) {
        setImportError(result.error);
        return;
      }
      setPendingImport(result);
    };
    reader.onerror = () => setImportError("Could not read that file.");
    reader.readAsText(file);
  }

  function confirmImport() {
    restoreBackup(pendingImport.domains);
    window.location.reload();
  }

  return (
    <div className="px-5 py-4">
      <div className="text-[10px] font-bold text-stone-400 tracking-wider uppercase mb-3">Backup &amp; restore</div>
      <div className="flex gap-2">
        <button onClick={exportCsv}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-stone-100 text-stone-700 text-xs font-bold active:scale-95 transition">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
          Sessions CSV
        </button>
        <button onClick={downloadBackupJson}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-orange-500 text-white text-xs font-bold active:scale-95 transition shadow-lg shadow-orange-500/30">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
          Full backup JSON
        </button>
      </div>

      <button onClick={() => fileInputRef.current?.click()}
        className="w-full flex items-center justify-center gap-1.5 py-3 mt-2 rounded-2xl bg-stone-100 text-stone-700 text-xs font-bold active:scale-95 transition">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 15v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4M17 9l-5-5-5 5M12 4v12" /></svg>
        Import backup
      </button>
      <input ref={fileInputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleImportFile} />

      {importError && (
        <div className="mt-2 text-xs text-rose-500 font-medium">{importError}</div>
      )}

      {pendingImport && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 flex items-end sm:items-center justify-center p-4" onClick={() => setPendingImport(null)}>
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-5" onClick={e => e.stopPropagation()}>
            <div className="text-lg font-bold text-stone-900 mb-2">Replace all data on this device?</div>
            <p className="text-sm text-stone-600 leading-relaxed mb-4">
              This will permanently delete all current data on this device and replace it with the imported backup. This cannot be undone.
            </p>
            <button onClick={downloadBackupJson}
              className="w-full flex items-center justify-center gap-1.5 py-3 mb-3 rounded-2xl bg-stone-100 text-stone-700 text-xs font-bold active:scale-95 transition">
              Download my current data first
            </button>
            <div className="flex gap-3">
              <button onClick={() => setPendingImport(null)}
                className="flex-1 py-3 rounded-2xl bg-stone-100 text-stone-700 font-bold text-sm active:scale-[0.98] transition">
                Cancel
              </button>
              <button onClick={confirmImport}
                className="flex-1 py-3 rounded-2xl bg-rose-500 text-white font-bold text-sm active:scale-[0.98] transition">
                Import and overwrite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// HIIT MANAGER — add (paste URL) / remove videos by level
// ============================================================
function countAllHiit(overrides) {
  return Object.keys(HIIT_LIBRARY).reduce((sum, lvl) => {
    const base = HIIT_LIBRARY[lvl].videos.length;
    const added = (overrides[lvl]?.added || []).length;
    const removed = (overrides[lvl]?.removed || []).length;
    return sum + base + added - removed;
  }, 0);
}

function HiitManager({ onBack, hiitOverrides, setHiitOverrides }) {
  const [level, setLevel] = useS("easy");
  const [showAdd, setShowAdd] = useS(false);

  const ov = hiitOverrides[level] || { added: [], removed: [] };
  const baseVids = HIIT_LIBRARY[level].videos.filter((v) => !ov.removed.includes(v.id));
  const allVids = [...baseVids, ...ov.added];

  function removeVid(v) {
    const next = { ...hiitOverrides };
    const cur = next[level] || { added: [], removed: [] };
    if (HIIT_LIBRARY[level].videos.some((b) => b.id === v.id)) {
      cur.removed = [...cur.removed, v.id];
    } else {
      cur.added = cur.added.filter((a) => a.id !== v.id);
    }
    next[level] = cur;
    setHiitOverrides(next);
  }

  function addVid(vid) {
    const next = { ...hiitOverrides };
    const cur = next[level] || { added: [], removed: [] };
    cur.added = [...cur.added, vid];
    next[level] = cur;
    setHiitOverrides(next);
    setShowAdd(false);
  }

  return (
    <>
      <SubpageHeader title="HIIT library" onBack={onBack} />

      <div className="flex gap-1.5 bg-stone-100 rounded-2xl p-1 mb-4">
        {Object.entries(HIIT_LIBRARY).map(([key, val]) =>
        <button key={key} onClick={() => setLevel(key)}
        className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${
        level === key ?
        key === "easy" ? "bg-emerald-500 text-white shadow" :
        key === "medium" ? "bg-amber-500 text-white shadow" :
        "bg-rose-500 text-white shadow" :
        "text-stone-600"}`
        }>{val.label}</button>
        )}
      </div>

      <div className="bg-white rounded-3xl shadow-sm divide-y divide-stone-100 mb-4 overflow-hidden">
        {allVids.map((v) =>
        <div key={v.id} className="flex items-center gap-3 px-4 py-3">
            <img src={`https://i.ytimg.com/vi/${v.id}/default.jpg`} alt="" className="w-16 h-12 rounded-lg object-cover bg-stone-200 flex-shrink-0" loading="lazy" />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-semibold text-stone-400 tracking-wider uppercase">{v.code || "CUSTOM"} · {v.channel}</div>
              <div className="text-sm font-semibold text-stone-800 leading-snug line-clamp-2">{v.title}</div>
              <div className="text-[11px] text-stone-500 mt-0.5">{v.duration}</div>
            </div>
            <button onClick={() => removeVid(v)} className="w-9 h-9 rounded-xl bg-stone-100 hover:bg-rose-100 hover:text-rose-600 text-stone-500 flex items-center justify-center transition" aria-label="Remove">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></svg>
            </button>
          </div>
        )}
        {allVids.length === 0 &&
        <div className="text-center text-sm text-stone-400 py-8">No videos yet. Add one below.</div>
        }
      </div>

      <button onClick={() => setShowAdd(true)} className="w-full py-4 rounded-2xl bg-stone-900 text-white font-bold active:scale-[0.98] transition flex items-center justify-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
        Add YouTube video
      </button>

      {showAdd && <AddVideoModal level={level} onClose={() => setShowAdd(false)} onAdd={addVid} />}
    </>);

}

function AddVideoModal({ level, onClose, onAdd }) {
  const [url, setUrl] = useS("");
  const [title, setTitle] = useS("");
  const [channel, setChannel] = useS("");
  const [duration, setDuration] = useS("");
  const id = parseYouTubeId(url);

  function submit() {
    if (!id || !title.trim()) return;
    onAdd({ id, title: title.trim(), channel: channel.trim() || "Custom", duration: duration.trim() || "—", code: "U" + Math.random().toString(36).slice(2, 4).toUpperCase() });
  }

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-md p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[11px] tracking-[0.2em] font-semibold text-stone-400">ADD TO {level.toUpperCase()}</div>
            <div className="text-lg font-bold text-stone-900">New HIIT video</div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-stone-100 flex items-center justify-center text-stone-500 active:scale-95 transition">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <Field label="YouTube URL">
          <input type="url" value={url} onChange={(e) => setUrl(e.target.value)}
          placeholder="https://youtube.com/watch?v=..."
          className="w-full bg-stone-50 rounded-xl px-3 py-3 text-sm font-medium border border-stone-200 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100" />
          {url &&
          <div className="text-xs mt-1.5 font-medium">
              {id ? <span className="text-emerald-600">✓ Detected · {id}</span> : <span className="text-rose-500">✗ Not a valid YouTube URL</span>}
            </div>
          }
        </Field>

        {/* Live thumbnail preview */}
        {id &&
        <div className="bg-stone-50 rounded-2xl p-3 mb-3 flex gap-3">
            <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" className="w-20 h-14 rounded-lg object-cover bg-stone-200 flex-shrink-0" />
            <div className="text-xs text-stone-500 leading-relaxed self-center">Thumbnail loaded. Fill in the details below.</div>
          </div>
        }

        <Field label="Title">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="20 Min Standing HIIT — No Equipment"
          className="w-full bg-stone-50 rounded-xl px-3 py-3 text-sm font-medium border border-stone-200 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100" />
        </Field>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <Field label="Channel">
            <input type="text" value={channel} onChange={(e) => setChannel(e.target.value)} placeholder="OliverSjostrom"
            className="w-full bg-stone-50 rounded-xl px-3 py-3 text-sm font-medium border border-stone-200 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100" />
          </Field>
          <Field label="Duration">
            <input type="text" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="20 min"
            className="w-full bg-stone-50 rounded-xl px-3 py-3 text-sm font-medium border border-stone-200 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100" />
          </Field>
        </div>

        <button onClick={submit} disabled={!id || !title.trim()}
        className="w-full py-4 rounded-2xl bg-orange-500 text-white font-bold disabled:bg-stone-200 disabled:text-stone-400 active:scale-[0.98] transition shadow-lg shadow-orange-500/30 disabled:shadow-none">
          Add to {level} library
        </button>
      </div>
    </div>);

}

function Field({ label, children }) {
  return (
    <div className="mb-3">
      <div className="text-[10px] font-semibold text-stone-500 tracking-wider uppercase mb-1.5">{label}</div>
      {children}
    </div>);

}

// ============================================================
// SETTINGS — rest timer sounds
// ============================================================
function SettingsScreen({ onBack, settings, setSettings }) {
  function set(k, v) { setSettings({ ...settings, [k]: v }); }
  const health = checkStorageHealth();
  return (
    <>
      <SubpageHeader title="Settings" onBack={onBack} />

      {health.usedKB > 3000 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 flex gap-3">
          <div className="text-amber-600 text-lg">⚠️</div>
          <div>
            <div className="text-sm font-semibold text-stone-900">Storage almost full</div>
            <div className="text-xs text-stone-600 mt-0.5">{health.usedKB} KB used · Export a backup then reset old data.</div>
          </div>
        </div>
      )}

      <SettingsGroup title="Rest timer">
        <ToggleRow label="Sound on" sub="Beep when rest ends"
          value={settings.timerSound} onChange={(v) => set("timerSound", v)} />
        <ToggleRow label="Vibrate" sub="Pulse 3 sec before rest ends"
          value={settings.timerHaptic} onChange={(v) => set("timerHaptic", v)} />
        <ToggleRow label="Auto-start next set" sub="Skip the tap when rest hits zero"
          value={settings.timerAutoStart} onChange={(v) => set("timerAutoStart", v)} />
      </SettingsGroup>
    </>
  );
}

function SettingsGroup({ title, children }) {
  return (
    <>
      <div className="px-1 mt-4 mb-2 text-[10px] font-bold text-stone-400 tracking-wider uppercase">{title}</div>
      <div className="bg-white rounded-3xl shadow-sm divide-y divide-stone-100 overflow-hidden">{children}</div>
    </>);

}

function ToggleRow({ label, sub, value, onChange }) {
  return (
    <div className="flex items-center gap-4 px-5 py-3.5">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-stone-900">{label}</div>
        {sub && <div className="text-xs text-stone-500 mt-0.5">{sub}</div>}
      </div>
      <button onClick={() => onChange(!value)}
      className={`w-12 h-7 rounded-full p-0.5 transition flex-shrink-0 ${value ? "bg-orange-500" : "bg-stone-200"}`}>
        <div className={`w-6 h-6 rounded-full bg-white shadow transition-transform ${value ? "translate-x-5" : ""}`} />
      </button>
    </div>);

}

function RadioRow({ label, value, onChange, options }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3.5">
      <div className="text-sm font-semibold text-stone-900">{label}</div>
      <div className="flex bg-stone-100 rounded-xl p-0.5">
        {options.map(([k, v]) =>
        <button key={k} onClick={() => onChange(k)}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${value === k ? "bg-white shadow text-stone-900" : "text-stone-500"}`}>{v}</button>
        )}
      </div>
    </div>);

}

// ============================================================
// shared headers
// ============================================================
function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-end justify-between mb-5 mt-1">
      <div>
        <div className="text-2xl font-bold tracking-tight text-stone-900">{title}</div>
        {subtitle && <div className="text-sm text-stone-500 mt-0.5">{subtitle}</div>}
      </div>
      {action}
    </div>);

}

function SubpageHeader({ title, onBack }) {
  return (
    <div className="flex items-center gap-3 mb-5 mt-1">
      <button onClick={onBack} className="w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center active:scale-95 transition" aria-label="Back">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
      </button>
      <div className="text-xl font-bold tracking-tight text-stone-900">{title}</div>
    </div>);

}

// ============================================================
// PLAN SELECTOR SCREEN
// ============================================================
function PlanSelectorScreen({ onBack, planHistory, profile, setProfile }) {
  const activePlanId = planHistory.at(-1)?.planId || 'standard';
  const [pendingPlanId, setPendingPlanId] = useS(null);
  const fiveK = profile.fiveK || { week: 1, runsCompletedThisWeek: 0, programCompleted: false };

  function confirmSwitch() {
    if (!pendingPlanId) return;
    const todayIso = new Date().toISOString().slice(0, 10);
    setProfile(prev => ({
      ...prev,
      planHistory: [...(prev.planHistory || [{ planId: 'standard', from: APP_START_ISO }]), { planId: pendingPlanId, from: todayIso }],
    }));
    setPendingPlanId(null);
    onBack();
  }

  function adjustFiveKWeek(delta) {
    setProfile(prev => ({ ...prev, fiveK: setFiveKWeek(prev.fiveK, (prev.fiveK?.week || 1) + delta) }));
  }

  const PLAN_ORDER = ['relaxed', 'standard', 'intensive', 'ultimate'];

  return (
    <>
      <SubpageHeader title="Workout plan" onBack={onBack} />
      <div className="text-xs text-stone-500 px-1 mb-4">Choose the schedule that fits your life. Changes take effect from today.</div>

      <div className="space-y-3 mb-6">
        {PLAN_ORDER.map(planId => {
          const plan = PLANS[planId];
          const isActive = planId === activePlanId;
          return (
            <button key={planId} onClick={() => !isActive && setPendingPlanId(planId)}
              className={`w-full text-left bg-white rounded-3xl shadow-sm p-5 transition active:scale-[0.98] ${isActive ? 'ring-2 ring-orange-500' : 'hover:shadow'}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="text-base font-bold text-stone-900">{plan.label}</div>
                    {isActive && <span className="text-[10px] font-bold tracking-wider uppercase bg-orange-500 text-white px-1.5 py-0.5 rounded">Active</span>}
                  </div>
                  <div className="text-xs text-stone-500 mt-0.5">{plan.days} days/week · {plan.restDays} rest · {plan.description}</div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${isActive ? 'border-orange-500 bg-orange-500' : 'border-stone-300'}`}>
                  {isActive && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {plan.week.map((d, i) => (
                  <span key={i} className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                    d.type === 'rest' ? 'bg-stone-100 text-stone-400' :
                    d.type === 'hiit' ? 'bg-cyan-100 text-cyan-700' :
                    d.type === 'run' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-orange-100 text-orange-700'
                  }`}>{d.key} {d.type === 'rest' ? 'Rest' : d.focus}</span>
                ))}
              </div>

              {isActive && planId === 'ultimate' && (
                <div onClick={e => e.stopPropagation()} className="mt-4 pt-4 border-t border-stone-100 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">5K progress</div>
                    <div className="text-sm font-bold text-stone-800 mt-0.5">
                      {fiveK.programCompleted ? `Maintenance · Week ${FIVE_K_PROGRAM.totalWeeks} content` : `Week ${fiveK.week} of ${FIVE_K_PROGRAM.totalWeeks} · ${fiveK.runsCompletedThisWeek}/2 runs done`}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => adjustFiveKWeek(-1)} disabled={fiveK.week <= 1}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-lg font-bold active:scale-90 transition ${fiveK.week <= 1 ? 'bg-stone-50 text-stone-300' : 'bg-stone-100 text-stone-600'}`}>−</button>
                    <button onClick={() => adjustFiveKWeek(1)} disabled={fiveK.week >= FIVE_K_PROGRAM.totalWeeks}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-lg font-bold active:scale-90 transition ${fiveK.week >= FIVE_K_PROGRAM.totalWeeks ? 'bg-stone-50 text-stone-300' : 'bg-stone-100 text-stone-600'}`}>+</button>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {pendingPlanId && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-xs shadow-2xl text-center">
            <div className="text-4xl mb-3">{pendingPlanId === 'ultimate' ? '🏃' : '🗓'}</div>
            <div className="text-lg font-bold text-stone-900 mb-1">Switch to {PLANS[pendingPlanId]?.label}?</div>
            <div className="text-sm text-stone-500 mb-5">Your schedule changes from today. Past sessions are preserved.</div>
            {pendingPlanId === 'ultimate' && PLANS.ultimate.disclaimer && (
              <div className="text-xs text-stone-600 bg-amber-50 border border-amber-200 rounded-2xl p-3 mb-5 text-left">{PLANS.ultimate.disclaimer}</div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setPendingPlanId(null)}
                className="flex-1 py-3 rounded-2xl bg-stone-100 text-stone-700 font-bold active:scale-95 transition">Cancel</button>
              <button onClick={confirmSwitch}
                className="flex-1 py-3 rounded-2xl bg-orange-500 text-white font-bold active:scale-95 transition">Switch plan</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// expose
Object.assign(window, {
  PlanTab, ActivityTab, ProfileTab,
  parseYouTubeId
});