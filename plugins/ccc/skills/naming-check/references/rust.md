# Naming Check — Rust Language Reference

**Language**: Rust | **Loaded by**: naming-check/SKILL.md

---

## Casing Conventions (RFC 430 — Rust Naming Conventions)

| Identifier type          | Convention           | Examples                                      |
|--------------------------|----------------------|-----------------------------------------------|
| Variables & parameters   | `snake_case`         | `user_id`, `request_body`, `max_retry_count`  |
| Functions & methods      | `snake_case`         | `get_user_by_id`, `calculate_total_price`     |
| Closures                 | `snake_case`         | `let process_item = \|x\| { ... };`           |
| Structs                  | `PascalCase`         | `UserRepository`, `OrderService`              |
| Enums                    | `PascalCase`         | `PaymentStatus`, `UserRole`                   |
| Enum variants            | `PascalCase`         | `PaymentStatus::Pending`, `UserRole::Admin`   |
| Traits                   | `PascalCase`         | `Repository`, `Serializable`, `Cacheable`     |
| Type aliases             | `PascalCase`         | `UserId`, `OrderId`, `Result<T>`              |
| Constants                | `SCREAMING_SNAKE`    | `MAX_RETRY_COUNT`, `DEFAULT_TIMEOUT_MS`       |
| Static variables         | `SCREAMING_SNAKE`    | `GLOBAL_CONFIG`, `HTTP_CLIENT`                |
| Modules                  | `snake_case`         | `user_service`, `order_repository`            |
| Lifetimes                | Short `snake_case`   | `'a`, `'db`, `'req` (not `'MyLifetime`)       |
| Generic type params      | Single `PascalCase`  | `T`, `K`, `V`, `E`, `R`                       |
| Macro names              | `snake_case!`        | `vec!`, `format!`, `assert_eq!`               |

---

## Clippy Naming Lints

Enable these in `#![deny(clippy::all)]` or project `.clippy.toml`:

| Lint                                    | Rule enforced |
|-----------------------------------------|---------------|
| `clippy::module_name_repetitions`       | Flags `UserService::get_user_service_info` — module name repeated in member |
| `clippy::use_self`                      | Use `Self` instead of type name in impl blocks                              |
| `clippy::renamed_function_params`       | Flag single-letter params outside closures                                  |
| `clippy::cast_possible_truncation`      | Flags implicit narrowing that often hides bad naming                        |

---

## Module Name Repetition (Rust-specific NAME-3)

Rust's `clippy::module_name_repetitions` catches repeating the module name inside it (e.g., `pub struct UserServiceConfig` in module `user_service`). Drop the module name from the item: use `Config` (referenced as `user_service::Config`).

---

## Newtype / Type Alias for Branded IDs (NAME-5 aid)

Use `pub struct UserId(String)`, `pub struct AccountId(String)`, `pub struct Amount(f64)` newtypes instead of primitive parameters. This prevents parameter confusion and improves readability.

---

## NAME-7: Test Function Naming (Rust)

Pattern: `snake_case` — `subject_scenario_expected` (no `test_` prefix, no `it_` prefix).
Integration tests in `tests/` follow the same pattern.

---

## Rule Applicability

| Rule   | Status      | Notes                                                               |
|--------|-------------|----------------------------------------------------------------------|
| NAME-1 | ✅ ACTIVE    | Apply anti-pattern table; check `.rs` files                         |
| NAME-2 | ✅ ACTIVE    | Check `-> bool` return types and `bool` fields                      |
| NAME-3 | ✅ ACTIVE    | Flag `*Manager`, `*Handler`; module name repetitions via clippy     |
| NAME-4 | ✅ ACTIVE    | Public (pub) names especially must be fully descriptive             |
| NAME-5 | ✅ ACTIVE    | `SCREAMING_SNAKE` for constants; full names for pub items           |
| NAME-6 | ✅ ACTIVE    | Scan across `*.rs` files in scope                                   |
| NAME-7 | ✅ ACTIVE    | Scan `#[test]` and `#[cfg(test)]` blocks; `tests/**/*.rs`           |

---

## Tooling

| Tool      | Purpose                                                        |
|-----------|----------------------------------------------------------------|
| `clippy`  | `clippy::module_name_repetitions`, `clippy::use_self`         |
| `rustfmt` | Formatting (does not enforce naming, but casing is validated) |
| Compiler  | Warns on `non_snake_case`, `non_camel_case_types`, `non_upper_case_globals` by default |
