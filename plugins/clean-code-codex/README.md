# Clean Code Codex

A composable, multi-language, TDD-first clean code enforcement system for AI agents.

**Version**: 1.2.0 | **Languages**: TypeScript · Python · Go · Rust · JavaScript

---

## Installation

When using this bundle from the `agent-orchestration` umbrella repo, install it locally with:

```bash
copilot plugin install ./plugins/clean-code-codex
claude --plugin-dir ./plugins/clean-code-codex
```

The rest of this document describes the upstream Codex behavior and supporting files carried into this vendored bundle.

### Claude Code

```bash
# Install directly from this repo
claude --plugin-dir /path/to/clean-code-codex

# Or clone and install
git clone https://github.com/mikecubed/clean-code-codex.git
claude --plugin-dir ./clean-code-codex
```

### GitHub Copilot CLI

GitHub Copilot uses agent files in `.github/agents/` and coding instructions in
`.github/copilot-instructions.md`. Install in three steps:

**Step 1 — Clone the plugin**

```bash
git clone https://github.com/mikecubed/clean-code-codex.git
```

**Step 2 — Copy the agent and skills to your project**

```bash
# Agent definition (makes the agent available in Copilot Chat / CLI)
mkdir -p .github/agents
cp /path/to/clean-code-codex/agents/clean-code-codex.agent.md .github/agents/

# Skills (required for the agent to function)
cp -r /path/to/clean-code-codex/skills ./skills
cp -r /path/to/clean-code-codex/commands ./commands
cp -r /path/to/clean-code-codex/hooks ./hooks
cp -r /path/to/clean-code-codex/gh-hooks ./gh-hooks
```

**Step 3 — Generate coding instructions** (optional but recommended)

Populates `.github/copilot-instructions.md` with the top-priority rules so Copilot
applies them in every response — without any explicit invocation.

```bash
bash /path/to/clean-code-codex/scripts/generate-instructions.sh
```

The agent is now available as `@clean-code-codex` in GitHub Copilot Chat and
activates automatically on write, review, refactor, and test operations.

**Set up enforcement hooks** (recommended):

Hooks fire automatically at write/edit/bash time for real-time rule enforcement.

```bash
# Copy the Copilot CLI hook configuration to your project
mkdir -p .github/hooks
cp /path/to/clean-code-codex/gh-hooks/hooks.json .github/hooks/hooks.json

# Make hook scripts executable
chmod +x /path/to/clean-code-codex/hooks/scripts/*.sh
```

Update the script paths in `.github/hooks/hooks.json` to absolute paths pointing
to the copied `hooks/scripts/` directory.

> **Note**: Without hooks, the agent still enforces all 65 rules on demand — hooks add
> real-time blocking/warning at the point of action. See [`docs/hooks.md`](docs/hooks.md)
> for full hook details and per-CLI configuration.

### Skill path (other agent runtimes)

```bash
cp -r . ~/.agent/skills/clean-code-codex
```

The conductor skill (`skills/conductor/SKILL.md`) is the sole entry point.
All other sub-skills are loaded on demand.

---

## Quick Start

**Via slash command** (Claude Code):

```bash
/codex                          # Auto-detect language + full review
/codex src/                     # Scope to src/ directory
/codex --fix                    # Auto-remediate WARN violations
/codex src/ --scope "**/*.ts"   # TypeScript files in src/ only
/codex --deep --history         # Exhaustive scan + git history analysis
/codex --scaffold-tests         # Generate test skeletons on TDD-1 blocks
/codex --diff-only              # Review only changed files (git diff HEAD)
/codex --explain NAME-1         # Print NAME-1 explanation and exit
/codex --explain                # Add explanations to all violations
/codex --refresh                # Re-detect language/framework/layers
```

**Auto-activation**: The conductor also activates automatically when you write,
review, refactor, or test code — no explicit invocation required.

**CLI arguments** (all optional; defaults are safe):

```
/codex [path] [--scope <glob>] [--fix] [--write] [--history] [--deep] [--scaffold-tests] [--diff-only] [--explain [RULE-ID]] [--refresh]
```

| Argument | Default | Description |
|----------|---------|-------------|
| `path` | repo root | Limit scope to a file or directory |
| `--scope <glob>` | repo root | Restrict all operations to matching paths |
| `--fix` | off | Permit auto-remediation edits for WARN violations |
| `--write` | off | Permit scaffold/write operations (TDD-gated) |
| `--history` | off | Include git history analysis (needed for SEC-1/SEC-6) |
| `--deep` | off | Enable slower exhaustive scans |
| `--scaffold-tests` | off | Generate test skeletons on TDD-1 blocks |
| `--diff-only` | off | Review only changed files (git diff HEAD) |
| `--explain [RULE-ID]` | off | Print explanation for a specific rule, or add explanations to all violations |
| `--refresh` | off | Re-detect language/framework/layers (clears `.codex/config.json` cache) |

**Safety defaults**:
- Without `--fix`: zero file modifications, regardless of violations found
- Without `--scope` or `path`: agent asks for scope when repo has > 50 tracked files
- Destructive actions require both `--fix` AND explicit user confirmation

---

## Check Reference

| Check | Rules | Situations | Language refs |
|-------|-------|-----------|---------------|
| `conductor` | — | Always loaded | No |
| `tdd-check` | TDD-1 – TDD-9 | write, refactor, test | Yes |
| `arch-check` | ARCH-1 – ARCH-6 | review, refactor | No |
| `type-check` | TYPE-1 – TYPE-6 | review, write | Yes |
| `naming-check` | NAME-1 – NAME-7 | review, refactor | Yes |
| `size-check` | SIZE-1 – SIZE-6 | review, refactor | No |
| `dead-check` | DEAD-1 – DEAD-5 | review, refactor | No |
| `test-check` | TEST-1 – TEST-8 | review, test | No |
| `sec-check` | SEC-1 – SEC-7 | new service/module, security, review, incident | No |
| `dep-check` | DEP-1 – DEP-5 | review | No |
| `obs-check` | OBS-1 – OBS-5 | review | No |

**Situations → checks dispatched**:

| Situation | Checks loaded |
|-----------|--------------|
| Writing new code | tdd-check, type-check, naming-check |
| PR / code review | arch-check, type-check, naming-check, size-check, dead-check, test-check, obs-check, sec-check |
| Refactoring | tdd-check (gate), arch-check, naming-check, size-check, dead-check |
| Running tests | tdd-check, test-check |
| Security audit | sec-check |
| Dependency update | dep-check |
| Production incident | obs-check, sec-check |
| New service/module | tdd-check, arch-check, sec-check |
| Adding observability | obs-check |
| CI / full check | All checks |
| Boy Scout session end | size-check, dead-check, naming-check |

---

## Hooks

In addition to on-demand skills, the plugin ships with a set of **automatic enforcement hooks** that fire at the exact moment a problematic action occurs — no explicit invocation required.

| Rule | Trigger | Claude Code | GH Copilot CLI |
|------|---------|-------------|----------------|
| SEC-1 — No Hardcoded Secrets | Write or Edit | **Block** before write | Warn after write |
| SEC-7 — No Bash Injection | Bash command | **Block** before execution | **Block** before execution |
| SIZE-1 — Functions Must Be Small | Write or Edit | Warn after write | Warn after write |
| DEAD-1 — No Commented-Out Code | Write or Edit | Warn after write | Warn after write |
| DEP-1 — No Known Vulnerabilities | Writing a manifest | Warn after write | Warn after write |
| ARCH-1 — Architecture Boundary | Write or Edit | **Block** before write | Warn after write |
| TEST-DELTA — Coverage Gap | Write or Edit | Warn after write | Warn after write |
| OBS-1 — Empty Catch Block | Write or Edit | Warn after write | Warn after write |

Hooks write findings to a session coverage file so skills skip duplicate reporting.
All hooks fail open — a hook infrastructure failure never blocks the agent.

See [`docs/hooks.md`](docs/hooks.md) for the full user guide, pattern file reference, and per-CLI configuration instructions.

---

## Severity Levels

| Level | Behaviour |
|-------|-----------|
| **BLOCK** | Stops code production; agent must present a corrected version before proceeding |
| **WARN** | Flags the issue; auto-remediable with `--fix`; reported in "Violations" table |
| **INFO** | Informational; shown in report but does not block progress |

**Rule precedence** (highest first when rules conflict):
`SEC → TDD → ARCH/TYPE → quality BLOCK → WARN → INFO`

---

## Violation Report Format

Every check produces output in this structure:

```markdown
## Clean Code Codex Review — {CheckName}

### ✅ Passing
- {RULE-ID}: {Brief confirmation}

### ❌ Violations
| Rule ID | Severity | Location | Violation | Proposed Fix |
|---------|----------|----------|-----------|--------------|
| {ID}    | {BLOCK|WARN|INFO} | {file}:{line} | {description} | {fix} |

### ⚠️ Waivers
| Waiver ID | Rule ID | Scope | Expiry | Status |
|-----------|---------|-------|--------|--------|
| {WAIVER-*} | {RULE-ID} | {path} | {date} | {active|EXPIRED} |

### 📊 Metrics
- Coverage: {pct}% (target: 90% domain, 80% application)
- Test ratio: {ratio}:1 (target: ≥ 1:1)

### 🔧 Actions Taken
{List of auto-fixes applied, or "None — report-only mode"}

### ⏭ Next Steps
{Ordered list of remaining actions}
```

---

## Waivers

Waivers are the **only** permitted mechanism for suppressing a violation.
They must be explicit, scoped, time-bound, and attributed.

**Inline waiver** (in the affected source file):

```
# WAIVER: ARCH-2 | scope: src/legacy/ | expiry: 2026-06-01 | owner: @team-lead | ticket: PROJ-1234
# reason: Legacy adapter layer cannot be refactored until Q3 migration completes
```

**Project-wide waiver** (`waivers.yaml` at project root):

```yaml
waivers:
  - id: WAIVER-ARCH-2-1234
    rule_id: ARCH-2
    scope: src/legacy/**
    reason: Legacy adapter cannot be refactored until Q3 migration
    owner: "@team-lead"
    ticket: PROJ-1234
    expiry: 2026-06-01
```

**Waiver states**:
- **Active** (`expiry > today`): violation shown under ⚠️ Waivers, not ❌ Violations
- **Expired** (`expiry ≤ today`): violation re-raised at original severity; waiver marked EXPIRED
- **Invalid** (missing `expiry`, `owner`, or scope `**`): treated as no waiver; violation active at full severity

---

## Contributing

See `CHANGELOG.md` for the full rule set.

Run `make lint` before submitting a PR. Install tools with `make install-tools`.
