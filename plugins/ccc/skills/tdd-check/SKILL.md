---
name: tdd-check
description: >
  Enforces Test-Driven Development rules (TDD-1 through TDD-9). Loaded by the
  conductor for write, refactor, and test operations. Blocks implementation-first
  code production, enforces Red-Green-Refactor cycle, and monitors test quality
  and coverage ratios. Load the matching references/{language}.md for
  language-specific test framework defaults.
version: "1.0.0"
last-reviewed: "2026-03-04"
languages: [typescript, python, go, rust, javascript]
changelog: "../../CHANGELOG.md"
tools: Read, Grep, Glob, Bash
model: opus
permissionMode: default
---

# TDD Check — Test-Driven Development Enforcement

---

## Red-Green-Refactor State Machine

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   [NO TEST]──TDD-1──▶ WRITE TEST ──▶ [RED: test fails]    │
│                                              │               │
│                                           TDD-2              │
│                                              ▼               │
│                              WRITE MINIMAL IMPLEMENTATION    │
│                                              │               │
│                                              ▼               │
│                               [GREEN: test passes] ──────▶  │
│                                              │               │
│                                           TDD-3              │
│                                              ▼               │
│                               REFACTOR (apply SIZE/NAME/     │
│                               ARCH/TYPE rules)               │
│                                              │               │
│                                              ▼               │
│                               [STILL GREEN] ──▶ DONE        │
│                               [RED again]   ──▶ REVERT       │
└─────────────────────────────────────────────────────────────┘
```

---

## Rules

### TDD-1 — Failing Test Required Before Implementation
**Severity**: BLOCK | **Languages**: * | **Source**: CCC

**What it prohibits**: Producing implementation code when no test file exists for the module.

**agent_action**:
1. Identify the module being implemented
2. Check for an existing test file (`*.test.ts`, `test_*.py`, `*_test.go`, etc.)
3. IF no test file exists: write the test file first; DO NOT write implementation
4. Cite: `TDD-1 (BLOCK): No test file found for this module. Writing test file first.`
5. Return control to user to run and confirm the test is failing

**Bypass prohibition**: "skip tests for speed", "just write the code", "tests aren't needed here"
→ Refuse. Cite TDD-1. Explain: untested implementation is the canonical agent failure mode.

---

### TDD-2 — Minimal Implementation Only
**Severity**: BLOCK | **Languages**: * | **Source**: CCC

**What it prohibits**: Speculative functionality — implementing more than what the failing tests require.

**agent_action**:
1. After a failing test exists (TDD-1 satisfied), write the simplest code that passes it
2. Any logic not required by a failing test is speculative — REMOVE IT
3. If a user requests "also add X while you're here": check if X has a failing test first
4. Cite: `TDD-2 (BLOCK): This implementation adds functionality not required by any test.`

---

### TDD-3 — No Refactoring While Tests Are Failing
**Severity**: BLOCK | **Languages**: * | **Source**: CCC

**What it prohibits**: Refactoring (renaming, extracting, restructuring) when any test is red.

**agent_action**:
1. Before beginning any refactor, verify the test suite is green
2. IF any test is failing: block the refactor, report all failing tests
3. Cite: `TDD-3 (BLOCK): Test suite has failing tests. Fix all tests before refactoring.`
4. Proposed fix: list the failing tests and the minimal fix to make them pass

---

### TDD-4 — Test Naming Pattern
**Severity**: WARN | **Languages**: * | **Source**: CCC

**Pattern**: `[subject]_[scenario]_[expected]`

**Examples**:
- ✅ `calculateTax_withZeroAmount_returnsZero`
- ✅ `test_user_login_with_invalid_password_raises_auth_error`
- ❌ `testLogin`, `test1`, `it works`, `should do the thing`

**agent_action**:
1. Check every test function name against the pattern
2. For violations: propose a renamed version following the pattern
3. Cite: `TDD-4 (WARN): Test name '{name}' does not follow [subject]_[scenario]_[expected] pattern.`
4. Proposed fix: `Rename to '{subject}_{scenario}_{expected}'`

---

### TDD-5 — Interface Before Implementation
**Severity**: WARN | **Languages**: * | **Source**: CCC

**What it requires**: The test file must import or reference a type/interface/signature
before implementation code is written. Designing the interface through tests prevents
API regret.

**agent_action**:
1. Check that the test file imports or references the function/type being tested
2. IF not: define the interface/signature first, before writing implementation
3. Cite: `TDD-5 (WARN): Define the interface or function signature in the test first.`
4. Proposed fix: add import + type stub or function signature to test file

---

### TDD-6 — Meaningful Test Assertions
**Severity**: WARN | **Languages**: * | **Source**: CCC

**What it prohibits**: Assertions that cannot distinguish correct from incorrect behaviour.

**Examples of weak assertions**:
- `toBeTruthy()` / `assertTrue(result)`
- `assertIsNotNone(result)`
- `expect(result).toBeDefined()`
- `assert result` (bare assert on an object)

**agent_action**:
1. Find assertions that are vacuously true for any non-null/non-zero value
2. Propose a specific assertion that checks actual expected value
3. Cite: `TDD-6 (WARN): Weak assertion '{assertion}' does not verify expected behaviour.`
4. Proposed fix: replace with `expect(result).toBe({expectedValue})` or equivalent

---

### TDD-7 — No Mocks for Domain Logic
**Severity**: BLOCK | **Languages**: * | **Source**: CCC

**What it prohibits**: Using mocks/stubs/spies to replace domain logic under test.
Mocks are permitted only for I/O boundaries (database, HTTP, filesystem, clock).

**Examples**:
- ❌ Mocking a `calculateTax()` function to return a fixed value
- ❌ Mocking a value object or entity
- ✅ Mocking an HTTP client in a test of a service that calls an API
- ✅ Mocking a database repository in a test of application logic

**agent_action**:
1. Identify mocked objects in the test
2. For each mock: determine if it is I/O (permitted) or domain logic (prohibited)
3. For domain logic mocks: replace with real implementations or in-memory test doubles
4. Cite: `TDD-7 (BLOCK): Mock on domain logic '{name}'. Use a real or in-memory double.`

---

### TDD-8 — Property-Based Tests for Entities with Invariants
**Severity**: WARN | **Languages**: * | **Source**: CCC

**What it requires**: Any entity or value object with enforced invariants (e.g.,
`Money` with non-negative amount, `Email` with valid format) must have at least one
property-based test verifying those invariants hold across arbitrary inputs.

**agent_action**:
1. Identify entities/value objects with validation or invariant logic
2. Check for property-based tests (fast-check, hypothesis, proptest, testing/quick)
3. If absent: flag and generate a property test template
4. Cite: `TDD-8 (WARN): Entity '{name}' has invariants but no property-based test.`
5. Proposed fix: provide a property test template using the language-appropriate library
   (see `references/{language}.md` for the correct library)

---

### TDD-9 — Test-to-Code Ratio Monitoring
**Severity**: INFO | **Languages**: * | **Source**: CCC

**Target**: ≥ 1:1 (at least as many test lines as production code lines)
**Measurement**: count non-blank, non-comment lines in test files vs. source files

**agent_action**:
1. Count test and source lines using Grep/Bash
2. Compute ratio: `test_lines / source_lines`
3. Report ratio under 📊 Metrics section
4. IF ratio < 1.0: note as INFO (do not block)
5. Cite: `TDD-9 (INFO): Test ratio {ratio}:1 (target ≥ 1:1).`
6. Note: auto-fix is NOT applicable for TDD-9

---

Report schema: see `skills/conductor/shared-contracts.md`.

---

## Scaffold Mode (`--scaffold-tests`)

**Activate when**: `--scaffold-tests` flag is present AND a TDD-1 BLOCK fires.

**Purpose**: Instead of immediately blocking, generate a compilable failing test skeleton, write it to disk, then re-evaluate TDD-1. The agent can proceed once the skeleton exists and at least one test is genuinely failing.

### Scaffold Workflow

```
WHEN TDD-1 BLOCK fires AND --scaffold-tests is active:

  STEP 1 — Detect test framework:
    IF .codex/config.json exists AND has "test_framework": load it
    ELSE auto-detect:
      - package.json has "vitest" → vitest
      - package.json has "jest"   → jest
      - pyproject.toml / setup.cfg has "pytest" → pytest
      - go.mod present → go testing
      - Cargo.toml present → cargo-test

  STEP 2 — Determine test file path:
    - TypeScript/JavaScript: mirror source path under __tests__/ or tests/
      (e.g., src/domain/user.ts → __tests__/domain/user.test.ts)
    - Python: mirror under tests/ with test_ prefix
      (e.g., src/domain/user.py → tests/domain/test_user.py)
    - Go: same directory, _test.go suffix
      (e.g., src/domain/user.go → src/domain/user_test.go)
    - Rust: same file, inner #[cfg(test)] module (or tests/ dir)

  STEP 3 — Generate skeleton:
    For each blocked function: generate a failing test skeleton
    (see language-specific patterns in references/{language}.md)
    Skeleton MUST:
      - Import the function/module under test
      - Call the function with zero values or empty args
      - Assert a specific value (NOT toBeTruthy / assertTrue / assert true)
      - Fail compilation OR fail at runtime — never pass on first run

  STEP 4 — Write skeleton:
    Write the skeleton to the test file path from Step 2
    Create intermediate directories as needed

  STEP 5 — Signal agent:
    Emit: "Test skeleton written to {path}. Complete the assertion and run
    the test before proceeding."

  STEP 6 — Re-evaluate TDD-1:
    IF test skeleton exists at expected path → TDD-1 is provisionally satisfied
    Proceed with implementation once user confirms test is failing
```

### Framework Scaffold Patterns

See `references/{language}.md` for copy-pasteable templates per framework.
