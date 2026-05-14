# Result Check — Go Language Reference

**Language**: Go | **Loaded by**: result-check/SKILL.md
**RESULT-1 severity in Go**: WARN — Go's multi-return `(T, error)` already
satisfies the spirit of RESULT-1. Flag only `panic(...)` for domain failures.

---

## Idiomatic Pattern: `(T, error)`

```go
type OrderNotFound struct{ ID OrderID }
func (e *OrderNotFound) Error() string { return fmt.Sprintf("order %s not found", e.ID) }

func FindOrder(id OrderID) (Order, error) {
    o, ok := store[id]
    if !ok {
        return Order{}, &OrderNotFound{ID: id}
    }
    return o, nil
}

// Caller:
o, err := FindOrder(id)
if err != nil {
    var nfErr *OrderNotFound
    if errors.As(err, &nfErr) { ... }
    return err
}
```

This is the Go idiom and **satisfies RESULT-1**. The rule does *not* push
toward `Result[T, E]` types or generics-based alternatives.

---

## RESULT-1 Patterns to Flag (WARN — Go)

| Pattern | Concern |
|---|---|
| `panic(...)` for a domain failure | Use `(T, error)` |
| `panic("user not found")` | The same applies — must be a returned error |
| `log.Fatal(...)` for a domain condition | Reserved for genuine startup failures |

---

## Allowed Panics (Not RESULT-1)

| Pattern | Why allowed |
|---|---|
| `panic("unreachable")` in a `default` of an exhaustive type switch | Assertion of completeness |
| `panic` in `init()` for genuine boot-time configuration failure | Resource-level, not domain |
| `panic` in test helpers | Test-only |

---

## Typed Errors via Wrapping

Idiomatic Go uses sentinel errors plus `errors.Is` / `errors.As`:

```go
var (
    ErrOrderNotFound = errors.New("order not found")
    ErrInvalidAmount = errors.New("invalid amount")
)

func ProcessOrder(...) error {
    if amount <= 0 {
        return fmt.Errorf("processing order: %w", ErrInvalidAmount)
    }
    ...
}

// Caller:
if errors.Is(err, ErrInvalidAmount) { ... }
```

For richer error data, define an error struct (like `OrderNotFound{ID: ...}`
above) implementing `error`.

---

## `nil` for Not-Found (RESULT-2)

| Pattern | Note |
|---|---|
| `func Find(id) (*Order, error)` returning `(nil, nil)` for not-found | Confusing — pick one signal |
| `func Find(id) (*Order, error)` returning `(nil, ErrNotFound)` | Idiomatic — preferred |
| `func Find(id) (Order, bool)` (the comma-ok idiom) | Acceptable for cache/map lookups |

Returning `nil` from a pointer-returning function without an error is the
RESULT-2 anti-pattern in Go.

---

## Silently Swallowed Errors (RESULT-3)

```go
// FLAG:
result, err := work()
_ = err

// FLAG:
if err != nil {
    // do nothing
}

// PASS — explicit decision documented:
if err := invalidateCache(key); err != nil {
    // Cache invalidation is best-effort; downstream re-fetches will rebuild.
    log.Warn("cache invalidation failed", "key", key, "err", err)
}
```

Particularly nasty in Go because the `err != nil` check makes the swallow
*look* deliberate. Flag empty-body `if err != nil { }` aggressively.

---

## `errors.Is` and `errors.As` Discipline

Catch sites in shell must use `errors.Is` / `errors.As`, not `==` or
`reflect.TypeOf`. `errors.Is(err, ErrFoo)` is the correct pattern across
wrapping chains.

---

## Go-Specific Aids

| Aid | What it gives you |
|---|---|
| `errors.New` / `fmt.Errorf` with `%w` | Wrapping + idiomatic errors |
| `errors.Is` / `errors.As` | Typed checks across wrap chains |
| Custom error types implementing `Error() string` | Carry richer diagnostic data |
| `multierror` / `errgroup` for fan-out failures | Aggregated error returns |

---

## Tooling

| Tool | Rule |
|---|---|
| `errcheck` | Flags unchecked errors |
| `staticcheck` | `SA9003` (empty branch), `SA4006` (unused err value) |
| `errorlint` | Push toward `%w` wrapping and `errors.As` |
| `nilerr` | Catches `(nil, nil)` and `(value, nil)` confusion |
