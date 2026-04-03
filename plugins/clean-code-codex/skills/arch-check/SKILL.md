---
name: arch-check
description: >
  Enforces architectural boundary rules (ARCH-1 through ARCH-6). Loaded by the
  conductor for review, refactor, and new-service operations. Detects layer
  violations, circular imports, and missing public API declarations. Architecture
  boundaries are language-agnostic — no language reference files needed.
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

Report schema: see `skills/conductor/shared-contracts.md`.
