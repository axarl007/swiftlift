// suggestion-engine.js — Swiftlift weekly meal plan generator
// Pure function: no localStorage, no DOM, no React side effects.
// Works in both browser (window global) and Node.js (module.exports) for Jest.

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.generateWeekPlan = factory().generateWeekPlan;
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  const SLOTS = ['breakfast', 'lunch', 'dinner'];
  const PROTEIN_GAP_THRESHOLD = 20;  // g  — snack trigger
  const CAL_GAP_THRESHOLD     = 150; // kcal — snack trigger

  // ── Helpers ───────────────────────────────────────────────────────────────

  // Returns ISO date string DAYS days before the given ISO string
  function daysAgo(isoDate, days) {
    const d = new Date(isoDate + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() - days);
    return d.toISOString().slice(0, 10);
  }

  // Build a usage history map: { [slot]: Map<meal_id, lastUsedIso> }
  // Sources: mealLog (past logged entries) + already-planned days in the current week plan
  function buildUsageHistory(mealLog, plannedDays) {
    const history = { breakfast: new Map(), lunch: new Map(), dinner: new Map(), snack: new Map() };

    // From persisted meal log
    Object.entries(mealLog || {}).forEach(([date, dayEntry]) => {
      SLOTS.concat(['snack']).forEach(slot => {
        const entry = dayEntry[slot];
        if (!entry || !entry.meal_id) return;
        const prev = history[slot].get(entry.meal_id);
        if (!prev || date > prev) history[slot].set(entry.meal_id, date);
      });
    });

    // From already-planned days earlier in this week's generation pass
    Object.entries(plannedDays || {}).forEach(([date, dayPlan]) => {
      SLOTS.concat(['snack']).forEach(slot => {
        const entry = dayPlan[slot];
        if (!entry || !entry.meal_id) return;
        const prev = history[slot].get(entry.meal_id);
        if (!prev || date > prev) history[slot].set(entry.meal_id, date);
      });
    });

    return history;
  }

  // Pick the best meal for a slot given:
  //   - candidates: filtered MealItem[]
  //   - isTrainingDay: bool (protein-first vs calorie-first)
  //   - remainingCalBudget: kcal left after other slots
  //   - proteinFloor: minimum protein needed from this slot
  function pickBestMeal(candidates, isTrainingDay, remainingCalBudget, proteinFloor) {
    if (!candidates.length) return null;

    if (isTrainingDay) {
      // Protein-first: highest protein/calorie ratio within remaining calorie budget
      // Candidates without calorie data are treated as within budget
      const withinBudget = candidates.filter(m =>
        m.calories == null || m.calories <= remainingCalBudget
      );
      const pool = withinBudget.length > 0 ? withinBudget : candidates; // fallback: ignore budget
      return pool.reduce((best, m) => {
        const ratioM    = m.calories ? m.protein_g / m.calories : m.protein_g;
        const ratioBest = best.calories ? best.protein_g / best.calories : best.protein_g;
        return ratioM > ratioBest ? m : best;
      });
    } else {
      // Calorie-first: lowest calories, with soft protein floor
      const aboveFloor = candidates.filter(m => m.protein_g >= proteinFloor);
      const pool = aboveFloor.length > 0 ? aboveFloor : candidates; // fallback: ignore floor
      return pool.reduce((best, m) => {
        const calM    = m.calories ?? Infinity;
        const calBest = best.calories ?? Infinity;
        return calM < calBest ? m : best;
      });
    }
  }

  // Select a meal for a slot, respecting the 7-day no-repeat window.
  // Returns { meal, warning } — warning is null or a string message.
  function selectMeal(meals, slot, isoDate, usageHistory, isTrainingDay, remainingCalBudget, proteinFloor) {
    const pool = meals.filter(m => m.type === slot);
    if (pool.length === 0) {
      return {
        meal: null,
        warning: `Add ${slot} meals to your library to get suggestions`,
      };
    }

    const history    = usageHistory[slot];
    const windowStart = daysAgo(isoDate, 7);

    // Exclude meals used in the same slot within the last 7 days
    const eligible = pool.filter(m => {
      const lastUsed = history.get(m.id);
      return !lastUsed || lastUsed < windowStart;
    });

    let warning = null;

    // Nudge if only 1 option exists for this slot type
    if (pool.length === 1) {
      warning = `Add more ${slot} options for variety`;
    }

    if (eligible.length === 0) {
      // All meals recently used — fall back strictly to least-recently-used.
      // Do NOT run pickBestMeal here: variety (recency) takes priority over
      // nutrition optimisation when the 7-day window is exhausted.
      const lru = [...pool].sort((a, b) => {
        const la = history.get(a.id) || '';
        const lb = history.get(b.id) || '';
        return la.localeCompare(lb); // oldest first → first element is LRU
      });
      return { meal: lru[0] || null, warning };
    }

    const meal = pickBestMeal(eligible, isTrainingDay, remainingCalBudget, proteinFloor);
    return { meal, warning };
  }

  // Convert a MealItem into a SlotEntry (snapshot)
  function toSlotEntry(meal) {
    return {
      meal_id:    meal.id,
      meal_name:  meal.name,
      protein_g:  meal.protein_g,
      calories:   meal.calories ?? null,
      source:     'suggested',
    };
  }

  // ── Core generator ────────────────────────────────────────────────────────
  /**
   * generateWeekPlan(input) → WeekPlan
   *
   * @param {object}   input
   * @param {object[]} input.meals          - full meal library
   * @param {object}   input.mealLog        - swiftlift_meal_log (frozen logged days)
   * @param {number}   input.calTarget      - daily calorie target
   * @param {number}   input.proteinTarget  - daily protein target (g)
   * @param {string[]} input.weekIsos       - 7 ISO dates Mon→Sun
   * @param {string[]} input.dayTypes       - 'strength'|'hiit'|'rest' aligned to weekIsos
   * @param {string}   input.todayIso       - today's ISO date (unused in generation, kept for callers)
   *
   * @returns {{ [isoDate]: DayPlan }}
   * DayPlan: { breakfast, lunch, dinner, snack, warnings: [] }
   */
  function generateWeekPlan({ meals, mealLog, calTarget, proteinTarget, weekIsos, dayTypes }) {
    const plan = {};

    // Process each day in order so earlier days inform later ones (no-repeat within week)
    for (let i = 0; i < weekIsos.length; i++) {
      const isoDate   = weekIsos[i];
      const dayType   = dayTypes[i] || 'rest';
      const isTraining = dayType === 'strength' || dayType === 'hiit';

      // Skip days that are already fully logged — keep them frozen
      const existingLog = (mealLog || {})[isoDate];
      if (existingLog && (existingLog.breakfast || existingLog.lunch || existingLog.dinner)) {
        plan[isoDate] = {
          breakfast: existingLog.breakfast
            ? { meal_id: existingLog.breakfast.meal_id, meal_name: existingLog.breakfast.meal_name,
                protein_g: existingLog.breakfast.protein_g, calories: existingLog.breakfast.calories, source: 'logged' }
            : null,
          lunch: existingLog.lunch
            ? { meal_id: existingLog.lunch.meal_id, meal_name: existingLog.lunch.meal_name,
                protein_g: existingLog.lunch.protein_g, calories: existingLog.lunch.calories, source: 'logged' }
            : null,
          dinner: existingLog.dinner
            ? { meal_id: existingLog.dinner.meal_id, meal_name: existingLog.dinner.meal_name,
                protein_g: existingLog.dinner.protein_g, calories: existingLog.dinner.calories, source: 'logged' }
            : null,
          snack: existingLog.snack
            ? { meal_id: existingLog.snack.meal_id, meal_name: existingLog.snack.meal_name,
                protein_g: existingLog.snack.protein_g, calories: existingLog.snack.calories, source: 'logged' }
            : null,
          warnings: [],
        };
        continue;
      }

      // Build usage history including days already planned earlier in this week
      const usageHistory = buildUsageHistory(mealLog, plan);

      const dayPlan  = { breakfast: null, lunch: null, dinner: null, snack: null, warnings: [] };
      let   usedCal  = 0;
      let   usedProt = 0;

      // Fill 3 main slots in order
      for (const slot of SLOTS) {
        const remainingCalBudget = calTarget - usedCal;
        const proteinFloor       = (proteinTarget / 3) * 0.8; // soft floor per slot

        const { meal, warning } = selectMeal(
          meals, slot, isoDate, usageHistory, isTraining, remainingCalBudget, proteinFloor
        );

        if (warning) dayPlan.warnings.push({ slot, message: warning });

        if (meal) {
          dayPlan[slot] = toSlotEntry(meal);
          usedCal  += meal.calories  ?? 0;
          usedProt += meal.protein_g ?? 0;

          // Update usage history immediately so next slot in same day avoids this meal
          // (same meal can't fill two slots on the same day)
          usageHistory[slot].set(meal.id, isoDate);
        }
      }

      // Snack slot — only if BOTH calorie AND protein gaps exceed thresholds
      const calGap  = calTarget      - usedCal;
      const protGap = proteinTarget  - usedProt;

      if (calGap > CAL_GAP_THRESHOLD && protGap > PROTEIN_GAP_THRESHOLD) {
        const { meal: snackMeal, warning: snackWarning } = selectMeal(
          meals, 'snack', isoDate, usageHistory, isTraining, calGap, protGap * 0.5
        );
        if (snackWarning) dayPlan.warnings.push({ slot: 'snack', message: snackWarning });
        if (snackMeal)    dayPlan.snack = toSlotEntry(snackMeal);
      }

      plan[isoDate] = dayPlan;
    }

    return plan;
  }

  return { generateWeekPlan };
}));
