# Type Check — JavaScript Language Reference

**Language**: JavaScript | **Loaded by**: type-check/SKILL.md

---

## Rule Applicability

JavaScript has no native static type system. TYPE rules apply in a reduced form
using JSDoc annotations and the `@ts-check` pragma to provide type safety via
the TypeScript language server without a compilation step.

| Rule   | Status             | Notes                                                         |
|--------|--------------------|---------------------------------------------------------------|
| TYPE-1 | ⚠️ ADAPTED          | No `any` keyword; JSDoc `@type {*}` is the equivalent — flag  |
| TYPE-2 | ⚠️ SUPERSEDED       | No `as` assertions in JS; JSDoc `@type` cast is the concern   |
| TYPE-3 | ✅ ACTIVE            | Switch exhaustiveness enforceable via JSDoc + `@ts-check`     |
| TYPE-4 | ⚠️ LIMITED           | JSDoc `@typedef` for branded-like types; no compile-time check |
| TYPE-5 | ✅ ACTIVE (adapted) | JSDoc `@returns {T|null}` must be explicit                    |
| TYPE-6 | ✅ ACTIVE (adapted) | JSDoc `@param {InterfaceName}` for structural typing           |

---

## Baseline: Enable `@ts-check`

Every JavaScript file in a project should begin with `// @ts-check`.

`jsconfig.json` (project root) — set `checkJs: true`, `strict: true`, `noImplicitAny: true`, `strictNullChecks: true`, `include: ["src/**/*.js"]`.

---

## TYPE-1 (Adapted): `@type {*}` Is the `any` Equivalent

Flag any `@type {*}`, `@param {*}`, or `@returns {*}` annotation.

---

## TYPE-2 (Superseded): JSDoc Type Assertions

JavaScript has no `as` keyword. The nearest equivalent is a JSDoc cast:

TYPE-2 is largely superseded in JavaScript, but flag bare JSDoc casts
(`/** @type {X} */ (value)`) that appear without a preceding runtime guard.

---

## TYPE-3: Exhaustive Switch

Use `/** @type {never} */ const unreachable = status` in the `default` branch.
With `@ts-check` + `jsconfig.json` (strict), this causes a type error if any union member is unhandled.

---

## TYPE-4 (Limited): `@typedef` for Semantic Types

Use `@typedef` aliases to signal intent. For stricter runtime enforcement, use Zod brands: `z.string().brand('AccountId')`.

---

## TYPE-5: Explicit `@returns` Including `null`

Declare `@returns {User|null}` explicitly. With `strictNullChecks`, omitting `null` from the annotation while returning `null` causes a type error.

---

## TYPE-6: `@param` With Interface Shapes

Use `@typedef {Object}` to define an interface shape, then reference it in `@param {InterfaceName}` annotations.

---

## JSDoc Requirement

Because JavaScript lacks a type system, **all exported functions and classes
MUST have JSDoc annotations** as a TYPE-1 substitute. The minimum requirement is:

- `@param {Type} name` for every parameter
- `@returns {Type}` for every non-void function
- `@typedef` or imported types for complex shapes

Files missing JSDoc on exported symbols should be flagged as TYPE-1 (BLOCK) with
the message: "JavaScript file lacks JSDoc annotations — required as type-system
substitute."

---

## Tooling Summary

| Tool              | Purpose                                  | Config                   |
|-------------------|------------------------------------------|--------------------------|
| `@ts-check` pragma | Per-file TypeScript type checking        | Top of every `.js` file  |
| `jsconfig.json`   | Project-wide JS type checking config     | Project root             |
| ESLint `jsdoc`    | Enforce JSDoc presence and correctness   | `eslint-plugin-jsdoc`    |
| Zod / Valibot     | Runtime schema + brand validation        | —                        |
