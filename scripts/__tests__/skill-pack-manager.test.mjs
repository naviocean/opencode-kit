#!/usr/bin/env node

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  loadPackDefinitions,
  getActivePacks,
  setActivePacks,
  addPack,
  removePack,
  getActiveAgents,
  getActiveSkills,
  detectRecommendedPacks,
  ROOT
} from '../skill-pack-manager.mjs';

test('skill-pack-manager: loads agent-centric pack definitions and guarantees 100% agent coverage', () => {
  const packs = loadPackDefinitions();
  const expectedPacks = ['core', 'web-frontend', 'nestjs-backend', 'python-ai', 'rust-systems', 'devops-infra'];

  const regFile = join(ROOT, '.opencode', 'agent-registry.json');
  const reg = JSON.parse(readFileSync(regFile, 'utf-8'));
  const allAgentsInRegistry = Object.keys(reg.agents).sort();

  const coveredAgents = new Set();
  for (const p of expectedPacks) {
    assert.ok(packs[p], `Pack ${p} should exist`);
    assert.ok(Array.isArray(packs[p].agents), `Pack ${p} should declare agents array`);
    assert.ok(Array.isArray(packs[p].skills), `Pack ${p} should have skills array`);
    assert.ok(packs[p].skills.length > 0, `Pack ${p} should have skills`);

    // Verify all declared skills for each agent are present in the pack
    for (const agent of packs[p].agents) {
      coveredAgents.add(agent);
      const agentData = reg.agents[agent];
      assert.ok(agentData, `Agent ${agent} declared in pack ${p} must exist in registry`);

      const agentSkills = [
        ...(agentData.skills.always || []),
        ...(agentData.skills.conditional || []).map(c => typeof c === 'string' ? c : c.skill)
      ];

      for (const s of agentSkills) {
        assert.ok(
          packs[p].skills.includes(s),
          `Pack ${p} must include required skill "${s}" for agent "${agent}"`
        );
      }
    }
  }

  // Verify all 11 agents in registry belong to a pack
  assert.deepEqual(Array.from(coveredAgents).sort(), allAgentsInRegistry);
});

test('skill-pack-manager: manages active packs and agents in isolated directory', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'skill-packs-test-'));

  try {
    // Set custom packs
    const updated = setActivePacks(tempDir, ['python-ai', 'rust-systems']);
    assert.ok(updated.includes('core'));
    assert.ok(updated.includes('python-ai'));
    assert.ok(updated.includes('rust-systems'));

    // Check active agents
    const agents = getActiveAgents(tempDir);
    assert.ok(agents.includes('tech-lead'));
    assert.ok(agents.includes('pm'));
    assert.ok(agents.includes('rustacean'));
    assert.ok(agents.includes('ai-engineer'));
    assert.ok(agents.includes('python-backend'));
    assert.ok(!agents.includes('frontend')); // web-frontend is inactive

    // Add devops-infra
    const afterAdd = addPack(tempDir, 'devops-infra');
    assert.ok(afterAdd.includes('devops-infra'));
    const agentsAfterAdd = getActiveAgents(tempDir);
    assert.ok(agentsAfterAdd.includes('devops'));

    // Remove python-ai
    const afterRemove = removePack(tempDir, 'python-ai');
    assert.ok(!afterRemove.includes('python-ai'));
    const agentsAfterRemove = getActiveAgents(tempDir);
    assert.ok(!agentsAfterRemove.includes('ai-engineer'));

    // Cannot remove core
    assert.throws(() => removePack(tempDir, 'core'), /Cannot remove "core" pack/);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('skill-pack-manager: recommends packs based on detected repo stack', () => {
  // Rust Axum repo
  const rustPacks = detectRecommendedPacks({
    languages: ['Rust'],
    frameworks: ['Axum'],
    primaryPackageManager: 'cargo',
  });
  assert.ok(rustPacks.includes('core'));
  assert.ok(rustPacks.includes('rust-systems'));

  // Python FastAPI + Docker
  const pyPacks = detectRecommendedPacks({
    languages: ['Python'],
    frameworks: ['FastAPI'],
    primaryPackageManager: 'uv',
    docker: true,
  });
  assert.ok(pyPacks.includes('core'));
  assert.ok(pyPacks.includes('python-ai'));
  assert.ok(pyPacks.includes('devops-infra'));

  // Web Frontend + NestJS
  const webPacks = detectRecommendedPacks({
    languages: ['TypeScript'],
    frameworks: ['Next.js', 'NestJS'],
    primaryPackageManager: 'pnpm',
  });
  assert.ok(webPacks.includes('core'));
  assert.ok(webPacks.includes('web-frontend'));
  assert.ok(webPacks.includes('nestjs-backend'));
});
