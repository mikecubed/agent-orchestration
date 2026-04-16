---
name: map-codebase
description: Guided codebase discovery that produces a structured, shareable factual context brief for use by downstream skills.
---

> References to `docs/session-md-schema.md` in this skill refer to the plugin-level `docs/` directory (`../../docs/` relative to this file). Other `docs/` paths (such as artifact output destinations) refer to the target project.

## Purpose

Use this skill when a developer or agent needs to understand an unfamiliar codebase before planning, implementing, debugging, or reviewing. It runs a structured discovery pass and produces a factual context brief that downstream skills can consume directly, avoiding redundant exploration.

Persistent team, squad, or fleet-style long-lived orchestration is out of scope for this skill. Use a separate orchestration layer if persistent coordination is needed.

## When to Use It

Activate when the developer asks for things like:

- "map this codebase"
- "what does this repo do?"
- "give me a summary of the project structure"
- "build me a context brief"

Also activate when:

- starting work on an unfamiliar codebase;
- before running `/flow:plan`, `/flow:debug`, or `/flow:arch-review`;
- when a fresh session needs to rebuild lost context quickly;
- onboarding a new contributor who needs orientation.

## Project-Specific Inputs

Before you start, identify:

- the repository root and any monorepo boundaries;
- the primary language(s) and framework(s);
- the expected output location for the brief (default: `.agent/codebase-brief.md`);
- any directories or files that should be excluded from discovery (e.g., vendored code, generated files);
- the maximum scope if the codebase is very large (recommend narrowing to a subtree).

If any critical inputs are missing, ask the developer before proceeding.

## Default Roles

Use separate roles for:

- a **scout** model or agent that performs each discovery dimension;
- a **coordinator** that merges dimension results into the final brief.

In Claude Code, spawn each scout as a separate agent using the Agent tool. Pass each scout a scoped prompt limited to its discovery dimension. The coordinator merges results into the factual context brief. Do not allow scouts to make recommendations or judgments — they gather facts only.

### Model Selection

Resolve the active model for each role using this priority chain:

1. **Project config** — look for the runtime-specific config file in the current project root:
   - Copilot CLI: `.copilot/models.yaml`
   - Claude Code: `.claude/models.yaml`

   These are plain YAML files (no markdown, no fenced blocks). Read the `implementer`, `reviewer`, and `scout` keys directly. If a key is absent, fall back to the baked-in default for that role — do not re-prompt for a key that is missing.

2. **Session cache** — if models were already confirmed earlier in this session, reuse them without asking again.
3. **Baked-in defaults** — if neither config file nor session cache exists, use the defaults below silently without prompting. Create project model config only when the developer wants persistent overrides.

#### Default models

| Runtime       | Role        | Default model       |
|---------------|-------------|---------------------|
| Copilot CLI   | Implementer | `claude-opus-4.7`   |
| Copilot CLI   | Reviewer    | `gpt-5.4`           |
| Copilot CLI   | Scout       | `claude-haiku-4.5`  |
| Claude Code   | Implementer | `claude-opus-4.7`   |
| Claude Code   | Reviewer    | `claude-opus-4.7`   |
| Claude Code   | Scout       | `claude-haiku-4.5`  |

## Workflow

### 1. Confirm scope and output location

Before launching discovery:

1. confirm the repository root or subtree to map;
2. confirm the output path for the brief (default: `.agent/codebase-brief.md`);
3. check for exclusion patterns (vendored, generated, or irrelevant directories).

### 2. Launch 5 parallel discovery dimensions

Run 5 scout agents in parallel, one per dimension. Each scout gathers only factual information and returns a structured section.

**Dimension 1 — Structure**

- directory tree (top 3 levels);
- entry points (main files, index files, CLI commands);
- build commands (from package manifests, Makefiles, CI configs);
- test commands;
- lint commands.

**Dimension 2 — Dependencies**

- package manifests and lock files;
- external dependency list with versions;
- internal module graph (which modules import which);
- dependency management tool (npm, pip, cargo, go mod, etc.).

**Dimension 3 — Tests**

- test framework(s) in use;
- test file locations and naming convention;
- coverage configuration (if present);
- count of passing / failing / skipped tests (run the test command if safe);
- test-to-source ratio.

**Dimension 4 — Architecture**

- layer structure (e.g., controllers / services / repositories);
- naming conventions;
- public API surface (exported modules, endpoints, CLI commands);
- configuration and environment handling.

**Dimension 5 — Hotspots**

- most-changed files in the last 90 days (via `git log --since`);
- largest files by line count;
- TODO / FIXME / HACK density (count and top locations);
- files with the most contributors.

Each scout returns its results in a structured text block. If a dimension fails or times out, the coordinator records the failure and continues with the remaining dimensions.

### 3. Merge results into the factual context brief

The coordinator merges all dimension results into a single document:

1. one section per discovery dimension;
2. factual content only — no opinions, recommendations, or action items;
3. include a metadata header with:
   - repository path;
   - timestamp;
   - dimensions completed vs. attempted;
   - scope (full repo or subtree).

### 4. Write the brief to disk

Write the merged brief to the confirmed output path. If the write fails, try the fallback path `docs/codebase-brief.md`. Record the actual path used.

### 5. Update SESSION.md

Write `.agent/SESSION.md` using the full schema defined in `docs/session-md-schema.md`:

```yaml
current-task: "Map codebase and produce factual context brief"
current-phase: "codebase-mapped"
next-action: "ready for arch-review or planning"
workspace: "<repository root or subtree>"
last-updated: "<ISO-8601 datetime>"
```

Required sections:

- `## Decisions` — record `brief-path: <actual output path>` and any scope narrowing decisions
- `## Files Touched` — the brief file path
- `## Open Questions` — any dimensions that returned incomplete results
- `## Blockers` — empty if none
- `## Failed Hypotheses` — dimensions that failed or timed out

If the SESSION.md write fails: log a warning and continue. Do not block workflow completion.

## Required Gates

### Discovery gate

All 5 discovery dimensions must be attempted. A dimension that fails or times out counts as attempted but must be recorded in the brief with a failure note.

### Brief artifact gate

The factual brief artifact must be written to disk. If both the primary and fallback paths fail, the gate fails.

### SESSION.md gate

The `brief-path` must be recorded in SESSION.md `## Decisions` so downstream skills can locate the brief. This is a durable artifact requirement — the brief-path entry is how `arch-review` and other skills find the context.

### Verification checklist — discovery complete

Before declaring the mapping complete, confirm ALL of the following. Any failing item blocks the "mapping complete" declaration.

- [ ] All 5 discovery dimensions were attempted, and each has results or a documented failure note — PASS / FAIL
- [ ] Brief artifact exists at the recorded path — PASS / FAIL
- [ ] SESSION.md written with correct phase and brief-path — PASS / FAIL
- [ ] Brief contains only factual content (no recommendations) — PASS / FAIL

If any item is FAIL: report the failing item(s) by name, state what must be done to resolve each, and do not advance past the gate.

## Stop Conditions

- A discovery dimension stalls without returning results; the coordinator must attempt rescue by narrowing the dimension scope or retrying with a simpler query before abandoning it.
- The codebase is too large to map in a single session — recommend scope narrowing to a subtree or module boundary.
- Discovery tools are unavailable (e.g., no git history, no package manifest, no test runner).
- The developer asks to stop.
- All dimensions fail after rescue attempts — produce a partial brief with whatever was gathered and note the failures.

When stopping, ensure any partial results are preserved as a durable artifact so work is not lost.

## Example

### Invocation

```text
Developer: map this codebase so we can plan the v2 migration
```

### Discovery brief output (abbreviated)

```markdown
# Codebase Brief — my-app

**Repository:** /home/user/projects/my-app
**Timestamp:** 2025-07-20T14:30:00Z
**Dimensions:** 5/5 completed
**Scope:** full repository

## Structure

- Root: Node.js project (package.json, tsconfig.json)
- Entry points: src/index.ts, src/cli.ts
- Build: npm run build (tsc)
- Test: npm test (vitest)
- Lint: npm run lint (eslint)

## Dependencies

- 12 production dependencies (express, zod, prisma, ...)
- 8 dev dependencies (vitest, typescript, eslint, ...)
- Internal modules: src/api/ imports src/services/, src/services/ imports src/db/

## Tests

- Framework: vitest
- Test files: 24 files in test/ and **/*.test.ts
- Coverage: 78% line coverage configured
- Status: 142 passing, 0 failing, 3 skipped

## Architecture

- Layers: api (controllers) → services → db (repositories)
- Naming: camelCase functions, PascalCase classes, kebab-case files
- Public API: REST endpoints in src/api/routes/
- Config: dotenv with .env and .env.example

## Hotspots

- Most changed (90d): src/services/auth.ts (47 commits), src/api/routes/users.ts (31 commits)
- Largest files: src/db/migrations/001_init.sql (820 lines), src/services/auth.ts (412 lines)
- TODO density: 14 TODOs, 3 FIXMEs — concentrated in src/services/
```
