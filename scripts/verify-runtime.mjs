import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const pluginName = 'agent-workflow-skills';
const skillNames = [
  'parallel-implementation-loop',
  'pr-review-resolution-loop',
  'final-pr-readiness-gate',
];

function hasCommand(command) {
  try {
    execFileSync('which', [command], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  });
}

function verifyCopilotRuntime() {
  if (!hasCommand('copilot')) {
    console.log('Skipping Copilot runtime verification: `copilot` is not installed.');
    return;
  }

  const configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'copilot-runtime-'));

  try {
    console.log('Verifying Copilot plugin install/list/uninstall in an isolated config dir...');

    run('copilot', ['plugin', 'install', '--config-dir', configDir, ROOT]);

    const installed = run('copilot', ['plugin', 'list', '--config-dir', configDir]);
    assert.match(installed, new RegExp(`\\b${pluginName}\\b`));

    const loadedSkills = run('copilot', [
      '-p',
      'List the plugin-qualified skill names loaded from this plugin, one per line and nothing else.',
      '--plugin-dir',
      ROOT,
      '--allow-all-tools',
      '--output-format',
      'text',
    ]);

    for (const skillName of skillNames) {
      assert.match(loadedSkills, new RegExp(`${pluginName}:${skillName}`));
    }

    run('copilot', ['plugin', 'uninstall', '--config-dir', configDir, pluginName]);
  } finally {
    fs.rmSync(configDir, { recursive: true, force: true });
  }
}

function verifyClaudePlugin() {
  if (!hasCommand('claude')) {
    console.log('Skipping Claude plugin validation: `claude` is not installed.');
    return;
  }

  console.log('Validating Claude plugin manifest and structure...');
  run('claude', ['plugin', 'validate', ROOT], { stdio: 'inherit' });

  console.log('Verifying Claude plugin loading in session-only mode...');
  const loadedSkills = run('claude', [
    '-p',
    '--plugin-dir',
    ROOT,
    '--output-format',
    'text',
    'List the plugin-qualified skill names loaded from this plugin, one per line and nothing else.',
  ]);

  for (const skillName of skillNames) {
    assert.match(loadedSkills, new RegExp(`${pluginName}:${skillName}`));
  }
}

verifyCopilotRuntime();
verifyClaudePlugin();

console.log('Runtime verification completed.');
