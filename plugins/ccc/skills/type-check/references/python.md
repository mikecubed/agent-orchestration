# Type Check — Python Language Reference

**Language**: Python | **Loaded by**: type-check/SKILL.md

---

## Rule Applicability

| Rule   | Status       | Notes                                                          |
|--------|--------------|----------------------------------------------------------------|
| TYPE-1 | ✅ ACTIVE     | `Any` from `typing`; untyped params treated as implicit `Any`  |
| TYPE-2 | ✅ ACTIVE     | `cast()` without preceding `isinstance` check                  |
| TYPE-3 | ✅ ACTIVE     | `match` (Python 3.10+); `if/elif` chains on enums              |
| TYPE-4 | ✅ ACTIVE     | `NewType` for domain primitives                                |
| TYPE-5 | ✅ ACTIVE     | `Optional[T]` / `T | None` must be explicit in return type     |
| TYPE-6 | ✅ ACTIVE     | `Protocol` over concrete class in function signatures          |

---

## TYPE-1: `Any` → Concrete Types

**Detection patterns** (grep):
```
from typing import Any
: Any
-> Any
```

**Untyped parameters** are treated as implicit `Any` under mypy strict mode.
Flag any function without full parameter and return annotations.

**Safe alternatives**: use concrete types, `TypeVar` for generics, `Protocol` for structural typing, `TypedDict` for dict shapes. When `Any` is unavoidable, add an `isinstance` runtime guard immediately.

**mypy / pyright config**: `pyproject.toml` — set `[tool.mypy] strict = true` and `disallow_any_explicit = true`; or `mypy.ini` — `strict = True`, `disallow_any_explicit = True`.

**Ruff rules** (type checking):
- `ANN001` — missing function argument annotation
- `ANN201` — missing return type annotation
- `ANN401` — `Any` explicitly used

---

## TYPE-2: `cast()` Safety

Always use an `isinstance` guard or a `TypeGuard` function (PEP 647) before `cast()`.
`cast()` without a preceding guard is a BLOCK violation.

---

## TYPE-3: Exhaustive Pattern Matching

**Python 3.10+**: Use `match` with `assert_never(unreachable)` in the `case _ as unreachable` arm (requires `typing.assert_never` or `typing_extensions`).
**Pre-3.10**: Use `if/elif` chains with `assert_never` at the end; mypy/pyright error if that path is reachable.

---

## TYPE-4: `NewType` for Domain Primitives

Use `NewType('AccountId', str)` etc. Checked by mypy/pyright but transparent at runtime.
For runtime validation use a `@dataclass` or `pydantic.RootModel` wrapper.

---

## TYPE-5: Optional Return Types

Declare `Optional[T]` or `T | None` (Python 3.10+) explicitly. mypy catches None returns from typed-non-None functions under `--strict`.

---

## TYPE-6: Protocol Over Concrete Class

Use `Protocol` (structural subtyping) — no inheritance required. Flag function signatures that depend on a concrete class where a Protocol would suffice.

---

## Tooling Summary

| Tool                  | Purpose                             | Config                      |
|-----------------------|-------------------------------------|-----------------------------|
| mypy                  | Static type checker                 | `mypy.ini` / `pyproject.toml` |
| pyright / pylance     | Fast type checker (VS Code)         | `pyrightconfig.json`        |
| Ruff (`ANN*`, `UP*`)  | Annotation lint rules               | `pyproject.toml [tool.ruff]`|
| pydantic              | Runtime type validation             | —                           |
