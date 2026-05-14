---
name: auto-fix-eligibility
description: >
  Auto-fix eligibility reference for the conductor --fix mode.
  Loaded on demand ONLY when --fix is active in the current session.
  Enumerates every rule with its auto-remediation status and notes.
version: "2.0.0"
last-reviewed: "2026-05-13"
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
| TEST-PINNED | BLOCK | ❌ Human required | Writing tests requires understanding the contract |
| TEST-RED-FIRST | BLOCK | ❌ Human required | Confirming a red→green transition requires temporarily breaking the implementation; human-confirmable |
| BOUND-1 | BLOCK | ❌ Human required | Dependency direction change is architectural |
| BOUND-2 | BLOCK | ❌ Human required | Defining and shaping a port is a domain/API design decision |
| BOUND-3 | BLOCK/WARN | ❌ Human required | Moving construction to composition root requires lifetime/ownership decisions |
| BOUND-4 | BLOCK | ❌ Human required | Breaking circular deps requires architectural decision |
| COMP-1 | WARN/BLOCK/INFO | ❌ Human required | Replacing inheritance with composition (Strategy, Decorator, function injection) is a design decision |
| PURE-1 | BLOCK | ❌ Human required | Removing side effects from core requires shifting them to shell — architectural |
| PURE-2 | WARN | ❌ Human required | Replacing ambient reads with explicit parameters threads through callers |
| PURE-3 | INFO | ❌ Report only | Signal only; cross-reference TEST-NO-MOCK-FOR-PURE |
| IMMUT-1 | BLOCK | ⚠️ Conditional | Auto-rewrite to immutable form when the pattern is simple (e.g., `.push` → spread); complex cases need human |
| IMMUT-2 | WARN | ❌ Human required | Synchronization strategy requires concurrency design |
| IMMUT-3 | WARN | ❌ Human required | Builder/factory pattern requires API design |
| RESULT-1 | BLOCK/WARN | ❌ Human required | Changing return type from `throw` to `Result` requires updating all call sites |
| RESULT-2 | WARN | ❌ Human required | Adopting Option/Maybe requires call-site updates |
| RESULT-3 | WARN | ⚠️ Conditional | Auto-fix can add a TODO comment or propagate the error; meaningful recovery requires human |
| TYPE-1 | BLOCK | ❌ Human required | Correct type depends on domain semantics |
| TYPE-2 | BLOCK | ❌ Human required | Runtime guard implementation requires context |
| TYPE-3 | WARN | ❌ Human required | Exhaustive cases require knowing all variants |
| TYPE-4 | WARN | ❌ Human required | Branded type definition requires domain knowledge |
| TYPE-5 | WARN | ❌ Human required | Nullable semantics require understanding the contract |
| TYPE-6 | INFO | ❌ Report only | No fix action |
| TYPED-1 | WARN | ❌ Human required | Newtype wrappers require domain knowledge to name |
| TYPED-2 | WARN/INFO | ❌ Human required | Sum-type variants require enumerating all states |
| NAME-1 | BLOCK | ❌ Human required | Meaningful name depends on domain knowledge |
| NAME-2 | WARN | ✅ Auto-remediable | Add `is/has/should/can` prefix; rename all sites within scope |
| NAME-3 | BLOCK | ❌ Human required | Correcting misleading names requires domain knowledge |
| NAME-4 | WARN | ❌ Human required | Variable names in expanded scope require judgment |
| NAME-5 | WARN | ✅ Auto-remediable | Expand known abbreviations; rename all sites within scope |
| NAME-6 | WARN | ❌ Human required | Canonical term selection requires team agreement |
| NAME-7 | WARN | ❌ Human required | Propose test name in `subject_scenario_expected` pattern; human must confirm/rename |
| NAME-UL | WARN | ❌ Human required | Domain-aligned naming requires context |
| SIZE-1 | WARN/BLOCK | ⚠️ Partial / ❌ Human | WARN (40–79 lines): can extract obvious sub-functions; BLOCK (≥80): architectural decisions required |
| SIZE-2 | WARN/BLOCK | ⚠️ Partial / ❌ Human | WARN (351–499 lines): can split when boundary is clear; BLOCK (≥500): responsibility clarification required |
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
| TEST-9 | INFO/WARN | ❌ Report only | Mutation score reporting; no fix action |
| TEST-BEHAVIOR | BLOCK | ❌ Human required | Rewriting assertions away from mock-count/private-state requires understanding test intent |
| TEST-NO-MOCK-FOR-PURE | BLOCK | ❌ Human required | Moving impure dependencies to shell is an architectural decision |
| TEST-VACUOUS | WARN/BLOCK | ❌ Human required | Replacing a vacuous assertion with a meaningful one requires knowing the expected value |
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
| SESS-1 | WARN | ❌ Human required | Session state file update requires user decision |
| SESS-2 | WARN | ❌ Human required | Context-hygiene pause is a user action |
| SESS-3 | WARN | ❌ Human required | Scout brief is a discovery action |
| CTXT-1 | WARN | ❌ Human required | Splitting a shared type across bounded contexts requires domain knowledge |
| CTXT-2 | WARN | ❌ Human required | Domain-aligned renames require ubiquitous-language agreement |
| CTXT-3 | WARN | ❌ Human required | Designing an Anti-Corruption Layer requires understanding the external API and the domain |
