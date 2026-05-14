# Test Gate Language Reference — Python

Loaded by `gate-check` when language = `python`.
Provides Python-specific test framework defaults, file naming conventions,
and scaffold templates for the test gate (TEST-PINNED, TEST-RED-FIRST).

---

## Default Test Stack

| Purpose | Primary | Alternative |
|---------|---------|------------|
| Unit tests | **pytest** | unittest (stdlib) |
| Property-based tests | **hypothesis** | — |
| Integration (HTTP) | **httpx + pytest** | requests + pytest |
| Integration (E2E) | **pytest + Docker** | — |
| Coverage | **coverage.py** (`pytest-cov`) | — |
| Test config | `pyproject.toml [tool.pytest.ini_options]` | `pytest.ini` |

---

## File Naming Conventions

| Convention | Pattern | Example |
|-----------|---------|---------|
| Test file | `test_{module}.py` | `test_user_service.py` |
| Alternative prefix | `{module}_test.py` | `user_service_test.py` |
| Test directory | `tests/test_{module}.py` | `tests/test_payment.py` |
| Integration tests | `tests/integration/test_{module}.py` | — |

**pytest discovery**: Files matching `test_*.py` or `*_test.py` at any depth.
**Preferred**: `test_{module}.py` co-located with source in same package directory,
OR in a top-level `tests/` directory mirroring the source tree.

---

## conftest.py Role

`conftest.py` is the pytest fixture configuration file. Key conventions:
- Root `conftest.py`: shared fixtures, session-scoped database setup, env vars
- Per-directory `conftest.py`: fixtures scoped to that test directory
- Never import test helpers from `conftest.py` in production code

---

## TEST-PINNED: Test File Detection

Look for any of:
```
test_{module}.py
{module}_test.py
tests/test_{module}.py
tests/{module}_test.py
```

For each new public symbol: confirm the test file imports the symbol and
calls it (or instantiates the class).

---

## Coverage Configuration (coverage.py / pytest-cov)

`pyproject.toml` — set `[tool.pytest.ini_options] addopts` with `--cov`, `--cov-report`, `--cov-fail-under=80`; set `[tool.coverage.run] source` and `omit`; set `[tool.coverage.report] exclude_lines`.

---

## Fixture Patterns

Use `@pytest.mark.parametrize` for data-driven tests covering multiple input/expected pairs.

---

## Non-Standard Framework Handling

If the project uses unittest only (no pytest), nose, or another framework:
- Apply TEST-PINNED and TEST-RED-FIRST language-agnostically
- Note the non-standard framework in the report without blocking
- Do NOT attempt to convert tests to pytest

---

## Scaffold Patterns (`--scaffold-tests`)

### pytest

```python
from module.path import function_name


def test_function_name_scenario_expected():
    result = function_name()
    assert result == expected  # TODO: replace `expected` with the specific expected value
```

**Rules for scaffold assertions**:
- Use `assert result == expected` — never `assert result` or `assert True`
- Import the real function (no mocking in the skeleton)
- Replace `expected` with a concrete value before running tests
- Test MUST fail on first run
