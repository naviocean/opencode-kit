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
  // Default to core and web-fullstack if not configured
  return ['core', 'web-fullstack'];
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
 * Auto-detect recommended packs from scan results.
 * @param {object} scanResults
 * @returns {string[]}
 */
export function detectRecommendedPacks(scanResults = {}) {
  const recommended = new Set(['core']);
  const langs = (scanResults.languages || []).map(l => l.toLowerCase());
  const frameworks = (scanResults.frameworks || []).map(f => f.toLowerCase());
  const pkgMgr = (scanResults.primaryPackageManager || '').toLowerCase();

  // Web Fullstack
  if (
    langs.includes('typescript') ||
    langs.includes('javascript') ||
    frameworks.some(f => ['next.js', 'react', 'nest.js', 'vue', 'tailwind'].includes(f)) ||
    ['pnpm', 'bun', 'yarn', 'npm'].includes(pkgMgr)
  ) {
    recommended.add('web-fullstack');
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

  // DevOps & Cloud
  if (scanResults.docker || scanResults.monorepo) {
    recommended.add('devops-cloud');
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
    console.log('\n📦 Skill Packs:\n');
    for (const [id, pack] of Object.entries(defs)) {
      const isActive = active.includes(id);
      const mark = isActive ? '✅ ACTIVE  ' : '⚪ INACTIVE';
      console.log(`${mark} [${id}] — ${pack.name} (${pack.skills.length} skills)`);
      console.log(`            ${pack.description}\n`);
    }
  } else if (command === 'add') {
    const pack = args[1];
    if (!pack) {
      console.error('Error: specify pack name to add. Run "list" to see packs.');
      process.exit(1);
    }
    const updated = addPack(targetDir, pack);
    console.log(`\n✅ Activated pack: [${pack}]. Active packs: ${updated.join(', ')}\n`);
  } else if (command === 'remove') {
    const pack = args[1];
    if (!pack) {
      console.error('Error: specify pack name to remove.');
      process.exit(1);
    }
    const updated = removePack(targetDir, pack);
    console.log(`\n🗑️  Removed pack: [${pack}]. Active packs: ${updated.join(', ')}\n`);
  } else if (command === 'auto') {
    // Scan projectDir and configure
    import('./repo-scanner.mjs').then(({ scanRepo }) => {
      const scan = scanRepo(targetDir);
      const recommended = detectRecommendedPacks(scan);
      const updated = setActivePacks(targetDir, recommended);
      console.log(`\n🔍 Auto-detected and enabled packs based on codebase:`);
      console.log(`   Active: ${updated.join(', ')}\n`);
    });
  } else {
    console.log('Usage: node scripts/skill-pack-manager.mjs [list|add <pack>|remove <pack>|auto]');
  }
}
