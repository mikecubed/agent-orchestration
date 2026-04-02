import { execFileSync } from 'node:child_process';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const WORKFLOW_ROOT = path.join(ROOT, 'plugins', 'workflow-orchestration');
const SDD_ROOT = path.join(ROOT, 'plugins', 'sdd-workflow');

function readJson(root, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
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

describe('agent-orchestration package', () => {
  it('defines the umbrella package metadata and aggregate validation scripts', () => {
    const packageManifest = readJson(ROOT, 'package.json');

    assert.equal(packageManifest.name, 'agent-orchestration');
    assert.equal(packageManifest.version, '0.5.0');
    assert.equal(packageManifest.scripts.test, 'node --test test/**/*.test.js && npm --prefix plugins/workflow-orchestration test');
    assert.equal(packageManifest.scripts['validate:runtime'], 'node scripts/verify-runtime.mjs');
  });
});

describe('agent-orchestration marketplace metadata', () => {
  it('defines a Copilot marketplace with workflow-orchestration and sdd-workflow entries', () => {
    const workflowManifest = readJson(WORKFLOW_ROOT, 'plugin.json');
    const marketplace = readJson(ROOT, '.github/plugin/marketplace.json');
    const workflowEntry = marketplace.plugins.find((entry) => entry.name === 'workflow-orchestration');
    const sddEntry = marketplace.plugins.find((entry) => entry.name === 'sdd-workflow');

    assert.equal(marketplace.name, 'agent-orchestration');
    assert.ok(workflowEntry, 'expected workflow-orchestration plugin entry');
    assert.equal(workflowEntry.source, 'plugins/workflow-orchestration');
    assert.deepEqual(workflowEntry.skills, ['skills/']);
    assert.equal(workflowEntry.version, workflowManifest.version);

    assert.ok(sddEntry, 'expected sdd-workflow plugin entry');
    assert.equal(sddEntry.source, 'plugins/sdd-workflow');
    assert.deepEqual(sddEntry.skills, ['copilot-skills/']);
    assert.equal(sddEntry.version, '0.2.0');
  });

  it('defines a Claude marketplace with workflow-orchestration and sdd-workflow entries', () => {
    const workflowManifest = readJson(WORKFLOW_ROOT, 'plugin.json');
    const marketplace = readJson(ROOT, '.claude-plugin/marketplace.json');
    const workflowEntry = marketplace.plugins.find((entry) => entry.name === 'workflow-orchestration');
    const sddEntry = marketplace.plugins.find((entry) => entry.name === 'sdd-workflow');

    assert.equal(marketplace.name, 'agent-orchestration');
    assert.ok(workflowEntry, 'expected workflow-orchestration plugin entry');
    assert.equal(workflowEntry.source, './plugins/workflow-orchestration');
    assert.equal(workflowEntry.skills, './skills/');
    assert.equal(workflowEntry.version, workflowManifest.version);

    assert.ok(sddEntry, 'expected sdd-workflow plugin entry');
    assert.equal(sddEntry.source, './plugins/sdd-workflow');
    assert.equal(sddEntry.skills, './skills/');
    assert.equal(sddEntry.version, '0.2.0');
  });
});

describe('umbrella bundle layout', () => {
  it('ships both plugin bundle roots and umbrella docs', () => {
    for (const relativePath of [
      'plugins/workflow-orchestration/package.json',
      'plugins/workflow-orchestration/plugin.json',
      'plugins/workflow-orchestration/.claude-plugin/plugin.json',
      'plugins/sdd-workflow/plugin.json',
      'plugins/sdd-workflow/.claude-plugin/plugin.json',
      'docs/marketplace-overview.md',
      'docs/install-guide.md',
      'docs/plugin-composition.md',
    ]) {
      assert.ok(fs.existsSync(path.join(ROOT, relativePath)), `expected ${relativePath}`);
    }
  });
});

describe('umbrella package contents', () => {
  it('includes marketplace metadata, umbrella docs, and both plugin bundles in the published tarball', () => {
    const files = readPackedFiles();

    assert.ok(files.includes('.github/plugin/marketplace.json'));
    assert.ok(files.includes('.claude-plugin/marketplace.json'));
    assert.ok(files.includes('README.md'));
    assert.ok(files.includes('LICENSE'));
    assert.ok(files.includes('docs/marketplace-overview.md'));
    assert.ok(files.includes('docs/install-guide.md'));
    assert.ok(files.includes('docs/plugin-composition.md'));
    assert.ok(files.includes('plugins/workflow-orchestration/plugin.json'));
    assert.ok(files.includes('plugins/workflow-orchestration/.claude-plugin/plugin.json'));
    assert.ok(files.includes('plugins/workflow-orchestration/skills/planning-orchestration/SKILL.md'));
    assert.ok(files.includes('plugins/sdd-workflow/plugin.json'));
    assert.ok(files.includes('plugins/sdd-workflow/.claude-plugin/plugin.json'));
    assert.ok(files.includes('plugins/sdd-workflow/commands/sdd.specify.md'));
  });
});

