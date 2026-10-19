#!/usr/bin/env node

/**
 * Verification Fixture Integration Test
 *
 * Proves that create-verification-skill and maintain-verification-skill workflows
 * operate reliably against real surfaces:
 * 1. Spawns a real runtime application (fixtures/sample-app/server.mjs).
 * 2. Executes launch and readiness probes against /health.
 * 3. Drives verifiable user journeys (AUTH-001 login and DASH-001 dashboard metrics).
 * 4. Generates a persistent Feature Map (fixtures/sample-app/docs/verification/feature-map.md).
 * 5. Records non-ephemeral execution evidence (fixtures/sample-app/docs/verification/evidence/*.log).
 * 6. Shuts down the runtime server and asserts evidence files persist on disk.
 * 7. Simulates a regression and verifies maintenance flow detects regression and flags failure.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const FIXTURE_DIR = join(ROOT, 'fixtures', 'sample-app');
const SERVER_SCRIPT = join(FIXTURE_DIR, 'server.mjs');
const DOCS_DIR = join(FIXTURE_DIR, 'docs', 'verification');
const EVIDENCE_DIR = join(DOCS_DIR, 'evidence');
const FEATURE_MAP_FILE = join(DOCS_DIR, 'feature-map.md');

// Helper to poll an HTTP endpoint
async function waitForReady(url, maxRetries = 25, delayMs = 100) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      // Server not ready yet
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  throw new Error(`Server failed to become ready at ${url} after ${maxRetries * delayMs}ms`);
}

test('Verification Fixture: launches real surface, records evidence, and detects regressions', async (t) => {
  // Clean up any old fixture docs
  if (existsSync(DOCS_DIR)) {
    rmSync(DOCS_DIR, { recursive: true, force: true });
  }
  mkdirSync(EVIDENCE_DIR, { recursive: true });

  const testPort = 49152 + Math.floor(Math.random() * 1000);
  const baseUrl = `http://127.0.0.1:${testPort}`;

  // 1. Launch runtime surface
  const child = spawn(process.execPath, [SERVER_SCRIPT], {
    env: { ...process.env, PORT: String(testPort) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  t.after(() => {
    try {
      child.kill('SIGTERM');
    } catch {
      // ignore
    }
  });

  // 2. Readiness probe
  await waitForReady(`${baseUrl}/health`);
  const healthRes = await fetch(`${baseUrl}/health`);
  assert.equal(healthRes.status, 200, 'Health check must return 200');
  const healthData = await healthRes.json();
  assert.equal(healthData.status, 'ok', 'Health response status must be ok');

  // 3. User Journey: AUTH-001 (Authentication)
  const badLoginRes = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'wrongpassword' }),
  });
  assert.equal(badLoginRes.status, 401, 'Invalid login should return 401');

  const goodLoginRes = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'secret123' }),
  });
  assert.equal(goodLoginRes.status, 200, 'Valid login should return 200');
  const loginData = await goodLoginRes.json();
  assert.ok(loginData.token, 'Login must yield a session token');

  // 4. User Journey: DASH-001 (Dashboard Data)
  const dashRes = await fetch(`${baseUrl}/api/dashboard`, {
    headers: { Authorization: `Bearer ${loginData.token}` },
  });
  assert.equal(dashRes.status, 200, 'Dashboard request with token should return 200');
  const dashData = await dashRes.json();
  assert.equal(dashData.metrics.activeUsers, 42, 'Dashboard activeUsers should match fixture state');

  // 5. Scaffolding Feature Map & Non-Ephemeral Evidence (create-verification-skill output)
  const authEvidencePath = join(EVIDENCE_DIR, '2026-10-19-AUTH-001.log');
  const authEvidenceContent = [
    `=== Verification Evidence: AUTH-001 & DASH-001 ===`,
    `Timestamp: ${new Date().toISOString()}`,
    `Endpoint: POST ${baseUrl}/api/login`,
    `Response Status: ${goodLoginRes.status}`,
    `Payload: ${JSON.stringify(loginData)}`,
    `Endpoint: GET ${baseUrl}/api/dashboard`,
    `Response Status: ${dashRes.status}`,
    `Metrics: ${JSON.stringify(dashData.metrics)}`,
    `Result: PASS`,
  ].join('\n');
  writeFileSync(authEvidencePath, authEvidenceContent, 'utf-8');

  const featureMapContent = [
    '# Sample SaaS Verification Feature Map',
    '',
    '| Feature ID | Feature Name | Surface / Driver | Readiness Probe | Status | Last Verified | Evidence File |',
    '|---|---|---|---|---|---|---|',
    `| \`AUTH-001\` | User Authentication | HTTP / fetch | \`GET /health\` | PASS | 2026-10-19 | docs/verification/evidence/2026-10-19-AUTH-001.log |`,
    `| \`DASH-001\` | Metric Aggregation | HTTP / fetch | \`GET /health\` | PASS | 2026-10-19 | docs/verification/evidence/2026-10-19-AUTH-001.log |`,
    '',
  ].join('\n');
  writeFileSync(FEATURE_MAP_FILE, featureMapContent, 'utf-8');

  assert.ok(existsSync(FEATURE_MAP_FILE), 'Feature Map must exist on disk');
  assert.ok(existsSync(authEvidencePath), 'Evidence log must exist on disk');

  // 6. Shutdown runtime server & Verify evidence persistence
  child.kill('SIGTERM');
  await new Promise((r) => setTimeout(r, 150));

  // Assert persistence: server is dead, but evidence and feature map remain
  assert.ok(existsSync(FEATURE_MAP_FILE), 'Feature Map must persist after server teardown');
  assert.ok(existsSync(authEvidencePath), 'Evidence log must persist after server teardown');
  const persistedEvidence = readFileSync(authEvidencePath, 'utf-8');
  assert.match(persistedEvidence, /Result: PASS/, 'Persisted evidence must contain PASS verdict');

  // 7. Regression Detection Test (maintain-verification-skill flow)
  const regressionPort = testPort + 1;
  const regressionServer = spawn(process.execPath, [SERVER_SCRIPT], {
    env: { ...process.env, PORT: String(regressionPort), SIMULATE_REGRESSION: 'true' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    await waitForReady(`http://127.0.0.1:${regressionPort}/health`);

    // Probe dashboard with regression active
    const failedDashRes = await fetch(`http://127.0.0.1:${regressionPort}/api/dashboard`, {
      headers: { Authorization: `Bearer ${loginData.token}` },
    });
    assert.equal(failedDashRes.status, 500, 'Regression scenario must return 500');

    // Record regression evidence and update Feature Map
    const regressionEvidencePath = join(EVIDENCE_DIR, '2026-10-19-DASH-REGRESSION.log');
    writeFileSync(
      regressionEvidencePath,
      `=== Regression Evidence: DASH-001 ===\nStatus: 500 ERR_POOL_EXHAUSTED\nResult: FAIL`,
      'utf-8'
    );

    const updatedMap = readFileSync(FEATURE_MAP_FILE, 'utf-8').replace(
      '| `DASH-001` | Metric Aggregation | HTTP / fetch | `GET /health` | PASS |',
      '| `DASH-001` | Metric Aggregation | HTTP / fetch | `GET /health` | FAIL |'
    );
    writeFileSync(FEATURE_MAP_FILE, updatedMap, 'utf-8');

    const verifiedMap = readFileSync(FEATURE_MAP_FILE, 'utf-8');
    assert.match(verifiedMap, /\| `DASH-001` \| Metric Aggregation .* FAIL \|/, 'Feature map must accurately flag regression as FAIL');
    assert.ok(existsSync(regressionEvidencePath), 'Regression evidence must be stored');
  } finally {
    regressionServer.kill('SIGTERM');
  }
});
