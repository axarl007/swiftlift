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

```json
// Key: "swiftlift_sessions"
[{
  "date": "2026-05-09",
  "type": "push",           // push | legs | pull | hiit | rest
  "completed": true,
  "durationMin": 18,
  "exercises": [{
    "name": "Dumbbell Bench Press",
    "sets": [
      { "reps": 10, "weight": 10, "done": true },
      { "reps": 10, "weight": 10, "done": true },
      { "reps": 9,  "weight": 10, "done": true }
    ]
  }],
  "note": "Felt strong today"
}]

// Key: "swiftlift_hiit"
{
  "level": "easy",           // easy | medium | tough
  "rotationIndex": 0,
  "history": [{ "date": "2026-05-06", "videoId": "IPdLXThiOUU", "note": "" }]
}

// Key: "swiftlift_overload"
{
  "Dumbbell Bench Press": {
    "lastEventDate": "2026-04-25",
    "history": [{ "date": "2026-05-09", "reps": 10, "weight": 10 }]
  }
}

// Key: "swiftlift_profile"
{
  "name": "Axar",
  "bodyWeightKg": 75,
  "waterTargetMl": 2500,
  "proteinTargetG": 120,
  "startDate": "2026-05-01"
}

// Key: "swiftlift_log"
{
  "2026-05-09": {
    "protein": [{ "item": "Eggs", "grams": 18, "time": "08:30" }],
    "water": [{ "ml": 300, "time": "09:00" }]
  }
}

// Key: "swiftlift_dismissed_reminder"
"2026-05-09"   // date string — reminder dismissed for this day
```

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
