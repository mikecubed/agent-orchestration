---
name: arch-check
description: >
  Enforces architectural boundary rules (ARCH-1 through ARCH-10). Loaded by the
  conductor for review, refactor, and new-service operations, and for write
  operations that create or modify classes, services, repositories, modules,
  adapters, domain models, use cases, or wiring. Detects layer violations,
  circular imports, missing public API declarations, inheritance used as a
  substitute for composition, hidden dependency construction, dependence on
  concrete infrastructure instead of stable ports, and missing composition
  roots. Architecture boundaries are language-agnostic — no language reference
  files needed.
version: "1.0.0"
last-reviewed: "2026-03-04"
languages: [typescript, python, go, rust, javascript]
changelog: "../../CHANGELOG.md"
tools: Read, Grep, Glob, Bash
model: opus
permissionMode: default
---

# Arch Check — Architecture Boundary Enforcement

Precedence in the overall system: SEC → TDD → **ARCH/TYPE** → quality BLOCK.

---

## Layer Dependency Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   DOMAIN  ◀────────  APPLICATION  ◀────────  INFRA         │
│  (entities,          (use cases,             (DB, HTTP,     │
│   value objects,     ports, DTOs)            adapters,      │
│   domain events)                             frameworks)    │
│                                                             │
│   ✅ Allowed:  inner ← outer  (outer depends on inner)      │
│   ❌ Blocked:  inner → outer  (domain must NEVER import     │
│                               application or infra)         │
│                                                             │
│   ❌ Blocked:  CIRCULAR IMPORTS at any level                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Canonical layer indicators** (adapt to project conventions):

| Layer       | Common paths                                        |
|-------------|-----------------------------------------------------|
| domain      | `domain/`, `entities/`, `models/`, `core/`          |
| application | `application/`, `app/`, `usecases/`, `services/`    |
| infra       | `infra/`, `infrastructure/`, `adapters/`, `db/`     |

---

## Rules

### ARCH-1 — No Outward Imports from Domain Layer
**Severity**: BLOCK | **Languages**: * | **Source**: CCC

**What it prohibits**: A domain-layer module importing from the application or
infrastructure layer. The domain is the innermost ring and must be dependency-free
of outer layers.

**Detection**:
1. Identify the file's layer by its path (see table above)
2. Grep imports/requires for paths that resolve to application or infra layer
3. Flag every outward import

**agent_action**:
1. Cite: `ARCH-1 (BLOCK): Domain module imports from outer layer.`
2. Identify the imported symbol
3. Propose: move the symbol inward (define interface/port in domain) or invert
   dependency via a port/adapter pattern
4. DO NOT produce any new code referencing the forbidden import

---

### ARCH-2 — No Circular Imports
**Severity**: BLOCK | **Languages**: * | **Source**: CCC

**What it prohibits**: Module A importing module B when module B (directly or
transitively) imports module A.

**Detection**:
1. For the file under review, trace its import graph up to 3 levels deep
2. Check whether any imported module eventually imports back to the origin module
3. Flag any cycle found

**agent_action**:
1. Cite: `ARCH-2 (BLOCK): Circular import detected.`
2. Describe the full cycle (A → B → C → A)
3. Propose: extract the shared dependency into a third module; or use dependency
   inversion (interface in a common module, implementations in separate modules)
4. Waiver-aware: if a `# WAIVER: ARCH-2` block exists in the file and is unexpired,
   list this under ⚠️ Waivers, not Violations

---

### ARCH-3 — No Cross-Feature Direct Imports
**Severity**: WARN | **Languages**: * | **Source**: CCC

**What it prohibits**: Module in feature A directly importing an internal
(non-public) module from feature B. Features must communicate through their
public API surface only.

**Detection**:
1. Identify the feature boundary (first path segment under `features/`, `modules/`,
   or `packages/` — adapt to project layout)
2. Flag imports that skip through `internal/`, `_internal/`, or any path segment
   conventionally marking non-public members

**agent_action**:
1. Cite: `ARCH-3 (WARN): Feature A imports internal module of Feature B.`
2. Propose: expose the needed symbol through Feature B's public API (index file,
   `__init__.py`, `mod.rs`, etc.)

---

### ARCH-4 — Infrastructure Must Not Leak Into Domain or Application
**Severity**: BLOCK | **Languages**: * | **Source**: CCC

**What it prohibits**: An infrastructure concern (ORM model, HTTP framework
decorator, database session, third-party SDK type) appearing in domain or
application layer code.

**Detection**:
1. Inspect import list of domain/application files for infra library names
   (e.g., `sqlalchemy`, `mongoose`, `axios`, `express`, framework decorators)
2. Inspect domain entities/use-cases for direct use of infra types

**agent_action**:
1. Cite: `ARCH-4 (BLOCK): Infrastructure type leaks into domain/application layer.`
2. Name the specific type and the file
3. Propose: define a port/interface in the domain; implement the adapter in infra;
   inject via constructor or dependency container

---

### ARCH-5 — Cascade Depth Limit (≤ 2 Levels)
**Severity**: WARN | **Languages**: * | **Source**: CCC

**What it prohibits**: A change to module A requiring changes to more than 2
downstream modules. Cascade depth > 2 indicates excessive coupling.

**Detection**:
1. When reviewing a change, count how many other modules must change as a direct
   consequence
2. Flag if that count exceeds 2

**agent_action**:
1. Cite: `ARCH-5 (WARN): Change cascades to N downstream modules (limit: 2).`
2. List the affected modules
3. Propose: introduce a stable abstraction (interface, event, or shared type) at
   the point of highest fan-out to reduce coupling

---

### ARCH-6 — Explicit Public API Required for Every Module/Package
**Severity**: INFO | **Languages**: * | **Source**: CCC

**What it requires**: Every module/package boundary MUST have an explicit public
API declaration (barrel file, `__init__.py`, `mod.rs` with `pub use`, Go package
doc, etc.) that lists the exported symbols.

**Detection**:
1. For each module/package directory in scope, check for an index/init file
2. Flag directories that lack one

**agent_action**:
1. Cite: `ARCH-6 (INFO): Module lacks explicit public API declaration.`
2. Name the directory
3. Suggest: create `index.ts` / `__init__.py` / `mod.rs` / Go package-level doc
   exporting only the intended public symbols

---

### ARCH-7 — Composition Over Inheritance
**Severity**: WARN (default) / BLOCK (deep or behaviour-only) / INFO (justified) | **Languages**: * | **Source**: CCC

**What it prohibits**: Subclassing primarily to vary behaviour when behaviour
can be injected or composed. Inheritance is permitted when it expresses a true
domain taxonomy, a framework hook, a language-idiomatic sealed/algebraic
hierarchy, an exception base type, or an unavoidable ORM-imposed hierarchy.

**Severity nuance**:
- `WARN` for shallow but avoidable inheritance (1–2 levels used to vary behaviour).
- `BLOCK` for deep behavioural hierarchies, subclass proliferation, or subclassing
  used solely to vary algorithms.
- `INFO` for justified framework hooks, true domain taxonomies, sealed/algebraic
  hierarchies, base exceptions, or bounded ORM inheritance.

**Detection signals**:
1. Inheritance chains deeper than two levels
2. Subclasses overriding only one or two behaviour methods
3. Type-code or subclass proliferation (many trivial subclasses)
4. Base classes with many `protected` hooks
5. Template Method use where Strategy, function injection, or policy injection
   would be simpler

**Allowed / justified cases**:
- True domain taxonomy backed by ubiquitous language
- Framework-required base classes (UI components, jobs, controllers)
- Sealed/algebraic data types (Rust enums, Kotlin sealed classes, TS discriminated unions)
- Exception/error base types
- ORM-imposed inheritance where the ORM offers no composition alternative

**agent_action**:
1. Cite: `ARCH-7 (WARN|BLOCK|INFO): Inheritance used to vary behaviour where composition would suffice.`
2. Identify the varying behaviour
3. Propose Strategy, Decorator, Bridge, Adapter, function injection, or a policy object
4. If inheritance is retained, require explicit justification matching one of the allowed cases above
5. DO NOT introduce new subclass hierarchies without justification

---

### ARCH-8 — Dependencies Must Be Injected
**Severity**: BLOCK (default) / WARN (duplicated wiring) / INFO (factories) | **Languages**: * | **Source**: CCC

**What it prohibits**: Hidden construction of services, repositories, gateways,
clients, loggers, clocks, random sources, configuration readers, databases,
HTTP clients, queues, SDK clients, and filesystem adapters inside
domain/application classes. Dependencies must arrive through constructor
parameters, function parameters, factories, or composition-root wiring.

**Severity nuance**:
- `BLOCK` for hidden infrastructure or service construction inside
  domain/application logic.
- `WARN` for duplicated wiring outside the composition root.
- `INFO` for construction inside approved factories/builders or test fixtures.

**Detection signals**:
1. `new`/constructor calls for repositories, gateways, HTTP/DB/queue clients,
   loggers, clocks, or RNGs inside domain or application code
2. Static service-locator lookups (`Container.get`, `ServiceLocator.resolve`)
   inside domain/application logic
3. Implicit reads of `process.env`, `os.environ`, global config singletons
   inside domain/application logic

**Allowed / justified cases**: value objects; entities; errors/exceptions;
local collections; DTOs; pure helpers; immutable constants; dedicated
factories/builders; composition-root wiring; framework or test fixture setup.

**agent_action**:
1. Cite: `ARCH-8 (BLOCK): Hidden construction of dependency '{name}' inside {layer} code.`
2. Identify the concrete dependency created internally
3. Move construction to the composition root or a dedicated factory
4. Pass the dependency through a constructor or function parameter
5. Preserve explicit ownership and lifetime semantics

---

### ARCH-9 — Depend on Stable Ports, Not Concrete Infrastructure
**Severity**: BLOCK (default) / WARN (fat ports) / INFO (tighten boundaries) | **Languages**: * | **Source**: CCC

**What it prohibits**: Domain or application code depending on concrete
infrastructure types (`Sql*`, `Http*`, `Prisma*`, `Redis*`, `S3*`, framework
request/session, SDK client types) instead of small ports, protocols, traits,
or interfaces. Enforces DIP and ISP.

**Severity nuance**:
- `BLOCK` when concrete infrastructure crosses inward into domain/application code.
- `WARN` for fat ports, broad interfaces, or public APIs that expose
  implementation details.
- `INFO` for opportunities to tighten interface boundaries.

**Detection signals**:
1. Domain/application files importing concrete infrastructure or SDK types
2. Constructor parameters typed as concrete adapters when a narrow port would suffice
3. Public API files exporting concrete infrastructure as the primary seam
4. Ports bundling unrelated responsibilities (ISP violation)

**Allowed / justified cases**: infrastructure layer modules; composition-root
wiring; adapter implementations that legitimately depend on the concrete
client they wrap.

**agent_action**:
1. Cite: `ARCH-9 (BLOCK): Concrete infrastructure type '{type}' used in {layer}.`
2. Define the smallest useful port near the consuming layer
3. Split fat ports by consumer need (ISP)
4. Move the implementation into infrastructure
5. Wire the concrete adapter at the composition root

---

### ARCH-10 — Composition Root Owns Wiring
**Severity**: WARN (default) / BLOCK (service locator) / INFO (small scripts) | **Languages**: * | **Source**: CCC

**What it requires**: Non-trivial applications must have an explicit
composition root — a startup module, factory, or bootstrap function — where
the object graph is assembled. Domain and application code must not assemble
their own dependencies through service locators, global containers, or
recursive concrete construction.

**Severity nuance**:
- `WARN` when a non-trivial app has no clear composition root.
- `BLOCK` when business logic accesses service locators, global containers, or
  recursively constructs concrete dependencies.
- `INFO` for small scripts or trivial pure modules where a composition root
  would add ceremony.

**Detection signals**:
1. Repeated wiring across handlers, controllers, jobs, or tests
2. Service locators or global containers accessed from domain/application logic
3. Constructors that recursively build concrete dependencies
4. No clear startup/factory/module responsible for wiring

**Allowed / justified cases**: small scripts; trivial pure modules; throwaway
prototypes; test-specific composition roots or fixtures.

**agent_action**:
1. Cite: `ARCH-10 (WARN|BLOCK): Object graph wiring is scattered or accessed via service locator.`
2. Introduce or identify a single composition root for the application
3. Move wiring there; keep framework adapters thin
4. Allow test-specific composition roots or fixtures for tests

---

Report schema: see `skills/conductor/shared-contracts.md`.
