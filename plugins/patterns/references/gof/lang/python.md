# GoF Design Pattern Catalog — Python Reference

**Purpose**: Modern Python code examples for all 23 GoF patterns. Use alongside
`catalog-core.md` (language-agnostic definitions).

**Stack coverage**: Python 3.12+, standard library, type hints

**Key principle**: Show what you'd actually write today, not classical OO translations.
When a pattern is a language feature (Iterator, Decorator, Observer), show the built-in
mechanism and explain the concept it implements.

**Anti-hallucination policy**: All code is `[interpretation]` — adapted to modern Python idioms.

---

# Creational Patterns

---

## Abstract Factory (p. 87)

### Modern Python `[interpretation]`

Python typically uses a dict-based factory registry rather than parallel class hierarchies.

```python
from dataclasses import dataclass
from typing import Protocol

class Button(Protocol):
    def render(self) -> str: ...

class TextInput(Protocol):
    def render(self) -> str: ...

@dataclass
class WebButton:
    label: str
    def render(self) -> str:
        return f"<button>{self.label}</button>"

@dataclass
class WebTextInput:
    placeholder: str
    def render(self) -> str:
        return f'<input placeholder="{self.placeholder}"/>'

@dataclass
class CliButton:
    label: str
    def render(self) -> str:
        return f"[ {self.label} ]"

@dataclass
class CliTextInput:
    placeholder: str
    def render(self) -> str:
        return f"({self.placeholder}): ___"

# Dict-based factory — no abstract class hierarchy needed
UI_FACTORIES: dict[str, dict[str, type]] = {
    "web": {"button": WebButton, "text_input": WebTextInput},
    "cli": {"button": CliButton, "text_input": CliTextInput},
}

def create_ui(theme: str, **components: dict[str, str]):
    factory = UI_FACTORIES[theme]
    return {name: factory[name](**kwargs) for name, kwargs in components.items()}
```

### Framework equivalents `[interpretation]`

- **Django**: `DATABASES` setting selects the database backend factory (PostgreSQL, SQLite, etc.)
- **SQLAlchemy**: `create_engine()` returns dialect-specific connection/cursor families
- **Logging**: `logging.getLogger()` + handler/formatter factories

---

## Builder (p. 97)

### Modern Python `[interpretation]`

For simple cases, `dataclass` with defaults replaces Builder entirely. For complex construction, use fluent method chaining returning `self`.

```python
from dataclasses import dataclass, field

# Simple case: dataclass replaces Builder
@dataclass
class Query:
    table: str
    columns: list[str] = field(default_factory=lambda: ["*"])
    where: str | None = None
    order_by: str | None = None
    limit: int | None = None

    def to_sql(self) -> str:
        parts = [f"SELECT {', '.join(self.columns)} FROM {self.table}"]
        if self.where:
            parts.append(f"WHERE {self.where}")
        if self.order_by:
            parts.append(f"ORDER BY {self.order_by}")
        if self.limit is not None:
            parts.append(f"LIMIT {self.limit}")
        return " ".join(parts)

# Fluent builder for complex/step-wise construction
class QueryBuilder:
    def __init__(self, table: str) -> None:
        self._query = Query(table=table)

    def select(self, *cols: str) -> "QueryBuilder":
        self._query.columns = list(cols)
        return self

    def where(self, clause: str) -> "QueryBuilder":
        self._query.where = clause
        return self

    def order_by(self, col: str) -> "QueryBuilder":
        self._query.order_by = col
        return self

    def limit(self, n: int) -> "QueryBuilder":
        self._query.limit = n
        return self

    def build(self) -> Query:
        return self._query

q = QueryBuilder("users").select("name", "email").where("active = 1").limit(10).build()
```

### Framework equivalents `[interpretation]`

- **Pydantic**: `model_validator(mode='before')` for complex construction/validation
- **SQLAlchemy**: `Query.filter().order_by().limit()` is a fluent builder
- **Rich**: `Console()` and `Table()` use builder-style progressive construction

---

## Factory Method (p. 107)

### Modern Python `[interpretation]`

Python's `@classmethod` alternative constructors ARE the Factory Method pattern.

```python
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
import json

@dataclass
class Config:
    host: str
    port: int
    debug: bool = False

    @classmethod
    def from_json(cls, path: str | Path) -> "Config":
        """Factory method: construct from JSON file."""
        data = json.loads(Path(path).read_text())
        return cls(**data)

    @classmethod
    def from_env(cls, prefix: str = "APP") -> "Config":
        """Factory method: construct from environment variables."""
        import os
        return cls(
            host=os.environ[f"{prefix}_HOST"],
            port=int(os.environ[f"{prefix}_PORT"]),
            debug=os.environ.get(f"{prefix}_DEBUG", "").lower() == "true",
        )

    @classmethod
    def development(cls) -> "Config":
        """Factory method: sensible dev defaults."""
        return cls(host="localhost", port=8000, debug=True)

# Usage — each classmethod is a factory method
config = Config.from_json("config.json")
config = Config.development()
```

### Framework equivalents `[interpretation]`

- **`datetime`**: `datetime.now()`, `datetime.fromtimestamp()`, `datetime.fromisoformat()` are all factory methods
- **`pathlib.Path`**: `Path.home()`, `Path.cwd()` — classmethods returning instances
- **Pydantic**: `model_validate()`, `model_validate_json()` are factory methods

---

## Prototype (p. 117)

### Modern Python `[interpretation]`

Python provides this built-in via `copy.deepcopy()`.

```python
import copy
from dataclasses import dataclass, field

@dataclass
class GameUnit:
    name: str
    hp: int
    position: tuple[int, int]
    inventory: list[str] = field(default_factory=list)

# Prototype registry — clone pre-configured templates
prototypes: dict[str, GameUnit] = {
    "soldier": GameUnit("Soldier", hp=100, position=(0, 0), inventory=["rifle"]),
    "medic": GameUnit("Medic", hp=80, position=(0, 0), inventory=["medkit", "pistol"]),
}

def spawn(kind: str, position: tuple[int, int]) -> GameUnit:
    """Clone a prototype and customize — this IS the Prototype pattern."""
    unit = copy.deepcopy(prototypes[kind])
    unit.position = position
    return unit

squad = [spawn("soldier", (i, 0)) for i in range(5)]
squad[0].inventory.append("grenade")  # does NOT affect the prototype
```

### Framework equivalents `[interpretation]`

- **Django ORM**: `instance.pk = None; instance.save()` clones a model instance
- **dataclasses**: `dataclasses.replace(obj, field=new_val)` creates a shallow-modified copy
- **copy**: `copy.copy()` (shallow) and `copy.deepcopy()` (deep) are the core mechanism

---

## Singleton (p. 127)

### Modern Python `[interpretation]`

The Pythonic singleton is a module-level instance. No class tricks needed. Singleton is generally discouraged in favor of dependency injection.

```python
# === The Pythonic way: module-level instance (settings.py) ===
# This module IS the singleton. Import it wherever needed.
from dataclasses import dataclass, field

@dataclass
class _Settings:
    db_url: str = "sqlite:///default.db"
    debug: bool = False
    _cache: dict[str, object] = field(default_factory=dict, repr=False)

settings = _Settings()  # The one instance. `from settings import settings`

# === Alternative: __new__ override (when you truly need class-based) ===
class Registry:
    _instance: "Registry | None" = None

    def __new__(cls) -> "Registry":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._data = {}
        return cls._instance

    def register(self, key: str, value: object) -> None:
        self._data[key] = value

# Registry() always returns the same object
assert Registry() is Registry()
```

### Framework equivalents `[interpretation]`

- **Python modules**: Every module is a singleton — imported once, cached in `sys.modules`
- **`logging`**: `logging.getLogger(name)` returns a cached singleton per name
- **FastAPI**: `app = FastAPI()` is typically a module-level singleton

---

# Structural Patterns

---

## Adapter (p. 139)

### Modern Python `[interpretation]`

Still implemented manually as a wrapper class or function adapter. Very much still used.

```python
from typing import Protocol

# Target interface our code expects
class NotificationSender(Protocol):
    def send(self, to: str, message: str) -> None: ...

# Third-party service with incompatible interface
class LegacyEmailService:
    def send_email(self, recipient_email: str, subject: str, body: str) -> dict:
        return {"status": "sent", "to": recipient_email}

# Adapter wraps the legacy service to match our protocol
class EmailAdapter:
    def __init__(self, service: LegacyEmailService) -> None:
        self._service = service

    def send(self, to: str, message: str) -> None:
        self._service.send_email(
            recipient_email=to,
            subject=message[:50],
            body=message,
        )

# Function-based adapter (even simpler for one-off cases)
def adapt_legacy_email(service: LegacyEmailService) -> NotificationSender:
    class _Adapted:
        def send(self, to: str, message: str) -> None:
            service.send_email(to, message[:50], message)
    return _Adapted()

def notify(sender: NotificationSender, to: str, msg: str) -> None:
    sender.send(to, msg)  # Works with any adapter
```

### Framework equivalents `[interpretation]`

- **Django REST Framework**: Serializers adapt between HTTP request data and model instances
- **SQLAlchemy**: Dialect adapters translate generic SQL to database-specific syntax
- **`io.TextIOWrapper`**: Adapts a binary stream to a text stream interface

---

## Bridge (p. 151)

### Modern Python `[interpretation]`

Composition over inheritance — separate "what" from "how" via dependency injection.

```python
from typing import Protocol
from dataclasses import dataclass

# Implementation hierarchy (the "how")
class Renderer(Protocol):
    def render_shape(self, shape_type: str, **kwargs: float) -> str: ...

class SVGRenderer:
    def render_shape(self, shape_type: str, **kwargs: float) -> str:
        attrs = " ".join(f'{k}="{v}"' for k, v in kwargs.items())
        return f"<{shape_type} {attrs}/>"

class CanvasRenderer:
    def render_shape(self, shape_type: str, **kwargs: float) -> str:
        return f"ctx.draw{shape_type.title()}({kwargs})"

# Abstraction hierarchy (the "what") — holds a reference to implementation
@dataclass
class Shape:
    renderer: Renderer  # Bridge: injected, not inherited

    def draw(self) -> str:
        raise NotImplementedError

@dataclass
class Circle(Shape):
    radius: float = 10.0

    def draw(self) -> str:
        return self.renderer.render_shape("circle", r=self.radius)

@dataclass
class Rectangle(Shape):
    width: float = 20.0
    height: float = 10.0

    def draw(self) -> str:
        return self.renderer.render_shape("rect", width=self.width, height=self.height)

# The two dimensions vary independently
circle_svg = Circle(renderer=SVGRenderer(), radius=5).draw()
circle_canvas = Circle(renderer=CanvasRenderer(), radius=5).draw()
```

### Framework equivalents `[interpretation]`

- **Logging**: `Logger` (abstraction) + `Handler` (implementation) — handlers are swappable
- **DB-API 2.0**: Application code (abstraction) + database drivers (implementation)
- **Requests**: `Session` (abstraction) + transport adapters (implementation)

---

## Composite (p. 163)

### Modern Python `[interpretation]`

Recursive tree structures with a common protocol. Still implemented manually.

```python
from dataclasses import dataclass, field
from typing import Protocol

class FileSystemEntry(Protocol):
    name: str
    def size(self) -> int: ...
    def display(self, indent: int = 0) -> str: ...

@dataclass
class File:
    name: str
    _size: int

    def size(self) -> int:
        return self._size

    def display(self, indent: int = 0) -> str:
        return f"{'  ' * indent}{self.name} ({self._size}B)"

@dataclass
class Directory:
    name: str
    children: list[File | "Directory"] = field(default_factory=list)

    def size(self) -> int:
        return sum(child.size() for child in self.children)

    def display(self, indent: int = 0) -> str:
        lines = [f"{'  ' * indent}{self.name}/ ({self.size()}B)"]
        for child in self.children:
            lines.append(child.display(indent + 1))
        return "\n".join(lines)

    def add(self, entry: File | "Directory") -> "Directory":
        self.children.append(entry)
        return self

# Client code treats File and Directory uniformly
root = Directory("src")
root.add(File("main.py", 1200))
root.add(Directory("utils", [File("helpers.py", 800), File("config.py", 400)]))
print(root.display())  # Recursive traversal
print(root.size())     # 2400 — aggregated transparently
```

### Framework equivalents `[interpretation]`

- **`pathlib.Path`**: Directories contain paths, files are leaves — composite traversal via `rglob()`
- **Django**: URL patterns nest via `include()` — a composite of route entries
- **`ast` module**: Python's own AST is a composite tree of nodes

---

## Decorator (p. 175)

### Modern Python `[interpretation]`

Python's `@decorator` syntax IS this pattern. Use `functools.wraps` to preserve metadata.

```python
import functools
import time
import logging
from typing import Callable, ParamSpec, TypeVar

P = ParamSpec("P")
R = TypeVar("R")

# Decorator that adds timing — this IS the Decorator pattern
def timed(func: Callable[P, R]) -> Callable[P, R]:
    @functools.wraps(func)
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
        start = time.perf_counter()
        result = func(*args, **kwargs)
        elapsed = time.perf_counter() - start
        logging.info(f"{func.__name__} took {elapsed:.3f}s")
        return result
    return wrapper

# Decorator with arguments (factory that returns decorator)
def retry(max_attempts: int = 3, delay: float = 1.0):
    def decorator(func: Callable[P, R]) -> Callable[P, R]:
        @functools.wraps(func)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
            for attempt in range(max_attempts):
                try:
                    return func(*args, **kwargs)
                except Exception:
                    if attempt == max_attempts - 1:
                        raise
                    time.sleep(delay)
            raise RuntimeError("unreachable")
        return wrapper
    return decorator

# Stacking decorators — composing behaviors dynamically
@retry(max_attempts=3)
@timed
def fetch_data(url: str) -> dict:
    ...
```

### Framework equivalents `[interpretation]`

- **FastAPI**: `@app.get("/")`, `@Depends()` — decorators compose middleware and DI
- **Flask**: `@app.route()`, `@login_required` — route and auth decorators
- **`functools`**: `@lru_cache`, `@cached_property`, `@singledispatch` — stdlib decorators

---

## Facade (p. 185)

### Modern Python `[interpretation]`

A simplified interface wrapping complex subsystems. Very common and still implemented manually.

```python
from dataclasses import dataclass
import json
from pathlib import Path

# Complex subsystems
class VideoDecoder:
    def decode(self, data: bytes) -> list[bytes]: ...

class AudioDecoder:
    def decode(self, data: bytes) -> list[bytes]: ...

class SubtitleParser:
    def parse(self, path: Path) -> list[dict]: ...

class OutputRenderer:
    def render(self, video: list, audio: list, subs: list) -> None: ...

# Facade — one simple method hides the complexity
class MediaPlayer:
    """Facade: clients call play(), never touch subsystems directly."""

    def __init__(self) -> None:
        self._video = VideoDecoder()
        self._audio = AudioDecoder()
        self._subs = SubtitleParser()
        self._renderer = OutputRenderer()

    def play(self, media_path: str, subtitle_path: str | None = None) -> None:
        raw = Path(media_path).read_bytes()
        video_frames = self._video.decode(raw)
        audio_frames = self._audio.decode(raw)
        subs = self._subs.parse(Path(subtitle_path)) if subtitle_path else []
        self._renderer.render(video_frames, audio_frames, subs)

# Client code is simple
player = MediaPlayer()
player.play("movie.mp4", subtitle_path="subs.srt")
```

### Framework equivalents `[interpretation]`

- **`requests`**: `requests.get(url)` is a facade over connection pooling, SSL, encoding, redirects
- **Django ORM**: `Model.objects.filter()` facades SQL generation, connection, cursor management
- **`pathlib.Path`**: Facades `os.path`, `os.stat`, `open()`, `os.makedirs`

---

## Flyweight (p. 195)

### Modern Python `[interpretation]`

Use `__slots__` for memory, `functools.lru_cache` for sharing, and `sys.intern()` for strings.

```python
import functools
import sys
from dataclasses import dataclass

# __slots__ reduces per-instance memory (no __dict__)
class Point:
    __slots__ = ("x", "y")

    def __init__(self, x: float, y: float) -> None:
        self.x = x
        self.y = y

# lru_cache shares identical instances (flyweight pool)
@functools.lru_cache(maxsize=256)
def get_color(r: int, g: int, b: int) -> tuple[int, int, int]:
    """Flyweight: returns cached color tuple, shared across all users."""
    return (r, g, b)

# sys.intern for string deduplication
def process_records(records: list[dict[str, str]]) -> list[dict[str, str]]:
    """Intern repeated strings to share memory across records."""
    return [
        {sys.intern(k): sys.intern(v) for k, v in record.items()}
        for record in records
    ]

# Flyweight with intrinsic (shared) vs extrinsic (unique) state
@dataclass(frozen=True)  # frozen makes it hashable for caching
class CharStyle:
    """Intrinsic state — shared across many characters."""
    font: str
    size: int
    bold: bool = False

@functools.lru_cache(maxsize=128)
def get_style(font: str, size: int, bold: bool = False) -> CharStyle:
    return CharStyle(font, size, bold)

# Thousands of characters, but only a few shared CharStyle objects
chars = [(ch, get_style("Arial", 12)) for ch in "Hello world" * 1000]
```

### Framework equivalents `[interpretation]`

- **`int` / `str`**: CPython caches small integers (-5 to 256) and interned strings
- **SQLAlchemy**: Identity map caches ORM objects — same row returns same Python object
- **`enum.Enum`**: Enum members are singletons — only one instance per value

---

## Proxy (p. 207)

### Modern Python `[interpretation]`

Use `__getattr__` for delegation and `functools.cached_property` as a lazy-loading proxy.

```python
import functools
from dataclasses import dataclass, field

# Lazy proxy via cached_property
class ExpensiveResource:
    def __init__(self) -> None:
        print("Loading expensive resource...")  # simulates slow init
        self.data = list(range(1_000_000))

class ResourceManager:
    @functools.cached_property
    def resource(self) -> ExpensiveResource:
        """Lazy proxy: resource loaded only on first access."""
        return ExpensiveResource()

    def process(self) -> int:
        return sum(self.resource.data)  # triggers load on first call

# Protection proxy via __getattr__
class ProtectedService:
    def __init__(self, service: object, allowed_methods: set[str]) -> None:
        self._service = service
        self._allowed = allowed_methods

    def __getattr__(self, name: str):
        if name not in self._allowed:
            raise PermissionError(f"Access denied: {name}")
        return getattr(self._service, name)

# Logging proxy — wraps any object, logs all attribute access
class LoggingProxy:
    def __init__(self, target: object) -> None:
        object.__setattr__(self, "_target", target)

    def __getattr__(self, name: str):
        print(f"Accessing: {name}")
        return getattr(self._target, name)
```

### Framework equivalents `[interpretation]`

- **Django**: `QuerySet` is a lazy proxy — SQL only executes on iteration/slicing
- **SQLAlchemy**: `lazy="select"` relationships are proxy-loaded on access
- **`unittest.mock.MagicMock`**: A proxy that records all attribute access and calls

---

# Behavioral Patterns

---

## Chain of Responsibility (p. 223)

### Modern Python `[interpretation]`

Iterate through a list of handlers until one succeeds. Or use middleware chains.

```python
from dataclasses import dataclass
from typing import Callable

@dataclass
class Request:
    path: str
    headers: dict[str, str]
    body: str = ""

type Handler = Callable[[Request], str | None]

# Each handler returns a response or None (pass to next)
def auth_handler(req: Request) -> str | None:
    if "Authorization" not in req.headers:
        return "401 Unauthorized"
    return None

def rate_limit_handler(req: Request) -> str | None:
    # simplified — real impl would check a counter
    if req.headers.get("X-RateLimit-Remaining") == "0":
        return "429 Too Many Requests"
    return None

def api_handler(req: Request) -> str | None:
    if req.path.startswith("/api/"):
        return f"200 OK: handled {req.path}"
    return None

def not_found_handler(req: Request) -> str | None:
    return "404 Not Found"

# Chain: iterate handlers until one responds
def handle(request: Request, chain: list[Handler]) -> str:
    for handler in chain:
        response = handler(request)
        if response is not None:
            return response
    return "500 No handler matched"

pipeline = [auth_handler, rate_limit_handler, api_handler, not_found_handler]
result = handle(Request("/api/users", {"Authorization": "Bearer ..."}), pipeline)
```

### Framework equivalents `[interpretation]`

- **Django**: Middleware chain — each middleware can short-circuit or pass to the next
- **FastAPI**: `@app.middleware("http")` — chain of async middleware handlers
- **Logging**: `Logger` propagation — unhandled log records bubble up to parent loggers

---

## Command (p. 233)

### Modern Python `[interpretation]`

Functions and callables ARE commands in Python. `functools.partial` binds parameters.

```python
import functools
from dataclasses import dataclass, field
from typing import Callable

# Commands are just callables
type Command = Callable[[], None]

@dataclass
class TextEditor:
    text: str = ""
    _undo_stack: list[Command] = field(default_factory=list)

    def execute(self, action: Command, undo_action: Command) -> None:
        action()
        self._undo_stack.append(undo_action)

    def undo(self) -> None:
        if self._undo_stack:
            self._undo_stack.pop()()

    def insert(self, pos: int, content: str) -> None:
        old_text = self.text
        self.execute(
            action=functools.partial(self._do_insert, pos, content),
            undo_action=functools.partial(self._restore, old_text),
        )

    def _do_insert(self, pos: int, content: str) -> None:
        self.text = self.text[:pos] + content + self.text[pos:]

    def _restore(self, snapshot: str) -> None:
        self.text = snapshot

# Usage — commands are stored, executed, undone
editor = TextEditor()
editor.insert(0, "Hello ")
editor.insert(6, "World")
print(editor.text)    # "Hello World"
editor.undo()
print(editor.text)    # "Hello "
```

### Framework equivalents `[interpretation]`

- **`functools.partial`**: Binds arguments to a callable — a command with pre-set parameters
- **Celery**: `task.delay(args)` — commands serialized and sent to a task queue
- **Click / Typer**: CLI commands are decorated functions dispatched by name

---

## Interpreter (p. 243)

### Modern Python `[interpretation]`

Less common today. For real parsers, use `lark` or `pyparsing`. Here is a simple AST evaluator using `match/case`.

```python
from dataclasses import dataclass
from typing import Union

# Simple expression AST
@dataclass
class Num:
    value: float

@dataclass
class BinOp:
    left: "Expr"
    op: str
    right: "Expr"

@dataclass
class UnaryOp:
    op: str
    operand: "Expr"

type Expr = Num | BinOp | UnaryOp

def evaluate(expr: Expr) -> float:
    """Interpreter: recursive evaluation using structural pattern matching."""
    match expr:
        case Num(value):
            return value
        case BinOp(left, "+", right):
            return evaluate(left) + evaluate(right)
        case BinOp(left, "-", right):
            return evaluate(left) - evaluate(right)
        case BinOp(left, "*", right):
            return evaluate(left) * evaluate(right)
        case BinOp(left, "/", right):
            return evaluate(left) / evaluate(right)
        case UnaryOp("-", operand):
            return -evaluate(operand)
        case _:
            raise ValueError(f"Unknown expression: {expr}")

# (3 + 4) * -2 = -14
tree = BinOp(BinOp(Num(3), "+", Num(4)), "*", UnaryOp("-", Num(2)))
print(evaluate(tree))  # -14.0
```

### Framework equivalents `[interpretation]`

- **`ast` module**: Python's own parser/interpreter for Python code
- **Django ORM Q objects**: `Q(name="x") | Q(age=5)` builds an expression tree interpreted as SQL
- **Lark / pyparsing**: Full parser generators for custom DSLs

---

## Iterator (p. 257)

### Modern Python `[interpretation]`

Python provides this natively. Generators (`yield`), `__iter__`/`__next__`, and `itertools` ARE this pattern.

```python
import itertools
from collections.abc import Iterator
from dataclasses import dataclass, field

# Generator function — the simplest iterator
def fibonacci() -> Iterator[int]:
    a, b = 0, 1
    while True:
        yield a
        a, b = b, a + b

# First 10 Fibonacci numbers — itertools composes iterators
first_10 = list(itertools.islice(fibonacci(), 10))

# Custom iterable class with __iter__
@dataclass
class PagedAPI:
    """Iterates through paginated API results transparently."""
    base_url: str
    _page: int = field(default=0, init=False)

    def __iter__(self) -> Iterator[dict]:
        page = 0
        while True:
            results = self._fetch_page(page)
            if not results:
                return
            yield from results  # yield each item from the page
            page += 1

    def _fetch_page(self, page: int) -> list[dict]:
        # Simulated — real implementation would call an API
        if page >= 3:
            return []
        return [{"id": page * 10 + i} for i in range(10)]

# Client code uses standard for-loop — iterator is transparent
for item in PagedAPI("https://api.example.com/items"):
    print(item["id"])
```

### Framework equivalents `[interpretation]`

- **Built-in**: `for` loop, list comprehensions, `map()`, `filter()` all consume iterators
- **`itertools`**: `chain`, `groupby`, `islice`, `product` — iterator combinators
- **Django QuerySet**: Lazy iteration — SQL fetches rows as you iterate

---

## Mediator (p. 273)

### Modern Python `[interpretation]`

An event mediator or message bus decouples components. `asyncio` event loop is itself a mediator.

```python
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Callable, Any

type EventHandler = Callable[[dict[str, Any]], None]

class EventBus:
    """Mediator: components publish/subscribe via this hub, not directly."""

    def __init__(self) -> None:
        self._handlers: dict[str, list[EventHandler]] = defaultdict(list)

    def subscribe(self, event: str, handler: EventHandler) -> None:
        self._handlers[event].append(handler)

    def publish(self, event: str, data: dict[str, Any] | None = None) -> None:
        for handler in self._handlers.get(event, []):
            handler(data or {})

# Components communicate through mediator, never directly
bus = EventBus()

def on_user_created(data: dict[str, Any]) -> None:
    print(f"Sending welcome email to {data['email']}")

def on_user_created_log(data: dict[str, Any]) -> None:
    print(f"Audit log: user {data['email']} created")

bus.subscribe("user.created", on_user_created)
bus.subscribe("user.created", on_user_created_log)

# Publisher doesn't know about subscribers
bus.publish("user.created", {"email": "new@example.com"})
```

### Framework equivalents `[interpretation]`

- **`asyncio`**: The event loop mediates between coroutines, I/O, and callbacks
- **Django signals**: `post_save.connect(handler)` — a mediator between models and side effects
- **FastAPI**: Dependency injection system mediates between route handlers and their dependencies

---

## Memento (p. 283)

### Modern Python `[interpretation]`

Use `copy.copy()` for state snapshots or `dataclasses.asdict()` for serializable mementos.

```python
import copy
from dataclasses import dataclass, field, asdict
import json

@dataclass
class Document:
    title: str
    content: str
    tags: list[str] = field(default_factory=list)

    def snapshot(self) -> dict:
        """Create a memento — serializable state snapshot."""
        return asdict(self)

    @classmethod
    def restore(cls, memento: dict) -> "Document":
        """Restore from memento."""
        return cls(**memento)

class History:
    """Caretaker: stores mementos without knowing their internals."""

    def __init__(self) -> None:
        self._snapshots: list[dict] = []

    def save(self, doc: Document) -> None:
        self._snapshots.append(doc.snapshot())

    def undo(self) -> Document | None:
        if self._snapshots:
            return Document.restore(self._snapshots.pop())
        return None

# Usage
doc = Document("Draft", "Hello")
history = History()
history.save(doc)

doc.content = "Hello World"
doc.tags.append("greeting")
history.save(doc)

doc.content = "DELETED"
restored = history.undo()  # back to "Hello World" + ["greeting"]
```

### Framework equivalents `[interpretation]`

- **`dataclasses.asdict()`**: Serializes dataclass state — a built-in memento mechanism
- **Django**: `Model.__dict__.copy()` or `django-simple-history` for model state tracking
- **`pickle`**: Serializes entire object graph for persistence (heavier than needed for undo)

---

## Observer (p. 293)

### Modern Python `[interpretation]`

A simple pub/sub implementation. Built into many frameworks as signals or event hooks.

```python
from dataclasses import dataclass, field
from typing import Callable, Any
from weakref import WeakMethod, ref

type Callback = Callable[[Any], None]

@dataclass
class Observable:
    """Minimal observer/pub-sub mixin."""
    _observers: dict[str, list[Callback]] = field(default_factory=dict, init=False)

    def on(self, event: str, callback: Callback) -> None:
        self._observers.setdefault(event, []).append(callback)

    def off(self, event: str, callback: Callback) -> None:
        self._observers.get(event, []).remove(callback)

    def emit(self, event: str, data: Any = None) -> None:
        for cb in self._observers.get(event, []):
            cb(data)

@dataclass
class PriceTracker(Observable):
    symbol: str
    _price: float = 0.0

    @property
    def price(self) -> float:
        return self._price

    @price.setter
    def price(self, value: float) -> None:
        old = self._price
        self._price = value
        if old != value:
            self.emit("price_changed", {"symbol": self.symbol, "old": old, "new": value})

# Observers are plain functions
def log_price(data: dict) -> None:
    print(f"{data['symbol']}: {data['old']} -> {data['new']}")

tracker = PriceTracker(symbol="AAPL")
tracker.on("price_changed", log_price)
tracker.price = 150.0  # triggers notification
tracker.price = 155.0  # triggers notification
```

### Framework equivalents `[interpretation]`

- **Django signals**: `pre_save`, `post_save`, `post_delete` — observer pattern for model lifecycle
- **FastAPI**: `@app.on_event("startup")` / `@app.on_event("shutdown")` — lifecycle observers
- **`asyncio`**: `loop.add_signal_handler()` — OS signal observation

---

## State (p. 305)

### Modern Python `[interpretation]`

Use an enum plus dispatch, or methods that swap behavior based on state.

```python
from dataclasses import dataclass
from enum import Enum, auto
from typing import Never

class OrderStatus(Enum):
    PENDING = auto()
    PAID = auto()
    SHIPPED = auto()
    DELIVERED = auto()
    CANCELLED = auto()

@dataclass
class Order:
    id: str
    status: OrderStatus = OrderStatus.PENDING

    def pay(self) -> None:
        match self.status:
            case OrderStatus.PENDING:
                self.status = OrderStatus.PAID
                print(f"Order {self.id} paid")
            case OrderStatus.CANCELLED:
                raise ValueError("Cannot pay a cancelled order")
            case _:
                raise ValueError(f"Cannot pay in state {self.status.name}")

    def ship(self) -> None:
        match self.status:
            case OrderStatus.PAID:
                self.status = OrderStatus.SHIPPED
                print(f"Order {self.id} shipped")
            case _:
                raise ValueError(f"Cannot ship in state {self.status.name}")

    def deliver(self) -> None:
        match self.status:
            case OrderStatus.SHIPPED:
                self.status = OrderStatus.DELIVERED
                print(f"Order {self.id} delivered")
            case _:
                raise ValueError(f"Cannot deliver in state {self.status.name}")

    def cancel(self) -> None:
        match self.status:
            case OrderStatus.PENDING | OrderStatus.PAID:
                self.status = OrderStatus.CANCELLED
                print(f"Order {self.id} cancelled")
            case _:
                raise ValueError(f"Cannot cancel in state {self.status.name}")

order = Order("ORD-001")
order.pay()     # PENDING -> PAID
order.ship()    # PAID -> SHIPPED
order.deliver() # SHIPPED -> DELIVERED
```

### Framework equivalents `[interpretation]`

- **`django-fsm`**: Field-level state machines with transition decorators
- **`asyncio.Task`**: Tasks transition through PENDING, RUNNING, DONE, CANCELLED
- **`transitions`**: Popular library for declarative state machines in Python

---

## Strategy (p. 315)

### Modern Python `[interpretation]`

First-class functions replace most Strategy uses. `sorted(key=...)` IS Strategy.

```python
from dataclasses import dataclass
from typing import Callable

# Strategy is just a callable — no class hierarchy needed
type PricingStrategy = Callable[[float], float]

def full_price(amount: float) -> float:
    return amount

def ten_percent_off(amount: float) -> float:
    return amount * 0.90

def buy_over_100_get_20_off(amount: float) -> float:
    return amount - 20 if amount > 100 else amount

@dataclass
class ShoppingCart:
    items: list[tuple[str, float]]
    pricing: PricingStrategy = full_price  # inject strategy

    def total(self) -> float:
        raw = sum(price for _, price in self.items)
        return self.pricing(raw)

# Swap strategy at runtime
cart = ShoppingCart([("Book", 30.0), ("Pen", 5.0)])
cart.pricing = ten_percent_off
print(cart.total())  # 31.5

# Built-in example: sorted(key=...) IS Strategy
users = [{"name": "Zara", "age": 25}, {"name": "Alex", "age": 30}]
by_name = sorted(users, key=lambda u: u["name"])
by_age = sorted(users, key=lambda u: u["age"])
```

### Framework equivalents `[interpretation]`

- **`sorted(key=...)`**: The `key` parameter is a strategy for comparison
- **`json.dumps(default=...)`**: Custom serialization strategy for non-standard types
- **FastAPI Depends**: Inject different strategy callables via dependency injection

---

## Template Method (p. 325)

### Modern Python `[interpretation]`

Abstract base classes with `@abstractmethod` for the varying steps. Still relevant and idiomatic.

```python
from abc import ABC, abstractmethod
from pathlib import Path

class DataPipeline(ABC):
    """Template Method: fixed algorithm, customizable steps."""

    def run(self, source: str) -> list[dict]:
        """The template — subclasses CANNOT override this."""
        raw = self.extract(source)
        cleaned = self.transform(raw)
        self.validate(cleaned)
        return cleaned

    @abstractmethod
    def extract(self, source: str) -> list[dict]:
        """Step 1: extract raw data — MUST override."""
        ...

    @abstractmethod
    def transform(self, data: list[dict]) -> list[dict]:
        """Step 2: transform data — MUST override."""
        ...

    def validate(self, data: list[dict]) -> None:
        """Step 3: optional hook — CAN override (default: no-op)."""
        pass

class CSVPipeline(DataPipeline):
    def extract(self, source: str) -> list[dict]:
        import csv
        with open(source) as f:
            return list(csv.DictReader(f))

    def transform(self, data: list[dict]) -> list[dict]:
        return [{k: v.strip() for k, v in row.items()} for row in data]

class JSONPipeline(DataPipeline):
    def extract(self, source: str) -> list[dict]:
        import json
        return json.loads(Path(source).read_text())

    def transform(self, data: list[dict]) -> list[dict]:
        return [row for row in data if row.get("active")]

# Algorithm structure is fixed; steps vary by subclass
results = CSVPipeline().run("data.csv")
```

### Framework equivalents `[interpretation]`

- **`unittest.TestCase`**: `setUp()` / `test_*()` / `tearDown()` is a template method
- **Django CBVs**: `get()`, `post()`, `get_queryset()` — override steps of a fixed dispatch flow
- **`collections.abc`**: `MutableMapping` — implement `__getitem__` etc., get `update()`/`keys()` for free

---

## Visitor (p. 331)

### Modern Python `[interpretation]`

`functools.singledispatch` IS the modern Python Visitor. Also `match/case` for structural dispatch.

```python
import functools
from dataclasses import dataclass
import math

# Node types
@dataclass
class Circle:
    radius: float

@dataclass
class Rectangle:
    width: float
    height: float

@dataclass
class Triangle:
    base: float
    height: float

type Shape = Circle | Rectangle | Triangle

# Visitor via singledispatch — add operations without modifying classes
@functools.singledispatch
def area(shape: Shape) -> float:
    raise NotImplementedError(f"No area visitor for {type(shape)}")

@area.register
def _(shape: Circle) -> float:
    return math.pi * shape.radius ** 2

@area.register
def _(shape: Rectangle) -> float:
    return shape.width * shape.height

@area.register
def _(shape: Triangle) -> float:
    return 0.5 * shape.base * shape.height

# Another visitor — same types, different operation
@functools.singledispatch
def to_svg(shape: Shape) -> str:
    raise NotImplementedError

@to_svg.register
def _(shape: Circle) -> str:
    return f'<circle r="{shape.radius}"/>'

@to_svg.register
def _(shape: Rectangle) -> str:
    return f'<rect width="{shape.width}" height="{shape.height}"/>'

@to_svg.register
def _(shape: Triangle) -> str:
    return f'<polygon points="0,{shape.height} {shape.base},0 ..."/>'

# Alternative: match/case (Python 3.10+) for inline visiting
def describe(shape: Shape) -> str:
    match shape:
        case Circle(r):
            return f"Circle with radius {r}"
        case Rectangle(w, h):
            return f"{w}x{h} Rectangle"
        case Triangle(b, h):
            return f"Triangle base={b} height={h}"

shapes: list[Shape] = [Circle(5), Rectangle(3, 4), Triangle(6, 8)]
areas = [area(s) for s in shapes]  # visitor dispatches by type
```

### Framework equivalents `[interpretation]`

- **`functools.singledispatch`**: The standard library's single-dispatch visitor mechanism
- **`ast.NodeVisitor`**: `visit_FunctionDef()`, `visit_ClassDef()` — classic visitor for AST traversal
- **`match/case`**: Structural pattern matching (Python 3.10+) handles visitor-like type dispatch inline

---
