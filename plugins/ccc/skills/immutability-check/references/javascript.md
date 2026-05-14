# Immutability Check — JavaScript Language Reference

**Language**: JavaScript | **Loaded by**: immutability-check/SKILL.md

JavaScript shares almost every mutation idiom with TypeScript (see
`typescript.md`). This file lists the deltas specific to JS.

---

## Mutation Idioms to Detect (IMMUT-1)

The TypeScript array / object / Map / Set tables apply verbatim:
- `.push`, `.pop`, `.shift`, `.unshift`, `.splice`, `.sort`, `.reverse`,
  `.fill`, `.copyWithin` on parameters → flag
- `obj.prop = x` on parameter → flag
- `Object.assign(target, source)` with `target` as parameter → flag
- `map.set(k, v)` / `set.add(x)` on parameter → flag

ES2023 immutable counterparts (`toSpliced`, `toSorted`, `toReversed`) are
available in modern runtimes; recommend them in the fix.

---

## JS-Specific Considerations

### No compile-time `readonly`

TypeScript's `readonly` / `ReadonlyArray<T>` types do not exist in JS. The
runtime safeguards are:

| Safeguard | Use |
|---|---|
| `Object.freeze(x)` | Shallow freeze — `x.prop = ...` silently fails or throws in strict mode |
| Frozen factory functions | Return `Object.freeze({...})` for value objects |
| `Map` / `Set` instead of plain objects | When immutability is critical, switch to immutable libs (Immutable.js, Immer) |
| JSDoc `@readonly` annotation | Type-checker hint when `// @ts-check` is enabled |

### Prototype mutation

JS-only anti-pattern not present in TS:

```js
Array.prototype.shuffle = function () { ... };   // ❌ mutates a built-in
Object.prototype.foo = ...;                       // ❌ pollutes all objects
```

Flag any direct mutation of `*.prototype` in core code as IMMUT-2 (it's
global mutable state).

---

## Field Reassignment After Construction (IMMUT-3)

Same as TypeScript — flag partial construction followed by field assignment.
Without `readonly`, the only enforcement is runtime via `Object.freeze`:

```js
// PASS:
const order = Object.freeze({ id, customer, items });
```

---

## Severity Calibration (JS-specific)

- Pragmatism: many JS codebases rely on mutation. Apply IMMUT-1 only to
  files in the detected core layer.
- React component code (legitimate in shell, not core) uses controlled
  mutation (`useState` setters) — don't flag setter calls as IMMUT-1; they
  are framework-mandated.

---

## Tooling

| Tool | Rule |
|---|---|
| `eslint-plugin-functional` | Same rules as TS |
| `eslint-plugin-immutable` | Older alternative |
| `prettier` + `eslint --fix` | Apply auto-suggestable rewrites |
