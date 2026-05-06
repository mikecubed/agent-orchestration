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

describe('flow manifests', () => {
  it('defines a Copilot plugin manifest for flow', () => {
    const manifest = readJson(ROOT, 'plugin.json');
    const packageManifest = readJson(ROOT, 'package.json');

    assert.equal(manifest.name, 'flow');
    assert.deepEqual(manifest.skills, ['skills/']);
    assert.equal(manifest.agents, 'agents/');
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
    assert.equal(packageManifest.scripts['validate:runtime'], 'node ../../scripts/verify-runtime.mjs flow');
    assert.ok(fs.existsSync(path.resolve(ROOT, '..', '..', 'scripts', 'verify-runtime.mjs')));
  });
});

describe('flow skills layout', () => {
  const workflowSkills = [
    'idea-to-done',
    'plan',
    'deliver',
    'parallel-impl',
    'pr-resolve',
    'pr-ready',
    'diff-review',
    'pr-publish',
    'release',
    'worktree',
    'swarm',
    'brainstorm',
    'debug',
    'incident-rca',
    'map-codebase',
    'arch-review',
    'e2e-tests',
    'contracts',
    'knowledge-save',
    'knowledge-refresh',
  ];

  for (const skill of workflowSkills) {
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

  it('provides sdd-feature as an activation-trigger skill', () => {
    const text = readText(ROOT, path.join('skills', 'sdd-feature', 'SKILL.md'));

    assert.match(text, /^---\nname: /);
    assert.match(text, /\ndescription: /);
    assert.equal(frontmatterValue(text, 'name'), 'sdd-feature');
    assert.match(text, /## Activation Triggers/);
    assert.match(text, /## Behavior/);
    assert.match(text, /\/flow:sdd-specify/);
  });

  it('restores SDD workflow agents with detailed flow-native instructions', () => {
    const specify = readText(ROOT, path.join('agents', 'sdd-specify.md'));
    const plan = readText(ROOT, path.join('agents', 'sdd-plan.md'));
    const tasks = readText(ROOT, path.join('agents', 'sdd-tasks.md'));

    assert.match(specify, /^---\ndescription: /);
    assert.match(specify, /agent: sdd-plan/);
    assert.match(specify, /prompt: Refine the specification in the current \.sdd\/\{feature-dir\} workspace/);
    assert.doesNotMatch(specify, /agent: sdd\.plan/);
    assert.match(specify, /## Flow Agent Contract/);
    assert.match(specify, /## Outline/);
    assert.match(specify, /# Feature Specification: \[FEATURE NAME\]/);
    assert.match(specify, /User Scenarios & Testing/);
    assert.match(specify, /Functional Requirements/);
    assert.match(specify, /Success Criteria/);
    assert.match(specify, /checklists\/requirements\.md/);
    assert.match(specify, /Load the existing `spec\.md`/);
    assert.match(specify, /preserve the existing `plan\.md` \/ `tasks\.md` chain/i);

    assert.match(plan, /^---\ndescription: /);
    assert.match(plan, /agent: sdd-tasks/);
    assert.match(plan, /prompt: Refine the implementation plan in the current \.sdd\/\{feature-dir\} workspace/);
    assert.doesNotMatch(plan, /agent: sdd\.tasks/);
    assert.match(plan, /## Flow Agent Contract/);
    assert.match(plan, /Technical Context/);
    assert.match(plan, /Complexity Tracking/);
    assert.match(plan, /research\.md/);
    assert.match(plan, /data-model\.md/);
    assert.match(plan, /contracts\//);
    assert.match(plan, /quickstart\.md/);
    assert.match(plan, /Load the existing `plan\.md`/);
    assert.match(plan, /preserve prior assumptions, risk notes, manual edits, and design decisions/i);

    assert.match(tasks, /^---\ndescription: /);
    assert.match(tasks, /agent: sdd-tasks/);
    assert.match(tasks, /prompt: Refine the task list in the current \.sdd\/\{feature-dir\} workspace/);
    assert.doesNotMatch(tasks, /agent: sdd\.tasks/);
    assert.match(tasks, /## Flow Agent Contract/);
    assert.match(tasks, /strict `T###` format/);
    assert.match(tasks, /Mark tasks that can run in parallel with `\[P\]`/);
    assert.match(tasks, /per-story breakdown/);
    assert.match(tasks, /suggested MVP scope/);
    assert.match(tasks, /Load the existing `tasks\.md`/);
    assert.match(tasks, /preserve prior task IDs, ordering adjustments, and manually curated notes/i);
  });

  it('aligns arch-review with the canonical CCC ARCH-1 through ARCH-10 ruleset', () => {
    const text = readText(ROOT, path.join('skills', 'arch-review', 'SKILL.md'));

    assert.match(text, /ARCH-1 through ARCH-10/,
      'arch-review must reference the full ARCH-1..ARCH-10 ruleset');
    assert.match(text, /ARCH-7\b/, 'arch-review must mention ARCH-7');
    assert.match(text, /ARCH-8\b/, 'arch-review must mention ARCH-8');
    assert.match(text, /ARCH-9\b/, 'arch-review must mention ARCH-9');
    assert.match(text, /ARCH-10\b/, 'arch-review must mention ARCH-10');
    assert.match(text, /canonical/i,
      'arch-review must label ccc/arch-check as the canonical rule source');
    assert.match(text, /ccc\/?\s*arch-check|`arch-check`\s*\(from\s*`?ccc`?\)/i,
      'arch-review must reference ccc/arch-check as canonical source');
    assert.match(text, /composition/i,
      'arch-review must include composition findings');
    assert.match(text, /dependency injection|inject(ed|ion)/i,
      'arch-review must include dependency injection findings');
    assert.match(text, /\bDIP\b/, 'arch-review must reference DIP');
    assert.match(text, /\bISP\b/, 'arch-review must reference ISP');
    assert.match(text, /composition root/i,
      'arch-review must reference composition roots');
    assert.match(text, /All 10 ARCH rules|10 ARCH rules/,
      'arch-review verification gate must cover all 10 ARCH rules');
    assert.doesNotMatch(text, /ARCH-1 through ARCH-6\b/,
      'arch-review must not retain the legacy ARCH-1..ARCH-6 framing');

    const legacyLabels = [
      /ARCH-1\s+[—-]\s+Layer violations/i,
      /ARCH-3\s+[—-]\s+Missing public API declarations/i,
      /ARCH-4\s+[—-]\s+Dependency direction violations/i,
      /ARCH-5\s+[—-]\s+God modules/i,
      /ARCH-6\s+[—-]\s+Missing abstraction boundaries/i,
    ];
    for (const pattern of legacyLabels) {
      assert.doesNotMatch(text, pattern,
        `arch-review must not embed the legacy label ${pattern}`);
    }

    const legacySemanticGlosses = [
      /evaluating layer boundaries, dependency direction, circular imports, and public API surface/i,
      /to detect layer violations/i,
      /missing abstractions/i,
      /dependency direction problems/i,
    ];
    for (const pattern of legacySemanticGlosses) {
      assert.doesNotMatch(text, pattern,
        `arch-review must not paraphrase legacy ARCH semantics with ${pattern}`);
    }

    assert.match(text, /plugins\/ccc\/skills\/arch-check\/SKILL\.md/,
      'arch-review must point readers to plugins/ccc/skills/arch-check/SKILL.md as the canonical source');
    assert.match(text, /do not restate or paraphrase the rule semantics/i,
      'arch-review must explicitly forbid restating/paraphrasing canonical ARCH rule semantics');
  });

  it('adds composition-first guidance to the SDD flow agents', () => {
    const specify = readText(ROOT, path.join('agents', 'sdd-specify.md'));
    const plan = readText(ROOT, path.join('agents', 'sdd-plan.md'));
    const tasks = readText(ROOT, path.join('agents', 'sdd-tasks.md'));

    for (const [name, text] of [['sdd-specify', specify], ['sdd-plan', plan], ['sdd-tasks', tasks]]) {
      assert.match(text, /composition[- ]first/i,
        `${name} should include composition-first guidance`);
      assert.doesNotMatch(text, /agent:\s*sdd\.(specify|plan|tasks)/,
        `${name} must not use old dotted SDD agent names`);
      assert.doesNotMatch(text, /sdd-workflow/i,
        `${name} must not reference the old sdd-workflow plugin`);
    }

    assert.match(specify, /dependency inversion|injected dependenc|composition root|justified inheritance|pure domain/i,
      'sdd-specify must capture composition-first requirements');
    assert.match(plan, /port|protocol|interface/i,
      'sdd-plan must prefer ports/protocols/interfaces');
    assert.match(plan, /composition root/i,
      'sdd-plan must require explicit composition roots');
    assert.match(plan, /inject(ed|ion)/i,
      'sdd-plan must require injected dependencies');
    assert.match(tasks, /composition root|inject(ed|ion)|inheritance justif|port/i,
      'sdd-tasks must include composition-first task generation guidance');
    assert.match(tasks, /\/flow:arch-review/,
      'sdd-tasks must use the copyable /flow:arch-review invocation');
    const unprefixedArchReviewInvocation = ['flow', 'arch-review'].join(':');
    assert.doesNotMatch(tasks, new RegExp(`\`${unprefixedArchReviewInvocation}\``),
      'sdd-tasks must not use the non-copyable arch-review form');
    assert.match(plan, /\/flow:arch-review/,
      'sdd-plan must use the copyable /flow:arch-review invocation');
    assert.match(plan, /plugins\/flow\/skills\/arch-review\/SKILL\.md/,
      'sdd-plan must cite the canonical arch-review implementation path');
    assert.doesNotMatch(plan, /reference `flow\/skills\/arch-review`/,
      'sdd-plan must not cite a non-existent flow/skills/arch-review path');
  });

  it('does not reintroduce old dotted SDD agent names anywhere under flow', () => {
    const filesToCheck = [
      path.join('skills', 'sdd-feature', 'SKILL.md'),
      path.join('skills', 'arch-review', 'SKILL.md'),
      path.join('agents', 'sdd-specify.md'),
      path.join('agents', 'sdd-plan.md'),
      path.join('agents', 'sdd-tasks.md'),
    ];

    for (const relative of filesToCheck) {
      const text = readText(ROOT, relative);
      for (const legacyName of ['specify', 'plan', 'tasks'].map((name) => `sdd.${name}`)) {
        assert.doesNotMatch(text, new RegExp(`\\b${legacyName.replace('.', '\\.')}\\b`),
          `${relative} contains old dotted SDD agent name`);
      }
    }
  });

  it('keeps deliver coordinator-shaped with explicit direct-path, deflection, and handoff contracts', () => {
    const text = readText(ROOT, path.join('skills', 'deliver', 'SKILL.md'));
    const readme = readText(ROOT, 'README.md');
    const guide = readText(ROOT, path.join('docs', 'workflow-usage-guide.md'));
    const templates = readText(ROOT, path.join('docs', 'workflow-artifact-templates.md'));

    assert.match(text, /## Post-Delivery Handoffs/);
    assert.match(text, /non-empty diff|non-empty delivered diff|non-empty diff — code, tests, configuration, or documentation/i);
    assert.match(text, /Runtime-native scoped implementer agent/);
    assert.match(text, /### Direct execution contract/);
    assert.match(text, /artifact-sinks\.track-reports/);
    assert.match(text, /Validation outcome:\s+pass \| fail \| partial \| not-run/);
    assert.match(text, /\/flow:diff-review/);
    assert.match(text, /\/flow:knowledge-save/);
    assert.match(text, /## Deflection Behavior/);
    assert.match(text, /## Direct-Route Rescue and Reroute Contract/);
    assert.match(text, /\/flow:plan/);
    assert.match(text, /\/flow:brainstorm/);
    assert.match(text, /\/flow:release/);
    assert.match(text, /## Coordinator-Shape Contract/);
    assert.match(text, /\*\*No planning\*\*/);
    assert.match(text, /\*\*No release\*\*/);
    assert.match(templates, /## Direct execution outcome report/);
    assert.match(templates, /\.flow\/artifacts\/direct-execution-<topic>\.md/);
    assert.match(readme, /Review any\s+non-empty delivered diff/i);
    assert.match(readme, /direct-execution report/i);
    assert.match(guide, /direct-execution report/i);
  });

  it('adds idea-to-done as a bounded full-loop conductor over the specialist workflows', () => {
    const text = readText(ROOT, path.join('skills', 'idea-to-done', 'SKILL.md'));
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
    assert.match(text, /\.flow\/state\.json/);
    assert.match(text, /automation\.progression/);
    assert.match(text, /automation\.stop-for-human/);
    assert.match(text, /\/flow:plan/);
    assert.match(text, /\/flow:deliver/);
    assert.match(text, /\/flow:diff-review/);
    assert.match(text, /\/flow:pr-ready/);
    assert.match(text, /\/flow:pr-publish/);
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
    assert.match(text, /\/flow:release/);
    assert.match(text, /\/flow:knowledge-save/);
    assert.match(text, /\/flow:knowledge-refresh/);
    assert.match(text, /requirements are still unclear/i);
    assert.match(text, /readiness has not been achieved/i);
    assert.match(text, /release or merge policy/i);
    assert.match(text, /workspace mismatch/i);
    assert.match(text, /lifecycle-owner mismatch/i);
    assert.match(text, /invalidated by later tree changes/i);
    assert.match(text, /\.flow\/artifacts\/conductor-summary-<topic>\.md/);
    assert.match(text, /\.flow\/artifacts\/completion-summary-<topic>\.md/);
    assert.match(templates, /## Conductor lifecycle summary/);
    assert.match(templates, /\.flow\/artifacts\/conductor-summary-<topic>\.md/);
    assert.match(templates, /## Completion summary/);
    assert.match(templates, /\.flow\/artifacts\/completion-summary-<topic>\.md/);
    assert.match(state, /closeout-assessing/);
    assert.match(state, /merge-monitoring/);
    assert.match(state, /release-entry/);
    assert.match(state, /closeout-complete/);
    assert.match(state, /closeout-partial/);
    assert.match(state, /closeout-stale/);
    assert.match(state, /invalidated release evidence/i);
    assert.match(readme, /\/flow:idea-to-done/);
    assert.match(readme, /resume after review comments/i);
    assert.match(readme, /resume after failed readiness/i);
    assert.match(readme, /publish still needs human action/i);
    assert.match(readme, /published but not merged/i);
    assert.match(readme, /release-aware repository/i);
    assert.match(readme, /non-release-aware repository/i);
    assert.match(guide, /idea-to-done/);
    assert.match(guide, /resume after review comments/i);
    assert.match(guide, /resume after failed readiness/i);
    assert.match(guide, /publish still needs human action/i);
    assert.match(guide, /published but not merged/i);
    assert.match(guide, /release-aware repository/i);
    assert.match(guide, /non-release-aware repository/i);
    assert.doesNotMatch(guide, /does \*\*not\*\* yet provide one opt-in workflow/i);
    assert.doesNotMatch(guide, /Phase 4 continuation behavior remains intentionally separate/i);
  });

  it('keeps pr-publish bounded to publication with readiness deflection', () => {
    const text = readText(ROOT, path.join('skills', 'pr-publish', 'SKILL.md'));
    const templates = readText(ROOT, 'docs/workflow-artifact-templates.md');

    assert.match(text, /stops at PR creation or update/i);
    assert.match(text, /\/flow:pr-ready/);
    assert.match(text, /exact tree that will be published/i);
    assert.match(text, /\/flow:pr-resolve/);
    assert.match(text, /\/flow:release/);
    assert.match(text, /\.flow\/artifacts\/publish-summary-<topic>\.md/);
    assert.match(text, /Publish summary/);
    assert.doesNotMatch(text, /developer override/i);
    assert.match(templates, /## Publish summary/);
    assert.match(templates, /\.flow\/artifacts\/publish-summary-<topic>\.md/);
  });

  it('keeps parallel-impl worktree-isolated and completion-oriented through publication', () => {
    const text = readText(ROOT, path.join('skills', 'parallel-impl', 'SKILL.md'));
    const readme = readText(ROOT, 'README.md');
    const guide = readText(ROOT, path.join('docs', 'workflow-usage-guide.md'));
    const templates = readText(ROOT, path.join('docs', 'workflow-artifact-templates.md'));

    assert.match(text, /integration \*\*feature branch\*\*/i);
    assert.match(text, /\/flow:worktree/);
    assert.match(text, /own git worktree outside the project\s+directory/i);
    assert.match(text, /Do not run parallel implementers in\s+the main project working tree/i);
    assert.match(text, /Continue until the batch is actually complete/i);
    assert.match(text, /TDD stays mandatory on every code-bearing track/i);
    assert.match(text, /DRY/i);
    assert.match(text, /SOLID/i);
    assert.match(text, /low[- ]complexity control flow|low cyclomatic complexity/i);
    assert.match(text, /ccc:conductor/);
    assert.match(text, /soft-budget expiry is \*\*not\*\* by itself a rescue trigger/i);
    assert.match(text, /prefer same-agent continuation in the same worktree and scope first/i);
    assert.match(text, /do \*\*not\*\* spawn a second rescue agent or duplicate the track by default/i);
    assert.match(text, /do \*\*not\*\* treat elapsed time alone as stall evidence/i);
    assert.match(text, /committed and pushed/i);
    assert.match(text, /PR has been created or updated/i);
    assert.match(text, /\/flow:pr-publish/);
    assert.match(text, /local-only execution/i);
    assert.match(text, /Track work ran in a dedicated external worktree path outside the project directory/i);
    assert.match(templates, /Track branch:/);
    assert.match(templates, /Worktree path: <external path outside project root>/);
    assert.match(templates, /Commit status:/);
    assert.match(readme, /isolated track branches and external worktrees/i);
    assert.match(readme, /TDD and concise design-quality expectations/i);
    assert.match(readme, /ccc:conductor/);
    assert.match(readme, /same-agent continuation and\s+escalation over duplicate rescue tracks/i);
    assert.match(guide, /isolated external worktrees/i);
    assert.match(guide, /TDD and concise design-quality expectations/i);
    assert.match(guide, /same-agent continuation preferred over duplicate rescue tracks/i);
  });

  it('keeps swarm same-agent-first on stalls and bounded on reconciliation respawns', () => {
    const text = readText(ROOT, path.join('skills', 'swarm', 'SKILL.md'));
    const guide = readText(ROOT, path.join('docs', 'workflow-usage-guide.md'));

    assert.match(text, /soft budget → stall evidence → same-agent rescue\/escalation → hard budget → stopped/i);
    assert.match(text, /prefer same-agent continuation in the same domain and context first/i);
    assert.match(text, /do \*\*not\*\* spawn a second rescue domain agent or duplicate the same scope by default/i);
    assert.match(text, /Do not re-spawn a failed domain agent with the same or only slightly narrower scope by default/i);
    assert.match(text, /spawn a new reconciliation agent only when there is one sharply bounded unresolved interface gap/i);
    assert.match(guide, /prefer(?:s)? in-place continuation or escalation over duplicate rescue agents/i);
  });

  it('keeps pr-resolve skeptical about review comments and records verdicts separately from actions', () => {
    const text = readText(ROOT, path.join('skills', 'pr-resolve', 'SKILL.md'));
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
    assert.match(text, /Default to self-service scope verification/i);
    assert.match(text, /Do \*\*not\*\* ask the developer to\s+confirm that the PR still represents intended scope unless/i);
    assert.match(templates, /<valid \/ partially valid \/ false positive \/ noise \/ stale\/out-of-scope>/);
    assert.match(text, /commit and push|committed and pushed/i);
    assert.match(text, /replying.*resolving\s*\/\s*closing|reply and a matching resolve/i);
    assert.match(text, /brief chat summary/i);
    assert.match(templates, /Thread status:/);
    assert.match(templates, /Publish status:/);
    assert.match(readme, /skeptically triages and verifies each comment/i);
    assert.match(readme, /by default commits and pushes the branch\s+update/i);
    assert.match(guide, /skeptical triage, verified fixes, replies, thread resolution/i);
  });

  it('keeps pr-ready evidence-first about scope continuity and only escalates on genuine ambiguity', () => {
    const text = readText(ROOT, path.join('skills', 'pr-ready', 'SKILL.md'));
    const readme = readText(ROOT, 'README.md');
    const guide = readText(ROOT, path.join('docs', 'workflow-usage-guide.md'));

    assert.match(text, /Default to self-service scope verification/i);
    assert.match(text, /Do \*\*not\*\* ask the developer to\s+confirm that the PR still matches its intended scope unless/i);
    assert.match(text, /PR\s+title,\s+description,\s+recent\s+commits,\s+and\s+actual\s+diff/i);
    assert.match(text, /only part of the diff is ambiguous, judge the unambiguous portion/i);
    assert.match(text, /Ask the developer only if those sources still leave genuine\s+ambiguity or conflict/i);
    assert.doesNotMatch(text, /This item requires human confirmation/i);
    assert.match(readme, /without re-prompting the developer unless the evidence is genuinely\s+ambiguous/i);
    assert.match(guide, /evidence-based check that the current diff still matches the PR intent/i);
  });

  it('uses baked-in model defaults silently when no project config or session cache exists', () => {
    const docs = readText(ROOT, path.join('docs', 'models-config-template.md'));
    const skillsWithModelSelection = [
      'plan',
      'brainstorm',
      'parallel-impl',
      'pr-resolve',
      'pr-ready',
      'map-codebase',
      'debug',
      'swarm',
      'e2e-tests',
      'incident-rca',
      'arch-review',
    ];

    assert.match(docs, /baked-in defaults silently/i);
    assert.match(docs, /Create a\s+config file only when you want persistent overrides/i);

    for (const skill of skillsWithModelSelection) {
      const text = readText(ROOT, path.join('skills', skill, 'SKILL.md'));

      assert.match(text, /Baked-in defaults/i,
        `${skill} should document baked-in defaults`);
      assert.match(text, /silently without prompting/i,
        `${skill} should use baked-in defaults silently`);
      assert.doesNotMatch(text,
        /ask the (?:user|developer) to confirm or override once|show the defaults below, ask|confirm once, cache for the session/i,
        `${skill} should not prompt just to confirm defaults`);
    }
  });

  it('keeps diff-review headless and autofix explicitly bounded', () => {
    const text = readText(ROOT, path.join('skills', 'diff-review', 'SKILL.md'));

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
    const planning = readText(ROOT, path.join('skills', 'plan', 'SKILL.md'));
    const delivery = readText(ROOT, path.join('skills', 'deliver', 'SKILL.md'));
    const diffReview = readText(ROOT, path.join('skills', 'diff-review', 'SKILL.md'));
    const publish = readText(ROOT, path.join('skills', 'pr-publish', 'SKILL.md'));
    const knowledge = readText(ROOT, path.join('skills', 'knowledge-save', 'SKILL.md'));

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
    assert.match(text, /\.flow\/state\.json/);
    assert.match(text, /\.flow\/defaults\.json/);
    assert.match(text, /\btrusted\b/);
    assert.match(text, /\bstale\b/);
    assert.match(text, /\bduplicate\b/);
    assert.match(text, /\bobsolete\b/);
    assert.match(text, /\bsuperseded\b/);
    assert.match(text, /\bneeds-capture\b/);
    assert.match(text, /\/flow:knowledge-save/);
    assert.match(text, /\/flow:arch-review/);
    assert.match(text, /refresh-assessing/);
    assert.match(text, /refresh-candidates-confirmed/);
    assert.match(text, /refresh-planned/);
    assert.match(text, /refresh-updating/);
    assert.match(text, /refresh-validating/);
    assert.match(text, /refresh-blocked/);
    assert.match(text, /refresh-complete/);
    assert.match(text, /\.flow\/artifacts\/refresh-summary-<topic>\.md/);
    assert.match(text, /docs\/workflow-artifact-templates\.md/);
    assert.match(text, /docs\/workflow-state-contract\.md/);
    assert.match(text, /docs\/workflow-defaults-contract\.md/);
    assert.match(templates, /## Refresh summary/);
    assert.match(templates, /\.flow\/artifacts\/refresh-summary-<topic>\.md/);
    assert.match(state, /knowledge-refresh/);
    assert.match(readme, /\/flow:knowledge-refresh/);
    assert.match(readme, /knowledge-refresh/);
    assert.match(guide, /knowledge-refresh/);
  });

  it('makes the capture-vs-refresh boundary explicit in knowledge-save', () => {
    const text = readText(ROOT, path.join('skills', 'knowledge-save', 'SKILL.md'));

    assert.match(text, /capture.*workflow/i);
    assert.match(text, /\/flow:knowledge-refresh/);
    assert.match(text, /capture-vs-refresh boundary|capture.*refresh.*boundary/i);
  });

  it('makes prior-learning lookup refresh-aware in planning and diff-review', () => {
    const planning = readText(ROOT, path.join('skills', 'plan', 'SKILL.md'));
    const diffReview = readText(ROOT, path.join('skills', 'diff-review', 'SKILL.md'));

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
    const text = readText(ROOT, path.join('skills', 'idea-to-done', 'SKILL.md'));

    assert.match(text, /\/flow:knowledge-refresh/);
    assert.match(text, /refresh.*advisory|advisory.*refresh/i);
    assert.match(text, /never mandatory|never.*block.*lifecycle/i);
  });

  it('publishes the workflow defaults and durable state contracts with the session boundary update', () => {
    const defaults = readText(ROOT, path.join('docs', 'workflow-defaults-contract.md'));
    const state = readText(ROOT, path.join('docs', 'workflow-state-contract.md'));
    const sessionSchema = readText(ROOT, path.join('docs', 'session-md-schema.md'));

    assert.match(defaults, /\.flow\/defaults\.json/);
    assert.match(defaults, /Override precedence/);
    assert.match(defaults, /artifact sink normalization/i);
    assert.match(state, /\.flow\/state\.json/);
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
    assert.match(sessionSchema, /\.flow\/state\.json/);
    assert.match(sessionSchema, /advisory/i);
    assert.match(sessionSchema, /never replace/i);
    assert.match(sessionSchema, /merge status|release disposition|closeout/i);
    assert.doesNotMatch(sessionSchema, /\.workflow\/state\.yaml/);
  });
});

describe('flow package contents', () => {
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
    assert.ok(files.includes('agents/sdd-specify.md'));
    assert.ok(files.includes('agents/sdd-plan.md'));
    assert.ok(files.includes('agents/sdd-tasks.md'));

    for (const skill of [
      'idea-to-done',
      'plan',
      'deliver',
      'parallel-impl',
      'pr-resolve',
      'pr-ready',
      'diff-review',
      'pr-publish',
      'release',
      'worktree',
      'swarm',
      'brainstorm',
      'debug',
      'incident-rca',
      'map-codebase',
      'arch-review',
      'e2e-tests',
      'contracts',
      'knowledge-save',
      'knowledge-refresh',
      'sdd-feature',
    ]) {
      assert.ok(files.includes(`skills/${skill}/SKILL.md`));
    }
  });
});
