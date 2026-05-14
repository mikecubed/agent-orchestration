---
name: arch-check
description: >
  Enforces architectural boundary rules: BOUND-1 (boundary direction — core
  imports nothing from shell or infrastructure), BOUND-2 (stable ports — no
  concrete infrastructure types in core public signatures), BOUND-3
  (composition root owns wiring — no hidden construction in core), BOUND-4
  (no circular imports), COMP-1 (composition over inheritance, with idiomatic
  carve-outs). Loaded by the conductor for review, refactor, new-service
  operations, and write operations that touch boundary-relevant code (modules,
  adapters, domain logic, wiring). Layer detection follows the conductor's
  Section 14 (prefer core/+shell/, fall back to legacy paths).
  Language-agnostic — no per-language references needed.
version: "2.0.0"
last-reviewed: "2026-05-13"
languages: [typescript, python, go, rust, javascript]
changelog: "../../CHANGELOG.md"
tools: Read, Grep, Glob, Bash
model: opus
permissionMode: default
---

# Arch Check — Boundary and Composition Enforcement

Precedence in the overall system: SEC → gate (TEST-PINNED, TEST-RED-FIRST) →
**BOUND/PURE/RESULT/TYPED** → COMP/IMMUT → quality BLOCK → WARN → INFO.

---

## Boundary Direction

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   CORE   ◀──────────────  SHELL                             │
│  (pure logic,            (HTTP, DB, framework, CLI, queue,  │
│   domain model,           filesystem, external SDKs,        │
│   business rules)         logging, clock, RNG)              │
│                                                             │
│   ✅ Allowed:  shell → core  (shell depends on core)         │
│   ❌ Blocked:  core → shell  (core knows nothing of shell)   │
│                                                             │
│   ❌ Blocked:  CIRCULAR IMPORTS at any level                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

Layer detection: see conductor `Section 14 — Layer Detection`. Prefers
`core/`/`shell/`, falls back to legacy `domain/entities/models` (core) and
`application/services/infra/adapters/db/api/controllers/handlers` (shell).

---

## Rules

### BOUND-1 — Core Imports Nothing From Shell or Infrastructure
**Severity**: BLOCK | **Languages**: * | **Source**: CCC

**What it prohibits**: A core-layer module importing from shell, framework, or
infrastructure code. Core is the innermost ring and must have zero dependencies
on I/O, HTTP, DB, ORM, logging, clock, RNG, message bus, third-party SDKs, or
framework annotations.

**Detection**:
1. Resolve the file's layer using the conductor's layer detection.
2. If file is in `core/`: grep its imports for any of:
   - Paths resolving to `shell/` or legacy shell paths.
   - Known I/O library names (`sqlalchemy`, `mongoose`, `axios`, `requests`,
     `httpx`, `express`, `fastapi`, `flask`, framework decorators).
   - Framework annotations (`@RestController`, `@Entity`, `@Component`).
3. Flag every outward or infrastructure-bound import.

**agent_action**:
1. Cite: `BOUND-1 (BLOCK): Core module imports from shell or infrastructure: '{import}' at {file}:{line}.`
2. Name the specific symbol and target layer.
3. Propose: define a port (interface/protocol/trait/function-type) in core;
   implement the adapter in shell; have shell call into core, not the other
   way around.
4. DO NOT produce any new code referencing the forbidden import.

---

### BOUND-2 — Core Public Signatures Use Ports, Not Concrete Infrastructure
**Severity**: BLOCK | **Languages**: * | **Source**: CCC

**What it prohibits**: A core-layer function, method, or type whose public
signature includes a concrete infrastructure type (`SqlConnection`,
`HttpClient`, `PrismaClient`, `RedisClient`, `S3Client`, framework
request/session, SDK client types).

**Why**: A signature is a contract. If the contract names a database driver,
swapping the driver is a refactor of every caller. If the contract names a
port (e.g., `OrderRepository`), the driver is a runtime detail.

**Detection signals**:
1. Core file declaring a public function/method/type taking or returning a
   concrete infra type (by name pattern: `Sql*`, `Http*`, `*Client`, framework
   request types).
2. Public API files exporting concrete infrastructure as the primary seam.
3. Fat ports — a single port bundling unrelated responsibilities.

**Allowed / justified cases**: shell-layer modules (adapters legitimately wrap
the concrete client they implement); composition-root wiring.

**agent_action**:
1. Cite: `BOUND-2 (BLOCK): Concrete infra type '{type}' in core signature at {file}:{line}.`
2. Define the smallest useful port near the consuming code (split fat ports
   by consumer need — ISP).
3. Move the implementation into shell; wire the adapter at the composition
   root.

---

### BOUND-3 — Composition Root Owns Wiring; No Hidden Construction in Core
**Severity**: BLOCK (default) / WARN (duplicated wiring) / INFO (small scripts) | **Languages**: * | **Source**: CCC

**What it prohibits**:
- Hidden construction of services, repositories, gateways, clients, loggers,
  clocks, RNGs, configuration readers, databases, HTTP/queue/SDK clients, or
  filesystem adapters inside core code.
- Service-locator lookups (`Container.get`, `ServiceLocator.resolve`) from core.
- Implicit reads of `process.env`, `os.environ`, or global config singletons
  from core.

**What it requires**: Dependencies arrive through function parameters or
constructor arguments. Non-trivial applications have an explicit composition
root — a startup module, factory, or bootstrap function — where the object
graph is assembled.

**Severity nuance**:
- `BLOCK` for hidden infrastructure or service construction inside core code,
  or service-locator access from core/application.
- `WARN` for duplicated wiring outside the composition root.
- `INFO` for small scripts or trivial pure modules where a composition root
  would add ceremony, and for construction inside approved factories/builders
  or test fixtures.

**Allowed / justified cases**: value objects; pure data records;
errors/exceptions; local collections; immutable constants; dedicated
factories/builders; the composition root itself; framework or test fixture
setup.

**agent_action**:
1. Cite: `BOUND-3 (BLOCK): Hidden construction of '{name}' inside core at {file}:{line}.`
2. Identify the concrete dependency created internally.
3. Move construction to the composition root or a dedicated factory.
4. Pass the dependency through a constructor or function parameter.

---

### BOUND-4 — No Circular Imports
**Severity**: BLOCK | **Languages**: * | **Source**: CCC

**What it prohibits**: Module A importing module B when module B (directly or
transitively) imports module A. Cycles are a strong signal of unclear
responsibilities and tend to break tooling (typecheckers, bundlers, hot
reload).

**Detection**:
1. For the file under review, trace its import graph up to 3 levels deep.
2. Check whether any imported module eventually imports back to the origin.
3. Flag any cycle found.

**agent_action**:
1. Cite: `BOUND-4 (BLOCK): Circular import detected.`
2. Describe the full cycle (`A → B → C → A`).
3. Propose: extract the shared dependency into a third module, or invert one
   edge via a port defined in a neutral module.
4. Waiver-aware: if a `# WAIVER: BOUND-4` block exists in the file and is
   unexpired, list under ⚠️ Waivers, not Violations.

---

### COMP-1 — Composition Over Inheritance
**Severity**: WARN (default) / BLOCK (deep behavioural) / INFO (justified) | **Languages**: * | **Source**: CCC

**What it prohibits**: Subclassing primarily to *vary behavior* when behavior
can be injected, composed, or expressed via a sum type. Inheritance is
permitted when it expresses a true domain taxonomy backed by ubiquitous
language, a framework-required hook, a language-idiomatic sealed/algebraic
hierarchy, an exception/error base type, or an ORM-imposed hierarchy with no
composition alternative.

**Severity nuance**:
- `WARN` for shallow but avoidable inheritance (1–2 levels used to vary
  behavior).
- `BLOCK` for deep behavioural hierarchies (3+ levels), subclass
  proliferation, or subclassing used purely to vary algorithms.
- `INFO` for the allowed/justified cases listed below.

**Detection signals**:
1. Inheritance chains deeper than two levels.
2. Subclasses overriding only one or two behavior methods.
3. Type-code or subclass proliferation (many trivial subclasses).
4. Base classes with many `protected` hooks.
5. Template Method use where Strategy, function injection, or policy injection
   would be simpler.

**Allowed / justified cases**:
- True domain taxonomy backed by ubiquitous language.
- Framework-required base classes (UI components, jobs, controllers).
- Sealed/algebraic data types (Rust enums, Kotlin sealed classes, TS
  discriminated unions).
- Exception/error base types.
- ORM-imposed inheritance where the ORM offers no composition alternative.

**agent_action**:
1. Cite: `COMP-1 (WARN|BLOCK|INFO): Inheritance used to vary behavior where composition would suffice.`
2. Identify the varying behavior.
3. Propose Strategy, Decorator, function injection, or a policy object.
4. If inheritance is retained, require explicit justification matching one of
   the allowed cases above.

---

Report schema: see `skills/conductor/shared-contracts.md`.
