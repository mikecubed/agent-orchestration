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
    'idea-to-done-orchestration',
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
    'knowledge-refresh',
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

  it('keeps delivery-orchestration coordinator-shaped with explicit direct-path, deflection, and handoff contracts', () => {
    const text = readText(ROOT, path.join('skills', 'delivery-orchestration', 'SKILL.md'));
    const readme = readText(ROOT, 'README.md');
    const guide = readText(ROOT, path.join('docs', 'workflow-usage-guide.md'));
    const templates = readText(ROOT, path.join('docs', 'workflow-artifact-templates.md'));

    assert.match(text, /## Post-Delivery Handoffs/);
    assert.match(text, /non-empty diff|non-empty delivered diff|non-empty diff — code, tests, configuration, or documentation/i);
    assert.match(text, /Runtime-native scoped implementer agent/);
    assert.match(text, /### Direct execution contract/);
    assert.match(text, /artifact-sinks\.track-reports/);
    assert.match(text, /Validation outcome:\s+pass \| fail \| partial \| not-run/);
    assert.match(text, /\/workflow-orchestration:diff-review-orchestration/);
    assert.match(text, /\/workflow-orchestration:knowledge-compound/);
    assert.match(text, /## Deflection Behavior/);
    assert.match(text, /## Direct-Route Rescue and Reroute Contract/);
    assert.match(text, /\/workflow-orchestration:planning-orchestration/);
    assert.match(text, /\/workflow-orchestration:brainstorm-ideation/);
    assert.match(text, /\/workflow-orchestration:release-orchestration/);
    assert.match(text, /## Coordinator-Shape Contract/);
    assert.match(text, /\*\*No planning\*\*/);
    assert.match(text, /\*\*No release\*\*/);
    assert.match(templates, /## Direct execution outcome report/);
    assert.match(templates, /\.workflow-orchestration\/artifacts\/direct-execution-<topic>\.md/);
    assert.match(readme, /Review any\s+non-empty delivered diff/i);
    assert.match(readme, /direct-execution report/i);
    assert.match(guide, /direct-execution report/i);
  });

  it('adds idea-to-done-orchestration as a bounded full-loop conductor over the specialist workflows', () => {
    const text = readText(ROOT, path.join('skills', 'idea-to-done-orchestration', 'SKILL.md'));
    const readme = readText(ROOT, 'README.md');
    const guide = readText(ROOT, path.join('docs', 'workflow-usage-guide.md'));
    const templates = readText(ROOT, path.join('docs', 'workflow-artifact-templates.md'));
    const state = readText(ROOT, path.join('docs', 'workflow-state-contract.md'));

    assert.match(text, /\bmanual\b/);
    assert.match(text, /\bguided\b/);
    assert.match(text, /\bauto\b/);
    assert.match(text, /Continuation entry contract/);
    assert.match(text, /next-ready decision matrix/i);
    assert.match(text, /resume-assessment/);
    assert.match(text, /\.workflow-orchestration\/state\.json/);
    assert.match(text, /automation\.progression/);
    assert.match(text, /automation\.stop-for-human/);
    assert.match(text, /\/workflow-orchestration:planning-orchestration/);
    assert.match(text, /\/workflow-orchestration:delivery-orchestration/);
    assert.match(text, /\/workflow-orchestration:diff-review-orchestration/);
    assert.match(text, /\/workflow-orchestration:final-pr-readiness-gate/);
    assert.match(text, /\/workflow-orchestration:pr-publish-orchestration/);
    assert.match(text, /merge-monitoring/);
    assert.match(text, /merge-waiting-human/);
    assert.match(text, /merge-complete/);
    assert.match(text, /release-entry/);
    assert.match(text, /release-blocked/);
    assert.match(text, /release-skipped/);
    assert.match(text, /closeout-summarizing/);
    assert.match(text, /closeout-complete/);
    assert.match(text, /closeout-partial/);
    assert.match(text, /closeout-stale/);
    assert.match(text, /completion summary/i);
    assert.match(text, /release-aware repository/i);
    assert.match(text, /non-release-aware repository/i);
    assert.match(text, /\/workflow-orchestration:release-orchestration/);
    assert.match(text, /\/workflow-orchestration:knowledge-compound/);
    assert.match(text, /\/workflow-orchestration:knowledge-refresh/);
    assert.match(text, /requirements are still unclear/i);
    assert.match(text, /readiness has not been achieved/i);
    assert.match(text, /release or merge policy/i);
    assert.match(text, /workspace mismatch/i);
    assert.match(text, /lifecycle-owner mismatch/i);
    assert.match(text, /invalidated by later tree changes/i);
    assert.match(text, /\.workflow-orchestration\/artifacts\/conductor-summary-<topic>\.md/);
    assert.match(text, /\.workflow-orchestration\/artifacts\/completion-summary-<topic>\.md/);
    assert.match(templates, /## Conductor lifecycle summary/);
    assert.match(templates, /\.workflow-orchestration\/artifacts\/conductor-summary-<topic>\.md/);
    assert.match(templates, /## Completion summary/);
    assert.match(templates, /\.workflow-orchestration\/artifacts\/completion-summary-<topic>\.md/);
    assert.match(state, /closeout-assessing/);
    assert.match(state, /merge-monitoring/);
    assert.match(state, /release-entry/);
    assert.match(state, /closeout-complete/);
    assert.match(state, /closeout-partial/);
    assert.match(state, /closeout-stale/);
    assert.match(state, /invalidated release evidence/i);
    assert.match(readme, /\/workflow-orchestration:idea-to-done-orchestration/);
    assert.match(readme, /resume after review comments/i);
    assert.match(readme, /resume after failed readiness/i);
    assert.match(readme, /publish still needs human action/i);
    assert.match(readme, /published but not merged/i);
    assert.match(readme, /release-aware repository/i);
    assert.match(readme, /non-release-aware repository/i);
    assert.match(guide, /idea-to-done-orchestration/);
    assert.match(guide, /resume after review comments/i);
    assert.match(guide, /resume after failed readiness/i);
    assert.match(guide, /publish still needs human action/i);
    assert.match(guide, /published but not merged/i);
    assert.match(guide, /release-aware repository/i);
    assert.match(guide, /non-release-aware repository/i);
    assert.doesNotMatch(guide, /does \*\*not\*\* yet provide one opt-in workflow/i);
    assert.doesNotMatch(guide, /Phase 4 continuation behavior remains intentionally separate/i);
  });

  it('keeps pr-publish-orchestration bounded to publication with readiness deflection', () => {
    const text = readText(ROOT, path.join('skills', 'pr-publish-orchestration', 'SKILL.md'));
    const templates = readText(ROOT, 'docs/workflow-artifact-templates.md');

    assert.match(text, /stops at PR creation or update/i);
    assert.match(text, /\/workflow-orchestration:final-pr-readiness-gate/);
    assert.match(text, /exact tree that will be published/i);
    assert.match(text, /\/workflow-orchestration:pr-review-resolution-loop/);
    assert.match(text, /\/workflow-orchestration:release-orchestration/);
    assert.match(text, /\.workflow-orchestration\/artifacts\/publish-summary-<topic>\.md/);
    assert.match(text, /Publish summary/);
    assert.doesNotMatch(text, /developer override/i);
    assert.match(templates, /## Publish summary/);
    assert.match(templates, /\.workflow-orchestration\/artifacts\/publish-summary-<topic>\.md/);
  });

  it('keeps pr-review-resolution-loop skeptical about review comments and records verdicts separately from actions', () => {
    const text = readText(ROOT, path.join('skills', 'pr-review-resolution-loop', 'SKILL.md'));
    const readme = readText(ROOT, 'README.md');
    const guide = readText(ROOT, path.join('docs', 'workflow-usage-guide.md'));
    const templates = readText(ROOT, path.join('docs', 'workflow-artifact-templates.md'));

    assert.match(text, /hypothesis until verified/i);
    assert.match(text, /\bevidence verdict\b/i);
    assert.match(text, /\bpartially valid\b/i);
    assert.match(text, /false positive/i);
    assert.match(text, /\bnoise\b/i);
    assert.match(text, /suggested patch blindly|suggested fix/i);
    assert.match(text, /automated PR reviewers|agent-produced analysis/i);
    assert.match(text, /implement only the verified issue/i);
    assert.match(text, /recorded evidence verdict/i);
    assert.match(templates, /<valid \/ partially valid \/ false positive \/ noise \/ stale>/);
    assert.match(text, /commit and push by default when the branch changed/i);
    assert.match(text, /replying.*resolving\s*\/\s*closing|reply and a matching resolve/i);
    assert.match(text, /brief chat summary/i);
    assert.match(templates, /Thread status:/);
    assert.match(templates, /Publish status:/);
    assert.match(readme, /skeptically triages and verifies each comment/i);
    assert.match(readme, /by default commits and pushes the branch\s+update/i);
    assert.match(guide, /skeptical triage, verified fixes, replies, thread resolution/i);
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

  it('documents shared-defaults adoption in the planning, delivery, diff-review, publish, and knowledge workflows', () => {
    const planning = readText(ROOT, path.join('skills', 'planning-orchestration', 'SKILL.md'));
    const delivery = readText(ROOT, path.join('skills', 'delivery-orchestration', 'SKILL.md'));
    const diffReview = readText(ROOT, path.join('skills', 'diff-review-orchestration', 'SKILL.md'));
    const publish = readText(ROOT, path.join('skills', 'pr-publish-orchestration', 'SKILL.md'));
    const knowledge = readText(ROOT, path.join('skills', 'knowledge-compound', 'SKILL.md'));

    assert.match(planning, /docs\/workflow-defaults-contract\.md/);
    assert.match(planning, /artifact sink/i);
    assert.match(delivery, /docs\/workflow-defaults-contract\.md/);
    assert.match(delivery, /artifact-sinks\.track-reports/);
    assert.match(delivery, /review\.mode/);
    assert.match(diffReview, /docs\/workflow-defaults-contract\.md/);
    assert.match(diffReview, /preferred review mode|review mode/i);
    assert.match(publish, /docs\/workflow-defaults-contract\.md/);
    assert.match(publish, /publish summary/i);
    assert.match(knowledge, /docs\/workflow-defaults-contract\.md/);
    assert.match(knowledge, /configured default/i);
  });

  it('keeps knowledge-refresh coordinator-shaped with candidate classification, progression modes, stop conditions, and state boundaries', () => {
    const text = readText(ROOT, path.join('skills', 'knowledge-refresh', 'SKILL.md'));
    const readme = readText(ROOT, 'README.md');
    const guide = readText(ROOT, path.join('docs', 'workflow-usage-guide.md'));
    const templates = readText(ROOT, path.join('docs', 'workflow-artifact-templates.md'));
    const state = readText(ROOT, path.join('docs', 'workflow-state-contract.md'));

    assert.match(text, /\bmanual\b/);
    assert.match(text, /\bguided\b/);
    assert.match(text, /\bauto\b/);
    assert.match(text, /\.workflow-orchestration\/state\.json/);
    assert.match(text, /\.workflow-orchestration\/defaults\.json/);
    assert.match(text, /\btrusted\b/);
    assert.match(text, /\bstale\b/);
    assert.match(text, /\bduplicate\b/);
    assert.match(text, /\bobsolete\b/);
    assert.match(text, /\bsuperseded\b/);
    assert.match(text, /\bneeds-capture\b/);
    assert.match(text, /\/workflow-orchestration:knowledge-compound/);
    assert.match(text, /\/workflow-orchestration:architecture-review/);
    assert.match(text, /refresh-assessing/);
    assert.match(text, /refresh-candidates-confirmed/);
    assert.match(text, /refresh-planned/);
    assert.match(text, /refresh-updating/);
    assert.match(text, /refresh-validating/);
    assert.match(text, /refresh-blocked/);
    assert.match(text, /refresh-complete/);
    assert.match(text, /\.workflow-orchestration\/artifacts\/refresh-summary-<topic>\.md/);
    assert.match(text, /docs\/workflow-artifact-templates\.md/);
    assert.match(text, /docs\/workflow-state-contract\.md/);
    assert.match(text, /docs\/workflow-defaults-contract\.md/);
    assert.match(templates, /## Refresh summary/);
    assert.match(templates, /\.workflow-orchestration\/artifacts\/refresh-summary-<topic>\.md/);
    assert.match(state, /knowledge-refresh/);
    assert.match(readme, /\/workflow-orchestration:knowledge-refresh/);
    assert.match(readme, /knowledge-refresh/);
    assert.match(guide, /knowledge-refresh/);
  });

  it('makes the capture-vs-refresh boundary explicit in knowledge-compound', () => {
    const text = readText(ROOT, path.join('skills', 'knowledge-compound', 'SKILL.md'));

    assert.match(text, /capture.*workflow/i);
    assert.match(text, /\/workflow-orchestration:knowledge-refresh/);
    assert.match(text, /capture-vs-refresh boundary|capture.*refresh.*boundary/i);
  });

  it('makes prior-learning lookup refresh-aware in planning and diff-review', () => {
    const planning = readText(ROOT, path.join('skills', 'planning-orchestration', 'SKILL.md'));
    const diffReview = readText(ROOT, path.join('skills', 'diff-review-orchestration', 'SKILL.md'));

    assert.match(planning, /refresh-aware/i);
    assert.match(planning, /canonical/i);
    assert.match(planning, /suppress.*retired|retired.*suppress/i);
    assert.match(planning, /fall\s*back.*clean/i);
    assert.match(diffReview, /refresh-aware/i);
    assert.match(diffReview, /canonical/i);
    assert.match(diffReview, /suppress.*retired|retired.*suppress/i);
    assert.match(diffReview, /fall\s*back.*clean/i);
  });

  it('adds optional refresh routing to the idea-to-done conductor', () => {
    const text = readText(ROOT, path.join('skills', 'idea-to-done-orchestration', 'SKILL.md'));

    assert.match(text, /\/workflow-orchestration:knowledge-refresh/);
    assert.match(text, /refresh.*advisory|advisory.*refresh/i);
    assert.match(text, /never mandatory|never.*block.*lifecycle/i);
  });

  it('publishes the workflow defaults and durable state contracts with the session boundary update', () => {
    const defaults = readText(ROOT, path.join('docs', 'workflow-defaults-contract.md'));
    const state = readText(ROOT, path.join('docs', 'workflow-state-contract.md'));
    const sessionSchema = readText(ROOT, path.join('docs', 'session-md-schema.md'));

    assert.match(defaults, /\.workflow-orchestration\/defaults\.json/);
    assert.match(defaults, /Override precedence/);
    assert.match(defaults, /artifact sink normalization/i);
    assert.match(state, /\.workflow-orchestration\/state\.json/);
    assert.match(state, /automation-mode/);
    assert.match(state, /Continuation boundary matrix/);
    assert.match(state, /workspace mismatch/i);
    assert.match(state, /lifecycle-owner mismatch/i);
    assert.match(state, /invalidated readiness or publish evidence/i);
    assert.match(state, /merge-monitoring/);
    assert.match(state, /merge-waiting-human/);
    assert.match(state, /release-entry/);
    assert.match(state, /release-blocked/);
    assert.match(state, /release-skipped/);
    assert.match(state, /closeout-summarizing/);
    assert.match(state, /closeout-complete/);
    assert.match(state, /closeout-partial/);
    assert.match(state, /closeout-stale/);
    assert.match(state, /invalidated release evidence/i);
    assert.match(state, /Separation from transient session continuity/);
    assert.match(sessionSchema, /workflow-state-contract\.md/);
    assert.match(sessionSchema, /\.workflow-orchestration\/state\.json/);
    assert.match(sessionSchema, /advisory/i);
    assert.match(sessionSchema, /never replace/i);
    assert.match(sessionSchema, /merge status|release disposition|closeout/i);
    assert.doesNotMatch(sessionSchema, /\.workflow\/state\.yaml/);
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
    assert.ok(files.includes('docs/workflow-defaults-contract.md'));
    assert.ok(files.includes('docs/workflow-state-contract.md'));
    assert.ok(files.includes('docs/workflow-usage-guide.md'));

    for (const skill of [
      'idea-to-done-orchestration',
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
      'knowledge-refresh',
      'delivery-orchestration',
      'pr-publish-orchestration',
    ]) {
      assert.ok(files.includes(`skills/${skill}/SKILL.md`));
    }
  });
});
