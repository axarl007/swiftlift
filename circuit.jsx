// Active Workout View — full-screen overlay for the strength circuit timer

const { useState, useEffect, useRef } = React;

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.value = 0.3;
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
    setTimeout(() => ctx.close(), 200);
  } catch {}
}

function CircuitView({ session, onClose, onSave, settings, weightUnit }) {
  const [phase, setPhase] = useState("warmup");
  const [exIndex, setExIndex] = useState(0);
  const [setIndex, setSetIndex] = useState(0);
  const [restRemaining, setRestRemaining] = useState(0);
  const [warmupRemaining, setWarmupRemaining] = useState(120);
  const [cooldownRemaining, setCooldownRemaining] = useState(60);
  const [setLogs, setSetLogs] = useState({});
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  const endTimeRef = useRef(null);
  const exIndexRef = useRef(exIndex);
  const setIndexRef = useRef(setIndex);
  exIndexRef.current = exIndex;
  setIndexRef.current = setIndex;

  const ex = session.exercises[exIndex];
  const totalSets = ex ? ex.sets : 0;

  useEffect(() => {
    if (phase === "done") return;
    const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [phase]);

  function triggerTimerFeedback() {
    if (settings?.timerSound) playBeep();
    if (settings?.timerHaptic && navigator.vibrate) navigator.vibrate([200, 100, 200]);
  }

  useEffect(() => {
    if (phase !== "warmup") return;
    if (warmupRemaining <= 0) { triggerTimerFeedback(); setPhase("work"); return; }
    endTimeRef.current = Date.now() + warmupRemaining * 1000;
    const t = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
      setWarmupRemaining(remaining);
      if (remaining <= 0) {
        clearInterval(t);
        triggerTimerFeedback();
        setPhase("work");
      }
    }, 250);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "cooldown") return;
    if (cooldownRemaining <= 0) { triggerTimerFeedback(); setPhase("done"); return; }
    endTimeRef.current = Date.now() + cooldownRemaining * 1000;
    const t = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
      setCooldownRemaining(remaining);
      if (remaining <= 0) {
        clearInterval(t);
        triggerTimerFeedback();
        setPhase("done");
      }
    }, 250);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "rest") return;
    if (restRemaining <= 0) { advanceAfterRest(); return; }
    endTimeRef.current = Date.now() + restRemaining * 1000;
    const t = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
      setRestRemaining(remaining);
      if (remaining <= 0) {
        clearInterval(t);
        triggerTimerFeedback();
        advanceAfterRest();
      }
    }, 250);
    return () => clearInterval(t);
  }, [phase]);

  function logSet(key, field, value) {
    setSetLogs(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [field]: value } }));
  }

  function completeSet() {
    if (setIndex < totalSets - 1) {
      setRestRemaining(ex.rest);
      setPhase("rest");
    } else {
      if (exIndex < session.exercises.length - 1) {
        setRestRemaining(ex.rest);
        setPhase("rest");
      } else {
        setPhase("cooldown");
      }
    }
  }

  function advanceAfterRest() {
    const curSet = setIndexRef.current;
    const curEx = exIndexRef.current;
    const curTotalSets = session.exercises[curEx]?.sets || 0;
    if (curSet < curTotalSets - 1) {
      setSetIndex(curSet + 1);
      setPhase("work");
    } else {
      setExIndex(curEx + 1);
      setSetIndex(0);
      setPhase("work");
    }
  }

  function skipRest() { endTimeRef.current = Date.now(); setRestRemaining(0); }

  const totalExercises = session.exercises.length;

  return (
    <div className="fixed inset-0 z-50 bg-stone-50 overflow-y-auto">
      <div className="max-w-md mx-auto min-h-full px-5 pt-6 pb-10 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => phase === "done" ? onClose() : setShowQuitConfirm(true)} className="w-11 h-11 rounded-2xl bg-white shadow-sm flex items-center justify-center active:scale-95 transition" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <div className="text-center">
            <div className="text-[11px] tracking-[0.2em] font-semibold text-stone-400">{session.focus} DAY</div>
            <div className="text-sm font-semibold text-stone-800">{session.title}</div>
          </div>
          <div className="w-11 h-11" />
        </div>

        {phase === "warmup" && <PhaseScreen kind="warmup" remaining={warmupRemaining} total={120} title="Warm-up" subtitle="Get the body ready"
                                steps={WARMUP} onSkip={() => setPhase("work")} />}

        {phase === "work" && ex && (
          <WorkScreen
            session={session}
            ex={ex}
            exIndex={exIndex}
            setIndex={setIndex}
            totalExercises={totalExercises}
            setLog={setLogs[`${exIndex}-${setIndex}`] || {}}
            onLogChange={(field, val) => logSet(`${exIndex}-${setIndex}`, field, val)}
            onComplete={completeSet}
            weightUnit={weightUnit}
          />
        )}

        {phase === "rest" && (
          <RestScreen
            remaining={restRemaining}
            total={ex.rest}
            nextExName={
              setIndex < totalSets - 1
                ? `${ex.name} — Set ${setIndex + 2}`
                : (exIndex < session.exercises.length - 1
                  ? `${session.exercises[exIndex + 1].name} — Set 1`
                  : "Cool-down")
            }
            onSkip={skipRest}
            add={(s) => { endTimeRef.current += s * 1000; setRestRemaining(r => r + s); }}
          />
        )}

        {phase === "cooldown" && <PhaseScreen kind="cooldown" remaining={cooldownRemaining} total={60} title="Cool-down" subtitle="Stretch it out"
                                  steps={COOLDOWN} onSkip={() => setPhase("done")} />}

        {phase === "done" && <DoneScreen session={session} onClose={onClose} onSave={onSave} setLogs={setLogs} weightUnit={weightUnit} />}

        {showQuitConfirm && (
          <div className="fixed inset-0 z-[60] bg-stone-900/50 flex items-center justify-center p-6">
            <div className="bg-white rounded-3xl p-6 w-full max-w-xs shadow-2xl text-center">
              <div className="text-4xl mb-3">🏋️</div>
              <div className="text-lg font-bold text-stone-900 mb-1">Quit workout?</div>
              <div className="text-sm text-stone-500 mb-5">Progress will be lost.</div>
              <div className="flex gap-3">
                <button onClick={() => setShowQuitConfirm(false)}
                  className="flex-1 py-3 rounded-2xl bg-stone-100 text-stone-700 font-bold active:scale-95 transition">Cancel</button>
                <button onClick={onClose}
                  className="flex-1 py-3 rounded-2xl bg-rose-500 text-white font-bold active:scale-95 transition">Quit</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- sub-screens ----------

function PhaseScreen({ kind, remaining, total, title, subtitle, steps, onSkip }) {
  const pct = (remaining / total) * 100;
  const accent = kind === "warmup" ? "bg-orange-500" : "bg-cyan-500";
  return (
    <div className="flex-1 flex flex-col">
      <div className="bg-white rounded-3xl shadow-sm p-6 mb-4">
        <div className="text-[11px] tracking-[0.2em] font-semibold text-stone-400 mb-1">{title.toUpperCase()}</div>
        <div className="text-2xl font-bold text-stone-900 mb-4">{subtitle}</div>
        <div className="flex items-baseline gap-2">
          <div className="text-6xl font-bold text-stone-900 tabular-nums tracking-tight">{remaining}</div>
          <div className="text-stone-400 font-medium">sec</div>
        </div>
        <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden mt-4">
          <div className={`h-full ${accent} rounded-full transition-all duration-1000 ease-linear`} style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="bg-white rounded-3xl shadow-sm p-6 mb-4">
        <div className="text-xs font-semibold text-stone-500 mb-3 uppercase tracking-wider">Routine</div>
        <ul className="space-y-3">
          {steps.map((s, i) => (
            <li key={i} className="flex items-start gap-3 text-stone-700 text-sm">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0" />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>
      <button onClick={onSkip} className="mt-auto w-full py-3.5 rounded-2xl bg-stone-100 text-stone-600 font-semibold active:scale-[0.98] transition">
        Skip {title.toLowerCase()}
      </button>
    </div>
  );
}

function WorkScreen({ session, ex, exIndex, setIndex, totalExercises, setLog, onLogChange, onComplete, weightUnit }) {
  return (
    <div className="flex-1 flex flex-col">
      <div className="bg-white rounded-3xl shadow-sm p-6 mb-4">
        <div className="flex items-center justify-between mb-1">
          <div className="text-[11px] tracking-[0.2em] font-semibold text-orange-500">EXERCISE {exIndex + 1} / {totalExercises}</div>
          <div className="text-xs font-semibold text-stone-500">SET {setIndex + 1} / {ex.sets}</div>
        </div>
        <div className="flex items-start justify-between gap-3 mt-2">
          <div className="flex-1 min-w-0">
            <div className="text-3xl font-bold text-stone-900 leading-tight tracking-tight">{ex.name}</div>
            <div className="text-sm text-stone-500 mt-1">{ex.muscles}</div>
          </div>
          {ex.youtubeId && (
            <a href={`https://www.youtube.com/watch?v=${ex.youtubeId}`} target="_blank" rel="noopener noreferrer"
               className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 text-rose-600 text-xs font-bold active:scale-95 transition">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M23 12s0-3.8-.5-5.6c-.3-1-1-1.8-2-2C18.8 4 12 4 12 4s-6.8 0-8.5.4c-1 .2-1.7 1-2 2C1 8.2 1 12 1 12s0 3.8.5 5.6c.3 1 1 1.8 2 2C5.2 20 12 20 12 20s6.8 0 8.5-.4c1-.2 1.7-1 2-2 .5-1.8.5-5.6.5-5.6Zm-13 3.5v-7l6 3.5-6 3.5Z"/></svg>
              Form
            </a>
          )}
        </div>

        <div className="flex gap-2 mt-5">
          {Array.from({ length: ex.sets }).map((_, i) => (
            <div key={i} className={`h-2 flex-1 rounded-full ${i < setIndex ? "bg-orange-500" : i === setIndex ? "bg-orange-500/40" : "bg-stone-100"}`} />
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 mt-6">
          <div className="bg-stone-50 rounded-2xl p-4">
            <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Target reps</div>
            <div className="text-3xl font-bold text-stone-900 mt-1 tabular-nums">{ex.reps}</div>
          </div>
          <div className="bg-stone-50 rounded-2xl p-4">
            <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Rest</div>
            <div className="text-3xl font-bold text-stone-900 mt-1 tabular-nums">{ex.rest}<span className="text-base font-medium text-stone-400">s</span></div>
          </div>
        </div>

        {/* Optional reps/weight log */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="bg-orange-50 rounded-2xl p-3">
            <div className="text-[10px] font-semibold text-orange-600 uppercase tracking-wider mb-1.5">Reps done</div>
            <input
              type="number" inputMode="numeric" min="0" max="99"
              value={setLog.reps ?? ""}
              onChange={e => onLogChange("reps", e.target.value === "" ? undefined : Number(e.target.value))}
              placeholder={String(ex.reps).replace(/\D.*/, "")}
              className="w-full bg-transparent text-2xl font-bold text-stone-900 tabular-nums focus:outline-none"
            />
          </div>
          <div className="bg-orange-50 rounded-2xl p-3">
            <div className="text-[10px] font-semibold text-orange-600 uppercase tracking-wider mb-1.5">Weight ({weightUnit || 'kg'})</div>
            <input
              type="number" inputMode="decimal" min="0" max="999" step="0.5"
              value={setLog.weight ?? ""}
              onChange={e => onLogChange("weight", e.target.value === "" ? undefined : Number(e.target.value))}
              placeholder="—"
              className="w-full bg-transparent text-2xl font-bold text-stone-900 tabular-nums focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-4 bg-stone-50 rounded-2xl p-4">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Tempo · 3-1-1</div>
          <div className="flex items-stretch gap-1.5 text-[11px] font-semibold">
            <div className="flex-[3] bg-orange-100 text-orange-700 rounded-lg py-2 px-2.5 flex items-center justify-between"><span>↓ Lower</span><span className="tabular-nums">3s</span></div>
            <div className="flex-[1] bg-stone-200 text-stone-700 rounded-lg py-2 px-2 flex items-center justify-center">1s</div>
            <div className="flex-[1] bg-orange-500 text-white rounded-lg py-2 px-2 flex items-center justify-between"><span>↑</span><span className="tabular-nums">1s</span></div>
          </div>
        </div>
      </div>

      {exIndex + 1 < totalExercises && (
        <div className="bg-white/60 rounded-2xl p-4 mb-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-stone-100 flex items-center justify-center text-stone-500">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-semibold text-stone-400 tracking-wider uppercase">Up next</div>
            <div className="text-sm font-semibold text-stone-700 truncate">{session.exercises[exIndex + 1].name}</div>
          </div>
        </div>
      )}

      <button onClick={onComplete} className="mt-auto w-full py-5 rounded-2xl bg-orange-500 text-white font-bold text-lg shadow-lg shadow-orange-500/30 active:scale-[0.98] transition">
        ✓ Set complete
      </button>
    </div>
  );
}

function RestScreen({ remaining, total, nextExName, onSkip, add }) {
  const size = 240, strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = remaining / total;
  const dashOffset = circumference * (1 - pct);
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <div className="flex-1 flex flex-col">
      <div className="bg-white rounded-3xl shadow-sm p-6 mb-4 flex flex-col items-center">
        <div className="text-[11px] tracking-[0.2em] font-semibold text-cyan-600 mb-2">REST</div>
        <div className="text-xl font-bold text-stone-900 mb-6">Catch your breath</div>

        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgb(245 245 244)" strokeWidth={strokeWidth} />
            <circle cx={size/2} cy={size/2} r={radius} fill="none"
              stroke="rgb(8 145 178)" strokeWidth={strokeWidth} strokeLinecap="round"
              strokeDasharray={circumference} strokeDashoffset={dashOffset}
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-6xl font-bold text-stone-900 tabular-nums tracking-tight">{mins > 0 ? `${mins}:${String(secs).padStart(2,"0")}` : secs}</div>
            <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider mt-1">{mins > 0 ? "remaining" : "seconds"}</div>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button onClick={() => add(15)} className="px-4 py-2 rounded-xl bg-stone-100 text-stone-700 text-sm font-semibold active:scale-95 transition">+15s</button>
          <button onClick={onSkip} className="px-4 py-2 rounded-xl bg-stone-900 text-white text-sm font-semibold active:scale-95 transition">Skip rest</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 font-bold">→</div>
        <div className="flex-1">
          <div className="text-[10px] font-semibold text-stone-400 tracking-wider uppercase">Up next</div>
          <div className="text-sm font-semibold text-stone-800">{nextExName}</div>
        </div>
      </div>
    </div>
  );
}

function DoneScreen({ session, onClose, onSave, setLogs, weightUnit }) {
  const [note, setNote] = useState("");

  function finish() {
    // Record per-exercise overload data; convert to kg if user unit is lb
    session.exercises.forEach((ex, ei) => {
      for (let si = 0; si < ex.sets; si++) {
        const log = setLogs[`${ei}-${si}`];
        if (log && (log.reps || log.weight)) {
          const weightKg = weightUnit === 'lb' ? (log.weight || 0) * 0.4536 : (log.weight || 0);
          recordExerciseLog(ex.name, log.reps, weightKg);
        }
      }
    });

    if (onSave) {
      onSave({
        id: crypto.randomUUID(),
        source: 'circuit',
        date: new Date().toISOString().slice(0, 10),
        type: 'strength',
        focus: session.focus,
        durationMin: session.duration,
        setsCompleted: session.exercises.reduce((s, e) => s + e.sets, 0),
        totalSets: session.exercises.reduce((s, e) => s + e.sets, 0),
        completed: true,
        note: note.trim(),
      });
    } else {
      onClose();
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center">
      <div className="w-24 h-24 rounded-full bg-orange-500 flex items-center justify-center text-white text-4xl shadow-lg shadow-orange-500/30 mb-6">✓</div>
      <div className="text-[11px] tracking-[0.2em] font-semibold text-orange-500 mb-2">WORKOUT COMPLETE</div>
      <div className="text-3xl font-bold text-stone-900 mb-2">Strong work.</div>
      <div className="text-stone-500 max-w-xs mb-6">{session.exercises.length} exercises · {session.exercises.reduce((s,e)=>s+e.sets,0)} sets · {session.duration} min</div>

      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="Add a note… (optional)"
        rows={2}
        className="w-full max-w-xs bg-stone-100 rounded-2xl px-4 py-3 text-sm text-stone-700 placeholder-stone-400 resize-none focus:outline-none focus:ring-2 focus:ring-orange-300 mb-6"
      />

      <button onClick={finish} className="w-full max-w-xs py-4 rounded-2xl bg-stone-900 text-white font-bold active:scale-[0.98] transition">Back to home</button>
    </div>
  );
}

window.CircuitView = CircuitView;
