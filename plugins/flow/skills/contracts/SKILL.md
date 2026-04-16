---
name: contracts
description: Derive machine-readable contracts (OpenAPI 3.x, JSON Schema, Gherkin) from a spec.md or natural-language endpoint description, with full FR-ID traceability.
---

## Purpose

Accept a `.sdd/*/spec.md` path **or** a natural-language endpoint description as input and emit the following contract artifacts:

| Artifact | Format |
|---|---|
| `openapi.yaml` | OpenAPI 3.x |
| `schema/{EntityName}.json` | JSON Schema draft-07 / draft-2020-12 |
| `features/{feature-name}.feature` | Gherkin |
| `contracts-summary.md` | Durable summary artifact listing all generated files, FR-ID mappings, and unresolved items |

**SDLC placement:** between `/flow:sdd-specify` and `/flow:sdd-plan` — contracts are derived *after* the spec is written and *before* the implementation plan is created.

The output directory defaults to `.sdd/{feature-dir}/contracts/`.

Persistent team, squad, or fleet-style long-lived orchestration is out of scope for this skill.

## When to Use It

- After `/flow:sdd-specify` produces a `spec.md` and you need machine-readable contracts before planning.
- When REST contracts, JSON Schema definitions, or Gherkin acceptance tests need to be derived from a spec.
- On spec changes — regeneration overwrites contracts in place and records the delta in `contracts-summary.md`.
- When a natural-language endpoint description is the only input available (no `spec.md` yet).

## Project-Specific Inputs

| Input | Description |
|---|---|
| **Spec path** | Path to `spec.md` (under `.sdd/*/spec.md`) or a natural-language endpoint description. |
| **Output directory** | Target output directory (default: `.sdd/{feature-dir}/contracts/`). |

Provide factual context: confirm the spec path exists and FR count before generation begins.

## Workflow

1. **Parse FRs** — Extract FR-NNN entries from `spec.md`; classify each as an endpoint FR or a domain-rule FR.
2. **Emit `openapi.yaml`** — Generate an OpenAPI 3.x document with `operationId` derived from the FR-ID (e.g. `FR-001` → `createOrder`) and an `x-fr-id` vendor extension preserving traceability.
3. **Emit JSON Schemas** — For each domain entity found in the Key Entities section, produce `schema/{EntityName}.json` (JSON Schema draft-07 or draft-2020-12).
4. **Emit Gherkin features** — Parse Given/When/Then acceptance scenarios from the spec and write `features/{feature-name}.feature`, preserving the original wording.
5. **Emit durable `contracts-summary.md` artifact** — List: output files generated, FR-IDs mapped, FR-IDs unresolved (with reason), and any low-confidence extractions.
6. **Duplicate FR-IDs** — Flag duplicates in the summary, process the first occurrence, and mark subsequent duplicates as unresolved.
7. **No canonical format** — If the spec contains no FR-NNN identifiers and no Given/When/Then blocks, perform best-effort extraction, annotate outputs as "low-confidence", and list unparsed sections in `contracts-summary.md`.
8. **No REST endpoints detected** — Skip `openapi.yaml`, document the skip reason in `contracts-summary.md`, and still produce Gherkin from any acceptance scenarios.

## Required Gates

- `spec.md` must exist and be readable, **or** a natural-language description must be provided.
- The output directory must be writable.
- Gather factual context: confirm spec path, FR count, and entity list before generation begins.
- FR-to-operationId mapping must be explicit and auditable via `contracts-summary.md`.

## Stop Conditions

- Input spec cannot be located **and** no natural-language description is provided.
- FR-NNN entries are entirely absent **and** no natural-language description is provided.
- Rescue: if the skill enters an unrecoverable state mid-run, emit a partial `contracts-summary.md` recording all completed steps and halt cleanly.

## Example

**Input:** `spec.md` at `.sdd/order-service-abc123/spec.md` containing 5 FRs (3 endpoint FRs, 2 domain rules) and 3 Given/When/Then acceptance scenarios.

**Output file tree:**

```
.sdd/order-service-abc123/contracts/
├── openapi.yaml          (3 paths, x-fr-id annotations)
├── schema/
│   └── Order.json        (JSON Schema draft-07)
├── features/
│   └── order-management.feature  (3 Gherkin scenarios)
└── contracts-summary.md  (5 FRs: 3 mapped, 2 unresolved domain rules)
```

**Invocation:**

```
/flow:contracts
```

After preparing the spec with `/flow:sdd-specify` and `/flow:sdd-plan`, provide the spec path (`.sdd/order-service-abc123/spec.md`) and accept the default output directory. The skill parses 5 FRs, emits OpenAPI paths for the 3 endpoint FRs with `x-fr-id` annotations, generates `Order.json` from the Key Entities section, converts 3 acceptance scenarios into Gherkin, and writes a durable `contracts-summary.md` artifact summarizing all mappings and the 2 unresolved domain-rule FRs.
