# Test Gate Language Reference — TypeScript

Loaded by `gate-check` when language = `typescript`.
Provides TypeScript-specific test framework defaults, file naming conventions,
and scaffold templates for the test gate.

---

## Default Test Stack

| Purpose | Primary | Alternative |
|---------|---------|------------|
| Unit tests | **Vitest** | Jest |
| Property-based tests | **fast-check** | — |
| Integration (API) | **Supertest** | Hono test client |
| Integration (E2E) | **Playwright** | Cypress |
| Coverage | **c8** | Istanbul (nyc) |
| Test runner config | `vitest.config.ts` | `jest.config.ts` |

---

## File Naming Conventions

| Convention | Pattern | Example |
|-----------|---------|---------|
| Co-located unit test | `{name}.test.ts` | `user.service.test.ts` |
| Co-located spec | `{name}.spec.ts` | `auth.spec.ts` |
| `__tests__/` directory | `__tests__/{name}.test.ts` | `__tests__/payment.test.ts` |
| Integration tests | `{name}.integration.test.ts` | `api.integration.test.ts` |
| E2E tests | `tests/{name}.e2e.ts` | `tests/checkout.e2e.ts` |

**Rule**: Test file must exist alongside (or in `__tests__/` adjacent to) the source file.
A test in `src/__tests__/` is NOT valid for a source file in `lib/`.

---

## TDD-1: Test File Detection

Look for any of:
```
{module}.test.ts
{module}.spec.ts
__tests__/{module}.test.ts
__tests__/{module}.spec.ts
```

---

## TDD-4: Test Naming — Vitest / Jest

---

## TDD-7: Mocks — Permitted vs Prohibited

**Permitted**: `vi.mock()` on I/O boundaries (database, HTTP clients, `fs/promises`).
**Prohibited**: `vi.mock()` or `vi.spyOn()` on domain functions or value objects.
**Vitest doubles for domain logic**: use in-memory interface implementations instead.

---

## TDD-8: Property-Based Tests — fast-check

Use `fc.assert(fc.property(...))` to verify invariants on value objects.
Test both valid inputs (invariant holds) and invalid inputs (throws expected error).

---

## TDD-9: Test Ratio — Measurement

```bash
# Count source lines (excluding test files and node_modules)
find src -name '*.ts' ! -name '*.test.ts' ! -name '*.spec.ts' \
  -not -path '*/node_modules/*' | xargs wc -l | tail -1

# Count test lines
find src -name '*.test.ts' -o -name '*.spec.ts' | \
  xargs wc -l | tail -1
```

---

## Coverage Configuration (c8 / Vitest)

`vitest.config.ts` — set `test.coverage.provider` (`v8`), `test.coverage.thresholds` (statements/branches/functions/lines), and `test.coverage.exclude`.

**Targets** (per TDD-9 / TEST-8):
- Domain layer: 90%
- Application layer: 80%
- Infrastructure layer: no mandatory floor (integration tests cover this)

---

## Non-Standard Framework Handling

If the project uses a framework not listed above (e.g., Mocha, Jasmine, AVA):
- Apply TDD-1 through TDD-9 language-agnostically
- Note the non-standard framework in the report without blocking
- Do NOT attempt to convert tests to Vitest/Jest

---

## Scaffold Patterns (`--scaffold-tests`)

### Vitest

```typescript
import { describe, it, expect } from 'vitest';
import { functionName } from '../path/to/module';

describe('functionName', () => {
  it('scenario_expected', () => {
    const result = functionName();
    expect(result).toBe(undefined); // TODO: replace with specific assertion
  });
});
```

### Jest

```typescript
import { functionName } from '../path/to/module';

describe('functionName', () => {
  it('scenario_expected', () => {
    const result = functionName();
    expect(result).toBe(undefined); // TODO: replace with specific assertion
  });
});
```

**Rules for scaffold assertions**:
- Use `toBe`, `toEqual`, `toStrictEqual` — never `toBeTruthy` or `toBeDefined`
- Import the real function (no mocks in the skeleton)
- The test MUST fail on first run (initial `toBe(undefined)` will fail if function returns anything)
