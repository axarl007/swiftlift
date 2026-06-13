---
name: prototype
description: Build a throwaway prototype to answer a specific design or logic question before committing to a full implementation. Use when validating a state machine, business logic, or UI design variation.
---

# Prototype

A prototype is throwaway code that answers a question. The question decides the shape.

## Choose your branch

**Logic / State question?** → Build an interactive terminal app
- Test state machines and business logic through edge cases
- Walk through scenarios interactively

**UI / Design question?** → Build multiple design variations
- Create radically different UI variations
- Make them toggleable via URL params so they're easy to compare

## Rules

1. **Mark it as throwaway** — put it near the relevant production code, named clearly as a prototype
2. **Single command to run** — use the project's existing task runner
3. **In-memory state only** — no persistence unless you're specifically prototyping persistence
4. **No polish** — no tests, no abstractions, no error handling
5. **Visible state** — after each action, display what changed so the question being tested is always visible

## When you're done

Once the prototype answers its question:

1. Capture the validated decision durably (ADR, commit message, notes file, or inline in the PRD)
2. Delete the prototype, OR integrate the validated decision into production code

The learning matters. The code doesn't.
