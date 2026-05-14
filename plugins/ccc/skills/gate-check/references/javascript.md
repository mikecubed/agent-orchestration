# Test Gate Language Reference — JavaScript

Loaded by `gate-check` when language = `javascript`.
Provides JavaScript-specific test framework defaults, file naming conventions,
and scaffold templates for the test gate (TEST-PINNED, TEST-RED-FIRST).

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

## TEST-PINNED: Test File Detection

Look for any of:
```
{module}.test.js
{module}.spec.js
{module}.test.mjs
__tests__/{module}.test.js
__tests__/{module}.spec.js
```

For each new exported function/class: confirm the test file imports it and
calls/constructs it.

---

## Coverage Configuration (c8 / Vitest)

`vitest.config.js` — set `test.coverage.provider` (`v8`), `test.coverage.thresholds` (statements/branches/functions/lines), and `test.coverage.exclude`.

---

## `@ts-check` Pragma

Adding `// @ts-check` at the top of a file enables TypeScript's type checker on
JavaScript. This is encouraged for all production JavaScript files.

---

## Non-Standard Framework Handling

If the project uses Mocha, Jasmine, AVA, or another framework:
- Apply TEST-PINNED and TEST-RED-FIRST language-agnostically
- Note the non-standard framework in the report without blocking
- Do NOT attempt to convert tests to Vitest/Jest

---

## Scaffold Patterns (`--scaffold-tests`)

### Vitest

```javascript
import { describe, it, expect } from 'vitest';
import { functionName } from '../path/to/module.js';

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

```javascript
const { functionName } = require('../path/to/module');

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
