# DDD Antipattern Reference

**Purpose**: Maps observable symptoms to DDD antipatterns and their fixes.
Used by the `ddd-evaluator` skill.

**Source**: Derived from *Domain-Driven Design* (Evans, 2003) and widely recognized
DDD antipatterns. Evans-named antipatterns marked *(Evans term)*. Others `[interpretation]`.

---

## Antipattern Index

1. [Anemic Domain Model](#1-anemic-domain-model)
2. [Smart UI](#2-smart-ui)
3. [Big Ball of Mud](#3-big-ball-of-mud)
4. [Ubiquitous Language Violations](#4-ubiquitous-language-violations)
5. [Aggregate Too Large](#5-aggregate-too-large)
6. [Aggregate Too Small](#6-aggregate-too-small)
7. [Entity Where Value Object Suffices](#7-entity-where-value-object-suffices)
8. [Service Overuse (Anemic Services)](#8-service-overuse)
9. [Repository as Query Engine](#9-repository-as-query-engine)
10. [Missing Factory](#10-missing-factory)
11. [Leaking Bounded Context](#11-leaking-bounded-context)
12. [Shared Database Integration](#12-shared-database-integration)

---

## 1. Anemic Domain Model

*(Evans term + Fowler)* — described in Ch. 5, also identified by Fowler

### Observable symptoms

- Domain classes contain only fields, getters, and setters — no behavior
- A parallel `*Service` class exists for every domain class
- Business rules live in service layer, not on domain objects
- Domain objects can be created in invalid states

### Fix patterns

| Fix | Pattern |
|-----|---------|
| Move behavior onto domain objects | **Entities** (p. 65) — behavior belongs on the object |
| Extract immutable concepts | **Value Objects** (p. 70) — self-validating, immutable |
| Keep services thin | **Services** (p. 75) — only for operations that don't belong on any Entity/VO |

---

## 2. Smart UI

*(Evans term, p. 57)* — explicitly named as mutually exclusive with DDD

### Observable symptoms

- Business logic embedded in UI controllers, route handlers, or templates
- No domain layer — logic goes directly from UI to database
- Business rules duplicated across multiple views

### Fix patterns

| Fix | Pattern |
|-----|---------|
| Isolate domain | **Layered Architecture** (p. 52) |
| Express model in code | **Model-Driven Design** (p. 38) |

---

## 3. Big Ball of Mud

`[interpretation]` — motivates Bounded Context (p. 238) and Context Map (p. 244)

### Observable symptoms

- One giant model serves the entire system with no boundaries
- The same term means different things in different parts of the code
- Changing one module breaks unrelated modules
- No team can own a coherent piece of the model

### Fix patterns

| Fix | Pattern |
|-----|---------|
| Define explicit model boundaries | **Bounded Context** (p. 238) |
| Map relationships between contexts | **Context Map** (p. 244) |
| Protect your model from foreign influence | **Anti-Corruption Layer** (p. 257) |

---

## 4. Ubiquitous Language Violations

`[interpretation]` — violates Ch. 2 (p. 25)

### Observable symptoms

- Code uses technical names (`DataProcessor`, `Handler`, `Manager`) instead of domain terms
- Domain experts and developers use different words for the same concept
- Class names don't appear in domain conversations
- Comments translate code names to domain names ("// this is the claim adjudication step")

### Fix patterns

| Fix | Action |
|-----|--------|
| Rename to domain language | **Ubiquitous Language** (p. 25) — code names = domain names |
| Clarify interfaces | **Intention-Revealing Interfaces** (p. 172) — names express purpose |

---

## 5. Aggregate Too Large

`[interpretation]` — misapplication of Aggregates (p. 89)

### Observable symptoms

- Loading one aggregate loads hundreds of related objects
- Transactions lock large portions of the database
- Contention between users editing different parts of the same aggregate
- Performance degrades as the aggregate grows

### Fix patterns

| Fix | Action |
|-----|--------|
| Split into smaller aggregates | Reference other aggregates by ID, not by object reference |
| Re-examine invariants | Only objects that share invariants need to be in the same aggregate |
| Use eventual consistency | Cross-aggregate operations can be eventually consistent |

---

## 6. Aggregate Too Small

`[interpretation]` — the opposite problem

### Observable symptoms

- Invariants spanning multiple "aggregates" must be enforced in the service layer
- Transactions frequently touch 3+ aggregates together
- No clear consistency boundary

### Fix patterns

| Fix | Action |
|-----|--------|
| Merge related objects | If invariants span them, they should be one **Aggregate** (p. 89) |
| Identify the true root | The root Entity controls the invariant boundary |

---

## 7. Entity Where Value Object Suffices

`[interpretation]` — common modeling error described in Ch. 5

### Observable symptoms

- Objects with identity tracking (IDs) that don't actually need lifecycle tracking
- Money, addresses, coordinates stored as entities with surrogate keys
- Two "equal" objects compared by ID instead of by attributes

### Fix patterns

| Fix | Pattern |
|-----|---------|
| Replace with immutable VO | **Value Objects** (p. 70) — no ID, equality by attributes, immutable |
| Embed in owner | Store VO fields inline with the owning Entity |

---

## 8. Service Overuse

`[interpretation]` — misapplication of Services (p. 75)

### Observable symptoms

- Every operation is a service method; domain objects are data bags
- Service methods take an Entity, compute on its fields, and return a result
- "Where does this logic go?" → always "the service" → Anemic Domain Model

### Fix patterns

| Fix | Action |
|-----|--------|
| Push behavior onto domain objects | If an operation is intrinsic to an Entity, put it there |
| **Services** (p. 75) only for cross-entity operations | Operations that don't belong on any single Entity/VO |

---

## 9. Repository as Query Engine

`[interpretation]` — misapplication of Repositories (p. 106)

### Observable symptoms

- Repository has 20+ `findBy*` methods
- Repository returns raw database rows or DTOs instead of domain objects
- Complex joins and aggregations done through the Repository interface
- Repository methods mirror SQL queries, not domain operations

### Fix patterns

| Fix | Pattern |
|-----|---------|
| Keep Repository collection-like | **Repositories** (p. 106) — `find(id)`, `save()`, `findMatching(spec)` |
| Use Specification for complex queries | **Specification** (p. 158) — composable predicates |

---

## 10. Missing Factory

`[interpretation]` — motivates Factories (p. 98)

### Observable symptoms

- Complex aggregate creation logic scattered across multiple callers
- Aggregates created in invalid states (invariants not enforced at creation)
- Test setup duplicates construction code
- Constructor requires deep knowledge of internal structure

### Fix patterns

| Fix | Pattern |
|-----|---------|
| Encapsulate creation | **Factories** (p. 98) — enforce invariants at construction time |

---

## 11. Leaking Bounded Context

`[interpretation]` — violates Bounded Context (p. 238)

### Observable symptoms

- Types from one context imported and used directly in another
- A model change in Team A's code breaks Team B's code
- Database tables shared between two services without an explicit contract
- No translation layer between different models

### Fix patterns

| Fix | Pattern |
|-----|---------|
| Translate at the boundary | **Anti-Corruption Layer** (p. 257) |
| Define explicit services | **Open Host Service** (p. 263) + **Published Language** (p. 264) |
| Accept the dependency | **Conformist** (p. 255) — if you can't fight it, acknowledge it |

---

## 12. Shared Database Integration

`[interpretation]` — violates model isolation; common microservice antipattern

### Observable symptoms

- Multiple services read/write the same database tables
- Schema changes require coordinating multiple teams
- No clear ownership of data
- Foreign keys span service boundaries

### Fix patterns

| Fix | Pattern |
|-----|---------|
| Give each context its own data | **Bounded Context** (p. 238) — own your data |
| Communicate via events/APIs | **Open Host Service** (p. 263) |
| Split when ready | **Separate Ways** (p. 261) — fully independent if integration isn't needed |

---

## Quick Reference: Symptom → Pattern

| Observable symptom | Primary antipattern | Fix pattern(s) |
|-------------------|--------------------|----------------|
| Domain objects are pure data bags | Anemic Domain Model | Entities, Value Objects, thin Services |
| Business logic in controllers | Smart UI | Layered Architecture |
| One model for the whole system | Big Ball of Mud | Bounded Context, Context Map |
| Code names ≠ domain names | Language violation | Ubiquitous Language, Intention-Revealing Interfaces |
| Loading one aggregate loads everything | Aggregate too large | Split aggregates, reference by ID |
| Invariants enforced in service layer | Aggregate too small | Merge into proper aggregate |
| Money/address with surrogate IDs | Entity instead of VO | Value Objects |
| Every operation is a service method | Service overuse | Push behavior onto domain objects |
| Repository has 20+ findBy methods | Repository as query engine | Specification pattern |
| Aggregates created in invalid states | Missing factory | Factories |
| Types from other context used directly | Leaking BC | Anti-Corruption Layer, Open Host Service |
| Multiple services share DB tables | Shared DB integration | Bounded Context, own your data |
