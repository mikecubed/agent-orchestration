# flow

Shared plugin for planning, delivery, review, publication, merge-aware closeout, release orchestration, knowledge capture, and knowledge refresh across **GitHub Copilot CLI** and **Claude Code**.

## Start here

For the quickest path to the right workflow, see:

- `docs/workflow-usage-guide.md` - when to use each workflow and the larger composed loops

## Skills

This plugin provides:

- `idea-to-done`
- `plan`
- `parallel-impl`
- `pr-resolve`
- `pr-ready`
- `swarm`
- `debug`
- `map-codebase`
- `arch-review`
- `brainstorm`
- `incident-rca`
- `e2e-tests`
- `contracts`
- `release`
- `diff-review`
- `worktree`
- `knowledge-save`
- `knowledge-refresh`
- `deliver`
- `pr-publish`

Install locally from the umbrella repo:

```bash
copilot plugin install ./plugins/flow
claude --plugin-dir ./plugins/flow
```

Expected namespaced usage:

```text
/flow:idea-to-done
/flow:plan
/flow:parallel-impl
```

## Whole-loop conductor

For the highest-level entry path, use
`/flow:idea-to-done` when the work is already
clarified and you want one opt-in workflow to sequence the rest of the loop.

The conductor:

- stays coordinator-shaped and routes to existing specialist workflows;
- supports `manual`, `guided`, and `auto` progression modes;
- can resume from the last trusted `.flow/state.json` plus
  durable artifacts without creating a second top-level lifecycle workflow;
- updates `.flow/state.json` at major owned phase boundaries;
- can continue after publication through merge-aware closeout, optional
  `release`, optional knowledge capture or refresh, and one
  durable completion summary;
- stops when requirements are unclear, a human decision is required, readiness
  has not been achieved, merge is still pending without a safe next step, or a
  release gate blocks safe automation.

Manual specialist entry remains valid. The conductor is lifecycle glue, not a
replacement for the underlying workflows.

### Continuation examples

- **Resume after review comments** — if trusted state says
  `current-phase=review-needs-resolution` and the review artifact still exists,
  the conductor routes to `/flow:pr-resolve`
  before returning to readiness.
- **Resume after failed readiness** — if trusted state says
  `current-phase=readiness-blocked`, the conductor uses the readiness artifact to
  route back to the next implementation step instead of pretending the branch is
  still publishable.
- **Resume when publish still needs human action** — if trusted state says
  `current-phase=publish-waiting-human`, all progression modes still respect the
  hard human-stop boundary and surface the required publish action instead of
  auto-publishing.

### Post-publish closeout examples

- **Published but not merged** — if trusted state says `current-phase=published`
  and the PR is still open, the conductor writes `closeout-assessing`, then
  `merge-monitoring` or `merge-waiting-human`, and stops with the exact merge
  follow-up instead of skipping straight to release or knowledge work.
- **Merged in a release-aware repository** — if merge evidence is trusted and the
  repository treats release as part of done, the conductor writes
  `merge-complete`, then `release-entry`, and routes to
  `/flow:release` unless a release approval or
  deployment gate forces `release-blocked`.
- **Merged in a non-release-aware repository** — if merge evidence is trusted and
  release is not required, the conductor may continue to
  `/flow:knowledge-save`, optionally recommend or route to
  `/flow:knowledge-refresh`, and then emit a durable
  completion summary.

## Shared defaults and durable state foundation

Repositories can now define the shared workflow foundation in two separate
artifacts:

- `.flow/defaults.json` — repo-level workflow defaults such as
  artifact sinks, review mode, automation guardrails, knowledge defaults, and
  publish preferences. The contract is documented in
  `docs/workflow-defaults-contract.md`.
- `.flow/state.json` — durable workflow lifecycle state for
  later continuation or conductor-style workflows. The contract is documented in
  `docs/workflow-state-contract.md`.
- `.flow/artifacts/` — canonical local sink for generated
  workflow reports and summaries when a workflow writes an on-disk artifact.
  Create them here by default, but do not commit them unless explicitly asked.

The first adopting workflows are:

- `plan` — consults shared defaults for planning sinks and
  discovery context when present;
- `deliver` — uses `artifact-sinks.track-reports` for the direct
  execution report sink and `review.mode` for the default post-delivery review
  mode suggestion when present;
- `diff-review` — consults shared defaults for review-mode
  baseline and related guardrails when present;
- `pr-publish` — consults shared defaults for publish preferences
  and durable publish-summary sinks when present;
- `knowledge-save` — can use a repo-default sink while keeping explicit
  developer override and no mandatory taxonomy;
- `knowledge-refresh` — consults shared defaults for knowledge-sink discovery,
  automation progression, and refresh-summary artifact sinks when present.

If the defaults file is absent or partial, those workflows keep their documented
fallback behavior. Workflows that need local durable artifacts should inspect
`.flow/artifacts/` directly or follow references from
`.flow/state.json`. Durable workflow state remains separate from transient
session continuity in `.agent/SESSION.md` and `.agent/HANDOFF.json`; those
session files stay advisory and never replace `.flow/state.json`.
See `docs/session-md-schema.md` for that boundary.

## Recommended Specialist Delivery Loop

The underlying end-to-end loop for bounded delivery work still follows seven
specialist phases:

1. **`/flow:plan`** — Produce an accepted
   plan with scoped tasks and acceptance criteria. Optionally compose with
   the SDD skills (`flow:sdd-specify`, `flow:sdd-plan`, `flow:sdd-tasks`) for feature-shaped work that benefits from specification.

2. **`/flow:deliver`** — Route the ready
   tasks to the best-fit execution skill. The coordinator classifies the
   request, selects between direct implementation, parallel tracks, swarm
   decomposition, or systematic debugging, and delegates. It does not perform
   implementation itself. When it chooses the direct lane, the implementation
   path should leave behind a durable direct-execution report plus a normalized
   review handoff containing diff surface, validation outcome, artifact
   reference, and mode suggestion.

3. **`/flow:parallel-impl`** — Execute
   independent ready tasks on isolated track branches and external worktrees,
   keep TDD and concise design-quality expectations explicit, keep the batch
   moving until integrated completion, prefer same-agent continuation and
   escalation over duplicate rescue tracks when work slows or stalls, and carry
   the resulting feature branch through readiness and PR publication by
   default. When available, an advisory `ccc:conductor` pass can
   be used before publication.

4. **`/flow:diff-review`** — Review any
   non-empty delivered diff. This is the default post-delivery handoff;
   `deliver` recommends it whenever the downstream skill
   completes work that produced a non-empty diff.

5. **`/flow:pr-resolve`** — Address the
   findings from the diff review. Skeptically triages and verifies each comment,
   applies scoped fixes only for the verified concern, replies and resolves
   review threads one by one, and by default commits and pushes the branch
   update before handoff.

6. **`/flow:pr-ready`** — Run the merge
   gate. Re-checks the branch holistically — CI status, test coverage,
   documentation, any remaining open threads, and whether the current diff
   still matches the PR's intended scope — and produces a go / no-go verdict
   without re-prompting the developer unless the evidence is genuinely
   ambiguous.

7. **`/flow:pr-publish`** — Publish the
   ready branch. Commits, pushes, and creates or updates the pull request.
   This skill bridges readiness to publication; it does not own release
   management. For tagging, changelogs, and release artifacts, hand off to
   `/flow:release`.

**Knowledge capture** is conditional rather than sequential:
`/flow:knowledge-save` may be invoked at any point
when a delivery produces non-obvious insights worth preserving beyond the
current session.

Requests that lack scope, explore trade-offs, or ask about versioning never
enter delivery. `deliver` deflects them to the appropriate
upstream skill (`plan`, `brainstorm`, or
`release`) before any execution begins.

## Recommended Review Path

The review chain moves code from implementation-complete through structured
review to publication-ready. Use the skills in this order:

1. **`/flow:diff-review`** — Run first once
   implementation is complete. This skill performs a structured diff review
   across every changed file, surfacing bugs, security issues, style
   violations, and logic gaps. It produces a categorised findings report that
   feeds directly into the next step. Post-delivery review may start from a
   direct-execution report or track report, but the diff review still validates
   the actual changed surface itself.

2. **`/flow:pr-resolve`** — Address the
   findings from the diff review. This skill skeptically triages and verifies
   each comment, applies scoped fixes only for the verified concern, replies
   and resolves review threads one by one, and by default commits and pushes
   the branch update before handoff.

3. **`/flow:pr-ready`** — The merge gate.
   It re-checks the branch holistically — CI status, test
   coverage, documentation, any remaining open threads, and whether the diff
   still matches the PR intent from the evidence on the PR itself — and
   produces a go / no-go verdict.

**Handoff to publication:** Once the readiness gate passes, invoke
`/flow:pr-publish` to commit, push, and
create or update the pull request (see
[Publication and Release](#publication-and-release) below).

**Optional setup:** If you are working across multiple worktrees or need
isolated review branches, invoke
`/flow:worktree` before starting the
review chain. It provisions and manages dedicated worktrees so parallel
review and implementation workflows do not interfere with each other.

## Publication and Release

PR publication and release management are separate concerns:

- **`/flow:pr-publish`** handles the last
  mile after readiness: commit, push, and PR creation or update. It requires
  a passing readiness gate on the exact tree being published and does not
  perform tagging, changelog generation, or artifact publishing.
- **`/flow:idea-to-done`** may re-enter after
  publication to handle merge-aware closeout. Publication does not imply merge,
  release, or lifecycle completion on its own.

- **`/flow:release`** owns the release
  pipeline: conventional-commit semver calculation, CHANGELOG update, git tag
  creation, and optional GitHub release. Invoke it only after a branch or PR
  has landed and a stable post-merge branch is ready for a versioned release.

The two skills never overlap — `pr-publish` deflects release
requests to `release`, and vice versa.

## Knowledge Capture, Refresh, and Reuse

After a workflow produces a reusable lesson — a debugging insight, a
non-ADR implementation decision, a non-obvious configuration fix — invoke
`/flow:knowledge-save` to extract the lesson into a
structured knowledge artifact and write it to a durable, repository-appropriate
sink. For formal architecture decision records, use
`/flow:arch-review` instead.

When existing knowledge artifacts become stale, duplicated, or obsolete, invoke
`/flow:knowledge-refresh` to evaluate and maintain them. The
refresh workflow classifies candidates as trusted, stale, duplicate, obsolete,
superseded, or needs-capture and applies the appropriate maintenance action. It
supports `manual`, `guided`, and `auto` progression modes, records durable
workflow-state updates at each owned phase boundary, and routes missing-capture
gaps back to `knowledge-save` or architecture-shaped candidates to
`arch-review`.

Captured and refreshed knowledge feeds back into future workflows:

- **`/flow:diff-review`** looks up prior
  knowledge artifacts whose applicability overlaps with the reviewed diff.
  When refresh metadata exists, it prefers active canonical artifacts and
  suppresses retired or stale duplicates. Matching learnings are surfaced as
  advisory context before downstream checks run.

- **`/flow:plan`** can consult prior
  knowledge artifacts during discovery to inform scope decisions and
  surface known risks or resolutions relevant to the planned work. When
  refresh metadata exists, it prefers canonical artifacts and annotates
  entries with their refresh status.

The lookup is always advisory — it never blocks downstream steps or alters
gate semantics. When refresh metadata is absent or partial, both consumers
fall back cleanly to the existing advisory prior-learning behavior.

Knowledge artifacts use the shared template defined in
`docs/workflow-artifact-templates.md`. Refresh summaries use the `Refresh summary`
template in the same document.

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
npm --prefix plugins/flow test
npm --prefix plugins/flow run validate:runtime
```

The runtime validation delegates to the umbrella `scripts/verify-runtime.mjs` helper but scopes it to this plugin only.

If you are already in `plugins/flow/`, the equivalent local install commands are:

```bash
copilot plugin install .
claude --plugin-dir .
```

## Notes

- The plugin stays separate from the SDD skills (`flow:sdd-specify`, `flow:sdd-plan`, `flow:sdd-tasks`), but `plan` may optionally compose with it.
- Prefer plugin-qualified names in docs and examples.
