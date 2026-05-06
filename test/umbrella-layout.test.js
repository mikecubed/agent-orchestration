import { execFileSync } from 'node:child_process';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const FLOW_ROOT = path.join(ROOT, 'plugins', 'flow');
const CCC_ROOT = path.join(ROOT, 'plugins', 'ccc');
const PATTERNS_ROOT = path.join(ROOT, 'plugins', 'patterns');

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
    const flowManifest = readJson(FLOW_ROOT, 'plugin.json');
    const copilotMarketplace = readJson(ROOT, '.github/plugin/marketplace.json');
    const claudeMarketplace = readJson(ROOT, '.claude-plugin/marketplace.json');

    assert.equal(packageManifest.name, 'agent-orchestration');
    assert.equal(copilotMarketplace.metadata.version, packageManifest.version);
    assert.equal(claudeMarketplace.metadata.version, packageManifest.version);
    assert.equal(copilotMarketplace.plugins[0].version, flowManifest.version);
    assert.equal(claudeMarketplace.plugins[0].version, flowManifest.version);
    assert.equal(packageManifest.scripts.test, 'node --test test/**/*.test.js && npm --prefix plugins/flow test && npm --prefix plugins/ccc test && npm --prefix plugins/patterns test');
    assert.equal(packageManifest.scripts['validate:runtime'], 'node scripts/verify-runtime.mjs');
  });
});

describe('agent-orchestration marketplace metadata', () => {
  it('defines a Copilot marketplace with flow, ccc, and patterns entries', () => {
    const flowManifest = readJson(FLOW_ROOT, 'plugin.json');
    const cccManifest = readJson(CCC_ROOT, 'plugin.json');
    const patternsManifest = readJson(PATTERNS_ROOT, 'plugin.json');
    const marketplace = readJson(ROOT, '.github/plugin/marketplace.json');
    const flowEntry = marketplace.plugins.find((entry) => entry.name === 'flow');
    const cccEntry = marketplace.plugins.find((entry) => entry.name === 'ccc');
    const patternsEntry = marketplace.plugins.find((entry) => entry.name === 'patterns');

    assert.equal(marketplace.name, 'agent-orchestration');
    assert.ok(flowEntry, 'expected flow plugin entry');
    assert.equal(flowEntry.source, 'plugins/flow');
    assert.deepEqual(flowEntry.skills, ['skills/']);
    assert.equal(flowEntry.agents, 'agents/');
    assert.equal(flowEntry.version, flowManifest.version);

    assert.ok(cccEntry, 'expected ccc plugin entry');
    assert.equal(cccEntry.source, 'plugins/ccc');
    assert.deepEqual(cccEntry.skills, ['skills/']);
    assert.equal(cccEntry.agents, 'agents/');
    assert.equal(cccEntry.version, cccManifest.version);

    assert.ok(patternsEntry, 'expected patterns plugin entry');
    assert.equal(patternsEntry.source, 'plugins/patterns');
    assert.deepEqual(patternsEntry.skills, ['skills/']);
    assert.equal(patternsEntry.version, patternsManifest.version);
  });

  it('defines a Claude marketplace with flow, ccc, and patterns entries', () => {
    const flowManifest = readJson(FLOW_ROOT, 'plugin.json');
    const cccManifest = readJson(CCC_ROOT, 'plugin.json');
    const patternsManifest = readJson(PATTERNS_ROOT, 'plugin.json');
    const marketplace = readJson(ROOT, '.claude-plugin/marketplace.json');
    const flowEntry = marketplace.plugins.find((entry) => entry.name === 'flow');
    const cccEntry = marketplace.plugins.find((entry) => entry.name === 'ccc');
    const patternsEntry = marketplace.plugins.find((entry) => entry.name === 'patterns');

    assert.equal(marketplace.name, 'agent-orchestration');
    assert.ok(flowEntry, 'expected flow plugin entry');
    assert.equal(flowEntry.source, './plugins/flow');
    assert.equal(flowEntry.skills, './skills/');
    assert.equal(flowEntry.version, flowManifest.version);

    assert.ok(cccEntry, 'expected ccc plugin entry');
    assert.equal(cccEntry.source, './plugins/ccc');
    assert.equal(cccEntry.skills, './skills/');
    assert.equal(cccEntry.version, cccManifest.version);

    assert.ok(patternsEntry, 'expected patterns plugin entry');
    assert.equal(patternsEntry.source, './plugins/patterns');
    assert.equal(patternsEntry.skills, './skills/');
    assert.equal(patternsEntry.version, patternsManifest.version);
  });
});

describe('umbrella bundle layout', () => {
  it('ships all plugin bundle roots and umbrella docs', () => {
    for (const relativePath of [
      'plugins/flow/package.json',
      'plugins/flow/plugin.json',
      'plugins/flow/.claude-plugin/plugin.json',
      'plugins/ccc/package.json',
      'plugins/ccc/plugin.json',
      'plugins/ccc/.claude-plugin/plugin.json',
      'plugins/patterns/package.json',
      'plugins/patterns/plugin.json',
      'plugins/patterns/.claude-plugin/plugin.json',
      'docs/marketplace-overview.md',
      'docs/install-guide.md',
      'docs/plugin-composition.md',
    ]) {
      assert.ok(fs.existsSync(path.join(ROOT, relativePath)), `expected ${relativePath}`);
    }
  });
});

describe('umbrella package contents', () => {
  it('includes marketplace metadata, umbrella docs, and all plugin bundles in the published tarball', () => {
    const files = readPackedFiles();

    assert.ok(files.includes('.github/plugin/marketplace.json'));
    assert.ok(files.includes('.claude-plugin/marketplace.json'));
    assert.ok(files.includes('README.md'));
    assert.ok(files.includes('LICENSE'));
    assert.ok(files.includes('docs/marketplace-overview.md'));
    assert.ok(files.includes('docs/install-guide.md'));
    assert.ok(files.includes('docs/plugin-composition.md'));
    assert.ok(files.includes('plugins/flow/plugin.json'));
    assert.ok(files.includes('plugins/flow/.claude-plugin/plugin.json'));
    assert.ok(files.includes('plugins/flow/skills/plan/SKILL.md'));
    assert.ok(files.includes('plugins/ccc/plugin.json'));
    assert.ok(files.includes('plugins/ccc/.claude-plugin/plugin.json'));
    assert.ok(files.includes('plugins/ccc/commands/codex.md'));
    assert.ok(files.includes('plugins/ccc/skills/conductor/SKILL.md'));
    assert.ok(files.includes('plugins/patterns/plugin.json'));
    assert.ok(files.includes('plugins/patterns/.claude-plugin/plugin.json'));
  });
});
