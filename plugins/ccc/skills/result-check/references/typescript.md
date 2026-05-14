# Result Check — TypeScript Language Reference

**Language**: TypeScript | **Loaded by**: result-check/SKILL.md
**RESULT-1 severity in TS**: BLOCK

TypeScript's structural type system makes typed-error patterns ergonomic.
`Result<T, E>`, discriminated unions, and `Option<T>` are all first-class.
There is no excuse for hiding a domain failure in a thrown exception in core.

---

## Idiomatic Typed-Error Patterns

### Option A: `neverthrow`

```ts
import { Result, ok, err } from 'neverthrow';

type ChargeError = 'CardDeclined' | 'InsufficientFunds' | 'InvalidAmount';

function charge(amount: Money, card: Card): Result<Receipt, ChargeError> {
    if (amount.value <= 0) return err('InvalidAmount');
    if (card.balance < amount.value) return err('InsufficientFunds');
    return ok({ id: newId(), amount, card });
}

// Caller:
charge(amount, card).match(
    receipt => log('ok', receipt),
    error => log('err', error),
);
```

### Option B: hand-rolled discriminated union

```ts
type Result<T, E> =
    | { ok: true; value: T }
    | { ok: false; error: E };

function charge(amount: Money, card: Card): Result<Receipt, ChargeError> {
    if (amount.value <= 0) return { ok: false, error: 'InvalidAmount' };
    return { ok: true, value: receipt };
}

// Caller (TypeScript narrows by `ok`):
const r = charge(amount, card);
if (r.ok) {
    use(r.value);
} else {
    handle(r.error);
}
```

### Option C: `ts-results` / `effect-ts`

`ts-results-es` and the `Effect` library both provide `Ok`/`Err` types with
combinator APIs. Either is acceptable; pick one per codebase.

---

## Domain Failures (Flag in Core)

| Pattern | Concern |
|---|---|
| `throw new Error('Order not found')` in core | Should be `Result<Order, NotFound>` |
| `throw new ValidationError(...)` from core function | Should be `Result<T, ValidationError>` |
| `throw new ForbiddenError(...)` | Should be in the return type |
| Catching `Error` in shell and re-narrowing | Indicates core was throwing untyped errors |

---

## Allowed Throws (Not RESULT-1)

| Pattern | Why allowed |
|---|---|
| `throw new Error('unreachable')` in a `default` of an exhaustive switch | Encodes an impossible state — assertion, not a domain failure |
| `assertNever(x: never): never { throw ...; }` | Type-system completeness check |
| `throw` inside utility code for genuinely unrecoverable conditions (OOM) | Resource failure, not domain failure |

---

## `null` / `undefined` for Not-Found (RESULT-2)

```ts
// FLAG:
function findOrder(id: OrderId): Order | null { ... }

// PASS — explicit Option type:
function findOrder(id: OrderId): Result<Order, NotFound> { ... }

// ACCEPTABLE — if the convention is consistent throughout the codebase:
function findOrder(id: OrderId): Order | undefined { ... }
```

`undefined` *as the signature* is acceptable if the codebase consistently
uses it; the rule fires when the function body returns `null` but the
signature doesn't say so.

---

## Silently Swallowed Errors (RESULT-3)

```ts
// FLAG:
try { await charge(...); } catch (e) { /* ignored */ }

// FLAG:
try { ... } catch { }

// PASS — explicit decision documented:
try {
    await invalidateCache(key);
} catch (e) {
    // Cache invalidation is best-effort — caller already committed the write.
    logger.warn({ key, err: e }, 'cache invalidation failed');
}
```

`Promise.allSettled` followed by ignoring `rejected` results is RESULT-3 if
core; legitimate in shell when intentional.

---

## TypeScript-Specific Aids

| Aid | What it gives you |
|---|---|
| Discriminated unions on `kind` / `tag` / `ok` | Type-narrowing without instanceof |
| `as const` literals for error tags | Strong typing without enums |
| `noUncheckedIndexedAccess: true` | Returns `T | undefined` from array index |
| `exhaustiveCheck(x: never)` helper | Compile-time enforcement of all variants handled |

---

## Tooling

| Tool | Rule |
|---|---|
| `eslint-plugin-functional` | `no-throw-statements` (strict) |
| `@typescript-eslint/no-throw-literal` | At minimum, throw `Error` subclasses |
| `eslint-plugin-neverthrow` | Surfaces unhandled `Result` returns |
