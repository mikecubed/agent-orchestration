Track: routing-core
Tasks: T001, T002, T003, T004
Files: plugins/workflow-orchestration/skills/delivery-orchestration/SKILL.md, plugins/workflow-orchestration/plugin.json, plugins/workflow-orchestration/.claude-plugin/plugin.json, plugins/workflow-orchestration/test/plugin-layout.test.js, docs/track-report-delivery-routing-core.md
Dependencies: none before launch
Validation: node --test plugins/workflow-orchestration/test/plugin-layout.test.js
Work surface: /home/mikecubed/projects/wt-delivery14-routing
State: merged
Validation outcome: PASS — 20/20 tests (up from 19 baseline)
Unresolved issues:
- none
Rescue history:
- review drift on marketplace-facing description | reverted plugin-manifest description edits | keep routing-core scoped to T001-T004 without creating umbrella metadata drift before the serialized release pass | resolved | 1
Next action: launch the handoff-docs track from the updated integration branch, then serialize release/version work after both tracks merge
Revision rounds: 1

## What changed

### T004 — test coverage (written first)
- `plugins/workflow-orchestration/test/plugin-layout.test.js`: added `delivery-orchestration` to the `skills` array (skills layout assertions) and the `package contents` tarball assertion list. Test count increased from 19 to 20.

### T001 — routing contract
- Defined in SKILL.md § Routing Contract: accepted inputs (task reference, change description, bug report, broad execution request), five allowed route outcomes (direct, parallel, swarm, debug, deflect), required rationale fields, and five deflection rules (no scope, ideation-shaped, review-shaped, release-shaped, missing context).

### T002 — invocation matrix and decision examples
- Defined in SKILL.md § Invocation Matrix: 8-row decision matrix evaluated top-to-bottom with first-match semantics. Five worked decision examples covering direct, parallel, swarm, debug, and deflection routes.

### T003 — SKILL.md skill file
- `plugins/workflow-orchestration/skills/delivery-orchestration/SKILL.md`: thin coordinator skill with YAML frontmatter, all required sections (Purpose, When to Use It, Project-Specific Inputs, Workflow, Required Gates, Stop Conditions, Example), plus routing contract and invocation matrix. References factual brief/context facts, rescue policy, durable artifact conventions, and scopes out persistent team/squad/fleet orchestration.

### T004 — manifest wiring
- No manifest skills-path change was needed because workflow-orchestration uses shared directory auto-discovery (`skills/` for Copilot, `./skills/` for Claude).
- The initial manifest description edit was reverted during review to avoid marketplace description drift before the serialized release/update pass.

## Validation performed
- Baseline: 19/19 pass on main checkout
- After test update (before SKILL.md): 2 failures (delivery-orchestration skill missing + tarball assertion) — red phase confirmed
- After SKILL.md + manifest updates: 20/20 pass — green phase confirmed
- After review fix: 20/20 pass — plugin layout validation rerun succeeded

## Out of scope for downstream tracks
- T005-T007 (handoff-docs track): review and knowledge-compound handoff wiring, workflow documentation
- T008-T009 (boundary track): deflection behavior encoding, coordinator-shaped contract coverage
- T010-T012 (release track): version bumps, changelog, umbrella release surfaces
- No version bump or changelog entry was made in this track

## Merge outcome
- Merged into `feat/delivery-loop-mvp-1-4` from `feat/delivery-loop-mvp-1-4-routing`
- Files stayed within the declared track scope
