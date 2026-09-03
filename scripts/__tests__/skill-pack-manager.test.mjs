#!/usr/bin/env node

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  loadPackDefinitions,
  getActivePacks,
  setActivePacks,
  addPack,
  removePack,
  detectRecommendedPacks
} from '../skill-pack-manager.mjs';

test('skill-pack-manager: loads pack definitions and validates skills on disk', () => {
  const packs = loadPackDefinitions();
  const expectedPacks = ['core', 'web-fullstack', 'python-ai', 'rust-systems', 'devops-cloud', 'web3', 'mobile', 'data-ml'];

  for (const p of expectedPacks) {
    assert.ok(packs[p], `Pack ${p} should exist`);
    assert.ok(Array.isArray(packs[p].skills), `Pack ${p} should have skills array`);
    assert.ok(packs[p].skills.length > 0, `Pack ${p} should not be empty`);
  }
});

test('skill-pack-manager: manages active packs in isolated directory', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'skill-packs-test-'));

  try {
    // Initial active packs defaults
    const initial = getActivePacks(tempDir);
    assert.deepEqual(initial, ['core', 'web-fullstack']);

    // Set custom packs
    const updated = setActivePacks(tempDir, ['python-ai', 'rust-systems']);
    // Core is always preserved
    assert.ok(updated.includes('core'));
    assert.ok(updated.includes('python-ai'));
    assert.ok(updated.includes('rust-systems'));

    // Add another pack
    const afterAdd = addPack(tempDir, 'devops-cloud');
    assert.ok(afterAdd.includes('devops-cloud'));

    // Remove a pack
    const afterRemove = removePack(tempDir, 'python-ai');
    assert.ok(!afterRemove.includes('python-ai'));

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
  assert.ok(pyPacks.includes('devops-cloud'));
});
