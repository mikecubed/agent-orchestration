# GoF Decision Trees

**Purpose**: Structured guidance for choosing between competing patterns.
Used by the `gof-advisor` skill.

**Source**: Derived from GoF Ch. 1 "How to Select a Design Pattern" (p. 28–29),
"Organizing the Catalog" (p. 10), and the Related Patterns sections throughout.
`[interpretation]` marks guidance not explicitly stated by the authors.

---

## Decision Tree Index

1. [How should objects be created?](#1-how-should-objects-be-created)
2. [How should objects be composed?](#2-how-should-objects-be-composed)
3. [How should objects communicate?](#3-how-should-objects-communicate)
4. [Is this pattern still needed in my language?](#4-is-this-pattern-still-needed-in-my-language)

---

## 1. How should objects be created?

**Source**: Ch. 3 introduction (p. 81–85), Creational pattern summaries

```
Do you need to create objects?
│
├── Do you need FAMILIES of related objects?
│   └── YES → Abstract Factory (p. 87)
│       "Provide an interface for creating families of related objects"
│       e.g., UI widget families (dark theme, light theme)
│
├── Is the object COMPLEX to construct (many steps, many parts)?
│   └── YES → Builder (p. 97)
│       "Separate construction from representation"
│       e.g., constructing a document, query, or configuration
│
├── Should SUBCLASSES decide what to create?
│   └── YES → Factory Method (p. 107)
│       "Let subclasses decide which class to instantiate"
│       e.g., framework creates objects but app specifies which
│
├── Do you need to create objects by COPYING an existing one?
│   └── YES → Prototype (p. 117)
│       "Create new objects by copying a prototype"
│       e.g., cloning configured objects, avoiding subclass explosion
│
└── Must there be EXACTLY ONE instance?
    └── YES → Singleton (p. 127)
        ⚠️ Modern preference: dependency injection instead.
        Use only when the constraint is real (hardware access, connection pool).
```

**Quick decision** `[interpretation]`:
| Need | Pattern |
|------|---------|
| Create families that vary together | Abstract Factory |
| Build complex objects step by step | Builder |
| Let subclass/config choose the type | Factory Method |
| Clone preconfigured instances | Prototype |
| Guarantee single instance | Singleton (use sparingly) |

---

## 2. How should objects be composed?

**Source**: Ch. 4 introduction (p. 137–138), Structural pattern summaries

```
How do you need to compose objects?
│
├── Need to make INCOMPATIBLE interfaces work together?
│   └── Adapter (p. 139)
│       "Convert one interface into another"
│       e.g., wrapping a third-party library
│
├── Need to vary ABSTRACTION and IMPLEMENTATION independently?
│   └── Bridge (p. 151)
│       "Decouple abstraction from implementation"
│       e.g., shapes × renderers, platforms × features
│
├── Need to treat INDIVIDUAL and COMPOSITE objects uniformly?
│   └── Composite (p. 163)
│       "Tree structures with uniform interface"
│       e.g., file systems, UI component trees, expression trees
│
├── Need to ADD RESPONSIBILITIES dynamically without subclassing?
│   └── Decorator (p. 175)
│       "Attach responsibilities dynamically"
│       e.g., logging, caching, auth wrappers
│
├── Need to SIMPLIFY a complex subsystem interface?
│   └── Facade (p. 185)
│       "Unified interface to a subsystem"
│       e.g., simplified API over complex library
│
├── Need to SHARE fine-grained objects efficiently?
│   └── Flyweight (p. 195)
│       "Share objects to save memory"
│       e.g., character objects in text editors, game tiles
│
└── Need to CONTROL ACCESS to an object?
    └── Proxy (p. 207)
        "Surrogate controls access"
        e.g., lazy loading, access control, remote proxy, caching proxy
```

**Adapter vs Bridge vs Decorator vs Proxy** `[interpretation]`:
These four have similar structures (wrapper around an object) but different intents:

| Pattern | When | Intent |
|---------|------|--------|
| Adapter | After the fact — interfaces don't match | Make existing things work together |
| Bridge | Up front — anticipate variation | Separate abstraction from implementation |
| Decorator | Need to add behavior dynamically | Stack responsibilities without subclassing |
| Proxy | Need to control access | Same interface, different access semantics |

---

## 3. How should objects communicate?

**Source**: Ch. 5 introduction (p. 221–222), Behavioral pattern summaries

```
How do objects need to communicate or distribute behavior?
│
├── ALGORITHMS that vary per context?
│   ├── Algorithm varies at RUNTIME? → Strategy (p. 315)
│   │   "Encapsulate algorithms, make them interchangeable"
│   │   Modern: pass a function/closure instead of a Strategy object
│   │
│   └── Algorithm skeleton is FIXED, steps vary by subclass? → Template Method (p. 325)
│       "Define skeleton, defer steps to subclasses"
│       Still relevant for framework hooks
│
├── REQUEST HANDLING?
│   ├── Multiple potential handlers, try each in order? → Chain of Responsibility (p. 223)
│   │   "Pass request along a chain until handled"
│   │   e.g., middleware chains, event bubbling
│   │
│   └── Encapsulate request as an object (queue, undo, log)? → Command (p. 233)
│       "Encapsulate a request as an object"
│       e.g., undo/redo, task queues, macro recording
│
├── STATE-DEPENDENT BEHAVIOR?
│   └── Object behavior changes based on internal state? → State (p. 305)
│       "Alter behavior when state changes"
│       e.g., order status, connection state, game state
│
├── OBJECT INTERACTION?
│   ├── Many objects interact in complex ways? → Mediator (p. 273)
│   │   "Centralize interaction logic"
│   │   e.g., chat rooms, air traffic control, form validation
│   │
│   └── One object changes, many need to know? → Observer (p. 293)
│       "Notify dependents of state changes"
│       Built into most frameworks (events, signals, reactive streams)
│
├── TRAVERSAL or OPERATIONS on structures?
│   ├── Need to traverse without exposing internals? → Iterator (p. 257)
│   │   Built into every modern language — use the built-in
│   │
│   └── Need to add operations to a stable class structure? → Visitor (p. 331)
│       "New operations without changing classes"
│       Modern: pattern matching (Rust `match`, Python `match/case`)
│
├── SAVING/RESTORING state?
│   └── Need to snapshot and restore object state? → Memento (p. 283)
│       "Capture state without breaking encapsulation"
│       e.g., undo, draft saving, checkpoints
│
└── INTERPRETING a language or DSL?
    └── Interpreter (p. 243)
        "Define a grammar and interpret sentences"
        Rare today — use parser generators or combinator libraries instead
```

**Strategy vs State vs Template Method** `[interpretation]`:
These three are commonly confused:

| Pattern | Binding time | Who decides? | Mechanism |
|---------|-------------|-------------|-----------|
| Strategy | Runtime — client chooses | Client | Composition (inject algorithm) |
| State | Runtime — object changes itself | Object's internal state | Composition (delegate to state object) |
| Template Method | Compile time — subclass defines | Subclass | Inheritance (override hooks) |

---

## 4. Is this pattern still needed in my language?

`[interpretation]` — assessment of modern relevance per language

```
Is the pattern a LANGUAGE FEATURE now?
│
├── Iterator
│   Python: __iter__/__next__, generators, itertools
│   TypeScript/JS: Symbol.iterator, for...of, generators
│   Rust: Iterator trait, .iter(), .map(), .filter()
│   Go: range, range-over-func (1.22+)
│   → BUILT IN. Teach the concept, use the built-in.
│
├── Observer
│   Python: asyncio, signals (Django/FastAPI)
│   TypeScript: RxJS, EventEmitter, NestJS events
│   JS: EventEmitter (Node.js built-in)
│   Rust: tokio channels (watch, broadcast)
│   Go: channels + goroutines
│   → FRAMEWORK PROVIDED. Rarely build from scratch.
│
├── Decorator (wrapper, not Python @decorator)
│   Python: @decorator IS this pattern
│   TypeScript: Stage 3 decorators
│   JS: Higher-order functions (no decorator syntax)
│   Rust: Newtype pattern + trait impl
│   Go: Middleware functions (http.HandlerFunc wrapping)
│   → PARTIALLY BUILT IN. Concept still needed for non-function wrapping.
│
├── Strategy
│   All languages: first-class functions/closures
│   → SIMPLIFIED. Pass a function instead of a Strategy object.
│     Still useful when strategy has state or multiple methods.
│
├── Prototype
│   Python: copy.deepcopy()
│   JS: Object.create(), structuredClone()
│   Rust: Clone trait
│   Go: manual deep copy
│   → BUILT IN (most languages). Concept still useful.
│
├── Singleton
│   Python: module-level instance
│   TS/JS: module cache (import returns same instance)
│   Rust: OnceLock, LazyLock
│   Go: sync.Once
│   → DISCOURAGED. Prefer dependency injection. Use only for genuine constraints.
│
├── Visitor
│   Python 3.10+: match/case
│   Rust: match on enum
│   TS: discriminated unions + exhaustive switch
│   Go: type switch
│   → BEING REPLACED by pattern matching. Still useful for double dispatch.
│
└── All other patterns
    → STILL RELEVANT. Build manually, adapting to language idioms.
```

---

## Cross-Cutting: Pattern Compatibility Matrix

| If you choose... | It pairs with... | It competes with... |
|-----------------|------------------|---------------------|
| Abstract Factory | Factory Method, Singleton, Prototype | Builder (different focus) |
| Builder | Composite | Abstract Factory (different focus) |
| Factory Method | Abstract Factory, Template Method | Prototype |
| Strategy | Flyweight, State | Template Method |
| Composite | Iterator, Visitor, Decorator, Flyweight | — |
| Decorator | Composite, Strategy | Inheritance |
| Observer | Mediator | — |
| State | Flyweight, Singleton | Strategy (similar structure) |
| Command | Composite, Memento | — |
| Template Method | Factory Method | Strategy |
| Adapter | Bridge | Facade (different scope) |
| Bridge | Abstract Factory | Adapter (similar structure) |
| Facade | Abstract Factory, Mediator | — |
| Proxy | Adapter, Decorator | — |
| Chain of Responsibility | Composite | Command |
| Mediator | Facade, Observer | — |
| Visitor | Composite, Iterator | — |
