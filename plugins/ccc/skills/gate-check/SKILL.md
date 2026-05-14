---
name: gate-check
description: >
  Enforces the test gate on write and test operations. Two rules: TEST-PINNED
  (no new code is shippable without a test that exercises it) and TEST-RED-FIRST
  (sessions must record at least one red→green transition for new code, proving
  the test is not vacuous). Replaces the old strict-ordering TDD-1..9 gate with
  test-pinned correctness at merge. Pairs with test-check's TEST-BEHAVIOR and
  TEST-NO-MOCK-FOR-PURE rules to catch the failure modes that strict ordering
  missed (vacuous tests, mock-heavy tests, implementation-pinned tests).
version: "2.0.0"
last-reviewed: "2026-05-13"
languages: [typescript, python, go, rust, javascript]
changelog: "../../CHANGELOG.md"
tools: Read, Grep, Glob, Bash
model: opus
permissionMode: default
---

# Gate Check — Test Gate

The test gate replaces strict test-first ordering with **test-pinned correctness
at merge**. The agent may write implementation first or test first, but the
session cannot end with new code that no test exercises, and the test must have
gone red→green at some point — proving the test would have failed without the
implementation.

This is a deliberate change from the prior TDD-1..9 gate. Strict ordering caught
some bugs but missed the worst class: vacuous tests, mock-heavy tests, and
implementation-pinned tests that pass on any mistake. The new gate catches
*those* directly (with help from `test-check`'s TEST-BEHAVIOR and
TEST-NO-MOCK-FOR-PURE rules).

---

## Gate Flow

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│   [SESSION STARTS]                                             │
│         │                                                      │
│         ▼                                                      │
│   Agent writes code and/or tests in any order                  │
│         │                                                      │
│         ▼                                                      │
│   At session end (before commit/handoff):                      │
│         │                                                      │
│         ├──── TEST-PINNED ──────▶ Every new public symbol has  │
│         │                          a test that imports + calls │
│         │                          it. If not → BLOCK.         │
│         │                                                      │
│         └──── TEST-RED-FIRST ───▶ Each new symbol has a        │
│                                    recorded red→green          │
│                                    transition. If not → BLOCK. │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## Rules

### TEST-PINNED — A test must exist that exercises new code
**Severity**: BLOCK | **Languages**: * | **Source**: CCC

**What it requires**: At session end, every public function/method/type
introduced or substantively modified by the session has at least one test in a
test file that imports it and calls it (or constructs the type).

**What it does *not* require**: Tests must be *written* before implementation.
Order within the session is free.

**Detection**:
1. Track new/modified public symbols across the session (file paths + symbol
   names). Use `git diff HEAD` if available, otherwise the session changelog.
2. For each symbol: grep test files for an import of the symbol AND a call to
   it (or construction, for types).
3. Flag any symbol with no matching test.

**agent_action**:
1. Cite: `TEST-PINNED (BLOCK): No test exercises new symbol '{name}' at {file}:{line}.`
2. Propose a test for `{name}` covering at least one expected behavior.
3. If `--scaffold-tests` is active: generate a failing skeleton (see Scaffold
   Mode below).

**Bypass prohibition**: "It's trivial", "just glue code", "I'll add tests
later" → Refuse. The single biggest source of agent-introduced bugs is code
that ships without a test. Add the test now.

---

### TEST-RED-FIRST — The session must record a red→green transition
**Severity**: BLOCK | **Languages**: * | **Source**: CCC

**What it requires**: For each new public symbol, the session's
`.codex/history.jsonl` (or the user's confirmed action) must record that a
test for it was failing at some point before the implementation existed —
proving the test is not vacuous.

**Why**: A green test that was always green tells you nothing about the
implementation. Many agent-generated tests are vacuous — they pass regardless
of the implementation because they assert nothing meaningful or mock the unit
under test. Forcing a red→green transition catches these without requiring
strict test-first ordering.

**Detection** (any of these signals satisfies the rule):
1. Test file was added/modified before the implementation file in the same
   session, AND was confirmed failing (user ran it or `--scaffold-tests`
   wrote it).
2. Implementation was added first, then a test was added, then the test was
   shown failing on a temporary stub or wrong return value, then green after
   the real implementation.
3. `--scaffold-tests` mode wrote a skeleton that was confirmed failing.

**agent_action**:
1. If no red→green transition is recorded for the new symbol:
   Cite: `TEST-RED-FIRST (BLOCK): Test for '{name}' was never observed
   failing. Confirm it can catch a broken implementation.`
2. Propose: temporarily break the implementation (return a wrong value, throw,
   etc.) and confirm the test fails; revert and confirm green.
3. Record the red→green transition in `.codex/history.jsonl` once observed.

**Bypass prohibition**: "The test is obviously correct" → If it's obvious,
proving it red is cheap. Do it.

---

Report schema: see `skills/conductor/shared-contracts.md`.

---

## Scaffold Mode (`--scaffold-tests`)

**Activate when**: `--scaffold-tests` flag is present AND a TEST-PINNED BLOCK
fires.

**Purpose**: Instead of immediately blocking, generate a compilable failing
test skeleton, write it to disk, then re-evaluate the gate. The agent can
proceed once the skeleton exists and the test is genuinely failing (which also
satisfies TEST-RED-FIRST for that symbol).

### Scaffold Workflow

```
WHEN TEST-PINNED BLOCK fires AND --scaffold-tests is active:

  STEP 1 — Detect test framework:
    IF .codex/config.json exists AND has "test_framework": load it
    ELSE auto-detect:
      - package.json has "vitest" → vitest
      - package.json has "jest"   → jest
      - pyproject.toml / setup.cfg has "pytest" → pytest
      - go.mod present → go testing
      - Cargo.toml present → cargo-test

  STEP 2 — Determine test file path:
    - TypeScript/JavaScript: mirror source under __tests__/ or tests/
    - Python: mirror under tests/ with test_ prefix
    - Go: same directory, _test.go suffix
    - Rust: same file, inner #[cfg(test)] module (or tests/ dir)

  STEP 3 — Generate skeleton:
    Skeleton MUST:
      - Import the function/module under test
      - Call it with simple inputs
      - Assert a specific value (NOT toBeTruthy / assertTrue / assert true)
      - Fail at runtime — never pass on first run

  STEP 4 — Write skeleton to the path from Step 2. Create intermediate
    directories as needed.

  STEP 5 — Signal agent:
    Emit: "Test skeleton written to {path}. Complete the assertion and
    run the test before proceeding."

  STEP 6 — Re-evaluate:
    Once the user confirms the test fails, TEST-PINNED and TEST-RED-FIRST
    are provisionally satisfied for that symbol. Proceed with implementation.
```

See `references/{language}.md` for framework-specific scaffold templates.
