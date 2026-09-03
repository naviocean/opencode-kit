#!/usr/bin/env node

/**
 * Tests for verify.mjs
 *
 * Run: node .opencode/scripts/__tests__/verify.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'child_process';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const VERIFY = 'node scripts/verify.mjs';

function runVerify() {
  return execSync(VERIFY, {
    cwd: ROOT,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

// ──────────────────────────────────────────────
// Integration: verify.mjs runs and passes
// ──────────────────────────────────────────────
test('verify: exits 0 (all checks pass)', () => {
  // If this throws, the script exited non-zero
  const output = runVerify();
  assert.match(output, /All checks passed/);
});

test('verify: reports correct check count', () => {
  const output = runVerify();
  const match = output.match(/Results: (\d+) passed, (\d+) failed, (\d+) warnings/);
  assert.ok(match, 'must have results summary');
  const [, passed, failed, warnings] = match;
  assert.equal(parseInt(failed), 0, 'no checks should fail');
  assert.ok(parseInt(passed) >= 90, `should have ≥90 checks (got ${passed})`);
});

// ──────────────────────────────────────────────
// Verify checks all 8 categories
// ──────────────────────────────────────────────
test('verify: checks all 8 categories', () => {
  const output = runVerify();
  assert.match(output, /1\. agent-models\.json/);
  assert.match(output, /2\. Agent YAML frontmatter/);
  assert.match(output, /3\. Startup \(AUTO-EXECUTE\)/);
  assert.match(output, /4\. Skill Registry/);
  assert.match(output, /5\. Dispatch Script/);
  assert.match(output, /6\. No Claude Code hooks/);
  assert.match(output, /7\. Cross-check/);
  assert.match(output, /8\. Skill existence validation/);
});

// ──────────────────────────────────────────────
// H1: Agent list is derived, not hardcoded
// ──────────────────────────────────────────────
test('verify: agent list matches agent-models.json', () => {
  const modelsFile = join(ROOT, '.opencode', 'agent-models.json');
  const models = JSON.parse(readFileSync(modelsFile, 'utf-8'));
  const expectedAgents = Object.keys(models.agents).sort();
  
  const output = runVerify();
  
  for (const agent of expectedAgents) {
    assert.match(output, new RegExp(`${agent}\\.md exists`),
      `verify must check ${agent}.md`);
    assert.match(output, new RegExp(`${agent}: has model field`),
      `verify must check ${agent} model field`);
  }
});

// ──────────────────────────────────────────────
// H2: Skill existence validation
// ──────────────────────────────────────────────
test('verify: skill existence validation runs', () => {
  const output = runVerify();
  assert.match(output, /8\. Skill existence validation/);
  // Should report all skills resolve (no missing)
  assert.match(output, /skill references resolve/);
});

test('verify: all referenced skills exist on disk', () => {
  const registryFile = join(ROOT, '.opencode', 'agent-registry.json');
  const skillsDir = join(ROOT, '.opencode', 'skills');
  
  assert.ok(existsSync(registryFile), 'agent-registry.json must exist');
  assert.ok(existsSync(skillsDir), 'skills directory must exist');
  
  const registry = JSON.parse(readFileSync(registryFile, 'utf-8'));
  const availableSkills = new Set(readdirSync(skillsDir));
  
  for (const [name, agent] of Object.entries(registry.agents || {})) {
    const allSkills = [
      ...(agent.skills?.always || []),
      ...(agent.skills?.conditional || []).map(c => c.skill),
    ];
    for (const skill of allSkills) {
      assert.ok(availableSkills.has(skill),
        `${name} references skill "${skill}" which must exist in .opencode/skills/`);
    }
  }
});

// ──────────────────────────────────────────────
// Verify script structure
// ──────────────────────────────────────────────
test('verify: uses shared config (no hardcoded agent list)', () => {
  const verifySource = readFileSync(
    join(ROOT, 'scripts', 'verify.mjs'), 'utf-8'
  );
  // Should import from lib/config.mjs
  assert.match(verifySource, /from '\.\/lib\/config\.mjs'/,
    'verify.mjs must import from shared config');
  // Should NOT have hardcoded agent array
  assert.ok(
    !verifySource.includes("'tech-lead', 'pm', 'designer'"),
    'verify.mjs must not have hardcoded agent list'
  );
});
