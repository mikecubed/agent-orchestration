# Composition-First Track Report — `ccc-arch-rules`

## Track name

`ccc-arch-rules`

## Owned tasks

- Add `ARCH-7` through `ARCH-10` (composition-first architecture rules) to the
  Clean Code Codex `arch-check` skill.
- Align the conductor (dispatch table, write-mode activation criteria, token
  budget, valid `--explain` rule IDs) with the new ARCH range.
- Extend `rule-explanations.md` with plain-language entries for `ARCH-7`
  through `ARCH-10`.
- Add `auto-fix-eligibility.md` rows for `ARCH-7` through `ARCH-10`, all
  human-required.
- Extend `tdd-check` `TDD-5` so that tests for dependency-using components
  target contracts/ports and cross-reference `ARCH-8`, `ARCH-9`, and `TDD-7`.
- Bump the CCC plugin minor version from `3.0.0` to `3.1.0` across
  CCC-owned version surfaces.
- Add validation tests asserting the new content invariants.

## Owned files

- `plugins/ccc/skills/arch-check/SKILL.md`
- `plugins/ccc/skills/conductor/SKILL.md`
- `plugins/ccc/skills/conductor/rule-explanations.md`
- `plugins/ccc/skills/conductor/auto-fix-eligibility.md`
- `plugins/ccc/skills/tdd-check/SKILL.md`
- `plugins/ccc/package.json`
- `plugins/ccc/package-lock.json`
- `plugins/ccc/plugin.json`
- `plugins/ccc/.claude-plugin/plugin.json`
- `plugins/ccc/test/composition-arch.test.js` (new)
- `docs/composition-first-track-ccc-arch.md` (this report)

## Dependencies

- Integration branch `feat/composition-first-architecture` at `7f4a25a`.
- No runtime dependencies on other tracks. The Flow `arch-review` track
  consumes CCC `arch-check` as canonical and will reflect this update once
  it lands; that update is owned by a different track.

## Validation commands

- `npm --prefix plugins/ccc test`
- Targeted text checks (encoded as Node test cases in
  `plugins/ccc/test/composition-arch.test.js`) asserting:
  - `ARCH-7`–`ARCH-10` appear in `arch-check/SKILL.md` with the correct names.
  - The `arch-check` description range now reads `ARCH-1 through ARCH-10`.
  - The conductor `--explain` valid IDs list reads `ARCH-1–10` and no longer
    contains the old `ARCH-1–6` form.
  - The conductor dispatch text gates `arch-check` on `write` operations by
    "classes, services, repositories, modules, adapters, domain models, use
    cases, or wiring".
  - `rule-explanations.md` has `## ARCH-7` through `## ARCH-10` sections.
  - `auto-fix-eligibility.md` rows mark `ARCH-7`–`ARCH-10` as
    `❌ Human required`.
  - `tdd-check` `TDD-5` mentions ports/contracts and cross-references
    `ARCH-8`, `ARCH-9`, and `TDD-7`.
  - All four CCC version surfaces report `3.1.0`.

## Track branch

`wt/composition-ccc-arch`

## Worktree path

`/home/mikecubed/projects/agent-orchestration-wt-ccc-arch`

## Current state

All scoped CCC surfaces updated:

- `arch-check/SKILL.md` adds `ARCH-7` Composition Over Inheritance,
  `ARCH-8` Dependencies Must Be Injected, `ARCH-9` Depend on Stable Ports,
  Not Concrete Infrastructure, and `ARCH-10` Composition Root Owns Wiring,
  with severity nuance, detection signals, allowed/justified cases, and
  `agent_action` blocks consistent with the upgrade plan. The skill
  description and rule range advertise `ARCH-1 through ARCH-10`. Existing
  `ARCH-1` through `ARCH-6` content and the canonical layer diagram are
  preserved.
- `conductor/SKILL.md` adds a second `write` dispatch row that loads
  `arch-check` for class, service, repository, module, adapter, domain
  model, use case, or wiring work; keeps the lighter pure-function `write`
  path; documents the activation criterion explicitly; adds a token budget
  row for the heavier write path; and updates the `--explain` valid-IDs
  string to `ARCH-1–10`.
- `conductor/rule-explanations.md` adds plain-language `## ARCH-7`,
  `## ARCH-8`, `## ARCH-9`, and `## ARCH-10` entries that match the names
  and severity nuance in `arch-check`.
- `conductor/auto-fix-eligibility.md` adds rows for `ARCH-7`–`ARCH-10`,
  all marked `❌ Human required`, with brief notes explaining why each
  remediation is a human design decision.
- `tdd-check/SKILL.md` `TDD-5` now requires tests for dependency-using
  components to target the contract/port the component depends on and
  cross-references `ARCH-8`, `ARCH-9`, and `TDD-7`.
- CCC plugin minor version bumped to `3.1.0` in `package.json`,
  `plugin.json`, `.claude-plugin/plugin.json`, and `package-lock.json`.

## Validation outcome

`npm --prefix plugins/ccc test` — exit code `0`. All 25 tests pass
(9 suites), including the existing manifest, runtime-surface, and packed-
file checks plus the 14 new content-consistency assertions.

## Unresolved issues

- None blocking this track. Out-of-scope follow-ups (owned by other tracks):
  - Flow `arch-review` should be aligned with the new `ARCH-1`–`ARCH-10`
    range and treat CCC `arch-check` as canonical.
  - GoF, DDD, and PEAA pattern skills should add the composition-first
    recommendation gate described in the upgrade plan.
  - The CCC `README.md` rule-range mention (`ARCH-1 – ARCH-6`) is
    documentation-only and was intentionally left untouched per scope; if
    the coordinator wants it updated, that can be a follow-up commit.

## Next action

- Hand off for review and merge into `feat/composition-first-architecture`.
- Coordinator to update `.agent/SESSION.md` after merge.
