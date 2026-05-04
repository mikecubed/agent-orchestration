# Track Report — flow-sdd-arch

## Track name

`flow-sdd-arch` — Align Flow architecture review and SDD agents with the
canonical CCC ARCH-1..ARCH-10 ruleset and add composition-first prompts to the
v3 hyphenated SDD workflow.

## Owned tasks

- Align `plugins/flow/skills/arch-review/SKILL.md` with `ARCH-1` through
  `ARCH-10`, treat `ccc/arch-check` as the canonical rule source, and surface
  composition / DI / DIP / ISP / composition-root findings in the architecture
  report. Update verification gates and example output from 6 to 10 rules.
- Add composition-first guidance to the SDD flow agents:
  - `plugins/flow/agents/sdd-specify.md` captures requirements for dependency
    inversion, injected dependencies, justified inheritance, pure domain
    boundaries, and composition-root expectations.
  - `plugins/flow/agents/sdd-plan.md` requires ports/protocols/interfaces,
    consumer-shaped (ISP) interfaces, injected dependencies, an explicit
    composition root, and Clean Architecture / DDD alignment.
  - `plugins/flow/agents/sdd-tasks.md` generates tasks for ports, adapters, DI
    wiring, composition roots, inheritance justification, and a final
    architecture validation step.
- Preserve the v3 hyphenated SDD agent names (`sdd-specify`, `sdd-plan`,
  `sdd-tasks`) and handoffs; do not reintroduce `sdd.specify` / `sdd.plan` /
  `sdd.tasks` or the old `sdd-workflow` plugin.
- Bump the Flow plugin minor version from `3.0.1` to `3.1.0` across the Flow
  manifest surfaces.
- Add tests asserting the new content and the absence of legacy dotted names.

## Owned files

- `plugins/flow/skills/arch-review/SKILL.md`
- `plugins/flow/agents/sdd-specify.md`
- `plugins/flow/agents/sdd-plan.md`
- `plugins/flow/agents/sdd-tasks.md`
- `plugins/flow/package.json`
- `plugins/flow/plugin.json`
- `plugins/flow/.claude-plugin/plugin.json`
- `plugins/flow/test/plugin-layout.test.js`
- `docs/composition-first-track-flow-sdd.md` (this report)

`plugins/flow/skills/sdd-feature/SKILL.md` was reviewed and required no changes
— the activation/handoff text already routes to the v3 hyphenated agents.

## Dependencies

- Upstream CCC track at commit `26c89cd` (`feat(ccc): add composition-first
  architecture rules`) provides the canonical `ARCH-7`..`ARCH-10` definitions
  in `plugins/ccc/skills/arch-check/SKILL.md`. Flow now references that source
  instead of restating the rules.
- No other tracks block this work. Other parallel tracks (root marketplace,
  CCC, patterns) own their own surfaces and are out of scope here.

## Validation commands

- `npm --prefix plugins/flow test`
- Targeted greps:
  - `grep -n "ARCH-1 through ARCH-10\|ARCH-7\|ARCH-8\|ARCH-9\|ARCH-10" plugins/flow/skills/arch-review/SKILL.md`
  - `grep -rn "sdd\.specify\|sdd\.plan\|sdd\.tasks\|sdd-workflow" plugins/flow/agents plugins/flow/skills`
  - `grep -l -i "composition-first\|composition root" plugins/flow/agents/*.md`
  - `ls plugins/flow/agents/`

## Track branch

`wt/composition-flow-sdd`, fast-forwarded to integration commit `26c89cd`
before edits started.

## Worktree path

`/home/mikecubed/projects/agent-orchestration-wt-flow-sdd`

## Current state

- `plugins/flow/skills/arch-review/SKILL.md` evaluates `ARCH-1` through
  `ARCH-10`, names `ccc/skills/arch-check/SKILL.md` as the canonical source,
  emits a dedicated **Composition-First Findings** report subsection, and
  updates its verification checklist and example summary to ten rules.
- `plugins/flow/agents/sdd-specify.md` adds a **Composition-First
  Requirements** section covering dependency inversion, injected
  dependencies, justified inheritance, pure domain boundary, and
  composition-root expectations.
- `plugins/flow/agents/sdd-plan.md` adds a **Composition-First Planning
  Requirements** section requiring ports (DIP/ISP), injected dependencies,
  explicit composition roots, composition over inheritance with justification,
  pure domain logic, and Clean Architecture / DDD alignment, and ties the
  plan's quality gates to `ARCH-1`..`ARCH-10` via `ccc/arch-check`.
- `plugins/flow/agents/sdd-tasks.md` adds a **Composition-First Task
  Generation** section that drives port, adapter, DI wiring, composition root,
  inheritance justification, and arch-validation tasks.
- All three SDD agents retain v3 hyphenated handoffs; no dotted names or
  `sdd-workflow` references reintroduced.
- Flow plugin version bumped to `3.1.0` in `package.json`, `plugin.json`, and
  `.claude-plugin/plugin.json`. Root marketplace files were not touched (out
  of scope for this track).

## Validation outcome

- `npm --prefix plugins/flow test` → 43 tests across 3 suites, all passing
  (baseline was 40; three new tests added by this track).
- New tests assert: arch-review aligns with `ARCH-1 through ARCH-10` and names
  `ccc/arch-check` as canonical, with composition / DI / DIP / ISP /
  composition-root coverage and a 10-rule verification gate; SDD agents
  include composition-first guidance with no dotted names or `sdd-workflow`
  references.
- Targeted greps confirm no legacy dotted SDD names remain under
  `plugins/flow` (matches found are inside the new test assertions that forbid
  them).

## Unresolved issues

- None for this track's owned scope.
- Out of scope and intentionally untouched: root marketplace manifests, CCC
  plugin files, and patterns-plugin files — those belong to other parallel
  tracks per the upgrade plan.

## Next action

Coordinator should integrate this branch (`wt/composition-flow-sdd`) into the
composition-first integration branch and let the parallel-impl coordinator
update `.agent/SESSION.md` and open or refresh the umbrella PR. No follow-up
work is required from this track.
