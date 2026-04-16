# PEAA Pattern Index

**51 patterns across 10 categories. Load `catalog-core.md` for full entries. Load `lang/<language>.md` for code examples.**

Quick-find: [Domain Logic](#domain-logic-ch-9) | [Data Source](#data-source-architecture-ch-10) | [OR Behavioral](#or-behavioral-ch-11) | [OR Structural](#or-structural-ch-12) | [OR Metadata](#or-metadata-ch-13) | [Web Presentation](#web-presentation-ch-14) | [Distribution](#distribution-ch-15) | [Concurrency](#concurrency-ch-16) | [Session State](#session-state-ch-17) | [Base Patterns](#base-patterns-ch-18)

---

## Domain Logic (Ch. 9)

| Pattern | Page | Intent (one sentence) | Pairs with | Competes with |
|---------|------|-----------------------|------------|---------------|
| Transaction Script | 110 | Organizes business logic as a single standalone procedure per business transaction. | Row/Table Data Gateway | Domain Model, Table Module |
| Domain Model | 116 | Object model of the domain where classes carry both data and behavior. | Data Mapper, Service Layer | Transaction Script, Table Module |
| Table Module | 125 | Single class instance handles all business logic for every row in a given table. | Table Data Gateway, Record Set | Domain Model |
| Service Layer | 133 | Defines the application boundary with a coordinated set of available operations. | Domain Model or Transaction Script | (required with multiple clients) |

---

## Data Source Architecture (Ch. 10)

| Pattern | Page | Intent (one sentence) | Pairs with | Competes with |
|---------|------|-----------------------|------------|---------------|
| Table Data Gateway | 144 | One object encapsulates all SQL for a single database table, returning raw data. | Transaction Script, Table Module | Row Data Gateway, Data Mapper |
| Row Data Gateway | 152 | One object per database row encapsulates find/insert/update for that single record. | Transaction Script | Table Data Gateway, Active Record |
| Active Record | 160 | Domain object that also knows how to persist itself to and from the database. | (simple domains) | Data Mapper |
| Data Mapper | 165 | Separate mapper layer moves data between domain objects and the database, keeping both independent. | Domain Model, Unit of Work, Identity Map | Active Record |

---

## OR Behavioral (Ch. 11)

| Pattern | Page | Intent (one sentence) | Pairs with | Competes with |
|---------|------|-----------------------|------------|---------------|
| Unit of Work | 184 | Tracks all objects changed in a business transaction and writes them out in one coordinated batch. | Data Mapper, Identity Map | (essential companion to Data Mapper) |
| Identity Map | 195 | Ensures each database row is loaded into exactly one in-memory object within a session. | Unit of Work, Data Mapper | (required with Data Mapper) |
| Lazy Load | 200 | Object defers loading of related data until that data is actually accessed. | Data Mapper | (four variants: init, proxy, holder, ghost) |

---

## OR Structural (Ch. 12)

| Pattern | Page | Intent (one sentence) | Pairs with | Competes with |
|---------|------|-----------------------|------------|---------------|
| Identity Field | 216 | Stores the database primary key on the in-memory object to maintain its database identity. | Domain Model, Data Mapper | Embedded Value (for Value Objects) |
| Foreign Key Mapping | 236 | Maps object associations to foreign key columns in the database. | Data Mapper | Association Table Mapping, Embedded Value |
| Association Table Mapping | 248 | Maps a many-to-many association using a link table with foreign keys to both sides. | Data Mapper | Foreign Key Mapping (one-to-many only) |
| Dependent Mapping | 262 | Owner object's mapper handles all persistence for child objects that have exactly one owner. | Foreign Key Mapping | Embedded Value, Association Table Mapping |
| Embedded Value | 268 | Maps a small object's fields into columns of the owning object's table. | Value Object, Data Mapper | Serialized LOB, Dependent Mapping |
| Serialized LOB | 272 | Saves an object graph by serializing it into a single large field in the database. | Data Mapper | Embedded Value (when SQL queryability needed) |
| Single Table Inheritance | 278 | Maps an entire inheritance hierarchy to one table with a type discriminator column. | Data Mapper, Inheritance Mappers | Class Table Inheritance, Concrete Table Inheritance |
| Class Table Inheritance | 285 | Maps each class in a hierarchy to its own table joined by shared primary key. | Data Mapper, Inheritance Mappers | Single Table Inheritance, Concrete Table Inheritance |
| Concrete Table Inheritance | 293 | Maps each concrete class in a hierarchy to its own fully self-contained table. | Data Mapper, Inheritance Mappers | Single Table Inheritance, Class Table Inheritance |
| Inheritance Mappers | 302 | Organizes the mapper hierarchy (abstract, concrete, wrapper) to handle any inheritance mapping strategy. | Single Table Inheritance, Class Table Inheritance, Concrete Table Inheritance | (required for any inheritance mapping) |

---

## OR Metadata (Ch. 13)

| Pattern | Page | Intent (one sentence) | Pairs with | Competes with |
|---------|------|-----------------------|------------|---------------|
| Metadata Mapping | 306 | Holds object-relational field-to-column mapping declarations in metadata rather than hand-coded methods. | Data Mapper, Layer Supertype | (foundation of most ORM tools) |
| Query Object | 316 | Represents a database query as an object so clients can build queries in domain terms. | Metadata Mapping, Repository, Data Mapper | (specific finder methods on mapper) |
| Repository | 322 | Provides a collection-like interface to domain objects backed by a swappable data strategy. | Query Object, Metadata Mapping, Unit of Work | Data Mapper (specific finders) |

---

## Web Presentation (Ch. 14)

| Pattern | Page | Intent (one sentence) | Pairs with | Competes with |
|---------|------|-----------------------|------------|---------------|
| Model View Controller | 330 | Separates UI interaction into model (domain), view (display), and controller (input handling) roles. | Template View, Page/Front Controller | (foundational — not competing with siblings) |
| Page Controller | 333 | One controller object handles requests for one specific page or action. | Template View, Layer Supertype | Front Controller |
| Front Controller | 344 | A single handler receives all site requests and dispatches to per-action command objects. | Template View, Transform View, Special Case | Page Controller |
| Template View | 350 | Renders HTML by embedding markers in a template page populated by a helper object. | Page/Front Controller | Transform View |
| Transform View | 361 | Renders output by applying element-by-element transformations (typically XSLT) to domain data. | Data Transfer Object | Template View |
| Two Step View | 365 | Converts domain data to a logical screen structure first, then renders it to HTML in a second pass. | Transform View, Front/Page Controller | Template View (single step) |
| Application Controller | 379 | Centralizes screen navigation and flow decisions based on application state. | Front Controller, Domain Model | (complements input controllers) |

---

## Distribution (Ch. 15)

| Pattern | Page | Intent (one sentence) | Pairs with | Competes with |
|---------|------|-----------------------|------------|---------------|
| Remote Facade | 388 | Coarse-grained facade over fine-grained domain objects that minimizes remote call overhead. | Data Transfer Object, Service Layer | (wraps Service Layer for remote access) |
| Data Transfer Object | 401 | Plain data carrier that aggregates multiple fields to reduce the number of remote calls. | Remote Facade, Mapper/Assembler | Value Object (different concept) |

---

## Concurrency (Ch. 16)

| Pattern | Page | Intent (one sentence) | Pairs with | Competes with |
|---------|------|-----------------------|------------|---------------|
| Optimistic Offline Lock | 416 | Detects write conflicts at commit time using a version stamp, then rolls back the loser. | Unit of Work, Data Mapper | Pessimistic Offline Lock |
| Pessimistic Offline Lock | 426 | Prevents conflicts by requiring a session to acquire an exclusive lock before editing data. | Unit of Work | Optimistic Offline Lock |
| Coarse-Grained Lock | 438 | Locks an entire aggregate of related objects with a single shared version or root lock. | Optimistic Offline Lock, Pessimistic Offline Lock | (used with either locking strategy) |
| Implicit Lock | 449 | Framework or mapper automatically acquires locks so no application code path can forget to. | Pessimistic Offline Lock, Optimistic Offline Lock | (complements both locking patterns) |

---

## Session State (Ch. 17)

| Pattern | Page | Intent (one sentence) | Pairs with | Competes with |
|---------|------|-----------------------|------------|---------------|
| Client Session State | 456 | Stores session data on the client via URL parameters, hidden fields, or cookies. | Data Transfer Object | Server Session State, Database Session State |
| Server Session State | 458 | Holds serialized session objects in server memory or a server-side store keyed by session ID. | Serialized LOB | Client Session State, Database Session State |
| Database Session State | 462 | Persists session data as committed (possibly pending-flagged) rows in the database. | (standard DB access) | Client Session State, Server Session State |

---

## Base Patterns (Ch. 18)

| Pattern | Page | Intent (one sentence) | Pairs with | Competes with |
|---------|------|-----------------------|------------|---------------|
| Gateway | 466 | Wraps access to an external system or resource with a clean, typed, exception-raising interface. | Service Stub | Mapper (when full independence needed) |
| Mapper | 473 | Mediates between two independent subsystems so neither has a dependency on the other. | Data Mapper | Gateway (simpler when one side can know the other) |
| Layer Supertype | 475 | A common superclass for all objects in a layer that holds shared behavior for that layer. | Data Mapper, Identity Field | (not competing — enabling) |
| Separated Interface | 476 | Puts an interface in a different package from its implementations to break compile-time coupling. | Plugin, Unit of Work | (enabling pattern — no direct competitor) |
| Registry | 480 | A well-known global lookup object that provides access to services and shared objects. | Service Stub, Unit of Work | Dependency injection (preferred when possible) |
| Value Object | 486 | Small, immutable object whose equality is based on its field values rather than identity. | Embedded Value, Money | (reference object / Entity) |
| Money | 488 | Represents a monetary amount with currency, correct rounding, and allocation behavior. | Value Object, Embedded Value | (plain Decimal — loses currency safety) |
| Special Case | 496 | A subclass that provides safe default behavior for null or missing cases, eliminating null checks. | Front Controller (UnknownCommand) | (Python None — loses polymorphism) |
| Plugin | 499 | Links interface implementations to callers at configuration time rather than compile time. | Separated Interface, Service Stub | (hardcoded factory) |
| Service Stub | 504 | Test-time replacement for a slow, external, or unavailable service, wired in via Plugin. | Gateway, Plugin, Separated Interface | (real service — use stub in tests only) |
| Record Set | 508 | In-memory tabular data structure that mirrors SQL result sets and integrates with data-aware UI tools. | Table Module, Table Data Gateway | Domain Model (incompatible philosophy) |
