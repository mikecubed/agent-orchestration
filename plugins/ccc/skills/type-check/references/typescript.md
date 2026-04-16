# Type Check — TypeScript Language Reference

**Language**: TypeScript | **Loaded by**: type-check/SKILL.md

---

## Rule Applicability

| Rule   | Status       | Notes                                                      |
|--------|--------------|------------------------------------------------------------|
| TYPE-1 | ✅ ACTIVE     | `any` is the primary escape hatch; use `unknown`           |
| TYPE-2 | ✅ ACTIVE     | `as X` assertions; double `as unknown as X` always BLOCK   |
| TYPE-3 | ✅ ACTIVE     | Use `never` exhaustiveness check in `default` branch       |
| TYPE-4 | ✅ ACTIVE     | Branded types via intersection: `string & { _brand: 'X' }` |
| TYPE-5 | ✅ ACTIVE     | Declare `T | null` or `T | undefined` explicitly           |
| TYPE-6 | ✅ ACTIVE     | Prefer interfaces/type aliases over concrete class refs    |

---

## TYPE-1: `any` → `unknown`

**Detection patterns** (grep):
```
: any
as any
: any[]
Array<any>
Promise<any>
```

**Safe alternatives**: use `unknown` + type guard, a precise type, or Zod/Valibot for external input.

**ESLint rules to enable**:
- `@typescript-eslint/no-explicit-any` — flags `any` usage
- `@typescript-eslint/no-unsafe-assignment`
- `@typescript-eslint/no-unsafe-member-access`
- `@typescript-eslint/no-unsafe-call`
- `@typescript-eslint/no-unsafe-return`
- `@typescript-eslint/no-unsafe-argument`

**tsconfig flags**:
- `"strict": true` (enables `noImplicitAny`)
- `"noUncheckedIndexedAccess": true` — array index returns `T | undefined`

---

## TYPE-2: Unsafe Assertions

**Detection patterns** (grep):
```
as unknown as
) as
value as
```

**Patterns to flag**: double assertion `as unknown as X` (always BLOCK); single `as X` without preceding type guard.
Use `satisfies` operator (TS 4.9+) to validate shape without widening.

---

## TYPE-3: Exhaustiveness

Use a `default` branch with `const _exhaustive: never = s` — TypeScript compile error if a union member is unhandled.

---

## TYPE-4: Branded Types

Use intersection type: `type UserId = string & { readonly _brand: 'UserId' }`. Different brands are not assignable to each other — compile-time safety.
For runtime validation + branding use Zod: `z.string().brand<'AccountId'>()`.

---

## TYPE-5: Explicit Null Returns

**tsconfig flag**: `"strictNullChecks": true` (included in `"strict": true`).

Declare `T | null` or use a `Result<T, E>` type to eliminate null from the surface.

---

## TYPE-6: Interface Over Class

Use TypeScript's structural typing — define an interface for the dependency, not a concrete class.
You don't need `implements`; the interface is satisfied automatically if the shape matches.

---

## Tooling Summary

| Tool          | Purpose                             | Config                      |
|---------------|-------------------------------------|-----------------------------|
| `tsc`         | Primary type checker                | `tsconfig.json`             |
| ESLint        | `@typescript-eslint` rule set       | `.eslintrc` / `eslint.config.js` |
| Zod / Valibot | Runtime schema validation           | —                           |
| `ts-prune`    | Detect unused exports (TYPE-6 aid)  | —                           |
