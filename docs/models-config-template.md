# Model Preferences

Copy this file to `.copilot/models.md` in a project root to override the
default models used by the `agent-workflow-skills` plugin skills.

The skills resolve models in this priority order:
1. this file (`.copilot/models.md`) in the current project root
2. session cache (if models were confirmed earlier in the session)
3. baked-in defaults in each skill

Update this file whenever you want to switch to a newer model release.

---

## Copilot CLI

implementer: claude-opus-4.6
reviewer: gpt-5.4
structured-check: gpt-5.4
final-reviewer: gpt-5.4

## Claude Code

implementer: claude-opus-4.6
reviewer: claude-opus-4.6
structured-check: claude-opus-4.6
final-reviewer: claude-opus-4.6
