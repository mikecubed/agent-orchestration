# Purity Check — Go Language Reference

**Language**: Go | **Loaded by**: purity-check/SKILL.md

---

## Side-Effect Imports to Detect in `core/`

| Category | Import patterns that trigger PURE-1 |
|---|---|
| Filesystem | `os` (when used for `Open`/`Create`/`Read*`/`Write*`), `io/ioutil`, `path/filepath` (for `Walk`/`Glob`) |
| Network | `net/http`, `net`, `golang.org/x/net/*` (for actual network calls) |
| Database | `database/sql`, `github.com/lib/pq`, `gorm.io/gorm`, `go.mongodb.org/*`, `github.com/redis/go-redis`, `github.com/jackc/pgx` |
| Frameworks | `github.com/gin-gonic/gin`, `github.com/labstack/echo`, `github.com/gofiber/fiber`, `github.com/go-chi/chi` |
| Cloud SDKs | `github.com/aws/aws-sdk-go-v2/*`, `cloud.google.com/go/*`, `github.com/Azure/azure-sdk-for-go/*` |
| Process | `os/exec`, `syscall` |
| Logging | `log`, `log/slog`, `go.uber.org/zap`, `github.com/sirupsen/logrus`, direct `fmt.Print*` calls |

---

## Clock / RNG / Logging Calls (PURE-1)

| Concern | Calls to flag |
|---|---|
| Clock | `time.Now()`, `time.Since(`, `time.Until(`, `time.Tick(`, `time.NewTimer(` |
| RNG | `math/rand` (`rand.Int`, `rand.Intn`, `rand.Float64`), `crypto/rand`, `math/rand/v2` |
| Logging | `fmt.Println`, `fmt.Printf`, `log.*`, `slog.*` |

**Allowed**: `time.Time` literals constructed with explicit values
(`time.Date(2024, 1, 1, ...)`), `time.Duration` constants, `math.*` (pure
math), `crypto/sha256.Sum256(literalBytes)` used as a pure transform.

---

## Ambient State Reads (PURE-2)

| Pattern | Example |
|---|---|
| Env vars | `os.Getenv("X")`, `os.LookupEnv("X")` |
| Argv | `os.Args` |
| Globals | Package-level `var x = ...` of mutable types, `var counter int` mutated by functions |
| Context | `context.Context` value extraction (`ctx.Value(key)`) for ambient deps; passing `ctx` itself is fine |

---

## Type-Only Imports

Go has no type-only import syntax. Every imported package contributes to
runtime. Core packages must avoid all infrastructure imports — there is no
zero-cost escape hatch.

The one common idiom that looks suspicious but is allowed: importing a package
purely to use its exported error sentinels (`var ErrNotFound = ...`) as compared
constants. Treat as PASS unless the import path is in shell territory.

---

## Mock-Required-to-Test Signal (PURE-3)

Test files importing `github.com/stretchr/testify/mock`, `github.com/golang/mock/gomock`,
`github.com/h2non/gock`, `github.com/jarcoal/httpmock`, or generating mocks via
`go:generate mockgen` against a core package are PURE-3 candidates.

In Go the more idiomatic alternative is a hand-rolled in-memory implementation
of an interface defined in core — flag mocking-library usage in *unit tests for
core*, not in *integration tests for shell adapters*.

---

## Go Idiom — Context Propagation

`context.Context` parameters are *not* a PURE-1 violation even though
`context.Background()` looks like an ambient read. Convention: shell creates
the context at the request boundary; core receives it as a parameter and
passes it through. Flag `context.Background()` or `context.TODO()` *inside
core function bodies*, not as parameter types.

---

## Tooling

| Tool | What to use it for |
|---|---|
| `go vet` | Catches some unsafe patterns; not architecture-aware |
| `golangci-lint` with `depguard` | Configure denied imports per package |
| `import-boss` (from kubernetes) | Layered import enforcement |
