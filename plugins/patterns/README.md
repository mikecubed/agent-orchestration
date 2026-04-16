# patterns

Design pattern advisor, evaluator, refactoring planner, and interactive teacher for Claude Code and GitHub Copilot CLI.

## Included Catalogs

### PEAA — Patterns of Enterprise Application Architecture

Grounded in Martin Fowler's *Patterns of Enterprise Application Architecture* (2002). Includes a 51-pattern catalog with anti-hallucination sourcing, language-specific examples (TypeScript, JavaScript, Python, Go, Rust), antipattern detection, and decision trees.

**Skills:**

| Skill | Invocation | Purpose |
|-------|-----------|---------|
| peaa-advisor | `/patterns:peaa-advisor` | Recommend patterns for a design problem |
| peaa-evaluator | `/patterns:peaa-evaluator` | Evaluate existing code for patterns and antipatterns |
| peaa-refactor | `/patterns:peaa-refactor` | Plan a phased refactoring to a target pattern |
| peaa-teach | `/patterns:peaa-teach` | Learn about patterns, compare alternatives, take quizzes |

### GoF — Gang of Four Design Patterns

Grounded in *Design Patterns: Elements of Reusable Object-Oriented Software* by Gamma, Helm, Johnson, Vlissides (1995). Includes a 23-pattern catalog with language-specific examples (TypeScript, JavaScript, Python, Go, Rust), antipattern detection, and decision trees.

**Skills:**

| Skill | Invocation | Purpose |
|-------|-----------|---------|
| gof-advisor | `/patterns:gof-advisor` | Recommend patterns for a design problem |
| gof-evaluator | `/patterns:gof-evaluator` | Evaluate existing code for patterns and antipatterns |
| gof-refactor | `/patterns:gof-refactor` | Plan a phased refactoring to a target pattern |
| gof-teach | `/patterns:gof-teach` | Learn about patterns, compare alternatives, take quizzes |

### DDD — Domain-Driven Design

Grounded in *Domain-Driven Design: Tackling Complexity in the Heart of Software* by Eric Evans (2003). Covers both tactical patterns (Entities, Value Objects, Aggregates, Services) and strategic design (Bounded Contexts, Context Maps, Distillation).

**Skills:**

| Skill | Invocation | Purpose |
|-------|-----------|---------|
| ddd-advisor | `/patterns:ddd-advisor` | Recommend tactical patterns for domain modeling |
| ddd-evaluator | `/patterns:ddd-evaluator` | Evaluate existing code for DDD patterns and antipatterns |
| ddd-refactor | `/patterns:ddd-refactor` | Plan a phased refactoring toward DDD patterns |
| ddd-strategist | `/patterns:ddd-strategist` | Strategic design: bounded contexts, context maps, distillation |
| ddd-teach | `/patterns:ddd-teach` | Learn about DDD concepts, compare alternatives, take quizzes |

## Installation

### Claude Code (session-only)

```bash
claude --plugin-dir ./plugins/patterns
```

### GitHub Copilot CLI

```bash
copilot plugin install ./plugins/patterns
```
