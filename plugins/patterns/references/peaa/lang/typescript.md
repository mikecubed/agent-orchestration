# PEAA Pattern Catalog — TypeScript / NestJS Reference

**Purpose**: TypeScript code examples and NestJS + TypeORM/Prisma framework equivalents for
all 51 PEAA patterns. Use alongside `catalog-core.md` (language-agnostic definitions) and
`catalog-index.md` (quick-find table).

**Stack coverage**: TypeScript 5.x, NestJS 10+, TypeORM 0.3+ or Prisma 5+, class-validator

**Anti-hallucination policy**: Code examples are adapted from Fowler's structural descriptions
and tagged `[interpretation]`. Framework equivalents are `[interpretation]` throughout.
Direct Fowler content is in `catalog-core.md`, not this file.

**NestJS pattern mappings** `[interpretation]`:
- NestJS `@Injectable()` providers = Service Layer (p. 133)
- NestJS `@Module()` = natural application boundary (Service Layer boundary)
- TypeORM `@Entity()` classes = Active Record (p. 160) when using `ActiveRecord` base, Data Mapper (p. 165) when using Repository pattern
- Prisma models = Data Mapper style (schema separate from query logic)
- NestJS `@InjectRepository()` = Repository (p. 322)
- NestJS request-scoped providers = Unit of Work (p. 184) approximation
- NestJS `ValidationPipe` + class-validator = Value Object validation (p. 486)
- NestJS `APP_INTERCEPTOR` / `APP_GUARD` = Front Controller interceptor chain (p. 344)

---

## Domain Logic (Ch. 9)

---

## Transaction Script (p. 110)

### TypeScript structure

```typescript
// Flat procedural service method — one method per business transaction [interpretation]
@Injectable()
export class OrderService {
  constructor(private readonly db: DataSource) {}

  async placeOrder(customerId: number, items: OrderItemDto[]): Promise<void> {
    const runner = this.db.createQueryRunner();
    await runner.startTransaction();
    try {
      const customer = await runner.manager.findOneOrFail(Customer, { where: { id: customerId } });
      const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
      if (customer.creditLimit < total) throw new Error('Insufficient credit');
      const order = runner.manager.create(Order, { customerId, total, status: 'PLACED' });
      await runner.manager.save(order);
      customer.creditLimit -= total;
      await runner.manager.save(customer);
      await runner.commitTransaction();
    } catch (err) {
      await runner.rollbackTransaction();
      throw err;
    } finally {
      await runner.release();
    }
  }
}
```

### NestJS / TypeORM equivalents `[interpretation]`

- A NestJS `@Injectable()` service method that does all domain logic inline (no separate domain objects) is the canonical Transaction Script form.
- `DataSource.createQueryRunner()` with manual commit/rollback maps directly to the transaction boundary Fowler describes.
- Prefer this pattern only for simple, non-overlapping business rules; escalate to Domain Model when scripts begin sharing logic.

---

## Domain Model (p. 116)

### TypeScript structure

```typescript
// Domain objects carry both data and behavior [interpretation]
export class Order {
  private items: OrderItem[] = [];
  private status: 'DRAFT' | 'PLACED' | 'SHIPPED' = 'DRAFT';

  addItem(product: Product, qty: number): void {
    if (this.status !== 'DRAFT') throw new Error('Cannot modify placed order');
    this.items.push(new OrderItem(product, qty));
  }

  get total(): Money {
    return this.items.reduce((sum, i) => sum.add(i.subtotal()), Money.zero('USD'));
  }

  place(): void {
    if (this.items.length === 0) throw new Error('Order has no items');
    this.status = 'PLACED';
  }
}

export class OrderItem {
  constructor(readonly product: Product, readonly qty: number) {}
  subtotal(): Money { return this.product.price.multiply(this.qty); }
}
```

### NestJS / TypeORM equivalents `[interpretation]`

- TypeORM entities decorated with `@Entity()` can be rich domain objects — add methods, getters, and validation directly on the class; TypeORM persists only `@Column()` fields.
- Pair with the Data Mapper pattern (Repository) so domain objects remain persistence-ignorant; avoid extending `BaseEntity` in a rich domain model.
- NestJS does not constrain domain model placement — keep domain classes in a `domain/` module that has zero NestJS imports.

---

## Table Module (p. 125)

### TypeScript structure

```typescript
// Single class handles all logic for one table; operates over a record set [interpretation]
export class OrderTableModule {
  constructor(private readonly db: DataSource) {}

  async getOrdersForCustomer(customerId: number): Promise<OrderRecord[]> {
    return this.db.query(
      'SELECT * FROM orders WHERE customer_id = $1', [customerId]
    );
  }

  calculateDiscount(orders: OrderRecord[]): number {
    const total = orders.reduce((s, o) => s + o.total, 0);
    return total > 1000 ? 0.1 : 0;
  }
}

interface OrderRecord { id: number; customerId: number; total: number; status: string; }
```

### NestJS / TypeORM equivalents `[interpretation]`

- Table Module fits poorly in NestJS because the framework encourages entity-per-class, not table-per-class modules. Use only if consuming raw `DataSource.query()` results without entity mapping.
- The `Record Set` pattern (p. 508) is the natural data carrier; TypeScript arrays of plain interfaces serve that role.
- In practice, prefer Transaction Script or Domain Model in a NestJS project; Table Module rarely appears here.

---

## Service Layer (p. 133)

### TypeScript structure

```typescript
// Application boundary: thin orchestration, delegates to domain [interpretation]
@Injectable()
export class OrderApplicationService {
  constructor(
    private readonly orders: OrderRepository,
    private readonly mailer: MailerService,
  ) {}

  async confirmOrder(orderId: number): Promise<void> {
    const order = await this.orders.findById(orderId);
    order.place();                          // domain behavior
    await this.orders.save(order);
    await this.mailer.sendConfirmation(order.customerEmail);
  }
}
```

### NestJS / TypeORM equivalents `[interpretation]`

- Every NestJS `@Injectable()` service is a natural Service Layer participant; `@Module()` boundaries define the application boundary Fowler describes.
- Service Layer methods should be thin: load → call domain → save → notify. Business rules belong on domain objects, not here.
- NestJS `@UseGuards()` and `@UseInterceptors()` handle cross-cutting concerns (auth, logging) without polluting Service Layer methods.

---

## Data Source Architecture (Ch. 10)

---

## Table Data Gateway (p. 144)

### TypeScript structure

```typescript
// One class, one table, returns plain data structures [interpretation]
@Injectable()
export class OrderGateway {
  constructor(private readonly db: DataSource) {}

  async findAll(): Promise<RawOrder[]> {
    return this.db.query('SELECT * FROM orders');
  }

  async findById(id: number): Promise<RawOrder | null> {
    const rows = await this.db.query('SELECT * FROM orders WHERE id = $1', [id]);
    return rows[0] ?? null;
  }

  async insert(data: NewOrderData): Promise<number> {
    const result = await this.db.query(
      'INSERT INTO orders(customer_id, total) VALUES($1,$2) RETURNING id',
      [data.customerId, data.total]
    );
    return result[0].id;
  }
}
```

### NestJS / TypeORM equivalents `[interpretation]`

- Pairs with Transaction Script; rarely used alongside a full Domain Model in NestJS.
- TypeORM's `DataSource.query()` provides the raw SQL layer needed. Alternatively wrap a TypeORM `Repository` in a thin gateway class.
- Prefer this over hand-rolled SQL when adopting Table Module; for Domain Model projects use Data Mapper / Repository instead.

---

## Row Data Gateway (p. 152)

### TypeScript structure

```typescript
// One object per row; knows how to find/save/delete itself [interpretation]
export class OrderRow {
  id!: number;
  customerId!: number;
  total!: number;

  constructor(private readonly db: DataSource) {}

  static async findById(db: DataSource, id: number): Promise<OrderRow> {
    const [row] = await db.query('SELECT * FROM orders WHERE id=$1', [id]);
    return Object.assign(new OrderRow(db), row);
  }

  async save(): Promise<void> {
    await this.db.query(
      'UPDATE orders SET total=$1 WHERE id=$2', [this.total, this.id]
    );
  }

  async delete(): Promise<void> {
    await this.db.query('DELETE FROM orders WHERE id=$1', [this.id]);
  }
}
```

### NestJS / TypeORM equivalents `[interpretation]`

- Row Data Gateway sits between Active Record and raw SQL. TypeORM does not ship this variant; you build it manually with `DataSource.query()`.
- The object carries no domain logic (unlike Active Record) — just data access. Keep business methods off this class.
- In NestJS, this is rarely chosen; Active Record or Data Mapper covers the same ground more ergonomically.

---

## Active Record (p. 160)

### TypeScript structure

```typescript
// Domain object that also persists itself; TypeORM BaseEntity mode [interpretation]
import { BaseEntity, Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('orders')
export class Order extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  customerId!: number;

  @Column('decimal')
  total!: number;

  // Domain behavior alongside persistence
  canBeCancelled(): boolean {
    return this.total < 500;
  }

  // Static finders inherited from BaseEntity: Order.find(), Order.findOne(), etc.
}

// Usage
const order = await Order.findOneOrFail({ where: { id: 42 } });
await order.save();
```

### NestJS / TypeORM equivalents `[interpretation]`

- TypeORM's `BaseEntity` base class is a first-class Active Record implementation; extends adds `save()`, `remove()`, `find()` etc. directly on the entity.
- Active Record couples domain objects to the database — appropriate for simple CRUD apps; switch to Data Mapper (Repository) when domain complexity grows.
- In NestJS, inject `DataSource` or use `BaseEntity` static methods. Avoid mixing `@InjectRepository()` with `BaseEntity` — pick one mode per entity.

---

## Data Mapper (p. 165)

### TypeScript structure

```typescript
// Domain object is persistence-ignorant; a separate mapper/repository handles persistence [interpretation]
export class Order {           // pure domain — no TypeORM imports
  constructor(
    public id: number,
    public customerId: number,
    public total: number,
  ) {}

  place(): void { /* domain behavior */ }
}

@Injectable()
export class OrderMapper {
  constructor(@InjectRepository(OrderEntity) private repo: Repository<OrderEntity>) {}

  async findById(id: number): Promise<Order> {
    const entity = await this.repo.findOneOrFail({ where: { id } });
    return new Order(entity.id, entity.customerId, entity.total);
  }

  async save(order: Order): Promise<void> {
    await this.repo.save({ id: order.id, customerId: order.customerId, total: order.total });
  }
}
```

### NestJS / TypeORM equivalents `[interpretation]`

- TypeORM's Repository mode (non-`BaseEntity`) is a Data Mapper implementation: entities are plain data holders, `Repository<T>` is the mapper.
- Prisma is inherently Data Mapper style — Prisma Client acts as the mapper; generated types are separate from any domain classes you write.
- `@InjectRepository(Entity)` in NestJS injects the TypeORM mapper for that entity — this is the standard NestJS Data Mapper wiring.

---

## OR Behavioral (Ch. 11)

---

## Unit of Work (p. 184)

### TypeScript structure

```typescript
// Tracks dirty/new/removed objects; flushes in one transaction [interpretation]
@Injectable({ scope: Scope.REQUEST })   // request-scoped = one UoW per HTTP request
export class UnitOfWork {
  constructor(private readonly db: DataSource) {}

  async execute<T>(work: (em: EntityManager) => Promise<T>): Promise<T> {
    return this.db.transaction(async (em) => work(em));
  }
}

// Usage in a service
@Injectable()
export class OrderService {
  constructor(private readonly uow: UnitOfWork) {}

  async transferOrder(fromId: number, toId: number): Promise<void> {
    await this.uow.execute(async (em) => {
      const order = await em.findOneOrFail(OrderEntity, { where: { id: fromId } });
      order.customerId = toId;
      await em.save(order);           // UoW tracks and flushes here
    });
  }
}
```

### NestJS / TypeORM equivalents `[interpretation]`

- TypeORM's `DataSource.transaction(em => ...)` is the closest built-in Unit of Work: the EntityManager tracks all changes and commits them atomically.
- `QueryRunner` with manual `startTransaction` / `commitTransaction` / `rollbackTransaction` gives finer control and maps to Fowler's explicit registration model.
- Request-scoped providers (`Scope.REQUEST`) approximate a per-request Unit of Work lifecycle; TypeORM does not ship an explicit `UnitOfWork` class.

---

## Identity Map (p. 195)

### TypeScript structure

```typescript
// Cache: maps database identity → single in-memory instance [interpretation]
export class IdentityMap<T extends { id: number }> {
  private readonly cache = new Map<number, T>();

  get(id: number): T | undefined { return this.cache.get(id); }
  set(entity: T): void { this.cache.set(entity.id, entity); }
  clear(): void { this.cache.clear(); }
}

// Mapper consulting Identity Map before hitting DB [interpretation]
@Injectable({ scope: Scope.REQUEST })
export class OrderRepository {
  private readonly map = new IdentityMap<Order>();

  async findById(id: number): Promise<Order> {
    const cached = this.map.get(id);
    if (cached) return cached;
    const entity = await this.typeormRepo.findOneOrFail({ where: { id } });
    const order = toDomain(entity);
    this.map.set(order);
    return order;
  }
}
```

### NestJS / TypeORM equivalents `[interpretation]`

- TypeORM's `EntityManager` maintains an internal Identity Map within a `QueryRunner` transaction scope — objects loaded twice in one transaction return the same reference.
- This is automatic in TypeORM; you only build it manually when implementing a custom Data Mapper outside TypeORM.
- Request-scoped repositories in NestJS approximate per-request Identity Map lifetime.

---

## Lazy Load (p. 200)

### TypeScript structure

```typescript
// TypeORM relation with lazy: true — returns a Promise [interpretation]
@Entity()
export class Customer extends BaseEntity {
  @PrimaryGeneratedColumn() id!: number;
  @Column() name!: string;

  @OneToMany(() => Order, (o) => o.customer, { lazy: true })
  orders!: Promise<Order[]>;   // not loaded until awaited
}

// Alternatively: virtual proxy approach [interpretation]
export class LazyReference<T> {
  private loaded = false;
  private value?: T;
  constructor(private readonly loader: () => Promise<T>) {}

  async get(): Promise<T> {
    if (!this.loaded) { this.value = await this.loader(); this.loaded = true; }
    return this.value!;
  }
}
```

### NestJS / TypeORM equivalents `[interpretation]`

- TypeORM supports Fowler's four variants: `lazy: true` on relations (virtual proxy via Promise), eager loading (`eager: true`), and explicit `relations: [...]` on `find()` (initialization).
- Fowler's "ghost" (partial object) maps to TypeORM's `select: ['id', 'name']` partial loading.
- Avoid `lazy: true` in NestJS API handlers — it can fire N+1 queries; prefer explicit `relations` or QueryBuilder `leftJoinAndSelect`.

---

## OR Structural (Ch. 12)

---

## Identity Field (p. 216)

### TypeScript structure

```typescript
// The database primary key stored on the in-memory object [interpretation]
@Entity()
export class Product {
  @PrimaryGeneratedColumn()           // surrogate key — integer, DB-generated
  id!: number;

  // Alternative: natural key
  // @PrimaryColumn()
  // isbn!: string;

  // Alternative: UUID
  // @PrimaryGeneratedColumn('uuid')
  // id!: string;

  @Column() name!: string;
}
```

### NestJS / TypeORM equivalents `[interpretation]`

- `@PrimaryGeneratedColumn()` = surrogate Identity Field (auto-increment); `@PrimaryColumn()` = natural key; `@PrimaryGeneratedColumn('uuid')` = UUID surrogate.
- Composite keys use `@PrimaryColumn()` on multiple fields; TypeORM supports compound primary keys without a separate surrogate.
- Fowler recommends surrogate keys — `@PrimaryGeneratedColumn()` is the NestJS/TypeORM default and the safe choice.

---

## Foreign Key Mapping (p. 236)

### TypeScript structure

```typescript
// Single-valued association mapped to a FK column [interpretation]
@Entity()
export class Order {
  @PrimaryGeneratedColumn() id!: number;

  @ManyToOne(() => Customer, (c) => c.orders)
  @JoinColumn({ name: 'customer_id' })
  customer!: Customer;

  @Column({ name: 'customer_id', nullable: false })
  customerId!: number;
}

@Entity()
export class Customer {
  @PrimaryGeneratedColumn() id!: number;
  @OneToMany(() => Order, (o) => o.customer)
  orders!: Order[];
}
```

### NestJS / TypeORM equivalents `[interpretation]`

- `@ManyToOne` + `@JoinColumn` is TypeORM's Foreign Key Mapping for many-to-one associations.
- Exposing the raw FK column (`customerId`) alongside the relation avoids loading the related object just to get its id.
- For one-to-one use `@OneToOne` + `@JoinColumn`; TypeORM generates the FK column automatically.

---

## Association Table Mapping (p. 248)

### TypeScript structure

```typescript
// Many-to-many via a join table [interpretation]
@Entity()
export class Student {
  @PrimaryGeneratedColumn() id!: number;

  @ManyToMany(() => Course, (c) => c.students)
  @JoinTable({
    name: 'student_courses',
    joinColumn: { name: 'student_id' },
    inverseJoinColumn: { name: 'course_id' },
  })
  courses!: Course[];
}

@Entity()
export class Course {
  @PrimaryGeneratedColumn() id!: number;
  @ManyToMany(() => Student, (s) => s.courses)
  students!: Student[];
}
```

### NestJS / TypeORM equivalents `[interpretation]`

- `@ManyToMany` + `@JoinTable` is TypeORM's Association Table Mapping; the join table is managed automatically.
- When the join table carries extra columns (e.g., `enrolledAt`), model it as an explicit `@Entity()` with two `@ManyToOne` relations instead of `@ManyToMany`.
- TypeORM handles insert/delete on the join table when you manipulate the `courses` array and call `save()`.

---

## Dependent Mapping (p. 262)

### TypeScript structure

```typescript
// Child has no independent lifecycle; owner's mapper handles persistence [interpretation]
@Entity()
export class Order {
  @PrimaryGeneratedColumn() id!: number;

  @OneToMany(() => OrderLine, (line) => line.order, {
    cascade: true,    // owner cascades insert/update/delete to lines
    orphanedRowAction: 'delete',
  })
  lines!: OrderLine[];
}

@Entity()
export class OrderLine {
  @PrimaryGeneratedColumn() id!: number;
  @ManyToOne(() => Order, (o) => o.lines) order!: Order;
  @Column() productId!: number;
  @Column('decimal') price!: number;
}
```

### NestJS / TypeORM equivalents `[interpretation]`

- TypeORM `cascade: true` on a relation implements Dependent Mapping: the owning entity's repository drives all child persistence.
- `orphanedRowAction: 'delete'` ensures removed children are deleted from the DB when no longer referenced by the owner.
- Children should never be saved independently via their own repository — enforced by convention, not TypeORM itself.

---

## Embedded Value (p. 268)

### TypeScript structure

```typescript
// Small Value Object stored as columns in the owner's table [interpretation]
export class Address {
  street!: string;
  city!: string;
  postalCode!: string;
}

@Entity()
export class Supplier {
  @PrimaryGeneratedColumn() id!: number;

  @Column(() => Address)   // TypeORM Embedded: maps Address fields to supplier table columns
  address!: Address;

  @Column() name!: string;
}
```

### NestJS / TypeORM equivalents `[interpretation]`

- TypeORM's `@Column(() => EmbeddedClass)` decorator implements Embedded Value: no separate table, columns prefixed or plain depending on `prefix` option.
- Prisma does not support embedded types at the DB level (only JSON columns); use separate models or a JSON field for Prisma-based embedded values.
- The embedded class should be a plain TypeScript class (no `@Entity()`) decorated with `@Column()` on each field.

---

## Serialized LOB (p. 272)

### TypeScript structure

```typescript
// Serialize an object graph into a single DB column [interpretation]
@Entity()
export class ConfigProfile {
  @PrimaryGeneratedColumn() id!: number;

  @Column({ type: 'jsonb', transformer: {
    to: (val: Settings) => JSON.stringify(val),
    from: (val: string) => JSON.parse(val) as Settings,
  }})
  settings!: Settings;
}

interface Settings {
  theme: string;
  notifications: Record<string, boolean>;
  features: string[];
}
```

### NestJS / TypeORM equivalents `[interpretation]`

- TypeORM `type: 'jsonb'` (PostgreSQL) or `type: 'json'` stores the serialized graph natively; column transformers handle serialization.
- `type: 'text'` with explicit `JSON.stringify` / `JSON.parse` transformer works across all databases.
- Trade-off: you cannot SQL-query inside the LOB; use JSONB operators in PostgreSQL or move to Embedded Value / separate table when queryability matters.

---

## Single Table Inheritance (p. 278)

### TypeScript structure

```typescript
// Entire hierarchy in one table with a discriminator column [interpretation]
@Entity()
@TableInheritance({ column: { type: 'varchar', name: 'type' } })
export class Payment {
  @PrimaryGeneratedColumn() id!: number;
  @Column('decimal') amount!: number;
}

@ChildEntity('CREDIT_CARD')
export class CreditCardPayment extends Payment {
  @Column() cardNumber!: string;
}

@ChildEntity('BANK_TRANSFER')
export class BankTransferPayment extends Payment {
  @Column() iban!: string;
}
```

### NestJS / TypeORM equivalents `[interpretation]`

- TypeORM `@TableInheritance` + `@ChildEntity` is a built-in STI implementation; the `type` discriminator column is managed automatically.
- Nullable columns for subtype-specific fields are a known trade-off of STI — the table grows wide as the hierarchy grows.
- Query the parent repository to get all subtypes polymorphically; TypeORM returns the correct subclass instances automatically.

---

## Class Table Inheritance (p. 285)

### TypeScript structure

```typescript
// Each class maps to its own table; joined by shared PK [interpretation]
// TypeORM does not support CTI natively; manual approach: [interpretation]
@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn() id!: number;
  @Column('decimal') amount!: number;
}

@Entity('credit_card_payments')
export class CreditCardPayment {
  @PrimaryColumn() id!: number;          // shared PK — same value as Payment.id
  @Column() cardNumber!: string;

  @OneToOne(() => Payment)
  @JoinColumn({ name: 'id' })
  base!: Payment;
}
```

### NestJS / TypeORM equivalents `[interpretation]`

- TypeORM does not provide a declarative Class Table Inheritance decorator; model it manually with a `@OneToOne` join on a shared primary key.
- This is the most normalized strategy but requires joins for every query; NestJS QueryBuilder handles the joins explicitly.
- Concrete Table Inheritance is often simpler in TypeORM/NestJS when avoiding joins is a priority.

---

## Concrete Table Inheritance (p. 293)

### TypeScript structure

```typescript
// Each concrete class has its own fully self-contained table [interpretation]
@Entity('credit_card_payments')
export class CreditCardPayment {
  @PrimaryGeneratedColumn() id!: number;
  @Column('decimal') amount!: number;   // duplicated base field
  @Column() cardNumber!: string;
}

@Entity('bank_transfer_payments')
export class BankTransferPayment {
  @PrimaryGeneratedColumn() id!: number;
  @Column('decimal') amount!: number;   // duplicated base field
  @Column() iban!: string;
}
```

### NestJS / TypeORM equivalents `[interpretation]`

- TypeORM supports this via separate `@Entity()` classes with no inheritance relationship — each gets its own fully independent table.
- Querying across the hierarchy requires UNION queries (not supported by TypeORM's QueryBuilder directly; use raw SQL or view).
- Fowler notes this pattern makes cross-hierarchy polymorphic queries difficult — use only when subtypes are rarely queried together.

---

## Inheritance Mappers (p. 302)

### TypeScript structure

```typescript
// Abstract base mapper + concrete mappers per hierarchy node [interpretation]
abstract class PaymentMapper<T extends Payment> {
  abstract toEntity(domain: T): PaymentEntity;
  abstract toDomain(entity: PaymentEntity): T;

  async findById(id: number): Promise<T> {
    const entity = await this.getRepo().findOneOrFail({ where: { id } });
    return this.toDomain(entity);
  }

  protected abstract getRepo(): Repository<PaymentEntity>;
}

@Injectable()
class CreditCardPaymentMapper extends PaymentMapper<CreditCardPayment> {
  protected getRepo() { return this.repo; }
  constructor(@InjectRepository(CreditCardEntity) private repo: Repository<CreditCardEntity>) { super(); }
  toEntity(d: CreditCardPayment): CreditCardEntity { /* ... */ return {} as any; }
  toDomain(e: CreditCardEntity): CreditCardPayment { /* ... */ return {} as any; }
}
```

### NestJS / TypeORM equivalents `[interpretation]`

- This pattern organizes the mapper class hierarchy to mirror the domain hierarchy; each concrete subtype gets its own mapper that extends an abstract base.
- In practice TypeORM's `@TableInheritance` removes the need for explicit Inheritance Mappers — the ORM handles the mapping internally.
- Build Inheritance Mappers manually only when using a custom Data Mapper outside TypeORM (e.g., when mapping to a non-relational store).

---

## OR Metadata (Ch. 13)

---

## Metadata Mapping (p. 306)

### TypeScript structure

```typescript
// Mapping declared in metadata (decorators) rather than hand-coded methods [interpretation]
@Entity('products')
export class ProductEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'product_name', length: 200 })
  name!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'unit_price' })
  price!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
// TypeORM reads decorator metadata at runtime to generate SQL — this IS Metadata Mapping [interpretation]
```

### NestJS / TypeORM equivalents `[interpretation]`

- TypeORM's entire decorator system (`@Column`, `@Entity`, `@Relation`) is a Metadata Mapping implementation; the framework reads `reflect-metadata` at startup.
- Prisma uses schema files (`schema.prisma`) as the metadata source — the same pattern, different syntax.
- Fowler's hand-coded mapping methods are replaced entirely by decorators; the mapper (TypeORM internals) reads this metadata at query time.

---

## Query Object (p. 316)

### TypeScript structure

```typescript
// Represents a query as an object; builds criteria in domain terms [interpretation]
export class OrderQuery {
  private conditions: string[] = [];
  private params: unknown[] = [];

  forCustomer(customerId: number): this {
    this.conditions.push(`customer_id = $${this.params.length + 1}`);
    this.params.push(customerId);
    return this;
  }

  withMinTotal(min: number): this {
    this.conditions.push(`total >= $${this.params.length + 1}`);
    this.params.push(min);
    return this;
  }

  build(qb: SelectQueryBuilder<OrderEntity>): SelectQueryBuilder<OrderEntity> {
    this.conditions.forEach((c, i) => qb.andWhere(c, { [`p${i}`]: this.params[i] }));
    return qb;
  }
}
```

### NestJS / TypeORM equivalents `[interpretation]`

- TypeORM's `SelectQueryBuilder` is itself a Query Object — chainable, composable, translated to SQL at execution time.
- `FindOptionsWhere<T>` (the object passed to `find({ where: ... })`) is a lightweight declarative Query Object for simple cases.
- Libraries like `@nestjsx/crud` and MikroORM's `FilterQuery` provide richer Query Object semantics; consider them before hand-rolling.

---

## Repository (p. 322)

### TypeScript structure

```typescript
// Collection-like interface to domain objects backed by a swappable data strategy [interpretation]
export interface OrderRepository {
  findById(id: number): Promise<Order | null>;
  findAllForCustomer(customerId: number): Promise<Order[]>;
  save(order: Order): Promise<void>;
  remove(order: Order): Promise<void>;
}

@Injectable()
export class TypeOrmOrderRepository implements OrderRepository {
  constructor(@InjectRepository(OrderEntity) private repo: Repository<OrderEntity>) {}

  async findById(id: number): Promise<Order | null> {
    const e = await this.repo.findOne({ where: { id } });
    return e ? toDomain(e) : null;
  }

  async findAllForCustomer(customerId: number): Promise<Order[]> {
    return (await this.repo.find({ where: { customerId } })).map(toDomain);
  }

  async save(order: Order): Promise<void> { await this.repo.save(toEntity(order)); }
  async remove(order: Order): Promise<void> { await this.repo.delete(order.id); }
}
```

### NestJS / TypeORM equivalents `[interpretation]`

- Define a TypeScript `interface` for each repository; bind the TypeORM implementation via NestJS DI (`provide: OrderRepository, useClass: TypeOrmOrderRepository`).
- This allows swapping the data strategy in tests without changing Service Layer code — inject a fake/in-memory implementation.
- NestJS `@InjectRepository(Entity)` injects TypeORM's built-in `Repository<Entity>`, which is already a Repository; wrapping it in a domain-typed interface adds the Separated Interface benefit.

---

## Web Presentation (Ch. 14)

---

## Model View Controller (p. 330)

### TypeScript structure

```typescript
// NestJS controller (C) → service (M) → response DTO (V) [interpretation]
@Controller('orders')
export class OrderController {           // Controller: routes input
  constructor(private readonly svc: OrderApplicationService) {}

  @Get(':id')
  async getOrder(@Param('id', ParseIntPipe) id: number): Promise<OrderDto> {
    const order = await this.svc.getOrder(id);   // Model: domain/service
    return OrderDto.from(order);                  // View: DTO as JSON representation
  }
}
```

### NestJS / TypeORM equivalents `[interpretation]`

- NestJS is built on MVC: `@Controller` = C, `@Injectable()` services = M, response DTOs + serialization = V (JSON rather than HTML in API mode).
- For server-rendered HTML, add `@nestjs/platform-express` view engine (Handlebars, EJS) — the controller renders a template (Template View pattern).
- NestJS enforces separation of concerns through module boundaries, making MVC the architectural default.

---

## Page Controller (p. 333)

### TypeScript structure

```typescript
// One controller class per page/resource — NestJS default routing style [interpretation]
@Controller('products')
export class ProductPageController {
  constructor(private readonly svc: ProductService) {}

  @Get()
  listProducts(): Promise<ProductDto[]> { return this.svc.list(); }

  @Get(':id')
  getProduct(@Param('id', ParseIntPipe) id: number): Promise<ProductDto> {
    return this.svc.findById(id);
  }

  @Post()
  createProduct(@Body() dto: CreateProductDto): Promise<ProductDto> {
    return this.svc.create(dto);
  }
}
```

### NestJS / TypeORM equivalents `[interpretation]`

- Each NestJS `@Controller('path')` class is a Page Controller: it handles all actions for one resource/page.
- NestJS routes individual methods (`@Get`, `@Post`, `@Put`, `@Delete`) within the controller — closer to Fowler's "action per method" model.
- For HTML rendering: inject a template engine via `@Res()` Express response or use `@Render('template-name')` decorator with a configured view engine.

---

## Front Controller (p. 344)

### TypeScript structure

```typescript
// Single entry point dispatches to per-action handlers [interpretation]
// In NestJS: the framework itself IS the Front Controller; intercept at the global level

// Global guard acts as the single security checkpoint
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean | Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    return this.validateToken(req.headers.authorization);
  }
  private validateToken(token?: string): boolean { return !!token; }
}

// Global interceptor = cross-cutting Front Controller concern
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    console.log(`[${Date.now()}] ${ctx.getHandler().name}`);
    return next.handle();
  }
}
// Registered globally in AppModule with APP_GUARD / APP_INTERCEPTOR
```

### NestJS / TypeORM equivalents `[interpretation]`

- NestJS's HTTP adapter (Express/Fastify) provides the single-entry-point dispatch that Fowler describes; the framework itself is the Front Controller.
- `APP_GUARD`, `APP_INTERCEPTOR`, and `APP_PIPE` registered globally implement the interceptor chain Fowler attaches to the Front Controller.
- Per-action Command Objects from Fowler's description map to NestJS controller action methods combined with request-scoped services.

---

## Template View (p. 350)

### TypeScript structure

```typescript
// Render HTML by embedding markers in a template [interpretation]
// NestJS with Handlebars view engine

@Controller('reports')
export class ReportController {
  constructor(private readonly svc: ReportService) {}

  @Get(':id')
  @Render('report-detail')          // maps to views/report-detail.hbs
  async showReport(@Param('id', ParseIntPipe) id: number) {
    const data = await this.svc.getReport(id);
    return { title: data.title, rows: data.rows };   // template helpers
  }
}
// main.ts: app.setViewEngine('hbs'); app.useStaticAssets('public');
```

### NestJS / TypeORM equivalents `[interpretation]`

- NestJS supports Template View via `@nestjs/platform-express` with Handlebars, EJS, or Pug; configure `app.setViewEngine()` in bootstrap.
- Most NestJS projects are pure API servers (JSON); the Template View pattern is uncommon — front-end frameworks (Next.js, Angular) handle rendering instead.
- For server-side HTML in a NestJS monorepo, consider a separate NestJS app within the same Nx/turborepo workspace dedicated to SSR.

---

## Transform View (p. 361)

### TypeScript structure

```typescript
// Element-by-element transformation of domain data into output format [interpretation]
// XSLT is rare today; modern equivalent = data pipeline transformation

@Injectable()
export class OrderTransformView {
  transform(orders: Order[]): XmlNode {
    const root: XmlNode = { tag: 'orders', children: [] };
    for (const o of orders) {
      root.children!.push({
        tag: 'order',
        attrs: { id: String(o.id) },
        children: [{ tag: 'total', text: String(o.total) }],
      });
    }
    return root;
  }
}
interface XmlNode { tag: string; attrs?: Record<string,string>; text?: string; children?: XmlNode[]; }
```

### NestJS / TypeORM equivalents `[interpretation]`

- Transform View is largely historical (XSLT era). In modern TypeScript, it maps to a transformation service or interceptor that converts domain data into a specific output format.
- NestJS `ClassSerializerInterceptor` + `@Exclude()` / `@Expose()` from `class-transformer` performs element-by-element transformation of response objects.
- For XML output, NestJS can serialize with `fast-xml-parser` or `xml2js` in a custom interceptor; JSON is the standard output format.

---

## Two Step View (p. 365)

### TypeScript structure

```typescript
// Step 1: domain data → logical screen structure; Step 2: screen structure → HTML [interpretation]
interface LogicalScreen {
  title: string;
  sections: { heading: string; items: { label: string; value: string }[] }[];
}

@Injectable()
export class OrderScreenBuilder {
  // Step 1: build logical structure from domain data
  buildScreen(order: Order): LogicalScreen {
    return {
      title: `Order #${order.id}`,
      sections: [{ heading: 'Items', items: order.lines.map(l => ({ label: l.name, value: String(l.price) })) }],
    };
  }
}

@Injectable()
export class HtmlRenderer {
  // Step 2: render logical structure to HTML string
  render(screen: LogicalScreen): string {
    return `<h1>${screen.title}</h1>` + screen.sections.map(s => `<section><h2>${s.heading}</h2></section>`).join('');
  }
}
```

### NestJS / TypeORM equivalents `[interpretation]`

- Two Step View rarely appears in NestJS API projects; it is more relevant to SSR frameworks.
- The closest NestJS approximation: an interceptor builds an intermediate representation, then a serializer/renderer converts it — two-step transformation in the response pipeline.
- Next.js (React SSR) naturally implements Two Step View: React components produce a virtual DOM (step 1) that is hydrated to HTML (step 2).

---

## Application Controller (p. 379)

### TypeScript structure

```typescript
// Centralizes screen flow decisions based on application state [interpretation]
@Injectable()
export class CheckoutApplicationController {
  constructor(private readonly orderSvc: OrderService) {}

  async getNextScreen(sessionState: CheckoutState): Promise<ScreenName> {
    if (!sessionState.cartConfirmed) return 'cart-review';
    if (!sessionState.addressSet) return 'shipping-address';
    const order = await this.orderSvc.findPending(sessionState.userId);
    if (order.requiresPaymentVerification) return 'payment-verify';
    return 'confirmation';
  }
}

type ScreenName = 'cart-review' | 'shipping-address' | 'payment-verify' | 'confirmation';
interface CheckoutState { cartConfirmed: boolean; addressSet: boolean; userId: number; }
```

### NestJS / TypeORM equivalents `[interpretation]`

- Application Controller lives in the service layer as a stateful flow coordinator; inject it into controller action methods that need screen navigation logic.
- In NestJS REST APIs, Application Controller logic often becomes a state machine service or workflow engine (e.g., XState) rather than a screen-navigation class.
- For multi-step form flows in an SPA backed by NestJS, the Application Controller may run on the front end; the NestJS service exposes the state transitions as REST endpoints.

---

## Distribution (Ch. 15)

---

## Remote Facade (p. 388)

### TypeScript structure

```typescript
// Coarse-grained API surface over fine-grained domain objects [interpretation]
@Controller('orders')
export class OrderFacadeController {
  constructor(private readonly svc: OrderApplicationService) {}

  // One call returns everything a client needs — no chatty follow-up calls [interpretation]
  @Get(':id/full')
  async getOrderWithDetails(@Param('id', ParseIntPipe) id: number): Promise<OrderDetailDto> {
    const [order, customer, lines] = await Promise.all([
      this.svc.getOrder(id),
      this.svc.getCustomerForOrder(id),
      this.svc.getOrderLines(id),
    ]);
    return OrderDetailDto.assemble(order, customer, lines);
  }
}
```

### NestJS / TypeORM equivalents `[interpretation]`

- NestJS controllers are the natural Remote Facade when exposing a Service Layer over HTTP — each endpoint should be coarse-grained enough to avoid client chattiness.
- GraphQL (`@nestjs/graphql`) with field resolvers is an alternative Remote Facade: clients specify exactly the fields needed, reducing over/under-fetching.
- gRPC controllers (`@nestjs/microservices` with gRPC transport) implement Remote Facade over a binary protocol for internal service-to-service communication.

---

## Data Transfer Object (p. 401)

### TypeScript structure

```typescript
// Plain data carrier — aggregates fields for one remote call [interpretation]
import { IsString, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderLineDto {
  @IsNumber() productId!: number;
  @IsNumber() quantity!: number;
  @IsNumber() unitPrice!: number;
}

export class CreateOrderDto {             // inbound DTO (request body)
  @IsNumber() customerId!: number;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderLineDto)
  lines!: OrderLineDto[];
}

export class OrderResponseDto {           // outbound DTO (response body)
  id!: number;
  total!: number;
  status!: string;
  static from(order: Order): OrderResponseDto { /* map */ return {} as any; }
}
```

### NestJS / TypeORM equivalents `[interpretation]`

- NestJS DTOs (class-validator decorated classes) are a first-class DTO implementation; `ValidationPipe` validates inbound DTOs automatically.
- `class-transformer`'s `plainToInstance()` assembles DTOs from domain objects; the Assembler role Fowler describes is typically a static factory method or a dedicated `OrderAssembler` service.
- Keep DTOs in a `dto/` directory and separate inbound (request) from outbound (response) DTOs; they evolve independently.

---

## Concurrency (Ch. 16)

---

## Optimistic Offline Lock (p. 416)

### TypeScript structure

```typescript
// Detects conflicts via version stamp at commit time [interpretation]
@Entity()
export class Product {
  @PrimaryGeneratedColumn() id!: number;
  @Column() name!: string;
  @Column('decimal') price!: number;

  @VersionColumn()       // TypeORM auto-increments this on every update
  version!: number;
}

// TypeORM throws OptimisticLockVersionMismatchError when versions diverge [interpretation]
@Injectable()
export class ProductService {
  async updatePrice(id: number, newPrice: number, expectedVersion: number): Promise<void> {
    await this.repo.update({ id, version: expectedVersion }, { price: newPrice });
    // If version doesn't match, zero rows updated — check and throw
  }
}
```

### NestJS / TypeORM equivalents `[interpretation]`

- TypeORM's `@VersionColumn()` implements Optimistic Offline Lock out of the box; combine with `save({ version: clientVersion })` to trigger version checking.
- TypeORM's `find({ lock: { mode: 'optimistic', version: n } })` throws `OptimisticLockVersionMismatchError` when the version is stale.
- Catch `OptimisticLockVersionMismatchError` in NestJS exception filters and return HTTP 409 Conflict to the client.

---

## Pessimistic Offline Lock (p. 426)

### TypeScript structure

```typescript
// Acquires exclusive lock before editing; prevents concurrent modification [interpretation]
@Injectable()
export class DocumentService {
  async editDocument(docId: number, editorId: number): Promise<Document> {
    return this.db.transaction(async (em) => {
      // SELECT ... FOR UPDATE — database-level pessimistic lock [interpretation]
      const doc = await em.findOne(DocumentEntity, {
        where: { id: docId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!doc) throw new NotFoundException();
      // Lock held for the transaction duration; released on commit/rollback
      doc.lockedBy = editorId;
      return em.save(doc);
    });
  }
}
```

### NestJS / TypeORM equivalents `[interpretation]`

- TypeORM supports `pessimistic_read` (SELECT FOR SHARE) and `pessimistic_write` (SELECT FOR UPDATE) lock modes on `find()` calls within a transaction.
- Fowler's "lock manager" table for long-running pessimistic locks (spanning multiple HTTP requests) must be built manually — TypeORM transactions cover only one request.
- For offline (multi-session) pessimistic locking, create a `locks` table, store `(resource_id, session_id, acquired_at, expires_at)` and check/expire with a scheduler (`@nestjs/schedule`).

---

## Coarse-Grained Lock (p. 438)

### TypeScript structure

```typescript
// Lock one aggregate root to lock the entire cluster of related objects [interpretation]
@Entity()
export class Order {
  @PrimaryGeneratedColumn() id!: number;
  @VersionColumn() version!: number;     // single version guards Order + all its Lines

  @OneToMany(() => OrderLine, (l) => l.order, { cascade: true })
  lines!: OrderLine[];
}

// Lock the root — all dependent children are implicitly locked [interpretation]
async lockOrderAggregate(orderId: number, em: EntityManager): Promise<Order> {
  return em.findOneOrFail(Order, {
    where: { id: orderId },
    relations: ['lines'],
    lock: { mode: 'pessimistic_write' },   // one lock on root covers all lines
  });
}
```

### NestJS / TypeORM equivalents `[interpretation]`

- Place `@VersionColumn()` on the aggregate root only; child entities do not need their own version columns when all changes flow through the root.
- For pessimistic coarse-grained locks: lock the root entity with `pessimistic_write` and load children eagerly in the same query — DB row lock covers the join.
- TypeORM's cascade operations reinforce coarse-grained locking by ensuring children are only modified through the root's `save()`.

---

## Implicit Lock (p. 449)

### TypeScript structure

```typescript
// Framework/mapper acquires locks automatically; no application code can forget [interpretation]
// TypeORM @VersionColumn is implicit for optimistic locking — always applied [interpretation]

@Entity()
export class Invoice {
  @PrimaryGeneratedColumn() id!: number;
  @Column('decimal') amount!: number;
  @VersionColumn() version!: number;    // ORM silently checks this on every update
}

// Custom interceptor for implicit pessimistic locking [interpretation]
@Injectable()
export class PessimisticLockInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    // Could inject EntityManager and acquire locks before handler runs
    return next.handle();
  }
}
```

### NestJS / TypeORM equivalents `[interpretation]`

- TypeORM's `@VersionColumn()` is an Implicit Lock for optimistic concurrency: the ORM always appends `WHERE version = N` on updates without any application code.
- For implicit pessimistic locks, a NestJS interceptor or custom TypeORM subscriber can acquire locks before the service method runs.
- Fowler's point is that implicit locks prevent "forgetting to lock" bugs — TypeORM's automatic version checking achieves this for optimistic scenarios.

---

## Session State (Ch. 17)

---

## Client Session State (p. 456)

### TypeScript structure

```typescript
// Session data stored on the client — JWT is the canonical modern form [interpretation]
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private readonly jwt: JwtService) {}

  async login(userId: number, roles: string[]): Promise<{ accessToken: string }> {
    const payload = { sub: userId, roles };      // state encoded in token
    return { accessToken: this.jwt.sign(payload) };  // client stores this
  }
}

// Guard reads state back from client-supplied token [interpretation]
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

### NestJS / TypeORM equivalents `[interpretation]`

- JWT via `@nestjs/jwt` + `@nestjs/passport` is the standard NestJS Client Session State implementation: all state is in the signed token, server is stateless.
- Cookie-based client state: use `cookie-parser` middleware and store session ID or compact state in a signed cookie.
- Fowler's URL parameter approach is discouraged in modern apps due to CSRF and caching risks; prefer cookies or Authorization headers.

---

## Server Session State (p. 458)

### TypeScript structure

```typescript
// Session object held in server memory or external store [interpretation]
// main.ts bootstrap
import * as session from 'express-session';
import * as connectRedis from 'connect-redis';

const RedisStore = connectRedis(session);
app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: true, httpOnly: true, maxAge: 3600000 },
}));

// In controller
@Get('cart')
getCart(@Session() session: Record<string, unknown>): CartDto {
  return session['cart'] as CartDto;
}
```

### NestJS / TypeORM equivalents `[interpretation]`

- `express-session` with `connect-redis` is the standard NestJS Server Session State; Redis acts as the shared session store across multiple NestJS instances.
- Fowler's serialized session object maps to the JSON blob stored in Redis under the session ID key.
- For stateless NestJS APIs with horizontal scaling, prefer Client Session State (JWT) to avoid sticky sessions or Redis dependency.

---

## Database Session State (p. 462)

### TypeScript structure

```typescript
// Session data persisted to database rows [interpretation]
@Entity('sessions')
export class SessionEntity {
  @PrimaryColumn() id!: string;
  @Column({ type: 'jsonb' }) data!: Record<string, unknown>;
  @Column() userId!: number;
  @Column({ default: false }) committed!: boolean;
  @UpdateDateColumn() updatedAt!: Date;
}

@Injectable()
export class DatabaseSessionStore {
  constructor(@InjectRepository(SessionEntity) private repo: Repository<SessionEntity>) {}

  async load(sessionId: string): Promise<Record<string, unknown> | null> {
    const s = await this.repo.findOne({ where: { id: sessionId } });
    return s?.data ?? null;
  }

  async save(sessionId: string, userId: number, data: Record<string, unknown>): Promise<void> {
    await this.repo.upsert({ id: sessionId, userId, data, committed: true }, ['id']);
  }
}
```

### NestJS / TypeORM equivalents `[interpretation]`

- TypeConnect's `typeorm-store` or a custom `express-session` store backed by a TypeORM repository implements Database Session State.
- Fowler's "pending" vs "committed" distinction maps to a `committed: boolean` column — uncommitted session rows act as in-progress work items.
- Use when session data must survive server restarts and Redis is unavailable; trade-off is higher DB load per request.

---

## Base Patterns (Ch. 18)

---

## Gateway (p. 466)

### TypeScript structure

```typescript
// Wraps external system access with a clean typed interface [interpretation]
export interface PaymentGateway {
  charge(amount: Money, cardToken: string): Promise<ChargeResult>;
  refund(chargeId: string, amount: Money): Promise<RefundResult>;
}

@Injectable()
export class StripePaymentGateway implements PaymentGateway {
  constructor(private readonly http: HttpService) {}

  async charge(amount: Money, cardToken: string): Promise<ChargeResult> {
    const resp = await this.http.post('/v1/charges', {
      amount: amount.cents, currency: amount.currency, source: cardToken,
    }).toPromise();
    return { chargeId: resp!.data.id, status: resp!.data.status };
  }

  async refund(chargeId: string, amount: Money): Promise<RefundResult> {
    const resp = await this.http.post('/v1/refunds', { charge: chargeId, amount: amount.cents }).toPromise();
    return { refundId: resp!.data.id };
  }
}
```

### NestJS / TypeORM equivalents `[interpretation]`

- NestJS `HttpModule` (Axios wrapper) provides the HTTP client for Gateway implementations; inject `HttpService` into gateway classes.
- Define the `PaymentGateway` interface in a `Separated Interface` module; register the concrete implementation in AppModule for easy swapping with Service Stub in tests.
- `@nestjs/microservices` client proxies (Redis, RabbitMQ, gRPC) serve as gateways to message broker and RPC backends.

---

## Mapper (p. 473)

### TypeScript structure

```typescript
// Mediates between two independent subsystems without coupling them [interpretation]
// Neither side knows about the other — Mapper knows both [interpretation]

// Subsystem A: Domain
export class Invoice { constructor(public id: number, public amount: number) {} }

// Subsystem B: Accounting system DTO (external)
interface AccountingEntry { entryId: string; debit: number; credit: number; reference: string; }

// Mapper: knows both, neither knows Mapper [interpretation]
@Injectable()
export class InvoiceAccountingMapper {
  toAccountingEntry(invoice: Invoice): AccountingEntry {
    return { entryId: `INV-${invoice.id}`, debit: invoice.amount, credit: 0, reference: `Invoice ${invoice.id}` };
  }

  fromAccountingEntry(entry: AccountingEntry): Invoice {
    const id = parseInt(entry.reference.replace('Invoice ', ''));
    return new Invoice(id, entry.debit);
  }
}
```

### NestJS / TypeORM equivalents `[interpretation]`

- Mapper differs from Data Mapper (p. 165) in that it connects two independent systems, not domain to database. Use when integrating external APIs without coupling service code to their schemas.
- `class-transformer`'s `plainToInstance` and `instanceToPlain` perform the mechanical field mapping; a Mapper class adds the domain logic of the translation.
- In NestJS, place Mapper classes in an `integration/` or `adapters/` module to signal their cross-boundary role.

---

## Layer Supertype (p. 475)

### TypeScript structure

```typescript
// Common superclass for all objects in a layer — holds shared behavior [interpretation]
export abstract class DomainEntity {
  abstract id: number;
  protected domainEvents: DomainEvent[] = [];

  protected raiseEvent(event: DomainEvent): void { this.domainEvents.push(event); }
  pullEvents(): DomainEvent[] { const evts = [...this.domainEvents]; this.domainEvents = []; return evts; }
}

// All domain entities extend this [interpretation]
export class Order extends DomainEntity {
  id!: number;
  place(): void { this.raiseEvent(new OrderPlacedEvent(this.id)); }
}

// TypeORM base entity [interpretation]
export abstract class BaseTypeOrmEntity {
  @PrimaryGeneratedColumn() id!: number;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
```

### NestJS / TypeORM equivalents `[interpretation]`

- TypeORM's `BaseEntity` is a Layer Supertype for Active Record entities — all `@Entity()` classes that extend it share `save()`, `find()`, `remove()`, etc.
- For Data Mapper entities, create a custom abstract `BaseTypeOrmEntity` with shared columns (`@PrimaryGeneratedColumn`, `@CreateDateColumn`, etc.) that all entities extend.
- Domain Layer Supertype and persistence Layer Supertype should be separate classes to keep domain objects free of ORM imports.

---

## Separated Interface (p. 476)

### TypeScript structure

```typescript
// Interface lives in a different module from its implementation [interpretation]

// Module: domain (no infrastructure imports)
// src/domain/ports/order-repository.port.ts
export interface OrderRepositoryPort {
  findById(id: number): Promise<Order | null>;
  save(order: Order): Promise<void>;
}

// Module: infrastructure (depends on domain, not vice versa)
// src/infrastructure/persistence/typeorm-order.repository.ts
@Injectable()
export class TypeOrmOrderRepository implements OrderRepositoryPort {
  constructor(@InjectRepository(OrderEntity) private repo: Repository<OrderEntity>) {}
  async findById(id: number): Promise<Order | null> { /* ... */ return null; }
  async save(order: Order): Promise<void> { /* ... */ }
}
```

### NestJS / TypeORM equivalents `[interpretation]`

- TypeScript interfaces in a `ports/` or `domain/` directory with implementations in `infrastructure/` is the standard Hexagonal Architecture (Ports and Adapters) approach in NestJS.
- Wire the concrete implementation in AppModule: `{ provide: OrderRepositoryPort, useClass: TypeOrmOrderRepository }`.
- NestJS's DI container resolves the interface token to the implementation at runtime; service classes depend only on the interface token.

---

## Registry (p. 480)

### TypeScript structure

```typescript
// Well-known global lookup for services/shared objects [interpretation]
// Note: Fowler prefers DI over Registry — use NestJS DI where possible [interpretation]

// Simple singleton registry (use sparingly; prefer DI)
export class ServiceRegistry {
  private static instance: ServiceRegistry;
  private readonly services = new Map<string, unknown>();

  static getInstance(): ServiceRegistry {
    if (!ServiceRegistry.instance) ServiceRegistry.instance = new ServiceRegistry();
    return ServiceRegistry.instance;
  }

  register<T>(key: string, service: T): void { this.services.set(key, service); }
  get<T>(key: string): T {
    const s = this.services.get(key) as T;
    if (!s) throw new Error(`Service '${key}' not registered`);
    return s;
  }
}
```

### NestJS / TypeORM equivalents `[interpretation]`

- NestJS's DI container IS a Registry in Fowler's sense — well-known tokens (`@Inject('TOKEN')`) map to service instances.
- Prefer NestJS DI over a hand-rolled Registry singleton; the framework provides scoping, lifecycle hooks, and testability.
- Use `ModuleRef` in NestJS to look up providers dynamically at runtime — this is the safe NestJS Registry equivalent when DI injection is not possible (e.g., factory functions).

---

## Value Object (p. 486)

### TypeScript structure

```typescript
// Small, immutable object; equality based on field values [interpretation]
export class EmailAddress {
  private constructor(readonly value: string) {}

  static create(raw: string): EmailAddress {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) throw new Error('Invalid email');
    return new EmailAddress(raw.toLowerCase());
  }

  equals(other: EmailAddress): boolean { return this.value === other.value; }
  toString(): string { return this.value; }
}

// Usage: construction always validates [interpretation]
const email = EmailAddress.create('user@example.com');
```

### NestJS / TypeORM equivalents `[interpretation]`

- Value Objects should be implemented as TypeScript classes with private constructors and static factory methods that validate on creation.
- Store Value Objects in the database via TypeORM Embedded Value (`@Column(() => EmailAddress)`) or by mapping to a primitive column with a column transformer.
- NestJS `ValidationPipe` + class-validator decorators validate DTO fields at the HTTP boundary, but that is not a Value Object — Value Objects enforce their own invariants at construction time.

---

## Money (p. 488)

### TypeScript structure

```typescript
// Monetary amount with currency, rounding, and allocation [interpretation]
export class Money {
  private constructor(readonly cents: bigint, readonly currency: string) {}

  static of(amount: number, currency: string): Money {
    return new Money(BigInt(Math.round(amount * 100)), currency);
  }

  static zero(currency: string): Money { return new Money(0n, currency); }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.cents + other.cents, this.currency);
  }

  multiply(factor: number): Money {
    return new Money(BigInt(Math.round(Number(this.cents) * factor)), this.currency);
  }

  allocate(ratios: number[]): Money[] {
    const total = ratios.reduce((a, b) => a + b, 0);
    let remainder = this.cents;
    return ratios.map((r, i) => {
      const share = i === ratios.length - 1 ? remainder : BigInt(Math.floor(Number(this.cents) * r / total));
      remainder -= share;
      return new Money(share, this.currency);
    });
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) throw new Error('Currency mismatch');
  }
}
```

### NestJS / TypeORM equivalents `[interpretation]`

- Use `bigint` for cent-precision arithmetic to avoid floating-point rounding errors; store as `BIGINT` column in the database.
- Map `Money` to two columns (`amount_cents BIGINT`, `currency VARCHAR(3)`) using TypeORM `@Column(() => MoneyEmbedded)` with an embedded class.
- Consider the `dinero.js` library for a production-grade TypeScript Money implementation; it covers allocation, currency conversion, and formatting.

---

## Special Case (p. 496)

### TypeScript structure

```typescript
// Subclass with safe default behavior for null/missing cases [interpretation]
export abstract class Customer {
  abstract get name(): string;
  abstract get creditLimit(): Money;
  abstract isNull(): boolean;
}

export class RegisteredCustomer extends Customer {
  constructor(private data: CustomerData) { super(); }
  get name(): string { return this.data.name; }
  get creditLimit(): Money { return Money.of(this.data.creditLimit, 'USD'); }
  isNull(): boolean { return false; }
}

export class NullCustomer extends Customer {
  get name(): string { return 'Guest'; }
  get creditLimit(): Money { return Money.zero('USD'); }
  isNull(): boolean { return true; }
}

// Repository returns NullCustomer instead of null [interpretation]
async findOrNull(id: number): Promise<Customer> {
  const data = await this.repo.findOne({ where: { id } });
  return data ? new RegisteredCustomer(data) : new NullCustomer();
}
```

### NestJS / TypeORM equivalents `[interpretation]`

- Special Case / Null Object eliminates `if (customer === null)` checks throughout service and controller code.
- In TypeScript, use discriminated unions as an alternative: `type CustomerResult = { found: true; customer: Customer } | { found: false }`.
- NestJS `NotFoundException` is the HTTP-layer equivalent — throw it in the controller, let the service return Special Case objects internally.

---

## Plugin (p. 499)

### TypeScript structure

```typescript
// Links interface implementations to callers at configuration time [interpretation]
// NestJS dynamic module = Plugin registration point [interpretation]

@Module({})
export class TaxModule {
  static register(options: TaxOptions): DynamicModule {
    return {
      module: TaxModule,
      providers: [
        { provide: 'TAX_OPTIONS', useValue: options },
        { provide: TaxCalculator, useClass: options.strategy === 'EU' ? EuTaxCalculator : UsTaxCalculator },
      ],
      exports: [TaxCalculator],
    };
  }
}

// In AppModule:
// TaxModule.register({ strategy: process.env.TAX_STRATEGY as 'EU' | 'US' })
```

### NestJS / TypeORM equivalents `[interpretation]`

- NestJS `DynamicModule` (`.register()` / `.forRoot()` / `.forFeature()`) is a Plugin mechanism: the consuming module selects an implementation at configuration time.
- `ConfigModule.forRoot()` from `@nestjs/config` is a built-in Plugin pattern — behavior (env file path, validation schema) configured at startup, not compile time.
- Environment-driven provider selection (`useClass` based on `process.env.*`) implements the "configuration file selects implementation" approach Fowler describes.

---

## Service Stub (p. 504)

### TypeScript structure

```typescript
// Test-time replacement for a slow or unavailable external service [interpretation]
// Separated Interface (plugin point)
export interface EmailService {
  sendWelcome(to: string): Promise<void>;
}

// Production implementation (real service)
@Injectable()
export class SendGridEmailService implements EmailService {
  async sendWelcome(to: string): Promise<void> { /* real HTTP call */ }
}

// Service Stub for tests [interpretation]
export class StubEmailService implements EmailService {
  sent: string[] = [];
  async sendWelcome(to: string): Promise<void> { this.sent.push(to); }
}

// NestJS TestingModule wiring [interpretation]
const module = await Test.createTestingModule({
  providers: [
    OrderService,
    { provide: EmailService, useClass: StubEmailService },
  ],
}).compile();
```

### NestJS / TypeORM equivalents `[interpretation]`

- `Test.createTestingModule().overrideProvider(Token).useValue(stub)` is the idiomatic NestJS Service Stub wiring — no need to touch production module configuration.
- `jest.mock()` + `jest.fn()` creates stubs for non-NestJS dependencies; prefer `overrideProvider` for NestJS-injected services.
- Service Stubs should implement the same interface as the real service (Separated Interface) — this is enforced by TypeScript when the stub class `implements` the interface.

---

## Record Set (p. 508)

### TypeScript structure

```typescript
// In-memory tabular data; mirrors SQL result sets [interpretation]
// Modern TypeScript equivalent: typed arrays of plain objects [interpretation]

interface OrderRow {
  id: number;
  customerId: number;
  total: number;
  status: string;
}

type OrderRecordSet = OrderRow[];   // the "Record Set" is just a typed array

// Table Data Gateway returns a Record Set [interpretation]
@Injectable()
export class OrderTableGateway {
  constructor(private readonly db: DataSource) {}

  async findByCustomer(customerId: number): Promise<OrderRecordSet> {
    return this.db.query<OrderRow>(
      'SELECT id, customer_id as "customerId", total, status FROM orders WHERE customer_id = $1',
      [customerId]
    );
  }
}

// Table Module operates over the Record Set [interpretation]
export class OrderTableModule {
  totalRevenue(rows: OrderRecordSet): number {
    return rows.reduce((sum, r) => sum + r.total, 0);
  }
}
```

### NestJS / TypeORM equivalents `[interpretation]`

- TypeScript does not have a built-in Record Set class like ADO.NET's `DataSet`; a typed array of plain objects is the idiomatic equivalent.
- TypeORM's `DataSource.query<T>()` returns `T[]` — a typed Record Set — usable directly with Table Module logic.
- Record Set pairs poorly with Domain Model in NestJS projects; use only alongside Transaction Script or Table Module. For Domain Model projects, map raw results to domain objects via a Data Mapper.

---

*Total patterns: 51. All entries include TypeScript code and NestJS/TypeORM equivalents. `[interpretation]` tag applied throughout.*
