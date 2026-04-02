---
description: "Create a feature specification from a natural language description."
handoffs:
  - label: Create Implementation Plan
    agent: sdd.plan
    prompt: Create a plan for this spec
    send: true
  - label: Iterate on Spec
    agent: sdd.specify
    prompt: Refine the specification
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

Given the feature description in `$ARGUMENTS`, do this:

1. **Check for headless mode**: If `$ARGUMENTS` contains `headless` or `--headless`, enable headless mode — auto-accept all recommended defaults and complete without pausing for user input.

2. **Generate a feature directory name**:
   - Derive a short 2-4 word slug from the feature description (e.g., "user-auth", "analytics-dashboard")
   - Append an 8-character random alphanumeric suffix (e.g., `user-auth-a3f9b2c1`)
   - Full path: `.sdd/{slug}-{suffix}/`

3. **Create the feature directory** and all required parent directories.

4. **Use the canonical specification template embedded below**:
   ````md
# Feature Specification: [FEATURE NAME]

**Created**: [DATE]
**Status**: Draft
**Input**: User description: "$ARGUMENTS"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - [Brief Title] (Priority: P1)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]
2. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

### User Story 2 - [Brief Title] (Priority: P2)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

### User Story 3 - [Brief Title] (Priority: P3)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]

### Edge Cases

- What happens when [boundary condition]?
- How does system handle [error scenario]?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST [specific capability]
- **FR-002**: System MUST [specific capability]
- **FR-003**: Users MUST be able to [key interaction]

### Key Entities *(include if feature involves data)*

- **[Entity 1]**: [What it represents, key attributes without implementation]
- **[Entity 2]**: [What it represents, relationships to other entities]

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: [Measurable metric]
- **SC-002**: [Measurable metric]
- **SC-003**: [User satisfaction metric]
````

5. **Generate the specification** by filling the template:
   - Replace `[FEATURE NAME]` with a human-readable feature name
   - Replace `[DATE]` with today's date
   - Fill in user stories (at least 2), functional requirements, and success criteria
   - Mark genuinely unclear decisions as `[NEEDS CLARIFICATION: specific question]` — maximum 3 markers

6. **Write** the filled specification to `.sdd/{feature-dir}/spec.md`.

7. **Quality validation** — validate the spec:
   - No implementation details
   - All mandatory sections completed
   - Requirements are testable and success criteria are measurable

8. **Handle clarifications** (skip in headless mode — auto-resolve with defaults).

9. **Write quality checklist** to `.sdd/{feature-dir}/checklists/requirements.md`.

10. **Report completion** with feature directory path, spec file path, and checklist summary.
