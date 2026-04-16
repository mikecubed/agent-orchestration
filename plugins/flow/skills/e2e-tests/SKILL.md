---
name: e2e-tests
description: Scaffolded end-to-end test generation for integration seams — API endpoints, UI flows, and service boundaries — with framework detection and a durable coverage summary.
---

> All `docs/` paths in this skill refer to the plugin-level `docs/` directory (`../../docs/` relative to this file), not a `docs/` directory inside this skill folder.

## Purpose

Use this skill when a developer needs to generate end-to-end or integration tests for code that crosses service, API, or UI boundaries. It detects the project's E2E framework, identifies integration seams, and scaffolds test files covering happy paths, error paths, and auth boundaries.

This skill generates **E2E and integration tests only**. Unit test generation and test-driven development workflows are the domain of `tdd-check` and the TDD gate — do not use this skill for unit tests. The boundary is clear: if the test exercises a single function or class in isolation, it is a unit test; if it exercises an interaction across components, endpoints, or services, it belongs here.

Persistent team, squad, or fleet-style long-lived orchestration is out of scope for this skill. Use a separate orchestration layer if persistent coordination is needed.

## When to Use It

Activate when the developer asks for things like:

- "generate E2E tests for this API"
- "scaffold integration tests for the payments service"
- "add end-to-end test coverage for these endpoints"
- "create Playwright tests for the checkout flow"
- "I need tests that cover the API boundary"

Also activate when:

- implementation work has been completed and the developer wants integration-level coverage;
- a new API surface or UI flow has been added without corresponding E2E tests;
- a `parallel-impl` or `pr-resolve` has completed and the developer wants to verify integration boundaries;
- after `map-codebase` has identified integration seams that lack test coverage.

Do **not** activate for:

- unit test generation (use `tdd-check`);
- debugging test failures (use `debug`);
- production incident triage (use `incident-rca`).

## Project-Specific Inputs

Before you start, identify:

- the target path or service to generate tests for;
- the repository's existing E2E or integration test framework (if any);
- the repository's test directory conventions and naming patterns;
- the validation commands for running the test suite;
- whether the project is a monorepo (if so, which service directory to target);
- the output location for the durable scaffold summary (default: `.agent/e2e-scaffold-summary.md`).

If the target path is ambiguous in a monorepo, prompt the developer for the target service or default to the service containing recently changed files.

## Default Roles

Use separate roles for:

- a **scout** that inspects the project structure, detects frameworks, and identifies integration seams — it produces a factual context brief of the testing landscape;
- an **implementer** that generates the test scaffold files;
- a **reviewer** that validates the generated tests for syntactic correctness, coverage completeness, and adherence to project conventions.

### Model Selection

Resolve the active model for each role using this priority chain:

1. **Project config** — look for the runtime-specific config file in the current project root:
   - Copilot CLI: `.copilot/models.yaml`
   - Claude Code: `.claude/models.yaml`

   Read the `implementer`, `reviewer`, and `scout` keys directly. If a key is absent, fall back to the baked-in default for that role.

2. **Session cache** — if models were already confirmed earlier in this session,
   reuse them without asking again.
3. **Baked-in defaults** — if neither config file nor session cache exists, use
   the defaults below silently without prompting. Create project model config
   only when the developer wants persistent overrides.

#### Default models

| Runtime     | Role        | Default model      |
|-------------|-------------|--------------------|
| Copilot CLI | Implementer | `claude-opus-4.6`  |
| Copilot CLI | Reviewer    | `gpt-5.4`          |
| Copilot CLI | Scout       | `claude-haiku-4.5` |
| Claude Code | Implementer | `claude-opus-4.6`  |
| Claude Code | Reviewer    | `claude-opus-4.6`  |
| Claude Code | Scout       | `claude-haiku-4.5` |

## Workflow

### Phase 1 — Framework detection

The scout inspects project manifests and configuration files to detect the E2E or integration test framework:

- **package.json**: look for Playwright, Cypress, Jest, Vitest, supertest, or similar;
- **pyproject.toml / requirements.txt**: look for pytest, httpx, requests, selenium;
- **go.mod**: look for httptest, testify, go-test;
- **Cargo.toml**: look for integration test modules.

If a framework is detected:

- Record the framework name, version, and configuration location.
- Use the detected framework for all generated scaffolds.

If **no framework is detected**:

- Apply the rescue policy: generate framework-agnostic test stubs with setup instructions documented in comments.
- Record the framework gap in the durable scaffold summary artifact.
- Continue to Phase 2.

**Gate: Framework resolved**

- PASS — framework detected and recorded, or gap documented with agnostic stubs planned.

Write `.agent/SESSION.md` with `current-phase: "framework-detection"` after this phase completes.

### Phase 2 — Boundary identification

Identify the target integration seams in the specified path:

- **REST / HTTP endpoints**: route definitions, controller methods, handler functions;
- **UI flows**: page components, navigation paths, form submissions;
- **Service-to-service calls**: client invocations, message producers/consumers, gRPC stubs;
- **Auth boundaries**: authentication middleware, permission checks, token validation.

Produce a factual brief of the identified boundaries:

- endpoint or flow name;
- HTTP method and path (for APIs);
- input parameters and expected response shapes;
- auth requirements (if detectable).

Present the boundary list to the developer for confirmation before generating scaffolds. Allow the developer to add, remove, or reprioritize targets.

Write `.agent/SESSION.md` with `current-phase: "boundary-identification"` after this phase completes.

### Phase 3 — Scaffold generation

For each confirmed integration seam, generate test files with:

1. **Happy path** — nominal request/response or interaction flow.
2. **Error / boundary path** — at least one error scenario per seam (4xx, 5xx, timeout, invalid input, missing required field).
3. **Auth / permission boundary** — if an auth layer is detectable, include a test for unauthorized access (e.g., missing API key → 401, insufficient role → 403).

Follow language-specific naming conventions:

- TypeScript / JavaScript: `tests/{name}.e2e.ts` (or `.e2e.js`)
- Go: `tests/{name}_e2e_test.go`
- Python: `test_{name}_e2e.py`
- Rust: `tests/{name}_e2e.rs`

If the project has an existing test directory convention that differs from the defaults above, follow the project convention.

The reviewer validates each generated file for:

- syntactic correctness (parseable by the language toolchain);
- coverage completeness (all confirmed seams have at least happy + error paths);
- adherence to project conventions (naming, imports, test structure).

If a generated file fails syntactic validation, revise it. Allow up to **2 revision rounds** per file before escalating.

**Gate: Scaffolds valid**

- PASS — all generated files are syntactically valid and the coverage summary is produced.
- FAIL — files remain invalid after 2 revision rounds. Escalate to developer.

Write `.agent/SESSION.md` with `current-phase: "scaffold-generation"` after this phase completes.

### Phase 4 — Coverage summary

Produce a **durable scaffold summary** artifact written to the confirmed output path. This artifact must contain:

- **Files created**: full paths of all generated test files.
- **Coverage points**: each integration seam and the scenarios covered (happy, error, auth).
- **Framework used**: detected framework name and version, or "agnostic stubs" if no framework was found.
- **Gaps**: any seams that could not be covered and the reason.
- **Setup instructions**: if agnostic stubs were generated, include the recommended framework and install steps.

"Durable" means written to a repository-appropriate sink — a committed document, a PR comment, or an issue — not only to chat. Chat-only summaries do not satisfy this requirement.

**Gate: Summary produced**

- PASS — durable scaffold summary artifact written to disk.

### Update SESSION.md

Write `.agent/SESSION.md` using the full schema defined in `docs/session-md-schema.md`. All five YAML frontmatter fields are required on every write:

- `current-task`: the E2E generation target description
- `current-phase`: the current phase name
- `next-action`: what happens next
- `workspace`: the active branch or PR reference
- `last-updated`: current ISO-8601 timestamp

Required sections: `## Decisions`, `## Files Touched`, `## Open Questions`, `## Blockers`, `## Failed Hypotheses`.

Write SESSION.md after each phase gate. If the write fails, log a warning and continue.

## Required Gates

### Framework gate

The framework must be detected or the gap must be documented with agnostic stubs planned. The skill cannot proceed to scaffold generation without resolving the framework question.

### Scaffold validity gate

All generated test files must be syntactically valid (parseable by the language toolchain). Up to 2 revision rounds are allowed per file. After 2 failed rounds, the file is escalated to the developer.

### Coverage summary gate

The durable scaffold summary artifact must be written to disk. If both the primary path and the fallback path (`.agent/e2e-scaffold-summary.md`) fail, the gate fails.

### Verification checklist — scaffold complete

Before declaring E2E scaffold generation complete, confirm ALL of the following. Any failing item blocks the "scaffold complete" declaration.

- [ ] Framework detected or gap documented — PASS / FAIL
- [ ] All target integration seams have generated test files — PASS / FAIL
- [ ] Each test file covers at least happy path + error path — PASS / FAIL
- [ ] All generated files are syntactically valid — PASS / FAIL
- [ ] Durable scaffold summary artifact produced — PASS / FAIL
- [ ] SESSION.md written with correct phase — PASS / FAIL

If any item is FAIL: report the failing item(s) by name, state what must be done to resolve each, and do not advance past the gate.

## Stop Conditions

- The target path has no detectable integration seam (no endpoints, no UI flows, no service calls) — stop, report the gap in the durable artifact.
- Generated scaffolds remain syntactically invalid after 2 revision rounds — escalate to the developer with the partial scaffold and validation errors.
- The developer asks to stop.
- The project uses a framework or language not supported by the scaffold templates — stop, document the gap, and recommend manual test creation.

Before stopping, ensure any partial results are preserved as a durable artifact so work is not lost. A partial summary must still list files created (if any), coverage gaps, and the reason for stopping. When stopping due to a rescue failure (e.g., framework undetectable), document the rescue attempt and its outcome.

## Example

### Invocation

```text
Developer: generate E2E tests for src/api/payments/
```

### Walkthrough

**Phase 1 — Framework detection**

The scout inspects `package.json` and finds:
```json
{
  "devDependencies": {
    "@playwright/test": "^1.44.0"
  }
}
```
Framework detected: Playwright 1.44. Configuration at `playwright.config.ts`.

**Phase 2 — Boundary identification**

The scout produces a factual brief of the integration seams in `src/api/payments/`:
- `POST /api/payments/charge` — creates a charge (requires API key);
- `GET /api/payments/status/:id` — retrieves charge status;
- `DELETE /api/payments/refund/:id` — initiates a refund (requires API key + admin role).

Developer confirms all three endpoints as targets.

**Phase 3 — Scaffold generation**

The implementer generates `tests/payments.e2e.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('POST /api/payments/charge', () => {
  test('creates a charge with valid input', async ({ request }) => {
    const response = await request.post('/api/payments/charge', {
      data: { amount: 1000, currency: 'usd', merchantId: 'test-merchant' },
      headers: { 'x-api-key': process.env.TEST_API_KEY },
    });
    expect(response.status()).toBe(201);
  });

  test('returns 400 for missing required fields', async ({ request }) => {
    const response = await request.post('/api/payments/charge', {
      data: {},
      headers: { 'x-api-key': process.env.TEST_API_KEY },
    });
    expect(response.status()).toBe(400);
  });

  test('returns 401 without API key', async ({ request }) => {
    const response = await request.post('/api/payments/charge', {
      data: { amount: 1000, currency: 'usd', merchantId: 'test-merchant' },
    });
    expect(response.status()).toBe(401);
  });
});

test.describe('GET /api/payments/status/:id', () => {
  test('returns charge status for valid ID', async ({ request }) => {
    const response = await request.get('/api/payments/status/charge_123');
    expect(response.status()).toBe(200);
  });

  test('returns 404 for unknown charge ID', async ({ request }) => {
    const response = await request.get('/api/payments/status/nonexistent');
    expect(response.status()).toBe(404);
  });
});

test.describe('DELETE /api/payments/refund/:id', () => {
  test('initiates refund with admin role', async ({ request }) => {
    const response = await request.delete('/api/payments/refund/charge_123', {
      headers: { 'x-api-key': process.env.TEST_API_KEY, 'x-role': 'admin' },
    });
    expect(response.status()).toBe(200);
  });

  test('returns 400 for invalid refund ID', async ({ request }) => {
    const response = await request.delete('/api/payments/refund/invalid-id!', {
      headers: { 'x-api-key': process.env.TEST_API_KEY, 'x-role': 'admin' },
    });
    expect(response.status()).toBe(400);
  });

  test('returns 403 without admin role', async ({ request }) => {
    const response = await request.delete('/api/payments/refund/charge_123', {
      headers: { 'x-api-key': process.env.TEST_API_KEY, 'x-role': 'viewer' },
    });
    expect(response.status()).toBe(403);
  });
});
```

Reviewer confirms: all files syntactically valid, all seams covered.

**Phase 4 — Coverage summary**

```markdown
# E2E Scaffold Summary — src/api/payments/

**Framework:** Playwright 1.44
**Files created:**
- tests/payments.e2e.ts

**Coverage:**

| Endpoint                       | Happy path | Error path | Auth boundary |
|--------------------------------|------------|------------|---------------|
| POST /api/payments/charge      | ✓          | ✓ (400)    | ✓ (401)       |
| GET /api/payments/status/:id   | ✓          | ✓ (404)    | —             |
| DELETE /api/payments/refund/:id | ✓          | ✓ (400)    | ✓ (403)       |

**Total:** 3 endpoints × 2–3 scenarios = 8 test cases scaffolded.
**Gaps:** None.
```
