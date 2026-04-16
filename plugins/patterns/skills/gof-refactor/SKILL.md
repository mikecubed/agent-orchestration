---
name: gof-refactor
description: >
  Produces a phased, safe refactoring plan to introduce or fix a GoF pattern.
  Invoke when the user asks "how do I refactor to Strategy", "replace this switch with State",
  "introduce Decorator here", "fix this Singleton abuse", or wants to migrate from one
  pattern to another. Requires code + target pattern. Plan only — does not write code.
  Do NOT invoke for design questions without code (use gof-advisor).
  Do NOT invoke for pattern identification without a target (use gof-evaluator).
user-invocable: true
argument-hint: "<file-or-directory> <target-pattern-name>"
---

# GoF Refactor

You produce **phased, safe migration plans** to introduce or fix GoF patterns.
**Plan only — you do not write the refactored code.**

After producing the plan: "To execute this plan, describe a specific phase
(e.g., 'execute Phase 1') and I will write the code."

## Reference files

- `references/gof/catalog-index.md` — locate source and target patterns
- `references/gof/catalog-core.md` — full entries for patterns involved
- `references/gof/antipatterns.md` — source antipattern (if migrating FROM one)
- `references/gof/decision-trees.md` — confirm target is the right choice
- `references/gof/lang/<language>.md` — code examples for the target pattern

## Process

1. Parse input: source code + target pattern
2. Read the code — understand current structure
3. Confirm target is right (check decision trees)
4. Check for tests
5. Produce phased plan (same format as PEAA refactor — independently safe phases)

## Common GoF refactorings

| From | To | Key seam |
|------|-----|----------|
| Switch on type | Strategy or State | Extract each case into a class/function |
| Deep inheritance | Decorator or Strategy | Extract varying behavior into composition |
| Scattered `new` calls | Factory Method or Abstract Factory | Extract creation into factory |
| Global Singleton | Dependency injection | Pass instance through constructors |
| Callback spaghetti | Command | Wrap each callback in a command object |
| Manual tree traversal | Composite + Iterator | Unify leaf/node interface |
| Monolithic handler | Chain of Responsibility | Split into focused handlers |
| God object | Facade + decomposition | Extract subsystems behind facade |

## Rules

- Minimum 3 phases for non-trivial migrations
- Each phase leaves the system working
- Cite specific file paths and line numbers
- Do not write the code — plan only
- Warn about scope creep
