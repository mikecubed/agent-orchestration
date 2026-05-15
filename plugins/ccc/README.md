# Composable Code Codex

Composition-first, pure-function-friendly code quality enforcement for AI agents. Catches the failure modes that produce terrible AI-generated code — side effects in pure logic, mocks of pure functions, parameter mutation, vacuous tests, concrete-infra leakage into domain code — without dogmatic paradigm policing.

**Version**: 4.0.0 | **Languages**: TypeScript · Python · Go · Rust · JavaScript

---

## Installation

When using this bundle from the `agent-orchestration` umbrella repo, install it locally with:

```bash
copilot plugin install ./plugins/ccc
claude --plugin-dir ./plugins/ccc
```

The rest of this document describes the upstream Codex behavior and supporting files carried into this vendored bundle.

### Claude Code

```bash
# Install directly from this repo
claude --plugin-dir /path/to/ccc

# Or clone and install
git clone https://github.com/mikecubed/ccc.git
claude --plugin-dir ./ccc
```

### GitHub Copilot CLI

GitHub Copilot uses agent files in `.github/agents/` and coding instructions in
`.github/copilot-instructions.md`. Install in three steps:

**Step 1 — Clone the plugin**

```bash
git clone https://github.com/mikecubed/ccc.git
```

**Step 2 — Copy the agent and skills to your project**

```bash
# Agent definition (makes the agent available in Copilot Chat / CLI)
mkdir -p .github/agents
cp /path/to/ccc/agents/ccc.agent.md .github/agents/

# Skills (required for the agent to function)
cp -r /path/to/ccc/skills ./skills
cp -r /path/to/ccc/commands ./commands
cp -r /path/to/ccc/hooks ./hooks
cp -r /path/to/ccc/gh-hooks ./gh-hooks
```

**Step 3 — Generate coding instructions** (optional but recommended)

Populates `.github/copilot-instructions.md` with the top-priority rules so Copilot
applies them in every response — without any explicit invocation.

```bash
bash /path/to/ccc/scripts/generate-instructions.sh
```

The agent is now available as `@ccc` in GitHub Copilot Chat and
activates automatically on write, review, refactor, and test operations.

**Set up enforcement hooks** (recommended):

Hooks fire automatically at write/edit/bash time for real-time rule enforcement.

```bash
# Copy the Copilot CLI hook configuration to your project
mkdir -p .github/hooks
cp /path/to/ccc/gh-hooks/hooks.json .github/hooks/hooks.json

# Make hook scripts executable
chmod +x /path/to/ccc/hooks/scripts/*.sh
```

Update the script paths in `.github/hooks/hooks.json` to absolute paths pointing
to the copied `hooks/scripts/` directory.

> **Note**: Without hooks, the agent still enforces the full rule set on demand — hooks add
> real-time blocking/warning at the point of action. See [`docs/hooks.md`](docs/hooks.md)
> for full hook details and per-CLI configuration.

### Skill path (other agent runtimes)

```bash
cp -r . ~/.agent/skills/ccc
```

The conductor skill (`skills/conductor/SKILL.md`) is the sole entry point.
All other sub-skills are loaded on demand.

---

## Bundle surface

This vendored bundle ships four top-level surfaces:

| Surface | Path | Purpose |
|---------|------|---------|
| Conductor command | `commands/codex.md` | Slash-command entry point for `/codex` |
| Agent | `agents/ccc.agent.md` | Auto-invoked agent wrapper that always routes through the conductor |
| Conductor skill | `skills/conductor/SKILL.md` | The only always-loaded skill; detects operation type and dispatches sub-skills |
| Hook guide | `docs/hooks.md` | Setup and behavior reference for the automatic enforcement hooks |

The conductor is the only entry point. It dispatches **21 check sub-skills** on
demand, based on operation type and scope.

---

## Quick Start

**Via slash command** (Claude Code):

```bash
/codex                          # Auto-detect language + full review
/codex src/                     # Scope to src/ directory
/codex --fix                    # Auto-remediate WARN violations
/codex src/ --scope "**/*.ts"   # TypeScript files in src/ only
/codex --deep --history         # Exhaustive scan + git history analysis
/codex --scaffold-tests         # Generate test skeletons on TEST-PINNED blocks
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
| `--write` | off | Permit scaffold/write operations (gated by TEST-PINNED/TEST-RED-FIRST) |
| `--history` | off | Include git history analysis (needed for SEC-1/SEC-6) |
| `--deep` | off | Enable slower exhaustive scans |
| `--scaffold-tests` | off | Generate test skeletons on TEST-PINNED blocks |
| `--diff-only` | off | Review only changed files (git diff HEAD) |
| `--explain [RULE-ID]` | off | Print explanation for a specific rule, or add explanations to all violations |
| `--refresh` | off | Re-detect language/framework/layers (clears `.codex/config.json` cache) |

**Safety defaults**:
- Without `--fix`: zero file modifications, regardless of violations found
- Without `--scope` or `path`: agent asks for scope when repo has > 50 tracked files
- Destructive actions require both `--fix` AND explicit user confirmation

---

## Skill and check reference

This table is exhaustive for the bundle's shipped skill surface.

| Skill / check | Rules | Use it when | Auto-dispatched for | Language refs |
|---------------|-------|-------------|---------------------|---------------|
| `conductor` | — | Always — the sole entry point and dispatch coordinator | every `/codex` run and agent activation | No |
| `gate-check` | TEST-PINNED, TEST-RED-FIRST | You need the test gate on writes (no new code without a test that exercises it; sessions must record a red→green transition) | write, refactor, test, new service, CI/full check | Yes |
| `arch-check` | BOUND-1 – BOUND-4, COMP-1 | You want boundary-direction, port discipline, no-circular-imports, and composition-over-inheritance feedback | review, refactor, new service, boundary writes, CI/full check | No |
| `purity-check` | PURE-1 – PURE-3 | You want functional-core enforcement: no I/O / clock / RNG / logging in `core/` | write, review, refactor, CI/full check | Yes |
| `immutability-check` | IMMUT-1 – IMMUT-3 | You want to catch parameter mutation, shared mutable state, partial-construction patterns | write, review, refactor, CI/full check | Yes |
| `result-check` | RESULT-1 – RESULT-3 | You want typed-error discipline (Result<T,E> over exceptions for domain failures) | write, review, new service, CI/full check | Yes |
| `context-check` | CTXT-1 – CTXT-3 | You want strategic-DDD signals: shared models across bounded contexts, vague domain naming, external API models leaking into core without an ACL | review, new service, CI/full check | No |
| `type-check` | TYPE-1 – TYPE-6, TYPED-1, TYPED-2 | You need type-safety review plus type-driven design (newtypes, sum types for state) | write, review, CI/full check | Yes |
| `naming-check` | NAME-1 – NAME-7, NAME-UL | You want naming clarity, consistency, and (in `core/`) ubiquitous-language alignment | write, review, refactor, boy scout, CI/full check | Yes |
| `size-check` | SIZE-1 – SIZE-6 | You want function/class size pressure and decomposition guidance | review, refactor, boy scout, CI/full check | No |
| `dead-check` | DEAD-1 – DEAD-5 | You want unused/commented-out/dead code surfaced | review, refactor, boy scout, CI/full check | No |
| `test-check` | TEST-1 – TEST-9, TEST-BEHAVIOR, TEST-NO-MOCK-FOR-PURE, TEST-VACUOUS | You need test quality and behavior-pinning checks (no mock-counts, no mocks for pure functions, no vacuous tests) | review, test, CI/full check | No |
| `sec-check` | SEC-1 – SEC-7 | You want security review, secret scanning, or incident-facing hardening feedback | review, security, incident, new service, CI/full check | No |
| `dep-check` | DEP-1 – DEP-5 | You are reviewing dependency risk, manifest updates, or CVE exposure | dependency, CI/full check | No |
| `obs-check` | OBS-1 – OBS-5 | You want observability/logging/alerting feedback or are handling a production issue | review, incident, observability, CI/full check | No |
| `iac-check` | IAC-1 – IAC-5 | You are reviewing Terraform, CloudFormation, Kubernetes, or other IaC security/config risks | review and security when IaC files are detected, CI/full check | No |
| `perf-check` | PERF-1 – PERF-5 | You want performance-risk review on hot paths, loops, allocations, or inefficient queries | review, CI/full check | No |
| `resilience-check` | RES-1 – RES-5 | You want retry/timeout/failure-mode/resilience feedback | review, CI/full check | No |
| `a11y-check` | A11Y-1 – A11Y-5 | You want accessibility review for UI surfaces and interaction patterns | review, CI/full check | No |
| `docs-check` | DOCS-1 – DOCS-5 | You want missing or misleading prose/API/usage documentation surfaced | review, CI/full check | No |
| `i18n-check` | I18N-1 – I18N-5 | You want localization/internationalization issues surfaced | review, CI/full check | No |
| `session-check` | SESS-1 – SESS-3 | You want session-hygiene checks (state freshness, failed-hypothesis budget, codebase brief presence) — renamed from `ctx-check` in v4.0 | write, review, new service, CI/full check | No |

**Situations → checks dispatched**:

| Situation | Checks loaded |
|-----------|--------------|
| Writing new code | gate-check, type-check, naming-check, session-check, purity-check, immutability-check, result-check |
| Boundary-touching write (modules, adapters, ports, domain logic, composition root) | + arch-check |
| PR / code review | arch-check, type-check, naming-check, size-check, dead-check, test-check, obs-check, sec-check, iac-check, perf-check, resilience-check, a11y-check, docs-check, i18n-check, session-check, purity-check, immutability-check, result-check, context-check |
| Refactoring | gate-check (gate), arch-check, naming-check, size-check, dead-check, purity-check, immutability-check |
| Running tests | gate-check, test-check |
| Security audit | sec-check, iac-check |
| Dependency update | dep-check |
| Production incident | obs-check, sec-check |
| New service/module | gate-check, arch-check, sec-check, session-check, purity-check, result-check, context-check |
| Adding observability | obs-check |
| CI / full check | All checks |
| Boy Scout session end | size-check, dead-check, naming-check |

---

## Hooks

In addition to on-demand skills, the plugin ships with a set of **automatic enforcement hooks** that fire at the exact moment a problematic action occurs — no explicit invocation required.

| Rule | Trigger | Claude Code | GH Copilot CLI |
|------|---------|-------------|----------------|
| SEC-1 — No Hardcoded Secrets | Write or Edit | **Block** before write | Warn before write |
| SEC-7 — No Bash Injection | Bash command | **Block** before execution | **Block** before execution |
| BOUND-1 — Core/Shell Boundary Direction | Write or Edit | **Block** before write | Warn before write |
| PURE-1 — No Side Effects in Core | Write or Edit | **Block** before write | Warn before write |
| IMMUT-1 — No Parameter Mutation in Core | Write or Edit | Warn after write | Warn after write |
| RESULT-1 — No Domain-Failure Throws in Core | Write or Edit | Warn after write | Warn after write |
| SIZE-1 — Functions Must Be Small | Write or Edit | Warn after write | Warn after write |
| DEAD-1 — No Commented-Out Code | Write or Edit | Warn after write | Warn after write |
| DEP-1 — No Known Vulnerabilities | Writing a manifest | Warn after write | Warn after write |
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
`SEC → gate (TEST-PINNED, TEST-RED-FIRST) → BOUND/PURE/RESULT/TYPED → COMP/IMMUT → quality BLOCK → WARN → INFO`

---

## Violation Report Format

Every check produces output in this structure:

```markdown
## Composable Code Codex Review — {CheckName}

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
# WAIVER: BOUND-4 | scope: src/legacy/ | expiry: 2026-06-01 | owner: @team-lead | ticket: PROJ-1234
# reason: Legacy adapter layer cannot be refactored until Q3 migration completes
```

**Project-wide waiver** (`waivers.yaml` at project root):

```yaml
waivers:
  - id: WAIVER-BOUND-4-1234
    rule_id: BOUND-4
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

### Per-project severity overrides

Paradigm-family rules — prefixes `PURE-`, `IMMUT-`, `RESULT-`, `COMP-`,
`TYPED-` — can have their severity shifted per project via the
`severity_overrides` block in `.codex/config.json`:

```json
{
  "severity_overrides": {
    "RESULT-1": "BLOCK",
    "IMMUT-1": "INFO"
  }
}
```

Permitted severities are `BLOCK`, `WARN`, and `INFO` (no `OFF` — to
silence a rule, set it to `INFO`). Structural rules (`SEC-`, `BOUND-`,
`NAME-UL`, `TEST-PINNED`, `TEST-RED-FIRST`, `SIZE-`, etc.) are not
overridable. The allowlist of eligible prefixes lives in
`plugins/ccc/config/overridable-rules.json`. Invalid entries, unknown
rules, and parse errors all fall back to the default severity — the
override mechanism never escalates beyond what the allowlist permits.

When a finding is emitted at an overridden severity, the violation
report annotates the change inline (e.g.,
`RESULT-1 (BLOCK, overridden from WARN)`). Auto-fix eligibility is
unchanged: overriding severity does not affect whether `--fix` can
repair a rule. See conductor `§7.1` for the full specification.

---

## Contributing

See `CHANGELOG.md` for the full rule set.

Run `make lint` before submitting a PR. Install tools with `make install-tools`.
