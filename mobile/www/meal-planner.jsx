// meal-planner.jsx — Swiftlift Meal Planner tab
// Sections: MealPlannerTab (router), MealOnboardingScreen, TodayPlanScreen (placeholder),
//           ThisWeekScreen (placeholder), MyMealsScreen, AddEditMealModal, CsvImportModal

const { useState: useMP, useEffect: useMPE, useMemo: useMPM } = React;

// ── Constants ─────────────────────────────────────────────────────────────

const MEAL_TYPE_META = {
  breakfast: { label: 'Breakfast', emoji: '🥣', color: 'bg-amber-100 text-amber-700'  },
  lunch:     { label: 'Lunch',     emoji: '🍱', color: 'bg-lime-100 text-lime-700'    },
  dinner:    { label: 'Dinner',    emoji: '🍽', color: 'bg-violet-100 text-violet-700' },
  snack:     { label: 'Snack',     emoji: '🥜', color: 'bg-rose-100 text-rose-700'    },
};

const ACTIVITY_OPTIONS = [
  { key: 'sedentary',      icon: '🛋',  label: 'Sedentary',      sub: 'Desk job, minimal movement'     },
  { key: 'lightly_active', icon: '🚶',  label: 'Lightly active', sub: 'Some walking, light activity'   },
  { key: 'active',         icon: '🏃',  label: 'Active',         sub: "On your feet most of the day"   },
];

const CSV_TEMPLATE = `name,type,protein_g,calories,carbs_g,fat_g,serving_size_g,tags,emoji
Oats + Banana,breakfast,12,320,58,4,300,quick,🥣
Dal + Rice,lunch,22,480,68,4,350,"vegetarian,bulk",🍛
Chicken + Veg,dinner,38,420,20,8,400,,🍗
Greek Yoghurt,snack,17,150,8,0,200,quick,🥛
`;

// ── Root tab router ───────────────────────────────────────────────────────

function MealPlannerTab({
  meals, setMeals,
  mealPlan, setMealPlan,
  mealLog, setMealLog,
  profile, setProfile,
  weightLog,
  log, setLog,
  onLogMeals,
}) {
  const [section, setSection] = useMP('today');

  // Show onboarding if not yet completed
  if (!profile.mealPlannerOnboarded) {
    return (
      <MealOnboardingScreen
        profile={profile}
        setProfile={setProfile}
        weightLog={weightLog}
        onDone={() => setSection('today')}
      />
    );
  }

  if (section === 'library') {
    return <MyMealsScreen meals={meals} setMeals={setMeals} onBack={() => setSection('today')} />;
  }

  if (section === 'week') {
    return (
      <ThisWeekScreen
        meals={meals}
        mealPlan={mealPlan} setMealPlan={setMealPlan}
        mealLog={mealLog}
        profile={profile}
        weightLog={weightLog}
        onBack={() => setSection('today')}
        onGoLibrary={() => setSection('library')}
        onLogMeals={onLogMeals}
      />
    );
  }

  // Default: today
  return (
    <TodayPlanScreen
      meals={meals} setMeals={setMeals}
      mealPlan={mealPlan} setMealPlan={setMealPlan}
      mealLog={mealLog}
      profile={profile}
      weightLog={weightLog}
      onGoLibrary={() => setSection('library')}
      onGoWeek={() => setSection('week')}
      onLogMeals={onLogMeals}
    />
  );
}

// ── Onboarding ────────────────────────────────────────────────────────────

function MealOnboardingScreen({ profile, setProfile, weightLog, onDone }) {
  const [activityLevel, setActivityLevel] = useMP(profile.activityLevel || 'lightly_active');
  const kg = (weightLog || []).at(-1)?.kg ?? 75;
  const computedTDEE = window.calculateTDEE ? window.calculateTDEE(profile, kg, activityLevel) : 1800;
  const [calorieInput, setCalorieInput] = useMP(String(computedTDEE));

  // Recompute TDEE when activity level changes, only if user hasn't manually edited
  const [userEditedCal, setUserEditedCal] = useMP(false);
  useMPE(() => {
    if (!userEditedCal) {
      const tdee = window.calculateTDEE ? window.calculateTDEE(profile, kg, activityLevel) : 1800;
      setCalorieInput(String(tdee));
    }
  }, [activityLevel]);

  function handleCalorieChange(val) {
    setCalorieInput(val);
    setUserEditedCal(true);
  }

  function confirm() {
    const override = parseInt(calorieInput, 10);
    const tdee     = window.calculateTDEE ? window.calculateTDEE(profile, kg, activityLevel) : 1800;
    setProfile(prev => ({
      ...prev,
      activityLevel,
      calorieTargetOverride: (!isNaN(override) && override !== tdee) ? override : null,
      mealPlannerOnboarded: true,
    }));
    onDone();
  }

  const tdeeForActivity = window.calculateTDEE ? window.calculateTDEE(profile, kg, activityLevel) : 1800;

  return (
    <>
      <div className="flex items-center gap-3 mb-6 mt-1">
        <div className="w-10 h-10 rounded-2xl bg-orange-500 flex items-center justify-center text-white text-lg shadow-lg shadow-orange-500/30">🍽</div>
        <div>
          <div className="text-xl font-bold tracking-tight text-stone-900">Set up Meal Planner</div>
          <div className="text-sm text-stone-500 mt-0.5">Takes 10 seconds · Adjust any time in Profile</div>
        </div>
      </div>

      {/* Activity level */}
      <div className="px-1 mb-2 text-[10px] font-bold text-stone-400 tracking-wider uppercase">Activity on non-workout days</div>
      <div className="bg-white rounded-3xl shadow-sm divide-y divide-stone-100 mb-5 overflow-hidden">
        {ACTIVITY_OPTIONS.map(opt => (
          <button key={opt.key} onClick={() => setActivityLevel(opt.key)}
            className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-stone-50 active:bg-stone-100 transition">
            <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-xl flex-shrink-0">{opt.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-stone-900">{opt.label}</div>
              <div className="text-xs text-stone-500 mt-0.5">{opt.sub}</div>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition ${
              activityLevel === opt.key ? 'border-orange-500 bg-orange-500' : 'border-stone-300'}`}>
              {activityLevel === opt.key &&
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
              }
            </div>
          </button>
        ))}
      </div>

      {/* Calorie target */}
      <div className="px-1 mb-2 text-[10px] font-bold text-stone-400 tracking-wider uppercase">Daily calorie target</div>
      <div className="bg-white rounded-3xl shadow-sm p-5 mb-2">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="text-xs text-stone-500 mb-1">Auto-calculated from your profile</div>
            <div className="text-xs text-stone-400">
              Mifflin-St Jeor · {ACTIVITY_OPTIONS.find(o => o.key === activityLevel)?.label} · −200 kcal deficit
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="number" inputMode="numeric" min="800" max="5000"
              value={calorieInput}
              onChange={e => handleCalorieChange(e.target.value)}
              className="w-20 bg-stone-50 rounded-xl px-3 py-2.5 text-right text-sm font-bold tabular-nums border border-stone-200 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
            />
            <span className="text-xs font-semibold text-stone-400">kcal</span>
          </div>
        </div>
        {userEditedCal && (
          <button onClick={() => { setCalorieInput(String(tdeeForActivity)); setUserEditedCal(false); }}
            className="mt-2 text-xs text-orange-500 underline underline-offset-2">
            Reset to calculated ({tdeeForActivity} kcal)
          </button>
        )}
      </div>
      <div className="text-xs text-stone-400 px-1 mb-6">You can change this anytime in Profile → Goals.</div>

      <button onClick={confirm}
        className="w-full py-4 rounded-2xl bg-orange-500 text-white font-bold text-base shadow-lg shadow-orange-500/30 active:scale-[0.98] transition">
        Let's plan meals 🍽
      </button>
    </>
  );
}

// ── Today's Plan screen (placeholder — wired fully in #13) ────────────────

function TodayPlanScreen({ meals, setMeals, mealPlan, setMealPlan, mealLog, profile, weightLog, onGoLibrary, onGoWeek, onLogMeals }) {
  const todayIso = new Date().toISOString().slice(0, 10);
  const [showAdHoc, setShowAdHoc] = useMP(false);

  // Generate plan for today's week if not yet done or stale
  useMPE(() => {
    if (!meals.length) return;
    const currentMonday = window.getMondayUtc ? window.getMondayUtc(0).toISOString().slice(0, 10) : todayIso;
    if (mealPlan && mealPlan.weekStart === currentMonday) return;
    const weekIsos  = window.getWeekIsos  ? window.getWeekIsos(0)  : [];
    const dayTypes  = window.WEEK ? window.WEEK.map(d => d.type === 'strength' ? 'strength' : (d.type === 'hiit' || d.type === 'run') ? 'hiit' : 'rest') : [];
    const kg        = (weightLog || []).at(-1)?.kg ?? 75;
    const calTarget = window.getEffectiveCalTarget ? window.getEffectiveCalTarget(profile, weightLog) : 1800;
    const proteinTarget = Math.round(kg * 1.6);
    const plan = window.generateWeekPlan({
      meals, mealLog: mealLog || {}, calTarget, proteinTarget,
      weekIsos, dayTypes, todayIso,
    });
    setMealPlan({ generatedAt: new Date().toISOString(), weekStart: currentMonday, days: plan });
  }, [meals.length, todayIso]);

  const todayPlan = mealPlan?.days?.[todayIso] || null;

  if (!meals.length) {
    return (
      <>
        <MealPageHeader title="Today's meals" onGoWeek={onGoWeek} onGoLibrary={onGoLibrary} />
        <div className="bg-white rounded-3xl shadow-sm p-8 text-center">
          <div className="text-5xl mb-4">🍽</div>
          <div className="text-xl font-bold text-stone-900 mb-2">Your meal library is empty</div>
          <div className="text-sm text-stone-500 mb-6 max-w-xs mx-auto">Add meals to your library first so we can suggest a plan for you.</div>
          <button onClick={onGoLibrary}
            className="w-full py-4 rounded-2xl bg-orange-500 text-white font-bold shadow-lg shadow-orange-500/30 active:scale-[0.98] transition">
            Go to My Meals →
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <MealPageHeader title="Today's meals" onGoWeek={onGoWeek} onGoLibrary={onGoLibrary} />
      {todayPlan ? (
        <DayPlanView
          isoDate={todayIso}
          dayPlan={todayPlan}
          mealLog={mealLog}
          meals={meals}
          mealPlan={mealPlan}
          setMealPlan={setMealPlan}
          profile={profile}
          weightLog={weightLog}
          onGoLibrary={onGoLibrary}
          onLogMeals={onLogMeals}
          isToday={true}
        />
      ) : (
        <div className="bg-white rounded-3xl shadow-sm p-8 text-center">
          <div className="text-4xl mb-3 animate-pulse">⏳</div>
          <div className="text-sm text-stone-500">Generating your plan…</div>
        </div>
      )}

      {/* Ad-hoc log link */}
      <button onClick={() => setShowAdHoc(true)}
        className="mt-3 w-full py-3 text-sm text-stone-400 font-semibold flex items-center justify-center gap-1.5 hover:text-orange-500 transition active:scale-95">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
        Log something else
      </button>

      {showAdHoc && (
        <AdHocLogModal
          todayIso={todayIso}
          meals={meals}
          setMeals={setMeals}
          onLogMeals={onLogMeals}
          onClose={() => setShowAdHoc(false)}
        />
      )}
    </>
  );
}

// ── This Week screen (placeholder — wired fully in #13) ───────────────────

function ThisWeekScreen({ meals, mealPlan, setMealPlan, mealLog, profile, weightLog, onBack, onGoLibrary, onLogMeals }) {
  const todayIso     = new Date().toISOString().slice(0, 10);
  const weekIsos     = window.getWeekIsos ? window.getWeekIsos(0) : [];
  const [selectedIso, setSelectedIso] = useMP(todayIso);
  const [confirmRegen, setConfirmRegen] = useMP(false);

  const selectedPlan = mealPlan?.days?.[selectedIso] || null;
  const dayLog       = (mealLog || {})[selectedIso] || {};

  function handleRegenWeek() {
    if (!window.generateWeekPlan || !setMealPlan) return;
    const currentMonday = window.getMondayUtc ? window.getMondayUtc(0).toISOString().slice(0, 10) : todayIso;
    const weekIsosList  = window.getWeekIsos ? window.getWeekIsos(0) : [];
    const dayTypes      = window.WEEK ? window.WEEK.map(d => d.type === 'strength' ? 'strength' : (d.type === 'hiit' || d.type === 'run') ? 'hiit' : 'rest') : [];
    const calTarget     = window.getEffectiveCalTarget ? window.getEffectiveCalTarget(profile, weightLog) : 1800;
    const kg            = (weightLog || []).at(-1)?.kg ?? 75;
    const proteinTarget = Math.round(kg * 1.6);
    // Logged days are "frozen" by being present in mealLog — engine skips them
    const newPlan = window.generateWeekPlan({
      meals, mealLog: mealLog || {}, calTarget, proteinTarget,
      weekIsos: weekIsosList, dayTypes, todayIso,
    });
    setMealPlan({ generatedAt: new Date().toISOString(), weekStart: currentMonday, days: newPlan });
    setConfirmRegen(false);
  }

  return (
    <>
      <div className="flex items-center gap-3 mb-5 mt-1">
        <button onClick={onBack} className="w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center active:scale-95 transition">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <div className="text-xl font-bold tracking-tight text-stone-900 flex-1">This week</div>
        <button onClick={() => setConfirmRegen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-100 text-stone-600 text-xs font-semibold active:scale-95 transition hover:bg-stone-200">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
          Regenerate
        </button>
      </div>

      {/* 7-day strip */}
      <div className="bg-white rounded-3xl shadow-sm p-4 mb-4">
        <div className="flex gap-1">
          {(window.WEEK || []).map((d, i) => {
            const iso      = weekIsos[i];
            const isToday  = iso === todayIso;
            const isSel    = iso === selectedIso;
            const logged   = !!(mealLog?.[iso]?.breakfast || mealLog?.[iso]?.lunch || mealLog?.[iso]?.dinner);
            const planned  = !!mealPlan?.days?.[iso];
            return (
              <button key={d.key} onClick={() => setSelectedIso(iso)}
                className={`flex-1 flex flex-col items-center py-2 rounded-2xl transition-all active:scale-95 ${isSel ? 'bg-stone-900 text-white' : 'text-stone-500 hover:bg-stone-50'}`}>
                <div className={`text-[10px] font-semibold tracking-wider uppercase ${isSel ? 'text-stone-300' : 'text-stone-400'}`}>{d.key}</div>
                <div className={`mt-1.5 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  isSel ? 'bg-orange-500 text-white' :
                  logged ? 'bg-emerald-100 text-emerald-600' :
                  isToday ? 'border-2 border-orange-500 text-orange-600' :
                  'text-stone-400'}`}>
                  {logged ? '✓' : (weekIsos[i] ? new Date(iso + 'T12:00:00Z').getUTCDate() : '')}
                </div>
                <div className={`mt-1 w-1 h-1 rounded-full ${planned ? 'bg-orange-400' : 'bg-stone-200'}`} />
              </button>
            );
          })}
        </div>
      </div>

      {selectedPlan ? (
        <DayPlanView
          isoDate={selectedIso}
          dayPlan={selectedPlan}
          mealLog={mealLog}
          meals={meals}
          mealPlan={mealPlan}
          setMealPlan={selectedIso === todayIso || new Date(selectedIso) > new Date(todayIso) ? setMealPlan : null}
          profile={profile}
          weightLog={weightLog}
          onGoLibrary={onGoLibrary}
          onLogMeals={onLogMeals}
          isToday={selectedIso === todayIso}
        />
      ) : (
        <div className="bg-white rounded-3xl shadow-sm p-8 text-center">
          <div className="text-4xl mb-3">📅</div>
          <div className="text-sm text-stone-500">No plan for this day yet.</div>
        </div>
      )}

      {/* Regenerate week confirmation */}
      {confirmRegen && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 flex items-end sm:items-center justify-center p-4" onClick={() => setConfirmRegen(false)}>
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="text-lg font-bold text-stone-900 mb-2">🔄 Regenerate week?</div>
            <div className="text-sm text-stone-500 mb-6">This will re-roll all unlogged days. Logged days stay exactly as they are.</div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmRegen(false)}
                className="flex-1 py-3 rounded-2xl bg-stone-100 text-stone-700 font-bold active:scale-[0.98] transition">
                Cancel
              </button>
              <button onClick={handleRegenWeek}
                className="flex-1 py-3 rounded-2xl bg-orange-500 text-white font-bold shadow-lg shadow-orange-500/30 active:scale-[0.98] transition">
                Regenerate
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Shared day plan view (used by Today + This Week) ──────────────────────

function DayPlanView({ isoDate, dayPlan, mealLog, meals, mealPlan, setMealPlan, profile, weightLog, onGoLibrary, onLogMeals, isToday }) {
  const dayLog   = (mealLog || {})[isoDate] || {};
  const slots    = ['breakfast', 'lunch', 'dinner', ...(dayPlan.snack ? ['snack'] : [])];
  const allLogged = slots.every(s => !!dayLog[s]);

  const totalProtein = slots.reduce((sum, s) => sum + (dayLog[s]?.protein_g || dayPlan[s]?.protein_g || 0), 0);
  const totalCal     = slots.reduce((sum, s) => sum + (dayLog[s]?.calories  || dayPlan[s]?.calories  || 0), 0);

  function handleLogAll() {
    const entries = {};
    slots.forEach(s => {
      if (!dayLog[s] && dayPlan[s]) entries[s] = dayPlan[s];
    });
    if (Object.keys(entries).length) onLogMeals(isoDate, entries);
  }

  function handleLogSlot(slot) {
    if (!dayLog[slot] && dayPlan[slot]) onLogMeals(isoDate, { [slot]: dayPlan[slot] });
  }

  function handleSwap(slot, newMeal) {
    if (!mealPlan || !setMealPlan) return;
    const updated = {
      ...mealPlan,
      days: {
        ...mealPlan.days,
        [isoDate]: { ...mealPlan.days[isoDate], [slot]: { meal_id: newMeal.id, meal_name: newMeal.name, protein_g: newMeal.protein_g, calories: newMeal.calories ?? null, source: 'suggested' } },
      },
    };
    setMealPlan(updated);
  }

  function handleRegenSlot(slot) {
    if (!mealPlan || !setMealPlan) return;
    const weekIsos   = window.getWeekIsos ? window.getWeekIsos(0) : [];
    const dayTypes   = window.WEEK ? window.WEEK.map(d => d.type === 'strength' ? 'strength' : (d.type === 'hiit' || d.type === 'run') ? 'hiit' : 'rest') : [];
    const calTarget  = window.getEffectiveCalTarget ? window.getEffectiveCalTarget(profile, weightLog) : 1800;
    const kg         = (weightLog || []).at(-1)?.kg ?? 75;
    const proteinTarget = Math.round(kg * 1.6);
    // Re-run engine for this day only, treat other days as frozen in mealLog
    const frozenLog = { ...(mealLog || {}) };
    // Freeze other days by injecting them as if logged
    Object.entries(mealPlan.days).forEach(([iso, dp]) => {
      if (iso !== isoDate && !frozenLog[iso]) frozenLog[iso] = dp;
    });
    const newPlan = window.generateWeekPlan({ meals, mealLog: frozenLog, calTarget, proteinTarget, weekIsos, dayTypes, todayIso: new Date().toISOString().slice(0, 10) });
    const updatedDay = newPlan[isoDate] || mealPlan.days[isoDate];
    setMealPlan({ ...mealPlan, days: { ...mealPlan.days, [isoDate]: { ...updatedDay, [slot]: updatedDay[slot] } } });
  }

  return (
    <>
      {/* Macro summary */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 bg-white rounded-2xl shadow-sm p-4 text-center">
          <div className="text-[10px] font-semibold text-stone-400 tracking-wider uppercase mb-1">Protein</div>
          <div className="text-xl font-bold text-orange-500 tabular-nums">{totalProtein}g</div>
        </div>
        <div className="flex-1 bg-white rounded-2xl shadow-sm p-4 text-center">
          <div className="text-[10px] font-semibold text-stone-400 tracking-wider uppercase mb-1">Calories</div>
          <div className="text-xl font-bold text-stone-700 tabular-nums">{totalCal > 0 ? totalCal : '—'}</div>
        </div>
      </div>

      {/* Warnings */}
      {(dayPlan.warnings || []).length > 0 && (
        <div className="mb-3 space-y-1.5">
          {dayPlan.warnings.map((w, i) => (
            <div key={i} className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-100 rounded-2xl">
              <span className="text-amber-500 text-sm">⚠️</span>
              <span className="text-xs text-stone-700 flex-1">{w.message}</span>
              <button onClick={onGoLibrary} className="text-xs text-orange-500 font-semibold underline underline-offset-2">Add meals →</button>
            </div>
          ))}
        </div>
      )}

      {/* Meal slot cards */}
      <div className="space-y-3 mb-4">
        {slots.map(slot => {
          const entry    = dayPlan[slot];
          const logged   = !!dayLog[slot];
          const meta     = MEAL_TYPE_META[slot];
          const slotMeals = meals.filter(m => m.type === slot);
          if (!entry) return null;
          return (
            <MealSlotCard
              key={slot}
              slot={slot}
              entry={entry}
              logged={logged}
              meta={meta}
              slotMeals={slotMeals}
              canAct={!!setMealPlan && !logged}
              onLog={() => handleLogSlot(slot)}
              onSwap={newMeal => handleSwap(slot, newMeal)}
              onRegen={() => handleRegenSlot(slot)}
            />
          );
        })}
      </div>

      {/* Log all button */}
      {!allLogged && isToday && (
        <button onClick={handleLogAll}
          className="w-full py-4 rounded-2xl bg-orange-500 text-white font-bold text-base shadow-lg shadow-orange-500/30 active:scale-[0.98] transition flex items-center justify-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
          Log all meals
        </button>
      )}
      {allLogged && (
        <div className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-bold text-base flex items-center justify-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
          All meals logged
        </div>
      )}
    </>
  );
}

function MealSlotCard({ slot, entry, logged, meta, slotMeals, canAct, onLog, onSwap, onRegen }) {
  const [showSwap, setShowSwap] = useMP(false);

  return (
    <div className={`bg-white rounded-3xl shadow-sm p-4 transition ${logged ? 'opacity-80' : ''}`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${meta.color}`}>{meta.emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-[10px] font-semibold text-stone-400 tracking-wider uppercase">{meta.label}</div>
            {logged && <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded tracking-wide">Logged ✓</span>}
          </div>
          <div className="text-sm font-bold text-stone-900 mt-0.5 leading-snug">{entry.meal_name}</div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs font-semibold text-orange-600 tabular-nums">{entry.protein_g}g protein</span>
            {entry.calories && <span className="text-xs text-stone-400 tabular-nums">{entry.calories} kcal</span>}
          </div>
        </div>
        {canAct && (
          <div className="flex gap-1.5 flex-shrink-0">
            <button onClick={() => setShowSwap(s => !s)}
              title="Swap meal"
              className="w-8 h-8 rounded-xl bg-stone-100 text-stone-500 flex items-center justify-center text-sm active:scale-95 transition hover:bg-stone-200">
              ↔
            </button>
            <button onClick={onRegen}
              title="Regenerate this slot"
              className="w-8 h-8 rounded-xl bg-stone-100 text-stone-500 flex items-center justify-center active:scale-95 transition hover:bg-stone-200">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            </button>
            <button onClick={onLog}
              title="Log this meal"
              className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center active:scale-95 transition shadow-sm shadow-orange-500/30">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            </button>
          </div>
        )}
      </div>

      {/* Swap picker */}
      {showSwap && (
        <div className="mt-3 pt-3 border-t border-stone-100">
          <div className="text-[10px] font-semibold text-stone-400 tracking-wider uppercase mb-2">Swap with</div>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {slotMeals.filter(m => m.id !== entry.meal_id).map(m => (
              <button key={m.id} onClick={() => { onSwap(m); setShowSwap(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-stone-50 hover:bg-orange-50 text-left active:scale-[0.98] transition">
                <span className="text-base">{m.emoji || MEAL_TYPE_META[m.type]?.emoji}</span>
                <span className="flex-1 text-sm font-semibold text-stone-800 truncate">{m.name}</span>
                <span className="text-xs text-orange-600 font-semibold tabular-nums flex-shrink-0">{m.protein_g}g</span>
              </button>
            ))}
            {slotMeals.filter(m => m.id !== entry.meal_id).length === 0 && (
              <div className="text-xs text-stone-400 text-center py-2">No other {slot} meals in library.</div>
            )}
          </div>
          <button onClick={() => setShowSwap(false)} className="mt-2 text-xs text-stone-400 underline underline-offset-2 w-full text-center">Cancel</button>
        </div>
      )}
    </div>
  );
}

function MealPageHeader({ title, onGoWeek, onGoLibrary }) {
  return (
    <div className="flex items-center justify-between mb-5 mt-1">
      <div className="text-2xl font-bold tracking-tight text-stone-900">{title}</div>
      <div className="flex gap-2">
        <button onClick={onGoWeek}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-100 text-stone-600 text-xs font-semibold active:scale-95 transition">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
          This week
        </button>
        <button onClick={onGoLibrary}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-900 text-white text-xs font-semibold active:scale-95 transition">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          My meals
        </button>
      </div>
    </div>
  );
}

// ── My Meals screen ───────────────────────────────────────────────────────

function MyMealsScreen({ meals, setMeals, onBack }) {
  const [editingMeal, setEditingMeal] = useMP(null);    // null | meal object (for edit) | 'new'
  const [showImport, setShowImport]   = useMP(false);
  const [filterType, setFilterType]   = useMP('all');
  const [deleteId, setDeleteId]       = useMP(null);

  const filtered = filterType === 'all' ? meals : meals.filter(m => m.type === filterType);

  function handleSave(meal) {
    if (meal.id && meals.some(m => m.id === meal.id)) {
      // Edit existing
      setMeals(prev => prev.map(m => m.id === meal.id ? meal : m));
    } else {
      // Add new
      setMeals(prev => [...prev, { ...meal, id: 'm_' + Math.random().toString(36).slice(2, 9), source: 'manual', createdAt: new Date().toISOString().slice(0, 10) }]);
    }
    setEditingMeal(null);
  }

  function handleDelete(id) {
    setMeals(prev => prev.filter(m => m.id !== id));
    setDeleteId(null);
  }

  function handleImportMerge(incoming, action) {
    // action: { [meal_name_lower]: 'replace' | 'skip' | 'keep' }
    setMeals(prev => {
      let updated = [...prev];
      incoming.forEach(meal => {
        const key = meal.name.toLowerCase();
        const act = action[key] || 'keep';
        if (act === 'replace') {
          updated = updated.map(m => m.name.toLowerCase() === key ? { ...meal, id: m.id } : m);
        } else if (act === 'keep') {
          updated = [...updated, { ...meal, id: 'm_' + Math.random().toString(36).slice(2, 9) }];
        }
        // 'skip' → do nothing
      });
      return updated;
    });
  }

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'swiftlift-meal-template.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <>
      <div className="flex items-center gap-3 mb-5 mt-1">
        <button onClick={onBack} className="w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center active:scale-95 transition">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <div className="flex-1 text-xl font-bold tracking-tight text-stone-900">My meals</div>
        <button onClick={() => setEditingMeal('new')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-900 text-white text-xs font-semibold active:scale-95 transition">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
          Add meal
        </button>
      </div>

      {meals.length === 0 ? (
        /* Empty state */
        <div className="bg-white rounded-3xl shadow-sm p-8 text-center mb-4">
          <div className="text-5xl mb-4">🍽</div>
          <div className="text-xl font-bold text-stone-900 mb-2">Your meal library is empty</div>
          <div className="text-sm text-stone-500 mb-6 max-w-xs mx-auto leading-relaxed">Add meals one by one, or bulk-import from a CSV file.</div>
          <div className="flex flex-col gap-3">
            <button onClick={() => setEditingMeal('new')}
              className="w-full py-4 rounded-2xl bg-orange-500 text-white font-bold shadow-lg shadow-orange-500/30 active:scale-[0.98] transition">
              Add first meal
            </button>
            <button onClick={() => setShowImport(true)}
              className="w-full py-4 rounded-2xl bg-stone-100 text-stone-700 font-bold active:scale-[0.98] transition">
              Import from CSV
            </button>
            <button onClick={downloadTemplate}
              className="text-xs text-stone-400 underline underline-offset-2 mt-1">
              Download CSV template
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Filter tabs */}
          <div className="flex gap-1.5 bg-stone-100 rounded-2xl p-1 mb-4">
            {['all', ...Object.keys(MEAL_TYPE_META)].map(type => (
              <button key={type} onClick={() => setFilterType(type)}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold transition capitalize ${filterType === type ? 'bg-white shadow text-stone-900' : 'text-stone-500'}`}>
                {type === 'all' ? `All (${meals.length})` : MEAL_TYPE_META[type].label}
              </button>
            ))}
          </div>

          {/* Meal list */}
          <div className="bg-white rounded-3xl shadow-sm divide-y divide-stone-100 mb-4 overflow-hidden">
            {filtered.map(m => {
              const meta = MEAL_TYPE_META[m.type] || MEAL_TYPE_META.snack;
              return (
                <div key={m.id} className="flex items-center gap-3 px-4 py-3.5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${meta.color}`}>
                    {m.emoji || meta.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-sm font-semibold text-stone-900 truncate">{m.name}</div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${meta.color}`}>{meta.label}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs font-semibold text-orange-600 tabular-nums">{m.protein_g}g protein</span>
                      {m.calories && <span className="text-xs text-stone-400 tabular-nums">{m.calories} kcal</span>}
                      {m.tags?.length > 0 && <span className="text-xs text-stone-400">{m.tags.join(', ')}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button onClick={() => setEditingMeal(m)}
                      className="w-9 h-9 rounded-xl bg-stone-100 text-stone-500 flex items-center justify-center active:scale-95 transition hover:bg-stone-200">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z"/></svg>
                    </button>
                    <button onClick={() => setDeleteId(m.id)}
                      className="w-9 h-9 rounded-xl bg-stone-100 text-stone-500 flex items-center justify-center active:scale-95 transition hover:bg-rose-100 hover:text-rose-600">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
                    </button>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-center text-sm text-stone-400 py-8">No {filterType} meals yet.</div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 mb-4">
            <button onClick={() => setShowImport(true)}
              className="flex-1 py-3.5 rounded-2xl bg-stone-100 text-stone-700 font-semibold text-sm active:scale-[0.98] transition flex items-center justify-center gap-2">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
              Import CSV
            </button>
            <button onClick={downloadTemplate}
              className="flex-1 py-3.5 rounded-2xl bg-stone-100 text-stone-700 font-semibold text-sm active:scale-[0.98] transition flex items-center justify-center gap-2">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
              Template
            </button>
          </div>
        </>
      )}

      {/* Delete confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-5 shadow-2xl">
            <div className="text-lg font-bold text-stone-900 mb-1">Remove meal?</div>
            <div className="text-sm text-stone-500 mb-5">This won't affect any past logs.</div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 py-3.5 rounded-2xl bg-stone-100 text-stone-700 font-bold active:scale-[0.98] transition">Cancel</button>
              <button onClick={() => handleDelete(deleteId)}
                className="flex-1 py-3.5 rounded-2xl bg-rose-500 text-white font-bold active:scale-[0.98] transition shadow-lg shadow-rose-500/20">Remove</button>
            </div>
          </div>
        </div>
      )}

      {editingMeal && (
        <AddEditMealModal
          meal={editingMeal === 'new' ? null : editingMeal}
          onClose={() => setEditingMeal(null)}
          onSave={handleSave}
        />
      )}

      {showImport && (
        <CsvImportModal
          existingMeals={meals}
          onClose={() => setShowImport(false)}
          onImport={handleImportMerge}
        />
      )}
    </>
  );
}

// ── Add / Edit meal modal ─────────────────────────────────────────────────

function AddEditMealModal({ meal, onClose, onSave }) {
  const isEdit = !!meal;
  const [draft, setDraft] = useMP(meal || {
    name: '', type: 'breakfast', protein_g: '', calories: '',
    carbs_g: '', fat_g: '', serving_size_g: '', tags: '', emoji: '',
  });
  const [showMore, setShowMore] = useMP(false);
  const [errors, setErrors]     = useMP({});

  function set(k, v) { setDraft(d => ({ ...d, [k]: v })); }

  function validate() {
    const e = {};
    if (!draft.name?.trim())                          e.name      = 'Required';
    if (!draft.type)                                  e.type      = 'Required';
    if (draft.protein_g === '' || isNaN(Number(draft.protein_g)) || Number(draft.protein_g) < 0)
                                                      e.protein_g = 'Enter a valid number';
    return e;
  }

  function submit() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    const tagsArr = typeof draft.tags === 'string'
      ? draft.tags.split(',').map(t => t.trim()).filter(Boolean)
      : (draft.tags || []);
    onSave({
      ...draft,
      id:             isEdit ? meal.id : undefined,
      name:           draft.name.trim(),
      protein_g:      Number(draft.protein_g),
      calories:       draft.calories !== '' ? Number(draft.calories) : null,
      carbs_g:        draft.carbs_g  !== '' ? Number(draft.carbs_g)  : null,
      fat_g:          draft.fat_g    !== '' ? Number(draft.fat_g)    : null,
      serving_size_g: draft.serving_size_g !== '' ? Number(draft.serving_size_g) : null,
      tags:           tagsArr,
      emoji:          draft.emoji || null,
      source:         isEdit ? (meal.source || 'manual') : 'manual',
    });
  }

  const tagsDisplay = Array.isArray(draft.tags) ? draft.tags.join(', ') : (draft.tags || '');

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[11px] tracking-[0.2em] font-semibold text-stone-400">{isEdit ? 'EDIT MEAL' : 'NEW MEAL'}</div>
              <div className="text-lg font-bold text-stone-900">{isEdit ? meal.name : 'Add to library'}</div>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-xl bg-stone-100 flex items-center justify-center text-stone-500 active:scale-95 transition">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          {/* Name */}
          <MealField label="Name" error={errors.name}>
            <input type="text" value={draft.name || ''} onChange={e => set('name', e.target.value)}
              placeholder="e.g. Dal + Rice"
              className={`w-full bg-stone-50 rounded-xl px-3 py-3 text-sm font-semibold border focus:outline-none focus:ring-2 focus:ring-orange-100 ${errors.name ? 'border-rose-400 focus:border-rose-400' : 'border-stone-200 focus:border-orange-400'}`} />
          </MealField>

          {/* Meal type */}
          <MealField label="Type" error={errors.type}>
            <div className="flex gap-1.5">
              {Object.entries(MEAL_TYPE_META).map(([key, meta]) => (
                <button key={key} onClick={() => set('type', key)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition ${draft.type === key ? `${meta.color} shadow` : 'bg-stone-100 text-stone-500'}`}>
                  {meta.emoji} {meta.label}
                </button>
              ))}
            </div>
          </MealField>

          {/* Protein + Calories */}
          <div className="grid grid-cols-2 gap-3">
            <MealField label="Protein (g)" error={errors.protein_g}>
              <input type="number" inputMode="decimal" min="0" value={draft.protein_g ?? ''} onChange={e => set('protein_g', e.target.value)}
                placeholder="22"
                className={`w-full bg-stone-50 rounded-xl px-3 py-3 text-sm font-bold tabular-nums border focus:outline-none focus:ring-2 focus:ring-orange-100 ${errors.protein_g ? 'border-rose-400' : 'border-stone-200 focus:border-orange-400'}`} />
            </MealField>
            <MealField label="Calories (optional)">
              <input type="number" inputMode="decimal" min="0" value={draft.calories ?? ''} onChange={e => set('calories', e.target.value)}
                placeholder="480"
                className="w-full bg-stone-50 rounded-xl px-3 py-3 text-sm font-bold tabular-nums border border-stone-200 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100" />
            </MealField>
          </div>

          {/* Emoji + Tags */}
          <div className="grid grid-cols-3 gap-3">
            <MealField label="Emoji">
              <input type="text" value={draft.emoji || ''} onChange={e => set('emoji', e.target.value)}
                maxLength={2} placeholder="🍛"
                className="w-full bg-stone-50 rounded-xl px-3 py-3 text-xl text-center border border-stone-200 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100" />
            </MealField>
            <div className="col-span-2">
              <MealField label="Tags (comma-separated)">
                <input type="text" value={tagsDisplay} onChange={e => set('tags', e.target.value)}
                  placeholder="quick, vegetarian"
                  className="w-full bg-stone-50 rounded-xl px-3 py-3 text-sm border border-stone-200 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100" />
              </MealField>
            </div>
          </div>

          {/* More details toggle */}
          <button onClick={() => setShowMore(s => !s)}
            className="text-xs text-stone-400 underline underline-offset-2 mb-3 flex items-center gap-1">
            {showMore ? '▲ Hide' : '▼ More details'} (carbs, fat, serving size)
          </button>

          {showMore && (
            <div className="grid grid-cols-3 gap-3 mb-3">
              <MealField label="Carbs (g)">
                <input type="number" inputMode="decimal" min="0" value={draft.carbs_g ?? ''} onChange={e => set('carbs_g', e.target.value)}
                  placeholder="68"
                  className="w-full bg-stone-50 rounded-xl px-3 py-3 text-sm font-bold tabular-nums border border-stone-200 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100" />
              </MealField>
              <MealField label="Fat (g)">
                <input type="number" inputMode="decimal" min="0" value={draft.fat_g ?? ''} onChange={e => set('fat_g', e.target.value)}
                  placeholder="4"
                  className="w-full bg-stone-50 rounded-xl px-3 py-3 text-sm font-bold tabular-nums border border-stone-200 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100" />
              </MealField>
              <MealField label="Serving (g)">
                <input type="number" inputMode="decimal" min="0" value={draft.serving_size_g ?? ''} onChange={e => set('serving_size_g', e.target.value)}
                  placeholder="350"
                  className="w-full bg-stone-50 rounded-xl px-3 py-3 text-sm font-bold tabular-nums border border-stone-200 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100" />
              </MealField>
            </div>
          )}

          <button onClick={submit}
            className="w-full py-4 rounded-2xl bg-orange-500 text-white font-bold shadow-lg shadow-orange-500/30 active:scale-[0.98] transition">
            {isEdit ? 'Save changes' : 'Add to library'}
          </button>
        </div>
      </div>
    </div>
  );
}

function MealField({ label, error, children }) {
  return (
    <div className="mb-3">
      <div className="text-[10px] font-semibold text-stone-500 tracking-wider uppercase mb-1.5">{label}</div>
      {children}
      {error && <div className="text-xs text-rose-500 mt-1">{error}</div>}
    </div>
  );
}

// ── CSV Import modal ──────────────────────────────────────────────────────

function CsvImportModal({ existingMeals, onClose, onImport }) {
  const [step, setStep]           = useMP('upload');    // 'upload' | 'review' | 'done'
  const [parseResult, setParseResult] = useMP(null);
  const [dupActions, setDupActions]   = useMP({});
  const [importing, setImporting]     = useMP(false);

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const result = window.parseMealCsv(ev.target.result, existingMeals);
      setParseResult(result);
      // Default dup action: skip
      const defaults = {};
      result.duplicates.forEach(d => { defaults[d.incoming.name.toLowerCase()] = 'skip'; });
      setDupActions(defaults);
      setStep('review');
    };
    reader.readAsText(file);
  }

  function handleConfirm() {
    setImporting(true);
    // Merge: imported (no dups) + duplicates with action !== 'skip'
    const toMerge = [
      ...parseResult.imported,
      ...parseResult.duplicates
        .filter(d => dupActions[d.incoming.name.toLowerCase()] !== 'skip')
        .map(d => d.incoming),
    ];
    onImport(toMerge, dupActions);
    setStep('done');
    setImporting(false);
    setTimeout(onClose, 1200);
  }

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[11px] tracking-[0.2em] font-semibold text-stone-400">IMPORT</div>
              <div className="text-lg font-bold text-stone-900">Meal library CSV</div>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-xl bg-stone-100 flex items-center justify-center text-stone-500 active:scale-95 transition">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          {step === 'upload' && (
            <>
              <div className="bg-stone-50 rounded-2xl border-2 border-dashed border-stone-200 p-8 text-center mb-4">
                <div className="text-3xl mb-3">📄</div>
                <div className="text-sm font-semibold text-stone-700 mb-1">Choose a CSV file</div>
                <div className="text-xs text-stone-400 mb-4">Must have: name, type, protein_g</div>
                <label className="px-5 py-3 rounded-2xl bg-orange-500 text-white text-sm font-bold cursor-pointer active:scale-95 transition shadow-lg shadow-orange-500/30">
                  Browse file
                  <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
                </label>
              </div>
              <div className="text-xs text-stone-400 text-center">
                Need the format?{' '}
                <button onClick={onClose} className="text-orange-500 underline underline-offset-2">
                  Download template from My Meals
                </button>
              </div>
            </>
          )}

          {step === 'review' && parseResult && (
            <>
              {/* Parse summary */}
              <div className="flex gap-2 mb-4">
                <div className="flex-1 bg-emerald-50 rounded-2xl p-3 text-center">
                  <div className="text-xl font-bold text-emerald-600 tabular-nums">{parseResult.imported.length}</div>
                  <div className="text-[10px] text-stone-500 mt-0.5">Ready to import</div>
                </div>
                {parseResult.duplicates.length > 0 && (
                  <div className="flex-1 bg-amber-50 rounded-2xl p-3 text-center">
                    <div className="text-xl font-bold text-amber-600 tabular-nums">{parseResult.duplicates.length}</div>
                    <div className="text-[10px] text-stone-500 mt-0.5">Duplicates</div>
                  </div>
                )}
                {parseResult.errors.length > 0 && (
                  <div className="flex-1 bg-rose-50 rounded-2xl p-3 text-center">
                    <div className="text-xl font-bold text-rose-500 tabular-nums">{parseResult.errors.length}</div>
                    <div className="text-[10px] text-stone-500 mt-0.5">Errors</div>
                  </div>
                )}
              </div>

              {/* Errors */}
              {parseResult.errors.length > 0 && (
                <div className="mb-4 bg-rose-50 rounded-2xl p-3">
                  <div className="text-xs font-bold text-rose-600 mb-2">Rows with errors (skipped)</div>
                  {parseResult.errors.map((e, i) => (
                    <div key={i} className="text-xs text-stone-600 mb-0.5">• {e}</div>
                  ))}
                </div>
              )}

              {/* Duplicates */}
              {parseResult.duplicates.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs font-bold text-stone-700 mb-2">Duplicate meals — choose what to do:</div>
                  <div className="space-y-2">
                    {parseResult.duplicates.map(d => {
                      const key = d.incoming.name.toLowerCase();
                      return (
                        <div key={key} className="bg-stone-50 rounded-2xl p-3">
                          <div className="text-sm font-semibold text-stone-900 mb-2">{d.incoming.name}</div>
                          <div className="flex gap-1.5">
                            {[['replace','Replace','bg-orange-500 text-white'],['skip','Skip','bg-stone-200 text-stone-600'],['keep','Keep both','bg-stone-100 text-stone-600']].map(([val, label, cls]) => (
                              <button key={val} onClick={() => setDupActions(a => ({ ...a, [key]: val }))}
                                className={`flex-1 py-2 rounded-xl text-xs font-bold transition active:scale-95 ${dupActions[key] === val ? cls : 'bg-stone-100 text-stone-400'}`}>
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {parseResult.imported.length === 0 && parseResult.duplicates.length === 0 ? (
                <div className="text-center text-sm text-stone-500 py-4">Nothing valid to import.</div>
              ) : (
                <button onClick={handleConfirm} disabled={importing}
                  className="w-full py-4 rounded-2xl bg-orange-500 text-white font-bold shadow-lg shadow-orange-500/30 active:scale-[0.98] transition disabled:bg-stone-200">
                  Import {parseResult.imported.length + parseResult.duplicates.filter(d => dupActions[d.incoming.name.toLowerCase()] !== 'skip').length} meals
                </button>
              )}
            </>
          )}

          {step === 'done' && (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">✅</div>
              <div className="text-lg font-bold text-stone-900">Imported!</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Ad-Hoc Log Modal ("Log something else") ─────────────────────────────────
function AdHocLogModal({ todayIso, meals, setMeals, onLogMeals, onClose }) {
  const [name, setName]         = useMP('');
  const [protein, setProtein]   = useMP('');
  const [calories, setCalories] = useMP('');
  const [savePrompt, setSavePrompt] = useMP(false);

  const nameErr    = !name.trim() ? 'Name is required' : null;
  const proteinErr = !protein || isNaN(parseFloat(protein)) ? 'Protein is required' : null;
  const canSubmit  = !nameErr && !proteinErr;

  function handleLog() {
    if (!canSubmit) return;
    onLogMeals(todayIso, { adhoc_log: {
      meal_id:   null,
      meal_name: name.trim(),
      protein_g: parseFloat(protein),
      calories:  calories ? parseFloat(calories) : null,
    }});
    setSavePrompt(true);
  }

  function handleSaveToLibrary() {
    setMeals(prev => [...prev, {
      id: crypto.randomUUID(),
      name: name.trim(),
      type: 'lunch',
      protein_g: parseFloat(protein),
      calories: calories ? parseFloat(calories) : null,
      carbs_g: null, fat_g: null, serving_size_g: null,
      tags: [], emoji: '', source: 'manual',
      createdAt: new Date().toISOString().slice(0, 10),
    }]);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        {!savePrompt ? (
          <>
            <div className="text-lg font-bold text-stone-900 mb-1">Log something else</div>
            <div className="text-xs text-stone-400 mb-5">Quick-log a meal not in your library</div>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1.5">Meal name *</label>
                <input value={name} onChange={e => setName(e.target.value)}
                  placeholder="e.g. Street tacos"
                  className="w-full px-4 py-3 rounded-2xl border border-stone-200 text-sm font-semibold text-stone-900 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
                {nameErr && name && <div className="text-xs text-rose-500 mt-1">{nameErr}</div>}
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-stone-500 mb-1.5">Protein (g) *</label>
                  <input type="number" value={protein} onChange={e => setProtein(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-3 rounded-2xl border border-stone-200 text-sm font-bold text-stone-900 text-center tabular-nums focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
                  {proteinErr && protein !== '' && <div className="text-xs text-rose-500 mt-1">{proteinErr}</div>}
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-stone-500 mb-1.5">Calories (kcal)</label>
                  <input type="number" value={calories} onChange={e => setCalories(e.target.value)}
                    placeholder="optional"
                    className="w-full px-4 py-3 rounded-2xl border border-stone-200 text-sm font-bold text-stone-900 text-center tabular-nums focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={onClose}
                className="flex-1 py-3 rounded-2xl bg-stone-100 text-stone-700 font-bold active:scale-[0.98] transition">
                Cancel
              </button>
              <button onClick={handleLog} disabled={!canSubmit}
                className={`flex-1 py-3 rounded-2xl font-bold active:scale-[0.98] transition ${
                  canSubmit ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                }`}>
                Log meal
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">✅</div>
              <div className="text-lg font-bold text-stone-900 mb-1">{name} logged!</div>
              <div className="text-xs text-stone-400">{parseFloat(protein)}g protein added to today's tracker</div>
            </div>
            <div className="text-sm font-semibold text-stone-700 text-center mb-4">Save to My Meals?</div>
            <div className="text-xs text-stone-400 text-center mb-5">Add it to your library so you can plan with it in future.</div>
            <div className="flex gap-3">
              <button onClick={onClose}
                className="flex-1 py-3 rounded-2xl bg-stone-100 text-stone-700 font-bold active:scale-[0.98] transition">
                Skip
              </button>
              <button onClick={handleSaveToLibrary}
                className="flex-1 py-3 rounded-2xl bg-orange-500 text-white font-bold shadow-lg shadow-orange-500/30 active:scale-[0.98] transition">
                Save to library
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}


// ── Today's meals home widget ─────────────────────────────────────────────

function TodayMealsWidget({ mealPlan, mealLog, todayIso, onOpenPlanner }) {
  const todayPlan = mealPlan?.days?.[todayIso];
  const dayLog    = (mealLog || {})[todayIso] || {};

  if (!todayPlan) {
    return (
      <button onClick={onOpenPlanner}
        className="w-full bg-white rounded-3xl shadow-sm p-5 text-left active:scale-[0.98] transition hover:shadow flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-xl flex-shrink-0">🍽</div>
        <div className="flex-1">
          <div className="text-sm font-bold text-stone-900">Tap to plan today's meals</div>
          <div className="text-xs text-stone-400 mt-0.5">Set up your meal library to get suggestions</div>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-stone-300"><path d="m9 18 6-6-6-6"/></svg>
      </button>
    );
  }

  const slots        = ['breakfast', 'lunch', 'dinner'];
  const totalProtein = slots.reduce((s, slot) => s + (dayLog[slot]?.protein_g || todayPlan[slot]?.protein_g || 0), 0);

  return (
    <button onClick={onOpenPlanner}
      className="w-full bg-white rounded-3xl shadow-sm p-4 text-left active:scale-[0.98] transition hover:shadow">
      <div className="space-y-2.5 mb-3">
        {slots.map(slot => {
          const entry  = dayLog[slot] || todayPlan[slot];
          const logged = !!dayLog[slot];
          const meta   = MEAL_TYPE_META[slot];
          if (!entry) return null;
          return (
            <div key={slot} className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 ${meta.color}`}>
                {entry.emoji || meta.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-stone-800 truncate">{entry.meal_name || entry.name}</span>
                  {logged && <span className="text-[10px] text-emerald-600 font-bold">✓</span>}
                </div>
              </div>
              <div className="text-xs font-semibold text-orange-600 tabular-nums flex-shrink-0">{entry.protein_g}g</div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between pt-2.5 border-t border-stone-100">
        <div className="text-xs text-stone-500">
          <span className="font-bold text-orange-600 tabular-nums">{totalProtein}g</span> protein from meals
        </div>
        <div className="text-xs font-semibold text-orange-500">Plan meals →</div>
      </div>
    </button>
  );
}

window.MealPlannerTab   = MealPlannerTab;
window.TodayMealsWidget = TodayMealsWidget;
