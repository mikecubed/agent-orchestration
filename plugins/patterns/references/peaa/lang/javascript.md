# PEAA Pattern Catalog — JavaScript / Express Reference

**Purpose**: JavaScript code examples and Express + Sequelize framework equivalents for all 51
PEAA patterns. Use alongside `catalog-core.md` (language-agnostic definitions) and
`catalog-index.md` (quick-find table).

**Stack coverage**: Node.js 20+, Express 4, Sequelize 6, plain JavaScript (ES2022+, no TypeScript)

**Relationship to TypeScript file**: `lang/typescript.md` covers the same patterns with types
and NestJS. This file uses plain JavaScript idioms — prototypes, duck typing, JSDoc annotations
where helpful — and Express rather than NestJS.

**Anti-hallucination policy**: Code examples are adapted from Fowler's structural descriptions
and tagged `[interpretation]`. Framework equivalents are `[interpretation]` throughout.
Direct Fowler content is in `catalog-core.md`, not this file.

**Express pattern mappings** `[interpretation]`:
- Express route handlers = Transaction Script (p. 110) or Page Controller (p. 333)
- Express `Router` = Front Controller (p. 344) when combined with middleware chain
- Sequelize `Model` with class methods = Active Record (p. 160)
- Sequelize with repository pattern = Data Mapper (p. 165) approximation
- Express middleware = Interceptor / cross-cutting concern layer
- Joi/Zod schemas = Value Object validation (p. 486)
- Plain JS objects / classes = Data Transfer Object (p. 401)

---

## Domain Logic (Ch. 9)

---

## Transaction Script (p. 110)

### JavaScript structure

```javascript
// Each exported async function is one business transaction.
// All logic — validation, db access, calculation — lives in the procedure.
import { db } from '../db.js';

export async function transferFunds(fromId, toId, amount) {
  const from = await db.query('SELECT balance FROM accounts WHERE id = ?', [fromId]);
  const to   = await db.query('SELECT balance FROM accounts WHERE id = ?', [toId]);

  if (from[0].balance < amount) throw new Error('Insufficient funds');

  await db.query('UPDATE accounts SET balance = balance - ? WHERE id = ?', [amount, fromId]);
  await db.query('UPDATE accounts SET balance = balance + ? WHERE id = ?', [amount, toId]);

  return { ok: true };
}
```

### Express / Sequelize equivalents `[interpretation]`

- An Express route handler that contains its own DB queries and business rules **is** a Transaction Script — no separate service or domain object layer.
- Works well for simple CRUD APIs; grows painful when multiple routes share overlapping logic.
- Sequelize raw queries or model calls used directly inside the handler fit this pattern naturally.

---

## Domain Model (p. 116)

### JavaScript structure

```javascript
// Rich objects carry both data and behavior.
// Invariants enforced in the constructor; no passive getters-only style.
export class Order {
  #items = [];
  #status = 'pending';

  addItem(product, qty) {
    if (this.#status !== 'pending') throw new Error('Cannot modify a placed order');
    this.#items.push({ product, qty });
  }

  get total() {
    return this.#items.reduce((sum, { product, qty }) => sum + product.price * qty, 0);
  }

  place() {
    if (this.#items.length === 0) throw new Error('Empty order');
    this.#status = 'placed';
  }
}
```

### Express / Sequelize equivalents `[interpretation]`

- Domain Model lives in a `domain/` folder, separate from Express routes and Sequelize models.
- Without TypeScript, invariant enforcement must be explicit (private fields via `#`, guards in methods) — the compiler won't catch misuse.
- Pair with Data Mapper to persist: Sequelize models are kept as a thin persistence layer while domain classes hold behavior.

---

## Table Module (p. 125)

### JavaScript structure

```javascript
// Single class, all rows of one table. Operates on a result set (array of plain objects).
export class EmployeeModule {
  constructor(rows) {
    // rows is the full result set for the employees table
    this.rows = rows;
  }

  getAnnualSalary(employeeId) {
    const row = this.rows.find(r => r.id === employeeId);
    if (!row) throw new Error('Not found');
    return row.monthlySalary * 12;
  }

  getRaisedSalary(employeeId, pct) {
    return this.getAnnualSalary(employeeId) * (1 + pct / 100);
  }
}

// Usage: instantiate once per request with query results
const rows = await db.query('SELECT * FROM employees');
const employees = new EmployeeModule(rows);
```

### Express / Sequelize equivalents `[interpretation]`

- Less idiomatic in Node.js than Transaction Script or Domain Model; rarely seen in modern Express apps.
- Can appear when migrating legacy SQL procedures: load rows via Sequelize `findAll({ raw: true })`, wrap in a module class.
- Record Set (p. 508) is the natural companion data structure.

---

## Service Layer (p. 133)

### JavaScript structure

```javascript
// Thin orchestration layer. Delegates to domain objects and repositories.
// Does NOT contain business rules itself — just coordinates.
import { OrderRepository } from '../repositories/OrderRepository.js';
import { PaymentGateway }   from '../gateways/PaymentGateway.js';

export class OrderService {
  constructor(orderRepo = new OrderRepository(), payments = new PaymentGateway()) {
    this.orderRepo = orderRepo;
    this.payments  = payments;
  }

  async placeOrder(customerId, cartItems) {
    const order = Order.create(customerId, cartItems); // domain factory
    await this.payments.charge(customerId, order.total);
    await this.orderRepo.save(order);
    return order.id;
  }
}
```

### Express / Sequelize equivalents `[interpretation]`

- Express route handlers should delegate to a Service Layer rather than contain business logic.
- Constructor injection (as shown) makes services testable — swap repos for stubs in tests.
- One Service Layer class per aggregate or feature slice is a common idiom in Express apps.

---

## Data Source Architecture (Ch. 10)

---

## Table Data Gateway (p. 144)

### JavaScript structure

```javascript
// One class, all SQL for one table. Returns plain rows — no domain objects.
import { pool } from '../db.js';

export class PersonGateway {
  async findById(id) {
    const [rows] = await pool.execute('SELECT * FROM persons WHERE id = ?', [id]);
    return rows[0] ?? null;
  }

  async findByLastName(lastName) {
    const [rows] = await pool.execute('SELECT * FROM persons WHERE last_name = ?', [lastName]);
    return rows;
  }

  async insert({ firstName, lastName, numDependents }) {
    const [result] = await pool.execute(
      'INSERT INTO persons (first_name, last_name, num_dependents) VALUES (?, ?, ?)',
      [firstName, lastName, numDependents]
    );
    return result.insertId;
  }

  async update(id, fields) {
    await pool.execute(
      'UPDATE persons SET first_name=?, last_name=?, num_dependents=? WHERE id=?',
      [fields.firstName, fields.lastName, fields.numDependents, id]
    );
  }
}
```

### Express / Sequelize equivalents `[interpretation]`

- Sequelize's `Model.findAll()`, `Model.findByPk()`, etc., are effectively Table Data Gateway methods when accessed statically on the model class.
- For a pure Table Data Gateway, skip Sequelize's model layer and use `sequelize.query()` or `mysql2` directly.
- Pairs well with Transaction Script: routes call the gateway directly with no intermediate domain objects.

---

## Row Data Gateway (p. 152)

### JavaScript structure

```javascript
// One object instance per database row. Encapsulates find/insert/update for that row.
import { pool } from '../db.js';

export class PersonRow {
  constructor({ id, firstName, lastName, numDependents }) {
    this.id = id;
    this.firstName = firstName;
    this.lastName = lastName;
    this.numDependents = numDependents;
  }

  static async findById(id) {
    const [rows] = await pool.execute('SELECT * FROM persons WHERE id = ?', [id]);
    if (!rows[0]) return null;
    return new PersonRow(rows[0]);
  }

  async update() {
    await pool.execute(
      'UPDATE persons SET first_name=?, last_name=?, num_dependents=? WHERE id=?',
      [this.firstName, this.lastName, this.numDependents, this.id]
    );
  }

  async delete() {
    await pool.execute('DELETE FROM persons WHERE id = ?', [this.id]);
  }
}
```

### Express / Sequelize equivalents `[interpretation]`

- Sequelize models that call `instance.save()` and `instance.destroy()` are Row Data Gateways when they carry only data (no domain behavior).
- Sits between Active Record and Table Data Gateway: one instance per row, but no business logic mixed in.
- Awkward in JS because the line between "gateway" and "active record" blurs without types to enforce the distinction — discipline required.

---

## Active Record (p. 160)

### JavaScript structure

```javascript
// Domain object that also persists itself. Business logic + DB access in one class.
import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../db.js';

export class Employee extends Model {
  // Business behavior on the same object that persists
  getAnnualSalary() {
    return this.monthlySalary * 12;
  }

  isEligibleForBonus() {
    return this.yearsEmployed >= 2 && this.rating === 'excellent';
  }
}

Employee.init({
  name:           DataTypes.STRING,
  monthlySalary:  DataTypes.INTEGER,
  yearsEmployed:  DataTypes.INTEGER,
  rating:         DataTypes.STRING,
}, { sequelize, modelName: 'Employee' });

// Usage: find, manipulate, save — all on the same object
const emp = await Employee.findByPk(42);
emp.rating = 'excellent';
await emp.save();
```

### Express / Sequelize equivalents `[interpretation]`

- Sequelize `Model` subclasses ARE Active Record — this is the pattern's canonical JS form.
- `findAll()`, `findByPk()`, `instance.save()`, `instance.destroy()` are the Active Record finder and persistence methods.
- Business methods added to the class (`getAnnualSalary()`) complete the pattern; pure data Sequelize models are closer to Row Data Gateway.

---

## Data Mapper (p. 165)

### JavaScript structure

```javascript
// Domain object knows nothing about the DB. A separate mapper handles the translation.
// Domain object:
export class Person {
  constructor({ id, firstName, lastName, numDependents }) {
    this.id = id; this.firstName = firstName;
    this.lastName = lastName; this.numDependents = numDependents;
  }
}

// Mapper — the bridge between DB rows and domain objects:
export class PersonMapper {
  async findById(id) {
    const [rows] = await pool.execute('SELECT * FROM persons WHERE id = ?', [id]);
    return rows[0] ? this.#toDomain(rows[0]) : null;
  }

  async save(person) {
    if (person.id) {
      await pool.execute(
        'UPDATE persons SET first_name=?, last_name=?, num_dependents=? WHERE id=?',
        [person.firstName, person.lastName, person.numDependents, person.id]
      );
    } else {
      const [r] = await pool.execute(
        'INSERT INTO persons (first_name, last_name, num_dependents) VALUES (?,?,?)',
        [person.firstName, person.lastName, person.numDependents]
      );
      person.id = r.insertId;
    }
  }

  #toDomain(row) {
    return new Person({ id: row.id, firstName: row.first_name,
                        lastName: row.last_name, numDependents: row.num_dependents });
  }
}
```

### Express / Sequelize equivalents `[interpretation]`

- Sequelize does not natively implement Data Mapper; it defaults to Active Record.
- Approximate Data Mapper by keeping Sequelize models as plain persistence schemas and writing separate mapper classes (as shown) that translate between Sequelize instances and domain objects.
- This is the most effort-intensive data pattern in JS but gives the cleanest domain layer.

---

## OR Behavioral (Ch. 11)

---

## Unit of Work (p. 184)

### JavaScript structure

```javascript
// Tracks new/dirty/removed objects and flushes them in one coordinated write.
export class UnitOfWork {
  #new = []; #dirty = []; #removed = [];

  registerNew(entity)     { this.#new.push(entity); }
  registerDirty(entity)   { this.#dirty.push(entity); }
  registerRemoved(entity) { this.#removed.push(entity); }

  async commit(mapper) {
    for (const e of this.#new)     await mapper.insert(e);
    for (const e of this.#dirty)   await mapper.update(e);
    for (const e of this.#removed) await mapper.delete(e);
    this.#new = []; this.#dirty = []; this.#removed = [];
  }
}

// Usage inside a request:
const uow = new UnitOfWork();
const order = await orderMapper.findById(1);
order.status = 'shipped';
uow.registerDirty(order);
await uow.commit(orderMapper);
```

### Express / Sequelize equivalents `[interpretation]`

- `sequelize.transaction(async (t) => { ... })` is the closest Sequelize approximation: all operations in the callback share a DB transaction.
- For full Unit of Work (change tracking, single flush), you must implement the tracker yourself as shown, wrapping it around Sequelize operations.
- Sequelize transactions handle atomicity but not dirty tracking — combine both for the full pattern.

---

## Identity Map (p. 195)

### JavaScript structure

```javascript
// Per-request cache: ensures each DB row maps to exactly one in-memory object.
export class IdentityMap {
  #store = new Map(); // key: 'ClassName:id'

  get(className, id) {
    return this.#store.get(`${className}:${id}`) ?? null;
  }

  set(className, id, entity) {
    this.#store.set(`${className}:${id}`, entity);
  }

  has(className, id) {
    return this.#store.has(`${className}:${id}`);
  }
}

// In a mapper:
async findById(id) {
  if (this.identityMap.has('Person', id)) return this.identityMap.get('Person', id);
  const row = await db.fetch(id);
  const person = new Person(row);
  this.identityMap.set('Person', id, person);
  return person;
}
```

### Express / Sequelize equivalents `[interpretation]`

- Sequelize caches model instances within a session only if you manage the cache externally; it does not maintain an Identity Map across calls by default.
- For per-request Identity Maps in Express, create a new map at the start of each request (middleware) and attach it to `req`.
- Without this pattern, multiple `findByPk(42)` calls return different JS objects for the same row, causing update-clobbering bugs.

---

## Lazy Load (p. 200)

### JavaScript structure

```javascript
// Four variants. Shown: Virtual Proxy via ES2015 Proxy.
function lazyProxy(loader) {
  let loaded = false;
  let target = {};
  return new Proxy(target, {
    get(obj, prop) {
      if (!loaded) throw new Error('Access .load() first — or use an async getter');
      return obj[prop];
    }
  });
}

// Simpler JS variant: lazy initialization via getter
export class Supplier {
  constructor(id) {
    this.id = id;
    this._products = null;
  }

  async getProducts() {
    if (!this._products) {
      this._products = await ProductMapper.findBySupplier(this.id);
    }
    return this._products;
  }
}
```

### Express / Sequelize equivalents `[interpretation]`

- Sequelize associations with `lazy: true` (default) implement the "ghost / initialization" variant — call `instance.getProducts()` to trigger the load.
- The `include` option on `findAll` does eager loading (the opposite of lazy).
- In async JS, the proxy variant is awkward because `get` traps cannot be async; the getter method pattern (shown) is the idiomatic JS approach.

---

## OR Structural (Ch. 12)

---

## Identity Field (p. 216)

### JavaScript structure

```javascript
// The domain object stores its own database primary key.
export class DomainObject {
  constructor(id = null) {
    /** @type {number|null} */
    this.id = id; // null when not yet persisted
  }

  isNew() { return this.id === null; }
}

export class Person extends DomainObject {
  constructor({ id = null, name, email }) {
    super(id);
    this.name  = name;
    this.email = email;
  }
}

// Mapper uses person.id to decide INSERT vs UPDATE
async function save(person) {
  if (person.isNew()) {
    const result = await db.insert(person);
    person.id = result.insertId; // assign after insert
  } else {
    await db.update(person);
  }
}
```

### Express / Sequelize equivalents `[interpretation]`

- Sequelize automatically adds an `id` primary key column and stores it on the instance — Identity Field is built in.
- For composite keys, configure `primaryKey: true` on multiple columns; Sequelize handles the compound identity.
- When writing manual Data Mapper classes, always copy the DB-generated id back onto the domain object after insert (as shown).

---

## Foreign Key Mapping (p. 236)

### JavaScript structure

```javascript
// Album holds an Artist reference in memory; mapper translates to/from foreign key.
export class Album {
  constructor({ id, title, artist }) {
    this.id = id; this.title = title;
    this.artist = artist; // Artist domain object, not just an id
  }
}

export class AlbumMapper {
  async findById(id) {
    const row = await db.fetchAlbum(id);
    const artist = await artistMapper.findById(row.artist_id); // resolve FK
    return new Album({ id: row.id, title: row.title, artist });
  }

  async save(album) {
    await db.upsertAlbum({ id: album.id, title: album.title,
                           artist_id: album.artist.id }); // flatten to FK
  }
}
```

### Express / Sequelize equivalents `[interpretation]`

- Sequelize `belongsTo` / `hasMany` declarations generate the FK columns and provide `album.getArtist()` / `album.setArtist()` — this IS Foreign Key Mapping managed by the ORM.
- With `include: [Artist]` on `findAll`, Sequelize resolves the FK into a nested object automatically.
- When writing custom mappers, manually load the associated entity as shown, or batch with DataLoader to avoid N+1 queries.

---

## Association Table Mapping (p. 248)

### JavaScript structure

```javascript
// Many-to-many: Employee <-> Skill via a join table (employee_skills).
export class EmployeeMapper {
  async findSkillsFor(employeeId) {
    const rows = await db.query(
      `SELECT s.* FROM skills s
       JOIN employee_skills es ON es.skill_id = s.id
       WHERE es.employee_id = ?`, [employeeId]
    );
    return rows.map(r => new Skill(r));
  }

  async addSkill(employeeId, skillId) {
    await db.query(
      'INSERT INTO employee_skills (employee_id, skill_id) VALUES (?, ?)',
      [employeeId, skillId]
    );
  }

  async removeSkill(employeeId, skillId) {
    await db.query(
      'DELETE FROM employee_skills WHERE employee_id = ? AND skill_id = ?',
      [employeeId, skillId]
    );
  }
}
```

### Express / Sequelize equivalents `[interpretation]`

- Sequelize `belongsToMany(Skill, { through: 'employee_skills' })` generates the join table and provides `employee.addSkill()`, `employee.getSkills()`, `employee.removeSkill()` — direct implementation of this pattern.
- Extra columns on the join table (e.g., `proficiencyLevel`) require a explicit through-model: `through: { model: EmployeeSkill }`.
- This is among the most natural patterns in Sequelize — the ORM was designed for it.

---

## Dependent Mapping (p. 262)

### JavaScript structure

```javascript
// Album owns LineItems — the album mapper handles all persistence for line items.
// Line items have no independent mapper or identity outside their owner.
export class AlbumMapper {
  async findById(id) {
    const albumRow = await db.fetchAlbum(id);
    const itemRows = await db.query('SELECT * FROM album_tracks WHERE album_id = ?', [id]);
    return new Album({
      ...albumRow,
      tracks: itemRows.map(r => new Track(r)) // dependents loaded by owner mapper
    });
  }

  async save(album) {
    await db.upsertAlbum({ id: album.id, title: album.title });
    // owner mapper drives all child persistence
    await db.query('DELETE FROM album_tracks WHERE album_id = ?', [album.id]);
    for (const track of album.tracks) {
      await db.query('INSERT INTO album_tracks (album_id, title, duration) VALUES (?,?,?)',
        [album.id, track.title, track.duration]);
    }
  }
}
```

### Express / Sequelize equivalents `[interpretation]`

- Sequelize `hasMany` with `{ onDelete: 'CASCADE' }` implements the delete side; save requires manual iteration (as shown) or Sequelize's `bulkCreate` after deleting old children.
- The key discipline: dependents (Track) must never be loaded or saved independently — all access goes through the owner (Album).
- Awkward in JS without type enforcement; a naming convention (`AlbumTrack` not `Track`) helps signal the dependent relationship.

---

## Embedded Value (p. 268)

### JavaScript structure

```javascript
// Money's fields (amount, currency) are stored in the Person table's columns,
// not in a separate table. The mapper inflates/deflates the embedded object.
export class Money {
  constructor(amount, currency) {
    this.amount = amount; this.currency = currency;
  }
}

export class EmployeeMapper {
  async findById(id) {
    const row = await db.fetchEmployee(id);
    return {
      id: row.id,
      name: row.name,
      salary: new Money(row.salary_amount, row.salary_currency) // inflate
    };
  }

  async save(employee) {
    await db.upsertEmployee({
      id: employee.id, name: employee.name,
      salary_amount:   employee.salary.amount,   // deflate
      salary_currency: employee.salary.currency,
    });
  }
}
```

### Express / Sequelize equivalents `[interpretation]`

- Sequelize has no built-in Embedded Value support; implement via `get` / `set` virtual fields or custom getters that compose a plain object from multiple columns.
- For a Money value, add `salaryAmount` and `salaryCurrency` as real columns and a virtual `salary` getter that returns `{ amount, currency }`.
- This is one of the more manual patterns in Sequelize — ORMs typically favor separate tables over embedded values.

---

## Serialized LOB (p. 272)

### JavaScript structure

```javascript
// An entire object graph is serialized to JSON and stored in a single text column.
export class DepartmentMapper {
  async findById(id) {
    const row = await db.fetchDepartment(id);
    const subsidiaries = JSON.parse(row.subsidiaries_json); // deserialize
    return { id: row.id, name: row.name, subsidiaries };
  }

  async save(dept) {
    await db.upsertDepartment({
      id:                dept.id,
      name:              dept.name,
      subsidiaries_json: JSON.stringify(dept.subsidiaries), // serialize
    });
  }
}
```

### Express / Sequelize equivalents `[interpretation]`

- Sequelize `DataTypes.JSON` (PostgreSQL) or `DataTypes.TEXT` with manual `JSON.stringify/parse` (MySQL) — both implement Serialized LOB.
- Extremely natural in JavaScript because JSON IS the native serialization format; no XML or binary serialization needed.
- Trade-off: the serialized object graph cannot be queried by SQL; use only when you never need to filter or join on the nested data.

---

## Single Table Inheritance (p. 278)

### JavaScript structure

```javascript
// All subclasses stored in one table with a 'type' discriminator column.
export class PlayerMapper {
  async findById(id) {
    const row = await db.fetchPlayer(id);
    return this.#hydrate(row);
  }

  #hydrate(row) {
    switch (row.type) {
      case 'footballer': return new Footballer(row);
      case 'cricketer':  return new Cricketer(row);
      case 'bowler':     return new Bowler(row);
      default: throw new Error(`Unknown player type: ${row.type}`);
    }
  }

  async save(player) {
    await db.upsertPlayer({ ...player.toDB(), type: player.constructor.name.toLowerCase() });
  }
}
```

### Express / Sequelize equivalents `[interpretation]`

- Sequelize does not have built-in STI; implement with a single model and a manual hydrator (as shown).
- Add a `type` column (`DataTypes.STRING`); in `afterFind` hooks or mapper code, swap the plain instance for the correct subclass.
- Simplest inheritance mapping in JS — one table, one Sequelize model, discriminator-based factory in the mapper.

---

## Class Table Inheritance (p. 285)

### JavaScript structure

```javascript
// Each class in the hierarchy has its own table; joined by shared primary key.
export class PlayerMapper {
  async findById(id) {
    const base = await db.query('SELECT * FROM players WHERE id = ?', [id]);
    if (base[0].type === 'footballer') {
      const ext = await db.query('SELECT * FROM footballers WHERE id = ?', [id]);
      return new Footballer({ ...base[0], ...ext[0] });
    }
    // ... other subtypes
  }

  async save(footballer) {
    await db.upsertPlayer({ id: footballer.id, name: footballer.name, type: 'footballer' });
    await db.upsertFootballer({ id: footballer.id, club: footballer.club });
  }
}
```

### Express / Sequelize equivalents `[interpretation]`

- No native Sequelize support; requires two `Model` definitions joined manually or via a raw JOIN query.
- More complex than Single Table Inheritance: every load/save touches multiple tables.
- Rarely worth the complexity in JS apps — Single Table Inheritance is preferred unless the subclass columns are very numerous.

---

## Concrete Table Inheritance (p. 293)

### JavaScript structure

```javascript
// Each concrete class has its own fully self-contained table. No shared base table.
export class FootballerMapper {
  async findById(id) {
    const [rows] = await pool.execute('SELECT * FROM footballers WHERE id = ?', [id]);
    return rows[0] ? new Footballer(rows[0]) : null;
  }
  async save(f) {
    await pool.execute(
      'INSERT INTO footballers (id, name, club) VALUES (?,?,?) ON DUPLICATE KEY UPDATE name=?, club=?',
      [f.id, f.name, f.club, f.name, f.club]
    );
  }
}

export class CricketerMapper {
  async findById(id) {
    const [rows] = await pool.execute('SELECT * FROM cricketers WHERE id = ?', [id]);
    return rows[0] ? new Cricketer(rows[0]) : null;
  }
}
```

### Express / Sequelize equivalents `[interpretation]`

- Each Sequelize `Model` maps to its own table — Concrete Table Inheritance is the default if you create separate models with no `super` relationship.
- Finding "all players regardless of type" requires UNION queries or separate fetches, then merging in JS.
- Trade-off: no foreign keys across the hierarchy; polymorphic queries become expensive.

---

## Inheritance Mappers (p. 302)

### JavaScript structure

```javascript
// Abstract superclass mapper holds shared find/save logic; concrete mappers extend it.
class AbstractPlayerMapper {
  async findById(id) {
    const base = await this.#fetchBase(id);
    const ext  = await this.fetchExtension(id); // hook for subclass
    return this.buildObject(base, ext);
  }

  async #fetchBase(id) {
    return db.query('SELECT * FROM players WHERE id = ?', [id]);
  }

  // Subclasses implement these:
  async fetchExtension(id) { throw new Error('abstract'); }
  buildObject(base, ext)   { throw new Error('abstract'); }
}

class FootballerMapper extends AbstractPlayerMapper {
  async fetchExtension(id) {
    return db.query('SELECT * FROM footballers WHERE id = ?', [id]);
  }
  buildObject(base, ext) { return new Footballer({ ...base, ...ext }); }
}
```

### Express / Sequelize equivalents `[interpretation]`

- JavaScript's class inheritance maps directly to this pattern: abstract base mapper, concrete subclasses per type.
- "Abstract" in JS means throwing `new Error('abstract')` in base methods — no language enforcement.
- Useful when Class Table Inheritance is in use and you want the shared JOIN logic in one place.

---

## OR Metadata (Ch. 13)

---

## Metadata Mapping (p. 306)

### JavaScript structure

```javascript
// Field-to-column mappings declared as data, not hand-coded methods.
// A generic mapper reads the metadata and generates SQL automatically.
const personMetadata = {
  tableName: 'persons',
  fields: [
    { domainField: 'id',              column: 'id',              primaryKey: true },
    { domainField: 'firstName',       column: 'first_name'       },
    { domainField: 'lastName',        column: 'last_name'        },
    { domainField: 'numDependents',   column: 'num_dependents'   },
  ]
};

class GenericMapper {
  constructor(metadata) { this.meta = metadata; }

  async findById(id) {
    const row = await db.queryOne(`SELECT * FROM ${this.meta.tableName} WHERE id = ?`, [id]);
    return this.#toDomain(row);
  }

  #toDomain(row) {
    const obj = {};
    for (const f of this.meta.fields) obj[f.domainField] = row[f.column];
    return obj;
  }
}

export const personMapper = new GenericMapper(personMetadata);
```

### Express / Sequelize equivalents `[interpretation]`

- Sequelize's `Model.init({ fieldName: DataTypes.STRING, ... })` IS Metadata Mapping — the mapping is declared, not hand-coded into SQL strings.
- The `field` option on each attribute (`field: 'first_name'`) explicitly maps JS property names to DB column names.
- ORMs exist precisely to implement this pattern; hand-rolling it (as shown) is for learning or extreme customization.

---

## Query Object (p. 316)

### JavaScript structure

```javascript
// Represents a query as a composable object; translates to SQL on demand.
export class QueryObject {
  #criteria = [];
  #orderBy = null;
  #limit = null;

  where(field, op, value) {
    this.#criteria.push({ field, op, value });
    return this; // fluent
  }

  order(field, dir = 'ASC') { this.#orderBy = `${field} ${dir}`; return this; }
  limit(n)                  { this.#limit = n; return this; }

  toSQL(tableName) {
    const where = this.#criteria.map(c => `${c.field} ${c.op} ?`).join(' AND ');
    const params = this.#criteria.map(c => c.value);
    let sql = `SELECT * FROM ${tableName}`;
    if (where)        sql += ` WHERE ${where}`;
    if (this.#orderBy) sql += ` ORDER BY ${this.#orderBy}`;
    if (this.#limit)   sql += ` LIMIT ${this.#limit}`;
    return { sql, params };
  }
}

// Usage:
const q = new QueryObject().where('status', '=', 'active').order('created_at').limit(10);
const { sql, params } = q.toSQL('orders');
```

### Express / Sequelize equivalents `[interpretation]`

- Sequelize's `where`, `order`, `limit` options on `findAll` are a Query Object implemented by the ORM internally.
- The Sequelize `Op` (operators) object (`{ [Op.gt]: 5 }`) composes query criteria programmatically — equivalent to the `where()` builder above.
- Libraries like `sequelize-query-builder` or hand-rolled classes like the one shown add domain-term abstraction on top.

---

## Repository (p. 322)

### JavaScript structure

```javascript
// Collection-like interface to domain objects; hides the data strategy entirely.
export class PersonRepository {
  #identityMap = new Map();

  async findById(id) {
    if (this.#identityMap.has(id)) return this.#identityMap.get(id);
    const row = await db.fetchPerson(id);
    if (!row) return null;
    const person = new Person(row);
    this.#identityMap.set(id, person);
    return person;
  }

  async findByLastName(lastName) {
    const rows = await db.query('SELECT * FROM persons WHERE last_name = ?', [lastName]);
    return rows.map(r => new Person(r));
  }

  async save(person) { await personMapper.save(person); }
  async remove(person) { await db.delete('persons', person.id); }
  // Callers treat this like a collection: no SQL visible to them
}
```

### Express / Sequelize equivalents `[interpretation]`

- Sequelize is NOT a Repository — it is Active Record. Wrapping Sequelize in a repository class (as shown) is an architectural overlay.
- Repository is the recommended pattern when you want to unit-test domain logic without a real DB: swap `PersonRepository` for a `FakePersonRepository` backed by a `Map`.
- A clean repository interface should expose no Sequelize types or `Op` symbols to callers — the implementation detail stays inside the class.

---

## Web Presentation (Ch. 14)

---

## Model View Controller (p. 330)

### JavaScript structure

```javascript
// MVC roles in an Express JSON API:
// Model — domain or service layer (no HTTP awareness)
import { OrderService } from '../services/OrderService.js';

// Controller — Express route handler, translates HTTP to service calls
export async function createOrder(req, res) {
  try {
    const { customerId, items } = req.body;          // input extraction
    const orderId = await OrderService.placeOrder(customerId, items); // delegate
    res.status(201).json({ orderId });               // view: JSON response
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// View — for a JSON API, the JSON serialization IS the view.
// For HTML: use EJS / Handlebars templates (see Template View).
```

### Express / Sequelize equivalents `[interpretation]`

- Express route handlers are the Controller; they should contain only HTTP parsing and response formatting — no business logic.
- The Model is the service/domain layer; Sequelize models are the persistence sub-layer of the Model.
- MVC is the organizing principle for all Express apps, even when the "View" is JSON.

---

## Page Controller (p. 333)

### JavaScript structure

```javascript
// One controller object (or route file) per page/action.
// Each is responsible for a single URL or a small group of related URLs.
import express from 'express';
import { getProduct, saveProduct } from '../services/ProductService.js';

const router = express.Router();

// GET /products/:id — display page
router.get('/:id', async (req, res) => {
  const product = await getProduct(req.params.id);
  res.render('product', { product });          // Template View
});

// POST /products/:id — handle form submit
router.post('/:id', async (req, res) => {
  await saveProduct(req.params.id, req.body);
  res.redirect(`/products/${req.params.id}`);
});

export default router;
```

### Express / Sequelize equivalents `[interpretation]`

- An Express `Router` module scoped to one resource is a Page Controller — each module handles one conceptual page or feature.
- The pattern maps naturally to Express's file-per-router convention: `routes/products.js`, `routes/orders.js`, etc.
- Use a base `Router` factory for shared behavior (auth checks, error handling) across page controllers.

---

## Front Controller (p. 344)

### JavaScript structure

```javascript
// Single entry point dispatches all requests to per-action handlers.
import express from 'express';
import { commandRegistry } from './commands/index.js';

const app = express();
app.use(express.json());

// Central dispatch middleware — the Front Controller
app.use(async (req, res, next) => {
  const key = `${req.method}:${req.path}`;
  const command = commandRegistry.get(key);
  if (!command) return next();
  try {
    await command.execute(req, res);
  } catch (err) {
    next(err);
  }
});

// Each command is a small handler object:
export class ShowProductCommand {
  async execute(req, res) {
    const product = await productService.findById(req.params.id);
    res.json(product);
  }
}
```

### Express / Sequelize equivalents `[interpretation]`

- Express itself is a Front Controller framework: `app.use()` middleware chain + `app.get/post/...` dispatch IS the pattern.
- Adding a command registry (as shown) makes the dispatch explicit and makes commands independently testable.
- Express middleware (`app.use(authMiddleware)`) implements the interceptor chain that Fowler describes as part of Front Controller.

---

## Template View (p. 350)

### JavaScript structure

```javascript
// Server-side template rendering. Markers in the template are replaced with data.
import express from 'express';
import { engine } from 'express-handlebars';

const app = express();
app.engine('hbs', engine({ defaultLayout: 'main' }));
app.set('view engine', 'hbs');

// Controller populates a 'helper' object (the view model) and renders
app.get('/products/:id', async (req, res) => {
  const product = await productService.findById(req.params.id);
  // 'product' is the helper object — data passed to the template
  res.render('product', {
    name:  product.name,
    price: product.formattedPrice(),
    inStock: product.stock > 0,
  });
});

// views/product.hbs:  <h1>{{name}}</h1>  <p>{{price}}</p>
```

### Express / Sequelize equivalents `[interpretation]`

- Express + EJS / Handlebars / Pug is Template View — the most direct mapping.
- For JSON APIs, `res.json(dto)` can be thought of as a degenerate Template View where the "template" is JSON serialization.
- The view model object passed to `res.render()` is the "helper" that the template dereferences.

---

## Transform View (p. 361)

### JavaScript structure

```javascript
// Transforms domain data element-by-element into output, rather than embedding data in templates.
// Typically XSLT; in JS, a functional transform pipeline is the natural equivalent.

export function transformProduct(product) {
  // Each field is independently transformed; no template markup
  return {
    id:    product.id,
    label: `${product.name} (${product.sku})`,
    price: `${product.currency} ${(product.priceCents / 100).toFixed(2)}`,
    badge: product.stock === 0 ? 'Out of stock' : `${product.stock} left`,
  };
}

// In the route:
app.get('/products/:id', async (req, res) => {
  const product = await productService.findById(req.params.id);
  res.json(transformProduct(product)); // the transform IS the view
});
```

### Express / Sequelize equivalents `[interpretation]`

- Pure function transforms (as shown) are idiomatic JS and implement Transform View cleanly.
- XSLT (Fowler's canonical example) is rarely used in Node.js; JSON transformation functions are the practical equivalent.
- Transform View is naturally composable in JS: `transformOrder(order)` can call `transformProduct(item.product)` recursively.

---

## Two Step View (p. 365)

### JavaScript structure

```javascript
// Step 1: convert domain data to an intermediate logical screen structure.
// Step 2: render that structure to HTML (or JSON).

// Step 1 — domain data → logical screen model
function buildScreenModel(order) {
  return {
    heading: `Order #${order.id}`,
    sections: [
      { label: 'Customer', value: order.customer.name },
      { label: 'Total',    value: `$${order.total.toFixed(2)}` },
      { label: 'Status',   value: order.status.toUpperCase() },
    ]
  };
}

// Step 2 — logical model → HTML string (or pass to a generic template)
function renderScreenModel(screenModel) {
  const rows = screenModel.sections
    .map(s => `<tr><th>${s.label}</th><td>${s.value}</td></tr>`)
    .join('');
  return `<h1>${screenModel.heading}</h1><table>${rows}</table>`;
}

// Route:
app.get('/orders/:id', async (req, res) => {
  const order = await orderService.findById(req.params.id);
  const screen = buildScreenModel(order);   // step 1
  res.send(renderScreenModel(screen));      // step 2
});
```

### Express / Sequelize equivalents `[interpretation]`

- Two Step View is less common in modern SPA-backed APIs but valuable for server-rendered Express apps with many page types sharing a generic renderer.
- The screen model (step 1 output) can be shared across formats: HTML renderer for browsers, JSON renderer for API clients.
- React server-side rendering is a modern analogue: JSX components produce a virtual DOM (step 1), then `renderToString` (step 2).

---

## Application Controller (p. 379)

### JavaScript structure

```javascript
// Centralizes navigation/flow decisions. Routes input controllers to the right next screen.
export class ApplicationController {
  #flowMap = new Map([
    ['order:pending',   'order-summary'],
    ['order:awaiting',  'payment-form'],
    ['order:complete',  'confirmation'],
  ]);

  getView(context) {
    const key = `${context.entity}:${context.state}`;
    const view = this.#flowMap.get(key);
    if (!view) throw new Error(`No view for state: ${key}`);
    return view;
  }

  getNextCommand(currentCommand, result) {
    // State machine logic for workflow navigation
    if (currentCommand === 'checkout' && result.ok) return 'confirm';
    if (currentCommand === 'checkout' && !result.ok) return 'payment-retry';
    return 'home';
  }
}
```

### Express / Sequelize equivalents `[interpretation]`

- Application Controller is rarely seen as an explicit class in Express apps; its logic usually lives scattered across route handlers.
- Valuable for wizard-style multi-step flows (checkout, onboarding): extract the state/next-screen logic into one place.
- Can be implemented as Express middleware that checks session state and redirects to the correct step.

---

## Distribution (Ch. 15)

---

## Remote Facade (p. 388)

### JavaScript structure

```javascript
// Coarse-grained API surface over fine-grained domain objects.
// Minimizes round trips by batching related data into one call.
export class CustomerFacade {
  // Fine-grained: customerService.getName(), customerService.getAddress(), orderService.getOrders()
  // Coarse-grained (one remote call):
  async getCustomerSummary(customerId) {
    const [customer, orders, address] = await Promise.all([
      customerService.findById(customerId),
      orderService.findByCustomer(customerId),
      addressService.findPrimary(customerId),
    ]);
    return {
      name:       customer.name,
      email:      customer.email,
      address:    address.formatted(),
      orderCount: orders.length,
      totalSpent: orders.reduce((s, o) => s + o.total, 0),
    };
  }
}

// Express route:
app.get('/api/customers/:id/summary', async (req, res) => {
  res.json(await customerFacade.getCustomerSummary(req.params.id));
});
```

### Express / Sequelize equivalents `[interpretation]`

- Every Express REST endpoint that aggregates multiple service calls before responding IS a Remote Facade — the HTTP request is the "remote call".
- The pattern argues for fewer, fatter endpoints (GraphQL resolvers or composite REST resources) rather than many thin endpoints.
- `Promise.all()` for parallel sub-calls is the idiomatic JS way to minimize latency inside a facade method.

---

## Data Transfer Object (p. 401)

### JavaScript structure

```javascript
// Plain data carrier — no behavior, just fields. Crosses process boundaries.
// JSDoc helps document the shape without TypeScript.

/**
 * @typedef {Object} OrderDTO
 * @property {number}   id
 * @property {string}   customerName
 * @property {number}   totalAmount
 * @property {string}   status
 * @property {string[]} itemDescriptions
 */

// Assembler converts domain objects → DTO
export function assembleOrderDTO(order) {
  return {
    id:               order.id,
    customerName:     order.customer.fullName(),
    totalAmount:      order.total,
    status:           order.status,
    itemDescriptions: order.items.map(i => `${i.product.name} x${i.qty}`),
  };
}

// Express route returns DTO, not domain object:
app.get('/api/orders/:id', async (req, res) => {
  const order = await orderRepo.findById(req.params.id);
  res.json(assembleOrderDTO(order));
});
```

### Express / Sequelize equivalents `[interpretation]`

- In Node.js/Express, `res.json(someObject)` serializes whatever you pass — discipline is required to pass a DTO, not a Sequelize model instance (which leaks internal fields).
- Plain JS object literals (as shown) ARE DTOs — no class needed; `@typedef` JSDoc documents the shape.
- `toJSON()` overrides on Sequelize models can act as automatic assemblers, but explicit assembler functions give more control.

---

## Concurrency (Ch. 16)

---

## Optimistic Offline Lock (p. 416)

### JavaScript structure

```javascript
// Version column checked at update time. Conflict throws; caller retries or reports.
export class OrderMapper {
  async findById(id) {
    const row = await db.fetchOrder(id);
    return new Order({ ...row }); // includes row.version
  }

  async save(order) {
    const result = await db.query(
      'UPDATE orders SET status=?, total=?, version=? WHERE id=? AND version=?',
      [order.status, order.total, order.version + 1, order.id, order.version]
    );
    if (result.affectedRows === 0) {
      throw new Error('Optimistic lock conflict: record was modified by another session');
    }
    order.version += 1; // update in-memory version on success
  }
}
```

### Express / Sequelize equivalents `[interpretation]`

- Sequelize does not implement Optimistic Offline Lock automatically; add a `version` column manually and write the conditional UPDATE as shown.
- Sequelize's built-in `version` option (`Model.init({ ... }, { version: true })`) adds an internal version field used only for Sequelize's own optimistic locking on `save()` — this covers same-session conflicts, not offline locks between HTTP requests.
- For HTTP-level optimistic locking, use ETags: hash the `version` field, send it in `ETag` headers, and require `If-Match` on updates.

---

## Pessimistic Offline Lock (p. 426)

### JavaScript structure

```javascript
// Session must acquire lock before editing. Lock stored in DB; released at end of session.
export class LockManager {
  async acquireLock(entityType, entityId, sessionId) {
    try {
      await db.query(
        'INSERT INTO locks (entity_type, entity_id, session_id, acquired_at) VALUES (?,?,?,NOW())',
        [entityType, entityId, sessionId]
      );
      return true; // acquired
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') return false; // already locked
      throw err;
    }
  }

  async releaseLock(entityType, entityId, sessionId) {
    await db.query(
      'DELETE FROM locks WHERE entity_type=? AND entity_id=? AND session_id=?',
      [entityType, entityId, sessionId]
    );
  }

  async getLockHolder(entityType, entityId) {
    const rows = await db.query(
      'SELECT session_id FROM locks WHERE entity_type=? AND entity_id=?',
      [entityType, entityId]
    );
    return rows[0]?.session_id ?? null;
  }
}
```

### Express / Sequelize equivalents `[interpretation]`

- Sequelize `transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE })` provides database-level pessimistic locking within a single request, not across multiple HTTP requests (offline).
- For multi-request pessimistic locks (the Fowler definition), a separate `locks` table (as shown) is required.
- Always implement lock timeout and cleanup for abandoned sessions — a scheduled job or `acquired_at + TTL` check.

---

## Coarse-Grained Lock (p. 438)

### JavaScript structure

```javascript
// Lock the aggregate root; all children are implicitly locked.
// Version lives on the root; any child modification bumps the root version.
export class CustomerMapper {
  async findWithOrders(customerId) {
    const customer = await customerRepo.findById(customerId);
    customer.orders = await orderRepo.findByCustomer(customerId);
    return customer; // root carries version for the whole aggregate
  }

  async saveOrder(customer, order) {
    // Locking the root (customer) protects all its orders
    const result = await db.query(
      'UPDATE customers SET version=? WHERE id=? AND version=?',
      [customer.version + 1, customer.id, customer.version]
    );
    if (result.affectedRows === 0) throw new Error('Coarse-grained lock conflict');
    await orderMapper.save(order); // save child after root lock confirmed
    customer.version += 1;
  }
}
```

### Express / Sequelize equivalents `[interpretation]`

- Combine with Optimistic Offline Lock: put the `version` column on the aggregate root (Customer), not on every child (Order).
- Sequelize's `transaction()` provides coarse-grained locking within a single DB transaction; for offline scenarios (across HTTP requests), the version-on-root approach is required.
- JS/Express naturally models this through aggregate root service methods — the service controls all mutations through the root.

---

## Implicit Lock (p. 449)

### JavaScript structure

```javascript
// The framework/mapper acquires locks automatically; no application code can forget.
// Implemented as a mapper base class that always locks on load.
class LockingMapper {
  async findById(id, session) {
    // Always acquires a pessimistic lock when loading — the application cannot opt out
    await lockManager.acquireLock(this.entityName, id, session.id);
    return this.#load(id);
  }

  async #load(id) {
    throw new Error('abstract: implement in subclass');
  }

  // Release hook called by a session cleanup middleware
  async releaseAll(session) {
    await lockManager.releaseAllForSession(session.id);
  }
}

export class OrderMapper extends LockingMapper {
  entityName = 'Order';
  async #load(id) {
    const row = await db.fetchOrder(id);
    return new Order(row);
  }
}
```

### Express / Sequelize equivalents `[interpretation]`

- Express middleware that calls `lockManager.releaseAll(req.session)` on response completion implements the release half of Implicit Lock — the application never manually releases.
- Node.js's single-threaded event loop reduces (but does not eliminate) in-process concurrency bugs; DB-level implicit locking is still needed for multi-instance deployments.
- Most awkward to retrofit: requires all DB access to go through the locking mapper base class, which demands strict architectural discipline in JS.

---

## Session State (Ch. 17)

---

## Client Session State (p. 456)

### JavaScript structure

```javascript
// Session data travels with the client — URL params, hidden fields, or cookies.
// Express: signed cookies for tamper-evident client state.
import cookieParser from 'cookie-parser';

app.use(cookieParser(process.env.COOKIE_SECRET));

// Store wizard step data in a signed cookie
app.post('/checkout/step1', (req, res) => {
  const wizardState = { cartId: req.body.cartId, step: 1 };
  res.cookie('checkoutState', JSON.stringify(wizardState), {
    signed: true, httpOnly: true, maxAge: 30 * 60 * 1000
  });
  res.redirect('/checkout/step2');
});

// Read it back on step 2
app.get('/checkout/step2', (req, res) => {
  const state = JSON.parse(req.signedCookies.checkoutState ?? '{}');
  res.render('checkout-step2', { cartId: state.cartId });
});
```

### Express / Sequelize equivalents `[interpretation]`

- Signed cookies (`res.cookie(..., { signed: true })`) prevent tampering; never store sensitive data in unsigned cookies.
- URL query parameters and hidden form fields are alternative carriers — all are Client Session State.
- Scales perfectly (zero server memory per session) but limited by cookie size (4 KB) and exposed to the client.

---

## Server Session State (p. 458)

### JavaScript structure

```javascript
// Session object held server-side; client holds only a session ID cookie.
import session from 'express-session';
import RedisStore from 'connect-redis';
import { createClient } from 'redis';

const redisClient = createClient();
await redisClient.connect();

app.use(session({
  store:  new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
}));

// Store and retrieve multi-step wizard state server-side
app.post('/checkout/step1', (req, res) => {
  req.session.checkoutState = { cartId: req.body.cartId, shippingAddress: req.body.address };
  res.redirect('/checkout/step2');
});

app.get('/checkout/step2', (req, res) => {
  const { cartId } = req.session.checkoutState ?? {};
  res.render('checkout-step2', { cartId });
});
```

### Express / Sequelize equivalents `[interpretation]`

- `express-session` with `connect-redis` or `connect-pg-simple` is the idiomatic Node.js Server Session State implementation.
- In-memory store (`MemoryStore`) is the default but unsuitable for production: not shared across processes, leaks memory.
- Redis-backed sessions are the standard for Node.js clusters — horizontally scalable Server Session State.

---

## Database Session State (p. 462)

### JavaScript structure

```javascript
// Session data stored as rows in the DB, not in memory or cookies.
// A 'pending' flag marks uncommitted work in progress.
export class DatabaseSessionStore {
  async save(sessionId, data) {
    await db.query(
      `INSERT INTO session_data (session_id, payload, updated_at)
       VALUES (?, ?, NOW())
       ON DUPLICATE KEY UPDATE payload = VALUES(payload), updated_at = NOW()`,
      [sessionId, JSON.stringify(data)]
    );
  }

  async load(sessionId) {
    const rows = await db.query(
      'SELECT payload FROM session_data WHERE session_id = ?', [sessionId]
    );
    return rows[0] ? JSON.parse(rows[0].payload) : null;
  }

  async destroy(sessionId) {
    await db.query('DELETE FROM session_data WHERE session_id = ?', [sessionId]);
  }
}
// Pass to express-session as a custom store
```

### Express / Sequelize equivalents `[interpretation]`

- `connect-pg-simple` or `connect-sequelize` packages implement Database Session State for `express-session` without hand-rolling it.
- Advantage over Server Session State: survives server restarts, visible to DBA tooling, queryable for analytics.
- Performance overhead: every request reads/writes the DB for session data — add caching if this becomes a bottleneck.

---

## Base Patterns (Ch. 18)

---

## Gateway (p. 466)

### JavaScript structure

```javascript
// Wraps access to an external system. Caller sees a clean interface; internals are hidden.
export class TaxGateway {
  #baseUrl;
  #apiKey;

  constructor(baseUrl = process.env.TAX_API_URL, apiKey = process.env.TAX_API_KEY) {
    this.#baseUrl = baseUrl;
    this.#apiKey  = apiKey;
  }

  async calculateTax(amount, zipCode) {
    const resp = await fetch(`${this.#baseUrl}/calculate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.#apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, zipCode }),
    });
    if (!resp.ok) throw new Error(`Tax service error: ${resp.status}`);
    const { tax } = await resp.json();
    return tax;
  }
}
```

### Express / Sequelize equivalents `[interpretation]`

- Any class that wraps `fetch`, `axios`, an SMTP client, or an SDK behind a clean method interface is a Gateway.
- Constructor injection of `baseUrl` and `apiKey` enables Service Stub replacement in tests.
- Gateways should translate external errors into domain-meaningful exceptions — never let HTTP status codes leak to the service layer.

---

## Mapper (p. 473)

### JavaScript structure

```javascript
// Mediates between two independent subsystems; neither knows about the other.
// Different from Data Mapper: both sides are independent (not owner-to-DB).
export class PersonToLdapMapper {
  // Domain → LDAP format
  toExternalFormat(person) {
    return {
      dn:          `uid=${person.username},ou=people,dc=example,dc=com`,
      uid:         person.username,
      cn:          person.fullName,
      mail:        person.email,
      userPassword: person.hashedPassword,
    };
  }

  // LDAP entry → domain format
  toDomain(ldapEntry) {
    return new Person({
      username: ldapEntry.uid,
      fullName: ldapEntry.cn,
      email:    ldapEntry.mail,
    });
  }
}
```

### Express / Sequelize equivalents `[interpretation]`

- Mapper (base pattern) is the abstraction behind Data Mapper and can bridge any two systems (domain-to-LDAP, domain-to-third-party-API, DB-to-event-bus).
- In JS, free functions (`mapPersonToLdap(person)`) or small classes with `toX()` / `fromX()` methods are equally valid.
- Key constraint: neither system imports the other — only the Mapper imports both.

---

## Layer Supertype (p. 475)

### JavaScript structure

```javascript
// Common superclass for all objects in a layer. Holds shared behavior.
export class DomainObject {
  constructor(id = null) {
    this.id = id;
    this.createdAt = null;
    this.updatedAt = null;
  }

  isNew()   { return this.id === null; }
  isValid() { return true; } // subclasses override
  toString() { return `${this.constructor.name}#${this.id}`; }
}

export class Person extends DomainObject {
  constructor({ id, name, email }) {
    super(id);
    this.name  = name;
    this.email = email;
  }

  isValid() { return !!this.name && !!this.email; }
}
```

### Express / Sequelize equivalents `[interpretation]`

- Sequelize's `Model` class IS the Layer Supertype for the persistence layer — all Sequelize models extend it.
- For a domain layer supertype, create a `DomainObject` base class as shown and have all domain entities extend it.
- Avoid putting too much in the supertype: Layer Supertype is for genuinely shared infrastructure (id, audit fields, `isNew()`), not business logic.

---

## Separated Interface (p. 476)

### JavaScript structure

```javascript
// In JS, "interface" = a documented duck type. Show a factory that returns implementations.
// No 'interface' keyword — use JSDoc @typedef for documentation.

/**
 * @typedef {Object} OrderFinder
 * @property {function(number): Promise<Order>} findById
 * @property {function(number): Promise<Order[]>} findByCustomer
 */

// Implementation A — live (Sequelize-backed)
export const liveOrderFinder = {
  async findById(id)           { return OrderModel.findByPk(id); },
  async findByCustomer(custId) { return OrderModel.findAll({ where: { customerId: custId } }); },
};

// Implementation B — test stub
export const stubOrderFinder = {
  async findById(id)           { return testData.orders.find(o => o.id === id) ?? null; },
  async findByCustomer(custId) { return testData.orders.filter(o => o.customerId === custId); },
};

// Service receives either; it only knows the duck type
export class OrderService {
  constructor(finder = liveOrderFinder) { this.finder = finder; }
  async getSummary(id) { return this.finder.findById(id); }
}
```

### Express / Sequelize equivalents `[interpretation]`

- JavaScript has no compiler-enforced interfaces — Separated Interface relies entirely on developer discipline and JSDoc documentation.
- Constructor injection (as shown) is the practical implementation: pass the real implementation in production, a stub in tests.
- This is the most conceptually awkward pattern in JS due to the lack of type enforcement; JSDoc `@typedef` helps but does not prevent mismatches.

---

## Registry (p. 480)

### JavaScript structure

```javascript
// Well-known global lookup for shared services. Use sparingly — prefer DI.
// JS module system makes singletons natural; be careful with test isolation.
const _registry = new Map();

export const Registry = {
  register(key, service) {
    _registry.set(key, service);
  },
  get(key) {
    const svc = _registry.get(key);
    if (!svc) throw new Error(`Service not registered: ${key}`);
    return svc;
  },
  clear() { _registry.clear(); }, // useful in tests
};

// Bootstrap (app startup):
Registry.register('taxGateway',  new TaxGateway());
Registry.register('orderMapper', new OrderMapper());

// Usage:
const tax = Registry.get('taxGateway');
```

### Express / Sequelize equivalents `[interpretation]`

- Node.js module caching means a singleton exported from a module IS a Registry entry — `import { db } from '../db.js'` is the most common pattern.
- The Map-based Registry shown is preferable when you need runtime replacement (tests) without module cache hacks.
- Fowler notes Registry is "a last resort" — prefer constructor injection; Express's `app.locals` is a lightweight built-in registry for request-scoped services.

---

## Value Object (p. 486)

### JavaScript structure

```javascript
// Immutable; equality by value not identity. Use Object.freeze() in JS.
export class Money {
  constructor(amount, currency) {
    if (typeof amount !== 'number') throw new TypeError('amount must be a number');
    if (!currency)                  throw new TypeError('currency required');
    this.amount   = amount;
    this.currency = currency;
    Object.freeze(this); // enforce immutability
  }

  add(other) {
    if (other.currency !== this.currency) throw new Error('Currency mismatch');
    return new Money(this.amount + other.amount, this.currency); // returns new instance
  }

  equals(other) {
    return other instanceof Money
      && other.amount === this.amount
      && other.currency === this.currency;
  }

  toString() { return `${this.currency} ${this.amount.toFixed(2)}`; }
}
```

### Express / Sequelize equivalents `[interpretation]`

- `Object.freeze()` enforces shallow immutability; for deeply nested Value Objects, freeze recursively or use a library like `immer`.
- JavaScript's `===` compares objects by reference — always provide an `equals()` method for value equality.
- Persist via Embedded Value (p. 268): two columns (`amount`, `currency`) in the owning entity's table.

---

## Money (p. 488)

### JavaScript structure

```javascript
// Specialized Value Object for monetary amounts.
// Store and compute in integer cents to avoid floating-point errors.
export class Money {
  #cents;    // integer: avoids float rounding
  #currency;

  constructor(cents, currency) {
    if (!Number.isInteger(cents)) throw new TypeError('cents must be an integer');
    this.#cents    = cents;
    this.#currency = currency;
    Object.freeze(this);
  }

  static fromDecimal(amount, currency) {
    return new Money(Math.round(amount * 100), currency);
  }

  get amount()   { return this.#cents / 100; }
  get currency() { return this.#currency; }

  add(other)      { this.#assertSameCurrency(other); return new Money(this.#cents + other.#cents, this.#currency); }
  subtract(other) { this.#assertSameCurrency(other); return new Money(this.#cents - other.#cents, this.#currency); }

  allocate(ratios) {
    const total = ratios.reduce((s, r) => s + r, 0);
    let remainder = this.#cents;
    const results = ratios.map(r => {
      const share = Math.floor(this.#cents * r / total);
      remainder -= share;
      return new Money(share, this.#currency);
    });
    results[0] = new Money(results[0].#cents + remainder, this.#currency);
    return results;
  }

  #assertSameCurrency(other) {
    if (other.#currency !== this.#currency) throw new Error('Currency mismatch');
  }

  toString() { return `${this.#currency} ${this.amount.toFixed(2)}`; }
}
```

### Express / Sequelize equivalents `[interpretation]`

- Store `#cents` (integer) in the DB, not the decimal amount, to avoid rounding drift across calculations.
- The `allocate()` method (remainder handling) is the key difference from a plain numeric type — it distributes without losing pennies.
- Libraries like `dinero.js` implement this pattern in production JS; building it yourself as shown demonstrates the concepts.

---

## Special Case (p. 496)

### JavaScript structure

```javascript
// Subclass (or object) providing safe default behavior for null/missing cases.
export class NullCustomer {
  get name()   { return 'Guest'; }
  get email()  { return ''; }
  isNull()     { return true; }
  canOrder()   { return false; }
  getDiscount(){ return 0; }
}

export class Customer {
  constructor({ id, name, email }) {
    this.id = id; this.name = name; this.email = email;
  }
  isNull()      { return false; }
  canOrder()    { return true; }
  getDiscount() { return this.loyaltyYears > 2 ? 0.1 : 0; }
}

// Repository returns Special Case instead of null:
export class CustomerRepository {
  async findById(id) {
    const row = await db.fetchCustomer(id);
    return row ? new Customer(row) : new NullCustomer();
  }
}

// Caller: no null checks needed
const customer = await customerRepo.findById(id);
res.json({ name: customer.name, canOrder: customer.canOrder() });
```

### Express / Sequelize equivalents `[interpretation]`

- Special Case eliminates `if (customer == null)` guards throughout the codebase — the null object handles itself.
- In Express APIs, return a Special Case for missing resources rather than throwing 404 in the repository; let the route decide on the HTTP response.
- JavaScript's `undefined` and `null` proliferate easily — Special Case is especially valuable in JS to avoid runtime `TypeError: Cannot read properties of null`.

---

## Plugin (p. 499)

### JavaScript structure

```javascript
// Concrete implementations linked at configuration time, not compile time.
// Factory reads config and returns the right implementation.

// Thin interfaces (duck types):
// Both implementations expose: { findTaxRate(amount, zip): Promise<number> }

import { LiveTaxGateway }   from './gateways/LiveTaxGateway.js';
import { MockTaxGateway }  from './gateways/MockTaxGateway.js';
import { FlatRateTaxGate } from './gateways/FlatRateTaxGate.js';

const implementations = {
  live:     LiveTaxGateway,
  mock:     MockTaxGateway,
  flatrate: FlatRateTaxGate,
};

export function createTaxGateway() {
  const key = process.env.TAX_GATEWAY ?? 'live';
  const Impl = implementations[key];
  if (!Impl) throw new Error(`Unknown tax gateway: ${key}`);
  return new Impl();
}

// Wired at startup:
export const taxGateway = createTaxGateway();
```

### Express / Sequelize equivalents `[interpretation]`

- Environment variable-driven factory (as shown) is the idiomatic Node.js Plugin — `.env` file or Docker env controls which implementation loads.
- Pairs with Separated Interface (the duck type contract) and Service Stub (the test implementation).
- Node.js's native `import()` (dynamic import) enables true runtime plugin loading if the set of implementations is not known at build time.

---

## Service Stub (p. 504)

### JavaScript structure

```javascript
// Test-time replacement for a slow, external, or unavailable service.
// Wired in via Plugin / constructor injection.

// The stub — implements the same duck type as the real gateway
export class StubTaxGateway {
  constructor(fixedRate = 0.08) {
    this.fixedRate = fixedRate;
  }

  async findTaxRate(amount, zip) {
    return amount * this.fixedRate; // deterministic; no network call
  }
}

// In a Jest test:
import { OrderService } from '../services/OrderService.js';
import { StubTaxGateway } from '../stubs/StubTaxGateway.js';

test('order total includes tax', async () => {
  const stub = new StubTaxGateway(0.10);
  const service = new OrderService({ taxGateway: stub }); // inject stub
  const total = await service.calculateTotal({ items: [{ price: 100, qty: 1 }], zip: '00000' });
  expect(total).toBe(110);
});
```

### Express / Sequelize equivalents `[interpretation]`

- Jest's `jest.mock()` is an alternative, but explicit stub classes (as shown) are more transparent and reusable across test files.
- Service Stub requires constructor injection or Plugin wiring — any service that hard-codes `new TaxGateway()` internally cannot be stubbed without module-level mocking.
- A `StubFactory` that pre-wires common stubs for a test suite reduces boilerplate.

---

## Record Set (p. 508)

### JavaScript structure

```javascript
// In-memory tabular data mirroring a SQL result set. Native to ADO.NET; emulated in JS.
// In modern JS, an array of plain objects is the natural Record Set.

// Simulated Record Set with column metadata and row navigation
export class RecordSet {
  #columns;
  #rows;
  #cursor = -1;

  constructor(columns, rows) {
    this.#columns = columns; // ['id', 'name', 'salary']
    this.#rows    = rows;    // [{ id: 1, name: 'Alice', salary: 50000 }, ...]
  }

  next() { this.#cursor++; return this.#cursor < this.#rows.length; }
  get(column) { return this.#rows[this.#cursor][column]; }
  getAll()    { return [...this.#rows]; }

  static fromSequelizeResults(results) {
    if (!results.length) return new RecordSet([], []);
    const columns = Object.keys(results[0].dataValues);
    const rows    = results.map(r => r.dataValues);
    return new RecordSet(columns, rows);
  }
}
```

### Express / Sequelize equivalents `[interpretation]`

- In Node.js, arrays of plain objects from `Model.findAll({ raw: true })` are the practical Record Set — iteration, mapping, and filtering are native to arrays.
- The formal Record Set class (as shown) is rarely needed unless integrating with legacy systems that expect cursor-style navigation.
- Table Module (p. 125) is the natural companion: pass the array of rows into a Table Module constructor.

---

*Total patterns covered: 51*
*All entries include JavaScript code examples and Express/Sequelize equivalents tagged `[interpretation]`.*
