---
name: i18n-check
description: >
  Internationalization enforcement for TypeScript, JavaScript, and Python. Detects
  hardcoded user-visible strings, locale-unaware date/number/currency formatting, and
  missing translation keys. Wired into the conductor's review and write operations.
version: "1.0.0"
last-reviewed: "2026-04-04"
languages: [typescript, javascript, python]
changelog: "../../CHANGELOG.md"
tools: Read, Grep, Glob, Bash
model: opus
permissionMode: default
---

# I18n Check — Internationalization Enforcement

Precedence in the overall system: SEC → TDD → ARCH/TYPE →
**I18N-1 (BLOCK)** → I18N-2 through I18N-3.

---

## Rules

### I18N-1 — Hardcoded User-Visible String
**Severity**: BLOCK | **Languages**: TypeScript, JavaScript, Python | **Source**: CCC

**What it prohibits**: String literals that will be rendered to end users (UI text,
error messages shown to users, button labels, page titles) that are hardcoded rather
than routed through a translation/i18n function.

**Prohibited patterns**:
```typescript
// TypeScript/JavaScript — JSX text
<Button>Submit</Button>
<h1>Dashboard</h1>
<label>Email address</label>

// TypeScript/JavaScript — user-facing API response messages
return res.status(404).json({ message: "User not found" });

// TypeScript/JavaScript — toast / flash / notification APIs
toast("Changes saved successfully");
showNotification("Your session has expired");

// TypeScript/JavaScript — page titles and labels
const title = "Dashboard";
document.title = "Settings";
```

```python
# Python — user-facing messages
flash("Password must be at least 8 characters")
messages.error(request, "Invalid credentials")
raise ValidationError("This field is required")
title = "Dashboard"
```

**Exemptions**:
- Internal log messages (not shown to users): `logger.info("Processing request")`
- Exception/error constructor messages that are caught internally and not surfaced
  directly to users: `throw new Error("Invalid state")`, `raise RuntimeError("...")`
- Developer-only error messages in non-production code paths
- Test strings in test files
- Strings that are keys/identifiers, not display text (CSS class names, route paths,
  API field names, environment variables)
- Projects that explicitly have no i18n requirement (document this exemption at the
  file or project level with a comment or configuration flag)

**Detection**:
1. Grep for string literals in JSX children: `>Some text</` patterns in `.tsx`/`.jsx` files
2. Grep for strings passed to toast/flash/notification APIs (`toast(`, `showNotification(`,
   `flash(`, `messages.error(`, `messages.success(`) with inline string literals
3. Grep for return statements in API handlers containing user-facing string messages
   (e.g., `res.json({ message: "..." })`)
4. Grep for Python `flash(`, `messages.error(`, `messages.success(`, `raise ValidationError(`
   with inline string literals
5. Grep for assignments to `title`, `label`, `placeholder`, `heading`, `description`
   variables with hardcoded strings in component or view files
6. For each match: verify the string is user-facing (contains spaces, natural language)
   and not a key, identifier, log message, or internal exception message

**agent_action**:
1. Cite: `I18N-1 (BLOCK): Hardcoded user-visible string at {file}:{line} — "{string}" must be routed through i18n.`
2. Show the hardcoded string in context
3. Required action — choose the appropriate i18n function for the project:
   ```typescript
   // TypeScript/JavaScript (react-i18next)
   <Button>{t('common.submit')}</Button>

   // TypeScript/JavaScript — toast/notification APIs
   toast(t('notifications.changesSaved'));
   ```
   ```python
   # Python (Django)
   flash(_("Password must be at least 8 characters"))

   # Python (gettext)
   raise ValidationError(gettext("This field is required"))
   ```
4. Propose adding the key to the default locale translation file
5. If `--fix`: wrap the string with the detected project i18n function and add
   the key to the default locale file — require human confirmation for key naming

**Bypass prohibition**: "We only support English", "I'll add i18n later"
→ Refuse. Cite I18N-1. If the project genuinely has no i18n requirement, add an
explicit project-level exemption comment or configuration flag, not an ad-hoc skip.

---

### I18N-2 — Locale-Unaware Date / Number / Currency Formatting
**Severity**: WARN | **Languages**: TypeScript, JavaScript, Python | **Source**: CCC

**What it prohibits**: Formatting dates, numbers, and currencies in ways that produce
locale-specific output without using locale-aware APIs. A date formatted as "04/03/2026"
is ambiguous (April 3 vs March 4 depending on locale). A number formatted with a period
as decimal separator is incorrect in many European locales.

**Prohibited patterns**:
```typescript
// TypeScript/JavaScript — dates
new Date().toString();                          // locale-unaware
`${date.getMonth()}/${date.getDate()}/${date.getFullYear()}`; // manual US format

// TypeScript/JavaScript — numbers and currency
"$" + amount;                                   // hardcoded currency symbol
`$${amount.toFixed(2)}`;                        // hardcoded symbol + locale-unaware decimal
amount.toFixed(2);                              // for display — ignores locale decimal separator
```

```python
# Python — dates
date.strftime("%m/%d/%Y")                       # US-locale-specific format in display code
f"{date:%m/%d/%Y}"                              # same issue via f-string

# Python — numbers and currency
f"${amount:.2f}"                                # hardcoded dollar sign + locale-unaware
str(number)                                     # for display in user-facing context
```

**Exemptions**:
- Internal logging/debugging (not user-facing)
- ISO-8601 date strings used as data interchange format (not display):
  `date.toISOString()`, `date.isoformat()`
- `toLocaleDateString()`, `toLocaleString()`, `toLocaleTimeString()` with no explicit
  locale argument are locale-aware (they use the runtime locale) and are not violations
- Explicit locale-aware calls:
  - `Intl.DateTimeFormat(locale, options).format(date)`
  - `date.toLocaleDateString(userLocale, options)` (with explicit locale)
  - `Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount)`
  - Python `babel.dates.format_date(date, locale=user_locale)`
  - Python `locale.format_string()` or `locale.currency()`
- Machine-to-machine APIs where the consumer is code, not a human

**Detection**:
1. Grep for `.toFixed(` in display/render contexts (component files, template files)
2. Grep for `new Date().toString()` and `Date().toString()`
3. Grep for manual currency string concatenation: `"$" +`, `` `$${`` patterns
4. Grep for Python `strftime(` with US-specific format strings (`%m/%d/%Y`)
5. Grep for Python `f"$` currency formatting patterns
6. For each match: verify the context is user-facing (component, view, template, API response)
7. Do NOT flag `toLocaleDateString()`, `toLocaleString()`, or `toLocaleTimeString()`
   without arguments — these are locale-aware by design (they use the runtime locale)

**agent_action**:
1. Cite: `I18N-2 (WARN): Locale-unaware formatting at {file}:{line} — "{expression}" produces locale-dependent output without explicit locale.`
2. Show the locale-unaware call in context
3. Propose the locale-aware alternative:
   ```typescript
   // Dates
   new Intl.DateTimeFormat(userLocale, { dateStyle: 'medium' }).format(date)

   // Numbers
   new Intl.NumberFormat(userLocale).format(amount)

   // Currency
   new Intl.NumberFormat(userLocale, { style: 'currency', currency: userCurrency }).format(amount)
   ```
   ```python
   # Dates (using babel)
   from babel.dates import format_date
   format_date(date, locale=user_locale)

   # Currency (using babel)
   from babel.numbers import format_currency
   format_currency(amount, currency, locale=user_locale)
   ```
4. If `--fix`: replace the locale-unaware call with the locale-aware equivalent
   — require the developer to confirm the locale source variable name

---

### I18N-3 — Missing Translation Key for New User-Visible String
**Severity**: WARN | **Languages**: TypeScript, JavaScript | **Source**: CCC

**What it prohibits**: Code that calls an i18n function (`t()`, `i18n.t()`,
`useTranslation`) with a key that does not exist in the default locale translation
file. The key will silently fall back to the key string itself, producing broken UI
text like `user.profile.newFeature` displayed to the user.

**Prohibited patterns**:
```typescript
// Key absent from en.json / messages.json / default locale file
t('user.profile.newFeature');
i18n.t('errors.paymentFailed');

const { t } = useTranslation();
return <span>{t('dashboard.welcomeBanner')}</span>;  // key missing from locale
```

**Exemptions**:
- Projects that use auto-extraction tooling (e.g., `i18next-parser`, `babel-plugin-react-intl`)
  where key absence in source triggers extraction — document this at the project level
- Dynamic keys where the key is computed at runtime: `t(dynamicKey)`, `t(\`errors.${code}\`)`
- Test files
- Fallback values explicitly provided: `t('key', { defaultValue: 'Fallback text' })`

**Detection**:
1. Identify new or changed `t('...')` and `i18n.t('...')` calls in the diff
2. Locate the default locale file: search for `en.json`, `en/translation.json`,
   `messages/en.json`, `locales/en.json`, `public/locales/en/translation.json`,
   or the path configured in i18n config files (`i18next.config.*`, `next-i18next.config.*`)
3. Check for the project's i18n configuration file (`i18next.config.js`, `i18next.config.ts`,
   `i18n.ts`, `i18n.js`, `next-i18next.config.js`). If the config sets `keySeparator: false`,
   treat all keys as flat literal strings and skip nested traversal entirely.
4. For each static string key: first check if the exact literal key string exists as a
   top-level property in the locale file (e.g., `"user.profile.name": "..."`)
5. If no literal match is found (and `keySeparator` is not `false`): attempt dot-notation
   nested traversal (`user.profile.name` → `{ "user": { "profile": { "name": ... } } }`)
6. Only warn if neither the literal key nor the nested path resolves to a value
7. If the locale file cannot be found: emit a WARN noting that locale file detection
   failed, rather than a false positive

**agent_action**:
1. Cite: `I18N-3 (WARN): Translation key '{key}' at {file}:{line} not found in default locale file '{localeFile}'.`
2. Show the i18n call and the expected locale file path
3. Propose adding the key to the default locale file. The format depends on the project config:
   - **Flat-key project** (`keySeparator: false` detected): add as a top-level literal key:
     ```json
     // en.json — add the missing key (flat key store)
     {
       "user.profile.newFeature": "TODO: add translation"
     }
     ```
   - **Nested project** (default): add as nested JSON:
     ```json
     // en.json — add the missing key (nested)
     {
       "user": {
         "profile": {
           "newFeature": "TODO: add translation"
         }
       }
     }
     ```
4. If the locale file cannot be found: `I18N-3 (WARN): Could not locate default locale file. Ensure i18n is configured and the locale file path is discoverable.`
5. If `--fix`: add the key with a `"TODO: add translation"` placeholder value using the format appropriate for the detected config (flat literal key or nested) — require human to provide the actual translation

---

Report schema: see `skills/conductor/shared-contracts.md`.
