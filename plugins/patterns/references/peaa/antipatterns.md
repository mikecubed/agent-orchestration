# PEAA Antipattern Reference

**Purpose**: Maps observable code symptoms to named antipatterns, then to the PEAA patterns
that fix them. Used by the `peaa-evaluator` skill to ground its analysis.

**Source**: Derived from *Patterns of Enterprise Application Architecture* — Fowler et al. (2002).
Antipattern names that Fowler uses directly are marked *(Fowler term)*. Others are industry-standard
names derived from descriptions in the book and marked `[interpretation]`.

> All antipatterns here have a direct fix in the PEAA catalog. If you detect a symptom, the
> fix pattern is the primary recommendation. Page numbers refer to book pages.

---

## Antipattern Index

1. [Smart UI](#1-smart-ui)
2. [Anemic Domain Model](#2-anemic-domain-model)
3. [God Script / Bloated Transaction Script](#3-god-script--bloated-transaction-script)
4. [God Service](#4-god-service)
5. [Implicit Transaction](#5-implicit-transaction)
6. [Primitive Obsession — Money/Date/Range](#6-primitive-obsession--moneydaterange)
7. [Leaky Data Source](#7-leaky-data-source)
8. [N+1 Query Problem](#8-n1-query-problem)
9. [Session Overloading](#9-session-overloading)
10. [Distributed Monolith](#10-distributed-monolith)
11. [Identity Confusion (Duplicate Objects)](#11-identity-confusion-duplicate-objects)
12. [Null Propagation](#12-null-propagation)
13. [Missing Gateway](#13-missing-gateway)
14. [Unconstrained Lock / Missing Concurrency Control](#14-unconstrained-lock--missing-concurrency-control)
15. [Inheritance Mapped to Single Table Without Discrimination](#15-inheritance-mapped-to-single-table-without-discrimination)
16. [Chatty Remote Interface](#16-chatty-remote-interface)
17. [Fat Data Transfer Object](#17-fat-data-transfer-object)
18. [Mixed Domain and Persistence Logic](#18-mixed-domain-and-persistence-logic)

---

## 1. Smart UI

**Fowler term**: "Smart UI" — explicitly named as an antipattern in Ch. 1 (p. 21)

### What it looks like in code
```python
# Business logic embedded directly in the view/controller/route handler
@app.route("/checkout", methods=["POST"])
def checkout():
    cart = request.json["cart"]
    total = sum(item["price"] * item["qty"] for item in cart)
    if total > 1000:
        discount = total * 0.10   # business rule in the view layer
    tax = total * 0.08            # tax calculation in the view layer
    db.execute("INSERT INTO orders ...", (total, tax))  # DB access in view
    return jsonify({"total": total - discount + tax})
```

### Observable symptoms
- Business calculations (tax, discount, eligibility) inside route handlers, views, or templates
- `db.execute()` or ORM calls directly in view functions
- Business rules duplicated across multiple views handling similar operations
- Impossible to test business logic without spinning up the HTTP layer

### Why it's a problem
Fowler: "The problem came with domain logic: business rules, validations, calculations... 
Usually people would write these on the client, but this was awkward" (p. 21). Any change 
to a business rule requires hunting through all screens that embed it.

### Fix patterns
| Severity | Fix | When |
|----------|-----|------|
| Mild | **Transaction Script** (p. 110) | Move logic to a procedure layer; keep views thin |
| Moderate | **Service Layer** (p. 133) | Establish an application boundary; views call services |
| Serious | **Domain Model** (p. 116) | Rich object model owns all business behavior |

---

## 2. Anemic Domain Model

**Industry term** — Fowler describes the symptom in Ch. 2 without naming it; the name 
is from Martin Fowler's later writing `[interpretation]`

### What it looks like in code
```python
# Domain objects are pure data bags — no behavior
class Order:
    def __init__(self):
        self.id = None
        self.items = []
        self.status = "pending"
        self.total = 0.0
    # No methods that enforce business rules

# All behavior is in a separate "service" or "manager"
class OrderService:
    def calculate_total(self, order: Order) -> float:  # behavior belongs on Order
        return sum(item.price * item.qty for item in order.items)

    def can_ship(self, order: Order) -> bool:           # belongs on Order
        return order.status == "confirmed" and order.total > 0

    def apply_discount(self, order: Order, pct: float): # belongs on Order
        order.total *= (1 - pct)
```

### Observable symptoms
- Domain classes contain only `__init__`, `@property`, and getters/setters
- A parallel `*Service` or `*Manager` class exists for every domain class
- Business rules scattered across multiple service classes for the same entity
- Domain objects can be created in invalid states (no invariant enforcement)

### Why it's a problem
The anti-pattern arises from misapplying Service Layer — putting all behavior into services
while leaving domain objects as dumb data containers. This defeats the purpose of Domain Model
and produces code that is as hard to maintain as Transaction Script but with Domain Model's
complexity cost.

### Fix patterns
| Fix | Action |
|-----|--------|
| **Domain Model** (p. 116) | Move behavior onto domain objects; services coordinate, don't compute |
| **Service Layer** (p. 133) | Keep Service Layer thin — only application logic, not domain logic |

---

## 3. God Script / Bloated Transaction Script

`[interpretation]` — derives from Fowler's description of Transaction Script complexity limits (p. 111)

### What it looks like in code
```python
def process_order(order_id: int) -> dict:
    # 200-line function touching inventory, billing, shipping, notifications...
    order = db.query("SELECT ...")
    items = db.query("SELECT ...")
    for item in items:
        inventory = db.query("SELECT ...")
        if inventory["qty"] < item["qty"]:
            # reorder logic
            ...
        # pricing logic
        ...
    # billing
    ...
    # shipping calculation
    ...
    # email notification
    ...
```

### Observable symptoms
- Single functions or methods exceeding ~50 lines of business logic
- One function that touches 4+ database tables
- Duplicated conditional blocks across multiple scripts (same discount logic in checkout AND refund scripts)
- Impossible to unit test a single rule without running the whole script

### Why it's a problem
Fowler: "there will be duplicated code as several transactions need to do similar things...
The resulting application can end up being quite a tangled web of routines without a clear 
structure" (p. 111).

### Fix patterns
| Fix | When |
|-----|------|
| Refactor to multiple **Transaction Scripts** | Logic is procedural but too large; extract sub-scripts |
| Migrate to **Domain Model** (p. 116) | Logic has real business rules that benefit from OO modeling |
| Add **Service Layer** (p. 133) | Multiple callers need the same operation |

---

## 4. God Service

`[interpretation]` — derives from Service Layer guidance (p. 133) and Fowler's warning against fat services

### What it looks like in code
```python
class BusinessService:
    def create_order(self, ...): ...
    def cancel_order(self, ...): ...
    def process_payment(self, ...): ...
    def refund_payment(self, ...): ...
    def update_inventory(self, ...): ...
    def send_notification(self, ...): ...
    def generate_report(self, ...): ...
    def archive_records(self, ...): ...
    # 30+ more methods spanning every domain concept
```

### Observable symptoms
- Service class with 15+ public methods spanning multiple domain concepts
- Service methods that call other service methods in chains
- Growing import list on the service (imports repositories, gateways, external services)
- Circular service dependencies

### Fix patterns
| Fix | Action |
|-----|--------|
| Split into bounded **Service Layer** (p. 133) instances | One service per subsystem/use-case group |
| Push logic into **Domain Model** (p. 116) | If behavior belongs on domain objects, move it there |
| Use **Gateway** (p. 466) for external integrations | Extract external system calls to dedicated gateways |

---

## 5. Implicit Transaction

`[interpretation]` — derives from Unit of Work guidance (p. 184) and Fowler's behavioral problem discussion (Ch. 3)

### What it looks like in code
```python
def transfer_funds(from_id: int, to_id: int, amount: float):
    from_acct = db.execute("SELECT balance FROM accounts WHERE id=?", (from_id,)).fetchone()
    db.execute("UPDATE accounts SET balance=balance-? WHERE id=?", (amount, from_id))
    db.commit()  # committed — if next line fails, money is gone
    db.execute("UPDATE accounts SET balance=balance+? WHERE id=?", (amount, to_id))
    db.commit()  # second commit — operations are not atomic
```

### Observable symptoms
- `db.commit()` or `session.save()` scattered throughout business logic
- Operations that should be atomic split across multiple commits
- Error handling that catches exceptions after partial commits (leaving data inconsistent)
- No clear "end of business transaction" boundary

### Fix patterns
| Fix | Action |
|-----|--------|
| **Unit of Work** (p. 184) | Collect all changes, commit once at transaction boundary |
| Database transaction wrapping | Use `with db.transaction():` to make atomicity explicit |
| **Service Layer** (p. 133) | Service method = transaction boundary; commit on success, rollback on exception |

---

## 6. Primitive Obsession — Money/Date/Range

`[interpretation]` — directly motivates Value Object (p. 486) and Money (p. 488) patterns

### What it looks like in code
```python
def apply_discount(price: float, discount: float) -> float:
    return price - discount  # Which currency? What if different currencies are mixed?

def is_in_range(value: int, start: int, end: int) -> bool:
    return start <= value <= end  # No encapsulation of range semantics

# Currency confusion bug:
usd_price = 29.99
eur_price = 27.50
total = usd_price + eur_price  # Silent bug: mixes currencies
```

### Observable symptoms
- Monetary amounts stored as `float` or `Decimal` without currency
- Date ranges represented as two separate `start`/`end` parameters passed everywhere
- Validation of range boundaries duplicated across callers
- Currency conversion logic scattered through the codebase

### Fix patterns
| Fix | Pattern |
|-----|---------|
| Wrap monetary amounts | **Money** (p. 488) — integer cents + currency, raises on mixed-currency ops |
| Wrap date ranges, coordinates, percentages | **Value Object** (p. 486) — equality by value, immutable |
| Persist value objects inline | **Embedded Value** (p. 268) — maps value object to columns of owner's table |

---

## 7. Leaky Data Source

`[interpretation]` — derives from Data Mapper isolation goal (p. 165) and Fowler's layering rules

### What it looks like in code
```python
# Domain object imports ORM directly — breaks isolation
from sqlalchemy import Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base

class Order(declarative_base()):  # Domain object IS the ORM model
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True)
    # Domain logic and ORM coupling mixed — impossible to test without DB
    def calculate_total(self):
        return sum(item.price for item in self.items)  # triggers lazy load
```

Also:
```python
# ORM query in domain logic layer
class OrderDomainService:
    def get_high_value_orders(self):
        return Order.query.filter(Order.total > 1000).all()  # SQL in domain layer
```

### Observable symptoms
- Domain classes extend ORM base classes (SQLAlchemy `Base`)
- SQL or ORM query expressions in domain objects or service layer
- Domain tests require a database connection to run
- `session` or `db` objects passed into domain objects as constructor arguments

### Fix patterns
| Fix | Pattern |
|-----|---------|
| Separate domain from persistence | **Data Mapper** (p. 165) — domain objects have no DB awareness |
| Encapsulate all SQL | **Table Data Gateway** (p. 144) or **Row Data Gateway** (p. 152) |
| Abstract data access behind interface | **Repository** (p. 322) — collection-like interface hides persistence |
| Swap implementations for tests | **Service Stub** (p. 504) + **Separated Interface** (p. 476) |

---

## 8. N+1 Query Problem

`[interpretation]` — directly motivates Lazy Load (p. 200) discussion and eager loading strategies

### What it looks like in code
```python
# 1 query for orders, then N queries for each order's items
orders = db.execute("SELECT * FROM orders").fetchall()
for order in orders:
    items = db.execute("SELECT * FROM items WHERE order_id=?", (order["id"],)).fetchall()
    # N additional queries — one per order
    process(order, items)
```

### Observable symptoms
- Loops containing database queries
- Response time grows linearly with the number of rows returned
- Query log shows the same table queried repeatedly with different ID parameters
- Works fine in dev (10 rows) but degrades in prod (10,000 rows)

### Fix patterns
| Fix | Pattern |
|-----|---------|
| Defer loading until needed | **Lazy Load** (p. 200) with virtual proxy — avoids loading when not used |
| Load together with a JOIN | Eager loading — override Lazy Load with joined load for specific use cases |
| Use a specification | **Query Object** (p. 316) — build a single query that fetches everything needed |

---

## 9. Session Overloading

`[interpretation]` — derives from Session State chapter (Ch. 6, p. 87) and Fowler's statefulness warnings

### What it looks like in code
```python
# Session used as a god object / global cache
session["user"] = user_object
session["cart"] = cart_object
session["last_search_results"] = [...]  # large result set in session
session["product_catalog"] = entire_catalog  # cached data that belongs in DB
session["wizard_step_1_data"] = form_data_1
session["wizard_step_2_data"] = form_data_2
session["current_domain_objects"] = complex_graph  # persistent state
```

### Observable symptoms
- Session growing unboundedly during a user's visit
- Session stores domain objects, not just state identifiers
- Large serialized objects in session causing memory or cookie-size problems
- Session used to pass data between layers instead of method parameters

### Fix patterns
| Fix | Pattern |
|-----|---------|
| Store only IDs in session | **Client Session State** (p. 456) — URL params or cookies with minimal data |
| Store serialized session server-side | **Server Session State** (p. 458) — session object on server, only ID in cookie |
| Persist session to database | **Database Session State** (p. 462) — full persistence, survives server restart |
| Keep server stateless | **Stateless Server** — aim for no session state; reconstruct from DB per request |

---

## 10. Distributed Monolith

`[interpretation]` — derives from Distribution Strategies chapter (Ch. 7, p. 89) and Fowler's "First Law of Distributed Object Design"

### What it looks like in code
```python
# Calling a remote service as if it were a local object
class OrderProcessor:
    def process(self, order_id: int):
        # Fine-grained calls across network boundary — each is a round trip
        customer = customer_service.get_customer(order.customer_id)
        address = customer_service.get_address(customer.id)
        preferences = customer_service.get_preferences(customer.id)
        credit = billing_service.get_credit_limit(customer.id)
        inventory = inventory_service.check_stock(order.item_id)
        # 5 network round trips for a single operation
```

### Observable symptoms
- Service calls in loops (one call per item)
- Fine-grained remote method calls (get one field at a time)
- High latency that scales with data volume
- Timeout failures on operations that work fine locally

### Why it's a problem
Fowler: "Each call [to a remote service] takes time... the solution is to reduce the number 
of calls... Don't try to do the same thing with remote objects as you do with local objects"
(Ch. 7, p. 89). Fowler's First Law of Distributed Object Design: "Don't distribute your objects."

### Fix patterns
| Fix | Pattern |
|-----|---------|
| Batch multiple calls into one | **Remote Facade** (p. 388) — coarse-grained interface over fine-grained objects |
| Transfer bulk data in one call | **Data Transfer Object** (p. 401) — assemble all needed data before the network call |

---

## 11. Identity Confusion (Duplicate Objects)

`[interpretation]` — directly motivates Identity Map (p. 195)

### What it looks like in code
```python
# Two separate fetches return two different Python objects for the same DB row
order_a = repo.find(order_id=42)
order_b = repo.find(order_id=42)

order_a.status = "shipped"
# order_b.status is still "pending" — they diverged
assert order_a is not order_b  # True — different objects, same data
```

### Observable symptoms
- Modifying an object doesn't affect "the same" object retrieved by another part of the code
- Stale data errors when two parts of the request see different versions of the same entity
- Update conflicts where later save overwrites earlier save within the same request

### Fix patterns
| Fix | Pattern |
|-----|---------|
| Cache loaded objects by ID | **Identity Map** (p. 195) — return existing object if already loaded this session |
| Coordinate all changes | **Unit of Work** (p. 184) — single source of truth for modified objects |

---

## 12. Null Propagation

`[interpretation]` — directly motivates Special Case (p. 496); Fowler calls this a common bug source

### What it looks like in code
```python
def get_employee_plan_name(employee_id: int) -> str:
    employee = repo.find(employee_id)
    if employee is None:
        return "Unknown"
    plan = employee.get_payment_plan()
    if plan is None:
        return "No plan"
    return plan.name  # Callers have to guard against None at every step
```

### Observable symptoms
- `if x is None` guards scattered throughout the codebase
- `NullPointerException` / `AttributeError` on `None` objects in production
- Defensive None-checks on the return value of every function
- Conditional logic that handles "no entity found" differently in each caller

### Fix patterns
| Fix | Pattern |
|-----|---------|
| Return a null object | **Special Case** (p. 496) — return a `NullEmployee` that has safe default behavior |
| Use explicit absent type | Python `Optional` + typed `Null` subclass — callers never check for `None` |

---

## 13. Missing Gateway

`[interpretation]` — derives from Gateway (p. 466) and Fowler's database access organization advice (Ch. 3)

### What it looks like in code
```python
# SQL scattered across the codebase
class OrderView:
    def get(self, order_id):
        conn.execute("SELECT * FROM orders WHERE id=?", (order_id,))  # in view

class OrderEmail:
    def send_confirmation(self, order_id):
        conn.execute("SELECT * FROM orders WHERE id=?", (order_id,))  # duplicated

class ReportService:
    def monthly_summary(self):
        conn.execute("SELECT * FROM orders WHERE ...")  # yet again
```

### Observable symptoms
- The same table queried by SQL in 3+ different files
- Schema change (column rename) requires searching the whole codebase
- No single place to find all queries for a given table
- DBA cannot understand query patterns without reading all application code

### Fix patterns
| Fix | Pattern |
|-----|---------|
| Centralize table SQL | **Table Data Gateway** (p. 144) — one class, all SQL for one table |
| Centralize row SQL | **Row Data Gateway** (p. 152) — one object per row, all SQL on it |
| Encapsulate external system | **Gateway** (p. 466) — wraps any external resource (API, filesystem, queue) |

---

## 14. Unconstrained Lock / Missing Concurrency Control

`[interpretation]` — motivates all of Chapter 16 (Offline Concurrency patterns)

### What it looks like in code
```python
# Last writer wins — no detection of concurrent edits
def save_customer(customer_id: int, data: dict):
    db.execute(
        "UPDATE customers SET name=?, email=? WHERE id=?",
        (data["name"], data["email"], customer_id)
    )
    db.commit()
    # If two users edited simultaneously, second save silently overwrites first
```

### Observable symptoms
- UPDATE statements with no version check or timestamp comparison
- Users reporting that their changes "disappeared"
- No concept of "who last edited this" in the data model
- Batch jobs and UI writing to the same table without coordination

### Fix patterns
| Scenario | Fix | Pattern |
|----------|-----|---------|
| Rare conflicts, can detect and retry | Version column check | **Optimistic Offline Lock** (p. 416) |
| Frequent conflicts, must prevent | Exclusive lock per session | **Pessimistic Offline Lock** (p. 426) |
| Must lock a whole aggregate | Lock on root, propagate | **Coarse-Grained Lock** (p. 438) |
| Easy to forget to acquire lock | Framework enforces locking | **Implicit Lock** (p. 449) |

---

## 15. Inheritance Mapped to Single Table Without Discrimination

`[interpretation]` — motivates the three inheritance mapping patterns (Ch. 12)

### What it looks like in code
```python
# All subclasses jammed into one table with nullable columns for each subclass
# CREATE TABLE employees (
#   id INT, name VARCHAR,
#   hourly_rate DECIMAL NULL,     -- only for HourlyEmployee
#   annual_salary DECIMAL NULL,   -- only for SalariedEmployee
#   commission_rate DECIMAL NULL  -- only for CommissionEmployee
# )
class Employee: ...
class HourlyEmployee(Employee): ...    # uses hourly_rate, rest NULL
class SalariedEmployee(Employee): ...  # uses annual_salary, rest NULL
```

### Observable symptoms
- Table with many nullable columns where only some are populated per row
- No discriminator column to identify which subclass a row represents
- Application logic that checks which columns are non-null to determine type
- Growing table as new subclasses require new nullable columns

### Fix patterns
| Trade-off | Pattern |
|-----------|---------|
| Simplicity, all in one table | **Single Table Inheritance** (p. 278) — add a type discriminator column |
| Normalized, one table per class | **Class Table Inheritance** (p. 285) — join required to load full object |
| One table per concrete class | **Concrete Table Inheritance** (p. 293) — no joins but duplicate base columns |
| Mix strategies in hierarchy | **Inheritance Mappers** (p. 302) — supertype + subtype mapper structure |

---

## 16. Chatty Remote Interface

Fowler term: implicit in Remote Facade motivation (p. 388)

### What it looks like in code
```python
# Fine-grained interface across a network boundary
customer = remote_customer_service.get_customer(id)         # call 1
name = remote_customer_service.get_name(customer)           # call 2
address = remote_customer_service.get_address(customer)     # call 3
preferences = remote_customer_service.get_preferences(customer)  # call 4
```

### Fix patterns
| Fix | Pattern |
|-----|---------|
| Coarse-grained wrapper | **Remote Facade** (p. 388) — one call returns all needed data |
| Bulk data payload | **Data Transfer Object** (p. 401) — assemble payload server-side, one transfer |

---

## 17. Fat Data Transfer Object

`[interpretation]` — derives from Data Transfer Object guidance (p. 401)

### What it looks like in code
```python
# DTO grows to include every field — becomes a kitchen-sink object
@dataclass
class CustomerDTO:
    id: int
    name: str
    address: str
    # ... 40 more fields including fields only needed for one specific screen
    recent_orders: list  # full order objects embedded — large payload
    audit_log: list      # completely unrelated to most callers
```

### Observable symptoms
- DTO class used differently by every caller — each ignores most fields
- Network payload is always large regardless of what data was actually needed
- Changes to one screen's DTO requirements ripple to all other callers
- Assembling the DTO requires 10+ database queries even when caller needs 3 fields

### Fix patterns
| Fix | Action |
|-----|--------|
| Purpose-built DTOs | Create one DTO per operation/screen — not one universal DTO |
| **Data Transfer Object** (p. 401) | Assemble minimally — only the fields the specific caller needs |

---

## 18. Mixed Domain and Persistence Logic

`[interpretation]` — motivates Data Mapper (p. 165) and the entire data source chapter (Ch. 3)

### What it looks like in code
```python
class Order:
    def calculate_total(self) -> Decimal:
        # Business logic...
        items = db.execute("SELECT * FROM items WHERE order_id=?", (self.id,))
        return sum(Decimal(r["price"]) * r["qty"] for r in items)
    #                 ^ persistence concern inside domain method
```

### Observable symptoms
- Domain methods containing SQL or ORM calls
- Unit tests for domain logic requiring a live database
- Domain objects holding database connection references
- Cannot reuse domain logic in a different persistence context (e.g., in-memory testing)

### Fix patterns
| Fix | Pattern |
|-----|---------|
| Separate persistence entirely | **Data Mapper** (p. 165) — domain objects have zero DB awareness |
| Encapsulate DB access | **Table Data Gateway** (p. 144) / **Row Data Gateway** (p. 152) |
| Abstract behind interface | **Repository** (p. 322) — collection interface, implementations swappable |
| Testable external systems | **Service Stub** (p. 504) — test implementation for slow/unreliable dependencies |

---

## Quick Reference: Symptom → Pattern

| Observable symptom | Primary antipattern | Fix pattern(s) |
|-------------------|--------------------|-|
| Business rules in view/route handler | Smart UI | Transaction Script, Service Layer, Domain Model |
| Domain objects are pure data bags | Anemic Domain Model | Domain Model, thin Service Layer |
| 200-line business function | God Script | Transaction Script refactor → Domain Model |
| Service with 20+ unrelated methods | God Service | Split Service Layers, Domain Model |
| `db.commit()` inside business logic | Implicit Transaction | Unit of Work, Service Layer boundary |
| `float` for money, no currency | Primitive Obsession | Money, Value Object |
| ORM imports in domain objects | Leaky Data Source | Data Mapper, Repository |
| SQL repeated in 3+ files for same table | Missing Gateway | Table Data Gateway |
| N queries inside a loop | N+1 Query | Lazy Load (with eager override), Query Object |
| Session stores full objects | Session Overloading | Client/Server/Database Session State |
| 5 network calls per operation | Distributed Monolith | Remote Facade, Data Transfer Object |
| Two loads of same ID return different objects | Identity Confusion | Identity Map, Unit of Work |
| `if x is None` everywhere | Null Propagation | Special Case |
| Last write silently wins | Missing Concurrency Control | Optimistic/Pessimistic Offline Lock |
| Table with many nullable columns | Bad Inheritance Mapping | Single/Class/Concrete Table Inheritance |
