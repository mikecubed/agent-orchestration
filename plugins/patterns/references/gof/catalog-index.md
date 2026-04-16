# GoF Design Pattern Index

**23 patterns across 3 categories. Load `catalog-core.md` for full entries. Load `lang/<language>.md` for code examples.**

Quick-find: [Creational](#creational-patterns) | [Structural](#structural-patterns) | [Behavioral](#behavioral-patterns)

---

## Creational Patterns

| Pattern | Page | Intent (one sentence) | Pairs with | Competes with |
|---------|------|-----------------------|------------|---------------|
| Abstract Factory | 87 | Provide an interface for creating families of related objects without specifying their concrete classes. | Factory Method, Singleton, Prototype | Builder (different focus) |
| Builder | 97 | Separate the construction of a complex object from its representation so the same process can create different representations. | Composite | Abstract Factory (different focus) |
| Factory Method | 107 | Define an interface for creating an object, but let subclasses decide which class to instantiate. | Abstract Factory, Template Method | Prototype (both defer creation) |
| Prototype | 117 | Specify the kinds of objects to create using a prototypical instance, and create new objects by copying this prototype. | Abstract Factory, Composite, Decorator | Factory Method (both defer creation) |
| Singleton | 127 | Ensure a class only has one instance, and provide a global point of access to it. | Abstract Factory, Facade | Dependency injection (modern preference) |

---

## Structural Patterns

| Pattern | Page | Intent (one sentence) | Pairs with | Competes with |
|---------|------|-----------------------|------------|---------------|
| Adapter | 139 | Convert the interface of a class into another interface clients expect, letting incompatible classes work together. | Bridge, Decorator | Facade (different scope) |
| Bridge | 151 | Decouple an abstraction from its implementation so that the two can vary independently. | Abstract Factory, Adapter | Adapter (similar structure, different intent) |
| Composite | 163 | Compose objects into tree structures to represent part-whole hierarchies, letting clients treat individual and composite objects uniformly. | Iterator, Visitor, Chain of Responsibility, Decorator | — |
| Decorator | 175 | Attach additional responsibilities to an object dynamically, providing a flexible alternative to subclassing. | Composite, Strategy, Adapter | Inheritance (static alternative) |
| Facade | 185 | Provide a unified interface to a set of interfaces in a subsystem, making the subsystem easier to use. | Abstract Factory, Mediator, Singleton | Adapter (different scope) |
| Flyweight | 195 | Use sharing to support large numbers of fine-grained objects efficiently. | Composite, State, Strategy | — |
| Proxy | 207 | Provide a surrogate or placeholder for another object to control access to it. | Adapter, Decorator | Decorator (similar structure, different intent) |

---

## Behavioral Patterns

| Pattern | Page | Intent (one sentence) | Pairs with | Competes with |
|---------|------|-----------------------|------------|---------------|
| Chain of Responsibility | 223 | Avoid coupling the sender of a request to its receiver by chaining receiving objects until one handles it. | Composite | Command (different dispatch model) |
| Command | 233 | Encapsulate a request as an object, letting you parameterize clients, queue/log requests, and support undo. | Composite, Memento, Prototype | Strategy (similar encapsulation, different purpose) |
| Interpreter | 243 | Given a language, define a representation for its grammar along with an interpreter that uses it. | Composite, Flyweight, Iterator, Visitor | — |
| Iterator | 257 | Provide a way to access elements of an aggregate sequentially without exposing its underlying representation. | Composite, Factory Method, Memento | — |
| Mediator | 273 | Define an object that encapsulates how a set of objects interact, promoting loose coupling. | Facade, Observer | Observer (often used together) |
| Memento | 283 | Without violating encapsulation, capture and externalize an object's internal state so it can be restored later. | Command, Iterator | — |
| Observer | 293 | Define a one-to-many dependency so that when one object changes state, all dependents are notified automatically. | Mediator, Singleton | Mediator (centralized vs distributed) |
| State | 305 | Allow an object to alter its behavior when its internal state changes, appearing to change its class. | Flyweight, Singleton | Strategy (similar structure, different binding time) |
| Strategy | 315 | Define a family of algorithms, encapsulate each one, and make them interchangeable. | Flyweight, State, Template Method | Template Method (inheritance vs composition) |
| Template Method | 325 | Define the skeleton of an algorithm, deferring some steps to subclasses without changing the algorithm's structure. | Factory Method, Strategy | Strategy (inheritance vs composition) |
| Visitor | 331 | Represent an operation to be performed on elements of an object structure without changing the classes of those elements. | Composite, Interpreter, Iterator | — |
