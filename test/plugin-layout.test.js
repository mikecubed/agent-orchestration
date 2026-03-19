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

describe('plugin manifests', () => {
  it('defines a Copilot plugin manifest with the shared skills directory', () => {
    const manifest = readJson('plugin.json');

    assert.equal(manifest.name, 'copilot-skills');
    assert.deepEqual(manifest.skills, ['skills/']);
    assert.equal(manifest.version, '0.1.0');
    assert.equal(manifest.category, 'developer-tools');
    assert.ok(Array.isArray(manifest.tags));
  });

  it('defines a Claude plugin manifest with matching identity metadata', () => {
    const copilotManifest = readJson('plugin.json');
    const claudeManifest = readJson('.claude-plugin/plugin.json');

    assert.equal(claudeManifest.name, copilotManifest.name);
    assert.equal(claudeManifest.version, copilotManifest.version);
    assert.equal(claudeManifest.description, copilotManifest.description);
    assert.equal(claudeManifest.skills, './skills/');
  });
});

describe('marketplace metadata', () => {
  it('defines a Copilot marketplace entry that points at this plugin root', () => {
    const marketplace = readJson('.github/plugin/marketplace.json');
    const pluginEntry = marketplace.plugins.find((entry) => entry.name === 'copilot-skills');

    assert.equal(marketplace.name, 'copilot-skills-marketplace');
    assert.ok(pluginEntry, 'expected copilot-skills plugin entry');
    assert.equal(pluginEntry.source, '.');
    assert.deepEqual(pluginEntry.skills, ['skills/']);
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
      assert.match(text, /## Purpose/);
      assert.match(text, /## Project-Specific Inputs/);
    });
  }
});
