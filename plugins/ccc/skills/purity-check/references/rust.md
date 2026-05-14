# Purity Check — Rust Language Reference

**Language**: Rust | **Loaded by**: purity-check/SKILL.md

---

## Side-Effect Imports to Detect in `core/`

| Category | Crate patterns that trigger PURE-1 |
|---|---|
| Filesystem | `std::fs`, `std::path` (for I/O), `tokio::fs`, `async-fs`, `glob` |
| Network | `reqwest`, `hyper`, `surf`, `ureq`, `isahc`, `awc`, `curl` |
| HTTP frameworks | `actix-web`, `axum`, `rocket`, `warp`, `poem`, `tide`, `salvo` |
| Database | `sqlx`, `diesel`, `sea-orm`, `mongodb`, `redis`, `tokio-postgres`, `rusqlite` |
| Cloud SDKs | `aws-sdk-*`, `azure_*`, `google-cloud-*` |
| Process | `std::process::Command`, `tokio::process` |
| Logging | `log`, `tracing`, `slog`, `env_logger`; macros `println!`, `eprintln!`, `dbg!`, `print!` |

---

## Clock / RNG / Logging Calls (PURE-1)

| Concern | Calls to flag |
|---|---|
| Clock | `std::time::Instant::now()`, `std::time::SystemTime::now()`, `chrono::Utc::now()`, `chrono::Local::now()`, `time::OffsetDateTime::now_utc()` |
| RNG | `rand::random()`, `rand::thread_rng()`, `getrandom::getrandom`, `fastrand::*`, `oorandom::*` |
| Logging | `println!`, `eprintln!`, `print!`, `eprint!`, `dbg!`, `log::*` macros, `tracing::*` macros |

**Allowed**: `std::time::Duration` constants, `Instant` / `SystemTime` *values*
passed as parameters, `rand::rngs::StdRng::seed_from_u64(seed)` where `seed`
is a parameter (deterministic given input).

---

## Ambient State Reads (PURE-2)

| Pattern | Example |
|---|---|
| Env vars | `std::env::var("X")`, `std::env::var_os("X")` |
| Argv | `std::env::args()` |
| Globals | `static mut X` (also `unsafe` — almost always wrong), `lazy_static!` / `once_cell::sync::Lazy` holding mutable state |
| Thread-locals | `thread_local!` reads inside core logic |

---

## Type-Only Equivalents

Rust has no zero-cost type-only import. Trait bounds expressed via `where`
clauses referencing crate types still bring the crate into the dependency
graph. The closest pattern: define traits in core and have shell crates
implement them.

```rust
// core/src/lib.rs
pub trait UserRepository {
    fn find(&self, id: UserId) -> Result<User, NotFound>;
}

// shell/src/postgres_repo.rs
use sqlx::PgPool;
use core::UserRepository;
impl UserRepository for PgRepo { ... }
```

---

## Mock-Required-to-Test Signal (PURE-3)

Test files using `mockall`, `mockiato`, `faux`, or `mockable` to generate
mocks against a core trait are PURE-3 candidates. The idiomatic alternative
is a hand-rolled `InMemoryX` implementation of the trait.

`mockall` for I/O-boundary traits (e.g., a `DatabasePool` trait whose only
real impl is a sqlx wrapper) is acceptable and should not be flagged when the
mocked trait lives in shell.

---

## Severity Calibration (Rust-specific)

- `Result<T, E>` plumbing inside core does not need mocking; the type system
  carries failure cases. Mock usage *for core* is a strong PURE-3 signal in
  Rust specifically — there's almost always a better trait-based alternative.
- `panic!` and `unreachable!` inside an exhaustive match are pure (they encode
  an unreachable branch). Don't flag them as side effects.

---

## Tooling

| Tool | What to use it for |
|---|---|
| `cargo deny` | Block specific crates from specific packages |
| `cargo-modules` | Visualize module dependencies |
| `clippy::pedantic` | Surfaces some impurity patterns (`unwrap_used`, etc.) |
