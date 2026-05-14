# Immutability Check — Rust Language Reference

**Language**: Rust | **Loaded by**: immutability-check/SKILL.md

Rust's borrow checker and `&mut` / `&` distinction enforce most of IMMUT-1
mechanically. The remaining concerns are stylistic: prefer owned `T` or
shared `&T` over `&mut T` when the operation can produce a new value.

---

## Mutation Idioms to Detect (IMMUT-1)

### `&mut` parameters that could be value-returning

| Pattern | Pure alternative |
|---|---|
| `fn apply(o: &mut Order, ...)` mutating fields | `fn apply(o: Order, ...) -> Order` returning a new value |
| `Vec::push(&mut self, x)` on a parameter | `[v, vec![x]].concat()` or rebuild via iterators |
| `Vec::sort(&mut self)` on a parameter | `let mut s = v.clone(); s.sort(); s` or chain iterators |
| `HashMap::insert(&mut self, k, v)` | rebuild with `iter().chain(once((k, v))).collect()` |

### In-place primitive mutation

`*x = y` where `x: &mut T` is the canonical mutation. In core, prefer the
value-returning style. The compiler will not catch the *opportunity* — it
only catches actual aliasing/borrow violations.

---

## Local Mutation Is Fine

```rust
fn sum(items: &[i32]) -> i32 {
    let mut total = 0;          // ✅ local mut
    for &x in items {
        total += x;
    }
    total
}

fn build(items: &[Item]) -> Result {
    let mut out = Vec::with_capacity(items.len());   // ✅ constructed inside
    for x in items {
        out.push(transform(x));
    }
    Result { items: out }
}
```

Idiomatic alternative using iterators:

```rust
fn build(items: &[Item]) -> Result {
    Result { items: items.iter().map(transform).collect() }
}
```

---

## Shared Mutable State Across Concurrency (IMMUT-2)

| Pattern | Concern |
|---|---|
| `static mut X: ...` | Requires `unsafe` to access — almost always wrong |
| `lazy_static!` / `Lazy<Mutex<T>>` global state | Legitimate when used for caches/registries; flag for review |
| Sharing `Rc<RefCell<T>>` across threads | Compile error in Rust — caught by `Send`/`Sync` bounds |
| `Arc<Mutex<T>>` / `Arc<RwLock<T>>` | Acceptable when synchronization is the explicit design |

The borrow checker prevents most data races; flag any `unsafe` block that
bypasses it and surfaces shared mutability.

---

## Field Reassignment After Construction (IMMUT-3)

Rust's struct literal syntax with all named fields is the canonical complete
construction. Reassignment patterns are unusual:

```rust
// FLAG (partial construction + reassignment):
let mut order = Order::default();
order.id = order_id;
order.customer = customer;

// PASS (complete construction):
let order = Order {
    id: order_id,
    customer,
    items,
    ..Default::default()  // remaining fields default; full struct still complete
};
```

`#[derive(Default)]` followed by field-by-field assignment is a strong
IMMUT-3 signal: the type wants a builder or a `new(...)` constructor.

---

## Rust-Specific Aids

| Aid | What it gives you |
|---|---|
| Default to `&T` over `&mut T` | Immutable by convention |
| Newtypes for value objects (`struct Money(u64)`) | No method surface for mutation |
| `derive_more` / `bon` builder macros | Complete-construction patterns |
| Iterator chains (`.map`, `.filter`, `.fold`) | Replace explicit `for` + mutation |

---

## Severity Calibration (Rust-specific)

- IMMUT-1 in Rust is the *least* common violation — the borrow checker forces
  explicit `&mut`, so mutation is never silent. Focus on style: prefer the
  value-returning function over the `&mut` mutator when both are reasonable.
- IMMUT-2 in Rust is structurally hard to introduce; `unsafe` + `static mut`
  is the main pathway and always deserves a hard look.

---

## Tooling

| Tool | Rule |
|---|---|
| `clippy::needless_collect` | Flags accumulator patterns that could be chained |
| `clippy::ptr_arg` | Push toward `&[T]` instead of `&Vec<T>` |
| `clippy::mutex_atomic` | Surfaces inefficient sync of single primitives |
