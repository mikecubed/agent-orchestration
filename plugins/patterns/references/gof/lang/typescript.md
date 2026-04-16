# GoF Design Pattern Catalog — TypeScript Reference

**Purpose**: Modern TypeScript code examples for all 23 GoF patterns.
Use alongside `catalog-core.md`.

**Stack coverage**: TypeScript 5.x, Node.js 20+, NestJS where applicable

**Key principle**: Modern TypeScript idioms. When a pattern maps to a language feature
(Iterator via `Symbol.iterator`, Decorator via TS decorators), show the built-in.

**Anti-hallucination policy**: All code is `[interpretation]`.

---

# Creational Patterns

---

## Abstract Factory (p. 87)

### Modern TypeScript `[interpretation]`

Use interfaces to define product families and generic factory functions with type constraints.

```typescript
interface Button { render(): string; }
interface Dialog { show(): string; }

interface UIFactory {
  createButton(): Button;
  createDialog(): Dialog;
}

class DarkButton implements Button { render() { return '<button class="dark"/>'; } }
class DarkDialog implements Dialog { show() { return '<dialog theme="dark"/>'; } }
class LightButton implements Button { render() { return '<button class="light"/>'; } }
class LightDialog implements Dialog { show() { return '<dialog theme="light"/>'; } }

class DarkFactory implements UIFactory {
  createButton() { return new DarkButton(); }
  createDialog() { return new DarkDialog(); }
}
class LightFactory implements UIFactory {
  createButton() { return new LightButton(); }
  createDialog() { return new LightDialog(); }
}

function buildUI(factory: UIFactory) {
  const btn = factory.createButton();
  const dlg = factory.createDialog();
  return { btn: btn.render(), dlg: dlg.show() };
}
```

### Framework equivalents `[interpretation]`

- **NestJS**: `useFactory` in dynamic modules creates families of providers.
- **TypeORM**: `DataSource` acts as an abstract factory for repositories per DB dialect.

---

## Builder (p. 97)

### Modern TypeScript `[interpretation]`

Fluent builder with method chaining and a type-safe `build()` that enforces required fields.

```typescript
interface QueryConfig {
  table: string;
  conditions: string[];
  limit?: number;
  orderBy?: string;
}

class QueryBuilder {
  private config: Partial<QueryConfig> = { conditions: [] };

  from(table: string): this { this.config.table = table; return this; }
  where(cond: string): this { this.config.conditions!.push(cond); return this; }
  limit(n: number): this { this.config.limit = n; return this; }
  orderBy(col: string): this { this.config.orderBy = col; return this; }

  build(): QueryConfig {
    if (!this.config.table) throw new Error("table is required");
    return this.config as QueryConfig;
  }
}

const query = new QueryBuilder()
  .from("users")
  .where("active = true")
  .limit(10)
  .orderBy("created_at")
  .build();
```

### Framework equivalents `[interpretation]`

- **TypeORM**: `createQueryBuilder()` is a textbook builder.
- **Zod**: `z.object({...}).extend({...}).refine(...)` — schema builder via chaining.

---

## Factory Method (p. 107)

### Modern TypeScript `[interpretation]`

Generic factory functions with type constraints replace class-hierarchy factory methods.

```typescript
interface Serializer<T> {
  serialize(data: T): string;
  deserialize(raw: string): T;
}

class JsonSerializer<T> implements Serializer<T> {
  serialize(data: T) { return JSON.stringify(data); }
  deserialize(raw: string) { return JSON.parse(raw) as T; }
}

class CsvSerializer implements Serializer<Record<string, string>> {
  serialize(data: Record<string, string>) {
    return Object.entries(data).map(([k, v]) => `${k},${v}`).join("\n");
  }
  deserialize(raw: string) {
    return Object.fromEntries(raw.split("\n").map(l => l.split(","))) as Record<string, string>;
  }
}

function createSerializer<T>(format: "json"): Serializer<T>;
function createSerializer(format: "csv"): Serializer<Record<string, string>>;
function createSerializer(format: string): Serializer<unknown> {
  switch (format) {
    case "json": return new JsonSerializer();
    case "csv":  return new CsvSerializer();
    default: throw new Error(`Unknown format: ${format}`);
  }
}
```

### Framework equivalents `[interpretation]`

- **NestJS**: `@Injectable()` classes resolved via token — the DI container is the factory.
- **Multer**: `multer.diskStorage()` vs `multer.memoryStorage()` — factory method for storage engines.

---

## Prototype (p. 117)

### Modern TypeScript `[interpretation]`

Use `structuredClone` (built-in since Node 17) for deep cloning; define a `clone()` contract via interface.

```typescript
interface Cloneable<T> {
  clone(): T;
}

class Dashboard implements Cloneable<Dashboard> {
  constructor(
    public title: string,
    public widgets: { type: string; config: Record<string, unknown> }[]
  ) {}

  clone(): Dashboard {
    return structuredClone(this) as Dashboard;
  }
}

// Template dashboard — clone and customize
const template = new Dashboard("Default", [
  { type: "chart", config: { metric: "cpu" } },
  { type: "table", config: { rows: 10 } },
]);

const userDash = template.clone();
userDash.title = "My Dashboard";
userDash.widgets.push({ type: "alert", config: { threshold: 90 } });
```

### Framework equivalents `[interpretation]`

- **structuredClone**: Built-in deep clone — replaces hand-rolled `JSON.parse(JSON.stringify(...))`.
- **Immer**: `produce(base, draft => { ... })` — prototype + copy-on-write semantics.

---

## Singleton (p. 127)

### Modern TypeScript `[interpretation]`

Module-scoped instance is the idiomatic TS singleton. No `getInstance()` ceremony needed.

```typescript
// db.ts — the module IS the singleton
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
});

export async function query<T>(sql: string, params?: unknown[]): Promise<T[]> {
  const { rows } = await pool.query(sql, params);
  return rows as T[];
}

export async function shutdown(): Promise<void> {
  await pool.end();
}

// consumer.ts
// import { query } from "./db";  // same pool instance everywhere
```

### Framework equivalents `[interpretation]`

- **NestJS**: `@Injectable({ scope: Scope.DEFAULT })` — default scope is singleton.
- **Prisma**: `new PrismaClient()` at module level — docs recommend single instance.

---

# Structural Patterns

---

## Adapter (p. 139)

### Modern TypeScript `[interpretation]`

Wrap a third-party or legacy interface behind an interface your code owns.

```typescript
// Target interface your code expects
interface Logger {
  info(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
}

// Third-party logger with incompatible API
class PinoLogger {
  child(_bindings: object) { return this; }
  info(obj: object, msg?: string) { console.log(msg, obj); }
  error(obj: object, msg?: string) { console.error(msg, obj); }
}

// Adapter
class PinoAdapter implements Logger {
  constructor(private pino: PinoLogger) {}

  info(msg: string, meta: Record<string, unknown> = {}) {
    this.pino.info(meta, msg);
  }
  error(msg: string, meta: Record<string, unknown> = {}) {
    this.pino.error(meta, msg);
  }
}

const logger: Logger = new PinoAdapter(new PinoLogger());
logger.info("User created", { userId: "abc" });
```

### Framework equivalents `[interpretation]`

- **NestJS**: `LoggerService` interface — adapters wrap winston, pino, etc.
- **Passport.js**: Each `Strategy` adapts a different auth provider to a uniform interface.

---

## Bridge (p. 151)

### Modern TypeScript `[interpretation]`

Separate abstraction from implementation using composition and interfaces.

```typescript
interface MessageSender {
  send(to: string, body: string): Promise<void>;
}

class SmsSender implements MessageSender {
  async send(to: string, body: string) { console.log(`SMS to ${to}: ${body}`); }
}

class EmailSender implements MessageSender {
  async send(to: string, body: string) { console.log(`Email to ${to}: ${body}`); }
}

class Notification {
  constructor(private sender: MessageSender) {}

  async notify(to: string, event: string) {
    await this.sender.send(to, `Event: ${event}`);
  }
}

class UrgentNotification extends Notification {
  async notify(to: string, event: string) {
    await super.notify(to, `URGENT: ${event}`);
    await super.notify(to, `REMINDER: ${event}`);
  }
}

// Abstraction and implementation vary independently
const urgentSms = new UrgentNotification(new SmsSender());
const normalEmail = new Notification(new EmailSender());
```

### Framework equivalents `[interpretation]`

- **NestJS**: Transport layer (HTTP, WebSocket, gRPC) is bridged from the application layer via `@Controller` / `@MessagePattern`.
- **TypeORM**: `Driver` interface bridges database abstraction from dialect implementation.

---

## Composite (p. 163)

### Modern TypeScript `[interpretation]`

Tree structures with a uniform interface — common in permission systems, menus, file trees.

```typescript
interface Permission {
  check(action: string): boolean;
}

class SimplePermission implements Permission {
  constructor(private allowed: Set<string>) {}
  check(action: string) { return this.allowed.has(action); }
}

class PermissionGroup implements Permission {
  private children: Permission[] = [];

  add(p: Permission): this { this.children.push(p); return this; }

  check(action: string): boolean {
    return this.children.some(child => child.check(action));
  }
}

const adminPerms = new PermissionGroup()
  .add(new SimplePermission(new Set(["read", "write"])))
  .add(new SimplePermission(new Set(["delete", "admin"])));

console.log(adminPerms.check("delete")); // true
console.log(adminPerms.check("deploy")); // false
```

### Framework equivalents `[interpretation]`

- **React component trees**: JSX elements are composites — leaf and container nodes share the same `ReactNode` type.
- **NestJS Guards/Pipes**: Can be composed into arrays that run uniformly.

---

## Decorator (p. 175)

### Modern TypeScript `[interpretation]`

TypeScript experimental decorators are used heavily in NestJS. Also works as wrapper composition.

```typescript
// --- TS Decorator approach (NestJS style) ---
function LogExecutionTime(target: any, key: string, desc: PropertyDescriptor) {
  const original = desc.value;
  desc.value = async function (...args: unknown[]) {
    const start = performance.now();
    const result = await original.apply(this, args);
    console.log(`${key} took ${(performance.now() - start).toFixed(2)}ms`);
    return result;
  };
}

class UserService {
  @LogExecutionTime
  async findById(id: string) {
    // simulate DB call
    return { id, name: "Alice" };
  }
}

// --- Wrapper composition approach ---
type Handler = (req: Request) => Promise<Response>;

function withAuth(handler: Handler): Handler {
  return async (req) => {
    if (!req.headers.get("Authorization")) {
      return new Response("Unauthorized", { status: 401 });
    }
    return handler(req);
  };
}

function withLogging(handler: Handler): Handler {
  return async (req) => {
    console.log(`${req.method} ${req.url}`);
    return handler(req);
  };
}

const handle: Handler = withLogging(withAuth(async (req) => new Response("OK")));
```

### Framework equivalents `[interpretation]`

- **NestJS**: `@UseGuards()`, `@UseInterceptors()`, `@UsePipes()` — decorator-based decoration.
- **Express**: `app.use(cors(), helmet(), compression())` — middleware as decorator chain.

---

## Facade (p. 185)

### Modern TypeScript `[interpretation]`

A single module exposes a simplified API over multiple complex subsystems.

```typescript
// Subsystems
class PaymentGateway {
  async charge(amount: number, token: string) { return { txId: "tx_123" }; }
}
class InventoryService {
  async reserve(sku: string, qty: number) { return true; }
  async release(sku: string, qty: number) { }
}
class EmailService {
  async sendReceipt(to: string, txId: string) { }
}

// Facade
class CheckoutFacade {
  constructor(
    private payment: PaymentGateway,
    private inventory: InventoryService,
    private email: EmailService,
  ) {}

  async checkout(order: { sku: string; qty: number; email: string; token: string }) {
    const reserved = await this.inventory.reserve(order.sku, order.qty);
    if (!reserved) throw new Error("Out of stock");

    const { txId } = await this.payment.charge(order.qty * 100, order.token);
    await this.email.sendReceipt(order.email, txId);
    return { txId };
  }
}
```

### Framework equivalents `[interpretation]`

- **NestJS modules**: Each module is a facade — exports a curated set of providers.
- **AWS SDK v3**: High-level clients (`S3Client`) facade over low-level command/transport.

---

## Flyweight (p. 195)

### Modern TypeScript `[interpretation]`

Share immutable intrinsic state across many instances using a `Map` cache.

```typescript
class IconSprite {
  constructor(readonly name: string, readonly svgPath: string) {}
  render(x: number, y: number, size: number) {
    return `<use href="#${this.name}" x="${x}" y="${y}" width="${size}"/>`;
  }
}

class IconFactory {
  private static cache = new Map<string, IconSprite>();

  static getIcon(name: string, svgPath: string): IconSprite {
    if (!this.cache.has(name)) {
      this.cache.set(name, new IconSprite(name, svgPath));
    }
    return this.cache.get(name)!;
  }
}

// 1000 map pins share the same 3 icon sprites
const pins = Array.from({ length: 1000 }, (_, i) => {
  const icon = IconFactory.getIcon("pin", "M10 0 L20 30 ...");
  return icon.render(i * 2, i * 3, 24);
});
```

### Framework equivalents `[interpretation]`

- **String interning**: V8 interns short strings automatically — a runtime-level flyweight.
- **React**: `React.memo()` + stable references avoid re-creating component subtrees.

---

## Proxy (p. 207)

### Modern TypeScript `[interpretation]`

ES6 `Proxy` is a built-in language feature — use it for access control, caching, or validation.

```typescript
interface ApiClient {
  get<T>(path: string): Promise<T>;
}

function createCachingProxy(client: ApiClient, ttlMs = 60_000): ApiClient {
  const cache = new Map<string, { data: unknown; expires: number }>();

  return new Proxy(client, {
    get(target, prop) {
      if (prop === "get") {
        return async <T>(path: string): Promise<T> => {
          const cached = cache.get(path);
          if (cached && cached.expires > Date.now()) {
            return cached.data as T;
          }
          const data = await target.get<T>(path);
          cache.set(path, { data, expires: Date.now() + ttlMs });
          return data;
        };
      }
      return Reflect.get(target, prop);
    },
  });
}

// Usage
const raw: ApiClient = { get: async <T>(path: string) => fetch(path).then(r => r.json()) as T };
const cached = createCachingProxy(raw, 30_000);
```

### Framework equivalents `[interpretation]`

- **ES6 Proxy**: Built-in — used by Vue 3 reactivity, MobX, and Immer under the hood.
- **NestJS Interceptors**: Act as proxies around handler execution (logging, caching, transform).

---

# Behavioral Patterns

---

## Chain of Responsibility (p. 223)

### Modern TypeScript `[interpretation]`

Middleware pipelines — the most common Chain of Responsibility in Node.js.

```typescript
type Context = { user?: string; role?: string; body?: unknown; response?: string };
type Next = () => Promise<void>;
type Middleware = (ctx: Context, next: Next) => Promise<void>;

const auth: Middleware = async (ctx, next) => {
  if (!ctx.user) { ctx.response = "401 Unauthorized"; return; }
  await next();
};

const authorize: Middleware = async (ctx, next) => {
  if (ctx.role !== "admin") { ctx.response = "403 Forbidden"; return; }
  await next();
};

const handler: Middleware = async (ctx) => {
  ctx.response = `Hello ${ctx.user}`;
};

async function runChain(middlewares: Middleware[], ctx: Context) {
  const run = (i: number): Promise<void> =>
    i < middlewares.length ? middlewares[i](ctx, () => run(i + 1)) : Promise.resolve();
  await run(0);
}

const ctx: Context = { user: "alice", role: "admin" };
await runChain([auth, authorize, handler], ctx);
```

### Framework equivalents `[interpretation]`

- **Express/Koa**: `app.use(fn)` — the entire middleware stack is a chain of responsibility.
- **NestJS**: Guards, Interceptors, Pipes execute in a defined chain before/after handlers.

---

## Command (p. 233)

### Modern TypeScript `[interpretation]`

Command objects with undo — or simply typed function objects for simpler cases.

```typescript
interface Command {
  execute(): void;
  undo(): void;
}

class EditorHistory {
  private stack: Command[] = [];

  execute(cmd: Command) {
    cmd.execute();
    this.stack.push(cmd);
  }

  undo() {
    this.stack.pop()?.undo();
  }
}

class InsertText implements Command {
  constructor(private doc: string[], private pos: number, private text: string) {}
  execute() { this.doc.splice(this.pos, 0, this.text); }
  undo() { this.doc.splice(this.pos, 1); }
}

class DeleteText implements Command {
  private deleted = "";
  constructor(private doc: string[], private pos: number) {}
  execute() { [this.deleted] = this.doc.splice(this.pos, 1); }
  undo() { this.doc.splice(this.pos, 0, this.deleted); }
}

const doc = ["Hello", "World"];
const history = new EditorHistory();
history.execute(new InsertText(doc, 1, "Beautiful"));
// doc: ["Hello", "Beautiful", "World"]
history.undo();
// doc: ["Hello", "World"]
```

### Framework equivalents `[interpretation]`

- **Redux actions**: `{ type: "INCREMENT", payload: 1 }` — command objects dispatched to a store.
- **NestJS CQRS**: `@nestjs/cqrs` `CommandBus` + `ICommand` + `ICommandHandler`.

---

## Interpreter (p. 243)

### Modern TypeScript `[interpretation]`

Build a small expression evaluator using discriminated unions and recursive evaluation.

```typescript
type Expr =
  | { kind: "num"; value: number }
  | { kind: "add"; left: Expr; right: Expr }
  | { kind: "mul"; left: Expr; right: Expr }
  | { kind: "var"; name: string };

type Env = Record<string, number>;

function evaluate(expr: Expr, env: Env): number {
  switch (expr.kind) {
    case "num": return expr.value;
    case "var": return env[expr.name] ?? 0;
    case "add": return evaluate(expr.left, env) + evaluate(expr.right, env);
    case "mul": return evaluate(expr.left, env) * evaluate(expr.right, env);
  }
}

// 2 * (x + 3)
const ast: Expr = {
  kind: "mul",
  left: { kind: "num", value: 2 },
  right: { kind: "add", left: { kind: "var", name: "x" }, right: { kind: "num", value: 3 } },
};

console.log(evaluate(ast, { x: 5 })); // 16
```

### Framework equivalents `[interpretation]`

- **Template literal types**: TypeScript's type system itself is an interpreter for string patterns.
- **GraphQL**: Schema + resolvers form an interpreter for the GraphQL query language.

---

## Iterator (p. 257)

### Modern TypeScript `[interpretation]`

Use `Symbol.iterator` and generator functions — built-in language support.

```typescript
class Range implements Iterable<number> {
  constructor(private start: number, private end: number, private step = 1) {}

  *[Symbol.iterator](): Generator<number> {
    for (let i = this.start; i < this.end; i += this.step) {
      yield i;
    }
  }
}

// for...of works natively
for (const n of new Range(0, 10, 2)) {
  console.log(n); // 0, 2, 4, 6, 8
}

// Spread, destructuring, Array.from all work
const nums = [...new Range(1, 6)]; // [1, 2, 3, 4, 5]

// Async iterator for paginated API
async function* paginate<T>(fetchPage: (cursor?: string) => Promise<{ data: T[]; next?: string }>) {
  let cursor: string | undefined;
  do {
    const page = await fetchPage(cursor);
    yield* page.data;
    cursor = page.next;
  } while (cursor);
}
```

### Framework equivalents `[interpretation]`

- **`for await...of`**: Async iterators for streams, paginated APIs.
- **Node.js Readable streams**: Implement `Symbol.asyncIterator` — `for await (const chunk of stream)`.

---

## Mediator (p. 273)

### Modern TypeScript `[interpretation]`

A central mediator coordinates communication so colleagues don't reference each other directly.

```typescript
type EventMap = {
  "order:placed": { orderId: string; items: string[] };
  "order:paid": { orderId: string; amount: number };
  "inventory:reserved": { orderId: string };
};

class EventMediator {
  private handlers = new Map<string, Set<(data: any) => void>>();

  on<K extends keyof EventMap>(event: K, handler: (data: EventMap[K]) => void) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
  }

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]) {
    this.handlers.get(event)?.forEach(fn => fn(data));
  }
}

const mediator = new EventMediator();

// Services subscribe — no direct coupling
mediator.on("order:placed", ({ orderId, items }) => {
  console.log(`Inventory: reserving ${items.length} items for ${orderId}`);
  mediator.emit("inventory:reserved", { orderId });
});

mediator.on("order:paid", ({ orderId, amount }) => {
  console.log(`Shipping: preparing order ${orderId}, charged ${amount}`);
});
```

### Framework equivalents `[interpretation]`

- **NestJS EventEmitter2**: `@OnEvent('order.placed')` — decorator-driven mediator.
- **Redux**: The store mediates between action dispatchers and reducer/subscriber colleagues.

---

## Memento (p. 283)

### Modern TypeScript `[interpretation]`

Capture and restore state snapshots — use `structuredClone` for safe deep copies.

```typescript
interface Memento<T> {
  readonly state: T;
  readonly timestamp: number;
}

class FormState {
  private history: Memento<Record<string, string>>[] = [];
  private data: Record<string, string> = {};

  set(key: string, value: string) {
    this.history.push({ state: structuredClone(this.data), timestamp: Date.now() });
    this.data[key] = value;
  }

  get current() { return { ...this.data }; }

  undo(): boolean {
    const memento = this.history.pop();
    if (!memento) return false;
    this.data = memento.state;
    return true;
  }

  get snapshotCount() { return this.history.length; }
}

const form = new FormState();
form.set("name", "Alice");
form.set("email", "alice@test.com");
form.set("email", "alice@real.com");
form.undo(); // email back to alice@test.com
```

### Framework equivalents `[interpretation]`

- **Redux DevTools**: Time-travel debugging stores a stack of state mementos.
- **Immer patches**: `produceWithPatches` captures before/after state — a structured memento.

---

## Observer (p. 293)

### Modern TypeScript `[interpretation]`

Node.js `EventEmitter`, RxJS `Observable`, or a typed custom implementation.

```typescript
import { EventEmitter } from "node:events";
import { on } from "node:events";

// Type-safe EventEmitter wrapper
interface StockEvents {
  priceChange: [symbol: string, price: number];
  alert: [message: string];
}

class StockTicker extends EventEmitter<StockEvents> {
  private prices = new Map<string, number>();

  updatePrice(symbol: string, price: number) {
    const old = this.prices.get(symbol);
    this.prices.set(symbol, price);
    this.emit("priceChange", symbol, price);
    if (old && Math.abs(price - old) / old > 0.05) {
      this.emit("alert", `${symbol} moved >5%: ${old} -> ${price}`);
    }
  }
}

const ticker = new StockTicker();
ticker.on("priceChange", (sym, price) => console.log(`${sym}: $${price}`));
ticker.on("alert", (msg) => console.warn(msg));

// Async iteration over events (Node 20+)
// for await (const [sym, price] of on(ticker, "priceChange")) { ... }
```

### Framework equivalents `[interpretation]`

- **RxJS**: `Observable`, `Subject`, `BehaviorSubject` — the gold standard Observer in TS.
- **NestJS**: `@OnEvent()` decorator with `EventEmitter2` module.

---

## State (p. 305)

### Modern TypeScript `[interpretation]`

Discriminated unions model state machines — exhaustive switch with `never` ensures completeness.

```typescript
type OrderState =
  | { status: "draft" }
  | { status: "submitted"; submittedAt: Date }
  | { status: "paid"; paidAt: Date; txId: string }
  | { status: "shipped"; trackingNo: string }
  | { status: "cancelled"; reason: string };

function transition(state: OrderState, action: string, payload?: any): OrderState {
  switch (state.status) {
    case "draft":
      if (action === "submit") return { status: "submitted", submittedAt: new Date() };
      break;
    case "submitted":
      if (action === "pay") return { status: "paid", paidAt: new Date(), txId: payload };
      if (action === "cancel") return { status: "cancelled", reason: payload ?? "user" };
      break;
    case "paid":
      if (action === "ship") return { status: "shipped", trackingNo: payload };
      break;
    case "shipped":
    case "cancelled":
      break; // terminal states
    default:
      const _exhaustive: never = state;
      throw new Error(`Unhandled state: ${_exhaustive}`);
  }
  throw new Error(`Invalid transition: ${state.status} + ${action}`);
}

let order: OrderState = { status: "draft" };
order = transition(order, "submit");
order = transition(order, "pay", "tx_abc");
```

### Framework equivalents `[interpretation]`

- **XState**: Full state machine library for TS — `createMachine()` with typed states and events.
- **Redux reducers**: State + action -> new state — same pattern, different terminology.

---

## Strategy (p. 315)

### Modern TypeScript `[interpretation]`

Function types and generics — no need for class hierarchies.

```typescript
type CompressionStrategy = (data: Buffer) => Promise<Buffer>;

const gzip: CompressionStrategy = async (data) => {
  const { gzip } = await import("node:zlib");
  const { promisify } = await import("node:util");
  return promisify(gzip)(data);
};

const identity: CompressionStrategy = async (data) => data;

const brotli: CompressionStrategy = async (data) => {
  const { brotliCompress } = await import("node:zlib");
  const { promisify } = await import("node:util");
  return promisify(brotliCompress)(data);
};

async function compressFile(data: Buffer, strategy: CompressionStrategy): Promise<Buffer> {
  return strategy(data);
}

// Strategy selected at runtime
const strategies: Record<string, CompressionStrategy> = { gzip, brotli, none: identity };
const compress = strategies[process.env.COMPRESSION ?? "gzip"];
const result = await compressFile(Buffer.from("hello"), compress);
```

### Framework equivalents `[interpretation]`

- **Passport.js**: Each `Strategy` (local, JWT, OAuth) is swappable authentication logic.
- **NestJS Guards**: Different guard implementations (`JwtGuard`, `RolesGuard`) are interchangeable strategies.

---

## Template Method (p. 325)

### Modern TypeScript `[interpretation]`

Abstract classes with `abstract` methods define the skeleton; subclasses fill in steps.

```typescript
abstract class DataPipeline<TRaw, TClean, TResult> {
  async run(): Promise<TResult> {
    const raw = await this.extract();
    const clean = await this.transform(raw);
    const result = await this.load(clean);
    await this.notify(result);
    return result;
  }

  protected abstract extract(): Promise<TRaw>;
  protected abstract transform(raw: TRaw): Promise<TClean>;
  protected abstract load(data: TClean): Promise<TResult>;

  protected async notify(result: TResult): Promise<void> {
    console.log("Pipeline complete", result);
  }
}

class CsvToDbPipeline extends DataPipeline<string, Record<string, string>[], number> {
  protected async extract() { return "name,age\nAlice,30\nBob,25"; }

  protected async transform(raw: string) {
    const [header, ...rows] = raw.split("\n");
    const keys = header.split(",");
    return rows.map(r => Object.fromEntries(r.split(",").map((v, i) => [keys[i], v])));
  }

  protected async load(data: Record<string, string>[]) {
    console.log(`Inserting ${data.length} rows`);
    return data.length;
  }
}
```

### Framework equivalents `[interpretation]`

- **NestJS Lifecycle hooks**: `OnModuleInit`, `OnApplicationBootstrap` — framework calls the template, you fill in hooks.
- **TypeORM Subscribers**: `beforeInsert()`, `afterUpdate()` — fixed lifecycle, custom steps.

---

## Visitor (p. 331)

### Modern TypeScript `[interpretation]`

Discriminated unions with exhaustive switch replace the classic double-dispatch visitor. The `never` check guarantees all cases are handled.

```typescript
type ASTNode =
  | { kind: "literal"; value: number }
  | { kind: "binary"; op: "+" | "*"; left: ASTNode; right: ASTNode }
  | { kind: "unary"; op: "-"; operand: ASTNode };

// Visitor as a function over the discriminated union
function prettyPrint(node: ASTNode): string {
  switch (node.kind) {
    case "literal": return String(node.value);
    case "binary": return `(${prettyPrint(node.left)} ${node.op} ${prettyPrint(node.right)})`;
    case "unary": return `(${node.op}${prettyPrint(node.operand)})`;
    default: {
      const _exhaustive: never = node;
      throw new Error(`Unhandled node: ${JSON.stringify(_exhaustive)}`);
    }
  }
}

function evaluate(node: ASTNode): number {
  switch (node.kind) {
    case "literal": return node.value;
    case "binary": return node.op === "+" ? evaluate(node.left) + evaluate(node.right)
                                          : evaluate(node.left) * evaluate(node.right);
    case "unary": return -evaluate(node.operand);
    default: { const _: never = node; throw new Error(`Unhandled: ${_}`); }
  }
}

const ast: ASTNode = { kind: "binary", op: "+", left: { kind: "literal", value: 2 },
  right: { kind: "unary", op: "-", left: { kind: "literal", value: 3 } } as any };
```

### Framework equivalents `[interpretation]`

- **TypeScript Compiler API**: `ts.forEachChild(node, visitor)` — classic visitor over AST nodes.
- **ESLint Rules**: Each rule is a visitor that walks the AST — `{ Identifier(node) { ... } }`.

---

*23 patterns covered. End of TypeScript reference.*
