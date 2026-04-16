# GoF Design Pattern Catalog — Core Reference

**Source**: *Design Patterns: Elements of Reusable Object-Oriented Software* — Gamma, Helm, Johnson, Vlissides (Addison-Wesley, 1995)

**Purpose**: Language-agnostic pattern definitions. Intent, applicability, consequences, and relationships for all 23 patterns. For code examples see `lang/<language>.md`.

**Anti-hallucination policy**: Intent quotes are from the book. Other content is derived from the book and tagged where interpretation is involved.

---

## Abstract Factory (p. 87)

**Category**: Creational
**Scope**: Object

### Intent

"Provide an interface for creating families of related or dependent objects without specifying their concrete classes." (p. 87)

### Also Known As

Kit

### When to Use (Applicability)

*(from book, p. 87)*
Use this pattern when:
- A system should be independent of how its products are created, composed, and represented.
- A system should be configured with one of multiple families of products.
- A family of related product objects is designed to be used together, and you need to enforce this constraint.
- You want to provide a class library of products, and you want to reveal just their interfaces, not their implementations.

### When NOT to Use / Tradeoffs (Consequences)

*(from book + [interpretation])*
Benefits:
- It isolates concrete classes. The factory encapsulates the responsibility and the process of creating product objects; it isolates clients from implementation classes.
- It makes exchanging product families easy. The class of a concrete factory appears only once in an application — where it is instantiated. This makes it easy to change the concrete factory an application uses.
- It promotes consistency among products. When products in a family are designed to work together, it is important that an application use objects from only one family at a time. Abstract Factory makes this easy to enforce.

Liabilities:
- Supporting new kinds of products is difficult. Extending abstract factories to produce new kinds of products is not easy. The Abstract Factory interface fixes the set of products that can be created. Supporting new kinds of products requires extending the factory interface, which involves changing the Abstract Factory class and all of its subclasses.

### Key Participants

- **AbstractFactory** — declares an interface for operations that create abstract product objects.
- **ConcreteFactory** — implements the operations to create concrete product objects.
- **AbstractProduct** — declares an interface for a type of product object.
- **ConcreteProduct** — defines a product object to be created by the corresponding concrete factory; implements the AbstractProduct interface.
- **Client** — uses only interfaces declared by AbstractFactory and AbstractProduct classes.

### Related Patterns

- **Factory Method** (p. 107) — Abstract Factory classes are often implemented with Factory Methods.
- **Prototype** (p. 117) — Abstract Factory classes can also be implemented using Prototype.
- **Singleton** (p. 127) — A concrete factory is often a Singleton.

### Antipattern signals `[interpretation]`

Signs this pattern is missing or misused:
- Client code contains conditional logic (`if`/`switch`) to select which concrete class to instantiate from a product family.
- Swapping one product family for another requires shotgun surgery across many files.
- Products from different families are accidentally mixed, causing subtle bugs.
- Hard-coded class names appear throughout client code rather than behind factory interfaces.

### Modern relevance `[interpretation]`

Abstract Factory remains relevant in modern languages, particularly for dependency injection containers, plugin systems, and cross-platform UI toolkits. In Python, it can be implemented with callables or classes passed as factory arguments. In TypeScript/JavaScript, object literals or factory functions often serve the same role without formal class hierarchies. In Go, interfaces plus constructor functions achieve the same decoupling. In Rust, trait objects or generics bounded by traits replace the abstract factory interface. The pattern is less ceremonious in dynamic languages but the underlying principle — parameterizing creation of related objects — is still widely applied.

*Code examples -> `lang/<language>.md`*

---

## Builder (p. 97)

**Category**: Creational
**Scope**: Object

### Intent

"Separate the construction of a complex object from its representation so that the same construction process can create different representations." (p. 97)

### Also Known As

---

### When to Use (Applicability)

*(from book, p. 97)*
Use this pattern when:
- The algorithm for creating a complex object should be independent of the parts that make up the object and how they are assembled.
- The construction process must allow different representations for the object that is constructed.

### When NOT to Use / Tradeoffs (Consequences)

*(from book + [interpretation])*
Benefits:
- It lets you vary a product's internal representation. The Builder object provides the director with an abstract interface for constructing the product. The interface lets the builder hide the representation and internal structure of the product. Because the product is constructed through an abstract interface, all you have to do to change the product's internal representation is define a new kind of builder.
- It isolates code for construction and representation. The Builder pattern improves modularity by encapsulating the way a complex object is constructed and represented. Clients do not need to know anything about the classes that define the product's internal structure.
- It gives you finer control over the construction process. Unlike creational patterns that construct products in one shot, the Builder pattern constructs the product step by step under the director's control. Only when the product is finished does the director retrieve it from the builder. This gives finer control over the construction process and consequently the internal structure of the resulting product.

Liabilities:
- Requires creating a separate ConcreteBuilder for each different type of product. `[interpretation]` This can lead to parallel class hierarchies if there are many product variants.
- The builder interface must be general enough to allow construction of products for all kinds of concrete builders, which can constrain the design.

### Key Participants

- **Builder** — specifies an abstract interface for creating parts of a Product object.
- **ConcreteBuilder** — constructs and assembles parts of the product by implementing the Builder interface; defines and keeps track of the representation it creates; provides an interface to retrieve the product.
- **Director** — constructs an object using the Builder interface.
- **Product** — represents the complex object under construction; includes classes that define the constituent parts.

### Related Patterns

- **Abstract Factory** (p. 87) — Similar to Builder in that it too may construct complex objects. The primary difference is that the Builder pattern focuses on constructing a complex object step by step, while Abstract Factory emphasizes families of product objects.
- **Composite** (p. 163) — Composites are what the builder often builds.

### Antipattern signals `[interpretation]`

Signs this pattern is missing or misused:
- Constructors with very long parameter lists (telescoping constructors).
- Multiple constructor overloads or factory methods that differ only in which optional parameters they set.
- Complex objects are partially initialized and then mutated through a series of setter calls with no validation that the final state is consistent.
- Object creation code is duplicated across multiple call sites with slight variations.

### Modern relevance `[interpretation]`

Builder is one of the most actively used GoF patterns in modern development. Rust has an idiomatic builder pattern that is nearly ubiquitous for configuring structs with many optional fields. In Python, libraries like Pydantic use builder-like patterns, and `dataclasses` with default values serve a similar role for simpler cases. In Java/Kotlin, builders are standard (Lombok's `@Builder`). In TypeScript, method chaining on configuration objects is the same concept. The pattern has only grown in relevance as APIs have become more configurable.

*Code examples -> `lang/<language>.md`*

---

## Factory Method (p. 107)

**Category**: Creational
**Scope**: Class

### Intent

"Define an interface for creating an object, but let subclasses decide which class to instantiate. Factory Method lets a class defer instantiation to subclasses." (p. 107)

### Also Known As

Virtual Constructor

### When to Use (Applicability)

*(from book, p. 107)*
Use this pattern when:
- A class cannot anticipate the class of objects it must create.
- A class wants its subclasses to specify the objects it creates.
- Classes delegate responsibility to one of several helper subclasses, and you want to localize the knowledge of which helper subclass is the delegate.

### When NOT to Use / Tradeoffs (Consequences)

*(from book + [interpretation])*
Benefits:
- Eliminates the need to bind application-specific classes into your code. The code only deals with the Product interface; therefore it can work with any user-defined ConcreteProduct classes.
- Provides hooks for subclasses. Creating objects inside a class with a factory method is always more flexible than creating an object directly. Factory Method gives subclasses a hook for providing an extended version of an object.
- Connects parallel class hierarchies. Factory methods can connect parallel class hierarchies that arise when a class delegates some of its responsibilities to a separate class.

Liabilities:
- Clients might have to subclass the Creator class just to create a particular ConcreteProduct object. This is fine when the client has to subclass the Creator class anyway, but otherwise the client now must deal with another point of evolution.
- `[interpretation]` Can lead to a proliferation of subclasses if every product variant requires its own creator subclass.

### Key Participants

- **Product** — defines the interface of objects the factory method creates.
- **ConcreteProduct** — implements the Product interface.
- **Creator** — declares the factory method, which returns an object of type Product; may also define a default implementation of the factory method that returns a default ConcreteProduct object.
- **ConcreteCreator** — overrides the factory method to return an instance of a ConcreteProduct.

### Related Patterns

- **Abstract Factory** (p. 87) — Often implemented with Factory Methods.
- **Template Method** (p. 325) — Factory Methods are usually called within Template Methods.
- **Prototype** (p. 117) — A creation pattern that does not require subclassing Creator but often requires an Initialize operation on the Product class. Factory Method does not require such an operation.

### Antipattern signals `[interpretation]`

Signs this pattern is missing or misused:
- A base class is littered with `if`/`switch` statements selecting which concrete class to instantiate.
- New product types require modifying the creator class rather than extending it (Open/Closed Principle violation).
- Client code directly calls constructors of concrete classes that should be behind an abstraction.

### Modern relevance `[interpretation]`

Factory Method is still common, though in dynamic languages it is often simplified. In Python, a class method (e.g., `dict.fromkeys()`, `datetime.fromtimestamp()`) serves as a factory method without requiring subclassing. In JavaScript/TypeScript, plain functions or static methods fill this role. In Go, constructor functions like `NewReader()` are factory functions by convention. In Rust, `new()` and `from()` associated functions on types are idiomatic factory methods. The subclass-based form from the book is less common outside Java, but the principle of deferring instantiation decisions remains fundamental.

*Code examples -> `lang/<language>.md`*

---

## Prototype (p. 117)

**Category**: Creational
**Scope**: Object

### Intent

"Specify the kinds of objects to create using a prototypical instance, and create new objects by copying this prototype." (p. 117)

### Also Known As

---

### When to Use (Applicability)

*(from book, p. 117)*
Use this pattern when:
- A system should be independent of how its products are created, composed, and represented (like Abstract Factory, Builder, and Factory Method); *and*
- The classes to instantiate are specified at run-time, for example, by dynamic loading.
- You want to avoid building a class hierarchy of factories that parallels the class hierarchy of products.
- Instances of a class can have one of only a few different combinations of state. It may be more convenient to install a corresponding number of prototypes and clone them rather than instantiating the class manually each time with the appropriate state.

### When NOT to Use / Tradeoffs (Consequences)

*(from book + [interpretation])*
Benefits:
- Adding and removing products at run-time. Prototypes let you incorporate a new concrete product class into a system simply by registering a prototypical instance with the client.
- Specifying new objects by varying values. You can define new behavior through object composition — by specifying values for an object's variables — rather than defining new classes.
- Specifying new objects by varying structure. Many applications build objects from parts and subparts. Prototypes let you construct such objects by cloning a prototype composed of the desired parts.
- Reduced subclassing. Factory Method often produces a hierarchy of Creator classes that parallels the product class hierarchy. Prototype lets you clone a prototype instead of asking a factory method to make a new object, eliminating the need for a Creator class hierarchy.

Liabilities:
- Each subclass of Prototype must implement the Clone operation, which can be difficult. For example, adding Clone is difficult when the classes under consideration already exist. Implementing Clone can be difficult when the object's internals include objects that do not support copying or have circular references.
- `[interpretation]` Deep vs. shallow copy is a perennial source of bugs.

### Key Participants

- **Prototype** — declares an interface for cloning itself.
- **ConcretePrototype** — implements an operation for cloning itself.
- **Client** — creates a new object by asking a prototype to clone itself.

### Related Patterns

- **Abstract Factory** (p. 87) — Can use Prototype to create products. A factory might store a set of prototypes from which it clones products.
- **Composite** (p. 163) — Designs that make heavy use of Composite and Decorator can often benefit from Prototype as well.
- **Decorator** (p. 175) — Designs that make heavy use of Composite and Decorator can often benefit from Prototype.

### Antipattern signals `[interpretation]`

Signs this pattern is missing or misused:
- Complex initialization code is duplicated across many places where objects with similar configurations are created.
- A large parallel hierarchy of factory classes exists solely to produce slightly different object configurations.
- Objects that should be near-copies are constructed from scratch each time, with only minor parameter differences.

### Modern relevance `[interpretation]`

Prototype is a language-level feature in JavaScript — the entire object system is prototype-based (`Object.create()`, the prototype chain). In Python, `copy.copy()` and `copy.deepcopy()` provide cloning, and it is used in libraries but rarely called "Prototype." In Rust, the `Clone` trait is idiomatic and widely derived. In Go, there is no built-in clone; you copy structs by value (shallow) or write explicit deep-copy functions. The explicit Prototype pattern from the book is rarely implemented as a standalone design in modern languages because cloning primitives are built in, but the concept of "create by copying a template" remains important.

*Code examples -> `lang/<language>.md`*

---

## Singleton (p. 127)

**Category**: Creational
**Scope**: Object

### Intent

"Ensure a class only has one instance, and provide a global point of access to it." (p. 127)

### Also Known As

---

### When to Use (Applicability)

*(from book, p. 127)*
Use this pattern when:
- There must be exactly one instance of a class, and it must be accessible to clients from a well-known access point.
- The sole instance should be extensible by subclassing, and clients should be able to use an extended instance without modifying their code.

### When NOT to Use / Tradeoffs (Consequences)

*(from book + [interpretation])*
Benefits:
- Controlled access to sole instance. Because the Singleton class encapsulates its sole instance, it can have strict control over how and when clients access it.
- Reduced name space. The Singleton pattern is an improvement over global variables. It avoids polluting the name space with global variables that store sole instances.
- Permits refinement of operations and representation. The Singleton class may be subclassed, and it is easy to configure an application with an instance of this extended class.
- Permits a variable number of instances. The pattern makes it easy to change your mind and allow more than one instance of the Singleton class.
- More flexible than class operations (static methods). Another way to package singleton functionality is to use class operations (static member functions). But both of these language techniques make it hard to change a design to allow more than one instance of a class.

Liabilities:
- `[interpretation]` Introduces hidden global state, making unit testing difficult because tests become order-dependent and cannot run in isolation.
- `[interpretation]` Creates tight coupling — any code that accesses the singleton is coupled to its concrete class.
- `[interpretation]` Thread-safety concerns: in multithreaded environments, the lazy-initialization approach requires synchronization.
- `[interpretation]` Violates the Single Responsibility Principle by combining "manage my lifecycle" with the class's actual responsibility.

### Key Participants

- **Singleton** — defines an Instance operation that lets clients access its unique instance; may be responsible for creating its own unique instance.

### Related Patterns

- **Abstract Factory** (p. 87) — Can be implemented as a Singleton.
- **Builder** (p. 97) — Can use Singleton for its director.
- **Facade** (p. 185) — Often a Singleton because usually only one Facade object is needed.

### Antipattern signals `[interpretation]`

Signs this pattern is missing or misused:
- Multiple instances of a resource manager (database connection pool, logger, config reader) are created accidentally, causing resource contention or inconsistent state.
- Conversely (overuse signals): global state making tests flaky, difficulty substituting implementations for testing, "God object" singletons accumulating unrelated responsibilities.

### Modern relevance `[interpretation]`

Singleton is the most controversial GoF pattern. The modern consensus is that it is usually an antipattern. In Python, module-level instances are the idiomatic "singleton" — a module is loaded once and its top-level objects are singletons by default. In JavaScript/TypeScript, ES modules are singletons by nature of the module cache. In Go, `sync.Once` provides thread-safe initialization, but dependency injection is preferred. In Rust, `lazy_static!` or `once_cell`/`std::sync::OnceLock` provide global singletons, but they are used sparingly. Across all modern languages, dependency injection is the preferred alternative to Singleton for managing shared instances, as it makes dependencies explicit and testable.

*Code examples -> `lang/<language>.md`*

---

## Adapter (p. 139)

**Category**: Structural
**Scope**: Class and Object

### Intent

"Convert the interface of a class into another interface clients expect. Adapter lets classes work together that couldn't otherwise because of incompatible interfaces." (p. 139)

### Also Known As

Wrapper

### When to Use (Applicability)

*(from book, p. 139)*
Use this pattern when:
- You want to use an existing class, and its interface does not match the one you need.
- You want to create a reusable class that cooperates with unrelated or unforeseen classes, that is, classes that do not necessarily have compatible interfaces.
- *(object adapter only)* You need to use several existing subclasses, but it is impractical to adapt their interface by subclassing every one. An object adapter can adapt the interface of its parent class.

### When NOT to Use / Tradeoffs (Consequences)

*(from book + [interpretation])*

**Class adapter** (uses multiple inheritance):
Benefits:
- Adapts Adaptee to Target by committing to a concrete Adaptee class. As a consequence, a class adapter will not work when we want to adapt a class and all its subclasses.
- Lets Adapter override some of Adaptee's behavior, since Adapter is a subclass of Adaptee.
- Introduces only one object, and no additional pointer indirection is needed to get to the adaptee.

Liabilities:
- Cannot adapt a class and all its subclasses at once.

**Object adapter** (uses composition):
Benefits:
- Lets a single Adapter work with many Adaptees — that is, the Adaptee itself and all of its subclasses. The Adapter can also add functionality to all Adaptees at once.

Liabilities:
- Makes it harder to override Adaptee behavior. It will require subclassing Adaptee and making Adapter refer to the subclass rather than the Adaptee itself.

### Key Participants

- **Target** — defines the domain-specific interface that Client uses.
- **Client** — collaborates with objects conforming to the Target interface.
- **Adaptee** — defines an existing interface that needs adapting.
- **Adapter** — adapts the interface of Adaptee to the Target interface.

### Related Patterns

- **Bridge** (p. 151) — Has a structure similar to an object adapter, but Bridge has a different intent: it is meant to separate an interface from its implementation so that they can be varied easily and independently. An adapter is meant to change the interface of an existing object.
- **Decorator** (p. 175) — A decorator enhances another object without changing its interface. A decorator is thus more transparent to the application than an adapter is.
- **Proxy** (p. 207) — A proxy defines a representative or surrogate for another object and does not change its interface.

### Antipattern signals `[interpretation]`

Signs this pattern is missing or misused:
- Glue code that translates between two interfaces is scattered across multiple call sites rather than centralized in one place.
- Client code contains repeated manual translation of method names, parameter orders, or data formats when calling a third-party library.
- A wrapper class adapts an interface but also adds new behavior — this is a Decorator, not an Adapter.

### Modern relevance `[interpretation]`

Adapter is one of the most enduringly relevant patterns. Every integration with a third-party API, legacy system, or incompatible library is essentially an adapter. In Python, adapter functions and wrapper classes are everywhere. In TypeScript, adapter patterns are common when wrapping REST APIs behind typed interfaces. In Go, writing a struct that implements one interface by delegating to another is standard practice. In Rust, the `From`/`Into` traits are built-in adapter mechanisms. The name "adapter" may not always be used, but the pattern is practiced constantly.

*Code examples -> `lang/<language>.md`*

---

## Bridge (p. 151)

**Category**: Structural
**Scope**: Object

### Intent

"Decouple an abstraction from its implementation so that the two can vary independently." (p. 151)

### Also Known As

Handle/Body

### When to Use (Applicability)

*(from book, p. 151)*
Use this pattern when:
- You want to avoid a permanent binding between an abstraction and its implementation. This might be the case, for example, when the implementation must be selected or switched at run-time.
- Both the abstractions and their implementations should be extensible by subclassing. In this case, the Bridge pattern lets you combine the different abstractions and implementations and extend them independently.
- Changes in the implementation of an abstraction should have no impact on clients; that is, their code should not have to be recompiled.
- You want to share an implementation among multiple objects, and this fact should be hidden from the client.
- *(C++ specific)* You want to hide the implementation of an abstraction completely from clients (the Pimpl idiom).

### When NOT to Use / Tradeoffs (Consequences)

*(from book + [interpretation])*
Benefits:
- Decoupling interface and implementation. An implementation is not bound permanently to an interface. The implementation of an abstraction can be configured at run-time, and it is even possible for an object to change its implementation at run-time.
- Improved extensibility. You can extend the Abstraction and Implementor hierarchies independently.
- Hiding implementation details from clients. You can shield clients from implementation details, like the sharing of implementor objects and the accompanying reference count mechanism.

Liabilities:
- `[interpretation]` Adds a level of indirection, which can complicate code navigation and debugging.
- `[interpretation]` Increases the number of classes in the system — both abstraction and implementor hierarchies must be maintained.

### Key Participants

- **Abstraction** — defines the abstraction's interface; maintains a reference to an object of type Implementor.
- **RefinedAbstraction** — extends the interface defined by Abstraction.
- **Implementor** — defines the interface for implementation classes. This interface does not have to correspond exactly to Abstraction's interface; in fact the two interfaces can be quite different.
- **ConcreteImplementor** — implements the Implementor interface and defines its concrete implementation.

### Related Patterns

- **Abstract Factory** (p. 87) — An Abstract Factory can create and configure a particular Bridge.
- **Adapter** (p. 139) — Adapter is geared toward making unrelated classes work together. It is usually applied to systems after they are designed. Bridge, on the other hand, is used up-front in a design to let abstractions and implementations vary independently.

### Antipattern signals `[interpretation]`

Signs this pattern is missing or misused:
- A class hierarchy is exploding combinatorially because variations in two independent dimensions (e.g., platform + feature) are handled through inheritance rather than composition.
- Changing an implementation detail forces changes in the abstraction layer or its clients.
- You see class names like `WindowsButton`, `MacButton`, `LinuxButton` multiplied across every UI element rather than separating the "what" (Button) from the "how" (platform rendering).

### Modern relevance `[interpretation]`

Bridge is less frequently named explicitly but is practiced constantly. Any time you inject an interface/trait and swap implementations, you are using the Bridge principle. In Python, passing a strategy-like collaborator to a class is Bridge without the ceremony. In TypeScript, interfaces plus constructor injection achieve the same. In Go, defining small interfaces that structs satisfy implicitly is idiomatic Bridge. In Rust, trait objects (`dyn Trait`) or generics bounded by traits separate abstraction from implementation. The Pimpl idiom (C++ specific) has no direct analog in most modern languages because they handle compilation dependencies differently.

*Code examples -> `lang/<language>.md`*

---

## Composite (p. 163)

**Category**: Structural
**Scope**: Object

### Intent

"Compose objects into tree structures to represent part-whole hierarchies. Composite lets clients treat individual objects and compositions of objects uniformly." (p. 163)

### Also Known As

---

### When to Use (Applicability)

*(from book, p. 163)*
Use this pattern when:
- You want to represent part-whole hierarchies of objects.
- You want clients to be able to ignore the difference between compositions of objects and individual objects. Clients will treat all objects in the composite structure uniformly.

### When NOT to Use / Tradeoffs (Consequences)

*(from book + [interpretation])*
Benefits:
- Defines class hierarchies consisting of primitive objects and composite objects. Primitive objects can be composed into more complex objects, which in turn can be composed, and so on recursively. Wherever client code expects a primitive object, it can also take a composite object.
- Makes the client simple. Clients can treat composite structures and individual objects uniformly. Clients normally do not know (and should not care) whether they are dealing with a leaf or a composite component. This simplifies client code, because it avoids having to write tag-and-case-style functions over the classes that define the composition.
- Makes it easier to add new kinds of components. Newly defined Composite or Leaf subclasses work automatically with existing structures and client code. Clients do not have to be changed for new Component classes.

Liabilities:
- Can make your design overly general. The disadvantage of making it easy to add new components is that it makes it harder to restrict the components of a composite. Sometimes you want a composite to have only certain components. With Composite, you cannot rely on the type system to enforce those constraints for you. You will have to use run-time checks instead.

### Key Participants

- **Component** — declares the interface for objects in the composition; implements default behavior for the interface common to all classes; declares an interface for accessing and managing its child components.
- **Leaf** — represents leaf objects in the composition; has no children; defines behavior for primitive objects.
- **Composite** — defines behavior for components having children; stores child components; implements child-related operations in the Component interface.
- **Client** — manipulates objects in the composition through the Component interface.

### Related Patterns

- **Chain of Responsibility** (p. 223) — The component-parent link in Composite is often used for a Chain of Responsibility.
- **Decorator** (p. 175) — Often used with Composite. When decorators and composites are used together, they will usually have a common parent class. Decorators will have to support the Component interface with operations like Add, Remove, and GetChild.
- **Flyweight** (p. 195) — Lets you share components, but they can no longer refer to their parents.
- **Iterator** (p. 257) — Can be used to traverse composites.
- **Visitor** (p. 331) — Localizes operations and behavior that would otherwise be distributed across Composite and Leaf classes.

### Antipattern signals `[interpretation]`

Signs this pattern is missing or misused:
- Client code uses `instanceof`/type-checking to distinguish between individual items and collections, then handles them differently.
- Recursive tree structures have inconsistent interfaces between leaf and branch nodes, forcing clients to know which type they are working with.
- Operations on tree structures (calculate total, render, serialize) are implemented with separate recursive functions for each operation rather than a uniform interface.

### Modern relevance `[interpretation]`

Composite is still highly relevant. It is the backbone of UI component trees (React components, DOM nodes, SwiftUI views), file system APIs, AST representations, and organizational hierarchies. In Python, nested data structures and recursive protocols use this concept. In TypeScript/React, the component tree is a composite. In Rust, `enum` with recursive variants (e.g., `enum Expr`) serves as a type-safe composite. In Go, interfaces with recursive struct fields achieve the same. The pattern remains fundamental to any domain that involves tree structures.

*Code examples -> `lang/<language>.md`*

---

## Decorator (p. 175)

**Category**: Structural
**Scope**: Object

### Intent

"Attach additional responsibilities to an object dynamically. Decorators provide a flexible alternative to subclassing for extending functionality." (p. 175)

### Also Known As

Wrapper

### When to Use (Applicability)

*(from book, p. 175)*
Use this pattern when:
- You want to add responsibilities to individual objects dynamically and transparently, that is, without affecting other objects.
- For responsibilities that can be withdrawn.
- When extension by subclassing is impractical. Sometimes a large number of independent extensions are possible and would produce an explosion of subclasses to support every combination. Or a class definition may be hidden or otherwise unavailable for subclassing.

### When NOT to Use / Tradeoffs (Consequences)

*(from book + [interpretation])*
Benefits:
- More flexibility than static inheritance. The Decorator pattern provides a more flexible way to add responsibilities to objects than can be had with static (multiple) inheritance. Responsibilities can be added and removed at run-time simply by attaching and detaching them.
- Avoids feature-laden classes high up in the hierarchy. Decorator offers a pay-as-you-go approach to adding responsibilities. Instead of trying to support all foreseeable features in a complex, customizable class, you can define a simple class and add functionality incrementally with Decorator objects.

Liabilities:
- A decorator and its component are not identical. A decorator acts as a transparent enclosure, but from an object identity standpoint, a decorated component is not identical to the component itself. You should not rely on object identity when you use decorators.
- Lots of little objects. A design that uses Decorator often results in systems composed of lots of little objects that all look alike. The objects differ only in the way they are interconnected, not in their class or in the value of their variables. Although these systems are easy to customize by those who understand them, they can be hard to learn and debug.

### Key Participants

- **Component** — defines the interface for objects that can have responsibilities added to them dynamically.
- **ConcreteComponent** — defines an object to which additional responsibilities can be attached.
- **Decorator** — maintains a reference to a Component object and defines an interface that conforms to Component's interface.
- **ConcreteDecorator** — adds responsibilities to the component.

### Related Patterns

- **Adapter** (p. 139) — A decorator is different from an adapter in that a decorator only changes an object's responsibilities, not its interface. An adapter gives an object a completely new interface.
- **Composite** (p. 163) — A decorator can be viewed as a degenerate composite with only one component. However, a decorator adds additional responsibilities — it is not intended for object aggregation.
- **Strategy** (p. 315) — A decorator lets you change the skin of an object; a strategy lets you change the guts.

### Antipattern signals `[interpretation]`

Signs this pattern is missing or misused:
- A class hierarchy explodes with subclasses for every combination of features (e.g., `ScrollableTextView`, `BorderedScrollableTextView`, `ShadowedBorderedScrollableTextView`).
- Functionality that should be optional or composable is baked into a monolithic base class.
- You find yourself copying code across subclasses that differ only in one added behavior.

### Modern relevance `[interpretation]`

Decorator is deeply embedded in modern languages. Python's `@decorator` syntax is named after this pattern and is used pervasively (`@property`, `@staticmethod`, `@app.route()`, `@pytest.fixture`). TypeScript decorators (stage 3 / TC39) follow the same concept for classes and methods. In JavaScript, higher-order functions and middleware (Express, Koa) are decorators in spirit. In Rust, the newtype pattern and trait wrapping achieve decoration. In Go, wrapping `http.Handler` with middleware is exactly the Decorator pattern. This is one of the most alive GoF patterns.

*Code examples -> `lang/<language>.md`*

---

## Facade (p. 185)

**Category**: Structural
**Scope**: Object

### Intent

"Provide a unified interface to a set of interfaces in a subsystem. Facade defines a higher-level interface that makes the subsystem easier to use." (p. 185)

### Also Known As

---

### When to Use (Applicability)

*(from book, p. 185)*
Use this pattern when:
- You want to provide a simple interface to a complex subsystem. Subsystems often get more complex as they evolve. A facade can provide a simple default view of the subsystem that is good enough for most clients.
- There are many dependencies between clients and the implementation classes of an abstraction. Introduce a facade to decouple the subsystem from clients and other subsystems, thereby promoting subsystem independence and portability.
- You want to layer your subsystems. Use a facade to define an entry point to each subsystem level. If subsystems are dependent, then you can simplify the dependencies between them by making them communicate with each other solely through their facades.

### When NOT to Use / Tradeoffs (Consequences)

*(from book + [interpretation])*
Benefits:
- It shields clients from subsystem components, thereby reducing the number of objects that clients deal with and making the subsystem easier to use.
- It promotes weak coupling between the subsystem and its clients. Often the components in a subsystem are strongly coupled. Weak coupling lets you vary the components of the subsystem without affecting its clients.
- It does not prevent applications from using subsystem classes if they need to. You can choose between ease of use and generality.

Liabilities:
- `[interpretation]` Can become a "God object" if it accumulates too many responsibilities from the subsystem.
- `[interpretation]` May hide useful flexibility — clients who need fine-grained control must bypass the facade, potentially duplicating logic.

### Key Participants

- **Facade** — knows which subsystem classes are responsible for a request; delegates client requests to appropriate subsystem objects.
- **Subsystem classes** — implement subsystem functionality; handle work assigned by the Facade object; have no knowledge of the facade (they keep no references to it).

### Related Patterns

- **Abstract Factory** (p. 87) — Can be used with Facade to provide an interface for creating subsystem objects in a subsystem-independent way.
- **Mediator** (p. 273) — Similar to Facade in that it abstracts functionality of existing classes. However, Mediator's purpose is to abstract arbitrary communication between colleague objects; it centralizes functionality that does not belong in any one of them. Colleagues are aware of and communicate with the mediator instead of communicating with each other directly. In contrast, a facade merely abstracts the interface to subsystem objects to make them easier to use; it does not define new functionality.
- **Singleton** (p. 127) — Usually only one Facade object is required. Thus Facade objects are often Singletons.

### Antipattern signals `[interpretation]`

Signs this pattern is missing or misused:
- Client code directly orchestrates multiple subsystem classes in a specific order, and this orchestration is repeated across many clients.
- New developers must understand an entire subsystem's internal structure to accomplish simple tasks.
- Changes to subsystem internals ripple out to many client modules.

### Modern relevance `[interpretation]`

Facade is universal and timeless. Every SDK, library wrapper, and API client is a facade. Python's `requests` library is a facade over `urllib3`, `http.cookiejar`, and other modules. In TypeScript/JavaScript, modules that re-export a curated public API are facades. In Go, packages that expose a simple API while orchestrating complex internals follow this pattern. In Rust, crate-level `pub` APIs that hide internal module complexity are facades. The pattern is so fundamental it often is not named — it is just called "good API design."

*Code examples -> `lang/<language>.md`*

---

## Flyweight (p. 195)

**Category**: Structural
**Scope**: Object

### Intent

"Use sharing to support large numbers of fine-grained objects efficiently." (p. 195)

### Also Known As

---

### When to Use (Applicability)

*(from book, p. 195)*
Use this pattern when *all* of the following are true:
- An application uses a large number of objects.
- Storage costs are high because of the sheer quantity of objects.
- Most object state can be made extrinsic.
- Many groups of objects may be replaced by relatively few shared objects once extrinsic state is removed.
- The application does not depend on object identity. Since flyweight objects may be shared, identity tests will return true for conceptually distinct objects.

### When NOT to Use / Tradeoffs (Consequences)

*(from book + [interpretation])*
Benefits:
- Reduces the total number of instances, saving memory.
- Reduces the amount of intrinsic state per object.
- Extrinsic state can be computed or stored externally, traded for computation time.

Liabilities:
- May introduce run-time costs associated with transferring, finding, and computing extrinsic state, especially if it was formerly stored as intrinsic state.
- `[interpretation]` Complicates the design by splitting object state into intrinsic and extrinsic parts. Developers must understand which state is shared and which is not.
- `[interpretation]` Shared flyweights must be immutable, constraining how they can be used.

### Key Participants

- **Flyweight** — declares an interface through which flyweights can receive and act on extrinsic state.
- **ConcreteFlyweight** — implements the Flyweight interface and stores intrinsic state. A ConcreteFlyweight object must be sharable. Any state it stores must be intrinsic.
- **UnsharedConcreteFlyweight** — not all Flyweight subclasses need to be shared. The Flyweight interface enables sharing; it does not enforce it.
- **FlyweightFactory** — creates and manages flyweight objects; ensures that flyweights are shared properly.
- **Client** — maintains a reference to flyweights; computes or stores the extrinsic state of flyweights.

### Related Patterns

- **Composite** (p. 163) — The Flyweight pattern is often combined with the Composite pattern to implement a logically hierarchical structure in terms of a directed-acyclic graph with shared leaf nodes.
- **State** (p. 305) — State objects are often Flyweights.
- **Strategy** (p. 315) — Strategy objects are often Flyweights.

### Antipattern signals `[interpretation]`

Signs this pattern is missing or misused:
- An application creates millions of near-identical objects and runs out of memory.
- Object allocation and garbage collection dominate profiling results.
- Many objects share the same values for most fields, yet each has its own allocation.

### Modern relevance `[interpretation]`

Flyweight is a performance optimization pattern that remains relevant in specific domains: game development (rendering millions of sprites/particles), text rendering (character glyphs), geographic information systems, and caching layers. In Python, string interning (`sys.intern()`) and integer caching (`-5` to `256`) are language-level flyweights. In Java, `String.intern()` and `Integer.valueOf()` caching are flyweights. In JavaScript, the pattern is less common due to V8's optimizations but appears in object pools. In Rust, `Rc`/`Arc` enable shared ownership which can serve flyweight purposes. For most business applications, flyweight is unnecessary — it is a pattern for when memory is a measured bottleneck.

*Code examples -> `lang/<language>.md`*

---

## Proxy (p. 207)

**Category**: Structural
**Scope**: Object

### Intent

"Provide a surrogate or placeholder for another object to control access to it." (p. 207)

### Also Known As

Surrogate

### When to Use (Applicability)

*(from book, p. 207)*
Use this pattern when there is a need for a more versatile or sophisticated reference to an object than a simple pointer. Common situations:
- **Remote proxy** provides a local representative for an object in a different address space.
- **Virtual proxy** creates expensive objects on demand (lazy initialization).
- **Protection proxy** controls access to the original object, useful when objects should have different access rights.
- **Smart reference** is a replacement for a bare pointer that performs additional actions when an object is accessed (e.g., counting references, loading persistent objects into memory on first reference, checking that the real object is locked before access).

### When NOT to Use / Tradeoffs (Consequences)

*(from book + [interpretation])*
Benefits:
- A remote proxy can hide the fact that an object resides in a different address space.
- A virtual proxy can perform optimizations such as creating an object on demand.
- Both protection proxies and smart references allow additional housekeeping tasks when an object is accessed.
- Copy-on-write: the proxy can defer copying an expensive object until the copy is actually modified, extending the virtual proxy concept.

Liabilities:
- `[interpretation]` Adds a level of indirection, which may introduce latency or complicate debugging.
- `[interpretation]` The proxy must keep its interface synchronized with the real subject — if the subject's interface changes, the proxy must change too.

### Key Participants

- **Proxy** — maintains a reference that lets the proxy access the real subject; provides an interface identical to Subject's so that a proxy can be substituted for the real subject; controls access to the real subject and may be responsible for creating and deleting it.
- **Subject** — defines the common interface for RealSubject and Proxy so that a Proxy can be used anywhere a RealSubject is expected.
- **RealSubject** — defines the real object that the proxy represents.

### Related Patterns

- **Adapter** (p. 139) — An adapter provides a different interface to the object it adapts. In contrast, a proxy provides the same interface as its subject.
- **Decorator** (p. 175) — Although decorators can have similar implementations as proxies, decorators have a different purpose. A decorator adds one or more responsibilities to an object, whereas a proxy controls access to an object.

### Antipattern signals `[interpretation]`

Signs this pattern is missing or misused:
- Expensive resource initialization (database connections, large files, remote service clients) happens eagerly even when the resource may never be used.
- Access control checks are scattered throughout client code instead of centralized in a single control point.
- Remote service calls are made directly without any local representative handling caching, retrying, or connection management.

### Modern relevance `[interpretation]`

Proxy is deeply relevant. JavaScript's `Proxy` object is a language-level implementation of this pattern, enabling meta-programming (Vue 3's reactivity system uses `Proxy`). In Python, `__getattr__`/`__getattribute__` enables transparent proxying, used by ORMs (SQLAlchemy lazy loading), mock libraries (`unittest.mock`), and RPC frameworks. In Go, interface-based wrappers serve as proxies (e.g., wrapping `http.RoundTripper` for logging/retries). In Rust, `Deref` trait implementations create smart-pointer proxies (`Box`, `Rc`, `Arc`). Network proxies (reverse proxies, API gateways) are architectural-level applications of this pattern.

*Code examples -> `lang/<language>.md`*

---

## Chain of Responsibility (p. 223)

**Category**: Behavioral
**Scope**: Object

### Intent

"Avoid coupling the sender of a request to its receiver by giving more than one object a chance to handle the request. Chain the receiving objects and pass the request along the chain until an object handles it." (p. 223)

### Also Known As

---

### When to Use (Applicability)

*(from book, p. 223)*
Use this pattern when:
- More than one object may handle a request, and the handler is not known a priori. The handler should be ascertained automatically.
- You want to issue a request to one of several objects without specifying the receiver explicitly.
- The set of objects that can handle a request should be specified dynamically.

### When NOT to Use / Tradeoffs (Consequences)

*(from book + [interpretation])*
Benefits:
- Reduced coupling. The pattern frees an object from knowing which other object handles a request. An object only has to know that a request will be handled "appropriately." Both the receiver and the sender have no explicit knowledge of each other, and an object in the chain does not have to know about the chain's structure.
- Added flexibility in assigning responsibilities to objects. You can add or change responsibilities for handling a request by adding to or otherwise changing the chain at run-time. You can combine this with subclassing to specialize handlers statically.

Liabilities:
- Receipt is not guaranteed. Since a request has no explicit receiver, there is no guarantee it will be handled — the request can fall off the end of the chain without ever being handled. A request can also go unhandled when the chain is not configured properly.

### Key Participants

- **Handler** — defines an interface for handling requests; optionally implements the successor link.
- **ConcreteHandler** — handles requests it is responsible for; can access its successor; if the ConcreteHandler can handle the request, it does so; otherwise it forwards the request to its successor.
- **Client** — initiates the request to a ConcreteHandler object on the chain.

### Related Patterns

- **Composite** (p. 163) — Chain of Responsibility is often applied in conjunction with Composite. A component's parent can act as its successor.

### Antipattern signals `[interpretation]`

Signs this pattern is missing or misused:
- A single handler function contains a long `if/elif/else` or `switch` chain for dispatching requests to different processing logic.
- Adding a new type of request handler requires modifying existing dispatch code rather than simply adding a new handler to the chain.
- The sender must know exactly which object can handle its request, creating tight coupling.

### Modern relevance `[interpretation]`

Chain of Responsibility is heavily used in modern web development, even if not always named. Express/Koa middleware chains are Chain of Responsibility — each middleware either handles the request or calls `next()`. Django middleware, ASP.NET middleware, and Rack middleware all follow this pattern. In Python, logging handlers form a chain. In Go, `http.Handler` middleware wrapping is a chain. In Rust, tower's `Service` and layer middleware follow the same principle. Event bubbling in the DOM is also a Chain of Responsibility. The pattern is alive and well.

*Code examples -> `lang/<language>.md`*

---

## Command (p. 233)

**Category**: Behavioral
**Scope**: Object

### Intent

"Encapsulate a request as an object, thereby letting you parameterize clients with different requests, queue or log requests, and support undoable operations." (p. 233)

### Also Known As

Action, Transaction

### When to Use (Applicability)

*(from book, p. 233)*
Use this pattern when:
- You want to parameterize objects by an action to perform (a callback is a procedural equivalent). Commands are an object-oriented replacement for callbacks.
- You want to specify, queue, and execute requests at different times. A Command object can have a lifetime independent of the original request.
- You need to support undo. The Command's Execute operation can store state for reversing its effects in the command itself. The Command interface must have an added Unexecute operation that reverses the effects of a previous call to Execute.
- You need to support logging changes so that they can be reapplied in case of a system crash. By augmenting the Command interface with load and store operations, you can keep a persistent log of changes.
- You want to structure a system around high-level operations built on primitives operations. Such a structure is common in information systems that support transactions. A transaction encapsulates a set of changes to data. The Command pattern offers a way to model transactions.

### When NOT to Use / Tradeoffs (Consequences)

*(from book + [interpretation])*
Benefits:
- Command decouples the object that invokes the operation from the one that knows how to perform it.
- Commands are first-class objects. They can be manipulated and extended like any other object.
- You can assemble commands into a composite command (a macro). Composite commands are instances of the Composite pattern.
- It is easy to add new Commands, because you do not have to change existing classes.

Liabilities:
- `[interpretation]` Can lead to a large number of small command classes, one for each action, increasing code volume.
- `[interpretation]` For simple operations, the overhead of a Command object may be unnecessary — a plain function or lambda suffices.

### Key Participants

- **Command** — declares an interface for executing an operation.
- **ConcreteCommand** — defines a binding between a Receiver object and an action; implements Execute by invoking the corresponding operations on Receiver.
- **Client** — creates a ConcreteCommand object and sets its receiver.
- **Invoker** — asks the command to carry out the request.
- **Receiver** — knows how to perform the operations associated with carrying out a request. Any class may serve as a Receiver.

### Related Patterns

- **Composite** (p. 163) — Can be used to implement MacroCommands (composite commands).
- **Memento** (p. 283) — Can keep state the command requires to undo its effect.
- **Prototype** (p. 117) — A command that must be copied before being placed on a history list acts as a Prototype.

### Antipattern signals `[interpretation]`

Signs this pattern is missing or misused:
- Undo/redo is implemented by saving and restoring entire application state rather than recording discrete reversible operations.
- Request processing logic is tightly coupled to the UI or API layer, making it impossible to queue, log, or replay operations.
- Actions cannot be serialized or transmitted because they are embedded as inline code rather than encapsulated as objects.

### Modern relevance `[interpretation]`

Command remains highly relevant. Undo/redo systems (text editors, design tools, IDEs) are built on Command. Event sourcing and CQRS architectures are Command at the architectural level. In Python, callables and closures can replace simple commands, but complex ones (with undo, logging, or queuing) still benefit from Command objects. In TypeScript, Redux actions are commands. In Go, commands are typically implemented as interfaces with an `Execute()` method. In Rust, closures (`FnOnce`, `Fn`) serve as lightweight commands. Task queues (Celery, Sidekiq, Bull) are Command infrastructure. The pattern is less about the class structure and more about the principle of reified requests.

*Code examples -> `lang/<language>.md`*

---

## Interpreter (p. 243)

**Category**: Behavioral
**Scope**: Class

### Intent

"Given a language, define a represention for its grammar along with an interpreter that uses the representation to interpret sentences in the language." (p. 243)

### Also Known As

---

### When to Use (Applicability)

*(from book, p. 243)*
Use this pattern when there is a language to interpret, and you can represent statements in the language as abstract syntax trees. The Interpreter pattern works best when:
- The grammar is simple. For complex grammars, the class hierarchy for the grammar becomes large and unmanageable. Tools such as parser generators are a better alternative in such cases.
- Efficiency is not a critical concern. The most efficient interpreters are usually not implemented by interpreting parse trees directly but by first translating them into another form.

### When NOT to Use / Tradeoffs (Consequences)

*(from book + [interpretation])*
Benefits:
- It is easy to change and extend the grammar. Because the pattern uses classes to represent grammar rules, you can use inheritance to change or extend the grammar.
- Implementing the grammar is easy, too. Classes defining nodes in the abstract syntax tree have similar implementations. These classes are easy to write, and often their generation can be automated with a compiler or parser generator.
- Adding new ways to interpret expressions is easy. The Interpreter pattern makes it easier to evaluate an expression in a new way. For example, you can support pretty printing or type-checking an expression by defining a new operation on the expression classes.

Liabilities:
- Complex grammars are hard to maintain. The Interpreter pattern defines at least one class for every rule in the grammar. Hence grammars containing many rules can be hard to manage and maintain.
- `[interpretation]` For nontrivial grammars, the resulting class hierarchy can be very large and performance can suffer due to the overhead of tree traversal.

### Key Participants

- **AbstractExpression** — declares an abstract Interpret operation that is common to all nodes in the abstract syntax tree.
- **TerminalExpression** — implements an Interpret operation associated with terminal symbols in the grammar; an instance is required for every terminal symbol in a sentence.
- **NonterminalExpression** — one such class is required for every rule in the grammar; maintains instance variables of type AbstractExpression for each symbol in the rule; implements an Interpret operation for nonterminal symbols in the grammar.
- **Context** — contains information that is global to the interpreter.
- **Client** — builds (or is given) an abstract syntax tree representing a particular sentence in the language that the grammar defines; invokes the Interpret operation.

### Related Patterns

- **Composite** (p. 163) — The abstract syntax tree is an instance of the Composite pattern.
- **Flyweight** (p. 195) — Shows how to share terminal symbols within the abstract syntax tree.
- **Iterator** (p. 257) — The interpreter can use an Iterator to traverse the structure.
- **Visitor** (p. 331) — Can be used to maintain the behavior in each node in the abstract syntax tree in one class.

### Antipattern signals `[interpretation]`

Signs this pattern is missing or misused:
- Custom DSL evaluation logic is implemented as a monolithic function with deeply nested conditionals rather than a composable tree of expression objects.
- Every change to a DSL's grammar requires modifying a single large parsing/evaluation function.
- Expression evaluation logic is duplicated across multiple parts of the codebase.

### Modern relevance `[interpretation]`

Interpreter as described in GoF is rarely implemented manually today. For simple DSLs, most developers use parser combinators (Rust's `nom`, Python's `pyparsing`, Haskell's `parsec`) or parser generators (ANTLR, PEG.js). For configuration languages, developers use existing formats (JSON, YAML, TOML) with schema validation rather than building interpreters. However, the underlying concept appears in template engines (Jinja2, Handlebars), query builders (ORM query DSLs), rule engines, and expression evaluators. The AST + recursive evaluation model from Interpreter is exactly how real compilers and interpreters work — it has been professionalized rather than abandoned.

*Code examples -> `lang/<language>.md`*

---

## Iterator (p. 257)

**Category**: Behavioral
**Scope**: Object

### Intent

"Provide a way to access the elements of an aggregate object sequentially without exposing its underlying representation." (p. 257)

### Also Known As

Cursor

### When to Use (Applicability)

*(from book, p. 257)*
Use this pattern when:
- You want to access an aggregate object's contents without exposing its internal representation.
- You want to support multiple traversals of aggregate objects.
- You want to provide a uniform interface for traversing different aggregate structures (that is, to support polymorphic iteration).

### When NOT to Use / Tradeoffs (Consequences)

*(from book + [interpretation])*
Benefits:
- It supports variations in the traversal of an aggregate. Complex aggregates may be traversed in many ways. Iterators make it easy to change the traversal algorithm: just replace the iterator instance with a different one.
- Iterators simplify the Aggregate interface. Iterator's traversal interface obviates the need for a similar interface in Aggregate, thereby simplifying the aggregate's interface.
- More than one traversal can be pending on an aggregate. An iterator keeps track of its own traversal state. Therefore you can have more than one traversal in progress at once.

Liabilities:
- `[interpretation]` External iterators can be invalidated if the underlying collection is modified during iteration — this is a common source of bugs.
- `[interpretation]` For simple collections, an iterator adds unnecessary abstraction over direct indexing.

### Key Participants

- **Iterator** — defines an interface for accessing and traversing elements.
- **ConcreteIterator** — implements the Iterator interface; keeps track of the current position in the traversal of the aggregate.
- **Aggregate** — defines an interface for creating an Iterator object.
- **ConcreteAggregate** — implements the Iterator creation interface to return an instance of the proper ConcreteIterator.

### Related Patterns

- **Composite** (p. 163) — Iterators are often applied to recursive structures such as Composites.
- **Factory Method** (p. 107) — Polymorphic iterators rely on factory methods to instantiate the appropriate Iterator subclass.
- **Memento** (p. 283) — Often used with Iterator. An iterator can use a memento to capture the state of an iteration. The iterator stores the memento internally.

### Antipattern signals `[interpretation]`

Signs this pattern is missing or misused:
- Client code accesses collection internals (array indices, linked list pointers, hash table buckets) directly to traverse elements.
- Traversal logic (current position, has-next check, advancement) is duplicated across multiple clients of the same collection.
- Changing the collection's internal data structure requires changing all traversal code.

### Modern relevance `[interpretation]`

Iterator is fully absorbed into every modern language. Python has `__iter__`/`__next__` and the iterator protocol, plus generators (`yield`). JavaScript has `Symbol.iterator` and the iterable protocol, plus generators and `for...of`. Rust has the `Iterator` trait with a rich combinatorial API (`map`, `filter`, `fold`, `collect`). Go has `range` for built-in types and the newer `iter` package (Go 1.23). Java has `Iterable`/`Iterator` and streams. You will almost never implement the GoF Iterator pattern from scratch — you implement the language's iterator protocol instead. The concept is as important as ever, but the pattern has been standardized into language infrastructure.

*Code examples -> `lang/<language>.md`*

---

## Mediator (p. 273)

**Category**: Behavioral
**Scope**: Object

### Intent

"Define an object that encapsulates how a set of objects interact. Mediator promotes loose coupling by keeping objects from referring to each other explicitly, and it lets you vary their interaction independently." (p. 273)

### Also Known As

---

### When to Use (Applicability)

*(from book, p. 273)*
Use this pattern when:
- A set of objects communicate in well-defined but complex ways. The resulting interdependencies are unstructured and difficult to understand.
- Reusing an object is difficult because it refers to and communicates with many other objects.
- A behavior that is distributed between several classes should be customizable without a lot of subclassing.

### When NOT to Use / Tradeoffs (Consequences)

*(from book + [interpretation])*
Benefits:
- It limits subclassing. A mediator localizes behavior that otherwise would be distributed among several objects. Changing this behavior requires subclassing Mediator only; Colleague classes can be reused as is.
- It decouples colleagues. A mediator promotes loose coupling between colleagues. You can vary and reuse Colleague and Mediator classes independently.
- It simplifies object protocols. A mediator replaces many-to-many interactions with one-to-many interactions between the mediator and its colleagues. One-to-many relationships are easier to understand, maintain, and extend.
- It abstracts how objects cooperate. Making mediation an independent concept and encapsulating it in an object lets you focus on how objects interact apart from their individual behavior.

Liabilities:
- It centralizes control. The mediator pattern trades complexity of interaction for complexity in the mediator. Because a mediator encapsulates protocols, it can become more complex than any individual colleague. This can make the mediator itself a monolith that is hard to maintain.

### Key Participants

- **Mediator** — defines an interface for communicating with Colleague objects.
- **ConcreteMediator** — implements cooperative behavior by coordinating Colleague objects; knows and maintains its colleagues.
- **Colleague classes** — each Colleague class knows its Mediator object; each colleague communicates with its mediator whenever it would have otherwise communicated with another colleague.

### Related Patterns

- **Facade** (p. 185) — Facade differs from Mediator in that it abstracts a subsystem of objects to provide a more convenient interface. Its protocol is unidirectional; that is, Facade objects make requests of the subsystem classes but not vice versa. In contrast, Mediator enables cooperative behavior that colleague objects do not or cannot provide, and the protocol is multidirectional.
- **Observer** (p. 293) — Colleagues can communicate with the mediator using the Observer pattern.

### Antipattern signals `[interpretation]`

Signs this pattern is missing or misused:
- Many objects hold direct references to each other and communicate in a tangled web of callbacks or method calls.
- Adding a new participant to a group of collaborating objects requires modifying many existing participants.
- You cannot test one object in isolation because it is tightly coupled to several peers.
- A "mediator" exists but has grown into a God object containing business logic that belongs in the colleagues.

### Modern relevance `[interpretation]`

Mediator remains relevant for UI coordination (form validation, dialog management), chat/messaging systems, and air traffic control-style coordination problems. In JavaScript/TypeScript, event buses and state management stores (Redux, Vuex) act as mediators. In Python, message brokers and event dispatchers serve this role. In Go, a central coordinator goroutine receiving from multiple channels is a mediator. In Rust, channels with a coordinating task achieve the same. The pattern is also seen at the architectural level: message queues (RabbitMQ, Kafka) mediate between microservices.

*Code examples -> `lang/<language>.md`*

---

## Memento (p. 283)

**Category**: Behavioral
**Scope**: Object

### Intent

"Without violating encapsulation, capture and externalize an object's internal state so that the object can be restored to this state later." (p. 283)

### Also Known As

Token

### When to Use (Applicability)

*(from book, p. 283)*
Use this pattern when:
- A snapshot of (some portion of) an object's state must be saved so that it can be restored to that state later, *and*
- A direct interface to obtaining the state would expose implementation details and break the object's encapsulation.

### When NOT to Use / Tradeoffs (Consequences)

*(from book + [interpretation])*
Benefits:
- Preserving encapsulation boundaries. Memento avoids exposing information that only an originator should manage but that must be stored nevertheless outside the originator. The pattern shields other objects from potentially complex Originator internals, thereby preserving encapsulation boundaries.
- It simplifies Originator. In other encapsulation-preserving designs, Originator keeps the versions of internal state that clients have requested. That puts all the storage management burden on Originator. Having clients manage the state they ask for simplifies Originator and keeps clients from having to notify originators when they are done.

Liabilities:
- Using mementos might be expensive. Mementos might incur considerable overhead if Originator must copy large amounts of information to store in the memento or if clients create and return mementos to the originator often enough.
- Defining narrow and wide interfaces. It may be difficult in some languages to ensure that only the originator can access the memento's state.
- Hidden costs in caring for mementos. A caretaker is responsible for deleting the mementos it cares for. However, the caretaker has no idea how much state is in the memento. Hence an otherwise lightweight caretaker might incur large storage costs when it stores mementos.

### Key Participants

- **Memento** — stores internal state of the Originator object; protects against access by objects other than the originator.
- **Originator** — creates a memento containing a snapshot of its current internal state; uses the memento to restore its internal state.
- **Caretaker** — is responsible for the memento's safekeeping; never operates on or examines the contents of a memento.

### Related Patterns

- **Command** (p. 233) — Commands can use mementos to maintain state for undoable operations.
- **Iterator** (p. 257) — Mementos can be used for iteration to capture the state of an iteration.

### Antipattern signals `[interpretation]`

Signs this pattern is missing or misused:
- An object exposes all its internal state through getters just so external code can save and restore it, breaking encapsulation.
- Undo is implemented by storing entire system snapshots instead of targeted state captures.
- State history/versioning is coupled to the object's primary interface, cluttering it with save/restore methods.

### Modern relevance `[interpretation]`

Memento is relevant wherever state snapshots are needed: undo/redo, time-travel debugging (Redux DevTools), database transactions, and version control. In Python, `pickle` and `copy.deepcopy()` can create mementos, though they serialize everything rather than just the essential state. In JavaScript, `JSON.parse(JSON.stringify(state))` is a crude memento. In Rust, `#[derive(Clone)]` plus explicit snapshot types serve as mementos. The pattern is used implicitly more than explicitly — any time you serialize state for later restoration, you are using Memento. Event sourcing is an architectural evolution of Memento where the "mementos" are the events themselves.

*Code examples -> `lang/<language>.md`*

---

## Observer (p. 293)

**Category**: Behavioral
**Scope**: Object

### Intent

"Define a one-to-many dependency between objects so that when one object changes, all its dependents are notified and updated automatically." (p. 293)

### Also Known As

Dependents, Publish-Subscribe

### When to Use (Applicability)

*(from book, p. 293)*
Use this pattern when:
- An abstraction has two aspects, one dependent on the other. Encapsulating these aspects in separate objects lets you vary and reuse them independently.
- A change to one object requires changing others, and you do not know how many objects need to be changed.
- An object should be able to notify other objects without making assumptions about who these objects are. In other words, you do not want these objects tightly coupled.

### When NOT to Use / Tradeoffs (Consequences)

*(from book + [interpretation])*
Benefits:
- Abstract coupling between Subject and Observer. All a subject knows is that it has a list of observers, each conforming to the simple interface of the abstract Observer class. The subject does not know the concrete class of any observer. Thus the coupling between subjects and observers is abstract and minimal.
- Support for broadcast communication. Unlike an ordinary request, the notification that a subject sends need not specify its receiver. The notification is broadcast automatically to all interested objects that subscribed to it.

Liabilities:
- Unexpected updates. Because observers have no knowledge of each other's presence, they can be blind to the ultimate cost of changing the subject. A seemingly innocuous operation on the subject may cause a cascade of updates to observers and their dependent objects. Moreover, dependency criteria that are not well-defined or maintained usually lead to spurious updates, which can be hard to track down.
- `[interpretation]` Memory leaks from forgotten subscriptions (the "lapsed listener" problem) — observers that subscribe but never unsubscribe prevent garbage collection of both the observer and potentially the subject.
- `[interpretation]` Ordering of notifications is typically undefined, which can cause subtle bugs if observers implicitly depend on notification order.

### Key Participants

- **Subject** — knows its observers; any number of Observer objects may observe a subject; provides an interface for attaching and detaching Observer objects.
- **Observer** — defines an updating interface for objects that should be notified of changes in a subject.
- **ConcreteSubject** — stores state of interest to ConcreteObserver objects; sends a notification to its observers when its state changes.
- **ConcreteObserver** — maintains a reference to a ConcreteSubject object; stores state that should stay consistent with the subject's; implements the Observer updating interface to keep its state consistent with the subject's.

### Related Patterns

- **Mediator** (p. 273) — By encapsulating complex update semantics, the ChangeManager (a mediator between subjects and observers) acts as mediator.
- **Singleton** (p. 127) — The ChangeManager may use the Singleton pattern to make it unique and globally accessible.

### Antipattern signals `[interpretation]`

Signs this pattern is missing or misused:
- A change to one object requires manually updating several other objects, and the code to do so is scattered across the codebase.
- Polling: objects repeatedly check another object's state for changes instead of being notified.
- Tight coupling between the thing that changes and the things that react to the change — adding a new reaction requires modifying the source of the change.

### Modern relevance `[interpretation]`

Observer is built into virtually every modern framework and runtime. JavaScript has `EventTarget`/`addEventListener`, Node.js has `EventEmitter`, and reactive frameworks (RxJS, Vue reactivity, Svelte stores, Angular signals) are sophisticated Observer implementations. Python has signals in Django and various event libraries. In Rust, the pattern appears in `tokio::sync::watch` and `broadcast` channels. In Go, channels are often used for observer-like notification. Browser APIs (MutationObserver, IntersectionObserver, ResizeObserver) are named after this pattern. You rarely implement Observer from scratch — you use the platform's built-in mechanism. The concept is so pervasive it is practically invisible.

*Code examples -> `lang/<language>.md`*

---

## State (p. 305)

**Category**: Behavioral
**Scope**: Object

### Intent

"Allow an object to alter its behavior when its internal state changes. The object will appear to change its class." (p. 305)

### Also Known As

Objects for States

### When to Use (Applicability)

*(from book, p. 305)*
Use this pattern when:
- An object's behavior depends on its state, and it must change its behavior at run-time depending on that state.
- Operations have large, multipart conditional statements that depend on the object's state. This state is usually represented by one or more enumerated constants. Often, several operations will contain this same conditional structure. The State pattern puts each branch of the conditional in a separate class. This lets you treat the object's state as an object in its own right that can vary independently from other objects.

### When NOT to Use / Tradeoffs (Consequences)

*(from book + [interpretation])*
Benefits:
- It localizes state-specific behavior and partitions behavior for different states. The State pattern puts all behavior associated with a particular state into one object. Because all state-specific code lives in a State subclass, new states and transitions can be added easily by defining new subclasses.
- It makes state transitions explicit. When an object defines its current state solely in terms of internal data values, its state transitions have no explicit representation; they only show up as assignments to some variables. Introducing separate objects for different states makes the transitions more explicit.
- State objects can be shared. If State objects have no instance variables — that is, the state they represent is encoded entirely in their type — then contexts can share a State object (Flyweight).

Liabilities:
- The State pattern increases the number of classes. The pattern distributes behavior across several State subclasses, increasing the number of classes and making the design less compact than a single class.
- `[interpretation]` State transitions must be managed carefully — it must be clear whether the Context or the State subclasses are responsible for determining state transitions.

### Key Participants

- **Context** — defines the interface of interest to clients; maintains an instance of a ConcreteState subclass that defines the current state.
- **State** — defines an interface for encapsulating the behavior associated with a particular state of the Context.
- **ConcreteState subclasses** — each subclass implements a behavior associated with a state of the Context.

### Related Patterns

- **Flyweight** (p. 195) — Explains when and how State objects can be shared.
- **Singleton** (p. 127) — State objects are often Singletons.
- **Strategy** (p. 315) — State and Strategy have similar structures, but they differ in intent. State's intent is to change behavior based on state; the state transitions are a key part of the design. Strategy's intent is to select an algorithm; the context typically does not change its strategy once configured (or changes it infrequently and externally).

### Antipattern signals `[interpretation]`

Signs this pattern is missing or misused:
- Methods are full of `if`/`switch` on a state variable, with the same state checks repeated across many methods.
- Adding a new state requires modifying multiple methods throughout a class.
- State transitions are implicit (buried in scattered assignments to a state variable) rather than explicit and localized.
- Invalid state transitions are not prevented — the object can move from any state to any other state without validation.

### Modern relevance `[interpretation]`

State remains highly relevant, especially for state machines in UI, protocol handlers, game logic, and workflow engines. In Python, the `transitions` library implements the State pattern. In TypeScript, XState is a popular state machine library. In Rust, the typestate pattern (encoding states as types) provides compile-time state transition safety — a stronger version of the GoF pattern. In Go, interfaces with state-specific implementations are idiomatic. State machines are experiencing a renaissance in frontend development (XState, Stately) as teams recognize the value of explicit state management over ad-hoc boolean flags.

*Code examples -> `lang/<language>.md`*

---

## Strategy (p. 315)

**Category**: Behavioral
**Scope**: Object

### Intent

"Define a family of algorithms, encapsulate each one, and make them interchangeable. Strategy lets the algorithm vary independently from clients that use it." (p. 315)

### Also Known As

Policy

### When to Use (Applicability)

*(from book, p. 315)*
Use this pattern when:
- Many related classes differ only in their behavior. Strategies provide a way to configure a class with one of many behaviors.
- You need different variants of an algorithm. For example, you might define algorithms reflecting different space/time trade-offs. Strategies can be used when these variants are implemented as a class hierarchy of algorithms.
- An algorithm uses data that clients should not know about. Use the Strategy pattern to avoid exposing complex, algorithm-specific data structures.
- A class defines many behaviors, and these appear as multiple conditional statements in its operations. Instead of many conditionals, move related conditional branches into their own Strategy class.

### When NOT to Use / Tradeoffs (Consequences)

*(from book + [interpretation])*
Benefits:
- Families of related algorithms. Hierarchies of Strategy classes define a family of algorithms or behaviors for contexts to reuse. Inheritance can help factor out common functionality of the algorithms.
- An alternative to subclassing. Inheritance offers another way to support a variety of algorithms or behaviors. But you hard-wire the behavior into Context, mixing the algorithm implementation with Context's, making Context harder to understand, maintain, and extend. Strategies let you vary the algorithm independently of its context, making it easier to switch, understand, and extend.
- Strategies eliminate conditional statements. The Strategy pattern offers an alternative to conditional statements for selecting desired behavior. When different behaviors are lumped into one class, it is hard to avoid using conditional statements to select the right behavior.
- A choice of implementations. Strategies can provide different implementations of the same behavior. The client can choose among strategies with different time and space trade-offs.

Liabilities:
- Clients must be aware of different Strategies. The pattern has a potential drawback in that a client must understand how Strategies differ before it can select the appropriate one.
- Communication overhead between Strategy and Context. The Strategy interface is shared by all ConcreteStrategy classes whether the algorithms they implement are trivial or complex. Hence it is likely that some ConcreteStrategies will not use all the information passed to them through this interface.
- Increased number of objects. Strategies increase the number of objects in an application. Sometimes you can reduce this overhead by implementing strategies as stateless objects that contexts can share (Flyweight).

### Key Participants

- **Strategy** — declares an interface common to all supported algorithms. Context uses this interface to call the algorithm defined by a ConcreteStrategy.
- **ConcreteStrategy** — implements the algorithm using the Strategy interface.
- **Context** — is configured with a ConcreteStrategy object; maintains a reference to a Strategy object; may define an interface that lets Strategy access its data.

### Related Patterns

- **Flyweight** (p. 195) — Strategy objects often make good flyweights.
- **State** (p. 305) — Similar structure to Strategy, but different intent and dynamics.
- **Template Method** (p. 325) — Template Methods use inheritance to vary part of an algorithm. Strategies use delegation to vary the entire algorithm.

### Antipattern signals `[interpretation]`

Signs this pattern is missing or misused:
- Long `if`/`switch` blocks selecting which algorithm or behavior to execute based on a configuration value or type flag.
- Duplicated code across classes that differ only in one algorithm (e.g., different sorting, formatting, or validation logic).
- Adding a new algorithm variant requires modifying existing classes rather than adding a new one.
- An object's behavior cannot be changed at run-time because the algorithm is hard-coded.

### Modern relevance `[interpretation]`

Strategy is largely absorbed by first-class functions in modern languages. In Python, passing a `key` function to `sorted()` IS the Strategy pattern. In JavaScript/TypeScript, callbacks and higher-order functions replace most uses of formal Strategy classes. In Rust, closures and trait objects (`dyn Fn`) serve as strategies. In Go, function types and interfaces are used interchangeably for strategies. The full class-based pattern is still useful when strategies have state, need configuration, or form a genuine family (e.g., compression algorithms, pricing rules), but for simple behavioral parameterization, a function is the modern strategy.

*Code examples -> `lang/<language>.md`*

---

## Template Method (p. 325)

**Category**: Behavioral
**Scope**: Class

### Intent

"Define the skeleton of an algorithm in an operation, deferring some steps to subclasses. Template Method lets subclasses redefine certain steps of an algorithm without changing the algorithm's structure." (p. 325)

### Also Known As

---

### When to Use (Applicability)

*(from book, p. 325)*
Use this pattern when:
- You want to implement the invariant parts of an algorithm once and leave it up to subclasses to implement the behavior that can vary.
- When common behavior among subclasses should be factored and localized in a common class to avoid code duplication. You first identify the differences in the existing code and then separate the differences into new operations. Finally, you replace the differing code with a template method that calls one of these new operations.
- You want to control subclasses extensions. You can define a template method that calls "hook" operations at specific points, thereby permitting extensions only at those points.

### When NOT to Use / Tradeoffs (Consequences)

*(from book + [interpretation])*
Benefits:
- Template methods are a fundamental technique for code reuse. They are particularly important in class libraries, because they are the means for factoring out common behavior in library classes.
- Template methods lead to an inverted control structure that is sometimes referred to as "the Hollywood principle": "Don't call us, we'll call you." That is, a parent class calls the operations of a subclass and not the other way around.

Liabilities:
- `[interpretation]` Forces inheritance — subclasses must extend the base class, creating tight coupling to the base class implementation. This conflicts with the modern preference for composition over inheritance.
- `[interpretation]` Can be confusing to debug because the flow of control bounces between the base class template and the subclass implementations.
- `[interpretation]` Fragile base class problem: changes to the template method in the base class can break subclasses.

### Key Participants

- **AbstractClass** — defines abstract *primitive operations* that concrete subclasses define to implement steps of an algorithm; implements a template method defining the skeleton of an algorithm. The template method calls primitive operations as well as operations defined in AbstractClass or those of other objects.
- **ConcreteClass** — implements the primitive operations to carry out subclass-specific steps of the algorithm.

### Related Patterns

- **Factory Method** (p. 107) — Factory Methods are often called by template methods.
- **Strategy** (p. 315) — Template Methods use inheritance to vary part of an algorithm. Strategies use delegation to vary the entire algorithm.

### Antipattern signals `[interpretation]`

Signs this pattern is missing or misused:
- Several subclasses share nearly identical algorithm structures, differing only in a few steps, yet each reimplements the entire algorithm.
- Copy-paste inheritance: the same sequence of steps appears in multiple classes with minor variations.
- A framework provides no extension points ("hooks") for users to customize behavior without modifying framework code.

### Modern relevance `[interpretation]`

Template Method is still relevant, especially in frameworks. Python's `unittest.TestCase` (with `setUp`/`tearDown`/`test_*` hooks) is a Template Method. Django's class-based views use Template Method extensively. In Java, `AbstractList` and `HttpServlet` are classic examples. In Rust, traits with default method implementations that call required methods are Template Methods. In Go, the pattern is less natural because Go avoids inheritance, but embedding a struct and overriding methods achieves a similar effect. The modern trend is to prefer Strategy (composition) over Template Method (inheritance), but Template Method remains the right choice when there is a genuine invariant algorithm skeleton with customizable steps.

*Code examples -> `lang/<language>.md`*

---

## Visitor (p. 331)

**Category**: Behavioral
**Scope**: Object

### Intent

"Represent an operation to be performed on the elements of an object structure. Visitor lets you define a new operation without changing the classes of the elements on which it operates." (p. 331)

### Also Known As

---

### When to Use (Applicability)

*(from book, p. 331)*
Use this pattern when:
- An object structure contains many classes of objects with differing interfaces, and you want to perform operations on these objects that depend on their concrete classes.
- Many distinct and unrelated operations need to be performed on objects in an object structure, and you want to avoid "polluting" their classes with these operations. Visitor lets you keep related operations together by defining them in one class.
- The classes defining the object structure rarely change, but you often want to define new operations over the structure. Changing the object structure classes requires redefining the interface to all visitors, which is potentially costly. If the object structure classes change often, then it is probably better to define the operations in those classes.

### When NOT to Use / Tradeoffs (Consequences)

*(from book + [interpretation])*
Benefits:
- Visitor makes adding new operations easy. Visitors make it easy to add operations that depend on the components of complex objects. You can define a new operation over an object structure simply by adding a new visitor.
- A visitor gathers related operations and separates unrelated ones. Related behavior is not spread over the classes defining the object structure; it is localized in a visitor. Unrelated sets of behavior are partitioned in their own visitor subclasses.
- Visiting across class hierarchies. An iterator can visit objects in a structure by calling a single operation on each. But a visitor can visit objects from different class hierarchies — something an iterator cannot do (at least not easily).
- Accumulating state. Visitors can accumulate state as they visit each element in the object structure. Without a visitor, this state would have to be passed as extra arguments to the operations that perform the traversal, or it would have to appear as global variables.

Liabilities:
- Adding new ConcreteElement classes is hard. The Visitor pattern makes it hard to add new subclasses of Element. Each new ConcreteElement gives rise to a new abstract operation on Visitor and a corresponding implementation in every ConcreteVisitor class. The key consideration is whether you are more likely to change the algorithm applied over the structure or the classes of objects that make up the structure. The Visitor class hierarchy can be difficult to maintain when new ConcreteElement classes are added frequently.
- Breaking encapsulation. Visitor's approach assumes that the ConcreteElement interface is powerful enough to let visitors do their job. As a result, the pattern often forces you to provide public operations that access an element's internal state, which may compromise its encapsulation.

### Key Participants

- **Visitor** — declares a Visit operation for each class of ConcreteElement in the object structure. The operation's name and signature identifies the class that sends the Visit request to the visitor. The visitor then determines the concrete class of the element being visited and can access it directly through its particular interface.
- **ConcreteVisitor** — implements each operation declared by Visitor. Each operation implements a fragment of the algorithm defined for the corresponding class of object in the structure. ConcreteVisitor provides the context for the algorithm and stores its local state.
- **Element** — defines an Accept operation that takes a visitor as an argument.
- **ConcreteElement** — implements an Accept operation that takes a visitor as an argument.
- **ObjectStructure** — can enumerate its elements; may provide a high-level interface to allow the visitor to visit its elements; may either be a Composite or a collection such as a list or a set.

### Related Patterns

- **Composite** (p. 163) — Visitors can be used to apply an operation over an object structure defined by the Composite pattern.
- **Interpreter** (p. 243) — Visitor may be applied to do the interpretation (evaluate expressions in an AST).
- **Iterator** (p. 257) — Visitors are often used with Iterators to traverse the object structure.

### Antipattern signals `[interpretation]`

Signs this pattern is missing or misused:
- Every new operation over an object structure requires adding a method to every element class, violating the Open/Closed Principle.
- Type-checking (`instanceof`/`typeof`) cascades appear in code that operates on heterogeneous object structures.
- Operations that should be cohesive (e.g., "serialize all nodes," "type-check all nodes") are scattered across unrelated element classes.

### Modern relevance `[interpretation]`

Visitor is being partially replaced by pattern matching in languages that support it. Rust's `match` on enums with exhaustiveness checking achieves what Visitor does but with less boilerplate and better type safety. Python 3.10+ `match`/`case` provides structural pattern matching. TypeScript's discriminated unions with `switch` achieve a similar effect. However, Visitor remains relevant in languages without exhaustive pattern matching (Go, older Java) and in compiler/AST tooling where the double-dispatch mechanism is needed (e.g., LLVM's visitor infrastructure, Java's `javax.lang.model` visitors). The core insight — separating operations from the data structure they operate on — remains valuable regardless of the implementation mechanism.

*Code examples -> `lang/<language>.md`*

---
