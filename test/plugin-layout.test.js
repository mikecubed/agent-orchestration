import { execFileSync } from 'node:child_process';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function frontmatterValue(text, key) {
  const match = text.match(new RegExp(`^${key}:\\s+(.+)$`, 'm'));
  return match?.[1];
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

describe('plugin manifests', () => {
  it('defines a Copilot plugin manifest with the shared skills directory', () => {
    const manifest = readJson('plugin.json');

    assert.equal(manifest.name, 'agent-workflow-skills');
    assert.deepEqual(manifest.skills, ['skills/']);
    assert.equal(manifest.version, '0.1.0');
    assert.equal(manifest.category, 'developer-tools');
    assert.ok(Array.isArray(manifest.tags));
  });

  it('defines a Claude plugin manifest with matching identity metadata', () => {
    const copilotManifest = readJson('plugin.json');
    const claudeManifest = readJson('.claude-plugin/plugin.json');
    const packageManifest = readJson('package.json');

    assert.equal(claudeManifest.name, copilotManifest.name);
    assert.equal(claudeManifest.version, copilotManifest.version);
    assert.equal(claudeManifest.description, copilotManifest.description);
    assert.equal(claudeManifest.skills, './skills/');
    assert.equal(packageManifest.version, copilotManifest.version);
    assert.equal(packageManifest.scripts['validate:runtime'], 'node scripts/verify-runtime.mjs');
    assert.ok(fs.existsSync(path.join(ROOT, 'scripts', 'verify-runtime.mjs')));
  });
});

describe('marketplace metadata', () => {
  it('defines a Copilot marketplace entry that points at this plugin root', () => {
    const copilotManifest = readJson('plugin.json');
    const marketplace = readJson('.github/plugin/marketplace.json');
    const pluginEntry = marketplace.plugins.find((entry) => entry.name === 'agent-workflow-skills');

    assert.equal(marketplace.name, 'agent-workflow-skills-marketplace');
    assert.ok(pluginEntry, 'expected agent-workflow-skills plugin entry');
    assert.equal(pluginEntry.source, '.');
    assert.deepEqual(pluginEntry.skills, ['skills/']);
    assert.equal(pluginEntry.version, copilotManifest.version);
    assert.equal(pluginEntry.description, copilotManifest.description);
    assert.equal(pluginEntry.category, copilotManifest.category);
    assert.deepEqual(pluginEntry.tags, copilotManifest.tags);
  });
});

describe('shared skills layout', () => {
  const skills = [
    'parallel-implementation-loop',
    'pr-review-resolution-loop',
    'final-pr-readiness-gate',
  ];

  for (const skill of skills) {
    it(`provides ${skill} as a shared plugin skill`, () => {
      const relativePath = path.join('skills', skill, 'SKILL.md');
      const text = readText(relativePath);

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
    });
  }
});

describe('package contents', () => {
  it('includes the required plugin files in the published tarball', () => {
    const files = readPackedFiles();

    assert.ok(files.includes('plugin.json'));
    assert.ok(files.includes('.claude-plugin/plugin.json'));
    assert.ok(files.includes('.github/plugin/marketplace.json'));
    assert.ok(files.includes('README.md'));
    assert.ok(files.includes('LICENSE'));

    for (const skill of [
      'parallel-implementation-loop',
      'pr-review-resolution-loop',
      'final-pr-readiness-gate',
    ]) {
      assert.ok(files.includes(`skills/${skill}/SKILL.md`));
    }
  });
});
