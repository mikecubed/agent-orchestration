# Plugin Ecosystem Comparison

Comparison of **copilot-skills** against [Superpowers](https://github.com/obra/superpowers) and [GSD](https://github.com/gsd-build/get-shit-done).

---

## Plugin Architecture Overview

```mermaid
graph TB
    subgraph US["🔷 copilot-skills (ours)"]
        direction TB
        US1["clean-code-codex\n10 check sub-skills\nsec · tdd · arch · type\nnaming · size · dead · test\nobs · dep"]
        US2["sdd-workflow\nsdd.specify\nsdd.plan\nsdd.tasks\nsdd-feature-workflow"]
        US3["workflow-orchestration\nplanning-orchestration\nparallel-implementation-loop\npr-review-resolution-loop\nfinal-pr-readiness-gate"]
    end

    subgraph SP["⚡ Superpowers"]
        direction TB
        SP1["brainstorming"]
        SP2["writing-plans"]
        SP3["subagent-driven-development"]
        SP4["test-driven-development"]
        SP5["systematic-debugging"]
        SP6["using-git-worktrees"]
        SP7["finishing-a-development-branch"]
        SP8["dispatching-parallel-agents"]
        SP9["requesting-code-review\nreceiving-code-review"]
        SP10["verification-before-completion"]
        SP11["executing-plans"]
        SP12["writing-skills"]
    end

    subgraph GSD["🚀 GSD"]
        direction TB
        GSD1["/gsd:new-project"]
        GSD2["/gsd:discuss-phase"]
        GSD3["/gsd:plan-phase"]
        GSD4["/gsd:execute-phase"]
        GSD5["/gsd:map-codebase"]
        GSD6["/gsd:debug + forensics"]
        GSD7["20+ specialist agents\n(planner · debugger · doc-writer\nui-auditor · security-auditor…)"]
        GSD8["8 runtime hooks\n(context-monitor · statusline\nworkflow-guard · prompt-guard…)"]
        GSD9["/gsd:autonomous\n/gsd:quick · fast · do"]
        GSD10["pause/resume\nsession state"]
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
    US_IMPL -.-> US_QUALITY["clean-code-codex: 64 rules auto-enforced"]
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
    bar [3, 4, 4, 5, 5, 0, 1, 1, 2, 5]
    bar [4, 4, 4, 2, 0, 4, 2, 3, 4, 3]
    bar [4, 5, 5, 1, 2, 4, 4, 5, 5, 3]
```

> **Legend:** Blue = copilot-skills · Orange = Superpowers · Green = GSD

---

## What Each System Auto-Triggers

```mermaid
stateDiagram-v2
    direction LR

    state "copilot-skills" as CS {
        [*] --> Manual: User invokes skill
        Manual --> sdd_feature: "build a X feature"
        Manual --> conductor: write / review / refactor
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
