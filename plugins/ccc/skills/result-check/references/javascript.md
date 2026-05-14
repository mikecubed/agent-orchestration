# Result Check — JavaScript Language Reference

**Language**: JavaScript | **Loaded by**: result-check/SKILL.md
**RESULT-1 severity in JS**: WARN — exceptions are conventional in JS.
Encourage typed `Error` subclasses; do not force `Result<T, E>` style.

---

## Acceptable Patterns

### Option A: Typed `Error` subclasses + explicit boundary catch

```js
class DomainError extends Error {}
class OrderNotFound extends DomainError {
    constructor(id) { super(`order ${id} not found`); this.id = id; }
}
class InvalidAmount extends DomainError {
    constructor(amount) { super(`invalid amount ${amount}`); this.amount = amount; }
}

function charge(amount, card) {
    if (amount <= 0) throw new InvalidAmount(amount);
    ...
}

// Caller at boundary:
try {
    const receipt = charge(amount, card);
} catch (e) {
    if (e instanceof InvalidAmount) return reject(e);
    throw e;
}
```

Idiomatic JS. Satisfies RESULT-1's spirit: typed, catchable, named.

### Option B: Discriminated objects (Result-style)

```js
function charge(amount, card) {
    if (amount <= 0) return { ok: false, error: 'InvalidAmount' };
    return { ok: true, value: receipt };
}
```

Acceptable in modern JS codebases — particularly when paired with JSDoc
`@typedef` for type-checker hints under `// @ts-check`.

---

## RESULT-1 Patterns to Flag (WARN — JS)

| Pattern | Concern |
|---|---|
| `throw new Error("string")` for a domain failure | Use a typed `Error` subclass |
| `throw "string"` (no `Error` wrapper) | Throw an `Error` object minimum |
| `throw 42` / `throw {...}` | Throw an `Error` |
| Promise rejections with raw strings | Same |

---

## Allowed Throws (Not RESULT-1)

| Pattern | Why allowed |
|---|---|
| `throw new Error("unreachable")` in switch defaults | Assertion |
| `throw` inside try-catch retry wrappers when re-raising | Idiomatic |

---

## `null` / `undefined` for Not-Found (RESULT-2)

JS conventions vary. The rule fires when:

- The function body returns `null` but JSDoc/return-type-hint says otherwise
- A function name like `findOrder` returns `null` without documentation
  saying it can; readers must consult the implementation

Recommend either:
- Consistent `undefined` returns with JSDoc `@returns {Order|undefined}`
- A discriminated-object return: `{ found: true, value } | { found: false }`

---

## Silently Swallowed Errors (RESULT-3)

```js
// FLAG:
try { await charge(...); } catch (e) {}

// FLAG:
promise.catch(() => {});

// FLAG:
.then(handle).catch(() => { /* swallow */ });

// PASS — explicit:
try {
    await invalidateCache(key);
} catch (e) {
    logger.warn({ key, err: e }, 'cache invalidation failed');
    // best-effort; downstream rebuilds
}
```

Watch for `Promise.allSettled` followed by ignoring rejected results in
core paths.

---

## JS-Specific Considerations

### `// @ts-check` with JSDoc

When a file has `// @ts-check`, JSDoc `@type`, `@param`, and `@returns`
annotations participate in TypeScript's type-checking. **`@throws` is
documentation-only** — neither TypeScript nor JavaScript has checked
exceptions, so `@throws` is never mechanically verified. Treat it as
human-facing docs, not as a type guarantee. The typed-error discipline
this skill encourages comes from `@returns` (and `@type` on internal
helpers) — not from `@throws`:

```js
// @ts-check
/**
 * @param {Money} amount
 * @param {Card} card
 * @returns {Receipt}    // ✅ participates in type-checking
 * @throws {InvalidAmount} when amount <= 0   // ⚠️ documentation only — not enforced
 */
function charge(amount, card) { ... }
```

For full typed-error enforcement in plain JS, use Option B above
(discriminated-object returns) — the `ok` field is type-checked, unlike
`@throws`.

### CommonJS error handling

Older CJS callbacks use the node-style `(err, result)` pattern. In modern
core code, prefer Promises with typed `Error` subclasses.

---

## Tooling

| Tool | Rule |
|---|---|
| `eslint` `no-throw-literal` | Enforce throwing `Error` instances |
| `eslint` `no-empty` (`allowEmptyCatch: false`) | RESULT-3 detection |
| `eslint-plugin-promise` | `catch-or-return`, `no-floating-promises` |
| `eslint-plugin-unicorn` `error-message`, `custom-error-definition` | Typed-error nudges |
