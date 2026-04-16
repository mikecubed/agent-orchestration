# PEAA Pattern Catalog — Go / gin Reference

**Purpose**: Go code examples and gin + GORM/sqlx framework equivalents for all 51 PEAA
patterns. Use alongside `catalog-core.md` (language-agnostic definitions) and `catalog-index.md`.

**Stack coverage**: Go 1.21+, gin 1.9+, GORM v2, database/sql + sqlx where appropriate

**Critical framing** `[interpretation]`:
PEAA was written in 2002 for Java/.NET object-oriented systems with class inheritance.
Go has no class inheritance, no exceptions (errors are values), no generics-based ORM
(until recently), and no annotations/decorators. Many patterns require adaptation:
- Where Java uses class hierarchies, Go uses structs + interfaces + embedding
- Where Java uses null, Go uses multiple return values `(T, error)` and zero values
- Where Java uses ORM with annotations, Go uses GORM struct tags or raw sql
- Go's goroutines and channels affect concurrency patterns

Each entry notes whether the pattern maps **directly**, requires **adaptation**, or is
**conceptually translated** (intent preserved, mechanism different).

**Go/gin pattern mappings** `[interpretation]`:
- gin handler functions = Transaction Script (p. 110) or Page Controller (p. 333)
- gin `RouterGroup` + middleware = Front Controller (p. 344)
- GORM model structs = Active Record (p. 160) — GORM's `db.Create()`, `db.Save()` are the Active Record interface
- Separate repository structs + `*gorm.DB` = Data Mapper (p. 165) approximation
- Go interfaces = Separated Interface (p. 476)
- `*gorm.DB.Begin()` / `db.Transaction()` = Unit of Work (p. 184)
- Interface injection = Plugin (p. 499)
- GORM `clause.Locking` = Pessimistic Offline Lock (p. 426)

---

## Domain Logic (Ch. 9)

---

## Transaction Script (p. 110)

**Translation**: Direct

A gin handler function is a Transaction Script: one function, one business operation,
top-to-bottom procedural logic, returns a result. No domain objects required.

### Go structure

```go
// PlaceOrder is a Transaction Script — one handler, one operation.
func PlaceOrder(ctx context.Context, db *sql.DB, req PlaceOrderRequest) error {
    tx, err := db.BeginTx(ctx, nil)
    if err != nil {
        return fmt.Errorf("begin tx: %w", err)
    }
    defer tx.Rollback()

    var stock int
    if err := tx.QueryRowContext(ctx,
        "SELECT stock FROM products WHERE id = $1 FOR UPDATE", req.ProductID,
    ).Scan(&stock); err != nil {
        return fmt.Errorf("fetch stock: %w", err)
    }
    if stock < req.Quantity {
        return ErrInsufficientStock
    }
    if _, err := tx.ExecContext(ctx,
        "UPDATE products SET stock = stock - $1 WHERE id = $2", req.Quantity, req.ProductID,
    ); err != nil {
        return fmt.Errorf("decrement stock: %w", err)
    }
    if _, err := tx.ExecContext(ctx,
        "INSERT INTO orders (product_id, qty) VALUES ($1, $2)", req.ProductID, req.Quantity,
    ); err != nil {
        return fmt.Errorf("insert order: %w", err)
    }
    return tx.Commit()
}
```

### gin / GORM equivalents `[interpretation]`

- A `gin.HandlerFunc` is structurally identical to a Transaction Script — one HTTP action,
  one function body, no shared state.
- `db.Transaction(func(tx *gorm.DB) error { ... })` wraps the script in a safe commit/rollback
  boundary without manual `defer tx.Rollback()`.
- Keep Transaction Scripts in a `service/` or `handler/` package; avoid letting them grow
  into Domain Model territory — split or refactor when logic is shared across scripts.

---

## Domain Model (p. 116)

**Translation**: Adaptation

Go has no class inheritance. Structs carry behavior via pointer-receiver methods.
Composition via struct embedding replaces inheritance hierarchies.

### Go structure

```go
// Order is a domain object with business behavior on it.
type Order struct {
    ID       int64
    Status   OrderStatus
    Items    []OrderItem
    Customer Customer
}

func (o *Order) CanShip() bool {
    return o.Status == StatusPaid && len(o.Items) > 0
}

func (o *Order) TotalCents() int64 {
    var total int64
    for _, item := range o.Items {
        total += item.PriceCents * int64(item.Quantity)
    }
    return total
}

func (o *Order) AddItem(item OrderItem) error {
    if o.Status != StatusDraft {
        return ErrOrderNotDraft
    }
    o.Items = append(o.Items, item)
    return nil
}
```

### gin / GORM equivalents `[interpretation]`

- GORM models can embed domain behavior (Active Record style) or remain pure data structs
  mapped by a repository layer (Data Mapper style) — choose one per aggregate.
- Struct embedding (`type TimestampedEntity struct { CreatedAt time.Time; UpdatedAt time.Time }`)
  is the Go substitute for a common base class across domain objects.
- Avoid putting `*gorm.DB` fields on domain structs — that collapses Domain Model into
  Active Record and makes unit testing harder.

---

## Table Module (p. 125)

**Translation**: Direct

A struct whose methods each operate over the full table (all rows), not a single row.
Go naturally supports this — no inheritance needed.

### Go structure

```go
// OrderModule handles all business logic for the orders table.
type OrderModule struct {
    db *gorm.DB
}

func NewOrderModule(db *gorm.DB) *OrderModule { return &OrderModule{db: db} }

func (m *OrderModule) GetPendingOrders(ctx context.Context) ([]Order, error) {
    var orders []Order
    return orders, m.db.WithContext(ctx).
        Where("status = ?", StatusPending).Find(&orders).Error
}

func (m *OrderModule) CalculateRevenue(ctx context.Context, from, to time.Time) (int64, error) {
    var total int64
    return total, m.db.WithContext(ctx).Model(&Order{}).
        Where("created_at BETWEEN ? AND ? AND status = ?", from, to, StatusPaid).
        Select("COALESCE(SUM(total_cents), 0)").Scan(&total).Error
}

func (m *OrderModule) CancelExpired(ctx context.Context, before time.Time) (int64, error) {
    result := m.db.WithContext(ctx).Model(&Order{}).
        Where("status = ? AND created_at < ?", StatusPending, before).
        Update("status", StatusCancelled)
    return result.RowsAffected, result.Error
}
```

### gin / GORM equivalents `[interpretation]`

- Table Module maps cleanly to a Go service/repository struct — one struct per table,
  methods cover all table-wide operations.
- Pairs with GORM's `db.Model(&Order{})` scoped queries; the module wraps these with
  domain-meaningful method names.
- Competes with Domain Model: if the same logic would be cleaner as methods on individual
  `Order` instances (e.g., `order.Cancel()`), prefer Domain Model instead.

---

## Service Layer (p. 133)

**Translation**: Direct

Defines the application boundary: use-case methods that orchestrate domain objects,
handle transactions, and enforce security/validation before touching the domain.

### Go structure

```go
// OrderService defines the application boundary for order operations.
type OrderService struct {
    orders  OrderRepository
    mailer  Mailer
    db      *gorm.DB
}

func (s *OrderService) PlaceOrder(ctx context.Context, cmd PlaceOrderCmd) (*Order, error) {
    var order *Order
    err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
        o := NewOrder(cmd.CustomerID, cmd.Items)
        if err := s.orders.WithTx(tx).Save(ctx, o); err != nil {
            return err
        }
        order = o
        return nil
    })
    if err != nil {
        return nil, err
    }
    _ = s.mailer.SendOrderConfirmation(ctx, order) // best-effort
    return order, nil
}

func (s *OrderService) CancelOrder(ctx context.Context, id int64, reason string) error {
    order, err := s.orders.FindByID(ctx, id)
    if err != nil {
        return err
    }
    if err := order.Cancel(reason); err != nil {
        return err
    }
    return s.orders.Save(ctx, order)
}
```

### gin / GORM equivalents `[interpretation]`

- Service Layer methods map 1:1 to gin route handlers; the handler parses HTTP, calls
  the service, and renders the response — keeping HTTP concerns out of the service.
- `db.Transaction(...)` in the service method is the natural transaction boundary.
- Service Layer interfaces (`type OrderService interface { PlaceOrder(...) }`) enable
  Plugin-style substitution for testing without a real database.

---

## Data Source Architecture (Ch. 10)

---

## Table Data Gateway (p. 144)

**Translation**: Direct

One struct, one table, methods return raw data (slices of maps or plain scan structs).
No domain behavior on the returned data.

### Go structure

```go
// OrderGateway is the Table Data Gateway for the orders table.
type OrderGateway struct {
    db *sql.DB
}

func (g *OrderGateway) FindAll(ctx context.Context) ([]OrderRow, error) {
    rows, err := g.db.QueryContext(ctx, "SELECT id, status, total_cents FROM orders")
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    var result []OrderRow
    for rows.Next() {
        var r OrderRow
        if err := rows.Scan(&r.ID, &r.Status, &r.TotalCents); err != nil {
            return nil, err
        }
        result = append(result, r)
    }
    return result, rows.Err()
}

func (g *OrderGateway) Insert(ctx context.Context, status string, totalCents int64) (int64, error) {
    var id int64
    err := g.db.QueryRowContext(ctx,
        "INSERT INTO orders (status, total_cents) VALUES ($1, $2) RETURNING id",
        status, totalCents,
    ).Scan(&id)
    return id, err
}
```

### gin / GORM equivalents `[interpretation]`

- With GORM, use `db.Raw("SELECT ...").Scan(&rows)` to keep the gateway returning plain
  scan structs without domain behavior — otherwise GORM naturally pulls toward Active Record.
- `sqlx.DB` is a strong fit: `db.SelectContext(&rows, query, args...)` with named struct
  scanning matches Table Data Gateway semantics cleanly.
- Pairs well with Transaction Script: the script calls gateway methods and contains
  all business logic itself.

---

## Row Data Gateway (p. 152)

**Translation**: Direct

One struct instance per database row. The struct holds find/insert/update methods
specific to that single row's lifecycle.

### Go structure

```go
// OrderRow is a Row Data Gateway — one instance represents one database row.
type OrderRow struct {
    ID         int64
    Status     string
    TotalCents int64
    db         *sql.DB // unexported: DB access stays inside the row
}

func FindOrder(ctx context.Context, db *sql.DB, id int64) (*OrderRow, error) {
    r := &OrderRow{db: db}
    err := db.QueryRowContext(ctx,
        "SELECT id, status, total_cents FROM orders WHERE id = $1", id,
    ).Scan(&r.ID, &r.Status, &r.TotalCents)
    if err != nil {
        return nil, err
    }
    return r, nil
}

func (r *OrderRow) Update(ctx context.Context) error {
    _, err := r.db.ExecContext(ctx,
        "UPDATE orders SET status = $1, total_cents = $2 WHERE id = $3",
        r.Status, r.TotalCents, r.ID,
    )
    return err
}
```

### gin / GORM equivalents `[interpretation]`

- GORM's `db.First(&order, id)` + `db.Save(&order)` gives Row Data Gateway behavior,
  but GORM usually adds domain methods — sliding it toward Active Record.
- Row Data Gateway is most useful with `database/sql` or `sqlx` when you want explicit
  SQL with no ORM magic but still structured per-row access.
- Competes with Active Record (p. 160): if you find yourself adding domain methods to
  `OrderRow`, you have crossed into Active Record territory.

---

## Active Record (p. 160)

**Translation**: Direct — GORM IS Active Record

GORM model structs embedding `gorm.Model` are the canonical Go Active Record implementation.
`db.Create()`, `db.Save()`, `db.Delete()` are the Active Record interface.

### Go structure

```go
// Order is an Active Record — domain data and persistence in one struct.
type Order struct {
    gorm.Model                      // embeds ID, CreatedAt, UpdatedAt, DeletedAt
    Status     string               `gorm:"not null;default:'draft'"`
    TotalCents int64                `gorm:"not null"`
    CustomerID int64                `gorm:"not null;index"`
    Items      []OrderItem          `gorm:"foreignKey:OrderID"`
}

// Business behavior lives on the same struct.
func (o *Order) CanShip() bool {
    return o.Status == "paid" && len(o.Items) > 0
}

// Usage — no separate repository needed:
// db.Create(&order)
// db.Save(&order)
// db.Delete(&order)
// db.Preload("Items").First(&order, id)
```

### gin / GORM equivalents `[interpretation]`

- GORM is the canonical Go Active Record implementation. `gorm.Model` provides the
  standard primary key + timestamp columns every Active Record carries.
- `db.Create(&o)`, `db.Save(&o)`, `db.Delete(&o, id)` are the four Active Record
  lifecycle methods Fowler describes — GORM implements them exactly.
- Prefer Active Record for simple CRUD-heavy domains; switch to Data Mapper (separate
  repository) when unit testing domain logic without a database becomes important.

---

## Data Mapper (p. 165)

**Translation**: Adaptation

A repository struct takes `*gorm.DB` and maps between database rows and domain structs.
The domain struct has zero DB awareness — no `gorm.Model` embedding.

### Go structure

```go
// Order is a pure domain struct — no DB tags, no gorm.Model.
type Order struct {
    ID         int64
    Status     OrderStatus
    TotalCents int64
    CustomerID int64
}

// OrderMapper is the Data Mapper — domain <-> DB, domain has no DB knowledge.
type OrderMapper struct {
    db *gorm.DB
}

type orderRecord struct {
    ID         int64  `gorm:"primaryKey;column:id"`
    Status     string `gorm:"column:status"`
    TotalCents int64  `gorm:"column:total_cents"`
    CustomerID int64  `gorm:"column:customer_id"`
}

func (m *OrderMapper) FindByID(ctx context.Context, id int64) (*Order, error) {
    var rec orderRecord
    if err := m.db.WithContext(ctx).Table("orders").First(&rec, id).Error; err != nil {
        return nil, err
    }
    return &Order{ID: rec.ID, Status: OrderStatus(rec.Status),
        TotalCents: rec.TotalCents, CustomerID: rec.CustomerID}, nil
}

func (m *OrderMapper) Save(ctx context.Context, o *Order) error {
    rec := orderRecord{ID: o.ID, Status: string(o.Status),
        TotalCents: o.TotalCents, CustomerID: o.CustomerID}
    return m.db.WithContext(ctx).Table("orders").Save(&rec).Error
}
```

### gin / GORM equivalents `[interpretation]`

- The separation of `orderRecord` (DB-tagged struct) from `Order` (domain struct) is the
  core of Data Mapper in Go — two structs, one mapper method to convert between them.
- GORM is used only in the mapper layer; domain tests can create `Order` values directly
  and pass them to a mock mapper without any DB dependency.
- For complex mapping, use `sqlx` with `db.GetContext` / `db.SelectContext` into scan
  structs, then hand-map to domain objects in the mapper method.

---

## OR Behavioral (Ch. 11)

---

## Unit of Work (p. 184)

**Translation**: Direct

`db.Transaction(func(tx *gorm.DB) error { ... })` — all mutations inside one function,
commit on nil return, automatic rollback on error. This IS Unit of Work in Go/GORM.

### Go structure

```go
// PlaceOrderUoW demonstrates Unit of Work via db.Transaction.
func PlaceOrderUoW(ctx context.Context, db *gorm.DB, cmd PlaceOrderCmd) error {
    return db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
        order := &Order{CustomerID: cmd.CustomerID, Status: "draft", TotalCents: cmd.TotalCents}
        if err := tx.Create(order).Error; err != nil {
            return err
        }
        for _, item := range cmd.Items {
            item.OrderID = order.ID
            if err := tx.Create(&item).Error; err != nil {
                return err
            }
        }
        if err := tx.Model(&Inventory{}).
            Where("product_id = ?", cmd.ProductID).
            UpdateColumn("reserved", gorm.Expr("reserved + ?", cmd.Quantity)).Error; err != nil {
            return err
        }
        return nil // commits; any non-nil return triggers rollback
    })
}
```

### gin / GORM equivalents `[interpretation]`

- `db.Transaction(func(tx *gorm.DB) error { ... })` is GORM's built-in Unit of Work —
  pass `tx` (not `db`) to all repository calls inside the closure.
- For manual control: `tx := db.Begin()`, `tx.Rollback()` / `tx.Commit()` with
  `defer func() { if r := recover(); r != nil { tx.Rollback() } }()`.
- Repository methods should accept `*gorm.DB` (not a concrete db field) so callers can
  pass a transaction instance: `repo.WithTx(tx).Save(ctx, obj)`.

---

## Identity Map (p. 195)

**Translation**: Adaptation

GORM does not maintain an in-process Identity Map. Implement one explicitly as a
request-scoped map guarded by a mutex for concurrent-safe access.

### Go structure

```go
// IdentityMap caches loaded domain objects within one request scope.
type IdentityMap[T any] struct {
    mu    sync.RWMutex
    cache map[int64]*T
}

func NewIdentityMap[T any]() *IdentityMap[T] {
    return &IdentityMap[T]{cache: make(map[int64]*T)}
}

func (m *IdentityMap[T]) Get(id int64) (*T, bool) {
    m.mu.RLock()
    defer m.mu.RUnlock()
    v, ok := m.cache[id]
    return v, ok
}

func (m *IdentityMap[T]) Put(id int64, obj *T) {
    m.mu.Lock()
    defer m.mu.Unlock()
    m.cache[id] = obj
}

// Usage in a repository:
func (r *OrderRepository) FindByID(ctx context.Context, id int64) (*Order, error) {
    if cached, ok := r.idMap.Get(id); ok {
        return cached, nil
    }
    var order Order
    if err := r.db.WithContext(ctx).First(&order, id).Error; err != nil {
        return nil, err
    }
    r.idMap.Put(id, &order)
    return &order, nil
}
```

### gin / GORM equivalents `[interpretation]`

- Scope the `IdentityMap` to a single HTTP request — store it in `gin.Context` via
  `c.Set("idmap", NewIdentityMap[Order]())` in middleware, retrieve with `c.Get`.
- GORM does not deduplicate loads across calls — two `db.First(&o, 42)` calls return two
  separate struct instances. An explicit Identity Map prevents this.
- Go generics (1.18+) make `IdentityMap[T]` type-safe without `interface{}` boxing.

---

## Lazy Load (p. 200)

**Translation**: Adaptation

GORM uses `Preload()` for eager loading. True lazy loading requires either GORM
associations (loaded on first access via a callback) or a holder-pointer pattern.

### Go structure

```go
// Order with eager loading via Preload — explicit, not automatic.
type Order struct {
    gorm.Model
    CustomerID int64
    Items      []OrderItem // nil until Preloaded; zero value is safe to range over
}

// Eager: load items alongside order.
func FindOrderWithItems(ctx context.Context, db *gorm.DB, id int64) (*Order, error) {
    var order Order
    err := db.WithContext(ctx).Preload("Items").First(&order, id).Error
    return &order, err
}

// Lazy holder pattern: wrap the load in a func, call only when accessed.
type LazyItems struct {
    once  sync.Once
    items []OrderItem
    load  func() ([]OrderItem, error)
    err   error
}

func (l *LazyItems) Get() ([]OrderItem, error) {
    l.once.Do(func() { l.items, l.err = l.load() })
    return l.items, l.err
}
```

### gin / GORM equivalents `[interpretation]`

- `db.Preload("Items").Preload("Customer").Find(&orders)` is GORM's standard eager load —
  prefer this over lazy loading to avoid N+1 query problems in gin handlers.
- GORM's `Preload(clause.Associations)` loads all declared associations in one pass.
- The `sync.Once` holder pattern is the idiomatic Go lazy load: goroutine-safe, loads
  exactly once, caches result and error together.

---

## OR Structural (Ch. 12)

---

## Identity Field (p. 216)

**Translation**: Direct

Every GORM model has an `ID` field (or `gorm:"primaryKey"` tag). In plain structs,
add an `int64` field named `ID` by convention.

### Go structure

```go
// Order has an explicit Identity Field: ID int64.
type Order struct {
    ID         int64     `gorm:"primaryKey;autoIncrement"`
    Status     string
    TotalCents int64
    CreatedAt  time.Time
}

// For composite keys, tag both fields:
type OrderItem struct {
    OrderID   int64 `gorm:"primaryKey"`
    ProductID int64 `gorm:"primaryKey"`
    Quantity  int
}

// In-memory equality check uses identity field, not struct pointer:
func SameOrder(a, b *Order) bool { return a.ID == b.ID }
```

### gin / GORM equivalents `[interpretation]`

- GORM auto-generates `id` columns for fields named `ID` (uint by default) or any field
  tagged `gorm:"primaryKey"`.
- Use `int64` rather than `uint` for IDs to ease JSON interop and prevent overflow issues
  when IDs exceed 32-bit range.
- Identity Field enables Identity Map: the map key is always the Identity Field value.

---

## Foreign Key Mapping (p. 236)

**Translation**: Direct

GORM handles foreign key columns via struct tags and `BelongsTo`/`HasMany` associations.
The field name convention (`CustomerID` for a `Customer` association) maps automatically.

### Go structure

```go
// Order has a foreign key to Customer via CustomerID.
type Order struct {
    gorm.Model
    CustomerID int64    `gorm:"not null;index"` // FK column
    Customer   Customer `gorm:"foreignKey:CustomerID"` // association
    Items      []OrderItem `gorm:"foreignKey:OrderID"`
}

type Customer struct {
    gorm.Model
    Name string
}

type OrderItem struct {
    gorm.Model
    OrderID    int64   `gorm:"not null;index"` // FK column
    ProductID  int64   `gorm:"not null"`
    Quantity   int
    PriceCents int64
}

// Load with FK join:
// db.Preload("Customer").Preload("Items").First(&order, id)
```

### gin / GORM equivalents `[interpretation]`

- GORM infers FK columns from field naming: `CustomerID` is the FK for a `Customer`
  association field. Override with `gorm:"foreignKey:OwnerID"` when names diverge.
- `db.Joins("Customer")` performs a SQL JOIN rather than a separate SELECT (useful for
  filtering on associated columns).
- For explicit FK constraints in migrations, use `gorm:"constraint:OnDelete:CASCADE"`.

---

## Association Table Mapping (p. 248)

**Translation**: Direct

GORM `many2many` tag with a join table handles the link table automatically.
Custom join tables add extra columns to the association.

### Go structure

```go
// Order <-> Product via many-to-many with a join table.
type Order struct {
    gorm.Model
    Products []Product `gorm:"many2many:order_products;"`
}

type Product struct {
    gorm.Model
    Name       string
    PriceCents int64
}

// Custom join table with extra columns:
type OrderProduct struct {
    OrderID   int64 `gorm:"primaryKey"`
    ProductID int64 `gorm:"primaryKey"`
    Quantity  int
    UnitPrice int64
}

func (OrderProduct) TableName() string { return "order_products" }

// Usage:
// db.Model(&order).Association("Products").Append(&products)
// db.Preload("Products").First(&order, id)
```

### gin / GORM equivalents `[interpretation]`

- `gorm:"many2many:link_table"` auto-creates and maintains the join table schema.
- For custom join tables with extra columns, use `SetupJoinTable` in `AutoMigrate`:
  `db.SetupJoinTable(&Order{}, "Products", &OrderProduct{})`.
- Query the join table directly with `db.Table("order_products").Where(...)` when you
  need the extra columns that GORM's association API doesn't expose.

---

## Dependent Mapping (p. 262)

**Translation**: Direct

The owning struct's GORM configuration cascades save/delete to child structs.
Children are never loaded or saved independently.

### Go structure

```go
// OrderItem is dependent on Order — never persisted independently.
type Order struct {
    gorm.Model
    Items []OrderItem `gorm:"foreignKey:OrderID;constraint:OnDelete:CASCADE"`
}

type OrderItem struct {
    // No gorm.Model — ID is provided by owner cascade or auto-increment.
    ID         int64 `gorm:"primaryKey;autoIncrement"`
    OrderID    int64 `gorm:"not null"`
    ProductID  int64
    Quantity   int
}

// Saving the owner saves dependents automatically with Session.FullSaveAssociations:
func SaveOrderWithItems(ctx context.Context, db *gorm.DB, order *Order) error {
    return db.WithContext(ctx).
        Session(&gorm.Session{FullSaveAssociations: true}).
        Save(order).Error
}
```

### gin / GORM equivalents `[interpretation]`

- `constraint:OnDelete:CASCADE` in the FK tag lets the database cascade deletes to
  dependents without Go-level code.
- `gorm.Session{FullSaveAssociations: true}` makes GORM upsert associated records
  when saving the parent — this is the application-level cascade.
- Never expose a `FindOrderItem(id)` method that bypasses the owner — loading dependents
  independently breaks the Dependent Mapping contract.

---

## Embedded Value (p. 268)

**Translation**: Direct

GORM `embedded` tag maps a nested struct's fields into the owning table's columns.
No join, no separate table — flat mapping.

### Go structure

```go
// Address is an Embedded Value — stored in the customers table, not its own table.
type Address struct {
    Street  string `gorm:"column:street"`
    City    string `gorm:"column:city"`
    Country string `gorm:"column:country"`
}

type Customer struct {
    gorm.Model
    Name            string
    ShippingAddress Address `gorm:"embedded;embeddedPrefix:ship_"`
    BillingAddress  Address `gorm:"embedded;embeddedPrefix:bill_"`
}

// Result columns: ship_street, ship_city, ship_country, bill_street, ...
// No Address table exists.
// Usage is transparent: customer.ShippingAddress.City = "Berlin"
// db.Save(&customer) persists embedded fields into customers row.
```

### gin / GORM equivalents `[interpretation]`

- `gorm:"embedded"` with `embeddedPrefix` lets multiple instances of the same struct
  coexist in one table without column name collisions.
- Embedded Value is the right choice for Value Objects (p. 486) that are always accessed
  through their owner and never queried independently.
- For JSONB storage of the embedded struct instead of flat columns, use
  `gorm:"serializer:json"` (which makes it Serialized LOB, not Embedded Value).

---

## Serialized LOB (p. 272)

**Translation**: Direct

Store a Go struct or slice as JSON/JSONB in a single database column using GORM's
`serializer:json` tag or a custom `Scanner`/`Valuer` pair.

### Go structure

```go
// Preferences is serialized as JSON into a single DB column.
type Preferences struct {
    Theme         string   `json:"theme"`
    Notifications bool     `json:"notifications"`
    Tags          []string `json:"tags"`
}

type User struct {
    gorm.Model
    Name        string
    Preferences Preferences `gorm:"serializer:json;column:preferences_json"`
}

// Custom type with database/sql Scanner + Valuer for explicit control:
type Tags []string

func (t *Tags) Scan(src any) error { return json.Unmarshal([]byte(src.(string)), t) }
func (t Tags) Value() (driver.Value, error) { b, err := json.Marshal(t); return string(b), err }
```

### gin / GORM equivalents `[interpretation]`

- `gorm:"serializer:json"` handles Marshal/Unmarshal automatically — no custom
  `Scanner`/`Valuer` needed for standard cases.
- Use JSONB (PostgreSQL) with `gorm:"type:jsonb"` to enable server-side JSON path
  queries; otherwise treat the LOB as opaque and query by owner only.
- Tradeoff vs Embedded Value: Serialized LOB can store variable-length structures
  (maps, slices of arbitrary depth) but loses SQL queryability on individual fields.

---

## Single Table Inheritance (p. 278)

**Translation**: Adaptation

Go has no inheritance. Use a discriminator column + interface to model the hierarchy.
All variants share one table; a `type` column distinguishes them.

### Go structure

```go
const (
    PaymentTypeCreditCard  = "credit_card"
    PaymentTypeBankTransfer = "bank_transfer"
)

// PaymentRecord is the shared table row — all payment types in one table.
type PaymentRecord struct {
    gorm.Model
    Type         string  `gorm:"column:type;not null"` // discriminator
    AmountCents  int64
    // Credit card fields (NULL for bank transfers):
    CardLast4    *string
    CardBrand    *string
    // Bank transfer fields (NULL for credit cards):
    AccountIBAN  *string
}

func (r *PaymentRecord) TableName() string { return "payments" }

// Domain interface — returned to callers, not the record:
type Payment interface {
    AmountCents() int64
    Authorize(ctx context.Context) error
}

// Factory: hydrate the correct domain type from the record.
func HydratePayment(r *PaymentRecord) (Payment, error) {
    switch r.Type {
    case PaymentTypeCreditCard:
        return &CreditCardPayment{record: r}, nil
    case PaymentTypeBankTransfer:
        return &BankTransferPayment{record: r}, nil
    default:
        return nil, fmt.Errorf("unknown payment type: %s", r.Type)
    }
}
```

### gin / GORM equivalents `[interpretation]`

- GORM has no built-in STI; implement the discriminator column manually and use a
  factory function to hydrate the correct Go type after loading.
- Nullable pointer fields (`*string`) hold variant-specific columns that are NULL for
  other variants — match Fowler's STI null-column tradeoff.
- Prefer Single Table Inheritance when variants are few and columns are sparse; switch
  to Class Table Inheritance when nullable column count grows unwieldy.

---

## Class Table Inheritance (p. 285)

**Translation**: Adaptation

Each level of the hierarchy gets its own table. A shared primary key joins them.
Implement with separate structs + explicit JOIN query; GORM has no built-in CTI.

### Go structure

```go
// payments table — base fields shared by all payment types.
type PaymentBase struct {
    ID          int64 `gorm:"primaryKey"`
    AmountCents int64
    CreatedAt   time.Time
}

// credit_card_payments table — extends PaymentBase via shared PK.
type CreditCardRecord struct {
    ID        int64  `gorm:"primaryKey"` // FK to payments.id
    CardLast4 string
    CardBrand string
}

// Load via JOIN in the mapper — GORM does not do this automatically.
type CreditCardPayment struct {
    PaymentBase
    CardLast4 string
    CardBrand string
}

func FindCreditCardPayment(ctx context.Context, db *gorm.DB, id int64) (*CreditCardPayment, error) {
    var result CreditCardPayment
    err := db.WithContext(ctx).Raw(`
        SELECT p.id, p.amount_cents, p.created_at, c.card_last4, c.card_brand
        FROM payments p
        JOIN credit_card_payments c ON c.id = p.id
        WHERE p.id = ?`, id,
    ).Scan(&result).Error
    return &result, err
}
```

### gin / GORM equivalents `[interpretation]`

- GORM does not support Class Table Inheritance natively; use `db.Raw()` with explicit
  JOINs and scan into a flat composite struct.
- Struct embedding (`type CreditCardPayment struct { PaymentBase; ... }`) mirrors the
  inheritance relationship in Go's type system without actual inheritance.
- Prefer this when base-class fields must be queryable across all subtypes in a single
  query; accept the JOIN cost vs Single Table Inheritance's nullable column cost.

---

## Concrete Table Inheritance (p. 293)

**Translation**: Adaptation

Each concrete type maps to its own fully self-contained table. No shared base table,
no JOINs. Different GORM models, different `TableName()` methods.

### Go structure

```go
// credit_card_payments — fully self-contained, no FK to a base table.
type CreditCardPayment struct {
    gorm.Model
    AmountCents int64  // duplicated base field
    CardLast4   string
    CardBrand   string
}

func (CreditCardPayment) TableName() string { return "credit_card_payments" }

// bank_transfer_payments — fully self-contained.
type BankTransferPayment struct {
    gorm.Model
    AmountCents int64  // duplicated base field
    AccountIBAN string
    BankCode    string
}

func (BankTransferPayment) TableName() string { return "bank_transfer_payments" }

// No polymorphic query across types without UNION — caller chooses the right type.
func FindAnyPayment(ctx context.Context, db *gorm.DB, id int64, kind string) (Payment, error) {
    switch kind {
    case "credit_card":
        var p CreditCardPayment
        return &p, db.WithContext(ctx).First(&p, id).Error
    case "bank_transfer":
        var p BankTransferPayment
        return &p, db.WithContext(ctx).First(&p, id).Error
    }
    return nil, ErrUnknownPaymentType
}
```

### gin / GORM equivalents `[interpretation]`

- `TableName()` on each struct is the only GORM configuration needed — each type is
  a completely independent GORM model.
- Concrete Table Inheritance has the best per-type query performance (no JOINs, no
  NULLs) but makes cross-type polymorphic queries require UNION ALL.
- Good fit when subtypes rarely need to be queried together and each table's columns
  diverge significantly from the others.

---

## Inheritance Mappers (p. 302)

**Translation**: Adaptation

Go has no abstract classes. The equivalent is a shared mapper interface with concrete
implementations per subtype, plus a factory or dispatcher function.

### Go structure

```go
// PaymentMapper is the shared interface all inheritance mappers implement.
type PaymentMapper interface {
    FindByID(ctx context.Context, id int64) (Payment, error)
    Save(ctx context.Context, p Payment) error
}

// CreditCardMapper handles only credit card payments.
type CreditCardMapper struct{ db *gorm.DB }

func (m *CreditCardMapper) FindByID(ctx context.Context, id int64) (Payment, error) {
    var rec CreditCardPayment
    err := m.db.WithContext(ctx).First(&rec, id).Error
    return &rec, err
}

// InheritanceMapperRegistry dispatches to the correct concrete mapper.
type InheritanceMapperRegistry struct {
    mappers map[string]PaymentMapper
}

func (r *InheritanceMapperRegistry) For(kind string) (PaymentMapper, error) {
    m, ok := r.mappers[kind]
    if !ok {
        return nil, fmt.Errorf("no mapper for kind: %s", kind)
    }
    return m, nil
}
```

### gin / GORM equivalents `[interpretation]`

- The `PaymentMapper` interface is a Separated Interface (p. 476); the concrete mappers
  are the implementations wired in via Plugin (p. 499) at startup.
- The registry/dispatcher function plays the role of the abstract base mapper's
  dispatch logic that Fowler describes for Java.
- Required whenever you use any of the three inheritance mapping strategies; pairs with
  Single Table, Class Table, or Concrete Table Inheritance.

---

## OR Metadata (Ch. 13)

---

## Metadata Mapping (p. 306)

**Translation**: Conceptual translation `[interpretation]`

In Java, Metadata Mapping is what ORM annotation processors (Hibernate XML, JPA
annotations) implement. In Go, GORM struct tags are the metadata. The mapping
declarations live in struct tags rather than in a separate XML file or annotation
processor, but the intent is identical: declare field-to-column relationships
declaratively, not in hand-coded SQL strings.

### Go structure

```go
// GORM struct tags ARE the metadata mapping — declarative, not hand-coded SQL.
type Order struct {
    ID         int64          `gorm:"primaryKey;autoIncrement;column:id"`
    Status     string         `gorm:"column:status;not null;default:'draft';index"`
    TotalCents int64          `gorm:"column:total_cents;not null"`
    CustomerID int64          `gorm:"column:customer_id;not null;index"`
    CreatedAt  time.Time      `gorm:"column:created_at;autoCreateTime"`
    UpdatedAt  time.Time      `gorm:"column:updated_at;autoUpdateTime"`
    DeletedAt  gorm.DeletedAt `gorm:"column:deleted_at;index"`
}

// GORM reads these tags at runtime to build INSERT/UPDATE/SELECT SQL automatically.
// No hand-coded "INSERT INTO orders (status, total_cents) VALUES (?, ?)" needed.
```

### gin / GORM equivalents `[interpretation]`

- GORM struct tags (`gorm:"..."`) are Go's Metadata Mapping mechanism — the ORM reads
  them at runtime to generate SQL, exactly as Fowler describes for Hibernate XML.
- `gorm:"column:..."` overrides column names; `gorm:"index"` declares indexes;
  `gorm:"constraint:..."` declares FK constraints — all metadata, not imperative code.
- `db.AutoMigrate(&Order{})` reads the metadata to create/alter tables, completing
  the metadata-driven lifecycle Fowler describes.

---

## Query Object (p. 316)

**Translation**: Adaptation

Go has no expression trees or generics-based query builders (pre-1.18). Represent
a query as a struct of filter criteria; translate to GORM conditions in a builder method.

### Go structure

```go
// OrderQuery is a Query Object — criteria in struct fields, not SQL strings.
type OrderQuery struct {
    CustomerID *int64
    Status     *string
    MinTotal   *int64
    MaxTotal   *int64
    CreatedAfter *time.Time
}

func (q *OrderQuery) Apply(db *gorm.DB) *gorm.DB {
    if q.CustomerID != nil {
        db = db.Where("customer_id = ?", *q.CustomerID)
    }
    if q.Status != nil {
        db = db.Where("status = ?", *q.Status)
    }
    if q.MinTotal != nil {
        db = db.Where("total_cents >= ?", *q.MinTotal)
    }
    if q.MaxTotal != nil {
        db = db.Where("total_cents <= ?", *q.MaxTotal)
    }
    if q.CreatedAfter != nil {
        db = db.Where("created_at > ?", *q.CreatedAfter)
    }
    return db
}

func FindOrders(ctx context.Context, db *gorm.DB, q *OrderQuery) ([]Order, error) {
    var orders []Order
    return orders, q.Apply(db.WithContext(ctx)).Find(&orders).Error
}
```

### gin / GORM equivalents `[interpretation]`

- GORM's chainable `.Where()` calls are the query-building mechanism; the Query Object
  struct centralizes which criteria are valid rather than scattering `.Where()` calls.
- Gin handlers parse URL query params into a `OrderQuery` struct using
  `c.ShouldBindQuery(&q)`, then pass the struct to the repository — keeping SQL
  construction out of the handler.
- For complex queries, consider `squirrel` (a SQL builder library) as the query object
  backend instead of GORM's fluent API.

---

## Repository (p. 322)

**Translation**: Direct — natural fit

Go interfaces make Repository the cleanest pattern in the language. Define the interface
in the domain package, implement with GORM in the infrastructure package, mock in tests.

### Go structure

```go
// OrderRepository defines the domain-facing collection interface.
// Lives in the domain package — no GORM import here.
type OrderRepository interface {
    FindByID(ctx context.Context, id int64) (*Order, error)
    FindByCustomer(ctx context.Context, customerID int64) ([]Order, error)
    Save(ctx context.Context, order *Order) error
    Delete(ctx context.Context, id int64) error
}

// GORMOrderRepository is the infrastructure implementation.
type GORMOrderRepository struct {
    db *gorm.DB
}

func (r *GORMOrderRepository) FindByID(ctx context.Context, id int64) (*Order, error) {
    var order Order
    err := r.db.WithContext(ctx).First(&order, id).Error
    return &order, err
}

func (r *GORMOrderRepository) Save(ctx context.Context, order *Order) error {
    return r.db.WithContext(ctx).Save(order).Error
}

// In tests, implement with a simple map — no DB needed:
type InMemoryOrderRepository struct{ store map[int64]*Order }
```

### gin / GORM equivalents `[interpretation]`

- The Repository interface belongs in the domain or service package; the GORM
  implementation belongs in `infrastructure/` or `repository/` — enforcing layering.
- Wire the concrete implementation in `main.go` or a DI setup function:
  `svc := NewOrderService(GORMOrderRepository{db})`.
- `InMemoryOrderRepository` (map-backed) enables unit tests without any database setup —
  this is the primary value of the Repository pattern in Go.

---

## Web Presentation (Ch. 14)

---

## Model View Controller (p. 330)

**Translation**: Direct

gin's architecture is MVC: the router + middleware is the Controller, Go structs are
the Model, and templates (`c.HTML`) or JSON (`c.JSON`) are the View.

### Go structure

```go
// Model — plain Go struct, no HTTP awareness.
type OrderViewModel struct {
    ID         int64
    Status     string
    TotalCents int64
    Items      []OrderItemViewModel
}

// Controller — gin handler, pure routing/HTTP concern.
func GetOrderHandler(svc *OrderService) gin.HandlerFunc {
    return func(c *gin.Context) {
        id, err := strconv.ParseInt(c.Param("id"), 10, 64)
        if err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
            return
        }
        order, err := svc.GetOrder(c.Request.Context(), id)
        if err != nil {
            c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
            return
        }
        // View — serialize to JSON (or render template)
        c.JSON(http.StatusOK, ToOrderViewModel(order))
    }
}
```

### gin / GORM equivalents `[interpretation]`

- gin is a request-response MVC framework: `gin.Engine` is the front controller,
  handler functions are page controllers, and `c.JSON`/`c.HTML` is the view layer.
- The Model in gin MVC is the domain/service layer result — a domain struct or a
  purpose-built ViewModel struct, not the GORM model directly.
- For HTML rendering: `r.LoadHTMLGlob("templates/*")` + `c.HTML(200, "order.tmpl", vm)`.

---

## Page Controller (p. 333)

**Translation**: Direct

Each gin handler function is a Page Controller: one handler, one page/action,
responsible for the request lifecycle of exactly that one endpoint.

### Go structure

```go
// Each handler struct is a Page Controller for one logical page/action.
type OrderController struct {
    svc *OrderService
}

// GET /orders/:id — Page Controller for the order detail page.
func (ctrl *OrderController) Show(c *gin.Context) {
    id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
    order, err := ctrl.svc.GetOrder(c.Request.Context(), id)
    if err != nil {
        c.HTML(http.StatusNotFound, "404.tmpl", nil)
        return
    }
    c.HTML(http.StatusOK, "order_show.tmpl", gin.H{"Order": order})
}

// POST /orders — Page Controller for the order creation action.
func (ctrl *OrderController) Create(c *gin.Context) {
    var cmd PlaceOrderCmd
    if err := c.ShouldBindJSON(&cmd); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    order, err := ctrl.svc.PlaceOrder(c.Request.Context(), cmd)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    c.JSON(http.StatusCreated, order)
}

// Register:
// r.GET("/orders/:id", ctrl.Show)
// r.POST("/orders", ctrl.Create)
```

### gin / GORM equivalents `[interpretation]`

- A gin handler function (or a method on a controller struct) maps directly to Page
  Controller — one HTTP action, one function.
- Controller structs holding service dependencies are the idiomatic Go equivalent of
  Fowler's Page Controller class; the struct is instantiated once, methods handle requests.
- Competes with Front Controller: use Page Controller for small apps with few routes;
  switch to Front Controller (gin middleware + `RouterGroup`) as the application grows.

---

## Front Controller (p. 344)

**Translation**: Direct

gin's `Engine` is the Front Controller: all requests enter through one `ServeHTTP`
method, middleware applies cross-cutting concerns, and the router dispatches to handlers.

### Go structure

```go
func NewRouter(orderCtrl *OrderController, authMW gin.HandlerFunc) *gin.Engine {
    r := gin.New()

    // Cross-cutting middleware — Front Controller concerns:
    r.Use(gin.Recovery())
    r.Use(RequestIDMiddleware())
    r.Use(LoggingMiddleware())

    // Public routes:
    r.GET("/health", HealthHandler)

    // Protected route group:
    api := r.Group("/api/v1")
    api.Use(authMW) // auth applied to all /api/v1/* routes

    orders := api.Group("/orders")
    orders.GET("/:id", orderCtrl.Show)
    orders.POST("", orderCtrl.Create)
    orders.DELETE("/:id", orderCtrl.Delete)

    return r
}

// Front Controller entry point (in main.go):
// r := NewRouter(orderCtrl, AuthMiddleware(jwtKey))
// r.Run(":8080")
```

### gin / GORM equivalents `[interpretation]`

- `gin.Engine.ServeHTTP` is the single entry point Fowler describes — every HTTP
  request passes through it before reaching a handler.
- Middleware (`r.Use(...)`, `group.Use(...)`) is the dispatch mechanism: cross-cutting
  behavior (auth, logging, rate limiting) runs before action handlers.
- `RouterGroup` provides the hierarchical route organization that Front Controller
  uses to map URLs to handlers without hardcoding paths in handlers.

---

## Template View (p. 350)

**Translation**: Adaptation

gin serves HTML via `c.HTML()` using Go's `html/template`. gin is primarily a JSON
API framework; Template View requires explicit setup and is secondary to JSON responses.

### Go structure

```go
func SetupTemplateView(r *gin.Engine) {
    // Load all templates from the templates/ directory:
    r.LoadHTMLGlob("templates/**/*.tmpl")

    // Serve a page with template data:
    r.GET("/orders/:id", func(c *gin.Context) {
        order := fetchOrder(c) // domain fetch
        c.HTML(http.StatusOK, "orders/show.tmpl", gin.H{
            "Title": "Order Details",
            "Order": order,
        })
    })
}

// templates/orders/show.tmpl:
// <!DOCTYPE html>
// <html>
//   <body>
//     <h1>{{ .Title }}</h1>
//     <p>Order #{{ .Order.ID }}: {{ .Order.Status }}</p>
//     {{ range .Order.Items }}
//       <li>{{ .ProductName }} x{{ .Quantity }}</li>
//     {{ end }}
//   </body>
// </html>
```

### gin / GORM equivalents `[interpretation]`

- `r.LoadHTMLGlob("templates/*")` or `r.LoadHTMLFiles(...)` registers templates;
  `c.HTML(status, "name.tmpl", data)` renders them — this is gin's Template View API.
- Go's `html/template` auto-escapes HTML output, preventing XSS — a safety default
  Fowler could not assume from early 2000s template engines.
- For a richer template layer, consider `templ` (type-safe Go templates compiled to
  functions) as a Template View implementation that adds compile-time safety.

---

## Transform View (p. 361)

**Translation**: Conceptual translation `[interpretation]`

Fowler's Transform View uses XSLT to transform XML domain data to HTML. In Go,
the functional equivalent is a transformer function that converts domain structs
to a presentation struct (or JSON), applying per-element transformations.

### Go structure

```go
// OrderTransformer converts domain Order to a presentation-layer DTO.
// This is the Transform View — element-by-element transformation, not a template.
type OrderTransformerView struct{}

func (t *OrderTransformerView) Transform(order *Order) OrderResponseDTO {
    items := make([]OrderItemDTO, len(order.Items))
    for i, item := range order.Items {
        items[i] = OrderItemDTO{
            ProductName: item.ProductName,
            Quantity:    item.Quantity,
            UnitPrice:   formatCents(item.PriceCents),
        }
    }
    return OrderResponseDTO{
        ID:         order.ID,
        Status:     order.Status.String(),
        TotalPrice: formatCents(order.TotalCents),
        Items:      items,
    }
}

func formatCents(cents int64) string {
    return fmt.Sprintf("$%.2f", float64(cents)/100)
}
```

### gin / GORM equivalents `[interpretation]`

- Go JSON APIs naturally use Transform View: domain objects are never serialized
  directly — a transformer (assembler/presenter) converts them to DTOs first.
- The transformer function IS the "transform" in Transform View; the DTO IS the
  presentation output — just JSON instead of HTML.
- gin handlers call the transformer: `c.JSON(200, transformer.Transform(order))` —
  keeping transformation logic out of both the domain and the handler.

---

## Two Step View (p. 365)

**Translation**: Conceptual translation `[interpretation]`

Step 1 converts domain data to a generic logical screen structure (a ViewModel/
presenter struct). Step 2 renders that structure to HTML or JSON. In Go, this maps to
an assembler + template (or JSON marshaler).

### Go structure

```go
// Step 1: Domain -> Logical Screen Structure (ViewModel)
type OrderPageModel struct {
    PageTitle   string
    BreadCrumbs []BreadCrumb
    OrderCard   OrderCardModel
    Actions     []ActionButton
}

type OrderCardModel struct {
    ID         string
    StatusBadge string // e.g., "Paid ✓"
    Total      string  // formatted
    LineItems  []LineItemModel
}

// Assembler performs Step 1:
func AssembleOrderPage(order *Order, user *User) OrderPageModel {
    return OrderPageModel{
        PageTitle:   fmt.Sprintf("Order #%d", order.ID),
        BreadCrumbs: buildBreadCrumbs(order),
        OrderCard:   assembleOrderCard(order),
        Actions:     buildActions(order, user),
    }
}

// Step 2: Logical Structure -> Output (gin renders the template or returns JSON)
// c.HTML(200, "order_page.tmpl", assembleOrderPage(order, user))
// or: c.JSON(200, assembleOrderPage(order, user))
```

### gin / GORM equivalents `[interpretation]`

- Two Step View separates what to show (Step 1: assembler) from how to show it
  (Step 2: template/JSON marshaling) — a clean boundary in gin handlers.
- Step 1 belongs in a `presenter/` or `view/` package; Step 2 is `c.HTML` or `c.JSON`.
- This pattern shines when multiple output formats (HTML + JSON + PDF) share the same
  logical screen structure — change Step 2 without touching Step 1.

---

## Application Controller (p. 379)

**Translation**: Adaptation

Centralizes navigation and flow decisions: given current application state, what
screen comes next? In Go, implement as a state-machine struct that maps
`(currentScreen, event)` to `(nextScreen, action)`.

### Go structure

```go
type Screen string

const (
    ScreenOrderList    Screen = "order_list"
    ScreenOrderDetail  Screen = "order_detail"
    ScreenOrderConfirm Screen = "order_confirm"
    ScreenOrderSuccess Screen = "order_success"
)

// ApplicationController decides navigation based on state, not the handler.
type OrderFlowController struct {
    transitions map[Screen]map[string]Screen
}

func NewOrderFlowController() *OrderFlowController {
    return &OrderFlowController{
        transitions: map[Screen]map[string]Screen{
            ScreenOrderList:   {"select": ScreenOrderDetail},
            ScreenOrderDetail: {"confirm": ScreenOrderConfirm, "back": ScreenOrderList},
            ScreenOrderConfirm: {"submit": ScreenOrderSuccess, "back": ScreenOrderDetail},
        },
    }
}

func (ac *OrderFlowController) Next(current Screen, event string) (Screen, error) {
    events, ok := ac.transitions[current]
    if !ok {
        return "", fmt.Errorf("unknown screen: %s", current)
    }
    next, ok := events[event]
    if !ok {
        return "", fmt.Errorf("no transition for event %q from %s", event, current)
    }
    return next, nil
}
```

### gin / GORM equivalents `[interpretation]`

- Useful in multi-step wizard flows (checkout, onboarding) where the next screen
  depends on validation results or business state, not just the URL.
- Store the current `Screen` in session state (cookie, Redis, DB) and call
  `ac.Next(current, event)` in the gin handler to determine the redirect target.
- Competes with just using gin routes for navigation — prefer Application Controller
  only when flow logic becomes complex enough to warrant centralization.

---

## Distribution (Ch. 15)

---

## Remote Facade (p. 388)

**Translation**: Direct

A coarse-grained gin handler (or gRPC service method) that batches fine-grained
domain operations into a single network call, returning a DTO.

### Go structure

```go
// OrderFacadeHandler is a Remote Facade — one HTTP call, many domain operations.
func OrderFacadeHandler(svc *OrderService) gin.HandlerFunc {
    return func(c *gin.Context) {
        id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
        ctx := c.Request.Context()

        // One remote call fetches everything the client needs at once:
        order, err := svc.GetOrderDetail(ctx, id)     // order + items
        if err != nil {
            c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
            return
        }
        customer, err := svc.GetCustomerSummary(ctx, order.CustomerID)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
            return
        }
        // Pack everything into one response DTO — no second round trip needed:
        c.JSON(http.StatusOK, OrderDetailResponse{
            Order:    ToOrderDTO(order),
            Customer: ToCustomerDTO(customer),
        })
    }
}
```

### gin / GORM equivalents `[interpretation]`

- Each gin endpoint is naturally a Remote Facade over fine-grained domain/service
  methods — HTTP serialization is the remote call boundary.
- The key design rule: handlers should never expose domain object granularity
  (one endpoint per field change) — batch what the client needs into one response.
- For gRPC, a single `OrderService.GetOrderDetail` RPC method is the Remote Facade;
  the implementation calls multiple fine-grained domain methods internally.

---

## Data Transfer Object (p. 401)

**Translation**: Direct

A plain Go struct with exported fields used to carry data across a network boundary.
No behavior — only data. JSON tags control serialization.

### Go structure

```go
// OrderDTO carries order data across the HTTP boundary — no behavior.
type OrderDTO struct {
    ID         int64          `json:"id"`
    Status     string         `json:"status"`
    TotalCents int64          `json:"total_cents"`
    TotalFmt   string         `json:"total_formatted"`
    CustomerID int64          `json:"customer_id"`
    Items      []OrderItemDTO `json:"items"`
    CreatedAt  time.Time      `json:"created_at"`
}

type OrderItemDTO struct {
    ProductID   int64  `json:"product_id"`
    ProductName string `json:"product_name"`
    Quantity    int    `json:"quantity"`
    UnitCents   int64  `json:"unit_cents"`
}

// Assembler converts domain -> DTO (keep this in a separate function, not on the struct):
func ToOrderDTO(o *Order) OrderDTO {
    items := make([]OrderItemDTO, len(o.Items))
    for i, item := range o.Items {
        items[i] = OrderItemDTO{ProductID: item.ProductID, Quantity: item.Quantity}
    }
    return OrderDTO{ID: o.ID, Status: string(o.Status), Items: items}
}
```

### gin / GORM equivalents `[interpretation]`

- `c.JSON(200, dto)` serializes the DTO via `encoding/json`; `c.ShouldBindJSON(&dto)`
  deserializes incoming DTOs — gin's standard request/response mechanism.
- Keep DTOs in a `dto/` or `api/` package, domain structs in `domain/` — never return
  GORM model structs directly from handlers.
- Fowler distinguishes DTOs from Value Objects: DTOs are for distribution (network
  boundary), Value Objects are domain concepts — do not conflate them.

---

## Concurrency (Ch. 16)

---

## Optimistic Offline Lock (p. 416)

**Translation**: Direct

Add a `Version int` field to the GORM model. Use a conditional UPDATE that checks
the current version; inspect `RowsAffected` to detect a conflict.

### Go structure

```go
type Order struct {
    gorm.Model
    Status     string
    TotalCents int64
    Version    int `gorm:"not null;default:0"` // optimistic lock version
}

// UpdateWithOptimisticLock fails if another writer changed the version since load.
func UpdateOrderStatus(ctx context.Context, db *gorm.DB, order *Order, newStatus string) error {
    oldVersion := order.Version
    result := db.WithContext(ctx).
        Model(order).
        Where("id = ? AND version = ?", order.ID, oldVersion).
        Updates(map[string]any{
            "status":  newStatus,
            "version": gorm.Expr("version + 1"),
        })
    if result.Error != nil {
        return result.Error
    }
    if result.RowsAffected == 0 {
        return ErrOptimisticLockConflict // another writer won
    }
    order.Version = oldVersion + 1
    order.Status = newStatus
    return nil
}
```

### gin / GORM equivalents `[interpretation]`

- GORM does not provide optimistic locking out of the box — implement with an explicit
  `WHERE version = ?` clause and a `RowsAffected == 0` check.
- The client round-trips the version field: GET returns `version`, PUT/PATCH sends it
  back; the handler reads version from the request body and passes it to the update.
- On `ErrOptimisticLockConflict`, return HTTP 409 Conflict and let the client reload
  and retry — this is the correct web API behavior for optimistic concurrency.

---

## Pessimistic Offline Lock (p. 426)

**Translation**: Direct

Use `SELECT ... FOR UPDATE` within a database transaction to acquire an exclusive row
lock. GORM exposes this via `clause.Locking`.

### Go structure

```go
import "gorm.io/gorm/clause"

// EditOrder acquires a pessimistic lock before loading the order for mutation.
func EditOrder(ctx context.Context, db *gorm.DB, id int64, mutateFn func(*Order) error) error {
    return db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
        var order Order
        // Lock the row for the duration of the transaction:
        if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
            First(&order, id).Error; err != nil {
            return err
        }
        // Apply the mutation while holding the lock:
        if err := mutateFn(&order); err != nil {
            return err
        }
        return tx.Save(&order).Error
        // Lock is released when the transaction commits or rolls back.
    })
}
```

### gin / GORM equivalents `[interpretation]`

- `clause.Locking{Strength: "UPDATE"}` generates `SELECT ... FOR UPDATE` in PostgreSQL
  and MySQL; use `Strength: "SHARE"` for a shared read lock.
- The lock is held for the entire `db.Transaction(...)` closure — keep the closure
  short to minimize lock contention.
- Note: Pessimistic Offline Lock applies to data spans across HTTP requests where
  Go goroutines are not the concurrency unit — the lock is at the database level,
  not the goroutine level.

---

## Coarse-Grained Lock (p. 438)

**Translation**: Adaptation

Lock an entire aggregate (root + children) with a single version check on the root.
Children inherit the root's lock — no per-child version field needed.

### Go structure

```go
// Order is the aggregate root. Locking Order implicitly locks its Items.
type Order struct {
    gorm.Model
    Version int         `gorm:"not null;default:0"`
    Items   []OrderItem `gorm:"foreignKey:OrderID"`
}

// OrderItem has no version field — it is protected by Order's lock.
type OrderItem struct {
    ID       int64
    OrderID  int64
    Quantity int
}

// CoarseGrainedUpdate locks the root, applies changes to root + children.
func UpdateOrderAggregate(ctx context.Context, db *gorm.DB, orderID int64, version int,
    mutateFn func(*Order) error) error {
    return db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
        var order Order
        if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
            Preload("Items").First(&order, orderID).Error; err != nil {
            return err
        }
        if order.Version != version {
            return ErrOptimisticLockConflict
        }
        if err := mutateFn(&order); err != nil {
            return err
        }
        order.Version++
        return tx.Session(&gorm.Session{FullSaveAssociations: true}).Save(&order).Error
    })
}
```

### gin / GORM equivalents `[interpretation]`

- The aggregate root's `Version` field covers the entire aggregate — editing any
  child item bumps the root version, preventing stale concurrent edits.
- `clause.Locking{Strength: "UPDATE"}` + `Preload("Items")` locks the root row and
  loads children in one transaction; child rows are implicitly covered.
- Combine with Optimistic Offline Lock (version check on root) or Pessimistic Offline
  Lock (SELECT FOR UPDATE on root) — Coarse-Grained Lock is the scope decision, not
  a standalone locking mechanism.

---

## Implicit Lock (p. 449)

**Translation**: Adaptation

Go has no AOP or proxy-based implicit locking. Implement via middleware or a wrapper
repository that automatically applies version checks or SELECT FOR UPDATE without
callers being aware.

### Go structure

```go
// LockedOrderRepository wraps any OrderRepository and adds implicit optimistic locking.
type LockedOrderRepository struct {
    inner OrderRepository
    db    *gorm.DB
}

// Save transparently enforces version check — callers don't write lock code.
func (r *LockedOrderRepository) Save(ctx context.Context, order *Order) error {
    result := r.db.WithContext(ctx).
        Model(order).
        Where("version = ?", order.Version).
        Updates(map[string]any{
            "status":  order.Status,
            "version": gorm.Expr("version + 1"),
        })
    if result.Error != nil {
        return result.Error
    }
    if result.RowsAffected == 0 {
        return ErrOptimisticLockConflict
    }
    order.Version++
    return nil
}

// Middleware that auto-acquires pessimistic lock in the transaction:
func PessimisticLockMiddleware(db *gorm.DB) gin.HandlerFunc {
    return func(c *gin.Context) {
        // Attach a locked DB scope to the request context.
        lockedDB := db.Clauses(clause.Locking{Strength: "UPDATE"})
        c.Set("locked_db", lockedDB)
        c.Next()
    }
}
```

### gin / GORM equivalents `[interpretation]`

- The wrapper repository pattern (decorator) is Go's substitute for AOP — wrap the
  real repository with a locking decorator and inject the wrapper instead.
- gin middleware that injects a `lockedDB` into `gin.Context` provides request-scoped
  implicit locking without each handler explicitly calling `clause.Locking`.
- The goal is that no application code path can forget to lock — the infrastructure
  layer enforces it. Test the wrapper in isolation to verify locking behavior.

---

## Session State (Ch. 17)

---

## Client Session State (p. 456)

**Translation**: Direct

Store session data in the HTTP client: JWT claims (stateless), signed cookies
(`gorilla/securecookie`), or URL parameters. No server-side storage.

### Go structure

```go
// JWT-based Client Session State — all state in the token, no server store.
type SessionClaims struct {
    UserID    int64  `json:"user_id"`
    CartItems []int64 `json:"cart_items"`
    jwt.RegisteredClaims
}

func IssueSessionToken(userID int64, cart []int64, secret []byte) (string, error) {
    claims := SessionClaims{
        UserID:    userID,
        CartItems: cart,
        RegisteredClaims: jwt.RegisteredClaims{
            ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
        },
    }
    return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(secret)
}

// gin middleware to extract client session state from the Authorization header:
func SessionMiddleware(secret []byte) gin.HandlerFunc {
    return func(c *gin.Context) {
        tokenStr := c.GetHeader("Authorization")
        // parse + validate tokenStr, set c.Set("session", claims)
        c.Next()
    }
}
```

### gin / GORM equivalents `[interpretation]`

- JWTs are the dominant Go/gin Client Session State mechanism — the token IS the
  session; the server only validates the signature, stores nothing.
- Signed cookies via `gorilla/securecookie` are an alternative for HTML UIs.
- Tradeoff: client session state cannot be invalidated server-side without a blocklist
  (which reintroduces server state) — use short-lived tokens + refresh token rotation.

---

## Server Session State (p. 458)

**Translation**: Direct

Session data lives in server memory or a server-side store (Redis). The client holds
only a session ID (opaque cookie). gin uses `gin-contrib/sessions` for this.

### Go structure

```go
import (
    "github.com/gin-contrib/sessions"
    "github.com/gin-contrib/sessions/redis"
)

func SetupServerSession(r *gin.Engine, redisAddr, secret string) error {
    store, err := redis.NewStore(10, "tcp", redisAddr, "", []byte(secret))
    if err != nil {
        return err
    }
    r.Use(sessions.Sessions("session_id", store))

    r.POST("/cart/add", func(c *gin.Context) {
        session := sessions.Default(c)
        cart, _ := session.Get("cart").([]int64)
        productID, _ := strconv.ParseInt(c.PostForm("product_id"), 10, 64)
        cart = append(cart, productID)
        session.Set("cart", cart)
        _ = session.Save()
        c.JSON(http.StatusOK, gin.H{"cart_count": len(cart)})
    })
    return nil
}
```

### gin / GORM equivalents `[interpretation]`

- `gin-contrib/sessions` with a Redis backend is the standard Go/gin Server Session
  State implementation — opaque cookie holds the session ID, Redis holds the data.
- `sessions.Default(c)` retrieves the session for the current request; `.Save()` flushes
  mutations back to the store.
- Tradeoff vs Client Session State: server sessions can be invalidated instantly
  (delete the Redis key) but require a shared store in multi-instance deployments.

---

## Database Session State (p. 462)

**Translation**: Direct

Persist session rows in a database table. Each session row links to the user and
contains a serialized state blob (JSON). Suitable for long-running multi-step flows.

### Go structure

```go
// Session row stored in the database.
type DBSession struct {
    ID        string          `gorm:"primaryKey;column:id"` // UUID
    UserID    int64           `gorm:"column:user_id;index"`
    State     json.RawMessage `gorm:"column:state;type:jsonb"`
    ExpiresAt time.Time       `gorm:"column:expires_at"`
    CreatedAt time.Time
}

type SessionRepository struct{ db *gorm.DB }

func (r *SessionRepository) Load(ctx context.Context, id string) (*DBSession, error) {
    var s DBSession
    err := r.db.WithContext(ctx).Where("id = ? AND expires_at > NOW()", id).First(&s).Error
    return &s, err
}

func (r *SessionRepository) Save(ctx context.Context, s *DBSession) error {
    return r.db.WithContext(ctx).Save(s).Error
}

func (r *SessionRepository) Delete(ctx context.Context, id string) error {
    return r.db.WithContext(ctx).Delete(&DBSession{}, "id = ?", id).Error
}
```

### gin / GORM equivalents `[interpretation]`

- Suitable for checkout wizards or multi-step forms where session state must survive
  server restarts and must be auditable.
- The session ID is stored in a signed cookie; the session data lives in the DB —
  best of both worlds (stateless cookie + server-side invalidation).
- Add a periodic cleanup job to delete expired sessions:
  `db.Delete(&DBSession{}, "expires_at < NOW()")`.

---

## Base Patterns (Ch. 18)

---

## Gateway (p. 466)

**Translation**: Direct

A struct that wraps access to an external system (payment provider, email API, SMS)
with a typed, error-returning interface. Hides SDK details from the application layer.

### Go structure

```go
// PaymentGateway wraps the external payment provider SDK.
type PaymentGateway interface {
    Charge(ctx context.Context, req ChargeRequest) (*ChargeResult, error)
    Refund(ctx context.Context, chargeID string, amountCents int64) error
}

type StripeGateway struct {
    client *stripe.Client
}

func (g *StripeGateway) Charge(ctx context.Context, req ChargeRequest) (*ChargeResult, error) {
    params := &stripe.ChargeParams{
        Amount:   stripe.Int64(req.AmountCents),
        Currency: stripe.String("usd"),
        Source:   &stripe.SourceParams{Token: stripe.String(req.Token)},
    }
    ch, err := g.client.Charges.New(params)
    if err != nil {
        return nil, fmt.Errorf("stripe charge: %w", err)
    }
    return &ChargeResult{ChargeID: ch.ID, Status: string(ch.Status)}, nil
}
```

### gin / GORM equivalents `[interpretation]`

- The `PaymentGateway` interface is a Separated Interface (p. 476) — the domain package
  defines it, the `stripe` package implements it.
- Wire via Plugin (p. 499): `svc := NewOrderService(StripeGateway{client})` in prod,
  `svc := NewOrderService(&MockPaymentGateway{})` in tests.
- Gateway errors should be wrapped with `fmt.Errorf("...: %w", err)` and translated to
  domain errors (`ErrPaymentDeclined`) at the Gateway boundary.

---

## Mapper (p. 473)

**Translation**: Direct

A struct that mediates between two independent subsystems so neither depends on the other.
Distinct from Data Mapper (p. 165) — the Mapper here is a general-purpose mediator.

### Go structure

```go
// OrderEventMapper translates between domain Order events and the message broker format.
// Neither the domain nor the broker package knows about each other.
type OrderEventMapper struct{}

// Domain event (domain package — no broker dependency):
type OrderPlacedEvent struct {
    OrderID    int64
    CustomerID int64
    TotalCents int64
    PlacedAt   time.Time
}

// Broker message (broker package — no domain dependency):
type BrokerMessage struct {
    Topic   string
    Payload []byte
}

// Mapper sits between them:
func (m *OrderEventMapper) ToMessage(event OrderPlacedEvent) (BrokerMessage, error) {
    payload, err := json.Marshal(event)
    if err != nil {
        return BrokerMessage{}, err
    }
    return BrokerMessage{Topic: "orders.placed", Payload: payload}, nil
}

func (m *OrderEventMapper) FromMessage(msg BrokerMessage) (OrderPlacedEvent, error) {
    var event OrderPlacedEvent
    return event, json.Unmarshal(msg.Payload, &event)
}
```

### gin / GORM equivalents `[interpretation]`

- Mapper is most visible at integration boundaries: domain events <-> message broker,
  domain objects <-> third-party API response structs, domain <-> legacy database schema.
- The Mapper struct lives in its own package — it imports both subsystems but neither
  subsystem imports the Mapper.
- Competes with Gateway when one side can know about the other; use Mapper when strict
  bidirectional independence is required.

---

## Layer Supertype (p. 475)

**Translation**: Adaptation

Go has no abstract base classes. Use struct embedding to share common fields across
all objects in a layer. Behavior (if any) lives on the embedded struct.

### Go structure

```go
// DomainEntity is the Layer Supertype for all domain entities.
// Embed it instead of inheriting from it.
type DomainEntity struct {
    ID        int64     `gorm:"primaryKey;autoIncrement"`
    CreatedAt time.Time `gorm:"autoCreateTime"`
    UpdatedAt time.Time `gorm:"autoUpdateTime"`
}

// Every domain entity embeds DomainEntity:
type Order struct {
    DomainEntity           // embedded — gains ID, CreatedAt, UpdatedAt
    Status     string
    TotalCents int64
}

type Customer struct {
    DomainEntity           // same supertype behavior
    Name  string
    Email string
}

// Shared behavior on the supertype:
func (e *DomainEntity) IsNew() bool { return e.ID == 0 }
func (e *DomainEntity) Age() time.Duration { return time.Since(e.CreatedAt) }
```

### gin / GORM equivalents `[interpretation]`

- `gorm.Model` IS Layer Supertype for GORM Active Record models — embedding it gives
  every model `ID`, `CreatedAt`, `UpdatedAt`, `DeletedAt` consistently.
- For custom supertypes (e.g., `AuditedEntity` with `CreatedBy`/`UpdatedBy`), embed
  the custom struct and fill the fields in a GORM `BeforeCreate`/`BeforeUpdate` hook.
- Layer Supertype is an enabling pattern — use it when multiple types in the same layer
  share enough common structure to justify a shared embedded struct.

---

## Separated Interface (p. 476)

**Translation**: Direct — natural fit in Go

Define an interface in the package that uses it (or a shared `contract/` package).
Put the implementation in a different package. The using package depends only on the
interface, not the implementation.

### Go structure

```go
// domain/repository.go — interface lives with the domain, not the implementation.
package domain

import "context"

type OrderRepository interface {
    FindByID(ctx context.Context, id int64) (*Order, error)
    Save(ctx context.Context, order *Order) error
}

// infrastructure/gorm_order_repo.go — implementation in a different package.
package infrastructure

import (
    "context"
    "myapp/domain"
    "gorm.io/gorm"
)

type GORMOrderRepository struct{ db *gorm.DB }

func (r *GORMOrderRepository) FindByID(ctx context.Context, id int64) (*domain.Order, error) {
    var order domain.Order
    return &order, r.db.WithContext(ctx).First(&order, id).Error
}

// domain package never imports infrastructure — compile-time enforcement.
```

### gin / GORM equivalents `[interpretation]`

- Go's interface system makes Separated Interface the default, not the exception — any
  `interface{}` defined in one package and implemented in another IS Separated Interface.
- Package structure enforces the separation: `domain/` imports nothing from
  `infrastructure/`; `infrastructure/` imports `domain/`.
- This is the foundation for Plugin (p. 499) and Service Stub (p. 504) — both require
  a Separated Interface to work.

---

## Registry (p. 480)

**Translation**: Adaptation

Go's idiomatic approach is dependency injection (pass interfaces at construction time),
not a global registry. Show both; strongly prefer DI in new Go code.

### Go structure

```go
// Option A: Package-level global Registry (Fowler's original — avoid in Go unless necessary).
var defaultRegistry = struct {
    sync.RWMutex
    services map[string]any
}{services: make(map[string]any)}

func RegisterService(name string, svc any) {
    defaultRegistry.Lock()
    defer defaultRegistry.Unlock()
    defaultRegistry.services[name] = svc
}

func GetService(name string) (any, bool) {
    defaultRegistry.RLock()
    defer defaultRegistry.RUnlock()
    v, ok := defaultRegistry.services[name]
    return v, ok
}

// Option B: Typed DI container (preferred in Go) [interpretation]:
type AppContainer struct {
    OrderRepo   domain.OrderRepository
    OrderSvc    *OrderService
    PaymentGW   PaymentGateway
}

func BuildContainer(db *gorm.DB, stripeKey string) *AppContainer {
    repo := &infrastructure.GORMOrderRepository{DB: db}
    gw := &infrastructure.StripeGateway{Key: stripeKey}
    return &AppContainer{OrderRepo: repo, OrderSvc: NewOrderService(repo, gw), PaymentGW: gw}
}
```

### gin / GORM equivalents `[interpretation]`

- Option B (typed `AppContainer`) is preferred in Go — dependencies are explicit,
  type-checked at compile time, and easy to substitute for testing.
- The global Registry (`sync.RWMutex` + `map[string]any`) introduces `any` typing,
  global mutable state, and race conditions — use it only when DI is not feasible.
- Wire the container in `main.go` and pass service fields to gin handler constructors;
  never call a global registry from inside a handler.

---

## Value Object (p. 486)

**Translation**: Direct

Any Go struct where equality is based on field values (not pointer identity) and
which is treated as immutable by convention. Go does not enforce immutability —
use value semantics (pass by value, not pointer) and unexported fields to signal intent.

### Go structure

```go
// Money is a Value Object — equality by value, immutable by convention.
type Money struct {
    cents    int64
    currency string
}

func NewMoney(cents int64, currency string) (Money, error) {
    if currency == "" {
        return Money{}, errors.New("currency required")
    }
    return Money{cents: cents, currency: currency}, nil
}

// Value equality — no pointer comparison needed.
func (m Money) Equal(other Money) bool {
    return m.cents == other.cents && m.currency == other.currency
}

// Mutation returns a NEW value — never mutates in place.
func (m Money) Add(other Money) (Money, error) {
    if m.currency != other.currency {
        return Money{}, fmt.Errorf("currency mismatch: %s vs %s", m.currency, other.currency)
    }
    return Money{cents: m.cents + other.cents, currency: m.currency}, nil
}

func (m Money) IsZero() bool { return m.cents == 0 }
```

### gin / GORM equivalents `[interpretation]`

- Pass `Money` by value (not pointer) in function signatures — value semantics signal
  immutability to callers.
- Store in DB via Embedded Value (p. 268): `gorm:"embedded;embeddedPrefix:price_"` maps
  `Money{cents, currency}` to `price_cents` and `price_currency` columns.
- Go does not enforce immutability; the convention is: unexported fields + all methods
  return new values. Document this clearly in the type's godoc comment.

---

## Money (p. 488)

**Translation**: Adaptation

Go has no operator overloading. Arithmetic is explicit via methods. Use `int64` cents
internally (never `float64`). Return `error` on currency mismatch.

### Go structure

```go
// Money represents a monetary value with currency and correct arithmetic.
type Money struct {
    cents    int64  // internal representation: smallest currency unit
    currency string // ISO 4217 code: "USD", "EUR"
}

func NewMoney(cents int64, currency string) Money {
    return Money{cents: cents, currency: currency}
}

func (m Money) Cents() int64     { return m.cents }
func (m Money) Currency() string { return m.currency }

func (m Money) Add(other Money) (Money, error) {
    if m.currency != other.currency {
        return Money{}, fmt.Errorf("cannot add %s to %s", other.currency, m.currency)
    }
    return Money{cents: m.cents + other.cents, currency: m.currency}, nil
}

func (m Money) Multiply(factor int64) Money {
    return Money{cents: m.cents * factor, currency: m.currency}
}

// Allocation avoids rounding errors — distributes remainder as pennies.
func (m Money) Allocate(ratios []int) ([]Money, error) {
    total := 0
    for _, r := range ratios { total += r }
    if total == 0 { return nil, errors.New("ratios sum to zero") }
    result := make([]Money, len(ratios))
    remainder := m.cents
    for i, r := range ratios {
        result[i] = Money{cents: m.cents * int64(r) / int64(total), currency: m.currency}
        remainder -= result[i].cents
    }
    for i := 0; remainder > 0; i++ {
        result[i].cents++
        remainder--
    }
    return result, nil
}
```

### gin / GORM equivalents `[interpretation]`

- Never use `float64` for money — use `int64` cents to avoid IEEE-754 rounding errors.
- `Allocate()` implements Fowler's penny-distribution algorithm: divides a total into
  shares that sum exactly to the original amount with no rounding loss.
- Store as two columns (`amount_cents INT8`, `amount_currency VARCHAR(3)`) via Embedded
  Value; deserialize from JSON as `{"cents": 1099, "currency": "USD"}`.

---

## Special Case (p. 496)

**Translation**: Conceptual translation `[interpretation]`

Go's multiple return values `(T, error)` handle many null cases. For the Special Case
pattern (polymorphic null object): define an interface, implement both the real struct
and a "null" struct that returns safe defaults — no nil checks needed in callers.

### Go structure

```go
// Customer is the domain interface — callers use this, not the concrete types.
type Customer interface {
    Name() string
    Email() string
    DiscountRate() float64
}

// RealCustomer is the normal case.
type RealCustomer struct {
    name  string
    email string
}

func (c *RealCustomer) Name() string         { return c.name }
func (c *RealCustomer) Email() string        { return c.email }
func (c *RealCustomer) DiscountRate() float64 { return 0.0 }

// UnknownCustomer is the Special Case — safe defaults, no nil panics.
type UnknownCustomer struct{}

func (u *UnknownCustomer) Name() string         { return "Guest" }
func (u *UnknownCustomer) Email() string        { return "" }
func (u *UnknownCustomer) DiscountRate() float64 { return 0.0 }

// Factory returns the Special Case instead of nil when the customer is not found:
func FindCustomer(ctx context.Context, db *gorm.DB, id int64) Customer {
    var c RealCustomer
    if err := db.WithContext(ctx).First(&c, id).Error; errors.Is(err, gorm.ErrRecordNotFound) {
        return &UnknownCustomer{} // never nil
    }
    return &c
}
```

### gin / GORM equivalents `[interpretation]`

- The caller uses `customer.Name()` without any nil check or type assertion —
  polymorphism handles the missing-customer case transparently.
- Fowler notes Special Case eliminates `if customer == nil { ... }` scattered throughout
  the code — in Go this becomes eliminating `if customer == nil` or `if err == ErrNotFound`.
- Most commonly applied to: missing users, missing configuration, missing payment methods,
  and empty collections (return an empty-slice implementation, not nil).

---

## Plugin (p. 499)

**Translation**: Direct — natural fit in Go

Interface injection at construction time. Pass the real implementation in production,
a mock or stub in tests. Wire in `main.go` or a DI setup function.

### Go structure

```go
// OrderService depends on interfaces, not concrete implementations.
type OrderService struct {
    orders  OrderRepository  // Separated Interface
    payment PaymentGateway   // Separated Interface
    mailer  Mailer           // Separated Interface
}

func NewOrderService(
    orders OrderRepository,
    payment PaymentGateway,
    mailer Mailer,
) *OrderService {
    return &OrderService{orders: orders, payment: payment, mailer: mailer}
}

// Production wiring (main.go):
// svc := NewOrderService(
//     &GORMOrderRepository{db},
//     &StripeGateway{key: stripeKey},
//     &SMTPMailer{addr: smtpAddr},
// )

// Test wiring:
// svc := NewOrderService(
//     &InMemoryOrderRepository{},
//     &MockPaymentGateway{},
//     &NoOpMailer{},
// )
```

### gin / GORM equivalents `[interpretation]`

- Go's interface system makes Plugin the default construction pattern — constructor
  functions accepting interface parameters ARE Plugin.
- No configuration file or reflection needed: Go interfaces are structural (implicit)
  so any struct implementing the interface methods satisfies it at compile time.
- Plugin is the mechanism that makes both Service Stub (test implementations) and
  Gateway (external system wrappers) interchangeable without code changes.

---

## Service Stub (p. 504)

**Translation**: Direct

A struct implementing a Gateway interface with canned (hardcoded) responses.
Injected via Plugin in test wiring. No external calls, no network, deterministic.

### Go structure

```go
// PaymentGateway interface (from Gateway pattern — defined in domain or shared package).
type PaymentGateway interface {
    Charge(ctx context.Context, req ChargeRequest) (*ChargeResult, error)
}

// StubPaymentGateway is a Service Stub — canned responses for tests.
type StubPaymentGateway struct {
    // Configure canned responses per test:
    ChargeResult *ChargeResult
    ChargeError  error
    // Capture calls for assertion:
    ReceivedRequests []ChargeRequest
}

func (s *StubPaymentGateway) Charge(ctx context.Context, req ChargeRequest) (*ChargeResult, error) {
    s.ReceivedRequests = append(s.ReceivedRequests, req)
    return s.ChargeResult, s.ChargeError
}

// In a test:
// stub := &StubPaymentGateway{ChargeResult: &ChargeResult{ChargeID: "ch_123", Status: "succeeded"}}
// svc := NewOrderService(repo, stub, mailer)
// _, err := svc.PlaceOrder(ctx, cmd)
// assert.Len(t, stub.ReceivedRequests, 1)
```

### gin / GORM equivalents `[interpretation]`

- Service Stub is always injected through a Plugin (interface parameter) — never
  hardcode which implementation to use inside the service.
- For HTTP-level stubs (when testing code that makes outbound HTTP calls), use
  `httptest.NewServer(handler)` to stand up a real server with canned responses.
- Distinguish Service Stub (canned responses, stateless) from Fake (working
  implementation, e.g., `InMemoryOrderRepository`) — Fowler treats them differently.

---

## Record Set (p. 508)

**Translation**: Conceptual translation `[interpretation]`

Fowler's Record Set is a language-integrated in-memory tabular data structure (like
ADO.NET `DataSet`). Go has no equivalent standard library type. The closest Go mapping
is a `[]map[string]any` (for dynamic schema) or a typed slice of scan structs
(for known schema). Neither matches the full Record Set API.

### Go structure

```go
// Option A: Typed Record Set — slice of structs (known schema, preferred).
type OrderRecord struct {
    ID         int64
    Status     string
    TotalCents int64
}

func QueryOrders(ctx context.Context, db *sql.DB, status string) ([]OrderRecord, error) {
    rows, err := db.QueryContext(ctx, "SELECT id, status, total_cents FROM orders WHERE status = $1", status)
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    var result []OrderRecord
    for rows.Next() {
        var r OrderRecord
        if err := rows.Scan(&r.ID, &r.Status, &r.TotalCents); err != nil {
            return nil, err
        }
        result = append(result, r)
    }
    return result, rows.Err()
}

// Option B: Dynamic Record Set — slice of string maps (unknown schema, avoid if possible).
func QueryDynamic(ctx context.Context, db *sql.DB, query string) ([]map[string]any, error) {
    rows, err := db.QueryContext(ctx, query)
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    cols, _ := rows.Columns()
    var result []map[string]any
    for rows.Next() {
        vals := make([]any, len(cols))
        ptrs := make([]any, len(cols))
        for i := range vals { ptrs[i] = &vals[i] }
        if err := rows.Scan(ptrs...); err != nil {
            return nil, err
        }
        row := make(map[string]any, len(cols))
        for i, col := range cols { row[col] = vals[i] }
        result = append(result, row)
    }
    return result, rows.Err()
}
```

### gin / GORM equivalents `[interpretation]`

- Go has no language-integrated Record Set. Option A (typed struct slice) is the Go
  idiom and covers 95% of use cases with full type safety.
- Option B (`[]map[string]any`) approximates the dynamic-schema Record Set for
  schema-agnostic tooling (query explorers, generic export APIs) at the cost of type safety.
- GORM's `db.Raw(query).Scan(&result)` scans into typed structs or `[]map[string]any`
  depending on the target type — GORM's flexible scan IS the closest thing to Record Set.
- Record Set's primary value in 2002 was UI data binding to data-aware controls; Go web
  APIs have no equivalent — return typed DTOs to JSON clients instead.
