# PEAA Pattern Catalog — Python / FastAPI Reference

**Purpose**: Python code examples and FastAPI + SQLAlchemy framework equivalents for all 51
PEAA patterns. Use alongside `catalog-core.md` (language-agnostic definitions).

**Stack coverage**: Python 3.10+, FastAPI, SQLAlchemy 2.x (async), Pydantic v2

**Anti-hallucination policy**: Code examples adapted from Fowler's book structure, tagged
with source page. Framework equivalents marked `[interpretation]`.

---
## Transaction Script
### Code Signature (Python)
*(adapted from book's Java example, p. 112–115)*
```python
# Each business transaction is a standalone procedure (function or method)
# Data access is done inline or via a simple gateway

class RecognitionService:
    def calculate_revenue_recognitions(self, contract_id: int) -> None:
        # One procedure handles one business transaction end to end
        contract = self.db.find_contract(contract_id)
        if contract.product_type == "WP":
            self.db.insert_recognition(contract_id, contract.amount, contract.when_signed)
        elif contract.product_type == "SS":
            allocation = contract.amount / 3
            self.db.insert_recognition(contract_id, allocation, contract.when_signed)
            self.db.insert_recognition(contract_id, allocation, contract.when_signed + timedelta(days=60))
            self.db.insert_recognition(contract_id, allocation, contract.when_signed + timedelta(days=90))
        # All logic for this transaction lives here

    def recognized_revenue(self, contract_id: int, as_of: date) -> Decimal:
        # Separate script for a separate business operation
        return self.db.sum_recognitions(contract_id, as_of)
```

### Modern Framework Equivalents [interpretation]
- FastAPI: Route handler functions containing business logic inline
- Flask: View functions with embedded logic — a common starting point that outgrows itself

---
## Domain Model
### Code Signature (Python)
*(adapted from book's Java example, p. 118–123)*
```python
# Domain objects contain behavior — they are NOT just data containers
# Each instance corresponds to one entity in the domain

class Contract:
    def __init__(self, product: "Product", amount: Decimal, when_signed: date):
        self.product = product
        self.amount = amount
        self.when_signed = when_signed
        self._recognitions: list["RevenueRecognition"] = []

    def calculate_recognitions(self) -> None:
        # Behavior lives on the domain object, not in a script
        self.product.calculate_revenue_recognitions(self)

    def recognized_revenue(self, as_of: date) -> Decimal:
        return sum(r.amount for r in self._recognitions if r.date <= as_of)

class Product:
    def __init__(self, name: str, recognition_strategy: "RecognitionStrategy"):
        self.name = name
        self._strategy = recognition_strategy

    def calculate_revenue_recognitions(self, contract: Contract) -> None:
        # Delegation to strategy — no conditionals on product type
        self._strategy.calculate_recognitions(contract)
```

### Modern Framework Equivalents [interpretation]
- SQLAlchemy: Domain classes decoupled from ORM mappers (classical mapping style)
- Python dataclasses or plain classes with behavior — no ORM coupling in domain objects

---
## Table Module
### Code Signature (Python)
*(adapted from book's C# example, p. 129–132)*
```python
# One class per table/view; single instance; operates on tabular data
# Passes record IDs rather than object references

class ContractModule:
    def __init__(self, data: list[dict]):  # data = rows from a query
        self._data = {row["id"]: row for row in data}

    def calculate_recognitions(self, contract_id: int) -> None:
        # Behavior is on the module, not on individual row objects
        row = self._data[contract_id]
        product = ProductModule(self._product_data)
        product_type = product.get_product_type(row["product_id"])
        if product_type == "WP":
            RevenueRecognitionModule.insert(contract_id, row["amount"], row["when_signed"])
        # ...

    def get_when_signed(self, contract_id: int) -> date:
        return self._data[contract_id]["when_signed"]
```

### Modern Framework Equivalents [interpretation]
- Rare in Python ecosystem — Python does not have a Record Set equivalent in standard libraries
- Most similar to pandas DataFrame operations combined with a manager class
- Common in .NET/VB6 era applications; less relevant in Python/Java contexts

---
## Service Layer
### Code Signature (Python)
*(adapted from book's Java POJO example, p. 155–159)*
```python
# Service Layer = application boundary, not where business logic lives
# Coordinates: transactions, security, notifications, responses

class RecognitionService:
    def __init__(self, contract_repo, email_gateway, integration_gateway):
        self._contracts = contract_repo
        self._email = email_gateway
        self._integration = integration_gateway

    def calculate_revenue_recognitions(self, contract_number: int) -> None:
        # Application logic: coordinate the response
        contract = self._contracts.find_for_update(contract_number)
        contract.calculate_recognitions()  # domain logic lives on the domain object
        self._email.send(
            contract.administrator_email,
            f"RE: Contract #{contract_number} has had revenue recognitions calculated."
        )
        self._integration.publish_recognition_calculation(contract)
        # Transaction boundary wraps this whole method
```

### Modern Framework Equivalents [interpretation]
- FastAPI: Dependency-injected service classes wrapping business logic
- Common pattern in Clean Architecture and Hexagonal Architecture as the "application" layer

---
## Table Data Gateway
### Code Signature (Python)
*(adapted from book's C# example, p. 147–151)*
```python
# One class per table; all SQL for that table lives here
# Returns raw data (dicts/tuples) or Record Set equivalents, not domain objects

class PersonGateway:
    def __init__(self, connection):
        self._conn = connection

    def find_all(self) -> list[dict]:
        cursor = self._conn.execute("SELECT * FROM person")
        return [dict(row) for row in cursor.fetchall()]

    def find_with_last_name(self, last_name: str) -> list[dict]:
        cursor = self._conn.execute(
            "SELECT * FROM person WHERE lastname = ?", (last_name,)
        )
        return [dict(row) for row in cursor.fetchall()]

    def insert(self, last_name: str, first_name: str, num_dependents: int) -> int:
        cursor = self._conn.execute(
            "INSERT INTO person (lastname, firstname, num_dependents) VALUES (?, ?, ?)",
            (last_name, first_name, num_dependents)
        )
        self._conn.commit()
        return cursor.lastrowid

    def update(self, key: int, last_name: str, first_name: str, num_dependents: int) -> None:
        self._conn.execute(
            "UPDATE person SET lastname=?, firstname=?, num_dependents=? WHERE id=?",
            (last_name, first_name, num_dependents, key)
        )
        self._conn.commit()

    def delete(self, key: int) -> None:
        self._conn.execute("DELETE FROM person WHERE id = ?", (key,))
        self._conn.commit()
```

### Modern Framework Equivalents [interpretation]
- SQLAlchemy Session queries / custom Repository class (though they return model instances, not raw data)
- SQLAlchemy Core: Table-level query objects — close equivalent
- Repository pattern in many Python projects often ends up as Table Data Gateway in practice

---
## Row Data Gateway
### Code Signature (Python)
*(adapted from book's Java example, p. 154–158)*
```python
# One instance per database row — factory methods for finding, instance for data access

class PersonGateway:
    def __init__(self, last_name: str, first_name: str, num_dependents: int, key: int = None):
        self.last_name = last_name
        self.first_name = first_name
        self.num_dependents = num_dependents
        self._key = key

    @classmethod
    def find(cls, conn, key: int) -> "PersonGateway":
        row = conn.execute("SELECT * FROM person WHERE id = ?", (key,)).fetchone()
        return cls(row["lastname"], row["firstname"], row["num_dependents"], key=row["id"])

    @classmethod
    def find_for_company(cls, conn, company_id: int) -> list["PersonGateway"]:
        rows = conn.execute("SELECT * FROM person WHERE company_id = ?", (company_id,)).fetchall()
        return [cls(r["lastname"], r["firstname"], r["num_dependents"], key=r["id"]) for r in rows]

    def insert(self, conn) -> int:
        cursor = conn.execute(
            "INSERT INTO person (lastname, firstname, num_dependents) VALUES (?, ?, ?)",
            (self.last_name, self.first_name, self.num_dependents)
        )
        conn.commit()
        self._key = cursor.lastrowid
        return self._key

    def update(self, conn) -> None:
        conn.execute(
            "UPDATE person SET lastname=?, firstname=?, num_dependents=? WHERE id=?",
            (self.last_name, self.first_name, self.num_dependents, self._key)
        )
        conn.commit()
```

### Modern Framework Equivalents [interpretation]
- SQLAlchemy: Classical mapped classes without domain behavior
- Rare as a standalone pattern — usually evolves into Active Record

---
## Active Record
### Code Signature (Python)
*(adapted from book, p. 161–163)*
```python
# Domain object AND database access combined — the object knows how to persist itself

class Person:
    def __init__(self, last_name: str, first_name: str, num_dependents: int):
        self.last_name = last_name
        self.first_name = first_name
        self.num_dependents = num_dependents
        self._id: int | None = None

    @classmethod
    def find(cls, conn, key: int) -> "Person":
        row = conn.execute("SELECT * FROM person WHERE id = ?", (key,)).fetchone()
        obj = cls(row["lastname"], row["firstname"], row["num_dependents"])
        obj._id = row["id"]
        return obj

    def insert(self, conn) -> None:
        cursor = conn.execute(
            "INSERT INTO person (lastname, firstname, num_dependents) VALUES (?, ?, ?)",
            (self.last_name, self.first_name, self.num_dependents)
        )
        conn.commit()
        self._id = cursor.lastrowid

    def update(self, conn) -> None:
        conn.execute(
            "UPDATE person SET lastname=?, firstname=?, num_dependents=? WHERE id=?",
            (self.last_name, self.first_name, self.num_dependents, self._id)
        )
        conn.commit()

    # Domain logic lives on the object too
    def is_eligible_for_benefit(self) -> bool:
        return self.num_dependents > 0
```

### Modern Framework Equivalents [interpretation]
- **SQLAlchemy ORM declarative models (used with FastAPI)**: The canonical Python Active Record implementation
- **SQLAlchemy declarative models** (with session): Active Record style
- Ruby on Rails `ActiveRecord::Base`: the pattern's most famous implementation
- Peewee ORM models

---
## Data Mapper
### Code Signature (Python)
*(adapted from book's Java example, p. 167–183)*
```python
# Domain object has NO knowledge of the database
class Person:
    def __init__(self, last_name: str, first_name: str, num_dependents: int):
        self.last_name = last_name
        self.first_name = first_name
        self.num_dependents = num_dependents
    # No insert(), find(), update() methods — completely ignorant of persistence

# Mapper handles all translation between domain objects and database rows
class PersonMapper:
    def __init__(self, connection):
        self._conn = connection

    def find(self, key: int) -> Person:
        row = self._conn.execute("SELECT * FROM person WHERE id = ?", (key,)).fetchone()
        return self._load(row)

    def insert(self, person: Person) -> int:
        cursor = self._conn.execute(
            "INSERT INTO person (lastname, firstname, num_dependents) VALUES (?, ?, ?)",
            (person.last_name, person.first_name, person.num_dependents)
        )
        self._conn.commit()
        return cursor.lastrowid

    def update(self, key: int, person: Person) -> None:
        self._conn.execute(
            "UPDATE person SET lastname=?, firstname=?, num_dependents=? WHERE id=?",
            (person.last_name, person.first_name, person.num_dependents, key)
        )
        self._conn.commit()

    def _load(self, row) -> Person:
        return Person(row["lastname"], row["firstname"], row["num_dependents"])
```

### Modern Framework Equivalents [interpretation]
- **SQLAlchemy classical mapping** (separate Table and mapper_registry.map_imperatively)
- **Pydantic schemas (FastAPI)** (partial — mapping but not full domain isolation)
- ORM tools like SQLAlchemy, Hibernate are essentially sophisticated Data Mapper implementations

---
## Unit of Work
### Code Signature (Python)
*(adapted from book's Java example, p. 185–194)*
```python
class UnitOfWork:
    def __init__(self):
        self._new: list = []
        self._dirty: list = []
        self._removed: list = []

    def register_new(self, obj) -> None:
        self._new.append(obj)

    def register_dirty(self, obj) -> None:
        if obj not in self._dirty:
            self._dirty.append(obj)

    def register_removed(self, obj) -> None:
        self._removed.append(obj)

    def commit(self, mapper_registry) -> None:
        for obj in self._new:
            mapper_registry.mapper_for(obj).insert(obj)
        for obj in self._dirty:
            mapper_registry.mapper_for(obj).update(obj)
        for obj in self._removed:
            mapper_registry.mapper_for(obj).delete(obj)
```

### Modern Framework Equivalents [interpretation]
- **SQLAlchemy Session**: The canonical Python Unit of Work implementation
- **SQLAlchemy `AsyncSession` / `async with session.begin()`**: partial UoW behavior
- **Entity Framework DbContext**: .NET equivalent

---
## Identity Map
### Code Signature (Python)
*(adapted from book's Java example, p. 196–199)*
```python
class IdentityMap:
    def __init__(self):
        self._map: dict[tuple, object] = {}  # (type, id) → object

    def get(self, cls: type, key: int):
        return self._map.get((cls, key))

    def put(self, cls: type, key: int, obj) -> None:
        self._map[(cls, key)] = obj

# In the mapper:
class PersonMapper:
    def find(self, key: int, uow: "UnitOfWork") -> Person:
        cached = uow.identity_map.get(Person, key)
        if cached:
            return cached  # return existing object, not a second copy
        row = self._conn.execute("SELECT * FROM person WHERE id = ?", (key,)).fetchone()
        person = Person(row["lastname"], row["firstname"], row["num_dependents"])
        uow.identity_map.put(Person, key, person)
        return person
```

### Modern Framework Equivalents [interpretation]
- **SQLAlchemy Session identity map**: Built-in — `session.get(Model, pk)` returns same object if already loaded
- **SQLAlchemy ORM (used with FastAPI)**: Does implement Identity Map via `Session` — two `session.get(Model, 1)` calls return the same instance within a session

---
## Lazy Load
### Code Signature (Python)
*(adapted from book's Java example — Lazy Initialization variation)*
```python
class Supplier:
    def __init__(self, supplier_id: int, connection):
        self._id = supplier_id
        self._conn = connection
        self._products = None  # not loaded yet

    @property
    def products(self) -> list:
        if self._products is None:
            # Load only when first accessed
            self._products = ProductMapper(self._conn).find_for_supplier(self._id)
        return self._products
```

### Modern Framework Equivalents [interpretation]
- **SQLAlchemy lazy loading (relationship with `lazy="select"`)**: the default relationship loading strategy
- **SQLAlchemy**: `lazy='select'` on relationships (default) implements lazy loading
- **SQLAlchemy**: `lazy='joined'` or `selectinload()` for eager loading to avoid N+1

---
## Identity Field
### Code Signature (Python)
*(adapted from book's C# and Java examples, pp. 222–235)*
```python
# The domain object's Layer Supertype holds the Identity Field
# A sentinel value marks objects not yet saved to the database

PLACEHOLDER_ID = -1

class DomainObject:
    def __init__(self):
        self.id: int = PLACEHOLDER_ID  # -1 = not yet persisted

    def is_new(self) -> bool:
        return self.id == PLACEHOLDER_ID

# Key table approach for generating new IDs (Java example, p. 228)
class KeyGenerator:
    """Reserves a block of IDs from a keys table in a separate transaction."""
    def __init__(self, conn, key_name: str, increment_by: int = 20):
        self._conn = conn
        self._key_name = key_name
        self._next_id = 0
        self._max_id = 0
        self._increment_by = increment_by

    def next_key(self) -> int:
        if self._next_id == self._max_id:
            self._reserve_ids()
        result = self._next_id
        self._next_id += 1
        return result

    def _reserve_ids(self):
        # SELECT ... FOR UPDATE, then UPDATE — runs in its own transaction
        row = self._conn.execute(
            "SELECT next_id FROM keys WHERE name = ? FOR UPDATE", (self._key_name,)
        ).fetchone()
        new_next = row["next_id"]
        new_max = new_next + self._increment_by
        self._conn.execute(
            "UPDATE keys SET next_id = ? WHERE name = ?", (new_max, self._key_name)
        )
        self._conn.commit()
        self._next_id = new_next
        self._max_id = new_max

# Compound key class (Java example, p. 230)
class Key:
    """For compound keys — wraps multiple fields, equality by value."""
    def __init__(self, *fields):
        if any(f is None for f in fields):
            raise ValueError("Key fields cannot be None")
        self._fields = tuple(fields)

    def __eq__(self, other):
        return isinstance(other, Key) and self._fields == other._fields

    def __hash__(self):
        return hash(self._fields)

    def value(self, i: int = 0):
        return self._fields[i]
```

### Modern Framework Equivalents [interpretation]
- **SQLAlchemy ORM (used with FastAPI)**: Every mapped class gets `Column(Integer, primary_key=True)` — automatic Identity Field
- **SQLAlchemy**: `Column(Integer, primary_key=True)` on every mapped class; `autoincrement=True` handles key generation
- **UUID primary keys**: Modern alternative to integer sequences — avoids key table coordination across distributed systems

---
## Foreign Key Mapping
### Code Signature (Python)
*(adapted from book's Java example, p. 236–247)*
```python
# Single-valued reference: album → artist (artist ID stored as foreign key in albums table)
# The mapper reads the FK, loads the referenced object via its mapper

class AlbumMapper:
    def __init__(self, conn):
        self._conn = conn

    def find(self, album_id: int) -> "Album":
        row = self._conn.execute(
            "SELECT id, title, artist_id FROM albums WHERE id = ?", (album_id,)
        ).fetchone()
        return self._load(row)

    def _load(self, row) -> "Album":
        artist = ArtistMapper(self._conn).find(row["artist_id"])  # load referenced object
        return Album(id=row["id"], title=row["title"], artist=artist)

    def insert(self, album: "Album") -> int:
        cursor = self._conn.execute(
            "INSERT INTO albums (title, artist_id) VALUES (?, ?)",
            (album.title, album.artist.id)  # save the FK, not the object
        )
        self._conn.commit()
        return cursor.lastrowid

    def update(self, album: "Album") -> None:
        self._conn.execute(
            "UPDATE albums SET title = ?, artist_id = ? WHERE id = ?",
            (album.title, album.artist.id, album.id)
        )
        self._conn.commit()

# Collection reference: album → [tracks] (track stores albumID as FK)
# Update strategy: delete-and-reinsert (simplest, requires tracks to be Dependent Mapping)

class AlbumMapper:
    def _update_tracks(self, album: "Album") -> None:
        self._conn.execute("DELETE FROM tracks WHERE album_id = ?", (album.id,))
        for i, track in enumerate(album.tracks):
            self._conn.execute(
                "INSERT INTO tracks (seq, album_id, title) VALUES (?, ?, ?)",
                (i + 1, album.id, track.title)
            )
```

### Modern Framework Equivalents [interpretation]
- **SQLAlchemy ORM (used with FastAPI)**: `ForeignKey` column + `relationship()` — handles single-valued reference; `back_populates` enables reverse access
- **SQLAlchemy**: `relationship()` with `ForeignKey` column — mapper handles load/save automatically
- **SQLAlchemy**: reverse collection via `relationship()` with `back_populates`; `joinedload()` or `selectinload()` to eager-load

---
## Association Table Mapping
### Code Signature (Python)
*(adapted from book's Java and C# examples, pp. 248–261)*
```python
# Many-to-many: Employee <--> Skill via employee_skills link table
# Schema: employees(ID, ...), skills(ID, name), employee_skills(employee_id, skill_id)

class EmployeeMapper:
    def __init__(self, conn):
        self._conn = conn

    def find(self, emp_id: int) -> "Employee":
        row = self._conn.execute(
            "SELECT id, firstname, lastname FROM employees WHERE id = ?", (emp_id,)
        ).fetchone()
        emp = Employee(id=row["id"], first=row["firstname"], last=row["lastname"])
        emp.skills = self._load_skills(emp_id)
        return emp

    def _load_skills(self, emp_id: int) -> list:
        # Two-query approach: link table then skill objects
        rows = self._conn.execute(
            "SELECT skill_id FROM employee_skills WHERE employee_id = ?", (emp_id,)
        ).fetchall()
        skill_mapper = SkillMapper(self._conn)
        return [skill_mapper.find(r["skill_id"]) for r in rows]

    def _load_skills_single_query(self, emp_id: int) -> list:
        # Optimized: join skills and link table in one query
        rows = self._conn.execute(
            "SELECT s.id, s.name FROM skills s "
            "JOIN employee_skills es ON s.id = es.skill_id "
            "WHERE es.employee_id = ?",
            (emp_id,)
        ).fetchall()
        return [Skill(id=r["id"], name=r["name"]) for r in rows]

    def update(self, emp: "Employee") -> None:
        # Delete-and-reinsert link rows (treat link table as dependent)
        self._conn.execute(
            "DELETE FROM employee_skills WHERE employee_id = ?", (emp.id,)
        )
        for skill in emp.skills:
            self._conn.execute(
                "INSERT INTO employee_skills (employee_id, skill_id) VALUES (?, ?)",
                (emp.id, skill.id)
            )
        self._conn.commit()
```

### Modern Framework Equivalents [interpretation]
- **SQLAlchemy ORM (used with FastAPI)**: `relationship()` with `secondary=` — SQLAlchemy creates and manages the join table automatically; association object pattern for link tables with extra data
- **SQLAlchemy**: `relationship()` with `secondary=` pointing to the association table; `Table` object defines the link table
- **SQLAlchemy**: `session.execute()` with bulk inserts/deletes on the association table handles link table transparently

---
## Dependent Mapping
### Code Signature (Python)
*(adapted from book's Java example, pp. 264–267)*
```python
# Track is a dependent of Album — no independent identity, no outside references
# AlbumMapper handles ALL SQL for tracks; Track has no persistence code

class Track:
    """Immutable dependent — any change requires replacing the Track object."""
    def __init__(self, title: str):
        self.title = title  # no id field — dependents have no Identity Field

class Album:
    def __init__(self, album_id: int, title: str, tracks: list["Track"] = None):
        self.id = album_id
        self.title = title
        self.tracks: list[Track] = tracks or []

    def add_track(self, track: Track) -> None:
        self.tracks.append(track)

    def remove_track(self, track: Track) -> None:
        self.tracks.remove(track)

class AlbumMapper:
    """Owner mapper handles all persistence for Album AND its Track dependents."""
    def __init__(self, conn):
        self._conn = conn

    def find(self, album_id: int) -> Album:
        row = self._conn.execute(
            "SELECT id, title FROM albums WHERE id = ?", (album_id,)
        ).fetchone()
        tracks = self._load_tracks(album_id)
        return Album(album_id=row["id"], title=row["title"], tracks=tracks)

    def _load_tracks(self, album_id: int) -> list[Track]:
        rows = self._conn.execute(
            "SELECT title FROM tracks WHERE album_id = ? ORDER BY seq",
            (album_id,)
        ).fetchall()
        return [Track(r["title"]) for r in rows]

    def update(self, album: Album) -> None:
        self._conn.execute(
            "UPDATE albums SET title = ? WHERE id = ?", (album.title, album.id)
        )
        # Delete-and-reinsert all dependents — simple and correct
        self._conn.execute("DELETE FROM tracks WHERE album_id = ?", (album.id,))
        for seq, track in enumerate(album.tracks, start=1):
            self._conn.execute(
                "INSERT INTO tracks (seq, album_id, title) VALUES (?, ?, ?)",
                (seq, album.id, track.title)
            )
        self._conn.commit()
```

### Modern Framework Equivalents [interpretation]
- **SQLAlchemy ORM (used with FastAPI)**: `relationship()` with `cascade="all, delete-orphan"` — closest equivalent; handles delete-and-reinsert via `lazy='joined'` and parent-scoped access
- **SQLAlchemy**: `relationship()` with `cascade="all, delete-orphan"` and `lazy='joined'` — handles dependent lifecycle
- The pattern is essentially what FastAPI route handlers do at the request layer — parent aggregate manages child lifecycle via the SQLAlchemy session

---
## Embedded Value
### Code Signature (Python)
*(adapted from book's Java example, pp. 270–271)*
```python
# Money is a Value Object — its fields are embedded into the owner's table columns
# Table: product_offerings (id, product_id, base_cost_amount DECIMAL, base_cost_currency CHAR(3))

from decimal import Decimal

class Money:
    """Value Object — no identity, equality by value, immutable."""
    def __init__(self, amount: Decimal, currency: str):
        self.amount = amount
        self.currency = currency

    def __eq__(self, other):
        return isinstance(other, Money) and self.amount == other.amount and self.currency == other.currency

class ProductOffering:
    """Owner — persists its Money field as embedded columns in its own table."""
    def __init__(self, offering_id: int, product_id: int, base_cost: Money):
        self.id = offering_id
        self.product_id = product_id
        self.base_cost = base_cost  # Value Object stored as embedded columns

    @classmethod
    def load(cls, conn, row) -> "ProductOffering":
        money = Money(
            amount=row["base_cost_amount"],
            currency=row["base_cost_currency"]
        )
        return cls(offering_id=row["id"], product_id=row["product_id"], base_cost=money)

    def save(self, conn) -> None:
        conn.execute(
            "UPDATE product_offerings SET base_cost_amount = ?, base_cost_currency = ? WHERE id = ?",
            (self.base_cost.amount, self.base_cost.currency, self.id)
        )
        conn.commit()
```

### Modern Framework Equivalents [interpretation]
- **SQLAlchemy ORM (used with FastAPI)**: use separate columns (`price_amount`, `price_currency`) and reconstruct the Value Object via `composite()` or a `@hybrid_property`
- **SQLAlchemy**: `composite()` mapper — maps multiple columns into a single Python object; the canonical SQLAlchemy Embedded Value implementation
- **SQLAlchemy `JSON` column type** with Pydantic validation: store structured value objects as JSON when full queryability is not required

---
## Serialized LOB
### Code Signature (Python)
*(adapted from book's Java XML example, pp. 274–276)*
```python
import json
import xml.etree.ElementTree as ET

# Schema: customers(ID INT, name VARCHAR, departments TEXT/BLOB)
# The departments hierarchy is serialized to XML/JSON and stored in one column

class Department:
    def __init__(self, name: str, subsidiaries: list["Department"] = None):
        self.name = name
        self.subsidiaries: list[Department] = subsidiaries or []

    def to_dict(self) -> dict:
        return {"name": self.name, "subsidiaries": [s.to_dict() for s in self.subsidiaries]}

    @classmethod
    def from_dict(cls, data: dict) -> "Department":
        subs = [cls.from_dict(s) for s in data.get("subsidiaries", [])]
        return cls(name=data["name"], subsidiaries=subs)

class Customer:
    def __init__(self, customer_id: int, name: str, departments: list[Department] = None):
        self.id = customer_id
        self.name = name
        self.departments: list[Department] = departments or []

    def insert(self, conn) -> int:
        lob = json.dumps([d.to_dict() for d in self.departments])  # serialize to JSON CLOB
        cursor = conn.execute(
            "INSERT INTO customers (name, departments) VALUES (?, ?)",
            (self.name, lob)
        )
        conn.commit()
        self.id = cursor.lastrowid
        return self.id

    @classmethod
    def load(cls, row) -> "Customer":
        deps_data = json.loads(row["departments"]) if row["departments"] else []
        deps = [Department.from_dict(d) for d in deps_data]
        return cls(customer_id=row["id"], name=row["name"], departments=deps)
```

### Modern Framework Equivalents [interpretation]
- **SQLAlchemy `JSON` column type** (PostgreSQL, SQLite 3.9+) — stores arbitrary Python dicts/lists; simplest modern Serialized LOB
- **SQLAlchemy**: `JSON` type column — transparent serialization; `PickleType` for binary serialization
- **PostgreSQL JSONB**: Supports indexing and querying into JSON fields — partially bridges the gap between Serialized LOB and Embedded Value

---
## Single Table Inheritance
### Code Signature (Python)
*(adapted from book's C# example, pp. 280–284)*
```python
# Schema: players(id, name, type, club, batting_average, bowling_average)
# type column: 'F'=Footballer, 'C'=Cricketer, 'B'=Bowler
# Columns for subclasses are NULL when not relevant to that class

class Player:
    TYPE_CODE: str = None  # overridden in subclasses

    def __init__(self, player_id: int, name: str):
        self.id = player_id
        self.name = name

class Footballer(Player):
    TYPE_CODE = "F"
    def __init__(self, player_id: int, name: str, club: str):
        super().__init__(player_id, name)
        self.club = club

class Cricketer(Player):
    TYPE_CODE = "C"
    def __init__(self, player_id: int, name: str, batting_average: float):
        super().__init__(player_id, name)
        self.batting_average = batting_average

class PlayerMapper:
    """Single mapper for the single players table — reads type code to instantiate correct class."""
    def __init__(self, conn):
        self._conn = conn

    def find(self, player_id: int) -> Player:
        row = self._conn.execute(
            "SELECT id, name, type, club, batting_average FROM players WHERE id = ?",
            (player_id,)
        ).fetchone()
        return self._load(row)

    def _load(self, row) -> Player:
        type_code = row["type"]
        if type_code == Footballer.TYPE_CODE:
            return Footballer(row["id"], row["name"], row["club"])
        elif type_code == Cricketer.TYPE_CODE:
            return Cricketer(row["id"], row["name"], row["batting_average"])
        else:
            raise ValueError(f"Unknown player type: {type_code}")

    def insert(self, player: Player) -> int:
        club = player.club if isinstance(player, Footballer) else None
        batting_avg = player.batting_average if isinstance(player, Cricketer) else None
        cursor = self._conn.execute(
            "INSERT INTO players (name, type, club, batting_average) VALUES (?, ?, ?, ?)",
            (player.name, player.TYPE_CODE, club, batting_avg)
        )
        self._conn.commit()
        return cursor.lastrowid
```

### Modern Framework Equivalents [interpretation]
- **SQLAlchemy ORM (used with FastAPI)**: single `__tablename__` with a `type` discriminator column; `__mapper_args__ = {"polymorphic_on": type_col}` dispatches subclass loading automatically
- **SQLAlchemy**: `__mapper_args__ = {"polymorphic_on": type_col, "polymorphic_identity": "F"}` with `single_table_inheritance` — the canonical SQLAlchemy STI implementation
- **Rails ActiveRecord**: `inheritance_column = 'type'` with STI is the default Rails approach to inheritance

---
## Class Table Inheritance
### Code Signature (Python)
*(adapted from book's C# example, pp. 287–292)*
```python
# Schema:
#   players(id, name, type)       — superclass table
#   footballers(id, club)         — subclass table, id = FK to players
#   cricketers(id, batting_average) — subclass table
# Each concrete mapper loads from its own table AND the players table

class AbstractPlayerMapper:
    PLAYERS_TABLE = "players"
    TYPE_CODE: str = None  # overridden in concrete mappers

    def __init__(self, conn):
        self._conn = conn

    def _load_player_fields(self, obj: "Player", player_id: int) -> None:
        row = self._conn.execute(
            "SELECT name FROM players WHERE id = ?", (player_id,)
        ).fetchone()
        obj.name = row["name"]

class FootballerMapper(AbstractPlayerMapper):
    TYPE_CODE = "F"
    TABLENAME = "footballers"

    def find(self, player_id: int) -> "Footballer":
        row = self._conn.execute(
            "SELECT id, club FROM footballers WHERE id = ?", (player_id,)
        ).fetchone()
        obj = Footballer.__new__(Footballer)
        obj.id = row["id"]
        obj.club = row["club"]
        self._load_player_fields(obj, player_id)  # also read from players table
        return obj

    def insert(self, player: "Footballer") -> int:
        # Insert into players table first
        cursor = self._conn.execute(
            "INSERT INTO players (name, type) VALUES (?, ?)",
            (player.name, self.TYPE_CODE)
        )
        player_id = cursor.lastrowid
        # Then insert into footballers table with the same ID
        self._conn.execute(
            "INSERT INTO footballers (id, club) VALUES (?, ?)",
            (player_id, player.club)
        )
        self._conn.commit()
        return player_id

class PlayerMapper:
    """Wrapper mapper — reads type from players table, delegates to concrete mapper."""
    def __init__(self, conn):
        self._conn = conn
        self._fmapper = FootballerMapper(conn)
        self._cmapper = CricketerMapper(conn)

    def find(self, player_id: int) -> "Player":
        row = self._conn.execute(
            "SELECT type FROM players WHERE id = ?", (player_id,)
        ).fetchone()
        type_code = row["type"]
        if type_code == FootballerMapper.TYPE_CODE:
            return self._fmapper.find(player_id)
        elif type_code == CricketerMapper.TYPE_CODE:
            return self._cmapper.find(player_id)
        raise ValueError(f"Unknown type: {type_code}")
```

### Modern Framework Equivalents [interpretation]
- **SQLAlchemy joined table inheritance** (used with FastAPI)**: each model gets its own `__tablename__`; SQLAlchemy creates a JOIN automatically; subclass access joins tables implicitly
- **SQLAlchemy**: `joined_table_inheritance` with `__mapper_args__ = {"polymorphic_on": ..., "polymorphic_identity": ...}` on each subclass with its own `__tablename__`
- IBM texts refer to this pattern as "Root-Leaf Mapping"

---
## Concrete Table Inheritance
### Code Signature (Python)
*(adapted from book's C# example, pp. 296–301)*
```python
# Schema: each concrete class gets its own fully self-contained table
#   footballers(id, name, club)
#   cricketers(id, name, batting_average)
#   bowlers(id, name, batting_average, bowling_average)
# All superclass fields duplicated in each concrete table

class CricketerMapper:
    TABLENAME = "cricketers"
    TYPE_CODE = "C"

    def __init__(self, conn):
        self._conn = conn

    def find(self, player_id: int) -> "Cricketer":
        row = self._conn.execute(
            f"SELECT id, name, batting_average FROM {self.TABLENAME} WHERE id = ?",
            (player_id,)
        ).fetchone()
        if row is None:
            return None
        obj = Cricketer.__new__(Cricketer)
        obj.id = row["id"]
        obj.name = row["name"]
        obj.batting_average = row["batting_average"]
        return obj

class PlayerMapper:
    """Superclass mapper — tries each concrete mapper to find the player."""
    def __init__(self, conn):
        self._conn = conn
        self._fmapper = FootballerMapper(conn)
        self._cmapper = CricketerMapper(conn)
        self._bmapper = BowlerMapper(conn)

    def find(self, player_id: int) -> "Player":
        # Try each table — viable only if data is already in memory; otherwise slow
        result = self._fmapper.find(player_id)
        if result: return result
        result = self._bmapper.find(player_id)
        if result: return result
        result = self._cmapper.find(player_id)
        if result: return result
        return None

    def update(self, player: "Player") -> None:
        self._mapper_for(player).update(player)

    def _mapper_for(self, player: "Player"):
        if isinstance(player, Footballer): return self._fmapper
        if isinstance(player, Bowler): return self._bmapper
        if isinstance(player, Cricketer): return self._cmapper
        raise ValueError("No mapper for type")
```

### Modern Framework Equivalents [interpretation]
- **SQLAlchemy**: `concrete_table_inheritance` with `__mapper_args__ = {"concrete": True}` — each subclass mapped to its own full table; `polymorphic_union()` creates a UNION view for superclass queries
- **SQLAlchemy ORM (used with FastAPI)**: No native shortcut — closest is using separate `DeclarativeBase` models without joined inheritance and managing dispatch manually in FastAPI route handlers
- **Hibernate**: `TABLE_PER_CLASS` strategy

---
## Inheritance Mappers
### Code Signature (Python)
*(adapted from book's C# examples, pp. 302–305)*
```python
# The three-class structure for inheritance mapping:
# 1. AbstractPlayerMapper — abstract, handles player-level load/save
# 2. CricketerMapper (concrete) — handles cricketer-specific fields; subclass of AbstractPlayerMapper
# 3. PlayerMapper (wrapper) — public interface; delegates to the right concrete mapper

from abc import ABC, abstractmethod

class AbstractMapper(ABC):
    """Layer Supertype for all mappers — provides generic insert/update/delete interface."""
    @abstractmethod
    def insert(self, obj) -> int: ...
    @abstractmethod
    def update(self, obj) -> None: ...
    @abstractmethod
    def delete(self, obj) -> None: ...

class AbstractPlayerMapper(AbstractMapper, ABC):
    """Abstract — only used by concrete subclass mappers, not directly by callers."""
    @property
    @abstractmethod
    def type_code(self) -> str: ...

    def _load_player(self, obj, row) -> None:
        obj.name = row["name"]

    def _save_player(self, obj, conn) -> None:
        # Each concrete mapper calls this to save the common player fields
        conn.execute(
            "UPDATE players SET name = ?, type = ? WHERE id = ?",
            (obj.name, self.type_code, obj.id)
        )

class CricketerMapper(AbstractPlayerMapper):
    type_code = "C"

    def find(self, player_id: int, conn) -> "Cricketer":
        # (implementation varies by inheritance strategy — STI, CTI, or CTI)
        ...

    def _load(self, obj, row) -> None:
        self._load_player(obj, row)  # load common player fields
        obj.batting_average = row["batting_average"]  # load subclass-specific fields

class PlayerMapper:
    """Wrapper — provides the find/insert/update/delete interface at the Player level."""
    def __init__(self, conn):
        self._conn = conn
        self._fmapper = FootballerMapper(conn)
        self._cmapper = CricketerMapper(conn)
        self._bmapper = BowlerMapper(conn)

    def update(self, player) -> None:
        self._mapper_for(player).update(player)  # delegate to concrete mapper

    def insert(self, player) -> int:
        return self._mapper_for(player).insert(player)

    def _mapper_for(self, player):
        if isinstance(player, Footballer): return self._fmapper
        if isinstance(player, Cricketer): return self._cmapper
        if isinstance(player, Bowler): return self._bmapper
        raise ValueError("No mapper for this type")
```

### Modern Framework Equivalents [interpretation]
- **SQLAlchemy**: The entire polymorphic mapper infrastructure (`polymorphic_on`, `polymorphic_identity`, `with_polymorphic()`) implements this pattern automatically for all three inheritance strategies
- **SQLAlchemy joined table inheritance** (used with FastAPI): SQLAlchemy's generic association extension (`sqlalchemy_utils.generic`) is a generalization of the wrapper-mapper concept
- **Hibernate**: `@Inheritance(strategy=...)` annotation implements the same three-way structure

---
## Metadata Mapping
### Code Signature (Python)
*(adapted from book's Java reflection example, pp. 310–315)*
```python
# DataMap: holds the class-to-table mapping and a list of ColumnMaps
# ColumnMap: maps one column name to one field name, uses reflection to set/get

import dataclasses
from typing import Any

@dataclasses.dataclass
class ColumnMap:
    column_name: str     # DB column
    field_name: str      # Python attribute name on the domain object

    def get_value(self, obj: Any) -> Any:
        return getattr(obj, self.field_name)

    def set_value(self, obj: Any, value: Any) -> None:
        setattr(obj, self.field_name, value)

class DataMap:
    def __init__(self, domain_class: type, table_name: str):
        self.domain_class = domain_class
        self.table_name = table_name
        self.column_maps: list[ColumnMap] = []

    def add_column(self, column_name: str, field_name: str) -> None:
        self.column_maps.append(ColumnMap(column_name, field_name))

    def column_list(self) -> str:
        return "ID, " + ", ".join(cm.column_name for cm in self.column_maps)

# Generic mapper that uses reflection to load/save any mapped class
class ReflectiveMapper:
    def __init__(self, data_map: DataMap, conn):
        self._map = data_map
        self._conn = conn

    def find_object(self, key: int) -> Any:
        sql = (f"SELECT {self._map.column_list()} "
               f"FROM {self._map.table_name} WHERE ID = ?")
        row = self._conn.execute(sql, (key,)).fetchone()
        return self._load(row)

    def _load(self, row) -> Any:
        obj = self._map.domain_class.__new__(self._map.domain_class)
        obj.id = row["ID"]
        for cm in self._map.column_maps:
            cm.set_value(obj, row[cm.column_name])
        return obj

    def update(self, obj: Any) -> None:
        set_clause = ", ".join(f"{cm.column_name} = ?" for cm in self._map.column_maps)
        values = [cm.get_value(obj) for cm in self._map.column_maps] + [obj.id]
        self._conn.execute(
            f"UPDATE {self._map.table_name} SET {set_clause} WHERE ID = ?", values
        )
        self._conn.commit()

# Configuration — defined once, drives all mapping behavior
person_map = DataMap(Person, "people")
person_map.add_column("lastname", "last_name")
person_map.add_column("firstname", "first_name")
person_map.add_column("number_of_dependents", "num_dependents")
```

### Modern Framework Equivalents [interpretation]
- **SQLAlchemy**: The entire ORM is a Metadata Mapping framework — `Table` objects, `mapper_registry`, and `relationship()` are all metadata; the engine uses reflection (`autoload=True`) or explicit column definitions
- **SQLAlchemy ORM (used with FastAPI)**: `sqlalchemy.orm.DeclarativeBase` class declarations are metadata; SQLAlchemy translates them to SQL at runtime using introspection
- **Alembic** (SQLAlchemy migration tool): Migration files are essentially changes to the Metadata Mapping

---
## Query Object
### Code Signature (Python)
*(adapted from book's Java example, p. 317–320)*

```python
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any


@dataclass
class Criteria:
    """A single predicate: column operator value."""
    sql_operator: str
    field_name: str
    value: Any

    @classmethod
    def greater_than(cls, field_name: str, value: Any) -> "Criteria":
        return cls("> ", field_name, value)

    @classmethod
    def matches(cls, field_name: str, pattern: str) -> "MatchCriteria":
        return MatchCriteria(field_name, pattern)

    def generate_sql(self, data_map: "DataMap") -> str:
        col = data_map.get_column_for_field(self.field_name)
        return f"{col} {self.sql_operator} {self.value!r}"


class MatchCriteria(Criteria):
    """Case-insensitive LIKE match — a more complex criteria subclass."""
    def __init__(self, field_name: str, pattern: str):
        super().__init__("LIKE", field_name, pattern)

    def generate_sql(self, data_map: "DataMap") -> str:
        col = data_map.get_column_for_field(self.field_name)
        return f"UPPER({col}) LIKE UPPER({self.value!r})"


class QueryObject:
    """Represents a database query as an object (Interpreter pattern)."""
    def __init__(self, domain_class: type):
        self._klass = domain_class
        self._criteria: list[Criteria] = []

    def add_criteria(self, criterion: Criteria) -> "QueryObject":
        self._criteria.append(criterion)
        return self

    def execute(self, unit_of_work) -> list:
        mapper = unit_of_work.get_mapper(self._klass)
        return mapper.find_objects_where(self._generate_where_clause(mapper.data_map))

    def _generate_where_clause(self, data_map: "DataMap") -> str:
        parts = [c.generate_sql(data_map) for c in self._criteria]
        return " AND ".join(parts)


# Usage — querying in domain terms, not SQL terms:
# query = QueryObject(Person)
# query.add_criteria(Criteria.greater_than("num_dependents", 0))
# query.add_criteria(Criteria.matches("last_name", "F%"))
# results = query.execute(unit_of_work)
```

### Modern Framework Equivalents [interpretation]

- **SQLAlchemy**: `session.query(Person).filter(Person.num_dependents > 0, Person.last_name.ilike("F%"))` — the SQLAlchemy query API is a Query Object implementation
- **SQLAlchemy `Select` query / `Session.execute()`**: `session.execute(select(Person).where(Person.num_dependents > 0, Person.last_name.ilike("F%")))` — `and_()` / `or_()` provide explicit criterion composition
- **SQLAlchemy Core**: `select(persons).where(and_(persons.c.num_dependents > 0, persons.c.last_name.ilike("F%")))`

---
## Repository
### Code Signature (Python)
*(adapted from book's Java examples, p. 324–329)*

```python
from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Any, Protocol


class Criteria:
    """Specification object used to describe which domain objects are wanted."""
    def __init__(self):
        self._conditions: list[tuple[str, str, Any]] = []

    def equal(self, field: str, value: Any) -> "Criteria":
        self._conditions.append(("=", field, value))
        return self

    def like(self, field: str, pattern: str) -> "Criteria":
        self._conditions.append(("LIKE", field, pattern))
        return self

    def is_satisfied_by(self, obj: object) -> bool:
        """Used by InMemoryStrategy — tests each domain object against criteria."""
        for op, field, value in self._conditions:
            obj_val = getattr(obj, field, None)
            if op == "=" and obj_val != value:
                return False
            if op == "LIKE" and value.lower() not in str(obj_val).lower():
                return False
        return True


class RepositoryStrategy(ABC):
    @abstractmethod
    def matching(self, criteria: Criteria) -> list:
        ...


class RelationalStrategy(RepositoryStrategy):
    """Executes criteria via Query Object against the database."""
    def __init__(self, domain_class: type, unit_of_work):
        self._klass = domain_class
        self._uow = unit_of_work

    def matching(self, criteria: Criteria) -> list:
        query = QueryObject(self._klass)
        query.add_criteria(criteria)          # QueryObject knows how to consume Criteria
        return query.execute(self._uow)


class InMemoryStrategy(RepositoryStrategy):
    """Executes criteria by filtering an in-memory collection (useful in tests)."""
    def __init__(self, domain_objects: list):
        self._objects = domain_objects

    def matching(self, criteria: Criteria) -> list:
        return [obj for obj in self._objects if criteria.is_satisfied_by(obj)]


class Repository:
    """Collection-like interface over a data store. Strategy is swappable."""
    def __init__(self, strategy: RepositoryStrategy):
        self._strategy = strategy

    def matching(self, criteria: Criteria) -> list:
        return self._strategy.matching(criteria)

    def sole_match(self, criteria: Criteria):
        results = self.matching(criteria)
        if len(results) != 1:
            raise ValueError(f"Expected 1 result, got {len(results)}")
        return results[0]


class PersonRepository(Repository):
    """Specialised Repository — encapsulates common query criteria."""
    def dependents_of(self, person) -> list:
        criteria = Criteria().equal("benefactor", person)
        return self.matching(criteria)


# Usage from domain object:
# class Person:
#     def dependents(self):
#         return Registry.person_repository().dependents_of(self)
```

### Modern Framework Equivalents [interpretation]

- **SQLAlchemy**: `Session` acts as a Repository; `session.query(Person).filter_by(benefactor=p)` mirrors `repository.matching(criteria)`
- **SQLAlchemy Session queries / custom Repository class**: `session.execute(select(Person).filter_by(benefactor=p))` mirrors `repository.matching(criteria)`; custom repository classes encode named criteria
- **Spring Data JPA**: generates Repository implementations from interface method signatures — a metadata-driven Repository
- The Strategy pattern in the book maps directly to SQLAlchemy's ability to swap in-memory `StaticPool` for tests vs. a real database connection

---
## Model View Controller
### Code Signature (Python)
*(MVC roles illustrated — no single book example; adapted from book description, p. 330)*

```python
# Model — pure domain, no UI knowledge
class Album:
    def __init__(self, title: str, artist: str):
        self.title = title
        self.artist = artist
        self._observers: list = []

    def add_observer(self, observer) -> None:
        self._observers.append(observer)

    def _notify(self) -> None:
        for obs in self._observers:
            obs.update(self)

    @classmethod
    def find_named(cls, name: str) -> "Album":
        ...  # data source lookup


# View — responsible for display only
class AlbumView:
    def update(self, album: "Album") -> None:
        print(f"Title: {album.title}  Artist: {album.artist}")


# Controller — handles input, manipulates model, triggers view update
class AlbumController:
    def __init__(self, album: "Album", view: "AlbumView"):
        self._album = album
        self._view = view
        album.add_observer(view)

    def handle_get(self, params: dict) -> None:
        name = params.get("name")
        self._album = Album.find_named(name)
        self._view.update(self._album)
```

### Modern Framework Equivalents [interpretation]

- **FastAPI**: Model = SQLAlchemy `DeclarativeBase` subclass + Pydantic schema; View = Jinja2 template via `Jinja2Templates`; Controller = FastAPI route handler
- **Flask**: Model = SQLAlchemy model; Controller = route function; View = Jinja2 template
- **FastAPI + Pydantic**: Model = Pydantic schema; View = JSON response; Controller logic is in the route handler function
- The classic Observer-based MVC maps directly to React's state + component model: model state triggers re-render (view), event handlers are the controller

---
## Page Controller
### Code Signature (Python)
*(adapted from book's Java servlet and JSP-as-handler examples, p. 336–343)*

```python
# Pattern 1: Script-style Page Controller (like a Java servlet)
# Each URL maps to one controller class; controller forwards to template view.

class ArtistController:
    """Handles GET /artist?name=... — loads model, forwards to template."""

    def handle_get(self, params: dict, request_context: dict) -> str:
        name = params.get("name")
        artist = Artist.find_named(name)
        if artist is None:
            return self.forward("missing_artist_error.html", request_context)
        request_context["helper"] = ArtistHelper(artist)
        return self.forward("artist.html", request_context)

    def forward(self, template: str, context: dict) -> str:
        # In WSGI/Flask terms: render_template(template, **context)
        ...


class AlbumController:
    """Handles GET /album?id=... — shows different view for classical albums."""

    def handle_get(self, params: dict, request_context: dict) -> str:
        album = Album.find(params.get("id"))
        if album is None:
            return self.forward("missing_album_error.html", request_context)
        request_context["helper"] = album
        if isinstance(album, ClassicalAlbum):
            return self.forward("classical_album.html", request_context)
        return self.forward("album.html", request_context)

    def forward(self, template: str, context: dict) -> str: ...


# Pattern 2: Helper-style (like JSP-as-handler with helper class)
# The server page is the handler; it calls a helper for all logic.

class AlbumHelper:
    """Controller logic lives here; server page calls init() then accesses properties."""

    def init(self, params: dict) -> None:
        self._album = Album.find(params.get("id"))

    @property
    def album(self) -> "Album":
        return self._album

    @property
    def is_classical(self) -> bool:
        return isinstance(self._album, ClassicalAlbum)
```

### Modern Framework Equivalents [interpretation]

- **FastAPI route handlers**: `@router.get()` / `@router.post()` are per-page controllers; `APIRouter` groups and FastAPI's dependency injection are framework-provided Page Controller support
- **Flask route functions**: each `@app.route("/artist")` function is a Page Controller; `render_template()` is the Template View step
- **FastAPI path operations**: each `@router.get("/artist")` function is a Page Controller

---
## Front Controller
### Code Signature (Python)
*(adapted from book's Java servlet example, p. 346–349)*

```python
from __future__ import annotations
import importlib
from abc import ABC, abstractmethod


class FrontCommand(ABC):
    """Base class for all command objects — receives HTTP context, produces a response."""

    def init(self, params: dict, request_context: dict) -> None:
        self.params = params
        self.context = request_context

    @abstractmethod
    def process(self) -> str: ...

    def forward(self, template: str) -> str:
        # delegates to Template View rendering
        ...


class FrontHandler:
    """Web handler — single entry point; resolves URL to command and executes it."""
    COMMAND_PACKAGE = "commands"

    def handle_get(self, params: dict, request_context: dict) -> str:
        command = self._get_command(params)
        command.init(params, request_context)
        return command.process()

    def _get_command(self, params: dict) -> FrontCommand:
        command_name = params.get("command", "Unknown")
        try:
            module = importlib.import_module(f"{self.COMMAND_PACKAGE}.{command_name.lower()}_command")
            cls = getattr(module, f"{command_name}Command")
            return cls()
        except (ImportError, AttributeError):
            return UnknownCommand()


class ArtistCommand(FrontCommand):
    def process(self) -> str:
        artist = Artist.find_named(self.params.get("name"))
        self.context["helper"] = ArtistHelper(artist)
        return self.forward("artist.html")


class UnknownCommand(FrontCommand):
    """Special Case — avoids null-checking in the handler."""
    def process(self) -> str:
        return self.forward("unknown.html")
```

### Modern Framework Equivalents [interpretation]

- **FastAPI `APIRouter` + `app.add_middleware` / Starlette middleware**: the `APIRouter` is a static Front Controller; the middleware chain is the Intercepting Filter
- **Flask `app.dispatch_request()`**: Flask's internal routing is a Front Controller implementation
- **WSGI middleware stack**: a sequence of `__call__` wrappers around the app is the equivalent of Intercepting Filter + Front Controller
- **Spring DispatcherServlet**: the canonical Java Front Controller — maps requests to `@Controller` methods

---
## Template View
### Code Signature (Python)
*(adapted from book's JSP example; Jinja2 is the Python Template View, p. 350–360)*

```python
# The helper object — all logic lives here, template calls into it
class ArtistHelper:
    def __init__(self, artist: "Artist"):
        self._artist = artist

    @property
    def name(self) -> str:
        return self._artist.name

    @property
    def album_list(self) -> str:
        """Returns rendered HTML list — keeping HTML out of template is one option."""
        items = "".join(f"<li>{a.title}</li>" for a in self._artist.albums)
        return f"<ul>{items}</ul>"

    def get_albums(self) -> list:
        """Returns data list — template does iteration with a tag."""
        return self._artist.albums


# Template (Jinja2 — Python's standard Template View)
ARTIST_TEMPLATE = """
<html><body>
  <b>{{ helper.name }}</b>
  <ul>
  {% for album in helper.get_albums() %}
    <li>{{ album.title }}</li>
  {% endfor %}
  </ul>
</body></html>
"""

# Controller forwards to Template View
from jinja2 import Template

def render_artist(helper: "ArtistHelper") -> str:
    return Template(ARTIST_TEMPLATE).render(helper=helper)
```

### Modern Framework Equivalents [interpretation]

- **Jinja2 via `fastapi.templating.Jinja2Templates`** + context dictionaries: the Jinja2 template is a Template View; the FastAPI route handler populates the context (helper equivalent)
- **Jinja2** (Flask, FastAPI): same pattern — template markers, Jinja2 engine, context dict passed from controller
- **Jinja2 macros**: the focused `<tag:forEach>` / `<highlight>` custom tags from the book correspond to Jinja2 macros that encapsulate conditional/iteration markup
- The book's warning about scriptlets maps directly to Jinja2's deliberate restriction of business logic in templates

---
## Transform View
### Code Signature (Python)
*(adapted from book's Java XSLT example, p. 363–364)*

```python
# Python equivalent of the XSLT transform approach
# Using lxml for XSLT; in modern practice this pattern is rare

from lxml import etree


class AlbumXmlBuilder:
    """Produces the domain-oriented XML document that the transform consumes."""

    def to_xml_document(self, album: "Album") -> etree._Element:
        root = etree.Element("album")
        etree.SubElement(root, "title").text = album.title
        etree.SubElement(root, "artist").text = album.artist
        tracks = etree.SubElement(root, "trackList")
        for track in album.tracks:
            t = etree.SubElement(tracks, "track")
            etree.SubElement(t, "title").text = track.title
            etree.SubElement(t, "time").text = track.duration
        return root


class AlbumTransformView:
    """Transform View — applies XSLT stylesheet to domain XML to produce HTML."""

    def __init__(self, stylesheet_path: str):
        with open(stylesheet_path, "rb") as f:
            self._transform = etree.XSLT(etree.parse(f))

    def render(self, album_xml: etree._Element) -> str:
        result = self._transform(album_xml)
        return str(result)


# Command (controller side — see Front Controller):
# album = Album.find_named(name)
# xml_doc = AlbumXmlBuilder().to_xml_document(album)
# html = AlbumTransformView("album.xsl").render(xml_doc)
# response.write(html)
```

### Modern Framework Equivalents [interpretation]

- **Jinja2 with data classes**: the Python idiom closest to Transform View is passing a dataclass (DTO) to a Jinja2 template and keeping the template logic-free — the template becomes the transform stylesheet
- **React Server Components / JSX**: each JSX component transforms its prop data into HTML elements, matching the element-by-element transform model
- **XSLT in Python** (lxml): directly available but almost never used in modern web apps

---
## Two Step View
### Code Signature (Python)
*(adapted from book's two-stage XSLT example and JSP/custom-tags example, p. 371–378)*

```python
# Two Step View implemented with a class-based second stage (not XSLT)
# Stage 1: domain objects → logical screen structure (Python dataclasses)
# Stage 2: logical screen → HTML (second stage renderer)

from dataclasses import dataclass, field


# --- Logical screen structure (stage 1 output / stage 2 input) ---

@dataclass
class LogicalField:
    label: str
    value: str

@dataclass
class LogicalTable:
    rows: list[list[str]]  # list of rows, each row is list of cell values

@dataclass
class LogicalScreen:
    title: str
    fields: list[LogicalField] = field(default_factory=list)
    tables: list[LogicalTable] = field(default_factory=list)


# --- Stage 1: first-stage renderer (per screen) ---

class AlbumFirstStage:
    """Translates domain Album object into a LogicalScreen."""

    def render(self, album) -> LogicalScreen:
        screen = LogicalScreen(title=album.title)
        screen.fields.append(LogicalField("Artist", album.artist))
        table = LogicalTable(rows=[[t.title, t.duration] for t in album.tracks])
        screen.tables.append(table)
        return screen


# --- Stage 2: second-stage renderer (one for whole application) ---

class SecondStageRenderer:
    """Renders any LogicalScreen to HTML — global styling in one place."""
    HIGHLIGHT_COLOR = "linen"

    def render(self, screen: LogicalScreen) -> str:
        parts = [f"<html><body><h1>{screen.title}</h1>"]
        for f in screen.fields:
            parts.append(f"<p><b>{f.label}:</b> {f.value}</p>")
        for table in screen.tables:
            parts.append("<table>")
            for i, row in enumerate(table.rows):
                bg = f' bgcolor="{self.HIGHLIGHT_COLOR}"' if i % 2 == 0 else ""
                cells = "".join(f"<td>{c}</td>" for c in row)
                parts.append(f"<tr{bg}>{cells}</tr>")
            parts.append("</table>")
        parts.append("</body></html>")
        return "\n".join(parts)


# Usage:
# screen = AlbumFirstStage().render(album)
# html = SecondStageRenderer().render(screen)
```

### Modern Framework Equivalents [interpretation]

- **CSS frameworks + template inheritance**: Jinja2 `base.html` template inheritance (via `fastapi.templating.Jinja2Templates`) + Tailwind CSS achieves Two Step View's goal (global appearance changes in one file) with far less programmer involvement
- **React component library**: shared layout components (`<PageShell>`, `<DataTable>`) are the second stage; page components are the first stage
- Two-stage XSLT survives in XML pipeline tools (Apache Cocoon) but is rare in modern web stacks

---
## Application Controller
### Code Signature (Python)
*(adapted from book's Java state-model example, p. 384–387)*

```python
from __future__ import annotations
from abc import ABC, abstractmethod
from enum import Enum
from typing import Callable


class AssetStatus(Enum):
    ON_LEASE = "on_lease"
    IN_INVENTORY = "in_inventory"
    IN_REPAIR = "in_repair"


class DomainCommand(ABC):
    @abstractmethod
    def run(self, params: dict) -> None: ...


class ApplicationController(ABC):
    @abstractmethod
    def get_domain_command(self, event: str, params: dict) -> DomainCommand: ...

    @abstractmethod
    def get_view(self, event: str, params: dict) -> str: ...


class Response:
    """Holds a (domain_command_class, view_url) pair for one event+state combination."""
    def __init__(self, command_class: type[DomainCommand], view_url: str):
        self._command_class = command_class
        self._view_url = view_url

    def get_domain_command(self) -> DomainCommand:
        return self._command_class()

    def get_view_url(self) -> str:
        return self._view_url


class AssetApplicationController(ApplicationController):
    """State-based Application Controller — looks up response by (event, asset_status)."""

    def __init__(self):
        # event -> {AssetStatus -> Response}
        self._events: dict[str, dict[AssetStatus, Response]] = {}

    def add_response(self, event: str, state: AssetStatus,
                     command_class: type[DomainCommand], view: str) -> None:
        self._events.setdefault(event, {})[state] = Response(command_class, view)

    def _get_response(self, event: str, params: dict) -> Response:
        asset_id = params.get("asset_id")
        asset = Asset.find(asset_id)
        status = asset.get_status()
        return self._events[event][status]

    def get_domain_command(self, event: str, params: dict) -> DomainCommand:
        return self._get_response(event, params).get_domain_command()

    def get_view(self, event: str, params: dict) -> str:
        return self._get_response(event, params).get_view_url()


# Loading the controller (from code — could also be from config file):
def load_asset_controller() -> AssetApplicationController:
    ctrl = AssetApplicationController()
    ctrl.add_response("return", AssetStatus.ON_LEASE,    GatherReturnDetailsCommand, "return")
    ctrl.add_response("return", AssetStatus.IN_INVENTORY, NullAssetCommand,          "illegalAction")
    ctrl.add_response("damage", AssetStatus.ON_LEASE,    InventoryDamageCommand,     "leaseDamage")
    ctrl.add_response("damage", AssetStatus.IN_INVENTORY, LeaseDamageCommand,        "inventoryDamage")
    return ctrl


# Front controller integration:
# app_ctrl = get_application_controller(request)
# event = request.params["command"]
# command = app_ctrl.get_domain_command(event, params)
# command.run(params)
# view_page = "/" + app_ctrl.get_view(event, params) + ".html"
# return redirect(view_page)
```

### Modern Framework Equivalents [interpretation]

- **FastAPI route handlers with conditional `RedirectResponse`**: the routing of form submission success to different routes based on object state is a limited Application Controller
- **State machine libraries** (`transitions`, `transitions` with FastAPI): encode the state machine that Application Controller manages, but declaratively
- **Workflow engines** (Camunda, Prefect): Application Controller taken to its logical conclusion for long-running multi-step processes
- **FastAPI `APIRouter` with conditional logic in route handlers**: what many applications do instead of a formal Application Controller

---
## Remote Facade
### Code Signature (Python)
*(adapted from book's Java and C# examples, p. 393–400)*

```python
# Domain model — fine-grained objects with small methods
class Album:
    def __init__(self, title: str, artist: "Artist"):
        self.title = title
        self.artist = artist
        self._tracks: list["Track"] = []

    def add_track(self, track: "Track") -> None:
        self._tracks.append(track)

    @property
    def tracks(self) -> list["Track"]:
        return list(self._tracks)


# Data Transfer Object (401) — carries data across the wire
from dataclasses import dataclass

@dataclass
class AlbumDTO:
    title: str
    artist: str
    tracks: list["TrackDTO"]

@dataclass
class TrackDTO:
    title: str
    performers: list[str]


# Assembler — maps between domain objects and DTOs (keeps them independent)
class AlbumAssembler:
    def write_dto(self, album: Album) -> AlbumDTO:
        tracks = [TrackDTO(title=t.title, performers=[p.name for p in t.performers])
                  for t in album.tracks]
        return AlbumDTO(title=album.title, artist=album.artist.name, tracks=tracks)

    def create_album(self, album_id: str, dto: AlbumDTO) -> None:
        artist = Registry.find_artist_named(dto.artist)
        album = Album(dto.title, artist)
        for t in dto.tracks:
            track = Track(t.title)
            for p_name in t.performers:
                track.add_performer(Registry.find_artist_named(p_name))
            album.add_track(track)
        Registry.add_album(album_id, album)

    def update_album(self, album_id: str, dto: AlbumDTO) -> None:
        album = Registry.find_album(album_id)
        album.title = dto.title
        # ... update artist and tracks


# Remote Facade — thin delegation layer, no domain logic
class AlbumService:
    """Remote Facade — each method delegates to domain + assembler; no logic of its own."""

    def get_album(self, album_id: str) -> AlbumDTO:
        return AlbumAssembler().write_dto(Registry.find_album(album_id))

    def create_album(self, album_id: str, dto: AlbumDTO) -> None:
        AlbumAssembler().create_album(album_id, dto)

    def update_album(self, album_id: str, dto: AlbumDTO) -> None:
        AlbumAssembler().update_album(album_id, dto)
```

### Modern Framework Equivalents [interpretation]

- **FastAPI / Flask REST endpoints**: each endpoint function is a Remote Facade method; Pydantic models are the Data Transfer Objects; the route function should only delegate to service/domain and never contain business logic
- **gRPC service implementations**: the `Servicer` class is a Remote Facade; protobuf messages are the DTOs
- **GraphQL resolvers**: the resolver layer is a Remote Facade; it should only marshal/unmarshal and delegate to domain
- **Pydantic schemas (FastAPI)** + route handlers: the Pydantic `BaseModel` is the assembler; the FastAPI route handler is the facade

---
## Data Transfer Object
### Code Signature (Python)
*(adapted from book's Java examples and XML serialisation example, p. 408–415)*

```python
from __future__ import annotations
from dataclasses import dataclass, field, asdict
import json


@dataclass
class TrackDTO:
    title: str
    performers: list[str] = field(default_factory=list)

    # Dictionary serialisation — tolerant; extra fields on sender side are ignored
    def to_dict(self) -> dict:
        return {"title": self.title, "performers": self.performers}

    @staticmethod
    def from_dict(data: dict) -> "TrackDTO":
        return TrackDTO(title=data["title"], performers=data.get("performers", []))


@dataclass
class AlbumDTO:
    title: str
    artist: str
    tracks: list[TrackDTO] = field(default_factory=list)

    def to_json(self) -> str:
        d = {"title": self.title, "artist": self.artist,
             "tracks": [t.to_dict() for t in self.tracks]}
        return json.dumps(d)

    @staticmethod
    def from_json(s: str) -> "AlbumDTO":
        d = json.loads(s)
        tracks = [TrackDTO.from_dict(t) for t in d.get("tracks", [])]
        return AlbumDTO(title=d["title"], artist=d["artist"], tracks=tracks)


# Assembler — maps between domain model and DTO (keeps them independent)
class AlbumAssembler:
    def write_dto(self, album: "Album") -> AlbumDTO:
        tracks = []
        for t in album.tracks:
            td = TrackDTO(title=t.title,
                          performers=[p.name for p in t.performers])
            tracks.append(td)
        return AlbumDTO(title=album.title,
                        artist=album.artist.name,
                        tracks=tracks)

    def create_album(self, album_id: str, dto: AlbumDTO) -> "Album":
        artist = Registry.find_artist_named(dto.artist)
        if artist is None:
            raise ValueError(f"No artist named {dto.artist}")
        album = Album(title=dto.title, artist=artist)
        for td in dto.tracks:
            track = Track(title=td.title)
            for p_name in td.performers:
                performer = Registry.find_artist_named(p_name)
                track.add_performer(performer)
            album.add_track(track)
        Registry.add_album(album_id, album)
        return album

    def update_album(self, album_id: str, dto: AlbumDTO) -> None:
        album = Registry.find_album(album_id)
        if dto.title != album.title:
            album.title = dto.title
        if dto.artist != album.artist.name:
            album.artist = Registry.find_artist_named(dto.artist)
        # update tracks in-place to preserve identity
        for i, td in enumerate(dto.tracks):
            album.get_track(i).title = td.title
```

### Modern Framework Equivalents [interpretation]

- **Pydantic models** (FastAPI): `BaseModel` subclasses are DTOs; `model.model_dump()` / `model.model_validate()` are the serialisation methods; validators on the model are acceptable but business logic is not
- **Pydantic schemas (FastAPI)**: `BaseModel` is both the DTO definition and the assembler — `model.model_dump()` is the domain-facing dict, `model.model_validate()` is the DTO
- **Python dataclasses + `dataclasses.asdict()`**: the minimal DTO without a framework; add `from_dict` class methods for deserialisation
- **gRPC proto-generated classes**: protocol buffer generated Python classes are DTOs; the generated stub methods are the Remote Facade

---
## Optimistic Offline Lock
---
## Pessimistic Offline Lock
---
## Coarse-Grained Lock
---
## Implicit Lock
---
## Client Session State
---
## Server Session State
---
## Database Session State
---
## Gateway
---
## Mapper
---
## Layer Supertype
---
## Separated Interface
---
## Registry
---
## Value Object
---
## Money
---
## Special Case
---
## Plugin
---
## Service Stub
---
## Record Set
