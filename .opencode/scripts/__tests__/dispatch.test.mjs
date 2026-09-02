#!/usr/bin/env node

/**
 * Tests for dispatch.mjs
 *
 * Run: node .opencode/scripts/__tests__/dispatch.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..', '..');
const DISPATCH = 'node .opencode/scripts/dispatch.mjs';

function run(args, expectError = false) {
  try {
    return execSync(`${DISPATCH} ${args}`, {
      cwd: ROOT,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (e) {
    if (expectError) return e.stderr || e.stdout || e.message;
    throw e;
  }
}

// ──────────────────────────────────────────────
// Default mode (human-readable prompt)
// ──────────────────────────────────────────────
test('dispatch: default mode returns human-readable prompt', () => {
  const output = run('nestjs "implement JWT auth"');
  assert.match(output, /## Dispatch: nestjs/);
  assert.match(output, /### Agent Identity/);
  assert.match(output, /### Model Assignment/);
  assert.match(output, /### Skill Loading/);
  assert.match(output, /### Task/);
  assert.match(output, /implement JWT auth/);
});

test('dispatch: prompt includes model from registry', () => {
  const output = run('nestjs "test task"');
  // Should contain the model string from agent-models.json
  assert.match(output, /opencode\/deepseek|deepseek\/deepseek|commandcode/);
});

test('dispatch: prompt includes skill loading instructions', () => {
  const output = run('nestjs "test task"');
  // NestJS has nestjs-best-practices as always skill
  assert.match(output, /nestjs-best-practices/);
});

// ──────────────────────────────────────────────
// --json mode
// ──────────────────────────────────────────────
test('dispatch: --json mode returns valid JSON', () => {
  const output = run('nestjs "test task" --json');
  const parsed = JSON.parse(output);
  assert.equal(parsed.agent, 'nestjs');
  assert.ok(parsed.model, 'must have model');
  assert.ok(Array.isArray(parsed.fallback), 'must have fallback array');
  assert.ok(Array.isArray(parsed.alwaysSkills), 'must have alwaysSkills array');
  assert.ok(parsed.prompt, 'must have prompt');
  assert.ok(parsed.shellCommand, 'must have shellCommand');
  assert.match(parsed.task, /test task/);
});

test('dispatch: --json mode model matches registry', () => {
  const output = run('pm "plan feature" --json');
  const parsed = JSON.parse(output);
  assert.ok(parsed.model, 'pm must have model');
  assert.ok(parsed.fallback.length > 0, 'pm must have fallback');
});

// ──────────────────────────────────────────────
// --shell mode
// ──────────────────────────────────────────────
test('dispatch: --shell mode returns opencode run command', () => {
  const output = run('frontend "build login page" --shell');
  assert.match(output, /opencode run --agent frontend/);
  assert.match(output, /build login page/);
});

// ──────────────────────────────────────────────
// --claude mode
// ──────────────────────────────────────────────
test('dispatch: --claude mode returns Task tool JSON', () => {
  const output = run('qa "run tests" --claude');
  const parsed = JSON.parse(output);
  assert.equal(parsed.tool, 'Task');
  assert.equal(parsed.parameters.subagent_type, 'general-purpose');
  assert.ok(parsed.parameters.prompt, 'must have prompt');
  assert.match(parsed.parameters.description, /qa/i);
});

// ──────────────────────────────────────────────
// Error cases
// ──────────────────────────────────────────────
test('dispatch: missing agent name shows usage', () => {
  const output = run('', true);
  assert.match(output, /Usage:/);
  assert.match(output, /Agents:/);
});

test('dispatch: unknown agent shows error', () => {
  const output = run('nonexistent-agent "task"', true);
  assert.match(output, /not found in registry/);
  assert.match(output, /Available:/);
});

test('dispatch: agent list in error is derived from registry (not hardcoded)', () => {
  const output = run('', true);
  // Should include ai-engineer and python-backend
  assert.match(output, /ai-engineer/);
  assert.match(output, /python-backend/);
  // Should include all agents
  assert.match(output, /tech-lead/);
  assert.match(output, /nestjs/);
  assert.match(output, /frontend/);
});

// ──────────────────────────────────────────────
// All agents dispatchable
// ──────────────────────────────────────────────
test('dispatch: every agent in registry can be dispatched', () => {
  const registryPath = join(ROOT, '.opencode', 'agent-registry.json');
  const registryContent = execSync(`cat "${registryPath}"`, { encoding: 'utf-8' });
  const registry = JSON.parse(registryContent);
  
  for (const name of Object.keys(registry.agents)) {
    const output = run(`${name} "smoke test" --json`);
    const parsed = JSON.parse(output);
    assert.equal(parsed.agent, name, `dispatch must work for ${name}`);
    assert.ok(parsed.model, `${name} must have model in dispatch`);
  }
});
