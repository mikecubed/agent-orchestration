import { execFileSync } from 'node:child_process';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const SDD_ROOT = path.join(ROOT, 'plugins', 'sdd-workflow');

function readJson(root, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function readText(root, relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function readFrontmatter(text) {
  const normalizedText = text.replace(/\r\n/g, '\n');
  const match = normalizedText.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);

  assert.ok(match, 'expected YAML frontmatter block');

  const values = new Map();

  for (const line of match[1].split('\n')) {
    const keyValueMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.+)$/);

    if (keyValueMatch) {
      values.set(keyValueMatch[1], keyValueMatch[2].trim());
    }
  }

  return values;
}

function frontmatterValue(text, key) {
  return readFrontmatter(text).get(key);
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

describe('workflow-orchestration manifests', () => {
  it('defines a Copilot plugin manifest for workflow-orchestration', () => {
    const manifest = readJson(ROOT, 'plugin.json');
    const packageManifest = readJson(ROOT, 'package.json');

    assert.equal(manifest.name, 'workflow-orchestration');
    assert.deepEqual(manifest.skills, ['skills/']);
    assert.equal(manifest.version, packageManifest.version);
    assert.equal(manifest.category, 'developer-tools');
    assert.ok(Array.isArray(manifest.tags));
  });

  it('defines a Claude plugin manifest with matching identity metadata', () => {
    const copilotManifest = readJson(ROOT, 'plugin.json');
    const claudeManifest = readJson(ROOT, '.claude-plugin/plugin.json');
    const packageManifest = readJson(ROOT, 'package.json');

    assert.equal(claudeManifest.name, copilotManifest.name);
    assert.equal(claudeManifest.version, copilotManifest.version);
    assert.equal(claudeManifest.description, copilotManifest.description);
    assert.equal(claudeManifest.category, copilotManifest.category);
    assert.deepEqual(claudeManifest.tags, copilotManifest.tags);
    assert.equal(claudeManifest.skills, './skills/');
    assert.equal(packageManifest.version, copilotManifest.version);
    assert.equal(packageManifest.scripts['validate:runtime'], 'node scripts/verify-runtime.mjs');
    assert.ok(fs.existsSync(path.join(ROOT, 'scripts', 'verify-runtime.mjs')));
  });
});

describe('agent-orchestration marketplace metadata', () => {
  it('defines a Copilot marketplace with workflow-orchestration and sdd-workflow entries', () => {
    const workflowManifest = readJson(ROOT, 'plugin.json');
    const marketplace = readJson(ROOT, '.github/plugin/marketplace.json');
    const workflowEntry = marketplace.plugins.find((entry) => entry.name === 'workflow-orchestration');
    const sddEntry = marketplace.plugins.find((entry) => entry.name === 'sdd-workflow');

    assert.equal(marketplace.name, 'agent-orchestration');
    assert.equal(marketplace.owner.name, workflowManifest.author.name);
    assert.equal(marketplace.metadata.version, workflowManifest.version);

    assert.ok(workflowEntry, 'expected workflow-orchestration plugin entry');
    assert.equal(workflowEntry.source, '.');
    assert.deepEqual(workflowEntry.skills, ['skills/']);
    assert.equal(workflowEntry.version, workflowManifest.version);

    assert.ok(sddEntry, 'expected sdd-workflow plugin entry');
    assert.equal(sddEntry.source, 'plugins/sdd-workflow');
    assert.deepEqual(sddEntry.skills, ['copilot-skills/']);
    assert.equal(sddEntry.version, '0.2.0');
  });

  it('defines a Claude marketplace with workflow-orchestration and sdd-workflow entries', () => {
    const workflowManifest = readJson(ROOT, 'plugin.json');
    const marketplace = readJson(ROOT, '.claude-plugin/marketplace.json');
    const workflowEntry = marketplace.plugins.find((entry) => entry.name === 'workflow-orchestration');
    const sddEntry = marketplace.plugins.find((entry) => entry.name === 'sdd-workflow');

    assert.equal(marketplace.name, 'agent-orchestration');
    assert.equal(marketplace.owner.name, workflowManifest.author.name);
    assert.equal(marketplace.metadata.version, workflowManifest.version);

    assert.ok(workflowEntry, 'expected workflow-orchestration plugin entry');
    assert.equal(workflowEntry.source, './');
    assert.equal(workflowEntry.skills, './skills/');
    assert.equal(workflowEntry.version, workflowManifest.version);

    assert.ok(sddEntry, 'expected sdd-workflow plugin entry');
    assert.equal(sddEntry.source, './plugins/sdd-workflow');
    assert.equal(sddEntry.skills, './skills/');
    assert.equal(sddEntry.version, '0.2.0');
  });
});

describe('workflow-orchestration skills layout', () => {
  const skills = [
    'planning-orchestration',
    'parallel-implementation-loop',
    'pr-review-resolution-loop',
    'final-pr-readiness-gate',
  ];

  for (const skill of skills) {
    it(`provides ${skill} as a shared plugin skill`, () => {
      const relativePath = path.join('skills', skill, 'SKILL.md');
      const text = readText(ROOT, relativePath);

      assert.match(text, /^---\nname: /);
      assert.match(text, /\ndescription: /);
      assert.equal(frontmatterValue(text, 'name'), skill);
      assert.match(text, /## Purpose/);
      assert.match(text, /## When to Use It/);
      assert.match(text, /## Project-Specific Inputs/);
      assert.match(text, /## Workflow/);
      assert.match(text, /## Required Gates/);
      assert.match(text, /## Stop Conditions/);
      assert.match(text, /## Example/);
      assert.match(text, /factual\s+(brief|context|facts)/i,
        `${skill} should reference factual brief or shared facts language`);
      assert.match(text, /\brescue\b/i,
        `${skill} should reference rescue policy`);
      assert.match(text, /\bdurable\b[\s\S]{1,80}\b(?:artifact|report|summary)\b/,
        `${skill} should reference durable artifacts or reports`);
      assert.match(text,
        /(?:persistent\s+team|squad|fleet)[\s\S]{0,120}out of scope|out of scope[\s\S]{0,120}(?:persistent\s+team|squad|fleet)/i,
        `${skill} should scope out persistent team, squad, or fleet orchestration`);
    });
  }
});

describe('sdd-workflow plugin bundle', () => {
  it('defines the Copilot and Claude manifests', () => {
    const copilotManifest = readJson(SDD_ROOT, 'plugin.json');
    const claudeManifest = readJson(SDD_ROOT, '.claude-plugin/plugin.json');

    assert.equal(copilotManifest.name, 'sdd-workflow');
    assert.equal(copilotManifest.agents, 'agents/');
    assert.deepEqual(copilotManifest.skills, ['copilot-skills/']);
    assert.equal(claudeManifest.name, 'sdd-workflow');
    assert.equal(copilotManifest.version, claudeManifest.version);
  });

  it('ships the minimal runtime SDD command and skill surfaces', () => {
    for (const relativePath of [
      'commands/sdd.specify.md',
      'commands/sdd.plan.md',
      'commands/sdd.tasks.md',
      'agents/sdd.specify.md',
      'agents/sdd.plan.md',
      'agents/sdd.tasks.md',
      'skills/sdd-feature-workflow/SKILL.md',
      'copilot-skills/sdd-feature-workflow/SKILL.md',
    ]) {
      assert.ok(fs.existsSync(path.join(SDD_ROOT, relativePath)), `expected ${relativePath}`);
    }
  });
});

describe('package contents', () => {
  it('includes the required workflow-orchestration and marketplace files in the published tarball', () => {
    const files = readPackedFiles();

    assert.ok(files.includes('plugin.json'));
    assert.ok(files.includes('.claude-plugin/plugin.json'));
    assert.ok(files.includes('.claude-plugin/marketplace.json'));
    assert.ok(files.includes('.github/plugin/marketplace.json'));
    assert.ok(files.includes('README.md'));
    assert.ok(files.includes('LICENSE'));
    assert.ok(files.includes('plugins/sdd-workflow/plugin.json'));
    assert.ok(files.includes('plugins/sdd-workflow/.claude-plugin/plugin.json'));
    assert.ok(files.includes('plugins/sdd-workflow/commands/sdd.specify.md'));
    assert.ok(files.includes('plugins/sdd-workflow/skills/sdd-feature-workflow/SKILL.md'));

    for (const skill of [
      'planning-orchestration',
      'parallel-implementation-loop',
      'pr-review-resolution-loop',
      'final-pr-readiness-gate',
    ]) {
      assert.ok(files.includes(`skills/${skill}/SKILL.md`));
    }
  });
});
