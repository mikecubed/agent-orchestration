# TDD Language Reference — Python

Loaded by `tdd-check` when language = `python`.
Provides Python-specific test framework defaults, file naming conventions,
and tooling guidance for each TDD rule.

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

## TDD-1: Test File Detection

Look for any of:
```
test_{module}.py
{module}_test.py
tests/test_{module}.py
tests/{module}_test.py
```

---

## TDD-4: Test Naming — pytest

Pattern: `test_[subject]_[scenario]_[expected]` (snake_case throughout).

---

## TDD-7: Mocks — Permitted vs Prohibited

**Permitted** (`@patch`): I/O boundaries — `execute_query`, `requests.post`, `smtplib.SMTP`.
**Prohibited**: domain functions (`calculate_tax`), domain validation methods.
**Python doubles for domain logic**: use real or in-memory class implementations instead.

---

## TDD-8: Property-Based Tests — Hypothesis

Use `@given` with `strategies` to verify invariants. Use `@settings(max_examples=200)` for CI thoroughness.

---

## TDD-9: Test Ratio — Measurement

```bash
# Count source lines (excluding test files)
find . -name "*.py" ! -name "test_*.py" ! -name "*_test.py" \
  ! -path "*/tests/*" ! -path "*/.venv/*" | xargs wc -l | tail -1

# Count test lines
find . \( -name "test_*.py" -o -name "*_test.py" \) \
  ! -path "*/.venv/*" | xargs wc -l | tail -1
```

---

## Coverage Configuration (coverage.py / pytest-cov)

`pyproject.toml` — set `[tool.pytest.ini_options] addopts` with `--cov`, `--cov-report`, `--cov-fail-under=80`; set `[tool.coverage.run] source` and `omit`; set `[tool.coverage.report] exclude_lines`.

**Targets**: Domain layer: 90% | Application layer: 80%

---

## Fixture Patterns

Use `@pytest.mark.parametrize` for data-driven tests covering multiple input/expected pairs.

---

## Non-Standard Framework Handling

If the project uses unittest only (no pytest), nose, or another framework:
- Apply TDD-1 through TDD-9 language-agnostically
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
