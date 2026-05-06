# Composition-First Architecture Upgrade Plan

## Purpose

This plan defines how the local Clean Code Codex and agent orchestration plugins should be updated to prefer composition over inheritance, enforce dependency injection, strengthen DIP and ISP guidance, and align generated designs with Clean Architecture and DDD.

The upgrade should make composition-first design an enforceable default without treating every use of inheritance as a defect.

## SDD status and prerequisite

The SDD workflow was not intended to live as three regular `flow/skills/*`
entries. During the v3 consolidation, the design decision was:

- `flow/skills/sdd-feature/SKILL.md` remains the skill-side activation trigger.
- `flow/agents/sdd-specify.md`, `flow/agents/sdd-plan.md`, and
  `flow/agents/sdd-tasks.md` are the Copilot agent workflow surfaces.

The migration issue was more specific: the old `sdd-workflow` command files
contained the detailed workflow bodies, but those command bodies were deleted
instead of being merged into the new `flow/agents/sdd-*` files.

Known state:

- Source repo: `/home/mikecubed/projects/agent-orchestration`
- Installed runtime plugin: `/home/mikecubed/.copilot/installed-plugins/agent-orchestration`
- SDD restore PR: `https://github.com/mikecubed/agent-orchestration/pull/40`
- Restored source files:
  - `plugins/flow/agents/sdd-specify.md`
  - `plugins/flow/agents/sdd-plan.md`
  - `plugins/flow/agents/sdd-tasks.md`
- Skill entry point:
  - `plugins/flow/skills/sdd-feature/SKILL.md`
- The restored flow agents keep v3 hyphenated handoffs (`sdd-plan`,
  `sdd-tasks`) rather than old dotted names (`sdd.plan`, `sdd.tasks`).
- Before implementation starts, make sure PR #40 is merged and the installed
  plugin/runtime copy has been synced to a version that includes the restored
  SDD agent bodies.

## Current state

Relevant plugin base:

`/home/mikecubed/.copilot/installed-plugins/agent-orchestration`

Relevant areas:

| Plugin | Relevant surfaces |
| --- | --- |
| `ccc` | `conductor`, `arch-check`, `tdd-check`, rule explanations, auto-fix eligibility |
| `patterns` | DDD, GoF, and PEAA advisor/evaluator/refactor/teach skills and references |
| `flow` | `arch-review`, `plan`, `sdd-feature`, and SDD agents under `flow/agents/` |

Current observations:

1. `ccc/skills/arch-check/SKILL.md` defines `ARCH-1` through `ARCH-6`.
2. `ARCH-1`, `ARCH-2`, and `ARCH-4` already mention ports, adapters, or dependency inversion as remediation guidance.
3. No explicit rule currently enforces composition over inheritance, mandatory dependency injection, DIP, ISP, composition roots, singleton/global-state avoidance, or pure-domain boundaries as first-class concepts.
4. `conductor` loads `arch-check` for review, refactor, and new-service operations, but not for ordinary write operations.
5. GoF references already include Strategy, Decorator, Bridge, Adapter, and Singleton-to-DI guidance, but composition-first is not the global recommendation gate.
6. DDD guidance already emphasizes value objects, small aggregates, services as a last resort, repositories, and specifications, but does not consistently frame variability through injected policies or ports.
7. PEAA inheritance mapping guidance currently starts from "how do I persist an inheritance hierarchy" rather than first challenging whether inheritance is the right domain model.
8. SDD now has the correct shape in the source repo: `sdd-feature` is the skill-side trigger, and `sdd-specify`, `sdd-plan`, and `sdd-tasks` are Copilot agents under `plugins/flow/agents/`.
9. `flow/skills/arch-review/SKILL.md` evaluates ARCH-style concerns but can drift from `ccc/arch-check`; `ccc/arch-check` should become the canonical rule source.

## Target doctrine

Adopt this doctrine across `ccc`, `patterns`, and `flow`:

1. Composition is the default mechanism for behavior variation.
2. Inheritance requires explicit justification: true domain taxonomy, framework hook, language-idiomatic sealed/algebraic hierarchy, exception base type, or unavoidable ORM constraint.
3. Domain and application code depend on ports, protocols, traits, or interfaces, not concrete infrastructure.
4. Dependencies are injected through constructors, function parameters, factories, or composition roots.
5. Composition roots own object graph wiring.
6. Domain logic remains pure: no database, HTTP, filesystem, framework, SDK, or process-global access inside entities, value objects, or domain services.
7. Interfaces should be small and consumer-shaped.
8. Singleton and global mutable state are prohibited except for narrow runtime constants or platform-owned resources with explicit justification.
9. Testability is a design constraint, not an afterthought.

## Recommended architecture rules

Make `ccc/arch-check` the primary enforcement surface and add four rules.

### ARCH-7 - Composition Over Inheritance

Prohibits subclassing primarily to vary behavior when behavior can be injected or composed.

Default severity:

- `WARN` for shallow but avoidable inheritance.
- `BLOCK` for deep behavioral hierarchies, subclass proliferation, or subclassing used only to vary algorithms.
- `INFO` for justified framework hooks, true domain taxonomies, sealed/algebraic hierarchies, base exceptions, or bounded ORM inheritance.

Detection signals:

- inheritance chains deeper than two levels;
- subclasses overriding only one or two behavior methods;
- type-code or subclass proliferation;
- base classes with many protected hooks;
- Template Method use where Strategy, function injection, or policy injection would be simpler.

Agent action:

- identify the varying behavior;
- propose Strategy, Decorator, Bridge, Adapter, function injection, or a policy object;
- require explicit justification when inheritance remains.

### ARCH-8 - Dependencies Must Be Injected

Blocks hidden construction of services, repositories, gateways, clients, loggers, clocks, random sources, configuration readers, databases, HTTP clients, queues, SDK clients, and filesystem adapters inside domain/application classes.

Default severity:

- `BLOCK` for hidden infrastructure or service construction in domain/application logic.
- `WARN` for duplicated wiring outside the composition root.
- `INFO` for construction in approved factories/builders or test fixtures.

Allowed:

- value objects;
- entities;
- errors/exceptions;
- local collections;
- DTOs;
- pure helpers;
- immutable constants;
- dedicated factories/builders;
- composition-root wiring;
- framework or test fixture setup.

Agent action:

- identify the concrete dependency created internally;
- move construction to the composition root or a factory;
- pass the dependency through constructor or function parameters;
- preserve explicit ownership and lifetime semantics.

### ARCH-9 - Depend on Stable Ports, Not Concrete Infrastructure

Enforces DIP and ISP. Domain/application code should depend on small ports, protocols, traits, or interfaces rather than concrete infrastructure implementations.

Default severity:

- `BLOCK` when concrete infrastructure crosses inward into domain/application code.
- `WARN` for fat ports, broad interfaces, or public APIs that expose implementation details.
- `INFO` for opportunities to tighten interface boundaries.

Detection signals:

- domain/application imports concrete `Sql*`, `Http*`, `Prisma*`, `Redis*`, `S3*`, framework request/session, or SDK client types;
- constructor parameters typed as concrete adapters when a narrow port would suffice;
- public API files exporting concrete infrastructure as the primary seam;
- ports with unrelated responsibilities.

Agent action:

- define the smallest useful port near the consuming layer;
- split fat ports by consumer need;
- move implementation to infrastructure;
- wire the concrete adapter in the composition root.

### ARCH-10 - Composition Root Owns Wiring

Requires non-trivial applications to have an explicit place where the object graph is assembled.

Default severity:

- `WARN` when a non-trivial app has no clear composition root.
- `BLOCK` when business logic accesses service locators, global containers, or recursively constructs concrete dependencies.
- `INFO` for small scripts or trivial pure modules where a composition root would add ceremony.

Detection signals:

- repeated wiring across handlers, controllers, jobs, or tests;
- service locators or global containers accessed from domain/application logic;
- constructors that recursively build concrete dependencies;
- no clear startup/factory/module responsible for wiring.

Agent action:

- introduce or identify the composition root;
- move wiring there;
- keep framework adapters thin;
- allow test-specific composition roots or fixtures for tests.

## Required plugin updates

### 1. Clean Code Codex (`ccc`)

Update:

- `ccc/skills/arch-check/SKILL.md`
- `ccc/skills/conductor/SKILL.md`
- `ccc/skills/conductor/rule-explanations.md`
- `ccc/skills/conductor/auto-fix-eligibility.md`
- `ccc/skills/tdd-check/SKILL.md`

Changes:

1. Add `ARCH-7` through `ARCH-10` to `arch-check`.
2. Update conductor valid rule ID text from `ARCH-1-6` to `ARCH-1-10`.
3. Update conductor dispatch so `arch-check` runs during write operations that create or modify classes, services, repositories, modules, adapters, domain models, use cases, or wiring.
4. Keep trivial pure functions on the lighter write path to manage token cost.
5. Add rule explanations for `ARCH-7` through `ARCH-10`.
6. Add auto-fix eligibility rows for `ARCH-7` through `ARCH-10`; mark all as human-required.
7. Extend `TDD-5` guidance so tests for dependency-using components target contracts/ports.
8. Cross-reference `ARCH-8`, `ARCH-9`, and `TDD-7` from TDD guidance.

### 2. Flow architecture review (`flow`)

Update:

- `flow/skills/arch-review/SKILL.md`

Changes:

1. Align the workflow review with `ARCH-1` through `ARCH-10`.
2. Make `ccc/arch-check` the canonical source for rule IDs and semantics.
3. Avoid separate or divergent descriptions of the same rules.
4. Include composition, DI, DIP, ISP, and composition-root findings in architecture reports.

### 3. Flow SDD agents (`flow`)

Update:

- `flow/agents/sdd-specify.md`
- `flow/agents/sdd-plan.md`
- `flow/agents/sdd-tasks.md`
- `flow/skills/sdd-feature/SKILL.md`, only if the activation/handoff text needs to change

Changes:

1. Treat SDD as flow-native Copilot agents, not regular skills.
2. Keep the restored detailed specify, plan, and tasks workflow bodies in the agent files.
3. Preserve hyphenated v3 agent names and handoffs: `sdd-specify`, `sdd-plan`, and `sdd-tasks`.
4. Do not reintroduce the old standalone `sdd-workflow` plugin or old dotted agent names.
5. Add composition-first requirements to SDD only after the restored SDD agents are available in the runtime copy being edited.

### 4. GoF pattern skills (`patterns`)

Update:

- `patterns/skills/gof-advisor/SKILL.md`
- `patterns/skills/gof-refactor/SKILL.md`
- `patterns/skills/gof-evaluator/SKILL.md`
- `patterns/skills/gof-teach/SKILL.md`
- `patterns/references/gof/decision-trees.md`
- relevant GoF reference material

Changes:

1. Add composition-first as a recommendation gate.
2. Before recommending Template Method, subclass-driven Factory Method, Singleton, or inheritance-heavy variants, ask whether Strategy, Decorator, Bridge, Adapter, function injection, factory injection, or dependency injection solves the variation with less coupling.
3. Preserve canonical GoF descriptions, but clearly label historical inheritance-heavy forms as non-default in modern code.
4. Strengthen refactoring guidance for:
   - deep inheritance to Strategy/Decorator;
   - global Singleton to dependency injection;
   - scattered `new` calls to factories or composition roots.

### 5. DDD pattern skills (`patterns`)

Update:

- `patterns/skills/ddd-advisor/SKILL.md`
- `patterns/skills/ddd-refactor/SKILL.md`
- `patterns/skills/ddd-evaluator/SKILL.md`
- `patterns/skills/ddd-teach/SKILL.md`
- relevant DDD references

Changes:

1. Add guidance that aggregates enforce invariants and expose behavior, but variability should usually be modeled through value objects, specifications, policies, domain services, or ports.
2. Treat repositories as domain/application-facing interfaces with infrastructure implementations.
3. Require entity inheritance to be justified by a true ubiquitous-language subtype relationship.
4. Keep domain services stateless and pure.
5. Keep I/O, frameworks, and SDK types outside the domain.

### 6. PEAA pattern skills (`patterns`)

Update:

- `patterns/skills/peaa-advisor/SKILL.md`
- `patterns/skills/peaa-refactor/SKILL.md`
- `patterns/skills/peaa-evaluator/SKILL.md`
- `patterns/skills/peaa-teach/SKILL.md`
- `patterns/references/peaa/decision-trees.md`
- relevant PEAA inheritance-mapping references

Changes:

1. Add a pre-gate before recommending inheritance mapping:
   - Is this a true domain taxonomy?
   - Or is it accidental persistence taxonomy?
   - Is the variation behavior, role, optional capability, or data shape?
2. Prefer composition, role objects, value objects, specifications, and policy/strategy objects before inheritance mapping.
3. Keep Single Table Inheritance, Class Table Inheritance, Concrete Table Inheritance, and Inheritance Mappers available as last-resort persistence patterns.
4. Warn that inheritance mapping can harden a questionable object model into the database schema.

## Suggested implementation sequence

1. Merge PR #40 and sync/reinstall the flow plugin so the runtime has restored SDD agent bodies.
2. Update `ccc/skills/arch-check/SKILL.md` with `ARCH-7` through `ARCH-10`.
3. Update `ccc/skills/conductor/SKILL.md` dispatch, precedence, valid rule IDs, and token-budget notes.
4. Update `ccc/skills/conductor/rule-explanations.md`.
5. Update `ccc/skills/conductor/auto-fix-eligibility.md`.
6. Update `ccc/skills/tdd-check/SKILL.md` to connect TDD, ports, and dependency injection.
7. Update `flow/skills/arch-review/SKILL.md` to align with `ARCH-1` through `ARCH-10`.
8. Update `flow/agents/sdd-specify.md`, `flow/agents/sdd-plan.md`, and `flow/agents/sdd-tasks.md` to include composition-first planning prompts where they naturally belong.
9. Update GoF skills and references.
10. Update DDD skills and references.
11. Update PEAA skills and references, especially inheritance mapping.
12. Add validation fixtures or sample prompt checks.

## Validation plan

Text consistency checks:

1. `ARCH-7`, `ARCH-8`, `ARCH-9`, and `ARCH-10` appear in:
   - `ccc/skills/arch-check/SKILL.md`
   - `ccc/skills/conductor/SKILL.md`
   - `ccc/skills/conductor/rule-explanations.md`
   - `ccc/skills/conductor/auto-fix-eligibility.md`
   - `flow/skills/arch-review/SKILL.md`
2. Rule names and severities match across files.
3. Conductor valid rule ID text includes `ARCH-1-10`.
4. SDD flow agent files exist under `flow/agents/`, not `flow/skills/`, and contain restored detailed workflow bodies.
5. SDD handoffs use hyphenated v3 names (`sdd-plan`, `sdd-tasks`) and do not contain old dotted names (`sdd.plan`, `sdd.tasks`).

Dispatch checks:

1. Write-mode conductor path loads `arch-check` for class/service/module/domain/application/wiring creation.
2. Write-mode conductor path skips `arch-check` for trivial pure functions.

Pattern prompt checks:

1. GoF: "I have subclasses only to vary pricing behavior" should recommend Strategy or function injection before Template Method.
2. DDD: "Should Customer and Vendor inherit from Party?" should challenge subtype semantics and suggest roles/composition if appropriate.
3. PEAA: "How do I persist a class hierarchy?" should run the composition/domain-taxonomy pre-gate before inheritance mapping.

Regression checks:

1. Existing GoF, DDD, and PEAA canonical pattern teaching remains accessible.
2. Framework-required inheritance is not falsely flagged.
3. Valid domain object creation is not falsely flagged as hidden dependency construction.
4. SDD integration checks target `flow/agents/sdd-*` and are blocked only if the installed runtime copy has not yet picked up the restored agents from PR #40.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Over-banning inheritance | Add explicit allowed cases and severity nuance. |
| False positives on object creation | Distinguish dependencies from values, entities, DTOs, errors, local collections, factories, and test fixtures. |
| Token cost from arch checks on every write | Use deterministic activation criteria for write-mode `arch-check`. |
| Drift between `ccc` and `flow` | Treat `ccc/arch-check` as canonical and update `flow/arch-review` as a consumer. |
| Historical pattern accuracy | Preserve canonical pattern descriptions, but add modern composition-first recommendation gates. |
| SDD scope confusion | Treat `flow/agents/sdd-*` as canonical for SDD workflow bodies and `flow/skills/sdd-feature` as the activation trigger; do not create duplicate SDD skills unless the plugin architecture changes. |

## Outcome

After this upgrade, the agent ecosystem should:

1. Generate composition-first designs by default.
2. Use dependency injection for external dependencies.
3. Depend on small stable ports instead of concrete infrastructure.
4. Keep domain logic pure and testable.
5. Move object graph wiring into composition roots.
6. Teach GoF, DDD, and PEAA patterns through a modern composition-first lens.
7. Preserve valid inheritance while blocking inheritance used as a substitute for behavior composition.
