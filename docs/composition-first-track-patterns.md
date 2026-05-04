# Composition-First Track — Patterns

**Track name**: patterns-composition

**Owned tasks**:

- patterns-composition — Add composition-first gates to GoF, DDD, and PEAA
  skills and references while preserving canonical pattern teaching and
  justified inheritance cases.

**Owned files** (this track touched only these):

- `plugins/patterns/skills/gof-advisor/SKILL.md`
- `plugins/patterns/skills/gof-refactor/SKILL.md`
- `plugins/patterns/skills/gof-evaluator/SKILL.md`
- `plugins/patterns/skills/gof-teach/SKILL.md`
- `plugins/patterns/references/gof/decision-trees.md`
- `plugins/patterns/skills/ddd-advisor/SKILL.md`
- `plugins/patterns/skills/ddd-refactor/SKILL.md`
- `plugins/patterns/skills/ddd-evaluator/SKILL.md`
- `plugins/patterns/skills/ddd-teach/SKILL.md`
- `plugins/patterns/references/ddd/decision-trees.md`
- `plugins/patterns/skills/peaa-advisor/SKILL.md`
- `plugins/patterns/skills/peaa-refactor/SKILL.md`
- `plugins/patterns/skills/peaa-evaluator/SKILL.md`
- `plugins/patterns/skills/peaa-teach/SKILL.md`
- `plugins/patterns/references/peaa/decision-trees.md`
- `plugins/patterns/package.json`
- `plugins/patterns/plugin.json`
- `plugins/patterns/.claude-plugin/plugin.json`
- `plugins/patterns/test/plugin-layout.test.js`
- `plugins/patterns/test/composition-first.test.js` (new)
- `docs/composition-first-track-patterns.md` (this file)

**Dependencies**:

- Reads from sibling tracks at coordination time only (CCC `arch-check`
  ARCH-7..ARCH-10 are referenced conceptually but not edited here).
- No code dependency on Flow / SDD tracks.

**Validation commands**:

- `npm --prefix plugins/patterns test`
- Targeted text checks (covered by `test/composition-first.test.js`):
  composition-first / non-default labeling, inheritance justification and
  pre-gates, ports / policies / DI / role objects across GoF, DDD, and
  PEAA surfaces.

**Track branch**: `wt/composition-patterns`

**Worktree path**: `/home/mikecubed/projects/agent-orchestration-wt-patterns`

**Current state**:

- Patterns plugin version bumped from `3.0.0` to `3.1.0` in
  `package.json`, `plugin.json`, `.claude-plugin/plugin.json`, and the
  matching test assertion.
- GoF advisor, refactor, evaluator, and teach skills now run a
  composition-first recommendation gate before Template Method,
  subclass-driven Factory Method, Singleton, and other inheritance-heavy
  variants. Canonical descriptions are preserved; inheritance-heavy
  forms are explicitly labeled "non-default in modern code." Refactor
  guidance strengthens deep-inheritance → Strategy/Decorator,
  Singleton → DI, scattered `new` → factory/composition root.
- GoF `decision-trees.md` adds Section 0 "Composition-first pre-gate"
  and updates the index.
- DDD advisor, refactor, evaluator, and teach skills add aggregate /
  variability framing through value objects, specifications, policies,
  domain services, or ports; treat repositories as domain/application
  ports with infrastructure adapters; require a true ubiquitous-language
  subtype for entity inheritance; keep domain services stateless and
  pure with no I/O / framework / SDK types.
- DDD `decision-trees.md` adds Section 5 "Composition-first pre-gate
  before entity inheritance."
- PEAA advisor, refactor, evaluator, and teach skills add a pre-gate
  before inheritance mapping that distinguishes true domain taxonomy
  from accidental persistence taxonomy and routes variation
  (behavior / role / optional capability / data shape) to composition,
  role objects, value objects, specifications, or policy/strategy
  objects. STI / CTI / Concrete Table Inheritance / Inheritance Mappers
  are kept as last-resort persistence patterns with an explicit
  schema-hardening warning.
- PEAA `decision-trees.md` adds Section 0 "Composition-first pre-gate
  before inheritance mapping" and points Decision Tree 3 at it.
- New test file `test/composition-first.test.js` asserts the
  composition-first guidance is present across the GoF, DDD, and PEAA
  skill and decision-tree surfaces.

**Validation outcome**:

- `npm --prefix plugins/patterns test` → exit code `0`, 38 tests pass
  (manifests + layout + references + package contents + new
  composition-first suites for GoF, DDD, PEAA).

**Unresolved issues**:

- None within this track's scope. CCC `arch-check` ARCH-7..ARCH-10 and
  Flow `arch-review` alignment remain owned by their respective tracks.

**Next action**:

- Hand off to the parallel-impl coordinator for cross-track readiness
  review and merge into `feat/composition-first-architecture`.
