import { execFileSync } from 'node:child_process';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

function readJson(root, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function readText(root, relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

let packedFiles;

function readPackedFiles() {
  if (packedFiles) {
    return packedFiles;
  }

  const output = execFileSync('npm', ['pack', '--json', '--dry-run'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  const [packResult] = JSON.parse(output);

  packedFiles = packResult.files.map((file) => file.path);
  return packedFiles;
}

describe('ccc manifests', () => {
  it('defines Copilot and Claude manifests with aligned identity metadata', () => {
    const copilotManifest = readJson(ROOT, 'plugin.json');
    const claudeManifest = readJson(ROOT, '.claude-plugin/plugin.json');
    const packageManifest = readJson(ROOT, 'package.json');

    assert.equal(copilotManifest.name, 'ccc');
    assert.equal(claudeManifest.name, copilotManifest.name);
    assert.equal(claudeManifest.version, copilotManifest.version);
    assert.equal(packageManifest.version, copilotManifest.version);
    assert.deepEqual(copilotManifest.skills, ['skills/']);
    assert.equal(copilotManifest.agents, 'agents/');
    assert.equal(claudeManifest.skills, './skills/');
  });
});

describe('ccc runtime surfaces', () => {
  it('ships the command, agent, skills, references, scripts, and hooks required by the current Codex bundle', () => {
    for (const relativePath of [
      'commands/codex.md',
      'agents/ccc.agent.md',
      'skills/conductor/SKILL.md',
      'skills/conductor/shared-contracts.md',
      'skills/tdd-check/SKILL.md',
      'skills/type-check/SKILL.md',
      'skills/naming-check/SKILL.md',
      'skills/resilience-check/SKILL.md',
      'skills/a11y-check/SKILL.md',
      'skills/docs-check/SKILL.md',
      'skills/i18n-check/SKILL.md',
      'skills/ctx-check/SKILL.md',
      'skills/type-check/references/typescript.md',
      'skills/tdd-check/references/python.md',
      'skills/naming-check/references/go.md',
      'scripts/dep_audit.sh',
      'scripts/lint_dead_code.py',
      'scripts/scan_secrets.sh',
      'hooks/scripts/hook-sec-bash.sh',
      'hooks/patterns/bash-injection.txt',
      'gh-hooks/hooks.json',
      'docs/hooks.md',
    ]) {
      assert.ok(fs.existsSync(path.join(ROOT, relativePath)), `expected ${relativePath}`);
    }
  });

  it('keeps the Codex command and conductor skill content present', () => {
    const commandText = readText(ROOT, 'commands/codex.md');
    const conductorText = readText(ROOT, 'skills/conductor/SKILL.md');

    assert.match(commandText, /Run the Clean Code Codex conductor/i);
    assert.match(conductorText, /name:\s*conductor/);
  });
});

describe('ccc package contents', () => {
  it('includes the required runtime files in the published tarball', () => {
    const files = readPackedFiles();

    for (const relativePath of [
      'plugin.json',
      '.claude-plugin/plugin.json',
      'README.md',
      'commands/codex.md',
      'agents/ccc.agent.md',
      'skills/conductor/SKILL.md',
      'skills/type-check/references/typescript.md',
      'scripts/dep_audit.sh',
      'hooks/scripts/hook-sec-bash.sh',
      'gh-hooks/hooks.json',
      'docs/hooks.md',
    ]) {
      assert.ok(files.includes(relativePath), `expected packed file ${relativePath}`);
    }
  });
});
