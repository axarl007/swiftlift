---
name: to-prd
description: Convert the current conversation context into a structured Product Requirements Document (PRD) and publish it to the issue tracker. Use when a feature discussion is mature enough to formalize into requirements.
---

# To PRD

Convert the current conversation context into a PRD and publish it to the issue tracker.

## Steps

### 1. Explore the codebase

Review the repository state. Apply domain glossary terms and ADRs relevant to the feature area.

### 2. Identify testing seams

Map out testing boundaries, preferring existing seams over new ones. Identify the highest-level seam possible. Propose new seams only when necessary. Validate these seams with the user.

### 3. Create and publish the PRD

Generate the document using the template below. Post to the issue tracker with the `ready-for-agent` triage label.

## PRD Template

**Problem Statement**
User-facing problem description.

**Solution**
User-facing solution overview.

**User Stories**
Extensive numbered list in "As [actor], I want [feature], so that [benefit]" format.

**Implementation Decisions**
Modules, interfaces, technical clarifications, architectural choices, schema/API contracts.

**Testing Decisions**
What constitutes good tests, modules to test, relevant prior art.

**Out of Scope**
Feature exclusions.

**Further Notes**
Additional context.

---

Note: Avoid file paths and code snippets due to rapid obsolescence, except for decision-encoding prototypes (state machines, reducers, schemas, type shapes).
