# TDD Language Reference — Rust

Loaded by `tdd-check` when language = `rust`.
Provides Rust-specific test framework defaults, file naming conventions,
and tooling guidance for each TDD rule.

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

## TDD-1: Test File Detection

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
has no test coverage — TDD-1 applies.

---

## TDD-4: Test Naming — Rust

Pattern: `snake_case` — `subject_scenario_expected`. For nested modules, use a describe-style `mod subject_tests { ... }` with individual `fn scenario_expected()` test functions.

**Note**: Rust uses `snake_case` for test names, not `camelCase`.

---

## TDD-7: Mocks — Permitted vs Prohibited

**Permitted**: trait-based test doubles (`InMemoryUserRepository` implementing `UserRepository` trait) for I/O.
**Prohibited**: replacing domain logic — use the real implementation.
**mockall** crate is acceptable for I/O boundary mocks in complex integration scenarios. Do NOT use mockall on domain types.

---

## TDD-8: Property-Based Tests — proptest

Use `proptest! { #[test] fn name(var in strategy) { prop_assert!(...) } }` to verify invariants.
Alternative: `quickcheck!` macro for simpler property checks.

---

## TDD-9: Test Ratio — Measurement

```bash
# Count source lines (excluding test files and cfg(test) blocks)
# Approximate count of non-test source lines
# (excludes common test file patterns and tests/ directories)
find src -name "*.rs" ! -name "*_test.rs" ! -path "*/tests/*" -print0 | xargs -0 wc -l

# Recommended: use tokei for accurate stats
# (handles #[cfg(test)] blocks and Rust layouts more reliably)
tokei src --exclude "*_test.rs" --exclude "tests/*" --type Rust

# Count test lines (tests/ directory + *_test.rs files)
find tests -name "*.rs" -print0 | xargs -0 wc -l | tail -1
find src -name "*_test.rs" -print0 | xargs -0 wc -l | tail -1
```

---

## Coverage Configuration — cargo-tarpaulin

```bash
# Install
cargo install cargo-tarpaulin

# Run with coverage
cargo tarpaulin --out Html --output-dir coverage/

# CI — fail if below threshold
cargo tarpaulin --fail-under 80

# Exclude integration tests from unit coverage
cargo tarpaulin --exclude-files "tests/*"
```

**Alternative — llvm-cov**:
```bash
cargo llvm-cov --html
cargo llvm-cov --fail-under-lines 80
```

**Targets**: Domain layer: 90% | Application layer: 80%

---

## Ownership Model — TYPE Rule Interactions

Rust's ownership system supersedes some TYPE rules from other languages.
The following TYPE rules are **inapplicable** in Rust (documented explicitly):

| Rule | Status in Rust | Rationale |
|------|---------------|-----------|
| TYPE-1 (`any`/`unknown` without guard) | **Superseded** | `Box<dyn Any>` is safe when used with `downcast_ref`. Borrow checker prevents unsafe access. |
| TYPE-2 (double type assertion) | **Superseded** | Rust has no `as unknown as Foo` pattern. Unsafe transmute is a separate concern (SEC domain). |

**Applicable TYPE rules in Rust**:
- TYPE-3: Exhaustive match — Rust compiler enforces this; missing arms are compile errors. Flag `#[allow(non_exhaustive)]` usage.
- TYPE-4: Branded types — use newtype wrappers: `struct UserId(String)`
- TYPE-5: Return type annotations — all public `fn` must have explicit return types
- TYPE-6: Optional field design — prefer `Option<T>` over sentinel values

---

## `unwrap()` Prohibition in Production

`unwrap()` and `expect()` in production code (non-test, non-example) are BLOCK violations
under OBS-1 (swallowed error) when used on `Result` or `Option` in fallible paths.

Use `?` to propagate, or map to a typed `AppError`. `unwrap()` IS acceptable in `#[test]` functions, `#[cfg(test)]` modules, `fn main()` for one-shot scripts, and `const` evaluation contexts.

---

## Non-Standard Framework Handling

If the project uses nextest, cucumber-rs, or spectral:
- Apply TDD-1 through TDD-9 language-agnostically
- Note the non-standard framework in the report without blocking
- Adapt TDD-4 naming to the framework's conventions

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
