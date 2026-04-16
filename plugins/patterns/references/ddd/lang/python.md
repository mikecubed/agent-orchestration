# DDD Concept & Pattern Catalog — Python Reference

**Purpose**: Python code examples for DDD tactical and supple design patterns.
Use alongside `catalog-core.md`.

**Stack**: Python 3.12+, FastAPI, SQLAlchemy 2.x (async), Pydantic v2

**Note**: Strategic patterns (Bounded Context, ACL, etc.) and process concepts
(Ubiquitous Language) have no code examples — they operate at system/team level.

**Anti-hallucination policy**: All code is `[interpretation]`.

---

# Tactical Building Blocks

---

## Layered Architecture (p. 52)

### Python structure `[interpretation]`

Map the four DDD layers to a Python package tree: routes (UI) → services (Application) → domain → infrastructure.

```python
# Project layout
# src/
#   ordering/                   # Bounded Context as top-level package
#     routes/                   # UI / Interface layer  (FastAPI routers)
#       order_routes.py
#     services/                 # Application layer     (use-case orchestration)
#       order_service.py
#     domain/                   # Domain layer          (entities, VOs, repos ABCs)
#       model.py
#       repositories.py         # abstract Repository protocols
#     infrastructure/           # Infrastructure layer  (SQLAlchemy, adapters)
#       sqlalchemy_repos.py
#       unit_of_work.py

# Dependency rule: each layer imports only from the layer directly below.
# Domain layer has ZERO framework imports.
```

### FastAPI / SQLAlchemy equivalents `[interpretation]`

- **UI layer** → `APIRouter` in `routes/`, Pydantic request/response schemas
- **Application layer** → service classes injected via `Depends()`
- **Domain layer** → pure Python: dataclasses, protocols, domain exceptions
- **Infrastructure layer** → `AsyncSession`, SQLAlchemy `Mapped` models, concrete repositories

---

## Entities (p. 65)

### Python structure `[interpretation]`

An Entity is a dataclass with an `id` field; equality and hashing are based solely on identity.

```python
from dataclasses import dataclass, field
from uuid import UUID, uuid4


@dataclass
class Order:
    id: UUID = field(default_factory=uuid4)
    customer_name: str = ""
    total_cents: int = 0
    _line_items: list["LineItem"] = field(default_factory=list, repr=False)

    # Identity-based equality — two Orders are the same if their id matches
    def __eq__(self, other: object) -> bool:
        return isinstance(other, Order) and self.id == other.id

    def __hash__(self) -> int:
        return hash(self.id)

    # Domain behaviour lives on the Entity
    def add_line_item(self, product: str, qty: int, unit_price: int) -> None:
        self._line_items.append(LineItem(product=product, qty=qty, unit_price=unit_price))
        self.total_cents += qty * unit_price
```

### FastAPI / SQLAlchemy equivalents `[interpretation]`

- SQLAlchemy ORM model maps to the persistence form; the domain Entity stays framework-free
- Use `UUID` primary key with `mapped_column(default=uuid4)` in the ORM model
- Convert between ORM model ↔ domain Entity in the Repository layer

---

## Value Objects (p. 70)

### Python structure `[interpretation]`

A Value Object is immutable, compared by its attributes, and has no identity field.

```python
from dataclasses import dataclass


@dataclass(frozen=True)
class Money:
    amount: int          # cents — avoid float for money
    currency: str = "USD"

    def add(self, other: "Money") -> "Money":
        if self.currency != other.currency:
            raise ValueError(f"Cannot add {self.currency} to {other.currency}")
        return Money(amount=self.amount + other.amount, currency=self.currency)

    def multiply(self, factor: int) -> "Money":
        return Money(amount=self.amount * factor, currency=self.currency)


# Pydantic alternative (useful at API boundaries)
from pydantic import BaseModel

class MoneyDTO(BaseModel):
    model_config = {"frozen": True}
    amount: int
    currency: str = "USD"
```

### FastAPI / SQLAlchemy equivalents `[interpretation]`

- `@dataclass(frozen=True)` for domain-layer VOs — no framework dependency
- Pydantic `BaseModel(frozen=True)` for API-boundary VOs (request/response schemas)
- SQLAlchemy: embed as composite columns or store as JSON via `mapped_column(JSON)`

---

## Services (p. 75)

### Python structure `[interpretation]`

A Domain Service is a stateless class for operations that don't belong to any Entity or Value Object. Inject via FastAPI `Depends()`.

```python
from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True)
class TransferResult:
    success: bool
    message: str


class FundsTransferService:
    """Domain service — stateless, no infrastructure imports."""

    def transfer(
        self, source: "Account", target: "Account", amount: "Money"
    ) -> TransferResult:
        if not source.has_sufficient_funds(amount):
            return TransferResult(success=False, message="Insufficient funds")
        source.debit(amount)
        target.credit(amount)
        return TransferResult(success=True, message="Transfer complete")


# Application service wires infrastructure to the domain service
class TransferAppService:
    def __init__(self, repo: "AccountRepository", transfer_svc: FundsTransferService):
        self.repo = repo
        self.transfer_svc = transfer_svc

    async def execute(self, source_id: UUID, target_id: UUID, amount: "Money") -> TransferResult:
        source = await self.repo.find(source_id)
        target = await self.repo.find(target_id)
        result = self.transfer_svc.transfer(source, target, amount)
        await self.repo.save(source)
        await self.repo.save(target)
        return result
```

### FastAPI / SQLAlchemy equivalents `[interpretation]`

- Inject application services via `Depends()` in route handlers
- Domain services take no async dependencies — keep them pure and synchronous
- Application services coordinate repos, domain services, and unit-of-work

---

## Modules (p. 79)

### Python structure `[interpretation]`

Modules are Python packages that mirror domain concepts — name them after ubiquitous language terms, not technical layers.

```python
# GOOD — packages reflect domain concepts
# src/
#   catalog/
#     __init__.py               # public API: re-export key types
#     product.py                # Entity
#     price.py                  # Value Object
#     product_repository.py     # Repository protocol
#   shipping/
#     __init__.py
#     shipment.py
#     carrier.py
#     tracking_service.py

# BAD — packages reflect technical layers
# src/
#   entities/
#     product.py
#     shipment.py
#   repositories/
#     product_repository.py
#     shipment_repository.py

# Use __init__.py to expose the module's public surface
# catalog/__init__.py
from .product import Product
from .price import Price
from .product_repository import ProductRepository

__all__ = ["Product", "Price", "ProductRepository"]
```

### FastAPI / SQLAlchemy equivalents `[interpretation]`

- Each domain module becomes a FastAPI sub-application or router group
- `__init__.py` acts as the module's published interface — other modules import only from it
- Keep cross-module imports minimal; communicate through application services or domain events

---

## Aggregates (p. 89)

### Python structure `[interpretation]`

An Aggregate is a cluster of Entities and Value Objects with a single root Entity. All mutation goes through the root; the root enforces invariants.

```python
from dataclasses import dataclass, field
from uuid import UUID, uuid4


@dataclass(frozen=True)
class LineItem:                             # Value Object — child of aggregate
    product_id: UUID
    description: str
    qty: int
    unit_price_cents: int

    @property
    def subtotal(self) -> int:
        return self.qty * self.unit_price_cents


@dataclass
class Order:                                # Aggregate Root (Entity)
    id: UUID = field(default_factory=uuid4)
    status: str = "draft"
    _items: list[LineItem] = field(default_factory=list, repr=False)

    # --- All access goes through the root ---
    def add_item(self, product_id: UUID, desc: str, qty: int, price: int) -> None:
        if self.status != "draft":
            raise ValueError("Cannot modify a submitted order")
        self._items.append(LineItem(product_id, desc, qty, price))

    def submit(self) -> None:
        if not self._items:
            raise ValueError("Order must have at least one item")
        self.status = "submitted"

    @property
    def total_cents(self) -> int:
        return sum(item.subtotal for item in self._items)

    @property
    def items(self) -> tuple[LineItem, ...]:   # expose read-only copy
        return tuple(self._items)
```

### FastAPI / SQLAlchemy equivalents `[interpretation]`

- Load and save the **entire aggregate** in a single repository call
- SQLAlchemy: model the root as a parent table; children as `relationship()` with `cascade="all, delete-orphan"`
- Never expose child entities via their own repository — always go through the root

---

## Factories (p. 98)

### Python structure `[interpretation]`

Factories encapsulate complex creation logic and enforce invariants at birth. Use `@classmethod` on the aggregate root or standalone factory functions.

```python
from dataclasses import dataclass, field
from uuid import UUID, uuid4
from datetime import date


@dataclass
class Subscription:
    id: UUID
    plan: str
    start_date: date
    end_date: date
    status: str
    _addons: list[str] = field(default_factory=list)

    @classmethod
    def create_trial(cls, plan: str) -> "Subscription":
        """Factory method — enforces trial-specific invariants at birth."""
        if plan not in ("basic", "pro"):
            raise ValueError(f"No trial available for plan: {plan}")
        today = date.today()
        return cls(
            id=uuid4(),
            plan=plan,
            start_date=today,
            end_date=today.replace(month=today.month + 1),
            status="trial",
        )

    @classmethod
    def reconstitute(cls, *, id: UUID, plan: str, start_date: date,
                     end_date: date, status: str, addons: list[str]) -> "Subscription":
        """Factory for reconstitution from persistence — skips business validation."""
        sub = cls(id=id, plan=plan, start_date=start_date,
                  end_date=end_date, status=status)
        sub._addons = addons
        return sub
```

### FastAPI / SQLAlchemy equivalents `[interpretation]`

- `@classmethod` factory for domain creation with validation
- Separate `reconstitute()` classmethod for hydration from the database (no invariant checks)
- Standalone factory functions work well for cross-aggregate creation scenarios

---

## Repositories (p. 106)

### Python structure `[interpretation]`

A Repository provides a collection-like interface for aggregate persistence. Define the contract as a Protocol in the domain layer; implement with SQLAlchemy in infrastructure.

```python
# domain/repositories.py — abstract contract (no framework imports)
from typing import Protocol
from uuid import UUID
from .model import Order


class OrderRepository(Protocol):
    async def find(self, order_id: UUID) -> Order | None: ...
    async def find_all_by_customer(self, customer_id: UUID) -> list[Order]: ...
    async def save(self, order: Order) -> None: ...
    async def delete(self, order: Order) -> None: ...


# infrastructure/sqlalchemy_repos.py — concrete implementation
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


class SqlAlchemyOrderRepository:
    def __init__(self, session: AsyncSession):
        self._session = session

    async def find(self, order_id: UUID) -> Order | None:
        stmt = select(OrderModel).where(OrderModel.id == order_id)
        row = (await self._session.execute(stmt)).scalar_one_or_none()
        return row.to_domain() if row else None

    async def save(self, order: Order) -> None:
        model = OrderModel.from_domain(order)
        await self._session.merge(model)

    async def find_all_by_customer(self, customer_id: UUID) -> list[Order]:
        stmt = select(OrderModel).where(OrderModel.customer_id == customer_id)
        rows = (await self._session.execute(stmt)).scalars().all()
        return [r.to_domain() for r in rows]

    async def delete(self, order: Order) -> None:
        stmt = select(OrderModel).where(OrderModel.id == order.id)
        row = (await self._session.execute(stmt)).scalar_one_or_none()
        if row:
            await self._session.delete(row)
```

### FastAPI / SQLAlchemy equivalents `[interpretation]`

- `Protocol` in domain layer → no ABC import needed, structural subtyping
- `AsyncSession` injected into the concrete repository via `Depends()` chain
- Repository always returns/accepts **domain objects**, never ORM models
- One repository per aggregate root — never per table

---

# Supple Design Patterns

---

## Specification (p. 158)

### Python structure `[interpretation]`

A Specification encapsulates a boolean business rule as a composable object. Combine with `&`, `|`, `~` via dunder methods.

```python
from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Generic, TypeVar

T = TypeVar("T")


class Specification(ABC, Generic[T]):
    @abstractmethod
    def is_satisfied_by(self, candidate: T) -> bool: ...

    def __and__(self, other: Specification[T]) -> Specification[T]:
        return _And(self, other)

    def __or__(self, other: Specification[T]) -> Specification[T]:
        return _Or(self, other)

    def __invert__(self) -> Specification[T]:
        return _Not(self)


class _And(Specification[T]):
    def __init__(self, left: Specification[T], right: Specification[T]):
        self._left, self._right = left, right
    def is_satisfied_by(self, candidate: T) -> bool:
        return self._left.is_satisfied_by(candidate) and self._right.is_satisfied_by(candidate)

class _Or(Specification[T]):
    def __init__(self, left: Specification[T], right: Specification[T]):
        self._left, self._right = left, right
    def is_satisfied_by(self, candidate: T) -> bool:
        return self._left.is_satisfied_by(candidate) or self._right.is_satisfied_by(candidate)

class _Not(Specification[T]):
    def __init__(self, spec: Specification[T]):
        self._spec = spec
    def is_satisfied_by(self, candidate: T) -> bool:
        return not self._spec.is_satisfied_by(candidate)


# Concrete specification
class IsOverdue(Specification["Invoice"]):
    def is_satisfied_by(self, invoice: "Invoice") -> bool:
        return invoice.due_date < date.today() and invoice.balance > 0

# Usage: overdue_and_large = IsOverdue() & MinimumBalance(10_000)
```

### FastAPI / SQLAlchemy equivalents `[interpretation]`

- Use specifications in domain services for in-memory filtering
- For database queries, translate specifications into SQLAlchemy `where()` clauses
- Repository methods can accept `Specification` and build the query accordingly

---

## Intention-Revealing Interfaces (p. 172)

### Python structure `[interpretation]`

Name classes and methods to state **what** they accomplish, not **how**. The caller should understand behaviour from the signature alone.

```python
from dataclasses import dataclass
from datetime import date


# BAD — caller must read the implementation to understand behaviour
class Policy:
    def calc(self, a: "Account", d: date) -> float: ...

# GOOD — names reveal intent; type hints complete the contract
@dataclass
class LatePaymentPolicy:
    grace_period_days: int = 30
    penalty_rate: float = 0.02

    def assess_penalty(self, account: "Account", as_of: date) -> "Money":
        """Return the penalty amount owed if payment is past the grace period."""
        days_late = (as_of - account.last_payment_date).days - self.grace_period_days
        if days_late <= 0:
            return Money(0)
        return account.balance.multiply_rate(self.penalty_rate * days_late)

    def is_delinquent(self, account: "Account", as_of: date) -> bool:
        """True when the account has exceeded the grace period."""
        return (as_of - account.last_payment_date).days > self.grace_period_days
```

### FastAPI / SQLAlchemy equivalents `[interpretation]`

- FastAPI route names: `POST /orders/{id}/submit` not `POST /orders/{id}/process`
- Pydantic schema names: `OrderSubmission`, not `OrderDTO`
- Repository methods: `find_active_by_region()` not `get_data()`

---

## Side-Effect-Free Functions (p. 175)

### Python structure `[interpretation]`

Separate queries (return values, no mutation) from commands (mutate state, return nothing). Value Objects are natural homes for side-effect-free functions.

```python
from dataclasses import dataclass


@dataclass(frozen=True)
class DateRange:
    start: date
    end: date

    # QUERY — pure computation, no side effects, returns new Value Object
    def overlaps(self, other: "DateRange") -> bool:
        return self.start <= other.end and other.start <= self.end

    def duration_days(self) -> int:
        return (self.end - self.start).days

    def extend_by(self, days: int) -> "DateRange":
        """Returns a NEW DateRange — original is untouched (frozen)."""
        return DateRange(start=self.start, end=self.end + timedelta(days=days))


@dataclass
class Reservation:
    id: UUID
    period: DateRange
    status: str = "pending"

    # COMMAND — mutates state, returns nothing
    def confirm(self) -> None:
        if self.status != "pending":
            raise ValueError(f"Cannot confirm a {self.status} reservation")
        self.status = "confirmed"

    # QUERY — no mutation
    def conflicts_with(self, other: "Reservation") -> bool:
        return self.period.overlaps(other.period)
```

### FastAPI / SQLAlchemy equivalents `[interpretation]`

- `GET` endpoints → queries (idempotent, no side effects)
- `POST/PUT/DELETE` endpoints → commands (mutate state)
- Keep domain computation on frozen Value Objects for guaranteed purity

---

## Assertions (p. 179)

### Python structure `[interpretation]`

State post-conditions and invariants explicitly so callers know what to expect without reading internals.

```python
from dataclasses import dataclass, field


@dataclass
class BankAccount:
    id: UUID
    balance_cents: int = 0
    _min_balance: int = field(default=0, repr=False)

    def deposit(self, amount: int) -> None:
        """Deposit funds into the account.

        Pre-condition:  amount > 0
        Post-condition: balance increased by exactly `amount`
        Invariant:      balance >= min_balance (always)
        """
        assert amount > 0, "Deposit amount must be positive"
        self.balance_cents += amount
        self._check_invariant()

    def withdraw(self, amount: int) -> None:
        """Withdraw funds from the account.

        Pre-condition:  amount > 0
        Post-condition: balance decreased by exactly `amount`
        Invariant:      balance >= min_balance (always)
        Raises:         ValueError if withdrawal would break invariant
        """
        assert amount > 0, "Withdrawal amount must be positive"
        if self.balance_cents - amount < self._min_balance:
            raise ValueError(
                f"Withdrawal of {amount} would breach minimum balance of {self._min_balance}"
            )
        self.balance_cents -= amount
        self._check_invariant()

    def _check_invariant(self) -> None:
        assert self.balance_cents >= self._min_balance, (
            f"INVARIANT VIOLATED: balance {self.balance_cents} < min {self._min_balance}"
        )
```

### FastAPI / SQLAlchemy equivalents `[interpretation]`

- Use `assert` for programmer errors / invariants (disabled in optimized mode)
- Use `raise ValueError` / custom domain exceptions for business rule violations
- Pydantic `model_validator` enforces assertions at the API boundary

---

## Conceptual Contours (p. 183)

### Python structure `[interpretation]`

Decompose along stable domain concepts — not along technical seams. Each class/method should align with one cohesive domain idea that changes for one reason.

```python
from dataclasses import dataclass


# BAD — one class mixes pricing, inventory, and display concerns
# class Product:
#     def calculate_price(self): ...
#     def check_stock(self): ...
#     def render_html(self): ...

# GOOD — each class follows a natural domain contour
@dataclass(frozen=True)
class PricingPolicy:
    """Contour: how prices are determined — changes when pricing rules change."""
    base_price: int
    discount_pct: float = 0.0

    def effective_price(self) -> int:
        return int(self.base_price * (1 - self.discount_pct))


@dataclass
class InventoryLevel:
    """Contour: stock tracking — changes when warehouse logic changes."""
    on_hand: int = 0
    reserved: int = 0

    @property
    def available(self) -> int:
        return self.on_hand - self.reserved

    def reserve(self, qty: int) -> None:
        if qty > self.available:
            raise ValueError("Insufficient stock")
        self.reserved += qty


@dataclass
class Product:
    """Aggregate root — composes contours; thin coordination only."""
    id: UUID
    name: str
    pricing: PricingPolicy
    inventory: InventoryLevel
```

### FastAPI / SQLAlchemy equivalents `[interpretation]`

- Split large ORM models into composed Value Objects mapped via `composite()` or embedded JSON
- Each FastAPI router should align with one domain contour, not one database table
- Refactor when a class changes for multiple unrelated reasons

---

## Standalone Classes (p. 188)

### Python structure `[interpretation]`

Minimize dependencies so a class can be understood and tested in isolation. The ideal is a class with zero imports from outside the standard library.

```python
from dataclasses import dataclass
from enum import Enum


class TemperatureUnit(Enum):
    CELSIUS = "C"
    FAHRENHEIT = "F"


@dataclass(frozen=True)
class Temperature:
    """Standalone — no domain imports, no framework imports.
    Can be tested with zero setup or mocking."""

    value: float
    unit: TemperatureUnit = TemperatureUnit.CELSIUS

    def to_celsius(self) -> "Temperature":
        match self.unit:
            case TemperatureUnit.CELSIUS:
                return self
            case TemperatureUnit.FAHRENHEIT:
                return Temperature((self.value - 32) * 5 / 9, TemperatureUnit.CELSIUS)

    def to_fahrenheit(self) -> "Temperature":
        match self.unit:
            case TemperatureUnit.FAHRENHEIT:
                return self
            case TemperatureUnit.CELSIUS:
                return Temperature(self.value * 9 / 5 + 32, TemperatureUnit.FAHRENHEIT)

    def __gt__(self, other: "Temperature") -> bool:
        return self.to_celsius().value > other.to_celsius().value
```

### FastAPI / SQLAlchemy equivalents `[interpretation]`

- Standalone Value Objects need no ORM mapping — serialize to JSON or primitive columns
- Ideal candidates for shared kernel packages across bounded contexts
- Test with plain `pytest` — no fixtures, no database, no mocking

---

## Closure of Operations (p. 190)

### Python structure `[interpretation]`

An operation that returns the same type it operates on — enabling chaining, composition, and algebraic reasoning.

```python
from __future__ import annotations
from dataclasses import dataclass


@dataclass(frozen=True)
class Money:
    amount: int
    currency: str = "USD"

    # Closure: Money + Money → Money
    def __add__(self, other: Money) -> Money:
        assert self.currency == other.currency
        return Money(self.amount + other.amount, self.currency)

    # Closure: Money - Money → Money
    def __sub__(self, other: Money) -> Money:
        assert self.currency == other.currency
        return Money(self.amount - other.amount, self.currency)

    # Closure: Money * int → Money
    def __mul__(self, factor: int) -> Money:
        return Money(self.amount * factor, self.currency)

    @classmethod
    def zero(cls, currency: str = "USD") -> Money:
        """Identity element — enables sum() and fold operations."""
        return cls(0, currency)


# Chaining enabled by closure
total = Money(500) + Money(300) + Money(200)  # Money(1000, "USD")
refund = total - Money(200)                   # Money(800, "USD")

# Works with built-in sum() thanks to identity element
line_totals = [Money(100), Money(250), Money(375)]
grand_total = sum(line_totals, start=Money.zero())  # Money(725, "USD")
```

### FastAPI / SQLAlchemy equivalents `[interpretation]`

- Closure of Operations is purely a domain-layer concern — no framework mapping needed
- Combine with `functools.reduce()` or `sum()` for aggregate calculations
- Specifications also exhibit closure: `Spec & Spec → Spec`, `Spec | Spec → Spec`

---
