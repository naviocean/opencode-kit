#!/usr/bin/env node

/**
 * Model Health Check — kiểm tra model availability
 * 
 * Usage: node .opencode/scripts/model-health-check.mjs [agent-name]
 * 
 * Nếu không có agent-name: check tất cả agents.
 * Nếu có agent-name: check model của agent đó, trả về model available.
 * 
 * Exit codes:
 *   0 = all models available
 *   1 = some models unavailable (stdout = available model for the agent)
 *   2 = all models down
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const AGENTS_DIR = join(ROOT, '.opencode', 'agents');
const REGISTRY_FILE = join(ROOT, '.opencode', 'agent-registry.json');
const HEALTH_FILE = join(ROOT, '.opencode', 'model-health.json');

const targetAgent = process.argv[2];
const DRY_RUN = process.argv.includes('--dry-run');

function loadRegistry() {
  return JSON.parse(readFileSync(REGISTRY_FILE, 'utf-8'));
}

function loadHealth() {
  try {
    return JSON.parse(readFileSync(HEALTH_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function saveHealth(health) {
  writeFileSync(HEALTH_FILE, JSON.stringify(health, null, 2) + '\n');
}

/**
 * Test model availability bằng cách gọi opencode run với prompt đơn giản
 * Trả về { ok: boolean, latency: number, error?: string }
 */
function testModel(model) {
  const start = Date.now();
  try {
    const result = execSync(
      `opencode run --model "${model}" --format json --dangerously-skip-permissions "reply with only the word OK"`,
      { 
        encoding: 'utf-8', 
        timeout: 30000,
        cwd: ROOT,
        stdio: ['pipe', 'pipe', 'pipe']
      }
    );
    
    const latency = Date.now() - start;
    
    // Check if response contains actual content (not just error)
    const hasResponse = result.includes('"type":"text"') && !result.includes('"error"');
    const hasError = result.includes('"statusCode":403') || 
                     result.includes('"statusCode":429') || 
                     result.includes('"statusCode":500');
    
    if (hasError) {
      const errorMatch = result.match(/"message":"([^"]+)"/);
      return { 
        ok: false, 
        latency, 
        error: errorMatch?.[1] || 'API error' 
      };
    }
    
    return { ok: hasResponse, latency };
  } catch (e) {
    return { 
      ok: false, 
      latency: Date.now() - start, 
      error: e.message?.substring(0, 100) || 'timeout' 
    };
  }
}

/**
 * Tìm model available đầu tiên từ fallback chain
 */
function findAvailableModel(models) {
  for (const model of models) {
    const result = testModel(model);
    if (result.ok) return { model, ...result };
  }
  return null;
}

// ──────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────
const registry = loadRegistry();
const health = loadHealth();
const now = new Date().toISOString();

if (targetAgent) {
  // Check single agent
  const agent = registry.agents?.[targetAgent];
  if (!agent) {
    console.error(`Agent "${targetAgent}" not found`);
    process.exit(1);
  }
  
  // Read CURRENT model from frontmatter (not registry)
  const agentFile = join(AGENTS_DIR, `${targetAgent}.md`);
  let currentModel = agent.model;
  try {
    const content = readFileSync(agentFile, 'utf-8');
    const match = content.match(/^model:\s*(.+)$/m);
    if (match) currentModel = match[1].trim();
  } catch {}
  
  // Build fallback chain: current model + fallbacks from registry (excluding current)
  const fallbacks = (agent.fallback || []).filter(f => f !== currentModel);
  const models = [currentModel, ...fallbacks];
  
  console.error(`[health-check] Testing ${targetAgent}: ${models.join(' → ')}`);
  
  // Check current model first
  const primaryResult = testModel(currentModel);
  health[targetAgent] = {
    model: currentModel,
    ...primaryResult,
    checkedAt: now
  };
  
  if (primaryResult.ok) {
    console.error(`[health-check] ${targetAgent} OK (${primaryResult.latency}ms)`);
    console.log(currentModel);
    saveHealth(health);
    process.exit(0);
  }
  
  console.error(`[health-check] ${targetAgent} FAILED: ${primaryResult.error}`);
  
  // Try fallbacks
  for (const fallback of fallbacks) {
    const fbResult = testModel(fallback);
    if (fbResult.ok) {
      console.error(`[health-check] ${targetAgent} fallback OK: ${fallback} (${fbResult.latency}ms)`);
      health[targetAgent] = {
        model: fallback,
        ...fbResult,
        fallbackFrom: currentModel,
        checkedAt: now
      };
      saveHealth(health);
      console.log(fallback);
      process.exit(1); // exit 1 = used fallback
    }
    console.error(`[health-check] ${targetAgent} fallback FAILED: ${fallback} — ${fbResult.error}`);
  }
  
  console.error(`[health-check] ${targetAgent} ALL MODELS DOWN`);
  saveHealth(health);
  process.exit(2);
  
} else {
  // Check all agents
  console.error('[health-check] Testing all agents...\n');
  let allOk = true;
  let anyOk = false;
  
  for (const [name, agent] of Object.entries(registry.agents || {})) {
    const models = [agent.model, ...(agent.fallback || [])].filter(Boolean);
    process.stderr.write(`  ${name}: testing ${agent.model}... `);
    
    const result = testModel(agent.model);
    health[name] = {
      model: agent.model,
      ...result,
      checkedAt: now
    };
    
    if (result.ok) {
      console.error(`OK (${result.latency}ms)`);
      anyOk = true;
    } else {
      console.error(`FAILED (${result.error})`);
      allOk = false;
      
      // Try fallback
      for (const fallback of agent.fallback || []) {
        const fbResult = testModel(fallback);
        if (fbResult.ok) {
          console.error(`    → fallback ${fallback} OK (${fbResult.latency}ms)`);
          health[name] = {
            model: fallback,
            ...fbResult,
            fallbackFrom: agent.model,
            checkedAt: now
          };
          anyOk = true;
          break;
        }
      }
    }
  }
  
  saveHealth(health);
  
  console.error('\n' + '─'.repeat(50));
  if (allOk) {
    console.error('All primary models available ✅');
    process.exit(0);
  } else if (anyOk) {
    console.error('Some models using fallback ⚠️');
    process.exit(1);
  } else {
    console.error('All models down ❌');
    process.exit(2);
  }
}
