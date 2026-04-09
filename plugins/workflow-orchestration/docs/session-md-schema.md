# SESSION.md Schema Reference

This document defines the canonical format for `.agent/SESSION.md` — the **transient session
continuity** artifact used by `workflow-orchestration` skills to resume interrupted work and
enforce context hygiene in systematic debugging.

> **Scope boundary**: SESSION.md and HANDOFF.json are *session-scoped* artifacts. They track
> the context needed to resume a single interrupted agent session — current task, blockers,
> failed hypotheses, and decisions made during that session. They are **not** the right place
> for cross-session workflow lifecycle data such as completed phases, automation mode, or
> durable artifact references. For that purpose, see the
> [Workflow State Contract](workflow-state-contract.md), which defines `.workflow/state.yaml`
> as the durable workflow-state artifact.

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

1. If the file does not exist, attempt the HANDOFF.json fallback (see
   [HANDOFF.json reader rules](#rules-for-readers-1) below). Only if HANDOFF.json is
   also absent or unreadable: proceed normally. Do not mention absent session files
   to the developer.
2. If the file exists but fails YAML frontmatter parsing (missing delimiter, invalid
   YAML, missing required fields): report the parse failure to the developer, then
   attempt the HANDOFF.json fallback. Only if HANDOFF.json is also absent or malformed:
   proceed as if SESSION.md were absent.
3. If the file is valid but a `##` section body is empty or missing: treat it as
   empty — do not fail.
4. **Never re-attempt a hypothesis listed in `## Failed Hypotheses`.** Before forming
   new hypotheses in a resumed session, scan this section and treat all listed
   hypotheses as definitively ruled out.
5. Surface `## Blockers` at session start when non-empty. Ask the developer whether
   each blocker has been resolved before proceeding.

## HANDOFF.json — Machine-Readable Companion

### File location

`.agent/HANDOFF.json` in the **project root** (same directory as `SESSION.md`).

This file is a **runtime artifact** — it must **not** be version-controlled. Add
`.agent/HANDOFF.json` to the project's `.gitignore`.

### Format

HANDOFF.json is a single JSON object. All fields are present on every write.

```json
{
  "schema-version": "1.0",
  "current-task": "short description of the active task",
  "current-phase": "phase name or step label",
  "next-action": "single concrete action to take next",
  "workspace": "branch name or PR reference",
  "last-updated": "2025-01-15T14:32:00Z",
  "files-touched": ["src/auth.ts", "test/auth.test.ts"],
  "open-questions": ["Should token refresh use sliding window?"],
  "blockers": ["Waiting on API key from infrastructure team"],
  "failed-hypotheses": [
    {
      "hypothesis": "what was tried",
      "observation": "what was observed",
      "ruled-out-because": "why this is definitively ruled out"
    }
  ],
  "decisions": [
    {
      "decision": "what was decided",
      "rationale": "why"
    }
  ]
}
```

### Field definitions

| Field | Type | Required | Description |
|---|---|---|---|
| `schema-version` | string | yes | Always `"1.0"` for this version of the schema. |
| `current-task` | string | yes | Short description of the active task. |
| `current-phase` | string | yes | Phase name or step label (e.g. `"red"`, `"refactor"`, `"review"`). |
| `next-action` | string | yes | The single concrete action to take next. |
| `workspace` | string | yes | Branch name or PR reference (e.g. `"feat/my-feature"` or `"PR #42"`). |
| `last-updated` | string | yes | ISO-8601 timestamp of the last write (e.g. `"2025-01-15T14:32:00Z"`). |
| `files-touched` | string[] | yes | File paths modified during this session. May be empty `[]`. |
| `open-questions` | string[] | yes | Unresolved questions that need answers. May be empty `[]`. |
| `blockers` | string[] | yes | Anything actively blocking progress. May be empty `[]`. |
| `failed-hypotheses` | object[] | yes | Each entry has `hypothesis`, `observation`, and `ruled-out-because` (all strings). May be empty `[]`. |
| `decisions` | object[] | yes | Each entry has `decision` and `rationale` (both strings). May be empty `[]`. |

### Rules for writers

These rules apply to any skill, hook, or automated tool that writes `.agent/HANDOFF.json`:

1. All required fields (`schema-version`, `current-task`, `current-phase`, `next-action`,
   `workspace`, `last-updated`) must be present on every write.
2. `last-updated` must be a valid ISO-8601 timestamp.
3. Writes are **best-effort**. A write failure must not block or interrupt the primary
   skill workflow. Log the failure and continue.
4. Do not write partial files. If a write cannot be completed, leave the previous version
   intact.
5. Array fields (`files-touched`, `open-questions`, `blockers`, `failed-hypotheses`,
   `decisions`) may be empty but must always be present.

### Rules for readers

These rules apply to any skill, hook, or automated tool that reads `.agent/HANDOFF.json`:

1. If the file does not exist, proceed normally. Do not mention it to the developer.
2. If the file exists but is malformed — JSON fails to parse, any of the 6 required scalar
   fields (`schema-version`, `current-task`, `current-phase`, `next-action`, `workspace`,
   `last-updated`) is missing or not a string, or any of the 5 required array fields
   (`files-touched`, `open-questions`, `blockers`, `failed-hypotheses`, `decisions`) is
   missing or not an array: report the parse failure to the developer, ignore the file
   entirely, and proceed as if it were absent.
3. Read HANDOFF.json as a **fallback** when SESSION.md is absent or malformed.
4. **Never re-attempt a hypothesis listed in `failed-hypotheses`.** Before forming new
   hypotheses in a resumed session, scan this array and treat all listed hypotheses as
   definitively ruled out.
5. Surface `blockers` at session start when non-empty. Ask the developer whether each
   blocker has been resolved before proceeding.

### Relationship to SESSION.md

HANDOFF.json is the **machine-readable companion** to SESSION.md. Both files describe the
same session state in different formats:

- **SESSION.md** is the human-readable artifact, written in YAML frontmatter + markdown.
- **HANDOFF.json** is the machine-readable artifact, written as a single JSON object.

Both should be written together whenever SESSION.md is updated. HANDOFF.json enables
automated tools and hooks to read session state without parsing markdown.

## Relationship to durable workflow state

`.agent/SESSION.md` and `.agent/HANDOFF.json` are transient session-continuity
artifacts. They help a local session resume work, preserve blockers, and avoid
repeating failed hypotheses, but they are **not** the durable workflow-state
contract for lifecycle-aware automation.

When a repository adopts durable workflow state, that contract belongs in a
separate machine-readable artifact such as
`.workflow-orchestration/state.json`, documented independently in
`docs/workflow-state-contract.md`. Use these rules:

- keep session continuity focused on the current local work session;
- keep durable workflow state focused on cross-session workflow phase,
  automation mode, durable artifact references, and next-action continuity;
- do not merge the two contracts into one file;
- if session continuity needs to reference durable workflow state, store only the
  pointer or note, not a second copy of the state contract.

---

## Boundary: Transient Session State vs. Durable Workflow State

The session continuity artifacts defined in this document (`.agent/SESSION.md` and
`.agent/HANDOFF.json`) serve a different purpose from the durable workflow-state artifact
(`.workflow/state.yaml`) defined in the
[Workflow State Contract](workflow-state-contract.md).

| Concern | Session continuity | Workflow state |
|---------|-------------------|----------------|
| **Artifacts** | `.agent/SESSION.md`, `.agent/HANDOFF.json` | `.workflow/state.yaml` |
| **Scope** | Single agent session | Cross-session workflow lifecycle |
| **Lifespan** | Ephemeral — replaced or abandoned when the session ends | Durable — survives across sessions and contributors |
| **Purpose** | Resume interrupted work; avoid repeating failed hypotheses | Track multi-phase workflow progress, artifact references, automation mode |
| **Content** | Task, phase, next action, blockers, failed hypotheses, decisions | Current workflow phase, automation mode, artifact references, completed phases, next action |
| **Version control** | Never committed (`.gitignore`) | Project-level decision — may be committed for team visibility |

**Key rules**:

1. Session continuity files may *read from* the workflow-state artifact to understand
   what phase the overall workflow is in, but they never *write to* it.
2. The workflow-state artifact never references session-level details such as failed
   hypotheses or session-scoped blockers. Information flows from durable to transient,
   not the reverse.
3. A session that updates workflow progress (e.g., completing a phase) should update
   `.workflow/state.yaml` through the owning workflow skill, not by modifying session
   continuity fields.
4. The two artifact families have independent discovery rules. Session continuity uses
   the `.agent/SESSION.md` → `.agent/HANDOFF.json` fallback chain. Workflow state uses
   `.workflow/state.yaml` with no fallback chain.
