# DDD Concept & Pattern Index

**~40 concepts across 5 categories. Load `catalog-core.md` for full entries. Load `lang/<language>.md` for code examples.**

Quick-find: [Process Concepts](#process-concepts-teach-only) | [Tactical Building Blocks](#tactical-building-blocks-part-ii) | [Supple Design](#supple-design-patterns-part-iii) | [Context Mapping](#strategic-design--context-mapping-part-iv) | [Distillation](#strategic-design--distillation-part-iv) | [Large-Scale Structure](#strategic-design--large-scale-structure-part-iv)

---

## Process Concepts (teach-only)

These are practices/principles, not code patterns. Covered by `ddd-teach` only.

| Concept | Page | One-sentence description | Related to |
|---------|------|-----------------------|------------|
| Knowledge Crunching | 15 | Team process of distilling domain knowledge through iterative conversation with experts. | Ubiquitous Language |
| Ubiquitous Language | 25 | A shared language between developers and domain experts, used in code, conversation, and documentation. | Model-Driven Design, Bounded Context |
| Model-Driven Design | 38 | The design directly reflects the domain model — code structure mirrors model concepts. | Ubiquitous Language, Layered Architecture |
| Hands-on Modelers | 47 | Developers who write code must also participate in modeling; modelers must touch the code. | Knowledge Crunching |

---

## Tactical Building Blocks (Part II)

| Pattern | Page | One-sentence description | Pairs with | Competes with |
|---------|------|-----------------------|------------|---------------|
| Layered Architecture | 52 | Partition into UI, Application, Domain, and Infrastructure layers; isolate the domain. | All tactical patterns | Smart UI (anti-pattern) |
| Entities | 65 | Objects defined by identity that persists through state changes, not by their attributes. | Value Objects, Aggregates | Value Objects (different concept) |
| Value Objects | 70 | Immutable objects defined by their attributes, with no conceptual identity. | Entities, Embedded Value (PEAA) | Entities (different concept) |
| Services | 75 | Stateless operations that don't belong on any Entity or Value Object. | Entities, Value Objects, Repositories | (overuse → Anemic Domain Model) |
| Modules | 79 | Packages/namespaces that reflect domain concepts with high cohesion and low coupling. | Bounded Context | — |
| Aggregates | 89 | Cluster of Entities and Value Objects with a root Entity that controls all access and invariants. | Entities, Repositories, Factories | — |
| Factories | 98 | Encapsulate complex object/aggregate creation to enforce invariants at birth. | Aggregates, Entities | GoF Abstract Factory/Builder (related) |
| Repositories | 106 | Collection-like interface for retrieving and persisting Aggregates, hiding data access. | Aggregates, Factories | GoF/PEAA Repository (same concept) |

---

## Supple Design Patterns (Part III)

| Pattern | Page | One-sentence description | Pairs with | Competes with |
|---------|------|-----------------------|------------|---------------|
| Specification | 158 | Encapsulate a boolean business rule as a combinable, testable object. | Entities, Value Objects, Repositories | Hardcoded conditionals |
| Intention-Revealing Interfaces | 172 | Name classes and methods to express their purpose, not their mechanism. | All patterns | Cryptic/implementation-named APIs |
| Side-Effect-Free Functions | 175 | Commands that modify state vs queries that return values — never mix them. | Value Objects, Assertions | Methods with hidden side effects |
| Assertions | 179 | State post-conditions and invariants explicitly so callers know what to expect. | Side-Effect-Free Functions | Undocumented contracts |
| Conceptual Contours | 183 | Decompose design elements to align with stable domain concepts, not technical seams. | Modules, Bounded Context | Arbitrary technical decomposition |
| Standalone Classes | 188 | Reduce coupling by making classes self-contained — minimize dependencies. | Modules, Conceptual Contours | Tightly coupled clusters |
| Closure of Operations | 190 | Operations that return the same type they operate on, enabling chaining and composition. | Value Objects, Specification | — |

---

## Strategic Design — Context Mapping (Part IV)

| Pattern | Page | One-sentence description | Pairs with | Competes with |
|---------|------|-----------------------|------------|---------------|
| Bounded Context | 238 | Explicit boundary within which a model is defined and consistent. | Context Map, Ubiquitous Language | Big Ball of Mud |
| Continuous Integration | 242 | Keep model unified within a Bounded Context through frequent merging and testing. | Bounded Context | — |
| Context Map | 244 | Global view of all Bounded Contexts and the relationships between them. | All context patterns | — |
| Shared Kernel | 251 | Two teams share a subset of the model, agreeing not to change it without consultation. | Bounded Context | Separate Ways |
| Customer/Supplier | 252 | Upstream team serves downstream team's needs with negotiated interfaces. | Context Map | Conformist |
| Conformist | 255 | Downstream team conforms to upstream team's model with no negotiation power. | Context Map | Customer/Supplier, ACL |
| Anticorruption Layer | 257 | Translation layer that protects your model from a foreign model's influence. | Bounded Context, Facade/Adapter (GoF) | Conformist |
| Separate Ways | 261 | Two contexts have no integration — they are completely independent. | Context Map | Shared Kernel |
| Open Host Service | 263 | Define a protocol that gives access to your subsystem as a set of services. | Published Language | — |
| Published Language | 264 | A well-documented shared language for inter-context communication. | Open Host Service | Ad-hoc translation |

---

## Strategic Design — Distillation (Part IV)

| Pattern | Page | One-sentence description | Pairs with | Competes with |
|---------|------|-----------------------|------------|---------------|
| Core Domain | 281 | Identify the most valuable, differentiating part of the model and invest the best talent there. | Generic Subdomains, Domain Vision Statement | — |
| Generic Subdomains | 285 | Factor out parts of the model that are not core differentiators — buy, outsource, or simplify. | Core Domain | Over-investing in non-core |
| Domain Vision Statement | 290 | Short document describing the Core Domain's value proposition and strategic direction. | Core Domain | — |
| Highlighted Core | 292 | Mark the Core Domain explicitly in the code/docs so everyone knows what's core. | Core Domain, Domain Vision Statement | — |
| Cohesive Mechanisms | 295 | Extract complex computation into a separate framework that the domain model uses. | Core Domain | — |
| Segregated Core | 298 | Refactor to separate Core Domain into its own module, reducing coupling to generic code. | Core Domain, Modules | — |
| Abstract Core | 305 | Express the most fundamental concepts of the Core Domain in an abstract model. | Segregated Core | — |

---

## Strategic Design — Large-Scale Structure (Part IV)

| Pattern | Page | One-sentence description | Pairs with | Competes with |
|---------|------|-----------------------|------------|---------------|
| Evolving Order | 310 | Let large-scale structure emerge gradually; don't impose it upfront. | All large-scale patterns | Big Design Up Front |
| System Metaphor | 312 | A single overarching metaphor that guides the system's conceptual structure. | Evolving Order | — |
| Responsibility Layers | 314 | Organize the domain into layers by broad responsibility (policy, operations, capability). | Layered Architecture | — |
| Knowledge Level | 326 | Separate the configurable rules/structure from the operational objects they constrain. | Strategy (GoF), Specification | Hardcoded rules |
| Pluggable Component Framework | 333 | Establish interfaces and an assembly mechanism so components can be swapped freely. | Abstract Core | Monolithic model |
