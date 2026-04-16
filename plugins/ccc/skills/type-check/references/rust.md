# Type Check — Rust Language Reference

**Language**: Rust | **Loaded by**: type-check/SKILL.md

---

## Rule Applicability

| Rule   | Status         | Notes                                                              |
|--------|----------------|--------------------------------------------------------------------|
| TYPE-1 | ⚠️ SUPERSEDED   | Rust's ownership + type system eliminates the need; see below      |
| TYPE-2 | ⚠️ SUPERSEDED   | No unsafe casts in safe Rust; `unsafe` blocks covered separately   |
| TYPE-3 | ✅ ACTIVE        | Rust `match` is exhaustive by default — flag `_` wildcard overuse  |
| TYPE-4 | ✅ ACTIVE        | Newtype pattern is idiomatic Rust — enforce it                     |
| TYPE-5 | ✅ ACTIVE (adapted) | `Option<T>` / `Result<T, E>` must be used; no unwrap in prod   |
| TYPE-6 | ✅ ACTIVE        | `dyn Trait` vs generics guidance                                   |

---

## TYPE-1 & TYPE-2 — Superseded by Rust's Type System

Rust's ownership model, borrowing rules, and type system prevent the class of
errors that TYPE-1 and TYPE-2 address in other languages:

- There is no `any` escape hatch in safe Rust code
- Type casting in safe Rust is limited to `as` for numeric widening/truncation
  (flag if lossy: `u64 as u8` silently truncates)
- `std::mem::transmute` and raw pointer casts require `unsafe` blocks

**What to flag instead**:
1. `unsafe` blocks that perform arbitrary transmutes — flag and require comment justification
2. `as` casts that truncate (e.g., `u64 as u8`) — flag; use `try_from()` instead
3. `unwrap()` and `expect()` in non-test code — flag as TYPE-5 violation (see below)

---

## TYPE-3: Exhaustive `match`

Rust compiler enforces exhaustive `match`. TYPE-3 applies as: flag wildcard `_` arms on enums defined in the same codebase — they silently swallow new variants. Wildcard is acceptable for external/FFI enums.

---

## TYPE-4: Newtype Pattern (Idiomatic Rust)

Use `struct AccountId(String)` newtypes. Zero runtime cost. Enforce for IDs, units of measure, and validated strings.
**Clippy**: `clippy::use_self` promotes idiomatic patterns in `impl` blocks.

---

## TYPE-5: No `unwrap()` / `expect()` in Production Code

Rust uses `Option<T>` and `Result<T, E>` for fallibility. `unwrap()` and `expect()`
panic at runtime and must not appear outside test code.

**Detection patterns** (grep, excluding `#[cfg(test)]` blocks):
```
\.unwrap()
\.expect(
```

Use `?` to propagate errors, or `match`/`ok_or_else` to handle explicitly. `unwrap()` is acceptable in `#[test]` functions, `#[cfg(test)]` modules, `fn main()` for scripts, and `const` contexts.

**Clippy lint**: `clippy::unwrap_used`, `clippy::expect_used`

`Cargo.toml` — set `[lints.clippy] unwrap_used = "deny"` and `expect_used = "deny"` (or `[workspace.lints.clippy]` for workspace roots). Alternatively, add `#![cfg_attr(not(test), deny(clippy::unwrap_used, clippy::expect_used))]` in `lib.rs`/`main.rs`.

---

## TYPE-6: `dyn Trait` vs Generics

Prefer generics (`impl Trait` / `T: Trait`) when a single concrete type exists at each call site — no vtable overhead.
Use `dyn Trait` (with `Box<dyn Trait>`) for heterogeneous collections, factory return types, or public APIs with unknown implementors.
Flag `Box<dyn Trait>` in internal function signatures where generics would suffice.

---

## Tooling Summary

| Tool                     | Purpose                                | Config                          |
|--------------------------|----------------------------------------|---------------------------------|
| `rustc`                  | Primary compiler + type checker        | Built in                        |
| `clippy`                 | Idiomatic Rust linter                  | `cargo clippy`                  |
| `clippy::unwrap_used`    | Bans `unwrap()` outside tests          | `#![deny(clippy::unwrap_used)]` |
| `clippy::expect_used`    | Bans `expect()` outside tests          | `#![deny(clippy::expect_used)]` |
| `cargo-tarpaulin`        | Code coverage                          | `cargo tarpaulin`               |
| `cargo-audit`            | Vulnerability scan for dependencies    | `cargo audit`                   |

**Recommended `deny` list for production crates**: `clippy::unwrap_used`, `clippy::expect_used`, `clippy::panic`, `clippy::arithmetic_side_effects` — set in `Cargo.toml [lints.clippy]` or via `#![deny(...)]` in `lib.rs`.
