# workflow-orchestration

Shared plugin for planning, delivery, review, publication, release orchestration, and knowledge capture across **GitHub Copilot CLI** and **Claude Code**.

## Start here

For the quickest path to the right workflow, see:

- `docs/workflow-usage-guide.md` - when to use each workflow and the larger composed loops

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
- `delivery-orchestration`
- `pr-publish-orchestration`

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

## Shared defaults and durable state foundation

Repositories can now define the shared workflow foundation in two separate
artifacts:

- `.workflow-orchestration/defaults.json` — repo-level workflow defaults such as
  artifact sinks, review mode, automation guardrails, knowledge defaults, and
  publish preferences. The contract is documented in
  `docs/workflow-defaults-contract.md`.
- `.workflow-orchestration/state.json` — durable workflow lifecycle state for
  later continuation or conductor-style workflows. The contract is documented in
  `docs/workflow-state-contract.md`.

The first adopting workflows are:

- `planning-orchestration` — consults shared defaults for planning sinks and
  discovery context when present;
- `delivery-orchestration` — uses `artifact-sinks.track-reports` for the direct
  execution report sink and `review.mode` for the default post-delivery review
  mode suggestion when present;
- `diff-review-orchestration` — consults shared defaults for review-mode
  baseline and related guardrails when present;
- `pr-publish-orchestration` — consults shared defaults for publish preferences
  and durable publish-summary sinks when present;
- `knowledge-compound` — can use a repo-default sink while keeping explicit
  developer override and no mandatory taxonomy.

If the defaults file is absent or partial, those workflows keep their documented
fallback behavior. Durable workflow state remains separate from transient
session continuity in `.agent/SESSION.md` and `.agent/HANDOFF.json`; see
`docs/session-md-schema.md` for that boundary.

## Recommended Delivery Loop

The default end-to-end loop for bounded delivery work follows six phases:

1. **`/workflow-orchestration:planning-orchestration`** — Produce an accepted
   plan with scoped tasks and acceptance criteria. Optionally compose with
   `sdd-workflow` for feature-shaped work that benefits from specification.

2. **`/workflow-orchestration:delivery-orchestration`** — Route the ready
   tasks to the best-fit execution skill. The coordinator classifies the
   request, selects between direct implementation, parallel tracks, swarm
   decomposition, or systematic debugging, and delegates. It does not perform
   implementation itself. When it chooses the direct lane, the implementation
   path should leave behind a durable direct-execution report plus a normalized
   review handoff containing diff surface, validation outcome, artifact
   reference, and mode suggestion.

3. **`/workflow-orchestration:diff-review-orchestration`** — Review any
   non-empty delivered diff. This is the default post-delivery handoff;
   `delivery-orchestration` recommends it whenever the downstream skill
   completes work that produced a non-empty diff.

4. **`/workflow-orchestration:pr-review-resolution-loop`** — Address the
   findings from the diff review. Triages each comment, applies scoped fixes,
   and closes review threads one by one until no unresolved items remain.

5. **`/workflow-orchestration:final-pr-readiness-gate`** — Run the merge
   gate. Re-checks the branch holistically — CI status, test coverage,
   documentation, and any remaining open threads — and produces a go / no-go
   verdict.

6. **`/workflow-orchestration:pr-publish-orchestration`** — Publish the
   ready branch. Commits, pushes, and creates or updates the pull request.
   This skill bridges readiness to publication; it does not own release
   management. For tagging, changelogs, and release artifacts, hand off to
   `/workflow-orchestration:release-orchestration`.

**Knowledge capture** is conditional rather than sequential:
`/workflow-orchestration:knowledge-compound` may be invoked at any point
when a delivery produces non-obvious insights worth preserving beyond the
current session.

Requests that lack scope, explore trade-offs, or ask about versioning never
enter delivery. `delivery-orchestration` deflects them to the appropriate
upstream skill (`planning-orchestration`, `brainstorm-ideation`, or
`release-orchestration`) before any execution begins.

## Recommended Review Path

The review chain moves code from implementation-complete through structured
review to publication-ready. Use the skills in this order:

1. **`/workflow-orchestration:diff-review-orchestration`** — Run first once
   implementation is complete. This skill performs a structured diff review
   across every changed file, surfacing bugs, security issues, style
   violations, and logic gaps. It produces a categorised findings report that
   feeds directly into the next step. Post-delivery review may start from a
   direct-execution report or track report, but the diff review still validates
   the actual changed surface itself.

2. **`/workflow-orchestration:pr-review-resolution-loop`** — Address the
   findings from the diff review. This skill triages each comment, applies
   scoped fixes, and closes review threads one by one until no unresolved
   items remain.

3. **`/workflow-orchestration:final-pr-readiness-gate`** — The merge gate.
   It re-checks the branch holistically — CI status, test
   coverage, documentation, and any remaining open threads — and produces a
   go / no-go verdict.

**Handoff to publication:** Once the readiness gate passes, invoke
`/workflow-orchestration:pr-publish-orchestration` to commit, push, and
create or update the pull request (see
[Publication and Release](#publication-and-release) below).

**Optional setup:** If you are working across multiple worktrees or need
isolated review branches, invoke
`/workflow-orchestration:git-worktree-orchestration` before starting the
review chain. It provisions and manages dedicated worktrees so parallel
review and implementation workflows do not interfere with each other.

## Publication and Release

PR publication and release management are separate concerns:

- **`/workflow-orchestration:pr-publish-orchestration`** handles the last
  mile after readiness: commit, push, and PR creation or update. It requires
  a passing readiness gate on the exact tree being published and does not
  perform tagging, changelog generation, or artifact publishing.

- **`/workflow-orchestration:release-orchestration`** owns the release
  pipeline: conventional-commit semver calculation, CHANGELOG update, git tag
  creation, and optional GitHub release. Invoke it only after a branch or PR
  has landed and a stable post-merge branch is ready for a versioned release.

The two skills never overlap — `pr-publish-orchestration` deflects release
requests to `release-orchestration`, and vice versa.

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
- `docs/workflow-defaults-contract.md` — shared defaults contract
- `docs/workflow-state-contract.md` — durable workflow-state contract
- `docs/workflow-usage-guide.md` — product-level workflow guide
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
