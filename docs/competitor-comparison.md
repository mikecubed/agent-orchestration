# Plugin Ecosystem Comparison

Comparison of **agent-orchestration** (`workflow-orchestration` · `sdd-workflow` · `clean-code-codex`) against [Superpowers](https://github.com/obra/superpowers) and [GSD](https://github.com/gsd-build/get-shit-done).

---

## Plugin Architecture Overview

```mermaid
graph TD
    subgraph US["agent-orchestration (ours)"]
        direction LR
        US1["clean-code-codex\nsec · tdd · arch · type · naming\nsize · dead · test · obs · dep"]
        US2["sdd-workflow\nsdd.specify · sdd.plan · sdd.tasks"]
        US3["workflow-orchestration\nplanning · parallel-impl · swarm-orchestration · pr-review · readiness-gate"]
    end

    subgraph SP["Superpowers"]
        direction LR
        SP1["ideation\nbrainstorming · writing-plans · writing-skills"]
        SP2["implementation\nsubagent-driven-dev · executing-plans · dispatching-parallel-agents\nusing-git-worktrees · finishing-a-development-branch"]
        SP3["quality\ntest-driven-development · verification-before-completion\nsystematic-debugging"]
        SP4["review\nrequesting-code-review · receiving-code-review"]
    end

    subgraph GSD["GSD"]
        direction LR
        GSD1["project lifecycle\nnew-project · discuss-phase · plan-phase · execute-phase · ship"]
        GSD2["discovery\nmap-codebase · research-phase · 20+ specialist agents"]
        GSD3["execution\nautonomous · wave execution · pause/resume · session-state"]
        GSD4["runtime hooks\ncontext-monitor · workflow-guard · statusline · prompt-guard"]
        GSD5["utilities\ndebug · forensics · ui-phase · secure-phase · docs-update"]
    end
```

---

## End-to-End Developer Workflow

How each system covers the full development lifecycle:

```mermaid
flowchart LR
    IDEA(["💡 Idea"]) --> SPEC["Spec /\nBrainstorm"]
    SPEC --> PLAN["Plan"]
    PLAN --> IMPL["Implement"]
    IMPL --> QUALITY["Quality\nGates"]
    QUALITY --> REVIEW["Code\nReview"]
    REVIEW --> MERGE["Merge /\nShip"]

    IDEA -. "sdd-feature-workflow auto-activates" .-> US_SPEC["sdd.specify / sdd.plan / sdd.tasks"]
    US_SPEC -.-> US_IMPL["parallel-implementation-loop / planning-orchestration"]
    US_IMPL -.-> US_QUALITY["clean-code-codex: 65 rules auto-enforced"]
    US_QUALITY -.-> US_REVIEW["pr-review-resolution-loop / final-pr-readiness-gate"]

    IDEA -. "brainstorming: Socratic design" .-> SP_SPEC["writing-plans"]
    SP_SPEC -.-> SP_IMPL["subagent-driven-development / using-git-worktrees"]
    SP_IMPL -. "test-driven-development / verification-before-completion" .-> SP_QUALITY["No enforcement rules"]
    SP_QUALITY -.-> SP_REVIEW["requesting-code-review / receiving-code-review / finishing-a-development-branch"]

    IDEA -. "new-project / discuss-phase" .-> GSD_SPEC["plan-phase / research-phase"]
    GSD_SPEC -. "map-codebase / wave execution" .-> GSD_IMPL["execute-phase / autonomous"]
    GSD_IMPL -. "validate-phase / verify-work" .-> GSD_QUALITY["No enforcement rules"]
    GSD_QUALITY -.-> GSD_REVIEW["review / pr-branch / ship"]

    style US_QUALITY fill:#1a5c2a,color:#fff
    style SP_QUALITY fill:#5c1a1a,color:#fff
    style GSD_QUALITY fill:#5c1a1a,color:#fff
```

---

## Feature Coverage Matrix

```mermaid
quadrantChart
    title Feature Breadth vs Enforcement Depth
    x-axis "Narrow workflow" --> "Full lifecycle"
    y-axis "Suggestions only" --> "Hard enforcement gates"
    quadrant-1 "Enforces + Broad"
    quadrant-2 "Enforces + Focused"
    quadrant-3 "Suggests + Focused"
    quadrant-4 "Suggests + Broad"
    copilot-skills: [0.45, 0.90]
    Superpowers: [0.65, 0.35]
    GSD: [0.92, 0.20]
```

---

## Capability Gap Analysis

Green = covered · Red = missing · Yellow = partial

```mermaid
xychart-beta
    title "Capability Coverage Score (0–5)"
    x-axis ["Spec/\nBrainstorm", "Planning", "Impl\nOrchestration", "Code\nQuality", "Security\nScanning", "Debugging", "Session\nState", "Easy\nInstall", "Platform\nReach", "PR\nWorkflow"]
    y-axis "Score" 0 --> 5
    bar "agent-orchestration" [3, 4, 4, 5, 5, 0, 1, 1, 2, 5]
    bar "Superpowers" [4, 4, 4, 2, 0, 4, 2, 3, 4, 3]
    bar "GSD" [4, 5, 5, 1, 2, 4, 4, 5, 5, 3]
```

> **Legend:** Blue = copilot-skills · Orange = Superpowers · Green = GSD

---

## What Each System Auto-Triggers

```mermaid
stateDiagram-v2
    direction LR

    state "agent-orchestration" as CS {
        [*] --> auto_detect: User message matches pattern
        [*] --> manual_invoke: User invokes skill directly
        auto_detect --> sdd_feature: auto-activates on feature-request patterns
        auto_detect --> conductor: auto-activates on write / review / refactor
        manual_invoke --> swarm: swarm-orchestration / planning-orchestration
        conductor --> checks: routes to 1–10 sub-skills
    }

    state "Superpowers" as SP {
        [*] --> session_hook: Session starts
        session_hook --> skill_context: loads all skill context
        skill_context --> auto_trigger: agent checks relevant skill\nbefore any task
    }

    state "GSD" as GSD {
        [*] --> hooks: 8 runtime hooks active
        hooks --> context_monitor: tracks context fill %
        hooks --> workflow_guard: enforces phase order
        hooks --> statusline: shows current phase/state
        hooks --> prompt_guard: blocks out-of-phase requests
    }
```

---

## Installation Experience

```mermaid
journey
    title Getting Started Experience
    section copilot-skills
      Find plugin on marketplace: 3: Developer
      Install via /plugin install: 4: Developer
      Read docs to understand skills: 2: Developer
      Manually invoke first skill: 3: Developer
    section Superpowers
      Find on Claude official marketplace: 5: Developer
      /plugin install superpowers: 5: Developer
      Session auto-loads on next start: 5: Developer
      Skills fire automatically: 5: Developer
    section GSD
      Run npx get-shit-done-cc@latest: 5: Developer
      Pick runtime + global/local: 5: Developer
      /gsd:new-project to begin: 5: Developer
      Full workflow guided by commands: 4: Developer
```

---

## Our Gaps — Priority Roadmap

```mermaid
graph TD
    NOW["Current State\ncopilot-skills"]

    NOW --> Q1["🔴 High Impact · Low Effort"]
    Q1 --> A1["Session-start hook\nauto-inject skill context"]
    Q1 --> A2["brainstorming skill\npre-spec Socratic ideation"]
    Q1 --> A3["verification-before-completion\nanti-hallucination gate"]

    NOW --> Q2["🟠 High Impact · Medium Effort"]
    Q2 --> B1["systematic-debugging skill\n4-phase root cause"]
    Q2 --> B2["map-codebase command\nparallel stack discovery"]
    Q2 --> B3["npx installer\none-line setup across platforms"]
    Q2 --> B4["pause/resume session state\npersist work across conversations"]

    NOW --> Q3["🟡 Strategic Differentiation"]
    Q3 --> C1["Double down on clean-code-codex\nauto-trigger on git commit"]
    Q3 --> C2["Versioned plugin packaging\nas a first-class feature"]
    Q3 --> C3["Expand platform reach\nCursor · Windsurf · Gemini CLI"]

    style Q1 fill:#5c1a1a,color:#fff
    style Q2 fill:#5c3a00,color:#fff
    style Q3 fill:#1a3a5c,color:#fff
    style C1 fill:#1a5c2a,color:#fff
    style C2 fill:#1a5c2a,color:#fff
```

---

## Plugin Composition — How Our Three Plugins Work Together

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant SDD as sdd-workflow
    participant WO as workflow-orchestration
    participant CC as clean-code-codex

    Dev->>SDD: "implement X feature"
    SDD-->>Dev: offer formal spec?
    Dev->>SDD: yes
    SDD->>SDD: sdd.specify → user stories
    SDD->>SDD: sdd.plan → impl plan
    SDD->>SDD: sdd.tasks → task list
    SDD-->>WO: hand off task list

    Dev->>WO: planning-orchestration
    WO->>WO: scout discovers codebase
    WO->>WO: reviewer critiques plan
    WO-->>Dev: durable planning artifact

    Dev->>WO: parallel-implementation-loop
    loop Per independent track
        WO->>WO: implementer writes code
        CC-->>WO: auto-enforces 64 rules
        WO->>WO: reviewer validates track
    end
    WO->>WO: integrate tracks serially

    Dev->>WO: pr-review-resolution-loop
    WO->>WO: triage review comments
    WO->>WO: batch independent fixes
    CC-->>WO: quality gate each fix

    Dev->>WO: final-pr-readiness-gate
    WO-->>Dev: ready / not-ready verdict
```
