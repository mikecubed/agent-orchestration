# Shared Contracts — Composable Code Codex

Loaded by conductor at startup. Referenced by all check SKILL files.

---

## Violation Report Output Schema

Every check MUST produce output in this exact structure.
Free-form violation descriptions without a rule ID are prohibited.

```markdown
## Composable Code Codex Review — {CheckName}

### ✅ Passing
- {RULE-ID}: {Brief confirmation of what passes}

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

**Schema rules**:
- Violations table MUST be present even if empty ("No violations found")
- Every Violations row MUST have a non-empty Rule ID and Proposed Fix
- Waivers section is omitted entirely if no waivers are in scope
- Metrics section is omitted if no measurable metrics are available
- "Actions Taken" MUST say "None — report-only mode" when `--fix` was not provided

---

## Confirmation Prompt Format (Destructive Actions)

Used by all checks when a destructive action requires user confirmation:

```
⚠️  Destructive action requires confirmation.
Action: {description}
File: {path}
Reason: {rule_id} — {rationale}

Proceed? (y/n) ›
```

Only apply the destructive action after an explicit `y` response.

| Action | Destructive? | Confirmation required |
|--------|-------------|----------------------|
| Delete file (DEAD-3) | Yes | Always — show filename + reason |
| Rewrite git history (SEC-1 `--history`) | Yes | Always — show commits affected |
| Remove dependency from manifest (DEP-3) | Conditional | If package usage is ambiguous |
| Delete commented-out code block (DEAD-1) | No | None — git is the backup |
| All other edits | No | None |
