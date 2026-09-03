#!/usr/bin/env node

/**
 * Universal SaaS Kit Sync Engine (sync-kit.mjs)
 * 
 * Synchronizes single-source-of-truth (.agent-core/) across AI developer environments:
 * - OpenCode (.opencode/, opencode.json)
 * - Antigravity (.agents/, AGENTS.md)
 * - Claude Code (.claude/, CLAUDE.md)
 * - Cursor (.cursor/rules/*.mdc, .cursorrules)
 * 
 * Usage:
 *   node scripts/sync-kit.mjs [--target all|opencode|claude|cursor|antigravity] [--mode symlink|copy] [--dry-run]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const CORE_DIR = path.join(ROOT, '.agent-core');
const PRESETS_DIR = path.join(CORE_DIR, 'presets');

// Color helpers
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

function logSuccess(msg) { console.log(`  ${c.green}✔${c.reset} ${msg}`); }
function logInfo(msg) { console.log(`  ${c.blue}ℹ${c.reset} ${msg}`); }
function logWarn(msg) { console.log(`  ${c.yellow}⚠${c.reset} ${msg}`); }
function logStep(msg) { console.log(`\n${c.bold}${msg}${c.reset}`); }

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    target: null,
    mode: 'symlink',
    preset: null,
    clean: false,
    dryRun: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--target' && args[i + 1]) {
      options.target = args[++i];
    } else if (arg.startsWith('--target=')) {
      options.target = arg.split('=')[1];
    } else if ((arg === '--preset' || arg === '--profile') && args[i + 1]) {
      options.preset = args[++i];
    } else if (arg.startsWith('--preset=') || arg.startsWith('--profile=')) {
      options.preset = arg.split('=')[1];
    } else if (arg === '--mode' && args[i + 1]) {
      options.mode = args[++i];
    } else if (arg.startsWith('--mode=')) {
      options.mode = arg.split('=')[1];
    } else if (arg === '--copy') {
      options.mode = 'copy';
    } else if (arg === '--clean') {
      options.clean = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    }
  }

  // Default target resolution:
  // If target wasn't explicitly specified, but preset was given:
  // Target defaults to the preset's harness (e.g. --preset opencode -> target opencode)
  if (!options.target) {
    if (options.preset) {
      options.target = options.preset;
    } else {
      options.target = 'all';
    }
  }

  return options;
}

function showHelp() {
  console.log(`
Universal SaaS Kit Sync Engine

Usage:
  node scripts/sync-kit.mjs [options]

Options:
  --preset <name>      Apply model preset: opencode, claude, antigravity, codex
  --target <target>    Target environment: all, opencode, antigravity, claude, codex (default: all)
  --clean              Clean/remove generated harness adapters on-demand
  --mode <mode>        Sync mode: symlink or copy (default: symlink)
  --copy               Shortcut for --mode copy
  --dry-run            Show what would be done without modifying files
  --help, -h           Show this help
`);
}

function getPresetFile(presetName) {
  const name = presetName || 'opencode';
  return path.join(PRESETS_DIR, `agent-models-${name}.json`);
}

// Validate model preset
function applyModelPreset(presetName, dryRun) {
  logStep(`0. Applying model preset: "${presetName}"...`);
  const presetFile = getPresetFile(presetName);

  if (!fs.existsSync(presetFile)) {
    logWarn(`Preset file not found: ${presetFile}`);
    if (fs.existsSync(PRESETS_DIR)) {
      const available = fs.readdirSync(PRESETS_DIR)
        .filter(f => f.startsWith('agent-models-') && f.endsWith('.json'))
        .map(f => f.replace('agent-models-', '').replace('.json', ''));
      logInfo(`Available presets: ${available.join(', ')}`);
    }
    return false;
  }

  logSuccess(`Selected preset "${presetName}" (${path.relative(ROOT, presetFile)})`);
  return true;
}

// Copy recursively helper
function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return false;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
  return true;
}

// Ensure relative symlink or copy
function linkOrCopy(srcPath, destPath, mode, dryRun) {
  if (!fs.existsSync(srcPath)) {
    logWarn(`Source path does not exist: ${srcPath}`);
    return false;
  }

  const destDir = path.dirname(destPath);
  if (!fs.existsSync(destDir) && !dryRun) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  // Calculate relative target for symlink (relative from destPath's dir to srcPath)
  const relTarget = path.relative(destDir, srcPath);

  // If destination already exists, remove it first
  if (fs.existsSync(destPath) || fs.lstatSync(destPath, { throwIfNoEntry: false })?.isSymbolicLink?.()) {
    if (!dryRun) {
      try {
        fs.rmSync(destPath, { recursive: true, force: true });
      } catch (_) {
        // Fallback for dangling symlinks
        fs.unlinkSync(destPath);
      }
    }
  }

  const stat = fs.statSync(srcPath);
  const isDirectory = stat.isDirectory();

  if (dryRun) {
    logInfo(`[dry-run] Would link/copy ${destPath} -> ${relTarget}`);
    return true;
  }

  if (mode === 'symlink') {
    try {
      // Use 'junction' on Windows for directories, 'dir' on POSIX
      const symlinkType = isDirectory ? (process.platform === 'win32' ? 'junction' : 'dir') : 'file';
      fs.symlinkSync(relTarget, destPath, symlinkType);
      return true;
    } catch (err) {
      logWarn(`Symlink failed (${err.message}). Falling back to copy for ${path.basename(destPath)}`);
      return copyRecursive(srcPath, destPath);
    }
  } else {
    return copyRecursive(srcPath, destPath);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Model Sync from active preset to agent Markdown frontmatters and AGENTS.md
// ─────────────────────────────────────────────────────────────────────────────
function syncAgentModels(presetName, dryRun) {
  const presetFile = getPresetFile(presetName);
  logStep(`1. Synchronizing Models from preset: ${path.basename(presetFile)}...`);
  
  if (!fs.existsSync(presetFile)) {
    logWarn(`Cannot find preset file: ${presetFile}`);
    return;
  }

  const modelsData = JSON.parse(fs.readFileSync(presetFile, 'utf-8'));
  const agents = modelsData.agents || {};
  const coreAgentsDir = path.join(CORE_DIR, 'agents');

  if (!fs.existsSync(coreAgentsDir)) {
    logWarn(`Agents dir not found: ${coreAgentsDir}`);
    return;
  }

  let updatedCount = 0;
  for (const [agentName, config] of Object.entries(agents)) {
    const agentFile = path.join(coreAgentsDir, `${agentName}.md`);
    if (!fs.existsSync(agentFile)) continue;

    const content = fs.readFileSync(agentFile, 'utf-8');
    const modelMatch = content.match(/^model:\s*(.+)$/m);
    const targetModel = config.model;

    if (targetModel && (!modelMatch || modelMatch[1].trim() !== targetModel)) {
      if (dryRun) {
        logInfo(`[dry-run] Would update ${agentName}.md model: ${targetModel}`);
        updatedCount++;
      } else {
        const updated = content.replace(/^model:\s*.+$/m, `model: ${targetModel}`);
        fs.writeFileSync(agentFile, updated, 'utf-8');
        updatedCount++;
      }
    }
  }

  // Synchronize active models to AGENTS.md table
  updateAgentsMdTriggerTable(agents, dryRun);

  logSuccess(`Validated models for ${Object.keys(agents).length} agents (${updatedCount} updated).`);
}

function updateAgentsMdTriggerTable(agents, dryRun) {
  const agentsMdPath = path.join(ROOT, 'AGENTS.md');
  if (!fs.existsSync(agentsMdPath)) return;

  let content = fs.readFileSync(agentsMdPath, 'utf-8');

  // Ensure header has Model column
  if (!content.includes('| If the request mentions… | Activate | Model |')) {
    content = content.replace(
      /\|\s*If the request mentions…\s*\|\s*Activate\s*\|\n\|\s*---\s*\|\s*---\s*\|/,
      '| If the request mentions… | Activate | Model |\n|---|---|---|'
    );
  }

  // Update each row with active model
  for (const [agentName, config] of Object.entries(agents)) {
    const model = config.model || '';
    const rowRegex = new RegExp(`(\\|[^\\n|]+\\|\\s*\\*\\*${agentName}\\*\\*\\s*\\|)(?:[^\\n|]*\\|)?`, 'g');
    content = content.replace(rowRegex, `$1 \`${model}\` |`);
  }

  if (!dryRun) {
    fs.writeFileSync(agentsMdPath, content, 'utf-8');
  }
}

/**
 * Synchronize agent markdown files into destDir by copying from .agent-core/agents/*.md
 * and replacing the frontmatter `model:` field with the model from presetFile.
 */
function syncAgentsWithPreset(destDir, presetFile, dryRun) {
  if (!fs.existsSync(presetFile)) {
    logWarn(`Preset file not found: ${presetFile}`);
    return;
  }

  const presetData = JSON.parse(fs.readFileSync(presetFile, 'utf-8'));
  const agentsConfig = presetData.agents || {};
  const coreAgentsDir = path.join(CORE_DIR, 'agents');

  if (!fs.existsSync(coreAgentsDir)) {
    logWarn(`Core agents dir not found: ${coreAgentsDir}`);
    return;
  }

  // If destDir is currently a symlink, unlink it to allow a real directory
  try {
    if (fs.existsSync(destDir) || fs.lstatSync(destDir).isSymbolicLink?.()) {
      if (fs.lstatSync(destDir).isSymbolicLink()) {
        if (!dryRun) fs.unlinkSync(destDir);
      }
    }
  } catch (_) {}

  if (!dryRun && !fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const agentFiles = fs.readdirSync(coreAgentsDir).filter(f => f.endsWith('.md'));
  for (const file of agentFiles) {
    const srcFile = path.join(coreAgentsDir, file);
    const destFile = path.join(destDir, file);
    const agentName = path.basename(file, '.md');
    const targetModel = agentsConfig[agentName]?.model;

    const content = fs.readFileSync(srcFile, 'utf-8');
    let updated = content;
    if (targetModel) {
      updated = content.replace(/^model:\s*.+$/m, `model: ${targetModel}`);
    }

    if (!dryRun) {
      fs.writeFileSync(destFile, updated, 'utf-8');
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. OpenCode Adapter (.opencode/)
// ─────────────────────────────────────────────────────────────────────────────
function syncOpenCode(mode, dryRun, presetName) {
  logStep('2. Syncing OpenCode Adapter (.opencode/)...');
  const opencodeDir = path.join(ROOT, '.opencode');
  if (!fs.existsSync(opencodeDir) && !dryRun) {
    fs.mkdirSync(opencodeDir, { recursive: true });
  }

  const opencodeModelsDest = path.join(opencodeDir, 'agent-models.json');

  // If a preset is explicitly requested, overwrite with that preset
  if (presetName && fs.existsSync(path.join(PRESETS_DIR, `agent-models-${presetName}.json`))) {
    const opencodePreset = path.join(PRESETS_DIR, `agent-models-${presetName}.json`);
    try {
      if (fs.existsSync(opencodeModelsDest) || fs.lstatSync(opencodeModelsDest).isSymbolicLink?.()) {
        if (fs.lstatSync(opencodeModelsDest).isSymbolicLink()) {
          if (!dryRun) fs.unlinkSync(opencodeModelsDest);
        }
      }
    } catch (_) {}
    if (!dryRun) {
      fs.copyFileSync(opencodePreset, opencodeModelsDest);
    }
  } else if (!fs.existsSync(opencodeModelsDest)) {
    // If agent-models.json does not exist, initialize from opencode preset
    const defaultPreset = path.join(PRESETS_DIR, 'agent-models-opencode.json');
    if (!dryRun) {
      fs.copyFileSync(defaultPreset, opencodeModelsDest);
    }
  }

  // Copy agents and replace model per active .opencode/agent-models.json (NO SYMLINK)
  const opencodeAgentsDir = path.join(opencodeDir, 'agents');
  syncAgentsWithPreset(opencodeAgentsDir, opencodeModelsDest, dryRun);

  // Symlink static assets (skills, rules, standards, commands, hooks, memory)
  const staticTargets = [
    { src: path.join(CORE_DIR, 'skills'), dest: path.join(opencodeDir, 'skills') },
    { src: path.join(CORE_DIR, 'rules'), dest: path.join(opencodeDir, 'rules') },
    { src: path.join(CORE_DIR, 'standards'), dest: path.join(opencodeDir, 'standards') },
    { src: path.join(CORE_DIR, 'commands'), dest: path.join(opencodeDir, 'commands') },
    { src: path.join(CORE_DIR, 'hooks'), dest: path.join(opencodeDir, 'hooks') },
    { src: path.join(ROOT, '.agent-memory'), dest: path.join(opencodeDir, 'memory') },
    { src: path.join(CORE_DIR, 'skill-packs.json'), dest: path.join(opencodeDir, 'skill-packs.json') },
  ];

  for (const { src, dest } of staticTargets) {
    if (fs.existsSync(src)) {
      linkOrCopy(src, dest, mode, dryRun);
    }
  }

  // Regenerate agent-registry.json
  const registryScript = path.join(ROOT, 'scripts', 'skill-registry.mjs');
  if (fs.existsSync(registryScript) && !dryRun) {
    try {
      execSync(`node "${registryScript}"`, { stdio: 'ignore' });
    } catch (err) {
      logWarn(`Could not run skill-registry.mjs: ${err.message}`);
    }
  }

  logSuccess('OpenCode adapter synchronized successfully (agents copied & models mapped).');
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Antigravity & OpenAI Codex Adapter (.agents/ & AGENTS.md)
// ─────────────────────────────────────────────────────────────────────────────
function syncAntigravityAndCodex(mode, dryRun, presetName, target) {
  logStep('3. Syncing Antigravity & OpenAI Codex Adapter (.agents/ & AGENTS.md)...');
  const agentsDir = path.join(ROOT, '.agents');
  if (!fs.existsSync(agentsDir) && !dryRun) {
    fs.mkdirSync(agentsDir, { recursive: true });
  }

  // Ensure .agents/agent-models.json is completely removed (not used by Antigravity or Codex)
  const leftoverModels = path.join(agentsDir, 'agent-models.json');
  try {
    if (fs.existsSync(leftoverModels) || fs.lstatSync(leftoverModels).isSymbolicLink?.()) {
      if (!dryRun) fs.unlinkSync(leftoverModels);
    }
  } catch (_) {}

  // Determine preset for .agents/
  let agentsPresetName = 'antigravity';
  if (presetName === 'codex' || target === 'codex') {
    agentsPresetName = 'codex';
  } else if (presetName === 'claude') {
    agentsPresetName = 'claude';
  } else if (presetName === 'opencode') {
    agentsPresetName = 'opencode';
  } else if (presetName) {
    agentsPresetName = presetName;
  }
  const agentsPreset = path.join(PRESETS_DIR, `agent-models-${agentsPresetName}.json`);

  // Copy agents and replace model per preset (NO SYMLINK)
  const destAgentsDir = path.join(agentsDir, 'agents');
  syncAgentsWithPreset(destAgentsDir, agentsPreset, dryRun);

  // Symlink static assets (skills, rules, memory, skill-packs)
  const staticTargets = [
    { src: path.join(CORE_DIR, 'skills'), dest: path.join(agentsDir, 'skills') },
    { src: path.join(CORE_DIR, 'rules'), dest: path.join(agentsDir, 'rules') },
    { src: path.join(ROOT, '.agent-memory'), dest: path.join(agentsDir, 'memory') },
    { src: path.join(CORE_DIR, 'skill-packs.json'), dest: path.join(agentsDir, 'skill-packs.json') },
  ];

  for (const { src, dest } of staticTargets) {
    if (fs.existsSync(src)) {
      linkOrCopy(src, dest, mode, dryRun);
    }
  }

  logSuccess(`Antigravity & OpenAI Codex adapter synchronized successfully (.agents/agents/ with ${agentsPresetName} preset).`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Claude Code Adapter (.claude/ & CLAUDE.md)
// ─────────────────────────────────────────────────────────────────────────────
function syncClaudeCode(mode, dryRun) {
  logStep('4. Syncing Claude Code Adapter (.claude/ & CLAUDE.md)...');
  const claudeDir = path.join(ROOT, '.claude');
  if (!fs.existsSync(claudeDir) && !dryRun) {
    fs.mkdirSync(claudeDir, { recursive: true });
  }

  // Skills symlink
  const skillsSrc = path.join(CORE_DIR, 'skills');
  const skillsDest = path.join(claudeDir, 'skills');
  if (fs.existsSync(skillsSrc)) {
    linkOrCopy(skillsSrc, skillsDest, mode, dryRun);
  }

  // Memory symlink
  const memorySrc = path.join(ROOT, '.agent-memory');
  const memoryDest = path.join(claudeDir, 'memory');
  if (fs.existsSync(memorySrc)) {
    linkOrCopy(memorySrc, memoryDest, mode, dryRun);
  }

  // Generate / update CLAUDE.md
  const claudeMdPath = path.join(ROOT, 'CLAUDE.md');
  const claudeMdContent = `# Claude Code Project Instructions

> Universal Agent Kit for SaaS Development. This project is configured with 11 specialized AI agent roles, 157+ skills, TDD enforcement, and AgentShield security gating.

## Project Rules & Guidelines
- Primary Rules: See [AGENTS.md](AGENTS.md) for full agent trigger mapping and HARD RULES.
- Memory & Context: Persistent project memory is maintained in [.agent-memory/](.agent-memory/).
- Conventions: [.opencode/standards/conventions.md](.opencode/standards/conventions.md)
- Skills Library: Available in \`.claude/skills/\` (or \`.agent-core/skills/\`).

## Universal Workflows
- Plan: Follow Socratic planning workflow before writing non-trivial code. Write PRD to \`docs/prds/\`.
- Test: Strict TDD (RED → GREEN → REFACTOR). Vitest for frontend/unit, Jest/Supertest for NestJS, pytest for Python, cargo test for Rust.
- Security: Pre-tool security gating enforced via AgentShield. No secrets or destructive commands.
- Review: Check changes with git diff before proposing merge.
`;

  if (!fs.existsSync(claudeMdPath) || fs.readFileSync(claudeMdPath, 'utf-8').includes('Universal Agent Kit')) {
    if (!dryRun) {
      fs.writeFileSync(claudeMdPath, claudeMdContent, 'utf-8');
    }
  }

  logSuccess('Claude Code adapter synchronized successfully.');
}

// ─────────────────────────────────────────────────────────────────────────────
// Clean Harness Adapters (On-demand cleanup)
// ─────────────────────────────────────────────────────────────────────────────
function cleanAdapters(target, dryRun) {
  logStep('Cleaning generated harness adapters...');
  const shouldClean = (name) => target === 'all' || target.split(',').map(s => s.trim()).includes(name);

  if (shouldClean('opencode')) {
    const opencodeDir = path.join(ROOT, '.opencode');
    if (fs.existsSync(opencodeDir)) {
      if (dryRun) {
        logInfo('Would remove .opencode/ adapter');
      } else {
        fs.rmSync(opencodeDir, { recursive: true, force: true });
        logSuccess('Removed .opencode/ adapter');
      }
    }
  }

  if (shouldClean('antigravity') || shouldClean('codex')) {
    const agentsDir = path.join(ROOT, '.agents');
    if (fs.existsSync(agentsDir)) {
      if (dryRun) {
        logInfo('Would remove .agents/ adapter');
      } else {
        fs.rmSync(agentsDir, { recursive: true, force: true });
        logSuccess('Removed .agents/ adapter');
      }
    }
  }

  if (shouldClean('claude')) {
    const claudeDir = path.join(ROOT, '.claude');
    if (fs.existsSync(claudeDir)) {
      if (dryRun) {
        logInfo('Would remove .claude/ adapter');
      } else {
        fs.rmSync(claudeDir, { recursive: true, force: true });
        logSuccess('Removed .claude/ adapter');
      }
    }
    const claudeMd = path.join(ROOT, 'CLAUDE.md');
    if (fs.existsSync(claudeMd)) {
      if (dryRun) {
        logInfo('Would remove CLAUDE.md');
      } else {
        fs.unlinkSync(claudeMd);
        logSuccess('Removed CLAUDE.md');
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Ensure Universal Persistent Memory (.agent-memory/)
// ─────────────────────────────────────────────────────────────────────────────
function ensureAgentMemory(dryRun) {
  logStep('2. Ensuring Universal Persistent Memory (.agent-memory/)...');
  const rootMemoryDir = path.join(ROOT, '.agent-memory');
  const coreMemoryDir = path.join(CORE_DIR, 'memory');

  if (!dryRun) {
    if (!fs.existsSync(rootMemoryDir)) {
      fs.mkdirSync(rootMemoryDir, { recursive: true });
    }
    if (fs.existsSync(coreMemoryDir)) {
      for (const entry of fs.readdirSync(coreMemoryDir)) {
        const srcFile = path.join(coreMemoryDir, entry);
        const destFile = path.join(rootMemoryDir, entry);
        if (!fs.existsSync(destFile)) {
          fs.copyFileSync(srcFile, destFile);
        }
      }
    }
  }
  logSuccess('Persistent memory initialized at .agent-memory/ (SSoT for all harnesses).');
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Dispatcher
// ─────────────────────────────────────────────────────────────────────────────
function main() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  if (options.clean) {
    console.log(`\n${c.bold}🧹 Universal SaaS Kit Clean Engine${c.reset} (target: ${options.target})\n`);
    cleanAdapters(options.target.toLowerCase(), options.dryRun);
    console.log(`\n${c.green}${c.bold}✨ Clean completed successfully!${c.reset}\n`);
    process.exit(0);
  }

  console.log(`\n${c.bold}🔄 Universal SaaS Kit Sync Engine${c.reset} (mode: ${options.mode})\n`);

  // Step 0: Apply preset if requested
  if (options.preset) {
    applyModelPreset(options.preset, options.dryRun);
  }

  // Step 1: Always synchronize models first
  syncAgentModels(options.preset, options.dryRun);

  // Step 2: Ensure neutral persistent memory exists
  ensureAgentMemory(options.dryRun);

  // Targets to sync
  const target = options.target.toLowerCase();
  const shouldSync = (name) => target === 'all' || target.split(',').map(s => s.trim()).includes(name);

  if (shouldSync('opencode')) {
    syncOpenCode(options.mode, options.dryRun, options.preset);
  }

  if (shouldSync('antigravity') || shouldSync('codex')) {
    syncAntigravityAndCodex(options.mode, options.dryRun, options.preset, options.target);
  }

  if (shouldSync('claude')) {
    syncClaudeCode(options.mode, options.dryRun);
  }

  console.log(`\n${c.green}${c.bold}✨ All requested environments synchronized successfully!${c.reset}\n`);
}

main();
