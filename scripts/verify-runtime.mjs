import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const ROOT_PACKAGE_NAME = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'),
).name;
const PLUGIN_TARGETS = new Map([
  [
    'workflow-orchestration',
    {
      root: path.join(ROOT, 'plugins', 'workflow-orchestration'),
      copilotSkillDir: 'skills',
      claudeSkillDir: 'skills',
    },
  ],
  [
    'sdd-workflow',
    {
      root: path.join(ROOT, 'plugins', 'sdd-workflow'),
      copilotSkillDir: 'copilot-skills',
      claudeSkillDir: 'skills',
    },
  ],
  [
    'clean-code-codex',
    {
      root: path.join(ROOT, 'plugins', 'clean-code-codex'),
      copilotSkillDir: 'skills',
      claudeSkillDir: 'skills',
    },
  ],
]);

function executableNames(command) {
  if (process.platform !== 'win32' || /\.[^./\\]+$/.test(command)) {
    return [command];
  }

  const pathExt = (process.env.PATHEXT ?? '.EXE;.CMD;.BAT;.COM')
    .split(';')
    .filter(Boolean);

  return [command, ...pathExt.map((extension) => `${command}${extension}`)];
}

function hasCommand(command) {
  for (const directory of (process.env.PATH ?? '').split(path.delimiter).filter(Boolean)) {
    for (const candidate of executableNames(command)) {
      const executablePath = path.join(directory, candidate);

      try {
        fs.accessSync(executablePath, fs.constants.X_OK);
        return true;
      } catch {
        if (process.platform === 'win32' && fs.existsSync(executablePath)) {
          return true;
        }
      }
    }
  }

  return false;
}

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: options.cwd ?? ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  });
}

function tryRun(command, args, options = {}) {
  try {
    return {
      ok: true,
      stdout: run(command, args, options),
      stderr: '',
    };
  } catch (error) {
    return {
      ok: false,
      stdout: error.stdout ?? '',
      stderr: error.stderr ?? '',
      error,
    };
  }
}

function outputIncludesToken(output, expectedToken) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .some((line) => line.split(/\s+/).includes(expectedToken));
}

function outputIncludesQualifiedSkill(output, qualifiedSkillName) {
  const slashQualifiedSkillName = qualifiedSkillName.replace(':', '/');

  return (
    output.includes(qualifiedSkillName) ||
    output.includes(`/${qualifiedSkillName}`) ||
    output.includes(slashQualifiedSkillName) ||
    output.includes(`/${slashQualifiedSkillName}`) ||
    outputIncludesToken(output, qualifiedSkillName) ||
    outputIncludesToken(output, `/${qualifiedSkillName}`) ||
    outputIncludesToken(output, slashQualifiedSkillName) ||
    outputIncludesToken(output, `/${slashQualifiedSkillName}`)
  );
}

function readJson(root, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function listSkillNames(root, relativeSkillDir) {
  const skillDir = path.join(root, relativeSkillDir);

  return fs.readdirSync(skillDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((skillName) => fs.existsSync(path.join(skillDir, skillName, 'SKILL.md')))
    .sort();
}

function verifyCopilotRuntime(pluginRoot, relativeSkillDir) {
  if (!hasCommand('copilot')) {
    console.log('Skipping Copilot runtime verification: `copilot` is not installed.');
    return;
  }

  const pluginManifest = readJson(pluginRoot, 'plugin.json');
  const pluginName = pluginManifest.name;
  const skillNames = listSkillNames(pluginRoot, relativeSkillDir);
  const configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'copilot-runtime-'));

  try {
    console.log(`Verifying Copilot plugin install/list/uninstall for ${pluginName} in an isolated config dir...`);

    run('copilot', ['plugin', 'install', '--config-dir', configDir, pluginRoot]);

    const installed = run('copilot', ['plugin', 'list', '--config-dir', configDir]);
    assert.ok(
      outputIncludesToken(installed, pluginName),
      `Expected Copilot plugin list to include ${pluginName}.\n${installed}`,
    );

    const loadedSkills = run(
      'copilot',
      [
        '-p',
        'List the plugin-qualified skill names loaded from this plugin, one per line and nothing else.',
        '--config-dir',
        configDir,
        '--allow-all-tools',
        '--output-format',
        'text',
      ],
      { cwd: pluginRoot },
    );

    for (const skillName of skillNames) {
      const qualifiedSkillName = `${pluginName}:${skillName}`;
      assert.ok(
        outputIncludesQualifiedSkill(loadedSkills, qualifiedSkillName),
        `Expected Copilot runtime output to include ${qualifiedSkillName}.\n${loadedSkills}`,
      );
    }

    const uninstallResult = tryRun(
      'copilot',
      ['plugin', 'uninstall', '--config-dir', configDir, pluginName],
    );

    if (!uninstallResult.ok) {
      const knownAliases = [pluginName, `${pluginName}@${ROOT_PACKAGE_NAME}`];
      const uninstallMissingKnownAlias = knownAliases.some((alias) => (
        uninstallResult.stderr.includes(`Plugin "${alias}" is not installed`)
      ));

      if (!uninstallMissingKnownAlias) {
        throw uninstallResult.error;
      }

      console.warn(
        `Copilot uninstall skipped for ${pluginName}: CLI reported the plugin missing in isolated config; removing config dir instead.`,
      );
    }
  } finally {
    fs.rmSync(configDir, { recursive: true, force: true });
  }
}

function verifyClaudePlugin(pluginRoot, relativeSkillDir) {
  if (!hasCommand('claude')) {
    console.log('Skipping Claude plugin validation: `claude` is not installed.');
    return;
  }

  const pluginManifest = readJson(pluginRoot, '.claude-plugin/plugin.json');
  const pluginName = pluginManifest.name;
  const skillNames = listSkillNames(pluginRoot, relativeSkillDir);

  console.log(`Validating Claude plugin manifest and structure for ${pluginName}...`);
  run('claude', ['plugin', 'validate', pluginRoot], { stdio: 'inherit' });

  console.log(`Verifying Claude plugin loading in session-only mode for ${pluginName}...`);
  const loadedSkills = run(
    'claude',
    [
      '-p',
      '--plugin-dir',
      pluginRoot,
      '--output-format',
      'text',
      'List the plugin-qualified skill names loaded from this plugin, one per line and nothing else.',
    ],
    { cwd: pluginRoot },
  );

  for (const skillName of skillNames) {
    const qualifiedSkillName = `${pluginName}:${skillName}`;
    assert.ok(
      outputIncludesQualifiedSkill(loadedSkills, qualifiedSkillName),
      `Expected Claude runtime output to include ${qualifiedSkillName}.\n${loadedSkills}`,
    );
  }
}

const requestedPlugins = process.argv.slice(2);
const targetNames = requestedPlugins.length === 0
  ? [...PLUGIN_TARGETS.keys()]
  : requestedPlugins;

for (const targetName of targetNames) {
  const target = PLUGIN_TARGETS.get(targetName);

  assert.ok(target, `Unknown plugin target: ${targetName}`);
  verifyCopilotRuntime(target.root, target.copilotSkillDir);
  verifyClaudePlugin(target.root, target.claudeSkillDir);
}

console.log('Runtime verification completed.');
