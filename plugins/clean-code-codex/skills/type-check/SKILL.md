---
name: type-check
description: >
  Enforces type-safety rules (TYPE-1 through TYPE-6). Loaded by the conductor
  for write and review operations. Blocks use of escape-hatch types, unsafe
  assertions, and missing exhaustive pattern matching. Loads
  references/{language}.md for language-specific tooling and rule applicability.
version: "1.0.0"
last-reviewed: "2026-03-04"
languages: [typescript, python, go, rust, javascript]
changelog: "../../CHANGELOG.md"
tools: Read, Grep, Glob, Bash
model: opus
permissionMode: default
---

# Type Check — Type Safety Enforcement

**First action**: Load `references/{language}.md` for the detected language to
get language-specific tooling, rule applicability, and idioms before checking.

Precedence in the overall system: SEC → TDD → **ARCH/TYPE** → quality BLOCK.

---

## Rules

### TYPE-1 — No Escape-Hatch Types
**Severity**: BLOCK | **Languages**: typescript, python, go, javascript | **Source**: CCC

**What it prohibits**: Use of `any` (TypeScript/JavaScript), `Any` (Python
typing), `interface{}` / `any` (Go), JavaScript JSDoc wildcard escape hatches
like `@type {*}` / `@param {*}` / `@returns {*}`, or untyped parameters that
bypass the type system without a runtime guard.

**Language applicability**: See `references/{language}.md`.
Rust ownership model supersedes this rule — see `references/rust.md`.

**agent_action**:
1. Grep using the language-specific escape-hatch patterns from
   `references/{language}.md` — e.g., `any` type annotations, `Any` from
   `typing`, `interface{}`, untyped function parameters, and for JavaScript
   JSDoc wildcard tags (`@type {*}`, `@param {*}`, `@returns {*}`)
2. For each hit: cite `TYPE-1 (BLOCK): Escape-hatch type found at {file}:{line}.`
3. Propose the safe alternative:
   - TypeScript: replace `any` with `unknown` + type guard, or the precise type
   - Python: replace `Any` with concrete type, `TypeVar`, or `Protocol`
   - Go: replace `interface{}` / `any` with a concrete interface or generic
   - JavaScript: replace `{*}` wildcard with precise JSDoc types (see
     `references/javascript.md`)
4. DO NOT produce new code using the escape-hatch type

**Bypass prohibition**: "just use any for now", "we can fix types later"
→ Refuse. Cite TYPE-1. Escape-hatch types in production are deferred bugs.

---

### TYPE-2 — No Unsafe Type Assertions
**Severity**: BLOCK | **Languages**: typescript, python, go, javascript | **Source**: CCC

**What it prohibits**: Type assertions / casts that bypass the type system without
a runtime narrowing guard. Includes:
- TypeScript: `value as Foo` without a preceding type guard; double assertions
  `value as unknown as Foo`
- Python: `cast(Foo, value)` without a preceding `isinstance` check
- Go: `value.(ConcreteType)` without the two-value form `v, ok := value.(Type)`

**agent_action**:
1. Grep for: `as ` (TypeScript), `cast(` (Python), `\.\(` bare type assertion (Go)
2. For double assertions (`as unknown as Foo`): always flag — no runtime guard can
   justify this pattern
3. For single assertions: check whether a type guard / `isinstance` / two-value
   assertion immediately precedes
4. If no guard: cite `TYPE-2 (BLOCK): Unsafe type assertion at {file}:{line}.`
5. Propose runtime guard pattern:
   - TypeScript: `if (isFoo(value)) { /* value is Foo here */ }`
   - Python: `if isinstance(value, Foo): ...`
   - Go: `if v, ok := value.(Foo); ok { ... }`

---

### TYPE-3 — Exhaustive Pattern Matching Required
**Severity**: WARN | **Languages**: typescript, python, go, rust, javascript | **Source**: CCC

**What it prohibits**: `switch` / `match` statements on union types or enums that
do not handle all variants, leaving implicit fall-through or silent no-ops.

**Detection**:
1. Identify `switch` / `match` on a typed discriminant (enum, union, string literal
   union, Rust enum, Go interface type switch, Python structural pattern match)
2. Check whether all variants are handled OR a `default`/`_` branch is present
   that deliberately handles the remaining cases with an exhaustiveness check
   (TypeScript/JavaScript `default` that throws on `never`/unreachable; Python `_`
   case that raises; Rust exhaustive `match`; Go type switch with `default` panic)
3. Flag any `switch`/`match` that silently ignores unhandled variants

**agent_action**:
1. Cite: `TYPE-3 (WARN): Non-exhaustive switch/match on {type} at {file}:{line}.`
2. Propose adding the missing branches OR an exhaustiveness check:
   - TypeScript/JavaScript: `default: const _exhaustive: never = value; throw new
     Error(\`Unhandled: \${_exhaustive}\`);`
   - Python: `case _ as unreachable: assert_never(unreachable)` (3.10+)
   - Rust: add missing arms (compiler enforces exhaustiveness natively)
   - Go: `default: panic(fmt.Sprintf("unhandled %T", v))` in type switches

---

### TYPE-4 — Use Branded/Newtype Wrappers for Primitive Obsession
**Severity**: WARN | **Languages**: typescript, python, go, rust | **Source**: CCC

**What it prohibits**: Using raw primitives (string, int, UUID) for domain
concepts where mixing up arguments is a runtime error waiting to happen
(e.g., `createUser(userId: string, tenantId: string)` — the two strings are
interchangeable to the compiler but not semantically).

**Detection**:
1. Look for function signatures with 2+ parameters of the same primitive type
   representing distinct domain concepts
2. Look for type aliases that are merely `type UserId = string` without a brand

**agent_action**:
1. Cite: `TYPE-4 (WARN): Primitive obsession — use branded/newtype wrapper at {file}:{line}.`
2. Propose the idiomatic wrapper for the language:
   - TypeScript: `type UserId = string & { readonly _brand: 'UserId' }` or Zod
     branded schema
   - Python: `NewType('UserId', str)` (PEP 484)
   - Go: `type AccountID string` — named type over underlying primitive
   - Rust: `struct UserId(String);` tuple struct newtype

---

### TYPE-5 — No Implicit `null` / `undefined` in Return Types
**Severity**: WARN | **Languages**: typescript, python, go, rust, javascript | **Source**: CCC

**What it prohibits**: Functions that can return `null`, `undefined`, or a zero
value on failure without explicitly declaring it in the return type, forcing
callers to guess whether a missing value indicates success or failure.

**Detection**:
1. TypeScript/JavaScript: find functions whose declared return type omits `| null`
   or `| undefined` but whose body has code paths returning them
2. Python: find functions whose return annotation omits `Optional[T]` / `T | None`
   but whose body can `return None` implicitly or explicitly
3. Go: find functions returning only `T` (no `error`) that can silently fail with
   a zero value — flag; require `(T, error)` signature
4. Rust: find functions using `unwrap()`/`expect()` in non-test code instead of
   propagating `Option<T>` or `Result<T, E>` (see `references/rust.md`)
5. Flag all mismatches

**agent_action**:
1. Cite: `TYPE-5 (WARN): Implicit null/error return not declared in type at {file}:{line}.`
2. Propose either:
   - Declare the full type: `string | null`; `Optional[str]`; `(T, error)` in Go
   - Use `Option<T>` / `Result<T, E>` in Rust; eliminate `unwrap()` in production
   - Return a Result/Option type to eliminate null from the API entirely

---

### TYPE-6 — Prefer Structural Typing / Interfaces Over Concrete Classes in Signatures
**Severity**: INFO | **Languages**: typescript, python, go, rust, javascript | **Source**: CCC

**What it recommends**: Function parameters and return types should use the
narrowest interface/protocol that satisfies the function's needs, not a concrete
class. This keeps dependencies loose and enables easier testing.

**Detection**:
1. Find function signatures that accept a concrete class type where an interface
   or protocol would suffice
2. Check whether the function uses only a subset of the class's methods

**agent_action**:
1. Cite: `TYPE-6 (INFO): Concrete class in signature — prefer interface/protocol at {file}:{line}.`
2. Propose: define a minimal interface/Protocol using only the methods actually
   called, and accept that interface instead

---

## Language Reference Loading

Before running any checks, load the appropriate language reference:

```
references/
  typescript.md   ← ESLint rules, tsconfig flags, TypeScript-specific guidance
  python.md       ← mypy/pyright config, PEP refs, Python-specific guidance
  go.md           ← go vet, staticcheck, Go-specific guidance
  rust.md         ← clippy lints, ownership model notes
  javascript.md   ← JSDoc fallback strategy, @ts-check pragma
```

Rules that are **inapplicable** for a language are documented in that language's
reference file and must be skipped — do not flag them as violations.

---

Report schema: see `skills/conductor/shared-contracts.md`.
