# Naming Check — TypeScript Language Reference

**Language**: TypeScript | **Loaded by**: naming-check/SKILL.md

---

## Casing Conventions

| Identifier type          | Convention           | Examples                                      |
|--------------------------|----------------------|-----------------------------------------------|
| Variables & parameters   | `camelCase`          | `userId`, `requestBody`, `maxRetryCount`       |
| Functions & methods      | `camelCase`          | `getUserById`, `calculateTotalPrice`           |
| Classes & interfaces     | `PascalCase`         | `UserRepository`, `OrderService`              |
| Type aliases & enums     | `PascalCase`         | `UserStatus`, `PaymentMethod`                 |
| Enum members             | `PascalCase`         | `UserStatus.Active`, `PaymentMethod.CreditCard`|
| Constants (module-level) | `SCREAMING_SNAKE`    | `MAX_RETRY_COUNT`, `DEFAULT_TIMEOUT_MS`       |
| Private class members    | `camelCase` (no `_`) | `this.userId` — avoid `_userId` prefix        |
| Generic type params      | Single `PascalCase`  | `T`, `TKey`, `TValue`, `TResult`              |

---

## File Naming

| File type              | Pattern                          | Examples                                       |
|------------------------|----------------------------------|------------------------------------------------|
| Service                | `[name].service.ts`              | `user.service.ts`, `payment.service.ts`        |
| Controller / Handler   | `[name].controller.ts`           | `auth.controller.ts`                           |
| Repository             | `[name].repository.ts`           | `order.repository.ts`                          |
| Entity / Model         | `[name].entity.ts` / `[name].model.ts` | `user.entity.ts`                         |
| DTO                    | `[name].dto.ts`                  | `create-user.dto.ts`                           |
| Interface / Type       | `[name].types.ts`                | `auth.types.ts`                                |
| Utility                | `[name].util.ts`                 | `date.util.ts`                                 |
| Test                   | `[name].test.ts` / `[name].spec.ts` | `user.service.test.ts`                      |
| Constants              | `[name].constants.ts`            | `http.constants.ts`                            |

---

## NAME-7: Test Function Naming (TypeScript)

Tests use `it` / `test` / `describe` blocks. The description string must follow
`[subject]_[scenario]_[expected]` with `camelCase` for each segment.

For nested `describe` blocks, the outer `describe` names the subject, the `it`
names the scenario and expected.

---

## Rule Applicability

| Rule   | Status      | Notes                                                          |
|--------|-------------|----------------------------------------------------------------|
| NAME-1 | ✅ ACTIVE    | Apply anti-pattern table; check `.ts` and `.tsx` files        |
| NAME-2 | ✅ ACTIVE    | Check `boolean` type annotations and `Promise<boolean>` returns|
| NAME-3 | ✅ ACTIVE    | Flag class names ending in Manager/Processor/Handler/Helper   |
| NAME-4 | ✅ ACTIVE    | Public exports especially must be fully descriptive           |
| NAME-5 | ✅ ACTIVE    | Check exported names; `HTTP`, `URL`, `ID`, `API` are allowed  |
| NAME-6 | ✅ ACTIVE    | Scan across `*.ts` files in scope                             |
| NAME-7 | ✅ ACTIVE    | Scan `*.test.ts`, `*.spec.ts`, `__tests__/**/*.ts`            |

---

## Tooling

| Tool                         | Purpose                                        |
|------------------------------|------------------------------------------------|
| `@typescript-eslint/naming-convention` | Enforce casing rules automatically   |
| `eslint-plugin-unicorn`      | `unicorn/prevent-abbreviations` (NAME-5)       |
| TypeScript `strict` mode     | Catches implicit `any` that hides poor naming  |
