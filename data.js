// Workout + HIIT data, lifted from the PRD

// Fixed 7-day arrangement for the "Ultimate" plan: 3 strength (no repeats) + 2 run + 1 HIIT + 1 rest.
// Day order is deliberately chosen for recovery: LEGS is buffered by a non-leg day on both sides every
// week; the one unavoidable "hard day next to hard day" (4 hard days, only 3 buffer days available) is
// placed between Run 2 and HIIT — both moderate cardio, no heavy eccentric loading — immediately
// followed by the week's rest day.
const FIVE_K_WEEK = [
  { key: "Mon", full: "Monday",    type: "rest",     focus: "REST", title: "Rest day",                         duration: 0  },
  { key: "Tue", full: "Tuesday",   type: "strength", focus: "LEGS", title: "Legs — Quads, Glutes, Hamstrings", duration: 18 },
  { key: "Wed", full: "Wednesday", type: "strength", focus: "PUSH", title: "Push — Chest, Shoulders, Triceps", duration: 18 },
  { key: "Thu", full: "Thursday",  type: "run",      focus: "RUN",  title: "Run 1 — Run/Walk intervals",       duration: 22 },
  { key: "Fri", full: "Friday",    type: "strength", focus: "PULL", title: "Pull — Back + Biceps",             duration: 18 },
  { key: "Sat", full: "Saturday",  type: "run",       focus: "RUN",  title: "Run 2 — Run/Walk intervals",      duration: 22 },
  { key: "Sun", full: "Sunday",    type: "hiit",      focus: "HIIT", title: "HIIT — Fat burn + Cardio",        duration: 18 },
];

const PLANS = {
  standard: {
    id: 'standard', label: 'Standard', days: 5, restDays: 2,
    description: '3 strength + 2 HIIT',
    week: [
      { key: "Mon", full: "Monday",    type: "strength", focus: "PUSH",  title: "Push — Chest, Shoulders, Triceps", duration: 18 },
      { key: "Tue", full: "Tuesday",   type: "hiit",     focus: "HIIT",  title: "HIIT — Fat burn + Cardio",          duration: 18 },
      { key: "Wed", full: "Wednesday", type: "strength", focus: "LEGS",  title: "Legs — Quads, Glutes, Hamstrings",  duration: 18 },
      { key: "Thu", full: "Thursday",  type: "rest",     focus: "REST",  title: "Rest day",                          duration: 0  },
      { key: "Fri", full: "Friday",    type: "strength", focus: "PULL",  title: "Pull — Back + Biceps",              duration: 18 },
      { key: "Sat", full: "Saturday",  type: "hiit",     focus: "HIIT",  title: "HIIT — Fat burn + Cardio",          duration: 18 },
      { key: "Sun", full: "Sunday",    type: "rest",     focus: "REST",  title: "Rest day",                          duration: 0  },
    ],
  },
  intensive: {
    id: 'intensive', label: 'Intensive', days: 6, restDays: 1,
    description: '4 strength + 2 HIIT',
    week: [
      { key: "Mon", full: "Monday",    type: "rest",     focus: "REST",  title: "Rest day",                          duration: 0  },
      { key: "Tue", full: "Tuesday",   type: "strength", focus: "LEGS",  title: "Legs — Quads, Glutes, Hamstrings",  duration: 18 },
      { key: "Wed", full: "Wednesday", type: "hiit",     focus: "HIIT",  title: "HIIT — Fat burn + Cardio",          duration: 18 },
      { key: "Thu", full: "Thursday",  type: "strength", focus: "PUSH",  title: "Push — Chest, Shoulders, Triceps",  duration: 18 },
      { key: "Fri", full: "Friday",    type: "strength", focus: "LEGS",  title: "Legs — Quads, Glutes, Hamstrings",  duration: 18 },
      { key: "Sat", full: "Saturday",  type: "strength", focus: "PULL",  title: "Pull — Back + Biceps",              duration: 18 },
      { key: "Sun", full: "Sunday",    type: "hiit",     focus: "HIIT",  title: "HIIT — Fat burn + Cardio",          duration: 18 },
    ],
  },
  relaxed: {
    id: 'relaxed', label: 'Relaxed', days: 4, restDays: 3,
    description: '3 strength + 1 HIIT',
    week: [
      { key: "Mon", full: "Monday",    type: "strength", focus: "PUSH",  title: "Push — Chest, Shoulders, Triceps", duration: 18 },
      { key: "Tue", full: "Tuesday",   type: "hiit",     focus: "HIIT",  title: "HIIT — Fat burn + Cardio",          duration: 18 },
      { key: "Wed", full: "Wednesday", type: "rest",     focus: "REST",  title: "Rest day",                          duration: 0  },
      { key: "Thu", full: "Thursday",  type: "strength", focus: "LEGS",  title: "Legs — Quads, Glutes, Hamstrings",  duration: 18 },
      { key: "Fri", full: "Friday",    type: "rest",     focus: "REST",  title: "Rest day",                          duration: 0  },
      { key: "Sat", full: "Saturday",  type: "strength", focus: "PULL",  title: "Pull — Back + Biceps",              duration: 18 },
      { key: "Sun", full: "Sunday",    type: "rest",     focus: "REST",  title: "Rest day",                          duration: 0  },
    ],
  },
  ultimate: {
    id: 'ultimate', label: 'Ultimate', days: 6, restDays: 1,
    description: '3 strength + 2 run + 1 HIIT — 5K training built in',
    disclaimer: "New to exercise, or have a heart, joint, or breathing condition, or are pregnant? Check with a doctor before starting.",
    week: FIVE_K_WEEK,
  },
};

// 5K run-training progression: how many weeks the run-walk plan spans before it settles into
// continuous-running "maintenance" content (the final week repeats indefinitely). Progression through
// these weeks is driven by profile.fiveK.week (advanced only once both weekly runs are completed — see
// store.js) rather than by the calendar, so a user who skips weeks never loses progress or gets
// pushed into harder intervals before they're ready.
const FIVE_K_PROGRAM = { totalWeeks: 12 };

// WEEK is always the active plan's week — kept in sync by App during render.
// Initialise to standard so store.js helpers work before App mounts.
let WEEK = PLANS.standard.week;

// COMPLETED_DAYS is now derived from localStorage via getCompletedThisWeek() in store.js

const WARMUP_BY_FOCUS = {
  PUSH: [
    "30 sec — Arm circles (forward + back)",
    "30 sec — Shoulder rolls + chest opener",
    "30 sec — Wall push-up × 10 (slow, controlled)",
    "30 sec — Cross-body shoulder swings",
  ],
  LEGS: [
    "30 sec — Bodyweight squats × 10",
    "30 sec — Hip circles (each direction)",
    "30 sec — Leg swings (front to back, each leg)",
    "30 sec — Standing glute kickback × 10 each leg",
  ],
  PULL: [
    "30 sec — Cat-cow stretches",
    "30 sec — Shoulder rolls + thoracic rotation",
    "30 sec — Wide cross-body arm swings",
    "30 sec — Band pull-apart or chest expansion",
  ],
  RUN: [
    "5 min — Brisk walk, RPE 2-3 (easy, conversational)",
    "30 sec — Leg swings (front to back, each leg)",
    "30 sec — Walking high knees",
  ],
};

const COOLDOWN_BY_FOCUS = {
  PUSH: [
    "30 sec — Chest stretch (clasp hands behind back, lift)",
    "30 sec — Overhead tricep stretch (each arm)",
  ],
  LEGS: [
    "30 sec — Quad stretch (each leg)",
    "30 sec — Standing forward fold (reach for toes)",
  ],
  PULL: [
    "30 sec — Standing lat stretch (overhead reach, side lean)",
    "30 sec — Cross-body bicep stretch (each arm)",
  ],
  RUN: [
    "5 min — Slow walk",
    "30 sec — Calf stretch (each leg)",
    "30 sec — Quad stretch (each leg)",
  ],
};

const SESSIONS = {
  PUSH: {
    focus: "PUSH",
    title: "Push Day",
    subtitle: "Chest · Shoulders · Triceps",
    duration: 18,
    equipment: ["Dumbbells", "Bench"],
    exercises: [
      { name: "Dumbbell Bench Press",    sets: 3, reps: "10", rest: 60, muscles: "Chest, Shoulders, Triceps", youtubeId: "5Y3VZsLb1Ys",
        alternatives: [{ name: "Dumbbell Floor Press", muscles: "Chest, Shoulders, Triceps", youtubeId: "uqA6mNN46ow", tag: "No bench" }] },
      { name: "Dumbbell Shoulder Press", sets: 3, reps: "10", rest: 60, muscles: "Shoulders, Triceps",         youtubeId: "guW_ENwLOMI" },
      { name: "Incline Push-up",         sets: 3, reps: "10", rest: 45, muscles: "Chest, Triceps, Core",       youtubeId: "76TQU7iZlsI" },
    ],
  },
  LEGS: {
    focus: "LEGS",
    title: "Leg Day",
    subtitle: "Quads · Glutes · Hamstrings",
    duration: 18,
    equipment: ["Dumbbell", "Bench"],
    exercises: [
      { name: "Goblet Squat",      sets: 3, reps: "12",          rest: 60, muscles: "Quads, Glutes, Core",            youtubeId: "BR4tlEE_A98" },
      { name: "Dumbbell Lunge",    sets: 3, reps: "10 each leg", rest: 60, muscles: "Quads, Glutes, Hamstrings",      youtubeId: "CwLvExPdS5w",
        alternatives: [{ name: "Dumbbell Step-Up", muscles: "Quads, Glutes, Hamstrings", youtubeId: "DxUNi119Qzs", tag: "Easier form" }] },
      { name: "Romanian Deadlift", sets: 3, reps: "10",          rest: 60, muscles: "Hamstrings, Glutes, Lower Back", youtubeId: "uUjqvxEWcbo",
        alternatives: [{ name: "Dumbbell Sumo Deadlift", muscles: "Hamstrings, Glutes, Lower Back", youtubeId: "De9OUZz5W_I", tag: "Easier form" }] },
    ],
  },
  PULL: {
    focus: "PULL",
    title: "Pull Day",
    subtitle: "Back · Biceps",
    duration: 18,
    equipment: ["Dumbbells", "Bench"],
    exercises: [
      { name: "Bent Over Dumbbell Row",  sets: 3, reps: "10",      rest: 60, muscles: "Back, Biceps, Rear Delts", youtubeId: "dfkco3keMns" },
      { name: "Single Arm Dumbbell Row", sets: 3, reps: "10 each", rest: 60, muscles: "Lats, Rhomboids, Biceps",  youtubeId: "pYcpY20QaE8",
        alternatives: [{ name: "Dumbbell Reverse Fly", muscles: "Rear Delts, Rhomboids", youtubeId: "LsT-bR_zxLo", tag: "No bench" }] },
      { name: "Dumbbell Bicep Curl",     sets: 3, reps: "12",      rest: 45, muscles: "Biceps",                   youtubeId: "6DeLZ6cbgWQ" },
    ],
  },
};

// 12-week run-walk progression (Galloway/Couch-to-5K-style), used 2x/week by the Ultimate plan.
// Weeks 1-3 are a gentler on-ramp for anyone who finds the original Week 1 (now Week 4) too hard —
// shorter run bursts, longer recovery walks, easing up to that same 60s/90s pace by Week 4.
// Treadmill speed/incline are a *starting reference* paired with the RPE cue, not a target to chase —
// 1% incline is the standard rule of thumb to offset the lack of wind resistance indoors.
const RUN_SESSIONS = {
  w1: {
    id: "w1", title: "Week 1 · Run/Walk", subtitle: "10 × (20s run / 100s walk)", duration: 20,
    intervals: [
      { type: "run",  seconds: 20, rpe: "3-4 · light jog, easy to speak in full sentences",
        treadmill: { speed: "6.4-7.2 km/h (4.0-4.5 mph)", incline: "1%" } },
      { type: "walk", seconds: 100, rpe: "2-3 · easy recovery, full sentences",
        treadmill: { speed: "4.8-5.6 km/h (3.0-3.5 mph)", incline: "1%" } },
    ],
    repeat: 10,
    cue: "This is intentionally gentle — the goal is just getting comfortable with short bursts of running. If even 20 seconds feels like a lot today, walk it and try again next session.",
  },
  w2: {
    id: "w2", title: "Week 2 · Run/Walk", subtitle: "10 × (30s run / 90s walk)", duration: 20,
    intervals: [
      { type: "run",  seconds: 30, rpe: "3-4 · light jog, easy to speak in full sentences",
        treadmill: { speed: "6.8-7.7 km/h (4.2-4.8 mph)", incline: "1%" } },
      { type: "walk", seconds: 90, rpe: "2-3 · easy recovery, full sentences",
        treadmill: { speed: "4.8-5.6 km/h (3.0-3.5 mph)", incline: "1%" } },
    ],
    repeat: 10,
    cue: "Run segments are 10 seconds longer. If that's still too much, repeat week 1 rather than push through.",
  },
  w3: {
    id: "w3", title: "Week 3 · Run/Walk", subtitle: "8 × (45s run / 90s walk)", duration: 18,
    intervals: [
      { type: "run",  seconds: 45, rpe: "4 · comfortably breathless, short sentences",
        treadmill: { speed: "7.0-8.3 km/h (4.4-5.2 mph)", incline: "1%" } },
      { type: "walk", seconds: 90, rpe: "2-3 · easy recovery, full sentences",
        treadmill: { speed: "4.8-5.6 km/h (3.0-3.5 mph)", incline: "1%" } },
    ],
    repeat: 8,
    cue: "One more short step before the original Week 1 pace. Recovery walks matter more than run speed right now.",
  },
  w4: {
    id: "w4", title: "Week 4 · Run/Walk", subtitle: "8 × (60s run / 90s walk)", duration: 20,
    intervals: [
      { type: "run",  seconds: 60, rpe: "4-5 · breathless but able to speak in short sentences",
        treadmill: { speed: "7.2-8.9 km/h (4.5-5.5 mph)", incline: "1%" } },
      { type: "walk", seconds: 90, rpe: "2-3 · easy recovery, full sentences",
        treadmill: { speed: "4.8-5.6 km/h (3.0-3.5 mph)", incline: "1%" } },
    ],
    repeat: 8,
    cue: "Stop and walk if you feel sharp pain. Numbers are a starting point — adjust to match the effort level, not the other way around.",
  },
  w5: {
    id: "w5", title: "Week 5 · Run/Walk", subtitle: "6 × (90s run / 90s walk)", duration: 18,
    intervals: [
      { type: "run",  seconds: 90, rpe: "4-5 · breathless but able to speak in short sentences",
        treadmill: { speed: "8.0-9.3 km/h (5.0-5.8 mph)", incline: "1%" } },
      { type: "walk", seconds: 90, rpe: "2-3 · easy recovery, full sentences",
        treadmill: { speed: "4.8-5.6 km/h (3.0-3.5 mph)", incline: "1%" } },
    ],
    repeat: 6,
    cue: "Run segments are longer now — if 90s feels too hard, repeat week 4 instead of pushing through.",
  },
  w6: {
    id: "w6", title: "Week 6 · Run/Walk", subtitle: "4 × (3 min run / 2 min walk)", duration: 20,
    intervals: [
      { type: "run",  seconds: 180, rpe: "5-6 · comfortably hard, short sentences only",
        treadmill: { speed: "8.0-9.7 km/h (5.0-6.0 mph)", incline: "1%" } },
      { type: "walk", seconds: 120, rpe: "2-3 · easy recovery, full sentences",
        treadmill: { speed: "4.8-5.6 km/h (3.0-3.5 mph)", incline: "1%" } },
    ],
    repeat: 4,
    cue: "3-minute runs are a real step up. Full recovery on the walk breaks matters more than pace.",
  },
  w7: {
    id: "w7", title: "Week 7 · Run/Walk", subtitle: "3 × (5 min run / 3 min walk)", duration: 24,
    intervals: [
      { type: "run",  seconds: 300, rpe: "5-6 · comfortably hard, short sentences only",
        treadmill: { speed: "8.4-10.0 km/h (5.2-6.2 mph)", incline: "1%" } },
      { type: "walk", seconds: 180, rpe: "2-3 · easy recovery, full sentences",
        treadmill: { speed: "4.8-5.6 km/h (3.0-3.5 mph)", incline: "1%" } },
    ],
    repeat: 3,
    cue: "More than halfway through the program. Sore legs from LEGS day? Make sure you had your buffer day first.",
  },
  w8: {
    id: "w8", title: "Week 8 · Run/Walk", subtitle: "2 × (8 min run / 2 min walk)", duration: 20,
    intervals: [
      { type: "run",  seconds: 480, rpe: "5-6 · comfortably hard, short sentences only",
        treadmill: { speed: "8.9-10.5 km/h (5.5-6.5 mph)", incline: "1%" } },
      { type: "walk", seconds: 120, rpe: "2-3 · easy recovery, full sentences",
        treadmill: { speed: "4.8-5.6 km/h (3.0-3.5 mph)", incline: "1%" } },
    ],
    repeat: 2,
    cue: "Only 2 walk breaks left in the whole session — pace yourself from the start of each run.",
  },
  w9: {
    id: "w9", title: "Week 9 · Run/Walk", subtitle: "2 × (12 min run / 2 min walk)", duration: 28,
    intervals: [
      { type: "run",  seconds: 720, rpe: "5-6 · comfortably hard, short sentences only",
        treadmill: { speed: "8.9-10.5 km/h (5.5-6.5 mph)", incline: "1%" } },
      { type: "walk", seconds: 120, rpe: "2-3 · easy recovery, full sentences",
        treadmill: { speed: "4.8-5.6 km/h (3.0-3.5 mph)", incline: "1%" } },
    ],
    repeat: 2,
    cue: "Longest single runs yet. Ease into the first minute — don't start fast.",
  },
  w10: {
    id: "w10", title: "Week 10 · Run/Walk", subtitle: "2 × (15 min run / 90s walk)", duration: 33,
    intervals: [
      { type: "run",  seconds: 900, rpe: "5-6 · comfortably hard, short sentences only",
        treadmill: { speed: "9.3-10.9 km/h (5.8-6.8 mph)", incline: "1%" } },
      { type: "walk", seconds: 90, rpe: "2-3 · easy recovery, full sentences",
        treadmill: { speed: "4.8-5.6 km/h (3.0-3.5 mph)", incline: "1%" } },
    ],
    repeat: 2,
    cue: "You're running more than you're walking now. Feeling wiped from Sat/Sun? Log rest instead of Sunday's HIIT.",
  },
  w11: {
    id: "w11", title: "Week 11 · Almost there", subtitle: "25 min run / 1 min walk", duration: 26,
    intervals: [
      { type: "run",  seconds: 1500, rpe: "5-6 · comfortably hard, short sentences only",
        treadmill: { speed: "9.7-11.3 km/h (6.0-7.0 mph)", incline: "1%" } },
      { type: "walk", seconds: 60, rpe: "2-3 · easy recovery, full sentences",
        treadmill: { speed: "4.8-5.6 km/h (3.0-3.5 mph)", incline: "1%" } },
    ],
    repeat: 1,
    cue: "One walk break, right in the middle if you need it. Otherwise, keep going.",
  },
  w12: {
    id: "w12", title: "Week 12 · Continuous 5K", subtitle: "30 min continuous run", duration: 30,
    intervals: [
      { type: "run", seconds: 1800, rpe: "5-6 · comfortably hard, sustainable for the full 30 min",
        treadmill: { speed: "9.7-11.3 km/h (6.0-7.0 mph)", incline: "1%" } },
    ],
    repeat: 1,
    cue: "This is roughly a 5K for most beginners. Walking any time you need to is still a win — this content repeats each week from here as your maintenance run.",
  },
};

const HIIT_LIBRARY = {
  easy: {
    label: "Easy",
    sublabel: "Weeks 1–3 · No jumping",
    color: "emerald",
    videos: [
      { code: "E1", title: "30 Min Fat Burning HIIT for Total Beginners", channel: "OliverSjostrom",  duration: "30 min", id: "IPdLXThiOUU" },
      { code: "E2", title: "20 Min Full Body — No Jump, No Equipment",      channel: "OliverSjostrom",  duration: "20 min", id: "rURsh3DeFfE" },
      { code: "E3", title: "20 Min Full Body — Build Strength, No Jumping", channel: "OliverSjostrom",  duration: "20 min", id: "3luLa7LUW-E" },
      { code: "E4", title: "15 Min Cardio HIIT — All Standing",             channel: "Nobadaddiction",  duration: "15 min", id: "5Yt4WFNJR4I" },
    ],
  },
  medium: {
    label: "Medium",
    sublabel: "Weeks 4–7 · Mixed",
    color: "amber",
    videos: [
      { code: "M1", title: "15 Min Intense HIIT — All Standing, No Repeats",   channel: "OliverSjostrom",  duration: "15 min", id: "60sld33kyfw" },
      { code: "M2", title: "15 Min HIIT — Full Body, No Equipment",            channel: "OliverSjostrom",  duration: "15 min", id: "ZdomiL9J-RA" },
      { code: "M3", title: "20 Min Cardio HIIT — Full Body",                   channel: "OliverSjostrom",  duration: "20 min", id: "IBEfCSJeop4" },
      { code: "M4", title: "20 Min Full Body Cardio HIIT — No Repeat",         channel: "Nobadaddiction",  duration: "20 min", id: "mCG0ZqHc5hA" },
      { code: "M5", title: "15 Min Cardio HIIT — Full Body, No Equipment",     channel: "OliverSjostrom",  duration: "15 min", id: "k4pEypMO44c" },
    ],
  },
  tough: {
    label: "Tough",
    sublabel: "Week 8+ · High intensity",
    color: "rose",
    videos: [
      { code: "T1", title: "20 Min Intense HIIT — All Standing, No Repeats", channel: "OliverSjostrom",  duration: "20 min", id: "b0eXjl8rntU" },
      { code: "T2", title: "20 Min Intense HIIT — Full Body, No Repeats",    channel: "OliverSjostrom",  duration: "20 min", id: "1zEuC3MDRmI" },
      { code: "T3", title: "30 Min Cardio HIIT — All Standing, No Repeats",  channel: "OliverSjostrom",  duration: "30 min", id: "4l8ERXukrkA" },
      { code: "T4", title: "20 Min HIIT — All Standing, No Repeats (2025)",  channel: "OliverSjostrom",  duration: "20 min", id: "4pMvIGW7jlY" },
    ],
  },
};

window.PLANS = PLANS;
window.WEEK = WEEK;
window.WARMUP_BY_FOCUS = WARMUP_BY_FOCUS;
window.COOLDOWN_BY_FOCUS = COOLDOWN_BY_FOCUS;
window.SESSIONS = SESSIONS;
window.HIIT_LIBRARY = HIIT_LIBRARY;
window.RUN_SESSIONS = RUN_SESSIONS;
window.FIVE_K_PROGRAM = FIVE_K_PROGRAM;
window.FIVE_K_WEEK = FIVE_K_WEEK;

// ---- Shared week/calendar helpers (available to all JSX files) ----

const APP_START_ISO = '2026-04-27'; // App launch date — always a Monday

function getMondayUtc(weekOffset) {
  if (weekOffset === undefined) weekOffset = 0;
  const todayIso = new Date().toISOString().slice(0, 10);
  const todayUtc = new Date(todayIso + 'T12:00:00Z');
  const dow = todayUtc.getUTCDay();
  const mondayUtc = new Date(todayUtc);
  mondayUtc.setUTCDate(todayUtc.getUTCDate() - (dow === 0 ? 6 : dow - 1) + weekOffset * 7);
  return mondayUtc;
}

function getWeekIsos(weekOffset) {
  if (weekOffset === undefined) weekOffset = 0;
  const monday = getMondayUtc(weekOffset);
  return WEEK.map(function(_, i) {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

function getWeekDates(weekOffset) {
  if (weekOffset === undefined) weekOffset = 0;
  const monday = getMondayUtc(weekOffset);
  return WEEK.map(function(_, i) {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    return d.getUTCDate();
  });
}

function getWeekRange(weekOffset) {
  if (weekOffset === undefined) weekOffset = 0;
  const monday = getMondayUtc(weekOffset);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const fmt = function(d) { return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }); };
  return fmt(monday) + ' – ' + fmt(sunday);
}

function getMinWeekOffset() {
  const mondayApp = new Date(APP_START_ISO + 'T12:00:00Z');
  const mondayNow = getMondayUtc(0);
  return Math.round((mondayApp - mondayNow) / (7 * 86400000));
}

window.APP_START_ISO = APP_START_ISO;
window.getMondayUtc = getMondayUtc;
window.getWeekIsos = getWeekIsos;
window.getWeekDates = getWeekDates;
window.getWeekRange = getWeekRange;
window.getMinWeekOffset = getMinWeekOffset;

// ---- Nutrition logging ----
const DEFAULT_PROTEIN_PRESETS = [
  { id: "p_egg",     label: "Egg",            grams: 6,  emoji: "🥚" },
  { id: "p_paneer",  label: "Paneer · 100g",  grams: 18, emoji: "🧀" },
  { id: "p_whey",    label: "Whey scoop",     grams: 25, emoji: "🥛" },
  { id: "p_chicken", label: "Chicken · 100g", grams: 31, emoji: "🍗" },
  { id: "p_dalrice", label: "Dal + rice",     grams: 12, emoji: "🍚" },
  { id: "p_curd",    label: "Curd · 1 cup",   grams: 11, emoji: "🥣" },
];
const DEFAULT_WATER_PRESETS = [
  { id: "w_glass",  label: "Glass",  ml: 250,  emoji: "🥛" },
  { id: "w_bottle", label: "Bottle", ml: 500,  emoji: "🧴" },
  { id: "w_large",  label: "Large",  ml: 1000, emoji: "🚰" },
];

function getSeedLog() {
  return {};
}

window.DEFAULT_PROTEIN_PRESETS = DEFAULT_PROTEIN_PRESETS;
window.DEFAULT_WATER_PRESETS = DEFAULT_WATER_PRESETS;
window.getSeedLog = getSeedLog;

// ---- Meal planner constants & helpers ----

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

const ACTIVITY_MULTIPLIERS = {
  sedentary:      1.2,
  lightly_active: 1.375,
  active:         1.55,
};

/**
 * Mifflin-St Jeor TDEE (male) minus 200 kcal deficit for build+cut goal.
 * @param {object} profile  - must have .height (cm), .age
 * @param {number} weightKg - latest logged body weight
 * @param {string} activityLevel - key of ACTIVITY_MULTIPLIERS
 * @returns {number} daily calorie target (kcal, rounded)
 */
function calculateTDEE(profile, weightKg, activityLevel) {
  const kg  = weightKg || 75;
  const cm  = profile.height || 175;
  const age = profile.age    || 30;
  const bmr = (10 * kg) + (6.25 * cm) - (5 * age) + 5;
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] || ACTIVITY_MULTIPLIERS.lightly_active;
  return Math.round(bmr * multiplier - 200);
}

/**
 * Returns the effective daily calorie target:
 * - profile.calorieTargetOverride if set
 * - otherwise calculateTDEE from profile + latest weight log entry
 */
function getEffectiveCalTarget(profile, weightLog) {
  if (profile.calorieTargetOverride) return profile.calorieTargetOverride;
  const kg = (weightLog || []).at(-1)?.kg ?? 75;
  return calculateTDEE(profile, kg, profile.activityLevel || 'lightly_active');
}

window.MEAL_TYPES = MEAL_TYPES;
window.ACTIVITY_MULTIPLIERS = ACTIVITY_MULTIPLIERS;
window.calculateTDEE = calculateTDEE;
window.getEffectiveCalTarget = getEffectiveCalTarget;
