# PEAA Decision Trees

**Purpose**: Structured guidance for choosing between competing patterns when multiple
options exist. Used by the `peaa-advisor` skill.

**Source**: Derived from Fowler's "Making a Choice" sections and narrative chapters.
Book citations given for each decision. `[interpretation]` marks guidance not explicitly
stated by Fowler.

---

## Decision Tree Index

1. [Domain Logic: Which pattern?](#1-domain-logic-which-pattern)
2. [Data Source: Which pattern?](#2-data-source-which-pattern)
3. [ORM Inheritance: Which mapping?](#3-orm-inheritance-which-mapping)
4. [Web Presentation: Controller strategy?](#4-web-presentation-controller-strategy)
5. [Web Presentation: View rendering?](#5-web-presentation-view-rendering)
6. [Concurrency: Which lock?](#6-concurrency-which-lock)
7. [Session State: Where to store it?](#7-session-state-where-to-store-it)
8. [Distribution: When and how?](#8-distribution-when-and-how)
9. [Service Layer: Do I need one?](#9-service-layer-do-i-need-one)
10. [Testing: Isolating external dependencies?](#10-testing-isolating-external-dependencies)

---

## 1. Domain Logic: Which pattern?

**Source**: Ch. 2, p. 27–45; Fig. 2.4 (complexity vs. effort curve)

Fowler's primary axis: **complexity of domain logic**.

```
Is domain logic simple and unlikely to grow?
├── YES → Transaction Script (p. 110)
│         Easy to understand, works well with Row/Table Data Gateway.
│         Stop here unless complexity increases.
│
└── NO → Is your environment centered on Record Sets / DataSets? (.NET/COM)
          ├── YES → Table Module (p. 125)
          │         Works naturally with Record Set (p. 508).
          │         "The attractiveness of a Table Module depends very much on
          │          the support for a common Record Set structure" (p. 42).
          │
          └── NO → Domain Model (p. 116)
                    OO approach; handles complexity, inheritance, strategies.
                    Requires investment in data source layer (usually Data Mapper).
                    "Once you've made the shift, you'll find you prefer a Domain Model
                     even in fairly simple cases" (p. 34).
```

**Fowler's complexity heuristic** (p. 40):
- Simple domain, low duplication → Transaction Script
- Moderate domain, some shared logic → either (judgment call)
- Complex domain, rich behavior, polymorphism needed → Domain Model

**Service Layer on top?** See Decision Tree 9.

**Key warning**: Do not start with Domain Model if your team is unfamiliar with OO design.
The upfront cost is real: "Developing a good Domain Model for a complex business problem
is difficult but wonderfully satisfying" (Preface).

---

## 2. Data Source: Which pattern?

**Source**: Ch. 3, p. 47–84; architectural pattern choice discussion

First, choose based on your Domain Logic pattern selection:

```
What domain logic pattern are you using?
│
├── Transaction Script (p. 110)
│   └── Choose data source based on result shape needed:
│       ├── Need per-row objects? → Row Data Gateway (p. 152)
│       └── Need table-wide access / Record Sets? → Table Data Gateway (p. 144)
│
├── Table Module (p. 125)
│   └── Table Data Gateway (p. 144) — almost always
│       "I can't really imagine any other database-mapping approach for Table Module" (p. 150)
│
└── Domain Model (p. 116)
    └── Is domain model simple, close to table structure?
        ├── YES → Active Record (p. 160)
        │         Easy, couples domain to schema — OK if model stays simple.
        │         "If the domain logic is simple and you have a close correspondence
        │          between classes and tables, Active Record is the simple way to go" (p. 164)
        │
        └── NO → Data Mapper (p. 165)
                  Complete isolation between domain and database.
                  "The most complicated... but its benefit is complete isolation" (p. 165).
                  Add Unit of Work (p. 184) + Identity Map (p. 195).
```

**Secondary question: Do you need a collection-like query interface?**
```
Do you need to query domain objects as if from a collection,
or swap between DB and in-memory implementations (e.g., for tests)?
└── YES → Repository (p. 322) on top of Data Mapper
           "Acts like an in-memory domain object collection" (p. 322)
```

**Summary table**:
| Domain logic pattern | Typical data source pattern |
|----------------------|-----------------------------|
| Transaction Script | Row Data Gateway or Table Data Gateway |
| Table Module | Table Data Gateway |
| Domain Model (simple) | Active Record |
| Domain Model (complex) | Data Mapper + Unit of Work + Identity Map |
| Any (with query abstraction) | + Repository |

---

## 3. ORM Inheritance: Which mapping?

**Source**: Ch. 12, p. 278–305; and Fowler's inline comparisons between the three strategies

```
Do you have an inheritance hierarchy to persist?
│
├── How many subclasses, and how different are their fields?
│
├── FEW subclasses, SMALL field differences → Single Table Inheritance (p. 278)
│   All classes in one table with a type discriminator column.
│   PRO: No joins, simple queries.
│   CON: Many nullable columns, table grows wide as hierarchy grows.
│   "Works best when you don't have too many specialized fields" [interpretation]
│
├── MODERATE hierarchy, want normalization → Class Table Inheritance (p. 285)
│   One table per class in the hierarchy, joined at load time.
│   PRO: Normalized, no wasted columns.
│   CON: Joins required on every load; complex to implement.
│   "Many tables to deal with, complex queries" (p. 285) [interpretation]
│
├── DEEP hierarchy, want autonomy per concrete class → Concrete Table Inheritance (p. 293)
│   One table per concrete class only; base class has no table.
│   PRO: Each table is self-contained, no joins for concrete types.
│   CON: Base class queries require UNION across all tables.
│        Changing base class schema = many table changes.
│   "Avoids joins but makes it hard to handle the superclass" (p. 293) [interpretation]
│
└── MIXED strategy needed → Inheritance Mappers (p. 302)
    Supertype mapper + subtype mapper structure.
    Use when Single/Class/Concrete each fits a different part of the hierarchy.
```

**Quick rule of thumb** `[interpretation]`:
- Default: **Single Table Inheritance** — simplest, works for most cases
- If nullable columns become unacceptable: **Class Table Inheritance**
- If queries must stay on a single table per type: **Concrete Table Inheritance**

---

## 4. Web Presentation: Controller strategy?

**Source**: Ch. 4, p. 69–76; Ch. 14, p. 333–349

```
How complex is your request handling and navigation flow?
│
├── SIMPLE: Each page/action has independent logic
│   No shared pre-processing, no complex workflow
│   └── Page Controller (p. 333)
│       One controller object per page or action.
│       "Simpler to understand and maintain" for simple sites.
│       FastAPI route functions (`@router.get`, `@router.post`) = Page Controller; Flask route handlers = Page Controller.
│
└── COMPLEX: Shared pre-processing, security, logging, or workflow
    ├── Many pages share authentication / request parsing logic
    ├── Navigation flow is controlled centrally
    └── Front Controller (p. 344)
        Single entry point handles all requests.
        Delegates to Command objects per action.
        FastAPI's APIRouter + app.add_middleware chain = Front Controller.
        "A single controller handles all requests; easier to add interceptors" (p. 344)
```

**Do I need an Application Controller?**
```
Is navigation non-trivial — screens must appear in sequence,
or the same request leads to different next screens depending on state?
└── YES → Application Controller (p. 379)
           Centralizes screen flow and navigation decisions.
           Separate from the input controller — handles "what comes next", not "what to do now".
```

---

## 5. Web Presentation: View rendering?

**Source**: Ch. 4, p. 69–76; Ch. 14, p. 350–387

```
How does the view generate HTML?
│
├── Embed logic in HTML templates (HTML-first)?
│   └── Template View (p. 350)
│       HTML with embedded expressions/tags (Jinja2 via `fastapi.templating.Jinja2Templates`, JSP). Note: FastAPI primarily returns JSON — Template View is relevant only when serving HTML.
│       PRO: Designers can edit HTML directly.
│       CON: Easy to embed too much logic in the template.
│       "The most common approach for Web presentation" [interpretation]
│
├── Transform domain data using a program (logic-first)?
│   └── Transform View (p. 361)
│       Program iterates domain data and outputs HTML element by element.
│       PRO: Explicit, testable.
│       CON: Less designer-friendly.
│       XSLT is the classic example.
│
└── Need a single look-and-feel across many screens?
    └── Two Step View (p. 365)
        Step 1: Domain data → logical presentation structure (screen-specific)
        Step 2: Logical structure → HTML (shared, site-wide)
        PRO: Change site look-and-feel in one place.
        CON: More complex; two transformation stages.
        "Particularly useful for multi-look sites or when you want to change
         the site's look globally" (p. 365) [interpretation]
```

---

## 6. Concurrency: Which lock?

**Source**: Ch. 5, p. 77–88; Ch. 16, p. 416–455

First question: **Is the data accessed offline (across HTTP requests)?**
- Offline = user loads data in request 1, edits it, saves in request 2 (session-spanning)
- Online = data locked within a single database transaction (use database transaction, not these patterns)

```
For OFFLINE concurrency (session-spanning):
│
├── How likely are conflicts between concurrent users?
│
├── LOW conflict probability (most users work on different records)
│   └── Optimistic Offline Lock (p. 416)
│       Add a version number column. On save: UPDATE WHERE id=? AND version=?
│       If 0 rows updated → conflict detected → show user a merge/retry screen.
│       "The most common choice for business applications" [interpretation]
│       Fowler: "detect a conflict and rolling back the transaction" (p. 416)
│
├── HIGH conflict probability (users frequently edit the same records)
│   └── Pessimistic Offline Lock (p. 426)
│       Acquire an exclusive lock before editing. Other users get "locked by X" message.
│       PRO: User never loses work silently.
│       CON: Users can starve each other; locks must be released on timeout/logout.
│
├── Need to lock an entire AGGREGATE (not just one record)?
│   └── Coarse-Grained Lock (p. 438)
│       Lock the root of the aggregate; all members share one version/lock.
│       Use when locking Order must also lock its OrderLines.
│
└── Want to make lock acquisition AUTOMATIC (prevent developer from forgetting)?
    └── Implicit Lock (p. 449)
        Framework (mapper or layer supertype) acquires lock on load/save.
        "Allows framework or layer supertype code to acquire offline locks" (p. 449)
        Use on top of Optimistic or Pessimistic Lock to prevent omission.
```

**Decision matrix**:
| Conflict rate | Aggregate? | Auto-enforce? | Pattern |
|--------------|------------|---------------|---------|
| Low | No | No | Optimistic Offline Lock |
| Low | Yes | No | Coarse-Grained Lock (optimistic) |
| Any | Any | Yes | + Implicit Lock on top |
| High | No | No | Pessimistic Offline Lock |
| High | Yes | No | Coarse-Grained Lock (pessimistic) |

---

## 7. Session State: Where to store it?

**Source**: Ch. 6, p. 87–88; Ch. 17, p. 456–465

```
How much state must survive between requests?
│
├── MINIMAL state (just IDs, form inputs for a short wizard)
│   └── Client Session State (p. 456)
│       Store in URL parameters, hidden form fields, or cookies.
│       PRO: Servers stay completely stateless — easy to scale horizontally.
│       CON: Limited by cookie size / URL length; data visible to client.
│       "The easiest approach for supporting stateless servers" (p. 456) [interpretation]
│
├── MODERATE state (complex wizard, multi-step checkout)
│   └── Server Session State (p. 458)
│       Serialize session object on server; store session ID in cookie.
│       PRO: Can store arbitrary objects; not limited by client constraints.
│       CON: Session affinity required (sticky sessions) unless externalized to Redis/Memcached.
│
└── LARGE or DURABLE state (must survive server restart, long-running workflows)
    └── Database Session State (p. 462)
        Persist session to database rows.
        PRO: Works with any number of servers; sessions survive restarts.
        CON: More DB load; cleanup of stale sessions needed.
        "Supports clustering and failover without sticky sessions" [interpretation]
```

**Fowler's preference**: "The value of statelessness" (Ch. 6) — aim for as little session state
as possible. Each type of session state adds complexity and scaling difficulty.

---

## 8. Distribution: When and how?

**Source**: Ch. 7, p. 89–102; Ch. 15, p. 388–415

```
Do you NEED to distribute at all?
│
Fowler's First Law: "Don't distribute your objects" (p. 89).
│
├── Can you co-locate all layers on one server?
│   └── YES → Do that. No distribution patterns needed.
│              "Once you have to distribute, you pay a significant cost" (p. 89)
│
└── NO — distribution is forced (separate teams, separate deployment, scalability)
    │
    ├── The remote boundary is INTERNAL (calling your own services)
    │   └── Remote Facade (p. 388)
    │       Coarse-grained facade over fine-grained domain objects.
    │       "Provides a coarse-grained facade on fine-grained objects to
    │        improve efficiency over a network" (p. 388)
    │
    └── Need to transfer DATA across the boundary
        └── Data Transfer Object (p. 401)
            Assemble all needed data server-side into one object.
            Serialize once, transfer once, deserialize once.
            "Reduces the number of method calls" (p. 401)
```

**Key rule** (Fowler, p. 90): The interface to a remote service must be **coarse-grained**.
Never expose fine-grained domain object methods across a network boundary.

---

## 9. Service Layer: Do I need one?

**Source**: Ch. 2, p. 43–45; Ch. 9, p. 133–162

```
Does your application have more than one kind of client?
(Web UI + batch job + API + integration gateway)
│
├── NO — only one client type
│   └── Probably don't need a Service Layer yet.
│       "You probably don't need a Service Layer if your application's business
│        logic will only have one kind of client" (p. 162)
│       Page Controllers can control transactions directly.
│
└── YES — multiple client types, or you anticipate them
    └── Add Service Layer (p. 133)
        Defines the application boundary.
        Each service method = one use case = one transaction boundary.
        │
        ├── How thick should it be?
        │   Fowler: "thinnest Service Layer you can" (p. 162)
        │   └── Thin (domain facade): Service methods delegate immediately to Domain Model
        │   └── Thick (operation script): Service methods script the application logic,
        │         delegate to domain objects only for calculations
        │
        └── Do remote callers need access?
            └── Add Remote Facade (p. 388) on top — don't make Service Layer coarse-grained itself
```

---

## 10. Testing: Isolating external dependencies?

**Source**: Ch. 18 — Service Stub (p. 504), Gateway (p. 466), Separated Interface (p. 476)

```
Does your code call an external system that is slow, unreliable, or expensive in tests?
(Payment gateway, email service, external API, legacy system)
│
├── Step 1: Define interface via Separated Interface (p. 476)
│   Put the interface in a different package/module from the implementation.
│   Domain/service layer depends only on the interface, not the real implementation.
│
├── Step 2: Wrap the real system with Gateway (p. 466)
│   One class encapsulates all calls to the external system.
│   Translates external errors to application exceptions.
│
├── Step 3: Create Service Stub (p. 504) for testing
│   Implements the same Separated Interface.
│   Returns canned/configurable responses — no real network calls.
│   "Removes dependence upon problematic services during testing" (p. 504)
│
└── Step 4: Wire via Plugin (p. 499)
    Load the real implementation in production, stub in tests.
    Configuration (not code) determines which is used.
    "Links classes during configuration rather than compilation" (p. 499)
```

**The complete test isolation stack**:
```
[Domain/Service] → [Separated Interface] → [Plugin] → [Gateway (prod) | Service Stub (test)]
```

---

## Cross-Cutting: Pattern Compatibility Matrix

Which patterns naturally work together vs. which are alternatives:

| If you choose... | It pairs with... | It competes with... |
|-----------------|------------------|---------------------|
| Transaction Script | Row/Table Data Gateway, Table Module | Domain Model |
| Domain Model | Data Mapper, Unit of Work, Identity Map, Repository | Active Record, Table Module |
| Active Record | (standalone) | Data Mapper |
| Table Module | Table Data Gateway, Record Set | Domain Model |
| Service Layer | Domain Model or Transaction Script beneath it | (not optional with multiple clients) |
| Data Mapper | Unit of Work, Identity Map, Repository | Active Record |
| Repository | Data Mapper, Metadata Mapping, Query Object | Simple finder methods on Data Mapper |
| Optimistic Offline Lock | Identity Field, Unit of Work | Pessimistic Offline Lock |
| Front Controller | Application Controller, Template/Transform View | Page Controller |
| Remote Facade | Data Transfer Object | (always together for distribution) |
