---
name: improve-codebase-architecture
description: Find deepening opportunities in a codebase — refactors that turn shallow modules into deep ones, improving testability and AI-navigability. Use when the codebase feels hard to change, test, or understand.
---

# Improve Codebase Architecture

Surface architectural friction and propose deepening opportunities — refactors that turn shallow modules into deep ones. The aim is testability and AI-navigability.

## Glossary

Use these terms exactly in every suggestion:

- **Module** — anything with an interface and an implementation (function, class, package, slice)
- **Interface** — everything a caller must know to use the module: types, invariants, error modes, ordering, config
- **Implementation** — the code inside
- **Depth** — leverage at the interface: a lot of behaviour behind a small interface
- **Seam** — where an interface lives; a place behaviour can be altered without editing in place
- **Adapter** — a concrete thing satisfying an interface at a seam
- **Leverage** — what callers get from depth
- **Locality** — what maintainers get from depth: change, bugs, knowledge concentrated in one place

Key principles: deletion test, interface as test surface, one adapter = hypothetical seam, two adapters = real seam.

## Process

### 1. Explore

Read the domain glossary (`CONTEXT.md`) and ADRs first. Walk the codebase organically, noting:
- Shallow modules (large interface, thin implementation)
- Pass-throughs that could be deleted
- Tightly coupled code that's hard to test independently
- Duplicated logic that could be consolidated

### 2. Present candidates as an HTML report

Write a self-contained HTML file to a temp directory (`$TMPDIR` or `/tmp`). Use Tailwind and Mermaid via CDN. For each candidate include:

- Files affected
- Problem description
- Proposed solution
- Benefits (testability, locality, leverage)
- Before/After diagrams
- Recommendation strength (high / medium / low)

Open the report so the user can review it.

### 3. Grilling loop

Walk the design tree with the user. For each candidate:
- Explain the friction point
- Propose the deepening refactor
- Get approval or rejection with reasoning

Update `CONTEXT.md` when new domain concepts emerge. Offer ADRs when a rejection carries a load-bearing reason (hard to reverse, surprising without context, result of a real trade-off).
