# DDD Concept & Pattern Catalog — Rust Reference

**Stack**: Rust 2024 edition (1.85+), Axum, sqlx
**Note**: Strategic patterns have no code. Rust/Go entries include Direct/Adaptation/Conceptual translation classification.
**Anti-hallucination policy**: All code is `[interpretation]`.

---

## Layered Architecture (p. 52)

**Translation**: Direct

### Rust structure `[interpretation]`

```rust
// crate layout — enforced by module visibility
// src/
//   main.rs                          ← bootstrap (Axum router)
//   api/
//     order_handler.rs               ← Presentation layer (Axum handlers)
//   application/
//     place_order.rs                 ← Application service (orchestration)
//   domain/
//     order.rs                       ← Domain layer (pure logic, no deps)
//     order_repository.rs            ← Domain port (trait)
//   infra/
//     sqlx_order_repo.rs             ← Infrastructure (adapter)
//
// Cargo.toml: domain crate has ZERO external dependencies
// Application imports domain; infra implements domain traits
// Presentation imports application; never domain directly
```

### Framework equivalents `[interpretation]`

- Workspace crates enforce hard layer boundaries at compile time
- `domain` crate: `[dependencies]` section is empty — pure Rust only
- Axum handlers = presentation layer; extract state via `Extension` or `State`
- `infra` crate depends on `sqlx`, `domain`; implements domain traits

---

## Entities (p. 65)

**Translation**: Adaptation — Rust has no inheritance; identity via explicit `id` field and `PartialEq` impl

### Rust structure `[interpretation]`

```rust
#[derive(Debug)]
pub struct Order {
    id: OrderId,
    status: OrderStatus,
    line_items: Vec<LineItem>,
}

impl Order {
    pub fn id(&self) -> &OrderId { &self.id }

    pub fn add_item(&mut self, product: &Product, qty: u32) -> Result<(), DomainError> {
        if self.status != OrderStatus::Draft {
            return Err(DomainError::InvalidState("Cannot modify submitted order"));
        }
        self.line_items.push(LineItem::new(product, qty));
        Ok(())
    }
}

impl PartialEq for Order {
    fn eq(&self, other: &Self) -> bool {
        self.id == other.id  // identity equality, not structural
    }
}
impl Eq for Order {}
```

### Framework equivalents `[interpretation]`

- `PartialEq` impl compares by `id` only — entity identity semantics
- No ORM decorators; sqlx maps via `FromRow` on a separate persistence struct
- Domain struct fields are private; controlled mutation via `&mut self` methods
- `Result<(), DomainError>` replaces exceptions for invariant violations

---

## Value Objects (p. 70)

**Translation**: Direct — Rust's ownership model naturally supports value semantics

### Rust structure `[interpretation]`

```rust
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct Money {
    amount: i64,       // cents to avoid floating point
    currency: Currency,
}

impl Money {
    pub fn new(amount: i64, currency: Currency) -> Result<Self, DomainError> {
        if amount < 0 {
            return Err(DomainError::NegativeAmount);
        }
        Ok(Self { amount, currency })
    }

    pub fn add(&self, other: &Money) -> Result<Money, DomainError> {
        if self.currency != other.currency {
            return Err(DomainError::CurrencyMismatch);
        }
        Money::new(self.amount + other.amount, self.currency.clone())
    }

    pub fn amount(&self) -> i64 { self.amount }
    pub fn currency(&self) -> &Currency { &self.currency }
}
```

### Framework equivalents `[interpretation]`

- `#[derive(Clone, PartialEq, Eq)]` gives value semantics automatically
- No `Object.freeze` needed — Rust fields are immutable by default
- `Hash` derive enables use as map/set keys
- sqlx: implement `sqlx::Type` and `sqlx::Encode`/`Decode` for custom mapping

---

## Services (p. 75)

**Translation**: Adaptation — no classes; use free functions or structs with trait bounds

### Rust structure `[interpretation]`

```rust
// Domain service — pure function, no framework deps
pub fn calculate_discount(order: &Order, customer: &Customer) -> Money {
    if customer.is_vip() && order.total_above(&Money::usd(10000)) {
        order.total().multiply_percent(10)
    } else {
        Money::zero(order.currency())
    }
}

// Application service — orchestration with injected deps
pub struct PlaceOrderService<R: OrderRepository> {
    repo: R,
}

impl<R: OrderRepository> PlaceOrderService<R> {
    pub fn new(repo: R) -> Self { Self { repo } }

    pub async fn execute(&self, cmd: PlaceOrderCommand) -> Result<OrderId, AppError> {
        let mut order = Order::create(cmd.customer_id, &cmd.items)?;
        let discount = calculate_discount(&order, &cmd.customer);
        order.apply_discount(discount)?;
        self.repo.save(&order).await?;
        Ok(order.id().clone())
    }
}
```

### Framework equivalents `[interpretation]`

- Domain services: free functions in the `domain` module — zero dependencies
- Application services: generic structs parameterized by trait bounds
- Axum: inject via `State(Arc<PlaceOrderService<SqlxOrderRepo>>)`
- `async fn` for I/O in application services; sync for domain services

---

## Modules (p. 79)

**Translation**: Direct — Rust modules map naturally to DDD Modules

### Rust structure `[interpretation]`

```rust
// src/domain/mod.rs — public API of the domain module
pub mod order;        // re-exports Order, OrderId, OrderStatus
pub mod shipping;     // re-exports ShipmentId, Carrier
pub mod inventory;    // re-exports Sku, StockLevel

// src/domain/order/mod.rs
mod line_item;        // private — not part of module's public API

pub use self::order::Order;
pub use self::order_id::OrderId;
pub use self::order_repository::OrderRepository;
// LineItem is pub(crate) — visible inside the crate but not exported

// Module names mirror Ubiquitous Language:
//   order, shipping, inventory
// NOT: utils, helpers, common
```

### Framework equivalents `[interpretation]`

- `pub` vs `pub(crate)` vs private controls module boundaries at compile time
- Cargo workspace crates = hard module boundaries for large systems
- `mod.rs` or named module file defines the public interface
- Circular `use` across modules is a compile error — enforces acyclic deps

---

## Aggregates (p. 89)

**Translation**: Adaptation — ownership system enforces aggregate boundaries naturally

### Rust structure `[interpretation]`

```rust
pub struct Order {
    id: OrderId,
    line_items: Vec<LineItem>,  // owned — LineItem cannot exist alone
    status: OrderStatus,
}

impl Order {
    pub fn create(customer_id: CustomerId) -> Self {
        Self {
            id: OrderId::generate(),
            line_items: Vec::new(),
            status: OrderStatus::Draft,
        }
    }

    pub fn add_item(&mut self, snapshot: ProductSnapshot, qty: u32) -> Result<(), DomainError> {
        self.assert_draft()?;
        if let Some(item) = self.line_items.iter_mut()
            .find(|li| li.product_id() == snapshot.id())
        {
            item.increase_qty(qty);
        } else {
            self.line_items.push(LineItem::new(snapshot, qty));
        }
        Ok(())
    }

    pub fn submit(&mut self) -> Result<(), DomainError> {
        self.assert_draft()?;
        if self.line_items.is_empty() {
            return Err(DomainError::EmptyOrder);
        }
        self.status = OrderStatus::Submitted;
        Ok(())
    }

    fn assert_draft(&self) -> Result<(), DomainError> {
        if self.status != OrderStatus::Draft {
            return Err(DomainError::InvalidState("not draft"));
        }
        Ok(())
    }
}
// LineItem is pub(crate) — no external access outside the crate
```

### Framework equivalents `[interpretation]`

- Rust ownership: `Vec<LineItem>` means Order owns its children — enforced at compile time
- No separate repo for LineItem; it moves with its aggregate root
- sqlx: load aggregate in one query with JOIN, reconstruct in repository
- Optimistic concurrency: `version: i32` field checked in UPDATE WHERE clause

---

## Factories (p. 98)

**Translation**: Adaptation — associated functions (`::new`, `::create`) replace factory classes

### Rust structure `[interpretation]`

```rust
impl Order {
    // Creation factory — associated function
    pub fn create_from_quote(quote: &Quote, customer_id: CustomerId) -> Result<Self, DomainError> {
        if quote.is_expired() {
            return Err(DomainError::ExpiredQuote);
        }
        let mut order = Self::create(customer_id);
        for item in quote.items() {
            order.add_item(ProductSnapshot::from(item.product()), item.quantity())?;
        }
        Ok(order)
    }
}

// Reconstitution factory — in infra layer
pub(crate) fn reconstitute_order(row: OrderRow, items: Vec<LineItemRow>) -> Order {
    Order {
        id: OrderId::from(row.id),
        status: OrderStatus::from_str(&row.status),
        line_items: items.into_iter().map(LineItem::reconstitute).collect(),
    }
}
```

### Framework equivalents `[interpretation]`

- Creation: `Order::create_from_quote()` — idiomatic associated function
- Reconstitution: free function in `infra` module with `pub(crate)` visibility
- Rust has no constructor overloading; use descriptive function names
- Builder pattern (`OrderBuilder`) for complex construction with many optional fields

---

## Repositories (p. 106)

**Translation**: Direct — traits map perfectly to repository interfaces

### Rust structure `[interpretation]`

```rust
// Domain port — trait in domain crate
#[async_trait]
pub trait OrderRepository: Send + Sync {
    async fn find_by_id(&self, id: &OrderId) -> Result<Option<Order>, RepoError>;
    async fn save(&self, order: &Order) -> Result<(), RepoError>;
    async fn next_id(&self) -> OrderId;
}

// Infrastructure adapter
pub struct SqlxOrderRepository {
    pool: PgPool,
}

#[async_trait]
impl OrderRepository for SqlxOrderRepository {
    async fn find_by_id(&self, id: &OrderId) -> Result<Option<Order>, RepoError> {
        let row = sqlx::query_as!(OrderRow, "SELECT * FROM orders WHERE id = $1", id.as_uuid())
            .fetch_optional(&self.pool)
            .await?;
        let items = sqlx::query_as!(LineItemRow, "SELECT * FROM line_items WHERE order_id = $1", id.as_uuid())
            .fetch_all(&self.pool)
            .await?;
        Ok(row.map(|r| reconstitute_order(r, items)))
    }

    async fn save(&self, order: &Order) -> Result<(), RepoError> {
        // transaction + upsert logic
        todo!()
    }

    async fn next_id(&self) -> OrderId { OrderId::generate() }
}
```

### Framework equivalents `[interpretation]`

- `#[async_trait]` enables async methods in traits (until native async traits stabilize)
- `sqlx::query_as!` provides compile-time SQL verification
- Trait object `Arc<dyn OrderRepository>` for runtime polymorphism in Axum state
- Repository returns domain types, never `sqlx::Row` or persistence structs

---

## Specification (p. 158)

**Translation**: Adaptation — trait objects or closures replace class hierarchies

### Rust structure `[interpretation]`

```rust
pub trait Specification<T> {
    fn is_satisfied_by(&self, candidate: &T) -> bool;
}

pub struct AndSpec<T> {
    left: Box<dyn Specification<T>>,
    right: Box<dyn Specification<T>>,
}

impl<T> Specification<T> for AndSpec<T> {
    fn is_satisfied_by(&self, candidate: &T) -> bool {
        self.left.is_satisfied_by(candidate) && self.right.is_satisfied_by(candidate)
    }
}

pub struct EligibleForFreeShipping;

impl Specification<Order> for EligibleForFreeShipping {
    fn is_satisfied_by(&self, order: &Order) -> bool {
        order.total().amount() >= 5000 && order.destination().is_domestic()
    }
}

// Compose:
let spec = AndSpec {
    left: Box::new(EligibleForFreeShipping),
    right: Box::new(HasVerifiedAddress),
};
```

### Framework equivalents `[interpretation]`

- Trait objects (`Box<dyn Specification<T>>`) enable runtime composition
- Alternative: closure-based specs with `Fn(&T) -> bool` for simpler cases
- Can generate sqlx WHERE clauses via a `to_sql()` method on the spec trait
- Rust enums can model finite specification variants without trait objects

---

## Intention-Revealing Interfaces (p. 172)

**Translation**: Direct — Rust's type system and naming conventions align naturally

### Rust structure `[interpretation]`

```rust
// BAD: Unclear intent
// order.process(true);
// fn do_thing(o: &mut Order, flag: bool);

// GOOD: Names reveal domain meaning
impl Order {
    pub fn submit_for_fulfillment(&mut self) -> Result<(), DomainError> { /* ... */ }
    pub fn cancel_with_reason(&mut self, reason: CancellationReason) -> Result<(), DomainError> { /* ... */ }
    pub fn is_eligible_for_refund(&self) -> bool { /* ... */ }
}

// Trait names describe capability, not mechanism
pub trait ShippingRateCalculator {
    fn estimate_delivery_rate(&self, parcel: &Parcel, dest: &Address) -> Result<ShippingRate, RateError>;
    // NOT: fn run_algorithm(); fn do_calc();
}
```

### Framework equivalents `[interpretation]`

- Axum handler function names should reveal intent: `submit_order`, not `handle_post`
- Type aliases reveal domain meaning: `type CustomerId = Uuid;`
- Newtypes (`struct OrderId(Uuid)`) prevent mixing up ID types at compile time
- `Result<T, DomainError>` makes failure modes explicit in the signature

---

## Side-Effect-Free Functions (p. 175)

**Translation**: Direct — Rust's `&self` vs `&mut self` enforces the distinction

### Rust structure `[interpretation]`

```rust
impl Money {
    // QUERY — &self, returns new value
    pub fn add(&self, other: &Money) -> Result<Money, DomainError> {
        Money::new(self.amount + other.amount, self.currency.clone())
    }

    // QUERY — &self, pure computation
    pub fn is_greater_than(&self, other: &Money) -> bool {
        self.amount > other.amount
    }
}

impl Order {
    // COMMAND — &mut self, modifies state
    pub fn submit(&mut self) -> Result<(), DomainError> {
        self.status = OrderStatus::Submitted;
        Ok(())
    }

    // QUERY — &self, no mutation
    pub fn calculate_total(&self) -> Money {
        self.line_items.iter()
            .fold(Money::zero(self.currency()), |sum, item| {
                sum.add(&item.subtotal()).unwrap()
            })
    }
}
// &self = query (side-effect-free)
// &mut self = command (may mutate)
// Rust compiler enforces this at compile time
```

### Framework equivalents `[interpretation]`

- `&self` methods are guaranteed side-effect-free by the borrow checker
- `&mut self` clearly signals mutation — no hidden side effects possible
- Axum: GET handlers take `&self` references; POST handlers take owned/mutable state

---

## Assertions (p. 179)

**Translation**: Direct — `Result`, `assert!`, and type-state pattern

### Rust structure `[interpretation]`

```rust
impl Order {
    pub fn submit(&mut self) -> Result<(), DomainError> {
        // PRE-CONDITION
        if self.line_items.is_empty() {
            return Err(DomainError::EmptyOrder);
        }

        self.status = OrderStatus::Submitted;

        // POST-CONDITION (invariant)
        self.assert_invariant();
        Ok(())
    }

    fn assert_invariant(&self) {
        debug_assert!(
            !(self.status == OrderStatus::Submitted && self.line_items.is_empty()),
            "Submitted order must have at least one line item",
        );
    }
}

// Alternative: type-state pattern encodes invariants in the type system
// Order<Draft> vs Order<Submitted> — invalid states are unrepresentable
```

### Framework equivalents `[interpretation]`

- `Result<T, DomainError>` for recoverable pre-condition failures
- `debug_assert!` for invariants — runs in debug builds, optimized out in release
- Type-state pattern: `Order<Draft>` can `submit()`, `Order<Submitted>` cannot — compile-time
- `#[cfg(test)]` modules can verify invariants exhaustively

---

## Conceptual Contours (p. 183)

**Translation**: Direct — Rust module system and crate boundaries

### Rust structure `[interpretation]`

```rust
// BAD: One module handles pricing, tax, and discounts
// mod order_calculator { fn calc_price(); fn calc_tax(); fn calc_discount(); }

// GOOD: Each concept has its own module
pub mod pricing {
    pub struct PricingPolicy;
    impl PricingPolicy {
        pub fn price_for(&self, product: &Product, qty: u32) -> Money { /* ... */ }
    }
}

pub mod tax {
    pub struct TaxCalculator;
    impl TaxCalculator {
        pub fn tax_for(&self, subtotal: &Money, jurisdiction: &TaxJurisdiction) -> Money { /* ... */ }
    }
}

pub mod discount {
    pub struct DiscountPolicy;
    impl DiscountPolicy {
        pub fn discount_for(&self, order: &Order, customer: &Customer) -> Money { /* ... */ }
    }
}
// Boundaries follow domain expert language, not technical layers
```

### Framework equivalents `[interpretation]`

- Rust modules = compile-time boundary enforcement
- Crate-level separation for truly independent contours
- `pub use` re-exports define stable public API per contour
- If two modules always change together, merge; if one splits, refactor

---

## Standalone Classes (p. 188)

**Translation**: Direct — Rust structs with zero dependencies

### Rust structure `[interpretation]`

```rust
// Money is standalone — zero external crate dependencies
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct Money {
    amount: i64,
    currency: Currency,
}

impl Money {
    pub fn new(amount: i64, currency: Currency) -> Result<Self, DomainError> {
        if amount < 0 { return Err(DomainError::NegativeAmount); }
        Ok(Self { amount, currency })
    }

    pub fn add(&self, other: &Money) -> Result<Money, DomainError> {
        if self.currency != other.currency { return Err(DomainError::CurrencyMismatch); }
        Money::new(self.amount + other.amount, self.currency.clone())
    }

    pub fn zero(currency: Currency) -> Self {
        Self { amount: 0, currency }
    }
}
// No `use` imports from any other domain module
// Lives in its own module, testable in isolation
```

### Framework equivalents `[interpretation]`

- Standalone structs belong in a shared `domain-primitives` crate
- Zero `use` statements from other domain modules = fully self-contained
- Ideal unit test target — no mocks or setup needed
- If imports accumulate, the struct has lost its standalone quality

---

## Closure of Operations (p. 190)

**Translation**: Direct — method chaining via `self`-returning methods

### Rust structure `[interpretation]`

```rust
impl Money {
    pub fn add(&self, other: &Money) -> Result<Money, DomainError> {  // Money -> Money
        Money::new(self.amount + other.amount, self.currency.clone())
    }

    pub fn multiply(&self, factor: i64) -> Money {                     // Money -> Money
        Money { amount: self.amount * factor, currency: self.currency.clone() }
    }
}

// Chaining (with Result handling):
let total = base_price
    .add(&shipping_fee)?
    .multiply(110)       // percentage representation
    .add(&handling_fee)?;

// Specification also exhibits closure:
let spec = AndSpec::new(
    Box::new(EligibleForFreeShipping),
    Box::new(HasVerifiedAddress),
); // Specification -> Specification
```

### Framework equivalents `[interpretation]`

- sqlx `QueryBuilder` uses closure of operations: `.push()`, `.push_bind()`
- Iterator adapters: `.filter().map().collect()` — same pattern
- Builder pattern in Rust idiomatically uses `self`-consuming methods for type safety

---
