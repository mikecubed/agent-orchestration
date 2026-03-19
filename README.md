# copilot-skills

Shared plugin repo for **GitHub Copilot CLI** and **Claude Code**.

This repository ships three reusable workflow skills from a single shared `skills/` tree:

- `parallel-implementation-loop`
- `pr-review-resolution-loop`
- `final-pr-readiness-gate`

## Plugin layout

The repo is intentionally plugin-first for both runtimes:

- `plugin.json` — GitHub Copilot CLI plugin manifest
- `.claude-plugin/plugin.json` — Claude Code plugin manifest
- `skills/*/SKILL.md` — shared skill definitions used by both

That means the same repository content can be installed as:

- a **Copilot CLI plugin**
- a **Claude Code plugin**

without maintaining two separate copies of the skills.

## Install in GitHub Copilot CLI

If you are inside this repository:

```bash
copilot plugin install .
```

If you are in the parent directory of this repo:

```bash
copilot plugin install ./copilot-skills
```

After installation, verify with:

```bash
copilot plugin list
```

Then inspect loaded skills in an interactive session with:

```text
/skills list
```

For repository-based installs after publication, Copilot CLI also supports forms like:

```bash
copilot plugin install OWNER/REPO
copilot plugin install OWNER/REPO:PATH/TO/PLUGIN
```

To remove or update the plugin later:

```bash
copilot plugin update copilot-skills
copilot plugin uninstall copilot-skills
```

## Use in Claude Code

For local development and testing, load the repo directly as a plugin:

```bash
claude --plugin-dir ./copilot-skills
```

Inside Claude Code, reload changes with:

```text
/reload-plugins
```

The skills are namespaced by the plugin name, so expect forms like:

```text
/copilot-skills:parallel-implementation-loop
```

Claude plugins are also versioned and shareable, so this repo keeps the Claude metadata in `.claude-plugin/plugin.json` instead of relying on ad hoc standalone `.claude/` copies.

## Plugin-native usage notes

These skills are designed to feel native in both plugin systems:

- shared `skills/` content is the single source of truth;
- manifests live where each runtime expects them;
- namespacing comes from the plugin name rather than custom installer logic;
- the repo can be loaded directly for local development and later published without changing the skill files.

Because both runtimes use plugin namespacing, prefer the plugin-qualified form when invoking skills manually.

## Publishing and distribution

For **GitHub Copilot CLI**, this repo now includes `.github/plugin/marketplace.json`, which can be used as marketplace metadata when you decide to distribute the plugin through a registered marketplace or a repository-backed catalog.

For **Claude Code**, distribution is plugin-manifest based. This repo includes `.claude-plugin/plugin.json` so it can be tested locally with `--plugin-dir` now and submitted to a Claude plugin marketplace later without restructuring.

## Development

Validate the plugin layout and publishing metadata with:

```bash
npm run validate:plugin
```
