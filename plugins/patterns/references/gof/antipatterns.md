# GoF Antipattern Reference

**Purpose**: Maps observable code symptoms to antipatterns, then to the GoF patterns
that fix them. Used by the `gof-evaluator` skill.

**Source**: Derived from *Design Patterns* (Gamma et al., 1995) and widely recognized
OO antipatterns. Antipattern names from the book are marked *(GoF term)*. Industry-standard
names are marked `[interpretation]`.

---

## Antipattern Index

1. [God Object / Blob](#1-god-object--blob)
2. [Singleton Abuse](#2-singleton-abuse)
3. [Deep Inheritance Hierarchy](#3-deep-inheritance-hierarchy)
4. [Switch on Type](#4-switch-on-type)
5. [Tight Coupling to Concrete Classes](#5-tight-coupling-to-concrete-classes)
6. [Copy-Paste Variants](#6-copy-paste-variants)
7. [Callback Spaghetti](#7-callback-spaghetti)
8. [Monolithic Event Handler](#8-monolithic-event-handler)
9. [Hardcoded Object Creation](#9-hardcoded-object-creation)
10. [Missing Undo/Replay](#10-missing-undoreplay)
11. [Explicit Tree Traversal](#11-explicit-tree-traversal)
12. [Exposed Internal Structure](#12-exposed-internal-structure)

---

## 1. God Object / Blob

`[interpretation]` — derives from GoF's emphasis on single responsibility and delegation

### Observable symptoms

- A class with 20+ public methods spanning unrelated concerns
- Class that is a dependency of most other classes in the system
- Growing constructor parameter list (10+)
- Impossible to test in isolation — too many dependencies

### Fix patterns

| Fix | Pattern |
|-----|---------|
| Extract behavior into focused objects | **Facade** (p. 185) — simplify interface to the remainder |
| Delegate to composed objects | **Strategy** (p. 315) — extract algorithm families |
| Separate state management | **State** (p. 305) — extract state-specific behavior |
| Extract creation logic | **Factory Method** (p. 107) or **Abstract Factory** (p. 87) |

---

## 2. Singleton Abuse

`[interpretation]` — the most commonly misused GoF pattern

### Observable symptoms

- Multiple singletons referencing each other (singleton graph)
- Singletons used as global mutable state
- Unit tests require resetting singleton state between tests
- `getInstance()` / `shared` / `default` called from deep in business logic
- Cannot run tests in parallel because singletons leak state

### Why it's a problem

Singleton was designed for "ensure exactly one instance" — not "make it globally accessible."
The global access point is a convenience, not the purpose. Modern preference is dependency
injection: pass the single instance to whoever needs it instead of letting them reach for it.

### Fix patterns

| Fix | Action |
|-----|--------|
| Dependency injection | Pass the instance as a constructor parameter instead of calling `getInstance()` |
| **Factory Method** (p. 107) | Let the framework create and inject the instance |
| Module-level instance | In Python/JS/Go, a module-level variable IS a singleton without the ceremony |

---

## 3. Deep Inheritance Hierarchy

`[interpretation]` — GoF's core thesis: "Favor object composition over class inheritance" (p. 20)

### Observable symptoms

- Inheritance chain deeper than 3 levels
- Subclasses override most parent methods (fragile base class)
- Adding a new variation requires creating a new subclass
- Class explosion — N variants × M behaviors = N×M classes

### Fix patterns

| Fix | Pattern |
|-----|---------|
| Replace inheritance with composition | **Strategy** (p. 315) — inject behavior via interface |
| Wrap behavior dynamically | **Decorator** (p. 175) — stack responsibilities without subclassing |
| Separate abstraction from implementation | **Bridge** (p. 151) — two hierarchies that vary independently |
| Vary creation without subclassing | **Prototype** (p. 117) — clone configured instances |

---

## 4. Switch on Type

*(GoF term)* — explicitly discussed as motivation for State, Strategy, Visitor

### Observable symptoms

```python
if isinstance(shape, Circle):
    # draw circle
elif isinstance(shape, Rectangle):
    # draw rectangle
elif isinstance(shape, Triangle):
    # draw triangle
# ... every new shape requires modifying this function
```

- `isinstance()` / `typeof` / `switch(type)` chains
- Adding a new type requires modifying existing functions
- Same type-switch pattern duplicated across multiple functions

### Fix patterns

| Scenario | Fix | Pattern |
|----------|-----|---------|
| Behavior changes with internal state | Replace conditional with polymorphism | **State** (p. 305) |
| Algorithm varies by context | Replace conditional with pluggable algorithm | **Strategy** (p. 315) |
| New operations on stable type hierarchy | Double dispatch | **Visitor** (p. 331) |
| Object creation varies by type | Replace `switch` with factory | **Factory Method** (p. 107) |

---

## 5. Tight Coupling to Concrete Classes

*(GoF term)* — "Program to an interface, not an implementation" (p. 18)

### Observable symptoms

- Constructor calls (`new ConcreteClass()`) scattered throughout business logic
- Cannot swap implementations without changing callers
- Cannot substitute test doubles for dependencies
- Import list includes concrete implementations, not interfaces

### Fix patterns

| Fix | Pattern |
|-----|---------|
| Hide concrete class behind creation interface | **Abstract Factory** (p. 87) |
| Let subclass choose the concrete class | **Factory Method** (p. 107) |
| Depend on abstractions | **Bridge** (p. 151), **Strategy** (p. 315) |
| Convert incompatible interface | **Adapter** (p. 139) |

---

## 6. Copy-Paste Variants

`[interpretation]` — motivates Template Method and Strategy

### Observable symptoms

- Multiple functions with 90% identical code, differing in one step
- Bug fixes applied to one copy but forgotten in others
- "Forked" classes that diverge over time
- Comments like `// copied from OtherClass, modified for X`

### Fix patterns

| Fix | Pattern |
|-----|---------|
| Extract varying step to subclass | **Template Method** (p. 325) |
| Extract varying algorithm to injected object | **Strategy** (p. 315) |
| Wrap shared behavior, add variations | **Decorator** (p. 175) |

---

## 7. Callback Spaghetti

`[interpretation]` — motivates Command and Chain of Responsibility

### Observable symptoms

- Deeply nested callbacks (callback hell)
- Unclear who handles a request — multiple scattered handlers
- Impossible to add logging, undo, or replay to operations
- Request handling tightly coupled to request source

### Fix patterns

| Fix | Pattern |
|-----|---------|
| Encapsulate requests as objects | **Command** (p. 233) — queue, log, undo |
| Decouple sender from handler | **Chain of Responsibility** (p. 223) |
| Centralize interaction logic | **Mediator** (p. 273) |

---

## 8. Monolithic Event Handler

`[interpretation]` — motivates Observer and Mediator

### Observable symptoms

- One giant function that handles all events from a UI or message queue
- Adding a new event type requires modifying the central handler
- Components tightly coupled — changing one event handler breaks others
- Cannot add/remove event listeners at runtime

### Fix patterns

| Fix | Pattern |
|-----|---------|
| Decouple event source from handlers | **Observer** (p. 293) — subscribe/notify |
| Centralize complex multi-object interaction | **Mediator** (p. 273) |

---

## 9. Hardcoded Object Creation

*(GoF term)* — motivates all five creational patterns

### Observable symptoms

- `new ConcreteClass()` with hardcoded parameters scattered through code
- Cannot create variations without modifying existing code
- Test setup duplicates complex object construction
- Configuration changes require code changes

### Fix patterns

| Scenario | Pattern |
|----------|---------|
| Need families of related objects | **Abstract Factory** (p. 87) |
| Need step-by-step construction | **Builder** (p. 97) |
| Need subclass to choose what to create | **Factory Method** (p. 107) |
| Need to clone configured instances | **Prototype** (p. 117) |

---

## 10. Missing Undo/Replay

`[interpretation]` — motivates Command and Memento

### Observable symptoms

- No undo capability despite destructive operations
- Operations cannot be replayed or logged
- No audit trail of what happened and in what order
- State changes are irreversible

### Fix patterns

| Fix | Pattern |
|-----|---------|
| Encapsulate operations as objects | **Command** (p. 233) — with `undo()` |
| Snapshot state before changes | **Memento** (p. 283) — save/restore |

---

## 11. Explicit Tree Traversal

`[interpretation]` — motivates Composite, Iterator, Visitor

### Observable symptoms

- Client code manually navigates tree/graph structures with type checks
- Different traversal logic duplicated across multiple operations
- Adding a new element type requires modifying all traversal code
- Client must know the structure's internal representation

### Fix patterns

| Fix | Pattern |
|-----|---------|
| Uniform interface for leaf and composite | **Composite** (p. 163) |
| Abstract traversal from structure | **Iterator** (p. 257) |
| Separate operation from structure | **Visitor** (p. 331) |

---

## 12. Exposed Internal Structure

`[interpretation]` — motivates Facade, Proxy, Mediator

### Observable symptoms

- Clients depend on internal data structures of another class
- Changing a class's fields breaks distant code
- Law of Demeter violations (`a.b.c.d.doSomething()`)
- Subsystem internals visible to outside code

### Fix patterns

| Fix | Pattern |
|-----|---------|
| Simplified interface to subsystem | **Facade** (p. 185) |
| Control access to object | **Proxy** (p. 207) |
| Encapsulate interaction | **Mediator** (p. 273) |
| Abstract traversal | **Iterator** (p. 257) |

---

## Quick Reference: Symptom → Pattern

| Observable symptom | Primary antipattern | Fix pattern(s) |
|-------------------|--------------------|--------------------|
| Class with 20+ unrelated methods | God Object | Facade, Strategy, State |
| `getInstance()` everywhere, tests leak state | Singleton Abuse | Dependency injection, Factory Method |
| 4+ level inheritance chain, class explosion | Deep Inheritance | Strategy, Decorator, Bridge |
| `instanceof` / `typeof` chains | Switch on Type | State, Strategy, Visitor, Factory Method |
| `new ConcreteClass()` scattered in business logic | Tight Coupling | Abstract Factory, Factory Method, Bridge |
| 90% identical functions | Copy-Paste Variants | Template Method, Strategy |
| Nested callbacks, unclear request routing | Callback Spaghetti | Command, Chain of Responsibility |
| Giant event handler function | Monolithic Event Handler | Observer, Mediator |
| Hardcoded object construction | Hardcoded Creation | Abstract Factory, Builder, Factory Method, Prototype |
| No undo, no audit trail | Missing Undo/Replay | Command, Memento |
| Manual tree traversal with type checks | Explicit Tree Traversal | Composite, Iterator, Visitor |
| `a.b.c.d.doThing()` chains | Exposed Internals | Facade, Proxy, Mediator |
