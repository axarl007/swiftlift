# Swiftlift — Product Requirements Document

> Personal Workout Tracker PWA | Single user | Offline-first | No login

---

## 1. Vision

A mobile-first PWA that lives on your home screen and acts as your daily workout companion. Open it → know exactly what to do → get guided through the session → track your progress over time. No internet required after install. No accounts. No friction.

---

## 2. User

Single user (yourself). No multi-user, no authentication, no cloud sync. All data lives on-device in `localStorage`.

---

## 3. Weekly Schedule (Fixed)

| Day | Session | Focus |
|-----|---------|-------|
| Monday | Strength — Push | Chest, Shoulders, Triceps |
| Tuesday | HIIT | Fat burn + Cardio |
| Wednesday | Strength — Legs | Quads, Glutes, Hamstrings |
| Thursday | Rest | Full recovery |
| Friday | Strength — Pull | Back, Biceps |
| Saturday | HIIT | Fat burn + Cardio |
| Sunday | Rest | Full recovery |

---

## 4. Core Flows

### 4.1 Open App → See Today
- Header shows day name + session type (e.g. "Monday · Push Day")
- If session already logged today: completion badge + current streak count
- If rest day: recovery message + tomorrow's preview
- **Reminder banner**: appears if today is a workout day AND time ≥ 08:00 AND no session logged yet
  - Message: "You haven't trained today — get it done!"
  - Dismissable for the day (dismissed state stored in localStorage)

### 4.2 Strength Session (Hybrid Mode)
1. Warm-up prompt shown first (2-min cues: arm circles, squats, hip circles, shoulder rolls)
2. Exercises listed with targets (sets × reps)
3. Per set: tap ✓ to mark done + optionally enter reps and weight used
4. "Start Rest Timer" appears after marking each set (pre-filled: 60s for most, 45s for last exercise)
5. Visual countdown with skip option
6. Form tutorial button per exercise → opens YouTube app
7. After last set: cool-down prompt, then "Complete Session" CTA
8. Optional note field before saving

### 4.3 HIIT Session
1. Show current level (Easy / Medium / Tough) with progress toward next level
2. Show next video in rotation: title, channel, duration
3. One tap → opens YouTube app at correct video URL
4. On return: "Mark HIIT Done" button + optional note
5. Auto-advance rotation index for next HIIT session

### 4.4 Progressive Overload Alerts
- Track `{date, reps, weight}` per exercise in localStorage
- Alert fires when: 14+ days since last logged weight/rep increase AND exercise logged ≥4 times
- Alert card on home screen: "Time to level up: [Exercise] — add 1–2 reps or increase weight"
- Dismissed automatically when user logs a new personal best (higher reps or weight)

### 4.5 Streak & History
- Streak counter on home (consecutive workout days; scheduled rest days don't break streak)
- Monthly calendar heatmap:
  - Orange = strength session done
  - Cyan = HIIT done
  - Red = workout day missed
  - Grey = scheduled rest day
- Tap past day → see what was logged

---

## 5. HIIT Configuration

| Level | When | Videos |
|-------|------|--------|
| Easy | Default starting level | E1 → E2 → E3 → E4 → repeat |
| Medium | After completing Easy without stopping | M1 → M3 → M2 → M5 → M4 → repeat |
| Tough | Heart rate recovers within 60s after Medium | T1 → T2 → T4 → T3 → repeat |

Level-up: user manually triggers from session completion screen or profile settings.

---

## 6. Reminder

- **Type:** In-app banner only (no push notifications)
- **Time:** 08:00 on workout days (Mon, Tue, Wed, Fri, Sat)
- **Condition:** No session logged for today
- **Behavior:** Dismissable for the day

---

## 7. Data Model (localStorage)

All persistence goes through `store.js`, which wraps 12 `localStorage` keys.
`json-backup.js` (`BACKUP_DOMAINS`) is the single source of truth for this
list — export, import, and "Reset all data" all read from it, so this
section, the code, and the backup file format can't drift apart.

| `localStorage` key | Backup JSON key | Shape |
|---|---|---|
| `swiftlift_profile` | `profile` | `{ name, level, height, heightUnit, weightUnit, age, waterTarget, since, schemaVersion, activityLevel, calorieTargetOverride, mealPlannerOnboarded, planHistory, fiveK }` |
| `swiftlift_sessions` | `sessions` | `[{ id, date, type, focus, durationMin, source, setsCompleted, totalSets, completed, note }]` |
| `swiftlift_log` | `log` | `{ [isoDate]: { protein: [...], water: [...] } }` (nutrition log) |
| `swiftlift_weight_log` | `weightLog` | `[{ id, date, kg }]` — one entry per day, always stored in kg |
| `swiftlift_hiit` | `hiit` | `{ level, overrides: { [level]: { added: [], removed: [] } } }` |
| `swiftlift_overload` | `overload` | `{ [exerciseName]: { lastPbDate, snoozedUntil, history: [{ date, reps, weightKg }] } }` |
| `swiftlift_settings` | `settings` | `{ timerSound, timerHaptic, timerAutoStart }` |
| `swiftlift_presets` | `presets` | `{ protein: [...], water: [...] }` — quick-add amounts |
| `swiftlift_reminder_dismissed` | `reminderDismissed` | ISO date string or `null` — reminder dismissed for that day |
| `swiftlift_meals` | `meals` | `[MealItem]` — meal library |
| `swiftlift_meal_plan` | `mealPlan` | `{ generatedAt, weekStart, days: { [iso]: DayPlan } }` or `null` |
| `swiftlift_meal_log` | `mealLog` | `{ [isoDate]: { breakfast, lunch, dinner, snack } }` — nutritional snapshots |

`profile.schemaVersion` versions the profile's own shape; migrations
(`migrateSchemaV2` … `migrateSchemaV7` in `store.js`) run once on every app
mount and are idempotent.

### 7.1 Backup export & import

"Profile → Backup & restore" exports and restores all 12 domains above as one
JSON file:

```json
{
  "exportedAt": "2026-07-22T10:00:00.000Z",
  "backupSchemaVersion": 1,
  "profile": { "...": "..." },
  "sessions": [ /* ... */ ],
  "log": { /* ... */ },
  "weightLog": [ /* ... */ ],
  "hiit": { /* ... */ },
  "overload": { /* ... */ },
  "settings": { /* ... */ },
  "presets": { /* ... */ },
  "reminderDismissed": "2026-07-20",
  "meals": [ /* ... */ ],
  "mealPlan": { /* ... */ },
  "mealLog": { /* ... */ }
}
```

`backupSchemaVersion` versions the export format itself (which top-level keys
exist), independent of `profile.schemaVersion`. Import (`validateBackupJson`
in `json-backup.js`) is strict and all-or-nothing: any *present* domain with
the wrong shape rejects the whole file with no partial write, but a domain
that's simply *absent* (e.g. a legacy backup from before this feature existed)
is tolerated — that domain is just left untouched on the device. A backup with
a newer `backupSchemaVersion` than the app understands is rejected outright.

Import is a full overwrite, not a merge, and irreversible once confirmed — the
confirmation dialog offers a one-click "download my current data first" export
before the user commits. On confirm, all validated domains are written to
`localStorage` and the page reloads, so the normal mount-time load +
`profile.schemaVersion` migration chain becomes the single source of truth for
turning the restored data into app state (no separate state-sync path to
maintain).

---

## 8. Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| UI Framework | React 18 via CDN | Already in prototype, no build step |
| Styling | Tailwind CSS via CDN | Already in prototype, mobile-first |
| Transpiler | Babel standalone via CDN | Allows .jsx without build step |
| State | React useState + localStorage | Simple, sufficient for single user |
| Icons | Inline SVG | No extra dependency |
| Storage | localStorage | Offline, no backend, instant reads |

No build tools (Vite/Webpack) required — files deploy as static HTML/JS.

---

## 9. PWA Requirements

| Feature | Implementation |
|---------|---------------|
| Installable | `manifest.json` linked in HTML |
| Offline | Service worker caching all app files |
| Icons | 192×192 and 512×512 PNG icons |
| Theme | `#f97316` (orange-500) to match brand |
| Display | `standalone` — no browser chrome when installed |
| Start URL | `./Swiftlift.html` |

---

## 10. Deployment

- **Host:** GitHub Pages
- **Repo:** `<username>/workout` (public or private)
- **Trigger:** Push to `main` branch
- **Method:** GitHub Actions workflow copies static files to `gh-pages` branch
- **URL:** `https://<username>.github.io/workout/`
- **HTTPS:** Built-in (required for PWA install prompt and service workers)

---

## 11. Non-Goals

- Push notifications (banner-only reminder chosen)
- Cloud sync or multi-device
- Social / sharing features
- Calorie counting
- Custom workout schedule (fixed 5-day plan)
- Apple Watch / wearable support
- Login / accounts

---

## 12. Verification Checklist

- [ ] App loads with today's real date (no hardcoded date)
- [ ] Log a session → refresh → data persists
- [ ] Reminder banner appears at 8 AM on workout days when no session logged
- [ ] Banner is dismissable and stays dismissed for the day
- [ ] Complete HIIT → next session shows next video in rotation
- [ ] Progressive overload alert fires after 14 days with no increase
- [ ] Alert auto-dismisses after logging a new personal best
- [ ] Open on mobile → "Add to Home Screen" prompt appears
- [ ] Install → opens standalone (no browser address bar)
- [ ] Airplane mode → app loads fully from cache
- [ ] Push to GitHub → Actions deploy completes → live URL accessible
