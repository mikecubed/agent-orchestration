# Purity Check — Python Language Reference

**Language**: Python | **Loaded by**: purity-check/SKILL.md

---

## Side-Effect Imports to Detect in `core/`

| Category | Import patterns that trigger PURE-1 |
|---|---|
| Filesystem | `pathlib.Path` (when used for I/O), `os.path`, `shutil`, `glob`, top-level `open(`, `aiofiles` |
| Network | `requests`, `httpx`, `urllib`, `urllib3`, `aiohttp`, `niquests`, `treq` |
| HTTP frameworks | `flask`, `fastapi`, `django`, `starlette`, `bottle`, `tornado`, `sanic`, `quart`, `pyramid` |
| Database | `sqlalchemy`, `psycopg`, `psycopg2`, `pymongo`, `redis`, `motor`, `asyncpg`, `aiomysql`, `peewee`, `tortoise` |
| Message brokers | `pika`, `kombu`, `aiokafka`, `confluent_kafka`, `celery` |
| Cloud SDKs | `boto3`, `botocore`, `google.cloud.*`, `azure.*` |
| Process / OS | `subprocess`, `os.system`, `os.popen`, `multiprocessing.Process` |
| Logging | `logging` (when emitting; `logging.getLogger` is borderline), direct `print(` calls |

---

## Clock / RNG / Logging Calls (PURE-1)

| Concern | Calls to flag |
|---|---|
| Clock | `time.time()`, `time.monotonic()`, `datetime.now()`, `datetime.utcnow()`, `datetime.today()`, `time.perf_counter()` |
| RNG | `random.*` (`random()`, `randint`, `choice`, `shuffle`, …), `secrets.*`, `numpy.random.*`, `uuid.uuid1`, `uuid.uuid4` |
| Logging | `print(`, `logging.info`, `logging.error`, etc.; `sys.stdout.write`, `sys.stderr.write` |

**Allowed**: `datetime(2024, 1, 1)` with literal args, `math.*` (pure math),
`hashlib.sha256(literal_bytes)` as a pure transform, `random.Random(seed)`
*construction* with an explicit seed when the seed is a parameter (the
randomness becomes a function of input).

---

## Ambient State Reads (PURE-2)

| Pattern | Example |
|---|---|
| Env vars | `os.environ['X']`, `os.environ.get('X')`, `os.getenv('X')` |
| Argv | `sys.argv` |
| Globals | Module-level mutable globals (`_cache = {}` at top level mutated inside functions) |
| Context vars | `contextvars.ContextVar` reads inside core logic |
| Configuration singletons | `settings.X` where `settings` is a module-level instance |

---

## Type-Only Imports

Python has no zero-cost type-only import syntax. The closest equivalent is
`if TYPE_CHECKING:` guarded imports:

```python
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from sqlalchemy.engine import Engine   # ✅ allowed in core
```

A direct `from sqlalchemy import create_engine` in core is PURE-1.

---

## Mock-Required-to-Test Signal (PURE-3)

Test files importing `unittest.mock.patch`, `unittest.mock.MagicMock`,
`pytest_mock`, `responses`, `requests_mock`, `freezegun`, or `time_machine`
against a core module are PURE-3 candidates.

---

## Severity Calibration (Python-specific)

Per the pragmatism principle, watch for these legitimate carve-outs:
- `logging.getLogger(__name__)` at module import time is conventional and
  produces no I/O — the *emission* (`.info(...)`) is what triggers PURE-1.
- Frozen module-level dataclasses, `Enum`, and `NamedTuple` definitions are
  pure data; flag only `dict`/`list`/`set` constants that are mutated.

---

## Tooling

| Tool | What to use it for |
|---|---|
| `ruff` rule set `T20`, `BLE`, `S` | Print statements, bare excepts, security-tagged side effects |
| `import-linter` | Layered architecture contracts (core forbidden from importing shell) |
| `pylint` `W0603` | Use of `global` — usually a PURE-2 signal |
