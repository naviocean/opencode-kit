#!/usr/bin/env node

/**
 * Model Fallback — runtime override layer, NO file mutation
 *
 * Why this exists:
 *   The previous version mutated .opencode/agents/<agent>.md frontmatter when
 *   the primary model was unhealthy. That broke three invariants:
 *     1. Git pollution — every fallback appeared as a tracked file change.
 *     2. Race condition — two parallel agents racing to update the same file.
 *     3. verify.mjs Section 7 — auto-reverted on next run because frontmatter
 *        had to match .opencode/agent-models.json.
 *
 * New design (runtime state, no source mutation):
 *   1. Test primary model for the named agent.
 *   2. If primary fails, walk fallback list until one responds.
 *   3. Write the effective model to _workspace/.fallback-state.json (gitignored).
 *   4. model-router.sh reads this state file on every task() call and exports
 *      the override via OMO_AGENT_MODEL env var (consumed by the agent).
 *   5. Source of truth (agent-models.json + agent .md frontmatter) is never
 *      touched — only the runtime override is.
 *
 * Usage:
 *   node .opencode/scripts/model-fallback.mjs <agent-name>   # check + write
 *   node .opencode/scripts/model-fallback.mjs <agent-name> --reset
 *   node .opencode/scripts/model-fallback.mjs --list         # show all overrides
 *
 * Exit codes:
 *   0 = primary healthy, no override needed
 *   1 = override written (fallback active)
 *   2 = all models down (no override written)
 *   3 = usage / argument error
 *
 * State file shape (_workspace/.fallback-state.json):
 *   {
 *     "schema": 1,
 *     "updatedAt": "2026-06-01T18:00:00.000Z",
 *     "overrides": {
 *       "tech-lead": { "effective": "my_xiaomi/mimo-v2.5", "primary": "my_xiaomi/mimo-v2.5-pro", "reason": "primary_timeout", "since": "..." }
 *     }
 *   }
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const REGISTRY_FILE = join(ROOT, '.opencode', 'agent-models.json');
const STATE_DIR = join(ROOT, '_workspace');
const STATE_FILE = join(STATE_DIR, '.fallback-state.json');

const args = process.argv.slice(2);
const resetFlag = args.includes('--reset');
const listFlag = args.includes('--list');
const targetAgent = args.find(a => !a.startsWith('--'));

function loadRegistry() {
  return JSON.parse(readFileSync(REGISTRY_FILE, 'utf-8'));
}

function loadState() {
  if (!existsSync(STATE_FILE)) {
    return { schema: 1, updatedAt: null, overrides: {} };
  }
  try {
    return JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
  } catch {
    return { schema: 1, updatedAt: null, overrides: {} };
  }
}

function writeState(state) {
  if (!existsSync(STATE_DIR)) {
    mkdirSync(STATE_DIR, { recursive: true });
  }
  state.updatedAt = new Date().toISOString();
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + '\n');
}

function clearOverride(agentName) {
  const state = loadState();
  if (state.overrides[agentName]) {
    delete state.overrides[agentName];
    writeState(state);
    console.error(`[fallback] Cleared override for ${agentName}`);
  } else {
    console.error(`[fallback] No override to clear for ${agentName}`);
  }
}

function listOverrides() {
  const state = loadState();
  const entries = Object.entries(state.overrides);
  if (entries.length === 0) {
    console.log('(no active overrides)');
    return;
  }
  for (const [agent, info] of entries) {
    console.log(`${agent}: ${info.effective}  (since ${info.since}, reason: ${info.reason})`);
  }
}

function testModel(model) {
  try {
    const result = execSync(
      `opencode run --model "${model}" --format json --dangerously-skip-permissions "reply OK"`,
      { encoding: 'utf-8', timeout: 30000, cwd: ROOT, stdio: ['pipe', 'pipe', 'pipe'] }
    );
    const hasResponse = result.includes('"type":"text"') && !result.includes('"error"');
    const hasError = result.includes('"statusCode":403') || result.includes('"statusCode":429');
    return { ok: hasResponse && !hasError };
  } catch {
    return { ok: false };
  }
}

function checkAndApply(agentName) {
  const registry = loadRegistry();
  const agent = registry.agents?.[agentName];
  if (!agent) {
    console.error(`Agent "${agentName}" not found in .opencode/agent-models.json`);
    process.exit(3);
  }

  const primaryModel = agent.model;
  const fallbacks = (agent.fallback || []).filter(f => f !== primaryModel);
  const state = loadState();
  const existingOverride = state.overrides[agentName]?.effective;

  console.error(`[fallback] ${agentName}:`);
  console.error(`  Primary:   ${primaryModel}`);
  console.error(`  Fallbacks: ${fallbacks.join(' → ') || '(none)'}`);
  if (existingOverride) {
    console.error(`  Current override: ${existingOverride}`);
  }

  console.error(`\n[fallback] Testing primary: ${primaryModel}`);
  const primaryResult = testModel(primaryModel);

  if (primaryResult.ok) {
    console.error(`[fallback] Primary OK.`);
    if (existingOverride && existingOverride !== primaryModel) {
      console.error(`[fallback] Clearing stale override (primary recovered).`);
      delete state.overrides[agentName];
      writeState(state);
    }
    console.log(primaryModel);
    process.exit(0);
  }

  console.error(`[fallback] Primary FAILED. Trying fallbacks...`);

  for (const fallback of fallbacks) {
    if (fallback === existingOverride) {
      console.error(`[fallback] Skip re-test of already-active override: ${fallback}`);
      console.log(fallback);
      process.exit(1);
    }
    console.error(`[fallback] Testing: ${fallback}`);
    const fbResult = testModel(fallback);
    if (fbResult.ok) {
      const now = new Date().toISOString();
      state.overrides[agentName] = {
        effective: fallback,
        primary: primaryModel,
        reason: 'primary_unhealthy',
        since: now,
        lastChecked: now,
      };
      writeState(state);
      console.error(`[fallback] Override written: ${primaryModel} → ${fallback}`);
      console.log(fallback);
      process.exit(1);
    }
    console.error(`[fallback] ${fallback} FAILED`);
  }

  console.error(`[fallback] ALL MODELS DOWN for ${agentName}. No override written.`);
  console.error(`[fallback] Agent will be dispatched with primary (likely to fail).`);
  console.log(primaryModel);
  process.exit(2);
}

if (listFlag) {
  listOverrides();
  process.exit(0);
}

if (!targetAgent) {
  console.error('Usage: node model-fallback.mjs <agent-name> [--reset | --list]');
  process.exit(3);
}

if (resetFlag) {
  clearOverride(targetAgent);
  process.exit(0);
}

checkAndApply(targetAgent);
