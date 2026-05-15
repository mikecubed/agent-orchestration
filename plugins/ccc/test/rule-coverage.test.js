import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const SKILLS_DIR = path.join(ROOT, 'skills');

const RULE_ID_RE = /\b([A-Z][A-Z]+-(?:[A-Z][A-Z0-9-]*|[0-9]+))\b/g;

// Specialty rule families are documented in their own SKILL.md only;
// they are intentionally not enumerated in the conductor's curated
// rule-explanations.md or auto-fix-eligibility.md tables.
const SPECIALTY_PREFIXES = ['A11Y-', 'I18N-', 'PERF-', 'RESILIENCE-', 'IAC-', 'DOCS-'];

function readText(absPath) {
  return fs.readFileSync(absPath, 'utf8');
}

function skillDirs() {
  return fs
    .readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== 'conductor')
    .map((entry) => entry.name);
}

function extractRulesFromSkill(skillName) {
  const skillPath = path.join(SKILLS_DIR, skillName, 'SKILL.md');
  const text = readText(skillPath);
  const ids = new Set();
  for (const line of text.split('\n')) {
    const match = /^###\s+([A-Z][A-Z]+-(?:[A-Z][A-Z0-9-]*|[0-9]+))\b/.exec(line);
    if (match) ids.add(match[1]);
  }
  return ids;
}

function extractRulesFromExplanations() {
  const text = readText(path.join(SKILLS_DIR, 'conductor', 'rule-explanations.md'));
  const ids = new Set();
  for (const line of text.split('\n')) {
    const match = /^##\s+([A-Z][A-Z]+-(?:[A-Z][A-Z0-9-]*|[0-9]+))\s*$/.exec(line);
    if (match) ids.add(match[1]);
  }
  return ids;
}

function extractRulesFromAutoFix() {
  const text = readText(path.join(SKILLS_DIR, 'conductor', 'auto-fix-eligibility.md'));
  const ids = new Set();
  for (const line of text.split('\n')) {
    const match = /^\|\s*([A-Z][A-Z]+-(?:[A-Z][A-Z0-9-]*|[0-9]+))\s*\|/.exec(line);
    if (match) ids.add(match[1]);
  }
  return ids;
}

function isSpecialty(ruleId) {
  return SPECIALTY_PREFIXES.some((prefix) => ruleId.startsWith(prefix));
}

function readFrontmatterFlag(skillName, flag) {
  const text = readText(path.join(SKILLS_DIR, skillName, 'SKILL.md'));
  const fmMatch = /^---\n([\s\S]*?)\n---/.exec(text);
  if (!fmMatch) return false;
  const re = new RegExp(`^${flag}:\\s*true\\s*$`, 'm');
  return re.test(fmMatch[1]);
}

describe('ccc rule-id coverage', () => {
  const skillRules = new Map(); // skill name → Set of rule IDs
  for (const name of skillDirs()) {
    skillRules.set(name, extractRulesFromSkill(name));
  }
  const allSkillRules = new Set();
  for (const ids of skillRules.values()) {
    for (const id of ids) allSkillRules.add(id);
  }

  it('every non-specialty rule emitted by a skill appears in rule-explanations.md', () => {
    const explained = extractRulesFromExplanations();
    const missing = [];
    for (const id of allSkillRules) {
      if (isSpecialty(id)) continue;
      if (!explained.has(id)) missing.push(id);
    }
    assert.deepEqual(
      missing,
      [],
      `rules emitted by SKILL.md but missing from rule-explanations.md: ${missing.join(', ')}`,
    );
  });

  it('every rule ID in rule-explanations.md resolves to a skill that emits it', () => {
    const explained = extractRulesFromExplanations();
    const orphaned = [];
    for (const id of explained) {
      if (!allSkillRules.has(id)) orphaned.push(id);
    }
    assert.deepEqual(
      orphaned,
      [],
      `rule-explanations.md entries with no matching SKILL.md emission: ${orphaned.join(', ')}`,
    );
  });

  it('every rule ID in auto-fix-eligibility.md resolves to a skill that emits it', () => {
    const eligible = extractRulesFromAutoFix();
    const orphaned = [];
    for (const id of eligible) {
      if (!allSkillRules.has(id)) orphaned.push(id);
    }
    assert.deepEqual(
      orphaned,
      [],
      `auto-fix-eligibility.md entries with no matching SKILL.md emission: ${orphaned.join(', ')}`,
    );
  });
});

describe('ccc conductor dispatch resolves to real skills', () => {
  it('every skill name in the conductor dispatch table is an existing skill directory', () => {
    const conductor = readText(path.join(SKILLS_DIR, 'conductor', 'SKILL.md'));
    // Dispatch table cells look like: `gate-check` + `type-check` + …
    const dispatchSection = conductor.split('## 3. Situation')[1] ?? '';
    const dispatchTable = dispatchSection.split('\n## ')[0];
    const referencedSkills = new Set();
    const skillRe = /`([a-z][a-z0-9]*-check)`/g;
    for (const match of dispatchTable.matchAll(skillRe)) {
      referencedSkills.add(match[1]);
    }
    assert.ok(referencedSkills.size > 0, 'expected to find skill names in dispatch table');
    const missing = [];
    for (const skill of referencedSkills) {
      const dir = path.join(SKILLS_DIR, skill);
      if (!fs.existsSync(path.join(dir, 'SKILL.md'))) missing.push(skill);
    }
    assert.deepEqual(
      missing,
      [],
      `conductor dispatch references missing skill dirs: ${missing.join(', ')}`,
    );
  });
});

describe('ccc paradigm language coverage', () => {
  for (const skill of ['purity-check', 'immutability-check', 'result-check']) {
    it(`${skill} has at least one language reference OR is marked language_agnostic`, () => {
      const refsDir = path.join(SKILLS_DIR, skill, 'references');
      const hasRefs =
        fs.existsSync(refsDir) &&
        fs
          .readdirSync(refsDir)
          .some((file) => file.endsWith('.md'));
      const agnostic = readFrontmatterFlag(skill, 'language_agnostic');
      assert.ok(
        hasRefs || agnostic,
        `${skill} must ship a language reference or declare language_agnostic: true`,
      );
    });
  }
});

describe('ccc overridable-rules manifest', () => {
  const manifestPath = path.join(ROOT, 'config', 'overridable-rules.json');

  it('parses cleanly and declares overridable_prefixes + valid_severities when present', () => {
    if (!fs.existsSync(manifestPath)) {
      // Gate this assertion: the manifest is introduced alongside the
      // severity-override hook integration. Until that lands the file is
      // optional; once it lands this branch turns into a hard requirement.
      return;
    }
    const manifest = JSON.parse(readText(manifestPath));
    assert.ok(Array.isArray(manifest.overridable_prefixes), 'overridable_prefixes must be an array');
    assert.ok(
      manifest.overridable_prefixes.length > 0,
      'overridable_prefixes must declare at least one prefix',
    );
    assert.ok(Array.isArray(manifest.valid_severities), 'valid_severities must be an array');
    for (const sev of manifest.valid_severities) {
      assert.ok(
        ['BLOCK', 'WARN', 'INFO'].includes(sev),
        `unexpected severity ${sev}; expected BLOCK | WARN | INFO`,
      );
    }
    for (const prefix of manifest.overridable_prefixes) {
      assert.match(prefix, /^[A-Z]+-$/, `prefix ${prefix} must look like 'PURE-'`);
    }
  });
});
