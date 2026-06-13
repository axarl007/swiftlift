---
name: diagnose
description: Six-phase disciplined debugging framework for hard bugs and performance regressions. The core skill is building a fast, deterministic, agent-runnable feedback loop. Use when facing a difficult or mysterious bug.
---

# Diagnose: Disciplined Debugging

**Core principle**: "If you have a fast, deterministic, agent-runnable pass/fail signal for the bug, you will find the cause." Build the feedback loop first — everything else is mechanical.

## Phase 1: Build a Feedback Loop (THE critical step)

Before anything else, create a reproducible pass/fail signal. Options:

1. Write a failing test
2. Write a failing script
3. Use a differential test (compare two versions)
4. Use a bisect (git bisect or similar)
5. Capture a failing request/response
6. Isolate in a minimal reproduction
7. Use a profiler snapshot
8. Replay from logs
9. Instrument and compare outputs
10. Create an interactive debugging session

Optimize the loop for: speed (target <2s), signal clarity, and determinism. Treat the loop itself as a product.

**If you cannot build a reproducible loop, stop here.** Request artifacts or production access instead.

## Phase 2: Reproduce

Verify the loop actually triggers the exact bug the user reported — not a nearby symptom. Confirm it reproduces consistently across multiple runs.

## Phase 3: Hypothesise

Generate **3–5 ranked, falsifiable hypotheses** before running any tests. For each:

- State the hypothesis clearly
- Predict: "If X causes it, then changing Y will eliminate the bug"

Do not test anything until you have your hypotheses written down.

## Phase 4: Instrument

Map diagnostic probes to specific predictions. Rules:

- Test one variable per probe
- Prefer debuggers over logging
- Tag every debug log with a unique prefix (`[DEBUG-a4f2]`) for later cleanup
- Run the feedback loop after each probe

## Phase 5: Fix + Regression Test

Once you've identified the cause:

- Write the fix
- Write a regression test at the correct architectural seam — where the real bug pattern occurs at the call site
- If no good seam exists, document that architectural gap

## Phase 6: Cleanup + Post-Mortem

- Remove all debug instrumentation (search for your debug tags)
- Verify the original repro no longer triggers
- Document architectural findings: would a structural change prevent recurrence?
