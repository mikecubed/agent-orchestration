# GoF Design Pattern Catalog — Go Reference

**Purpose**: Go code examples for all 23 GoF patterns.
Use alongside `catalog-core.md`.

**Stack coverage**: Go 1.22+, standard library, gin/chi where applicable

**Critical framing** `[interpretation]`:
GoF patterns assume class inheritance. Go has no inheritance — only interfaces,
struct embedding, and first-class functions. Many patterns simplify dramatically in Go.

**Key Go mappings** `[interpretation]`:
- Abstract classes → interfaces
- Inheritance → struct embedding (composition)
- Virtual methods → interface method dispatch
- Null objects → zero values, `nil` interface values
- Shared mutable state → goroutines + channels, or `sync.Mutex`
- Generics → Go generics (1.18+) for type-safe patterns

---

# Creational Patterns

---

## Abstract Factory (p. 87)

**Translation**: Direct `[interpretation]`

Go interfaces naturally express abstract factories — an interface whose methods return other interfaces.

### Go structure

```go
// Abstract products
type Button interface {
	Render() string
}
type Dialog interface {
	Show() string
}

// Abstract factory
type UIFactory interface {
	CreateButton() Button
	CreateDialog() Dialog
}

// Concrete products
type macButton struct{}
func (b *macButton) Render() string { return "macOS button" }

type macDialog struct{}
func (d *macDialog) Show() string { return "macOS dialog" }

// Concrete factory
type MacFactory struct{}
func (f *MacFactory) CreateButton() Button { return &macButton{} }
func (f *MacFactory) CreateDialog() Dialog { return &macDialog{} }

// Client depends only on interfaces
func BuildUI(factory UIFactory) {
	btn := factory.CreateButton()
	dlg := factory.CreateDialog()
	fmt.Println(btn.Render(), dlg.Show())
}
```

### Standard library / framework equivalents `[interpretation]`

- `database/sql` — `sql.Open(driverName, dsn)` returns a `*sql.DB` whose behavior varies by registered driver (each driver is a factory for connections, statements, rows).
- `hash` package — `hash.Hash` interface with `crypto/sha256.New()`, `crypto/md5.New()` etc. acting as factories.

---

## Builder (p. 97)

**Translation**: Adaptation `[interpretation]`

Go replaces the classic Builder with the functional options pattern. Both shown below.

### Go structure — Functional options (idiomatic)

```go
type Server struct {
	host    string
	port    int
	timeout time.Duration
	maxConn int
}

type Option func(*Server)

func WithPort(port int) Option {
	return func(s *Server) { s.port = port }
}
func WithTimeout(d time.Duration) Option {
	return func(s *Server) { s.timeout = d }
}
func WithMaxConn(n int) Option {
	return func(s *Server) { s.maxConn = n }
}

func NewServer(host string, opts ...Option) *Server {
	s := &Server{host: host, port: 8080, timeout: 30 * time.Second, maxConn: 100}
	for _, opt := range opts {
		opt(s)
	}
	return s
}

// Usage:
// srv := NewServer("localhost", WithPort(9090), WithTimeout(5*time.Second))
```

### Go structure — Classic Builder

```go
type QueryBuilder struct {
	table      string
	conditions []string
	orderBy    string
	limit      int
}

func NewQueryBuilder(table string) *QueryBuilder {
	return &QueryBuilder{table: table}
}

func (b *QueryBuilder) Where(cond string) *QueryBuilder {
	b.conditions = append(b.conditions, cond)
	return b
}

func (b *QueryBuilder) OrderBy(field string) *QueryBuilder {
	b.orderBy = field
	return b
}

func (b *QueryBuilder) Limit(n int) *QueryBuilder {
	b.limit = n
	return b
}

func (b *QueryBuilder) Build() string {
	q := "SELECT * FROM " + b.table
	for i, c := range b.conditions {
		if i == 0 {
			q += " WHERE " + c
		} else {
			q += " AND " + c
		}
	}
	if b.orderBy != "" {
		q += " ORDER BY " + b.orderBy
	}
	if b.limit > 0 {
		q += fmt.Sprintf(" LIMIT %d", b.limit)
	}
	return q
}
```

### Standard library / framework equivalents `[interpretation]`

- `strings.Builder` — classic builder for string concatenation.
- `net/http.Request` — `http.NewRequestWithContext()` + setter methods.
- `google.golang.org/grpc.NewServer(opts...)` — functional options pattern.
- `go.uber.org/zap.New(core, opts...)` — functional options pattern.

---

## Factory Method (p. 107)

**Translation**: Direct `[interpretation]`

Go constructor functions `NewXxx()` ARE Factory Method. This is the most natural pattern in Go.

### Go structure

```go
// Product interface
type Logger interface {
	Log(msg string)
}

// Concrete products
type consoleLogger struct{}
func (l *consoleLogger) Log(msg string) { fmt.Println("CONSOLE:", msg) }

type fileLogger struct {
	w io.Writer
}
func (l *fileLogger) Log(msg string) { fmt.Fprintln(l.w, "FILE:", msg) }

// Factory method — constructor function
func NewLogger(logType string, w io.Writer) (Logger, error) {
	switch logType {
	case "console":
		return &consoleLogger{}, nil
	case "file":
		if w == nil {
			return nil, fmt.Errorf("file logger requires a writer")
		}
		return &fileLogger{w: w}, nil
	default:
		return nil, fmt.Errorf("unknown logger type: %s", logType)
	}
}
```

### Standard library / framework equivalents `[interpretation]`

- Every `New*()` function in stdlib: `bufio.NewReader()`, `http.NewRequest()`, `json.NewDecoder()`.
- `errors.New()` — simplest possible factory method.
- `context.WithCancel()`, `context.WithTimeout()` — parameterized factory methods.

---

## Prototype (p. 117)

**Translation**: Adaptation `[interpretation]`

Go has no built-in clone mechanism. Implement an explicit `Clone()` method for deep copies.

### Go structure

```go
type Cloner[T any] interface {
	Clone() T
}

type Document struct {
	Title    string
	Content  string
	Metadata map[string]string
}

func (d *Document) Clone() *Document {
	// Deep copy the map
	meta := make(map[string]string, len(d.Metadata))
	for k, v := range d.Metadata {
		meta[k] = v
	}
	return &Document{
		Title:    d.Title,
		Content:  d.Content,
		Metadata: meta,
	}
}

// Registry of prototypes
type DocumentRegistry struct {
	prototypes map[string]*Document
}

func (r *DocumentRegistry) Register(name string, doc *Document) {
	r.prototypes[name] = doc
}

func (r *DocumentRegistry) Create(name string) (*Document, error) {
	proto, ok := r.prototypes[name]
	if !ok {
		return nil, fmt.Errorf("prototype %q not found", name)
	}
	return proto.Clone(), nil
}
```

### Standard library / framework equivalents `[interpretation]`

- `bytes.Buffer` — no built-in clone, but `bytes.Clone(b)` (Go 1.20+) clones byte slices.
- `net/http.Request.Clone(ctx)` — stdlib prototype in action.
- `proto.Clone()` in `google.golang.org/protobuf` — deep-copies protobuf messages.

---

## Singleton (p. 127)

**Translation**: Direct `[interpretation]`

`sync.Once` provides thread-safe lazy initialization. Prefer dependency injection over package-level singletons.

### Go structure

```go
type Config struct {
	DatabaseURL string
	APIKey      string
}

var (
	instance *Config
	once     sync.Once
)

func GetConfig() *Config {
	once.Do(func() {
		instance = &Config{
			DatabaseURL: os.Getenv("DATABASE_URL"),
			APIKey:      os.Getenv("API_KEY"),
		}
	})
	return instance
}

// Preferred alternative: dependency injection
type App struct {
	Config *Config // injected, not global
}
```

### Standard library / framework equivalents `[interpretation]`

- `sync.Once` — the Go primitive for singleton initialization.
- `sync.OnceValue[T]` (Go 1.21+) — returns a value from single initialization.
- Package-level `init()` functions — eager singleton, but harder to test.
- `log.Default()` — stdlib singleton logger.

---

# Structural Patterns

---

## Adapter (p. 139)

**Translation**: Direct `[interpretation]`

Wrap a struct to satisfy a different interface. Extremely common in Go due to implicit interface satisfaction.

### Go structure

```go
// Target interface expected by client code
type Storage interface {
	Save(key string, data []byte) error
	Load(key string) ([]byte, error)
}

// Adaptee — third-party S3 client with incompatible API
type S3Client struct {
	Bucket string
}
func (c *S3Client) PutObject(bucket, key string, body io.Reader) error {
	// ... S3 upload logic
	return nil
}
func (c *S3Client) GetObject(bucket, key string) (io.ReadCloser, error) {
	// ... S3 download logic
	return nil, nil
}

// Adapter
type S3Adapter struct {
	client *S3Client
}

func NewS3Adapter(client *S3Client) *S3Adapter {
	return &S3Adapter{client: client}
}

func (a *S3Adapter) Save(key string, data []byte) error {
	return a.client.PutObject(a.client.Bucket, key, bytes.NewReader(data))
}

func (a *S3Adapter) Load(key string) ([]byte, error) {
	r, err := a.client.GetObject(a.client.Bucket, key)
	if err != nil {
		return nil, err
	}
	defer r.Close()
	return io.ReadAll(r)
}
```

### Standard library / framework equivalents `[interpretation]`

- `io.ReadCloser` wrapping `io.Reader` via `io.NopCloser()` — adapter in stdlib.
- `http.HandlerFunc` — adapts a function to the `http.Handler` interface.
- `sort.Interface` — any type implementing `Len()`, `Less()`, `Swap()` adapts to `sort.Sort()`.

---

## Bridge (p. 151)

**Translation**: Direct `[interpretation]`

Struct holds an interface field, decoupling abstraction from implementation. Natural in Go.

### Go structure

```go
// Implementation interface
type Renderer interface {
	RenderCircle(radius float64) string
	RenderRect(width, height float64) string
}

// Concrete implementations
type SVGRenderer struct{}
func (r *SVGRenderer) RenderCircle(radius float64) string {
	return fmt.Sprintf(`<circle r="%.1f"/>`, radius)
}
func (r *SVGRenderer) RenderRect(w, h float64) string {
	return fmt.Sprintf(`<rect w="%.1f" h="%.1f"/>`, w, h)
}

type CanvasRenderer struct{}
func (r *CanvasRenderer) RenderCircle(radius float64) string {
	return fmt.Sprintf("ctx.arc(0, 0, %.1f, 0, 2*PI)", radius)
}
func (r *CanvasRenderer) RenderRect(w, h float64) string {
	return fmt.Sprintf("ctx.fillRect(0, 0, %.1f, %.1f)", w, h)
}

// Abstraction — holds renderer via interface field (the bridge)
type Shape struct {
	renderer Renderer
}

type Circle struct {
	Shape
	Radius float64
}

func NewCircle(r float64, renderer Renderer) *Circle {
	return &Circle{Shape: Shape{renderer: renderer}, Radius: r}
}

func (c *Circle) Draw() string {
	return c.renderer.RenderCircle(c.Radius)
}
```

### Standard library / framework equivalents `[interpretation]`

- `io.Writer` field in `log.Logger` — the output target is the bridge.
- `database/sql.DB` bridges the `driver.Driver` implementation.
- `crypto.Hash` — algorithm selection bridged from hash computation.

---

## Composite (p. 163)

**Translation**: Direct `[interpretation]`

Interface + slice of the same interface type. Extremely natural in Go.

### Go structure

```go
type FileSystem interface {
	Name() string
	Size() int64
	Print(indent string)
}

// Leaf
type File struct {
	name string
	size int64
}

func (f *File) Name() string         { return f.name }
func (f *File) Size() int64          { return f.size }
func (f *File) Print(indent string)  { fmt.Printf("%s%s (%d bytes)\n", indent, f.name, f.size) }

// Composite
type Directory struct {
	name     string
	children []FileSystem
}

func (d *Directory) Name() string { return d.name }

func (d *Directory) Size() int64 {
	var total int64
	for _, child := range d.children {
		total += child.Size()
	}
	return total
}

func (d *Directory) Print(indent string) {
	fmt.Printf("%s%s/\n", indent, d.name)
	for _, child := range d.children {
		child.Print(indent + "  ")
	}
}

func (d *Directory) Add(child FileSystem) {
	d.children = append(d.children, child)
}
```

### Standard library / framework equivalents `[interpretation]`

- `net/http.ServeMux` — routes are a composite of handlers.
- `io.MultiWriter(writers...)` — composite of `io.Writer`.
- `io.MultiReader(readers...)` — composite of `io.Reader`.
- `testing.T.Run()` — subtests form a composite test tree.

---

## Decorator (p. 175)

**Translation**: Direct `[interpretation]`

Function wrapping, especially HTTP middleware. The Go middleware pattern IS Decorator.

### Go structure

```go
// HTTP middleware — the canonical Go Decorator
type Middleware func(http.Handler) http.Handler

func WithLogging(logger *slog.Logger) Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			next.ServeHTTP(w, r)
			logger.Info("request",
				"method", r.Method,
				"path", r.URL.Path,
				"duration", time.Since(start),
			)
		})
	}
}

func WithAuth(tokenValidator func(string) bool) Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token := r.Header.Get("Authorization")
			if !tokenValidator(token) {
				http.Error(w, "unauthorized", http.StatusUnauthorized)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// Compose decorators
func Chain(h http.Handler, mws ...Middleware) http.Handler {
	for i := len(mws) - 1; i >= 0; i-- {
		h = mws[i](h)
	}
	return h
}
```

### Standard library / framework equivalents `[interpretation]`

- `net/http` middleware pattern — `func(http.Handler) http.Handler`.
- `io.LimitReader(r, n)` — decorates an `io.Reader` with a byte limit.
- `bufio.NewReader(r)` — decorates `io.Reader` with buffering.
- chi: `r.Use(middleware.Logger)` — built-in decorator chain.
- gin: `r.Use(gin.Logger())` — same pattern.

---

## Facade (p. 185)

**Translation**: Direct `[interpretation]`

Package-level API hiding internal complexity. Go's package system supports facades naturally.

### Go structure

```go
// Package "checkout" is the facade
// Internal subsystems are unexported

type orderService struct{}
func (s *orderService) createOrder(items []string) (string, error) {
	return "ORD-123", nil
}

type paymentService struct{}
func (s *paymentService) charge(orderID string, amount float64) error {
	return nil
}

type notificationService struct{}
func (s *notificationService) sendConfirmation(email, orderID string) error {
	return nil
}

// Facade — exported API
type CheckoutFacade struct {
	orders        *orderService
	payments      *paymentService
	notifications *notificationService
}

func NewCheckoutFacade() *CheckoutFacade {
	return &CheckoutFacade{
		orders:        &orderService{},
		payments:      &paymentService{},
		notifications: &notificationService{},
	}
}

func (f *CheckoutFacade) Checkout(ctx context.Context, email string, items []string, amount float64) (string, error) {
	orderID, err := f.orders.createOrder(items)
	if err != nil {
		return "", fmt.Errorf("create order: %w", err)
	}
	if err := f.payments.charge(orderID, amount); err != nil {
		return "", fmt.Errorf("charge payment: %w", err)
	}
	if err := f.notifications.sendConfirmation(email, orderID); err != nil {
		return "", fmt.Errorf("send confirmation: %w", err)
	}
	return orderID, nil
}
```

### Standard library / framework equivalents `[interpretation]`

- `net/http` — facade over TCP connections, TLS, routing, headers, etc.
- `database/sql` — facade over driver-specific connection pools, transactions, scanning.
- `encoding/json` — `json.Marshal()` / `json.Unmarshal()` facade over reflection-based encoding.

---

## Flyweight (p. 195)

**Translation**: Adaptation `[interpretation]`

Use `sync.Pool` for object reuse or maps for value interning. Go's garbage collector makes explicit flyweight less critical, but interning remains valuable.

### Go structure

```go
// Flyweight — interned icon data shared across cells
type Icon struct {
	Name    string
	Pixels  []byte // large shared data
}

type IconCache struct {
	mu    sync.RWMutex
	icons map[string]*Icon
}

func NewIconCache() *IconCache {
	return &IconCache{icons: make(map[string]*Icon)}
}

func (c *IconCache) Get(name string) *Icon {
	c.mu.RLock()
	if icon, ok := c.icons[name]; ok {
		c.mu.RUnlock()
		return icon
	}
	c.mu.RUnlock()

	c.mu.Lock()
	defer c.mu.Unlock()
	// Double-check after acquiring write lock
	if icon, ok := c.icons[name]; ok {
		return icon
	}
	icon := &Icon{Name: name, Pixels: loadPixels(name)}
	c.icons[name] = icon
	return icon
}

// Extrinsic state — per-cell position, not shared
type Cell struct {
	Icon *Icon // shared flyweight
	X, Y int   // extrinsic state
}
```

### Standard library / framework equivalents `[interpretation]`

- `sync.Pool` — object reuse pool (not interning, but reduces allocations).
- `fmt` package — internally caches formatters.
- `regexp.MustCompile()` — typically assigned to package-level var for reuse (manual flyweight).
- String interning via `unique.Handle[string]` (Go 1.23+).

---

## Proxy (p. 207)

**Translation**: Direct `[interpretation]`

Implement the same interface, delegate to the wrapped object. Add access control, caching, or lazy loading.

### Go structure

```go
// Subject interface
type DataStore interface {
	Get(ctx context.Context, key string) (string, error)
	Set(ctx context.Context, key, value string) error
}

// Real subject
type RedisStore struct {
	addr string
}
func (s *RedisStore) Get(ctx context.Context, key string) (string, error) {
	// ... actual Redis call
	return "", nil
}
func (s *RedisStore) Set(ctx context.Context, key, value string) error {
	// ... actual Redis call
	return nil
}

// Caching proxy
type CachingProxy struct {
	store DataStore
	mu    sync.RWMutex
	cache map[string]string
}

func NewCachingProxy(store DataStore) *CachingProxy {
	return &CachingProxy{store: store, cache: make(map[string]string)}
}

func (p *CachingProxy) Get(ctx context.Context, key string) (string, error) {
	p.mu.RLock()
	if v, ok := p.cache[key]; ok {
		p.mu.RUnlock()
		return v, nil
	}
	p.mu.RUnlock()

	v, err := p.store.Get(ctx, key)
	if err != nil {
		return "", err
	}
	p.mu.Lock()
	p.cache[key] = v
	p.mu.Unlock()
	return v, nil
}

func (p *CachingProxy) Set(ctx context.Context, key, value string) error {
	if err := p.store.Set(ctx, key, value); err != nil {
		return err
	}
	p.mu.Lock()
	p.cache[key] = value
	p.mu.Unlock()
	return nil
}
```

### Standard library / framework equivalents `[interpretation]`

- `httputil.ReverseProxy` — proxy for HTTP requests.
- `httputil.NewSingleHostReverseProxy()` — factory for reverse proxies.
- `net/http.Transport` — connection pooling proxy layer.
- `golang.org/x/sync/singleflight` — deduplication proxy for concurrent calls.

---

# Behavioral Patterns

---

## Chain of Responsibility (p. 223)

**Translation**: Direct `[interpretation]`

Go's `http.Handler` middleware chains ARE Chain of Responsibility. Each handler decides whether to process or pass along.

### Go structure

```go
// Generic chain handler
type Request struct {
	Type    string
	Payload string
}

type Handler interface {
	Handle(req Request) (string, bool)
}

type HandlerFunc func(req Request) (string, bool)
func (f HandlerFunc) Handle(req Request) (string, bool) { return f(req) }

type Chain struct {
	handlers []Handler
}

func NewChain(handlers ...Handler) *Chain {
	return &Chain{handlers: handlers}
}

func (c *Chain) Process(req Request) (string, error) {
	for _, h := range c.handlers {
		if result, handled := h.Handle(req); handled {
			return result, nil
		}
	}
	return "", fmt.Errorf("no handler for request type: %s", req.Type)
}

// Usage with http middleware — the real-world Go version
func Recovery(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				http.Error(w, "internal error", http.StatusInternalServerError)
			}
		}()
		next.ServeHTTP(w, r)
	})
}
```

### Standard library / framework equivalents `[interpretation]`

- `net/http` middleware stack — each middleware calls `next.ServeHTTP()` or stops the chain.
- chi: `r.Use(middleware.Recoverer)` — built-in chain of responsibility.
- gin: `c.Next()` / `c.Abort()` — explicit chain control.

---

## Command (p. 233)

**Translation**: Adaptation `[interpretation]`

In Go, commands are often `func()` closures. For undo support, use a struct with `Execute()` / `Undo()`.

### Go structure

```go
// Command interface
type Command interface {
	Execute() error
	Undo() error
}

// Concrete command
type InsertTextCmd struct {
	doc      *Document
	position int
	text     string
}

func (c *InsertTextCmd) Execute() error {
	c.doc.Insert(c.position, c.text)
	return nil
}

func (c *InsertTextCmd) Undo() error {
	c.doc.Delete(c.position, len(c.text))
	return nil
}

// Invoker — command history with undo
type History struct {
	done []Command
}

func (h *History) Execute(cmd Command) error {
	if err := cmd.Execute(); err != nil {
		return err
	}
	h.done = append(h.done, cmd)
	return nil
}

func (h *History) Undo() error {
	if len(h.done) == 0 {
		return fmt.Errorf("nothing to undo")
	}
	cmd := h.done[len(h.done)-1]
	h.done = h.done[:len(h.done)-1]
	return cmd.Undo()
}

// Closure-based command (simpler, no undo)
type Action func() error
```

### Standard library / framework equivalents `[interpretation]`

- `database/sql.Tx` — `Commit()` / `Rollback()` is a form of command with undo.
- `exec.Cmd` — encapsulates an OS command execution.
- `testing.T.Cleanup(func())` — registers deferred undo actions.

---

## Interpreter (p. 243)

**Translation**: Conceptual translation `[interpretation]`

Struct-based AST with `Interpret()` method. Same tree structure as Composite.

### Go structure

```go
// Expression interface — AST node
type Expr interface {
	Interpret(vars map[string]int) (int, error)
}

// Terminal: number literal
type NumberExpr struct {
	Value int
}
func (e *NumberExpr) Interpret(_ map[string]int) (int, error) {
	return e.Value, nil
}

// Terminal: variable reference
type VarExpr struct {
	Name string
}
func (e *VarExpr) Interpret(vars map[string]int) (int, error) {
	v, ok := vars[e.Name]
	if !ok {
		return 0, fmt.Errorf("undefined variable: %s", e.Name)
	}
	return v, nil
}

// Non-terminal: binary operation
type BinaryExpr struct {
	Op    string
	Left  Expr
	Right Expr
}

func (e *BinaryExpr) Interpret(vars map[string]int) (int, error) {
	l, err := e.Left.Interpret(vars)
	if err != nil {
		return 0, err
	}
	r, err := e.Right.Interpret(vars)
	if err != nil {
		return 0, err
	}
	switch e.Op {
	case "+":
		return l + r, nil
	case "-":
		return l - r, nil
	case "*":
		return l * r, nil
	default:
		return 0, fmt.Errorf("unknown operator: %s", e.Op)
	}
}
```

### Standard library / framework equivalents `[interpretation]`

- `go/ast` + `go/parser` — Go's own AST uses this pattern.
- `text/template` — template language interpreter.
- `regexp` — compiled regular expression interpreter.
- `go/types` — type-checking as interpretation of an AST.

---

## Iterator (p. 257)

**Translation**: Adaptation `[interpretation]`

Go 1.22+ range-over-func is the modern approach. Channels and callback iteration are also idiomatic.

### Go structure

```go
// Go 1.22+ range-over-func iterator
type TreeNode[T any] struct {
	Value T
	Left  *TreeNode[T]
	Right *TreeNode[T]
}

// Iterator using range-over-func (Go 1.22+)
func (n *TreeNode[T]) InOrder() iter.Seq[T] {
	return func(yield func(T) bool) {
		if n == nil {
			return
		}
		for v := range n.Left.InOrder() {
			if !yield(v) {
				return
			}
		}
		if !yield(n.Value) {
			return
		}
		for v := range n.Right.InOrder() {
			if !yield(v) {
				return
			}
		}
	}
}

// Usage:
// for val := range tree.InOrder() {
//     fmt.Println(val)
// }

// Channel-based iterator (pre-1.22 alternative)
func (n *TreeNode[T]) InOrderChan(ctx context.Context) <-chan T {
	ch := make(chan T)
	go func() {
		defer close(ch)
		n.inOrderSend(ctx, ch)
	}()
	return ch
}

func (n *TreeNode[T]) inOrderSend(ctx context.Context, ch chan<- T) {
	if n == nil {
		return
	}
	n.Left.inOrderSend(ctx, ch)
	select {
	case ch <- n.Value:
	case <-ctx.Done():
		return
	}
	n.Right.inOrderSend(ctx, ch)
}
```

### Standard library / framework equivalents `[interpretation]`

- `iter.Seq[T]`, `iter.Seq2[K, V]` (Go 1.22+) — standard iterator types.
- `slices.All()`, `maps.Keys()` — stdlib iterators returning `iter.Seq`.
- `bufio.Scanner` — classic pull iterator: `for scanner.Scan() { ... }`.
- `sql.Rows` — cursor-based iterator: `for rows.Next() { ... }`.
- `filepath.WalkDir()` — callback-based directory traversal.

---

## Mediator (p. 273)

**Translation**: Adaptation `[interpretation]`

Channels for goroutine communication. Or a central event bus struct.

### Go structure

```go
// Mediator — chat room coordinating users
type ChatRoom struct {
	mu       sync.RWMutex
	users    map[string]chan string
}

func NewChatRoom() *ChatRoom {
	return &ChatRoom{users: make(map[string]chan string)}
}

func (r *ChatRoom) Join(name string) <-chan string {
	r.mu.Lock()
	defer r.mu.Unlock()
	ch := make(chan string, 16)
	r.users[name] = ch
	r.Broadcast("system", name+" joined the room")
	return ch
}

func (r *ChatRoom) Leave(name string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if ch, ok := r.users[name]; ok {
		close(ch)
		delete(r.users, name)
	}
}

func (r *ChatRoom) Send(from, to, msg string) error {
	r.mu.RLock()
	defer r.mu.RUnlock()
	ch, ok := r.users[to]
	if !ok {
		return fmt.Errorf("user %q not found", to)
	}
	ch <- fmt.Sprintf("[%s]: %s", from, msg)
	return nil
}

func (r *ChatRoom) Broadcast(from, msg string) {
	for name, ch := range r.users {
		if name != from {
			select {
			case ch <- fmt.Sprintf("[%s]: %s", from, msg):
			default: // drop if buffer full
			}
		}
	}
}
```

### Standard library / framework equivalents `[interpretation]`

- Channels — Go's built-in mediator between goroutines.
- `sync.Cond` — mediates wait/signal between goroutines.
- `net/http.ServeMux` — mediates routing between handlers.
- Event bus libraries: `github.com/asaskevich/EventBus`.

---

## Memento (p. 283)

**Translation**: Adaptation `[interpretation]`

Deep copy the struct (manual or via serialization). Store in a stack for undo.

### Go structure

```go
// Originator — the object whose state we save
type Editor struct {
	Content  string
	CursorX  int
	CursorY  int
}

// Memento — opaque snapshot
type Snapshot struct {
	content  string
	cursorX  int
	cursorY  int
}

func (e *Editor) Save() Snapshot {
	return Snapshot{
		content: e.Content,
		cursorX: e.CursorX,
		cursorY: e.CursorY,
	}
}

func (e *Editor) Restore(s Snapshot) {
	e.Content = s.content
	e.CursorX = s.cursorX
	e.CursorY = s.cursorY
}

// Caretaker — undo stack
type UndoStack struct {
	snapshots []Snapshot
}

func (u *UndoStack) Push(s Snapshot) {
	u.snapshots = append(u.snapshots, s)
}

func (u *UndoStack) Pop() (Snapshot, error) {
	if len(u.snapshots) == 0 {
		return Snapshot{}, fmt.Errorf("nothing to undo")
	}
	s := u.snapshots[len(u.snapshots)-1]
	u.snapshots = u.snapshots[:len(u.snapshots)-1]
	return s, nil
}

// Serialization-based memento for complex structs
func (e *Editor) SaveJSON() ([]byte, error) {
	return json.Marshal(e)
}

func (e *Editor) RestoreJSON(data []byte) error {
	return json.Unmarshal(data, e)
}
```

### Standard library / framework equivalents `[interpretation]`

- `encoding/json`, `encoding/gob` — serialization for snapshots.
- `database/sql.Tx` — savepoints are database-level mementos.
- `bytes.Buffer` — `Bytes()` captures state, though not a formal memento.

---

## Observer (p. 293)

**Translation**: Adaptation `[interpretation]`

Channels or callback slices. Go's `context.Context` is related (cancellation propagation).

### Go structure

```go
// Observer via callbacks
type EventType string

type EventBus struct {
	mu       sync.RWMutex
	handlers map[EventType][]func(data any)
}

func NewEventBus() *EventBus {
	return &EventBus{handlers: make(map[EventType][]func(data any))}
}

func (b *EventBus) Subscribe(event EventType, handler func(data any)) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.handlers[event] = append(b.handlers[event], handler)
}

func (b *EventBus) Publish(event EventType, data any) {
	b.mu.RLock()
	handlers := make([]func(data any), len(b.handlers[event]))
	copy(handlers, b.handlers[event])
	b.mu.RUnlock()

	for _, h := range handlers {
		h(data)
	}
}

// Channel-based observer (fan-out)
type Broadcaster[T any] struct {
	mu          sync.Mutex
	subscribers []chan T
}

func (b *Broadcaster[T]) Subscribe() <-chan T {
	b.mu.Lock()
	defer b.mu.Unlock()
	ch := make(chan T, 8)
	b.subscribers = append(b.subscribers, ch)
	return ch
}

func (b *Broadcaster[T]) Notify(val T) {
	b.mu.Lock()
	defer b.mu.Unlock()
	for _, ch := range b.subscribers {
		select {
		case ch <- val:
		default: // non-blocking send
		}
	}
}
```

### Standard library / framework equivalents `[interpretation]`

- `context.Context` — cancellation propagation is observer-like (parent notifies children).
- `sync.Cond` — `Broadcast()` notifies all waiters.
- `os/signal.Notify(ch, ...)` — subscribe to OS signals via channel.
- `database/sql.DB.SetConnMaxLifetime()` + pool events — internal observer.
- `fsnotify` package — file system change observer.

---

## State (p. 305)

**Translation**: Direct `[interpretation]`

Interface + concrete state structs. Or a single `func` field that changes.

### Go structure

```go
// State interface
type ConnectionState interface {
	Open(c *Connection) error
	Close(c *Connection) error
	Send(c *Connection, data []byte) error
}

// Context
type Connection struct {
	state ConnectionState
}

func NewConnection() *Connection {
	return &Connection{state: &ClosedState{}}
}

func (c *Connection) SetState(s ConnectionState) { c.state = s }
func (c *Connection) Open() error                { return c.state.Open(c) }
func (c *Connection) Close() error               { return c.state.Close(c) }
func (c *Connection) Send(data []byte) error      { return c.state.Send(c, data) }

// Concrete states
type ClosedState struct{}
func (s *ClosedState) Open(c *Connection) error {
	fmt.Println("Opening connection...")
	c.SetState(&OpenState{})
	return nil
}
func (s *ClosedState) Close(_ *Connection) error {
	return fmt.Errorf("already closed")
}
func (s *ClosedState) Send(_ *Connection, _ []byte) error {
	return fmt.Errorf("cannot send: connection closed")
}

type OpenState struct{}
func (s *OpenState) Open(_ *Connection) error {
	return fmt.Errorf("already open")
}
func (s *OpenState) Close(c *Connection) error {
	fmt.Println("Closing connection...")
	c.SetState(&ClosedState{})
	return nil
}
func (s *OpenState) Send(_ *Connection, data []byte) error {
	fmt.Printf("Sending %d bytes\n", len(data))
	return nil
}
```

### Standard library / framework equivalents `[interpretation]`

- `net/http` server states — listening, serving, shutting down.
- `context.Context` — done/active states.
- `sync.Once` — one-shot state transition (uninitialized → initialized).
- TCP connection states managed by `net.Conn` implementations.

---

## Strategy (p. 315)

**Translation**: Direct `[interpretation]`

Function parameters or interface fields. `sort.Slice(data, less)` IS Strategy.

### Go structure

```go
// Strategy as function parameter (most idiomatic)
type Compressor func(data []byte) ([]byte, error)

func GzipCompressor(data []byte) ([]byte, error) {
	var buf bytes.Buffer
	w := gzip.NewWriter(&buf)
	if _, err := w.Write(data); err != nil {
		return nil, err
	}
	if err := w.Close(); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func NoCompression(data []byte) ([]byte, error) {
	return data, nil
}

// Client uses strategy as a parameter
func Upload(ctx context.Context, data []byte, compress Compressor) error {
	compressed, err := compress(data)
	if err != nil {
		return fmt.Errorf("compress: %w", err)
	}
	fmt.Printf("Uploading %d bytes (was %d)\n", len(compressed), len(data))
	return nil
}

// Strategy as interface field (when strategy has multiple methods)
type RetryStrategy interface {
	NextDelay(attempt int) time.Duration
	MaxAttempts() int
}

type ExponentialBackoff struct {
	Base    time.Duration
	Max     int
}

func (s *ExponentialBackoff) NextDelay(attempt int) time.Duration {
	return s.Base * time.Duration(1<<uint(attempt))
}

func (s *ExponentialBackoff) MaxAttempts() int { return s.Max }
```

### Standard library / framework equivalents `[interpretation]`

- `sort.Slice(data, func(i, j int) bool {...})` — Strategy as function argument.
- `sort.SliceStable()` — same pattern, stable sort strategy.
- `http.Client.Transport` — pluggable round-trip strategy.
- `crypto/tls.Config.GetCertificate` — certificate selection strategy.
- `slog.Handler` interface — logging output strategy.

---

## Template Method (p. 325)

**Translation**: Conceptual translation `[interpretation]`

Go has no abstract classes. Use a struct with an interface field for the varying step, or embed a struct with defaults.

### Go structure

```go
// Template using interface for the varying step
type DataProcessor interface {
	Parse(raw []byte) ([]Record, error)
	Validate(r Record) error
}

type Record struct {
	ID   string
	Data map[string]string
}

// Template function — defines the algorithm skeleton
func ProcessFile(ctx context.Context, path string, processor DataProcessor) error {
	raw, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("read file: %w", err)
	}

	records, err := processor.Parse(raw)
	if err != nil {
		return fmt.Errorf("parse: %w", err)
	}

	var valid []Record
	for _, r := range records {
		if err := processor.Validate(r); err != nil {
			slog.Warn("skipping invalid record", "id", r.ID, "err", err)
			continue
		}
		valid = append(valid, r)
	}

	slog.Info("processed file", "total", len(records), "valid", len(valid))
	return nil
}

// Concrete implementation — only defines the varying steps
type CSVProcessor struct{}

func (p *CSVProcessor) Parse(raw []byte) ([]Record, error) {
	// CSV-specific parsing
	return nil, nil
}

func (p *CSVProcessor) Validate(r Record) error {
	if r.ID == "" {
		return fmt.Errorf("missing ID")
	}
	return nil
}
```

### Standard library / framework equivalents `[interpretation]`

- `sort.Interface` — provide `Len()`, `Less()`, `Swap()` and the sort algorithm is the template.
- `encoding.BinaryMarshaler` / `encoding.BinaryUnmarshaler` — define marshaling steps, encoding calls them.
- `http.Handler` — `ServeHTTP` is the step you fill in; the server provides the template (accept, route, call handler, write response).
- `io.Copy(dst, src)` — template algorithm using `Read()` / `Write()` steps.

---

## Visitor (p. 331)

**Translation**: Adaptation `[interpretation]`

Interface with `Visit(element)` methods. Go's type switch (`switch v := x.(type)`) IS Visitor dispatch.

### Go structure

```go
// Element hierarchy
type Node interface {
	Accept(v Visitor)
}

type FileNode struct {
	Name string
	Size int64
}
func (n *FileNode) Accept(v Visitor) { v.VisitFile(n) }

type DirNode struct {
	Name     string
	Children []Node
}
func (n *DirNode) Accept(v Visitor) { v.VisitDir(n) }

// Visitor interface
type Visitor interface {
	VisitFile(f *FileNode)
	VisitDir(d *DirNode)
}

// Concrete visitor — collect stats
type StatsVisitor struct {
	FileCount int
	DirCount  int
	TotalSize int64
}

func (v *StatsVisitor) VisitFile(f *FileNode) {
	v.FileCount++
	v.TotalSize += f.Size
}

func (v *StatsVisitor) VisitDir(d *DirNode) {
	v.DirCount++
	for _, child := range d.Children {
		child.Accept(v)
	}
}

// Type-switch alternative — Go-idiomatic visitor dispatch
func PrintNode(n Node) {
	switch v := n.(type) {
	case *FileNode:
		fmt.Printf("file: %s (%d bytes)\n", v.Name, v.Size)
	case *DirNode:
		fmt.Printf("dir: %s/\n", v.Name)
		for _, child := range v.Children {
			PrintNode(child)
		}
	}
}
```

### Standard library / framework equivalents `[interpretation]`

- `go/ast.Walk(visitor, node)` — classic visitor over Go AST.
- `go/ast.Inspect(node, func)` — callback-based visitor.
- `filepath.WalkDir()` — visitor over file system tree.
- `encoding/xml.Decoder.Token()` — manual visitor over XML tokens.
- Type switches throughout stdlib — idiomatic Go visitor dispatch.

---

# Summary

| Category | Pattern | Translation | Page |
|----------|---------|-------------|------|
| Creational | Abstract Factory | Direct | 87 |
| Creational | Builder | Adaptation | 97 |
| Creational | Factory Method | Direct | 107 |
| Creational | Prototype | Adaptation | 117 |
| Creational | Singleton | Direct | 127 |
| Structural | Adapter | Direct | 139 |
| Structural | Bridge | Direct | 151 |
| Structural | Composite | Direct | 163 |
| Structural | Decorator | Direct | 175 |
| Structural | Facade | Direct | 185 |
| Structural | Flyweight | Adaptation | 195 |
| Structural | Proxy | Direct | 207 |
| Behavioral | Chain of Responsibility | Direct | 223 |
| Behavioral | Command | Adaptation | 233 |
| Behavioral | Interpreter | Conceptual translation | 243 |
| Behavioral | Iterator | Adaptation | 257 |
| Behavioral | Mediator | Adaptation | 273 |
| Behavioral | Memento | Adaptation | 283 |
| Behavioral | Observer | Adaptation | 293 |
| Behavioral | State | Direct | 305 |
| Behavioral | Strategy | Direct | 315 |
| Behavioral | Template Method | Conceptual translation | 325 |
| Behavioral | Visitor | Adaptation | 331 |

**Translation counts**: Direct: 13 | Adaptation: 8 | Conceptual translation: 2
