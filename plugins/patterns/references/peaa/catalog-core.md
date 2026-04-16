# PEAA Pattern Catalog — Core Reference

**Purpose**: Language-agnostic pattern definitions grounded in Fowler's *Patterns of
Enterprise Application Architecture* (2002). Intent, structure, when-to-use, and antipattern
signals for all 51 patterns. For code examples see `lang/<language>.md`.

**Anti-hallucination policy**: Direct Fowler quotes are cited by page. Interpretations
are tagged `[interpretation]`.

---
## Transaction Script
> Source: Chapter 9 — Book p. 110 (Fowler, PEAA 2002)

**Category**: Domain Logic
**Intent** *(from book, p. 110)*: "Organizes business logic by procedures where each procedure handles a single request from the presentation."

### When to Use
*(from book, p. 110–115)*
- Domain logic is simple and unlikely to grow significantly more complex
- Your team is not comfortable with object-oriented domain modeling
- You need a quick solution with simple data source interaction
- Works naturally with Row Data Gateway or Table Data Gateway

### When NOT to Use / Tradeoffs
*(from book + [interpretation])*
- As domain complexity grows, scripts accumulate duplication that becomes very hard to remove
- Complex conditional logic across scripts is difficult to factor out
- Fowler: "The resulting application can end up being quite a tangled web of routines without a clear structure" (p. 111)
- Prefer Domain Model when logic is complex enough to have real duplication or when polymorphism would simplify behavior

### Competing Patterns
- Prefer **Domain Model** (p. 116) when domain logic complexity warrants object modeling
- Prefer **Table Module** (p. 125) as a middle ground when using .NET/COM Record Set environments

### Antipattern Signals [interpretation]
Signs Transaction Script is being overused or has become an antipattern:
- Multiple scripts contain near-identical conditional blocks (copy-pasted logic)
- A single script function exceeds ~50 lines
- Adding a new business rule requires touching 3+ scripts
- Difficult to unit test individual business rules without hitting the database

---

*Python examples → `lang/python.md`*

## Domain Model
> Source: Chapter 9 — Book p. 116 (Fowler, PEAA 2002)

**Category**: Domain Logic
**Intent** *(from book, p. 116)*: "An object model of the domain that incorporates both behavior and data."

### When to Use
*(from book, p. 116–124)*
- Domain logic is complex — multiple validations, calculations, business rules that interact
- Logic complexity is expected to grow
- Team is comfortable with object-oriented design
- You are willing to invest in a more complex data source layer (usually Data Mapper)

### When NOT to Use / Tradeoffs
*(from book + [interpretation])*
- Simple domains don't justify the overhead — Transaction Script is easier to get right
- Requires a more sophisticated data source layer; pairs poorly with simple gateways
- Object-relational mapping is a significant investment: "the more complex your mapping to a relational database (usually with Data Mapper), the more complex your Domain Model" (p. 117)
- Team unfamiliar with OO patterns will struggle

### Competing Patterns
- Prefer **Transaction Script** (p. 110) for simple domains
- Prefer **Table Module** (p. 125) when your environment centers on tabular/Record Set data
- Requires **Data Mapper** (p. 165) for full isolation from the database

### Antipattern Signals [interpretation]
Signs a Domain Model is broken or degraded into **Anemic Domain Model**:
- Domain classes have only `@property` getters/setters with no real methods
- Business logic has leaked back into service layer or view layer
- Objects are just data containers — all behavior is in "manager" or "service" classes
- Domain objects import ORM or database packages directly

---

*Python examples → `lang/python.md`*

## Table Module
> Source: Chapter 9 — Book p. 125 (Fowler, PEAA 2002)

**Category**: Domain Logic
**Intent** *(from book, p. 125)*: "A single instance that handles the business logic for all rows in a database table or view."

### When to Use
*(from book, p. 125–132)*
- Your environment uses a Record Set or DataSet as the primary data representation (.NET/COM)
- GUI tools are data-aware and work directly with table-oriented structures
- Domain logic complexity is moderate — more than Transaction Script, but not needing full Domain Model
- You have a natural table-per-module structure

### When NOT to Use / Tradeoffs
*(from book + [interpretation])*
- Doesn't support instance-to-instance relationships natively — polymorphism is awkward
- No object identity (every operation requires passing an ID)
- "You can't have direct instance-to-instance relationships, and polymorphism doesn't work well" (p. 128)
- Prefer Domain Model for complex logic requiring inheritance or strategies

### Competing Patterns
- Prefer **Domain Model** (p. 116) for complex logic requiring OO patterns
- Prefer **Transaction Script** (p. 110) if logic is truly simple and Record Set is not in play
- Pairs naturally with **Table Data Gateway** (p. 144) and **Record Set** (p. 508)

### Antipattern Signals [interpretation]
- Passing Record Sets through many layers (presentation → domain → data) creating tight coupling
- Using Table Module in a non-Record Set environment, losing its primary benefit

---

*Python examples → `lang/python.md`*

## Service Layer
> Source: Chapter 9 — Book p. 133 (Fowler, PEAA 2002) — written by Randy Stafford

**Category**: Domain Logic
**Intent** *(from book, p. 133)*: "Defines an application's boundary with a layer of services that establishes a set of available operations and coordinates the application's response in each operation."

### When to Use
*(from book, p. 133–162)*
- Application has multiple kinds of clients (UI, batch, API, integration gateways)
- Use cases require coordinated responses across multiple transactional resources
- Need a single place to enforce transaction control and security
- "As soon as you envision a second kind of client, or a second transactional resource in use case responses, it pays to design in a Service Layer from the beginning" (p. 162)

### When NOT to Use / Tradeoffs
*(from book + [interpretation])*
- Single-client, single-resource apps don't need the overhead
- Fowler's preference: "thinnest Service Layer you can" — don't put domain logic in it
- Risk of creating an Anemic Domain Model by putting too much logic in services instead of domain objects
- "You probably don't need a Service Layer if your application's business logic will only have one kind of client" (p. 162)

### Competing Patterns
- The Service Layer wraps either **Domain Model** (p. 116) or **Transaction Script** (p. 110)
- Consider adding **Remote Facade** (p. 388) if remote access is needed instead of making Service Layer coarse-grained directly

### Book presents options:
- **Domain facade approach**: Service Layer is thin, all logic in Domain Model beneath it
- **Operation script approach**: Service Layer contains logic, delegates to domain objects only for calculations

### Antipattern Signals [interpretation]
- Service methods contain business rules (price calculations, validation logic) — should be in domain objects
- "God Service" — one service class with 20+ methods spanning unrelated operations
- Services calling other services in chains — indicates missing domain layer
- Service Layer bypassed by some callers but not others

---

<!-- ============================================================ -->
<!-- CHAPTER 10 — DATA SOURCE ARCHITECTURAL PATTERNS             -->
<!-- ============================================================ -->

*Python examples → `lang/python.md`*

## Table Data Gateway
> Source: Chapter 10 — Book p. 144 (Fowler, PEAA 2002)

**Category**: Data Source Architectural
**Intent** *(from book, p. 144)*: "An object that acts as a Gateway to a database table. One instance handles all the rows in the table."

### When to Use
*(from book, p. 144–151)*
- Simple data access with clear separation of SQL from domain logic
- Using Transaction Script (p. 110) for domain logic — natural pairing
- Using Table Module (p. 125) — "I can't really imagine any other database-mapping approach for Table Module" (p. 150)
- Team wants DBA-friendly encapsulation: all SQL for a table in one place

### When NOT to Use / Tradeoffs
*(from book + [interpretation])*
- With Domain Model (p. 116), creates bidirectional dependency coupling — prefer Data Mapper (p. 165)
- Returns Record Set / raw data, not domain objects — requires transformation elsewhere
- One class per table scales but can become large in data-heavy schemas

### Competing Patterns
- Prefer **Row Data Gateway** (p. 152) when you want one object per row (more OO feel)
- Prefer **Data Mapper** (p. 165) with Domain Model for full decoupling
- Prefer **Active Record** (p. 160) when domain objects can self-persist

### Antipattern Signals [interpretation]
- SQL scattered across the codebase (in views, services, domain objects) instead of in the gateway
- Gateway returning domain objects (breaks the separation — creates coupling)
- Multiple classes querying the same table without going through a single gateway

---

*Python examples → `lang/python.md`*

## Row Data Gateway
> Source: Chapter 10 — Book p. 152 (Fowler, PEAA 2002)

**Category**: Data Source Architectural
**Intent** *(from book, p. 152)*: "An object that acts as a Gateway to a single record in a data source. There is one instance per row."

### When to Use
*(from book, p. 152–159)*
- Using Transaction Script (p. 110) and want one object per database row
- Simple domain where having per-row objects is natural
- Prefer an OO feel (row = object) without full domain behavior on the object

### When NOT to Use / Tradeoffs
*(from book + [interpretation])*
- With complex domain logic: the row object starts attracting domain behavior → becomes Active Record
- Multiple rows require multiple object instantiations — more overhead than Table Data Gateway
- When using Table Module (p. 125), Table Data Gateway (p. 144) is a better fit

### Competing Patterns
- Prefer **Table Data Gateway** (p. 144) for simpler, table-centric access or with Table Module
- Prefer **Active Record** (p. 160) when domain logic naturally belongs on the row object
- Prefer **Data Mapper** (p. 165) with Domain Model

### Antipattern Signals [interpretation]
- Row gateway objects accumulating business methods — should become Active Record or migrate to Domain Model + Data Mapper

---

*Python examples → `lang/python.md`*

## Active Record
> Source: Chapter 10 — Book p. 160 (Fowler, PEAA 2002)

**Category**: Data Source Architectural
**Intent** *(from book, p. 160)*: "An object that wraps a row in a database table or view, encapsulates the database access, and adds domain logic on that data."

### When to Use
*(from book, p. 160–164)*
- Domain logic is not too complex
- One-to-one correspondence between domain classes and database tables
- Team is comfortable with the pattern and its coupling trade-offs
- "If the domain logic is simple and you have a close correspondence between classes and tables, Active Record is the simple way to go" (p. 164)

### When NOT to Use / Tradeoffs
*(from book + [interpretation])*
- Complex domain logic: the object-relational coupling becomes a liability
- Inheritance hierarchies: relational databases don't support them well at this level
- Testing becomes harder — domain logic can't be tested without database
- "As the domain logic gets more complicated, the simple approach of an Active Record starts to break down" (p. 161)

### Competing Patterns
- Prefer **Data Mapper** (p. 165) when domain model is complex or needs full DB isolation
- Prefer **Row Data Gateway** (p. 152) as a precursor pattern if domain logic will be added later

### Antipattern Signals [interpretation]
- Active Record objects being used across complex domain with inheritance hierarchies (use Data Mapper instead)
- Domain logic too complex to test without a real database — sign you need Data Mapper isolation
- Active Record imported in presentation layer — breaks layering

---

*Python examples → `lang/python.md`*

## Data Mapper
> Source: Chapter 10 — Book p. 165 (Fowler, PEAA 2002)

**Category**: Data Source Architectural
**Intent** *(from book, p. 165)*: "A layer of Mappers that moves data between objects and a database while keeping them independent of each other and the mapper itself."

### When to Use
*(from book, p. 165–183)*
- Domain model is complex with inheritance, strategies, and complex object graphs
- You want domain objects completely ignorant of the database
- "The most complicated of the database mapping architectures, but its benefit is complete isolation of the two layers" (p. 165)
- When you want to unit test domain logic without a database

### When NOT to Use / Tradeoffs
*(from book + [interpretation])*
- Simple domains — the complexity is not justified
- Small teams without O/R mapping tool experience
- High upfront investment: "a sophisticated data source layer is much like a fixed cost—it takes a fair amount of money (if you buy) or time (if you build)" (p. 117)

### Competing Patterns
- Prefer **Active Record** (p. 160) for simpler domains with close table/class correspondence
- Data Mapper is the natural pair for **Domain Model** (p. 116)
- Often implemented via **Unit of Work** (p. 184) + **Identity Map** (p. 195)

### Antipattern Signals [interpretation]
- Domain objects importing SQLAlchemy models or ORM Base classes (coupling leaked)
- Mapper logic spread across multiple layers instead of contained in mapper classes
- Mapper returning raw dicts instead of domain objects

---

<!-- ============================================================ -->
<!-- CHAPTER 11 — OBJECT-RELATIONAL BEHAVIORAL PATTERNS          -->
<!-- Entries for Unit of Work, Identity Map, and Lazy Load       -->
<!-- to be added by catalog-building agent from PDF pp. 184–213  -->
<!-- ============================================================ -->

*Python examples → `lang/python.md`*

## Unit of Work
> Source: Chapter 11 — Book p. 184 (Fowler, PEAA 2002)

**Category**: Object-Relational Behavioral
**Intent** *(from book, p. 184)*: "Maintains a list of objects affected by a business transaction and coordinates the writing out of changes and the resolution of concurrency problems."

### When to Use
*(from book, p. 184–195)*
- You are loading multiple objects from the database and need to track which have been modified
- You want to batch all database writes at the end of a transaction rather than writing immediately
- "A Unit of Work is an essential pattern whenever the behavioral interactions with the database become awkward" (p. 184)
- Used with Data Mapper — the mapper registers objects with the Unit of Work

### When NOT to Use / Tradeoffs
*(from book + [interpretation])*
- Simple scripts with one or two database operations — overhead is not justified
- Active Record pattern handles its own saving, making explicit UoW less needed

### Competing Patterns
- Works with **Identity Map** (p. 195) — UoW tracks dirty objects, Identity Map ensures uniqueness
- Essential companion to **Data Mapper** (p. 165)

### Antipattern Signals [interpretation]
- Saving objects to the database immediately on every change (implicit, scattered commits)
- No clear transaction boundary — data can be partially written on failure
- Multiple database roundtrips where one batched commit would do

---

*Python examples → `lang/python.md`*

## Identity Map
> Source: Chapter 11 — Book p. 195 (Fowler, PEAA 2002)

**Category**: Object-Relational Behavioral
**Intent** *(from book, p. 195)*: "Ensures that each object gets loaded only once by keeping every loaded object in a map. Looks up objects using the map when referring to them."

### When to Use
*(from book, p. 195–199)*
- Loading the same database row multiple times in a single request would create duplicate in-memory objects
- You need consistent object identity within a session/request — two lookups of the same ID must return the same object reference
- "The primary purpose of an Identity Map is to maintain correct identities, not to boost performance" (p. 196)

### When NOT to Use / Tradeoffs
*(from book + [interpretation])*
- Stateless request handling where each request gets a fresh context — maps are per-session, not global
- Memory intensive if the map grows very large within a long-running session

### Antipattern Signals [interpretation]
- Two separate loads of the same row returning two different Python objects that diverge on update
- Stale reads because a cached object is used when the database has been updated

---

*Python examples → `lang/python.md`*

## Lazy Load
> Source: Chapter 11 — Book p. 200 (Fowler, PEAA 2002)

**Category**: Object-Relational Behavioral
**Intent** *(from book, p. 200)*: "An object that doesn't contain all of the data you need but knows how to get it."

### When to Use
*(from book, p. 200–213)*
- Loading an object graph in full would pull too much data from the database
- Related objects are not always needed
- "Using Lazy Load at suitable points, you can bring back just enough from the database with each call" (p. 196)

### When NOT to Use / Tradeoffs
*(from book + [interpretation])*
- Small, simple object graphs where eager loading is fine
- Lazy Load can cause N+1 query problems if applied naively to collections

### Book presents four variations (p. 200):
- **Lazy Initialization**: Check if field is null on first access, load then
- **Virtual Proxy**: Proxy object that loads on first real use
- **Value Holder**: Wrapper object that fetches on demand
- **Ghost**: Partially loaded object that completes itself on field access

### Antipattern Signals [interpretation]
- N+1 query problem: loading 100 suppliers and then hitting the DB for each one's products (100 extra queries)
- Ghost objects causing unexpected database queries deep in the call stack
- Session-closed errors in SQLAlchemy when lazy loading after session ends

---

<!-- ============================================================ -->
<!-- CHAPTERS 12–18 — REMAINING PATTERNS                         -->
<!-- Stub entries — to be expanded from PDF                      -->
<!-- ============================================================ -->

*Python examples → `lang/python.md`*

## Identity Field
> Source: Chapter 12 — Book p. 216 (Fowler, PEAA 2002)

**Category**: Object-Relational Structural
**Intent** *(from book, p. 216)*: "Saves a database ID field in an object to maintain identity between an in-memory object and a database row."

### When to Use
*(from book, p. 216)*
- You are mapping between in-memory objects and database rows — i.e., using Domain Model (116) or Row Data Gateway (152)
- Not needed when using Transaction Script (110), Table Module (125), or Table Data Gateway (144), which work with raw data rather than identity-tracked objects
- For small objects with value semantics (money, date range), use Embedded Value (268) instead — they don't need their own Identity Field
- For complex object graphs not queried from the relational database, Serialized LOB (272) may be easier

### When NOT to Use / Tradeoffs
*(from book + [interpretation])*
- Meaningful keys (like a US Social Security Number) seem attractive but are dangerous: they may not be immutable, unique, or non-null in practice — Fowler recommends meaningless keys
- Compound keys increase complexity; prefer simple integer keys unless legacy schema forces compounds
- Table-unique keys (vs. database-unique keys) require a key allocation system to maintain uniqueness across tables in a hierarchy — particularly painful with Concrete Table Inheritance (293)
- Using dates or strings as keys introduces portability and precision problems

### Competing Patterns
- Prefer **Embedded Value** (p. 268) when the object is a Value Object (486) with no need for its own database identity
- Prefer **Serialized LOB** (p. 272) when the object graph doesn't need to be queried from SQL
- An extended **Identity Map** (p. 195) can maintain the correspondence instead of storing the key on the object — but Fowler finds this rare in practice

### Antipattern Signals [interpretation]
- Domain objects have no primary key field — impossible to persist updates to the correct row
- Using mutable business values (email, SSN, username) as primary keys — breaks when those values change
- Generating keys inside a transaction using auto-increment without reading them back — causes ordering issues for related objects (e.g., line items needing order ID before the order is committed)

---

*Python examples → `lang/python.md`*

## Foreign Key Mapping
> Source: Chapter 12 — Book p. 236 (Fowler, PEAA 2002)

**Category**: Object-Relational Structural
**Intent** *(from book, p. 236)*: "Maps an association between objects to a foreign key reference between tables."

### When to Use
*(from book, p. 236)*
- For almost all single-valued (many-to-one, one-to-one) associations between objects — the most common case
- Cannot be used for many-to-many associations, since there is no single-valued end to hold the foreign key — use Association Table Mapping (248) instead
- If the related object is a Value Object (486), use Embedded Value (268) instead
- If a collection field has no back pointer and only one owner references it, consider whether Dependent Mapping (262) simplifies things

### When NOT to Use / Tradeoffs
*(from book + [interpretation])*
- Many-to-many associations have no single-valued end for a foreign key — impossible without a link table
- Handling collections requires a choice: (1) delete-and-reinsert all children, (2) add a back pointer to make the association bidirectional, or (3) diff the collection — each has costs
- Cycles in object graphs (order → customer → payments → order) must be broken with Lazy Load (200) or by creating empty objects and inserting them into the Identity Map (195) before loading their data
- Update of a collection is awkward: must decide whether removed items were moved, deleted, or re-keyed

### Competing Patterns
- Prefer **Association Table Mapping** (p. 248) for many-to-many associations
- Prefer **Embedded Value** (p. 268) when the related object is a Value Object
- Prefer **Dependent Mapping** (p. 262) when the collection items have exactly one owner and no other table references them

### Antipattern Signals [interpretation]
- Storing object references as object IDs in memory but failing to save them as foreign keys to the database — data relationship lost on persist
- Loading a collection member by re-querying for every item (N+1 queries) instead of joining or using a single parameterized query
- Updating a collection by detecting diffs manually instead of using delete-and-reinsert or the ORM's change tracking

---

*Python examples → `lang/python.md`*

## Association Table Mapping
> Source: Chapter 12 — Book p. 248 (Fowler, PEAA 2002)

**Category**: Object-Relational Structural
**Intent** *(from book, p. 248)*: "Saves an association as a table with foreign keys to the tables of the associated classes."

### When to Use
*(from book, p. 248)*
- The canonical case is a many-to-many association — there are no alternatives for that situation
- Also usable for simpler associations when you cannot add columns to the existing tables (e.g., linking two tables owned by different teams or systems)
- Existing schema already uses an associative table even when it isn't strictly necessary — often easier to keep it than to simplify the schema

### When NOT to Use / Tradeoffs
*(from book + [interpretation])*
- More complex than Foreign Key Mapping (236) and requires an extra join — don't use it for one-to-many associations unless you have no alternative
- Loading two stages: first query the link table for related IDs, then load each related object — can be N+1 queries if not joined
- The link table can be joined in a single SQL query (at the cost of a more complex query) to avoid multiple round trips
- Update strategy: delete all link rows for the owner, then reinsert — simple but costly if the collection is large; treat the link table like a Dependent Mapping (262)

### Competing Patterns
- Prefer **Foreign Key Mapping** (p. 236) for all one-to-many associations (simpler, no join table needed)
- When the link table carries additional data (e.g., start date of employment), the link table corresponds to a true domain object and should be modeled as such

### Antipattern Signals [interpretation]
- N+1 queries: loading 100 employees and then issuing one query per employee to fetch their skills (100 extra queries) — use a join or `prefetch_related()`
- Manually maintaining a link table without treating it as a managed dependency — orphan rows accumulate
- Putting domain data (employment start date, role in project) in the link table but not modeling it as a domain object — loses the ability to query or validate those fields

---

*Python examples → `lang/python.md`*

## Dependent Mapping
> Source: Chapter 12 — Book p. 262 (Fowler, PEAA 2002)

**Category**: Object-Relational Structural
**Intent** *(from book, p. 262)*: "Has one class perform the database mapping for a child class."

### When to Use
*(from book, p. 262)*
- An object is only ever referred to by one other object (has exactly one owner), and there must be no references from any object other than the owner to the dependent
- The owner holds a collection of references to its dependents but there's no back pointer from dependent to owner
- The dependents don't need their own identity — they shouldn't need to be fetched by a find method independently
- Preconditions: a dependent must have exactly one owner AND there must be no references from any other object to the dependent

### When NOT to Use / Tradeoffs
*(from book + [interpretation])*
- Do NOT use Dependent Mapping with Unit of Work (184) — the delete-and-reinsert strategy conflicts with UoW's change tracking and can cause orphan rows or double-insertion problems
- Do not use if large graphs of dependents are anticipated — finding an object from outside the graph requires complex lookup via the root owner
- Any change to a dependent must mark the owner as dirty; making dependents immutable simplifies this considerably
- Fowler avoids large graphs of dependents; Dependent Mapping works best for tight, simple collections owned by a single parent

### Competing Patterns
- Prefer **Embedded Value** (p. 268) when the dependent is a single small Value Object (not a collection)
- Prefer **Association Table Mapping** (p. 248) when dependents may be referenced by multiple owners

### Antipattern Signals [interpretation]
- Dependent objects being fetched independently by ID (they should have no finder) — signals a design that should use a full entity instead
- Multiple objects holding references to the same dependent — violates the one-owner rule, causes concurrent update conflicts
- Unit of Work tracking dependents as independent dirty objects — leads to double-save or missed-delete bugs

---

*Python examples → `lang/python.md`*

## Embedded Value
> Source: Chapter 12 — Book p. 268 (Fowler, PEAA 2002)

**Category**: Object-Relational Structural
**Intent** *(from book, p. 268)*: "Maps an object into several fields of another object's table."

### When to Use
*(from book, p. 268)*
- The clearest cases are Value Objects (486) like money and date range — since Value Objects don't have identity, you can create and destroy them easily without worrying about Identity Maps (195) or tracking. "All Value Objects (486) should be persisted as Embedded Value"
- Also appropriate when a table from an existing schema holds data that splits into more than one in-memory object, and the association between them is single-valued at both ends (one-to-one)
- Prefer Embedded Value when you need to query the dependent's fields using SQL — the values are addressable columns, unlike a Serialized LOB

### When NOT to Use / Tradeoffs
*(from book + [interpretation])*
- Only works well for fairly simple dependents — a solitary dependent or a few separated dependents
- Multiple candidate dependents with variable and unfixed number require numbered columns (messy table design) — Serialized LOB (272) is usually better in that case
- If the dependent is a reference object rather than a value object, be careful: any change to the dependent must mark the owner as dirty — not an issue with Value Objects (which are replaced, not mutated)
- If you need to access the dependent's data separately through SQL (for reporting, for example), Embedded Value supports this while Serialized LOB does not

### Competing Patterns
- Prefer **Serialized LOB** (p. 272) for complex object subgraphs or structures with variable depth
- Prefer **Dependent Mapping** (p. 262) when a collection of dependent objects must each be stored as a row

### Antipattern Signals [interpretation]
- Storing a Money or DateRange object as a single string column — loses SQL queryability and forces application-level parsing
- Giving Value Objects their own table with a primary key — unnecessary overhead and identity where none is needed
- Mutating a shared Value Object instead of replacing it — breaks value semantics and can corrupt the owning object's dirty-tracking

---

*Python examples → `lang/python.md`*

## Serialized LOB
> Source: Chapter 12 — Book p. 272 (Fowler, PEAA 2002)

**Category**: Object-Relational Structural
**Intent** *(from book, p. 272)*: "Saves a graph of objects by serializing them into a single large object (LOB), which it stores in a database field."

### When to Use
*(from book, p. 272)*
- Serialized LOB isn't often as it might be; XML makes it much more attractive because it yields an easy-to-implement textual approach
- Works best when you can chop a piece of the object model and use it to represent the LOB — think of a LOB as a way to take a bunch of objects that aren't likely to be queried from any SQL route outside the application, and this graph can then be hooked into the SQL schema
- Appropriate when the structure is complex (deep hierarchies, variable-depth graphs) that Embedded Value (268) cannot handle
- Use a separate database for reporting if all SQL goes against the main database — structures suitable for Serialized LOB are often also suitable for a separate reporting database

### When NOT to Use / Tradeoffs
*(from book + [interpretation])*
- Serialized LOB works poorly when objects outside the LOB reference objects buried inside it — linking from outside into the LOB is nearly impossible (awkward, though XPATH can help with XML)
- You cannot query the LOB's internals with SQL — if you need SQL-queryable fields, use Embedded Value (268) instead
- Binary BLOB: simplest but human-unreadable and opaque to database users; CLOB/XML: readable and parseable but larger and slower
- Be careful about identity problems: if you store the same data in both a Serialized LOB and a separate column, the data must be kept in sync on every write

### Competing Patterns
- Prefer **Embedded Value** (p. 268) when the dependent's fields need to be individually queryable from SQL
- Prefer **Dependent Mapping** (p. 262) when the objects in the graph each need their own database row and can be individually referenced

### Antipattern Signals [interpretation]
- Storing objects in a BLOB that are later needed for SQL queries or reporting — should have used Embedded Value or a normalized schema
- Multiple rows in other tables linking into objects inside a Serialized LOB — creates a maintenance nightmare and referential integrity cannot be enforced
- Using pickle for Python object serialization in a database — creates tight coupling to Python class structure and breaks on refactoring

---

*Python examples → `lang/python.md`*

## Single Table Inheritance
> Source: Chapter 12 — Book p. 278 (Fowler, PEAA 2002)

**Category**: Object-Relational Structural
**Intent** *(from book, p. 278)*: "Represents an inheritance hierarchy of classes as a single table that has columns for all the fields of the various classes."

### When to Use
*(from book, p. 278)*
- Strengths of Single Table Inheritance:
  - There's only a single table to worry about on the database
  - There are no joins in retrieving data
  - Any refactoring that pushes fields up or down the hierarchy doesn't require you to change the database
- You don't need to use one form of inheritance mapping for your whole hierarchy — you can mix, e.g., Single Table Inheritance for similar subclasses alongside Concrete Table Inheritance (293) for classes with lots of specific data

### When NOT to Use / Tradeoffs
*(from book + [interpretation])*
- Weaknesses of Single Table Inheritance:
  - Fields are sometimes relevant and sometimes not — confusing for people using the tables directly
  - Columns used only by some subclasses lead to wasted space (though some databases like Oracle handle empty columns efficiently)
  - The single table may become too large with many indexes and frequent locking, hurting performance
  - Only a single namespace for fields — must ensure no name collisions across subclasses; use compound names with class name as prefix/suffix
- Alternatives are Class Table Inheritance (285) and Concrete Table Inheritance (293)

### Competing Patterns
- Prefer **Class Table Inheritance** (p. 285) when a clean mapping between domain classes and tables is important (DBA-friendly)
- Prefer **Concrete Table Inheritance** (p. 293) for subclasses with many unique fields that would waste too much space in a single table
- All three inheritance patterns can coexist in a single hierarchy

### Antipattern Signals [interpretation]
- A `players` table with dozens of nullable columns — most are NULL for any given row; STI table has grown beyond its ideal scope
- Subclass-specific columns mixed with shared columns without any naming convention — causes confusion for ad hoc SQL queries
- No type discriminator column — impossible to determine which subclass to instantiate on load

---

*Python examples → `lang/python.md`*

## Class Table Inheritance
> Source: Chapter 12 — Book p. 285 (Fowler, PEAA 2002)

**Category**: Object-Relational Structural
**Intent** *(from book, p. 285)*: "Represents an inheritance hierarchy of classes with one table for each class."

### When to Use
*(from book, p. 285)*
- Strengths of Class Table Inheritance:
  - All columns are relevant for every row — tables are easier to understand and don't waste space
  - The relationship between the domain model and the database is very straightforward (DBA-friendly)
- Useful when a clean correspondence between classes and tables is a priority
- You can mix Class Table Inheritance for classes at the top of a hierarchy and Concrete Table Inheritance (293) for those lower down

### When NOT to Use / Tradeoffs
*(from book + [interpretation])*
- Weaknesses of Class Table Inheritance:
  - You need to touch multiple tables to load an object — requires a join or multiple queries and assembling data in memory
  - Any refactoring of fields up or down the hierarchy causes database changes
  - The supertype table may become a bottleneck because it must be accessed for every read
  - The high normalization may make ad hoc queries hard to understand
- Joins for more than three or four tables tend to be slow; reading root table first then using type code to query child tables requires multiple queries

### Competing Patterns
- Prefer **Single Table Inheritance** (p. 278) when query simplicity and no-joins are the priority
- Prefer **Concrete Table Inheritance** (p. 293) when table isolation is more important than avoiding duplicate superclass columns

### Antipattern Signals [interpretation]
- Loading a superclass (Player) by issuing one query per subclass table to find which one holds the object — O(n subclasses) queries for every superclass lookup
- Refactoring a field from subclass to superclass (or vice versa) and forgetting to alter all child table DDL
- Supertype table (`players`) becoming a write bottleneck — every insert to any subclass requires a write to this shared table

---

*Python examples → `lang/python.md`*

## Concrete Table Inheritance
> Source: Chapter 12 — Book p. 293 (Fowler, PEAA 2002)

**Category**: Object-Relational Structural
**Intent** *(from book, p. 293)*: "Represents an inheritance hierarchy of classes with one table per concrete class in the hierarchy."

### When to Use
*(from book, p. 293)*
- Strengths of Concrete Table Inheritance:
  - Each table is self-contained and has no irrelevant fields — makes good sense when used by other applications that aren't using the objects
  - There are no joins to do when reading data from the concrete mappers
  - Each table is accessed only when that class is accessed — can spread the access load
- Often called "leaf table inheritance" since concrete classes are usually leaves in a hierarchy

### When NOT to Use / Tradeoffs
*(from book + [interpretation])*
- Weaknesses of Concrete Table Inheritance:
  - Primary keys can be difficult to handle — keys must be unique not just per table but across all tables in the hierarchy (since any object in the hierarchy needs a unique ID); can't rely on database auto-increment alone
  - You can't enforce database relationships to abstract classes — no single table for Player means you can't put a FK constraint pointing to "any player"
  - If superclass fields change, you must alter every table that has those fields (they are duplicated)
  - A find on the superclass forces you to check all concrete tables — multiple database accesses or a complex outer join
- If you have a collection of players and use Identity Field (216) with table-wide keys, you'll get multiple rows for the same key value across subclass tables — need a cross-table key allocation strategy

### Competing Patterns
- Prefer **Single Table Inheritance** (p. 278) when the hierarchy has many subclasses with mostly shared fields and query simplicity matters
- Prefer **Class Table Inheritance** (p. 285) when referential integrity and clean table-per-class mapping matter more than join avoidance
- The three inheritance patterns can coexist — use Concrete Table Inheritance for one or two subclasses and Single Table Inheritance (278) for the rest

### Antipattern Signals [interpretation]
- Auto-increment primary keys generating the same ID value in different subclass tables — violates cross-table uniqueness when querying through the superclass mapper
- A `CharityFunction` needing a FK to a `Player` that can be any subclass — impossible to enforce referential integrity without a union table or a separate link table per subclass
- Finding all Players requiring a UNION across all concrete tables — complex, slow, non-portable SQL

---

*Python examples → `lang/python.md`*

## Inheritance Mappers
> Source: Chapter 12 — Book p. 302 (Fowler, PEAA 2002)

**Category**: Object-Relational Structural
**Intent** *(from book, p. 302)*: "A structure to organize database mappers that handle inheritance hierarchies."

### When to Use
*(from book, p. 302)*
- Use whenever you are doing any inheritance-based database mapping — the alternatives (duplicating superclass mapping code among concrete mappers, folding the player interface into the abstract player mapper class) are worse
- "This general scheme makes sense for any inheritance-based database mapping. The alternatives involve such things as duplicating superclass mapping code among the concrete mappers and folding the player's interface into the abstract player mapper class. The former is a heinous crime, and the latter is possible but leads to a player mapper class that's messy and confusing."
- The pattern is used in conjunction with Single Table Inheritance (278), Class Table Inheritance (285), and Concrete Table Inheritance (293) — the structure is the same for all three

### When NOT to Use / Tradeoffs
*(from book + [interpretation])*
- There is no practical alternative when doing inheritance mapping — the pattern is essentially mandatory
- The complexity lies in the separation between the abstract player mapper (loads/saves player-level data), the concrete mapper (loads/saves subclass data), and the player wrapper mapper (provides the public interface and delegates) — this three-way split can be confusing initially

### Competing Patterns
- Works directly with **Single Table Inheritance** (p. 278), **Class Table Inheritance** (p. 285), and **Concrete Table Inheritance** (p. 293)
- The Layer Supertype (475) on the mapper side holds common behavior — find, insert, update, delete interface

### Antipattern Signals [interpretation]
- Each concrete mapper duplicates the superclass field loading code — should be in a shared abstract mapper
- The abstract mapper class (e.g., AbstractPlayerMapper) being instantiated directly and used as the public API — leads to messy code; the PlayerMapper wrapper should be the public interface
- Conditional `isinstance` chains scattered across multiple places in the codebase instead of being contained in the wrapper mapper's `_mapper_for` method

---

*Python examples → `lang/python.md`*

## Metadata Mapping
> Source: Chapter 13 — Book p. 306 (Fowler, PEAA 2002)

**Category**: Object-Relational Metadata Mapping
**Intent** *(from book, p. 306)*: "Holds details of object-relational mapping in metadata."

### When to Use
*(from book, p. 306)*
- Metadata Mapping can greatly reduce the amount of work needed to handle database mapping — however, some setup work is required to prepare the Metadata Mapping framework
- Commercial object-relational mapping tools use Metadata Mapping — when selling a product, producing a sophisticated Metadata Mapping is worth the effort
- If building your own system: compare adding new mappings using handwritten code vs. using Metadata Mapping. If you use reflection, look into its consequences for performance
- The extra work of hand-coding can be greatly reduced by creating a good Layer Supertype (475) that handles all the common behavior — Metadata Mapping reduces further

### When NOT to Use / Tradeoffs
*(from book + [interpretation])*
- Metadata Mapping can interfere with refactoring — if you rename a field, automated tools may not find the field name hidden in an XML data file or metadata; code generation is better here than reflection
- With reflection: field names are in metadata files, not searchable by IDE; renaming breaks silently
- Reflective programming often suffers in speed — measure in your environment; in context of SQL calls it may not matter
- Small projects and single mappings: the framework setup cost often exceeds the benefit; hand-code with a good Layer Supertype instead

### Competing Patterns
- **Layer Supertype** (p. 475) can reduce hand-coding almost as much for simpler cases without the full Metadata Mapping framework
- Metadata Mapping is the conceptual foundation of commercial O/R mappers

### Antipattern Signals [interpretation]
- Handwriting identical mapper classes for 30 domain objects with the same load/save structure — should extract to a reflective or metadata-driven superclass
- Metadata stored in both XML files and code, getting out of sync — single source of truth for mappings is essential
- Renaming a Python field without updating the metadata file — silent breakage with no compile-time error

---

*Python examples → `lang/python.md`*

## Query Object
> Source: Chapter 13 — Book p. 316 (Fowler, PEAA 2002)

**Category**: Object-Relational Metadata Mapping
**Intent** *(from book, p. 316)*: "An object that represents a database query."

### How It Works
*(from book, p. 316)*

Query Object is an application of the Interpreter pattern geared to represent a SQL query. Its primary roles are to allow a client to form queries of various kinds and to turn those object structures into the appropriate SQL string.

A Query Object represents queries in the language of in-memory objects rather than the database schema — using object and field names rather than table and column names. This is particularly valuable when there are variations between the two, and requires Metadata Mapping (306) to perform the translation.

A Query Object starts minimal: build the simplest version that satisfies current needs and evolve it as those needs grow. At its simplest it handles a conjunction of elementary predicates (criteria ANDed together). More sophisticated versions can detect and avoid redundant queries by checking against the Identity Map (195), or generate different SQL dialects for different databases.

### When to Use
*(from book, p. 316)*

- You are using Domain Model (116) and Data Mapper (165) — Query Object is not worth the effort with a handbuilt data source layer
- You also have Metadata Mapping (306) in place — without it, you cannot translate field names to column names programmatically
- You need the more sophisticated capabilities: keeping database schemas encapsulated from client code, supporting multiple databases, supporting multiple schemas, or optimising to avoid duplicate queries
- Most teams are better off purchasing a tool that includes Query Object rather than building one; use the pattern directly only when a limited in-house version satisfies your needs

### When NOT to Use / Tradeoffs
*(from book + [interpretation])*

- If your team is comfortable writing SQL, specific finder methods on your mapper hide the schema just as effectively with far less infrastructure
- Query Object is a pretty sophisticated pattern — building a fully featured version is rarely justified; pare it down to exactly the functionality you actually use
- Without Metadata Mapping the field-to-column translation has nowhere to live, making the pattern impractical [interpretation]
- [interpretation] For most applications an ORM (SQLAlchemy ORM used with FastAPI) already provides Query Object-equivalent capability — building your own adds maintenance cost for little gain

### Competing Patterns

- **Metadata Mapping** (306) — prerequisite; provides field→column translation that Query Object needs to generate SQL
- **Repository** (322) — often sits above Query Object; Repository uses Query Object to generate database queries while presenting a cleaner collection-like interface to callers
- **Data Mapper** (165) — provides the `findObjectsWhere(whereClause)` method that Query Object delegates to for execution

### Antipattern Signals [interpretation]

- Criteria classes that embed raw SQL strings — defeats the point of domain-language queries
- Query Object used without Metadata Mapping — field-to-column translation must be hardcoded, producing a fragile home-grown ORM
- Building a fully general Query Object (subqueries, JOINs, aggregates) in-house when SQLAlchemy or a similar library already exists

---

*Python examples → `lang/python.md`*

## Repository
> Source: Chapter 13 — Book p. 322 (Fowler, PEAA 2002)

**Category**: Object-Relational Metadata Mapping
**Intent** *(from book, p. 322)*: "Mediates between the domain and data mapping layers using a collection-like interface for accessing domain objects."

### How It Works
*(from book, p. 322 — by Edward Hieatt and Rob Mee)*

A Repository mediates between the domain and data mapping layers, acting like an in-memory domain object collection. Client objects construct query specifications declaratively and submit them to the Repository for satisfaction. Objects can be added to and removed from the Repository as from a simple collection; the mapping code encapsulated by the Repository carries out the appropriate persistence operations behind the scenes.

Conceptually a Repository encapsulates the set of objects persisted in a data store and the operations performed on them, providing a more object-oriented view of the persistence layer. It supports a clean separation and one-way dependency between the domain and data mapping layers.

Under the covers, Repository combines Metadata Mapping (329) with Query Object (316) to automatically generate SQL code from the criteria. A `RelationalStrategy` creates a Query Object from the criteria and queries the database; an `InMemoryStrategy` iterates over a collection of domain objects and asks the criteria whether each satisfies it — the same Repository interface works for both. This swappable-strategy design is especially valuable in tests where the in-memory strategy eliminates database dependency.

### When to Use
*(from book, p. 322)*

- Large systems with many domain object types and many possible queries — Repository reduces the amount of code needed to deal with all querying
- When multiple data sources are involved — Repository comes into its own when you want to switch between a relational database and an in-memory collection (e.g., for unit tests) without any change to client code
- When you want to be able to run unit tests entirely in memory for performance — adding domain objects to a collection is faster than inserting them into a database and deleting them at teardown
- Certain domain objects should remain in memory once loaded and never be queried again (e.g., immutable reference data set by the user) — Repository makes this straightforward

### When NOT to Use / Tradeoffs
*(from book + [interpretation])*

- Repository is a sophisticated pattern that makes use of Query Object, Metadata Mapping, Unit of Work, and Registry — in simpler applications the machinery outweighs the benefit [interpretation]
- If your team is comfortable with SQL and your domain model is modest in size, specific finder methods on Data Mapper (165) are simpler and equally maintainable
- The pattern requires that domain objects not be stored directly in the Repository object itself — this apparent simplicity can surprise developers unfamiliar with the pattern
- [interpretation] Modern ORMs (SQLAlchemy `Session` / custom Repository class) provide Repository-equivalent semantics; implementing a hand-rolled Repository on top of an ORM risks duplicating what the ORM already offers

### Competing Patterns

- **Query Object** (316) — Repository uses Query Object internally to generate queries; they work together rather than competing
- **Data Mapper** (165) — Repository replaces specialised finder methods on Data Mapper with a specification-based approach; Data Mapper is the lower layer that Repository delegates to
- **Metadata Mapping** (306) — prerequisite for the relational strategy inside Repository; enables automatic SQL generation from criteria
- **Registry** (480) — used to locate the appropriate Repository instance (e.g., `Registry.personRepository()`)

### Antipattern Signals [interpretation]

- Repositories that expose `find_by_sql(raw_sql)` — exposes the schema to callers, defeating the abstraction
- Repository methods that return partially loaded objects requiring additional lazy fetches — indicates misaligned aggregate boundaries
- One Repository per database table rather than one per aggregate root — a symptom of treating Repository as a thin DAO wrapper
- Skipping the `InMemoryStrategy` in tests and hitting the real database — the primary value of the swappable strategy is lost

---

*Python examples → `lang/python.md`*

## Model View Controller
> Source: Chapter 14 — Book p. 330 (Fowler, PEAA 2002)

**Category**: Web Presentation
**Intent** *(from book, p. 330)*: "Splits user interface interaction into three distinct roles."

### How It Works
*(from book, p. 330)*

MVC considers three roles. The model is an object that represents some information about the domain — a nonvisual object containing all data and behavior other than that used for the UI. The view represents the display of the model in the UI. The controller takes user input, manipulates the model, and causes the view to update appropriately. UI is a combination of the view and the controller.

The two principal separations MVC enforces are: (1) separating the presentation from the model, and (2) separating the controller from the view. The first is one of the most fundamental principles in software design. The second is less critical and, in practice, most systems have only one controller per view.

Separating presentation from model allows you to develop multiple presentations from the same model code, and to develop them with entirely different libraries. It also means presentation changes can be made freely without altering the model. The model should be entirely unaware of what presentations are used.

In rich-client MVC there will be several presentations of a model on screen at once. When a user changes the model via one presentation, the others need to update — this is typically implemented using Observer (Gang of Four), where the model fires events and presentations are observers that refresh.

### When to Use
*(from book, p. 330)*

- You have any nonvisual logic in your application — the separation of presentation and model is one of the most important design principles in software and should be applied as soon as you get nonvisual logic
- The only time you need not follow it is in very simple systems where the model has no real behavior anyway
- Separation of view and controller is less important and only worth doing when it is really helpful — in rich-client systems this is rarely needed, but it is common in Web front ends where the controller is separated out

### When NOT to Use / Tradeoffs
*(from book + [interpretation])*

- Very simple scripts or procedural pages where there is no domain logic — the overhead of separation adds structure without benefit
- MVC is one of the most misquoted patterns; the "controller" in many web framework contexts is not the same as the MVC controller — Application Controller (379) is a very different thing [interpretation]
- Enforcing view/controller separation without supporting Observer can leave the system inconsistent when there are multiple views of the same model [interpretation]

### Competing Patterns

- **Page Controller** (333) — implements the controller role for a single page in a web context
- **Front Controller** (344) — consolidates all controller logic into one handler rather than per-page controllers
- **Application Controller** (379) — handles navigation flow and screen sequencing; often confused with MVC controller but is a different concern
- **Template View** (350) / **Transform View** (361) — alternative approaches to implementing the view role

### Antipattern Signals [interpretation]

- Domain logic in template files — the model has leaked into the view
- Database queries inside controller functions — the controller is doing model work
- A single class that handles HTTP parsing, business rules, and HTML rendering — no separation at all
- Calling the Application Controller (379) an "MVC controller" — they serve different purposes

---

*Python examples → `lang/python.md`*

## Page Controller
> Source: Chapter 14 — Book p. 333 (Fowler, PEAA 2002)

**Category**: Web Presentation
**Intent** *(from book, p. 333)*: "An object that handles a request for a specific page or action on a Web site."

### How It Works
*(from book, p. 333)*

Page Controller has one input controller for each logical page of the Web site. The controller may be the page itself (as in server page environments like JSP, ASP, PHP) or it may be a separate object that corresponds to that page.

The basic responsibilities of a Page Controller are:
- Decode the URL and extract any form data to figure out all the data for the action
- Create and invoke any model objects to process the data — all relevant data from the HTML request should be passed to the model so model objects need no connection to the HTML request
- Determine which view should display the result page and forward the model information to it

The Page Controller can be structured as a script (CGI script, servlet, etc.) or as a server page (ASP, PHP, JSP, etc.). Using a server page combines the Page Controller with a Template View (350) in the same file. This works well for simple display pages but becomes awkward when the page needs to decide which view to show. A helper object can be used to separate logic from the server page: the server page calls the helper first, and the helper may forward to a different view or return control to the original page.

When many page controllers share behavior (like a `forward` method to dispatch to a view), that common behavior naturally sits on a superclass — a Layer Supertype (475).

### When to Use
*(from book, p. 333)*

- Page Controller works particularly well in sites where most controller logic is simple — most URLs can be handled directly by server pages and only complicated cases need helper classes
- When controller logic is simple, Front Controller (344) adds significant overhead
- It is not uncommon to have some URLs handled by Page Controllers and others by Front Controllers, particularly when refactoring from one to the other — the two patterns mix without too much trouble

### When NOT to Use / Tradeoffs
*(from book + [interpretation])*

- When you have a lot of common cross-cutting logic (security, internationalization, logging) that you want in one place — Front Controller (344) handles this more cleanly
- When Web server configuration is complex and having one entry point would simplify it — Front Controller is better
- Teams that want to add commands dynamically at runtime without redeploying or reconfiguring — Front Controller's dynamic dispatch supports this, Page Controller does not
- [interpretation] Page Controller can lead to duplication across controllers if common logic is not consistently placed on the superclass

### Competing Patterns

- **Front Controller** (344) — the main alternative; consolidates all controller logic in one handler object with a command hierarchy
- **Template View** (350) — Page Controller often delegates rendering to a Template View (JSP, Jinja2 template); the two work naturally together
- **Layer Supertype** (475) — Page Controller superclasses (ActionServlet, HelperController) give common `forward()` and parameter validation logic to all controllers

### Antipattern Signals [interpretation]

- SQL queries scattered through many page controller functions with no model layer — the controller has absorbed the model
- A page controller importing and using `request.session` directly for business logic — session management should be in the model or service layer
- Duplicated authentication checks at the top of every controller — a sign that Front Controller with Intercepting Filter would be better

---

*Python examples → `lang/python.md`*

## Front Controller
> Source: Chapter 14 — Book p. 344 (Fowler, PEAA 2002)

**Category**: Web Presentation
**Intent** *(from book, p. 344)*: "A controller that handles all requests for a Web site."

### How It Works
*(from book, p. 344)*

A Front Controller handles all calls for a Web site and is structured in two parts: a Web handler and a command hierarchy. The Web handler is the object that actually receives HTTP post or get requests from the Web server. It pulls just enough information from the URL and the request to decide what kind of action to initiate and then delegates to a command object to carry out the action.

The Web handler is almost always a class (not a server page) because it produces no response itself. The handler can decide which command to run either statically (conditional logic on URL parsing) or dynamically (taking a standard piece of the URL and using dynamic instantiation to create a command class). Dynamic dispatch allows adding new commands without changing the handler; static dispatch gives compile-time error checking and flexibility in URL structure.

The command objects carry out the specific action for each request. Because new command objects are created per request, there is no need to make command classes thread-safe. Commands can use Intercepting Filter (a decorator chain on the handler) for cross-cutting concerns like authentication, character encoding, and internationalization — configurable at runtime without changing code.

The handler's only responsibility is choosing which command to execute; once done it plays no further part in the request. The command itself chooses which view to use for the response.

### When to Use
*(from book, p. 344)*

- Front Controller is a more complicated design than Page Controller (333) — it needs a few advantages to justify the effort
- Only one Front Controller has to be configured into the Web server — simplifies configuration, especially when the Web server is awkward to configure
- With dynamic commands you can add new commands without changing anything — they also ease porting since you only register the handler in a Web-server-specific way
- When you need runtime-configurable behavior for cross-cutting concerns (authentication, logging, i18n) that would otherwise be duplicated across many Page Controllers
- When you want to avoid the headaches of making the command objects thread-safe — creating new command objects per request avoids shared state

### When NOT to Use / Tradeoffs
*(from book + [interpretation])*

- Front Controller is more complicated than Page Controller (333) — when controller logic is mostly simple, the added infrastructure is not worth it
- Much of the code-deduplication benefit can also be achieved with a superclass on Page Controllers
- Dynamic dispatch (creating command classes by name from the URL) makes it harder to see statically what classes handle what URLs — the indirection can be hard to follow [interpretation]
- [interpretation] Modern web frameworks like FastAPI (with `APIRouter`) and Flask have solved the routing problem more elegantly than either Front Controller or Page Controller — hand-rolling a Front Controller is rarely the right choice

### Competing Patterns

- **Page Controller** (333) — the simpler alternative; one controller per page/action rather than one for the whole site
- **Template View** (350) / **Transform View** (361) — command objects forward to these for rendering the response
- **Special Case** (496) — used for `UnknownCommand` to avoid null-checking when no matching command is found

### Antipattern Signals [interpretation]

- A Front Controller handler that contains business logic — it should only route, not act
- Command classes that are singletons or reused across requests — commands must be per-request to avoid thread-safety issues
- Growing if/elif chains in the handler for static dispatch — convert to a registry or dynamic dispatch

---

*Python examples → `lang/python.md`*

## Template View
> Source: Chapter 14 — Book p. 350 (Fowler, PEAA 2002)

**Category**: Web Presentation
**Intent** *(from book, p. 350)*: "Renders information into HTML by embedding markers in an HTML page."

### How It Works
*(from book, p. 350)*

The basic idea of Template View is to embed markers into a static HTML page. When the page is used to service a request, the markers are replaced by the results of some computation, such as a database query. This way the page can be laid out in the usual manner — often with WYSIWYG editors, often by people who are not programmers. The markers then communicate with real programs to put in the results.

Markers can be HTML-like tags (custom tags that are well-formed XML), or special text markers in the body text (which WYSIWYG editors treat as regular text). Many environments, including JSP, ASP, PHP, and Python template systems, use some form of this approach.

The most popular forms of Template View — server pages (JSP, ASP, PHP) — go further by allowing arbitrary programming logic (scriptlets) to be embedded in the page. The book strongly warns against this: scriptlets eliminate the possibility of nonprogrammers editing the page, make it too easy to mingle layers (domain logic leaking into view), produce poorly structured code, and lead to duplication across server pages.

The key to avoiding scriptlet problems is the **helper object**: a regular object associated with each page that holds all the real programming logic. The page only calls into it, which simplifies the page and makes it a more pure Template View. With a good template system you can often reduce all templates to HTML/XML tags, keeping pages tool-friendly and consistent.

Conditional display in templates should be based on a single boolean property of the helper — not a general-purpose `<IF>` with complex expressions. Iteration should be handled by a focused `<forEach>` or `<repeat>` tag, not a scriptlet loop.

### When to Use
*(from book, p. 350)*

- Template View is the main alternative to Transform View (361) for implementing the view in MVC (330) — the choice mostly depends on what tools and skills the team has
- Template View is easier for most people to do and to learn — it particularly supports graphic designers laying out pages with programmers working on helpers
- It allows composing content by looking at page structure, which is intuitive
- When you don't need Two Step View (365) and your output is straightforwardly page-at-a-time HTML

### When NOT to Use / Tradeoffs
*(from book + [interpretation])*

- Template View is harder to test than Transform View (361) — most implementations are tightly coupled to a running Web server; Transform View implementations are much easier to hook into a test harness
- The common implementations make it too easy to put complicated logic in the page — good discipline is required to keep logic in the helper, not the template
- If you need Two Step View (365) it may be easier to implement that on a Transform View base rather than Template View
- [interpretation] Templates with scriptlets / Jinja2 `{% for %}` blocks containing business logic are a sign the helper discipline has broken down

### Competing Patterns

- **Transform View** (361) — organises rendering around element-by-element transformation (typically XSLT) rather than template markers; easier to test, harder to learn
- **Two Step View** (365) — first stage produces a logical screen structure, second stage renders to HTML; can be built on either Template View or Transform View
- **Page Controller** (333) / **Front Controller** (344) — the controller that populates the helper and forwards to the Template View

### Antipattern Signals [interpretation]

- `{% if obj.price > threshold and obj.category == 'sale' %}` in a template — complex business logic in the view
- Database queries or ORM calls inside a template (`{% for item in Model.objects.all() %}`) — model access from the view layer
- A helper class that is larger than the domain model class it wraps — the helper has grown into a second model
- No helper object at all; raw domain objects passed directly to templates — any change to the domain breaks templates

---

*Python examples → `lang/python.md`*

## Transform View
> Source: Chapter 14 — Book p. 361 (Fowler, PEAA 2002)

**Category**: Web Presentation
**Intent** *(from book, p. 361)*: "A view that processes domain data element by element and transforms it into HTML."

### How It Works
*(from book, p. 361)*

The basic notion of Transform View is writing a program that looks at domain-oriented data and converts it to HTML. The program walks the structure of the domain data and, as it recognises each form of domain data, it writes out the particular piece of HTML for it. The key difference from Template View (350) is in how the view is organised: a Template View is organised around the output; a Transform View is organised around separate transforms for each kind of input element.

A transform is controlled by something like a simple loop that looks at each input element, finds the appropriate transform for that element, and calls the transform on it. A typical Transform View's rules can be arranged in any order without affecting the output.

The dominant implementation is XSLT. To use XSLT, the domain logic must produce XML output (or something transformable to it). If the domain does not naturally produce XML, you must produce the XML yourself — perhaps by populating a Data Transfer Object (401) that serialises to XML, or by having Transaction Scripts (110) return XML directly. The XML is then passed to an XSLT engine which applies a stylesheet to yield HTML, written directly to the HTTP response.

### When to Use
*(from book, p. 361)*

- The choice between Transform View and Template View (350) mostly comes down to what tools the team prefers — there are more and more HTML editors for Template Views, while XSLT tools are far less sophisticated
- Transform View avoids two of the biggest problems with Template View: it is easier to keep all logic out of the view (rendering only HTML), and it is much easier to test and run without a Web server
- XSLT is useful when building a view on an XML document — it fits naturally in an XML-oriented world
- XSLT is portable across almost any web platform — useful when you want to share view logic across J2EE and .NET
- If you need to make global changes to site appearance, Transform View makes it easier to call common transformations, though Two Step View (365) helps even more with global changes

### When NOT to Use / Tradeoffs
*(from book + [interpretation])*

- XSLT can be an awkward language to master because of its functional programming style combined with its awkward XML syntax — when the team doesn't know XSLT this is a steep learning curve
- There are more tools for Template View (350) — WYSIWYG editors, template designers who know HTML but not XSLT
- If you need to change the overall look and feel of many pages easily, Two Step View (365) is even better — Transform View with separate stylesheets per page still requires changes to multiple files
- [interpretation] In modern Python web development XSLT is almost never used; the functional-transform idea survives in template engines and in server-side React/SSR

### Competing Patterns

- **Template View** (350) — the main alternative; organised around the output page structure rather than element-by-element transforms
- **Two Step View** (365) — uses Transform View as its underlying mechanism (two XSLT stylesheets: domain-to-logical-screen, then logical-screen-to-HTML)
- **Data Transfer Object** (401) — often used to assemble the XML document that is the input to the XSLT transform

### Antipattern Signals [interpretation]

- An XSLT stylesheet that queries a database or calls external services — the transform must only render, not fetch
- Putting business calculations inside the XSLT `<xsl:choose>` — logic belongs in the domain model, not the transform
- Using Transform View for a simple CRUD application where Template View is far easier to maintain

---

*Python examples → `lang/python.md`*

## Two Step View
> Source: Chapter 14 — Book p. 365 (Fowler, PEAA 2002)

**Category**: Web Presentation
**Intent** *(from book, p. 365)*: "Turns domain data into HTML in two steps: first by forming some kind of logical page, then rendering the logical page into HTML."

### How It Works
*(from book, p. 365)*

Two Step View deals with the problem of global site appearance changes by splitting the view transformation into two stages. The first stage transforms model data into a logical presentation structure without any specific HTML formatting (a logical screen). The second stage takes that presentation-oriented structure and renders it into HTML.

The intermediate "logical screen" structure is presentation-oriented but not HTML. Its elements include things like fields, headers, footers, tables, choices — things that define the various widgets you can have and the data they contain, but without specifying HTML appearance. Because all formatting decisions are concentrated in the second stage, a global change to the site's look can be made by altering the second stage alone.

Two implementations are shown in the book:

1. **Two-stage XSLT**: The first XSLT stylesheet transforms domain XML into screen-oriented XML (`<screen>`, `<field>`, `<table>`, `<row>`, `<cell>` elements). The second XSLT stylesheet transforms the screen XML into HTML, handling styling and layout globally.

2. **JSP + custom tags**: The first stage is a JSP page with a helper object that exposes domain data. The second stage is implemented as custom tags (`<2step:title>`, `<2step:field>`, `<2step:table>`) that render their content as HTML — the tag implementations are the global second stage.

The key insight is that with N screens and M appearances, a single-stage approach requires N×M view modules; Two Step View requires only N first-stage modules + M second-stage modules.

A drawback: Two Step View forces the site design to be constrained by the presentation-oriented structure. A design-heavy site where each page is supposed to look very different won't work well, because it's hard to find enough commonality between screens for a single presentation-oriented structure to serve all of them.

### When to Use
*(from book, p. 365)*

- When you have a Web application with many pages and want a consistent look and organisation throughout the site — a single second-stage change affects the whole site
- When you have a multiappearance application — the same functionality fronted by multiple organisations with different visual designs — Two Step View gives you N first stages and M second stages instead of N×M view modules
- When global changes to site appearance must be easy — Two Step View makes this straightforward since all formatting is in the second stage

### When NOT to Use / Tradeoffs
*(from book + [interpretation])*

- Design-heavy sites where each page is supposed to look different — hard to define a common enough presentation-oriented structure
- Two Step View requires programmers to be involved in any design change (to write second-stage renderer/tag code) — there are a lot of tools for designers to lay out pages using Template View (350), but not for Two Step View
- Two Step View presents a harder programming model to learn — multiple layers of transformation to understand before any output appears
- [interpretation] In modern CSS-based web design, global styling is handled by stylesheets + component libraries (Bootstrap, Tailwind) rather than server-side second-stage renderers — Two Step View is rarely needed today

### Competing Patterns

- **Template View** (350) — simpler alternative; N view modules for N screens, but global changes require editing each module
- **Transform View** (361) — the underlying mechanism for the XSLT-based Two Step View implementation
- **Front Controller** (344) / **Page Controller** (333) — the input controllers that drive the first stage

### Antipattern Signals [interpretation]

- A second-stage renderer that knows about specific domain objects — the second stage must only understand the logical screen structure
- First-stage modules that produce raw HTML — the whole point is that HTML belongs to the second stage only
- Using Two Step View on a simple CRUD app with one or two views — Template View with a base template achieves the same global-change benefit with far less complexity

---

*Python examples → `lang/python.md`*

## Application Controller
> Source: Chapter 14 — Book p. 379 (Fowler, PEAA 2002)

**Category**: Web Presentation
**Intent** *(from book, p. 379)*: "A centralized point for handling screen navigation and the flow of an application."

### How It Works
*(from book, p. 379)*

An Application Controller has two main responsibilities: deciding which domain logic to run and deciding the view to use for displaying the response. To do this it holds two structured collections of class references — one for domain commands to execute against the domain layer and one of views.

The Application Controller is separate from the input controller (Page Controller or Front Controller). The input controller receives the HTTP request, asks the Application Controller for the appropriate domain command, runs the command, then asks the Application Controller for the appropriate view. The Application Controller returns what to execute and what to display based on the current application state, not just the raw request.

A common way to think about a UI is as a state machine: certain events trigger different responses depending on the state of certain key objects. The Application Controller is particularly amenable to representing this state machine's control flow using metadata — either programmed as language calls or stored in a configuration file. This allows the flow logic to be changed without touching input controllers or domain logic.

The book recommends the Application Controller have no links to UI machinery — it should be testable independently of the HTTP environment. Keeping it free of UI dependencies also allows the same Application Controller to be reused across multiple presentations.

Application logic (knowing which screen to show next, or whether a particular workflow step applies) is distinct from domain logic (what counts as a "damaged" asset). The boundary can be murky but the book recommends pushing clear domain logic into Domain Model (116) if it occurs in many places.

### When to Use
*(from book, p. 379)*

- When there are definite rules about the order in which screens should be visited, or different views depending on the state of objects — wizard-style flows, conditional branching, role-based screen sequences
- When you find yourself making similar changes to flow logic in many different controllers when the application's flow changes — that duplication is the signal
- When the flow and navigation are simple and users can visit any screen in any order, there is little value in an Application Controller

### When NOT to Use / Tradeoffs
*(from book + [interpretation])*

- Simple CRUD applications where any screen can be reached in any order — the Application Controller adds machinery without benefit
- The boundary between application logic and domain logic is murky — if the Application Controller accumulates domain logic, it becomes a second model, which is wrong
- [interpretation] Web frameworks with URL dispatchers (FastAPI `APIRouter`, Flask) handle simple routing cleanly without an Application Controller; the pattern is most valuable for multi-step workflows (checkout, wizard forms, onboarding flows)
- [interpretation] If business rules frequently change which view follows which action, consider whether a workflow engine or state machine library is more appropriate than a hand-rolled Application Controller

### Competing Patterns

- **Front Controller** (344) — the input controller that delegates to Application Controller; often used together
- **Page Controller** (333) — alternative input controller; can also delegate to Application Controller
- **Transaction Script** (110) — domain commands managed by Application Controller may be Transaction Scripts
- **Domain Model** (116) — clear domain logic belongs here, not in the Application Controller

### Antipattern Signals [interpretation]

- Application Controller that queries the database directly — it should only route, delegating actual domain work to domain commands
- Application Controller that contains business rules ("a damaged on-lease asset costs the lessee $X") — that belongs in Domain Model
- Input controllers that have large if/else blocks deciding which view to show depending on application state — that logic should be extracted into an Application Controller

---

*Python examples → `lang/python.md`*

## Remote Facade
> Source: Chapter 15 — Book p. 388 (Fowler, PEAA 2002)

**Category**: Distribution
**Intent** *(from book, p. 388)*: "Provides a coarse-grained facade on fine-grained objects to improve efficiency over a network."

### How It Works
*(from book, p. 388)*

Remote Facade is a coarse-grained facade (Gang of Four) over a web of fine-grained objects. None of the fine-grained objects have a remote interface and the Remote Facade contains no domain logic. All the Remote Facade does is translate coarse-grained methods onto the underlying fine-grained objects.

Within a single address space, fine-grained interaction works well. But remote calls are orders of magnitude more expensive than in-process calls because data may need to be marshalled, security checked, and packets routed through switches. Any object intended to be used remotely needs a coarse-grained interface that minimises the number of calls needed to get something done.

In a simple case, like an address object, a Remote Facade replaces all the individual getters and setters of the regular address object with one bulk getter and one bulk setter. When a client calls `getAddressData`, the facade reads data from the address object's individual accessors. When it calls `setAddressData`, it calls the individual setters. All logic of validation and computation stays in the address object where it can be factored cleanly.

In a more complex case a single Remote Facade may act as a remote gateway for many fine-grained objects — for example, an order facade that gets and updates information for an order, all its order lines, and some customer data as well.

If the fine-grained classes are present on both sides of the connection and are serialisable, you can transfer them directly. Otherwise use a Data Transfer Object (401) as the basis of the transfer to avoid duplicating the domain classes on both sides.

A Remote Facade can be stateful or stateless. A stateless Remote Facade can be pooled, which can improve resource usage and efficiency. A stateful Remote Facade in a B2C scenario needs to store state somewhere using Client Session State (456) or Database Session State (462), or an implementation of Server Session State (458).

### When to Use
*(from book, p. 388)*

- Whenever you need remote access to a fine-grained object model — you gain the advantage of a coarse-grained interface while still keeping fine-grained objects for internal use
- The most common use is between a presentation and a Domain Model (116) where the two may run on different processes
- Do not use when all access is within a single process — the cost of converting to coarse-grained methods is not needed
- Do not use with Transaction Script (110) as a rule — Transaction Script is inherently coarser grained and a facade over it adds nothing
- Remote Facade implies a synchronous (RPC-style) distribution — for asynchronous, message-based distribution the pattern is less applicable

### When NOT to Use / Tradeoffs
*(from book + [interpretation])*

- Do not put domain logic in the facade — it is a packaging mechanism only; any logic in it leads to duplicated business rules
- A Remote Facade can lead to many methods even on a small application — for even a moderate-sized app there may be only one facade and it may have many methods
- Granularity decisions are tricky: if the facade methods are too fine-grained you lose the performance benefit; if they are too coarse-grained you end up with awkward bulk parameters that are hard to use
- [interpretation] In modern microservices architectures the Remote Facade is the REST/gRPC API layer — the advice to keep it thin and logic-free is even more important

### Competing Patterns

- **Data Transfer Object** (401) — used as the transfer format when fine-grained classes cannot be shared across the process boundary
- **Service Layer** (133) — the main difference is that a Service Layer does not have to be remote and therefore does not need only coarse-grained methods; a Service Layer may be layered under a Remote Facade
- **Client Session State** (456) / **Server Session State** (458) / **Database Session State** (462) — used when the Remote Facade must maintain state across calls

### Antipattern Signals [interpretation]

- Business logic inside a REST endpoint function — the facade has absorbed domain logic
- A facade method that accesses the database directly instead of delegating to domain objects — violates layering
- Exposing all domain model fields through every facade method — the facade should expose only what each client actually needs
- Treating the Remote Facade as a Session Facade (J2EE anti-pattern) by embedding workflow logic — that belongs in Service Layer or Application Controller

---

*Python examples → `lang/python.md`*

## Data Transfer Object
> Source: Chapter 15 — Book p. 401 (Fowler, PEAA 2002)

**Category**: Distribution
**Intent** *(from book, p. 401)*: "An object that carries data between processes in order to reduce the number of method calls."

### How It Works
*(from book, p. 401)*

A Data Transfer Object (DTO) is in many ways one of those objects you're told never to write — it is little more than a bunch of fields and the getters and setters for them. Its value is that it can move several pieces of information over a network in a single call, which is essential for distributed systems.

Whenever a remote object needs some data it asks for a suitable DTO. The DTO will usually carry more data than the remote object requested, but it should carry all the data the remote object will need for a while — due to remote call latency it is better to err on the side of sending too much data than to make multiple calls.

A single DTO usually contains data from more than just a single server object — it aggregates from all server objects that the remote object needs data from. The structure should be a simple graph (normally a hierarchy) rather than the complex web structure of a Domain Model (116). Fields should be primitives, simple classes like strings and dates, or other DTOs.

**Assembler**: A Data Transfer Object should not know about how to connect with domain objects — it should be deployable on both sides of the connection. A separate assembler object is responsible for creating a DTO from domain objects and for updating the domain objects from a received DTO. The assembler is an example of Mapper (473).

**Serialisation**: The DTO is also usually responsible for serialising itself into some format that will go over the wire. Options include:
- Binary serialisation (Java native or Python `pickle`) — automatic but fragile; any class change breaks the wire protocol
- XML serialisation — more robust to field additions, more verbose
- Dictionary/JSON serialisation — a more tolerant binary approach; extra fields on the server are simply ignored by old clients
- Reflective serialisation (write `write_map_reflect()` on a Layer Supertype) — avoids writing serialisation for every DTO class

### When to Use
*(from book, p. 401)*

- Whenever you need to transfer multiple items of data between two processes in a single method call
- When communicating between components using XML — the XML DOM is painful to manipulate directly; a DTO encapsulates it cleanly
- When you want to use an interface both synchronously and asynchronously — return a DTO and connect a Lazy Load (200) to it for the async path
- A common form for DTO is Record Set (508) — that is, a tabular set of records directly from a SQL query, passed as-is across layers (particularly useful with Table Module (125))

### When NOT to Use / Tradeoffs
*(from book + [interpretation])*

- Binary serialisation (pickle, Java native) introduces fragility — any change to the DTO class breaks all clients; prefer JSON/XML for external interfaces
- A DTO class must be present on both sides of the wire — if clients are in different languages, the DTO must be defined twice and kept in sync
- Design DTOs around the needs of a particular client, not around the domain model — a DTO shaped like the domain model is harder for clients to use
- [interpretation] In modern REST APIs the DTO is the JSON response body; Pydantic models in FastAPI or DRF serializers are DTOs — the discipline of keeping business logic out of them is the same rule

### Competing Patterns

- **Remote Facade** (388) — the Remote Facade calls the assembler to produce the DTO; DTO is the transfer format, Remote Facade is the remote interface
- **Mapper** (473) / Assembler — the assembly code that maps between domain objects and DTOs; kept separate to preserve independence
- **Record Set** (508) — a tabular DTO variant; appropriate with Table Module (125) rather than Domain Model (116)
- **Value Object** (486) — a different pattern entirely (Fowler's definition); the Sun/J2EE community misuses the term "Value Object" for what Fowler calls DTO

### Antipattern Signals [interpretation]

- Business logic inside a DTO class — DTOs should only hold data and serialise/deserialise; all computation belongs in the domain
- A DTO that mirrors the domain model 1:1 — DTOs should be shaped around client needs, collapsing structure where clients don't need it
- A DTO that holds references to live domain objects — it should hold primitive copies, not live object references
- Skipping the assembler and having the Remote Facade directly populate DTO fields — couples the remote interface to domain internals

---

*Python examples → `lang/python.md`*

## Optimistic Offline Lock
> Source: Chapter 16 — Book p. 416 (Fowler, PEAA 2002)

**Category**: Offline Concurrency
**Intent** *(from book, p. 416)*: "Prevents conflicts between concurrent business transactions by detecting a conflict and rolling back the transaction."

**When to Use** *(from book, p. 418)*: Use when the chance of conflict between concurrent business transactions is low. When conflicts are likely, Pessimistic Offline Lock (p. 426) is a better choice. Optimistic and Pessimistic locking are complementary and can be used together — optimistic as the default, pessimistic for specific high-contention resources.

**When NOT to Use**:
- When business transactions are long-running and users are likely to edit the same data — version conflicts become frequent and user experience suffers `[interpretation]`
- When the cost of a conflict (retrying a long workflow) is unacceptable — the "detect and roll back" approach is cold comfort after 30 minutes of work is lost `[interpretation]`
- When you need to prevent the "inconsistent read" problem without extra infrastructure — base optimistic locking only checks versions on write; you need `registerRead()` on Unit of Work to guard reads too `[interpretation]`

**Structure / Code** *(adapted from book pp. 416–425, Java → Python)*:

```python
# domain base (book p. 416 — every persistent entity carries version metadata)
from dataclasses import dataclass, field
from datetime import datetime

@dataclass
class DomainObject:
    id: int = 0
    version: int = 0
    modified_by: str = ""
    modified: datetime = field(default_factory=datetime.utcnow)

    def set_system_fields(self, modified: datetime, modified_by: str, version: int) -> None:
        self.modified = modified
        self.modified_by = modified_by
        self.version = version


class ConcurrencyError(Exception):
    pass


# abstract mapper (book p. 418 — version loaded during find, checked during update/delete)
class AbstractMapper:
    def _load_system_fields(self, row, obj: DomainObject) -> None:
        """Set version metadata after SELECT — the version is stored in session state."""
        obj.set_system_fields(
            modified=row["modified"],
            modified_by=row["modified_by"],
            version=row["version"],
        )

    def update(self, obj: DomainObject, conn) -> None:
        cursor = conn.cursor()
        # WHERE clause includes version — UPDATE succeeds only if no one changed the row
        cursor.execute(
            """
            UPDATE customer
               SET name = ?, modified = ?, modified_by = ?, version = ?
             WHERE id = ? AND version = ?
            """,
            (obj.name, datetime.utcnow(), "current_user",
             obj.version + 1, obj.id, obj.version),
        )
        if cursor.rowcount == 0:
            self._throw_concurrency_exception(obj, conn)
        obj.version += 1  # keep in-memory copy consistent

    def delete(self, obj: DomainObject, conn) -> None:
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM customer WHERE id = ? AND version = ?",
            (obj.id, obj.version),
        )
        if cursor.rowcount == 0:
            self._throw_concurrency_exception(obj, conn)

    def _throw_concurrency_exception(self, obj: DomainObject, conn) -> None:
        """Re-query current state to produce a human-readable conflict message (book p. 420)."""
        cursor = conn.cursor()
        cursor.execute(
            "SELECT version, modified_by, modified FROM customer WHERE id = ?",
            (obj.id,),
        )
        row = cursor.fetchone()
        if row:
            raise ConcurrencyError(
                f"customer {obj.id} modified by {row['modified_by']} "
                f"at {row['modified']} (their version: {row['version']}, "
                f"your version: {obj.version})"
            )
        raise ConcurrencyError(f"customer {obj.id} was deleted by another session")


# unit of work — guards against inconsistent reads (book p. 420)
class UnitOfWork:
    def __init__(self):
        self._dirty: list[DomainObject] = []
        self._reads: list[DomainObject] = []

    def register_dirty(self, obj: DomainObject) -> None:
        self._dirty.append(obj)

    def register_read(self, obj: DomainObject) -> None:
        """Record objects read during the business transaction for consistency check."""
        self._reads.append(obj)

    def commit(self, conn) -> None:
        self._check_consistent_reads(conn)
        for obj in self._dirty:
            AbstractMapper().update(obj, conn)
        conn.commit()

    def _check_consistent_reads(self, conn) -> None:
        """Increment version of every read object — if any changed, UPDATE fails (book p. 421).
        This must run within the same system transaction as the business commit."""
        cursor = conn.cursor()
        for obj in self._reads:
            cursor.execute(
                "UPDATE customer SET version = version WHERE id = ? AND version = ?",
                (obj.id, obj.version),
            )
            if cursor.rowcount == 0:
                raise ConcurrencyError(
                    f"Inconsistent read: customer {obj.id} changed since it was loaded"
                )
```

**Key Points**:
- The version column is incremented on every successful write; a `WHERE id = ? AND version = ?` that matches zero rows means a concurrent session won the race (book p. 417)
- Storing `modified_by` and `modified` alongside the version enables human-readable conflict messages rather than opaque "stale data" errors (book p. 419)
- To guard against *inconsistent reads* (session A reads data, session B writes it, session A uses stale data without ever writing) — register all read objects on the Unit of Work and do a no-op UPDATE touch at commit time (book p. 420)
- The alternative to a version column is including all data fields in the WHERE clause; this works but complicates SQL and may cause spurious conflicts on non-conflicting changes (book p. 417) `[interpretation]`
- `[interpretation]` SQLAlchemy ORM's `.with_for_update()` and version columns can implement both approaches; SQLAlchemy provides `__version_id_col__` on mapped classes for automatic version management

---

*Python examples → `lang/python.md`*

## Pessimistic Offline Lock
> Source: Chapter 16 — Book p. 426 (Fowler, PEAA 2002)

**Category**: Offline Concurrency
**Intent** *(from book, p. 426)*: "Prevents conflicts between concurrent business transactions by allowing only one business transaction at a time to access data."

**When to Use** *(from book, p. 428)*: Use when the chance of conflict is high, or when the cost of a conflict — rolling back a long business transaction — is unacceptable. Use it selectively: apply pessimistic locking to resources with high contention and optimistic locking elsewhere. Pessimistic Offline Lock complements, rather than replaces, Optimistic Offline Lock.

**When NOT to Use**:
- When contention is low — the overhead of a lock table and acquire/release protocol adds complexity with little benefit `[interpretation]`
- When business transactions are very long — the lock holder can become a bottleneck; a crashed or disconnected client can leave stale locks until timeout `[interpretation]`
- When the system spans multiple servers without a shared lock store — the lock table requires a single, shared database or distributed coordination service `[interpretation]`

**Structure / Code** *(adapted from book pp. 426–437, Java → Python)*:

```python
# lock table SQL (book p. 432):
# CREATE TABLE system_lock (
#     lockable_id  BIGINT PRIMARY KEY,
#     owner_id     BIGINT NOT NULL
# );
#
# PRIMARY KEY on lockable_id enforces mutual exclusion — INSERT fails if lock is held.

import threading
from contextlib import contextmanager

class ConcurrencyError(Exception):
    pass


# --- Lock manager (book p. 431 — ExclusiveReadLockManager interface → Python) ---

class ExclusiveWriteLockManager:
    """Simplest lock type: one writer at a time, no concurrent readers (book p. 429)."""

    def acquire_lock(self, lockable_id: int, owner_id: int, conn) -> None:
        cursor = conn.cursor()
        try:
            cursor.execute(
                "INSERT INTO system_lock (lockable_id, owner_id) VALUES (?, ?)",
                (lockable_id, owner_id),
            )
            conn.commit()
        except Exception:
            # unique-constraint violation — someone else holds the lock
            cursor.execute(
                "SELECT owner_id FROM system_lock WHERE lockable_id = ?",
                (lockable_id,),
            )
            row = cursor.fetchone()
            holder = row["owner_id"] if row else "unknown"
            raise ConcurrencyError(
                f"Cannot acquire lock on {lockable_id}: held by session {holder}"
            )

    def release_lock(self, lockable_id: int, owner_id: int, conn) -> None:
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM system_lock WHERE lockable_id = ? AND owner_id = ?",
            (lockable_id, owner_id),
        )
        conn.commit()

    def release_all_locks(self, owner_id: int, conn) -> None:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM system_lock WHERE owner_id = ?", (owner_id,))
        conn.commit()


# --- Session / owner tracking (book p. 433 — AppSession via ThreadLocal → Python) ---

_session_local = threading.local()

class AppSession:
    def __init__(self, session_id: int):
        self.session_id = session_id
        self._lock_manager = ExclusiveWriteLockManager()

    @staticmethod
    def get_current() -> "AppSession":
        return _session_local.session

    @staticmethod
    def set_current(session: "AppSession") -> None:
        _session_local.session = session


# --- Business transaction commands (book pp. 434–436) ---

class BusinessTransactionCommand:
    """Base class; subclasses acquire locks then forward or save."""
    pass


class EditCustomerCommand(BusinessTransactionCommand):
    """Acquires lock before presenting edit form (book p. 434)."""

    def process(self, customer_id: int, conn) -> str:
        session = AppSession.get_current()
        lock_mgr = ExclusiveWriteLockManager()
        lock_mgr.acquire_lock(customer_id, session.session_id, conn)
        # forward to edit view — lock is held until save or cancel
        return f"/customer/edit/{customer_id}"


class SaveCustomerCommand(BusinessTransactionCommand):
    """Saves changes and releases lock (book p. 435)."""

    def process(self, customer_id: int, new_name: str, conn) -> str:
        session = AppSession.get_current()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE customer SET name = ? WHERE id = ?",
            (new_name, customer_id),
        )
        conn.commit()
        lock_mgr = ExclusiveWriteLockManager()
        lock_mgr.release_lock(customer_id, session.session_id, conn)
        return "/customer/list"


# --- Lock types summary (book pp. 428–430) ---
# 1. Exclusive write lock: one writer, no readers → simplest, lowest concurrency
# 2. Exclusive read lock: readers acquire a shared lock; writer waits for all readers → better
# 3. Read/write lock: readers share a read lock; writer acquires exclusive write lock →
#    most complex, best concurrency; read locks do NOT conflict with each other
```

**Key Points**:
- The lock table's PRIMARY KEY on `lockable_id` uses the database's own uniqueness guarantee to enforce mutual exclusion — no application-level compare-and-set needed (book p. 432)
- Lock timeouts are essential: when a client crashes mid-transaction the lock must expire automatically; a background job or lock manager daemon should sweep stale locks (book p. 430) `[interpretation]`
- Three lock types in increasing complexity and concurrency: exclusive write lock → exclusive read lock → read/write lock. Most applications start with exclusive write locks and add read locks only when read concurrency becomes a bottleneck (book pp. 428–430)
- `release_all_locks()` on session end or timeout is critical — a session that never releases locks starves other users (book p. 433)
- `[interpretation]` In SQLAlchemy (used with FastAPI), `.with_for_update()` provides database-level row locking within a single request; for multi-request business transactions spanning HTTP calls a separate lock table (as above) is still needed

---

*Python examples → `lang/python.md`*

## Coarse-Grained Lock
> Source: Chapter 16 — Book p. 438 (Fowler, PEAA 2002)

**Category**: Offline Concurrency
**Intent** *(from book, p. 438)*: "Locks a set of related objects with a single lock."

**When to Use** *(from book, p. 440)*: Use when you need to lock an aggregate of objects (such as a Customer and all its Addresses) and locking each object individually would be too coarse-grained in coordination overhead or too fine-grained to enforce. Use when the objects in an aggregate must be locked as a unit to prevent partial updates.

**When NOT to Use**:
- When the aggregate is large and reads are frequent — a single shared version object becomes a hot row that serialises otherwise independent transactions `[interpretation]`
- When objects in the aggregate are also updated independently by other business transactions that don't know about the aggregate boundary — shared locks can conflict unexpectedly `[interpretation]`

**Structure / Code** *(adapted from book pp. 438–448, Java → Python)*:

```python
# Two implementation strategies from the book:
# 1. Shared Version Object (Optimistic) — all objects in aggregate share one Version row
# 2. Root Lock (Pessimistic) — lock the root of the aggregate; children are implicitly locked

from dataclasses import dataclass, field
from datetime import datetime


class ConcurrencyError(Exception):
    pass


# --- Strategy 1: Shared Optimistic Version object (book pp. 441–444) ---

@dataclass
class Version:
    """A single version row shared by all members of an aggregate (book p. 441)."""
    id: int
    value: int

    def increment(self, conn) -> None:
        """Increment the shared version — fails if another session already did so."""
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE version SET value = value + 1 WHERE id = ? AND value = ?",
            (self.id, self.value),
        )
        if cursor.rowcount == 0:
            raise ConcurrencyError(
                f"Aggregate version {self.id} changed by another session"
            )
        self.value += 1

    def insert(self, conn) -> None:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO version (id, value) VALUES (?, ?)", (self.id, self.value)
        )

    @classmethod
    def create(cls, conn) -> "Version":
        cursor = conn.cursor()
        cursor.execute("INSERT INTO version (value) VALUES (0)")
        return cls(id=cursor.lastrowid, value=0)


@dataclass
class DomainObject:
    id: int = 0
    version: "Version | None" = field(default=None, repr=False)


@dataclass
class Address(DomainObject):
    street: str = ""

    @classmethod
    def create(cls, street: str, shared_version: Version, conn) -> "Address":
        """Address is created with the same Version as its Customer (book p. 444)."""
        addr = cls(street=street, version=shared_version)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO address (street, version_id) VALUES (?, ?)",
            (addr.street, shared_version.id),
        )
        addr.id = cursor.lastrowid
        return addr


@dataclass
class Customer(DomainObject):
    name: str = ""
    addresses: list = field(default_factory=list)

    def add_address(self, street: str, conn) -> Address:
        """Shares the customer's version with the new address (book p. 444)."""
        addr = Address.create(street, self.version, conn)
        self.addresses.append(addr)
        return addr


# --- AbstractMapper using shared version (book p. 443) ---

class CustomerMapper:
    def insert(self, customer: Customer, conn) -> None:
        customer.version = Version.create(conn)  # one version row for the whole aggregate
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO customer (name, version_id) VALUES (?, ?)",
            (customer.name, customer.version.id),
        )
        customer.id = cursor.lastrowid

    def update(self, customer: Customer, conn) -> None:
        customer.version.increment(conn)  # one increment guards entire aggregate
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE customer SET name = ? WHERE id = ?",
            (customer.name, customer.id),
        )

    def delete(self, customer: Customer, conn) -> None:
        # Delete children first, then root, then version (book p. 444)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM address WHERE customer_id = ?", (customer.id,))
        cursor.execute("DELETE FROM customer WHERE id = ?", (customer.id,))
        cursor.execute("DELETE FROM version WHERE id = ?", (customer.version.id,))
        # Note: incrementing the version before deletion verifies no concurrent change
        # customer.version.increment(conn) -- optional guard before delete


# --- Strategy 2: Root Lock (Pessimistic) (book p. 445) ---
# Lock only the root of the aggregate; the lock manager infers children are locked.

class RootLockManager:
    """Acquiring a lock on the root implicitly locks all children (book p. 445)."""

    def acquire_lock(self, root_id: int, owner_id: int, conn) -> None:
        cursor = conn.cursor()
        try:
            cursor.execute(
                "INSERT INTO system_lock (lockable_id, owner_id) VALUES (?, ?)",
                (root_id, owner_id),
            )
            conn.commit()
        except Exception:
            raise ConcurrencyError(f"Root {root_id} is locked by another session")

    def release_lock(self, root_id: int, owner_id: int, conn) -> None:
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM system_lock WHERE lockable_id = ? AND owner_id = ?",
            (root_id, owner_id),
        )
        conn.commit()
```

**Key Points**:
- The shared Version object solves the problem that locking individual child objects still allows another session to change *a different child* of the same aggregate — the shared row ensures any change to any member bumps the same version (book p. 441)
- The Version row is separate from the domain table so it can be shared by Customer, Address, and any other member type without duplicating the version column (book p. 441)
- For the root-lock (pessimistic) approach, only the root object's ID appears in the lock table; code that loads children must always load through the root first, so children are implicitly protected (book p. 445) `[interpretation]`
- `[interpretation]` In SQLAlchemy (used with FastAPI), use `.with_for_update()` on the root query and always retrieve children via the `root.children` relationship inside the same `AsyncSession` — the database row lock on the root implicitly serializes access to its children

---

*Python examples → `lang/python.md`*

## Implicit Lock
> Source: Chapter 16 — Book p. 449 (Fowler, PEAA 2002)

**Category**: Offline Concurrency
**Intent** *(from book, p. 449)*: "Allows framework or layer supertype code to acquire offline locks."

**When to Use** *(from book, p. 451)*: "Implicit Lock should be used in all but the simplest of applications that have no concept of framework. The risk of a single forgotten lock is too great." Use whenever your system uses Optimistic Offline Lock (p. 416) or Pessimistic Offline Lock (p. 426) — centralising lock acquisition in the framework prevents any single code path from accidentally bypassing the scheme.

**When NOT to Use**:
- In simple scripts or single-user applications with no concurrent sessions — the framework overhead is not worth it `[interpretation]`
- When you have full confidence that all access paths go through a single well-tested gateway and developer discipline is sufficient `[interpretation]`

**Structure / Code** *(adapted from book pp. 449–455, Java → Python)*:

```python
# The key insight: lock acquisition must be invisible to business transaction code.
# Use the Decorator pattern on the mapper so every find() automatically acquires a lock.
# (book p. 452 — LockingMapper wraps any Mapper implementation)

from abc import ABC, abstractmethod


class DomainObject:
    def __init__(self, object_id: int):
        self.id = object_id


class Mapper(ABC):
    @abstractmethod
    def find(self, object_id: int) -> DomainObject: ...
    @abstractmethod
    def insert(self, obj: DomainObject) -> None: ...
    @abstractmethod
    def update(self, obj: DomainObject) -> None: ...
    @abstractmethod
    def delete(self, obj: DomainObject) -> None: ...


class ExclusiveReadLockManager:
    """Singleton lock manager — acquires lock before allowing find (book p. 452)."""
    _instance: "ExclusiveReadLockManager | None" = None

    @classmethod
    def get_instance(cls) -> "ExclusiveReadLockManager":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def acquire_lock(self, object_id: int, session_id: int, conn=None) -> None:
        # insert into lock table; unique constraint raises on conflict
        pass

    def release_all_locks(self, session_id: int, conn=None) -> None:
        pass


class AppSessionManager:
    """Thread-local session tracking (book p. 433)."""
    import threading
    _local = __import__("threading").local()

    @classmethod
    def get_session_id(cls) -> int:
        return getattr(cls._local, "session_id", 0)


class LockingMapper(Mapper):
    """Decorator that acquires a lock before delegating to the real mapper (book p. 452)."""

    def __init__(self, impl: Mapper):
        self._impl = impl

    def find(self, object_id: int) -> DomainObject:
        # Acquire lock BEFORE loading — business transaction code never sees this
        ExclusiveReadLockManager.get_instance().acquire_lock(
            object_id, AppSessionManager.get_session_id()
        )
        return self._impl.find(object_id)

    def insert(self, obj: DomainObject) -> None:
        self._impl.insert(obj)

    def update(self, obj: DomainObject) -> None:
        self._impl.update(obj)

    def delete(self, obj: DomainObject) -> None:
        self._impl.delete(obj)


class LockingMapperRegistry:
    """Registry that wraps every mapper with a LockingMapper on registration (book p. 453).
    Business transaction code calls getMapper() and never knows locks are acquired."""

    def __init__(self):
        self._mappers: dict[type, Mapper] = {}

    def register_mapper(self, cls: type, mapper: Mapper) -> None:
        self._mappers[cls] = LockingMapper(mapper)

    def get_mapper(self, cls: type) -> Mapper:
        return self._mappers[cls]


# Sequence (book Figure 16.5):
# EditCustomerTransaction → LockingMapper.find(id) → lock_manager.acquire_lock()
#                                                    → CustomerMapper.find(id)
#                         ← customer object returned (lock is already held)
```

**Key Points**:
- Forgetting to acquire a lock anywhere that an object is otherwise locked renders the entire locking scheme useless; even one unguarded code path breaks the guarantee (book p. 450)
- The Decorator pattern (LockingMapper wrapping any Mapper) makes lock acquisition structural — there is no code path that can "forget" because the mapper is always wrapped (book p. 452)
- The lock manager must check whether the session already holds a lock before re-acquiring — since objects are frequently loaded more than once in a business transaction (book p. 452)
- For exclusive write locking, the decorator checks for a pre-existing lock on update/delete rather than acquiring a new one at find time — the lock was already acquired when the object was first loaded (book p. 453)
- `[interpretation]` In SQLAlchemy (used with FastAPI), this pattern maps to a custom `Session` subclass or event listener on `after_bulk_update` that wraps results in a lock acquisition

---

*Python examples → `lang/python.md`*

## Client Session State
> Source: Chapter 17 — Book p. 456 (Fowler, PEAA 2002)

**Category**: Session State
**Intent** *(from book, p. 456)*: "Stores session state on the client."

**When to Use** *(from book, p. 456)*: Use when the server must be stateless for clustering and failover resilience. The pattern works well for small amounts of data. Arguments against it grow exponentially with the amount of data — with large amounts the transfer cost on every request becomes prohibitive. Also consider it when you almost always need Client Session State at minimum for the session identifier.

**When NOT to Use**:
- When the session data is large — URL parameters have size limits; hidden fields and cookies balloon request/response size `[interpretation]`
- When security is critical — any data sent to the client can be seen and tampered with; encryption is required but adds CPU cost on every request `[interpretation]`
- When the site has static or legacy pages that don't carry state forward — navigating to them drops all session data `[interpretation]`

**Structure / Code** *(adapted from book pp. 456–457, discussion → Python)*:

```python
# Three mechanisms for client session state storage (book p. 456):
# 1. URL parameters  — simple, limited size, problems with bookmarks
# 2. Hidden fields   — serialize state into <INPUT type="hidden"> on every response
# 3. Cookies         — automatic, but users can disable them; limited to one domain

# Example: hidden-field approach with a DTO (book p. 456 recommends Data Transfer Object)
import json
import base64
from dataclasses import dataclass, asdict


@dataclass
class WizardSessionState:
    """State carried across a multi-step wizard entirely on the client."""
    step: int = 1
    customer_name: str = ""
    order_ids: list = None

    def __post_init__(self):
        if self.order_ids is None:
            self.order_ids = []

    def to_hidden_field(self) -> str:
        """Serialize to a base64 string suitable for an HTML hidden input."""
        payload = json.dumps(asdict(self))
        return base64.urlsafe_b64encode(payload.encode()).decode()

    @classmethod
    def from_hidden_field(cls, encoded: str) -> "WizardSessionState":
        payload = base64.urlsafe_b64decode(encoded.encode()).decode()
        return cls(**json.loads(payload))


# In a view/handler (Flask-style pseudocode):
def step2_handler(request):
    state = WizardSessionState.from_hidden_field(request.form["session_state"])
    state.step = 2
    state.customer_name = request.form["name"]
    return render_template(
        "step2.html",
        session_state=state.to_hidden_field(),  # round-tripped in every response
    )

# Cookie approach — platform serialises automatically (book p. 457)
# response.set_cookie("session_state", state.to_hidden_field(), httponly=True)
# state = WizardSessionState.from_hidden_field(request.cookies["session_state"])
```

**Key Points**:
- The three mechanisms — URL parameters, hidden fields, cookies — all have the same security property: data on the client is visible to the client; encryption is the only protection (book p. 457)
- Use Data Transfer Object (p. 401) to carry complex session state; it can serialise itself cleanly over the wire (book p. 456)
- Session identification (at minimum one session ID number) almost always uses Client Session State regardless of where the rest of state lives (book p. 457)
- Cookies work only within a single domain name (book p. 457)
- `[interpretation]` Modern HTTP-only, SameSite cookies with HMAC signing (e.g., Flask's signed cookie session) are the standard implementation; JWTs carry domain state in a signed token using the same principle

---

*Python examples → `lang/python.md`*

## Server Session State
> Source: Chapter 17 — Book p. 458 (Fowler, PEAA 2002)

**Category**: Session State
**Intent** *(from book, p. 458)*: "Keeps the session state on a server system in a serialized form."

**When to Use** *(from book, p. 460)*: The great appeal of Server Session State is its simplicity — in many cases no programming at all is needed. Use it when your platform's built-in session support handles the persistence and clustering for you. Serialising a Serialized LOB (p. 272) to a database session table is often much less effort than converting server objects to tabular form. Avoid it when programming effort for clustering/failover support would be high.

**When NOT to Use**:
- When the application server fails — in-memory state is lost unless passivation to shared storage is implemented `[interpretation]`
- When the session objects are large graph structures — binary serialization of large graphs takes longer to activate and requires versioning care (adding a field breaks deserialization of stored sessions) (book p. 459)
- When strict horizontal scaling without sticky sessions is required and the platform does not support shared session stores `[interpretation]`

**Structure / Code** *(adapted from book pp. 458–461, discussion → Python)*:

```python
# Simplest form: in-memory dict keyed by session ID (book p. 458)
# For persistence: serialize the session object to a BLOB in a session table (book p. 459)
import json
import pickle
from dataclasses import dataclass, field


@dataclass
class OrderSession:
    """Domain state accumulated across multiple HTTP requests."""
    customer_id: int = 0
    pending_order_ids: list = field(default_factory=list)
    current_step: str = "start"


class ServerSessionStore:
    """
    In-memory store (book p. 458) — swap out _storage for a database-backed
    store without changing the interface (book p. 459 recommends serialized LOB approach).
    """
    def __init__(self):
        self._storage: dict[str, bytes] = {}

    def save(self, session_id: str, session: OrderSession) -> None:
        # Binary serialization — simple but not human-readable (book p. 459)
        self._storage[session_id] = pickle.dumps(session)

    def load(self, session_id: str) -> OrderSession | None:
        data = self._storage.get(session_id)
        if data is None:
            return None
        return pickle.loads(data)

    def remove(self, session_id: str) -> None:
        self._storage.pop(session_id, None)


class DatabaseSessionStore(ServerSessionStore):
    """
    Persists session as a Serialized LOB in the database (book p. 459).
    SQL:  CREATE TABLE session_store (session_id VARCHAR PRIMARY KEY, data BLOB,
                                      last_accessed TIMESTAMP);
    """
    def __init__(self, conn):
        self._conn = conn

    def save(self, session_id: str, session: OrderSession) -> None:
        data = pickle.dumps(session)
        cursor = self._conn.cursor()
        cursor.execute(
            """
            INSERT INTO session_store (session_id, data, last_accessed)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(session_id) DO UPDATE SET data=excluded.data,
                last_accessed=CURRENT_TIMESTAMP
            """,
            (session_id, data),
        )
        self._conn.commit()

    def load(self, session_id: str) -> OrderSession | None:
        cursor = self._conn.cursor()
        cursor.execute(
            "SELECT data FROM session_store WHERE session_id = ?", (session_id,)
        )
        row = cursor.fetchone()
        return pickle.loads(row["data"]) if row else None

    def remove(self, session_id: str) -> None:
        cursor = self._conn.cursor()
        cursor.execute(
            "DELETE FROM session_store WHERE session_id = ?", (session_id,)
        )
        self._conn.commit()
```

**Key Points**:
- The simplest form holds session objects in a server-side dict keyed by session ID; the client carries only the session ID (as Client Session State) (book p. 458)
- For durability and clustering, serialize the session to a Serialized LOB (p. 272) in a database table — this is often far simpler than converting session data to tabular form (book p. 459)
- Binary serialization is compact and requires little code but breaks when class definitions change; text/XML serialization is more robust across versions (book p. 459)
- Stale session cleanup requires a daemon that deletes rows older than a threshold using a `last_accessed` timestamp; partitioning the session table into segments avoids high contention on cleanup (book p. 459)
- `[interpretation]` Starlette session middleware / custom SQLAlchemy-backed session implements exactly this pattern with database, cache, and file-based stores selectable via the middleware configuration

---

*Python examples → `lang/python.md`*

## Database Session State
> Source: Chapter 17 — Book p. 462 (Fowler, PEAA 2002)

**Category**: Session State
**Intent** *(from book, p. 462)*: "Stores session data as committed data in the database."

**When to Use** *(from book, p. 464)*: Compare it with Server Session State (p. 458) and Client Session State (p. 456). Use Database Session State when you need stateless server objects for pooling and clustering, and when pulling data from the database on every request is acceptable. It is the obvious choice when your session data has no state at all (all data is already committed record data) because you lose nothing in either effort or performance (if you cache server objects). Clustering and failover are usually more straightforward than with Server Session State.

**When NOT to Use**:
- When reading and writing all session data to the database on every request is too slow for your load — the round-trip cost is real even when caching `[interpretation]`
- When session data is truly transient (working copies not yet confirmed by the user) — storing pending data in the main record tables pollutes queries that should only see committed records (book p. 463)
- When rollback of a whole multi-step session is needed — database-committed intermediate states are difficult to roll back cleanly (book p. 463) `[interpretation]`

**Structure / Code** *(adapted from book pp. 462–465, discussion → Python)*:

```python
# Database Session State commits data with an isPending flag (book p. 463)
# Simpler alternative: use separate pending tables, merge at session end (book p. 463)
import sqlite3
from dataclasses import dataclass


@dataclass
class Order:
    id: int
    customer_id: int
    amount: float
    is_pending: bool = True


class DatabaseSessionStateMapper:
    """
    Saves data immediately to the database with is_pending=True.
    At session end, flip is_pending to False to 'commit' (book p. 463).
    """
    def __init__(self, conn):
        self._conn = conn

    def save_pending(self, order: Order, session_id: str) -> None:
        cursor = self._conn.cursor()
        cursor.execute(
            """
            INSERT INTO orders (id, customer_id, amount, is_pending, session_id)
            VALUES (?, ?, ?, 1, ?)
            ON CONFLICT(id) DO UPDATE SET amount=excluded.amount
            """,
            (order.id, order.customer_id, order.amount, session_id),
        )
        self._conn.commit()

    def commit_session(self, session_id: str) -> None:
        """Confirm all pending records in this session (book p. 463)."""
        cursor = self._conn.cursor()
        cursor.execute(
            "UPDATE orders SET is_pending=0, session_id=NULL WHERE session_id=?",
            (session_id,),
        )
        self._conn.commit()

    def rollback_session(self, session_id: str) -> None:
        """Discard all pending records (session abandoned or timed out)."""
        cursor = self._conn.cursor()
        cursor.execute(
            "DELETE FROM orders WHERE is_pending=1 AND session_id=?",
            (session_id,),
        )
        self._conn.commit()

    def load_for_session(self, session_id: str) -> list[Order]:
        cursor = self._conn.cursor()
        cursor.execute(
            "SELECT id, customer_id, amount FROM orders WHERE session_id=?",
            (session_id,),
        )
        return [Order(*row, is_pending=True) for row in cursor.fetchall()]
```

**Key Points**:
- Every request pulls the data it needs from the database using only the session ID as a key — the server object is stateless and can be pooled or run on any cluster node (book p. 462)
- The boundary between Database Session State and Server Session State is where you convert data in the Server Session State to tabular form (book p. 459); once it's fully tabular, it's Database Session State
- The `is_pending` / pending tables approach prevents pending data from appearing in production queries like "available stock" or "daily revenue" (book p. 463)
- A cleanup daemon deleting rows older than a timeout threshold is required to reclaim abandoned sessions (book p. 463)
- `[interpretation]` This is essentially the pattern behind e-commerce shopping carts stored in a database — items in `cart_items` with a `session_id` until checkout

---

*Python examples → `lang/python.md`*

## Gateway
> Source: Chapter 18 — Book p. 466 (Fowler, PEAA 2002)

**Category**: Base Pattern
**Intent** *(from book, p. 466)*: "An object that encapsulates access to an external system or resource."

**When to Use** *(from book, p. 468)*: "You should consider Gateway whenever you have an awkward interface to something that feels external." There's hardly any downside — the code elsewhere becomes much easier to read and the gateway provides a natural attachment point for Service Stub (p. 504). Use it even when the external interface won't change, for testability alone.

**When NOT to Use**:
- When the external interface is already clean and object-oriented — wrapping it adds a layer with no benefit `[interpretation]`
- When you need full decoupling where neither subsystem depends on the interaction layer — use Mapper (p. 473) instead (but Mapper is more complex) (book p. 469)

**Structure / Code** *(adapted from book pp. 466–472, Java → Python)*:

```python
# Problem: generic messaging API uses stringly-typed send(msg_type, args[])
# Solution: Gateway wraps it with an explicit, typed interface (book pp. 469–472)

from typing import Any


class MessageSender:
    """Simulates an awkward proprietary messaging API (book p. 469)."""
    NULL_PARAMETER = -1
    UNKNOWN_MESSAGE_TYPE = -2
    SUCCESS = 0

    LEGAL_TYPES = {"CNFRM", "CANCEL"}

    def send(self, message_type: str, args: list[Any]) -> int:
        if message_type not in self.LEGAL_TYPES:
            return self.UNKNOWN_MESSAGE_TYPE
        if any(a is None for a in args):
            return self.NULL_PARAMETER
        return self.SUCCESS


class MessageGateway:
    """
    Wraps the awkward API with explicit, typed methods (book p. 470).
    Translates method calls to the generic interface and return codes to exceptions.
    """
    CONFIRM = "CNFRM"
    CANCEL = "CANCEL"

    def __init__(self, sender: MessageSender | None = None):
        self._sender = sender or MessageSender()

    def send_confirmation(self, order_id: str, amount: int, symbol: str) -> None:
        """Explicit method — name tells you the message type; args are typed."""
        self._send(self.CONFIRM, [order_id, amount, symbol])

    def send_cancellation(self, order_id: str, reason: str) -> None:
        self._send(self.CANCEL, [order_id, reason])

    def _send(self, msg: str, args: list[Any]) -> None:
        """Translates return codes to exceptions (book p. 471)."""
        return_code = self._do_send(msg, args)
        if return_code == MessageSender.NULL_PARAMETER:
            raise ValueError(f"Null parameter passed for message type: {msg}")
        if return_code != MessageSender.SUCCESS:
            raise RuntimeError(f"Unexpected error from messaging system: {return_code}")

    def _do_send(self, msg: str, args: list[Any]) -> int:
        """Separated so Service Stub can override just this method (book p. 471)."""
        assert self._sender is not None
        return self._sender.send(msg, args)


# --- Service Stub (subclass overrides _do_send for testing) (book p. 472) ---

class MessageGatewayStub(MessageGateway):
    def __init__(self):
        super().__init__()
        self._messages_sent = 0
        self._should_fail = False

    def fail_all_messages(self) -> None:
        self._should_fail = True

    @property
    def messages_sent(self) -> int:
        return self._messages_sent

    def _do_send(self, msg: str, args: list[Any]) -> int:
        if self._should_fail:
            return -999
        if msg not in MessageGateway.__dict__ or any(a is None for a in args):
            return MessageSender.NULL_PARAMETER
        self._messages_sent += 1
        return MessageSender.SUCCESS


# Domain object calls gateway through a well-known location (book p. 471):
# class Order:
#     def confirm(self):
#         if self.is_valid():
#             Environment.get_message_gateway().send_confirmation(
#                 self.id, self.amount, self.symbol
#             )
```

**Key Points**:
- The gateway's only job is to translate: typed explicit interface → generic API, and return codes → exceptions (book p. 470)
- The `_do_send` separation is not for its own sake — it is there specifically so that a Service Stub subclass can override just the sending behaviour without reimplementing the translation logic (book p. 471)
- Gateway vs Facade: a Facade is written by the service author for general use and always implies a different interface; a Gateway is written by the *client* for its particular use and may copy the wrapped facade entirely for substitution or testing (book p. 469)
- Gateway vs Adapter (GoF): an Adapter alters an existing interface to match one you need; with Gateway there usually isn't a pre-existing interface — the adapter *is* the Gateway implementation (book p. 469)
- `[interpretation]` In Python, `boto3` clients wrapped in thin domain-specific classes follow this pattern; `requests` sessions wrapped in typed API clients are another common example

---

*Python examples → `lang/python.md`*

## Mapper
> Source: Chapter 18 — Book p. 473 (Fowler, PEAA 2002)

**Category**: Base Pattern
**Intent** *(from book, p. 473)*: "An object that sets up a communication between two independent objects."

**When to Use** *(from book, p. 474)*: Use Mapper when you need to ensure that neither subsystem has a dependency on the interaction with the other. "The only time this is really important is when the interaction between the subsystems is particularly complicated and somewhat independent to the main purpose of both subsystems." For most external resource access, the simpler Gateway (p. 466) is preferable. In enterprise applications, Mapper appears most often as Data Mapper (p. 165) for database interactions.

**When NOT to Use**:
- When one subsystem can reasonably know about the other — the extra indirection of a Mapper is unnecessary complexity `[interpretation]`
- For simple external resource access — use Gateway (p. 466), which is simpler to write and use (book p. 473)

**Structure / Code** *(adapted from book pp. 473–474, discussion → Python)*:

```python
# Mapper sits between two subsystems, neither of which knows about the Mapper.
# Invocation challenge: since neither subsystem knows the Mapper, a third party must
# drive it, OR the Mapper observes one of them (book p. 474).

from abc import ABC, abstractmethod
from typing import Protocol


# Two independent subsystems — neither imports the other
class PricingPackage:
    """External pricing subsystem — knows nothing about domain."""
    def get_price(self, product_code: str, quantity: int) -> float:
        return quantity * 10.0  # stub


class Lease:
    """Domain object — knows nothing about PricingPackage."""
    def __init__(self, product_code: str, quantity: int):
        self.product_code = product_code
        self.quantity = quantity
        self.calculated_price: float = 0.0


# The Mapper: knows about both, controls communication, invoked by a third party
class PricingMapper:
    """
    Sets up communication between Lease and PricingPackage without coupling them.
    A third party (e.g., an application service) drives the Mapper (book p. 474).
    """
    def __init__(self, pricing: PricingPackage):
        self._pricing = pricing

    def apply_pricing(self, lease: Lease) -> None:
        """Translates between the two subsystems' concepts."""
        price = self._pricing.get_price(lease.product_code, lease.quantity)
        lease.calculated_price = price


# Observer variant (book p. 474): Mapper subscribes to events in one subsystem
class ObserverPricingMapper:
    """Mapper as observer — invoked when lease data changes, not by external caller."""

    def __init__(self, pricing: PricingPackage):
        self._pricing = pricing

    def on_lease_updated(self, lease: Lease) -> None:
        """Called by event dispatch, not by either subsystem directly."""
        self.apply_pricing(lease)

    def apply_pricing(self, lease: Lease) -> None:
        price = self._pricing.get_price(lease.product_code, lease.quantity)
        lease.calculated_price = price
```

**Key Points**:
- A Mapper is an insulating layer that controls communication between two subsystems without either knowing about it or about the Mapper itself (book p. 473)
- The fundamental challenge with Mapper is invocation: since neither subsystem knows the Mapper, it must be driven by a third party or act as an observer (Gang of Four) of one subsystem (book p. 474)
- Mapper vs Gateway: a Gateway has one dependent (the client of the external resource); with a Mapper, neither side depends on it — "the objects that a Mapper separates aren't even aware of the mapper" (book p. 474)
- Mapper vs Mediator (GoF): with a Mediator the objects being mediated know about the mediator; with a Mapper they do not (book p. 474)
- The most common form in enterprise applications is Data Mapper (p. 165) — the mapper between the domain layer and the relational database (book p. 474)

---

*Python examples → `lang/python.md`*

## Layer Supertype
> Source: Chapter 18 — Book p. 475 (Fowler, PEAA 2002)

**Category**: Base Pattern
**Intent** *(from book, p. 475)*: "A type that acts as the supertype for all types in its layer."

**When to Use** *(from book, p. 475)*: "Use Layer Supertype when you have common features from all objects in a layer." It is often applied automatically whenever common features are identified — storing and handling of Identity Fields (p. 216) in a Domain Object superclass is the canonical example. If a layer has more than one kind of object, use more than one Layer Supertype.

**When NOT to Use**:
- When the layer has no common behaviour — an empty superclass adds noise without benefit `[interpretation]`
- When Python's duck-typing or Protocol make a formal superclass unnecessary — prefer composition or Protocol for optional sharing `[interpretation]`

**Structure / Code** *(adapted from book p. 475, Java → Python)*:

```python
# Domain Object Layer Supertype — common ID handling for all domain objects (book p. 475)

class DomainObject:
    """Supertype for all objects in the Domain Model layer."""

    def __init__(self, object_id: int | None = None):
        if object_id is not None and object_id <= 0:
            raise ValueError("Cannot set a null or non-positive ID")
        self._id: int | None = object_id

    @property
    def id(self) -> int | None:
        return self._id

    @id.setter
    def id(self, value: int) -> None:
        if value is None or value <= 0:
            raise ValueError("Cannot set a null or non-positive ID")
        self._id = value


# Data Mapper Layer Supertype — common find/insert/update/delete scaffold
from abc import ABC, abstractmethod

class AbstractMapper(ABC):
    """Supertype for all Data Mapper objects — holds common DB plumbing."""

    @abstractmethod
    def _do_load(self, row: dict) -> DomainObject: ...

    def find(self, object_id: int, conn) -> DomainObject | None:
        cursor = conn.cursor()
        cursor.execute(f"SELECT * FROM {self._table_name()} WHERE id = ?", (object_id,))
        row = cursor.fetchone()
        return self._do_load(dict(row)) if row else None

    @abstractmethod
    def _table_name(self) -> str: ...


class CustomerMapper(AbstractMapper):
    def _table_name(self) -> str:
        return "customer"

    def _do_load(self, row: dict) -> DomainObject:
        obj = DomainObject(row["id"])
        # populate customer-specific fields ...
        return obj
```

**Key Points**:
- The pattern is deliberately simple: identify behaviour that is duplicated across all objects in a layer and move it to a single superclass (book p. 475)
- The Domain Object superclass for ID handling is the prototypical example — every persistent object needs to store and validate its primary key (book p. 475)
- Data Mapper (p. 165) commonly uses a Layer Supertype (`AbstractMapper`) to hold the common `find()` / `insert()` / `update()` / `delete()` scaffolding (book p. 475)
- Multiple Layer Supertypes per layer are fine when a layer has distinct object families (e.g., `DomainObject` and `DomainService`) `[interpretation]`
- `[interpretation]` SQLAlchemy's `sqlalchemy.orm.DeclarativeBase` is a Layer Supertype for the persistence layer; FastAPI's `APIRouter` route handlers share a common Starlette `Request`/`Response` base for the presentation layer

---

*Python examples → `lang/python.md`*

## Separated Interface
> Source: Chapter 18 — Book p. 476 (Fowler, PEAA 2002)

**Category**: Base Pattern
**Intent** *(from book, p. 476)*: "Defines an interface in a separate package from its implementation."

**When to Use** *(from book, p. 478)*: Use Separated Interface when you need to break a dependency between two parts of a system. The three canonical cases are: (1) a framework package needs to call application-specific code; (2) code in one layer needs to call code in a layer it should not see (e.g., domain code calling a Data Mapper); (3) calling code developed by another team whose APIs you don't want to take a compile-time dependency on. Fowler warns against using it for every class — the extra factory and wiring cost is only worth it when you genuinely need to break a dependency or support multiple independent implementations.

**When NOT to Use**:
- When there is only one implementation that will never need to be swapped — "if you put the interface and implementation together and need to separate them later, this is a simple refactoring that can be delayed" (book p. 478)
- In small systems where the dependency management discipline is overkill — separating every interface is excessive work (book p. 478)

**Structure / Code** *(adapted from book pp. 476–479, Java → Python)*:

```python
# Python does not have a formal 'interface' keyword, but ABC and Protocol both work.
# The interface lives in the client's package (or a shared DataUtils package).
# The implementation lives in a separate package (book Figure 18.1, p. 477).

# --- data_utils/unit_of_work.py  (interface package — no dependency on data_mapper) ---
from abc import ABC, abstractmethod

class UnitOfWork(ABC):
    """Separated Interface: domain code depends on this; data_mapper implements it."""

    @abstractmethod
    def register_new(self, obj) -> None: ...

    @abstractmethod
    def register_dirty(self, obj) -> None: ...

    @abstractmethod
    def register_clean(self, obj) -> None: ...

    @abstractmethod
    def register_deleted(self, obj) -> None: ...

    @abstractmethod
    def commit(self) -> None: ...


# --- data_mapper/unit_of_work_impl.py  (implementation package — depends on interface) ---
# from data_utils.unit_of_work import UnitOfWork  # depends on interface, not vice versa

class UnitOfWorkImpl(UnitOfWork):
    def __init__(self, conn):
        self._conn = conn
        self._new: list = []
        self._dirty: list = []
        self._deleted: list = []

    def register_new(self, obj) -> None:
        self._new.append(obj)

    def register_dirty(self, obj) -> None:
        self._dirty.append(obj)

    def register_clean(self, obj) -> None:
        pass  # tracked for reads only

    def register_deleted(self, obj) -> None:
        self._deleted.append(obj)

    def commit(self) -> None:
        # insert new, update dirty, delete deleted objects ...
        self._conn.commit()


# --- Plugin (p. 499) wires interface to implementation at configuration time ---
# (book p. 477 — implementation bound at compile time, configuration time, or via Plugin)
def configure_unit_of_work(conn) -> UnitOfWork:
    return UnitOfWorkImpl(conn)


# --- Domain code: depends only on the interface package ---
class Order:
    def __init__(self, unit_of_work: UnitOfWork):
        self._uow = unit_of_work

    def update_amount(self, amount: float) -> None:
        self.amount = amount
        self._uow.register_dirty(self)
```

**Key Points**:
- The key mechanism is that implementations depend on interfaces but interfaces do not depend on implementations — putting them in separate packages enforces this at the build/import level (book p. 477)
- The interface can live in the client's package (if there is one client) or in a neutral third package (if there are multiple clients or independent implementation teams) (book p. 477)
- Instantiating the implementation without creating a dependency is the main practical challenge — use a factory that knows both sides, or use Plugin (p. 499) for configuration-time binding (book p. 477)
- Python's `typing.Protocol` achieves structural subtyping without requiring the implementation to explicitly inherit from the interface — the dependency direction is broken at the import level even without `ABC` (book p. 477 discusses abstract class as alternative to formal interface) `[interpretation]`
- `[interpretation]` FastAPI's dependency injection system (`Depends()`) is a Separated Interface — user code implements custom dependencies in the application layer without depending on FastAPI internals

---

*Python examples → `lang/python.md`*

## Registry
> Source: Chapter 18 — Book p. 480 (Fowler, PEAA 2002)

**Category**: Base Pattern
**Intent** *(from book, p. 480)*: "A well-known object that other objects can use to find common objects and services."

**When to Use** *(from book, p. 482)*: Use Registry as a last resort — Fowler considers global data "always guilty until proven innocent." Use it when no appropriate object exists to start navigation from (you know a customer ID but have no reference to a customer object), and when passing the needed object as a parameter would require it to traverse many layers where it isn't needed by intermediate callers. Always try regular inter-object references first.

**When NOT to Use**:
- When the object can be passed as a constructor or method parameter — explicit dependencies are always cleaner than implicit global state (book p. 481)
- When you need mutable, thread-shared state — singletons with mutable fields are deadlock-prone; use thread-scoped registries instead (book p. 481)
- When you have multiple client packages that each need different instances — a single global is the wrong unit; use dependency injection `[interpretation]`

**Structure / Code** *(adapted from book pp. 480–485, Java → Python)*:

```python
# --- Singleton Registry (book pp. 482–483) ---
# Static methods provide a stable call site; data is stored on the instance, not in statics.

import threading
from typing import TypeVar, Type

T = TypeVar("T")


class PersonFinder:
    def find(self, person_id: int):
        raise NotImplementedError


class Registry:
    """
    Singleton Registry with static accessor methods (book p. 483).
    Data lives on the instance; public API is static so callers need no reference.
    """
    _sole_instance: "Registry | None" = None

    def __init__(self):
        self._person_finder: PersonFinder = PersonFinder()

    @classmethod
    def _get_instance(cls) -> "Registry":
        if cls._sole_instance is None:
            cls._sole_instance = cls()
        return cls._sole_instance

    @classmethod
    def initialize(cls) -> None:
        """Reinitialize with a fresh instance — resets all registered objects."""
        cls._sole_instance = cls()

    @classmethod
    def initialize_stub(cls) -> None:
        """Switch to stub mode for testing (book p. 483)."""
        cls._sole_instance = RegistryStub()

    @classmethod
    def person_finder(cls) -> PersonFinder:
        return cls._get_instance()._person_finder


class PersonFinderStub(PersonFinder):
    """Service Stub (p. 504) for testing — returns hard-coded data (book p. 484)."""
    def find(self, person_id: int):
        if person_id == 1:
            return {"last_name": "Fowler", "first_name": "Martin"}
        raise ValueError(f"Can't find id: {person_id}")


class RegistryStub(Registry):
    def __init__(self):
        super().__init__()
        self._person_finder = PersonFinderStub()


# --- Thread-Local Registry (book pp. 483–485) ---
# When different threads need different registry instances (e.g., different DB connections).

class ThreadLocalRegistry:
    """
    Thread-scoped Registry using threading.local() (book p. 484).
    Call begin() at request/transaction start, end() at completion.
    """
    _instances = threading.local()

    @classmethod
    def _get_instance(cls) -> "ThreadLocalRegistry":
        return cls._instances.registry

    @classmethod
    def begin(cls) -> None:
        assert not hasattr(cls._instances, "registry") or cls._instances.registry is None
        cls._instances.registry = cls()

    @classmethod
    def end(cls) -> None:
        assert cls._instances.registry is not None
        cls._instances.registry = None

    @classmethod
    def person_finder(cls) -> PersonFinder:
        return cls._get_instance()._person_finder

    def __init__(self):
        self._person_finder: PersonFinder = PersonFinder()


# Usage (book p. 485):
# ThreadLocalRegistry.begin()
# try:
#     finder = ThreadLocalRegistry.person_finder()
#     martin = finder.find(1)
# finally:
#     ThreadLocalRegistry.end()
```

**Key Points**:
- Preferred interface is static methods — they are easy to find from anywhere; but data should live on the instance, not in static fields, so the registry can be reinitialized or subclassed (book p. 481)
- Three scopes: process (singleton), thread (ThreadLocal/threading.local), session (dict keyed by session ID stored in thread-local storage) — the call site looks the same regardless (book p. 481)
- For testing, a `RegistryStub` subclass swaps all finders with Service Stubs; `Registry.initialize_stub()` installs it without changing any client code (book p. 483)
- An explicit Registry class (vs. a bare dict) keeps access methods explicit, allows type checking, and lets you refactor data scope without changing callers (book p. 482)
- `[interpretation]` Python's `contextvars.ContextVar` is the modern equivalent of thread-local storage and works correctly with async code; SQLAlchemy's scoped session and Flask's `g` application context are Registry implementations

---

*Python examples → `lang/python.md`*

## Value Object
> Source: Chapter 18 — Book p. 486 (Fowler, PEAA 2002)

**Category**: Base Pattern
**Intent** *(from book, p. 486)*: "A small simple object, like money or a date range, whose equality isn't based on identity."

**When to Use** *(from book, p. 487)*: "Treat something as a Value Object when you're basing equality on something other than an identity. It's worth considering this for any small object that's easy to create." Classic examples: money, date, date range, coordinate pair, phone number.

**When NOT to Use**:
- When the object has a meaningful identity that matters to the system — use a reference object (Entity) instead (book p. 486)
- When aliasing the same instance across the system is intentionally desired for notification or update propagation `[interpretation]`

**Structure / Code** *(adapted from book pp. 486–487, discussion → Python)*:

```python
# Value Objects base equality on field values, not identity (book p. 486).
# They should be immutable to prevent aliasing bugs (book p. 487).

from dataclasses import dataclass
from datetime import date


@dataclass(frozen=True)    # frozen=True → immutable; __eq__ and __hash__ from fields
class DateRange:
    """A simple Value Object — equality based on start and end dates."""
    start: date
    end: date

    def includes(self, d: date) -> bool:
        return self.start <= d <= self.end

    def length_in_days(self) -> int:
        return (self.end - self.start).days


# Aliasing bug prevented by immutability (book p. 487):
# If DateRange were mutable and two employees shared the same hire-date object,
# changing one employee's hire month would silently change the other's.
# With frozen=True, you replace the object rather than mutating it:
#   employee.hire_date = DateRange(new_start, employee.hire_date.end)

# Persistence: use Embedded Value (p. 268) rather than a separate table (book p. 487)
# SQL:  ... hired_start DATE, hired_end DATE ...  (columns in the owning table)

# .NET equivalent: declare as struct rather than class (book p. 487)
# Python equivalent: @dataclass(frozen=True) or a NamedTuple
from typing import NamedTuple

class Coordinate(NamedTuple):
    """Alternative Value Object using NamedTuple — also immutable and hashable."""
    latitude: float
    longitude: float
```

**Key Points**:
- The defining characteristic is value-based equality, not identity — two DateRange objects with the same start and end are equal and interchangeable (book p. 486)
- Immutability prevents aliasing bugs: if two objects share a value object and one "changes" it, they should replace it with a new instance rather than mutating the shared one (book p. 487)
- Persist value objects using Embedded Value (p. 268) — inline their columns into the owning table; Serialized LOB (p. 272) works for complex structures (book p. 487)
- Python's `@dataclass(frozen=True)` and `NamedTuple` both provide correct `__eq__` and `__hash__` based on field values — the right primitive for this pattern `[interpretation]`
- Note: Fowler uses "Value Object" in the DDD sense (small, equality-by-value). The J2EE community co-opted the term to mean Data Transfer Object (p. 401); Fowler explicitly rejects this usage (book p. 487)

---

*Python examples → `lang/python.md`*

## Money
> Source: Chapter 18 — Book p. 488 (Fowler, PEAA 2002)

**Category**: Base Pattern
**Intent** *(from book, p. 488)*: "Represents a monetary value."

**When to Use** *(from book, p. 491)*: "I use Money for pretty much all numeric calculation in object-oriented environments. The primary reason is to encapsulate the handling of rounding behavior, which helps reduce the problems of rounding errors. Another reason to use Money is to make multi-currency work much easier." Use it whenever monetary amounts appear in the domain.

**When NOT to Use**:
- When all calculations are in a single currency and rounding is not a concern — a plain `Decimal` may suffice `[interpretation]`
- When the system communicates monetary values via JSON/API to clients that expect plain numbers — the Money class must serialise cleanly `[interpretation]`

**Structure / Code** *(adapted from book pp. 488–495, Java → Python)*:

```python
# Money is a Value Object (p. 486) with amount stored as integer cents (book p. 491).
# Never use float for money — floating-point is inexact (book p. 491).

from __future__ import annotations
from decimal import Decimal, ROUND_HALF_EVEN
from dataclasses import dataclass
import math


@dataclass(frozen=True)
class Currency:
    code: str           # "USD", "GBP", "JPY"
    fraction_digits: int  # 2 for USD, 0 for JPY

    @property
    def cent_factor(self) -> int:
        return 10 ** self.fraction_digits


USD = Currency("USD", 2)
GBP = Currency("GBP", 2)
JPY = Currency("JPY", 0)


class Money:
    """
    Value Object for monetary amounts (book pp. 488–495).
    Amount stored internally as integer minor units (cents) to avoid rounding errors.
    """
    __slots__ = ("_amount", "_currency")

    def __init__(self, amount: int | float | Decimal, currency: Currency):
        """
        Accept float or Decimal for convenience; convert to integer minor units.
        (book p. 492 — store as long cents internally)
        """
        self._currency = currency
        if isinstance(amount, (int, float)):
            # round to nearest minor unit
            self._amount = round(float(amount) * currency.cent_factor)
        else:
            self._amount = int((amount * currency.cent_factor).to_integral_value())

    @classmethod
    def dollars(cls, amount: float | Decimal) -> "Money":
        """Convenience factory for USD (book p. 493)."""
        return cls(amount, USD)

    @property
    def amount(self) -> Decimal:
        """Return as Decimal with correct scale (book p. 493)."""
        return Decimal(self._amount) / Decimal(self._currency.cent_factor)

    @property
    def currency(self) -> Currency:
        return self._currency

    # --- Equality (Value Object) (book p. 493) ---
    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Money):
            return NotImplemented
        return self._currency == other._currency and self._amount == other._amount

    def __hash__(self) -> int:
        return hash((self._amount, self._currency))

    # --- Arithmetic (book pp. 493–494) ---
    def _assert_same_currency(self, other: "Money") -> None:
        if self._currency != other._currency:
            raise ValueError(
                f"Currency mismatch: {self._currency.code} vs {other._currency.code}"
            )

    def _new_money(self, cents: int) -> "Money":
        """Private factory — bypasses the float conversion (book p. 494)."""
        m = object.__new__(Money)
        object.__setattr__(m, "_amount", cents)
        object.__setattr__(m, "_currency", self._currency)
        return m

    def __add__(self, other: "Money") -> "Money":
        self._assert_same_currency(other)
        return self._new_money(self._amount + other._amount)

    def __sub__(self, other: "Money") -> "Money":
        self._assert_same_currency(other)
        return self._new_money(self._amount - other._amount)

    def __mul__(self, factor: float | Decimal) -> "Money":
        """Multiply by a scalar — rounding applied (book p. 494)."""
        result = Decimal(str(factor)) * Decimal(self._amount)
        return self._new_money(int(result.to_integral_value(ROUND_HALF_EVEN)))

    # --- Comparison (book p. 494) ---
    def __lt__(self, other: "Money") -> bool:
        self._assert_same_currency(other)
        return self._amount < other._amount

    def __le__(self, other: "Money") -> bool:
        self._assert_same_currency(other)
        return self._amount <= other._amount

    def __gt__(self, other: "Money") -> bool:
        self._assert_same_currency(other)
        return self._amount > other._amount

    def __ge__(self, other: "Money") -> bool:
        self._assert_same_currency(other)
        return self._amount >= other._amount

    # --- Allocation (Foemmel's Conundrum) (book p. 494) ---
    def allocate(self, ratios: list[int]) -> list["Money"]:
        """
        Distribute self among n targets in given ratios, losing no pennies (book p. 495).
        Strategy: compute floor shares, then distribute remainder one cent at a time.
        """
        total = sum(ratios)
        remainder = self._amount
        results = []
        for ratio in ratios:
            share = (self._amount * ratio) // total
            results.append(self._new_money(share))
            remainder -= share
        # distribute leftover cents to the first buckets
        for i in range(remainder):
            results[i] = self._new_money(results[i]._amount + 1)
        return results

    def __repr__(self) -> str:
        return f"Money({self.amount}, {self._currency.code})"


# --- Foemmel's Conundrum demo (book p. 495) ---
# Allocate $0.05 in ratio 3:7 — must not lose a cent
five_cents = Money.dollars(0.05)
parts = five_cents.allocate([3, 7])
assert parts[0] == Money.dollars(0.02)
assert parts[1] == Money.dollars(0.03)
assert sum(p._amount for p in parts) == five_cents._amount  # no pennies lost
```

**Key Points**:
- Store the amount as integer minor units (cents) to eliminate floating-point rounding; `Decimal` may be used for intermediate calculations but the final result should snap to an integer minor-unit representation (book p. 491)
- Every arithmetic operation must assert same-currency before proceeding — adding dollars to yen should raise, not silently produce garbage (book p. 493)
- Foemmel's Conundrum: distributing $0.05 at 70%/30% gives $0.035/$0.015, neither of which is a valid cent amount; the allocate method floors all shares and distributes remainder cents one-by-one so no money is created or destroyed (book p. 494)
- Multiplication by a scalar (e.g., for tax) is valid; multiplication of two money amounts is not — use `__mul__(self, scalar)` only (book p. 494) `[interpretation]`
- Persist via Embedded Value (p. 268): two columns `amount_cents INTEGER, currency_code CHAR(3)` in the owning table; store account-level currency separately if all entries share the same currency (book p. 491) `[interpretation]`
- `[interpretation]` The `py-moneyed` and `money` PyPI packages implement this pattern; `SQLAlchemy-Money` or custom `composite()` columns integrate it with SQLAlchemy ORM (used with FastAPI)

---

*Python examples → `lang/python.md`*

## Special Case
> Source: Chapter 18 — Book p. 496 (Fowler, PEAA 2002)

**Category**: Base Pattern
**Intent** *(from book, p. 496)*: "A subclass that provides special behavior for particular cases."

**When to Use** *(from book, p. 497)*: "Use Special Case whenever you have multiple places in the system that have the same behavior after a conditional check for a particular class instance, or the same behavior after a null check." Replace `if obj is None: do_default()` scattered across the codebase with a `NullObj` that does the right thing by default.

**When NOT to Use**:
- When the null/special case only appears in one place — the subclass overhead is not worth it for a single callsite `[interpretation]`
- When the callers genuinely need to *know* they have a null (e.g., to report an error to the user) — Special Case hides nullness, which is the wrong default when absence must be surfaced `[interpretation]`

**Structure / Code** *(adapted from book pp. 496–498, C# → Python)*:

```python
# Problem: Customer may be missing or unknown — callers litter the code with None checks.
# Solution: return a MissingCustomer or UnknownCustomer Special Case instead (book p. 496).

from abc import ABC
from decimal import Decimal


class Contract:
    NULL: "NullContract"  # forward reference, set below


class NullContract(Contract):
    pass


Contract.NULL = NullContract()


class Employee(ABC):
    """Base class — subclassed by real Employee and the null Special Case (book p. 497)."""

    @property
    def name(self) -> str:
        raise NotImplementedError

    @property
    def gross_to_date(self) -> Decimal:
        raise NotImplementedError

    @property
    def contract(self) -> Contract:
        raise NotImplementedError


class RealEmployee(Employee):
    def __init__(self, name: str, contract: Contract):
        self._name = name
        self._contract = contract
        self._charges: list[Decimal] = []

    @property
    def name(self) -> str:
        return self._name

    @property
    def gross_to_date(self) -> Decimal:
        return sum(self._charges, Decimal("0"))

    @property
    def contract(self) -> Contract:
        return self._contract


class NullEmployee(Employee):
    """
    Special Case: returns harmless defaults; asking for contract returns NullContract
    (book p. 497 — Special Cases return other Special Cases for chained access).
    Implemented as a flyweight since all NullEmployee instances are equivalent (book p. 497).
    """
    _instance: "NullEmployee | None" = None

    def __new__(cls) -> "NullEmployee":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    @property
    def name(self) -> str:
        return "Null Employee"

    @property
    def gross_to_date(self) -> Decimal:
        return Decimal("0")

    @property
    def contract(self) -> Contract:
        return Contract.NULL  # chained Special Case (book p. 497)


class MissingEmployee(NullEmployee):
    """Distinct Special Case: customer exists but is not linked (book p. 497)."""
    _instance = None

    @property
    def name(self) -> str:
        return "Missing"


class UnknownEmployee(NullEmployee):
    """Distinct Special Case: record exists but identity is unknown (book p. 497)."""
    _instance = None

    @property
    def name(self) -> str:
        return "Unknown"


# Finder returns Special Case instead of None — callers need zero null checks:
def find_employee(employee_id: int, db) -> Employee:
    row = db.get(employee_id)
    if row is None:
        return MissingEmployee()
    if row.get("unknown"):
        return UnknownEmployee()
    return RealEmployee(row["name"], row.get("contract", Contract.NULL))


# Client code — no null checks needed:
# emp = find_employee(42, db)
# print(emp.name)         # "Missing" or real name — no AttributeError
# print(emp.gross_to_date)  # Decimal("0") or real amount
```

**Key Points**:
- The core idea: override all methods of the Special Case to provide "harmless" defaults, so all call sites treat it identically to a real object — null checks evaporate (book p. 497)
- Special Cases can be implemented as flyweights (singletons) when all instances are equivalent, but must be separate instances when state accumulates (e.g., an "occupant" customer that accumulates charges) (book p. 497)
- Special Cases should return other Special Cases when chained — `null_employee.contract` returns `Contract.NULL`, not Python `None` (book p. 497)
- Different nulls mean different things: a MissingCustomer (no record) vs. an UnknownCustomer (record exists, identity unknown) warrant separate subclasses (book p. 497)
- IEEE 754 floating-point `NaN` is a language-level Special Case — it participates in arithmetic without raising, returning `NaN` for any operation (book p. 497)
- `[interpretation]` Python's `None` is the canonical null; replacing it with a Special Case object is idiomatic in SQLAlchemy ORM (used with FastAPI) via `session.get()` returning `None` or a default object, or in service layers using a `NullUser` sentinel

---

*Python examples → `lang/python.md`*

## Plugin
> Source: Chapter 18 — Book p. 499 (Fowler, PEAA 2002)

**Category**: Base Pattern
**Intent** *(from book, p. 499)*: "Links classes during configuration rather than compilation."

**When to Use** *(from book, p. 501)*: "Use Plugin whenever you have behaviors that require different implementations based on runtime environment." The canonical trigger: a Separated Interface (p. 476) has one implementation for testing and another for production, and you don't want a conditional factory scattered across the codebase or requiring a rebuild to switch.

**When NOT to Use**:
- When there is only one implementation and no variation is anticipated — the factory overhead is not worth it `[interpretation]`
- When the system is small enough that a simple constructor call or manual wiring is clear and obvious `[interpretation]`

**Structure / Code** *(adapted from book pp. 499–503, Java → Python)*:

```python
# Problem: IdGenerator needs a Counter for tests and an OracleIdGenerator in production.
# A Plugin factory reads a config file and instantiates the correct implementation.
# (book pp. 501–503)

import importlib
import configparser
from abc import ABC, abstractmethod
from pathlib import Path


# --- Separated Interface (p. 476) ---
class IdGenerator(ABC):
    @abstractmethod
    def next_id(self) -> int: ...


# --- Implementations ---
class Counter(IdGenerator):
    """In-memory counter for tests (book p. 502)."""
    _count = 0

    def next_id(self) -> int:
        self.__class__._count += 1
        return self.__class__._count


class OracleIdGenerator(IdGenerator):
    """Database sequence for production (book p. 502)."""
    def __init__(self, sequence: str, datasource: str):
        self._sequence = sequence
        self._datasource = datasource

    def next_id(self) -> int:
        # SELECT {sequence}.NEXTVAL FROM DUAL
        raise NotImplementedError("Real DB call goes here")


# --- Plugin Factory (book p. 502) ---
# Config file (plugins.properties / plugins.ini):
#   [test.properties]
#   IdGenerator = myapp.ids.Counter
#
#   [prod.properties]
#   IdGenerator = myapp.ids.OracleIdGenerator

class PluginFactory:
    """
    Reads a config file of interface-name → implementation-class-name mappings.
    Uses Python importlib to instantiate implementations without compile-time dependency
    (book p. 501 — 'Plugin works best in a language that supports reflection').
    """
    _props: dict[str, str] = {}

    @classmethod
    def load(cls, config_path: str) -> None:
        parser = configparser.ConfigParser()
        parser.read_dict({"DEFAULT": {}})
        with open(config_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#"):
                    key, _, value = line.partition("=")
                    cls._props[key.strip()] = value.strip()

    @classmethod
    def get_plugin(cls, interface: type) -> object:
        impl_name = cls._props.get(interface.__name__)
        if impl_name is None:
            raise RuntimeError(
                f"Implementation not specified for {interface.__name__} in plugin config"
            )
        module_name, _, class_name = impl_name.rpartition(".")
        module = importlib.import_module(module_name)
        cls_ = getattr(module, class_name)
        return cls_()


# --- Combined with singleton for simple call site (book p. 503) ---
# IdGenerator.INSTANCE = PluginFactory.get_plugin(IdGenerator)
# new_id = IdGenerator.INSTANCE.next_id()
#
# Config files:
# test.properties:   IdGenerator=myapp.ids.Counter
# prod.properties:   IdGenerator=myapp.ids.OracleIdGenerator
#
# Switch environments by pointing to a different config — no rebuild needed.
```

**Key Points**:
- The Plugin factory must have its linking instructions at a **single, external point** (a config file) so that switching from test to production requires changing one file, not hunting through multiple factory methods (book p. 500)
- The linking must occur at **runtime, not compilation** — Python's `importlib.import_module()` is the reflection mechanism that makes this possible without compile-time dependencies (book p. 501)
- Separating interface from implementation (Separated Interface, p. 476) is the prerequisite — without it there is nothing to swap (book p. 500)
- Combining Plugin with the singleton pattern produces a clean call site: `IdGenerator.INSTANCE.next_id()` — callers don't know or care which implementation is running (book p. 503)
- `[interpretation]` Python's `importlib` / `entry_points` / `pkgutil` ecosystem is a full Plugin infrastructure; FastAPI dependency injection / `app.dependency_overrides` / settings-driven backends (database, cache, email) are framework-level Plugin implementations

---

*Python examples → `lang/python.md`*

## Service Stub
> Source: Chapter 18 — Book p. 504 (Fowler, PEAA 2002)

**Category**: Base Pattern
**Intent** *(from book, p. 504)*: "Removes dependence upon problematic services during testing."

**When to Use** *(from book, p. 506)*: "Use Service Stub whenever you find that dependence on a particular service is hindering your development and testing." Use it when the real service is external, unreliable, slow, or not yet built — and you need tests to run quickly and deterministically.

**When NOT to Use**:
- When the real service is already fast, local, and reliable — the stub adds maintenance cost without benefit `[interpretation]`
- When the stub becomes as complex as the service itself — simplicity is the whole point; if the stub is growing, reconsider the design (book p. 506)

**Structure / Code** *(adapted from book pp. 504–507, Java → Python)*:

```python
# Scenario: application depends on an external tax service.
# (1) Define access via a Gateway (p. 466) as a Separated Interface (p. 476)
# (2) Write a stub implementation — loaded via Plugin (p. 499)
# (book pp. 504–507)

from abc import ABC, abstractmethod
from dataclasses import dataclass
from decimal import Decimal


@dataclass
class Address:
    state: str


@dataclass
class TaxInfo:
    rate: Decimal
    amount: Decimal


# --- Separated Interface: Gateway (book p. 505) ---
class TaxService(ABC):
    """
    Separated Interface (p. 476) — application code depends only on this.
    Real and stub implementations both implement it; Plugin selects which to load.
    """
    @abstractmethod
    def get_sales_tax_info(
        self, product_code: str, addr: Address, sale_amount: Decimal
    ) -> TaxInfo: ...


# --- Stub 1: Flat-rate stub (simplest possible, book p. 506) ---
class FlatRateTaxService(TaxService):
    FLAT_RATE = Decimal("0.0500")

    def get_sales_tax_info(
        self, product_code: str, addr: Address, sale_amount: Decimal
    ) -> TaxInfo:
        return TaxInfo(rate=self.FLAT_RATE, amount=sale_amount * self.FLAT_RATE)


# --- Stub 2: Exemption-aware stub (book p. 506) ---
class ExemptProductTaxService(TaxService):
    """
    Adds exempt product/state combinations so tests can cover tax-exempt paths.
    A setup method allows test cases to add exemptions (book p. 506).
    """
    EXEMPT_RATE = Decimal("0.0000")
    FLAT_RATE = Decimal("0.0500")
    EXEMPT_STATE = "IL"
    EXEMPT_PRODUCT = "12300"

    def __init__(self):
        self._exemptions: set[tuple[str, str]] = set()

    def add_exemption(self, state: str, product_code: str) -> None:
        """Called by test setup — not part of the TaxService interface (book p. 507)."""
        self._exemptions.add((state, product_code))

    def get_sales_tax_info(
        self, product_code: str, addr: Address, sale_amount: Decimal
    ) -> TaxInfo:
        if (addr.state, product_code) in self._exemptions:
            return TaxInfo(rate=self.EXEMPT_RATE, amount=Decimal("0"))
        return TaxInfo(rate=self.FLAT_RATE, amount=sale_amount * self.FLAT_RATE)


# --- Plugin wiring (book p. 505) ---
# test.properties:   TaxService=myapp.stubs.FlatRateTaxService
# prod.properties:   TaxService=myapp.tax.AcmeTaxService
#
# Application code uses the gateway:
# tax = TaxService.INSTANCE.get_sales_tax_info(product_code, address, amount)

# --- Test usage ---
def test_tax_exemption():
    stub = ExemptProductTaxService()
    stub.add_exemption("IL", "12300")
    info = stub.get_sales_tax_info("12300", Address("IL"), Decimal("100"))
    assert info.amount == Decimal("0")
    info2 = stub.get_sales_tax_info("99999", Address("CA"), Decimal("100"))
    assert info2.amount == Decimal("5.00")
```

**Key Points**:
- The three-step recipe: (1) define the service as a Separated Interface / Gateway; (2) write the stub as a simple implementation; (3) load the correct implementation via Plugin (book p. 505)
- Keep stubs as simple as possible — one or two lines for the flat-rate case; add complexity only when test cases require it (book p. 506)
- The `add_exemption()` setup method on the stub is not part of the TaxService interface — it is only called by test setup code; the Gateway interface that calls real services should throw an assertion failure if invoked in test mode (book p. 507)
- "Service Stub" is Fowler's term; the XP community calls the same idea a "Mock Object" (book p. 506)
- `[interpretation]` Python's `unittest.mock.patch`, `pytest-mock`, and `responses` library are framework-level Service Stub mechanisms; the pattern here is the hand-rolled version that makes the stub a proper class implementing the interface

---

*Python examples → `lang/python.md`*

## Record Set
> Source: Chapter 18 — Book p. 508 (Fowler, PEAA 2002)

**Category**: Base Pattern
**Intent** *(from book, p. 508)*: "An in-memory representation of tabular data."

**When to Use** *(from book, p. 511)*: "To my mind the value of Record Set comes from having an environment that relies on it as a common way of manipulating data. A lot of UI tools use Record Set, and a compelling reason to use them yourself [is to get data-aware UI tools for free]." If your platform provides first-class Record Set support (ADO.NET DataSet, JDBC RowSet), use it and pair it with Table Module (p. 125) for business logic. Without a data-aware UI ecosystem the pattern loses much of its justification.

**When NOT to Use**:
- When using a Domain Model (p. 116) — Record Sets push logic into the schema / stored procedures or the UI layer, exactly where Domain Model tries to avoid putting it (book p. 509)
- When you want strong typing in your business logic — implicit string-keyed interfaces lose type safety and make refactoring painful (book p. 510)
- When your platform has mature ORM support — the ORM gives you typed objects that are more amenable to business logic than a generic tabular structure `[interpretation]`

**Structure / Code** *(adapted from book pp. 508–511, discussion → Python)*:

```python
# Record Set: in-memory tabular structure that mirrors an SQL result set (book p. 508).
# Python's natural equivalent is a list of dicts (implicit interface) or a
# typed dataclass per row (explicit interface). The book recommends explicit (book p. 510).

from dataclasses import dataclass, field
from typing import Any, Iterator


# --- Implicit interface (book pp. 509–510 warns this is a "Bad Thing") ---
# row["passenger"] — stringly typed, no IDE support, refactoring is hazardous

class ImplicitRecordSet:
    """Generic tabular store — mirrors JDBC ResultSet / ADO.NET untyped DataTable."""

    def __init__(self, columns: list[str]):
        self._columns = columns
        self._rows: list[dict[str, Any]] = []

    def add_row(self, **values: Any) -> None:
        self._rows.append(values)

    def __iter__(self) -> Iterator[dict[str, Any]]:
        return iter(self._rows)

    def __len__(self) -> int:
        return len(self._rows)


# --- Explicit interface (book p. 510 prefers this — typed properties, IDE-friendly) ---

@dataclass
class ReservationRow:
    """
    Typed Record Set row — equivalent to ADO.NET's strongly typed DataSet (book p. 510).
    'With an explicit reservation the expression for a passenger might be
    aReservation.passenger' rather than aReservation["passenger"].
    """
    reservation_id: int
    passenger: str
    flight_number: str
    seat: str
    checked_in: bool = False


class ReservationRecordSet:
    """Typed Record Set holding ReservationRows — can act as a Unit of Work (book p. 510)."""

    def __init__(self):
        self._rows: list[ReservationRow] = []
        self._dirty: set[int] = set()

    def add(self, row: ReservationRow) -> None:
        self._rows.append(row)

    def mark_dirty(self, reservation_id: int) -> None:
        self._dirty.add(reservation_id)

    def __iter__(self) -> Iterator[ReservationRow]:
        return iter(self._rows)

    def commit(self, conn) -> None:
        """Flush dirty rows to database — acts as a lightweight Unit of Work (book p. 510)."""
        cursor = conn.cursor()
        for row in self._rows:
            if row.reservation_id in self._dirty:
                cursor.execute(
                    """
                    UPDATE reservation
                       SET passenger=?, flight_number=?, seat=?, checked_in=?
                     WHERE id=?
                    """,
                    (row.passenger, row.flight_number, row.seat,
                     row.checked_in, row.reservation_id),
                )
        conn.commit()
        self._dirty.clear()


# --- Loading from database (Table Module pattern, book p. 511) ---
def load_reservations(flight_number: str, conn) -> ReservationRecordSet:
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, passenger, flight_number, seat, checked_in FROM reservation WHERE flight_number=?",
        (flight_number,),
    )
    rs = ReservationRecordSet()
    for row in cursor.fetchall():
        rs.add(ReservationRow(
            reservation_id=row[0],
            passenger=row[1],
            flight_number=row[2],
            seat=row[3],
            checked_in=bool(row[4]),
        ))
    return rs


# --- Workflow with Table Module (book p. 511) ---
# rs = load_reservations("UA123", conn)
# ReservationModule.calculate_upgrades(rs)   # Table Module manipulates the record set
# ui.display(rs)                             # data-aware UI renders the record set
# rs.commit(conn)                            # write changes back
```

**Key Points**:
- The two essential elements: (1) the structure looks exactly like a SQL result set, enabling data-aware UI tools; (2) you can construct or modify a Record Set yourself without a database query, enabling business logic to generate and consume the same structure (book p. 509)
- Implicit interfaces (string-keyed access: `row["passenger"]`) make it easy to write a single generic Record Set for any schema, but lose type safety and make IDEs useless for navigation (book p. 510)
- Fowler favours explicit typed interfaces — code that reads `reservation.passenger` rather than `reservation["passenger"]` is far easier to maintain; ADO.NET's generated typed DataSets are the canonical platform example (book p. 510)
- A Record Set can act as a Unit of Work (p. 184): it tracks dirty rows and flushes only changes to the database; platforms can layer Optimistic Offline Lock (p. 416) on top to detect conflicts (book p. 510)
- A disconnected Record Set can be serialized and sent across a network, acting as a Data Transfer Object (p. 401) — this is a core feature of ADO.NET DataSets (book p. 510)
- Fowler speculates Record Set may be a specialisation of a more general "Generic Data Structure" pattern — hierarchical structures like XML + XPath play the same role for document data as tabular structures + SQL play for relational data (book p. 511)
- `[interpretation]` In Python, `pandas.DataFrame` is the closest analogue — it provides the same tabular in-memory structure with data-aware tooling (`matplotlib`, `seaborn`, Jupyter widgets) and can be committed back to SQL via `to_sql()`; SQLAlchemy Core `RowProxy` results are the implicit-interface version
