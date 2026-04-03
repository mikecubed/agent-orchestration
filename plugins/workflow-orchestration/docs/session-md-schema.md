# SESSION.md Schema Reference

This document defines the canonical format for `.agent/SESSION.md` — the session continuity
artifact used by `workflow-orchestration` skills to resume interrupted work and enforce
context hygiene in systematic debugging.

## File location

`.agent/SESSION.md` in the **project root** (the repository where the skill is being run,
not inside this plugin directory).

This file is a **runtime artifact** — it must **not** be version-controlled. Add
`.agent/SESSION.md` to the project's `.gitignore`.

## Canonical format

```markdown
---
current-task: "short description of the active task"
current-phase: "phase name or step label"
next-action: "the single concrete action to take next"
workspace: "branch name or PR reference (e.g. feat/my-feature or PR #42)"
last-updated: "2025-01-15T14:32:00Z"
---

## Decisions

Record key decisions made during this session and their rationale.
Empty body is acceptable.

## Files Touched

List files created or modified. One path per line.
Empty body is acceptable.

## Open Questions

List unresolved questions that need answers before proceeding.
Empty body is acceptable.

## Blockers

List anything actively blocking progress. If non-empty, the session-start hook
will surface these and ask whether they have been resolved.
Empty body is acceptable.

## Failed Hypotheses

**DO NOT RETRY any hypothesis listed here.**
Record each failed debugging or investigation attempt: what was tried, what was
observed, and why this hypothesis is ruled out. A fresh session MUST read this
section before forming new hypotheses to avoid repeating ruled-out paths.
Empty body is acceptable.
```

## Rules for writers

These rules apply to any skill or hook that writes or updates `.agent/SESSION.md`:

1. All five YAML frontmatter fields are **required** on every write:
   `current-task`, `current-phase`, `next-action`, `workspace`, `last-updated`.
2. `last-updated` must be a valid ISO-8601 timestamp (e.g. `2025-01-15T14:32:00Z`).
3. All five `##`-level markdown sections must be present in every write. An empty
   body (no content under the heading) is acceptable.
4. Writes are **best-effort**. A write failure must not block or interrupt the
   primary skill workflow. Log the failure and continue.
5. Do not write partial files. If a write cannot be completed, leave the previous
   version intact.

## Rules for readers

These rules apply to any skill or hook that reads `.agent/SESSION.md`:

1. If the file does not exist, proceed normally. Do not mention it to the developer.
2. If the file exists but fails YAML frontmatter parsing (missing delimiter, invalid
   YAML, missing required fields): report the parse failure to the developer, ignore
   the file entirely, and proceed as if it were absent.
3. If the file is valid but a `##` section body is empty or missing: treat it as
   empty — do not fail.
4. **Never re-attempt a hypothesis listed in `## Failed Hypotheses`.** Before forming
   new hypotheses in a resumed session, scan this section and treat all listed
   hypotheses as definitively ruled out.
5. Surface `## Blockers` at session start when non-empty. Ask the developer whether
   each blocker has been resolved before proceeding.
