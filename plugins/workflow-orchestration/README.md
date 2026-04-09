# workflow-orchestration

Shared plugin for planning, implementation, review-resolution, PR-readiness orchestration, and knowledge capture across **GitHub Copilot CLI** and **Claude Code**.

## Skills

This plugin provides:

- `planning-orchestration`
- `parallel-implementation-loop`
- `pr-review-resolution-loop`
- `final-pr-readiness-gate`
- `swarm-orchestration`
- `systematic-debugging`
- `map-codebase`
- `architecture-review`
- `brainstorm-ideation`
- `incident-rca`
- `e2e-test-generation`
- `contract-generator`
- `release-orchestration`
- `diff-review-orchestration`
- `git-worktree-orchestration`
- `knowledge-compound`

Install locally from the umbrella repo:

```bash
copilot plugin install ./plugins/workflow-orchestration
claude --plugin-dir ./plugins/workflow-orchestration
```

Expected namespaced usage:

```text
/workflow-orchestration:planning-orchestration
/workflow-orchestration:parallel-implementation-loop
```

## Recommended Review Path

The review chain moves code from implementation-complete through structured
review to merge-ready. Use the skills in this order:

1. **`/workflow-orchestration:diff-review-orchestration`** — Run first once
   implementation is complete. This skill performs a structured diff review
   across every changed file, surfacing bugs, security issues, style
   violations, and logic gaps. It produces a categorised findings report that
   feeds directly into the next step.

2. **`/workflow-orchestration:pr-review-resolution-loop`** — Address the
   findings from the diff review. This skill triages each comment, applies
   scoped fixes, and closes review threads one by one until no unresolved
   items remain.

3. **`/workflow-orchestration:final-pr-readiness-gate`** — Run last as the
   merge gate. It re-checks the branch holistically — CI status, test
   coverage, documentation, and any remaining open threads — and produces a
   go / no-go verdict.

**Optional setup:** If you are working across multiple worktrees or need
isolated review branches, invoke
`/workflow-orchestration:git-worktree-orchestration` before starting the
review chain. It provisions and manages dedicated worktrees so parallel
review and implementation workflows do not interfere with each other.

## Knowledge Capture and Reuse

After a workflow produces a reusable lesson — a debugging insight, a
non-ADR implementation decision, a non-obvious configuration fix — invoke
`/workflow-orchestration:knowledge-compound` to extract the lesson into a
structured knowledge artifact and write it to a durable, repository-appropriate
sink. For formal architecture decision records, use
`/workflow-orchestration:architecture-review` instead.

Captured knowledge feeds back into future workflows:

- **`/workflow-orchestration:diff-review-orchestration`** looks up prior
  knowledge artifacts whose applicability overlaps with the reviewed diff.
  Matching learnings are surfaced as advisory context before downstream
  checks run.

- **`/workflow-orchestration:planning-orchestration`** can consult prior
  knowledge artifacts during discovery to inform scope decisions and
  surface known risks or resolutions relevant to the planned work.

The lookup is always advisory — it never blocks downstream steps or alters
gate semantics. Knowledge artifacts use the shared template defined in
`docs/workflow-artifact-templates.md`.

## Plugin layout

- `plugin.json` — Copilot manifest
- `.claude-plugin/plugin.json` — Claude manifest
- `skills/*/SKILL.md` — shared skill definitions
- `docs/models-config-template.md` — model override examples
- `docs/workflow-artifact-templates.md` — durable artifact templates
- `test/plugin-layout.test.js` — workflow plugin structural checks

## Validation

From the umbrella repo root:

```bash
npm --prefix plugins/workflow-orchestration test
npm --prefix plugins/workflow-orchestration run validate:runtime
```

The runtime validation delegates to the umbrella `scripts/verify-runtime.mjs` helper but scopes it to this plugin only.

If you are already in `plugins/workflow-orchestration/`, the equivalent local install commands are:

```bash
copilot plugin install .
claude --plugin-dir .
```

## Notes

- The plugin stays separate from `sdd-workflow`, but `planning-orchestration` may optionally compose with it.
- Prefer plugin-qualified names in docs and examples.
