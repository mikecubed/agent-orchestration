---
name: context-check
description: >
  Strategic DDD enforcement: CTXT-1 (shared models leaking across unrelated
  bounded contexts), CTXT-2 (vague generic names in domain — cross-references
  NAME-UL), CTXT-3 (external API models leaking into core without an
  anti-corruption layer). Loaded by the conductor for review and new-service
  operations when domain-layer code is in scope. All rules are WARN — strategic
  DDD calls are judgment calls, not mechanical failures. Frees the "context"
  namespace previously occupied by ctx-check (renamed to session-check in v4.0).
version: "1.0.0"
last-reviewed: "2026-05-14"
languages: [typescript, python, go, rust, javascript]
changelog: "../../CHANGELOG.md"
tools: Read, Grep, Glob, Bash
model: opus
permissionMode: default
---

# Context Check — Strategic DDD

The strategic side of Domain-Driven Design — bounded contexts, ubiquitous
language, anti-corruption layers — is fundamentally about *team-level*
agreement on what the model means. The agent cannot decide bounded-context
boundaries on its own. What it *can* do is surface symptoms that suggest the
strategic distinctions have been lost:

- One `User` type shared across `billing/`, `auth/`, and `reporting/` — likely
  three different concepts forced into one shape.
- Vague names in core (`Processor`, `Manager`) — domain meaning has drifted
  toward technical scaffolding.
- External SDK / API DTOs imported directly by core — no ACL, so a vendor
  change ripples into business logic.

Every rule here is **WARN**, not BLOCK. Strategic DDD is calibration, not
enforcement.

---

## Rules

### CTXT-1 — Shared Models Across Unrelated Bounded Contexts
**Severity**: WARN | **Languages**: * | **Source**: CCC

**What it surfaces**: A core-layer type (class, struct, interface, type alias)
imported from three or more sibling packages/modules whose names suggest
unrelated bounded contexts (e.g., `billing/`, `auth/`, `reporting/`,
`inventory/`, `notifications/`). Two-module sharing is common and not flagged;
three-or-more is the threshold where a single shared type usually hides
distinct domain concepts.

**Detection**:
1. List sibling first-level directories under `core/` (or legacy `domain/`).
2. For each exported type in core: grep for `import.*{TypeName}` (TS/JS),
   `from .* import TypeName` (Python), `TypeName` qualified imports (Go), or
   `use crate::.*TypeName` (Rust) across the codebase.
3. Map importers to their top-level core module. If a type is imported from
   ≥3 distinct sibling modules: flag as a CTXT-1 candidate.

**Allowed / justified cases**:
- Generic value objects with no domain meaning (`Money`, `EmailAddress`,
  `DateRange`) — these legitimately cross contexts.
- Shared kernel modules explicitly marked as such (`shared-kernel/`,
  `common/`, `core/shared/`).
- Anti-corruption layer DTOs at boundaries.

**agent_action**:
1. Cite: `CTXT-1 (WARN): Type '{name}' is shared across {n} sibling modules ({list}). Consider whether these contexts mean the same thing by it.`
2. Recommend: split into context-specific types (e.g., `BillingCustomer`,
   `AuthCustomer`, `ReportingCustomer`) and translate at boundaries; or move
   the type into an explicit shared kernel.
3. Do not block — bounded context decisions require human judgment.

---

### CTXT-2 — Vague Generic Names in Domain
**Severity**: WARN | **Languages**: * | **Source**: CCC

**What it surfaces**: A core-layer type or function whose name carries no
domain meaning — generic technical suffixes (`Processor`, `Manager`,
`Helper`, `Util`, `Service`) without a domain prefix that grounds it in
ubiquitous language. Overlaps with `naming-check`'s NAME-UL; CTXT-2 fires
during *review* alongside other strategic-DDD signals, NAME-UL fires during
*write*.

**Detection**:
1. For each exported symbol in core/: extract its name.
2. Flag names ending in `Manager`, `Processor`, `Helper`, `Util`, `Service`,
   `Handler` (unless the file is in a shell/HTTP/event-handling path),
   `Engine`, or `Coordinator` *without* a domain-meaningful prefix.
3. `OrderManager` is borderline (has a domain prefix but a generic suffix);
   `Processor` alone is clear-cut.

**Cross-reference**: This is the review-mode partner to NAME-UL in
`naming-check`. If NAME-UL has already fired for the same symbol in the same
session, suppress the duplicate CTXT-2 report.

**agent_action**:
1. Cite: `CTXT-2 (WARN): Generic technical name '{name}' in core at {file}:{line}. Consider a domain-aligned name.`
2. Recommend: rename to encode the ubiquitous-language concept — e.g.,
   `PricingPolicy` instead of `PricingManager`, `FulfillmentRecord` instead
   of `OrderProcessor`. If no domain term applies, that's a signal the type
   itself may not belong in core.
3. Do not block.

---

### CTXT-3 — External API Models Leaking Into Core Without ACL
**Severity**: WARN | **Languages**: * | **Source**: CCC

**What it surfaces**: A type defined by an external SDK, API client, or
third-party library imported directly by core code. Core should depend on
its own ports, not on Stripe's `Customer`, AWS SDK's `S3Object`, or the
Slack API's `Message`. The Anti-Corruption Layer (ACL) pattern: shell
translates external types into core's own domain types at the boundary.

**Detection**:
1. For each file in core/: list its imports.
2. For each import: check whether the source module name matches a known
   third-party SDK / external API package — `@aws-sdk/*`, `stripe`,
   `@slack/*`, `googleapis`, `boto3`, `octokit`, `twilio`, `sendgrid`,
   `kubernetes-client`, `mongodb`, `firebase-admin`, `openai`, etc. The
   detection is heuristic — match well-known package name prefixes/suffixes.
3. Flag any external type referenced in core's public signatures or
   business logic. Type-only imports used solely for ACL translation are
   allowed if the file path includes `acl/`, `adapters/`, `translators/`,
   or similar.

**Allowed / justified cases**:
- Type-only imports in dedicated ACL translation modules.
- Trivial scripts or one-off utilities where ACL ceremony would add no value.
- Generic primitives provided by external libraries (`Decimal` from
  big-number libraries, `Buffer` types) — these are runtime primitives, not
  external domain models.

**agent_action**:
1. Cite: `CTXT-3 (WARN): Core imports external API type '{type}' from '{module}' at {file}:{line}. Translate via an Anti-Corruption Layer instead.`
2. Recommend: define a core type that captures what your domain needs;
   write a translation function in shell (e.g., `shell/acl/stripe.ts`) that
   maps Stripe's `Customer` into your `BillingCustomer`. Core knows only
   about `BillingCustomer`.
3. Do not block.

---

Report schema: see `skills/conductor/shared-contracts.md`.
