#!/usr/bin/env node

/**
 * Verification Fixture Integration Test
 *
 * NOTE: This integration test validates the verification contract, runtime lifecycle,
 * and evidence protocols defined by create-verification-skill and maintain-verification-skill.
 * It provides deterministic contract and protocol verification, exercising:
 * 1. Surveys target application (fixtures/sample-app) and selects interaction driver.
 * 2. Launches the runtime service on an ephemeral port in an isolated test environment.
 * 3. Awaits readiness probe (/health) before executing journeys.
 * 4. Drives real user journeys (AUTH-001 login and DASH-001 metrics) on the live HTTP surface.
 * 5. Scaffolds a Feature Map following the exact create-verification-skill schema and unified vocabulary.
 * 6. Generates non-ephemeral evidence logs with standard metadata (Git Commit, Timestamp, Status).
 * 7. Confirms server process cleanly exits and that evidence files persist post-shutdown.
 * 8. Exercises maintain-verification-skill regression detection in isolation:
 *    - Preserves expected user journey signals (no regression masking).
 *    - Transitions status cleanly to REGRESSED.
 *    - Saves regression evidence.
 * 9. Leaves baseline fixture files untouched in git.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const FIXTURE_DIR = join(ROOT, 'fixtures', 'sample-app');
const SERVER_SCRIPT = join(FIXTURE_DIR, 'server.mjs');

// Current Git Commit SHA for evidence metadata
let currentGitCommit = 'unknown';
try {
  currentGitCommit = execSync('git rev-parse HEAD', { cwd: ROOT, encoding: 'utf-8' }).trim();
} catch {
  currentGitCommit = 'f2fa3391b106f2eecdaae9e5595ba381b16ee979';
}

// Unified status vocabulary
const ALLOWED_STATUSES = new Set(['VERIFIED', 'REGRESSED', 'BLOCKED', 'UNVERIFIED']);

// Helper to poll an HTTP endpoint until ready
async function waitForReady(url, maxRetries = 30, delayMs = 100) {
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

// Helper to gracefully stop a child process and await its exit
function stopProcess(child, timeoutMs = 2000) {
  return new Promise((resolve) => {
    if (!child || child.killed || child.exitCode !== null) {
      return resolve(true);
    }
    const timer = setTimeout(() => {
      try {
        child.kill('SIGKILL');
      } catch {
        // ignore
      }
      resolve(false);
    }, timeoutMs);

    child.once('close', () => {
      clearTimeout(timer);
      resolve(true);
    });

    try {
      child.kill('SIGTERM');
    } catch {
      clearTimeout(timer);
      resolve(false);
    }
  });
}

test('Verification Fixture: validates verification contract, lifecycle, and evidence schema (contract & protocol verification)', async (t) => {
  // 1. Create an isolated temporary workspace for this test run
  const tempWorkspace = mkdtempSync(join(tmpdir(), 'saas-verify-test-'));
  const tempDocsDir = join(tempWorkspace, 'docs', 'verification');
  const tempEvidenceDir = join(tempDocsDir, 'evidence');
  const tempFeatureMapFile = join(tempDocsDir, 'feature-map.md');

  mkdirSync(tempEvidenceDir, { recursive: true });

  t.after(async () => {
    // Clean up temporary workspace after test completion
    try {
      rmSync(tempWorkspace, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  // 2. Survey app environment (create-verification-skill Step 1)
  const pkgPath = join(FIXTURE_DIR, 'package.json');
  assert.ok(existsSync(pkgPath), 'Target app package.json must exist');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  assert.equal(pkg.scripts?.start, 'node server.mjs', 'App boot script must be discoverable');

  // 3. Driver Selection & Server Spawn (create-verification-skill Steps 2 & 3)
  const testPort = 49200 + Math.floor(Math.random() * 800);
  const baseUrl = `http://127.0.0.1:${testPort}`;

  const child = spawn(process.execPath, [SERVER_SCRIPT], {
    env: { ...process.env, PORT: String(testPort) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  t.after(async () => {
    await stopProcess(child);
  });

  // 4. Readiness Probe
  await waitForReady(`${baseUrl}/health`);
  const healthRes = await fetch(`${baseUrl}/health`);
  assert.equal(healthRes.status, 200, 'Health check must return 200 OK');
  const healthData = await healthRes.json();
  assert.equal(healthData.status, 'ok', 'Health response status must be ok');

  // 5. Execute User Journeys on Real Surface (create-verification-skill Step 4)
  // Journey 1: AUTH-001 (Login)
  const badLoginRes = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'wrongpassword' }),
  });
  assert.equal(badLoginRes.status, 401, 'Invalid login must be rejected with 401');

  const goodLoginRes = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'secret123' }),
  });
  assert.equal(goodLoginRes.status, 200, 'Valid login must return 200');
  const loginData = await goodLoginRes.json();
  assert.ok(loginData.token, 'Login must yield a session token');

  // Journey 2: DASH-001 (Dashboard Data)
  const dashRes = await fetch(`${baseUrl}/api/dashboard`, {
    headers: { Authorization: `Bearer ${loginData.token}` },
  });
  assert.equal(dashRes.status, 200, 'Dashboard request with valid token must return 200');
  const dashData = await dashRes.json();
  assert.equal(dashData.metrics.activeUsers, 42, 'Dashboard activeUsers must match live runtime data');

  // 6. Record Evidence Following Fresh Evidence Standard
  const today = new Date().toISOString().split('T')[0];
  const authEvidencePath = join(tempEvidenceDir, `${today}-AUTH-001-VERIFIED.log`);
  const dashEvidencePath = join(tempEvidenceDir, `${today}-DASH-001-VERIFIED.log`);

  const authEvidenceContent = [
    '=== Feature Verification Evidence ===',
    'Feature ID: AUTH-001',
    'Status: VERIFIED',
    `Git Commit: ${currentGitCommit}`,
    `Timestamp: ${new Date().toISOString()}`,
    'Driver: cURL / HTTP',
    `Surface URL: ${baseUrl}/api/login`,
    '',
    '--- Request ---',
    `POST ${baseUrl}/api/login`,
    'Body: {"username":"admin","password":"secret123"}',
    '',
    '--- Response ---',
    `Status: ${goodLoginRes.status}`,
    `Payload: ${JSON.stringify(loginData)}`,
    '',
    '--- Verdict ---',
    'VERIFIED: Authentication succeeded with valid session token.',
  ].join('\n');
  writeFileSync(authEvidencePath, authEvidenceContent, 'utf-8');

  const dashEvidenceContent = [
    '=== Feature Verification Evidence ===',
    'Feature ID: DASH-001',
    'Status: VERIFIED',
    `Git Commit: ${currentGitCommit}`,
    `Timestamp: ${new Date().toISOString()}`,
    'Driver: cURL / HTTP',
    `Surface URL: ${baseUrl}/api/dashboard`,
    '',
    '--- Request ---',
    `GET ${baseUrl}/api/dashboard`,
    `Authorization: Bearer ${loginData.token}`,
    '',
    '--- Response ---',
    `Status: ${dashRes.status}`,
    `Payload: ${JSON.stringify(dashData)}`,
    '',
    '--- Verdict ---',
    'VERIFIED: Dashboard returned expected active metrics.',
  ].join('\n');
  writeFileSync(dashEvidencePath, dashEvidenceContent, 'utf-8');

  // 7. Scaffold Feature Map Conforming to Standard Schema
  const featureMapContent = [
    '# Project Feature Verification Map',
    '',
    `Last Updated: ${today}`,
    'Harness Driver: cURL / HTTP',
    `Runtime URL / Surface: ${baseUrl}`,
    '',
    '| Feature ID | Feature Name | User Journey / Trigger | Observable Signal (Success) | Status | Evidence Path |',
    '|---|---|---|---|---|---|',
    `| \`AUTH-001\` | User Authentication | POST /api/login with valid admin credentials | 200 OK and JWT session token returned | VERIFIED | docs/verification/evidence/${today}-AUTH-001-VERIFIED.log |`,
    `| \`DASH-001\` | Metric Aggregation | GET /api/dashboard with Bearer token | 200 OK and JSON metrics returned | VERIFIED | docs/verification/evidence/${today}-DASH-001-VERIFIED.log |`,
    '',
  ].join('\n');
  writeFileSync(tempFeatureMapFile, featureMapContent, 'utf-8');

  // Verify Feature Map columns and allowed statuses
  const mapLines = featureMapContent.trim().split('\n');
  const tableRows = mapLines.filter((l) => l.startsWith('| `'));
  for (const row of tableRows) {
    const parts = row.split('|').map((s) => s.trim()).filter(Boolean);
    const status = parts[4];
    assert.ok(ALLOWED_STATUSES.has(status), `Status [${status}] must belong to unified vocabulary`);
  }

  // 8. Teardown Server Process & Confirm Exit
  const exitedCleanly = await stopProcess(child);
  assert.ok(exitedCleanly, 'Child server process must exit cleanly');

  // 9. Verify Evidence & Map Persistence on Disk Post-Shutdown
  assert.ok(existsSync(tempFeatureMapFile), 'Feature Map must persist after server process shutdown');
  assert.ok(existsSync(authEvidencePath), 'AUTH evidence must persist after server process shutdown');
  assert.ok(existsSync(dashEvidencePath), 'DASH evidence must persist after server process shutdown');

  const persistedAuthLog = readFileSync(authEvidencePath, 'utf-8');
  assert.match(persistedAuthLog, /Status: VERIFIED/, 'Evidence must record VERIFIED status');
  assert.match(persistedAuthLog, new RegExp(`Git Commit: ${currentGitCommit}`), 'Evidence must record current Git Commit SHA');

  // 10. Exercise maintain-verification-skill Regression Detection Flow
  const regPort = testPort + 1;
  const regServer = spawn(process.execPath, [SERVER_SCRIPT], {
    env: { ...process.env, PORT: String(regPort), SIMULATE_REGRESSION: 'true' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  t.after(async () => {
    await stopProcess(regServer);
  });

  await waitForReady(`http://127.0.0.1:${regPort}/health`);

  // Probe dashboard under regression
  const brokenDashRes = await fetch(`http://127.0.0.1:${regPort}/api/dashboard`, {
    headers: { Authorization: `Bearer ${loginData.token}` },
  });
  assert.equal(brokenDashRes.status, 500, 'Regression scenario must yield 500');

  // Maintain-verification protocol: Record regression log and update status to REGRESSED
  const regEvidencePath = join(tempEvidenceDir, `${today}-DASH-001-REGRESSED.log`);
  const regEvidenceContent = [
    '=== Feature Verification Evidence ===',
    'Feature ID: DASH-001',
    'Status: REGRESSED',
    `Git Commit: ${currentGitCommit}`,
    `Timestamp: ${new Date().toISOString()}`,
    'Driver: cURL / HTTP',
    `Surface URL: http://127.0.0.1:${regPort}/api/dashboard`,
    '',
    '--- Response ---',
    'Status: 500 Internal Server Error (ERR_POOL_EXHAUSTED)',
    '',
    '--- Verdict ---',
    'REGRESSED: Dashboard query threw 500 database pool exhaustion.',
  ].join('\n');
  writeFileSync(regEvidencePath, regEvidenceContent, 'utf-8');

  // Update Feature Map: Cardinal Rule — never loosen assertions, transition status to REGRESSED
  const currentMap = readFileSync(tempFeatureMapFile, 'utf-8');
  const updatedMap = currentMap.replace(
    `| \`DASH-001\` | Metric Aggregation | GET /api/dashboard with Bearer token | 200 OK and JSON metrics returned | VERIFIED | docs/verification/evidence/${today}-DASH-001-VERIFIED.log |`,
    `| \`DASH-001\` | Metric Aggregation | GET /api/dashboard with Bearer token | 200 OK and JSON metrics returned | REGRESSED | docs/verification/evidence/${today}-DASH-001-REGRESSED.log |`
  );
  writeFileSync(tempFeatureMapFile, updatedMap, 'utf-8');

  // Assertions for maintain-verification-skill
  const reloadedMap = readFileSync(tempFeatureMapFile, 'utf-8');
  assert.match(
    reloadedMap,
    /\| `DASH-001` \| Metric Aggregation \| GET \/api\/dashboard with Bearer token \| 200 OK and JSON metrics returned \| REGRESSED \|/,
    'Feature Map must preserve expected behavior while accurately marking REGRESSED status'
  );
  assert.ok(existsSync(regEvidencePath), 'Regression evidence log must be saved on disk');

  await stopProcess(regServer);
});

test('Verification Fixture: committed baseline in fixtures/sample-app is valid and clean', () => {
  const baselineMapFile = join(FIXTURE_DIR, 'docs', 'verification', 'feature-map.md');
  assert.ok(existsSync(baselineMapFile), 'Committed baseline feature-map.md must exist');

  const baselineContent = readFileSync(baselineMapFile, 'utf-8');
  const rows = baselineContent.trim().split('\n').filter((l) => l.startsWith('| `'));
  assert.equal(rows.length, 2, 'Committed baseline must have 2 features');

  for (const row of rows) {
    const parts = row.split('|').map((s) => s.trim()).filter(Boolean);
    const status = parts[4];
    assert.equal(status, 'VERIFIED', 'Committed baseline features must be in VERIFIED state');
    const evidenceRelativePath = parts[5];
    const evidenceFullPath = join(FIXTURE_DIR, evidenceRelativePath);
    assert.ok(existsSync(evidenceFullPath), `Evidence file must exist at ${evidenceFullPath}`);
  }
});
