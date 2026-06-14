// Shared utilities — loaded after store.js, available to all JSX/JS files

// Today's day key (Mon/Tue/.../Sun)
function getTodayKey() {
  return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date().getDay()];
}

// Today as ISO date string (YYYY-MM-DD)
function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

// Build a manual/quick-log session record with sensible defaults per type
function buildManualSession({ type, focus, dateIso, durationMin, setsCompleted, totalSets, note }) {
  const defaultSets = type === 'rest' ? 0 : type === 'hiit' ? 1 : 9;
  return {
    id: crypto.randomUUID(),
    source: 'manual',
    date: dateIso,
    type,
    focus,
    durationMin: durationMin ?? (type === 'rest' ? 0 : 18),
    setsCompleted: setsCompleted ?? defaultSets,
    totalSets: totalSets ?? defaultSets,
    completed: true,
    note: note ?? '',
  };
}

window.getTodayKey = getTodayKey;
window.todayIso = todayIso;
window.buildManualSession = buildManualSession;
