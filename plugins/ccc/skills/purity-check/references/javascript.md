# Purity Check — JavaScript Language Reference

**Language**: JavaScript | **Loaded by**: purity-check/SKILL.md

JavaScript shares most patterns with TypeScript (see `typescript.md`). This
file lists the deltas specific to JS.

---

## Side-Effect Imports to Detect in `core/`

The TypeScript list applies verbatim. Additionally:

| Category | JS-specific patterns |
|---|---|
| Top-level `require()` | `const fs = require('fs')`, `const axios = require('axios')` — CJS equivalent of an ES import |
| Dynamic `import()` | `await import('fs')` — flag the same as static imports |
| Side-effecting top-level statements | `fs.readFileSync(...)` at module scope (not inside a function) |

---

## Clock / RNG / Logging Calls (PURE-1)

Same as TypeScript. JavaScript has no compile-time type system to mask these.

---

## Ambient State Reads (PURE-2)

Same as TypeScript. Additionally watch for browser globals when running in
isomorphic / Node-target code:
- `window.*` / `document.*` reads in code shared between server and client
- `localStorage` / `sessionStorage` reads from core
- `navigator.*` reads (user agent, geolocation, language)

---

## No Type-Only Import Escape Hatch

JavaScript has no `import type` syntax. JSDoc `@type` annotations:

```js
/** @type {import('express').Request} */    // ✅ pure — JSDoc only
const req = arg;

import { Router } from 'express';            // ❌ runtime import — PURE-1
```

Use JSDoc to reference shell types from core without bringing them into the
runtime graph.

---

## Mock-Required-to-Test Signal (PURE-3)

Same patterns as TypeScript: `vi.mock`, `jest.mock`, `sinon`, `nock`, `msw`,
`proxyquire`. Also watch for legacy patterns:
- `rewire` — module-internal replacement
- `mock-require` — top-level require override

---

## CommonJS-Specific Concerns

CommonJS allows mid-file `require()` calls and conditional imports. Detection
must handle:

```js
// Sometimes executed; still a PURE-1 violation if executed in core
function getDb() {
    return require('pg').Pool;        // ❌ flag
}

if (process.env.FEATURE) {
    require('./adapter');             // ❌ ambient + side-effect import
}
```

---

## Severity Calibration (JS-specific)

- Pragmatism: many JS codebases ship without strict layering. If `core/` does
  not exist and only legacy paths are detected, the conductor's layer detection
  decides which files are in scope. Don't fire PURE-1 on files outside the
  detected core layer.
- `console.log` for genuine debugging in scripts/CLIs is fine; flag it only in
  core modules consumed by other code.

---

## Tooling

| Tool | What to use it for |
|---|---|
| `eslint-plugin-functional` | Same rules as the TS table |
| `eslint-plugin-import` (`no-restricted-paths`) | Block shell paths from core |
| `@typescript-eslint` with `// @ts-check` + JSDoc | Optional type-checking for JS files |
