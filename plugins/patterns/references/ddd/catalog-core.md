# DDD Concept & Pattern Catalog — Core Reference

**Source**: *Domain-Driven Design: Tackling Complexity in the Heart of Software* — Eric Evans (2003)

**Purpose**: Language-agnostic concept definitions for DDD's ~40 patterns and practices.
For code examples see `lang/<language>.md`.

**Note**: DDD concepts fall into three categories:
1. **Process concepts** (teach-only) — practices like Ubiquitous Language that shape how teams work
2. **Tactical patterns** — code-level building blocks (Entity, Value Object, Aggregate, etc.)
3. **Strategic patterns** — system/team-level decisions (Bounded Context, Context Map, etc.)

Strategic patterns have NO code — they're about system boundaries and team relationships.

**Anti-hallucination policy**: Evans quotes cited by page. Interpretations tagged `[interpretation]`.

---

# Part I — Process Concepts (Teach-Only)

---

## Knowledge Crunching (p. 15)

**Category**: Process (teach-only — not detectable in code)
**Part**: I

### Definition

Knowledge crunching is the team process of distilling domain knowledge through iterative conversation with domain experts, brainstorming, experimenting with models, and discarding what doesn't work. (p. 15)

### Why It Matters

Without continuous knowledge crunching, developers build software that reflects their assumptions rather than the domain reality. The best models emerge through many cycles of learning, prototyping, and refining — not from a single requirements-gathering phase. Knowledge crunching is the engine that drives all other DDD practices; skip it and the model will drift from the domain.

---

## Ubiquitous Language (p. 25)

**Category**: Process (teach-only — not detectable in code)
**Part**: I

### Definition

"A language structured around the domain model and used by all team members to connect all the activities of the team with the software." (p. 25)

### Why It Matters

When developers and domain experts use different vocabularies, translation errors compound. The Ubiquitous Language eliminates this gap: every class name, method name, and module boundary uses terms that domain experts recognize. If a term can't be found in the model, the model is incomplete. If the team can't speak the language fluently, the model is wrong. The language is the model, and the model is the language.

---

## Model-Driven Design (p. 38)

**Category**: Process (teach-only — not detectable in code)
**Part**: I

### Definition

"Tightly relating the code to an underlying model gives the code meaning and makes the model relevant." (p. 38) The design directly reflects the domain model — code structure mirrors model concepts. There is no separate "analysis model" and "implementation model."

### Why It Matters

When the design diverges from the model, neither serves its purpose. The model becomes a diagram nobody updates, and the code becomes a tangle nobody understands. Model-Driven Design demands that any change to the model changes the code, and any refactoring of the code changes the model. This bi-directional binding keeps the software aligned with domain understanding over time.

---

## Hands-on Modelers (p. 47)

**Category**: Process (teach-only — not detectable in code)
**Part**: I

### Definition

"If the people who write the code do not feel responsible for the model, or don't understand how to make the model work for an application, then the model has nothing to do with the software." (p. 47) Developers who write code must also participate in modeling; modelers must touch the code.

### Why It Matters

An ivory-tower modeler who never sees code will produce models that don't translate. A developer who ignores the model will write code that doesn't express domain concepts. Hands-on modeling closes this loop — the same people who discuss the domain with experts are the ones who implement it in code, ensuring the Ubiquitous Language stays alive in both conversation and codebase.

---

# Part II — Tactical Building Blocks

---

## Layered Architecture (p. 52)

**Category**: Tactical
**Part**: II

### Definition

"Isolate the expression of the domain model and the business logic, and eliminate any dependency on infrastructure, user interface, or even application logic that is not business logic." (p. 52) Partition the system into four layers: User Interface, Application, Domain, and Infrastructure. Dependencies flow downward only.

### When to Use

- The domain logic is complex enough to justify separation from presentation and persistence
- Multiple interfaces (API, CLI, UI) need to share the same domain logic
- You need to test domain rules independently of infrastructure

### When NOT to Use / Tradeoffs

- Very simple CRUD applications where layering adds ceremony without benefit (see Smart UI anti-pattern, p. 55 — Evans acknowledges this as a valid choice for simple projects)
- Over-layering creates indirection that makes simple operations hard to trace

### Key Rules

- The Domain layer must have NO dependencies on other layers
- The Application layer orchestrates domain objects but contains no business rules itself
- Infrastructure implements interfaces defined in the Domain layer (Dependency Inversion)

### Related Patterns

- **Modules** (p. 79) — organize within the domain layer
- **All tactical patterns** — live inside the domain layer
- **Anticorruption Layer** (p. 257) — a specialized infrastructure-layer construct

### Cross-references

- See also PEAA: Fowler's layering (Ch. 1) — similar concept, Fowler adds a "Service Layer" between Application and Domain
- See also PEAA: Service Layer (p. 133) — Fowler's Service Layer is Evans's Application Layer, NOT the Domain Service

### Antipattern signals `[interpretation]`

- Domain objects import from UI or infrastructure packages
- Business rules live in controllers or database scripts
- "Service" classes contain all logic while domain objects are data-only bags (Anemic Domain Model)

*Code examples -> `lang/<language>.md`*

---

## Entities (p. 65)

**Category**: Tactical
**Part**: II

### Definition

"Some objects are not fundamentally defined by their attributes, but by a thread of continuity and identity." (p. 65) An Entity has a unique identity that persists through state changes. Two Entities with identical attributes but different identities are different objects.

### When to Use

- The object must be tracked across time and state changes (a Person, an Order, a Bank Account)
- Two instances with the same attributes are NOT interchangeable
- The object has a lifecycle (created, modified, archived, deleted)

### When NOT to Use / Tradeoffs

- If the object is defined entirely by its attributes and has no meaningful identity, use a Value Object instead
- Entities require identity management (ID generation, equality by ID) which adds complexity
- Overuse leads to unnecessary mutation tracking and stale-state bugs

### Key Rules

- Define identity explicitly — choose a stable identity mechanism (natural key, UUID, database sequence)
- Implement equality based on identity, NOT attributes
- Strip Entities of non-essential attributes — push attribute-heavy concerns into Value Objects owned by the Entity
- Keep Entities focused on identity continuity and core lifecycle behavior

### Related Patterns

- **Value Objects** (p. 70) — complement Entities; carry attributes without identity
- **Aggregates** (p. 89) — Entities often serve as Aggregate Roots
- **Repositories** (p. 106) — provide retrieval by identity
- **Factories** (p. 98) — create Entities with proper initial state and identity

### Cross-references

- See also PEAA: Domain Model objects (p. 116) — Fowler's domain objects are typically Evans's Entities
- See also PEAA: Identity Map (p. 195) — ensures in-memory Entity uniqueness

### Antipattern signals `[interpretation]`

- Equality implemented on all attributes instead of identity
- Entity has no clear identity field
- Entity is a data bag with getters/setters and no behavior (Anemic Domain Model)
- Everything is modeled as an Entity when many things should be Value Objects

*Code examples -> `lang/<language>.md`*

---

## Value Objects (p. 70)

**Category**: Tactical
**Part**: II

### Definition

"An object that represents a descriptive aspect of the domain with no conceptual identity is called a VALUE OBJECT." (p. 70) Value Objects are defined entirely by their attributes. Two Value Objects with the same attributes are interchangeable. They should be immutable.

### When to Use

- The object describes a characteristic or measurement (Money, Address, DateRange, Color)
- You don't care which instance you have, only what it represents
- The object can be freely shared, copied, or replaced

### When NOT to Use / Tradeoffs

- When the object needs to be tracked across time or has a lifecycle — use an Entity
- In languages without good support for value semantics, implementing immutability can be verbose
- Large Value Objects with many fields may feel heavyweight, but immutability benefits usually outweigh this

### Key Rules

- **Immutable** — once created, a Value Object never changes. To "modify," create a new one.
- **Equality by attributes** — two Value Objects with the same values are equal, regardless of reference
- **Side-effect-free behavior** — methods on Value Objects should return new values, not mutate state
- **Freely shareable** — because they're immutable, no aliasing bugs

### Related Patterns

- **Entities** (p. 65) — own Value Objects; identity vs. attributes is the key distinction
- **Aggregates** (p. 89) — Value Objects are common components within Aggregates
- **Closure of Operations** (p. 190) — Value Objects are ideal for operations returning the same type
- **Side-Effect-Free Functions** (p. 175) — Value Objects naturally support this pattern

### Cross-references

- See also PEAA: Value Object (p. 486) — same concept, same name
- See also PEAA: Embedded Value (p. 268) — persistence strategy for Value Objects
- See also PEAA: Money pattern (p. 488) — canonical Value Object example

### Antipattern signals `[interpretation]`

- Value Object has setters or mutable fields
- Value Object has a database-generated ID used for equality
- Primitive obsession — using raw strings/ints where a Value Object would capture domain meaning (e.g., `string email` vs. `EmailAddress email`)

*Code examples -> `lang/<language>.md`*

---

## Services (p. 75)

**Category**: Tactical
**Part**: II

### Definition

"When a significant process or transformation in the domain is not a natural responsibility of an ENTITY or VALUE OBJECT, add an operation to the model as a standalone interface declared as a SERVICE." (p. 75) A Service is a stateless operation that represents a domain concept — typically a verb rather than a noun.

### When to Use

- The operation conceptually doesn't belong to any single Entity or Value Object
- The operation involves multiple domain objects (e.g., transferring money between Accounts)
- Forcing the behavior onto an Entity would create an awkward dependency

### When NOT to Use / Tradeoffs

- If the operation naturally belongs on an Entity or Value Object, put it there — don't extract prematurely
- **Overuse of Services is the #1 path to the Anemic Domain Model** — if most logic is in Services and Entities are just data bags, the model has failed
- Evans distinguishes three layers of Service: **Domain Services** (business rules), **Application Services** (orchestration), and **Infrastructure Services** (technical concerns) — keep them separate

### Key Rules

- **Stateless** — a Service holds no state between operations
- **Interface defined in terms of the domain model** — parameters and return types are domain objects
- **Named after a domain activity** — use verbs from the Ubiquitous Language (e.g., `TransferFunds`, `RouteShipment`)

### Related Patterns

- **Entities** (p. 65) — Services complement Entities by handling cross-entity operations
- **Value Objects** (p. 70) — Services may accept and return Value Objects
- **Repositories** (p. 106) — Application Services typically use Repositories to load Aggregates before delegating to domain logic

### Cross-references

- See also PEAA: Service Layer (p. 133) — **different concept!** Evans's Domain Service = domain logic; Fowler's Service Layer = application boundary/orchestration. Evans's Application Service is closer to Fowler's Service Layer.

### Antipattern signals `[interpretation]`

- Service contains business rules that should live on an Entity (logic extraction smell)
- Service named after a noun instead of a verb (`OrderService` that does everything)
- Entities are pure data structures with no methods — all logic in Services (Anemic Domain Model)

*Code examples -> `lang/<language>.md`*

---

## Modules (p. 79)

**Category**: Tactical
**Part**: II

### Definition

"Choose MODULES that tell the story of the system and contain a cohesive set of concepts." (p. 79) Modules (packages, namespaces) are a modeling tool, not just an organizational convenience. They should reflect domain concepts and communicate the structure of the model.

### When to Use

- Always — every non-trivial domain model needs module organization
- When navigating the model becomes difficult due to the number of types

### When NOT to Use / Tradeoffs

- Don't organize modules by technical layer within the domain (e.g., `entities/`, `services/`, `valueobjects/`) — organize by domain concept (e.g., `shipping/`, `billing/`, `inventory/`)
- Over-decomposition into tiny modules hinders understanding

### Key Rules

- **High cohesion within modules** — concepts in a module should be closely related in the domain
- **Low coupling between modules** — minimize dependencies across module boundaries
- **Name modules using the Ubiquitous Language** — module names are part of the model
- **Refactor modules as the model evolves** — don't let early packaging decisions fossilize

### Related Patterns

- **Bounded Context** (p. 238) — a module lives within a single Bounded Context
- **Layered Architecture** (p. 52) — modules organize the Domain layer internally
- **Conceptual Contours** (p. 183) — guides where to draw module boundaries

### Antipattern signals `[interpretation]`

- Modules named by technical role (`entities/`, `services/`, `repositories/`) rather than domain concept
- Large modules with unrelated concepts jammed together
- Modules that mirror database table groupings rather than domain understanding

*Code examples -> `lang/<language>.md`*

---

## Aggregates (p. 89)

**Category**: Tactical
**Part**: II

### Definition

"Cluster the ENTITIES and VALUE OBJECTS into AGGREGATES and define boundaries around each. Choose one ENTITY to be the root of each AGGREGATE, and control all access to the objects inside the boundary through the root." (p. 89) The Aggregate Root enforces all invariants for the cluster.

### When to Use

- A group of objects must be consistent together — they share invariants
- You need to define a transactional boundary for persistence
- External objects need a controlled entry point to a cluster of related objects

### When NOT to Use / Tradeoffs

- Making Aggregates too large creates contention and performance problems — prefer small Aggregates `[interpretation]`
- Making Aggregates too small forces invariant enforcement into Services, weakening the model
- Cross-Aggregate invariants require eventual consistency or domain events, adding complexity

### Key Rules

- **Root Entity is the only entry point** — external objects hold references only to the Root, never to internals
- **Internal objects have local identity only** — their identity is meaningful only within the Aggregate
- **Invariants are enforced on every change** — the Root is responsible for maintaining all Aggregate-level invariants
- **Delete the Root, delete everything inside** — the Aggregate is a unit of lifecycle
- **Persist as a unit** — a single transaction should cover exactly one Aggregate
- **Reference other Aggregates by identity (ID), not by object reference** `[interpretation — Evans implies this; Vernon makes it explicit]`

### Related Patterns

- **Entities** (p. 65) — the Root is an Entity; internals may be Entities or Value Objects
- **Value Objects** (p. 70) — common building blocks inside Aggregates
- **Repositories** (p. 106) — one Repository per Aggregate Root, never for internal objects
- **Factories** (p. 98) — create entire Aggregates in a valid initial state

### Cross-references

- See also PEAA: Unit of Work (p. 184) — infrastructure pattern for persisting Aggregate changes
- See also PEAA: Identity Map (p. 195) — ensures Aggregate Root uniqueness in memory

### Antipattern signals `[interpretation]`

- External code reaches deep into an Aggregate to modify an internal object
- Aggregate has no clear root — multiple objects are accessed directly
- Transaction spans multiple Aggregates (locking/consistency issues)
- Aggregate is so large it becomes a performance bottleneck

*Code examples -> `lang/<language>.md`*

---

## Factories (p. 98)

**Category**: Tactical
**Part**: II

### Definition

"Shift the responsibility for creating instances of complex objects and AGGREGATES to a separate object, which may itself have no responsibility in the domain model but is still part of the domain design." (p. 98) Factories encapsulate the knowledge needed to create an object or Aggregate in a valid state.

### When to Use

- Object creation is complex — many parts, invariants to enforce at birth
- Creating an Aggregate requires assembling multiple internal Entities and Value Objects
- You want to decouple the client from the concrete classes being instantiated
- Reconstituting objects from persistence (though Evans distinguishes creation from reconstitution)

### When NOT to Use / Tradeoffs

- Simple objects that can be created with a constructor — don't add a Factory for trivial construction
- If the class itself can enforce its own invariants at construction, a Factory adds unnecessary indirection
- Factories can hide what's actually being created, making debugging harder

### Key Rules

- **Each creation method is atomic** — it produces a fully formed, valid object or fails entirely
- **Factories enforce all invariants** — the product must be in a valid state; never create a half-built Aggregate
- **Abstract the concrete type if needed** — return interfaces/abstract types when the client shouldn't know the concrete class
- **Reconstitution is not creation** — reconstituting from persistence should not enforce the same rules as fresh creation (the data is already validated)

### Related Patterns

- **Aggregates** (p. 89) — Factories create entire Aggregates as a unit
- **Entities** (p. 65) — Factories assign identity during creation
- **Repositories** (p. 106) — Repositories use Factories internally for reconstitution from persistence

### Cross-references

- See also GoF: Factory Method (p. 107) — single method for creating objects, subclass decides the type
- See also GoF: Abstract Factory (p. 87) — family of related objects created together
- See also GoF: Builder (p. 97) — step-by-step construction for complex objects

### Antipattern signals `[interpretation]`

- Objects created in an invalid state, then "initialized" with a series of setters
- Factory returns partially constructed objects that require further setup
- Factory used for trivial objects that don't need it (over-engineering)

*Code examples -> `lang/<language>.md`*

---

## Repositories (p. 106)

**Category**: Tactical
**Part**: II

### Definition

"For each type of object that needs global access, create an object that can provide the illusion of an in-memory collection of all objects of that type. Set up access through a well-known global interface." (p. 106) Repositories act like an in-memory domain object collection, hiding all data access mechanics.

### When to Use

- You need to retrieve Aggregate Roots by identity or by criteria
- You want to decouple the domain model from persistence technology
- The domain layer should not know about SQL, ORM sessions, or API calls

### When NOT to Use / Tradeoffs

- Don't create Repositories for internal Aggregate objects — only for Aggregate Roots
- Repositories add a layer of abstraction; for simple apps, direct data access may suffice
- Complex query needs may strain the collection metaphor — consider CQRS for read-heavy scenarios `[interpretation]`

### Key Rules

- **One Repository per Aggregate Root** — never for internal Entities or Value Objects
- **Collection-like interface** — `add`, `remove`, `findById`, `findByCriteria` — clients should feel like they're working with an in-memory collection
- **Encapsulate query technology** — SQL, ORM, API calls stay inside the Repository implementation
- **Return fully constituted Aggregates** — use Factories internally for reconstitution
- **The interface is declared in the Domain layer** — the implementation lives in Infrastructure

### Related Patterns

- **Aggregates** (p. 89) — Repositories serve Aggregate Roots exclusively
- **Factories** (p. 98) — Repositories delegate reconstitution to Factories
- **Services** (p. 75) — Application Services use Repositories to load Aggregates
- **Specification** (p. 158) — can be passed to Repository query methods as criteria

### Cross-references

- See also PEAA: Repository (p. 322) — same concept; Fowler and Evans align here
- See also PEAA: Data Mapper (p. 165) — often used to implement a Repository
- See also PEAA: Query Object (p. 316) — alternative to Specification for complex queries

### Antipattern signals `[interpretation]`

- Repository exists for a non-root Entity
- Repository exposes ORM-specific types (sessions, query builders) to callers
- Repository has methods that return partial objects or raw data (DTOs leaking into the domain)
- Domain objects call Repository directly (should be orchestrated by Application Services)

*Code examples -> `lang/<language>.md`*

---

# Part III — Supple Design Patterns

---

## Specification (p. 158)

**Category**: Supple Design
**Part**: III

### Definition

"Create explicit predicate-like VALUE OBJECTS for specialized purposes. A SPECIFICATION is a predicate that determines if an object does or does not satisfy some criteria." (p. 158) Specifications encapsulate business rules as combinable, testable objects. Evans describes three uses: validation, selection (querying), and building-to-order (creation).

### When to Use

- A business rule needs to be evaluated against objects and is complex enough to extract
- The same rule is needed for validation, querying, and/or object creation
- Rules need to be composed (AND, OR, NOT) dynamically

### When NOT to Use / Tradeoffs

- Simple boolean checks that are used in only one place — inline logic is clearer
- Can over-abstract if every conditional becomes a Specification
- Translation of Specification to SQL for Repository queries can be tricky

### Key Rules

- **A Specification is a Value Object** — immutable, defined by its criteria
- **Combinable** — support AND, OR, NOT composition
- **Testable in isolation** — a Specification can be unit-tested without the objects it evaluates
- **Three uses**: validation (`isSatisfiedBy`), selection (query criteria), building-to-order (factory input)

### Related Patterns

- **Value Objects** (p. 70) — Specifications are Value Objects
- **Repositories** (p. 106) — Specifications can be passed to Repositories as query criteria
- **Entities** (p. 65) — Specifications evaluate Entities

### Cross-references

- See also GoF: Strategy (p. 315) — related; both encapsulate a policy, but Strategy is about interchangeable algorithms while Specification is about boolean predicates
- See also GoF: Interpreter (p. 243) — Specification composition resembles a simple expression interpreter

### Antipattern signals `[interpretation]`

- Complex boolean expressions duplicated across validation, querying, and creation logic
- Business rules hardcoded into Repository query methods instead of expressed as domain concepts

*Code examples -> `lang/<language>.md`*

---

## Intention-Revealing Interfaces (p. 172)

**Category**: Supple Design
**Part**: III

### Definition

"Name classes and operations to describe their effect and purpose, without reference to the means by which they do what they promise." (p. 172) The interface should express what the operation does in domain terms, not how it does it.

### When to Use

- Always — this is a universal design principle within DDD
- When naming any class, method, or parameter in the domain model

### When NOT to Use / Tradeoffs

- In infrastructure code, implementation-revealing names may be more appropriate (e.g., `SqlOrderRepository` is fine for the implementation class)
- Overly abstract names can obscure meaning if they don't map to the Ubiquitous Language

### Key Rules

- **Names come from the Ubiquitous Language** — if domain experts wouldn't recognize the name, it's wrong
- **Describe effect, not mechanism** — `route(Cargo)` not `findOptimalPathUsingDijkstra(Cargo)`
- **Method signatures are documentation** — parameter names, return types, and method names should make the contract obvious without reading the implementation
- **Type names describe domain concepts** — not technical roles (`DelinquentInvoice` not `InvoiceWrapper`)

### Related Patterns

- **Ubiquitous Language** (p. 25) — the source of all good names
- **Side-Effect-Free Functions** (p. 175) — interfaces that clearly communicate their side-effect profile
- **Assertions** (p. 179) — making contracts explicit beyond just naming

### Antipattern signals `[interpretation]`

- Methods named after algorithms or data structures (`processQueue`, `traverseTree`)
- Method names that require reading the implementation to understand
- Technical jargon in domain-layer interfaces

*Code examples -> `lang/<language>.md`*

---

## Side-Effect-Free Functions (p. 175)

**Category**: Supple Design
**Part**: III

### Definition

"Place as much of the logic of the program as possible into functions, operations that return results with no observable side effects." (p. 175) Separate commands (which change state) from queries (which return values). Functions that return values should not modify state.

### When to Use

- When designing operations on Value Objects (which should be inherently side-effect-free)
- When computing derived values from domain state
- When the result of a computation needs to be predictable and testable

### When NOT to Use / Tradeoffs

- Commands that change state are necessary — the point is to separate them from queries, not eliminate them
- Strict separation can sometimes feel like over-engineering for simple state changes

### Key Rules

- **Value Objects should have only side-effect-free functions** — they return new Value Objects, never mutate
- **Separate commands from queries** — a method should either change state OR return a value, not both
- **Computations should be safe to call multiple times** — no hidden state changes

### Related Patterns

- **Value Objects** (p. 70) — the natural home for side-effect-free functions
- **Assertions** (p. 179) — make explicit what side effects commands DO have
- **Intention-Revealing Interfaces** (p. 172) — naming should indicate whether a method is a command or query

### Cross-references

- See also CQS (Bertrand Meyer) — Command-Query Separation; Evans applies Meyer's principle at the domain-modeling level

### Antipattern signals `[interpretation]`

- Methods that both compute a result and modify state (query + command hybrid)
- Value Object methods that mutate internal state
- Unpredictable return values due to hidden state changes

*Code examples -> `lang/<language>.md`*

---

## Assertions (p. 179)

**Category**: Supple Design
**Part**: III

### Definition

"State post-conditions of operations and invariants of classes and AGGREGATES. If ASSERTIONS cannot be coded directly in your programming language, write automated unit tests for them." (p. 179) Assertions make the side effects of commands and the invariants of objects explicit.

### When to Use

- When a command modifies state — declare what will be true after it runs
- When an Aggregate has invariants that must always hold
- When the language supports contracts (preconditions, postconditions, invariants) or you can encode them in tests

### When NOT to Use / Tradeoffs

- Excessive assertions in production code can have performance costs
- Some invariants are better expressed as tests than runtime assertions

### Key Rules

- **Post-conditions**: State what will be true after an operation completes
- **Invariants**: State what is always true about an Aggregate
- **Use tests when the language lacks native contract support** — the assertions still exist, just expressed differently

### Related Patterns

- **Side-Effect-Free Functions** (p. 175) — queries need no assertions about state change; assertions are for commands
- **Aggregates** (p. 89) — Aggregate invariants are prime candidates for assertions
- **Intention-Revealing Interfaces** (p. 172) — naming plus assertions form a complete contract

### Antipattern signals `[interpretation]`

- Aggregate invariants that are never stated, tested, or enforced
- Commands with undocumented side effects that surprise callers
- "Works by convention" without any formal or testable statement of that convention

*Code examples -> `lang/<language>.md`*

---

## Conceptual Contours (p. 183)

**Category**: Supple Design
**Part**: III

### Definition

"Decompose design elements (operations, interfaces, classes, and AGGREGATES) into cohesive units, taking into consideration your intuition of the important divisions in the domain." (p. 183) Align the granularity of your design with the natural boundaries in the domain — not with arbitrary technical seams.

### When to Use

- When deciding how to decompose a large model into smaller pieces
- When refactoring reveals that current boundaries feel awkward or force changes to ripple unnecessarily
- When operations are either too fine-grained (requiring many calls) or too coarse-grained (doing unrelated things)

### When NOT to Use / Tradeoffs

- Don't chase "perfect" contours — they emerge through refactoring, not upfront design
- Different perspectives on the domain may suggest different contours; the Ubiquitous Language arbitrates

### Key Rules

- **Follow the domain's natural grain** — if a concept is stable in the domain, it should be a stable element in the design
- **Refactor toward deeper insight** — as understanding grows, adjust boundaries
- **High cohesion within contours** — things that change together should live together

### Related Patterns

- **Modules** (p. 79) — Conceptual Contours guide module boundaries
- **Aggregates** (p. 89) — Aggregate boundaries should follow conceptual contours
- **Standalone Classes** (p. 188) — the ideal contour: a class that stands on its own

### Antipattern signals `[interpretation]`

- Boundaries drawn by technical layer (all DTOs in one package, all validators in another)
- Changes to one domain concept ripple across many unrelated classes
- Operations that feel like they do "half a thing" or "two things"

*Code examples -> `lang/<language>.md`*

---

## Standalone Classes (p. 188)

**Category**: Supple Design
**Part**: III

### Definition

"Low coupling is fundamental to object design. When you can, go all the way. Eliminate all other concepts from the picture. Then the class will be completely self-contained and can be studied and understood alone." (p. 188) Reduce coupling ruthlessly until a class depends on nothing but the language primitives and its own Value Objects.

### When to Use

- When a class has dependencies that aren't truly essential to its domain concept
- When seeking maximum understandability and testability
- As a refactoring goal: after extracting Value Objects and simplifying, some classes achieve standalone status

### When NOT to Use / Tradeoffs

- Not every class can or should be standalone — the goal is to move toward it, not to force it
- Extracting all dependencies can sometimes fragment the model unnaturally

### Key Rules

- **Minimize dependencies** — every dependency is a cognitive cost
- **Value Objects are your friend** — they encapsulate complexity and reduce the host class's dependency count
- **A standalone class is the ideal unit of understanding** — it can be read, tested, and used without knowing anything else

### Related Patterns

- **Value Objects** (p. 70) — extracting Value Objects often makes the remaining class more standalone
- **Conceptual Contours** (p. 183) — good contours produce more standalone classes
- **Modules** (p. 79) — standalone classes simplify module coupling

### Antipattern signals `[interpretation]`

- Class imports half the domain model
- Understanding a class requires reading five other classes first
- High fan-out (class depends on many other types)

*Code examples -> `lang/<language>.md`*

---

## Closure of Operations (p. 190)

**Category**: Supple Design
**Part**: III

### Definition

"Where it fits, define an operation whose return type is the same as the type of its argument(s)." (p. 190) An operation that takes and returns the same type is "closed" under that type — like arithmetic operations on numbers. This enables chaining and composition.

### When to Use

- When operations on a Value Object naturally return the same type (Money + Money = Money)
- When you want fluent, composable APIs
- Specification composition (AND, OR, NOT) is a prime example

### When NOT to Use / Tradeoffs

- Don't force closure when the operation naturally returns a different type
- Not all domain operations fit this pattern — it's for cases where the domain has genuine algebraic structure

### Key Rules

- **Return the same type** — the operation takes type T and returns type T
- **Value Objects are ideal candidates** — immutable + closure = composable, algebraic behavior
- **Specification composition** is the canonical DDD example: `spec1.and(spec2)` returns a Specification

### Related Patterns

- **Value Objects** (p. 70) — primary home for closed operations
- **Specification** (p. 158) — AND/OR/NOT composition is closure of operations
- **Side-Effect-Free Functions** (p. 175) — closed operations should be side-effect-free

### Antipattern signals `[interpretation]`

- Breaking out of a Value Object's type system to compute, then wrapping back (e.g., `new Money(m1.amount + m2.amount, m1.currency)` instead of `m1.add(m2)`)
- Inability to compose domain rules because each operation returns a different type

*Code examples -> `lang/<language>.md`*

---

# Part IV — Strategic Design: Context Mapping

---

## Bounded Context (p. 238)

**Category**: Strategic — Context Mapping
**Part**: IV

### Definition

"Explicitly define the context within which a model applies. Explicitly set boundaries in terms of team organization, usage within specific parts of the application, and physical manifestations such as code bases and database schemas." (p. 238) A Bounded Context is the explicit boundary within which a domain model is defined, consistent, and internally unified.

### When to Use

- When different parts of the system use the same term with different meanings
- When separate teams own separate parts of the model
- When a single unified model for the entire enterprise would be impractical or harmful

### Key Decision

Where does one model end and another begin? A Bounded Context answers this by drawing an explicit boundary — linguistic, organizational, and technical.

### Related Patterns

- **Ubiquitous Language** (p. 25) — the language is ubiquitous *within* a Bounded Context, not across the whole enterprise
- **Context Map** (p. 244) — shows the relationships between Bounded Contexts
- **Continuous Integration** (p. 242) — keeps the model unified within a single Bounded Context
- **Anticorruption Layer** (p. 257) — protects one context's model from another's
- **Modules** (p. 79) — organize within a Bounded Context; Bounded Contexts are a higher-level boundary

---

## Continuous Integration (p. 242)

**Category**: Strategic — Context Mapping
**Part**: IV

### Definition

"Institute a process of merging all code and other implementation artifacts frequently, with automated tests to flag fragmentation quickly. Relentlessly exercise the UBIQUITOUS LANGUAGE to hammer out a shared view of the model as the concepts evolve in different people's heads." (p. 242) This is NOT CI/CD in the DevOps sense — it's about keeping the domain model unified within a Bounded Context.

### When to Use

- When multiple developers work within the same Bounded Context
- When the model is at risk of fragmenting into inconsistent sub-models

### Key Decision

Is the cost of keeping the model unified (frequent merges, conversations, tests) worth the benefit? For large teams on a single context, it may be better to split into separate Bounded Contexts.

### Related Patterns

- **Bounded Context** (p. 238) — Continuous Integration operates within a single Bounded Context
- **Context Map** (p. 244) — when CI becomes too expensive, splitting contexts may be the answer

---

## Context Map (p. 244)

**Category**: Strategic — Context Mapping
**Part**: IV

### Definition

"Identify each model in play on the project and define its BOUNDED CONTEXT... Find the points of contact between models; for each, note what kind of translation or sharing happens." (p. 244) A Context Map is the global view of all Bounded Contexts and the relationships between them.

### When to Use

- Always, in any system with more than one Bounded Context
- When you need to understand how different parts of the system (or organization) relate
- As a communication tool for the team and stakeholders

### Key Decision

What is the actual (not aspirational) relationship between contexts? The Context Map documents reality — including messy, political, or legacy relationships.

### Related Patterns

- **Bounded Context** (p. 238) — the contexts being mapped
- **Shared Kernel** (p. 251) — one possible relationship between contexts
- **Customer/Supplier** (p. 252) — one possible relationship
- **Conformist** (p. 255) — one possible relationship
- **Anticorruption Layer** (p. 257) — one possible relationship
- **Separate Ways** (p. 261) — one possible relationship
- **Open Host Service** (p. 263) — one possible relationship
- **Published Language** (p. 264) — one possible relationship

---

## Shared Kernel (p. 251)

**Category**: Strategic — Context Mapping
**Part**: IV

### Definition

"Designate some subset of the domain model that the two teams agree to share. This includes code and the database schema... This shared kernel has a special status within each context. It can't be changed unilaterally." (p. 251)

### When to Use

- Two teams have overlapping models and want to avoid duplication
- The shared part is small and stable enough that joint ownership is practical
- Teams have a close working relationship and can coordinate changes

### Key Decision

What subset of the model is worth the coordination cost of sharing? The shared kernel should be small, well-defined, and covered by integration tests owned by both teams.

### Related Patterns

- **Bounded Context** (p. 238) — the Shared Kernel crosses two contexts
- **Separate Ways** (p. 261) — the alternative: don't share at all
- **Continuous Integration** (p. 242) — the Shared Kernel needs its own CI process

---

## Customer/Supplier (p. 252)

**Category**: Strategic — Context Mapping
**Part**: IV

### Definition

"Establish a clear customer/supplier relationship between the two teams. In planning sessions, make the downstream team play the customer role to the upstream team." (p. 252) The upstream team's priorities are influenced by the downstream team's needs.

### When to Use

- One team (upstream) provides data or services that another team (downstream) depends on
- The downstream team has political or organizational leverage to negotiate interfaces
- Both teams are willing to collaborate on interface evolution

### Key Decision

Does the downstream team have enough influence to shape the upstream team's priorities? If yes, Customer/Supplier. If no, consider Conformist or Anticorruption Layer.

### Related Patterns

- **Conformist** (p. 255) — when the downstream team has no negotiation power
- **Anticorruption Layer** (p. 257) — downstream may add an ACL even in a Customer/Supplier relationship
- **Context Map** (p. 244) — documents this relationship

---

## Conformist (p. 255)

**Category**: Strategic — Context Mapping
**Part**: IV

### Definition

"When two development teams have an upstream/downstream relationship in which the upstream team has no motivation to provide for the downstream team's needs, the downstream team is helpless. The downstream team must slavishly conform to the upstream model." (p. 255)

### When to Use

- The upstream team won't accommodate your needs (different company, different priorities, legacy system)
- The upstream model is good enough that conforming to it is acceptable
- The cost of building an Anticorruption Layer exceeds the cost of conforming

### Key Decision

Is the upstream model acceptable enough to adopt as-is? If the upstream model would corrupt your domain, use an Anticorruption Layer instead.

### Related Patterns

- **Customer/Supplier** (p. 252) — the better alternative when you have negotiation power
- **Anticorruption Layer** (p. 257) — the alternative when conforming would damage your model
- **Context Map** (p. 244) — documents this relationship

---

## Anticorruption Layer (p. 257)

**Category**: Strategic — Context Mapping
**Part**: IV

### Definition

"Create an isolating layer to provide clients with functionality in terms of their own domain model. The layer talks to the other system through its existing interface, requiring little or no modification to the other system." (p. 257) An ACL translates between your model and a foreign model, protecting your domain from external influence.

### When to Use

- Integrating with a legacy system whose model would corrupt yours
- Consuming an external API whose data model doesn't match your domain
- When Conformist would force unacceptable compromises on your model

### Key Decision

Is the translation cost of the ACL justified by the protection it provides to your model? For temporary integrations or acceptable foreign models, Conformist may suffice.

### Related Patterns

- **Bounded Context** (p. 238) — the ACL sits at the boundary between contexts
- **Conformist** (p. 255) — the simpler alternative when the foreign model is acceptable
- **Published Language** (p. 264) — if the foreign system uses a Published Language, translation is easier

### Cross-references

- See also GoF: Adapter (p. 139) — ACL often uses Adapter to translate interfaces
- See also GoF: Facade (p. 185) — ACL often uses Facade to simplify a complex foreign interface
- The ACL internally composes Adapters, Facades, and translators into a cohesive layer

---

## Separate Ways (p. 261)

**Category**: Strategic — Context Mapping
**Part**: IV

### Definition

"Declare a BOUNDED CONTEXT to have no connection to the others at all, allowing developers to find simple, specialized solutions within this small scope." (p. 261) Two contexts are completely independent — no integration, no shared model, no translation.

### When to Use

- Integration cost exceeds the value of sharing
- The contexts genuinely have no meaningful overlap
- Teams want maximum autonomy

### Key Decision

Is the duplication cost of going separate ways less than the integration cost? Sometimes the best integration is no integration.

### Related Patterns

- **Shared Kernel** (p. 251) — the opposite approach: share a subset
- **Context Map** (p. 244) — documents the explicit decision not to integrate

---

## Open Host Service (p. 263)

**Category**: Strategic — Context Mapping
**Part**: IV

### Definition

"Define a protocol that gives access to your subsystem as a set of SERVICES. Open the protocol so that all who need to integrate with you can use it." (p. 263) Rather than building point-to-point translations for each consumer, provide a well-defined API.

### When to Use

- Multiple consumers need access to your subsystem
- Building custom translations for each consumer is impractical
- Your subsystem's model is stable enough to define a public protocol

### Key Decision

What protocol best serves the majority of consumers without distorting your internal model? The Open Host Service may need to differ from your internal model.

### Related Patterns

- **Published Language** (p. 264) — often used together; OHS defines the access protocol, Published Language defines the interchange format
- **Anticorruption Layer** (p. 257) — consumers may still add their own ACL on top of an OHS
- **Bounded Context** (p. 238) — the OHS exposes one context to others

---

## Published Language (p. 264)

**Category**: Strategic — Context Mapping
**Part**: IV

### Definition

"Use a well-documented shared language that can express the necessary domain information as a common medium of communication, translating as necessary into and out of that language." (p. 264) A Published Language is a well-defined, documented interchange format (e.g., iCalendar for scheduling, SWIFT for financial messaging).

### When to Use

- Multiple Bounded Contexts need to exchange information
- An industry standard exists for the domain
- You want to decouple contexts from each other's internal models

### Key Decision

Should you adopt an existing standard or create a custom interchange format? Industry standards carry adoption benefits; custom formats offer precision.

### Related Patterns

- **Open Host Service** (p. 263) — the Published Language is often the format used by an OHS
- **Anticorruption Layer** (p. 257) — translates between the Published Language and your internal model

---

# Part IV — Strategic Design: Distillation

---

## Core Domain (p. 281)

**Category**: Strategic — Distillation
**Part**: IV

### Definition

"Boil the model down. Find the CORE DOMAIN and provide a means of easily distinguishing it from the mass of supporting model and code, and make the CORE the most relevant." (p. 281) The Core Domain is the most valuable, differentiating part of the system — the reason the software exists.

### When to Use

- Always — every DDD project should identify its Core Domain
- When allocating team talent and development resources
- When deciding what to build vs. buy vs. outsource

### Key Decision

What makes this system unique and valuable? Everything else is supporting or generic. Invest the best developers and the most design effort in the Core Domain.

### Related Patterns

- **Generic Subdomains** (p. 285) — the non-core parts; buy, simplify, or outsource them
- **Domain Vision Statement** (p. 290) — articulates the Core Domain's value
- **Highlighted Core** (p. 292) — makes the Core visible in the codebase
- **Segregated Core** (p. 298) — physically separates Core from non-core
- **Abstract Core** (p. 305) — expresses the Core's essential concepts abstractly

---

## Generic Subdomains (p. 285)

**Category**: Strategic — Distillation
**Part**: IV

### Definition

"Identify cohesive subdomains that are not the motivation for your project. Factor out generic models of these subdomains and place them in separate MODULES. Leave no trace of your specialties in them." (p. 285) Generic Subdomains are necessary but not differentiating — authentication, notification, money handling, etc.

### When to Use

- A part of the model is well-understood, not unique to your business
- Off-the-shelf solutions or libraries exist
- Investing top talent here yields poor ROI compared to the Core Domain

### Key Decision

Build, buy, or outsource? For generic subdomains, Evans advises against investing your best developers — use existing solutions, hire junior developers, or outsource.

### Related Patterns

- **Core Domain** (p. 281) — everything that isn't Core is Generic or Supporting
- **Cohesive Mechanisms** (p. 295) — computation-heavy generic functionality
- **Segregated Core** (p. 298) — physically separate generic from core code

---

## Domain Vision Statement (p. 290)

**Category**: Strategic — Distillation
**Part**: IV

### Definition

"Write a short description (about one page) of the CORE DOMAIN and the value it will bring, the 'value proposition.' Ignore those aspects that do not distinguish this domain model from others." (p. 290)

### When to Use

- At project inception to align stakeholders
- When the team loses sight of what makes the project valuable
- When distinguishing Core from Generic needs a strategic anchor

### Key Decision

Can you articulate in one page what makes your domain model uniquely valuable? If not, the Core Domain isn't clear enough yet.

### Related Patterns

- **Core Domain** (p. 281) — the Vision Statement describes the Core Domain
- **Highlighted Core** (p. 292) — the Statement guides what to highlight

---

## Highlighted Core (p. 292)

**Category**: Strategic — Distillation
**Part**: IV

### Definition

"Write a very brief document (three to seven pages) that describes the CORE DOMAIN and the primary interactions among CORE elements." (p. 292) Alternatively, flag the CORE DOMAIN within the primary repository of the model — mark core elements so they stand out. Evans offers two forms: a Distillation Document and flagging in code.

### When to Use

- When the Core Domain exists but isn't obvious to developers reading the code
- When new team members struggle to distinguish core from supporting code
- When the codebase is large and the Core Domain is buried

### Key Decision

How do you make the Core visible? Through documentation (Distillation Document), code annotations, or module structure.

### Related Patterns

- **Core Domain** (p. 281) — what's being highlighted
- **Domain Vision Statement** (p. 290) — strategic context for the highlights
- **Segregated Core** (p. 298) — a stronger form: physically separate, not just highlighted

---

## Cohesive Mechanisms (p. 295)

**Category**: Strategic — Distillation
**Part**: IV

### Definition

"Partition a conceptually COHESIVE MECHANISM into a separate lightweight framework. Particularly watch for formalisms or well-documented categories of algorithms. Expose the capabilities of the framework with an INTENTION-REVEALING INTERFACE." (p. 295) Extract complex computations into a separate module so the domain model can use them without being burdened by their complexity.

### When to Use

- Complex algorithms or computations clutter the domain model
- A well-known formalism (graph traversal, rule engines, scheduling algorithms) can be encapsulated
- The mechanism is reusable across multiple domain contexts

### Key Decision

Is the computation complex enough to warrant extraction? A Cohesive Mechanism should simplify the domain model by hiding computational complexity behind a clean interface.

### Related Patterns

- **Core Domain** (p. 281) — Cohesive Mechanisms clean up the Core by extracting non-core computation
- **Intention-Revealing Interfaces** (p. 172) — the mechanism's API should be intention-revealing
- **Generic Subdomains** (p. 285) — related but different; Generic Subdomains are alternate domain models, Cohesive Mechanisms are computation frameworks

---

## Segregated Core (p. 298)

**Category**: Strategic — Distillation
**Part**: IV

### Definition

"Refactor the model to separate the CORE concepts from supporting players (including ill-defined ones) and strengthen the cohesion of the CORE while reducing its coupling to other code." (p. 298) Physically separate the Core Domain into its own module or package.

### When to Use

- The Core Domain is entangled with generic or supporting code
- Highlighted Core isn't enough — developers still inadvertently couple to non-core elements
- The team needs enforced separation, not just documentation

### Key Decision

Is the separation worth the refactoring cost? Segregation requires moving code, managing new dependencies, and potentially breaking existing abstractions.

### Related Patterns

- **Core Domain** (p. 281) — what's being segregated
- **Highlighted Core** (p. 292) — a lighter alternative (document vs. enforce)
- **Modules** (p. 79) — Segregated Core uses Modules to enforce boundaries
- **Abstract Core** (p. 305) — the next step: abstract the segregated core

---

## Abstract Core (p. 305)

**Category**: Strategic — Distillation
**Part**: IV

### Definition

"Even the CORE DOMAIN model usually has so much detail that communicating the big picture can be difficult. Identify the most fundamental concepts in the model and factor them into distinct classes, abstract classes, or interfaces." (p. 305) Express the Core Domain's essential concepts in an abstract model that captures the big picture.

### When to Use

- The Core Domain is well-segregated but still complex
- You need to communicate the essence of the model at a higher level
- Polymorphism across Core concepts would benefit from shared abstractions

### Key Decision

What are the truly fundamental concepts that define the Core? Abstract Core captures the skeleton — the concepts that would survive even radical model changes.

### Related Patterns

- **Segregated Core** (p. 298) — Abstract Core builds on a previously segregated core
- **Core Domain** (p. 281) — the Abstract Core is the purest expression of the Core Domain
- **Pluggable Component Framework** (p. 333) — uses the Abstract Core's interfaces as plug points

---

# Part IV — Strategic Design: Large-Scale Structure

---

## Evolving Order (p. 310)

**Category**: Strategic — Large-Scale Structure
**Part**: IV

### Definition

"Let this conceptual large-scale structure evolve with the application, possibly changing to a completely different type of structure along the way. Don't overconstrain the detailed design and model decisions that must be made with detailed knowledge." (p. 310) Let large-scale structure emerge gradually; don't impose it upfront.

### When to Use

- When the system grows beyond what can be understood through individual Bounded Contexts
- When the team needs a unifying structural concept, but the right structure isn't obvious yet
- As the default philosophy for all large-scale structure decisions

### Key Decision

When is the right time to adopt a large-scale structure? Too early constrains the model; too late leaves the system incoherent. Evolving Order says: let it emerge.

### Related Patterns

- **All Large-Scale Structure patterns** — Evolving Order is the meta-principle governing when and how to adopt them
- **System Metaphor** (p. 312) — one of the structures that might emerge
- **Responsibility Layers** (p. 314) — a commonly useful emergent structure

---

## System Metaphor (p. 312)

**Category**: Strategic — Large-Scale Structure
**Part**: IV

### Definition

"When a concrete analogy to the system emerges that captures the imagination of team members and seems to lead thinking in a useful direction, adopt it as a large-scale structure." (p. 312) A System Metaphor is a single overarching analogy that gives coherence to the whole system's design.

### When to Use

- When a natural metaphor emerges that genuinely helps the team reason about the system
- When the metaphor is rich enough to guide decisions without being misleading
- Rare — Evans warns that forced metaphors are worse than none

### Key Decision

Does the metaphor illuminate or mislead? A good System Metaphor makes design decisions obvious. A bad one creates confusion when the domain and metaphor diverge.

### Related Patterns

- **Evolving Order** (p. 310) — the metaphor should emerge, not be imposed
- **Ubiquitous Language** (p. 25) — the metaphor enriches the language

---

## Responsibility Layers (p. 314)

**Category**: Strategic — Large-Scale Structure
**Part**: IV

### Definition

"Look at the conceptual dependencies between the objects and note any natural strata in the domain. Cast your model so that the responsibilities of each domain object, AGGREGATE, and MODULE fit neatly within the responsibility of one layer." (p. 314) Organize the domain model itself into layers by broad responsibility — such as policy, operations, and capability.

### When to Use

- The domain has natural stratification (e.g., regulatory policy sits above operational processes, which sit above resource capabilities)
- The system is large enough that flat organization is confusing
- Different parts of the model change at different rates and for different reasons

### Key Decision

What are the natural responsibility layers in this domain? Common patterns include: Policy (rules/constraints), Operations (business processes), Capability (what the system can do), and Decision Support.

### Related Patterns

- **Layered Architecture** (p. 52) — technical layers (UI, App, Domain, Infra) vs. domain responsibility layers
- **Modules** (p. 79) — Responsibility Layers guide module organization within the domain
- **Evolving Order** (p. 310) — layers should emerge from domain understanding

---

## Knowledge Level (p. 326)

**Category**: Strategic — Large-Scale Structure
**Part**: IV

### Definition

"Create a distinct set of objects that can be used to describe and constrain the structure and behavior of the basic model." (p. 326) Separate the configurable rules and structure (the Knowledge Level) from the operational objects they constrain (the Operations Level). The Knowledge Level defines what the Operations Level can do.

### When to Use

- The domain has user-configurable rules or structures (e.g., configurable product types, workflow definitions, pricing rules)
- The same operational code must behave differently based on business configuration
- Without separation, changes to rules require code changes

### Key Decision

Should business rules be hardcoded or configurable? Knowledge Level creates a meta-model — objects that describe other objects' structure and constraints.

### Related Patterns

- **Specification** (p. 158) — Specifications can be part of the Knowledge Level
- **Responsibility Layers** (p. 314) — Knowledge Level can be seen as a special responsibility layer

### Cross-references

- See also GoF: Strategy (p. 315) — related; Strategy encapsulates interchangeable algorithms, Knowledge Level encapsulates configurable rules
- See also "Type Object" pattern (Johnson & Woolf) — Knowledge Level generalizes this idea

---

## Pluggable Component Framework (p. 333)

**Category**: Strategic — Large-Scale Structure
**Part**: IV

### Definition

"Distill an ABSTRACT CORE of interfaces and interactions and create a framework that allows diverse implementations of those interfaces to be freely substituted." (p. 333) Establish interfaces and an assembly mechanism so that components conforming to the Abstract Core can be plugged in and swapped freely.

### When to Use

- The system needs to support multiple implementations of the same abstract concepts
- Third parties or separate teams need to extend the system without modifying the core
- The Abstract Core is mature and stable enough to serve as a plug-point contract

### Key Decision

Is the Abstract Core stable enough to build a framework around? A Pluggable Component Framework that changes frequently defeats its purpose.

### Related Patterns

- **Abstract Core** (p. 305) — provides the interfaces that components plug into
- **Bounded Context** (p. 238) — each pluggable component may be its own Bounded Context
- **Open Host Service** (p. 263) — the framework's plug-point API is a form of Open Host Service

---

# Cross-Reference Summary

| DDD Concept | PEAA Equivalent | GoF Equivalent |
|---|---|---|
| Value Object (p. 70) | Value Object (p. 486) | — |
| Repository (p. 106) | Repository (p. 322) | — |
| Service (p. 75) | Service Layer (p. 133) — **different!** Evans = domain service; Fowler = app boundary | — |
| Factory (p. 98) | — | Factory Method (p. 107), Abstract Factory (p. 87) |
| Layered Architecture (p. 52) | Fowler's layering (Ch. 1) | — |
| Entity (p. 65) | Domain Model objects (p. 116) | — |
| Specification (p. 158) | — | Strategy (p. 315) (related, not equivalent) |
| Anticorruption Layer (p. 257) | — | Adapter (p. 139), Facade (p. 185) |
| Knowledge Level (p. 326) | — | Strategy (p. 315) (related) |
