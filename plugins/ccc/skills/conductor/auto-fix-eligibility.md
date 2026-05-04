---
name: auto-fix-eligibility
description: >
  Auto-fix eligibility reference for the conductor --fix mode.
  Loaded on demand ONLY when --fix is active in the current session.
  Enumerates all 64 rules (SIZE-1 and SIZE-2 each have two threshold rows) with their auto-remediation status and notes.
version: "1.0.0"
last-reviewed: "2026-03-05"
---

# Auto-Fix Eligibility Table

Every rule specifies whether it is auto-remediable (can be applied without
ambiguity) or requires a human decision. This file is loaded by the conductor
**only when `--fix` is active**.

**Legend**:
- ✅ Auto-remediable: applied automatically with `--fix` within scope, no confirmation needed
- ⚠️ Conditional/Partial: applied with `--fix` only when preconditions are met; document what was skipped
- ❌ Human required: never auto-applied; cite rule ID and describe the required action in Next Steps

## Eligibility by Domain

| Rule ID | Severity | Auto-Remediable? | Notes |
|---------|----------|-----------------|-------|
| TDD-1 | BLOCK | ❌ Human required | Writing tests requires understanding the contract |
| TDD-2 | BLOCK | ❌ Human required | Minimal implementation requires spec knowledge |
| TDD-3 | BLOCK | ❌ Human required | Blocked on test-runner confirmation |
| TDD-4 | WARN | ❌ Human required | Renaming tests needs understanding of test intent |
| TDD-5 | WARN | ❌ Human required | Interface design requires human judgment |
| TDD-6 | WARN | ❌ Human required | Requires knowing the expected assertion value |
| TDD-7 | BLOCK | ❌ Human required | Domain boundary detection is contextual |
| TDD-8 | WARN | ❌ Human required | Invariants require domain knowledge to define |
| TDD-9 | INFO | ❌ Report only | No fix action |
| ARCH-1 | BLOCK | ❌ Human required | Dependency direction change is architectural |
| ARCH-2 | BLOCK | ❌ Human required | Breaking circular deps requires architectural decision |
| ARCH-3 | WARN | ❌ Human required | Requires introducing shared module |
| ARCH-4 | BLOCK | ❌ Human required | Extracting infrastructure is architectural |
| ARCH-5 | WARN | ❌ Human required | Cascade refactoring requires design decision |
| ARCH-6 | INFO | ❌ Report only | No fix action |
| ARCH-7 | WARN/BLOCK/INFO | ❌ Human required | Replacing inheritance with composition (Strategy, Decorator, Bridge, injection) is a design decision |
| ARCH-8 | BLOCK | ❌ Human required | Moving construction to a factory or composition root requires lifetime/ownership decisions |
| ARCH-9 | BLOCK | ❌ Human required | Defining and shaping a port is a domain/API design decision |
| ARCH-10 | WARN/BLOCK | ❌ Human required | Introducing or relocating a composition root is an architectural decision |
| TYPE-1 | BLOCK | ❌ Human required | Correct type depends on domain semantics |
| TYPE-2 | BLOCK | ❌ Human required | Runtime guard implementation requires context |
| TYPE-3 | WARN | ❌ Human required | Exhaustive cases require knowing all variants |
| TYPE-4 | WARN | ❌ Human required | Branded type definition requires domain knowledge |
| TYPE-5 | WARN | ❌ Human required | Nullable semantics require understanding the contract |
| TYPE-6 | INFO | ❌ Report only | No fix action |
| NAME-1 | BLOCK | ❌ Human required | Meaningful name depends on domain knowledge |
| NAME-2 | WARN | ✅ Auto-remediable | Add `is/has/should/can` prefix; rename all sites within scope |
| NAME-3 | BLOCK | ❌ Human required | Correcting misleading names requires domain knowledge |
| NAME-4 | WARN | ❌ Human required | Variable names in expanded scope require judgment |
| NAME-5 | WARN | ✅ Auto-remediable | Expand known abbreviations; rename all sites within scope |
| NAME-6 | WARN | ❌ Human required | Canonical term selection requires team agreement |
| NAME-7 | WARN | ❌ Human required | Propose test name in `subject_scenario_expected` pattern; human must confirm/rename |
| SIZE-1 | WARN/BLOCK | ⚠️ Partial / ❌ Human | WARN (40–79 lines): can extract obvious sub-functions; BLOCK (≥80 lines): architectural decisions required |
| SIZE-2 | WARN/BLOCK | ⚠️ Partial / ❌ Human | WARN (351–499 lines): can split when boundary is clear; BLOCK (≥500 lines): responsibility clarification required |
| SIZE-3 | WARN | ❌ Human required | Nesting reduction requires structural refactoring |
| SIZE-4 | WARN | ❌ Human required | Parameter consolidation into objects requires API design |
| SIZE-5 | BLOCK | ❌ Human required | Splitting flag-argument functions requires API design |
| SIZE-6 | INFO | ❌ Report only | No fix action |
| DEAD-1 | BLOCK | ✅ Auto-remediable | Delete commented-out block; no confirmation needed (git backup) |
| DEAD-2 | WARN | ⚠️ Confirmation | Remove unused export; confirm not a library public API |
| DEAD-3 | WARN | ⚠️ Destructive | Delete orphaned file; requires explicit y/n confirmation |
| DEAD-4 | WARN | ✅ Auto-remediable | Convert `TODO:` to `TODO(#?):` format; placeholder for issue number |
| DEAD-5 | BLOCK | ❌ Human required | Implementing or deleting a stub requires functional understanding |
| TEST-1 | BLOCK | ⚠️ Conditional | Replace weak assertion if expected value is determinable from context |
| TEST-2 | BLOCK | ❌ Human required | Writing meaningful tests requires domain knowledge |
| TEST-3 | WARN | ⚠️ Partial | Generate test stubs (not implementations) for uncovered paths |
| TEST-4 | WARN | ❌ Human required | Property test invariants require domain knowledge |
| TEST-5 | WARN | ⚠️ Conditional | Remove `sleep()` call if pattern is a timing guard (not semantically required) |
| TEST-6 | BLOCK | ⚠️ Conditional | Add mock wrapper if logger/mock framework is already in scope |
| TEST-7 | WARN | ✅ Auto-remediable | Generate boundary test stubs with identified boundary values |
| TEST-8 | INFO | ❌ Report only | No fix action |
| SEC-1 | BLOCK | ⚠️ Partial | Replace literal with env var reference; secret rotation is a human step |
| SEC-2 | BLOCK | ✅ Auto-remediable | Add schema validation wrapper at config module entry point |
| SEC-3 | BLOCK | ✅ Auto-remediable | Replace injection point with safe alternative (DOMPurify / dispatch table) |
| SEC-4 | BLOCK | ✅ Auto-remediable | Rewrite as parameterised query |
| SEC-5 | WARN | ✅ Auto-remediable | Add missing patterns to `.gitignore` |
| SEC-6 | WARN | ❌ Human required | Credential rotation and revocation requires human action |
| SEC-7 | WARN | ✅ Auto-remediable | Replace `'*'` with env-var-driven allowlist |
| DEP-1 | BLOCK | ❌ Human required | Upgrade requires running tests and reviewing breaking changes |
| DEP-2 | WARN | ❌ Human required | Major version upgrades require human review of breaking changes |
| DEP-3 | WARN | ⚠️ Confirmation | Remove unused dep; confirm not a CLI/type-only package |
| DEP-4 | WARN | ✅ Auto-remediable | Move package from `dependencies` to `devDependencies` |
| DEP-5 | INFO | ❌ Report only | No fix action (policy decision) |
| OBS-1 | BLOCK | ✅ Auto-remediable | Add `logger.error({err, requestId}, 'message')` + rethrow |
| OBS-2 | WARN | ⚠️ Conditional | Convert to structured log only if `logger` + `ctx` are already in scope |
| OBS-3 | WARN | ⚠️ Partial | Add framework instrumentation reference; do not add manual spans if auto-instrumentation available |
| OBS-4 | WARN | ✅ Auto-remediable | Add minimal `/health` endpoint stub |
| OBS-5 | INFO | ⚠️ Partial | Generate error message template with key variables; human fills in specifics |
