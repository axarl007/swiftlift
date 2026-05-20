// tests/suggestion-engine.test.js
const { generateWeekPlan } = require('../suggestion-engine');

// ── Fixtures ──────────────────────────────────────────────────────────────

// A week's worth of ISO dates starting from a Monday
const WEEK_ISOS = [
  '2026-06-01', // Mon
  '2026-06-02', // Tue
  '2026-06-03', // Wed
  '2026-06-04', // Thu
  '2026-06-05', // Fri
  '2026-06-06', // Sat
  '2026-06-07', // Sun
];

// Standard 5-day plan: Mon=strength, Tue=hiit, Wed=strength, Thu=rest, Fri=strength, Sat=hiit, Sun=rest
const DAY_TYPES = ['strength', 'hiit', 'strength', 'rest', 'strength', 'hiit', 'rest'];

const BASE_INPUT = {
  meals: [],
  mealLog: {},
  calTarget: 1800,
  proteinTarget: 120,
  weekIsos: WEEK_ISOS,
  dayTypes: DAY_TYPES,
  todayIso: WEEK_ISOS[0],
};

// Helper: create a meal item
function meal(id, type, protein_g, calories, extra = {}) {
  return { id: `m_${id}`, name: `Meal ${id}`, type, protein_g, calories, tags: [], emoji: null, source: 'manual', createdAt: '2026-01-01', ...extra };
}

// Full library with multiple options per slot
function fullLibrary() {
  return [
    // Breakfasts
    meal('b1', 'breakfast', 15, 350),
    meal('b2', 'breakfast', 12, 300),
    meal('b3', 'breakfast', 18, 400),
    meal('b4', 'breakfast', 10, 280),
    meal('b5', 'breakfast', 20, 380),
    meal('b6', 'breakfast', 14, 320),
    meal('b7', 'breakfast', 16, 360),
    // Lunches
    meal('l1', 'lunch', 25, 500),
    meal('l2', 'lunch', 22, 450),
    meal('l3', 'lunch', 28, 520),
    meal('l4', 'lunch', 20, 420),
    meal('l5', 'lunch', 30, 550),
    meal('l6', 'lunch', 18, 400),
    meal('l7', 'lunch', 24, 480),
    // Dinners
    meal('d1', 'dinner', 35, 500),
    meal('d2', 'dinner', 30, 480),
    meal('d3', 'dinner', 40, 520),
    meal('d4', 'dinner', 28, 460),
    meal('d5', 'dinner', 38, 510),
    meal('d6', 'dinner', 32, 490),
    meal('d7', 'dinner', 36, 505),
    // Snacks
    meal('s1', 'snack', 20, 200),
    meal('s2', 'snack', 17, 150),
  ];
}

// ── Basic generation ──────────────────────────────────────────────────────

describe('Basic generation', () => {
  test('Generates a complete 7-day plan with all 3 main slots filled', () => {
    const plan = generateWeekPlan({ ...BASE_INPUT, meals: fullLibrary() });
    expect(Object.keys(plan)).toHaveLength(7);
    WEEK_ISOS.forEach(iso => {
      expect(plan[iso].breakfast).not.toBeNull();
      expect(plan[iso].lunch).not.toBeNull();
      expect(plan[iso].dinner).not.toBeNull();
    });
  });

  test('Output has exactly 7 keys matching weekIsos', () => {
    const plan = generateWeekPlan({ ...BASE_INPUT, meals: fullLibrary() });
    expect(Object.keys(plan).sort()).toEqual([...WEEK_ISOS].sort());
  });

  test('Each slot entry has meal_id, meal_name, protein_g, calories', () => {
    const plan = generateWeekPlan({ ...BASE_INPUT, meals: fullLibrary() });
    const slot = plan[WEEK_ISOS[0]].breakfast;
    expect(slot).toHaveProperty('meal_id');
    expect(slot).toHaveProperty('meal_name');
    expect(slot).toHaveProperty('protein_g');
    expect(typeof slot.protein_g).toBe('number');
  });

  test('Source is "suggested" for generated slots', () => {
    const plan = generateWeekPlan({ ...BASE_INPUT, meals: fullLibrary() });
    expect(plan[WEEK_ISOS[0]].breakfast.source).toBe('suggested');
  });
});

// ── No-repeat rules ───────────────────────────────────────────────────────

describe('No-repeat rules', () => {
  test('No meal appears in same slot on consecutive days', () => {
    const plan = generateWeekPlan({ ...BASE_INPUT, meals: fullLibrary() });
    for (let i = 0; i < WEEK_ISOS.length - 1; i++) {
      const today    = plan[WEEK_ISOS[i]];
      const tomorrow = plan[WEEK_ISOS[i + 1]];
      ['breakfast', 'lunch', 'dinner'].forEach(slot => {
        if (today[slot] && tomorrow[slot]) {
          expect(today[slot].meal_id).not.toBe(tomorrow[slot].meal_id);
        }
      });
    }
  });

  test('No meal appears in same slot more than once in the week', () => {
    const plan = generateWeekPlan({ ...BASE_INPUT, meals: fullLibrary() });
    ['breakfast', 'lunch', 'dinner'].forEach(slot => {
      const ids = WEEK_ISOS.map(iso => plan[iso][slot]?.meal_id).filter(Boolean);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });
  });

  test('Library of 2 breakfasts: both used, no consecutive repeat, no exception', () => {
    const smallMeals = [
      meal('b1', 'breakfast', 15, 350),
      meal('b2', 'breakfast', 12, 300),
      ...['l1','l2','l3','l4','l5','l6','l7'].map((id,i) => meal(id, 'lunch',   20+i, 400+i*10)),
      ...['d1','d2','d3','d4','d5','d6','d7'].map((id,i) => meal(id, 'dinner',  30+i, 480+i*10)),
    ];
    expect(() => {
      const plan = generateWeekPlan({ ...BASE_INPUT, meals: smallMeals });
      // Check no consecutive breakfast repeat
      for (let i = 0; i < WEEK_ISOS.length - 1; i++) {
        const a = plan[WEEK_ISOS[i]].breakfast;
        const b = plan[WEEK_ISOS[i + 1]].breakfast;
        if (a && b) expect(a.meal_id).not.toBe(b.meal_id);
      }
    }).not.toThrow();
  });
});

// ── Small library fallback ────────────────────────────────────────────────

describe('Small library fallback', () => {
  test('1 breakfast option: used every day, warnings array contains breakfast warning each day', () => {
    const oneMeals = [
      meal('b1', 'breakfast', 15, 350),
      ...['l1','l2','l3','l4','l5','l6','l7'].map((id,i) => meal(id, 'lunch',   20, 400)),
      ...['d1','d2','d3','d4','d5','d6','d7'].map((id,i) => meal(id, 'dinner',  30, 480)),
    ];
    const plan = generateWeekPlan({ ...BASE_INPUT, meals: oneMeals });
    WEEK_ISOS.forEach(iso => {
      expect(plan[iso].breakfast).not.toBeNull();
      expect(plan[iso].breakfast.meal_id).toBe('m_b1');
      const hasWarning = plan[iso].warnings.some(w => w.slot === 'breakfast');
      expect(hasWarning).toBe(true);
    });
  });

  test('0 meals for a slot: slot is null, warning added', () => {
    // No dinner meals at all
    const nodinnerMeals = [
      meal('b1', 'breakfast', 15, 350),
      meal('b2', 'breakfast', 12, 300),
      meal('l1', 'lunch',     22, 450),
      meal('l2', 'lunch',     25, 480),
    ];
    const plan = generateWeekPlan({ ...BASE_INPUT, meals: nodinnerMeals });
    WEEK_ISOS.forEach(iso => {
      expect(plan[iso].dinner).toBeNull();
      const hasWarning = plan[iso].warnings.some(w => w.slot === 'dinner');
      expect(hasWarning).toBe(true);
    });
  });
});

// ── Training vs rest day priority ─────────────────────────────────────────

describe('Training vs rest day priority', () => {
  // Two lunch options with same calories but different protein
  const highProteinLunch = meal('lH', 'lunch', 40, 500);   // high protein
  const lowProteinLunch  = meal('lL', 'lunch', 10, 500);   // low protein, same calories

  // Need breakfasts + dinners to fill the rest of the slots
  const fillerBreakfasts = ['bf1','bf2','bf3','bf4','bf5','bf6','bf7'].map((id,i) =>
    meal(id, 'breakfast', 15, 300));
  const fillerDinners    = ['dd1','dd2','dd3','dd4','dd5','dd6','dd7'].map((id,i) =>
    meal(id, 'dinner', 30, 400));

  test('Training day: higher protein/calorie ratio meal preferred', () => {
    const meals = [highProteinLunch, lowProteinLunch, ...fillerBreakfasts, ...fillerDinners];
    // All training days
    const allTraining = ['strength','strength','strength','strength','strength','strength','strength'];
    const plan = generateWeekPlan({ ...BASE_INPUT, meals, dayTypes: allTraining });
    // On training days, high-protein lunch should be preferred on at least the first day
    // (both options have same calories; high protein wins)
    expect(plan[WEEK_ISOS[0]].lunch.meal_id).toBe('m_lH');
  });

  test('Rest day: lower calorie meal preferred', () => {
    const highCalLunch = meal('lHC', 'lunch', 22, 700);  // higher calories
    const lowCalLunch  = meal('lLC', 'lunch', 22, 300);  // lower calories, same protein
    const meals = [highCalLunch, lowCalLunch, ...fillerBreakfasts, ...fillerDinners];
    // All rest days
    const allRest = ['rest','rest','rest','rest','rest','rest','rest'];
    const plan = generateWeekPlan({ ...BASE_INPUT, meals, dayTypes: allRest });
    // On rest days, low-calorie lunch should be preferred
    expect(plan[WEEK_ISOS[0]].lunch.meal_id).toBe('m_lLC');
  });
});

// ── Snack logic ───────────────────────────────────────────────────────────

describe('Snack logic', () => {
  // Low-protein, low-calorie meals — 3 of them leave big gaps
  const gapMeals = [
    meal('b1', 'breakfast', 10, 200),
    meal('l1', 'lunch',     10, 200),
    meal('d1', 'dinner',    10, 200),
    meal('s1', 'snack',     20, 200),
  ];
  // High-protein, high-calorie meals — 3 of them cover targets
  const coverMeals = [
    meal('b2', 'breakfast', 50, 700),
    meal('l2', 'lunch',     50, 700),
    meal('d2', 'dinner',    50, 700),
    meal('s2', 'snack',     20, 200),
  ];

  const singleDay    = ['strength'];
  const singleWeek   = [WEEK_ISOS[0]];

  test('Snack is null when 3 meals cover both targets', () => {
    // 3 × 50g protein = 150g > 120g target; 3 × 700 cal = 2100 > 1800 target
    const plan = generateWeekPlan({
      ...BASE_INPUT,
      meals: coverMeals,
      weekIsos: singleWeek,
      dayTypes: singleDay,
    });
    expect(plan[WEEK_ISOS[0]].snack).toBeNull();
  });

  test('Snack is null when only protein gap exists but calories are met', () => {
    // Low protein but adequate calories
    const mixedMeals = [
      meal('b1', 'breakfast', 5, 700),
      meal('l1', 'lunch',     5, 700),
      meal('d1', 'dinner',    5, 700),
      meal('s1', 'snack',     20, 100),
    ];
    // 3 × 700 cal = 2100 > 1800 → calorie gap = -300 (not > 150); protein gap = 105g > 20g
    // Should NOT add snack because calorie gap not met
    const plan = generateWeekPlan({
      ...BASE_INPUT,
      meals: mixedMeals,
      weekIsos: singleWeek,
      dayTypes: singleDay,
    });
    expect(plan[WEEK_ISOS[0]].snack).toBeNull();
  });

  test('Snack is null when only calorie gap exists but protein is met', () => {
    // High protein but low calories
    const mixedMeals = [
      meal('b1', 'breakfast', 50, 200),
      meal('l1', 'lunch',     50, 200),
      meal('d1', 'dinner',    50, 200),
      meal('s1', 'snack',     20, 200),
    ];
    // 3 × 50g protein = 150g > 120g → protein gap = -30 (not > 20); calorie gap = 1200 > 150
    // Should NOT add snack because protein gap not met
    const plan = generateWeekPlan({
      ...BASE_INPUT,
      meals: mixedMeals,
      weekIsos: singleWeek,
      dayTypes: singleDay,
    });
    expect(plan[WEEK_ISOS[0]].snack).toBeNull();
  });

  test('Snack is non-null when both protein gap > 20g AND calorie gap > 150 kcal', () => {
    // 3 × 10g protein = 30g; gap = 90g > 20g ✓
    // 3 × 200 cal = 600; gap = 1200 > 150 ✓
    const plan = generateWeekPlan({
      ...BASE_INPUT,
      meals: gapMeals,
      weekIsos: singleWeek,
      dayTypes: singleDay,
    });
    expect(plan[WEEK_ISOS[0]].snack).not.toBeNull();
    expect(plan[WEEK_ISOS[0]].snack.meal_id).toBe('m_s1');
  });
});

// ── Frozen logged days ────────────────────────────────────────────────────

describe('Frozen logged days', () => {
  const loggedEntry = {
    meal_id:   'm_existing_b',
    meal_name: 'Already Logged Breakfast',
    protein_g: 25,
    calories:  400,
    logged_at: '08:00',
  };

  test('Day already in mealLog is not re-generated', () => {
    const mealLog = {
      [WEEK_ISOS[0]]: { breakfast: loggedEntry, lunch: null, dinner: null, snack: null },
    };
    const plan = generateWeekPlan({ ...BASE_INPUT, meals: fullLibrary(), mealLog });
    expect(plan[WEEK_ISOS[0]].breakfast.meal_id).toBe('m_existing_b');
    expect(plan[WEEK_ISOS[0]].breakfast.source).toBe('logged');
  });

  test('Fully logged day breakfast matches existing log, not a new suggestion', () => {
    const fullDayLog = {
      breakfast: { ...loggedEntry, meal_id: 'm_log_b' },
      lunch:     { meal_id: 'm_log_l', meal_name: 'Logged Lunch',   protein_g: 22, calories: 480, logged_at: '13:00' },
      dinner:    { meal_id: 'm_log_d', meal_name: 'Logged Dinner',  protein_g: 35, calories: 500, logged_at: '19:00' },
      snack:     null,
    };
    const mealLog = { [WEEK_ISOS[0]]: fullDayLog };
    const plan = generateWeekPlan({ ...BASE_INPUT, meals: fullLibrary(), mealLog });
    expect(plan[WEEK_ISOS[0]].breakfast.meal_id).toBe('m_log_b');
    expect(plan[WEEK_ISOS[0]].lunch.meal_id).toBe('m_log_l');
    expect(plan[WEEK_ISOS[0]].dinner.meal_id).toBe('m_log_d');
  });

  test('Unlogged days are still generated even if earlier days are logged', () => {
    const mealLog = {
      [WEEK_ISOS[0]]: {
        breakfast: loggedEntry,
        lunch: { meal_id: 'm_log_l', meal_name: 'L', protein_g: 22, calories: 480, logged_at: '13:00' },
        dinner: null,
        snack: null,
      },
    };
    const plan = generateWeekPlan({ ...BASE_INPUT, meals: fullLibrary(), mealLog });
    // Day 2 onwards should be freshly generated
    expect(plan[WEEK_ISOS[1]].breakfast).not.toBeNull();
    expect(plan[WEEK_ISOS[1]].breakfast.source).toBe('suggested');
  });
});

// ── Determinism ───────────────────────────────────────────────────────────

describe('Determinism', () => {
  test('Two calls with identical inputs return identical outputs', () => {
    const input = { ...BASE_INPUT, meals: fullLibrary() };
    const plan1 = generateWeekPlan(input);
    const plan2 = generateWeekPlan(input);
    expect(JSON.stringify(plan1)).toBe(JSON.stringify(plan2));
  });
});
