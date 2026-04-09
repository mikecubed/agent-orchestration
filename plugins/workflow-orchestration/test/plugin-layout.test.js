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
    assert.equal(claudeManifest.skills, './skills/');
    assert.equal(packageManifest.version, copilotManifest.version);
    assert.equal(packageManifest.scripts['validate:runtime'], 'node ../../scripts/verify-runtime.mjs workflow-orchestration');
    assert.ok(fs.existsSync(path.resolve(ROOT, '..', '..', 'scripts', 'verify-runtime.mjs')));
  });
});

describe('workflow-orchestration skills layout', () => {
  const skills = [
    'planning-orchestration',
    'parallel-implementation-loop',
    'pr-review-resolution-loop',
    'final-pr-readiness-gate',
    'swarm-orchestration',
    'systematic-debugging',
    'map-codebase',
    'architecture-review',
    'brainstorm-ideation',
    'incident-rca',
    'e2e-test-generation',
    'contract-generator',
    'release-orchestration',
    'diff-review-orchestration',
    'git-worktree-orchestration',
    'knowledge-compound',
    'delivery-orchestration',
    'pr-publish-orchestration',
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

  it('keeps delivery-orchestration coordinator-shaped with explicit deflection and handoff contracts', () => {
    const text = readText(ROOT, path.join('skills', 'delivery-orchestration', 'SKILL.md'));
    const readme = readText(ROOT, 'README.md');

    assert.match(text, /## Post-Delivery Handoffs/);
    assert.match(text, /non-empty diff|non-empty delivered diff|non-empty diff — code, tests, configuration, or documentation/i);
    assert.match(text, /Runtime-native scoped implementer agent/);
    assert.match(text, /\/workflow-orchestration:diff-review-orchestration/);
    assert.match(text, /\/workflow-orchestration:knowledge-compound/);
    assert.match(text, /## Deflection Behavior/);
    assert.match(text, /\/workflow-orchestration:planning-orchestration/);
    assert.match(text, /\/workflow-orchestration:brainstorm-ideation/);
    assert.match(text, /\/workflow-orchestration:release-orchestration/);
    assert.match(text, /## Coordinator-Shape Contract/);
    assert.match(text, /\*\*No planning\*\*/);
    assert.match(text, /\*\*No release\*\*/);
    assert.match(readme, /Review any\s+non-empty delivered diff/i);
    assert.match(readme, /produced a non-empty diff/i);
  });

  it('keeps pr-publish-orchestration bounded to publication with readiness deflection', () => {
    const text = readText(ROOT, path.join('skills', 'pr-publish-orchestration', 'SKILL.md'));
    const templates = readText(ROOT, 'docs/workflow-artifact-templates.md');

    assert.match(text, /stops at PR creation or update/i);
    assert.match(text, /\/workflow-orchestration:final-pr-readiness-gate/);
    assert.match(text, /exact tree that will be published/i);
    assert.match(text, /\/workflow-orchestration:pr-review-resolution-loop/);
    assert.match(text, /\/workflow-orchestration:release-orchestration/);
    assert.match(text, /docs\/publish-summary-<topic>\.md/);
    assert.match(text, /Publish summary/);
    assert.doesNotMatch(text, /developer override/i);
    assert.match(templates, /## Publish summary/);
    assert.match(templates, /docs\/publish-summary-<topic>\.md/);
  });

  it('keeps diff-review-orchestration headless and autofix explicitly bounded', () => {
    const text = readText(ROOT, path.join('skills', 'diff-review-orchestration', 'SKILL.md'));

    assert.match(text, /This skill supports three modes/);
    assert.match(text, /\bHeadless mode\b/);
    assert.match(text, /mode:\s+headless/);
    assert.match(text, /no downstream routing/i);
    assert.match(text, /## Autofix Evaluation/);
    assert.match(text, /### Decision: Deferred/);
    assert.match(text, /Explicit opt-in/);
    assert.match(text, /final-gate-result:\s+stopped/);
  });
});

describe('workflow-orchestration package contents', () => {
  it('includes the plugin manifests, docs, and skills in the published tarball', () => {
    const files = readPackedFiles();

    assert.ok(files.includes('plugin.json'));
    assert.ok(files.includes('.claude-plugin/plugin.json'));
    assert.ok(files.includes('README.md'));
    assert.ok(files.includes('docs/models-config-template.md'));
    assert.ok(files.includes('docs/workflow-artifact-templates.md'));

    for (const skill of [
      'planning-orchestration',
      'parallel-implementation-loop',
      'pr-review-resolution-loop',
      'final-pr-readiness-gate',
      'swarm-orchestration',
      'systematic-debugging',
      'map-codebase',
      'architecture-review',
      'brainstorm-ideation',
      'incident-rca',
      'e2e-test-generation',
      'contract-generator',
      'release-orchestration',
      'diff-review-orchestration',
      'git-worktree-orchestration',
      'knowledge-compound',
      'delivery-orchestration',
      'pr-publish-orchestration',
    ]) {
      assert.ok(files.includes(`skills/${skill}/SKILL.md`));
    }
  });
});
