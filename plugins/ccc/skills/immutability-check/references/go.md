# Immutability Check — Go Language Reference

**Language**: Go | **Loaded by**: immutability-check/SKILL.md

Go's design embraces controlled mutation: slices, maps, and pointer receivers
all expose mutation by default. The rule for IMMUT-1 is therefore narrower:
the function's contract must not silently mutate values the caller did not
intend to be mutated.

---

## Mutation Idioms to Detect (IMMUT-1)

### Slice mutation through parameters

| Pattern | Concern |
|---|---|
| `append(s, x)` where the result is discarded | confusing — `append` may or may not mutate the backing array depending on capacity |
| `s[i] = x` on a parameter slice | mutates the caller's backing array |
| `sort.Slice(s, ...)` on a parameter | mutates the caller's slice in place |
| `copy(dst, src)` where `dst` is a parameter | mutates caller's data — usually intended, but verify |

### Map mutation through parameters

| Pattern | Concern |
|---|---|
| `m[k] = v` on a parameter map | mutates caller's map (maps are reference-typed) |
| `delete(m, k)` on a parameter map | same |

### Pointer receivers vs value receivers

| Pattern | Semantics |
|---|---|
| `func (o *Order) Apply(...)` modifying fields | Mutates the receiver — caller-visible. Allowed only when the caller demonstrably owns the pointer. |
| `func (o Order) Apply(...) Order` returning a new value | Pure — preferred for value-object semantics |

A core type that's only ever a value receiver gives you immutable-by-default
semantics for free.

---

## Local Mutation Is Fine

```go
func sum(items []int) int {
    total := 0           // ✅ local
    for _, x := range items {
        total += x
    }
    return total
}

func build(items []Item) Result {
    out := make([]Item, 0, len(items))   // ✅ constructed inside
    for _, x := range items {
        out = append(out, transform(x))
    }
    return Result{Items: out}
}
```

---

## Shared Mutable State Across Concurrency (IMMUT-2)

| Pattern | Concern |
|---|---|
| Package-level `var counter int` mutated by exported funcs | race under goroutines |
| Package-level maps without `sync.Mutex` | race under goroutines |
| Singleton state (`sync.Once`-initialized mutable state) | acceptable if mutation is bounded; flag if mutation continues |

`const`, `sync.Once`-initialized immutable values, and package-level `var
errFoo = errors.New(...)` sentinels are safe.

---

## Field Reassignment After Construction (IMMUT-3)

```go
// FLAG:
o := &Order{}
o.ID = orderID
o.Customer = customer

// PASS:
o := Order{ID: orderID, Customer: customer, Items: items}
```

Go's struct literal with named fields is the natural complete-construction
pattern. Constructors returning `(Order, error)` or `(*Order, error)` should
return a fully initialized value.

---

## Go-Specific Aids

| Aid | What it gives you |
|---|---|
| Value receivers (`func (o Order)`) | Immutability of receiver |
| Returning new values instead of mutating | Idiomatic for value objects |
| `sync.Mutex` / `sync.RWMutex` | Explicit guards for legitimate shared state |
| `atomic.Value` | Lock-free swap of immutable pointers |

---

## Severity Calibration (Go-specific)

The standard library is full of in-place mutation APIs (`sort.Slice`,
`append`). Idiomatic Go code does mutate — the rule is *cross-boundary*
silent mutation, not Go's mutable-by-default style.

- Flag IMMUT-1 only when a function modifies a parameter and does not
  document the mutation in its name or doc comment (e.g., `func Sort(s []int)`
  is acceptable because the verb `Sort` advertises the mutation).
- Do not flag in-method mutation of struct fields when the method is a
  pointer-receiver method and the type is clearly built for mutation
  (builders, accumulators, scanners).

---

## Tooling

| Tool | Rule |
|---|---|
| `staticcheck` | `SA4006` (unused values from `append`) |
| `govet -copylocks` | Catches copy-of-lock anti-patterns |
| `go-critic` | `paramTypeCombine`, `appendAssign` lint rules |
