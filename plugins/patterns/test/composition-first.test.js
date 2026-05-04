import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

describe('composition-first guidance — GoF', () => {
  const advisor = read('skills/gof-advisor/SKILL.md');
  const refactor = read('skills/gof-refactor/SKILL.md');
  const evaluator = read('skills/gof-evaluator/SKILL.md');
  const teach = read('skills/gof-teach/SKILL.md');
  const trees = read('references/gof/decision-trees.md');

  it('gof-advisor enforces a composition-first recommendation gate', () => {
    assert.match(advisor, /[Cc]omposition[- ][Ff]irst/);
    assert.match(advisor, /Strategy/);
    assert.match(advisor, /Decorator/);
    assert.match(advisor, /Template Method/);
    assert.match(advisor, /Singleton/);
    assert.match(advisor, /dependency injection|function injection|factory injection/i);
  });

  it('gof-refactor strengthens composition-targeted refactor guidance', () => {
    assert.match(refactor, /Strategy|Decorator/);
    assert.match(refactor, /[Dd]ependency [Ii]njection/);
    assert.match(refactor, /[Cc]omposition [Rr]oot|composition root/);
  });

  it('gof-evaluator flags inheritance-heavy variants as non-default', () => {
    assert.match(evaluator, /[Cc]omposition[- ][Ff]irst|inheritance.*non-default|non-default.*inheritance/);
  });

  it('gof-teach labels historical inheritance-heavy forms as non-default', () => {
    assert.match(teach, /non-default|composition-first|Composition-first/i);
  });

  it('gof decision-trees include a composition-first pre-gate', () => {
    assert.match(trees, /[Cc]omposition[- ][Ff]irst/);
    assert.match(trees, /Template Method/);
    assert.match(trees, /Strategy/);
    assert.match(trees, /[Jj]ustif/);
  });
});

describe('composition-first guidance — DDD', () => {
  const advisor = read('skills/ddd-advisor/SKILL.md');
  const refactor = read('skills/ddd-refactor/SKILL.md');
  const evaluator = read('skills/ddd-evaluator/SKILL.md');
  const teach = read('skills/ddd-teach/SKILL.md');
  const trees = read('references/ddd/decision-trees.md');

  it('ddd-advisor frames variability through value objects, specifications, policies, services, or ports', () => {
    assert.match(advisor, /[Vv]alue [Oo]bject/);
    assert.match(advisor, /[Ss]pecification/);
    assert.match(advisor, /[Pp]olic/);
    assert.match(advisor, /[Pp]ort/);
    assert.match(advisor, /[Ii]nheritance/);
  });

  it('ddd-evaluator checks for ports, pure domain, and justified entity inheritance', () => {
    assert.match(evaluator, /[Pp]ort|infrastructure interface/);
    assert.match(evaluator, /[Ii]nheritance/);
    assert.match(evaluator, /[Uu]biquitous [Ll]anguage/);
  });

  it('ddd-refactor includes composition-first migration paths', () => {
    assert.match(refactor, /[Pp]olic|[Ss]pecification/);
    assert.match(refactor, /[Pp]ort|[Rr]epository/);
  });

  it('ddd-teach calls out composition-first defaults', () => {
    assert.match(teach, /composition[- ]first|policy|specification/i);
  });

  it('ddd decision-trees gate entity inheritance behind ubiquitous-language subtype check', () => {
    assert.match(trees, /[Ii]nheritance/);
    assert.match(trees, /[Uu]biquitous [Ll]anguage|subtype/);
    assert.match(trees, /[Vv]alue [Oo]bject|[Pp]olic|[Ss]pecification/);
  });
});

describe('composition-first guidance — PEAA', () => {
  const advisor = read('skills/peaa-advisor/SKILL.md');
  const refactor = read('skills/peaa-refactor/SKILL.md');
  const evaluator = read('skills/peaa-evaluator/SKILL.md');
  const teach = read('skills/peaa-teach/SKILL.md');
  const trees = read('references/peaa/decision-trees.md');

  it('peaa-advisor adds a pre-gate before recommending inheritance mapping', () => {
    assert.match(advisor, /[Cc]omposition[- ][Ff]irst|pre-gate|domain taxonomy/);
    assert.match(advisor, /[Rr]ole [Oo]bject|[Vv]alue [Oo]bject|[Ss]pecification|[Pp]olic/);
  });

  it('peaa-evaluator flags accidental persistence taxonomy', () => {
    assert.match(evaluator, /accidental persistence taxonomy|persistence taxonomy|domain taxonomy/);
  });

  it('peaa-refactor prefers composition before inheritance mapping', () => {
    assert.match(refactor, /[Cc]omposition|[Rr]ole [Oo]bject|[Pp]olic/);
  });

  it('peaa-teach warns about schema hardening from inheritance mapping', () => {
    assert.match(teach, /schema|hardening|harden|last resort|last-resort/i);
  });

  it('peaa decision-trees run the composition/domain pre-gate before inheritance mapping', () => {
    assert.match(trees, /domain taxonomy/);
    assert.match(trees, /accidental persistence taxonomy|persistence taxonomy/);
    assert.match(trees, /[Rr]ole [Oo]bject|[Vv]alue [Oo]bject|[Pp]olic|[Ss]pecification/);
    assert.match(trees, /last resort|last-resort/i);
    assert.match(trees, /schema|hardening|harden/i);
  });
});
