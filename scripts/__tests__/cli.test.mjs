#!/usr/bin/env node

/**
 * Tests for bin/cli.js
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

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
