// Workout + HIIT data, lifted from the PRD

const WEEK = [
  { key: "Mon", full: "Monday",    type: "strength", focus: "PUSH",  title: "Push — Chest, Shoulders, Triceps", duration: 18 },
  { key: "Tue", full: "Tuesday",   type: "hiit",     focus: "HIIT",  title: "HIIT — Fat burn + Cardio",          duration: 18 },
  { key: "Wed", full: "Wednesday", type: "strength", focus: "LEGS",  title: "Legs — Quads, Glutes, Hamstrings",  duration: 18 },
  { key: "Thu", full: "Thursday",  type: "rest",     focus: "REST",  title: "Rest day",                          duration: 0  },
  { key: "Fri", full: "Friday",    type: "strength", focus: "PULL",  title: "Pull — Back + Biceps",              duration: 18 },
  { key: "Sat", full: "Saturday",  type: "hiit",     focus: "HIIT",  title: "HIIT — Fat burn + Cardio",          duration: 18 },
  { key: "Sun", full: "Sunday",    type: "rest",     focus: "REST",  title: "Rest day",                          duration: 0  },
];

// COMPLETED_DAYS is now derived from localStorage via getCompletedThisWeek() in store.js

const WARMUP = [
  "30 sec — Arm circles (forward + back)",
  "30 sec — Bodyweight squats × 10",
  "30 sec — Hip circles",
  "30 sec — Shoulder rolls + chest opener",
];

const COOLDOWN = [
  "30 sec — Quad stretch",
  "30 sec — Chest opener",
];

const SESSIONS = {
  PUSH: {
    focus: "PUSH",
    title: "Push Day",
    subtitle: "Chest · Shoulders · Triceps",
    duration: 18,
    equipment: ["Dumbbells", "Bench"],
    exercises: [
      { name: "Dumbbell Bench Press",    sets: 3, reps: "10", rest: 60, muscles: "Chest, Shoulders, Triceps", youtubeId: "5Y3VZsLb1Ys" },
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
      { name: "Dumbbell Lunge",    sets: 3, reps: "10 each leg", rest: 60, muscles: "Quads, Glutes, Hamstrings",      youtubeId: "CwLvExPdS5w" },
      { name: "Romanian Deadlift", sets: 3, reps: "10",          rest: 60, muscles: "Hamstrings, Glutes, Lower Back", youtubeId: "uUjqvxEWcbo" },
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
      { name: "Single Arm Dumbbell Row", sets: 3, reps: "10 each", rest: 60, muscles: "Lats, Rhomboids, Biceps",  youtubeId: "pYcpY20QaE8" },
      { name: "Dumbbell Bicep Curl",     sets: 3, reps: "12",      rest: 45, muscles: "Biceps",                   youtubeId: "6DeLZ6cbgWQ" },
    ],
  },
};

// Mock activity history — last 35 days. Each entry: ISO date, session focus, durationMin, setsCompleted, totalSets.
// type: 'strength' | 'hiit' | 'rest' (rest = explicit rest day, not a gap)
function _buildHistory() {
  const today = new Date(); today.setHours(0,0,0,0);
  const out = [];
  // Pattern: Mon=PUSH, Tue=HIIT, Wed=LEGS, Thu=rest, Fri=PULL, Sat=HIIT, Sun=rest
  const plan = [
    null,                                                    // Sun = rest
    { type: "strength", focus: "PUSH", duration: 18, total: 9 }, // Mon
    { type: "hiit",     focus: "HIIT", duration: 20, total: 1 }, // Tue
    { type: "strength", focus: "LEGS", duration: 19, total: 9 }, // Wed
    null,                                                    // Thu = rest
    { type: "strength", focus: "PULL", duration: 18, total: 9 }, // Fri
    { type: "hiit",     focus: "HIIT", duration: 18, total: 1 }, // Sat
  ];
  // Skips: simulate user missing a few sessions in past weeks
  const missDates = new Set(["2026-04-21", "2026-04-28", "2026-05-02"]);
  for (let i = 34; i >= 1; i--) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const slot = plan[d.getDay()];
    if (!slot) { out.push({ date: iso, type: "rest" }); continue; }
    if (missDates.has(iso)) { out.push({ date: iso, type: "missed", focus: slot.focus }); continue; }
    out.push({
      date: iso,
      type: slot.type,
      focus: slot.focus,
      duration: slot.duration + Math.floor(Math.random() * 3) - 1,
      setsCompleted: slot.total,
      totalSets: slot.total,
    });
  }
  return out;
}
const ACTIVITY_HISTORY = _buildHistory();

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

window.WEEK = WEEK;
window.WARMUP = WARMUP;
window.COOLDOWN = COOLDOWN;
window.SESSIONS = SESSIONS;
window.HIIT_LIBRARY = HIIT_LIBRARY;
window.ACTIVITY_HISTORY = ACTIVITY_HISTORY;

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

// TODAY_ISO is always computed dynamically
const TODAY_ISO = new Date().toISOString().slice(0, 10);

// Seed log only used if no localStorage data exists (first launch demo)
const _Y = new Date(); _Y.setDate(_Y.getDate() - 1);
const Y_ISO = _Y.toISOString().slice(0, 10);
const SEED_LOG = {
  [TODAY_ISO]: {
    protein: [
      { id: "e1", presetId: "p_egg",     label: "Egg",          grams: 6,  ts: "07:30" },
      { id: "e2", presetId: "p_egg",     label: "Egg",          grams: 6,  ts: "07:30" },
      { id: "e3", presetId: "p_curd",    label: "Curd · 1 cup", grams: 11, ts: "10:00" },
      { id: "e4", presetId: "p_chicken", label: "Chicken · 100g", grams: 31, ts: "13:15" },
      { id: "e5", presetId: "p_dalrice", label: "Dal + rice",   grams: 12, ts: "13:15" },
      { id: "e6", presetId: "p_whey",    label: "Whey scoop",   grams: 25, ts: "16:00" },
    ],
    water: [
      { id: "w1", presetId: "w_glass",  label: "Glass",  ml: 250, ts: "07:00" },
      { id: "w2", presetId: "w_bottle", label: "Bottle", ml: 500, ts: "10:30" },
      { id: "w3", presetId: "w_glass",  label: "Glass",  ml: 250, ts: "13:30" },
      { id: "w4", presetId: "w_bottle", label: "Bottle", ml: 500, ts: "15:00" },
    ],
  },
  [Y_ISO]: {
    protein: [
      { id: "ye1", presetId: "p_egg", label: "Egg", grams: 6,  ts: "08:00" },
      { id: "ye2", presetId: "p_chicken", label: "Chicken · 100g", grams: 31, ts: "13:00" },
      { id: "ye3", presetId: "p_whey", label: "Whey scoop", grams: 25, ts: "17:00" },
    ],
    water: [
      { id: "yw1", presetId: "w_bottle", label: "Bottle", ml: 500, ts: "09:00" },
      { id: "yw2", presetId: "w_bottle", label: "Bottle", ml: 500, ts: "13:00" },
      { id: "yw3", presetId: "w_glass",  label: "Glass",  ml: 250, ts: "18:00" },
    ],
  },
};

window.DEFAULT_PROTEIN_PRESETS = DEFAULT_PROTEIN_PRESETS;
window.DEFAULT_WATER_PRESETS = DEFAULT_WATER_PRESETS;
window.SEED_LOG = SEED_LOG;
window.TODAY_ISO = TODAY_ISO;
