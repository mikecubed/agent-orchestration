# Immutability Check — TypeScript Language Reference

**Language**: TypeScript | **Loaded by**: immutability-check/SKILL.md

---

## Mutation Idioms to Detect (IMMUT-1)

### Array mutation methods

| Method | Behavior | Pure alternative |
|---|---|---|
| `.push(x)` | mutates in place | `[...arr, x]` |
| `.unshift(x)` | mutates in place | `[x, ...arr]` |
| `.pop()` / `.shift()` | mutates in place | `arr.slice(0, -1)` / `arr.slice(1)` |
| `.splice(...)` | mutates in place | `arr.toSpliced(...)` (ES2023) or `[...arr.slice(0,i), x, ...arr.slice(i+1)]` |
| `.sort()` / `.reverse()` | mutates in place | `arr.toSorted()` / `arr.toReversed()` (ES2023), or `[...arr].sort()` |
| `.fill()` / `.copyWithin()` | mutates in place | reconstruct with `.map` |

### Object mutation

| Pattern | Pure alternative |
|---|---|
| `obj.prop = x` (on parameter) | `{ ...obj, prop: x }` |
| `Object.assign(target, source)` where `target` is a parameter | `{ ...target, ...source }` |
| `delete obj.prop` (on parameter) | destructure: `const { prop: _, ...rest } = obj` |

### Map / Set mutation

| Method | Alternative |
|---|---|
| `map.set(k, v)` on a parameter | `new Map([...map, [k, v]])` |
| `set.add(x)` on a parameter | `new Set([...set, x])` |
| `map.delete(k)` | `new Map([...map].filter(([key]) => key !== k))` |

---

## Local Mutation Is Fine

A `let acc = 0` updated inside the same function and returned at the end is
**not** flagged. Local-only mutation of values *constructed inside the function*
is allowed:

```ts
function sum(items: number[]): number {
    let total = 0;                  // ✅ local mutation
    for (const x of items) total += x;
    return total;
}
```

```ts
function buildResult(items: Item[]): Result {
    const out: Item[] = [];          // ✅ constructed inside, never escapes a caller's reference
    for (const x of items) out.push(transform(x));
    return { items: out };
}
```

---

## Shared Mutable State Across Concurrency (IMMUT-2)

| Pattern | Concern |
|---|---|
| Module-level `let cache = new Map()` mutated by exported functions | racy in worker threads / async contexts |
| `globalThis.x = ...` | global mutation; almost always wrong |
| Class fields holding mutable state accessed from multiple `await` paths | observable race in async workflows |

`const FROZEN = Object.freeze({...})` and TypeScript `as const` literals are
safe.

---

## Field Reassignment After Construction (IMMUT-3)

```ts
// FLAG (partial construction + reassignment):
const order = new Order();
order.id = orderId;
order.customer = customer;

// PASS (complete construction):
const order = new Order({ id: orderId, customer, items });
```

`readonly` fields make IMMUT-3 a compile error — promote class fields to
`readonly` whenever the construction is intended to be complete.

---

## TypeScript-Specific Aids

| Aid | What it gives you |
|---|---|
| `readonly T[]` / `ReadonlyArray<T>` parameters | Caller cannot `.push` on the value |
| `Readonly<T>` / `DeepReadonly<T>` | Marks objects immutable at the type level |
| `as const` literals | Frozen tuples / record literals |
| `Object.freeze()` | Runtime guarantee for value objects |

---

## Tooling

| Tool | Rule |
|---|---|
| `eslint-plugin-functional` | `no-mutation`, `prefer-readonly-type`, `no-let` |
| `@typescript-eslint/no-unused-expressions` | Adjacent class hygiene |
