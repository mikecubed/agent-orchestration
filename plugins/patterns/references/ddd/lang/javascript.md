# DDD Concept & Pattern Catalog — JavaScript Reference

**Stack**: Node.js 22+, Express, Sequelize, ES2024
**Note**: Strategic patterns have no code examples.
**Anti-hallucination policy**: All code is `[interpretation]`.

---

## Layered Architecture (p. 52)

### JavaScript structure `[interpretation]`

```javascript
// src/
//   app.js                        ← Express app setup
//   routes/order.routes.js        ← UI / presentation layer
//   services/placeOrder.js        ← Application layer (orchestration)
//   domain/
//     order.js                    ← Domain layer (pure logic)
//     orderRepository.js          ← Domain port (interface / duck type)
//   infra/
//     sequelizeOrderRepo.js       ← Infrastructure (adapter)
//     sequelize/models/order.js   ← Sequelize model definition

// Domain layer: ZERO imports from express, sequelize, or node:*
// Application layer: imports domain; infra implements domain ports
// Routes call services; services call domain; infra implements ports
```

### Framework equivalents `[interpretation]`

- Express routers = presentation layer
- Service modules = application layer orchestration
- Domain folder: plain ES modules with classes or factory functions
- `infra/`: Sequelize models, HTTP clients, message queue adapters
- Dependency injection via constructor parameters or a lightweight container (awilix)

---

## Entities (p. 65)

### JavaScript structure `[interpretation]`

```javascript
export class Order {
  #id;
  #status;
  #lineItems;

  constructor(id, status, lineItems) {
    this.#id = id;
    this.#status = status;
    this.#lineItems = [...lineItems];
  }

  get id() { return this.#id; }

  addItem(product, qty) {
    if (this.#status !== 'DRAFT')
      throw new Error('Cannot modify a submitted order');
    this.#lineItems.push(LineItem.create(product, qty));
  }

  submit() {
    if (this.#status !== 'DRAFT')
      throw new Error('Order has already been submitted');
    this.#status = 'SUBMITTED';
  }

  equals(other) {
    return other instanceof Order && this.#id.equals(other.id);
  }
}
```

### Framework equivalents `[interpretation]`

- Use `#privateFields` (ES2022+) to enforce encapsulation
- Sequelize model is the persistence model, NOT the domain entity
- Map between Sequelize `dataValues` and domain entity in the repository
- Identity equality: compare by `id`, not by structural comparison

---

## Value Objects (p. 70)

### JavaScript structure `[interpretation]`

```javascript
export class Money {
  #amount;
  #currency;

  constructor(amount, currency) {
    if (amount < 0) throw new Error('Amount must be non-negative');
    this.#amount = amount;
    this.#currency = currency;
    Object.freeze(this);
  }

  get amount() { return this.#amount; }
  get currency() { return this.#currency; }

  static of(amount, currency) {
    return new Money(amount, currency);
  }

  add(other) {
    if (this.#currency !== other.currency)
      throw new Error('Currency mismatch');
    return Money.of(this.#amount + other.amount, this.#currency);
  }

  multiply(factor) {
    return Money.of(this.#amount * factor, this.#currency);
  }

  equals(other) {
    return other instanceof Money
      && this.#amount === other.amount
      && this.#currency === other.currency;
  }
}
```

### Framework equivalents `[interpretation]`

- `Object.freeze(this)` in constructor enforces immutability
- Sequelize: store as flat columns, reconstruct in repository layer
- `equals()` compares all attributes — no identity field
- Private fields prevent external access; `Object.freeze` prevents public property changes but does not prevent internal mutation via class methods

---

## Services (p. 75)

### JavaScript structure `[interpretation]`

```javascript
// Domain service — pure logic, no framework deps
export class PricingService {
  calculateDiscount(order, customer) {
    if (customer.isVip() && order.totalAbove(Money.of(100, 'USD'))) {
      return order.total().multiply(0.1);
    }
    return Money.of(0, order.currency);
  }
}

// Application service — orchestration
export class PlaceOrderService {
  #orderRepo;
  #pricing;

  constructor(orderRepo, pricing) {
    this.#orderRepo = orderRepo;
    this.#pricing = pricing;
  }

  async execute(command) {
    const order = Order.create(command.customerId, command.items);
    const discount = this.#pricing.calculateDiscount(order, command.customer);
    order.applyDiscount(discount);
    await this.#orderRepo.save(order);
    return order.id;
  }
}
```

### Framework equivalents `[interpretation]`

- Domain services: plain classes with no Express or Sequelize imports
- Application services: injected via constructor (manual DI or awilix container)
- Express route handler calls the application service, never domain logic directly
- Stateless: no instance-level mutable state between calls

---

## Modules (p. 79)

### JavaScript structure `[interpretation]`

```javascript
// Each domain concept = a directory with an index.js barrel
// src/order/
//   index.js            ← public API (barrel re-exports)
//   domain/order.js
//   domain/lineItem.js
//   domain/orderRepository.js
//   services/placeOrder.js
//   infra/sequelizeOrderRepo.js

// src/order/index.js — module's public interface
export { Order } from './domain/order.js';
export { PlaceOrderService } from './services/placeOrder.js';
export { OrderRepository } from './domain/orderRepository.js';
// LineItem is internal — NOT exported

// Modules mirror Ubiquitous Language:
//   order/, shipping/, inventory/
// NOT: utils/, helpers/, common/
```

### Framework equivalents `[interpretation]`

- `index.js` barrel files define module boundaries
- Express router per module: `order.routes.js`, `shipping.routes.js`
- ES module `import` paths enforce dependency direction
- If two modules form a circular import, they likely belong together or need an interface

---

## Aggregates (p. 89)

### JavaScript structure `[interpretation]`

```javascript
export class Order {
  #id;
  #lineItems;
  #status;

  constructor(id, lineItems = [], status = 'DRAFT') {
    this.#id = id;
    this.#lineItems = lineItems;
    this.#status = status;
  }

  static create(customerId) {
    return new Order(OrderId.generate());
  }

  addItem(productSnapshot, qty) {
    this.#assertDraft();
    const existing = this.#lineItems.find(
      li => li.productId.equals(productSnapshot.id),
    );
    if (existing) { existing.increaseQty(qty); }
    else { this.#lineItems.push(LineItem.create(productSnapshot, qty)); }
  }

  submit() {
    this.#assertDraft();
    if (this.#lineItems.length === 0)
      throw new Error('Cannot submit empty order');
    this.#status = 'SUBMITTED';
  }

  #assertDraft() {
    if (this.#status !== 'DRAFT')
      throw new Error('Order is not in draft state');
  }
}
// LineItem has no public repository — only reachable through Order
```

### Framework equivalents `[interpretation]`

- Aggregate root is the only entity exposed to the repository
- Sequelize: child models use `hasMany` with `onDelete: 'CASCADE'`
- Use Sequelize transactions to persist aggregate atomically
- Optimistic locking: `version` column with `@Version` or manual check

---

## Factories (p. 98)

### JavaScript structure `[interpretation]`

```javascript
export class OrderFactory {
  static createFromQuote(quote, customer) {
    if (quote.isExpired())
      throw new Error('Cannot create order from expired quote');

    const order = Order.create(customer.id);
    for (const item of quote.items) {
      order.addItem(ProductSnapshot.from(item.product), item.quantity);
    }
    return order;
  }

  static reconstitute(raw) {
    // Used by repository to rebuild from persistence
    return new Order(
      OrderId.from(raw.id),
      raw.lineItems.map(LineItem.reconstitute),
      raw.status,
    );
  }
}
```

### Framework equivalents `[interpretation]`

- Creation factory: static methods or standalone factory functions
- Reconstitution factory: lives in infra layer, called by repository
- Sequelize hooks (`afterFind`) can trigger reconstitution but keep domain logic out
- Factory enforces all invariants at creation time

---

## Repositories (p. 106)

### JavaScript structure `[interpretation]`

```javascript
// Domain port — duck-typed interface (documented contract)
/** @interface OrderRepository */
// { findById(id): Promise<Order|null>, save(order): Promise<void> }

// Infrastructure adapter
export class SequelizeOrderRepository {
  #OrderModel;
  #LineItemModel;

  constructor(OrderModel, LineItemModel) {
    this.#OrderModel = OrderModel;
    this.#LineItemModel = LineItemModel;
  }

  async findById(id) {
    const record = await this.#OrderModel.findByPk(id.value, {
      include: [{ model: this.#LineItemModel, as: 'lineItems' }],
    });
    return record ? OrderFactory.reconstitute(record.toJSON()) : null;
  }

  async save(order) {
    const data = OrderMapper.toPersistence(order);
    await this.#OrderModel.upsert(data, {
      include: [{ model: this.#LineItemModel, as: 'lineItems' }],
    });
  }
}
```

### Framework equivalents `[interpretation]`

- No `interface` keyword in JS — document the contract with JSDoc or a base class
- Sequelize `findByPk` + `include` loads aggregate with children
- Repository returns domain objects, never Sequelize model instances
- Use `sequelize.transaction()` to wrap save operations atomically

---

## Specification (p. 158)

### JavaScript structure `[interpretation]`

```javascript
export class Specification {
  isSatisfiedBy(candidate) {
    throw new Error('Subclass must implement isSatisfiedBy');
  }

  and(other) { return new AndSpecification(this, other); }
  or(other) { return new OrSpecification(this, other); }
  not() { return new NotSpecification(this); }
}

class AndSpecification extends Specification {
  #left; #right;
  constructor(left, right) { super(); this.#left = left; this.#right = right; }
  isSatisfiedBy(c) { return this.#left.isSatisfiedBy(c) && this.#right.isSatisfiedBy(c); }
}

export class EligibleForFreeShipping extends Specification {
  isSatisfiedBy(order) {
    return order.total().amount >= 50 && order.destination().isDomestic();
  }
}

// Usage:
const spec = new EligibleForFreeShipping().and(new HasVerifiedAddress());
const eligible = orders.filter(o => spec.isSatisfiedBy(o));
```

### Framework equivalents `[interpretation]`

- Can integrate with Sequelize `where` clauses for database-level filtering
- Specs can generate Sequelize `Op` conditions via a `toSequelizeWhere()` method
- Composable predicates replace scattered `if` chains in service code

---

## Intention-Revealing Interfaces (p. 172)

### JavaScript structure `[interpretation]`

```javascript
// BAD: Unclear intent
// order.process(true);
// order.update({ s: 2 });

// GOOD: Names reveal domain meaning
export class Order {
  submitForFulfillment() { /* ... */ }
  cancelWithReason(reason) { /* ... */ }
  isEligibleForRefund() { /* ... */ }
}

// Function names describe WHAT, not HOW
/** @param {Parcel} parcel  @param {Address} dest */
export function estimateDeliveryRate(parcel, dest) { /* ... */ }
// NOT: runCalc(), doProcess(), handleStuff()

// Route naming also reveals intent:
// router.post('/orders/:id/submit')  NOT  router.post('/orders/:id/action')
```

### Framework equivalents `[interpretation]`

- Express routes: use descriptive paths (`/orders/:id/submit` not `/orders/:id/do`)
- Service method names match Ubiquitous Language verbs
- JSDoc on exported functions documents intent and contracts
- Name DTOs by use case: `PlaceOrderInput`, not `OrderData`

---

## Side-Effect-Free Functions (p. 175)

### JavaScript structure `[interpretation]`

```javascript
export class Money {
  // QUERY — returns new value, no mutation
  add(other) {
    return Money.of(this.#amount + other.amount, this.#currency);
  }

  // QUERY — pure computation
  isGreaterThan(other) {
    this.#assertSameCurrency(other);
    return this.#amount > other.amount;
  }
}

export class Order {
  // COMMAND — mutates state, returns nothing
  submit() {
    this.#status = 'SUBMITTED';
  }

  // QUERY — no mutation
  calculateTotal() {
    return this.#lineItems.reduce(
      (sum, item) => sum.add(item.subtotal()),
      Money.of(0, this.#currency),
    );
  }
}
// Value Objects: all methods side-effect-free
// Entities: separate commands (mutate) from queries (read)
```

### Framework equivalents `[interpretation]`

- Value Objects always return new instances — never mutate
- Express: `GET` handlers = queries, `POST`/`PUT` handlers = commands
- Pure functions are trivially testable — no setup or mocking needed

---

## Assertions (p. 179)

### JavaScript structure `[interpretation]`

```javascript
export class Order {
  submit() {
    // PRE-CONDITION
    if (this.#lineItems.length === 0)
      throw new EmptyOrderError('Order must have at least one item');

    this.#status = 'SUBMITTED';

    // POST-CONDITION (invariant)
    this.#assertInvariant();
  }

  #assertInvariant() {
    if (this.#status === 'SUBMITTED' && this.#lineItems.length === 0)
      throw new InvariantViolationError(
        'Submitted order must have >= 1 line item',
      );
  }
}

// Document contracts in JSDoc:
/**
 * @pre order is in DRAFT status
 * @post order status becomes SUBMITTED
 * @invariant submitted orders always have >= 1 line item
 */
```

### Framework equivalents `[interpretation]`

- Use `node:assert` for internal invariant checks in development
- Express validation middleware (express-validator, joi) for input assertions
- Domain invariants live inside domain classes, not in middleware
- Error classes extend `Error` with domain-specific names

---

## Conceptual Contours (p. 183)

### JavaScript structure `[interpretation]`

```javascript
// BAD: One module handles pricing, tax, and discounts
// orderCalculator.js → calcPrice(), calcTax(), calcDiscount()

// GOOD: Each concept has its own module matching domain boundaries
// pricing/pricingPolicy.js
export class PricingPolicy {
  priceFor(product, qty) { /* ... */ }
}

// tax/taxCalculator.js
export class TaxCalculator {
  taxFor(subtotal, jurisdiction) { /* ... */ }
}

// discount/discountPolicy.js
export class DiscountPolicy {
  discountFor(order, customer) { /* ... */ }
}

// These match how domain experts talk about the business:
// "pricing", "tax", and "discounts" change independently
```

### Framework equivalents `[interpretation]`

- Each concept = a focused module with its own barrel export
- If two modules always change together, merge them
- If one module splits by concern, that signals misaligned contours
- Express middleware can be organized by conceptual contour, not by technical layer

---

## Standalone Classes (p. 188)

### JavaScript structure `[interpretation]`

```javascript
// Money is standalone — zero imports from domain or infrastructure
export class Money {
  #amount;
  #currency;

  constructor(amount, currency) {
    if (amount < 0) throw new Error('Amount must be non-negative');
    this.#amount = amount;
    this.#currency = currency;
    Object.freeze(this);
  }

  static of(amount, currency) { return new Money(amount, currency); }

  add(other) {
    if (this.#currency !== other.currency) throw new Error('Currency mismatch');
    return Money.of(this.#amount + other.amount, this.#currency);
  }

  multiply(factor) {
    return Money.of(this.#amount * factor, this.#currency);
  }

  equals(other) {
    return other instanceof Money
      && this.#amount === other.amount
      && this.#currency === other.currency;
  }
}
// No imports at all — fully self-contained
// Easiest to test, reuse, and reason about
```

### Framework equivalents `[interpretation]`

- Standalone classes need no DI container registration — just import and use
- Ideal for a shared kernel or `@org/domain-primitives` package
- If a "standalone" class acquires 3+ imports, reconsider its boundaries

---

## Closure of Operations (p. 190)

### JavaScript structure `[interpretation]`

```javascript
export class Money {
  add(other) {                     // Money -> Money
    return Money.of(this.#amount + other.amount, this.#currency);
  }

  multiply(factor) {               // Money -> Money
    return Money.of(this.#amount * factor, this.#currency);
  }
}

// Enables natural chaining:
const total = basePrice
  .add(shippingFee)
  .multiply(1.1)       // tax
  .add(handlingFee);

// Specification also exhibits closure:
const eligible = freeShippingSpec
  .and(domesticSpec)
  .or(vipCustomerSpec);  // Specification -> Specification
```

### Framework equivalents `[interpretation]`

- Sequelize query composition can exhibit closure by combining `where` conditions with `Op.and` / `Op.or` into larger query objects
- Array methods exhibit closure: `.filter().map().reduce()`
- Fluent APIs and builder patterns follow this principle naturally

---
