# GoF Design Pattern Catalog — Rust Reference

**Purpose**: Rust code examples for all 23 GoF patterns.
Use alongside `catalog-core.md`.

**Stack coverage**: Rust 2024 edition (1.85+), standard library, no external crates required (crates noted when useful)

**Critical framing** `[interpretation]`:
GoF patterns assume class inheritance, shared mutable state, and garbage collection.
Rust has none of these. Each pattern is classified:
- **Direct**: Pattern maps cleanly to Rust idioms
- **Adaptation**: Intent preserved, mechanism uses Rust-specific features (traits, enums, ownership)
- **Conceptual translation**: Intent preserved, but implementation looks fundamentally different

**Key Rust mappings** `[interpretation]`:
- Abstract classes → traits (+ default implementations)
- Class inheritance → trait composition + enum dispatch
- Shared mutable state → `Arc<Mutex<T>>` or channels
- Null objects → `Option<T>` / enum variants
- Interface → `trait` (static dispatch via generics, dynamic dispatch via `dyn Trait`)
- Clone/copy → `Clone` trait / `Copy` trait

---

# Creational Patterns

---

## Abstract Factory (p. 87)

**Translation**: Adaptation `[interpretation]`

GoF's abstract factory uses class inheritance for factory families; Rust uses a trait with associated types or `Box<dyn Product>` returns, enabling family-consistent object creation without inheritance hierarchies.

### Rust structure

```rust
use std::fmt;

trait Button: fmt::Display {
    fn click(&self) -> String;
}

trait Checkbox: fmt::Display {
    fn toggle(&self) -> String;
}

// Abstract factory as a trait with associated types
trait GuiFactory {
    type Btn: Button;
    type Chk: Checkbox;

    fn create_button(&self) -> Self::Btn;
    fn create_checkbox(&self) -> Self::Chk;
}

// --- Concrete family: Mac ---
struct MacButton;
impl Button for MacButton {
    fn click(&self) -> String { "Mac button clicked".into() }
}
impl fmt::Display for MacButton {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "[Mac Button]")
    }
}

struct MacCheckbox;
impl Checkbox for MacCheckbox {
    fn toggle(&self) -> String { "Mac checkbox toggled".into() }
}
impl fmt::Display for MacCheckbox {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "[Mac Checkbox]")
    }
}

struct MacFactory;
impl GuiFactory for MacFactory {
    type Btn = MacButton;
    type Chk = MacCheckbox;

    fn create_button(&self) -> Self::Btn { MacButton }
    fn create_checkbox(&self) -> Self::Chk { MacCheckbox }
}

// --- Generic client code using the factory ---
fn render_ui<F: GuiFactory>(factory: &F) -> String {
    let button = factory.create_button();
    let checkbox = factory.create_checkbox();
    format!("{}: {} | {}: {}", button, button.click(), checkbox, checkbox.toggle())
}
```

### Crate equivalents `[interpretation]`

- Associated types give compile-time family consistency (monomorphized, zero-cost).
- For runtime selection between families, return `Box<dyn Button>` / `Box<dyn Checkbox>` instead.
- `wgpu` uses this pattern: a `Device` (factory) creates `Buffer`, `Texture`, etc. that are backend-specific.

---

## Builder (p. 97)

**Translation**: Direct `[interpretation]`

The Builder pattern is idiomatic Rust — consuming `self` builders are the standard way to construct complex objects. `std::process::Command`, `reqwest::RequestBuilder`, and nearly every configuration struct use this pattern.

### Rust structure

```rust
#[derive(Debug)]
struct Server {
    host: String,
    port: u16,
    max_connections: usize,
    tls_enabled: bool,
}

#[derive(Debug, Default)]
struct ServerBuilder {
    host: Option<String>,
    port: Option<u16>,
    max_connections: Option<usize>,
    tls_enabled: bool,
}

impl ServerBuilder {
    fn new() -> Self {
        Self::default()
    }

    fn host(mut self, host: impl Into<String>) -> Self {
        self.host = Some(host.into());
        self
    }

    fn port(mut self, port: u16) -> Self {
        self.port = Some(port);
        self
    }

    fn max_connections(mut self, max: usize) -> Self {
        self.max_connections = Some(max);
        self
    }

    fn tls(mut self, enabled: bool) -> Self {
        self.tls_enabled = enabled;
        self
    }

    fn build(self) -> Result<Server, String> {
        Ok(Server {
            host: self.host.ok_or("host is required")?,
            port: self.port.unwrap_or(8080),
            max_connections: self.max_connections.unwrap_or(100),
            tls_enabled: self.tls_enabled,
        })
    }
}

// Usage: ServerBuilder::new().host("0.0.0.0").port(443).tls(true).build()?
```

### Crate equivalents `[interpretation]`

- `derive_builder` crate generates builder implementations from struct definitions.
- `typed-builder` crate enforces required fields at compile time via typestate.
- `std::process::Command` — canonical stdlib builder.
- `std::thread::Builder` — another stdlib example.

---

## Factory Method (p. 107)

**Translation**: Adaptation `[interpretation]`

GoF uses subclass overrides to decide which class to instantiate; Rust uses associated functions on traits or generic constructor functions, since there are no subclasses.

### Rust structure

```rust
trait Transport {
    fn deliver(&self) -> String;
}

struct Truck;
impl Transport for Truck {
    fn deliver(&self) -> String { "Delivering by land in a truck".into() }
}

struct Ship;
impl Transport for Ship {
    fn deliver(&self) -> String { "Delivering by sea in a ship".into() }
}

// Factory method as a trait with a default workflow
trait Logistics {
    fn create_transport(&self) -> Box<dyn Transport>;

    fn plan_delivery(&self) -> String {
        let transport = self.create_transport();
        format!("Planning: {}", transport.deliver())
    }
}

struct RoadLogistics;
impl Logistics for RoadLogistics {
    fn create_transport(&self) -> Box<dyn Transport> {
        Box::new(Truck)
    }
}

struct SeaLogistics;
impl Logistics for SeaLogistics {
    fn create_transport(&self) -> Box<dyn Transport> {
        Box::new(Ship)
    }
}

// Alternative: enum-based factory (no trait objects needed)
enum TransportKind { Road, Sea }

fn create_transport(kind: TransportKind) -> Box<dyn Transport> {
    match kind {
        TransportKind::Road => Box::new(Truck),
        TransportKind::Sea => Box::new(Ship),
    }
}
```

### Crate equivalents `[interpretation]`

- `From` / `Into` traits serve as idiomatic conversion factories.
- `Default::default()` is the zero-argument factory method.
- `serde::Deserialize` — deserialization is itself a factory method pattern.

---

## Prototype (p. 117)

**Translation**: Direct `[interpretation]`

The `Clone` trait is built into Rust and is the direct equivalent of GoF Prototype. `#[derive(Clone)]` gives automatic deep copy for most types.

### Rust structure

```rust
#[derive(Debug, Clone)]
struct Shape {
    kind: String,
    x: f64,
    y: f64,
    color: String,
}

impl Shape {
    fn new(kind: &str, x: f64, y: f64, color: &str) -> Self {
        Self {
            kind: kind.into(),
            x,
            y,
            color: color.into(),
        }
    }

    fn move_to(&mut self, x: f64, y: f64) {
        self.x = x;
        self.y = y;
    }
}

// Prototype registry
use std::collections::HashMap;

struct ShapeRegistry {
    prototypes: HashMap<String, Shape>,
}

impl ShapeRegistry {
    fn new() -> Self {
        Self { prototypes: HashMap::new() }
    }

    fn register(&mut self, name: &str, shape: Shape) {
        self.prototypes.insert(name.into(), shape);
    }

    fn create(&self, name: &str) -> Option<Shape> {
        self.prototypes.get(name).cloned()
    }
}
```

### Crate equivalents `[interpretation]`

- `Clone` — standard library trait, the Rust Prototype.
- `Copy` — for bitwise-copyable types (implicit clone on assignment).
- `Arc::clone()` — cheap reference-counted cloning for shared ownership.
- `toml`/`serde_json` — serialize-then-deserialize as a deep copy strategy.

---

## Singleton (p. 127)

**Translation**: Conceptual translation `[interpretation]`

Singletons are generally anti-idiomatic in Rust. The ownership system makes global mutable state intentionally awkward. Prefer dependency injection. When truly needed, `OnceLock` (stabilized in 1.70) provides safe lazy initialization.

### Rust structure

```rust
use std::sync::OnceLock;
use std::sync::Mutex;

#[derive(Debug)]
struct Config {
    db_url: String,
    max_pool: usize,
}

fn global_config() -> &'static Config {
    static INSTANCE: OnceLock<Config> = OnceLock::new();
    INSTANCE.get_or_init(|| Config {
        db_url: "postgres://localhost/app".into(),
        max_pool: 10,
    })
}

// Mutable singleton (rare — prefer passing &mut Config instead)
fn global_registry() -> &'static Mutex<Vec<String>> {
    static REGISTRY: OnceLock<Mutex<Vec<String>>> = OnceLock::new();
    REGISTRY.get_or_init(|| Mutex::new(Vec::new()))
}

// Preferred Rust alternative: dependency injection
struct App {
    config: Config,
}

impl App {
    fn new(config: Config) -> Self {
        Self { config }
    }
}
```

### Crate equivalents `[interpretation]`

- `std::sync::OnceLock` — stabilized lazy initialization (Rust 1.70+).
- `std::sync::LazyLock` — stabilized in Rust 1.80, combines `OnceLock` with a closure.
- `once_cell::sync::Lazy` — the crate that inspired `LazyLock`.
- Idiomatic Rust: pass dependencies explicitly via constructors or function parameters.

---

# Structural Patterns

---

## Adapter (p. 139)

**Translation**: Direct `[interpretation]`

Implementing a trait for a wrapper struct (newtype pattern) is the standard Rust adapter. This is very common because Rust's orphan rule requires a wrapper to implement external traits on external types.

### Rust structure

```rust
// Existing interface our code expects
trait JsonLogger {
    fn log_json(&self, key: &str, value: &str);
}

// Third-party struct with an incompatible interface
struct XmlWriter {
    buffer: String,
}

impl XmlWriter {
    fn new() -> Self {
        Self { buffer: String::new() }
    }

    fn write_element(&mut self, tag: &str, content: &str) {
        self.buffer.push_str(&format!("<{tag}>{content}</{tag}>"));
    }

    fn output(&self) -> &str {
        &self.buffer
    }
}

// Adapter: newtype wrapper implementing our expected trait
struct XmlLoggerAdapter {
    writer: XmlWriter,
}

impl XmlLoggerAdapter {
    fn new() -> Self {
        Self { writer: XmlWriter::new() }
    }

    fn output(&self) -> &str {
        self.writer.output()
    }
}

impl JsonLogger for XmlLoggerAdapter {
    fn log_json(&self, key: &str, value: &str) {
        // Interior mutability would be needed for &self;
        // simplified here for clarity
        println!("<log><{key}>{value}</{key}></log>");
    }
}
```

### Crate equivalents `[interpretation]`

- Newtype pattern — the idiomatic Rust adapter, also used for type safety (`struct Meters(f64)`).
- `From`/`Into` traits — conversion adapters built into std.
- `std::io::BufReader` wraps any `Read` implementor, adapting it with buffering.

---

## Bridge (p. 151)

**Translation**: Direct `[interpretation]`

A trait (implementation) + a generic struct parameterized by that trait is a natural Bridge in Rust. The abstraction and implementation vary independently via generics or trait objects.

### Rust structure

```rust
// Implementation hierarchy (the "bridge" side)
trait Renderer {
    fn render_circle(&self, x: f64, y: f64, radius: f64) -> String;
    fn render_rect(&self, x: f64, y: f64, w: f64, h: f64) -> String;
}

struct SvgRenderer;
impl Renderer for SvgRenderer {
    fn render_circle(&self, x: f64, y: f64, radius: f64) -> String {
        format!("<circle cx='{x}' cy='{y}' r='{radius}'/>")
    }
    fn render_rect(&self, x: f64, y: f64, w: f64, h: f64) -> String {
        format!("<rect x='{x}' y='{y}' width='{w}' height='{h}'/>")
    }
}

struct CanvasRenderer;
impl Renderer for CanvasRenderer {
    fn render_circle(&self, x: f64, y: f64, radius: f64) -> String {
        format!("ctx.arc({x}, {y}, {radius}, 0, 2*PI)")
    }
    fn render_rect(&self, x: f64, y: f64, w: f64, h: f64) -> String {
        format!("ctx.fillRect({x}, {y}, {w}, {h})")
    }
}

// Abstraction parameterized by the implementation
struct Circle<R: Renderer> {
    x: f64,
    y: f64,
    radius: f64,
    renderer: R,
}

impl<R: Renderer> Circle<R> {
    fn draw(&self) -> String {
        self.renderer.render_circle(self.x, self.y, self.radius)
    }
}
```

### Crate equivalents `[interpretation]`

- Generic structs with trait bounds are the standard Bridge mechanism.
- `std::io::BufWriter<W: Write>` — abstraction (buffering) bridges over any `Write` implementation.
- Database crates: `sqlx` uses generics over `Database` trait to bridge query building and database drivers.

---

## Composite (p. 163)

**Translation**: Direct `[interpretation]`

Recursive enum variants with `Box` for heap allocation is the natural Rust Composite. This pattern is idiomatic for representing tree structures like ASTs, file systems, and UI layouts.

### Rust structure

```rust
enum FileSystemEntry {
    File { name: String, size: u64 },
    Directory { name: String, children: Vec<FileSystemEntry> },
}

impl FileSystemEntry {
    fn name(&self) -> &str {
        match self {
            Self::File { name, .. } => name,
            Self::Directory { name, .. } => name,
        }
    }

    fn size(&self) -> u64 {
        match self {
            Self::File { size, .. } => *size,
            Self::Directory { children, .. } => {
                children.iter().map(|c| c.size()).sum()
            }
        }
    }

    fn display(&self, indent: usize) -> String {
        let pad = " ".repeat(indent);
        match self {
            Self::File { name, size } => format!("{pad}- {name} ({size}b)"),
            Self::Directory { name, children } => {
                let header = format!("{pad}+ {name}/");
                let child_lines: Vec<String> = children
                    .iter()
                    .map(|c| c.display(indent + 2))
                    .collect();
                format!("{header}\n{}", child_lines.join("\n"))
            }
        }
    }
}
```

### Crate equivalents `[interpretation]`

- `serde_json::Value` — a Composite: `Value::Array(Vec<Value>)` and `Value::Object(Map<String, Value>)`.
- `syn::Expr` — AST enum with recursive variants.
- `petgraph` — general-purpose graph/tree structures when enum-based composites are insufficient.

---

## Decorator (p. 175)

**Translation**: Adaptation `[interpretation]`

Trait wrapping — implementing the same trait while holding an inner `Box<dyn Trait>` — is the Rust decorator. Ownership semantics make the wrapping explicit.

### Rust structure

```rust
trait DataSource {
    fn write_data(&mut self, data: &str) -> Result<(), String>;
    fn read_data(&self) -> Result<String, String>;
}

struct FileDataSource {
    data: String,
}

impl FileDataSource {
    fn new() -> Self { Self { data: String::new() } }
}

impl DataSource for FileDataSource {
    fn write_data(&mut self, data: &str) -> Result<(), String> {
        self.data = data.to_string();
        Ok(())
    }
    fn read_data(&self) -> Result<String, String> {
        Ok(self.data.clone())
    }
}

// Decorator: adds compression (simulated)
struct CompressionDecorator {
    inner: Box<dyn DataSource>,
}

impl CompressionDecorator {
    fn new(source: Box<dyn DataSource>) -> Self {
        Self { inner: source }
    }
}

impl DataSource for CompressionDecorator {
    fn write_data(&mut self, data: &str) -> Result<(), String> {
        let compressed = format!("[compressed:{}]", data.len());
        self.inner.write_data(&compressed)
    }
    fn read_data(&self) -> Result<String, String> {
        let raw = self.inner.read_data()?;
        Ok(format!("[decompressed:{raw}]"))
    }
}

// Stacking decorators:
// let source = Box::new(FileDataSource::new());
// let compressed = Box::new(CompressionDecorator::new(source));
// let encrypted = Box::new(EncryptionDecorator::new(compressed));
```

### Crate equivalents `[interpretation]`

- `std::io::BufReader<R>` / `BufWriter<W>` — decorators over `Read` / `Write`.
- `tower::Layer` — the tower middleware ecosystem is built on the Decorator pattern.
- `tracing::Subscriber` layers — decorators for logging/tracing.

---

## Facade (p. 185)

**Translation**: Direct `[interpretation]`

Rust's module system with `pub`/`pub(crate)` visibility is a natural facade. A module exposes a simple public API while hiding complex private internals.

### Rust structure

```rust
// Complex subsystem modules (private)
mod video_codec {
    pub struct VideoFile { pub name: String }
    pub fn extract_audio(file: &VideoFile) -> Vec<u8> {
        vec![/* raw audio bytes */]
    }
    pub fn compress_video(file: &VideoFile, quality: u8) -> Vec<u8> {
        let _ = quality;
        vec![/* compressed video bytes */]
    }
}

mod audio_mixer {
    pub fn normalize(audio: &[u8]) -> Vec<u8> {
        audio.to_vec() // simplified
    }
    pub fn apply_codec(audio: &[u8], codec: &str) -> Vec<u8> {
        let _ = codec;
        audio.to_vec() // simplified
    }
}

// Facade: simple public API
pub struct VideoConverter;

impl VideoConverter {
    pub fn convert(filename: &str, format: &str) -> Result<Vec<u8>, String> {
        let file = video_codec::VideoFile { name: filename.into() };
        let raw_audio = video_codec::extract_audio(&file);
        let normalized = audio_mixer::normalize(&raw_audio);
        let encoded_audio = audio_mixer::apply_codec(&normalized, format);
        let video = video_codec::compress_video(&file, 80);

        let mut result = video;
        result.extend(encoded_audio);
        Ok(result)
    }
}

// Client only sees: VideoConverter::convert("movie.avi", "mp4")?
```

### Crate equivalents `[interpretation]`

- `pub mod` with re-exports (`pub use`) — the idiomatic Rust facade.
- Prelude modules (`pub mod prelude`) — common pattern to re-export key types.
- `reqwest` — facade over `hyper`, `http`, `tokio`, TLS backends.

---

## Flyweight (p. 195)

**Translation**: Adaptation `[interpretation]`

Rust uses `Arc<T>` for shared immutable data and `HashMap` for interning. The ownership model makes shared vs. unique state explicit.

### Rust structure

```rust
use std::collections::HashMap;
use std::sync::Arc;

// Flyweight: shared intrinsic state
#[derive(Debug, Clone)]
struct TreeType {
    name: String,
    color: String,
    texture: String, // imagine a large texture blob
}

// Flyweight factory with interning
struct TreeTypeFactory {
    cache: HashMap<String, Arc<TreeType>>,
}

impl TreeTypeFactory {
    fn new() -> Self { Self { cache: HashMap::new() } }

    fn get_tree_type(&mut self, name: &str, color: &str, texture: &str) -> Arc<TreeType> {
        let key = format!("{name}_{color}_{texture}");
        self.cache
            .entry(key)
            .or_insert_with(|| Arc::new(TreeType {
                name: name.into(),
                color: color.into(),
                texture: texture.into(),
            }))
            .clone()
    }
}

// Context: unique extrinsic state + shared flyweight
struct Tree {
    x: f64,
    y: f64,
    tree_type: Arc<TreeType>,
}

impl Tree {
    fn draw(&self) -> String {
        format!(
            "Draw {} at ({}, {}) [shared texture: {}]",
            self.tree_type.name, self.x, self.y, self.tree_type.texture
        )
    }
}
```

### Crate equivalents `[interpretation]`

- `Arc<T>` — reference-counted shared ownership for flyweight instances.
- `string-interner` / `lasso` crates — string interning pools.
- `std::borrow::Cow<'_, str>` — avoids cloning when the shared string suffices.

---

## Proxy (p. 207)

**Translation**: Direct `[interpretation]`

`Deref` / `DerefMut` traits are the Rust Proxy mechanism. `Arc`, `Mutex`, `RefCell`, `Box` are all standard library proxies that control access to inner data.

### Rust structure

```rust
use std::collections::HashMap;

trait Database {
    fn query(&self, sql: &str) -> Result<String, String>;
}

struct RealDatabase {
    connection: String,
}

impl RealDatabase {
    fn new(conn: &str) -> Self {
        // Expensive connection setup
        Self { connection: conn.into() }
    }
}

impl Database for RealDatabase {
    fn query(&self, sql: &str) -> Result<String, String> {
        Ok(format!("[{}] result for: {}", self.connection, sql))
    }
}

// Caching proxy
struct CachingProxy {
    inner: RealDatabase,
    cache: std::cell::RefCell<HashMap<String, String>>,
}

impl CachingProxy {
    fn new(conn: &str) -> Self {
        Self {
            inner: RealDatabase::new(conn),
            cache: std::cell::RefCell::new(HashMap::new()),
        }
    }
}

impl Database for CachingProxy {
    fn query(&self, sql: &str) -> Result<String, String> {
        if let Some(cached) = self.cache.borrow().get(sql) {
            return Ok(format!("[CACHED] {cached}"));
        }
        let result = self.inner.query(sql)?;
        self.cache.borrow_mut().insert(sql.to_string(), result.clone());
        Ok(result)
    }
}
```

### Crate equivalents `[interpretation]`

- `Deref` / `DerefMut` — the core Proxy traits in Rust.
- `Arc<T>` — reference-counting proxy; `Mutex<T>` — synchronized access proxy.
- `RefCell<T>` — runtime borrow-checking proxy.
- `lazy_static` / `LazyLock` — lazy initialization proxies.

---

# Behavioral Patterns

---

## Chain of Responsibility (p. 223)

**Translation**: Adaptation `[interpretation]`

Rust uses `Vec<Box<dyn Handler>>` iterated until one handles, or middleware chains (tower/axum). There are no class hierarchies to chain — the chain is a data structure.

### Rust structure

```rust
#[derive(Debug)]
struct Request {
    path: String,
    auth_token: Option<String>,
    body: String,
}

trait Handler {
    fn handle(&self, req: &Request) -> Result<String, String>;
}

struct AuthHandler;
impl Handler for AuthHandler {
    fn handle(&self, req: &Request) -> Result<String, String> {
        match &req.auth_token {
            Some(token) if token == "valid-token" => {
                Err("pass".into()) // not handled, pass to next
            }
            Some(_) => Ok("403 Forbidden".into()),
            None => Ok("401 Unauthorized".into()),
        }
    }
}

struct LoggingHandler;
impl Handler for LoggingHandler {
    fn handle(&self, req: &Request) -> Result<String, String> {
        println!("LOG: {} {}", req.path, req.body.len());
        Err("pass".into()) // always pass to next
    }
}

// Chain as a vec of handlers
struct Pipeline {
    handlers: Vec<Box<dyn Handler>>,
    fallback: Box<dyn Fn(&Request) -> String>,
}

impl Pipeline {
    fn execute(&self, req: &Request) -> String {
        for handler in &self.handlers {
            if let Ok(response) = handler.handle(req) {
                return response;
            }
        }
        (self.fallback)(req)
    }
}
```

### Crate equivalents `[interpretation]`

- `tower::Service` + `tower::Layer` — the standard middleware chain in async Rust.
- `axum::middleware::from_fn` — request pipeline in web frameworks.
- `log` / `tracing` crate subscriber chains.

---

## Command (p. 233)

**Translation**: Direct `[interpretation]`

Closures ARE commands in Rust. `Box<dyn FnOnce()>`, `Box<dyn Fn()>`, and function pointers directly encapsulate requests as callable objects, with full capture of their environment.

### Rust structure

```rust
// Trait-based command (when undo is needed)
trait Command {
    fn execute(&mut self) -> Result<(), String>;
    fn undo(&mut self) -> Result<(), String>;
}

struct TextEditor {
    content: String,
}

struct InsertCommand {
    editor: *mut TextEditor, // in practice, use indices or Rc<RefCell<>>
    position: usize,
    text: String,
}

// Closure-based command (simpler, when undo is not needed)
struct CommandQueue {
    queue: Vec<Box<dyn FnOnce() -> Result<(), String>>>,
}

impl CommandQueue {
    fn new() -> Self { Self { queue: Vec::new() } }

    fn add(&mut self, cmd: impl FnOnce() -> Result<(), String> + 'static) {
        self.queue.push(Box::new(cmd));
    }

    fn execute_all(self) -> Vec<Result<(), String>> {
        self.queue.into_iter().map(|cmd| cmd()).collect()
    }
}

// Usage
fn build_commands() -> CommandQueue {
    let mut q = CommandQueue::new();
    q.add(|| { println!("Creating backup..."); Ok(()) });
    q.add(|| { println!("Migrating database..."); Ok(()) });
    q.add(|| { println!("Sending notifications..."); Ok(()) });
    q
}
```

### Crate equivalents `[interpretation]`

- `FnOnce`, `FnMut`, `Fn` — the three closure traits are first-class commands.
- `tokio::spawn(async { ... })` — async command execution.
- `std::thread::spawn(|| ...)` — threaded command dispatch.
- `undo` crate — full undo/redo command history.

---

## Interpreter (p. 243)

**Translation**: Direct `[interpretation]`

Enum-based ASTs with recursive `eval()` methods are the idiomatic Rust interpreter. Pattern matching on enum variants replaces the OO class hierarchy of expression nodes.

### Rust structure

```rust
#[derive(Debug, Clone)]
enum Expr {
    Num(f64),
    Var(String),
    Add(Box<Expr>, Box<Expr>),
    Mul(Box<Expr>, Box<Expr>),
    Neg(Box<Expr>),
}

use std::collections::HashMap;
type Context = HashMap<String, f64>;

impl Expr {
    fn eval(&self, ctx: &Context) -> Result<f64, String> {
        match self {
            Expr::Num(n) => Ok(*n),
            Expr::Var(name) => ctx
                .get(name)
                .copied()
                .ok_or_else(|| format!("Undefined variable: {name}")),
            Expr::Add(lhs, rhs) => Ok(lhs.eval(ctx)? + rhs.eval(ctx)?),
            Expr::Mul(lhs, rhs) => Ok(lhs.eval(ctx)? * rhs.eval(ctx)?),
            Expr::Neg(inner) => Ok(-inner.eval(ctx)?),
        }
    }
}

// Build: 2 * (x + 3)
fn example_ast() -> Expr {
    Expr::Mul(
        Box::new(Expr::Num(2.0)),
        Box::new(Expr::Add(
            Box::new(Expr::Var("x".into())),
            Box::new(Expr::Num(3.0)),
        )),
    )
}
```

### Crate equivalents `[interpretation]`

- `nom` / `winnow` — parser combinator crates for building interpreters.
- `pest` — PEG parser generator.
- `syn` — Rust's own proc-macro AST library uses this pattern extensively.
- `chumsky` — parser combinator with good error reporting.

---

## Iterator (p. 257)

**Translation**: Direct `[interpretation]`

The `Iterator` trait is BUILT INTO RUST. This is the most native of all GoF patterns in Rust — the entire standard library is designed around iterators and iterator combinators.

### Rust structure

```rust
// Custom iterator: generates Fibonacci numbers
struct Fibonacci {
    a: u64,
    b: u64,
}

impl Fibonacci {
    fn new() -> Self { Self { a: 0, b: 1 } }
}

impl Iterator for Fibonacci {
    type Item = u64;

    fn next(&mut self) -> Option<Self::Item> {
        let current = self.a;
        let next = self.a.checked_add(self.b)?; // None on overflow
        self.a = self.b;
        self.b = next;
        Some(current)
    }
}

// Iterator combinators — the real power of Rust iterators
fn iterator_examples() {
    // First 10 Fibonacci numbers
    let fibs: Vec<u64> = Fibonacci::new().take(10).collect();

    // Sum of even Fibonacci numbers below 1000
    let sum: u64 = Fibonacci::new()
        .take_while(|&n| n < 1000)
        .filter(|n| n % 2 == 0)
        .sum();

    // Custom collection with IntoIterator
    let data = vec![1, 2, 3, 4, 5];
    let doubled: Vec<i32> = data.iter().map(|x| x * 2).collect();
}
```

### Crate equivalents `[interpretation]`

- `std::iter::Iterator` — 70+ provided combinator methods.
- `itertools` crate — additional combinators (`chunks`, `interleave`, `cartesian_product`).
- `rayon::par_iter()` — parallel iterators with the same API.
- `IntoIterator` — trait that enables `for x in collection` syntax.

---

## Mediator (p. 273)

**Translation**: Conceptual translation `[interpretation]`

GoF's mediator holds references to all colleagues and coordinates them. Rust cannot have circular references with shared mutability. Instead, use message-passing channels — this is actually closer to the Actor model but achieves the Mediator intent.

### Rust structure

```rust
use std::sync::mpsc;
use std::collections::HashMap;

#[derive(Debug)]
enum Event {
    UserLoggedIn { user_id: String },
    DataUpdated { key: String, value: String },
    Shutdown,
}

struct Mediator {
    sender: mpsc::Sender<Event>,
}

impl Mediator {
    fn notify(&self, event: Event) -> Result<(), String> {
        self.sender.send(event).map_err(|e| e.to_string())
    }
}

impl Clone for Mediator {
    fn clone(&self) -> Self {
        Self { sender: self.sender.clone() }
    }
}

fn run_mediator() {
    let (tx, rx) = mpsc::channel::<Event>();
    let mediator = Mediator { sender: tx };

    // Components each get a clone of the mediator
    let m1 = mediator.clone();
    let m2 = mediator.clone();

    // Mediator event loop — coordinates all components
    std::thread::spawn(move || {
        for event in rx {
            match event {
                Event::UserLoggedIn { user_id } => {
                    println!("Mediator: user {user_id} logged in, notifying dashboard");
                }
                Event::DataUpdated { key, value } => {
                    println!("Mediator: data {key}={value}, refreshing views");
                }
                Event::Shutdown => {
                    println!("Mediator: shutting down");
                    break;
                }
            }
        }
    });

    // Components communicate through mediator, not directly
    let _ = m1.notify(Event::UserLoggedIn { user_id: "alice".into() });
    let _ = m2.notify(Event::DataUpdated { key: "count".into(), value: "42".into() });
}
```

### Crate equivalents `[interpretation]`

- `std::sync::mpsc` — multi-producer single-consumer channels.
- `tokio::sync::broadcast` — multi-producer multi-consumer async channels.
- `tokio::sync::mpsc` — async channel variant.
- `actix` — actor framework where each actor is a colleague; the system is the mediator.

---

## Memento (p. 283)

**Translation**: Adaptation `[interpretation]`

Rust's ownership model and `Clone` trait make save/restore straightforward. Clone the state to create a memento, restore by replacing the current state with the saved clone.

### Rust structure

```rust
#[derive(Debug, Clone)]
struct EditorState {
    content: String,
    cursor_position: usize,
    selection: Option<(usize, usize)>,
}

struct Editor {
    state: EditorState,
    history: Vec<EditorState>, // memento stack
}

impl Editor {
    fn new() -> Self {
        Self {
            state: EditorState {
                content: String::new(),
                cursor_position: 0,
                selection: None,
            },
            history: Vec::new(),
        }
    }

    fn save(&mut self) {
        self.history.push(self.state.clone());
    }

    fn undo(&mut self) -> Result<(), String> {
        let previous = self.history.pop().ok_or("Nothing to undo")?;
        self.state = previous;
        Ok(())
    }

    fn type_text(&mut self, text: &str) {
        self.save();
        self.state.content.insert_str(self.state.cursor_position, text);
        self.state.cursor_position += text.len();
    }

    fn content(&self) -> &str {
        &self.state.content
    }
}

// Usage:
// editor.type_text("Hello");  -> "Hello"
// editor.type_text(" World"); -> "Hello World"
// editor.undo();              -> "Hello"
```

### Crate equivalents `[interpretation]`

- `Clone` — the core mechanism for creating mementos.
- `serde` — serialize state to JSON/bincode for persistent mementos.
- `undo` crate — structured undo/redo with command history.
- `im` crate — persistent data structures that make cheap snapshots via structural sharing.

---

## Observer (p. 293)

**Translation**: Adaptation `[interpretation]`

GoF's observer uses mutable references to subject and observers with callback registration. Rust avoids shared mutable references; instead use channels, callback vectors with `Box<dyn Fn()>`, or event systems.

### Rust structure

```rust
type Callback<T> = Box<dyn Fn(&T)>;

struct EventEmitter<T> {
    listeners: Vec<Callback<T>>,
}

impl<T> EventEmitter<T> {
    fn new() -> Self {
        Self { listeners: Vec::new() }
    }

    fn subscribe(&mut self, callback: impl Fn(&T) + 'static) {
        self.listeners.push(Box::new(callback));
    }

    fn emit(&self, event: &T) {
        for listener in &self.listeners {
            listener(event);
        }
    }
}

// Channel-based observer (thread-safe, decoupled)
use std::sync::mpsc;

struct PriceUpdate {
    symbol: String,
    price: f64,
}

fn channel_observer_example() {
    let (tx, rx) = mpsc::channel::<PriceUpdate>();

    // Observer thread
    std::thread::spawn(move || {
        for update in rx {
            println!("Price alert: {} = ${:.2}", update.symbol, update.price);
        }
    });

    // Subject publishes
    let _ = tx.send(PriceUpdate { symbol: "AAPL".into(), price: 150.0 });
    let _ = tx.send(PriceUpdate { symbol: "GOOG".into(), price: 2800.0 });
}
```

### Crate equivalents `[interpretation]`

- `tokio::sync::watch` — single-producer, multi-consumer; observers see latest value.
- `tokio::sync::broadcast` — multi-producer, multi-consumer event broadcast.
- `event-listener` crate — low-level async event notification.
- `signal-hook` — OS signal observation.

---

## State (p. 305)

**Translation**: Direct `[interpretation]`

Rust's enum + match is the CANONICAL State pattern implementation. The type system ensures exhaustive handling of all states, and the compiler verifies transitions at compile time.

### Rust structure

```rust
#[derive(Debug)]
enum TrafficLight {
    Red { remaining_secs: u32 },
    Yellow { remaining_secs: u32 },
    Green { remaining_secs: u32 },
}

impl TrafficLight {
    fn new() -> Self {
        Self::Red { remaining_secs: 30 }
    }

    fn transition(self) -> Self {
        match self {
            Self::Red { .. } => Self::Green { remaining_secs: 45 },
            Self::Green { .. } => Self::Yellow { remaining_secs: 5 },
            Self::Yellow { .. } => Self::Red { remaining_secs: 30 },
        }
    }

    fn action(&self) -> &str {
        match self {
            Self::Red { .. } => "STOP",
            Self::Yellow { .. } => "CAUTION",
            Self::Green { .. } => "GO",
        }
    }

    fn tick(self) -> Self {
        match self {
            Self::Red { remaining_secs: 0 } |
            Self::Green { remaining_secs: 0 } |
            Self::Yellow { remaining_secs: 0 } => self.transition(),
            Self::Red { remaining_secs } => Self::Red { remaining_secs: remaining_secs - 1 },
            Self::Green { remaining_secs } => Self::Green { remaining_secs: remaining_secs - 1 },
            Self::Yellow { remaining_secs } => Self::Yellow { remaining_secs: remaining_secs - 1 },
        }
    }
}

// Typestate pattern: compile-time state enforcement
struct Door<S>(std::marker::PhantomData<S>);
struct Open;
struct Closed;
struct Locked;

impl Door<Closed> {
    fn open(self) -> Door<Open> { Door(std::marker::PhantomData) }
    fn lock(self) -> Door<Locked> { Door(std::marker::PhantomData) }
}
impl Door<Open> {
    fn close(self) -> Door<Closed> { Door(std::marker::PhantomData) }
}
impl Door<Locked> {
    fn unlock(self) -> Door<Closed> { Door(std::marker::PhantomData) }
}
```

### Crate equivalents `[interpretation]`

- Enum + match — the idiomatic approach, compiler-checked exhaustiveness.
- Typestate pattern (generic type parameter for state) — compile-time state machine.
- `state_machine_future` / `sm` crate — macros for complex state machines.
- `tokio`'s internal connection states use enum-based state machines.

---

## Strategy (p. 315)

**Translation**: Direct `[interpretation]`

Closures and function pointers (`fn(T) -> U`) directly replace the GoF Strategy's interface + concrete implementations. First-class functions eliminate the need for separate strategy classes.

### Rust structure

```rust
// Function pointer strategy (zero-cost, no allocation)
struct Sorter<T> {
    data: Vec<T>,
    compare: fn(&T, &T) -> std::cmp::Ordering,
}

impl<T> Sorter<T> {
    fn new(data: Vec<T>, compare: fn(&T, &T) -> std::cmp::Ordering) -> Self {
        Self { data, compare }
    }

    fn sort(&mut self) {
        let cmp = self.compare;
        self.data.sort_by(cmp);
    }
}

// Closure strategy (can capture state)
struct Router {
    strategy: Box<dyn Fn(&str) -> String>,
}

impl Router {
    fn new(strategy: impl Fn(&str) -> String + 'static) -> Self {
        Self { strategy: Box::new(strategy) }
    }

    fn route(&self, path: &str) -> String {
        (self.strategy)(path)
    }
}

fn strategy_examples() {
    // Swap strategies at runtime
    let prefix = "/api/v2".to_string();
    let router = Router::new(move |path| format!("{prefix}{path}"));
    let _result = router.route("/users"); // "/api/v2/users"

    // Generic strategy via trait bounds
    fn process<F: Fn(i32) -> i32>(values: &[i32], strategy: F) -> Vec<i32> {
        values.iter().map(|&v| strategy(v)).collect()
    }

    let doubled = process(&[1, 2, 3], |x| x * 2);
    let squared = process(&[1, 2, 3], |x| x * x);
}
```

### Crate equivalents `[interpretation]`

- `Fn` / `FnMut` / `FnOnce` — the three closure traits cover all strategy needs.
- `Vec::sort_by` — takes a comparison strategy as a closure.
- `Iterator::map` / `filter` / `fold` — each takes a strategy closure.
- `std::str::pattern::Pattern` — string search strategy trait.

---

## Template Method (p. 325)

**Translation**: Direct `[interpretation]`

A trait with default method implementations that call abstract (required) methods is the direct Rust equivalent. The default method is the template; required methods are the variable steps.

### Rust structure

```rust
trait DataMiner {
    // Abstract steps — implementors must provide these
    fn extract_data(&self, source: &str) -> Result<String, String>;
    fn parse_data(&self, raw: &str) -> Result<Vec<String>, String>;

    // Hook — optional override, default does nothing
    fn filter(&self, records: Vec<String>) -> Vec<String> {
        records
    }

    // Template method — defines the algorithm skeleton
    fn mine(&self, source: &str) -> Result<String, String> {
        let raw = self.extract_data(source)?;
        let records = self.parse_data(&raw)?;
        let filtered = self.filter(records);
        let report = format!("Mined {} records from {source}", filtered.len());
        Ok(report)
    }
}

struct CsvMiner;
impl DataMiner for CsvMiner {
    fn extract_data(&self, source: &str) -> Result<String, String> {
        Ok(format!("name,age\nAlice,30\nBob,25 from {source}"))
    }
    fn parse_data(&self, raw: &str) -> Result<Vec<String>, String> {
        Ok(raw.lines().skip(1).map(String::from).collect())
    }
}

struct JsonMiner;
impl DataMiner for JsonMiner {
    fn extract_data(&self, source: &str) -> Result<String, String> {
        Ok(format!(r#"[{{"name":"Alice"}},{{"name":"Bob"}}] from {source}"#))
    }
    fn parse_data(&self, raw: &str) -> Result<Vec<String>, String> {
        Ok(vec![raw.to_string()]) // simplified
    }
    fn filter(&self, records: Vec<String>) -> Vec<String> {
        records.into_iter().filter(|r| !r.is_empty()).collect()
    }
}
```

### Crate equivalents `[interpretation]`

- Traits with default methods — the direct Rust mechanism.
- `std::io::Read` has default methods (`read_to_string`, `read_to_end`) that call the required `read`.
- `Iterator` trait — `next()` is the one required method; 70+ default methods build on it.
- `std::fmt::Display` — `to_string()` is a default method using the required `fmt()`.

---

## Visitor (p. 331)

**Translation**: Adaptation `[interpretation]`

In Rust, `match` on enum variants IS the visitor. Pattern matching replaces the double-dispatch mechanism of GoF's Visitor. For open extension, use the visitor trait pattern.

### Rust structure

```rust
// Enum-based visitor (idiomatic Rust — preferred)
enum AstNode {
    Number(f64),
    BinaryOp { op: char, left: Box<AstNode>, right: Box<AstNode> },
    UnaryOp { op: char, operand: Box<AstNode> },
}

// "Visiting" is just match — each arm is a visit method
fn eval(node: &AstNode) -> Result<f64, String> {
    match node {
        AstNode::Number(n) => Ok(*n),
        AstNode::BinaryOp { op, left, right } => {
            let l = eval(left)?;
            let r = eval(right)?;
            match op {
                '+' => Ok(l + r),
                '*' => Ok(l * r),
                _ => Err(format!("Unknown op: {op}")),
            }
        }
        AstNode::UnaryOp { op, operand } => {
            let v = eval(operand)?;
            match op {
                '-' => Ok(-v),
                _ => Err(format!("Unknown unary op: {op}")),
            }
        }
    }
}

fn pretty_print(node: &AstNode) -> String {
    match node {
        AstNode::Number(n) => n.to_string(),
        AstNode::BinaryOp { op, left, right } => {
            format!("({} {op} {})", pretty_print(left), pretty_print(right))
        }
        AstNode::UnaryOp { op, operand } => {
            format!("({op}{})", pretty_print(operand))
        }
    }
}

// Trait-based visitor (when you need open extension)
trait Visitor {
    type Output;
    fn visit_number(&mut self, n: f64) -> Self::Output;
    fn visit_binary(&mut self, op: char, left: &AstNode, right: &AstNode) -> Self::Output;
    fn visit_unary(&mut self, op: char, operand: &AstNode) -> Self::Output;
}

impl AstNode {
    fn accept<V: Visitor>(&self, visitor: &mut V) -> V::Output {
        match self {
            AstNode::Number(n) => visitor.visit_number(*n),
            AstNode::BinaryOp { op, left, right } => visitor.visit_binary(*op, left, right),
            AstNode::UnaryOp { op, operand } => visitor.visit_unary(*op, operand),
        }
    }
}
```

### Crate equivalents `[interpretation]`

- `match` on enums — the idiomatic Rust visitor. Compiler ensures exhaustiveness.
- `syn::visit` / `syn::visit_mut` — visitor traits for Rust AST manipulation.
- `serde::Deserializer::deserialize_*` — visitor pattern for data format parsing.
- `walkdir` — filesystem tree visitor.

---

# Summary

| # | Pattern | Category | Translation | Key Rust mechanism |
|---|---------|----------|-------------|-------------------|
| 1 | Abstract Factory | Creational | Adaptation | Trait with associated types |
| 2 | Builder | Creational | Direct | Consuming `self` methods |
| 3 | Factory Method | Creational | Adaptation | Trait + `Box<dyn T>` returns |
| 4 | Prototype | Creational | Direct | `Clone` trait / `#[derive(Clone)]` |
| 5 | Singleton | Creational | Conceptual translation | `OnceLock` / `LazyLock` (prefer DI) |
| 6 | Adapter | Structural | Direct | Newtype wrapper + trait impl |
| 7 | Bridge | Structural | Direct | Generic struct + trait bound |
| 8 | Composite | Structural | Direct | Recursive enum + `Box` |
| 9 | Decorator | Structural | Adaptation | Trait wrapping via `Box<dyn Trait>` |
| 10 | Facade | Structural | Direct | `pub` / `pub(crate)` modules |
| 11 | Flyweight | Structural | Adaptation | `Arc<T>` + `HashMap` interning |
| 12 | Proxy | Structural | Direct | `Deref` / `DerefMut` / `RefCell` |
| 13 | Chain of Resp. | Behavioral | Adaptation | `Vec<Box<dyn Handler>>` |
| 14 | Command | Behavioral | Direct | Closures / `Box<dyn FnOnce()>` |
| 15 | Interpreter | Behavioral | Direct | Enum AST + recursive `eval()` |
| 16 | Iterator | Behavioral | Direct | `Iterator` trait (built-in) |
| 17 | Mediator | Behavioral | Conceptual translation | `mpsc::channel` message passing |
| 18 | Memento | Behavioral | Adaptation | `Clone` + state history stack |
| 19 | Observer | Behavioral | Adaptation | Channels / callback `Vec` |
| 20 | State | Behavioral | Direct | Enum + match / typestate |
| 21 | Strategy | Behavioral | Direct | Closures / `fn` pointers |
| 22 | Template Method | Behavioral | Direct | Trait default methods |
| 23 | Visitor | Behavioral | Adaptation | `match` on enum variants |

**Totals**: 13 Direct, 8 Adaptation, 2 Conceptual translation
