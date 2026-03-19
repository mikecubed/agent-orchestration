# agent-workflow-skills

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
copilot plugin install ./agent-workflow-skills
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
copilot plugin update agent-workflow-skills
copilot plugin uninstall agent-workflow-skills
```

## Use in Claude Code

For local development and testing, load the repo directly as a plugin:

```bash
claude --plugin-dir ./agent-workflow-skills
```

Inside Claude Code, reload changes with:

```text
/reload-plugins
```

The skills are namespaced by the plugin name, so expect forms like:

```text
/agent-workflow-skills:parallel-implementation-loop
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

Verify the runtime integration without touching your normal plugin state with:

```bash
npm run validate:runtime
```

That command:

- installs the Copilot plugin into a temporary config directory, checks that the plugin and skills appear, then removes it again;
- validates the Claude plugin manifest and then loads the plugin in a session-only Claude run;
- exercises real CLI/plugin loading, so it may consume model requests and requires authenticated CLIs.

Before publishing, verify the packaged artifact surface with:

```bash
npm pack --dry-run
```

When editing skills:

1. update the relevant `skills/<skill-name>/SKILL.md` file;
2. keep the `name` frontmatter aligned with the directory name;
3. keep the required sections intact so the shared layout tests continue to pass;
4. reload the plugin in Claude Code with `/reload-plugins` when testing locally.

When adding a new shared skill:

1. create `skills/<skill-name>/SKILL.md`;
2. add the skill directory name to `test/plugin-layout.test.js`;
3. run `npm test` before opening a pull request.

Manifest path conventions are intentionally different across runtimes:

- `plugin.json` uses `["skills/"]` because Copilot CLI accepts component paths as a string or array.
- `.claude-plugin/plugin.json` uses `"./skills/"` because Claude plugin custom paths are relative to the plugin root and start with `./`.

For repository-specific contributor guidance, see:

- `CONTRIBUTING.md`
- `CHANGELOG.md`
- `CLAUDE.md`
- `.github/copilot-instructions.md`
- `docs/workflow-artifact-templates.md`
