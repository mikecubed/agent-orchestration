---
name: release
description: Automate the full release pipeline — conventional-commit semver calculation, CHANGELOG update, git tag creation, and optional GitHub release — with a durable release-summary.md artifact.
---

## Purpose

Automates the full release pipeline for plugin and software projects. The skill
walks through each stage of the pipeline in order:

1. **Conventional-commit semver calculation** — reads the commit log since the
   last tag and determines the next version according to Conventional Commits.
2. **CHANGELOG.md update** — appends a new dated section grouped by commit type.
3. **Git tag creation** — tags the repository with the calculated or overridden
   version.
4. **Optional GitHub release creation** — when `--create-release` is passed and
   the `gh` CLI plus a valid GitHub token are available, creates a GitHub release
   using the new CHANGELOG section as the release body.

Every invocation produces a durable `release-summary.md` artifact documenting
the version source, commits included, tag status, GitHub release status, and any
skipped steps with reasons.

The skill supports both a calculated-version path (derived from conventional
commits) and an explicit `--version` override path that bypasses semver
calculation entirely.

Persistent team, squad, or fleet-style long-lived orchestration is out of scope for this skill.

## When to Use It

- A maintainer is ready to ship a new version after a stable branch or PR merge.
- The release should follow the calculated-version path (conventional commits
  determine the bump) **or** the explicit `--version` override path.
- Changelog discipline, duplicate-tag prevention, and a documented release audit
  trail are required.
- **Not** for CI/CD automated pipeline management — use a dedicated release
  workflow (e.g., GitHub Actions) instead.

## Project-Specific Inputs

| Input | Required | Notes |
|---|---|---|
| Project root path | Yes | Must be the root of the git repository. |
| `--version` override | No | Skips semver calculation entirely; the provided version is used as-is. |
| `--create-release` flag | No | Triggers GitHub release creation if `gh` CLI + token are available. |
| Release notes override text | No | Custom body text for the GitHub release (replaces CHANGELOG section). |
| Git tag history availability | Yes | Shallow clones are a stop condition — full clone required. |
| GitHub token + `gh` CLI | Only for `--create-release` | Graceful skip if absent; local steps still complete. |

Gather factual context: confirm git history depth, last tag, conventional commit log, and working tree cleanliness before proceeding.

## Workflow

1. **Read conventional commit log** since the last tag.
2. **Calculate next semver** when no `--version` override is supplied:
   - `feat:` → minor bump
   - `fix:`, `chore:`, `docs:` → patch bump
   - `BREAKING CHANGE:` footer or `feat!:` / `fix!:` → major bump
   - Explicit `--version` → skip calculation entirely; document override in
     release summary.
3. **Check for duplicate tag** — if the calculated or override version tag
   already exists in the repo, halt immediately, report the conflict in
   `release-summary.md`, and exit without modifying `CHANGELOG.md` or creating
   a release.
4. **Update or create `CHANGELOG.md`** using the project's existing dated
   `[version] - YYYY-MM-DD` format with commits grouped by type.
5. **Create git tag** matching the version.
6. **Create GitHub release** (conditional) — if `--create-release` AND `gh` CLI
   available AND GitHub token present: create the release using the new
   `CHANGELOG.md` section as the release body.
7. **Skip GitHub release gracefully** — if `--create-release` but `gh` CLI
   unavailable OR no GitHub token: complete all local steps, document
   "GitHub release skipped: gh CLI unavailable / no token" in
   `release-summary.md`, do **not** fail.
8. **Emit durable `release-summary.md` artifact** recording:
   - Version calculated
   - Version source (calculated vs override)
   - Commits included
   - Tag created
   - CHANGELOG section added
   - GitHub release status (created / skipped + reason)
   - Any skipped steps with reasons

## Required Gates

- Git history is available (full clone, not shallow).
- Gather factual context: confirm git history depth, last tag, commit count since last tag, and working tree status before beginning.
- Working tree is clean before tagging.
- Calculated or override version tag does not already exist.

## Stop Conditions

- **Shallow git clone** with no tag history → request a full fetch before
  proceeding.
- **Duplicate tag** — calculated or override version tag already exists → halt,
  report the conflict in `release-summary.md`, exit without modifying
  `CHANGELOG.md` or creating a release.
- **Missing GitHub tooling** — `--create-release` with no `gh` CLI or no GitHub
  token → complete local steps, document skip, do **not** fail the skill.
- Rescue: on unrecoverable error mid-run, emit a partial `release-summary.md` recording completed and skipped steps before halting.

## Example

**Scenario:** A plugin repository is currently at `v0.9.0`. Two conventional
commits have landed since that tag:

```
feat: add contracts
fix: resolve OpenAPI schema edge case
```

**Invocation:**

```
/flow:release
```

**Result:**

1. The skill reads the two commits and determines that the `feat:` commit
   triggers a **minor** bump: `v0.9.0` → `v0.10.0`.
2. It verifies that the tag `v0.10.0` does not already exist.
3. `CHANGELOG.md` is updated with a new section:

   ```markdown
   ## [0.10.0] - 2025-07-17

   ### Features
   - add contracts

   ### Bug Fixes
   - resolve OpenAPI schema edge case
   ```

4. Git tag `v0.10.0` is created.
5. `release-summary.md` is emitted documenting:
   - **Version:** `0.10.0`
   - **Version source:** calculated (minor bump from `feat:`)
   - **Commits:** `feat: add contracts`, `fix: resolve OpenAPI schema edge case`
   - **Tag created:** `v0.10.0`
   - **GitHub release:** skipped (no `--create-release` flag)

> **Note:** To produce `v1.0.0` from `v0.9.0`, use a `feat!:` commit (breaking
> change) or the `--version 1.0.0` override.
