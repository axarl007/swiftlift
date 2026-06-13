---
name: handoff
description: Compact the current conversation into a handoff document for another agent or future session. Captures decisions made, work done, what's left, and suggested next skills. Use at the end of a long session or before switching agents.
---

# Handoff

Compact this conversation into a handoff document for the next agent or session.

## Rules

- Save the file to the OS temp directory (`$TMPDIR` or `/tmp/handoff-[topic].md`)
- Reference existing artifacts (files, issues, PRDs) rather than duplicating them — link or cite, don't copy
- Redact any sensitive values (tokens, secrets, passwords)
- Keep it tight — the next agent should be able to read it in under 2 minutes

## Document structure

```markdown
# Handoff: [topic]

## Context
What problem is being solved and why it matters.

## What's been decided
- Decision 1 (and why)
- Decision 2 (and why)

## What's been done
- [x] Completed item (reference file/issue/PR if relevant)
- [x] Completed item

## What's left
- [ ] Next thing to do
- [ ] Thing after that

## Artifacts
- [filename or issue URL] — one-line description

## Suggested skills for next session
- `/skill-name` — why it's relevant
```

After writing the file, print the path so the next agent knows where to find it.
