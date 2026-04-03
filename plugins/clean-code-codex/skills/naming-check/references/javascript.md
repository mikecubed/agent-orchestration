# Naming Check — JavaScript Language Reference

**Language**: JavaScript | **Loaded by**: naming-check/SKILL.md

---

## Casing Conventions

JavaScript shares TypeScript casing conventions minus interface/type-specific
rules (those don't exist without a type system).

| Identifier type          | Convention           | Examples                                      |
|--------------------------|----------------------|-----------------------------------------------|
| Variables & parameters   | `camelCase`          | `userId`, `requestBody`, `maxRetryCount`       |
| Functions & methods      | `camelCase`          | `getUserById`, `calculateTotalPrice`           |
| Classes                  | `PascalCase`         | `UserRepository`, `OrderService`              |
| Constants (module-level) | `SCREAMING_SNAKE`    | `MAX_RETRY_COUNT`, `DEFAULT_TIMEOUT_MS`       |
| Private class fields     | `#camelCase`         | `#userId`, `#cache` (ES2022 private fields)   |
| Constructor functions    | `PascalCase`         | `function User(name) { ... }`                 |
| React components         | `PascalCase`         | `UserProfile`, `OrderSummary`                 |

---

## File Naming

| File type              | Pattern                          | Examples                                       |
|------------------------|----------------------------------|------------------------------------------------|
| Module                 | `[name].js` or `[name].mjs`      | `user-service.js`, `order.repository.js`       |
| React component        | `[Name].jsx` / `[Name].js`       | `UserProfile.jsx`, `OrderSummary.js`           |
| Test                   | `[name].test.js` / `[name].spec.js` | `user-service.test.js`                      |
| Constants              | `[name].constants.js`            | `http.constants.js`                            |

---

## JSDoc Requirements (NAME-5 + API clarity)

In JavaScript, JSDoc is the substitute for type annotations. Public functions
**must** have complete JSDoc with typed parameters and return values.

**JSDoc naming rules**:
- `@param {Type} name` — parameter name must match function signature exactly
- `@param {*}` wildcard — **prohibited** (TYPE-1 from type-check)
- `@returns {*}` wildcard — **prohibited**
- Use precise types: `{string}`, `{number}`, `{User}`, `{Promise<Order>}`

---

## NAME-7: Test Function Naming (JavaScript)

Same pattern as TypeScript — `[subject]_[scenario]_[expected]` in `it`/`test` description strings.

---

## TypeScript Differences (inapplicable rules)

| TypeScript rule         | JavaScript status                                         |
|-------------------------|-----------------------------------------------------------|
| Interface naming        | N/A — no interfaces in plain JS                          |
| Type alias naming       | N/A — no type aliases                                     |
| Enum naming             | N/A — use `Object.freeze({})` constants instead          |
| Generic type params     | N/A                                                       |

For JavaScript, enforce **JSDoc completeness** wherever TypeScript would enforce
type annotations.

---

## Rule Applicability

| Rule   | Status      | Notes                                                          |
|--------|-------------|----------------------------------------------------------------|
| NAME-1 | ✅ ACTIVE    | Apply anti-pattern table; check `.js`, `.mjs`, `.cjs` files   |
| NAME-2 | ✅ ACTIVE    | Check `@returns {boolean}` JSDoc and boolean-named vars       |
| NAME-3 | ✅ ACTIVE    | Flag class names ending in Manager/Processor/Handler/Helper   |
| NAME-4 | ✅ ACTIVE    | Public exports especially must be fully descriptive           |
| NAME-5 | ✅ ACTIVE    | Check exported names; JSDoc `@param` names must be full words |
| NAME-6 | ✅ ACTIVE    | Scan across `.js` files in scope                              |
| NAME-7 | ✅ ACTIVE    | Scan `*.test.js`, `*.spec.js`, `__tests__/**/*.js`            |

---

## Tooling

| Tool                          | Purpose                                              |
|-------------------------------|------------------------------------------------------|
| `eslint`                      | `camelcase` rule, `id-match` for naming patterns     |
| `eslint-plugin-unicorn`       | `unicorn/prevent-abbreviations` (NAME-5)             |
| `eslint-plugin-jsdoc`         | Enforces complete JSDoc on public functions          |
| `@typescript-eslint/naming-convention` | Works on JS with `@ts-check`              |
