# Model Preferences — Config Templates

The `workflow-orchestration` plugin looks for a **plain YAML file** (not markdown)
under your project root to override the default models used for each role.

Create the file for your runtime (or both). The directories (`.copilot/` and
`.claude/`) may need to be created first if they do not already exist. Set only
the keys you want to override — any absent key falls back to the baked-in default
for that role without prompting.

These files are optional. If no project model config exists, the workflows use
their baked-in defaults silently rather than prompting on first use. Create a
config file only when you want persistent overrides for the project.

Update these files whenever you want to switch to a newer model release.

---

## Copilot CLI

Create `.copilot/models.yaml` with:

```yaml
# workflow-orchestration model overrides — Copilot CLI
# planning-orchestration
planner: claude-opus-4.6
reviewer: gpt-5.4

# parallel-implementation-loop and pr-review-resolution-loop
implementer: claude-opus-4.6

# final-pr-readiness-gate
structured-check: gpt-5.4
final-reviewer: gpt-5.4

# bounded discovery/triage (all skills)
scout: claude-haiku-4.5
```

---

## Claude Code

Create `.claude/models.yaml` with:

```yaml
# workflow-orchestration model overrides — Claude Code
# planning-orchestration
planner: claude-opus-4.6
reviewer: claude-opus-4.6

# parallel-implementation-loop and pr-review-resolution-loop
implementer: claude-opus-4.6

# final-pr-readiness-gate
structured-check: claude-opus-4.6
final-reviewer: claude-opus-4.6

# bounded discovery/triage (all skills)
scout: claude-haiku-4.5
```

---

## Key reference

| Key               | Used by skill(s)                                                                                      | Role                                                  |
|-------------------|--------------------------------------------------------------------------------------------------------|-------------------------------------------------------|
| `planner`         | planning-orchestration                                                                                 | Produces and revises planning artifacts               |
| `implementer`     | parallel-implementation-loop, pr-review-resolution-loop                                               | Makes code changes                                    |
| `reviewer`        | planning-orchestration, parallel-implementation-loop, pr-review-resolution-loop                       | Reviews plans or diffs                                |
| `structured-check`| final-pr-readiness-gate                                                                                | Runs structured code checks                           |
| `final-reviewer`  | final-pr-readiness-gate                                                                                | Whole-diff final review                               |
| `scout`           | planning-orchestration, parallel-implementation-loop, pr-review-resolution-loop, final-pr-readiness-gate | Runs bounded discovery/triage before expensive delegation |
