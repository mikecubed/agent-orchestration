# Naming Check — Python Language Reference

**Language**: Python | **Loaded by**: naming-check/SKILL.md

---

## Casing Conventions (PEP 8)

| Identifier type          | Convention           | Examples                                      |
|--------------------------|----------------------|-----------------------------------------------|
| Variables & parameters   | `snake_case`         | `user_id`, `request_body`, `max_retry_count`  |
| Functions & methods      | `snake_case`         | `get_user_by_id`, `calculate_total_price`     |
| Classes                  | `PascalCase`         | `UserRepository`, `OrderService`              |
| Constants (module-level) | `UPPER_CASE`         | `MAX_RETRY_COUNT`, `DEFAULT_TIMEOUT_MS`       |
| Private attributes       | `_snake_case`        | `_user_id`, `_cache` (single leading `_`)     |
| Name-mangled attrs       | `__snake_case`       | `__secret` (double leading `_`, use sparingly)|
| Module/package names     | `snake_case`         | `user_service.py`, `order_repository/`        |
| Type variables           | Single `PascalCase`  | `T`, `TKey`, `TValue`                         |

---

## File Naming

| File type            | Pattern                    | Examples                                      |
|----------------------|----------------------------|-----------------------------------------------|
| Module               | `snake_case.py`            | `user_service.py`, `order_repository.py`      |
| Package              | `snake_case/`              | `user_management/`, `payment_gateway/`        |
| Package init         | `__init__.py`              | expose public API; avoid star imports         |
| Test                 | `test_[name].py`           | `test_user_service.py`                        |
| Conftest             | `conftest.py`              | pytest fixtures; one per directory level      |
| Configuration        | `[name]_config.py`         | `database_config.py`                          |
| Constants            | `constants.py`             | single module at package root                 |

---

## NAME-7: Test Function Naming (Python)

All pytest test functions must follow `test_[subject]_[scenario]_[expected]` (snake_case, `test_` prefix required by pytest).
For class-based tests, the class is `TestSubject` and the methods follow `test_[scenario]_[expected]`.

---

## Python-Specific NAME-3 Targets

Flag classes named:
- `UserManager`, `OrderProcessor`, `DataHelper`, `RequestHandler`
- `BaseUtils`, `CommonUtils`, `MiscUtils`, `Helpers`
- `AbstractFactory` (unless it truly is an Abstract Factory pattern)

---

## Rule Applicability

| Rule   | Status      | Notes                                                          |
|--------|-------------|----------------------------------------------------------------|
| NAME-1 | ✅ ACTIVE    | Apply anti-pattern table; check `.py` files                   |
| NAME-2 | ✅ ACTIVE    | Check `-> bool` return types and `: bool` annotations         |
| NAME-3 | ✅ ACTIVE    | Flag `*Manager`, `*Handler`, `*Utils`, `*Helper` classes      |
| NAME-4 | ✅ ACTIVE    | Module-level names especially must be fully descriptive       |
| NAME-5 | ✅ ACTIVE    | Check exported names (public, no leading `_`)                 |
| NAME-6 | ✅ ACTIVE    | Scan across `*.py` files in scope                             |
| NAME-7 | ✅ ACTIVE    | Scan `test_*.py` files                                        |

---

## Tooling

| Tool      | Purpose                                                              |
|-----------|----------------------------------------------------------------------|
| `pylint`  | `invalid-name` (C0103) — enforces PEP 8 naming conventions          |
| `Ruff`    | `N8xx` rules — pep8-naming plugin                                   |
| `pydocstyle` | Docstring naming conventions                                     |
| `mypy`    | Catches implicit untyped names that often signal poor naming         |
