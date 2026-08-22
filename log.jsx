// Protein + Water logging — full-screen sheet from Home widgets

const { useState: useLS, useMemo: useLM, useEffect: useLE } = React;

function fmtLogDate(iso) {
  const todayIso = new Date().toISOString().slice(0, 10);
  if (iso === todayIso) return "Today";
  const d = new Date(iso + "T00:00:00");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((today - d) / 86400000);
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function LogScreen({ onClose, initialKind, initialWeekOffset, initialSelectedDay, log, setLog, presets, profile, weightLog }) {
  const [kind, setKind] = useLS(initialKind || "protein");
  const [weekOffset, setWeekOffset] = useLS(initialWeekOffset ?? 0);
  const [selectedDay, setSelectedDay] = useLS(initialSelectedDay ?? getTodayKey());

  const weekIsos = getWeekIsos(weekOffset);
  const weekDates = getWeekDates(weekOffset);
  const weekRange = getWeekRange(weekOffset);
  const selectedIdx = WEEK.findIndex(function(d) { return d.key === selectedDay; });
  const iso = weekIsos[selectedIdx] || weekIsos[0];
  const minWeekOffset = getMinWeekOffset();
  const canGoPrev = weekOffset > minWeekOffset;
  const canGoNext = weekOffset < 1;

  const weekLabel = weekOffset === 0 ? 'THIS WEEK'
    : weekOffset === -1 ? 'LAST WEEK'
    : weekOffset === 1 ? 'NEXT WEEK'
    : Math.abs(weekOffset) + ' WEEKS AGO';

  const dayLog = log[iso] || { protein: [], water: [] };
  const entries = dayLog[kind] || [];
  const total = kind === "protein"
    ? entries.reduce((s, e) => s + e.grams, 0)
    : entries.reduce((s, e) => s + e.ml, 0);
  const latestWeightKg = (weightLog || []).at(-1)?.kg ?? 75;
  const target = kind === "protein"
    ? Math.round(latestWeightKg * 1.6)
    : profile.waterTarget;
  const unit = kind === "protein" ? "g" : "ml";
  const accent = kind === "protein" ? "orange" : "cyan";
  const pct = Math.min(100, (total / target) * 100);

  function addPreset(p) {
    const next = { ...log };
    const cur = next[iso] || { protein: [], water: [] };
    const ts = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
    const newEntry = kind === "protein"
      ? { id: "n" + Date.now() + Math.random().toString(36).slice(2,5), presetId: p.id, label: p.label, grams: p.grams, ts }
      : { id: "n" + Date.now() + Math.random().toString(36).slice(2,5), presetId: p.id, label: p.label, ml: p.ml, ts };
    next[iso] = { ...cur, [kind]: [...(cur[kind] || []), newEntry] };
    setLog(next);
  }

  function removeEntry(entryId) {
    const next = { ...log };
    const cur = next[iso] || { protein: [], water: [] };
    next[iso] = { ...cur, [kind]: (cur[kind] || []).filter(e => e.id !== entryId) };
    setLog(next);
  }

  const presetList = kind === "protein" ? presets.protein : presets.water;

  return (
    <div className="fixed inset-0 z-50 bg-stone-50 overflow-y-auto">
      <div className="max-w-md min-[600px]:max-w-xl mx-auto min-h-full px-5 pt-6 pb-10 flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={onClose} className="w-11 h-11 rounded-2xl bg-white shadow-sm flex items-center justify-center active:scale-95 transition" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <div className="text-center">
            <div className="text-[11px] tracking-[0.2em] font-semibold text-stone-400">DAILY LOG</div>
            <div className="text-sm font-semibold text-stone-800">{fmtLogDate(iso)}</div>
          </div>
          <div className="w-11 h-11" />
        </div>

        {/* Week navigator */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setWeekOffset(function(w) { return w - 1; })} disabled={!canGoPrev} aria-label="Previous week"
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition active:scale-90 ${canGoPrev ? 'bg-white shadow-sm text-stone-500 hover:bg-stone-50' : 'text-stone-200 cursor-default'}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div className="text-center">
            <div className="text-[10px] tracking-[0.2em] font-semibold text-stone-400">{weekLabel}</div>
            <div className="text-xs font-medium text-stone-500 mt-0.5">{weekRange}</div>
          </div>
          <button onClick={() => setWeekOffset(function(w) { return w + 1; })} disabled={!canGoNext} aria-label="Next week"
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition active:scale-90 ${canGoNext ? 'bg-white shadow-sm text-stone-500 hover:bg-stone-50' : 'text-stone-200 cursor-default'}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </div>

        {/* Kind tabs */}
        <div className="flex gap-1.5 bg-stone-100 rounded-2xl p-1 mb-4">
          <button onClick={() => setKind("protein")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${kind === "protein" ? "bg-orange-500 text-white shadow" : "text-stone-600"}`}>
            Protein
          </button>
          <button onClick={() => setKind("water")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${kind === "water" ? "bg-cyan-500 text-white shadow" : "text-stone-600"}`}>
            Water
          </button>
        </div>

        {/* Day strip — Mon to Sun for the selected week */}
        <div className="bg-white rounded-2xl shadow-sm p-2 mb-4">
          <div className="flex gap-1.5">
            {WEEK.map(function(d, i) {
              const dayIso = weekIsos[i];
              const sel = d.key === selectedDay;
              const hasData = !!log[dayIso] && ((log[dayIso].protein || []).length + (log[dayIso].water || []).length > 0);
              return (
                <button key={d.key} onClick={() => setSelectedDay(d.key)}
                  className={`flex-1 flex flex-col items-center py-2 rounded-xl transition ${
                    sel ? "bg-stone-900 text-white" : "text-stone-500 hover:bg-stone-50"
                  }`}>
                  <div className={`text-[9px] font-semibold uppercase ${sel ? "text-stone-300" : "text-stone-400"}`}>{d.key.slice(0,2)}</div>
                  <div className="text-sm font-bold tabular-nums mt-0.5">{weekDates[i]}</div>
                  <div className={`mt-1 w-1 h-1 rounded-full ${hasData ? (sel ? "bg-orange-400" : "bg-orange-500") : "bg-transparent"}`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Total ring */}
        <div className={`bg-white rounded-3xl shadow-sm p-6 mb-4 flex items-center gap-5`}>
          <RingProgress pct={pct} accent={accent} />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-semibold text-stone-400 tracking-wider uppercase">{kind} · {fmtLogDate(iso)}</div>
            <div className="flex items-baseline gap-1 mt-1">
              <div className="text-3xl font-bold text-stone-900 tabular-nums">{total}</div>
              <div className="text-sm font-medium text-stone-400">{unit}</div>
            </div>
            <div className="text-xs text-stone-500 mt-1">
              of <span className="font-semibold text-stone-700 tabular-nums">{target}{unit}</span> · {Math.max(0, target - total)}{unit} to go
            </div>
          </div>
        </div>

        {/* Presets grid */}
        <div className="text-[10px] font-bold text-stone-400 tracking-wider uppercase mb-2 px-1">Quick add</div>
        <div className="grid grid-cols-3 gap-2 mb-5">
          {presetList.map(p => (
            <button key={p.id} onClick={() => addPreset(p)}
              className="bg-white rounded-2xl shadow-sm p-3 text-left active:scale-95 hover:shadow transition">
              <div className="text-2xl">{p.emoji}</div>
              <div className="text-xs font-semibold text-stone-800 mt-1.5 leading-tight line-clamp-2">{p.label}</div>
              <div className={`text-[11px] font-bold tabular-nums mt-1 ${kind === "protein" ? "text-orange-600" : "text-cyan-600"}`}>
                +{kind === "protein" ? p.grams : p.ml}{unit}
              </div>
            </button>
          ))}
        </div>

        {/* Entries list */}
        <div className="text-[10px] font-bold text-stone-400 tracking-wider uppercase mb-2 px-1 flex items-center justify-between">
          <span>Entries · {fmtLogDate(iso)}</span>
          <span className="tabular-nums">{entries.length}</span>
        </div>
        <div className="bg-white rounded-3xl shadow-sm divide-y divide-stone-100 overflow-hidden">
          {entries.length === 0 && (
            <div className="text-center text-sm text-stone-400 py-8">No entries yet. Tap a preset above.</div>
          )}
          {entries.map(e => (
            <div key={e.id} className="flex items-center gap-3 px-5 py-3">
              <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-base flex-shrink-0">
                {(presetList.find(p => p.id === e.presetId) || {}).emoji || (kind === "protein" ? "🍽" : "💧")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-stone-800 truncate">{e.label}</div>
                <div className="text-[11px] text-stone-400 tabular-nums">{e.ts}</div>
              </div>
              <div className={`text-sm font-bold tabular-nums ${kind === "protein" ? "text-orange-600" : "text-cyan-600"}`}>
                +{kind === "protein" ? e.grams : e.ml}{unit}
              </div>
              <button onClick={() => removeEntry(e.id)}
                className="w-8 h-8 rounded-lg bg-stone-50 hover:bg-rose-50 hover:text-rose-500 text-stone-400 flex items-center justify-center transition active:scale-95"
                aria-label="Remove">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
          ))}
        </div>

        <div className="text-center text-[11px] text-stone-400 mt-6">
          Showing {fmtLogDate(iso)} · Edit any day since Apr 27
        </div>
      </div>
    </div>
  );
}

function RingProgress({ pct, accent }) {
  const size = 80, sw = 9;
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(1, pct / 100));
  const stroke = accent === "orange" ? "rgb(249 115 22)" : "rgb(6 182 212)";
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgb(245 245 244)" strokeWidth={sw} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={stroke} strokeWidth={sw}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-stone-900 tabular-nums">
        {Math.round(pct)}%
      </div>
    </div>
  );
}

// ---------- Presets manager (Settings → Manage presets) ----------
function PresetsManagerScreen({ onBack, presets, setPresets }) {
  const [kind, setKind] = useLS("protein");
  const [adding, setAdding] = useLS(false);
  const list = kind === "protein" ? presets.protein : presets.water;

  function remove(id) {
    setPresets({ ...presets, [kind]: list.filter(p => p.id !== id) });
  }
  function add(p) {
    setPresets({ ...presets, [kind]: [...list, p] });
    setAdding(false);
  }

  return (
    <>
      <SubpageHeader title="Manage presets" onBack={onBack} />
      <div className="flex gap-1.5 bg-stone-100 rounded-2xl p-1 mb-4">
        <button onClick={() => setKind("protein")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${kind === "protein" ? "bg-orange-500 text-white shadow" : "text-stone-600"}`}>Protein</button>
        <button onClick={() => setKind("water")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${kind === "water" ? "bg-cyan-500 text-white shadow" : "text-stone-600"}`}>Water</button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm divide-y divide-stone-100 mb-4 overflow-hidden">
        {list.map(p => (
          <div key={p.id} className="flex items-center gap-3 px-5 py-3">
            <div className="w-9 h-9 rounded-xl bg-stone-100 flex items-center justify-center text-lg flex-shrink-0">{p.emoji}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-stone-800 truncate">{p.label}</div>
              <div className={`text-xs font-bold tabular-nums ${kind === "protein" ? "text-orange-600" : "text-cyan-600"}`}>
                {kind === "protein" ? `${p.grams}g` : `${p.ml}ml`}
              </div>
            </div>
            <button onClick={() => remove(p.id)}
              className="w-9 h-9 rounded-xl bg-stone-100 hover:bg-rose-100 hover:text-rose-600 text-stone-500 flex items-center justify-center transition" aria-label="Remove">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
            </button>
          </div>
        ))}
        {list.length === 0 && <div className="text-center text-sm text-stone-400 py-8">No presets. Add one below.</div>}
      </div>

      <button onClick={() => setAdding(true)}
        className="w-full py-4 rounded-2xl bg-stone-900 text-white font-bold active:scale-[0.98] transition flex items-center justify-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
        Add {kind} preset
      </button>

      {adding && <AddPresetModal kind={kind} onClose={() => setAdding(false)} onAdd={add} />}
    </>
  );
}

function AddPresetModal({ kind, onClose, onAdd }) {
  const [label, setLabel] = useLS("");
  const [amount, setAmount] = useLS("");
  const [emoji, setEmoji] = useLS(kind === "protein" ? "🍽" : "💧");
  const valid = label.trim() && Number(amount) > 0;
  function submit() {
    if (!valid) return;
    const id = (kind === "protein" ? "p_" : "w_") + Math.random().toString(36).slice(2, 7);
    const p = kind === "protein"
      ? { id, label: label.trim(), grams: Number(amount), emoji }
      : { id, label: label.trim(), ml: Number(amount), emoji };
    onAdd(p);
  }
  return (
    <div className="fixed inset-0 z-50 bg-stone-900/50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-md p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[11px] tracking-[0.2em] font-semibold text-stone-400">NEW PRESET</div>
            <div className="text-lg font-bold text-stone-900 capitalize">{kind} item</div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-stone-100 flex items-center justify-center text-stone-500 active:scale-95 transition">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="mb-3">
          <div className="text-[10px] font-semibold text-stone-500 tracking-wider uppercase mb-1.5">Label</div>
          <input type="text" value={label} onChange={e => setLabel(e.target.value)}
            placeholder={kind === "protein" ? "Tofu · 100g" : "Mug"}
            className="w-full bg-stone-50 rounded-xl px-3 py-3 text-sm font-medium border border-stone-200 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100" />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <div className="text-[10px] font-semibold text-stone-500 tracking-wider uppercase mb-1.5">Amount ({kind === "protein" ? "g" : "ml"})</div>
            <input type="number" inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder={kind === "protein" ? "20" : "300"}
              className="w-full bg-stone-50 rounded-xl px-3 py-3 text-sm font-bold tabular-nums border border-stone-200 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100" />
          </div>
          <div>
            <div className="text-[10px] font-semibold text-stone-500 tracking-wider uppercase mb-1.5">Emoji</div>
            <input type="text" value={emoji} onChange={e => setEmoji(e.target.value.slice(0, 2))}
              maxLength={2}
              className="w-full bg-stone-50 rounded-xl px-3 py-3 text-2xl text-center border border-stone-200 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100" />
          </div>
        </div>

        <button onClick={submit} disabled={!valid}
          className={`w-full py-4 rounded-2xl text-white font-bold disabled:bg-stone-200 disabled:text-stone-400 active:scale-[0.98] transition shadow-lg disabled:shadow-none ${
            kind === "protein" ? "bg-orange-500 shadow-orange-500/30" : "bg-cyan-500 shadow-cyan-500/30"
          }`}>
          Add preset
        </button>
      </div>
    </div>
  );
}

window.LogScreen = LogScreen;
window.PresetsManagerScreen = PresetsManagerScreen;
