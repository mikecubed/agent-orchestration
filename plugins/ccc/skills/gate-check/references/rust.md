# Test Gate Language Reference — Rust

Loaded by `gate-check` when language = `rust`.
Provides Rust-specific test framework defaults, file naming conventions,
and scaffold templates for the test gate (TEST-PINNED, TEST-RED-FIRST).

---

## Default Test Stack

| Purpose | Primary | Alternative |
|---------|---------|------------|
| Unit tests | **cargo test** (stdlib `#[test]`) | — |
| Property-based tests | **proptest** | quickcheck |
| Integration tests | `tests/` directory | — |
| Benchmarks | **criterion** | Divan |
| Coverage | **cargo-tarpaulin** | llvm-cov |
| Test runner | `cargo test` / `cargo nextest` | — |

---

## File Naming Conventions

| Convention | Pattern | Notes |
|-----------|---------|-------|
| Unit tests | Module-level `#[cfg(test)]` block in `src/{module}.rs` | Same file as source |
| Integration tests | `tests/{module}_test.rs` | Separate from source |
| Doc tests | Inline in `///` doc comments | Auto-discovered |

**Rust convention**: Unit tests live in the same file as the code under test,
inside a `#[cfg(test)]` module. Integration tests live in `tests/` at the crate root.

---

## TEST-PINNED: Test File Detection

Look for:
```rust
// In source file — #[cfg(test)] module present
#[cfg(test)]
mod tests { ... }

// OR integration test file
tests/{module}_test.rs
tests/{module}.rs
```

A source file with no `#[cfg(test)]` block and no matching `tests/` file
has no test coverage. For each new `pub fn` / `pub struct`: confirm a test
function references it.

---

## Coverage Configuration — cargo-tarpaulin

```bash
cargo install cargo-tarpaulin
cargo tarpaulin --out Html --output-dir coverage/
cargo tarpaulin --fail-under 80
cargo tarpaulin --exclude-files "tests/*"
```

**Alternative — llvm-cov**:
```bash
cargo llvm-cov --html
cargo llvm-cov --fail-under-lines 80
```

---

## `unwrap()` Prohibition in Production

`unwrap()` and `expect()` in production code (non-test, non-example) are BLOCK violations
under RESULT-1 / OBS-1 in fallible paths.

Use `?` to propagate, or map to a typed `AppError`. `unwrap()` IS acceptable in `#[test]` functions, `#[cfg(test)]` modules, `fn main()` for one-shot scripts, and `const` evaluation contexts.

---

## Non-Standard Framework Handling

If the project uses nextest, cucumber-rs, or spectral:
- Apply TEST-PINNED and TEST-RED-FIRST language-agnostically
- Note the non-standard framework in the report without blocking
- Adapt naming to the framework's conventions

---

## Scaffold Patterns (`--scaffold-tests`)

### Rust (built-in test framework)

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_function_name_scenario_expected() {
        let result = function_name();
        assert_eq!(result, 0); // TODO: replace 0 with specific expected value
    }
}
```

**Rules for scaffold assertions**:
- Use `assert_eq!` or `assert_ne!` — never `assert!(true)`
- Test MUST fail on first run
- Place test module at the bottom of the same file as the function
