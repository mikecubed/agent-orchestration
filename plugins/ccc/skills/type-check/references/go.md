# Type Check — Go Language Reference

**Language**: Go | **Loaded by**: type-check/SKILL.md

---

## Rule Applicability

| Rule   | Status             | Notes                                                            |
|--------|--------------------|------------------------------------------------------------------|
| TYPE-1 | ✅ ACTIVE           | `interface{}` / `any` (Go 1.18+) usage without type switch       |
| TYPE-2 | ✅ ACTIVE           | Bare type assertion `v.(T)` without comma-ok form                |
| TYPE-3 | ✅ ACTIVE           | Type switches missing cases; `iota` enum switches                |
| TYPE-4 | ⚠️ LIMITED          | Distinct named types serve as newtypes; apply where meaningful   |
| TYPE-5 | ✅ ACTIVE           | Functions returning `(T, error)` vs silent zero-value returns    |
| TYPE-6 | ✅ ACTIVE (default) | Go interfaces are structural — this is the idiomatic default     |

---

## TYPE-1: `interface{}` / `any`

Go's `interface{}` (and the `any` alias introduced in Go 1.18) is the primary
escape hatch. Avoid it except at serialisation/deserialisation boundaries.

**Detection patterns** (grep):
```
interface\{\}
\bany\b
map\[string\]interface\{\}
map\[string\]any
\[\]interface\{\}
\[\]any
```

**Safe alternatives**: use a concrete type, a defined interface, generics (Go 1.18+), or the boundary pattern (deserialise to `map[string]any` then immediately convert to a typed struct).

**go vet** / **staticcheck** rules:
- `SA1006` — `Printf` with args but no format directives
- Use `golangci-lint` with `gocritic`, `revive` for broader coverage

---

## TYPE-2: Safe Type Assertions (Comma-OK Form)

Always use the comma-ok form: `user, ok := val.(AdminUser)`. Flag any assertion without `ok` outside of tests.
For multiple types, use a type switch with a `default` case that returns an error.

---

## TYPE-3: Exhaustive Type Switches

Always include a `default` case that panics or returns an error. For interface type switches, always include a `default` case that logs or errors.

---

## TYPE-4: Named Types as Newtypes

Use `type AccountID string` etc. Assignments between distinct named types require explicit conversion — compile-time safety. Apply where domain concepts are distinct and confusion would be a bug.

---

## TYPE-5: Explicit Error Returns (No Silent Failures)

Flag functions that can fail but return only `T` with a zero value on failure. Always use `(T, error)` or a sentinel error for not-found. Callers must be able to distinguish success from failure.

---

## TYPE-6: Interface Satisfaction (Structural Typing)

Go interfaces are structural — TYPE-6 should almost never be raised. Flag only when a function parameter uses a concrete struct pointer where an interface would decouple the code.
Interfaces in Go should be defined in the **consumer** package (Go proverb: "Accept interfaces, return structs").

---

## Tooling Summary

| Tool               | Purpose                             | Config                          |
|--------------------|-------------------------------------|---------------------------------|
| `go vet`           | Built-in static analysis            | `go vet ./...`                  |
| `staticcheck`      | Extended static analysis            | `staticcheck ./...`             |
| `golangci-lint`    | Aggregated linter runner            | `.golangci.yml`                 |
| `errcheck`         | Unchecked error returns             | via golangci-lint               |
| `gocritic`         | Code style and anti-patterns        | via golangci-lint               |
| `revive`           | Configurable Go linter              | via golangci-lint               |
