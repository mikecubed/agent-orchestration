# TDD Language Reference — Go

Loaded by `tdd-check` when language = `go`.
Provides Go-specific test framework defaults, file naming conventions,
and tooling guidance for each TDD rule.

---

## Default Test Stack

| Purpose | Primary | Alternative |
|---------|---------|------------|
| Unit tests | **testing** (stdlib) | testify |
| Property-based tests | **testing/quick** | rapid |
| Integration (HTTP) | **net/http/httptest** | — |
| Benchmarks | **testing.B** (stdlib) | — |
| Coverage | **go test -cover** / **go test -coverprofile** | — |
| Test runner | `go test ./...` | — |

---

## File Naming Conventions

| Convention | Pattern | Example |
|-----------|---------|---------|
| Unit test file | `{file}_test.go` | `user_service_test.go` |
| Integration test file | `{file}_integration_test.go` | `payment_integration_test.go` |
| Test package (white-box) | `package {pkg}` (same package) | `package user` |
| Test package (black-box) | `package {pkg}_test` | `package user_test` |

**Go convention**: test files live in the same directory as the source file.
A separate `tests/` directory is non-idiomatic in Go; use build tags for integration tests.

---

## TDD-1: Test File Detection

Look for:
```
{file}_test.go           (same directory as source)
{file}_integration_test.go
```

**Build tags for integration tests** (Go 1.17+):
```go
//go:build integration

package payment_test
```

Run with: `go test -tags=integration ./...`

---

## TDD-4: Test Naming — Go stdlib

Pattern: `TestSubject_Scenario_Expected` (PascalCase with underscores).
For table-driven tests: subject in function name, scenario/expected in the `name` field of each test case.

---

## Table-Driven Test Idiom

The table-driven test pattern is idiomatic Go and strongly preferred. Each test case struct has a `name` string field used with `t.Run(tt.name, ...)`.

---

## TDD-7: Mocks — Permitted vs Prohibited

**Permitted**: interface-based test doubles for I/O (database, HTTP, external services).
**Prohibited**: replacing domain logic with mocks — use the real implementation.
**Go idiom**: define the interface, implement an in-memory version for tests; no mock library required.

---

## TDD-8: Property-Based Tests — testing/quick

Use `quick.Check(f, nil)` with a property function returning `bool`. For richer generators, use `pgregory.net/rapid`.

---

## TDD-9: Test Ratio — Measurement

```bash
# Count source lines (excluding test files)
find . -name "*.go" ! -name "*_test.go" ! -path "*/vendor/*" | xargs wc -l | tail -1

# Count test lines
find . -name "*_test.go" ! -path "*/vendor/*" | xargs wc -l | tail -1
```

---

## Coverage Configuration

```bash
# Run tests with coverage
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out -o coverage.html
go tool cover -func=coverage.out | grep total

# Fail if coverage below threshold (CI)
go test -coverprofile=coverage.out ./... && \
  go tool cover -func=coverage.out | \
  awk '/^total:/{if ($3+0 < 80) {print "Coverage below 80%"; exit 1}}'
```

**Targets**: Domain layer: 90% | Application layer: 80%

---

## HTTP Integration Tests — net/http/httptest

Use `httptest.NewServer(router)` to spin up a real HTTP server for integration tests. Call `defer srv.Close()` and make requests against `srv.URL`.

---

## Non-Standard Framework Handling

If the project uses testify, gomega, or ginkgo:
- Apply TDD-1 through TDD-9 language-agnostically
- Note the non-standard framework in the report without blocking
- Adapt TDD-4 naming pattern to the framework's `It()/Describe()` conventions

---

## Scaffold Patterns (`--scaffold-tests`)

### Go (testing package)

```go
package domain_test

import (
    "testing"
    "yourmodule/path/to/package"
)

func TestFunctionName_Scenario_Expected(t *testing.T) {
    result := package.FunctionName()
    expected := 0 // TODO: replace with specific expected value
    if result != expected {
        t.Errorf("FunctionName() = %v, want %v", result, expected)
    }
}
```

**Rules for scaffold assertions**:
- Use `t.Errorf` or `t.Fatalf` — never `t.Log` alone
- Import the real package (no stubs in skeleton)
- Test MUST fail on first run
