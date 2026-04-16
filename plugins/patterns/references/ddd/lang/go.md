# DDD Concept & Pattern Catalog — Go Reference

**Stack**: Go 1.22+, gin, GORM
**Note**: Strategic patterns have no code. Translation classification per pattern.
**Anti-hallucination policy**: All code is `[interpretation]`.

---

## Layered Architecture (p. 52)

**Translation**: Direct

### Go structure `[interpretation]`

```go
// Project layout — enforced by package imports
// cmd/api/main.go                  ← bootstrap (gin router)
// internal/
//   handler/order_handler.go       ← Presentation layer (gin handlers)
//   application/place_order.go     ← Application service (orchestration)
//   domain/order/
//     order.go                     ← Domain layer (pure logic)
//     repository.go                ← Domain port (interface)
//   infra/
//     gorm_order_repo.go           ← Infrastructure (adapter)

// Domain package: ZERO imports of gin, gorm, or external libs
// Application imports domain; infra implements domain interfaces
// Handler imports application; never domain directly
```

### Framework equivalents `[interpretation]`

- `internal/` directory prevents external packages from importing your layers
- Domain package: only stdlib imports (`errors`, `fmt`, `time`)
- gin handlers = presentation layer
- GORM models live in `infra/`, never in `domain/`
- Dependency injection via constructor functions — no framework needed

---

## Entities (p. 65)

**Translation**: Adaptation — Go has no classes; use structs with methods and explicit ID comparison

### Go structure `[interpretation]`

```go
type Order struct {
    id        OrderID
    status    OrderStatus
    lineItems []LineItem
}

func (o *Order) ID() OrderID { return o.id }

func (o *Order) AddItem(product Product, qty int) error {
    if o.status != StatusDraft {
        return ErrInvalidState("cannot modify submitted order")
    }
    o.lineItems = append(o.lineItems, NewLineItem(product, qty))
    return nil
}

func (o *Order) Equals(other *Order) bool {
    return o.id == other.id // identity equality, not structural
}

// Unexported fields enforce encapsulation
// Mutation only through methods on *Order (pointer receiver)
```

### Framework equivalents `[interpretation]`

- Unexported fields (lowercase) enforce encapsulation — Go's primary access control
- GORM model is a separate struct in `infra/`; map in the repository
- Pointer receiver (`*Order`) for methods that mutate state
- `OrderID` as a named type (`type OrderID string`) prevents accidental mixing

---

## Value Objects (p. 70)

**Translation**: Adaptation — immutability via value receivers and unexported fields

### Go structure `[interpretation]`

```go
type Money struct {
    amount   int64  // cents
    currency string
}

func NewMoney(amount int64, currency string) (Money, error) {
    if amount < 0 {
        return Money{}, errors.New("amount must be non-negative")
    }
    return Money{amount: amount, currency: currency}, nil
}

func (m Money) Amount() int64   { return m.amount }
func (m Money) Currency() string { return m.currency }

func (m Money) Add(other Money) (Money, error) {
    if m.currency != other.currency {
        return Money{}, errors.New("currency mismatch")
    }
    return NewMoney(m.amount+other.amount, m.currency)
}

func (m Money) Equals(other Money) bool {
    return m.amount == other.amount && m.currency == other.currency
}

// Value receiver (not pointer) — callers get a copy, original is unchanged
// All methods return new values — never mutate
```

### Framework equivalents `[interpretation]`

- Value receiver methods = immutability by convention (caller gets a copy)
- Unexported fields + constructor function = controlled creation
- GORM: store as flat columns, reconstruct in repository layer
- `Equals` compares all fields — no identity; structural equality

---

## Services (p. 75)

**Translation**: Adaptation — no classes; structs with interface dependencies

### Go structure `[interpretation]`

```go
// Domain service — pure function, no framework deps
func CalculateDiscount(order *Order, customer *Customer) Money {
    if customer.IsVIP() && order.TotalAbove(MustNewMoney(10000, "USD")) {
        return order.Total().MultiplyPercent(10)
    }
    return ZeroMoney(order.Currency())
}

// Application service — orchestration
type PlaceOrderService struct {
    repo OrderRepository
}

func NewPlaceOrderService(repo OrderRepository) *PlaceOrderService {
    return &PlaceOrderService{repo: repo}
}

func (s *PlaceOrderService) Execute(ctx context.Context, cmd PlaceOrderCommand) (OrderID, error) {
    order, err := NewOrder(cmd.CustomerID, cmd.Items)
    if err != nil { return "", fmt.Errorf("create order: %w", err) }
    discount := CalculateDiscount(order, cmd.Customer)
    order.ApplyDiscount(discount)
    if err := s.repo.Save(ctx, order); err != nil {
        return "", fmt.Errorf("save order: %w", err)
    }
    return order.ID(), nil
}
```

### Framework equivalents `[interpretation]`

- Domain services: package-level functions with no external imports
- Application services: structs with interface fields, injected via constructor
- gin handler receives `*PlaceOrderService` and calls `Execute`
- `context.Context` propagates deadlines and cancellation through the stack

---

## Modules (p. 79)

**Translation**: Direct — Go packages map naturally to DDD Modules

### Go structure `[interpretation]`

```go
// internal/domain/order/        ← one package = one DDD Module
//   order.go                    ← Order aggregate
//   line_item.go                ← internal type (unexported or package-private)
//   repository.go               ← OrderRepository interface
//   order_id.go                 ← OrderID value object

// internal/domain/shipping/     ← separate module
//   shipment.go
//   carrier.go

// Package = module boundary
// Exported types (uppercase) = module's public API
// Unexported types (lowercase) = internal implementation

// Package names mirror Ubiquitous Language:
//   order, shipping, inventory
// NOT: utils, helpers, common
```

### Framework equivalents `[interpretation]`

- Go packages = compile-time enforced module boundaries
- Exported (uppercase) vs unexported (lowercase) = public vs internal API
- `internal/` directory prevents external access to implementation packages
- Circular imports are a compile error — enforces acyclic dependencies

---

## Aggregates (p. 89)

**Translation**: Adaptation — unexported fields and methods enforce aggregate boundaries

### Go structure `[interpretation]`

```go
type Order struct {
    id        OrderID
    lineItems []LineItem // owned — LineItem has no independent existence
    status    OrderStatus
}

func NewOrder(customerID CustomerID) *Order {
    return &Order{
        id:     GenerateOrderID(),
        status: StatusDraft,
    }
}

func (o *Order) AddItem(snapshot ProductSnapshot, qty int) error {
    if err := o.assertDraft(); err != nil { return err }
    for i, li := range o.lineItems {
        if li.ProductID() == snapshot.ID() {
            o.lineItems[i].IncreaseQty(qty)
            return nil
        }
    }
    o.lineItems = append(o.lineItems, NewLineItem(snapshot, qty))
    return nil
}

func (o *Order) Submit() error {
    if err := o.assertDraft(); err != nil { return err }
    if len(o.lineItems) == 0 {
        return ErrEmptyOrder
    }
    o.status = StatusSubmitted
    return nil
}

func (o *Order) assertDraft() error {
    if o.status != StatusDraft { return ErrInvalidState }
    return nil
}
// LineItem is unexported or has no repository — only reachable through Order
```

### Framework equivalents `[interpretation]`

- Unexported `lineItems` field — no external access to children
- GORM: `has many` association with `ON DELETE CASCADE`
- Use `gorm.DB.Transaction()` to persist aggregate atomically
- Optimistic locking: `version` column checked in UPDATE WHERE clause

---

## Factories (p. 98)

**Translation**: Adaptation — constructor functions replace factory classes

### Go structure `[interpretation]`

```go
// Creation factory — package-level function
func OrderFromQuote(quote *Quote, customerID CustomerID) (*Order, error) {
    if quote.IsExpired() {
        return nil, ErrExpiredQuote
    }
    order := NewOrder(customerID)
    for _, item := range quote.Items() {
        if err := order.AddItem(SnapshotFrom(item.Product()), item.Quantity()); err != nil {
            return nil, fmt.Errorf("add item: %w", err)
        }
    }
    return order, nil
}

// Reconstitution factory — in infra package
func reconstituteOrder(row OrderRow, items []LineItemRow) *Order {
    return &Order{
        id:     OrderID(row.ID),
        status: OrderStatus(row.Status),
        lineItems: mapLineItems(items),
    }
}
```

### Framework equivalents `[interpretation]`

- Creation: `OrderFromQuote()` — descriptive function name
- Reconstitution: unexported function in infra package, called by repository
- Go has no constructor overloading; use `NewX`, `XFromY` naming conventions
- Functional options pattern (`WithShipping()`, `WithDiscount()`) for complex creation

---

## Repositories (p. 106)

**Translation**: Direct — Go interfaces map perfectly to repository ports

### Go structure `[interpretation]`

```go
// Domain port — interface in domain package
type OrderRepository interface {
    FindByID(ctx context.Context, id OrderID) (*Order, error)
    Save(ctx context.Context, order *Order) error
    NextID() OrderID
}

// Infrastructure adapter — in infra package
type GormOrderRepository struct {
    db *gorm.DB
}

func NewGormOrderRepository(db *gorm.DB) *GormOrderRepository {
    return &GormOrderRepository{db: db}
}

func (r *GormOrderRepository) FindByID(ctx context.Context, id OrderID) (*Order, error) {
    var row OrderModel
    if err := r.db.WithContext(ctx).Preload("LineItems").First(&row, "id = ?", string(id)).Error; err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) { return nil, nil }
        return nil, fmt.Errorf("find order: %w", err)
    }
    return reconstituteOrder(row, row.LineItems), nil
}

func (r *GormOrderRepository) Save(ctx context.Context, order *Order) error {
    model := toGormModel(order)
    return r.db.WithContext(ctx).Save(&model).Error
}

func (r *GormOrderRepository) NextID() OrderID { return GenerateOrderID() }
```

### Framework equivalents `[interpretation]`

- Go interfaces are implicit — `GormOrderRepository` satisfies `OrderRepository` without declaration
- GORM `Preload` loads aggregate children eagerly
- Repository returns domain types (`*Order`), never GORM models
- `context.Context` as first parameter for cancellation and deadline propagation

---

## Specification (p. 158)

**Translation**: Conceptual — Go uses function types or interfaces instead of class hierarchies

### Go structure `[interpretation]`

```go
// Specification as a function type — idiomatic Go
type Specification[T any] func(candidate T) bool

func (s Specification[T]) And(other Specification[T]) Specification[T] {
    return func(c T) bool { return s(c) && other(c) }
}

func (s Specification[T]) Or(other Specification[T]) Specification[T] {
    return func(c T) bool { return s(c) || other(c) }
}

func (s Specification[T]) Not() Specification[T] {
    return func(c T) bool { return !s(c) }
}

// Concrete specification
func EligibleForFreeShipping() Specification[*Order] {
    return func(order *Order) bool {
        return order.Total().Amount() >= 5000 && order.Destination().IsDomestic()
    }
}

// Compose:
spec := EligibleForFreeShipping().And(HasVerifiedAddress())
for _, order := range orders {
    if spec(order) { /* ... */ }
}
```

### Framework equivalents `[interpretation]`

- Go generics (1.18+) enable type-safe specification pattern
- Function types with methods = lightweight, composable predicates
- Can generate GORM `Where` clauses via a `ToGormScope` method
- Alternative: interface-based approach for specs that need state

---

## Intention-Revealing Interfaces (p. 172)

**Translation**: Direct

### Go structure `[interpretation]`

```go
// BAD: Unclear intent
// order.Process(true)
// func DoThing(o *Order, flag bool)

// GOOD: Names reveal domain meaning
func (o *Order) SubmitForFulfillment() error { /* ... */ }
func (o *Order) CancelWithReason(reason CancellationReason) error { /* ... */ }
func (o *Order) IsEligibleForRefund() bool { /* ... */ }

// Interface names describe capability, not mechanism
type ShippingRateCalculator interface {
    EstimateDeliveryRate(parcel Parcel, dest Address) (ShippingRate, error)
    // NOT: RunAlgorithm() or DoCalc()
}

// gin route naming reveals intent:
// router.POST("/orders/:id/submit")  NOT  router.POST("/orders/:id/action")
```

### Framework equivalents `[interpretation]`

- Small interfaces (1-3 methods) = idiomatic Go; name reveals single responsibility
- Named return values document intent: `func (o *Order) Total() (total Money, err error)`
- Type aliases reveal domain meaning: `type CustomerID string`
- Error variables describe what went wrong: `ErrOrderAlreadySubmitted`

---

## Side-Effect-Free Functions (p. 175)

**Translation**: Adaptation — value vs pointer receiver signals intent

### Go structure `[interpretation]`

```go
// QUERY — value receiver, returns new value
func (m Money) Add(other Money) (Money, error) {
    if m.currency != other.currency { return Money{}, ErrCurrencyMismatch }
    return NewMoney(m.amount+other.amount, m.currency)
}

// QUERY — value receiver, pure computation
func (m Money) IsGreaterThan(other Money) bool {
    return m.amount > other.amount
}

// COMMAND — pointer receiver, mutates state
func (o *Order) Submit() error {
    o.status = StatusSubmitted
    return nil
}

// QUERY — pointer receiver but no mutation (large struct, avoid copy)
func (o *Order) CalculateTotal() Money {
    total := ZeroMoney(o.currency)
    for _, item := range o.lineItems {
        total, _ = total.Add(item.Subtotal())
    }
    return total
}
// Value receiver = query (copy semantics)
// Pointer receiver + mutation = command
```

### Framework equivalents `[interpretation]`

- Value receivers guarantee the original is not modified (copy semantics)
- Pointer receivers signal potential mutation — review carefully
- gin: GET handlers = queries; POST/PUT handlers = commands
- Pure functions are trivially testable — no setup or mocking needed

---

## Assertions (p. 179)

**Translation**: Adaptation — error returns replace exceptions; no debug_assert equivalent

### Go structure `[interpretation]`

```go
func (o *Order) Submit() error {
    // PRE-CONDITION
    if len(o.lineItems) == 0 {
        return ErrEmptyOrder
    }

    o.status = StatusSubmitted

    // POST-CONDITION (invariant check)
    o.assertInvariant()
    return nil
}

func (o *Order) assertInvariant() {
    if o.status == StatusSubmitted && len(o.lineItems) == 0 {
        // Panic for invariant violations — these are programmer errors
        panic("invariant: submitted order must have >= 1 line item")
    }
}

// Document contracts in comments:
// Submit transitions order from DRAFT to SUBMITTED.
// Pre: order has at least one line item.
// Post: order.status == StatusSubmitted.
// Invariant: submitted orders always have >= 1 line item.
```

### Framework equivalents `[interpretation]`

- `error` return for recoverable pre-condition failures (expected)
- `panic` for invariant violations (programmer errors, never expected)
- Sentinel errors (`var ErrEmptyOrder = errors.New(...)`) for typed pre-conditions
- Custom error types implement `error` interface for rich domain error info

---

## Conceptual Contours (p. 183)

**Translation**: Direct — Go packages naturally align with domain concepts

### Go structure `[interpretation]`

```go
// BAD: One package handles pricing, tax, and discounts
// package calculator
// func CalcPrice(); func CalcTax(); func CalcDiscount()

// GOOD: Each concept has its own package
// internal/domain/pricing/
package pricing
type Policy struct{}
func (p *Policy) PriceFor(product Product, qty int) Money { /* ... */ }

// internal/domain/tax/
package tax
type Calculator struct{}
func (c *Calculator) TaxFor(subtotal Money, jurisdiction TaxJurisdiction) Money { /* ... */ }

// internal/domain/discount/
package discount
type Policy struct{}
func (p *Policy) DiscountFor(order *Order, customer *Customer) Money { /* ... */ }

// Package names match how domain experts think:
// "pricing", "tax", "discounts" change independently
```

### Framework equivalents `[interpretation]`

- Each concept = a Go package with a focused exported API
- If two packages always change together, merge them
- If one package splits by concern, that signals misaligned contours
- gin handler groups can mirror conceptual contours in route organization

---

## Standalone Classes (p. 188)

**Translation**: Direct — Go structs with zero external imports

### Go structure `[interpretation]`

```go
// package money — standalone, zero imports from other domain packages
package money

import "errors"

type Money struct {
    amount   int64
    currency string
}

func New(amount int64, currency string) (Money, error) {
    if amount < 0 { return Money{}, errors.New("amount must be non-negative") }
    return Money{amount: amount, currency: currency}, nil
}

func (m Money) Add(other Money) (Money, error) {
    if m.currency != other.currency { return Money{}, errors.New("currency mismatch") }
    return New(m.amount+other.amount, m.currency)
}

func (m Money) Equals(other Money) bool {
    return m.amount == other.amount && m.currency == other.currency
}
// Only imports "errors" — fully self-contained
// No dependencies on any other domain package
```

### Framework equivalents `[interpretation]`

- Standalone packages: only stdlib imports (`errors`, `fmt`)
- Ideal for a shared Go module (`go.example.com/domain-primitives`)
- Easiest to test, reuse, and reason about
- If imports accumulate, the package has lost its standalone quality

---

## Closure of Operations (p. 190)

**Translation**: Adaptation — method chaining less idiomatic due to error returns

### Go structure `[interpretation]`

```go
func (m Money) Add(other Money) (Money, error) {   // Money -> Money
    return New(m.amount+other.amount, m.currency)
}

func (m Money) Multiply(factor int64) Money {        // Money -> Money
    return Money{amount: m.amount * factor, currency: m.currency}
}

// Chaining is less fluent due to error returns:
subtotal, err := basePrice.Add(shippingFee)
if err != nil { return Money{}, err }
total, err := subtotal.Multiply(110).Add(handlingFee) // mixed
if err != nil { return Money{}, err }

// Specification exhibits clean closure (no errors):
spec := EligibleForFreeShipping().
    And(HasVerifiedAddress()).
    Or(VIPCustomer())          // Specification -> Specification
```

### Framework equivalents `[interpretation]`

- GORM query builder uses closure: `db.Where().Order().Limit()`
- Go's error handling makes long chains less fluent than other languages
- Functional options pattern: `NewServer(WithPort(8080), WithTimeout(30))` — closure-like
- Specification composition is the cleanest Go example of this pattern

---
