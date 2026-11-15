#!/usr/bin/env node

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { evaluateHarness, formatComplianceMarkdown, parseArgs } from '../eval-harness.mjs';

test('eval-harness: parseArgs supports --json, --output, and --min-hci', () => {
  const opts = parseArgs(['--json', '--min-hci=98', '--output=_workspace/report.md']);
  assert.equal(opts.json, true);
  assert.equal(opts.minHci, 98);
  assert.equal(opts.output, '_workspace/report.md');
});

test('eval-harness: evaluates all 6 behavioral compliance dimensions with HCI >= 95%', async () => {
  const report = await evaluateHarness();

  assert.equal(typeof report.hci, 'number');
  assert.ok(report.hci >= 95, `Expected HCI >= 95%, got ${report.hci}% (failures: ${JSON.stringify(report.failures)})`);
  assert.equal(report.passed, true);
  assert.equal(report.dimensions.length, 6);

  const dimNames = report.dimensions.map((d) => d.id);
  assert.deepEqual(dimNames, [
    'socratic-sizing',
    'runtime-security',
    'domain-ownership',
    'evidence-honesty',
    'multi-harness-parity',
    'recursive-harnessing',
  ]);

  for (const dim of report.dimensions) {
    assert.ok(dim.total > 0, `Dimension ${dim.id} should have checks`);
    assert.equal(dim.passed, dim.total, `Dimension ${dim.id} had failures: ${JSON.stringify(dim.failures)}`);
  }
});

test('eval-harness: formatComplianceMarkdown renders scorecard with HCI and dimension table', async () => {
  const report = await evaluateHarness();
  const md = formatComplianceMarkdown(report);

  assert.match(md, /Harness Compliance Index \(HCI\)/);
  assert.match(md, /socratic-sizing/);
  assert.match(md, /runtime-security/);
  assert.match(md, /multi-harness-parity/);
});

test('eval-harness: fails gracefully when minHci threshold is unreachable', async () => {
  const report = await evaluateHarness({ minHci: 101 });
  assert.equal(report.passed, false);
});

test('eval-harness: writes markdown report to isolated output path without polluting repo', async () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'eval-harness-'));
  const outPath = join(tempDir, 'compliance-report.md');
  try {
    const report = await evaluateHarness({ outputPath: outPath });
    assert.ok(existsSync(outPath));
    const content = readFileSync(outPath, 'utf-8');
    assert.match(content, /Harness Compliance Index/);
    assert.equal(report.passed, true);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
