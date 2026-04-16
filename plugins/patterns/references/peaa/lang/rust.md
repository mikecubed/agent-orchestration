# PEAA Pattern Catalog — Rust / Axum Reference

**Purpose**: Rust code examples and Axum + sqlx framework equivalents for all 51 PEAA patterns.
Use alongside `catalog-core.md` (language-agnostic definitions) and `catalog-index.md`.

**Stack coverage**: Rust 2024 edition (Rust 1.85+), Axum 0.7+, sqlx 0.8+, tokio runtime

**Rust 2024 edition notes** `[interpretation]`:
- `edition = "2024"` in `Cargo.toml`
- Native `async fn in trait` (AFIT) works for **static dispatch** without the `async-trait` crate
- For **dynamic dispatch** (`Arc<dyn Trait>`), `async-trait` crate remains pragmatic until `dyn AFIT` stabilizes
- `unsafe fn` bodies now require explicit `unsafe {}` blocks for unsafe operations (not relevant to these examples)
- `gen` is a reserved keyword in 2024 edition — avoid as an identifier

**Critical framing** `[interpretation]`:
PEAA was written in 2002 for Java/.NET object-oriented systems with class inheritance.
Rust has no class inheritance, no null, strict ownership semantics, and no runtime reflection.
Many patterns require **conceptual translation** rather than direct implementation:
- Where Java uses class hierarchies, Rust uses structs + traits + generics
- Where Java uses null, Rust uses `Option<T>`
- Where Java uses shared mutable state, Rust uses `Arc<Mutex<T>>` or message passing
- Where Java uses ORM lazy loading, Rust uses explicit async queries

Each entry notes whether the pattern maps **directly**, requires **adaptation**, or is
**conceptually translated** (the intent is preserved but the mechanism is different).

**Rust/Axum pattern mappings** `[interpretation]`:
- Axum handler functions = Transaction Script (p. 110) / Page Controller (p. 333)
- Axum `Router` with shared state = Front Controller (p. 344)
- sqlx structs + query macros = Table Data Gateway (p. 144) style
- Domain structs with `impl` blocks = Domain Model (p. 116) without inheritance
- Traits = Separated Interface (p. 476)
- sqlx `Transaction<'_, Postgres>` = Unit of Work (p. 184)
- `Arc<dyn Trait>` = Plugin (p. 499) / Separated Interface
- `Option<T>` + `unwrap_or_default()` = Special Case (p. 496) approximation

---

## Domain Logic (Ch. 9)

---

## Transaction Script (p. 110)

**Translation**: Direct

Axum handler functions are the natural Rust embodiment of Transaction Script — each handler is a standalone async procedure that orchestrates one business transaction from start to finish.

### Rust structure

```rust
// A handler function IS a Transaction Script: one async fn per business operation
async fn transfer_funds(
    State(pool): State<PgPool>,
    Json(req): Json<TransferRequest>,
) -> Result<Json<TransferResponse>, AppError> {
    let mut tx = pool.begin().await?;

    sqlx::query!(
        "UPDATE accounts SET balance = balance - $1 WHERE id = $2",
        req.amount, req.from_account_id
    )
    .execute(&mut *tx)
    .await?;

    sqlx::query!(
        "UPDATE accounts SET balance = balance + $1 WHERE id = $2",
        req.amount, req.to_account_id
    )
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;
    Ok(Json(TransferResponse { success: true }))
}
```

### Axum / sqlx equivalents `[interpretation]`

- Each `async fn handler(State(pool): State<PgPool>, ...)` function is a Transaction Script
- Business logic lives inline in the handler; no domain model coordination required
- Pairs naturally with `sqlx::query!` macros for compile-time checked SQL

---

## Domain Model (p. 116)

**Translation**: Direct (but adapted — no inheritance)

Rust structs with `impl` blocks carry data and behavior. Trait composition replaces inheritance. Rust's ownership prevents the shared-mutable-domain-object problem that plagues Java Domain Models.

### Rust structure

```rust
// Domain struct enforcing invariants via methods — behavior lives on the struct
#[derive(Debug, Clone)]
pub struct Order {
    pub id: i64,
    pub items: Vec<OrderItem>,
    pub status: OrderStatus,
}

impl Order {
    pub fn add_item(&mut self, item: OrderItem) -> Result<(), DomainError> {
        if self.status != OrderStatus::Draft {
            return Err(DomainError::OrderAlreadySubmitted);
        }
        self.items.push(item);
        Ok(())
    }

    pub fn total(&self) -> Money {
        self.items.iter().map(|i| i.line_total()).sum()
    }

    pub fn submit(&mut self) -> Result<(), DomainError> {
        if self.items.is_empty() {
            return Err(DomainError::EmptyOrder);
        }
        self.status = OrderStatus::Submitted;
        Ok(())
    }
}
```

### Axum / sqlx equivalents `[interpretation]`

- Domain structs live in a `domain` module; persistence is handled by a separate Data Mapper
- Traits (`trait Priceable`, `trait Submittable`) replace Java interface/abstract class hierarchies
- Rust's borrow checker ensures domain invariants hold across concurrent requests without a mutex

---

## Table Module (p. 125)

**Translation**: Adaptation

Java's Table Module is a single class instance handling all rows for a table. In Rust, this maps to a struct with no per-row state whose `impl` block contains all table-level operations, typically taking a `&PgPool`.

### Rust structure

```rust
// A zero-state struct whose methods operate on the whole table
pub struct OrderModule;

impl OrderModule {
    pub async fn find_by_customer(
        pool: &PgPool,
        customer_id: i64,
    ) -> Result<Vec<OrderRow>, sqlx::Error> {
        sqlx::query_as!(
            OrderRow,
            "SELECT id, customer_id, total_cents, status FROM orders WHERE customer_id = $1",
            customer_id
        )
        .fetch_all(pool)
        .await
    }

    pub async fn total_revenue(pool: &PgPool) -> Result<i64, sqlx::Error> {
        let row = sqlx::query!("SELECT COALESCE(SUM(total_cents), 0) AS total FROM orders")
            .fetch_one(pool)
            .await?;
        Ok(row.total.unwrap_or(0))
    }
}
```

### Axum / sqlx equivalents `[interpretation]`

- The Table Module struct can be stored in Axum state as `Arc<OrderModule>` if it held config
- Competes with Repository: Table Module returns raw rows; Repository returns domain objects
- In practice, sqlx users often skip Table Module and go directly to Data Mapper / Repository

---

## Service Layer (p. 133)

**Translation**: Direct

**Rust 2024 note**: For static dispatch, use `async fn` in trait without `#[async_trait]`. The example shows `Arc<dyn OrderService>` for Axum injection flexibility — this case still uses `#[async_trait]`. If you control all call sites, use `impl OrderService` bounds instead.

A struct whose `impl` block coordinates domain objects and repositories for each application use case. Injected via Axum state as `Arc<dyn OrderService>` to allow test substitution.

### Rust structure

```rust
#[async_trait] // needed for Arc<dyn Trait> dispatch — static dispatch would use `impl OrderService`
pub trait OrderService: Send + Sync {
    async fn place_order(&self, req: PlaceOrderRequest) -> Result<Order, AppError>;
    async fn cancel_order(&self, order_id: i64) -> Result<(), AppError>;
}

pub struct OrderServiceImpl {
    repo: Arc<dyn OrderRepository>,
    notifier: Arc<dyn Notifier>,
}

#[async_trait] // needed for Arc<dyn Trait> dispatch — static dispatch would use `impl OrderService`
impl OrderService for OrderServiceImpl {
    async fn place_order(&self, req: PlaceOrderRequest) -> Result<Order, AppError> {
        let mut order = Order::new(req.customer_id);
        for item in req.items {
            order.add_item(item)?;
        }
        order.submit()?;
        self.repo.save(&order).await?;
        self.notifier.order_placed(&order).await?;
        Ok(order)
    }

    async fn cancel_order(&self, order_id: i64) -> Result<(), AppError> {
        let mut order = self.repo.find(order_id).await?;
        order.cancel()?;
        self.repo.save(&order).await
    }
}
```

### Axum / sqlx equivalents `[interpretation]`

- Inject as `State(svc): State<Arc<dyn OrderService>>` in Axum handlers
- The trait enables Service Stub substitution in tests without touching handler code
- Service Layer sits between thin Axum handlers and the domain/repository layer

---

## Data Source Architecture (Ch. 10)

---

## Table Data Gateway (p. 144)

**Translation**: Direct

A struct with a `&PgPool` reference whose methods execute SQL for one table and return raw row structs. No domain logic — pure data access.

### Rust structure

```rust
pub struct ProductGateway<'a> {
    pool: &'a PgPool,
}

#[derive(sqlx::FromRow)]
pub struct ProductRow {
    pub id: i64,
    pub name: String,
    pub price_cents: i64,
    pub stock: i32,
}

impl<'a> ProductGateway<'a> {
    pub fn new(pool: &'a PgPool) -> Self {
        Self { pool }
    }

    pub async fn find_by_id(&self, id: i64) -> Result<Option<ProductRow>, sqlx::Error> {
        sqlx::query_as!(ProductRow,
            "SELECT id, name, price_cents, stock FROM products WHERE id = $1", id)
            .fetch_optional(self.pool).await
    }

    pub async fn insert(&self, name: &str, price_cents: i64) -> Result<i64, sqlx::Error> {
        let row = sqlx::query!("INSERT INTO products (name, price_cents) VALUES ($1, $2) RETURNING id",
            name, price_cents)
            .fetch_one(self.pool).await?;
        Ok(row.id)
    }
}
```

### Axum / sqlx equivalents `[interpretation]`

- `sqlx::query_as!` with `#[derive(sqlx::FromRow)]` is the idiomatic Table Data Gateway in Rust
- Returns `ProductRow` (raw DB shape), not domain `Product` — that mapping is elsewhere
- Pairs with Transaction Script: the handler calls the gateway directly, no domain model needed

---

## Row Data Gateway (p. 152)

**Translation**: Adaptation

In Java, one instance per database row. In Rust: a struct holding the row data plus `impl` methods for reload/update/delete that take a `&PgPool`. Not common in idiomatic Rust — Data Mapper is preferred.

### Rust structure

```rust
// One struct instance represents one row; methods operate on that row
pub struct UserRow {
    pub id: i64,
    pub email: String,
    pub name: String,
}

impl UserRow {
    pub async fn find(pool: &PgPool, id: i64) -> Result<Option<Self>, sqlx::Error> {
        sqlx::query_as!(Self,
            "SELECT id, email, name FROM users WHERE id = $1", id)
            .fetch_optional(pool).await
    }

    pub async fn update_email(&mut self, pool: &PgPool, email: String) -> Result<(), sqlx::Error> {
        sqlx::query!("UPDATE users SET email = $1 WHERE id = $2", email, self.id)
            .execute(pool).await?;
        self.email = email;
        Ok(())
    }

    pub async fn delete(self, pool: &PgPool) -> Result<(), sqlx::Error> {
        sqlx::query!("DELETE FROM users WHERE id = $1", self.id)
            .execute(pool).await?;
        Ok(())
    }
}
```

### Axum / sqlx equivalents `[interpretation]`

- This blurs into Active Record; the key difference is Row Data Gateway has no business logic
- Rust ownership makes `delete(self, ...)` consuming the struct natural — prevents use-after-delete
- In practice, Rust teams prefer a separate gateway or repository over per-row structs

---

## Active Record (p. 160)

**Translation**: Adaptation

No ORM in the Java/Python sense. The Rust approximation: a domain struct whose `impl` block bundles its own sqlx queries alongside business methods. This couples the struct to the DB schema — acknowledged trade-off.

### Rust structure

```rust
// Domain struct that also knows how to persist itself — couples to DB schema
pub struct Article {
    pub id: Option<i64>,
    pub title: String,
    pub body: String,
    pub published: bool,
}

impl Article {
    pub fn new(title: String, body: String) -> Self {
        Self { id: None, title, body, published: false }
    }

    pub fn publish(&mut self) {
        self.published = true;
    }

    pub async fn save(&mut self, pool: &PgPool) -> Result<(), sqlx::Error> {
        match self.id {
            None => {
                let row = sqlx::query!(
                    "INSERT INTO articles (title, body, published) VALUES ($1, $2, $3) RETURNING id",
                    self.title, self.body, self.published)
                    .fetch_one(pool).await?;
                self.id = Some(row.id);
            }
            Some(id) => {
                sqlx::query!(
                    "UPDATE articles SET title=$1, body=$2, published=$3 WHERE id=$4",
                    self.title, self.body, self.published, id)
                    .execute(pool).await?;
            }
        }
        Ok(())
    }

    pub async fn find(pool: &PgPool, id: i64) -> Result<Option<Self>, sqlx::Error> {
        sqlx::query_as!(Self,
            "SELECT id, title, body, published FROM articles WHERE id = $1", id)
            .fetch_optional(pool).await
    }
}
```

### Axum / sqlx equivalents `[interpretation]`

- Acceptable for simple CRUD services where a full Domain Model + Data Mapper is overkill
- The DB schema coupling is explicit rather than hidden by an ORM, which suits Rust's philosophy
- `id: Option<i64>` distinguishes unsaved (`None`) from persisted (`Some(id)`) — idiomatic Rust

---

## Data Mapper (p. 165)

**Translation**: Direct — natural fit

sqlx naturally separates query logic from domain structs. A function or struct that takes a `&PgPool` and returns a domain type IS a Data Mapper. This is the recommended pattern in idiomatic Rust.

### Rust structure

```rust
// Domain struct — knows nothing about DB
#[derive(Debug, Clone)]
pub struct Customer {
    pub id: i64,
    pub name: String,
    pub email: String,
    pub tier: CustomerTier,
}

// Raw DB row — separate from domain
#[derive(sqlx::FromRow)]
struct CustomerRecord {
    id: i64,
    name: String,
    email: String,
    tier_code: String,
}

// Mapper: translates between DB record and domain object
pub struct CustomerMapper;

impl CustomerMapper {
    pub async fn find_by_id(pool: &PgPool, id: i64) -> Result<Option<Customer>, AppError> {
        let row = sqlx::query_as!(CustomerRecord,
            "SELECT id, name, email, tier_code FROM customers WHERE id = $1", id)
            .fetch_optional(pool).await?;
        Ok(row.map(Self::to_domain))
    }

    fn to_domain(r: CustomerRecord) -> Customer {
        Customer {
            id: r.id,
            name: r.name,
            email: r.email,
            tier: CustomerTier::from_code(&r.tier_code),
        }
    }
}
```

### Axum / sqlx equivalents `[interpretation]`

- `sqlx::query_as!` macro + `#[derive(sqlx::FromRow)]` on the record struct is the DB side
- The mapping function (`to_domain`) is the mapper proper — translate codes, enums, nested types
- Repository pattern builds on Data Mapper to provide a collection-like interface

---

## OR Behavioral (Ch. 11)

---

## Unit of Work (p. 184)

**Translation**: Direct

`sqlx::Transaction<'_, Postgres>` is Unit of Work: begin, pass it through multiple operations, commit or rollback. All enrolled operations either all succeed or all fail.

### Rust structure

```rust
// Unit of Work = sqlx transaction passed through multiple operations
pub async fn create_order_with_items(
    pool: &PgPool,
    customer_id: i64,
    items: Vec<NewItem>,
) -> Result<i64, AppError> {
    let mut tx = pool.begin().await?;

    let order = sqlx::query!(
        "INSERT INTO orders (customer_id, status) VALUES ($1, 'draft') RETURNING id",
        customer_id)
        .fetch_one(&mut *tx).await?;

    for item in &items {
        sqlx::query!(
            "INSERT INTO order_items (order_id, product_id, qty) VALUES ($1, $2, $3)",
            order.id, item.product_id, item.qty)
            .execute(&mut *tx).await?;
    }

    sqlx::query!("UPDATE orders SET status = 'submitted' WHERE id = $1", order.id)
        .execute(&mut *tx).await?;

    tx.commit().await?;
    Ok(order.id)
}
```

### Axum / sqlx equivalents `[interpretation]`

- `pool.begin()` returns `Transaction<'_, Postgres>`; pass `&mut *tx` to every query
- If any query returns `Err`, dropping `tx` without `commit()` triggers automatic rollback
- `tx.commit().await?` is the "flush" that finalizes all registered changes

---

## Identity Map (p. 195)

**Translation**: Adaptation

Not built into sqlx. Implement as a `HashMap<i64, Arc<Entity>>` within a request-scoped struct. Rust ownership makes "two references to the same object" explicit through `Arc` rather than hidden pointer identity.

### Rust structure

```rust
use std::collections::HashMap;
use std::sync::Arc;

// Request-scoped identity map — one per request/unit-of-work
pub struct IdentityMap {
    customers: HashMap<i64, Arc<Customer>>,
}

impl IdentityMap {
    pub fn new() -> Self {
        Self { customers: HashMap::new() }
    }

    pub fn get_customer(&self, id: i64) -> Option<Arc<Customer>> {
        self.customers.get(&id).cloned()
    }

    pub fn register_customer(&mut self, customer: Customer) -> Arc<Customer> {
        let id = customer.id;
        let arc = Arc::new(customer);
        self.customers.insert(id, Arc::clone(&arc));
        arc
    }
}

// Usage in mapper: check map before hitting DB
pub async fn load_customer(
    pool: &PgPool,
    map: &mut IdentityMap,
    id: i64,
) -> Result<Arc<Customer>, AppError> {
    if let Some(c) = map.get_customer(id) {
        return Ok(c);
    }
    let c = CustomerMapper::find_by_id(pool, id).await?.ok_or(AppError::NotFound)?;
    Ok(map.register_customer(c))
}
```

### Axum / sqlx equivalents `[interpretation]`

- Scoped to a single request; do not store in Axum shared state (that would be global mutable state)
- `Arc<Customer>` allows multiple parts of request handling to hold a reference without cloning data
- In high-throughput Axum services, prefer re-querying over a request-scoped identity map unless profiling shows DB round-trip cost

---

## Lazy Load (p. 200)

**Translation**: Conceptual translation `[interpretation]`

Rust has no runtime lazy evaluation for struct fields built in. Use `Option<Vec<Item>>` where `None` means "not yet loaded." Loading is explicit — call an async function to populate the field. No proxy magic.

### Rust structure

```rust
// Option<T> = not-yet-loaded; explicit async fetch instead of transparent proxy
#[derive(Debug)]
pub struct BlogPost {
    pub id: i64,
    pub title: String,
    pub body: String,
    // None = not loaded yet; Some(vec) = loaded (possibly empty)
    pub comments: Option<Vec<Comment>>,
}

impl BlogPost {
    pub async fn load_comments(&mut self, pool: &PgPool) -> Result<&[Comment], sqlx::Error> {
        if self.comments.is_none() {
            let comments = sqlx::query_as!(Comment,
                "SELECT id, post_id, body FROM comments WHERE post_id = $1", self.id)
                .fetch_all(pool).await?;
            self.comments = Some(comments);
        }
        Ok(self.comments.as_deref().unwrap())
    }
}
```

### Axum / sqlx equivalents `[interpretation]`

- Fowler's four variants (lazy init, virtual proxy, value holder, ghost) all collapse to `Option<T>` + explicit async fetch in Rust — there is no transparent proxy mechanism
- Prefer returning a separate `PostWithComments` struct from a JOIN query over lazy loading in async code; N+1 queries are just as painful in async Rust as in Java
- `once_cell::sync::OnceCell<T>` can serve as a lazy initializer for expensive computed values that are not async

---

## OR Structural (Ch. 12)

---

## Identity Field (p. 216)

**Translation**: Direct

An `id` field on the domain struct that holds the database primary key. Use `Option<i64>` for unsaved entities; `i64` for entities loaded from the DB.

### Rust structure

```rust
// id: i64 = persisted; id: Option<i64> = may be unsaved
#[derive(Debug, Clone)]
pub struct Employee {
    pub id: i64,          // always present for loaded entities
    pub name: String,
    pub department_id: i64,
}

// For entities that may not yet be persisted
#[derive(Debug)]
pub struct NewEmployee {
    pub name: String,
    pub department_id: i64,
}

// Mapper uses RETURNING id to populate Identity Field after insert
pub async fn insert_employee(pool: &PgPool, e: NewEmployee) -> Result<Employee, sqlx::Error> {
    let row = sqlx::query!(
        "INSERT INTO employees (name, department_id) VALUES ($1, $2) RETURNING id",
        e.name, e.department_id)
        .fetch_one(pool).await?;
    Ok(Employee { id: row.id, name: e.name, department_id: e.department_id })
}
```

### Axum / sqlx equivalents `[interpretation]`

- `RETURNING id` in sqlx INSERT queries is the standard way to hydrate the Identity Field
- Splitting into `NewEmployee` / `Employee` types (the "New Type" pattern) encodes the saved/unsaved distinction at the type level — Rust's type system enforces this better than a nullable field
- Composite primary keys: use a tuple struct `(i64, i64)` or a dedicated `OrderItemId { order_id, line_no }` struct

---

## Foreign Key Mapping (p. 236)

**Translation**: Direct

A foreign key column maps to an `id` field on the owning struct. Load the related object via a separate query or JOIN. Rust makes the association explicit — no hidden lazy loading.

### Rust structure

```rust
#[derive(Debug, sqlx::FromRow)]
pub struct OrderRecord {
    pub id: i64,
    pub customer_id: i64,   // FK — maps to Customer.id
    pub total_cents: i64,
}

// Association resolved by JOIN in mapper — explicit, not lazy
pub struct OrderWithCustomer {
    pub order: Order,
    pub customer: Customer,
}

pub async fn find_order_with_customer(
    pool: &PgPool,
    order_id: i64,
) -> Result<Option<OrderWithCustomer>, AppError> {
    let row = sqlx::query!(
        r#"SELECT o.id, o.total_cents, c.id as cid, c.name, c.email
           FROM orders o JOIN customers c ON c.id = o.customer_id
           WHERE o.id = $1"#,
        order_id)
        .fetch_optional(pool).await?;
    Ok(row.map(|r| OrderWithCustomer {
        order: Order { id: r.id, customer_id: r.cid, total_cents: r.total_cents },
        customer: Customer { id: r.cid, name: r.name, email: r.email },
    }))
}
```

### Axum / sqlx equivalents `[interpretation]`

- sqlx compile-time query checking catches FK column name typos at build time
- Use `JOIN` for eager loading; use a second `query_as!` call for selective loading
- `customer_id: i64` on the struct IS the Foreign Key Mapping — the typed field replaces the raw column

---

## Association Table Mapping (p. 248)

**Translation**: Direct

A many-to-many join table maps to explicit INSERT/DELETE queries on the link table. No ORM hides this — the link table is queried directly.

### Rust structure

```rust
// Many-to-many: students <-> courses via enrollments link table
pub async fn enroll_student(
    pool: &PgPool,
    student_id: i64,
    course_id: i64,
) -> Result<(), sqlx::Error> {
    sqlx::query!(
        "INSERT INTO enrollments (student_id, course_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        student_id, course_id)
        .execute(pool).await?;
    Ok(())
}

pub async fn courses_for_student(
    pool: &PgPool,
    student_id: i64,
) -> Result<Vec<Course>, sqlx::Error> {
    sqlx::query_as!(Course,
        r#"SELECT c.id, c.name FROM courses c
           JOIN enrollments e ON e.course_id = c.id
           WHERE e.student_id = $1"#,
        student_id)
        .fetch_all(pool).await
}

pub async fn unenroll(pool: &PgPool, student_id: i64, course_id: i64) -> Result<(), sqlx::Error> {
    sqlx::query!(
        "DELETE FROM enrollments WHERE student_id = $1 AND course_id = $2",
        student_id, course_id)
        .execute(pool).await?;
    Ok(())
}
```

### Axum / sqlx equivalents `[interpretation]`

- The link table is fully visible in sqlx queries — no magic join resolution
- `ON CONFLICT DO NOTHING` handles idempotent re-enrollment cleanly
- For link tables with extra columns (e.g., `enrolled_at`), define a dedicated `Enrollment` struct

---

## Dependent Mapping (p. 262)

**Translation**: Direct

The owner's mapper handles all persistence for child objects. In Rust: the parent mapper issues INSERT/DELETE for children within the same transaction; children have no independent mapper.

### Rust structure

```rust
// Owner: Invoice; Dependents: LineItems — no independent LineItem mapper
pub async fn save_invoice(
    pool: &PgPool,
    invoice: &Invoice,
) -> Result<(), AppError> {
    let mut tx = pool.begin().await?;

    sqlx::query!(
        "INSERT INTO invoices (id, customer_id, issued_at) VALUES ($1, $2, $3)
         ON CONFLICT (id) DO UPDATE SET customer_id=$2, issued_at=$3",
        invoice.id, invoice.customer_id, invoice.issued_at)
        .execute(&mut *tx).await?;

    // Delete and re-insert dependents — simple and safe
    sqlx::query!("DELETE FROM line_items WHERE invoice_id = $1", invoice.id)
        .execute(&mut *tx).await?;

    for item in &invoice.line_items {
        sqlx::query!(
            "INSERT INTO line_items (invoice_id, description, amount_cents) VALUES ($1, $2, $3)",
            invoice.id, item.description, item.amount_cents)
            .execute(&mut *tx).await?;
    }

    tx.commit().await?;
    Ok(())
}
```

### Axum / sqlx equivalents `[interpretation]`

- Delete-and-reinsert is simpler than diffing in most Rust codebases — prefer it unless the table is large
- Children never appear in Axum routes as independent resources; they are always accessed via the owner
- Transaction wraps owner + children save — Unit of Work enforces atomicity

---

## Embedded Value (p. 268)

**Translation**: Direct — excellent fit

A small value type (`Address`, `Money`) is stored as columns on the owning table. The mapper extracts those columns into a nested Rust struct. Pairs perfectly with Value Object.

### Rust structure

```rust
// Value type embedded in owner's table — no separate address table
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Address {
    pub street: String,
    pub city: String,
    pub postcode: String,
}

#[derive(Debug, Clone)]
pub struct Supplier {
    pub id: i64,
    pub name: String,
    pub address: Address,  // embedded — maps to street/city/postcode columns
}

pub async fn find_supplier(pool: &PgPool, id: i64) -> Result<Option<Supplier>, sqlx::Error> {
    let row = sqlx::query!(
        "SELECT id, name, street, city, postcode FROM suppliers WHERE id = $1", id)
        .fetch_optional(pool).await?;
    Ok(row.map(|r| Supplier {
        id: r.id,
        name: r.name,
        address: Address { street: r.street, city: r.city, postcode: r.postcode },
    }))
}
```

### Axum / sqlx equivalents `[interpretation]`

- sqlx `query!` selects individual columns; the mapper constructor assembles the `Address` struct
- The `Address` struct derives `PartialEq + Eq` — it is a Value Object, making equality comparison trivial
- For JSON columns: `sqlx::types::Json<Address>` wraps a serde-deserializable struct stored as JSONB

---

## Serialized LOB (p. 272)

**Translation**: Direct

Store a complex object graph as a JSON/JSONB column. sqlx's `Json<T>` wrapper handles serialization. Suitable when the nested data never needs to be queried by column value.

### Rust structure

```rust
use sqlx::types::Json;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Preferences {
    pub theme: String,
    pub notifications: Vec<String>,
    pub feature_flags: std::collections::HashMap<String, bool>,
}

#[derive(Debug, sqlx::FromRow)]
pub struct UserProfile {
    pub id: i64,
    pub username: String,
    pub preferences: Json<Preferences>,  // stored as JSONB column
}

pub async fn find_profile(pool: &PgPool, id: i64) -> Result<Option<UserProfile>, sqlx::Error> {
    sqlx::query_as!(UserProfile,
        r#"SELECT id, username, preferences as "preferences: Json<Preferences>"
           FROM user_profiles WHERE id = $1"#,
        id)
        .fetch_optional(pool).await
}
```

### Axum / sqlx equivalents `[interpretation]`

- `sqlx::types::Json<T>` requires `serde::Serialize + DeserializeOwned` on `T`
- PostgreSQL JSONB column is the standard backing store; use `jsonb_set` for partial updates
- Do not use Serialized LOB when you need to filter or sort by fields inside the blob — use Embedded Value instead

---

## Single Table Inheritance (p. 278)

**Translation**: Adaptation `[interpretation]`

Rust has no class inheritance. Use an enum with variants for each subtype plus a `type` discriminator column. `match` on the variant drives polymorphic dispatch.

### Rust structure

```rust
// All employee types in one table; type_code discriminates
#[derive(Debug, Clone)]
pub enum Employee {
    Salaried(SalariedEmployee),
    Hourly(HourlyEmployee),
    Contractor(ContractorEmployee),
}

impl Employee {
    pub fn annual_cost(&self) -> i64 {
        match self {
            Employee::Salaried(e) => e.annual_salary_cents,
            Employee::Hourly(e) => e.hourly_rate_cents * e.expected_hours_per_year,
            Employee::Contractor(e) => e.day_rate_cents * e.expected_days_per_year,
        }
    }
}

pub async fn find_employee(pool: &PgPool, id: i64) -> Result<Option<Employee>, AppError> {
    let row = sqlx::query!(
        "SELECT id, name, type_code, annual_salary_cents, hourly_rate_cents,
                expected_hours, day_rate_cents, expected_days
         FROM employees WHERE id = $1", id)
        .fetch_optional(pool).await?;
    Ok(row.map(|r| match r.type_code.as_str() {
        "salaried" => Employee::Salaried(SalariedEmployee { id: r.id, name: r.name,
            annual_salary_cents: r.annual_salary_cents.unwrap_or(0) }),
        "hourly"   => Employee::Hourly(HourlyEmployee { id: r.id, name: r.name,
            hourly_rate_cents: r.hourly_rate_cents.unwrap_or(0),
            expected_hours_per_year: r.expected_hours.unwrap_or(0) }),
        _          => Employee::Contractor(ContractorEmployee { id: r.id, name: r.name,
            day_rate_cents: r.day_rate_cents.unwrap_or(0),
            expected_days_per_year: r.expected_days.unwrap_or(0) }),
    }))
}
```

### Axum / sqlx equivalents `[interpretation]`

- The `type_code` column is the discriminator; nullable subtype columns hold `Option<T>`
- Rust's exhaustive `match` forces handling every variant — no forgotten subtype
- `serde` can serialize/deserialize the enum with `#[serde(tag = "type")]` for JSON APIs

---

## Class Table Inheritance (p. 285)

**Translation**: Adaptation `[interpretation]`

Each conceptual "class" gets its own table joined by shared primary key. The mapper performs a JOIN and constructs the appropriate enum variant.

### Rust structure

```rust
// employees (base) + salaried_employees (subtype) joined on id
pub async fn find_salaried(pool: &PgPool, id: i64) -> Result<Option<SalariedEmployee>, AppError> {
    let row = sqlx::query!(
        r#"SELECT e.id, e.name, e.hired_at, s.annual_salary_cents
           FROM employees e
           JOIN salaried_employees s ON s.id = e.id
           WHERE e.id = $1"#,
        id)
        .fetch_optional(pool).await?;
    Ok(row.map(|r| SalariedEmployee {
        id: r.id,
        name: r.name,
        hired_at: r.hired_at,
        annual_salary_cents: r.annual_salary_cents,
    }))
}

pub async fn insert_salaried(pool: &PgPool, e: &SalariedEmployee) -> Result<(), AppError> {
    let mut tx = pool.begin().await?;
    sqlx::query!("INSERT INTO employees (id, name, hired_at) VALUES ($1, $2, $3)",
        e.id, e.name, e.hired_at).execute(&mut *tx).await?;
    sqlx::query!("INSERT INTO salaried_employees (id, annual_salary_cents) VALUES ($1, $2)",
        e.id, e.annual_salary_cents).execute(&mut *tx).await?;
    tx.commit().await?;
    Ok(())
}
```

### Axum / sqlx equivalents `[interpretation]`

- The base table holds shared columns; subtype tables hold subtype-specific columns keyed by same `id`
- INSERT into base table then subtype table within one transaction (Dependent Mapping style)
- More normalized than Single Table Inheritance but requires JOINs; use when subtype columns are numerous

---

## Concrete Table Inheritance (p. 293)

**Translation**: Adaptation `[interpretation]`

Each concrete subtype has a fully self-contained table with all columns (including inherited ones). No JOINs needed. Use a separate query per subtype; polymorphic queries require UNION.

### Rust structure

```rust
// Each subtype is fully self-contained — no shared base table
pub async fn find_any_employee(pool: &PgPool, id: i64) -> Result<Option<Employee>, AppError> {
    // Try each subtype table — no JOIN, but multiple queries
    if let Some(r) = sqlx::query!(
        "SELECT id, name, annual_salary_cents FROM salaried_employees WHERE id = $1", id)
        .fetch_optional(pool).await? {
        return Ok(Some(Employee::Salaried(SalariedEmployee {
            id: r.id, name: r.name, annual_salary_cents: r.annual_salary_cents })));
    }
    if let Some(r) = sqlx::query!(
        "SELECT id, name, hourly_rate_cents FROM hourly_employees WHERE id = $1", id)
        .fetch_optional(pool).await? {
        return Ok(Some(Employee::Hourly(HourlyEmployee {
            id: r.id, name: r.name, hourly_rate_cents: r.hourly_rate_cents })));
    }
    Ok(None)
}
```

### Axum / sqlx equivalents `[interpretation]`

- Simplest per-subtype queries (no JOINs), but polymorphic find requires multiple queries or UNION ALL
- ID generation must be coordinated across tables (use a sequence or UUID to avoid collisions)
- In Rust, this pattern is uncommon; Single Table Inheritance with an enum is usually preferred

---

## Inheritance Mappers (p. 302)

**Translation**: Adaptation `[interpretation]`

Java uses an abstract mapper hierarchy. In Rust, shared mapper behavior is expressed as free functions or a trait with a default implementation. There is no abstract class — use a trait or a common helper module.

### Rust structure

```rust
// Shared mapper behavior expressed as a trait with common helpers
pub trait EmployeeMapper {
    type Row;
    fn to_domain(row: Self::Row) -> Employee;
}

// Shared helper: load common base fields (used by all subtype mappers)
async fn load_base_fields(pool: &PgPool, id: i64) -> Result<Option<BaseEmployeeRow>, sqlx::Error> {
    sqlx::query_as!(BaseEmployeeRow,
        "SELECT id, name, hired_at FROM employees WHERE id = $1", id)
        .fetch_optional(pool).await
}

pub struct SalariedMapper;

impl SalariedMapper {
    pub async fn find(pool: &PgPool, id: i64) -> Result<Option<Employee>, AppError> {
        let base = load_base_fields(pool, id).await?;
        let sub = sqlx::query!("SELECT annual_salary_cents FROM salaried_employees WHERE id=$1", id)
            .fetch_optional(pool).await?;
        Ok(base.zip(sub).map(|(b, s)| Employee::Salaried(SalariedEmployee {
            id: b.id, name: b.name, hired_at: b.hired_at,
            annual_salary_cents: s.annual_salary_cents,
        })))
    }
}
```

### Axum / sqlx equivalents `[interpretation]`

- Rust traits with default methods serve as the "abstract mapper" equivalent
- Free functions for shared loading logic (`load_base_fields`) replace abstract class methods
- In practice, the enum + Single Table Inheritance pattern is simpler for most Rust teams

---

## OR Metadata (Ch. 13)

---

## Metadata Mapping (p. 306)

**Translation**: Conceptual translation `[interpretation]`

Java ORMs use XML or annotation metadata to declare field-column mappings at runtime. Rust has no runtime reflection. The closest equivalent is sqlx's compile-time query checking — the mapping is declared in `query_as!` macro calls and `#[derive(sqlx::FromRow)]`, verified at compile time rather than at runtime.

### Rust structure

```rust
// Compile-time metadata: #[sqlx(rename)] and #[derive(FromRow)] are the Rust equivalent
#[derive(Debug, sqlx::FromRow)]
pub struct ProductRecord {
    pub id: i64,
    #[sqlx(rename = "prod_name")]     // column name differs from field name
    pub name: String,
    #[sqlx(rename = "price_usd_cents")]
    pub price_cents: i64,
    #[sqlx(default)]                  // nullable column with default
    pub description: Option<String>,
}

// The sqlx query_as! macro checks column names against the struct at compile time
pub async fn all_products(pool: &PgPool) -> Result<Vec<ProductRecord>, sqlx::Error> {
    sqlx::query_as!(ProductRecord, "SELECT id, prod_name, price_usd_cents, description FROM products")
        .fetch_all(pool).await
}
```

### Axum / sqlx equivalents `[interpretation]`

- `#[derive(sqlx::FromRow)]` with `#[sqlx(rename = "col")]` attributes is compile-time Metadata Mapping
- Unlike Java ORM XML mapping, errors are caught at `cargo build` time, not at runtime
- There is no runtime reflection or dynamic mapping table — the mapping is baked into the binary

---

## Query Object (p. 316)

**Translation**: Adaptation

Java's Query Object builds SQL from domain-level predicates at runtime. In Rust, use a builder struct that accumulates conditions and renders SQL, or use the `sea-query` crate for a type-safe query builder. `sqlx::query!` is not suitable here (compile-time only).

### Rust structure

```rust
// Query builder struct accumulates filters, renders to SQL string
#[derive(Default)]
pub struct ProductQuery {
    min_price_cents: Option<i64>,
    category: Option<String>,
    in_stock: Option<bool>,
}

impl ProductQuery {
    pub fn min_price(mut self, cents: i64) -> Self {
        self.min_price_cents = Some(cents); self
    }
    pub fn category(mut self, cat: impl Into<String>) -> Self {
        self.category = Some(cat.into()); self
    }
    pub fn in_stock(mut self) -> Self {
        self.in_stock = Some(true); self
    }

    pub async fn execute(self, pool: &PgPool) -> Result<Vec<ProductRecord>, sqlx::Error> {
        let mut builder = sqlx::QueryBuilder::new(
            "SELECT id, name, price_cents, stock FROM products WHERE 1=1");
        if let Some(p) = self.min_price_cents {
            builder.push(" AND price_cents >= ").push_bind(p);
        }
        if let Some(c) = self.category {
            builder.push(" AND category = ").push_bind(c);
        }
        if self.in_stock == Some(true) {
            builder.push(" AND stock > 0");
        }
        builder.build_query_as().fetch_all(pool).await
    }
}
```

### Axum / sqlx equivalents `[interpretation]`

- `sqlx::QueryBuilder` is the sqlx-native Query Object builder — handles parameterized binding safely
- The `sea-query` crate provides a more complete type-safe query AST if complex queries are needed
- Pairs with Repository: the Repository method accepts a `ProductQuery` and calls `.execute(pool)`

---

## Repository (p. 322)

**Translation**: Direct — natural fit

A trait with async collection-like methods (`find`, `save`, `delete`) backed by a sqlx implementation. `Arc<dyn Repository>` is injected via Axum state. A separate mock implementation enables unit testing.

### Rust structure

```rust
#[async_trait] // needed for Arc<dyn Trait> dispatch — static dispatch would use `impl OrderRepository`
pub trait OrderRepository: Send + Sync {
    async fn find(&self, id: i64) -> Result<Option<Order>, AppError>;
    async fn find_by_customer(&self, customer_id: i64) -> Result<Vec<Order>, AppError>;
    async fn save(&self, order: &Order) -> Result<(), AppError>;
    async fn delete(&self, id: i64) -> Result<(), AppError>;
}

pub struct SqlxOrderRepository {
    pool: PgPool,
}

#[async_trait] // needed for Arc<dyn Trait> dispatch — static dispatch would use `impl OrderRepository`
impl OrderRepository for SqlxOrderRepository {
    async fn find(&self, id: i64) -> Result<Option<Order>, AppError> {
        let row = sqlx::query_as!(OrderRecord,
            "SELECT id, customer_id, status, total_cents FROM orders WHERE id = $1", id)
            .fetch_optional(&self.pool).await?;
        Ok(row.map(OrderMapper::to_domain))
    }

    async fn save(&self, order: &Order) -> Result<(), AppError> {
        sqlx::query!(
            "INSERT INTO orders (id, customer_id, status, total_cents)
             VALUES ($1,$2,$3,$4) ON CONFLICT(id) DO UPDATE SET status=$3, total_cents=$4",
            order.id, order.customer_id, order.status.as_str(), order.total_cents)
            .execute(&self.pool).await?;
        Ok(())
    }
    // find_by_customer, delete omitted for brevity
}
```

### Axum / sqlx equivalents `[interpretation]`

- Inject as `State(repo): State<Arc<dyn OrderRepository>>` in handler functions
- Test code supplies `Arc<MockOrderRepository>` — swap without changing handler code
- The trait bounds `Send + Sync` are required for Axum's multithreaded tokio runtime

```rust
// Alternative: static dispatch with native AFIT (Rust 1.75+, no async-trait needed)
// Use when you don't need dyn dispatch
trait OrderRepository {
    async fn find(&self, id: i64) -> Result<Option<Order>, sqlx::Error>;
    async fn save(&self, order: &Order) -> Result<(), sqlx::Error>;
}

// Generic function — compiler monomorphizes, no vtable
async fn process<R: OrderRepository>(repo: &R, order_id: i64) -> Result<(), AppError> {
    let order = repo.find(order_id).await?.ok_or(AppError::NotFound)?;
    // ...
    Ok(())
}
```

---

## Web Presentation (Ch. 14)

---

## Model View Controller (p. 330)

**Translation**: Direct

Axum naturally separates into Model (domain structs in `domain/`), View (JSON serialization or template rendering), and Controller (handler functions). The Axum router wires them together.

### Rust structure

```rust
// Model: domain struct in domain module
mod domain {
    pub struct Product { pub id: i64, pub name: String, pub price_cents: i64 }
}

// View: serde serialization IS the view for JSON APIs
mod view {
    use serde::Serialize;
    #[derive(Serialize)]
    pub struct ProductView { pub id: i64, pub name: String, pub price: f64 }
    impl From<super::domain::Product> for ProductView {
        fn from(p: super::domain::Product) -> Self {
            Self { id: p.id, name: p.name, price: p.price_cents as f64 / 100.0 }
        }
    }
}

// Controller: Axum handler function
async fn get_product(
    State(repo): State<Arc<dyn ProductRepository>>,
    Path(id): Path<i64>,
) -> Result<Json<view::ProductView>, AppError> {
    let product = repo.find(id).await?.ok_or(AppError::NotFound)?;
    Ok(Json(product.into()))
}
```

### Axum / sqlx equivalents `[interpretation]`

- Model lives in `domain/` or `model/`; View is a `#[derive(Serialize)]` struct; Controller is an `async fn` handler
- For HTML responses, `askama` or `tera` templates serve as the View
- Axum's `Router` is the wiring that connects URLs (controller dispatch) to handler functions

---

## Page Controller (p. 333)

**Translation**: Direct

Each Axum handler function handles one specific page or action. For related actions, group handlers in a module and share a base URL prefix in the router.

### Rust structure

```rust
// One module = one "page controller" grouping related actions
mod orders_controller {
    use super::*;

    pub async fn index(
        State(repo): State<Arc<dyn OrderRepository>>,
        Query(params): Query<OrderListParams>,
    ) -> Result<Json<Vec<OrderSummary>>, AppError> {
        let orders = repo.find_by_customer(params.customer_id).await?;
        Ok(Json(orders.into_iter().map(OrderSummary::from).collect()))
    }

    pub async fn show(
        State(repo): State<Arc<dyn OrderRepository>>,
        Path(id): Path<i64>,
    ) -> Result<Json<OrderDetail>, AppError> {
        let order = repo.find(id).await?.ok_or(AppError::NotFound)?;
        Ok(Json(OrderDetail::from(order)))
    }

    pub async fn create(
        State(svc): State<Arc<dyn OrderService>>,
        Json(req): Json<CreateOrderRequest>,
    ) -> Result<Json<OrderDetail>, StatusCode> {
        let order = svc.place_order(req.into()).await.map_err(|_| StatusCode::BAD_REQUEST)?;
        Ok(Json(OrderDetail::from(order)))
    }
}

// Router wires the Page Controller
pub fn orders_router() -> Router<AppState> {
    Router::new()
        .route("/orders", get(orders_controller::index).post(orders_controller::create))
        .route("/orders/:id", get(orders_controller::show))
}
```

### Axum / sqlx equivalents `[interpretation]`

- Each `async fn` in the controller module handles exactly one route action — pure Page Controller
- Shared state (`Arc<dyn Repository>`) is extracted via `State(...)` extractor in each handler
- Module grouping is convention only — Axum does not enforce it

---

## Front Controller (p. 344)

**Translation**: Direct

`axum::Router` IS a Front Controller: it receives all requests, dispatches to the appropriate handler, and applies middleware uniformly. Shared `AppState` is the global context.

### Rust structure

```rust
// AppState = shared context available to all handlers
#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub order_repo: Arc<dyn OrderRepository>,
    pub product_repo: Arc<dyn ProductRepository>,
}

// Router = Front Controller: single entry point, dispatches all requests
pub fn build_router(state: AppState) -> Router {
    Router::new()
        .nest("/api/orders", orders_router())
        .nest("/api/products", products_router())
        .layer(TraceLayer::new_for_http())
        .layer(CorsLayer::permissive())
        .with_state(state)
}

// Middleware applied uniformly via .layer() — authentication, logging, rate limiting
async fn auth_middleware(
    State(state): State<AppState>,
    req: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    // validate bearer token, inject user into request extensions
    next.run(req).await
}
```

### Axum / sqlx equivalents `[interpretation]`

- `Router::new()` with nested sub-routers and `.layer()` middleware IS Front Controller
- Axum's `middleware::from_fn_with_state` enables middleware that accesses `AppState`
- The dispatch table (URL → handler) is declared at startup — compile-time routing, not runtime command lookup

---

## Template View (p. 350)

**Translation**: Adaptation

Axum is JSON-first. For HTML template rendering, use the `askama` or `tera` crate. The template file is the View; the Rust struct passed to it is the template model.

### Rust structure

```rust
// askama: templates compiled at build time from templates/ directory
use askama::Template;

#[derive(Template)]
#[template(path = "product_detail.html")]
pub struct ProductDetailTemplate {
    pub name: String,
    pub price: String,
    pub in_stock: bool,
}

// Axum handler returns HTML
async fn product_page(
    State(repo): State<Arc<dyn ProductRepository>>,
    Path(id): Path<i64>,
) -> Result<Html<String>, AppError> {
    let product = repo.find(id).await?.ok_or(AppError::NotFound)?;
    let tmpl = ProductDetailTemplate {
        name: product.name.clone(),
        price: format!("${:.2}", product.price_cents as f64 / 100.0),
        in_stock: product.stock > 0,
    };
    Ok(Html(tmpl.render().map_err(|_| AppError::Internal)?))
}
```

### Axum / sqlx equivalents `[interpretation]`

- `askama`: templates compiled at build time — type-safe, zero-cost rendering `[interpretation]`
- `tera`: runtime template loading — more flexible, enables hot reload during development
- For JSON APIs, `#[derive(Serialize)]` view structs + `Json(view)` are the Template View equivalent

---

## Transform View (p. 361)

**Translation**: Conceptual translation `[interpretation]`

Fowler's Transform View uses XSLT to transform domain data element-by-element into HTML. Rust/Axum has no XSLT pipeline. The conceptual equivalent: a serialization pipeline where domain objects are transformed into an intermediate representation (e.g., a presentation struct), then serialized to JSON or rendered to HTML.

### Rust structure

```rust
// Transform: domain -> intermediate view model -> final output
// Each stage is a pure function — composable, testable

fn order_to_view(order: &Order) -> OrderViewModel {
    OrderViewModel {
        id: order.id,
        status_label: order.status.display_label(),
        total_display: format_currency(order.total_cents),
        items: order.items.iter().map(item_to_view).collect(),
    }
}

fn item_to_view(item: &OrderItem) -> OrderItemView {
    OrderItemView {
        description: item.product_name.clone(),
        qty: item.qty,
        line_total: format_currency(item.line_total_cents()),
    }
}

// Handler: transform then serialize
async fn order_detail(
    State(repo): State<Arc<dyn OrderRepository>>,
    Path(id): Path<i64>,
) -> Result<Json<OrderViewModel>, AppError> {
    let order = repo.find(id).await?.ok_or(AppError::NotFound)?;
    Ok(Json(order_to_view(&order)))
}
```

### Axum / sqlx equivalents `[interpretation]`

- Pure transformation functions (`domain -> view model`) are the Rust equivalent of XSLT templates
- Each transform function handles one element type — the "element-by-element" nature is preserved
- For actual XML/XSLT, use the `libxslt` bindings crate, but this is rare in modern Rust web services

---

## Two Step View (p. 365)

**Translation**: Conceptual translation `[interpretation]`

Step 1: domain objects → logical screen structure (a view model struct). Step 2: view model → rendered output (JSON serialization or template rendering). Separating these steps allows the rendering step to be swapped (JSON vs HTML) without changing step 1.

### Rust structure

```rust
// Step 1: Domain -> Logical Screen Structure (view model)
// This step is rendering-format-agnostic
fn to_screen(order: &Order) -> OrderScreen {
    OrderScreen {
        headline: format!("Order #{}", order.id),
        status: order.status.display_label().to_string(),
        line_items: order.items.iter().map(|i| LineItemScreen {
            label: i.product_name.clone(),
            amount: format_currency(i.line_total_cents()),
        }).collect(),
        total: format_currency(order.total_cents),
    }
}

// Step 2a: Logical Screen -> JSON (API client)
async fn order_as_json(State(repo): State<Arc<dyn OrderRepository>>, Path(id): Path<i64>)
    -> Result<Json<OrderScreen>, AppError> {
    let order = repo.find(id).await?.ok_or(AppError::NotFound)?;
    Ok(Json(to_screen(&order)))
}

// Step 2b: Logical Screen -> HTML (browser, same step-1 output)
async fn order_as_html(State(repo): State<Arc<dyn OrderRepository>>, Path(id): Path<i64>)
    -> Result<Html<String>, AppError> {
    let order = repo.find(id).await?.ok_or(AppError::NotFound)?;
    let screen = to_screen(&order);
    Ok(Html(render_order_template(&screen)?))
}
```

### Axum / sqlx equivalents `[interpretation]`

- `OrderScreen` is the "logical presentation" — format-neutral intermediate representation
- The same `to_screen()` function feeds both JSON and HTML handlers — the key Two Step View benefit
- Content negotiation via `Accept` header can select step 2 dynamically

---

## Application Controller (p. 379)

**Translation**: Adaptation

Centralizes navigation and flow decisions. In Rust, implement as a struct in the Service Layer that decides which "screen" or response to return based on application state, rather than having handler functions make those decisions independently.

### Rust structure

```rust
// Application Controller: decides flow, not the handlers
pub struct CheckoutController {
    cart_repo: Arc<dyn CartRepository>,
    order_svc: Arc<dyn OrderService>,
}

pub enum CheckoutStep {
    ShowCart(CartView),
    AddressRequired(CartView),
    PaymentRequired(CartView, Address),
    Confirmation(Order),
    Error(String),
}

impl CheckoutController {
    pub async fn advance(&self, session: &Session) -> Result<CheckoutStep, AppError> {
        let cart = self.cart_repo.find(session.cart_id).await?;
        if cart.is_empty() {
            return Ok(CheckoutStep::ShowCart(CartView::from(&cart)));
        }
        if session.shipping_address.is_none() {
            return Ok(CheckoutStep::AddressRequired(CartView::from(&cart)));
        }
        if session.payment_method.is_none() {
            return Ok(CheckoutStep::PaymentRequired(
                CartView::from(&cart), session.shipping_address.clone().unwrap()));
        }
        let order = self.order_svc.place_order(session.into()).await?;
        Ok(CheckoutStep::Confirmation(order))
    }
}
```

### Axum / sqlx equivalents `[interpretation]`

- The `CheckoutStep` enum encodes all possible flow outcomes — exhaustive `match` forces handling each
- The Axum handler calls `controller.advance(session).await` and pattern-matches on the result
- This keeps flow logic out of handlers and makes it independently testable

---

## Distribution (Ch. 15)

---

## Remote Facade (p. 388)

**Translation**: Direct

Axum itself serves as a Remote Facade: it exposes coarse-grained HTTP endpoints over a fine-grained domain model, batching multiple domain operations into a single network round-trip response.

### Rust structure

```rust
// Remote Facade: one coarse-grained endpoint replaces many fine-grained domain calls
// Client gets everything they need in one request

#[derive(Serialize)]
pub struct OrderDetailFacade {
    pub order: OrderSummary,
    pub customer: CustomerInfo,
    pub items: Vec<ItemDetail>,
    pub shipping: ShippingStatus,
}

async fn get_order_detail(
    State(state): State<AppState>,
    Path(order_id): Path<i64>,
) -> Result<Json<OrderDetailFacade>, AppError> {
    // Multiple fine-grained domain calls aggregated into one response
    let (order, customer, items, shipping) = tokio::try_join!(
        state.order_repo.find(order_id),
        state.customer_repo.find_for_order(order_id),
        state.item_repo.find_for_order(order_id),
        state.shipping_repo.find_for_order(order_id),
    )?;
    Ok(Json(OrderDetailFacade {
        order: order.ok_or(AppError::NotFound)?.into(),
        customer: customer.ok_or(AppError::NotFound)?.into(),
        items: items.into_iter().map(ItemDetail::from).collect(),
        shipping: shipping.unwrap_or_default().into(),
    }))
}
```

### Axum / sqlx equivalents `[interpretation]`

- `tokio::try_join!` runs multiple DB queries concurrently — the Rust network-efficiency advantage
- Each Axum endpoint IS a Remote Facade method: coarse-grained contract, fine-grained internal execution
- The response DTO (`OrderDetailFacade`) is a Data Transfer Object bundling related data

---

## Data Transfer Object (p. 401)

**Translation**: Direct — natural fit

A `#[derive(Serialize, Deserialize)]` struct with no behavior. Used to move data across the HTTP boundary without exposing domain internals. Rust's ownership makes DTOs naturally immutable once constructed.

### Rust structure

```rust
use serde::{Deserialize, Serialize};

// Request DTO: inbound data from HTTP body
#[derive(Debug, Deserialize)]
pub struct CreateOrderRequest {
    pub customer_id: i64,
    pub items: Vec<OrderItemRequest>,
    pub shipping_address: AddressDto,
}

#[derive(Debug, Deserialize)]
pub struct OrderItemRequest {
    pub product_id: i64,
    pub quantity: u32,
}

// Response DTO: outbound data to HTTP client
#[derive(Debug, Serialize)]
pub struct OrderResponse {
    pub id: i64,
    pub status: String,
    pub total_display: String,
    pub estimated_delivery: Option<String>,
}

// Conversion from domain to DTO — explicit, not automatic
impl From<Order> for OrderResponse {
    fn from(o: Order) -> Self {
        Self {
            id: o.id,
            status: o.status.to_string(),
            total_display: format_currency(o.total_cents),
            estimated_delivery: o.estimated_delivery.map(|d| d.to_string()),
        }
    }
}
```

### Axum / sqlx equivalents `[interpretation]`

- `Json<CreateOrderRequest>` in handler signature = Axum deserializing the request DTO
- `Json(OrderResponse::from(order))` in return = Axum serializing the response DTO
- DTOs should NOT expose domain invariants — they are shaped for the client's needs, not the domain's

---

## Concurrency (Ch. 16)

---

## Optimistic Offline Lock (p. 416)

**Translation**: Direct

Add a `version: i64` field to the struct. The UPDATE checks both `id` and `version`; if zero rows are affected, a concurrent modification occurred and the operation fails.

### Rust structure

```rust
#[derive(Debug, Clone)]
pub struct Product {
    pub id: i64,
    pub name: String,
    pub price_cents: i64,
    pub version: i64,   // Optimistic Offline Lock version stamp
}

pub async fn update_product(pool: &PgPool, product: &Product) -> Result<(), AppError> {
    let rows_affected = sqlx::query!(
        "UPDATE products SET name = $1, price_cents = $2, version = version + 1
         WHERE id = $3 AND version = $4",
        product.name, product.price_cents, product.id, product.version)
        .execute(pool).await?
        .rows_affected();

    if rows_affected == 0 {
        return Err(AppError::ConflictError("Product was modified by another user".into()));
    }
    Ok(())
}

// Client retries on ConflictError after re-fetching the latest version
```

### Axum / sqlx equivalents `[interpretation]`

- `.rows_affected() == 0` is the conflict detection — if another writer incremented `version`, the WHERE clause misses
- Return HTTP 409 Conflict from the Axum handler when `AppError::ConflictError` occurs
- For HTTP APIs, the `ETag` / `If-Match` headers implement Optimistic Lock at the protocol level — combine with this DB-level check

---

## Pessimistic Offline Lock (p. 426)

**Translation**: Direct

`SELECT ... FOR UPDATE` within a sqlx transaction acquires a row-level lock. The lock is held until the transaction commits or rolls back. No other transaction can modify the locked rows.

### Rust structure

```rust
pub async fn update_inventory_locked(
    pool: &PgPool,
    product_id: i64,
    delta: i32,
) -> Result<i32, AppError> {
    let mut tx = pool.begin().await?;

    // Acquire pessimistic lock on this row
    let row = sqlx::query!(
        "SELECT id, stock FROM products WHERE id = $1 FOR UPDATE",
        product_id)
        .fetch_one(&mut *tx).await?;

    let new_stock = row.stock + delta;
    if new_stock < 0 {
        tx.rollback().await?;
        return Err(AppError::InsufficientStock);
    }

    sqlx::query!("UPDATE products SET stock = $1 WHERE id = $2", new_stock, product_id)
        .execute(&mut *tx).await?;

    tx.commit().await?;
    Ok(new_stock)
}
```

### Axum / sqlx equivalents `[interpretation]`

- `FOR UPDATE` is passed through sqlx as a raw SQL clause — sqlx does not abstract locking
- The lock is held for the duration of the `tx` borrow; Rust's lifetime system enforces this
- Use `FOR UPDATE SKIP LOCKED` for queue-style processing where skipping locked rows is acceptable

---

## Coarse-Grained Lock (p. 438)

**Translation**: Direct

Lock an aggregate root row with `FOR UPDATE` or increment a shared version stamp. All child objects are considered locked by virtue of locking the root. No per-child locking needed.

### Rust structure

```rust
// Lock the aggregate root (Order); child items are implicitly locked
pub async fn process_order_aggregate(
    pool: &PgPool,
    order_id: i64,
) -> Result<(), AppError> {
    let mut tx = pool.begin().await?;

    // Single lock on the root covers the entire aggregate
    let _root = sqlx::query!(
        "SELECT id, version FROM orders WHERE id = $1 FOR UPDATE",
        order_id)
        .fetch_one(&mut *tx).await?;

    // Safe to modify children — aggregate root is locked
    sqlx::query!(
        "UPDATE order_items SET fulfilled = true WHERE order_id = $1",
        order_id)
        .execute(&mut *tx).await?;

    sqlx::query!(
        "UPDATE orders SET status = 'fulfilled', version = version + 1 WHERE id = $1",
        order_id)
        .execute(&mut *tx).await?;

    tx.commit().await?;
    Ok(())
}
```

### Axum / sqlx equivalents `[interpretation]`

- Lock the aggregate root (order), not each child (items) — one lock per aggregate boundary
- Works with both Optimistic (version check on root) and Pessimistic (`FOR UPDATE` on root) strategies
- PostgreSQL's row-level locking is aggregate-aware when the FK cascade is correctly modeled

---

## Implicit Lock (p. 449)

**Translation**: Conceptual translation `[interpretation]`

Fowler's intent: the framework automatically acquires locks so no application code path can forget to. In Rust, implement via a wrapper type or middleware that enforces locking before any write operation reaches the repository. The type system can enforce this at compile time.

### Rust structure

```rust
// Wrapper type that enforces locking before mutation — compiler enforces via type system
pub struct LockedOrder {
    inner: Order,
    // Private field: only constructable by acquire_lock — cannot be forged
    _lock_proof: LockProof,
}

struct LockProof(());  // Zero-sized proof token

impl LockedOrder {
    pub fn order(&self) -> &Order { &self.inner }
    pub fn order_mut(&mut self) -> &mut Order { &mut self.inner }
}

pub async fn acquire_order_lock(
    tx: &mut sqlx::Transaction<'_, Postgres>,
    order_id: i64,
) -> Result<LockedOrder, AppError> {
    let row = sqlx::query_as!(OrderRecord,
        "SELECT id, status, total_cents FROM orders WHERE id = $1 FOR UPDATE", order_id)
        .fetch_one(&mut **tx).await?;
    Ok(LockedOrder { inner: OrderMapper::to_domain(row), _lock_proof: LockProof(()) })
}

// Repository write method requires LockedOrder — cannot save without going through acquire_lock
pub async fn save_locked(tx: &mut sqlx::Transaction<'_, Postgres>, locked: &LockedOrder)
    -> Result<(), AppError> {
    // save inner order...
    Ok(())
}
```

### Axum / sqlx equivalents `[interpretation]`

- The `LockProof` zero-sized type is a compile-time proof token — cannot construct `LockedOrder` without calling `acquire_order_lock`
- This is a stronger guarantee than Fowler's original: Rust's type system enforces the pattern at compile time, not just at runtime via framework conventions
- Axum middleware can also enforce locking preconditions on specific route groups via `layer()`

---

## Session State (Ch. 17)

---

## Client Session State (p. 456)

**Translation**: Direct

Store session data on the client as a signed/encrypted cookie or JWT. Axum handles this via the `tower-sessions` or `axum-extra` cookie management crates. No server-side storage needed.

### Rust structure

```rust
use axum_extra::extract::cookie::{Cookie, CookieJar, Key};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Default)]
pub struct CartSession {
    pub cart_id: Option<i64>,
    pub customer_id: Option<i64>,
}

// Read client session state from signed cookie
async fn add_to_cart(
    jar: CookieJar,
    State(key): State<Key>,
    State(svc): State<Arc<dyn CartService>>,
    Json(req): Json<AddItemRequest>,
) -> Result<(CookieJar, Json<CartView>), AppError> {
    let session: CartSession = jar.get("session")
        .and_then(|c| serde_json::from_str(c.value()).ok())
        .unwrap_or_default();

    let cart = svc.add_item(session.cart_id, req).await?;

    let updated = CartSession { cart_id: Some(cart.id), ..session };
    let cookie = Cookie::build(("session", serde_json::to_string(&updated).unwrap()))
        .http_only(true).secure(true).build();

    Ok((jar.add(cookie), Json(CartView::from(cart))))
}
```

### Axum / sqlx equivalents `[interpretation]`

- `axum-extra` `CookieJar` extractor reads/writes client cookies
- For signed cookies, use `PrivateCookieJar` with a `Key` to prevent tampering
- JWTs (`jsonwebtoken` crate) are an alternative: client carries the session data in a signed token header

---

## Server Session State (p. 458)

**Translation**: Direct

Store session data in a server-side store (Redis, in-memory `DashMap`) keyed by a session ID cookie. `tower-sessions` with a Redis backend is the idiomatic Axum approach.

### Rust structure

```rust
// tower-sessions with a custom store — server-side session state
use tower_sessions::{Session, SessionManagerLayer};

#[derive(Serialize, Deserialize, Default)]
pub struct CheckoutState {
    pub cart_id: Option<i64>,
    pub shipping_address: Option<Address>,
}

const SESSION_KEY: &str = "checkout";

async fn save_address(
    session: Session,
    Json(address): Json<Address>,
) -> Result<StatusCode, AppError> {
    let mut state: CheckoutState = session
        .get(SESSION_KEY).await?
        .unwrap_or_default();
    state.shipping_address = Some(address);
    session.insert(SESSION_KEY, state).await?;
    Ok(StatusCode::NO_CONTENT)
}

// Router setup with session middleware
pub fn session_router(store: impl tower_sessions::SessionStore) -> Router<AppState> {
    Router::new()
        .route("/checkout/address", post(save_address))
        .layer(SessionManagerLayer::new(store).with_secure(true))
}
```

### Axum / sqlx equivalents `[interpretation]`

- `tower-sessions` integrates with Axum's `layer()` system; backends include Redis, PostgreSQL, in-memory
- Session ID is stored in a cookie; the session data lives on the server — classic Server Session State
- For high-availability deployments, use Redis backend so all instances share session state

---

## Database Session State (p. 462)

**Translation**: Direct

Persist session data as rows in a PostgreSQL table. Session ID cookie identifies the row. Works across server restarts and multi-instance deployments without a Redis dependency.

### Rust structure

```rust
// sessions table: (id TEXT PK, data JSONB, expires_at TIMESTAMPTZ)
pub struct DbSessionStore {
    pool: PgPool,
}

impl DbSessionStore {
    pub async fn load(&self, session_id: &str) -> Result<Option<serde_json::Value>, sqlx::Error> {
        let row = sqlx::query!(
            "SELECT data FROM sessions WHERE id = $1 AND expires_at > NOW()",
            session_id)
            .fetch_optional(&self.pool).await?;
        Ok(row.map(|r| r.data))
    }

    pub async fn save(
        &self,
        session_id: &str,
        data: &serde_json::Value,
        ttl_seconds: i64,
    ) -> Result<(), sqlx::Error> {
        sqlx::query!(
            "INSERT INTO sessions (id, data, expires_at)
             VALUES ($1, $2, NOW() + $3 * INTERVAL '1 second')
             ON CONFLICT (id) DO UPDATE SET data=$2, expires_at=NOW() + $3 * INTERVAL '1 second'",
            session_id, data, ttl_seconds)
            .execute(&self.pool).await?;
        Ok(())
    }
}
```

### Axum / sqlx equivalents `[interpretation]`

- Implements `tower-sessions::SessionStore` trait on `DbSessionStore` to integrate with Axum session middleware
- Use a background task to periodically `DELETE FROM sessions WHERE expires_at < NOW()` (session GC)
- Simpler than Redis for low-to-medium traffic; adds DB load but eliminates an external dependency

---

## Base Patterns (Ch. 18)

---

## Gateway (p. 466)

**Translation**: Direct — natural fit

A struct that wraps access to an external system (payment API, email service, third-party REST API) with a clean typed interface. External complexity and error mapping stay inside the Gateway.

### Rust structure

```rust
// Gateway wraps an external payment service — callers never see HTTP/JSON details
#[async_trait] // needed for Arc<dyn Trait> dispatch — static dispatch would use `impl PaymentGateway`
pub trait PaymentGateway: Send + Sync {
    async fn charge(&self, amount_cents: i64, token: &str) -> Result<ChargeId, PaymentError>;
    async fn refund(&self, charge_id: &ChargeId, amount_cents: i64) -> Result<(), PaymentError>;
}

pub struct StripeGateway {
    client: reqwest::Client,
    api_key: String,
    base_url: String,
}

#[async_trait] // needed for Arc<dyn Trait> dispatch — static dispatch would use `impl PaymentGateway`
impl PaymentGateway for StripeGateway {
    async fn charge(&self, amount_cents: i64, token: &str) -> Result<ChargeId, PaymentError> {
        let resp = self.client
            .post(format!("{}/charges", self.base_url))
            .bearer_auth(&self.api_key)
            .json(&serde_json::json!({"amount": amount_cents, "source": token, "currency": "usd"}))
            .send().await
            .map_err(PaymentError::Network)?;
        let body: ChargeResponse = resp.json().await.map_err(PaymentError::Parse)?;
        Ok(ChargeId(body.id))
    }
    // refund omitted for brevity
}
```

### Axum / sqlx equivalents `[interpretation]`

- Inject as `State(gateway): State<Arc<dyn PaymentGateway>>` — same pattern as Repository
- `Service Stub` implements the same trait with canned responses for tests
- Error type (`PaymentError`) is Gateway-specific — callers convert to `AppError` at the boundary

---

## Mapper (p. 473)

**Translation**: Direct

A module or struct that translates between two independent subsystems, keeping neither dependent on the other. Different from Data Mapper (which maps DB→domain): this Mapper pattern covers any two-subsystem boundary.

### Rust structure

```rust
// Mapper between two independent subsystems: accounting domain <-> billing API
// Neither AccountingOrder nor BillingInvoice knows about the other
mod accounting_billing_mapper {
    use super::{AccountingOrder, BillingInvoice, BillingLineItem};

    pub fn to_billing_invoice(order: &AccountingOrder) -> BillingInvoice {
        BillingInvoice {
            external_ref: format!("ORD-{}", order.id),
            customer_account: order.billing_account_code.clone(),
            currency: order.currency.iso_code().to_string(),
            lines: order.charge_items.iter().map(|c| BillingLineItem {
                sku: c.product_code.clone(),
                description: c.description.clone(),
                unit_price_cents: c.unit_price_cents,
                quantity: c.quantity,
            }).collect(),
        }
    }

    pub fn from_billing_confirmation(inv: &BillingInvoice, invoice_id: String) -> AccountingEntry {
        AccountingEntry {
            order_id: inv.external_ref.trim_start_matches("ORD-").parse().unwrap_or(0),
            invoice_id,
            amount_cents: inv.lines.iter().map(|l| l.unit_price_cents * l.quantity as i64).sum(),
        }
    }
}
```

### Axum / sqlx equivalents `[interpretation]`

- A Rust `mod` with conversion functions is the cleanest Mapper — no struct state needed
- Neither `AccountingOrder` nor `BillingInvoice` imports the other's crate — zero coupling
- Differ from Data Mapper: this Mapper sits between two application subsystems, not between DB and domain

---

## Layer Supertype (p. 475)

**Translation**: Adaptation `[interpretation]`

Java uses an abstract base class for shared layer behavior (e.g., all mappers share `find_by_id` logic). Rust has no abstract classes. Use a trait with default method implementations or a shared generic function.

### Rust structure

```rust
// Shared behavior for all repositories — expressed as a trait with defaults
// Native AFIT (Rust 1.75+): no Arc<dyn CrudRepository> usage — static dispatch only
pub trait CrudRepository<T, Id>: Send + Sync {
    fn table_name(&self) -> &str;
    fn pool(&self) -> &PgPool;

    async fn delete(&self, id: Id) -> Result<bool, sqlx::Error>
    where
        Id: Send + Sync + sqlx::Encode<'static, sqlx::Postgres> + sqlx::Type<sqlx::Postgres>,
    {
        let rows = sqlx::query(&format!("DELETE FROM {} WHERE id = $1", self.table_name()))
            .bind(id)
            .execute(self.pool()).await?.rows_affected();
        Ok(rows > 0)
    }

    async fn exists(&self, id: Id) -> Result<bool, sqlx::Error>
    where
        Id: Send + Sync + sqlx::Encode<'static, sqlx::Postgres> + sqlx::Type<sqlx::Postgres>,
    {
        let row = sqlx::query(&format!("SELECT 1 FROM {} WHERE id = $1", self.table_name()))
            .bind(id)
            .fetch_optional(self.pool()).await?;
        Ok(row.is_some())
    }
}
```

### Axum / sqlx equivalents `[interpretation]`

- Trait default methods provide the "supertype" shared behavior — concrete types inherit by `impl CrudRepository for MyRepo {}`
- Unlike Java, the trait cannot hold data directly; `pool()` and `table_name()` are accessor methods
- In practice, most Rust teams prefer explicit over inherited behavior; use this pattern when the duplication is genuinely painful

---

## Separated Interface (p. 476)

**Translation**: Direct — natural fit

A trait defined in one crate/module, implemented in another. The caller depends only on the trait; the implementation is wired at startup. This is the native Rust decoupling mechanism.

### Rust structure

```rust
// In domain crate (no DB dependency):
pub trait NotificationSender: Send + Sync {
    async fn send_order_confirmation(&self, order_id: i64, email: &str) -> Result<(), NotifyError>;
}

// In infrastructure crate (depends on email service):
pub struct SmtpNotificationSender {
    smtp_client: SmtpClient,
    from_address: String,
}

#[async_trait] // needed for Arc<dyn Trait> dispatch — static dispatch would use `impl NotificationSender`
impl NotificationSender for SmtpNotificationSender {
    async fn send_order_confirmation(&self, order_id: i64, email: &str) -> Result<(), NotifyError> {
        self.smtp_client.send(Message::builder()
            .from(self.from_address.parse().unwrap())
            .to(email.parse().map_err(|_| NotifyError::InvalidAddress)?)
            .subject(format!("Order #{} Confirmed", order_id))
            .body("Your order has been confirmed.".to_string())
            .unwrap()
        ).await.map_err(NotifyError::Smtp)
    }
}

// In app startup: wire the concrete implementation via Arc<dyn Trait>
let notifier: Arc<dyn NotificationSender> = Arc::new(SmtpNotificationSender { ... });
```

### Axum / sqlx equivalents `[interpretation]`

- `trait X: Send + Sync` in the domain crate + `impl X for ConcreteType` in the infra crate is textbook Separated Interface
- `Arc<dyn NotificationSender>` stored in `AppState` is the Axum injection mechanism
- Cargo workspace crates enforce the separation — the `domain` crate literally cannot import from `infrastructure`

---

## Registry (p. 480)

**Translation**: Adaptation `[interpretation]`

Global mutable state is strongly discouraged in Rust (requires `unsafe` or `Mutex`). Prefer Axum shared state (`AppState`) as the Registry equivalent — it is scoped to the application, type-safe, and initialized at startup. If a true global is needed, use `once_cell::sync::Lazy`.

### Rust structure

```rust
use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::sync::RwLock;

// Option A: Axum AppState as Registry (PREFERRED in Axum services)
#[derive(Clone)]
pub struct AppState {
    pub order_repo: Arc<dyn OrderRepository>,
    pub payment_gw: Arc<dyn PaymentGateway>,
    pub notifier: Arc<dyn NotificationSender>,
}

// Option B: Global registry via once_cell (use only when DI is not available)
static SERVICE_REGISTRY: Lazy<RwLock<HashMap<&'static str, Box<dyn std::any::Any + Send + Sync>>>> =
    Lazy::new(|| RwLock::new(HashMap::new()));

// Note: Option A (AppState) is always preferred in Axum.
// Global registry makes testing harder and requires careful synchronization.
```

### Axum / sqlx equivalents `[interpretation]`

- `AppState` passed via `.with_state(state)` is the idiomatic Axum Registry — available to all handlers
- `once_cell::sync::Lazy` is the Rust idiom for true global singletons — avoids `static mut` + `unsafe`
- The pattern note from Fowler applies doubly in Rust: prefer dependency injection (Axum state) over global Registry

---

## Value Object (p. 486)

**Translation**: Direct — excellent fit

Any `#[derive(Clone, PartialEq, Eq)]` struct with no mutable state and equality based on field values IS a Value Object. Rust's ownership semantics make Value Objects the default, not the exception.

### Rust structure

```rust
// Value Objects: equality by value, immutable, freely cloneable
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct EmailAddress(String);

impl EmailAddress {
    pub fn new(raw: impl Into<String>) -> Result<Self, ValidationError> {
        let s = raw.into();
        if s.contains('@') && s.len() >= 3 {
            Ok(Self(s))
        } else {
            Err(ValidationError::InvalidEmail)
        }
    }
    pub fn as_str(&self) -> &str { &self.0 }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DateRange {
    pub start: chrono::NaiveDate,
    pub end: chrono::NaiveDate,
}

impl DateRange {
    pub fn contains(&self, date: chrono::NaiveDate) -> bool {
        date >= self.start && date <= self.end
    }
    pub fn overlaps(&self, other: &DateRange) -> bool {
        self.start <= other.end && self.end >= other.start
    }
}
```

### Axum / sqlx equivalents `[interpretation]`

- `#[derive(PartialEq, Eq)]` makes equality structural — no reference identity comparison possible
- Newtype pattern (`EmailAddress(String)`) adds type safety and validation at construction time
- `#[derive(Hash)]` makes Value Objects usable as `HashMap` keys — Identity Field structs should NOT derive `Hash` since identity is reference-based

---

## Money (p. 488)

**Translation**: Direct — excellent fit

Rust's type system makes Money natural. Integer cents for the amount (no floating point), a `Currency` enum for the unit, `impl Add/Sub` that panic or error on currency mismatch, and allocation methods.

### Rust structure

```rust
use std::ops::{Add, Sub};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Currency { Usd, Eur, Gbp }

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Money {
    pub amount_cents: i64,
    pub currency: Currency,
}

impl Money {
    pub fn new(amount_cents: i64, currency: Currency) -> Self {
        Self { amount_cents, currency }
    }

    pub fn allocate(&self, ratios: &[u32]) -> Vec<Money> {
        let total_ratio: u32 = ratios.iter().sum();
        let mut remainder = self.amount_cents;
        let mut result: Vec<Money> = ratios.iter().map(|&r| {
            let share = self.amount_cents * r as i64 / total_ratio as i64;
            remainder -= share;
            Money::new(share, self.currency)
        }).collect();
        // Distribute remainder one cent at a time
        for i in 0..remainder as usize { result[i].amount_cents += 1; }
        result
    }
}

impl Add for Money {
    type Output = Money;
    fn add(self, rhs: Money) -> Money {
        assert_eq!(self.currency, rhs.currency, "Currency mismatch in addition");
        Money::new(self.amount_cents + rhs.amount_cents, self.currency)
    }
}

impl Sub for Money {
    type Output = Money;
    fn sub(self, rhs: Money) -> Money {
        assert_eq!(self.currency, rhs.currency, "Currency mismatch in subtraction");
        Money::new(self.amount_cents - rhs.amount_cents, self.currency)
    }
}
```

### Axum / sqlx equivalents `[interpretation]`

- Store as `amount_cents: i64` + `currency_code: CHAR(3)` in PostgreSQL — map to `Money` in the mapper
- `allocate()` distributes remainder one cent at a time to avoid rounding loss — Fowler's algorithm in Rust
- `assert_eq!` on currency in `Add`/`Sub` panics on programmer error; production code may prefer `Result<Money, CurrencyError>`

---

## Special Case (p. 496)

**Translation**: Conceptual translation `[interpretation]`

Fowler's Special Case returns a subclass with safe default behavior, eliminating null checks. Rust has `Option<T>` but not subclassing. Use an enum with a `Missing` variant that implements the same methods as the real type, or implement a trait on both.

### Rust structure

```rust
// Enum approach: Known and Unknown share a common interface via methods
#[derive(Debug, Clone)]
pub enum MaybeCustomer {
    Known(Customer),
    Unknown,
}

impl MaybeCustomer {
    pub fn name(&self) -> &str {
        match self {
            MaybeCustomer::Known(c) => &c.name,
            MaybeCustomer::Unknown => "Guest",
        }
    }

    pub fn discount_rate(&self) -> f64 {
        match self {
            MaybeCustomer::Known(c) => c.loyalty_discount_rate(),
            MaybeCustomer::Unknown => 0.0,
        }
    }

    pub fn can_checkout_on_credit(&self) -> bool {
        match self {
            MaybeCustomer::Known(c) => c.credit_approved,
            MaybeCustomer::Unknown => false,
        }
    }
}

// Callers never check for null — just call methods on MaybeCustomer
async fn get_cart_view(customer: MaybeCustomer, cart: &Cart) -> CartView {
    CartView {
        customer_name: customer.name().to_string(),
        discount: customer.discount_rate(),
        can_credit: customer.can_checkout_on_credit(),
        items: cart.items.iter().map(ItemView::from).collect(),
    }
}
```

### Axum / sqlx equivalents `[interpretation]`

- `Option<Customer>` covers the "is it there?" question but forces the caller to handle `None` every time — Special Case eliminates that repetition
- The enum approach gives each "missing" case safe behavior without scattered `unwrap_or` calls
- A trait `CustomerBehavior` implemented by both `Customer` and `GuestCustomer` structs is the alternative; use the enum when the variants are known and closed

---

## Plugin (p. 499)

**Translation**: Direct — natural fit

`Arc<dyn Trait>` wired at startup based on configuration. Different implementations are chosen at application startup, not at compile time. Test builds wire stubs; production builds wire real implementations.

### Rust structure

```rust
// Separated Interface — trait lives in domain/core
pub trait TaxCalculator: Send + Sync {
    fn calculate(&self, subtotal_cents: i64, region: &str) -> i64;
}

// Production implementation
pub struct LiveTaxCalculator { api_key: String }
impl TaxCalculator for LiveTaxCalculator {
    fn calculate(&self, subtotal_cents: i64, region: &str) -> i64 {
        // call external tax API...
        (subtotal_cents as f64 * 0.08) as i64  // placeholder
    }
}

// Test stub — same trait, canned behavior
pub struct FixedRateTaxCalculator { rate: f64 }
impl TaxCalculator for FixedRateTaxCalculator {
    fn calculate(&self, subtotal_cents: i64, _region: &str) -> i64 {
        (subtotal_cents as f64 * self.rate) as i64
    }
}

// Wired at startup via configuration — runtime polymorphism
pub fn build_app_state(config: &Config) -> AppState {
    let tax_calc: Arc<dyn TaxCalculator> = if config.use_live_tax {
        Arc::new(LiveTaxCalculator { api_key: config.tax_api_key.clone() })
    } else {
        Arc::new(FixedRateTaxCalculator { rate: 0.08 })
    };
    AppState { tax_calc, /* ... */ }
}
```

### Axum / sqlx equivalents `[interpretation]`

- `Arc<dyn TaxCalculator>` in `AppState` provides Plugin injection to all Axum handlers via `State` extractor
- Swap implementations without touching handler code — the trait is the stable contract
- Configuration-driven selection (`if config.use_live_tax`) replaces Java properties file loading

---

## Service Stub (p. 504)

**Translation**: Direct

A struct implementing the domain trait with canned, deterministic responses. No network calls, no DB. Wired in test code via the same Plugin mechanism used in production.

### Rust structure

```rust
// The trait (Separated Interface — could be in a separate module)
#[async_trait] // needed for Arc<dyn Trait> dispatch — static dispatch would use `impl ShippingEstimator`
pub trait ShippingEstimator: Send + Sync {
    async fn estimate_days(&self, from_zip: &str, to_zip: &str, weight_grams: u32)
        -> Result<u32, ShippingError>;
}

// Production: calls external shipping API
pub struct FedExShippingEstimator { api_key: String }

// Service Stub: canned response for tests — no network
pub struct StubShippingEstimator {
    pub fixed_days: u32,
    pub should_fail: bool,
}

#[async_trait] // needed for Arc<dyn Trait> dispatch — static dispatch would use `impl ShippingEstimator`
impl ShippingEstimator for StubShippingEstimator {
    async fn estimate_days(&self, _from: &str, _to: &str, _weight: u32)
        -> Result<u32, ShippingError> {
        if self.should_fail {
            Err(ShippingError::ServiceUnavailable)
        } else {
            Ok(self.fixed_days)
        }
    }
}

// In tests: wire the stub
#[tokio::test]
async fn test_checkout_uses_shipping_estimate() {
    let stub: Arc<dyn ShippingEstimator> = Arc::new(StubShippingEstimator {
        fixed_days: 3, should_fail: false });
    let svc = CheckoutService::new(stub);
    let result = svc.estimate_delivery("12345", "98765", 500).await;
    assert_eq!(result.unwrap(), 3);
}
```

### Axum / sqlx equivalents `[interpretation]`

- `#[async_trait]` is still needed for `Arc<dyn Trait>` with async methods — native AFIT works for static dispatch (`impl Trait` bounds) but `dyn` dispatch requires the crate or manual `Pin<Box<dyn Future>>` boxing until `dyn AFIT` stabilizes
- The `should_fail` flag enables testing error-path handling without causing actual service outages
- Combine with Axum's `TestClient` or `axum_test` crate to integration-test handlers with stub services

---

## Record Set (p. 508)

**Translation**: Conceptual translation `[interpretation]`

Fowler's Record Set is an in-memory tabular structure mirroring SQL result sets, integrated with data-aware UI tools (ADO.NET DataSet). This pattern is largely irrelevant in Rust's web context. The closest equivalent is `Vec<T>` where `T` derives `sqlx::FromRow` — a typed in-memory result set.

### Rust structure

```rust
// Rust equivalent: typed Vec<Row> from sqlx — there is no generic tabular container
#[derive(Debug, sqlx::FromRow, serde::Serialize)]
pub struct SalesReportRow {
    pub product_id: i64,
    pub product_name: String,
    pub units_sold: i64,
    pub revenue_cents: i64,
    pub period: chrono::NaiveDate,
}

// The Vec<SalesReportRow> IS the Record Set equivalent
pub async fn run_sales_report(
    pool: &PgPool,
    from: chrono::NaiveDate,
    to: chrono::NaiveDate,
) -> Result<Vec<SalesReportRow>, sqlx::Error> {
    sqlx::query_as!(SalesReportRow,
        r#"SELECT product_id, p.name as product_name,
                  SUM(oi.qty) as "units_sold!", SUM(oi.qty * oi.price_cents) as "revenue_cents!",
                  DATE_TRUNC('day', o.created_at)::DATE as "period!"
           FROM order_items oi
           JOIN products p ON p.id = oi.product_id
           JOIN orders o ON o.id = oi.order_id
           WHERE o.created_at BETWEEN $1 AND $2
           GROUP BY product_id, p.name, 4"#,
        from, to)
        .fetch_all(pool).await
}
```

### Axum / sqlx equivalents `[interpretation]`

- Rust uses strongly-typed `Vec<T>` instead of a generic dynamic table — each query has its own row type
- `sqlx::query!` returning anonymous structs approximates a dynamic Record Set but is not reusable across queries
- The Table Module pattern (which pairs with Record Set in Java) is also less relevant in idiomatic Rust: use typed query result structs instead

---

*Total patterns covered: 51*
*Patterns classified as "Conceptual translation": 9 (Lazy Load, Metadata Mapping, Single Table Inheritance, Class Table Inheritance, Concrete Table Inheritance, Inheritance Mappers, Transform View, Two Step View, Implicit Lock, Special Case, Record Set)*

> **Note**: The count above reflects patterns where the mechanism is fundamentally different from Fowler's original — intent is preserved, but the implementation approach has no direct analog in Rust's type system or the Axum/sqlx stack.
