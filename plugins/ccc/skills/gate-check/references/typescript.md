# Test Gate Language Reference — TypeScript

Loaded by `gate-check` when language = `typescript`.
Provides TypeScript-specific test framework defaults, file naming conventions,
and scaffold templates for the test gate (TEST-PINNED, TEST-RED-FIRST).

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

## TEST-PINNED: Test File Detection

Look for any of:
```
{module}.test.ts
{module}.spec.ts
__tests__/{module}.test.ts
__tests__/{module}.spec.ts
```

For each new public symbol: confirm the test file imports the symbol and
calls it (or constructs the type, for classes).

---

## Coverage Configuration (c8 / Vitest)

`vitest.config.ts` — set `test.coverage.provider` (`v8`), `test.coverage.thresholds` (statements/branches/functions/lines), and `test.coverage.exclude`.

---

## Non-Standard Framework Handling

If the project uses a framework not listed above (e.g., Mocha, Jasmine, AVA):
- Apply TEST-PINNED and TEST-RED-FIRST language-agnostically
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
    // SCAFFOLD — replace this throw with a real assertion that pins the
    // expected behavior. The throw guarantees the test starts red
    // (satisfies TEST-RED-FIRST). Using toBe(undefined) would silently
    // pass for void or unimplemented functions.
    throw new Error(`TODO: replace with expect(result).toBe(EXPECTED). Got: ${JSON.stringify(result)}`);
  });
});
```

### Jest

```typescript
import { functionName } from '../path/to/module';

describe('functionName', () => {
  it('scenario_expected', () => {
    const result = functionName();
    // SCAFFOLD — see Vitest note above.
    throw new Error(`TODO: replace with expect(result).toBe(EXPECTED). Got: ${JSON.stringify(result)}`);
  });
});
```

**Rules for scaffold assertions**:
- The placeholder MUST be guaranteed to fail — never `toBe(undefined)`,
  `toBeTruthy`, or `toBeDefined`. A bare `throw` is the safest scaffold.
- Final assertion (after the developer replaces the throw): use `toBe`,
  `toEqual`, or `toStrictEqual` — pinning a specific expected value.
- Import the real function (no mocks in the skeleton).
- The test MUST fail on first run.
