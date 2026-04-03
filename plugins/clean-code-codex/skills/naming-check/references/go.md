# Naming Check — Go Language Reference

**Language**: Go | **Loaded by**: naming-check/SKILL.md

---

## Casing Conventions (Effective Go)

| Identifier type          | Convention             | Examples                                        |
|--------------------------|------------------------|-------------------------------------------------|
| Unexported identifiers   | `camelCase`            | `userId`, `maxRetry`, `requestBody`             |
| Exported identifiers     | `PascalCase`           | `UserID`, `GetOrderByID`, `PaymentService`      |
| Constants                | `PascalCase` (exported)| `MaxRetryCount`, `DefaultTimeout`               |
|                          | `camelCase` (unexported)| `maxRetryCount`, `defaultTimeout`              |
| Interfaces               | `PascalCase`           | `Reader`, `Writer`, `UserRepository`            |
| Structs                  | `PascalCase`           | `UserService`, `OrderRepository`                |
| Methods                  | `PascalCase` (exported)| `GetUserByID`, `CalculateTotalPrice`            |
| Error types              | `PascalCase` + `Error` | `NotFoundError`, `ValidationError`              |
| Error vars               | `camelCase` + `Err`    | `errNotFound`, `errTimeout` (unexported)         |
|                          | `PascalCase` + `Err`   | `ErrNotFound`, `ErrTimeout` (exported sentinel) |

---

## Package Naming (Go-specific)

- **Lowercase single word**: `user`, `order`, `payment`, `auth`
- **No underscores**: `user_service` ❌ → `userservice` or `user` ✅
- **No `PascalCase`**: `UserService` ❌ → `user` ✅
- **No generic names**: `util`, `utils`, `common`, `misc`, `helpers` ❌
- **Test packages**: `[pkg]_test` (external test package) — this `_test` suffix
  is the **only** permitted underscore in package names

---

## Acronym Capitalization (MixedCaps convention)

Go uses `MixedCaps` (not `HTTP_CLIENT`). Acronyms preserve their all-caps form in exported names: `userID`, `GetUserByID`, `HTTPClient`, `JSONParser`, `ParseURL`.

Standard acronyms that must be all-caps: `ID`, `URL`, `HTTP`, `SQL`, `JSON`, `XML`, `API`, `HTML`, `CSS`, `RPC`, `DB`, `IO`, `EOF`, `OS`, `FS`.

---

## NAME-7: Test Function Naming (Go)

Pattern: `TestSubject_Scenario_Expected` (PascalCase with underscores).
For table-driven subtests: `t.Run(tt.name, ...)` where `name` follows `withScenario_returnsExpected`.

---

## Rule Applicability

| Rule   | Status      | Notes                                                              |
|--------|-------------|---------------------------------------------------------------------|
| NAME-1 | ✅ ACTIVE    | Apply anti-pattern table; check `.go` files                        |
| NAME-2 | ✅ ACTIVE    | Check `bool` return types and `bool` fields                        |
| NAME-3 | ✅ ACTIVE    | Flag `*Manager`, `*Handler`, `*Helper`; generic package names      |
| NAME-4 | ✅ ACTIVE    | Exported names must be fully descriptive                           |
| NAME-5 | ✅ ACTIVE    | Acronyms permitted per MixedCaps; non-standard abbrevs flagged     |
| NAME-6 | ✅ ACTIVE    | Scan across `*.go` files in scope                                  |
| NAME-7 | ✅ ACTIVE    | Scan `*_test.go` files                                             |

---

## Tooling

| Tool          | Purpose                                               |
|---------------|-------------------------------------------------------|
| `golint`      | Enforces exported name conventions and godoc comments |
| `staticcheck` | `ST1003` — name style violations                      |
| `revive`      | Configurable naming linter (replaces golint)          |
| `go vet`      | Catches shadowed names and basic issues               |
