import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

function readText(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

const NEW_ARCH_RULES = ['ARCH-7', 'ARCH-8', 'ARCH-9', 'ARCH-10'];

describe('arch-check covers ARCH-1 through ARCH-10', () => {
  const text = readText('skills/arch-check/SKILL.md');

  it('updates the description range to ARCH-1 through ARCH-10', () => {
    assert.match(text, /ARCH-1 through ARCH-10/);
    assert.doesNotMatch(text, /ARCH-1 through ARCH-6/);
  });

  for (const rule of NEW_ARCH_RULES) {
    it(`defines ${rule} with a heading`, () => {
      const re = new RegExp(`^### ${rule} —`, 'm');
      assert.match(text, re);
    });
  }

  it('documents composition-first names for the new rules', () => {
    assert.match(text, /Composition Over Inheritance/);
    assert.match(text, /Dependencies Must Be Injected/);
    assert.match(text, /Depend on Stable Ports/);
    assert.match(text, /Composition Root Owns Wiring/);
  });
});

describe('conductor reflects ARCH-1 through ARCH-10', () => {
  const text = readText('skills/conductor/SKILL.md');

  it('updates the --explain valid IDs range to ARCH-1–10', () => {
    assert.match(text, /ARCH-1–10/);
    assert.doesNotMatch(text, /ARCH-1–6/);
  });

  it('routes write operations through arch-check for class/service/module/wiring work', () => {
    assert.match(text, /classes, services, repositories, modules, adapters, domain models, use cases, or wiring/);
    assert.match(text, /\*\*write\*\* — class\/service\/module\/domain\/wiring/);
  });
});

describe('rule-explanations cover ARCH-7 through ARCH-10', () => {
  const text = readText('skills/conductor/rule-explanations.md');

  for (const rule of NEW_ARCH_RULES) {
    it(`includes a ## ${rule} section`, () => {
      const re = new RegExp(`^## ${rule}$`, 'm');
      assert.match(text, re);
    });
  }
});

describe('auto-fix-eligibility lists ARCH-7 through ARCH-10 as human-required', () => {
  const text = readText('skills/conductor/auto-fix-eligibility.md');

  for (const rule of NEW_ARCH_RULES) {
    it(`includes a row for ${rule} marked human required`, () => {
      const re = new RegExp(`\\| ${rule} \\| [^|]+ \\| ❌ Human required`);
      assert.match(text, re);
    });
  }
});

describe('tdd-check TDD-5 references ports/contracts and the new ARCH rules', () => {
  const text = readText('skills/tdd-check/SKILL.md');

  it('extends TDD-5 with contract/port guidance and cross-references ARCH-8, ARCH-9, TDD-7', () => {
    const tdd5Match = text.match(/### TDD-5 —[\s\S]*?(?=\n### TDD-6 —)/);
    assert.ok(tdd5Match, 'TDD-5 section should exist');
    const tdd5 = tdd5Match[0];
    assert.match(tdd5, /port|contract/i);
    assert.match(tdd5, /ARCH-8/);
    assert.match(tdd5, /ARCH-9/);
    assert.match(tdd5, /TDD-7/);
  });
});

describe('ccc plugin version bump to 3.1.0', () => {
  it('package.json is at 3.1.0', () => {
    const pkg = JSON.parse(readText('package.json'));
    assert.equal(pkg.version, '3.1.0');
  });

  it('plugin.json is at 3.1.0', () => {
    const pkg = JSON.parse(readText('plugin.json'));
    assert.equal(pkg.version, '3.1.0');
  });

  it('.claude-plugin/plugin.json is at 3.1.0', () => {
    const pkg = JSON.parse(readText('.claude-plugin/plugin.json'));
    assert.equal(pkg.version, '3.1.0');
  });

  it('package-lock.json reflects 3.1.0', () => {
    const lock = JSON.parse(readText('package-lock.json'));
    assert.equal(lock.version, '3.1.0');
    assert.equal(lock.packages[''].version, '3.1.0');
  });
});
