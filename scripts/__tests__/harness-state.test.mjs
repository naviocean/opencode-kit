#!/usr/bin/env node

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  PHASES,
  canProceedToPhase,
  detectStaleTasks,
  initState,
  readState,
  recordGateVerdict,
  registerTask,
  resolveStatePath,
  transitionPhase,
  updateTaskStatus,
  writeStateAtomic,
} from '../harness-state.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = join(__dirname, '..', 'harness-state.mjs');

function createTempDir() {
  return mkdtempSync(join(tmpdir(), 'harness-state-test-'));
}

test('resolveStatePath: defaults to <projectDir>/_workspace/harness-state.json', () => {
  const dir = '/tmp/example-project';
  assert.equal(
    resolveStatePath({ projectDir: dir }),
    join(dir, '_workspace', 'harness-state.json'),
  );
  assert.equal(
    resolveStatePath({ statePath: '/tmp/custom/state.json', projectDir: dir }),
    '/tmp/custom/state.json',
  );
});

test('initState: creates state with required schema and atomic write', () => {
  const dir = createTempDir();
  try {
    const statePath = join(dir, '_workspace', 'harness-state.json');
    const state = initState(statePath, {
      sizing: 'M',
      planPath: 'docs/plans/mini-auth.md',
      gitHead: 'abc1234',
    });

    assert.equal(state.version, '1.0.0');
    assert.ok(typeof state.sessionId === 'string' && state.sessionId.length > 0);
    assert.equal(state.gitHead, 'abc1234');
    assert.equal(state.sizing, 'M');
    assert.equal(state.planPath, 'docs/plans/mini-auth.md');
    assert.equal(state.phase, 'IDLE');
    assert.equal(state.status, 'active');
    assert.deepEqual(state.tasks, {});
    assert.deepEqual(state.gates, { review: null, qa: null, security: null });
    assert.ok(Date.parse(state.createdAt) > 0);
    assert.ok(Date.parse(state.updatedAt) > 0);

    assert.equal(existsSync(statePath), true);
    const persisted = JSON.parse(readFileSync(statePath, 'utf8'));
    assert.deepEqual(persisted, state);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('writeStateAtomic: leaves no stray temp files and writes valid JSON', () => {
  const dir = createTempDir();
  try {
    const statePath = join(dir, '_workspace', 'harness-state.json');
    const payload = { version: '1.0.0', phase: 'IDLE', counter: 1 };
    writeStateAtomic(statePath, payload);

    const files = readdirSync(join(dir, '_workspace'));
    assert.deepEqual(files, ['harness-state.json']);
    assert.deepEqual(readState(statePath), payload);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('FSM transitions: allows valid progression IDLE -> PLAN -> BUILD -> REVIEW -> SHIP -> COMPLETED', () => {
  const dir = createTempDir();
  try {
    const statePath = join(dir, '_workspace', 'harness-state.json');
    initState(statePath, { sizing: 'M', planPath: 'docs/plans/mini-x.md', gitHead: 'sha1' });

    assert.deepEqual(PHASES, ['IDLE', 'PLAN', 'BUILD', 'REVIEW', 'SHIP', 'COMPLETED']);

    let state = transitionPhase(statePath, 'PLAN', { gitHead: 'sha1' });
    assert.equal(state.phase, 'PLAN');

    state = transitionPhase(statePath, 'BUILD', { gitHead: 'sha1' });
    assert.equal(state.phase, 'BUILD');

    state = transitionPhase(statePath, 'REVIEW', { gitHead: 'sha1' });
    assert.equal(state.phase, 'REVIEW');

    recordGateVerdict(statePath, 'review', 'APPROVED', 'sha1');
    state = transitionPhase(statePath, 'SHIP', { gitHead: 'sha1' });
    assert.equal(state.phase, 'SHIP');

    state = transitionPhase(statePath, 'COMPLETED', { gitHead: 'sha1' });
    assert.equal(state.phase, 'COMPLETED');
    assert.equal(state.status, 'completed');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('FSM transitions: rejects illegal phase jumps (e.g., BUILD -> SHIP without REVIEW)', () => {
  const dir = createTempDir();
  try {
    const statePath = join(dir, '_workspace', 'harness-state.json');
    initState(statePath, { sizing: 'M', gitHead: 'sha1' });
    transitionPhase(statePath, 'PLAN', { gitHead: 'sha1' });
    transitionPhase(statePath, 'BUILD', { gitHead: 'sha1' });

    const check = canProceedToPhase(statePath, 'SHIP', 'sha1');
    assert.equal(check.allowed, false);
    assert.match(check.reason, /BUILD.*SHIP|REVIEW/i);

    assert.throws(() => transitionPhase(statePath, 'SHIP', { gitHead: 'sha1' }), /BUILD.*SHIP|REVIEW/i);

    // Also reject IDLE -> REVIEW and REVIEW -> SHIP without approved review gate
    transitionPhase(statePath, 'REVIEW', { gitHead: 'sha1' });
    const unapprovedShip = canProceedToPhase(statePath, 'SHIP', 'sha1');
    assert.equal(unapprovedShip.allowed, false);
    assert.match(unapprovedShip.reason, /review gate/i);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('FSM transitions: allows IDLE -> BUILD fast-track only when sizing is S', () => {
  const dir = createTempDir();
  try {
    const stateM = join(dir, 'm.json');
    initState(stateM, { sizing: 'M', gitHead: 'sha1' });
    assert.equal(canProceedToPhase(stateM, 'BUILD', 'sha1').allowed, false);

    const stateS = join(dir, 's.json');
    initState(stateS, { sizing: 'S', gitHead: 'sha1' });
    assert.equal(canProceedToPhase(stateS, 'BUILD', 'sha1').allowed, true);
    const updated = transitionPhase(stateS, 'BUILD', { gitHead: 'sha1' });
    assert.equal(updated.phase, 'BUILD');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('commit-freshness invalidation: rejects SHIP when HEAD changed after review approval', () => {
  const dir = createTempDir();
  try {
    const statePath = join(dir, '_workspace', 'harness-state.json');
    initState(statePath, { sizing: 'M', gitHead: 'commit-aaa' });
    transitionPhase(statePath, 'PLAN', { gitHead: 'commit-aaa' });
    transitionPhase(statePath, 'BUILD', { gitHead: 'commit-aaa' });
    transitionPhase(statePath, 'REVIEW', { gitHead: 'commit-aaa' });

    recordGateVerdict(statePath, 'review', 'APPROVED', 'commit-aaa');

    // Same commit -> allowed
    const freshCheck = canProceedToPhase(statePath, 'SHIP', 'commit-aaa');
    assert.equal(freshCheck.allowed, true);

    // New commit -> stale review gate
    const staleCheck = canProceedToPhase(statePath, 'SHIP', 'commit-bbb');
    assert.equal(staleCheck.allowed, false);
    assert.equal(staleCheck.reason, 'Review gate is stale (commit mismatch)');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('subagent task tracking: registerTask, updateTaskStatus, detectStaleTasks', () => {
  const dir = createTempDir();
  try {
    const statePath = join(dir, '_workspace', 'harness-state.json');
    initState(statePath, { sizing: 'L', gitHead: 'sha1' });

    registerTask(statePath, 'frontend-ui', { agent: 'frontend', status: 'running' });
    registerTask(statePath, 'nestjs-api', { agent: 'nestjs', status: 'running' });

    updateTaskStatus(statePath, 'nestjs-api', 'completed', { files: ['apps/api/auth.ts'] });

    // Backdate frontend-ui updatedAt by 10 minutes
    const state = readState(statePath);
    state.tasks['frontend-ui'].updatedAt = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    writeStateAtomic(statePath, state);

    const stale = detectStaleTasks(statePath, 5 * 60 * 1000);
    assert.equal(stale.length, 1);
    assert.equal(stale[0].id, 'frontend-ui');
    assert.equal(stale[0].status, 'running');
    assert.ok(stale[0].ageMs >= 5 * 60 * 1000);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('CLI interface: init, transition, gate, check-gate, and status', () => {
  const dir = createTempDir();
  try {
    const statePath = join(dir, '_workspace', 'harness-state.json');

    // init
    const initOut = execFileSync(
      process.execPath,
      [
        SCRIPT_PATH,
        'init',
        `--state=${statePath}`,
        '--size=M',
        '--plan=docs/plans/mini-x.md',
        '--git-head=sha-cli-1',
      ],
      { encoding: 'utf8' },
    );
    const initJson = JSON.parse(initOut);
    assert.equal(initJson.sizing, 'M');
    assert.equal(initJson.phase, 'IDLE');

    // transition PLAN -> BUILD -> REVIEW
    execFileSync(process.execPath, [SCRIPT_PATH, 'transition', `--state=${statePath}`, '--phase=PLAN', '--git-head=sha-cli-1']);
    execFileSync(process.execPath, [SCRIPT_PATH, 'transition', `--state=${statePath}`, '--phase=BUILD', '--git-head=sha-cli-1']);
    execFileSync(process.execPath, [SCRIPT_PATH, 'transition', `--state=${statePath}`, '--phase=REVIEW', '--git-head=sha-cli-1']);

    // check-gate --phase=ship should fail (exit 1) before review approval
    let failed = false;
    try {
      execFileSync(process.execPath, [SCRIPT_PATH, 'check-gate', `--state=${statePath}`, '--phase=ship', '--git-head=sha-cli-1'], {
        stdio: 'pipe',
      });
    } catch (err) {
      failed = true;
      assert.equal(err.status, 1);
    }
    assert.equal(failed, true);

    // gate --name=review --verdict=APPROVED
    execFileSync(process.execPath, [
      SCRIPT_PATH,
      'gate',
      `--state=${statePath}`,
      '--name=review',
      '--verdict=APPROVED',
      '--git-head=sha-cli-1',
    ]);

    // check-gate --phase=ship should now pass (exit 0)
    const gateOk = execFileSync(
      process.execPath,
      [SCRIPT_PATH, 'check-gate', `--state=${statePath}`, '--phase=ship', '--git-head=sha-cli-1'],
      { encoding: 'utf8' },
    );
    assert.equal(JSON.parse(gateOk).allowed, true);

    // status
    const statusOut = execFileSync(process.execPath, [SCRIPT_PATH, 'status', `--state=${statePath}`], {
      encoding: 'utf8',
    });
    assert.equal(JSON.parse(statusOut).phase, 'REVIEW');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
