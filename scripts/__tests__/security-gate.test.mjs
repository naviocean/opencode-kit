#!/usr/bin/env node

/**
 * Tests for security-gate.mjs
 *
 * Run: node .opencode/scripts/__tests__/security-gate.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import {
  evaluateSecurityReport,
  formatSecurityMarkdownReport,
  parseArgs,
} from '../security-gate.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

// ──────────────────────────────────────────────
// Unit Tests: Argument Parsing
// ──────────────────────────────────────────────
test('security-gate: parseArgs default options', () => {
  const opts = parseArgs([]);
  assert.equal(opts.minGrade, 'B');
  assert.equal(opts.failOnSecrets, true);
  assert.equal(opts.scope, 'project');
  assert.equal(opts.json, false);
});

test('security-gate: parseArgs custom flags', () => {
  const opts = parseArgs([
    '--min-grade=A',
    '--scope=changed',
    '--json',
    '--no-fail-on-secrets',
  ]);
  assert.equal(opts.minGrade, 'A');
  assert.equal(opts.scope, 'changed');
  assert.equal(opts.json, true);
  assert.equal(opts.failOnSecrets, false);
});

// ──────────────────────────────────────────────
// Unit Tests: Evaluation Logic
// ──────────────────────────────────────────────
test('security-gate: Grade A report with 0 findings passes', () => {
  const mockReport = {
    score: 95,
    grade: 'A',
    findings: [],
  };

  const result = evaluateSecurityReport(mockReport, { minGrade: 'B', failOnSecrets: true });
  assert.equal(result.passed, true);
  assert.equal(result.grade, 'A');
  assert.equal(result.score, 95);
  assert.equal(result.verdict, 'PASSED');
});

test('security-gate: Grade B report passes when minGrade is B', () => {
  const mockReport = {
    score: 85,
    grade: 'B',
    findings: [
      { id: 'SEC-001', severity: 'low', type: 'config', message: 'Loose timeout setting' },
    ],
  };

  const result = evaluateSecurityReport(mockReport, { minGrade: 'B', failOnSecrets: true });
  assert.equal(result.passed, true);
  assert.equal(result.verdict, 'APPROVED_WITH_NOTES');
});

test('security-gate: Grade C report fails when minGrade is B', () => {
  const mockReport = {
    score: 75,
    grade: 'C',
    findings: [
      { id: 'SEC-002', severity: 'medium', type: 'permission', message: 'Broad write access' },
    ],
  };

  const result = evaluateSecurityReport(mockReport, { minGrade: 'B', failOnSecrets: true });
  assert.equal(result.passed, false);
  assert.equal(result.verdict, 'BLOCKED');
  assert.match(result.reasons[0], /Grade C is below required minimum Grade B/);
});

test('security-gate: Secret leak fails even if overall score is high', () => {
  const mockReport = {
    score: 90,
    grade: 'A',
    findings: [
      { id: 'SEC-SECRET', severity: 'critical', type: 'secret', message: 'Hardcoded Stripe API key in file.ts' },
    ],
  };

  const result = evaluateSecurityReport(mockReport, { minGrade: 'B', failOnSecrets: true });
  assert.equal(result.passed, false);
  assert.equal(result.verdict, 'BLOCKED');
  assert.match(result.reasons[0], /Found 1 secret\/credential leak\(s\)/);
});

// ──────────────────────────────────────────────
// Unit Tests: Markdown Formatting
// ──────────────────────────────────────────────
test('security-gate: formatSecurityMarkdownReport generates valid markdown', () => {
  const mockEvaluation = {
    passed: true,
    score: 92,
    grade: 'A',
    verdict: 'PASSED',
    findings: [
      { id: 'SEC-01', severity: 'info', type: 'info', file: 'config.ts', message: 'Info note' },
    ],
    reasons: [],
    timestamp: '2026-09-03T00:00:00.000Z',
  };

  const md = formatSecurityMarkdownReport(mockEvaluation);
  assert.match(md, /# Security Review Report/);
  assert.match(md, /\*\*Security Grade\*\*:\s+\*\*A\*\*/);
  assert.match(md, /\*\*Overall Verdict\*\*:\s+\*\*PASSED\*\*/);
  assert.match(md, /SEC-01/);
});

// ──────────────────────────────────────────────
// Integration Tests: CLI Execution & Exit Codes
// ──────────────────────────────────────────────
test('security-gate: CLI exits 0 on passing report', () => {
  const tmpFile = join(ROOT, '.tmp-mock-clean.json');
  writeFileSync(
    tmpFile,
    JSON.stringify({ score: 95, grade: 'A', findings: [] })
  );

  try {
    const cmd = `node scripts/security-gate.mjs --mock=${tmpFile} --min-grade=B`;
    const output = execSync(cmd, { cwd: ROOT, encoding: 'utf-8' });
    assert.match(output, /Grade: A/);
    assert.match(output, /PASSED/);
  } finally {
    unlinkSync(tmpFile);
  }
});

test('security-gate: CLI exits 1 on failing report (Grade D)', () => {
  const tmpFile = join(ROOT, '.tmp-mock-fail.json');
  writeFileSync(
    tmpFile,
    JSON.stringify({ score: 60, grade: 'D', findings: [{ severity: 'high', message: 'Insecure eval' }] })
  );

  try {
    let failed = false;
    try {
      execSync(`node scripts/security-gate.mjs --mock=${tmpFile} --min-grade=B`, {
        cwd: ROOT,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch (err) {
      failed = true;
      assert.equal(err.status, 1, 'CLI must exit code 1 on security failure');
      assert.match(err.stdout.toString(), /BLOCKED/);
    }
    assert.equal(failed, true, 'Command should have thrown exit code 1');
  } finally {
    unlinkSync(tmpFile);
  }
});
