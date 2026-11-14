#!/usr/bin/env node

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, mkdirSync, writeFileSync, existsSync } from 'fs';
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
  isKitSourceRepo,
  syncActivePacksToRegistry,
  ROOT
} from '../skill-pack-manager.mjs';

test('skill-pack-manager: loads agent-centric pack definitions and guarantees 100% agent coverage', () => {
  const packs = loadPackDefinitions();
  const expectedPacks = ['core', 'web-frontend', 'nestjs-backend', 'python-ai', 'rust-systems', 'devops-infra', 'mobile-native', 'swift-macos', 'document-office'];

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

  // Verify all 14 agents in registry belong to a pack
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

  // Mobile Bare React Native
  const mobilePacks = detectRecommendedPacks({
    languages: ['TypeScript', 'JavaScript'],
    frameworks: ['React Native'],
    primaryPackageManager: 'yarn',
  });
  assert.ok(mobilePacks.includes('core'));
  assert.ok(mobilePacks.includes('mobile-native'));

  // Native macOS Swift
  const swiftPacks = detectRecommendedPacks({
    languages: ['Swift'],
    frameworks: ['SwiftUI', 'AppKit'],
    primaryPackageManager: 'spm',
  });
  assert.ok(swiftPacks.includes('core'));
  assert.ok(swiftPacks.includes('swift-macos'));

  // Office & PDF Document Processing
  const docPacks = detectRecommendedPacks({
    languages: ['Python'],
    frameworks: ['Office / PDF Processing'],
    primaryPackageManager: 'uv',
  });
  assert.ok(docPacks.includes('core'));
  assert.ok(docPacks.includes('python-ai'));
  assert.ok(docPacks.includes('document-office'));

  // LaTeX Technical Papers
  const texPacks = detectRecommendedPacks({
    languages: [],
    frameworks: ['LaTeX'],
    primaryPackageManager: null,
  });
  assert.ok(texPacks.includes('core'));
  assert.ok(texPacks.includes('document-office'));
});

test('skill-pack-manager: default getActivePacks returns valid pack IDs', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'skill-packs-default-'));
  try {
    const packs = loadPackDefinitions();
    const active = getActivePacks(tempDir);
    assert.deepEqual(active, ['core', 'web-frontend', 'nestjs-backend']);
    for (const p of active) {
      assert.ok(packs[p], `Default pack "${p}" must exist in skill-packs.json`);
    }
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('skill-pack-manager: isKitSourceRepo detects kit source vs user project', () => {
  assert.equal(isKitSourceRepo(ROOT), true, 'ROOT should be detected as kit source repo');

  const pkgDir = mkdtempSync(join(tmpdir(), 'kit-pkg-'));
  const presetsDir = mkdtempSync(join(tmpdir(), 'kit-presets-'));
  const appDir = mkdtempSync(join(tmpdir(), 'user-app-'));
  const emptyDir = mkdtempSync(join(tmpdir(), 'empty-dir-'));
  try {
    writeFileSync(join(pkgDir, 'package.json'), JSON.stringify({ name: 'opencode-saas-kit' }), 'utf-8');
    assert.equal(isKitSourceRepo(pkgDir), true);

    mkdirSync(join(presetsDir, '.agent-core', 'presets'), { recursive: true });
    assert.equal(isKitSourceRepo(presetsDir), true);

    writeFileSync(join(appDir, 'package.json'), JSON.stringify({ name: 'my-saas-app' }), 'utf-8');
    assert.equal(isKitSourceRepo(appDir), false);

    assert.equal(isKitSourceRepo(emptyDir), false);
  } finally {
    rmSync(pkgDir, { recursive: true, force: true });
    rmSync(presetsDir, { recursive: true, force: true });
    rmSync(appDir, { recursive: true, force: true });
    rmSync(emptyDir, { recursive: true, force: true });
  }
});

test('skill-pack-manager: pack operations never delete files in .agent-core/', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'ssot-guard-'));
  try {
    const presetFile = join(tempDir, '.agent-core', 'presets', 'sample.json');
    const skillFile = join(tempDir, '.agent-core', 'skills', 'frontend-design', 'SKILL.md');
    mkdirSync(join(tempDir, '.agent-core', 'presets'), { recursive: true });
    mkdirSync(join(tempDir, '.agent-core', 'skills', 'frontend-design'), { recursive: true });
    writeFileSync(presetFile, '{"name":"sample"}\n', 'utf-8');
    writeFileSync(skillFile, '# Frontend Design\n', 'utf-8');

    setActivePacks(tempDir, ['web-frontend', 'rust-systems']);
    addPack(tempDir, 'python-ai');
    removePack(tempDir, 'web-frontend');

    assert.equal(existsSync(presetFile), true, '.agent-core/presets file must remain intact');
    assert.equal(existsSync(skillFile), true, '.agent-core/skills file must remain intact');
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('skill-pack-manager: syncActivePacksToRegistry is safe in isolated tempDir and projects active flags', async () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'sync-registry-'));
  try {
    // Isolated tempDir without skill-registry.mjs or agent-registry.json -> safe no-op
    setActivePacks(tempDir, ['rust-systems']);
    const noopResult = syncActivePacksToRegistry(tempDir);
    assert.equal(noopResult.synced, false);

    // Real registry projection check on generated .opencode/agent-registry.json
    const { generateRegistry } = await import('../skill-registry.mjs');
    const isoDir = mkdtempSync(join(tmpdir(), 'iso-registry-'));
    try {
      mkdirSync(join(isoDir, '.opencode', 'agents'), { recursive: true });
      mkdirSync(join(isoDir, '.agent-memory'), { recursive: true });
      writeFileSync(
        join(isoDir, '.opencode', 'agent-models.json'),
        JSON.stringify({ default_fallback: [], agents: { 'tech-lead': { model: 'm1' }, frontend: { model: 'm2' }, rustacean: { model: 'm3' } } }),
        'utf-8'
      );
      writeFileSync(
        join(isoDir, '.opencode', 'agents', 'tech-lead.md'),
        '---\nname: tech-lead\nmodel: m1\n---\n## Skills\n| `tdd` | TDD | Always |\n',
        'utf-8'
      );
      writeFileSync(
        join(isoDir, '.opencode', 'agents', 'frontend.md'),
        '---\nname: frontend\nmodel: m2\n---\n## Skills\n| `frontend-design` | UI |\n',
        'utf-8'
      );
      writeFileSync(
        join(isoDir, '.opencode', 'agents', 'rustacean.md'),
        '---\nname: rustacean\nmodel: m3\n---\n## Skills\n| `rust-best-practices` | Rust | Always |\n',
        'utf-8'
      );
      setActivePacks(isoDir, ['rust-systems']);

      const regOutput = generateRegistry({ rootDir: isoDir });
      assert.deepEqual(regOutput.activePacks, ['core', 'rust-systems']);
      assert.equal(regOutput.agents['tech-lead'].active, true);
      assert.equal(regOutput.agents['rustacean'].active, true);
      assert.equal(regOutput.agents['frontend'].active, false);

      const written = JSON.parse(readFileSync(join(isoDir, '.opencode', 'agent-registry.json'), 'utf-8'));
      assert.deepEqual(written.activePacks, ['core', 'rust-systems']);
      assert.equal(written.agents['tech-lead'].active, true);
      assert.equal(written.agents['frontend'].active, false);
    } finally {
      rmSync(isoDir, { recursive: true, force: true });
    }
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
