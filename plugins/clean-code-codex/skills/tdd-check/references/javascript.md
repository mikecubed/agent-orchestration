# TDD Language Reference — JavaScript

Loaded by `tdd-check` when language = `javascript`.
Provides JavaScript-specific test framework defaults, file naming conventions,
and tooling guidance for each TDD rule.

**Important**: JavaScript lacks a compile-time type system. JSDoc annotations
are required as a substitute where TypeScript's type system would normally catch errors.

---

## Default Test Stack

| Purpose | Primary | Alternative |
|---------|---------|------------|
| Unit tests | **Vitest** | Jest |
| Property-based tests | **fast-check** | — |
| Integration (API) | **Supertest** | — |
| Integration (E2E) | **Playwright** | Cypress |
| Coverage | **c8** | Istanbul (nyc) |
| Test runner config | `vitest.config.js` | `jest.config.js` |

---

## File Naming Conventions

| Convention | Pattern | Example |
|-----------|---------|---------|
| Co-located unit test | `{name}.test.js` | `user-service.test.js` |
| Co-located spec | `{name}.spec.js` | `auth.spec.js` |
| `__tests__/` directory | `__tests__/{name}.test.js` | `__tests__/payment.test.js` |
| Integration tests | `{name}.integration.test.js` | — |

---

## TDD-1: Test File Detection

Look for any of:
```
{module}.test.js
{module}.spec.js
{module}.test.mjs
__tests__/{module}.test.js
__tests__/{module}.spec.js
```

---

## TDD-4: Test Naming — Vitest / Jest

Pattern: `[subject]_[scenario]_[expected]` in `it`/`test`/`describe` strings (same as TypeScript).

---

## TDD-7: Mocks — Permitted vs Prohibited

**Permitted**: `vi.mock()` on I/O boundaries (database, HTTP clients, `fs/promises`).
**Prohibited**: `vi.mock()` or `vi.spyOn()` on domain functions or value objects.
**JavaScript test doubles**: use in-memory implementations instead of mocking.

---

## TDD-8: Property-Based Tests — fast-check

Use `fc.assert(fc.property(...))` to verify invariants on value objects.
Test both valid inputs (invariant holds) and invalid inputs (throws expected error).

---

## TDD-9: Test Ratio — Measurement

```bash
# Count source lines (excluding test files and node_modules)
find src -name '*.js' ! -name '*.test.js' ! -name '*.spec.js' \
  -not -path '*/node_modules/*' | xargs wc -l | tail -1

# Count test lines
find src -name '*.test.js' -o -name '*.spec.js' | \
  xargs wc -l | tail -1
```

---

## Coverage Configuration (c8 / Vitest)

`vitest.config.js` — set `test.coverage.provider` (`v8`), `test.coverage.thresholds` (statements/branches/functions/lines), and `test.coverage.exclude`.

**Targets**: Domain layer: 90% | Application layer: 80%

---

## TYPE Rules — JavaScript Applicability

JavaScript lacks a static type system. The following TYPE rules are adjusted:

| Rule | Status in JavaScript | Replacement |
|------|---------------------|-------------|
| TYPE-1 (`any`/`unknown` without guard) | **Not applicable** (no type system) | JSDoc `@type` annotation required instead |
| TYPE-2 (double type assertion) | **Not applicable** | — |
| TYPE-3 (exhaustive switch) | **Applies** | Add default case with explicit error throw |
| TYPE-4 (branded types) | **Applies** | Use factory functions + JSDoc `@typedef` |
| TYPE-5 (missing return type) | **Applies** | JSDoc `@returns` required on exports |
| TYPE-6 (optional field design) | **Applies** | Use JSDoc `@type {{field?: type}}` |

---

## `@ts-check` Pragma

Adding `// @ts-check` at the top of a file enables TypeScript's type checker on
JavaScript. This is encouraged for all production JavaScript files.

---

## Non-Standard Framework Handling

If the project uses Mocha, Jasmine, AVA, or another framework:
- Apply TDD-1 through TDD-9 language-agnostically
- Note the non-standard framework in the report without blocking
- Do NOT attempt to convert tests to Vitest/Jest
