#!/usr/bin/env node

/**
 * E2E Verification Script
 * Kiểm tra toàn bộ cấu hình model-per-agent + skill-auto-load
 * 
 * Usage: node .opencode/scripts/verify.mjs
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  getAgentNames,
  getAgentsDir,
  getModelsFile,
  getRegistryFile,
  getSkillsDir,
  loadRegistry,
  ROOT,
} from './lib/config.mjs';

const AGENTS_DIR = getAgentsDir();

const PASS = '✅';
const FAIL = '❌';
const WARN = '⚠️';

let passed = 0;
let failed = 0;
let warnings = 0;

function check(name, condition, detail = '') {
  if (condition) {
    console.log(`  ${PASS} ${name}`);
    passed++;
  } else {
    console.log(`  ${FAIL} ${name}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

function warn(name, detail = '') {
  console.log(`  ${WARN} ${name}${detail ? ' — ' + detail : ''}`);
  warnings++;
}

// ──────────────────────────────────────────────
console.log('\n📋 E2E Verification: Model-per-Agent + Skill Auto-Load\n');
// ──────────────────────────────────────────────

// 1. Check agent-models.json
console.log('1. agent-models.json');
const modelsFile = getModelsFile();
check('File exists', existsSync(modelsFile));

if (existsSync(modelsFile)) {
  const models = JSON.parse(readFileSync(modelsFile, 'utf-8'));
  const agents = Object.keys(models.agents || {});
  check('Has agents config', agents.length > 0, `Found ${agents.length} agents`);
  
  for (const name of agents) {
    const a = models.agents[name];
    check(`  ${name}: has model`, !!a.model, a.model || 'missing');
    check(`  ${name}: has fallback`, Array.isArray(a.fallback) && a.fallback.length > 0, 
      a.fallback?.join(' → ') || 'no fallback');
  }
}

// 2. Check agent MD files have model in frontmatter
// H1: Agent list derived from agent-models.json (single source of truth)
console.log('\n2. Agent YAML frontmatter (model field)');
const agentFiles = getAgentNames();

for (const name of agentFiles) {
  const file = join(AGENTS_DIR, `${name}.md`);
  check(`${name}.md exists`, existsSync(file));
  
  if (existsSync(file)) {
    const content = readFileSync(file, 'utf-8');
    const modelMatch = content.match(/^model:\s*(.+)$/m);
    check(`  ${name}: has model field`, !!modelMatch, modelMatch?.[1] || 'missing');
  }
}

// 3. Check Startup section in agent MD files
console.log('\n3. Startup (AUTO-EXECUTE) section');
for (const name of agentFiles) {
  const file = join(AGENTS_DIR, `${name}.md`);
  if (existsSync(file)) {
    const content = readFileSync(file, 'utf-8');
    check(`${name}: has Startup section`, content.includes('Startup (AUTO-EXECUTE)'));
    check(`  ${name}: reads registry`, content.includes('agent-registry.json'));
    check(`  ${name}: calls skill()`, content.includes('skill(name='));
  }
}

// 4. Check skill-registry script
console.log('\n4. Skill Registry');
const registryScript = join(ROOT, 'scripts', 'skill-registry.mjs');
check('skill-registry.mjs exists', existsSync(registryScript));

const registryFile = getRegistryFile();
check('agent-registry.json exists', existsSync(registryFile));

if (existsSync(registryFile)) {
  const registry = JSON.parse(readFileSync(registryFile, 'utf-8'));
  const agents = Object.keys(registry.agents || {});
  check('Registry has agents', agents.length > 0, `Found ${agents.length} agents`);
  
  for (const name of agents) {
    const a = registry.agents[name];
    check(`  ${name}: has model`, !!a.model, a.model || 'missing');
    check(`  ${name}: has skills`, 
      (a.skills?.always?.length || 0) + (a.skills?.conditional?.length || 0) > 0,
      `always=${a.skills?.always?.length || 0}, conditional=${a.skills?.conditional?.length || 0}`);
  }
}

// 5. Check dispatch script
console.log('\n5. Dispatch Script');
const dispatchScript = join(ROOT, 'scripts', 'dispatch.mjs');
check('dispatch.mjs exists', existsSync(dispatchScript));

// 6. Check no Claude Code hook config lingers
// (invariant: opencode routes subagent models via frontmatter `model:`,
//  so the Claude Code hooks.json / model-router.sh mechanism must NOT exist)
console.log('\n6. No Claude Code hooks (opencode-native model routing)');
const hooksFile = join(ROOT, '.opencode', 'hooks.json');
check('hooks.json absent', !existsSync(hooksFile));

const modelRouterHook = join(ROOT, '.opencode', 'hooks', 'model-router.sh');
check('model-router.sh absent', !existsSync(modelRouterHook));

const modelFallbackScript = join(ROOT, 'scripts', 'model-fallback.mjs');
check('model-fallback.mjs absent', !existsSync(modelFallbackScript));

// 7. Cross-check: models.json matches frontmatter
console.log('\n7. Cross-check: models.json ↔ frontmatter');
if (existsSync(modelsFile)) {
  const models = JSON.parse(readFileSync(modelsFile, 'utf-8'));
  
  for (const name of Object.keys(models.agents || {})) {
    const file = join(AGENTS_DIR, `${name}.md`);
    if (existsSync(file)) {
      const content = readFileSync(file, 'utf-8');
      const modelMatch = content.match(/^model:\s*(.+)$/m);
      const configModel = models.agents[name]?.model;
      const frontmatterModel = modelMatch?.[1]?.trim();
      
      if (configModel && frontmatterModel) {
        check(`${name}: models.json matches frontmatter`, 
          configModel === frontmatterModel,
          `json=${configModel}, md=${frontmatterModel}`);
      }
    }
  }
}

// 8. Skill existence validation (H2)
// Cross-check: every skill referenced in agent-registry.json must exist in .opencode/skills/
console.log('\n8. Skill existence validation');
const skillsDir = getSkillsDir();
if (existsSync(registryFile) && existsSync(skillsDir)) {
  const registry = loadRegistry();
  const availableSkills = new Set(readdirSync(skillsDir));
  let totalSkillRefs = 0;
  let missingSkills = 0;

  for (const [agentName, agent] of Object.entries(registry.agents || {})) {
    const allSkills = [
      ...(agent.skills?.always || []),
      ...(agent.skills?.conditional || []).map(c => c.skill),
    ];
    for (const skill of allSkills) {
      totalSkillRefs++;
      const exists = availableSkills.has(skill);
      if (!exists) {
        check(`  ${agentName} → ${skill}`, false, 'skill directory not found');
        missingSkills++;
      }
    }
  }
  if (missingSkills === 0) {
    check(`All ${totalSkillRefs} skill references resolve to .opencode/skills/`, true);
  }
} else {
  warn('Skill validation skipped', 'registry or skills dir missing');
}

// ──────────────────────────────────────────────
console.log('\n' + '─'.repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed, ${warnings} warnings`);
if (failed === 0) {
  console.log('\n🎉 All checks passed! Ready for E2E test.\n');
  console.log('Next steps:');
  console.log('  1. Open opencode');
  console.log('  2. Type: implement a REST endpoint for user profiles');
  console.log('  3. Verify backend agent uses the model from agent-models.json');
  console.log('  4. Verify backend agent calls skill(name="nestjs-best-practices")');
} else {
  console.log('\n⚠️ Some checks failed. Fix them before E2E test.\n');
  process.exit(1);
}
