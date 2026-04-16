# DDD Concept & Pattern Catalog — TypeScript Reference

**Stack**: TypeScript 5.x, NestJS 10+, TypeORM/Prisma
**Note**: Strategic patterns have no code examples.
**Anti-hallucination policy**: All code is `[interpretation]`.

---

## Layered Architecture (p. 52)

### TypeScript structure `[interpretation]`

```typescript
// NestJS enforces layers via modules and decorators
// src/
//   app.module.ts              ← UI / presentation (controllers)
//   order/
//     order.controller.ts      ← Application layer (thin)
//     order.service.ts         ← Application service (orchestration)
//     domain/
//       order.entity.ts        ← Domain layer (pure logic)
//       order.repository.ts    ← Domain port (interface)
//     infra/
//       order.typeorm-repo.ts  ← Infrastructure (adapter)

// Domain layer has ZERO imports from NestJS or TypeORM
// Application layer imports domain; infra implements domain ports
```

### Framework equivalents `[interpretation]`

- NestJS modules (`@Module`) naturally map to bounded layers
- `@Controller` = UI/presentation layer
- `@Injectable` services = application layer orchestration
- Domain layer: plain TypeScript classes, no decorators
- Infrastructure: TypeORM repositories, HTTP clients, message brokers

---

## Entities (p. 65)

### TypeScript structure `[interpretation]`

```typescript
export class Order {
  constructor(
    private readonly _id: OrderId,
    private _status: OrderStatus,
    private _lineItems: LineItem[],
  ) {}

  get id(): OrderId { return this._id; }

  addItem(product: Product, qty: number): void {
    if (this._status !== OrderStatus.DRAFT)
      throw new Error('Cannot modify a submitted order');
    this._lineItems.push(LineItem.create(product, qty));
  }

  equals(other: Order): boolean {
    return this._id.equals(other._id);
  }
}
```

### Framework equivalents `[interpretation]`

- TypeORM `@Entity()` decorates the persistence model, not the domain entity
- Use a separate domain class and map to/from the ORM entity in the repository
- Prisma: domain entity is a plain class; Prisma model lives in `schema.prisma`

---

## Value Objects (p. 70)

### TypeScript structure `[interpretation]`

```typescript
export class Money {
  private constructor(
    readonly amount: number,
    readonly currency: string,
  ) {
    if (amount < 0) throw new Error('Amount must be non-negative');
    Object.freeze(this);
  }

  static of(amount: number, currency: string): Money {
    return new Money(amount, currency);
  }

  add(other: Money): Money {
    if (this.currency !== other.currency)
      throw new Error('Currency mismatch');
    return Money.of(this.amount + other.amount, this.currency);
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }
}
```

### Framework equivalents `[interpretation]`

- `Object.freeze(this)` in constructor enforces immutability
- TypeORM: embed via `@Column(() => Money)` or use a transformer
- Prisma: map to/from flat fields in the repository layer
- `readonly` modifier on all fields prevents reassignment

---

## Services (p. 75)

### TypeScript structure `[interpretation]`

```typescript
// Domain service — pure logic, no framework dependency
export class PricingService {
  calculateDiscount(order: Order, customer: Customer): Money {
    if (customer.isVip() && order.totalAbove(Money.of(100, 'USD'))) {
      return order.total().multiply(0.1);
    }
    return Money.of(0, order.currency);
  }
}

// Application service — NestJS orchestration
@Injectable()
export class PlaceOrderService {
  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly pricing: PricingService,
  ) {}

  async execute(cmd: PlaceOrderCommand): Promise<OrderId> {
    const order = Order.create(cmd.customerId, cmd.items);
    const discount = this.pricing.calculateDiscount(order, cmd.customer);
    order.applyDiscount(discount);
    await this.orderRepo.save(order);
    return order.id;
  }
}
```

### Framework equivalents `[interpretation]`

- Domain services: plain classes, injected manually or via NestJS custom providers
- Application services: `@Injectable()` with constructor injection
- Never put domain logic in `@Controller` methods
- CQRS: separate command and query services via NestJS `@nestjs/cqrs`

---

## Modules (p. 79)

### TypeScript structure `[interpretation]`

```typescript
// Each bounded domain concept = one NestJS module
// src/order/order.module.ts
@Module({
  imports: [TypeOrmModule.forFeature([OrderOrmEntity])],
  controllers: [OrderController],
  providers: [
    PlaceOrderService,
    PricingService,
    { provide: 'OrderRepository', useClass: TypeOrmOrderRepository },
  ],
  exports: [PlaceOrderService], // public API of this module
})
export class OrderModule {}

// Modules mirror Ubiquitous Language concepts:
//   OrderModule, ShippingModule, InventoryModule
// NOT: UtilsModule, HelpersModule, CommonModule
```

### Framework equivalents `[interpretation]`

- NestJS `@Module` maps directly to DDD Modules
- `exports` array defines the module's public interface
- Use `forwardRef()` sparingly — circular module deps signal misaligned contours
- Barrel files (`index.ts`) expose the module's public types

---

## Aggregates (p. 89)

### TypeScript structure `[interpretation]`

```typescript
export class Order {
  private readonly _id: OrderId;
  private _lineItems: LineItem[] = [];
  private _status: OrderStatus = OrderStatus.DRAFT;

  static create(customerId: CustomerId): Order {
    const order = new Order();
    order._id = OrderId.generate();
    return order;
  }

  addItem(product: ProductSnapshot, qty: number): void {
    this.assertDraft();
    const existing = this._lineItems.find(li => li.productId.equals(product.id));
    if (existing) { existing.increaseQty(qty); }
    else { this._lineItems.push(LineItem.create(product, qty)); }
  }

  submit(): void {
    this.assertDraft();
    if (this._lineItems.length === 0)
      throw new Error('Cannot submit empty order');
    this._status = OrderStatus.SUBMITTED;
  }

  private assertDraft(): void {
    if (this._status !== OrderStatus.DRAFT)
      throw new Error('Order is not in draft state');
  }
}
// LineItem is NOT accessible outside Order — no public repo for it
```

### Framework equivalents `[interpretation]`

- Aggregate root is the only `@Entity` exposed to the repository
- TypeORM: child entities use `@OneToMany` with `cascade: true`, `eager: true`
- Prisma: use nested writes (`create: { lineItems: { create: [...] } }`)
- Version column (`@VersionColumn()`) enables optimistic concurrency

---

## Factories (p. 98)

### TypeScript structure `[interpretation]`

```typescript
export class OrderFactory {
  static createFromQuote(quote: Quote, customer: Customer): Order {
    if (quote.isExpired())
      throw new Error('Cannot create order from expired quote');

    const order = Order.create(customer.id);
    for (const item of quote.items) {
      order.addItem(
        ProductSnapshot.from(item.product),
        item.quantity,
      );
    }
    return order;
  }

  static reconstitute(raw: OrderRecord): Order {
    // Used by repository to rebuild from persistence
    return new Order(
      OrderId.from(raw.id),
      raw.lineItems.map(LineItem.reconstitute),
      raw.status as OrderStatus,
    );
  }
}
```

### Framework equivalents `[interpretation]`

- Creation factory: static methods or standalone factory classes
- Reconstitution factory: lives in the infrastructure layer, called by repository
- TypeORM: `afterLoad` hook can serve as reconstitution point, but keep domain logic out
- NestJS: factories can be `@Injectable()` when they need dependencies

---

## Repositories (p. 106)

### TypeScript structure `[interpretation]`

```typescript
// Domain port — no framework imports
export interface OrderRepository {
  findById(id: OrderId): Promise<Order | null>;
  save(order: Order): Promise<void>;
  nextId(): OrderId;
}

// Infrastructure adapter
@Injectable()
export class TypeOrmOrderRepository implements OrderRepository {
  constructor(
    @InjectRepository(OrderOrmEntity)
    private readonly ormRepo: Repository<OrderOrmEntity>,
  ) {}

  async findById(id: OrderId): Promise<Order | null> {
    const record = await this.ormRepo.findOne({
      where: { id: id.value },
      relations: ['lineItems'],
    });
    return record ? OrderFactory.reconstitute(record) : null;
  }

  async save(order: Order): Promise<void> {
    const record = OrderMapper.toOrm(order);
    await this.ormRepo.save(record);
  }

  nextId(): OrderId { return OrderId.generate(); }
}
```

### Framework equivalents `[interpretation]`

- Domain interface in `domain/` folder; implementation in `infra/` folder
- NestJS DI: bind via `{ provide: 'OrderRepository', useClass: TypeOrmOrderRepository }`
- Prisma alternative: `PrismaOrderRepository` calls `prisma.order.findUnique()`
- Repository returns domain objects, never ORM entities or raw rows

---

## Specification (p. 158)

### TypeScript structure `[interpretation]`

```typescript
export interface Specification<T> {
  isSatisfiedBy(candidate: T): boolean;
  and(other: Specification<T>): Specification<T>;
  or(other: Specification<T>): Specification<T>;
  not(): Specification<T>;
}

export abstract class CompositeSpecification<T> implements Specification<T> {
  abstract isSatisfiedBy(candidate: T): boolean;

  and(other: Specification<T>): Specification<T> {
    return new AndSpecification(this, other);
  }
  or(other: Specification<T>): Specification<T> {
    return new OrSpecification(this, other);
  }
  not(): Specification<T> {
    return new NotSpecification(this);
  }
}

export class EligibleForFreeShipping extends CompositeSpecification<Order> {
  isSatisfiedBy(order: Order): boolean {
    return order.total().amount >= 50 && order.destination().isDomestic();
  }
}
```

### Framework equivalents `[interpretation]`

- Can integrate with TypeORM query builders for repository-level filtering
- Use `.toQueryBuilder()` method on specs for database-side evaluation
- NestJS pipes/guards can delegate to specifications for validation

---

## Intention-Revealing Interfaces (p. 172)

### TypeScript structure `[interpretation]`

```typescript
// BAD: What does "process" mean? What is the boolean?
// order.process(true);

// GOOD: Names reveal intent
export class Order {
  submitForFulfillment(): void { /* ... */ }
  cancelWithReason(reason: CancellationReason): void { /* ... */ }
  isEligibleForRefund(): boolean { /* ... */ }
}

// Method names describe WHAT, not HOW
export interface ShippingRateCalculator {
  estimateDeliveryRate(
    parcel: Parcel,
    destination: Address,
  ): Promise<ShippingRate>;
  // NOT: "runAlgorithm" or "doCalc"
}
```

### Framework equivalents `[interpretation]`

- NestJS controller routes should also reveal intent: `@Post('submit')` not `@Post('action')`
- DTOs named by use case: `PlaceOrderDto`, not `OrderInput`
- Custom decorators: `@RequiresPermission('order:write')` reveals policy

---

## Side-Effect-Free Functions (p. 175)

### TypeScript structure `[interpretation]`

```typescript
export class Money {
  // QUERY — returns value, no mutation
  add(other: Money): Money {
    return Money.of(this.amount + other.amount, this.currency);
  }

  // QUERY — pure computation
  isGreaterThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amount > other.amount;
  }
}

export class Order {
  // COMMAND — mutates state, returns void
  submit(): void {
    this._status = OrderStatus.SUBMITTED;
  }

  // QUERY — no mutation
  calculateTotal(): Money {
    return this._lineItems.reduce(
      (sum, item) => sum.add(item.subtotal()),
      Money.of(0, this._currency),
    );
  }
}
// Rule: Value Objects → all side-effect-free
// Rule: Entities → separate commands from queries
```

### Framework equivalents `[interpretation]`

- Value Object methods always return new instances (immutable)
- Distinguish `@Get` (query) from `@Post`/`@Put` (command) at controller level
- CQRS naturally enforces this separation across the application layer

---

## Assertions (p. 179)

### TypeScript structure `[interpretation]`

```typescript
export class Order {
  submit(): void {
    // PRE-CONDITION
    if (this._lineItems.length === 0)
      throw new EmptyOrderError();

    this._status = OrderStatus.SUBMITTED;

    // POST-CONDITION (invariant assertion)
    this.assertInvariant();
  }

  private assertInvariant(): void {
    if (this._status === OrderStatus.SUBMITTED && this._lineItems.length === 0)
      throw new InvariantViolationError(
        'Submitted order must have at least one line item',
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

- Use class-validator for DTO-level assertions: `@IsNotEmpty()`, `@Min(1)`
- Domain invariants live inside domain classes, not in validation pipes
- NestJS exception filters translate domain errors to HTTP responses

---

## Conceptual Contours (p. 183)

### TypeScript structure `[interpretation]`

```typescript
// BAD: One class does pricing, tax, and discount — mixed contours
// class OrderCalculator { calcPrice(); calcTax(); calcDiscount(); }

// GOOD: Each concept has its own natural boundary
export class PricingPolicy {
  priceFor(product: Product, qty: number): Money { /* ... */ }
}

export class TaxCalculator {
  taxFor(subtotal: Money, jurisdiction: TaxJurisdiction): Money { /* ... */ }
}

export class DiscountPolicy {
  discountFor(order: Order, customer: Customer): Money { /* ... */ }
}

// These boundaries align with how domain experts think:
// "pricing", "tax", and "discounts" are separate concerns
// They change for different reasons and at different rates
```

### Framework equivalents `[interpretation]`

- Each concept maps to a NestJS provider with a focused interface
- Module boundaries should follow domain contours, not technical layers
- If two services always change together, merge them; if one splits, refactor

---

## Standalone Classes (p. 188)

### TypeScript structure `[interpretation]`

```typescript
// Money is standalone: it depends on nothing outside itself
export class Money {
  private constructor(
    readonly amount: number,
    readonly currency: string,
  ) { Object.freeze(this); }

  static of(amount: number, currency: string): Money {
    return new Money(amount, currency);
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) throw new CurrencyMismatchError();
    return Money.of(this.amount + other.amount, this.currency);
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }
}
// Zero imports from domain or infrastructure — fully self-contained
// Easiest to test, reuse, and reason about
```

### Framework equivalents `[interpretation]`

- Standalone classes need no NestJS module registration — they are plain TS
- Ideal candidates for a shared kernel package
- If a "standalone" class accumulates 3+ imports, it has lost its independence

---

## Closure of Operations (p. 190)

### TypeScript structure `[interpretation]`

```typescript
export class Money {
  add(other: Money): Money {          // Money -> Money
    return Money.of(this.amount + other.amount, this.currency);
  }

  multiply(factor: number): Money {   // Money -> Money
    return Money.of(this.amount * factor, this.currency);
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

- TypeORM `QueryBuilder` uses closure of operations: `.where().andWhere().orderBy()`
- RxJS operators compose the same way: `pipe(map(), filter(), reduce())`
- Fluent builder patterns in DTOs follow this principle

---
