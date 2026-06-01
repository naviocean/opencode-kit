#!/usr/bin/env node

/**
 * E2E Verification Script
 * Kiểm tra toàn bộ cấu hình model-per-agent + skill-auto-load
 * 
 * Usage: node .opencode/scripts/verify.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const AGENTS_DIR = join(ROOT, '.opencode', 'agents');

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
const modelsFile = join(ROOT, '.opencode', 'agent-models.json');
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
console.log('\n2. Agent YAML frontmatter (model field)');
const agentFiles = ['tech-lead', 'pm', 'designer', 'frontend', 'backend', 'rustacean', 'qa', 'security-auditor'];

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
const registryScript = join(ROOT, '.opencode', 'scripts', 'skill-registry.mjs');
check('skill-registry.mjs exists', existsSync(registryScript));

const registryFile = join(ROOT, '.opencode', 'agent-registry.json');
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
const dispatchScript = join(ROOT, '.opencode', 'scripts', 'disptach.mjs');
const dispatchScript2 = join(ROOT, '.opencode', 'scripts', 'dispatch.mjs');
check('dispatch.mjs exists', existsSync(dispatchScript2));

// 6. Check hooks
console.log('\n6. Hooks');
const hooksFile = join(ROOT, '.opencode', 'hooks.json');
check('hooks.json exists', existsSync(hooksFile));

if (existsSync(hooksFile)) {
  const hooks = JSON.parse(readFileSync(hooksFile, 'utf-8'));
  const taskHooks = hooks.hooks?.['tool.execute.before']?.find(h => h.matcher === 'task');
  check('task hook registered', !!taskHooks);
}

const modelRouterHook = join(ROOT, '.opencode', 'hooks', 'model-router.sh');
check('model-router.sh exists', existsSync(modelRouterHook));

// 6b. Check model-fallback.mjs does NOT mutate agent .md files
// (invariant: the only way to change effective model is via _workspace/.fallback-state.json)
const modelFallbackScript = join(ROOT, '.opencode', 'scripts', 'model-fallback.mjs');
if (existsSync(modelFallbackScript)) {
  const fbSrc = readFileSync(modelFallbackScript, 'utf-8');
  const mutatesAgentFile = /writeFileSync\([^)]*AGENTS_DIR/.test(fbSrc)
    || /writeFileSync\([^)]*agents\/.*\.md/.test(fbSrc)
    || /writeFileSync\([^)]*\$\{.*agent.*\}\.md/.test(fbSrc);
  check('model-fallback.mjs: does NOT mutate .opencode/agents/*.md',
    !mutatesAgentFile,
    mutatesAgentFile ? 'detected writeFileSync targeting agent .md — use _workspace/.fallback-state.json' : 'uses runtime state file');
  const writesStateFile = /writeFileSync\([^)]*[Ss]tate/.test(fbSrc)
    || /_workspace\/.fallback-state\.json/.test(fbSrc);
  check('model-fallback.mjs: writes to _workspace/.fallback-state.json',
    writesStateFile,
    'fallback state must live in gitignored _workspace/');
}

// 6c. Check model-router.sh reads the runtime override
if (existsSync(modelRouterHook)) {
  const routerSrc = readFileSync(modelRouterHook, 'utf-8');
  const readsState = /fallback-state\.json/.test(routerSrc) || /\[Ss\]tate/.test(routerSrc);
  check('model-router.sh: reads _workspace/.fallback-state.json',
    readsState,
    'router must read runtime override to honor fallbacks');
}

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

// ──────────────────────────────────────────────
console.log('\n' + '─'.repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed, ${warnings} warnings`);
if (failed === 0) {
  console.log('\n🎉 All checks passed! Ready for E2E test.\n');
  console.log('Next steps:');
  console.log('  1. Open opencode');
  console.log('  2. Type: implement a REST endpoint for user profiles');
  console.log('  3. Verify backend agent uses mimo-v2.5 (not mimo-v2.5-pro)');
  console.log('  4. Verify backend agent calls skill(name="nestjs-best-practices")');
  console.log('  5. Check hook log: [model-router] Dispatching backend → model: mimo-v2.5');
} else {
  console.log('\n⚠️ Some checks failed. Fix them before E2E test.\n');
  process.exit(1);
}
