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
    shell: true,
  });
  const [packResult] = JSON.parse(output);

  packedFiles = packResult.files.map((file) => file.path);
  return packedFiles;
}

describe('patterns manifests', () => {
  it('defines a Copilot plugin manifest for patterns', () => {
    const manifest = readJson(ROOT, 'plugin.json');
    const packageManifest = readJson(ROOT, 'package.json');

    assert.equal(manifest.name, 'patterns');
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
    assert.equal(packageManifest.scripts['validate:runtime'], 'node ../../scripts/verify-runtime.mjs patterns');
    assert.ok(fs.existsSync(path.resolve(ROOT, '..', '..', 'scripts', 'verify-runtime.mjs')));
  });

  it('aligns plugin.json and .claude-plugin/plugin.json versions', () => {
    const copilotManifest = readJson(ROOT, 'plugin.json');
    const claudeManifest = readJson(ROOT, '.claude-plugin/plugin.json');

    assert.equal(copilotManifest.version, '3.1.0');
    assert.equal(claudeManifest.version, copilotManifest.version);
  });
});

describe('patterns skills layout', () => {
  const skills = [
    'peaa-advisor',
    'peaa-evaluator',
    'peaa-refactor',
    'peaa-teach',
    'gof-advisor',
    'gof-evaluator',
    'gof-refactor',
    'gof-teach',
    'ddd-advisor',
    'ddd-evaluator',
    'ddd-refactor',
    'ddd-strategist',
    'ddd-teach',
  ];

  for (const skill of skills) {
    it(`provides ${skill} as a shared plugin skill`, () => {
      const relativePath = path.join('skills', skill, 'SKILL.md');
      const text = readText(ROOT, relativePath);

      assert.match(text, /^---\nname: /);
      assert.match(text, /\ndescription: /);
      assert.equal(frontmatterValue(text, 'name'), skill);
    });
  }
});

describe('patterns references', () => {
  it('ships the PEAA reference catalog and supporting files', () => {
    for (const relativePath of [
      'references/peaa/catalog-core.md',
      'references/peaa/catalog-index.md',
      'references/peaa/catalog.md',
      'references/peaa/antipatterns.md',
      'references/peaa/decision-trees.md',
    ]) {
      assert.ok(fs.existsSync(path.join(ROOT, relativePath)), `expected ${relativePath}`);
    }
  });

  it('ships language-specific reference files', () => {
    const langDir = path.join(ROOT, 'references', 'peaa', 'lang');

    assert.ok(fs.existsSync(langDir), 'expected references/peaa/lang/ directory');

    const langFiles = fs.readdirSync(langDir).filter((f) => f.endsWith('.md'));
    assert.ok(langFiles.length > 0, 'expected at least one language reference file');
  });

  it('ships the GoF reference catalog and supporting files', () => {
    for (const relativePath of [
      'references/gof/catalog-core.md',
      'references/gof/catalog-index.md',
      'references/gof/antipatterns.md',
      'references/gof/decision-trees.md',
    ]) {
      assert.ok(fs.existsSync(path.join(ROOT, relativePath)), `expected ${relativePath}`);
    }
  });

  it('ships GoF language-specific reference files', () => {
    const langDir = path.join(ROOT, 'references', 'gof', 'lang');

    assert.ok(fs.existsSync(langDir), 'expected references/gof/lang/ directory');

    const langFiles = fs.readdirSync(langDir).filter((f) => f.endsWith('.md'));
    assert.ok(langFiles.length > 0, 'expected at least one GoF language reference file');
  });

  it('ships the DDD reference catalog and supporting files', () => {
    for (const relativePath of [
      'references/ddd/catalog-core.md',
      'references/ddd/catalog-index.md',
      'references/ddd/antipatterns.md',
      'references/ddd/decision-trees.md',
    ]) {
      assert.ok(fs.existsSync(path.join(ROOT, relativePath)), `expected ${relativePath}`);
    }
  });

  it('ships DDD language-specific reference files', () => {
    const langDir = path.join(ROOT, 'references', 'ddd', 'lang');

    assert.ok(fs.existsSync(langDir), 'expected references/ddd/lang/ directory');

    const langFiles = fs.readdirSync(langDir).filter((f) => f.endsWith('.md'));
    assert.ok(langFiles.length > 0, 'expected at least one DDD language reference file');
  });
});

describe('patterns package contents', () => {
  it('includes the plugin manifests, skills, and references in the published tarball', () => {
    const files = readPackedFiles();

    assert.ok(files.includes('plugin.json'));
    assert.ok(files.includes('.claude-plugin/plugin.json'));
    assert.ok(files.includes('README.md'));

    for (const skill of [
      'peaa-advisor',
      'peaa-evaluator',
      'peaa-refactor',
      'peaa-teach',
      'gof-advisor',
      'gof-evaluator',
      'gof-refactor',
      'gof-teach',
      'ddd-advisor',
      'ddd-evaluator',
      'ddd-refactor',
      'ddd-strategist',
      'ddd-teach',
    ]) {
      assert.ok(files.includes(`skills/${skill}/SKILL.md`), `expected packed skill ${skill}`);
    }

    assert.ok(files.includes('references/peaa/catalog.md'), 'expected packed reference catalog');
    assert.ok(files.includes('references/peaa/catalog-core.md'), 'expected packed reference catalog-core');
    assert.ok(files.includes('references/peaa/catalog-index.md'), 'expected packed reference catalog-index');
    assert.ok(files.includes('references/peaa/antipatterns.md'), 'expected packed reference antipatterns');
    assert.ok(files.includes('references/peaa/decision-trees.md'), 'expected packed reference decision-trees');

    assert.ok(files.includes('references/gof/catalog-core.md'), 'expected packed GoF catalog-core');
    assert.ok(files.includes('references/gof/catalog-index.md'), 'expected packed GoF catalog-index');
    assert.ok(files.includes('references/gof/antipatterns.md'), 'expected packed GoF antipatterns');
    assert.ok(files.includes('references/gof/decision-trees.md'), 'expected packed GoF decision-trees');

    assert.ok(files.includes('references/ddd/catalog-core.md'), 'expected packed DDD catalog-core');
    assert.ok(files.includes('references/ddd/catalog-index.md'), 'expected packed DDD catalog-index');
    assert.ok(files.includes('references/ddd/antipatterns.md'), 'expected packed DDD antipatterns');
    assert.ok(files.includes('references/ddd/decision-trees.md'), 'expected packed DDD decision-trees');
  });
});
