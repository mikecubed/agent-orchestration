# Purity Check — TypeScript Language Reference

**Language**: TypeScript | **Loaded by**: purity-check/SKILL.md

---

## Side-Effect Imports to Detect in `core/`

| Category | Import patterns that trigger PURE-1 |
|---|---|
| Filesystem | `fs`, `fs/promises`, `node:fs`, `path` (when used for I/O), `fast-glob`, `glob`, `chokidar` |
| Network | `axios`, `node-fetch`, `got`, `undici`, `ky`, `superagent`, `cross-fetch`, native `fetch` calls |
| HTTP frameworks | `express`, `fastify`, `koa`, `hapi`, `@nestjs/*`, `next/server`, `hono`, `restify` |
| Database | `pg`, `mysql2`, `sqlite3`, `better-sqlite3`, `mongoose`, `mongodb`, `redis`, `ioredis`, `prisma`, `drizzle-orm`, `typeorm`, `knex` |
| Message brokers | `amqplib`, `kafkajs`, `bullmq`, `@aws-sdk/client-sqs` |
| Cloud SDKs | `@aws-sdk/*`, `@azure/*`, `@google-cloud/*`, `firebase`, `firebase-admin` |
| Process / OS | `child_process`, `node:os`, `os` (for non-constant reads), `node:process` (when reading env or argv) |
| Logging | `winston`, `pino`, `bunyan`, `loglevel`, direct `console.*` calls |

---

## Clock / RNG / Logging Calls (PURE-1)

| Concern | Calls to flag |
|---|---|
| Clock | `Date.now()`, `new Date()` without an argument, `performance.now()`, `Date()` |
| RNG | `Math.random()`, `crypto.randomBytes()`, `crypto.randomUUID()`, `crypto.getRandomValues()` |
| Logging | `console.log`, `console.error`, `console.warn`, `console.info`, `console.debug` |

**Allowed**: `new Date(literalTimestamp)`, `Math.PI`, `Math.floor`, `Math.max` etc.
(pure math), `JSON.parse`, `JSON.stringify`, `crypto.createHash` on literal bytes
when used as a pure transform.

---

## Ambient State Reads (PURE-2)

| Pattern | Example |
|---|---|
| Env vars | `process.env.FOO`, `process.env['BAR']` |
| Argv | `process.argv` |
| Globals | `globalThis.x`, `global.x`, bare module-level `let counter = 0` |
| Async-local storage | `AsyncLocalStorage.getStore()` reads |

---

## Type-Only Imports

`import type { ... }` and `import { type X } from '...'` are **allowed in core**
even when the source module is shell — they erase at compile time. Detection
must distinguish:

```ts
import type { Express } from 'express';  // ✅ allowed
import { Router } from 'express';         // ❌ PURE-1
```

---

## Mock-Required-to-Test Signal (PURE-3)

Test files that import `vitest`'s `vi.mock`, `vi.spyOn`, or Jest's `jest.mock`,
`jest.fn`, `jest.spyOn` against a core module are PURE-3 candidates. Also flag
imports of `sinon`, `proxyquire`, `nock`, `msw` targeting core.

---

## Tooling

| Tool | What to use it for |
|---|---|
| `eslint-plugin-functional` | Pure-function rules (`no-let`, `no-mutation`, `no-this`) |
| `eslint-plugin-import` | `no-restricted-paths` to block shell imports from core |
| `tsc --noUncheckedIndexedAccess` | Catches a class of nondeterministic reads |
