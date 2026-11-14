#!/usr/bin/env node

/**
 * Skill Pack Manager — Modular Skill Presets
 *
 * Implements BMad-inspired Skill Packs:
 * - Groups 130+ specialized skills into installable domain packs
 * - Auto-detects recommended packs from codebase scan
 * - Allows developers to enable/disable packs to keep context clean
 *
 * Usage:
 *   node scripts/skill-pack-manager.mjs list
 *   node scripts/skill-pack-manager.mjs add rust-systems
 *   node scripts/skill-pack-manager.mjs remove web3
 *   node scripts/skill-pack-manager.mjs auto [projectDir]
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(__dirname, '..');
export const CORE_DIR = join(ROOT, '.agent-core');
export const PACKS_FILE = join(CORE_DIR, 'skill-packs.json');

/**
 * Load all available pack definitions.
 */
export function loadPackDefinitions() {
  if (!existsSync(PACKS_FILE)) {
    throw new Error(`Skill packs definition not found at: ${PACKS_FILE}`);
  }
  const raw = JSON.parse(readFileSync(PACKS_FILE, 'utf-8'));
  return raw.packs || {};
}

/**
 * Get active packs for a project.
 * @param {string} projectDir 
 * @returns {string[]}
 */
export function getActivePacks(projectDir = ROOT) {
  const activeFile = join(projectDir, '.agent-memory', 'active-packs.json');
  if (existsSync(activeFile)) {
    try {
      const data = JSON.parse(readFileSync(activeFile, 'utf-8'));
      if (Array.isArray(data.packs)) return data.packs;
    } catch {
      // Fallback
    }
  }
  // Default to core, web-frontend, and nestjs-backend if not configured
  return ['core', 'web-frontend', 'nestjs-backend'];
}

/**
 * Check whether projectDir is the opencode-saas-kit source repository itself.
 * Prevents destructive pack pruning inside the SSoT kit repository.
 * @param {string} projectDir
 * @returns {boolean}
 */
export function isKitSourceRepo(projectDir = ROOT) {
  if (existsSync(join(projectDir, '.agent-core', 'presets'))) {
    return true;
  }
  const pkgFile = join(projectDir, 'package.json');
  if (existsSync(pkgFile)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgFile, 'utf-8'));
      if (pkg && pkg.name === 'opencode-saas-kit') {
        return true;
      }
    } catch {
      // Ignore malformed package.json
    }
  }
  return false;
}

/**
 * Safely regenerate .opencode/agent-registry.json when active packs change.
 * Never deletes SSoT files in .agent-core/, and is a safe no-op in isolated
 * directories that do not contain skill-registry.mjs or agent-registry.json.
 * @param {string} projectDir
 * @returns {{ synced: boolean, registryPath?: string, reason?: string }}
 */
export function syncActivePacksToRegistry(projectDir = ROOT) {
  const registryScript = join(projectDir, 'scripts', 'skill-registry.mjs');
  const registryFile = join(projectDir, '.opencode', 'agent-registry.json');

  if (existsSync(registryScript)) {
    execFileSync(process.execPath, [registryScript], {
      cwd: projectDir,
      stdio: 'pipe',
    });
    return { synced: true, registryPath: registryFile };
  }

  if (existsSync(registryFile)) {
    try {
      const existing = JSON.parse(readFileSync(registryFile, 'utf-8'));
      const activePacks = getActivePacks(projectDir);
      const activeAgentSet = new Set(getActiveAgents(projectDir));
      const updatedAgents = {};
      for (const [name, data] of Object.entries(existing.agents || {})) {
        updatedAgents[name] = {
          ...data,
          active: activeAgentSet.has(name),
        };
      }
      const updated = {
        ...existing,
        _generated: new Date().toISOString(),
        activePacks,
        agents: updatedAgents,
      };
      writeFileSync(registryFile, JSON.stringify(updated, null, 2) + '\n', 'utf-8');
      return { synced: true, registryPath: registryFile };
    } catch {
      return { synced: false, reason: 'failed to update existing agent-registry.json' };
    }
  }

  return { synced: false, reason: 'no registry script or agent-registry.json present' };
}

/**
 * Set active packs for a project.
 * @param {string} projectDir 
 * @param {string[]} packs 
 */
export function setActivePacks(projectDir = ROOT, packs = ['core']) {
  const memDir = join(projectDir, '.agent-memory');
  if (!existsSync(memDir)) {
    mkdirSync(memDir, { recursive: true });
  }
  const activeFile = join(memDir, 'active-packs.json');
  // Always ensure 'core' is present
  const unique = Array.from(new Set(['core', ...packs]));
  const payload = {
    updatedAt: new Date().toISOString(),
    packs: unique,
  };
  writeFileSync(activeFile, JSON.stringify(payload, null, 2) + '\n', 'utf-8');
  return unique;
}

/**
 * Add a pack to active list.
 */
export function addPack(projectDir = ROOT, packName) {
  const definitions = loadPackDefinitions();
  if (!definitions[packName]) {
    throw new Error(`Unknown skill pack: "${packName}". Available: ${Object.keys(definitions).join(', ')}`);
  }
  const current = getActivePacks(projectDir);
  if (!current.includes(packName)) {
    current.push(packName);
    setActivePacks(projectDir, current);
  }
  return current;
}

/**
 * Remove a pack from active list.
 */
export function removePack(projectDir = ROOT, packName) {
  if (packName === 'core') {
    throw new Error('Cannot remove "core" pack — essential workflows required.');
  }
  const current = getActivePacks(projectDir);
  const filtered = current.filter(p => p !== packName);
  setActivePacks(projectDir, filtered);
  return filtered;
}

/**
 * Get active agents based on active packs.
 * @param {string} projectDir
 * @returns {string[]}
 */
export function getActiveAgents(projectDir = ROOT) {
  const packs = loadPackDefinitions();
  const activePacks = getActivePacks(projectDir);
  const activeAgents = new Set();
  for (const p of activePacks) {
    if (packs[p] && Array.isArray(packs[p].agents)) {
      packs[p].agents.forEach(a => activeAgents.add(a));
    }
  }
  return Array.from(activeAgents);
}

/**
 * Get active skills based on active packs.
 * @param {string} projectDir
 * @returns {string[]}
 */
export function getActiveSkills(projectDir = ROOT) {
  const packs = loadPackDefinitions();
  const activePacks = getActivePacks(projectDir);
  const activeSkills = new Set();
  for (const p of activePacks) {
    if (packs[p] && Array.isArray(packs[p].skills)) {
      packs[p].skills.forEach(s => activeSkills.add(s));
    }
  }
  return Array.from(activeSkills);
}

/**
 * Auto-detect recommended packs from scan results.
 * @param {object} scanResults
 * @returns {string[]}
 */
export function detectRecommendedPacks(scanResults = {}) {
  const recommended = new Set(['core']);
  const langs = (scanResults.languages || []).map(l => l.toLowerCase());
  const frameworks = (scanResults.frameworks || []).map(f => f.toLowerCase());
  const pkgMgr = (scanResults.primaryPackageManager || '').toLowerCase();

  // Web Frontend
  if (
    langs.includes('typescript') ||
    langs.includes('javascript') ||
    frameworks.some(f => ['next.js', 'react', 'vue', 'tailwind css', 'tailwind'].includes(f))
  ) {
    recommended.add('web-frontend');
  }

  // NestJS Backend
  if (
    frameworks.some(f => ['nest.js', 'nestjs'].includes(f)) ||
    (scanResults.database && scanResults.database.length > 0 && langs.includes('typescript'))
  ) {
    recommended.add('nestjs-backend');
  }

  // Python & AI
  if (
    langs.includes('python') ||
    frameworks.some(f => ['fastapi', 'django', 'flask', 'langgraph', 'langchain'].includes(f)) ||
    ['uv', 'poetry', 'pipenv'].includes(pkgMgr)
  ) {
    recommended.add('python-ai');
  }

  // Rust Systems
  if (langs.includes('rust') || ['cargo'].includes(pkgMgr) || frameworks.some(f => ['axum', 'tokio', 'tauri'].includes(f))) {
    recommended.add('rust-systems');
  }

  // Mobile Systems & Cross-Platform (Bare React Native)
  if (frameworks.some(f => ['react native', 'react-native'].includes(f))) {
    recommended.add('mobile-native');
  }

  // Native macOS & Apple Systems (Swift / SwiftUI / AppKit)
  if (
    langs.includes('swift') ||
    pkgMgr === 'spm' ||
    frameworks.some(f => ['swiftui', 'appkit', 'macos'].includes(f))
  ) {
    recommended.add('swift-macos');
  }

  // Office & Document Processing Squad
  if (
    frameworks.some(f => ['office / pdf processing', 'office-pdf', 'latex', 'openpyxl', 'reportlab', 'pptxgenjs', 'docx', 'xlsx', 'pptx', 'pdf'].includes(f))
  ) {
    recommended.add('document-office');
  }

  // DevOps & Cloud
  if (scanResults.docker || scanResults.monorepo) {
    recommended.add('devops-infra');
  }

  return Array.from(recommended);
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI Handler
// ─────────────────────────────────────────────────────────────────────────────
if (process.argv[1] && process.argv[1].endsWith('skill-pack-manager.mjs')) {
  const args = process.argv.slice(2);
  const command = args[0] || 'list';
  const targetDir = ROOT;

  const defs = loadPackDefinitions();
  const active = getActivePacks(targetDir);

  if (command === 'list') {
    console.log('\n📦 Agent-Centric Skill Packs:\n');
    for (const [id, pack] of Object.entries(defs)) {
      const isActive = active.includes(id);
      const mark = isActive ? '✅ ACTIVE  ' : '⚪ INACTIVE';
      const agentsStr = (pack.agents || []).join(', ');
      console.log(`${mark} [${id}] — ${pack.name}`);
      console.log(`            Agents: [${agentsStr}] | Skills: ${pack.skills.length}`);
      console.log(`            ${pack.description}\n`);
    }
  } else if (command === 'add') {
    const pack = args[1];
    if (!pack) {
      console.error('Error: specify pack name to add. Run "list" to see packs.');
      process.exit(1);
    }
    const updated = addPack(targetDir, pack);
    const syncRes = syncActivePacksToRegistry(targetDir);
    console.log(`\n✅ Activated pack: [${pack}]. Active packs: ${updated.join(', ')}`);
    if (syncRes.synced) {
      console.log(`   Synced active packs to ${syncRes.registryPath}`);
    }
    console.log('');
  } else if (command === 'remove') {
    const pack = args[1];
    if (!pack) {
      console.error('Error: specify pack name to remove.');
      process.exit(1);
    }
    const updated = removePack(targetDir, pack);
    const syncRes = syncActivePacksToRegistry(targetDir);
    console.log(`\n🗑️  Removed pack: [${pack}]. Active packs: ${updated.join(', ')}`);
    if (syncRes.synced) {
      console.log(`   Synced active packs to ${syncRes.registryPath}`);
    }
    console.log('');
  } else if (command === 'auto') {
    // Scan projectDir and configure
    import('./repo-scanner.mjs').then(({ scanRepo }) => {
      const scan = scanRepo(targetDir);
      const recommended = detectRecommendedPacks(scan);
      const updated = setActivePacks(targetDir, recommended);
      const syncRes = syncActivePacksToRegistry(targetDir);
      console.log(`\n🔍 Auto-detected and enabled packs based on codebase:`);
      console.log(`   Active: ${updated.join(', ')}`);
      if (syncRes.synced) {
        console.log(`   Synced active packs to ${syncRes.registryPath}`);
      }
      console.log('');
    });
  } else {
    console.log('Usage: node scripts/skill-pack-manager.mjs [list|add <pack>|remove <pack>|auto]');
  }
}
