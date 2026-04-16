# v3.0 Migration Plan: Plugin Rename + Patterns Plugin

## Summary

Rename all plugins to short names, merge SDD into the workflow plugin, and introduce a new combined design-patterns plugin. This is a breaking change across manifests, skill names, cross-references, tests, and docs.

## Target State

| New plugin name | Source | Qualified command example | Dir under `plugins/` |
|-----------------|--------|--------------------------|----------------------|
| **flow** | workflow-orchestration + sdd-workflow | `/flow:plan`, `/flow:sdd-specify` | `plugins/flow/` |
| **ccc** | clean-code-codex (unchanged content) | `/ccc`, `/ccc:arch-check` | `plugins/ccc/` |
| **patterns** | peaa + gof + ddd (new) | `/patterns:peaa-advisor`, `/patterns:gof-teach` | `plugins/patterns/` |

**Umbrella package**: `agent-orchestration` stays the same. Version bumps to `3.0.0`.

---

## Resolved Decisions

### Why `ccc` instead of `codex`?

There is an existing third-party plugin called `codex`. Using `ccc` (Clean Code Codex) avoids naming confusion while staying short.

### Why merge SDD into flow?

SDD is a workflow (specify -> plan -> tasks). It has only 4 skills and is already referenced by `planning-orchestration` and `brainstorm-ideation`. Merging removes a standalone plugin that users always install alongside the workflow plugin anyway.

### SDD stays as agents, not skills

The SDD agent files (`sdd.specify.md`, `sdd.plan.md`, `sdd.tasks.md`) use Copilot-specific `handoffs` frontmatter for agent-to-agent chaining. Converting them to standard skills would lose that capability. The flow plugin will declare both `skills/` and `agents/` in its Copilot manifest (same pattern codex already uses). The Claude manifest stays `"./skills/"` only; `sdd-feature` remains the Claude-side entry point.

### Why combine PEAA + GoF + DDD into one `patterns` plugin?

All three are canonical-book pattern catalogs with an identical 4-skill shape (advisor, evaluator, refactor, teach). They share the same interaction model (user-invoked advisory) and the same `references/` directory structure. The `peaa-`, `gof-`, `ddd-` prefixes on skill names provide clean namespacing within the plugin.

### v3.0 ships with PEAA only

GoF and DDD will be added to the patterns plugin as they become ready. The plugin structure supports incremental addition without further breaking changes.

### Why NOT fold patterns into ccc?

- CCC skills are **auto-invoked enforcement** (conductor orchestrates checks, reports violations, blocks).
- Pattern skills are **user-invoked advisory** (recommend, teach, evaluate, plan refactors).
- Mixing these creates confusion about what auto-fires vs. what the user controls.

### Why shorten flow skill names?

Suffixes like `-orchestration`, `-loop`, `-gate` describe internal mechanics, not user intent. Dropping them makes slash commands practical to type. The `flow:` plugin prefix already establishes context.

### Copilot/Claude path convention preserved

The intentional path difference continues: Copilot uses `["skills/"]` (array); Claude uses `"./skills/"` (string with leading `./`). This is a tested convention in the current codebase.

### PEAA reference paths use `references/peaa/` prefix

Skills need to access their reference data reliably. After relocation, PEAA skill SKILL.md files will reference `references/peaa/catalog-core.md` etc. Each future book (GoF, DDD) gets its own subdirectory under `references/`. This keeps skills self-contained while allowing multiple books to coexist.

---

## Skill Name Mapping

### flow (was workflow-orchestration + sdd-workflow)

#### Skills (in `skills/`)

| Old qualified name | New qualified name | Old dir name | New dir name |
|---|---|---|---|
| `workflow-orchestration:idea-to-done-orchestration` | `flow:idea-to-done` | `idea-to-done-orchestration` | `idea-to-done` |
| `workflow-orchestration:planning-orchestration` | `flow:plan` | `planning-orchestration` | `plan` |
| `workflow-orchestration:delivery-orchestration` | `flow:deliver` | `delivery-orchestration` | `deliver` |
| `workflow-orchestration:parallel-implementation-loop` | `flow:parallel-impl` | `parallel-implementation-loop` | `parallel-impl` |
| `workflow-orchestration:pr-review-resolution-loop` | `flow:pr-resolve` | `pr-review-resolution-loop` | `pr-resolve` |
| `workflow-orchestration:final-pr-readiness-gate` | `flow:pr-ready` | `final-pr-readiness-gate` | `pr-ready` |
| `workflow-orchestration:diff-review-orchestration` | `flow:diff-review` | `diff-review-orchestration` | `diff-review` |
| `workflow-orchestration:pr-publish-orchestration` | `flow:pr-publish` | `pr-publish-orchestration` | `pr-publish` |
| `workflow-orchestration:release-orchestration` | `flow:release` | `release-orchestration` | `release` |
| `workflow-orchestration:git-worktree-orchestration` | `flow:worktree` | `git-worktree-orchestration` | `worktree` |
| `workflow-orchestration:swarm-orchestration` | `flow:swarm` | `swarm-orchestration` | `swarm` |
| `workflow-orchestration:brainstorm-ideation` | `flow:brainstorm` | `brainstorm-ideation` | `brainstorm` |
| `workflow-orchestration:systematic-debugging` | `flow:debug` | `systematic-debugging` | `debug` |
| `workflow-orchestration:incident-rca` | `flow:incident-rca` | `incident-rca` | `incident-rca` |
| `workflow-orchestration:map-codebase` | `flow:map-codebase` | `map-codebase` | `map-codebase` |
| `workflow-orchestration:architecture-review` | `flow:arch-review` | `architecture-review` | `arch-review` |
| `workflow-orchestration:e2e-test-generation` | `flow:e2e-tests` | `e2e-test-generation` | `e2e-tests` |
| `workflow-orchestration:contract-generator` | `flow:contracts` | `contract-generator` | `contracts` |
| `workflow-orchestration:knowledge-compound` | `flow:knowledge-save` | `knowledge-compound` | `knowledge-save` |
| `workflow-orchestration:knowledge-refresh` | `flow:knowledge-refresh` | `knowledge-refresh` | `knowledge-refresh` |
| `sdd-workflow:sdd-feature-workflow` | `flow:sdd-feature` | `sdd-feature-workflow` | `sdd-feature` |

#### Agents (in `agents/`, Copilot only)

| Old file | New file | Old invocation | New invocation |
|---|---|---|---|
| `sdd.specify.md` | `sdd-specify.md` | `sdd-workflow:sdd.specify` | `flow:sdd-specify` |
| `sdd.plan.md` | `sdd-plan.md` | `sdd-workflow:sdd.plan` | `flow:sdd-plan` |
| `sdd.tasks.md` | `sdd-tasks.md` | `sdd-workflow:sdd.tasks` | `flow:sdd-tasks` |

Agent `handoffs` frontmatter updated to reference new agent names (e.g., `agent: sdd-plan` instead of `agent: sdd.plan`).

### ccc (was clean-code-codex)

Only the plugin name changes. Skill directory names stay the same since they are already short.

| Old qualified name | New qualified name |
|---|---|
| `clean-code-codex:conductor` | `ccc:conductor` |
| `clean-code-codex:arch-check` | `ccc:arch-check` |
| `clean-code-codex:tdd-check` | `ccc:tdd-check` |
| `clean-code-codex:type-check` | `ccc:type-check` |
| `clean-code-codex:naming-check` | `ccc:naming-check` |
| `clean-code-codex:size-check` | `ccc:size-check` |
| `clean-code-codex:dead-check` | `ccc:dead-check` |
| `clean-code-codex:sec-check` | `ccc:sec-check` |
| `clean-code-codex:obs-check` | `ccc:obs-check` |
| `clean-code-codex:perf-check` | `ccc:perf-check` |
| `clean-code-codex:dep-check` | `ccc:dep-check` |
| `clean-code-codex:test-check` | `ccc:test-check` |
| `clean-code-codex:resilience-check` | `ccc:resilience-check` |
| `clean-code-codex:docs-check` | `ccc:docs-check` |
| `clean-code-codex:a11y-check` | `ccc:a11y-check` |
| `clean-code-codex:i18n-check` | `ccc:i18n-check` |
| `clean-code-codex:iac-check` | `ccc:iac-check` |
| `clean-code-codex:ctx-check` | `ccc:ctx-check` |
| `/clean-code-codex:codex` (command) | `/ccc` (command) |
| `agents/clean-code-codex.agent.md` | `agents/ccc.agent.md` |

### patterns (new plugin, ships with PEAA only)

Skills are prefixed by their book abbreviation. Each book contributes 4 skills with identical shapes.

| Qualified name | Dir name | Source |
|---|---|---|
| `patterns:peaa-advisor` | `peaa-advisor` | from `~/.claude/skills/peaa/` |
| `patterns:peaa-evaluator` | `peaa-evaluator` | from `~/.claude/skills/peaa/` |
| `patterns:peaa-refactor` | `peaa-refactor` | from `~/.claude/skills/peaa/` |
| `patterns:peaa-teach` | `peaa-teach` | from `~/.claude/skills/peaa/` |
| `patterns:gof-advisor` | `gof-advisor` | future |
| `patterns:gof-evaluator` | `gof-evaluator` | future |
| `patterns:gof-refactor` | `gof-refactor` | future |
| `patterns:gof-teach` | `gof-teach` | future |
| `patterns:ddd-advisor` | `ddd-advisor` | future |
| `patterns:ddd-evaluator` | `ddd-evaluator` | future |
| `patterns:ddd-refactor` | `ddd-refactor` | future |
| `patterns:ddd-teach` | `ddd-teach` | future |

---

## Directory Layout

### flow plugin

```
plugins/flow/
  plugin.json                          # Copilot: skills + agents
  .claude-plugin/plugin.json           # Claude: skills only
  package.json
  README.md
  docs/
    models-config-template.md
    session-md-schema.md
    skills-evaluation.md
    workflow-artifact-templates.md
    workflow-defaults-contract.md
    workflow-state-contract.md
    workflow-usage-guide.md
  skills/
    idea-to-done/SKILL.md
    plan/SKILL.md
    deliver/SKILL.md
    parallel-impl/SKILL.md
    pr-resolve/SKILL.md
    pr-ready/SKILL.md
    diff-review/SKILL.md
    pr-publish/SKILL.md
    release/SKILL.md
    worktree/SKILL.md
    swarm/SKILL.md
    brainstorm/SKILL.md
    debug/SKILL.md
    incident-rca/SKILL.md
    map-codebase/SKILL.md
    arch-review/SKILL.md
    e2e-tests/SKILL.md
    contracts/SKILL.md
    knowledge-save/SKILL.md
    knowledge-refresh/SKILL.md
    sdd-feature/SKILL.md               # Claude-side SDD entry point
  agents/
    sdd-specify.md                      # Copilot agent with handoffs
    sdd-plan.md                         # Copilot agent with handoffs
    sdd-tasks.md                        # Copilot agent with handoffs
  test/
    plugin-layout.test.js
```

### ccc plugin

```
plugins/ccc/
  plugin.json
  .claude-plugin/plugin.json
  package.json
  README.md
  agents/
    ccc.agent.md                        # renamed from clean-code-codex.agent.md
  commands/
    codex.md                            # command name stays (maps to /ccc)
  docs/
    hooks.md
  gh-hooks/
    hooks.json
  hooks/
    scripts/
    patterns/
  scripts/
    dep_audit.sh
    lint_dead_code.py
    scan_secrets.sh
  skills/
    conductor/SKILL.md
    ... (all 17 check skills, unchanged dir names)
  test/
    plugin-layout.test.js
```

### patterns plugin

```
plugins/patterns/
  plugin.json                           # Copilot: skills
  .claude-plugin/plugin.json            # Claude: skills
  package.json
  README.md
  skills/
    peaa-advisor/SKILL.md
    peaa-evaluator/SKILL.md
    peaa-refactor/SKILL.md
    peaa-teach/SKILL.md
  references/
    peaa/
      catalog-core.md
      catalog-index.md
      catalog.md
      antipatterns.md
      decision-trees.md
      lang/
        python.md
        typescript.md
        javascript.md
        rust.md
        go.md
  test/
    plugin-layout.test.js
```

---

## Implementation Phases

### Phase 1: Scaffold new directory structure

1. Create `plugins/flow/`, `plugins/flow/skills/`, `plugins/flow/agents/`, `plugins/flow/docs/`, `plugins/flow/.claude-plugin/`, `plugins/flow/test/`.
2. Create `plugins/ccc/`, `plugins/ccc/.claude-plugin/`, `plugins/ccc/test/`.
3. Create `plugins/patterns/`, `plugins/patterns/skills/`, `plugins/patterns/references/peaa/`, `plugins/patterns/.claude-plugin/`, `plugins/patterns/test/`.

### Phase 2: Migrate flow plugin

1. Copy all skill SKILL.md files from `plugins/workflow-orchestration/skills/` into `plugins/flow/skills/` under their new directory names (see mapping table).
2. Copy SDD agents from `plugins/sdd-workflow/agents/` into `plugins/flow/agents/`:
   - `sdd.specify.md` -> `sdd-specify.md`
   - `sdd.plan.md` -> `sdd-plan.md`
   - `sdd.tasks.md` -> `sdd-tasks.md`
   - Update `handoffs` frontmatter to reference new agent names (`sdd-plan` not `sdd.plan`, etc.).
3. Copy `plugins/sdd-workflow/skills/sdd-feature-workflow/SKILL.md` -> `plugins/flow/skills/sdd-feature/SKILL.md`.
4. Copy docs from `plugins/workflow-orchestration/docs/` -> `plugins/flow/docs/`.
5. Update all SKILL.md frontmatter `name:` fields to match new directory names.
6. Global find-and-replace across all SKILL.md and docs files (full mapping from tables above):
   - All `workflow-orchestration:<old-skill>` -> `flow:<new-skill>` (231 occurrences across 19 source files)
   - All `sdd-workflow:sdd.specify` -> `flow:sdd-specify`, etc. (9 occurrences across 2 files)
   - All `clean-code-codex:` -> `ccc:` (13 occurrences across 5 files)
   - All `.workflow-orchestration/` directory references -> `.flow/` (state.json, defaults.json, artifacts paths)
7. Create `plugins/flow/plugin.json` (Copilot manifest):
   ```json
   {
     "name": "flow",
     "version": "3.0.0",
     "skills": ["skills/"],
     "agents": "agents/"
   }
   ```
8. Create `plugins/flow/.claude-plugin/plugin.json` (Claude manifest):
   ```json
   {
     "name": "flow",
     "version": "3.0.0",
     "skills": "./skills/"
   }
   ```
9. Create `plugins/flow/package.json` with name `flow`, version `3.0.0`.

### Phase 3: Migrate ccc plugin

1. Copy entire `plugins/clean-code-codex/` -> `plugins/ccc/`.
2. Update `plugin.json`, `.claude-plugin/plugin.json`, `package.json` name fields: `clean-code-codex` -> `ccc`.
3. Rename `agents/clean-code-codex.agent.md` -> `agents/ccc.agent.md`.
4. Update internal references from `clean-code-codex:` -> `ccc:` within all ccc skill/agent/command files.
5. Update Copilot manifest `agents` field if the agent file name is referenced.

### Phase 4: Create patterns plugin

1. Create `plugins/patterns/plugin.json` (Copilot):
   ```json
   {
     "name": "patterns",
     "version": "3.0.0",
     "skills": ["skills/"]
   }
   ```
2. Create `plugins/patterns/.claude-plugin/plugin.json` (Claude):
   ```json
   {
     "name": "patterns",
     "version": "3.0.0",
     "skills": "./skills/"
   }
   ```
3. Copy PEAA skills from `~/.claude/skills/peaa/` into `plugins/patterns/skills/` (4 skill directories).
4. Copy PEAA references from `~/.claude/skills/peaa/references/` into `plugins/patterns/references/peaa/`.
5. Update PEAA skill SKILL.md files: change reference paths from `references/` -> `references/peaa/`.
6. Create `plugins/patterns/package.json` with name `patterns`, version `3.0.0`.
7. Create `plugins/patterns/README.md`.

### Phase 5: Update umbrella manifests and docs

1. Update `.claude-plugin/marketplace.json`:
   - Replace `workflow-orchestration` entry with `flow` entry (source: `./plugins/flow`).
   - Remove `sdd-workflow` entry (merged into flow).
   - Replace `clean-code-codex` entry with `ccc` entry (source: `./plugins/ccc`).
   - Add `patterns` entry (source: `./plugins/patterns`).
   - Bump `metadata.version` to `3.0.0`.
2. Update `.github/plugin/marketplace.json` with same changes (Copilot paths: no leading `./`).
3. Update root `package.json`:
   - Bump version to `3.0.0`.
   - Update `scripts.test` to: `node --test test/**/*.test.js && npm --prefix plugins/flow test && npm --prefix plugins/ccc test && npm --prefix plugins/patterns test`.
4. Update root `CLAUDE.md` with new plugin names, paths, and conventions.
5. Update root `README.md`.
6. Update `docs/marketplace-overview.md`, `docs/install-guide.md`, `docs/plugin-composition.md`.

### Phase 6: Update tests

1. Rewrite `test/umbrella-layout.test.js`:
   - Update all plugin name assertions to `flow`, `ccc`, `patterns`.
   - Update source path assertions to `plugins/flow`, `plugins/ccc`, `plugins/patterns`.
   - Update packed file assertions to new paths.
   - Remove `sdd-workflow` as a separate entry; verify it's part of flow.
2. Create `plugins/flow/test/plugin-layout.test.js`:
   - Port from `plugins/workflow-orchestration/test/plugin-layout.test.js`.
   - Update hardcoded skill name list to new names (21 skills + SDD agent assertions).
   - Update all string assertions: `workflow-orchestration:` -> `flow:`, `clean-code-codex:` -> `ccc:`, `sdd-workflow:` -> `flow:sdd-*`.
   - Add assertions for agent files in `agents/` directory.
3. Create `plugins/ccc/test/plugin-layout.test.js`:
   - Port from `plugins/clean-code-codex/test/plugin-layout.test.js`.
   - Update plugin name assertions to `ccc`.
   - Update agent file name assertion to `ccc.agent.md`.
4. Create `plugins/patterns/test/plugin-layout.test.js`:
   - New test: validate plugin manifests, skill frontmatter for all 4 PEAA skills, references directory layout.
5. Update `scripts/verify-runtime.mjs`:
   - Update `PLUGIN_TARGETS` map keys: `flow`, `ccc`, `patterns`.
   - Update root paths: `plugins/flow`, `plugins/ccc`, `plugins/patterns`.
   - Flow target declares both `copilotSkillDir: 'skills'` and agents support.

### Phase 7: Remove old directories

1. Remove `plugins/workflow-orchestration/`.
2. Remove `plugins/sdd-workflow/`.
3. Remove `plugins/clean-code-codex/`.

### Phase 8: Validate

1. Run `npm test` -- all tests pass.
2. Run `npm run validate:runtime` -- runtime verification passes for all 3 plugins.
3. Grep for any remaining old names:
   - `grep -r 'workflow-orchestration' plugins/` -- should return zero hits.
   - `grep -r 'clean-code-codex' plugins/` -- should return zero hits.
   - `grep -r 'sdd-workflow' plugins/` -- should return zero hits.
4. Manual smoke test: `claude --plugin-dir ./plugins/flow` and verify skill listing.
5. Manual smoke test: `claude --plugin-dir ./plugins/ccc` and verify skill listing.
6. Manual smoke test: `claude --plugin-dir ./plugins/patterns` and verify skill listing.

---

## Cross-Reference Blast Radius

These counts were measured from the current codebase and represent the minimum changes needed.

| Pattern | Occurrences | Files |
|---------|-------------|-------|
| `workflow-orchestration:` in workflow plugin | 231 | 19 |
| `clean-code-codex:` in workflow plugin | 13 | 5 |
| `sdd-workflow:` in all plugins | 9 | 2 |
| `workflow-orchestration` in umbrella tests | ~30 | 2 |
| `clean-code-codex` in umbrella tests | ~15 | 2 |
| `sdd-workflow` in umbrella tests | ~10 | 2 |
| `.workflow-orchestration/` dir refs in skills/docs | ~40 | ~12 |
| References in root README, CLAUDE.md, docs/ | ~50 | 6 |

**Total estimated**: ~400 occurrences across ~40 files.

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Missed cross-reference breaks a skill at runtime | Phase 8 runtime verification + exhaustive grep for old names before committing. |
| SDD agent handoff references break after rename | Handoff frontmatter is simple key-value; just update `agent:` field values. |
| PEAA reference paths break after relocation | Audit each PEAA SKILL.md for `Read` instructions with relative paths. Update all `references/` -> `references/peaa/`. |
| `.workflow-orchestration/` artifact paths in skills | Global replace to `.flow/` -- state.json, defaults.json, artifact paths. |
| Test assertions reference specific string patterns in skill content | Full audit of test regex patterns against updated skill content during Phase 6. |
| Users with existing installs break on upgrade | Semver-major bump (3.0.0). Document migration in CHANGELOG and README. |

---

## Sequencing Recommendation

Phases 2, 3, and 4 are independent of each other and can be executed in parallel (separate worktrees or separate agents). Phases 5 and 6 depend on all three completing. Phase 7 depends on Phase 8 passing.

```
Phase 1 (scaffold)
  |
  +-- Phase 2 (flow)  --|
  +-- Phase 3 (ccc)   --+-- Phase 5 (manifests/docs)
  +-- Phase 4 (patterns)-|     |
                               Phase 6 (tests)
                               |
                               Phase 7 (remove old dirs)
                               |
                               Phase 8 (validate)
```
