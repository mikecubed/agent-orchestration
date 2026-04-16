# GoF Design Pattern Catalog — JavaScript Reference

**Purpose**: Modern JavaScript code examples for all 23 GoF patterns.
Use alongside `catalog-core.md`.

**Stack coverage**: Node.js 22+, ES2024, Express where applicable

**Key principle**: Many GoF patterns are built into JavaScript or simplified by first-class
functions and prototypal inheritance. Show the idiomatic JS way, not a class-heavy OO port.

**Anti-hallucination policy**: All code is `[interpretation]`.

---

# Creational Patterns

---

## Abstract Factory (p. 87)

### Modern JavaScript `[interpretation]`

Create families of related objects without specifying concrete classes, using factory functions that return object literals.

```javascript
// Abstract factory via plain functions returning object literals
function createLightTheme() {
  return {
    button: () => ({ render: () => '<button class="light-btn">' }),
    dialog: () => ({ render: () => '<div class="light-dialog">' }),
  };
}

function createDarkTheme() {
  return {
    button: () => ({ render: () => '<button class="dark-btn">' }),
    dialog: () => ({ render: () => '<div class="dark-dialog">' }),
  };
}

function buildUI(factory) {
  const btn = factory.button();
  const dlg = factory.dialog();
  return { btn, dlg };
}

const ui = buildUI(createDarkTheme());
console.log(ui.btn.render()); // <button class="dark-btn">
```

### Framework equivalents `[interpretation]`

- **Express**: `app.set('view engine', ...)` selects a family of rendering functions (Pug vs EJS vs Handlebars).
- **Knex.js**: `knex({ client: 'pg' })` vs `knex({ client: 'mysql2' })` — same query API, different SQL dialects.
- **React (via JSX)**: Theme providers supply families of styled components.

---

## Builder (p. 97)

### Modern JavaScript `[interpretation]`

Separate complex construction from representation using a fluent chainable API.

```javascript
class QueryBuilder {
  #table;
  #conditions = [];
  #columns = ['*'];
  #limit;

  from(table) { this.#table = table; return this; }
  select(...cols) { this.#columns = cols; return this; }
  where(condition) { this.#conditions.push(condition); return this; }
  take(n) { this.#limit = n; return this; }

  build() {
    let sql = `SELECT ${this.#columns.join(', ')} FROM ${this.#table}`;
    if (this.#conditions.length) sql += ` WHERE ${this.#conditions.join(' AND ')}`;
    if (this.#limit) sql += ` LIMIT ${this.#limit}`;
    return sql;
  }
}

const query = new QueryBuilder()
  .from('users')
  .select('id', 'name')
  .where('active = true')
  .take(10)
  .build();
// SELECT id, name FROM users WHERE active = true LIMIT 10
```

### Framework equivalents `[interpretation]`

- **Knex.js**: `knex('users').select('id').where({ active: true }).limit(10)` — canonical JS builder.
- **Supertest**: `request(app).get('/api').set('Authorization', token).expect(200)`.
- **Yup / Zod**: Schema validation builders — `z.string().min(3).max(100)`.

---

## Factory Method (p. 107)

### Modern JavaScript `[interpretation]`

Define a creation interface in a base class and let subclasses (or factory functions) decide what to instantiate.

```javascript
class Notification {
  send(message) { throw new Error('Subclass must implement send()'); }
}

class EmailNotification extends Notification {
  send(message) { return `Email: ${message}`; }
}

class SMSNotification extends Notification {
  send(message) { return `SMS: ${message}`; }
}

// Factory function — more idiomatic JS than abstract base class
function createNotification(channel) {
  const factories = {
    email: () => new EmailNotification(),
    sms: () => new SMSNotification(),
  };
  const factory = factories[channel];
  if (!factory) throw new Error(`Unknown channel: ${channel}`);
  return factory();
}

const n = createNotification('sms');
console.log(n.send('Hello')); // SMS: Hello
```

### Framework equivalents `[interpretation]`

- **Node.js `stream.Readable.from()`**: Factory that wraps iterables into stream objects.
- **Express**: `express.Router()` — factory for route-handler groups.
- **`http.createServer()`**: Factory method in Node.js stdlib.

---

## Prototype (p. 117)

### Modern JavaScript `[interpretation]`

JavaScript IS a prototype-based language. `Object.create()` and `structuredClone()` are the pattern itself.

```javascript
// Prototypal inheritance — the language's native mechanism
const vehicleProto = {
  drive() { return `${this.make} ${this.model} moving at ${this.speed} mph`; },
  clone() { return structuredClone(this); },
};

const car = Object.create(vehicleProto, {
  make:  { value: 'Toyota', writable: true, enumerable: true },
  model: { value: 'Camry', writable: true, enumerable: true },
  speed: { value: 60, writable: true, enumerable: true },
});

const sportsCar = car.clone();
sportsCar.model = 'Supra';
sportsCar.speed = 155;

console.log(car.drive());       // Toyota Camry moving at 60 mph
console.log(sportsCar.drive()); // Toyota Supra moving at 155 mph
```

### Framework equivalents `[interpretation]`

- **`structuredClone()`**: ES2022+ deep clone built into the language — the modern prototype copy.
- **`Object.create()`**: Direct prototypal linkage, the core JS mechanism.
- **Lodash `_.cloneDeep()`**: Pre-structuredClone deep clone utility.

---

## Singleton (p. 127)

### Modern JavaScript `[interpretation]`

ES modules are cached after first evaluation — `import` always returns the same instance. The module IS the singleton.

```javascript
// config.mjs — the module itself is the singleton
class Config {
  #settings = new Map();

  set(key, value) { this.#settings.set(key, value); }
  get(key) { return this.#settings.get(key); }
}

// Single instance, exported. Every importer gets the same object.
const config = new Config();
export default config;

// --- consumer.mjs ---
// import config from './config.mjs';
// config.set('port', 3000);  // same instance everywhere
```

### Framework equivalents `[interpretation]`

- **Node.js `require()` cache**: CommonJS modules are cached in `require.cache` — same singleton behavior.
- **Express `app`**: Typically created once and exported — acts as a singleton.
- **`globalThis`**: Escape hatch when module caching is unreliable (e.g., dev HMR).

---

# Structural Patterns

---

## Adapter (p. 139)

### Modern JavaScript `[interpretation]`

Wrap an incompatible interface so it conforms to the expected one, using a thin wrapper function or class.

```javascript
// Legacy XML service with incompatible interface
class LegacyXmlApi {
  fetchXml() { return '<user><name>Alice</name></user>'; }
}

// Adapter wraps it to match the modern JSON interface
class JsonApiAdapter {
  #legacy;
  constructor(legacyApi) { this.#legacy = legacyApi; }

  async fetchJson() {
    const xml = this.#legacy.fetchXml();
    // Simplified parse — real code would use a proper XML parser
    const name = xml.match(/<name>(.+?)<\/name>/)?.[1];
    return { name };
  }
}

const adapter = new JsonApiAdapter(new LegacyXmlApi());
const data = await adapter.fetchJson();
console.log(data); // { name: 'Alice' }
```

### Framework equivalents `[interpretation]`

- **Express middleware**: Adapts `(req, res, next)` into framework-specific request handling.
- **`util.promisify()`**: Adapts Node.js callback-style functions to Promise-based API.
- **`stream.Readable.from()`**: Adapts iterables/async-iterables into Node.js Readable streams.

---

## Bridge (p. 151)

### Modern JavaScript `[interpretation]`

Decouple an abstraction from its implementation by injecting the implementation as a dependency.

```javascript
// Implementations (vary independently)
const consoleRenderer = {
  renderElement(tag, content) { console.log(`[${tag}] ${content}`); },
};

const htmlRenderer = {
  renderElement(tag, content) { return `<${tag}>${content}</${tag}>`; },
};

// Abstraction — delegates to injected renderer
class Page {
  #renderer;
  constructor(renderer) { this.#renderer = renderer; }

  renderTitle(text)   { return this.#renderer.renderElement('h1', text); }
  renderContent(text) { return this.#renderer.renderElement('p', text); }
}

const htmlPage = new Page(htmlRenderer);
console.log(htmlPage.renderTitle('Hello'));   // <h1>Hello</h1>
console.log(htmlPage.renderContent('World')); // <p>World</p>
```

### Framework equivalents `[interpretation]`

- **Winston logger**: `new winston.createLogger({ transports: [...] })` — abstraction (logger) bridged to transports (console, file, HTTP).
- **Knex.js**: Query builder (abstraction) bridged to database dialect (implementation).
- **Passport.js**: Authentication framework bridged to strategy implementations.

---

## Composite (p. 163)

### Modern JavaScript `[interpretation]`

Treat individual objects and compositions uniformly via a shared interface, naturally expressed with arrays and recursion.

```javascript
class FileItem {
  constructor(name, size) { this.name = name; this.size = size; }
  getSize() { return this.size; }
  print(indent = '') { console.log(`${indent}${this.name} (${this.size}b)`); }
}

class Directory {
  constructor(name) { this.name = name; this.children = []; }

  add(child) { this.children.push(child); return this; }

  getSize() {
    return this.children.reduce((sum, c) => sum + c.getSize(), 0);
  }

  print(indent = '') {
    console.log(`${indent}${this.name}/`);
    this.children.forEach(c => c.print(indent + '  '));
  }
}

const root = new Directory('src')
  .add(new FileItem('index.js', 120))
  .add(new Directory('utils')
    .add(new FileItem('helpers.js', 80))
    .add(new FileItem('constants.js', 40)));

root.print();    // tree output
root.getSize();  // 240
```

### Framework equivalents `[interpretation]`

- **React component tree**: Components nest arbitrarily; `render()` traverses the tree uniformly.
- **Express Router**: Routers can mount sub-routers — composite of route handlers.
- **DOM**: `Node` / `Element` — the canonical composite in the browser.

---

## Decorator (p. 175)

### Modern JavaScript `[interpretation]`

No native decorator syntax in plain JS. Use higher-order functions that wrap and extend behavior.

```javascript
// Base function
function fetchData(url) {
  return fetch(url).then(r => r.json());
}

// Decorator: add logging
function withLogging(fn) {
  return async function (...args) {
    console.log(`Calling ${fn.name} with`, args);
    const result = await fn(...args);
    console.log(`Result:`, result);
    return result;
  };
}

// Decorator: add retry
function withRetry(fn, retries = 3) {
  return async function (...args) {
    for (let i = 0; i < retries; i++) {
      try { return await fn(...args); }
      catch (err) { if (i === retries - 1) throw err; }
    }
  };
}

// Compose decorators (innermost applied first)
const resilientFetch = withLogging(withRetry(fetchData, 3));
// resilientFetch('https://api.example.com/data');
```

### Framework equivalents `[interpretation]`

- **Express middleware**: `app.use(cors())`, `app.use(helmet())` — each decorates the request pipeline.
- **Morgan**: `app.use(morgan('dev'))` — decorates Express with logging.
- **`util.callbackify()` / `util.promisify()`**: Wraps a function with a different calling convention.

---

## Facade (p. 185)

### Modern JavaScript `[interpretation]`

A module that exports a simplified API, hiding the complexity of multiple subsystems behind it.

```javascript
// Complex subsystems
import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { pipeline } from 'node:stream/promises';

// Facade — one simple function hides three subsystems
export async function hashFile(filePath, algorithm = 'sha256') {
  const hash = createHash(algorithm);
  const stream = createReadStream(filePath);
  await pipeline(stream, hash);
  return hash.digest('hex');
}

// Consumer only knows the facade
// const checksum = await hashFile('./package.json');
```

### Framework equivalents `[interpretation]`

- **Express `app`**: Facade over `http.createServer`, routing, middleware, and view rendering.
- **`fs/promises`**: Facade over lower-level `fs` callback and sync APIs.
- **Axios**: Facade over `http`/`https` with simpler defaults, interceptors, and transforms.

---

## Flyweight (p. 195)

### Modern JavaScript `[interpretation]`

Share intrinsic state among many objects to reduce memory; use a cache (Map) to store shared instances.

```javascript
class Icon {
  #src;
  #dimensions;
  constructor(src, width, height) {
    this.#src = src;
    this.#dimensions = { width, height };
  }
  render(x, y) {
    return `<img src="${this.#src}" ` +
           `width="${this.#dimensions.width}" height="${this.#dimensions.height}" ` +
           `style="position:absolute;left:${x}px;top:${y}px">`;
  }
}

// Flyweight factory — shared pool
const iconCache = new Map();

function getIcon(src, width, height) {
  const key = `${src}:${width}:${height}`;
  if (!iconCache.has(key)) {
    iconCache.set(key, new Icon(src, width, height));
  }
  return iconCache.get(key);
}

// 1000 pins on a map, but only a handful of unique Icon objects
const pins = Array.from({ length: 1000 }, (_, i) => ({
  icon: getIcon('pin-red.png', 24, 24),  // shared
  x: Math.random() * 800,                 // extrinsic
  y: Math.random() * 600,                 // extrinsic
}));
```

### Framework equivalents `[interpretation]`

- **`String.prototype` interning**: JS engines intern short strings automatically — language-level flyweight.
- **`Buffer.allocUnsafe()` + pool**: Node.js reuses a pre-allocated buffer pool for small allocations.
- **`WeakRef` + `FinalizationRegistry`**: ES2021+ primitives for cache-friendly flyweight pools.

---

## Proxy (p. 207)

### Modern JavaScript `[interpretation]`

`Proxy` is a first-class language feature in ES2015+. Use `new Proxy(target, handler)` to intercept operations.

```javascript
function createValidatedObject(target, schema) {
  return new Proxy(target, {
    set(obj, prop, value) {
      const validator = schema[prop];
      if (validator && !validator(value)) {
        throw new TypeError(`Invalid value for "${prop}": ${value}`);
      }
      obj[prop] = value;
      return true;
    },
    get(obj, prop) {
      if (!(prop in obj)) {
        console.warn(`Accessing undefined property: "${prop}"`);
      }
      return obj[prop];
    },
  });
}

const user = createValidatedObject({}, {
  age: (v) => Number.isInteger(v) && v >= 0 && v <= 150,
  name: (v) => typeof v === 'string' && v.length > 0,
});

user.name = 'Alice';  // OK
user.age = 30;         // OK
// user.age = -5;      // TypeError: Invalid value for "age": -5
```

### Framework equivalents `[interpretation]`

- **Vue 3 reactivity**: `reactive()` uses `Proxy` to track property access and trigger re-renders.
- **Immer**: `produce(state, draft => { ... })` — proxy-based immutable state updates.
- **`http-proxy-middleware`**: Express middleware that proxies HTTP requests — network-level proxy.

---

# Behavioral Patterns

---

## Chain of Responsibility (p. 223)

### Modern JavaScript `[interpretation]`

Express middleware IS this pattern: each handler either handles the request or calls `next()`.

```javascript
// Standalone chain (no Express dependency)
function createChain(...handlers) {
  return function handle(request) {
    let index = 0;
    function next() {
      const handler = handlers[index++];
      if (handler) handler(request, next);
    }
    next();
  };
}

const authenticate = (req, next) => {
  if (!req.token) { req.error = '401 Unauthorized'; return; }
  req.user = { id: 1, role: 'admin' };
  next();
};

const authorize = (req, next) => {
  if (req.user?.role !== 'admin') { req.error = '403 Forbidden'; return; }
  next();
};

const respond = (req) => {
  req.result = `Welcome, user ${req.user.id}`;
};

const pipeline = createChain(authenticate, authorize, respond);
const req = { token: 'abc123' };
pipeline(req);
console.log(req.result); // Welcome, user 1
```

### Framework equivalents `[interpretation]`

- **Express `app.use()`**: `app.use(cors(), helmet(), bodyParser.json(), router)` — canonical chain.
- **Koa**: `app.use(async (ctx, next) => { ... await next(); })` — async chain with upstream/downstream.
- **Node.js `stream.pipeline()`**: Chains transform streams in sequence.

---

## Command (p. 233)

### Modern JavaScript `[interpretation]`

Closures and callback functions ARE commands — they encapsulate an action with its context.

```javascript
class Editor {
  #content = '';
  #history = [];

  /** @param {{ execute: Function, undo: Function }} command */
  run(command) {
    command.execute(this);
    this.#history.push(command);
  }

  undo() {
    const command = this.#history.pop();
    command?.undo(this);
  }

  get content() { return this.#content; }
  set content(v) { this.#content = v; }
}

// Command objects as plain objects with execute/undo
function insertText(text) {
  return {
    execute(editor) { editor.content += text; },
    undo(editor)    { editor.content = editor.content.slice(0, -text.length); },
  };
}

const editor = new Editor();
editor.run(insertText('Hello'));
editor.run(insertText(' World'));
console.log(editor.content); // Hello World

editor.undo();
console.log(editor.content); // Hello
```

### Framework equivalents `[interpretation]`

- **Redux actions**: `{ type: 'ADD_TODO', payload: { text: '...' } }` — serializable command objects.
- **`child_process.exec()`**: Encapsulates a shell command string for deferred execution.
- **Yargs / Commander.js**: CLI frameworks that register command objects with handlers.

---

## Interpreter (p. 243)

### Modern JavaScript `[interpretation]`

Define a grammar representation and an interpreter that evaluates expressions against it.

```javascript
// Simple expression language: "price > 100 AND category = 'electronics'"
const expressions = {
  gt:  (field, value) => (ctx) => ctx[field] > value,
  eq:  (field, value) => (ctx) => ctx[field] === value,
  and: (...exprs)     => (ctx) => exprs.every(e => e(ctx)),
  or:  (...exprs)     => (ctx) => exprs.some(e => e(ctx)),
  not: (expr)         => (ctx) => !expr(ctx),
};

// Build the expression tree
const filter = expressions.and(
  expressions.gt('price', 100),
  expressions.eq('category', 'electronics'),
);

const products = [
  { name: 'Laptop', price: 999, category: 'electronics' },
  { name: 'Pen', price: 2, category: 'office' },
  { name: 'Cable', price: 15, category: 'electronics' },
];

console.log(products.filter(filter));
// [{ name: 'Laptop', price: 999, category: 'electronics' }]
```

### Framework equivalents `[interpretation]`

- **Template literals / tagged templates**: `` html`<div>${content}</div>` `` — mini DSL interpreters.
- **MongoDB query language**: `{ price: { $gt: 100 }, category: 'electronics' }` — object-based expression tree.
- **`RegExp`**: Built-in interpreter for regular expression grammar.

---

## Iterator (p. 257)

### Modern JavaScript `[interpretation]`

`Symbol.iterator`, `for...of`, and generators are the pattern built into the language.

```javascript
class Range {
  #start;
  #end;
  #step;

  constructor(start, end, step = 1) {
    this.#start = start;
    this.#end = end;
    this.#step = step;
  }

  *[Symbol.iterator]() {
    for (let i = this.#start; i <= this.#end; i += this.#step) {
      yield i;
    }
  }
}

// Works with all iteration protocols
const range = new Range(1, 10, 2);
for (const n of range) process.stdout.write(`${n} `); // 1 3 5 7 9

const arr = [...range];            // [1, 3, 5, 7, 9]
const [first, second] = range;     // 1, 3

// Async iteration
async function* fetchPages(url) {
  let page = 1;
  while (true) {
    const res = await fetch(`${url}?page=${page++}`);
    const data = await res.json();
    if (!data.length) return;
    yield data;
  }
}
```

### Framework equivalents `[interpretation]`

- **`for await...of`**: Async iteration protocol — built into the language for streams and async generators.
- **Node.js `Readable` streams**: Implement `Symbol.asyncIterator` — streamable with `for await`.
- **`Array.from()`, spread `[...]`, destructuring**: All consume the iterator protocol.

---

## Mediator (p. 273)

### Modern JavaScript `[interpretation]`

A central hub that coordinates communication between components so they don't reference each other directly.

```javascript
class ChatRoom {
  #users = new Map();

  join(user) {
    this.#users.set(user.name, user);
    user.room = this;
    this.broadcast(user.name, `${user.name} joined the room`);
  }

  send(from, to, message) {
    const recipient = this.#users.get(to);
    recipient?.receive(from, message);
  }

  broadcast(from, message) {
    for (const [name, user] of this.#users) {
      if (name !== from) user.receive(from, message);
    }
  }
}

class User {
  constructor(name) { this.name = name; this.room = null; }
  send(to, msg)        { this.room.send(this.name, to, msg); }
  receive(from, msg)   { console.log(`[${this.name}] ${from}: ${msg}`); }
}

const room = new ChatRoom();
const alice = new User('Alice');
const bob = new User('Bob');
room.join(alice);
room.join(bob);
alice.send('Bob', 'Hi Bob!'); // [Bob] Alice: Hi Bob!
```

### Framework equivalents `[interpretation]`

- **Express `app`**: Mediates between middleware, routers, and error handlers.
- **EventEmitter (as mediator)**: Central emitter that decouples producers from consumers.
- **Socket.io rooms**: `io.to('room').emit(...)` — server mediates message routing.

---

## Memento (p. 283)

### Modern JavaScript `[interpretation]`

Capture and restore an object's state without exposing its internals, using snapshots.

```javascript
class TextEditor {
  #content = '';

  type(text) { this.#content += text; }
  get content() { return this.#content; }

  save() {
    // Memento — an opaque snapshot (frozen object)
    return Object.freeze({ content: this.#content, timestamp: Date.now() });
  }

  restore(memento) {
    this.#content = memento.content;
  }
}

// Caretaker manages history
class History {
  #snapshots = [];
  save(memento)   { this.#snapshots.push(memento); }
  pop()           { return this.#snapshots.pop(); }
}

const editor = new TextEditor();
const history = new History();

editor.type('Hello');
history.save(editor.save());

editor.type(' World');
console.log(editor.content); // Hello World

editor.restore(history.pop());
console.log(editor.content); // Hello
```

### Framework equivalents `[interpretation]`

- **Redux**: `getState()` returns a serializable snapshot; time-travel debugging restores previous states.
- **`structuredClone()`**: Creates deep snapshot copies suitable for mementos.
- **`localStorage` / `sessionStorage`**: Browser-side persistence of state snapshots.

---

## Observer (p. 293)

### Modern JavaScript `[interpretation]`

`EventEmitter` is the Observer pattern built into Node.js.

```javascript
import { EventEmitter } from 'node:events';

class Store extends EventEmitter {
  #state;

  constructor(initial = {}) {
    super();
    this.#state = initial;
  }

  getState() { return { ...this.#state }; }

  setState(updates) {
    const prev = this.#state;
    this.#state = { ...prev, ...updates };
    this.emit('change', { prev, next: this.#state });
  }
}

const store = new Store({ count: 0 });

// Observers subscribe
store.on('change', ({ prev, next }) => {
  console.log(`Count changed: ${prev.count} -> ${next.count}`);
});

store.setState({ count: 1 }); // Count changed: 0 -> 1
store.setState({ count: 2 }); // Count changed: 1 -> 2
```

### Framework equivalents `[interpretation]`

- **Node.js `EventEmitter`**: Core module — the canonical Observer in Node.
- **`EventTarget` / `addEventListener`**: Browser-side Observer built into the DOM.
- **RxJS `Observable`**: Extends Observer with operators for filtering, mapping, combining streams.
- **`AbortSignal`**: Observer for cancellation — `signal.addEventListener('abort', handler)`.

---

## State (p. 305)

### Modern JavaScript `[interpretation]`

An object whose behavior changes by swapping its internal state object.

```javascript
const states = {
  idle: {
    start(machine) {
      console.log('Starting download...');
      machine.setState(states.downloading);
    },
    cancel() { console.log('Nothing to cancel.'); },
  },
  downloading: {
    start()  { console.log('Already downloading.'); },
    cancel(machine) {
      console.log('Download cancelled.');
      machine.setState(states.idle);
    },
    complete(machine) {
      console.log('Download complete.');
      machine.setState(states.done);
    },
  },
  done: {
    start(machine) {
      console.log('Restarting download...');
      machine.setState(states.downloading);
    },
    cancel() { console.log('Already done.'); },
  },
};

class DownloadManager {
  #state = states.idle;

  setState(state) { this.#state = state; }
  start()    { this.#state.start?.(this); }
  cancel()   { this.#state.cancel?.(this); }
  complete() { this.#state.complete?.(this); }
}

const dm = new DownloadManager();
dm.start();    // Starting download...
dm.start();    // Already downloading.
dm.complete(); // Download complete.
```

### Framework equivalents `[interpretation]`

- **XState**: Dedicated state machine library for JS — `createMachine({ states: { ... } })`.
- **Redux reducers**: State transitions driven by action type — `(state, action) => newState`.
- **`ReadableStream` states**: `'readable'`, `'closed'`, `'errored'` — built-in state management.

---

## Strategy (p. 315)

### Modern JavaScript `[interpretation]`

Functions as values. Passing a comparison function to `Array.prototype.sort()` IS the Strategy pattern.

```javascript
// Strategies are just functions
const strategies = {
  json: (data) => JSON.stringify(data),
  csv:  (data) => Object.keys(data[0]).join(',') + '\n' +
                   data.map(row => Object.values(row).join(',')).join('\n'),
  yaml: (data) => data.map(d =>
                   Object.entries(d).map(([k, v]) => `${k}: ${v}`).join('\n')
                 ).join('\n---\n'),
};

function exportData(data, format = 'json') {
  const strategy = strategies[format] ?? strategies.json;
  return strategy(data);
}

const users = [{ name: 'Alice', age: 30 }, { name: 'Bob', age: 25 }];

console.log(exportData(users, 'csv'));
// name,age
// Alice,30
// Bob,25
```

### Framework equivalents `[interpretation]`

- **`Array.prototype.sort(compareFn)`**: The compareFn IS an injected strategy.
- **Passport.js**: `passport.use(new GoogleStrategy(...))` — pluggable auth strategies.
- **Multer**: `multer({ storage: diskStorage(...) })` vs `memoryStorage()` — storage strategy injection.

---

## Template Method (p. 325)

### Modern JavaScript `[interpretation]`

Define an algorithm skeleton in a base class; subclasses override specific steps via `super` calls.

```javascript
class DataProcessor {
  // Template method — defines the algorithm skeleton
  async process(source) {
    const raw = await this.extract(source);
    const data = this.transform(raw);
    await this.load(data);
    return data;
  }

  // Steps to be overridden
  async extract(source) { throw new Error('Implement extract()'); }
  transform(data) { return data; }  // default: no-op
  async load(data) { console.log('Loaded:', data.length, 'records'); }
}

class CsvProcessor extends DataProcessor {
  async extract(source) {
    // Simplified — real code would use a CSV parser
    const lines = source.split('\n');
    const headers = lines[0].split(',');
    return lines.slice(1).map(line => {
      const values = line.split(',');
      return Object.fromEntries(headers.map((h, i) => [h, values[i]]));
    });
  }

  transform(data) {
    return data.filter(row => row.name?.trim());
  }
}

const processor = new CsvProcessor();
await processor.process('name,age\nAlice,30\nBob,25\n,');
// Loaded: 2 records
```

### Framework equivalents `[interpretation]`

- **Express error handler**: `app.use((err, req, res, next) => { ... })` — framework calls your hook at a fixed point.
- **Node.js `stream.Transform`**: Override `_transform()` and `_flush()` — the stream lifecycle is the template.
- **Jest**: `beforeAll`, `beforeEach`, `test`, `afterEach`, `afterAll` — test lifecycle is a template method.

---

## Visitor (p. 331)

### Modern JavaScript `[interpretation]`

Separate operations from object structure using `typeof`/`instanceof` dispatch or an `accept` protocol.

```javascript
// AST nodes
class NumberNode {
  constructor(value) { this.value = value; }
  accept(visitor) { return visitor.visitNumber(this); }
}

class BinaryNode {
  constructor(op, left, right) {
    this.op = op; this.left = left; this.right = right;
  }
  accept(visitor) { return visitor.visitBinary(this); }
}

// Visitor: evaluate
const evaluator = {
  visitNumber(node) { return node.value; },
  visitBinary(node) {
    const l = node.left.accept(this);
    const r = node.right.accept(this);
    const ops = { '+': (a, b) => a + b, '*': (a, b) => a * b };
    return ops[node.op](l, r);
  },
};

// Visitor: pretty-print
const printer = {
  visitNumber(node) { return `${node.value}`; },
  visitBinary(node) {
    return `(${node.left.accept(this)} ${node.op} ${node.right.accept(this)})`;
  },
};

// (3 + 4) * 2
const tree = new BinaryNode('*',
  new BinaryNode('+', new NumberNode(3), new NumberNode(4)),
  new NumberNode(2)
);

console.log(tree.accept(evaluator)); // 14
console.log(tree.accept(printer));   // ((3 + 4) * 2)
```

### Framework equivalents `[interpretation]`

- **Babel AST visitors**: `traverse(ast, { Identifier(path) { ... } })` — canonical JS visitor usage.
- **ESLint rules**: Each rule is a visitor over the AST — `{ CallExpression(node) { ... } }`.
- **`JSON.stringify(value, replacer)`**: The replacer function visits each key-value pair.
