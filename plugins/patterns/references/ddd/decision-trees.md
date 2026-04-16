# DDD Decision Trees

**Purpose**: Structured guidance for DDD modeling and strategic decisions.
Used by `ddd-advisor` and `ddd-strategist`.

**Source**: Derived from Evans's guidance throughout DDD (2003).
`[interpretation]` marks guidance not explicitly stated by Evans.

---

## Decision Tree Index

1. [Entity vs Value Object vs Service](#1-entity-vs-value-object-vs-service)
2. [Aggregate boundaries](#2-aggregate-boundaries)
3. [Context integration pattern](#3-context-integration-pattern)
4. [Core vs Supporting vs Generic](#4-core-vs-supporting-vs-generic)

---

## 1. Entity vs Value Object vs Service

**Source**: Ch. 5 (p. 60–84)

```
You have a domain concept to model. What is it?
│
├── Does it have a LIFECYCLE and IDENTITY that persists through changes?
│   (Is it tracked over time? Can two with the same attributes be different?)
│   │
│   └── YES → Entity (p. 65)
│       "Objects defined by identity, not attributes."
│       e.g., Customer, Order, Account, Shipment
│       Key: define equality by ID, not by attributes
│
├── Is it defined entirely by its ATTRIBUTES? (No identity needed,
│   two with the same values are interchangeable)
│   │
│   └── YES → Value Object (p. 70)
│       "Defined by attributes, immutable, no identity."
│       e.g., Money, Address, DateRange, Color, Coordinates
│       Key: make it immutable, equality by value
│
└── Is it an OPERATION that doesn't naturally belong on any Entity or VO?
    (Stateless, involves multiple objects, or is a domain process)
    │
    └── YES → Service (p. 75)
        "An operation that doesn't belong on an Entity or Value Object."
        e.g., TransferFunds, CalculateRoute, AuthorizePayment
        Key: stateless, named as a verb, thin — domain logic stays on objects
```

**The test** `[interpretation]`:
- "Would two instances with the same attributes be the same thing?" YES → Value Object. NO → Entity.
- "Does this operation modify the calling object's state?" NO, and it involves multiple objects → Service.

**Warning**: Default to Value Object. Most developers over-use Entity. If you don't need to track it over time, it's a Value Object.

---

## 2. Aggregate boundaries

**Source**: Ch. 6 (p. 88–106)

```
You have a cluster of related Entities and Value Objects. How do you draw the boundary?
│
├── Which invariants must be enforced WITHIN A SINGLE TRANSACTION?
│   (What rules must always be true when data is committed?)
│   │
│   └── Objects that share an invariant → SAME Aggregate
│       e.g., Order + OrderLines share "total must match sum of lines"
│
├── Which Entity is the ENTRY POINT for this cluster?
│   (All access from outside goes through this entity)
│   │
│   └── That entity is the Aggregate Root
│       External code holds references only to the root, never to internals
│
├── Can the referenced object live independently?
│   (Does it have its own lifecycle? Is it accessed directly by other aggregates?)
│   │
│   └── YES → SEPARATE Aggregate, reference by ID (not object reference)
│       e.g., Order references Customer by customer_id, not by Customer object
│
└── Is the cluster getting too large?
    │
    ├── Does loading the aggregate load 100+ objects? → TOO LARGE
    │   Split: move independent concepts to separate aggregates
    │   Use eventual consistency for cross-aggregate rules
    │
    └── Are transactions frequently failing due to contention? → TOO LARGE
        Split on the contention boundary
```

**Rules of thumb** `[interpretation]`:
1. **Small aggregates** — prefer 1 Entity + a few Value Objects
2. **Reference other aggregates by ID** — not by object reference
3. **One transaction per aggregate** — cross-aggregate consistency is eventual
4. **If in doubt, split** — it's easier to merge aggregates than to split them

---

## 3. Context integration pattern

**Source**: Ch. 14 (p. 235–278)

Used by `ddd-strategist` to recommend integration patterns between bounded contexts.

```
You have two Bounded Contexts that need to work together. How?
│
├── Can the teams COLLABORATE closely?
│   │
│   ├── YES, and they share a small subset of the model
│   │   └── Shared Kernel (p. 251)
│   │       Both teams own the shared code; changes require mutual agreement
│   │       ⚠️ Only works with high trust and frequent communication
│   │
│   └── YES, but one team serves the other
│       └── Customer/Supplier (p. 252)
│           Upstream team accommodates downstream team's needs
│           Downstream team has input into upstream priorities
│
├── Can you NOT influence the upstream team?
│   │
│   ├── Is the upstream model GOOD ENOUGH to adopt directly?
│   │   └── YES → Conformist (p. 255)
│   │       Accept their model as-is; simplifies integration but limits your design
│   │
│   └── Is the upstream model DAMAGING to your model?
│       └── YES → Anticorruption Layer (p. 257)
│           Build a translation layer; protect your model from foreign concepts
│           Cost: maintenance of the translation layer
│
├── Does the upstream context serve MULTIPLE consumers?
│   └── YES → Open Host Service (p. 263) + Published Language (p. 264)
│       Define a protocol/API that any consumer can use
│       Document the language of the API explicitly
│
└── Is integration NOT WORTH the cost?
    └── Separate Ways (p. 261)
        No integration; each context is fully independent
        Duplicate data if needed — cheaper than coupling
```

**Quick decision matrix** `[interpretation]`:

| Relationship | Trust | Power | Pattern |
|-------------|-------|-------|---------|
| Equal partners, small overlap | High | Equal | Shared Kernel |
| One team serves another | High | Asymmetric | Customer/Supplier |
| Can't influence upstream, model is OK | Low | Downstream weak | Conformist |
| Can't influence upstream, model is toxic | Low | Downstream weak | Anticorruption Layer |
| One-to-many consumers | — | Upstream serves many | Open Host Service |
| Not worth integrating | — | — | Separate Ways |

---

## 4. Core vs Supporting vs Generic

**Source**: Ch. 15 (p. 279–306)

Used by `ddd-strategist` for distillation — identifying where to invest.

```
For each subdomain in your system, ask:
│
├── Is this the PRIMARY DIFFERENTIATOR of the business?
│   (Would losing this capability cost the business its competitive advantage?)
│   │
│   └── YES → Core Domain (p. 281)
│       Invest the best developers here
│       Build custom, in-house
│       This is where DDD pays off most
│       e.g., pricing engine for a trading firm, matching algorithm for a dating app
│
├── Is it NECESSARY but NOT DIFFERENTIATING?
│   (The business needs it, but it's not what makes them special)
│   │
│   └── YES → Supporting Subdomain (p. 285)
│       Build it, but don't over-invest
│       Good enough is good enough
│       e.g., user management, notification system, basic reporting
│
└── Is it a SOLVED PROBLEM that many businesses share?
    (Could you buy it off the shelf?)
    │
    └── YES → Generic Subdomain (p. 285)
        Buy, use a library, or outsource
        Don't build what you can buy
        e.g., email sending, payment processing, auth (use Stripe, Auth0, etc.)
```

**The investment rule** `[interpretation]`:

| Subdomain | Build or buy? | Developer quality | DDD investment |
|-----------|--------------|-------------------|----------------|
| Core | Build custom | Best developers | Full DDD |
| Supporting | Build simple | Average | Light DDD |
| Generic | Buy / use library | Outsource OK | No DDD needed |

---

## Cross-Cutting: Pattern Compatibility Matrix

| If you choose... | It pairs with... | It competes with... |
|-----------------|------------------|---------------------|
| Entities | Value Objects, Aggregates, Repositories | — |
| Value Objects | Entities, Specification, Closure of Operations | Entity (when misused as VO) |
| Aggregates | Repositories, Factories, Entities | — |
| Repositories | Aggregates, Specification | (query engine misuse) |
| Services | Entities, Value Objects | (Anemic Domain Model when overused) |
| Specification | Repositories, Value Objects | Hardcoded conditionals |
| Bounded Context | Context Map, all integration patterns | Big Ball of Mud |
| Anticorruption Layer | Bounded Context | Conformist |
| Core Domain | Generic Subdomains, Segregated Core | — |
| Shared Kernel | Customer/Supplier | Separate Ways |
