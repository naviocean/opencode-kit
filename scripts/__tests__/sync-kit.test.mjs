#!/usr/bin/env node

/**
 * Tests for scripts/sync-kit.mjs
 * 
 * Run: node scripts/__tests__/sync-kit.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

function runSync(args = '') {
  return execSync(`node scripts/sync-kit.mjs ${args}`, {
    cwd: ROOT,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

test('sync-kit: runs and exits 0 on --help', () => {
  const output = runSync('--help');
  assert.match(output, /Universal SaaS Kit Sync Engine/);
  assert.match(output, /--target/);
});

test('sync-kit: runs default full sync successfully', () => {
  const output = runSync();
  assert.match(output, /All requested environments synchronized successfully/);
  assert.match(output, /OpenCode adapter synchronized/);
  assert.match(output, /Antigravity & OpenAI Codex adapter synchronized/);
  assert.match(output, /Claude Code adapter synchronized/);
});

test('sync-kit: verifies symlinks point to .agent-core', () => {
  runSync();

  const opencodeAgents = path.join(ROOT, '.opencode', 'agents');
  const opencodeSkills = path.join(ROOT, '.opencode', 'skills');
  const agentsSkills = path.join(ROOT, '.agents', 'skills');
  const claudeSkills = path.join(ROOT, '.claude', 'skills');

  assert.ok(fs.existsSync(opencodeAgents), '.opencode/agents must exist');
  assert.ok(fs.existsSync(opencodeSkills), '.opencode/skills must exist');
  assert.ok(fs.existsSync(agentsSkills), '.agents/skills must exist');
  assert.ok(fs.existsSync(claudeSkills), '.claude/skills must exist');

  // Verify symlink resolution
  const resolvedSkills = fs.realpathSync(opencodeSkills);
  const resolvedCoreSkills = fs.realpathSync(path.join(ROOT, '.agent-core', 'skills'));
  assert.equal(resolvedSkills, resolvedCoreSkills, 'symlink must resolve to .agent-core/skills');
});

test('sync-kit: verifies Antigravity and OpenAI Codex share .agents/ and AGENTS.md', () => {
  runSync();

  const agentsMd = path.join(ROOT, 'AGENTS.md');
  assert.ok(fs.existsSync(agentsMd), 'AGENTS.md must exist for Antigravity and OpenAI Codex');

  // Verify AGENTS.md contains Model column
  const agentsMdContent = fs.readFileSync(agentsMd, 'utf-8');
  assert.match(agentsMdContent, /\| If the request mentions… \| Activate \| Model \|/);

  const agentsSkills = path.join(ROOT, '.agents', 'skills');
  const agentsRules = path.join(ROOT, '.agents', 'rules');
  const agentsAgents = path.join(ROOT, '.agents', 'agents');
  const agentsModels = path.join(ROOT, '.agents', 'agent-models.json');

  assert.ok(fs.existsSync(agentsSkills), '.agents/skills must exist');
  assert.ok(fs.existsSync(agentsRules), '.agents/rules must exist');
  assert.ok(fs.existsSync(agentsAgents), '.agents/agents must exist');
  assert.ok(!fs.existsSync(agentsModels), '.agents/agent-models.json must NOT exist');

  // Verify .agents/agents and .opencode/agents are real directories (copied, not symlinked)
  assert.ok(!fs.lstatSync(agentsAgents).isSymbolicLink(), '.agents/agents must be a real directory');
  assert.ok(!fs.lstatSync(path.join(ROOT, '.opencode', 'agents')).isSymbolicLink(), '.opencode/agents must be a real directory');
});

test('sync-kit: verifies CLAUDE.md generation', () => {
  runSync();

  const claudeMd = path.join(ROOT, 'CLAUDE.md');
  assert.ok(fs.existsSync(claudeMd), 'CLAUDE.md must exist');
  const content = fs.readFileSync(claudeMd, 'utf-8');
  assert.match(content, /Claude Code Project Instructions/);
  assert.match(content, /AGENTS\.md/);
});

test('sync-kit: dry-run does not mutate', () => {
  const output = runSync('--dry-run');
  assert.match(output, /All requested environments synchronized successfully/);
});

test('sync-kit: switches model presets dynamically', () => {
  // Verify .agent-core/agent-models.json does NOT exist
  assert.ok(!fs.existsSync(path.join(ROOT, '.agent-core', 'agent-models.json')), '.agent-core/agent-models.json must NOT exist');

  // 1. Switch to Codex preset across all harnesses
  const codexOutput = runSync('--preset codex --target all');
  assert.match(codexOutput, /Selected preset "codex"/);

  const opencodeCodexModels = JSON.parse(fs.readFileSync(path.join(ROOT, '.opencode', 'agent-models.json'), 'utf-8'));
  assert.equal(opencodeCodexModels.agents['tech-lead']?.model, 'gpt-5-sol');

  const codexTechLead = fs.readFileSync(path.join(ROOT, '.agents', 'agents', 'tech-lead.md'), 'utf-8');
  assert.match(codexTechLead, /model: gpt-5-sol/);

  // 2. Restore OpenCode preset across all harnesses
  const opencodeOutput = runSync('--preset opencode --target all');
  assert.match(opencodeOutput, /Selected preset "opencode"/);

  const opencodeModels = JSON.parse(fs.readFileSync(path.join(ROOT, '.opencode', 'agent-models.json'), 'utf-8'));
  assert.equal(opencodeModels.agents['tech-lead']?.model, 'commandcode/deepseek/deepseek-v4-pro');

  const restoredTechLeadMd = fs.readFileSync(path.join(ROOT, '.opencode', 'agents', 'tech-lead.md'), 'utf-8');
  assert.match(restoredTechLeadMd, /model: commandcode\/deepseek\/deepseek-v4-pro/);
});

test('sync-kit: --preset opencode only syncs opencode and does not create .agents or .claude', () => {
  // Clean all adapters first
  runSync('--clean');
  assert.ok(!fs.existsSync(path.join(ROOT, '.opencode')), '.opencode must not exist after clean');
  assert.ok(!fs.existsSync(path.join(ROOT, '.agents')), '.agents must not exist after clean');
  assert.ok(!fs.existsSync(path.join(ROOT, '.claude')), '.claude must not exist after clean');

  // Sync only with --preset opencode
  runSync('--preset opencode');
  assert.ok(fs.existsSync(path.join(ROOT, '.opencode')), '.opencode must be created');
  assert.ok(!fs.existsSync(path.join(ROOT, '.agents')), '.agents must NOT be created');
  assert.ok(!fs.existsSync(path.join(ROOT, '.claude')), '.claude must NOT be created');
  assert.ok(!fs.existsSync(path.join(ROOT, 'CLAUDE.md')), 'CLAUDE.md must NOT be created');

  // Restore all for next tests
  runSync();
});

test('sync-kit: verifies universal persistent memory (.agent-memory) across all harnesses', () => {
  runSync();

  const rootMemory = path.join(ROOT, '.agent-memory');
  assert.ok(fs.existsSync(rootMemory), '.agent-memory must exist at project root');
  assert.ok(fs.existsSync(path.join(rootMemory, 'project-context.md')), 'project-context.md must exist in .agent-memory');
  assert.ok(fs.existsSync(path.join(rootMemory, 'decisions.md')), 'decisions.md must exist in .agent-memory');
  assert.ok(fs.existsSync(path.join(rootMemory, 'contracts.md')), 'contracts.md must exist in .agent-memory');
  assert.ok(fs.existsSync(path.join(rootMemory, 'instincts.json')), 'instincts.json must exist in .agent-memory');

  const opencodeMemory = path.join(ROOT, '.opencode', 'memory');
  const agentsMemory = path.join(ROOT, '.agents', 'memory');
  const claudeMemory = path.join(ROOT, '.claude', 'memory');

  assert.ok(fs.existsSync(opencodeMemory), '.opencode/memory must exist');
  assert.ok(fs.existsSync(agentsMemory), '.agents/memory must exist');
  assert.ok(fs.existsSync(claudeMemory), '.claude/memory must exist');

  // Verify all resolve to the same root .agent-memory directory
  const resolvedRootMemory = fs.realpathSync(rootMemory);
  assert.equal(fs.realpathSync(opencodeMemory), resolvedRootMemory, '.opencode/memory must resolve to .agent-memory');
  assert.equal(fs.realpathSync(agentsMemory), resolvedRootMemory, '.agents/memory must resolve to .agent-memory');
  assert.equal(fs.realpathSync(claudeMemory), resolvedRootMemory, '.claude/memory must resolve to .agent-memory');
});

