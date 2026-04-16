# Swarm Orchestration

Visual reference for swarm orchestration patterns, tradeoffs, and the proposed
`swarm-orchestration` skill design.

---

## The Five Coordination Topologies

```mermaid
graph TD
    subgraph T1["Coordinator / Worker"]
        direction TB
        C1["Coordinator"] --> W1A["Worker A"]
        C1 --> W1B["Worker B"]
        C1 --> W1C["Worker C"]
        W1A -.-> C1
        W1B -.-> C1
        W1C -.-> C1
    end

    subgraph T2["Sequential Pipeline"]
        direction LR
        P1["Implementer"] --> P2["Spec\nReviewer"] --> P3["Quality\nReviewer"]
    end

    subgraph T3["Wave / Batch"]
        direction TB
        WP["Planner"] --> WW1
        subgraph WW1["Wave 1 — parallel"]
            direction LR
            T3A["Task A"] & T3B["Task B"] & T3C["Task C"]
        end
        WW1 --> WW2
        subgraph WW2["Wave 2 — parallel"]
            direction LR
            T3D["Task D"] & T3E["Task E"]
        end
        WW2 --> T3F["Integrator"]
    end

    subgraph T4["Hierarchical"]
        direction TB
        H1["Coordinator"] --> H2A["Team Lead A"] & H2B["Team Lead B"]
        H2A --> H3A["Worker 1"] & H3B["Worker 2"]
        H2B --> H3C["Worker 3"] & H3D["Worker 4"]
    end

    subgraph T5["Mesh — avoid above 3 agents"]
        direction TB
        M1["Agent A"] <--> M2["Agent B"]
        M2 <--> M3["Agent C"]
        M1 <--> M3
    end
```

---

## Which Pattern Each System Uses

```mermaid
flowchart TD
    SYSTEMS["Three Systems"]

    SYSTEMS --> US["copilot-skills"]
    SYSTEMS --> SP["Superpowers"]
    SYSTEMS --> GSD["GSD"]

    US --> US1["planning-orchestration\nCoordinator / Worker\nscout → planner → reviewer"]
    US --> US2["parallel-implementation-loop\nFixed-track Coordinator\n2-3 tracks, bounded revision"]
    US --> US3["ccc conductor\nRule-routed Coordinator\nfixed decision tree per op type"]

    SP --> SP1["dispatching-parallel-agents\nFan-out / Collect\nN independent agents, no shared state"]
    SP --> SP2["subagent-driven-development\nSequential Pipeline\nimplementer → spec-reviewer → quality-reviewer"]

    GSD --> GSD1["execute-phase\nWave / Batch\ndependency-aware parallel waves"]
    GSD --> GSD2["specialist agents\nHierarchical\norchestrator → executor → specialists"]

    style US1 fill:#1a3a5c,color:#fff
    style US2 fill:#1a3a5c,color:#fff
    style US3 fill:#1a3a5c,color:#fff
    style SP1 fill:#2d4a1e,color:#fff
    style SP2 fill:#2d4a1e,color:#fff
    style GSD1 fill:#5c3a00,color:#fff
    style GSD2 fill:#5c3a00,color:#fff
```

---

## What None of Them Have — The True Swarm Gap

```mermaid
flowchart LR
    subgraph FIXED["What all three do\nFixed topology"]
        direction TB
        F1["You decide the agent roster BEFORE execution"]
        F2["Coordinator routes to pre-defined roles"]
        F3["Topology is static — plan then execute"]
    end

    subgraph SWARM["What true swarm adds\nEmergent topology"]
        direction TB
        S1["Coordinator discovers problem shape DURING execution"]
        S2["Spawns agents based on what scouts find"]
        S3["Agents hand off to specialists mid-task"]
        S4["Shared knowledge base feeds all agents"]
        S5["Plan evolves as findings come in"]
    end

    FIXED -. "gap" .-> SWARM

    subgraph GAP["The four missing capabilities"]
        direction TB
        G1["Dynamic task decomposition\nplanner agent splits work at runtime"]
        G2["Agent-to-agent handoffs\nimplementer delegates to specialist mid-task"]
        G3["Shared working memory\nSWARM.md all agents read and write"]
        G4["Adaptive re-planning\ncoordinator adjusts based on findings"]
    end

    SWARM --> GAP
```

---

## Token Cost by Pattern

```mermaid
xychart-beta
    title "Relative token cost vs task count"
    x-axis ["1 task", "3 tasks", "5 tasks", "10 tasks", "20 tasks"]
    y-axis "Token cost (relative)" 0 --> 60
    line [1, 3, 5, 10, 20]
    line [2.5, 7.5, 12.5, 25, 50]
    line [2, 5, 8, 14, 22]
    line [3, 7, 11, 18, 28]
```

> **Legend (bottom to top):** Simple parallel (1x) · Subagent pipeline (2.5x) · Wave/batch (2x amortized) · Coordinator swarm (2.5–3x)
>
> Wave/batch cheapens per task because the planner cost is amortized across many tasks.

---

## Per-Role Model Selection

Cost optimization used by GSD and Superpowers — only our `parallel-implementation-loop` partially does this today.

```mermaid
flowchart TD
    TASK["New task arrives"]

    TASK --> Q1{"Touches how\nmany files?"}
    Q1 -->|"1-2 files\nclear spec"| CHEAP["Cheap / fast model\ne.g. haiku-4.5"]
    Q1 -->|"3-5 files\nintegration concerns"| STD["Standard model\ne.g. sonnet-4.6"]
    Q1 -->|"Many files\nor design judgment"| BEST["Most capable model\ne.g. opus-4.6"]

    CHEAP --> IMPL["Implement"]
    STD --> IMPL
    BEST --> IMPL

    IMPL --> REVIEW{"Review type?"}
    REVIEW -->|"Spec compliance\nyes/no check"| STD2["Standard model"]
    REVIEW -->|"Code quality\narchitecture judgment"| BEST2["Most capable model"]
    REVIEW -->|"Scout / discovery\nfile search only"| CHEAP2["Cheap / fast model"]
```

---

## Silent Failures vs Visible Failures

```mermaid
flowchart LR
    subgraph SILENT["Silent failures — hard to detect"]
        direction TB
        SF1["Scope creep\nagent edits files outside task boundary"]
        SF2["Scope shrinkage\nagent delivers partial work silently"]
        SF3["Context drift\nagent decides on stale information"]
        SF4["Write conflicts\ntwo agents edit same file incompatibly"]
        SF5["Review lock\nreviewer and implementer argue forever"]
    end

    subgraph VISIBLE["Visible failures — manageable"]
        direction TB
        VF1["Blocker reported\nagent cannot proceed, escalates"]
        VF2["Revision loop\nbounded to max 2 rounds then escalate"]
        VF3["Spec gap\nreviewer flags missing requirement"]
        VF4["Merge conflict\ncaught at integration step"]
        VF5["Model incapable\nre-dispatch with more capable model"]
    end

    subgraph PREVENT["Prevention gates"]
        direction TB
        P1["Explicit file ownership\nper track definition"]
        P2["Acceptance criteria\nbefore dispatch"]
        P3["Fresh context per agent\nno inherited session history"]
        P4["Max revision rounds\nhard stop at 2, then escalate"]
        P5["Integration step\nserial merge with full validation"]
    end

    SILENT -. "mitigated by" .-> PREVENT
    VISIBLE -. "handled by" .-> PREVENT
```

---

## Proposed swarm-orchestration Skill — Internal Flow

```mermaid
stateDiagram-v2
    direction TB

    [*] --> ProblemIngestion: skill invoked with problem statement

    ProblemIngestion --> InitialScout: spawn scout agent(s)\ncheap model, read-only

    InitialScout --> KnowledgeBase: scouts write findings\nto SWARM.md

    KnowledgeBase --> CoordinatorDecision: coordinator reads SWARM.md\ndecides agent roster dynamically

    CoordinatorDecision --> SpawnSpecialists: spawn researcher / architect\nimplementer / verifier as needed

    SpawnSpecialists --> AgentWork

    state AgentWork {
        direction LR
        [*] --> Executing
        Executing --> HandoffNeeded: agent needs specialist
        HandoffNeeded --> Executing: sub-agent returns result
        Executing --> Done
    }

    AgentWork --> ReportToCoordinator: agent reports findings\nto coordinator

    ReportToCoordinator --> ConvergenceCheck: coordinator checks\nis coverage sufficient?

    ConvergenceCheck --> SpawnSpecialists: no — spawn targeted agents\n(adversarial critic, edge-case researcher)
    ConvergenceCheck --> Synthesis: yes — synthesize results

    Synthesis --> Implementation: hand synthesis\nto implementer agent

    Implementation --> Verification: verifier runs tests\nand validation commands

    Verification --> DurableReport: publish swarm summary artifact\n(SWARM.md archived/deleted)

    DurableReport --> [*]
```

---

## How swarm-orchestration Fits Our Plugin Stack

```mermaid
flowchart TD
    subgraph SDD["flow (SDD)"]
        SDD1["sdd.specify\nuser stories + requirements"]
        SDD2["sdd.plan\nimplementation plan"]
        SDD3["sdd.tasks\nordered task list"]
        SDD1 --> SDD2 --> SDD3
    end

    subgraph WO["flow"]
        WO1["planning-orchestration\nscout → planner → reviewer"]
        WO2["swarm-orchestration\nNEW — dynamic topology\ncoordinator + SWARM.md"]
        WO3["parallel-implementation-loop\nfixed 2-3 tracks\nbounded revision"]
        WO4["pr-review-resolution-loop"]
        WO5["final-pr-readiness-gate"]
    end

    subgraph CC["ccc"]
        CC1["conductor\nauto-routes to sub-skills"]
        CC2["10 check sub-skills\nsec · tdd · arch · type · etc"]
        CC1 --> CC2
    end

    SDD3 -->|"known problem\nclear task list"| WO3
    SDD3 -->|"complex problem\nunknown topology"| WO2
    WO1 -->|"discovery brief"| WO2
    WO2 -->|"emergent tasks"| WO3
    WO3 --> WO4 --> WO5

    CC1 -.->|"quality gates on every write"| WO2
    CC1 -.->|"quality gates on every write"| WO3

    style WO2 fill:#5c1a5c,color:#fff
```

---

## Decision Guide — Which Pattern to Use

```mermaid
flowchart TD
    START(["Problem arrives"])

    START --> Q1{"Do you have\na task list?"}

    Q1 -->|"No"| Q2{"Problem size?"}
    Q2 -->|"Small / focused"| PO["planning-orchestration\nscout discovers, planner produces list"]
    Q2 -->|"Large / unknown scope"| SO["swarm-orchestration\ndynamic discovery + emergent task list"]

    Q1 -->|"Yes"| Q3{"Are tasks\nindependent?"}

    Q3 -->|"No — tightly coupled"| SERIAL["execute sequentially\nsubagent-driven-development style"]
    Q3 -->|"Yes"| Q4{"How many\ntasks?"}

    Q4 -->|"2-3 tasks"| SIMPLE["dispatching-parallel-agents\nfan-out / collect"]
    Q4 -->|"3-10 tasks"| PIL["parallel-implementation-loop\nfixed tracks, bounded revision"]
    Q4 -->|"10+ tasks\nwith dependencies"| WAVE["wave execution\ndependency-aware parallel batches"]

    SIMPLE & PIL & WAVE & SO --> REVIEW["pr-review-resolution-loop"]
    REVIEW --> GATE["final-pr-readiness-gate"]

    style SO fill:#5c1a5c,color:#fff
    style PIL fill:#1a3a5c,color:#fff
    style GATE fill:#1a5c2a,color:#fff
```
