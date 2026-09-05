#!/usr/bin/env node

/**
 * Tests for bin/cli.js
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const CLI = `node "${join(ROOT, 'bin', 'cli.js')}"`;

function runCli(args = '') {
  return execSync(`${CLI} ${args}`, {
    cwd: ROOT,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

test('cli: --help outputs usage instructions', () => {
  const output = runCli('--help');
  assert.match(output, /Usage:/);
  assert.match(output, /npx opencode-saas-kit init/);
  assert.match(output, /npx opencode-saas-kit sync/);
});

test('cli: verify runs and checks prerequisites and kit files', () => {
  const output = runCli('verify');
  assert.match(output, /Verifying installation\.\.\./);
  assert.match(output, /All checks passed!/);
});

test('cli: init --dry-run runs without ReferenceError or crashes', () => {
  const output = runCli('init --dry-run');
  assert.match(output, /Scanning repository profile\.\.\./);
  assert.match(output, /Installing kit files\.\.\./);
  assert.match(output, /Setting up document directories\.\.\./);
  assert.match(output, /Installation complete!/);
});

test('cli: update --dry-run runs successfully', () => {
  const output = runCli('update --dry-run');
  assert.match(output, /Updating kit files\.\.\./);
  assert.match(output, /Update complete!/);
});

test('cli: sync --dry-run runs successfully', () => {
  const output = runCli('sync --dry-run');
  assert.match(output, /Universal SaaS Kit Sync Engine/);
});

test('cli: pack list displays modular packs', () => {
  const output = runCli('pack list');
  assert.match(output, /Agent-Centric Skill Packs:/);
  assert.match(output, /core/);
});

test('cli: init creates empty docs scaffolding and excludes kit internal docs', () => {
  const testDir = join(ROOT, '_workspace', 'test-init-clean-docs');
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
  fs.mkdirSync(testDir, { recursive: true });

  try {
    execSync(`${CLI} init --yes --skip-mcp`, {
      cwd: testDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const prdsDir = join(testDir, 'docs', 'prds');
    const plansDir = join(testDir, 'docs', 'plans');
    assert.ok(fs.existsSync(prdsDir), 'docs/prds must exist as clean scaffolding');
    assert.ok(fs.existsSync(plansDir), 'docs/plans must exist as clean scaffolding');

    // Must be completely empty — zero files from the kit copied
    assert.equal(fs.readdirSync(prdsDir).length, 0, 'docs/prds must contain 0 files from kit');
    assert.equal(fs.readdirSync(plansDir).length, 0, 'docs/plans must contain 0 files from kit');
    assert.ok(!fs.existsSync(join(prdsDir, 'agentshield-gating-prd.md')), 'agentshield-gating-prd.md must NOT exist in new project');
  } finally {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  }
});
