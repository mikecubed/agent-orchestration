# Result Check — Rust Language Reference

**Language**: Rust | **Loaded by**: result-check/SKILL.md
**RESULT-1 severity in Rust**: BLOCK

Rust's `Result<T, E>` and `Option<T>` are the foundation of the language's
error story. `panic!`, `.unwrap()`, and `.expect()` are reserved for
genuinely unrecoverable or unreachable situations. Domain failures must
always be `Result<T, DomainError>`.

---

## Idiomatic Patterns

### `Result<T, E>` with `thiserror` enum

```rust
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ChargeError {
    #[error("invalid amount: {0}")]
    InvalidAmount(Money),
    #[error("insufficient funds")]
    InsufficientFunds,
    #[error("card declined")]
    CardDeclined,
}

pub fn charge(amount: Money, card: &Card) -> Result<Receipt, ChargeError> {
    if amount.value() <= 0 {
        return Err(ChargeError::InvalidAmount(amount));
    }
    if card.balance() < amount.value() {
        return Err(ChargeError::InsufficientFunds);
    }
    Ok(Receipt::new(amount, card))
}
```

### Propagation with `?`

```rust
pub fn process(req: Request) -> Result<Response, AppError> {
    let order = find_order(req.id)?;             // OrderNotFound → AppError via From
    let charged = charge(order.amount, &card)?;  // ChargeError → AppError via From
    Ok(Response::ok(charged))
}
```

`impl From<ChargeError> for AppError` lines convert variants between error
types as `?` propagates. No manual matching at every site.

### `anyhow::Error` for application-level boundaries

Acceptable in shell binaries / CLI entry points; not idiomatic in library
core code, which should expose a concrete error enum.

---

## RESULT-1 Patterns to Flag (BLOCK — Rust)

| Pattern | Concern |
|---|---|
| `panic!("order not found")` for a domain failure | Should be `Err(DomainError::NotFound)` |
| `.unwrap()` on a `Result` / `Option` from fallible logic | Convert to `?` propagation or explicit match |
| `.expect("...")` on the same | Same |
| `unreachable!()` reached by reasonable input | Not actually unreachable |

---

## Allowed Panics / Unwraps (Not RESULT-1)

| Pattern | Why allowed |
|---|---|
| `unreachable!()` in a `_` arm after exhaustive variant matches | Compiler-checked impossible |
| `.unwrap()` on a `const`-evaluated `Option` | Compile-time constant |
| `panic!` in `fn main()` of a one-shot script | CLI exit semantics |
| `.unwrap()` in `#[test]` functions / examples | Test-only |
| `expect("BUG: invariant X failed")` documenting an invariant the type system can't express | Genuine assertion |

---

## `Option<T>` for Not-Found (RESULT-2)

Rust has no `null`. The equivalent rule asks for the missing-value channel
to be in the signature:

```rust
// PASS — explicit Option:
pub fn find_order(id: OrderId) -> Option<Order> { ... }

// PASS — Result with NotFound variant:
pub fn find_order(id: OrderId) -> Result<Order, NotFoundError> { ... }

// FLAG — returns a default value on missing:
pub fn find_order(id: OrderId) -> Order {
    self.store.get(&id).cloned().unwrap_or_default()  // hides not-found
}
```

The third pattern silently treats "not found" as "empty default" — exactly
the bug RESULT-2 is designed to prevent.

---

## Silently Swallowed Errors (RESULT-3)

```rust
// FLAG:
let _ = invalidate_cache(key);

// FLAG:
if let Err(_) = invalidate_cache(key) { }

// FLAG:
match invalidate_cache(key) { Ok(_) => (), Err(_) => () }

// PASS — explicit with reason:
if let Err(e) = invalidate_cache(key) {
    // Cache invalidation is best-effort; downstream rebuild handles the miss.
    tracing::warn!(?key, error = ?e, "cache invalidation failed");
}
```

Particularly suspicious: `let _ = result;` discards. Sometimes legitimate
(returning `Result<(), Error>` from a writer that has already logged) but
usually a smell.

---

## Rust-Specific Aids

| Aid | What it gives you |
|---|---|
| `thiserror` derive | Boilerplate-free typed error enums |
| `anyhow` for shell/CLI binaries | Quick `?` chains with context |
| `Result` + `?` propagation | Mechanical error plumbing |
| `Option::ok_or(...)` / `Option::ok_or_else(...)` | Convert missing-value into typed error |
| `From` impls between error types | Smooth `?` across module boundaries |

---

## Tooling

| Tool | Rule |
|---|---|
| `clippy::unwrap_used` | Flag every `.unwrap()` in production code |
| `clippy::expect_used` | Same for `.expect(...)` |
| `clippy::panic` | Flag `panic!` outside expected contexts |
| `clippy::let_underscore_must_use` | Surface discarded `Result`s |
