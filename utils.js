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

// Android hardware back button (packaged APK only — see mobile/README.md).
// A LIFO stack of "back handlers": any open modal, sub-screen, or full-screen
// overlay pushes its own close/onBack function while it's visible, so the
// most recently opened one is always what the hardware back button reaches.
// No-op in the browser/PWA — window.Capacitor is only present inside the
// Capacitor-wrapped native app.
const androidBackStack = [];

// active: whether this handler should currently be on the stack.
// handler: the existing close/onClose/onBack function to reuse — hardware
// back should always do exactly what the on-screen close control does.
// handler is read through a ref so callers can pass a fresh inline function
// on every render without the stack position churning (push/pop only
// happens when `active` itself flips, i.e. when the modal/screen actually
// opens or closes).
function useAndroidBack(active, handler) {
  const handlerRef = React.useRef(handler);
  React.useEffect(() => { handlerRef.current = handler; });
  React.useEffect(() => {
    if (!active) return;
    const stableEntry = () => handlerRef.current();
    androidBackStack.push(stableEntry);
    return () => {
      const i = androidBackStack.indexOf(stableEntry);
      if (i !== -1) androidBackStack.splice(i, 1);
    };
  }, [active]);
}

// Called once at app startup. Registers the single native listener that
// drives the whole stack above.
function initAndroidBackButton() {
  if (!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform())) return;
  const App = window.Capacitor.Plugins && window.Capacitor.Plugins.App;
  if (!App || !App.addListener) return;
  App.addListener('backButton', () => {
    if (androidBackStack.length > 0) {
      androidBackStack[androidBackStack.length - 1]();
    } else {
      // Nothing left to close and no tab to fall back to — background the
      // app rather than killing the process (Android platform guidance).
      (App.minimizeApp || App.exitApp).call(App);
    }
  });
}

window.getTodayKey = getTodayKey;
window.todayIso = todayIso;
window.buildManualSession = buildManualSession;
window.useAndroidBack = useAndroidBack;
window.initAndroidBackButton = initAndroidBackButton;
