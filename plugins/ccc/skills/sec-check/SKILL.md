---
name: sec-check
description: >
  Enforces security rules (SEC-1 through SEC-7). Loaded by the conductor for
  security audits, PR/code reviews, incident response, and new service scaffolding. Detects
  hardcoded secrets, insecure credential handling, XSS vectors, SQL injection,
  gitignore gaps, stale credentials, and CORS misconfigurations. Invokes
  scripts/scan_secrets.sh for automated scanning. Activated by: "security audit",
  "check for secrets", "vulnerabilities", "hardcoded key", "SQL injection", "review".
version: "1.0.0"
last-reviewed: "2026-03-04"
languages: [typescript, python, go, rust, javascript]
changelog: "../../CHANGELOG.md"
tools: Read, Grep, Glob, Bash
model: opus
permissionMode: default
---

# Sec Check — Security Enforcement

**Precedence**: **SEC-* (BLOCK)** → TDD → ARCH/TYPE → all quality checks.

**Hook coverage check (run first)**:
Before invoking `scan_secrets.sh`, check whether the hook already reported
findings for this session:

```bash
cat "$COVERAGE_FILE" 2>/dev/null   # COVERAGE_FILE = /tmp/codex-hook-coverage-<PROJECT_HASH>.jsonl
```

For each JSON line where `"rule"` is `"SEC-1"` or `"SEC-7"`, extract `file` and `line`.
When subsequently scanning with `scan_secrets.sh`, skip any finding where the
`file`+`rule`+`line` triple matches an existing coverage record.
Log: `"Skipping {rule} at {file}:{line} — already reported by hook this session."`

If no coverage file exists, proceed normally with the full scan.

**For automated scanning**: invoke `scripts/scan_secrets.sh --path {scope}`
(and `--history` if the `--history` flag was passed) and parse its output
before performing manual pattern checks. Requires **Python 3.12+**.

---

## Rules

### SEC-1 — No Hardcoded Secrets
**Severity**: BLOCK | **Languages**: * | **Source**: CCC

**What it prohibits**: Secrets of any kind stored in source code, including:
- API keys, tokens, bearer credentials
- Passwords, passphrases, PINs
- Private keys, certificates, JWT secrets
- Database connection strings containing passwords
- OAuth client secrets

**Detection**:
1. Run: `scripts/scan_secrets.sh --path {scope}` (+ `--history` if requested)
2. Parse JSON output — `findings` array
3. Additionally, grep for common patterns:
   - Strings matching `[A-Za-z0-9+/]{32,}` in assignment context (`=`, `:`)
   - Keys containing `password`, `secret`, `api_key`, `token`, `private_key`
     assigned to non-empty string literals
   - PEM header `-----BEGIN` in source files

**agent_action**:
1. Cite: `SEC-1 (BLOCK): Hardcoded secret detected at {file}:{line} — pattern: '{pattern}'.`
2. **STOP ALL WORK** on this file. Do not produce any further code until resolved.
3. Steps for resolution:
   a. Rotate the secret immediately — assume it is already compromised if it was ever committed
   b. Move the value to an environment variable: `process.env.MY_SECRET`, `os.environ["MY_SECRET"]`, etc.
   c. Add the variable name to a `.env.example` file (value: `your-value-here`)
   d. Add `.env` to `.gitignore`
4. If `--history` flag was used and secret is in git history: cite SEC-1 and advise git history rewrite (`git filter-repo` or BFG). Require explicit confirmation before executing.
5. If `--fix`: replace the literal value with the env var reference (do NOT delete the literal from the report — it must be rotated)

**Bypass prohibition**: "It's just a test key", "It's in a private repo",
"It's a local dev secret" → Refuse. Cite SEC-1. No secret is safe in source control.

---

### SEC-2 — Credentials Must Use Environment Variables with Schema Validation
**Severity**: BLOCK | **Languages**: * | **Source**: CCC

**What it prohibits**: Reading sensitive configuration values (secrets, URLs
containing credentials, private keys) without validating them at startup.
An application that starts with a missing or malformed secret will fail in
production, not in development where it is easiest to fix.

**Required pattern**:
```
// TypeScript
const config = z.object({ MY_SECRET: z.string().min(1) }).parse(process.env);

# Python
from pydantic_settings import BaseSettings
class Settings(BaseSettings): my_secret: str
```

**Detection**:
1. Find all `process.env.*`, `os.environ`, `os.Getenv`, `std::env::var` reads
2. Check if each sensitive read (keys containing `secret`, `password`, `key`,
   `token`, `cert`) is validated through a schema (Zod, Pydantic, Viper, etc.)
3. Flag reads that access env vars directly without schema validation

**agent_action**:
1. Cite: `SEC-2 (BLOCK): Unvalidated env var access for '{var_name}' at {file}:{line}.`
2. Show the current access pattern
3. Propose: wrap in a schema validation object at the module entry point
4. If `--fix`: add the schema validation wrapper at the top of the config module

---

### SEC-3 — No Dangerous HTML/Eval Injection Points
**Severity**: BLOCK | **Languages**: typescript, javascript | **Source**: CCC

**What it prohibits**:
- `dangerouslySetInnerHTML={{ __html: userInput }}` (React)
- `innerHTML = userInput`
- `document.write(userInput)`
- `eval(userInput)` or `eval(dynamicString)`
- `new Function(userInput)`
- `setTimeout(userInput, ...)` or `setInterval(userInput, ...)` with string argument

**Exemptions**:
- `dangerouslySetInnerHTML={{ __html: sanitize(input) }}` where `sanitize` is
  DOMPurify or an equivalent library — document the library choice
- `eval` in test infrastructure only (e.g., jest transform)

**Detection**:
1. Grep for `dangerouslySetInnerHTML`, `innerHTML`, `document.write` in non-test files
2. Grep for `eval(` in non-test source files
3. Grep for `new Function(` in non-test source files
4. For each match: check if the argument is a sanitised value or a static string

**agent_action**:
1. Cite: `SEC-3 (BLOCK): XSS injection vector at {file}:{line} — '{pattern}'.`
2. **STOP ALL WORK** on this component until resolved
3. Options:
   - Remove the dynamic HTML entirely and use React/framework state instead
   - If HTML must be rendered: wrap input with DOMPurify.sanitize() and document the choice
   - Replace `eval` with a safer dispatch pattern (e.g., a lookup table)
4. If `--fix`: replace the injection point with the safe alternative

---

### SEC-4 — No Raw SQL String Concatenation
**Severity**: BLOCK | **Languages**: * | **Source**: CCC

**What it prohibits**: Building SQL queries by concatenating or interpolating
user-supplied strings. This is the most common class of SQL injection
vulnerability and has zero legitimate use cases.

**Prohibited patterns**:
```
// TypeScript
db.query("SELECT * FROM users WHERE id = " + userId)
db.query(`SELECT * FROM users WHERE id = ${userId}`)

# Python
cursor.execute("SELECT * FROM users WHERE id = " + user_id)
cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")
```

**Required patterns**:
```
// TypeScript
db.query("SELECT * FROM users WHERE id = $1", [userId])

# Python
cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
```

**Detection**:
1. Grep source files for SQL keywords (`SELECT`, `INSERT`, `UPDATE`, `DELETE`,
   `WHERE`, `FROM`) inside string concatenation (`+` operator or template literals
   containing variable expressions) or f-strings
2. Exclude: ORM query builders (Prisma, SQLAlchemy, GORM, Diesel) unless raw SQL
   escape hatches are used

**agent_action**:
1. Cite: `SEC-4 (BLOCK): SQL injection vulnerability at {file}:{line}. Raw string interpolation in SQL query.`
2. Show the current query
3. Propose: parameterised query using the appropriate driver placeholder (`$1`, `%s`, `?`, `@p1`)
4. If `--fix`: rewrite as parameterised query

---

### SEC-5 — .gitignore Must Cover Sensitive Paths
**Severity**: WARN | **Languages**: * | **Source**: CCC

**What it checks**: The `.gitignore` at the repository root contains entries for
common sensitive file patterns. Missing entries are a latent SEC-1 risk.

**Required entries** (at minimum):
```
.env
.env.*
!.env.example
*.pem
*.key
*.p12
*.pfx
*.jks
secrets/
config/secrets.yaml
```

**Detection**:
1. Read `.gitignore` at repo root (and any subdirectory `.gitignore` within scope)
2. Check for presence of each required pattern
3. Flag missing patterns

**agent_action**:
1. Cite: `SEC-5 (WARN): .gitignore missing pattern '{pattern}' — sensitive files may be accidentally committed.`
2. If `--fix`: add missing patterns to `.gitignore`
3. After adding: run `git status` to check if any currently-tracked files match the new patterns; if so, flag with SEC-1

---

### SEC-6 — Credential Rotation Flag
**Severity**: WARN | **Languages**: * | **Source**: CCC

**What it checks**: When `--history` flag is active, scans git commit messages
and diff hunks for evidence that credentials have been previously rotated. If
secrets were rotated in the past, the current secret may still be compromised
if the rotation was incomplete.

**Also checks**: Presence of expiry dates on secrets where the application
supports them (e.g., JWT expiry, API key expiry metadata).

**Detection** (requires `--history` flag):
1. Run: `scripts/scan_secrets.sh --path {scope} --history`
2. Flag any findings in historical commits

**agent_action**:
1. Cite: `SEC-6 (WARN): Credential was present in git history at commit {sha}:{file}:{line}.`
2. State: "Even if rotated, verify the old credential is fully revoked in the upstream service."
3. If the history scan finds an active secret that is ALSO in current code: escalate to SEC-1 BLOCK

---

### SEC-7 — No CORS Wildcard in Production
**Severity**: WARN | **Languages**: typescript, javascript, python, go | **Source**: CCC

**What it prohibits**: CORS configurations that allow all origins (`*`) in a
production server context. Wildcard CORS on authenticated endpoints effectively
bypasses the Same-Origin Policy.

**Prohibited**:
```
// Express
app.use(cors({ origin: '*' }))
res.setHeader('Access-Control-Allow-Origin', '*')

# FastAPI
app.add_middleware(CORSMiddleware, allow_origins=["*"])
```

**Exemptions**:
- Public, unauthenticated read-only APIs where the wildcard is intentional
  — must be documented with a `# WAIVER:` comment explaining the intent
- Test/mock servers in test files

**Detection**:
1. Grep non-test source files for `cors.*origin.*\*`, `Allow-Origin.*\*`,
   `allow_origins.*\*`
2. For each match: check if the endpoint is unauthenticated (look for absence
   of auth middleware on the same route)

**agent_action**:
1. Cite: `SEC-7 (WARN): CORS wildcard at {file}:{line}. Authenticated endpoints must restrict allowed origins.`
2. Propose: replace `'*'` with an explicit allowlist from env config:
   `origin: process.env.ALLOWED_ORIGINS?.split(',') ?? []`
3. If `--fix`: replace wildcard with env-var-driven allowlist
4. If the API is intentionally public: add a `# WAIVER:` block documenting the intent

---

**BLOCK violations (SEC-1 through SEC-4) suspend all other work** until resolved.
Do not proceed with architecture, naming, or TDD feedback while a SEC BLOCK is active.

Report schema: see `skills/conductor/shared-contracts.md`.
