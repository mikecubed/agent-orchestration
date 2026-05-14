# Test Gate Language Reference — Go

Loaded by `gate-check` when language = `go`.
Provides Go-specific test framework defaults, file naming conventions,
and scaffold templates for the test gate (TEST-PINNED, TEST-RED-FIRST).

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

## TEST-PINNED: Test File Detection

Look for:
```
{file}_test.go           (same directory as source)
{file}_integration_test.go
```

For each new exported (PascalCase) symbol: confirm a `Test{Name}*` function
exists in the matching `_test.go` file and that it constructs or calls the
symbol.

**Build tags for integration tests** (Go 1.17+):
```go
//go:build integration

package payment_test
```

Run with: `go test -tags=integration ./...`

---

## Table-Driven Test Idiom

The table-driven test pattern is idiomatic Go and strongly preferred. Each test case struct has a `name` string field used with `t.Run(tt.name, ...)`.

---

## Coverage Configuration

```bash
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out -o coverage.html
go tool cover -func=coverage.out | grep total
```

---

## HTTP Integration Tests — net/http/httptest

Use `httptest.NewServer(router)` to spin up a real HTTP server for integration tests. Call `defer srv.Close()` and make requests against `srv.URL`.

---

## Non-Standard Framework Handling

If the project uses testify, gomega, or ginkgo:
- Apply TEST-PINNED and TEST-RED-FIRST language-agnostically
- Note the non-standard framework in the report without blocking
- Adapt naming to the framework's `It()/Describe()` conventions

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
