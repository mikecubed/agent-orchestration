# Model Preferences — Config Templates

The `agent-workflow-skills` plugin looks for a **plain YAML file** (not markdown)
in your project root to override the default models used for each role.

Create the file for your runtime (or both). The directories (`.copilot/` and
`.claude/`) may need to be created first if they do not already exist. Set only
the keys you want to override — any absent key falls back to the baked-in default
for that role without prompting.

Update these files whenever you want to switch to a newer model release.

---

## Copilot CLI

Create `.copilot/models.yaml` with:

```yaml
# agent-workflow-skills model overrides — Copilot CLI
# parallel-implementation-loop and pr-review-resolution-loop
implementer: claude-opus-4.6
reviewer: gpt-5.4

# final-pr-readiness-gate
structured-check: gpt-5.4
final-reviewer: gpt-5.4
```

---

## Claude Code

Create `.claude/models.yaml` with:

```yaml
# agent-workflow-skills model overrides — Claude Code
# parallel-implementation-loop and pr-review-resolution-loop
implementer: claude-opus-4.6
reviewer: claude-opus-4.6

# final-pr-readiness-gate
structured-check: claude-opus-4.6
final-reviewer: claude-opus-4.6
```

---

## Key reference

| Key               | Used by skill(s)                                          | Role                        |
|-------------------|-----------------------------------------------------------|-----------------------------|
| `implementer`     | parallel-implementation-loop, pr-review-resolution-loop  | Makes code changes          |
| `reviewer`        | parallel-implementation-loop, pr-review-resolution-loop  | Reviews diffs               |
| `structured-check`| final-pr-readiness-gate                                   | Runs structured code checks |
| `final-reviewer`  | final-pr-readiness-gate                                   | Whole-diff final review     |
