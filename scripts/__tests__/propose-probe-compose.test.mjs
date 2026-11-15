#!/usr/bin/env node

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  composeWinningHarness,
  createProbeSession,
  evaluateProbes,
  recordProbeResult,
} from '../propose-probe-compose.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = join(__dirname, '..', 'propose-probe-compose.mjs');

function createTempDir() {
  return mkdtempSync(join(tmpdir(), 'propose-probe-compose-test-'));
}

test('createProbeSession: persists valid evolvable candidate patches in _workspace/probes/<taskId>.json', () => {
  const dir = createTempDir();
  try {
    const session = createProbeSession(dir, {
      taskId: 'AUTH-42',
      domain: 'nestjs-backend',
      premise: 'JWT refresh token rotation fails under concurrent requests',
      candidates: [
        {
          id: 'cand-a',
          hypothesis: 'Add atomic mutex note to auth skill reference',
          patch: {
            '.agent-core/skills/jwt-auth/references/concurrency.md': '# Concurrency\nUse atomic rotation.',
          },
        },
        {
          id: 'cand-b',
          hypothesis: 'Record experience note',
          patch: {
            '.agent-memory/experiences/nestjs-backend/note.md': '# Note\nCheck Redis lock.',
          },
        },
      ],
    });

    assert.equal(session.taskId, 'AUTH-42');
    assert.equal(session.domain, 'nestjs-backend');
    assert.equal(session.status, 'PENDING');
    assert.equal(session.candidates.length, 2);

    const sessionFile = join(dir, '_workspace', 'probes', 'AUTH-42.json');
    assert.equal(existsSync(sessionFile), true);
    const persisted = JSON.parse(readFileSync(sessionFile, 'utf8'));
    assert.equal(persisted.taskId, 'AUTH-42');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('createProbeSession: rejects any candidate mutating IMMUTABLE_SURFACES', () => {
  const dir = createTempDir();
  try {
    assert.throws(
      () =>
        createProbeSession(dir, {
          taskId: 'SEC-01',
          domain: 'core',
          premise: 'Attempt to weaken AGENTS.md',
          candidates: [
            {
              id: 'bad-cand',
              hypothesis: 'Bypass TDD rule',
              patch: {
                'AGENTS.md': '# Modified',
              },
            },
          ],
        }),
      /immutable|AGENTS\.md|rejected/i,
    );

    assert.equal(existsSync(join(dir, '_workspace', 'probes', 'SEC-01.json')), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('evaluateProbes: Hard PStack Disqualification Filter rejects failed tests, grade < B, and REGRESSED', () => {
  const result = evaluateProbes(
    [
      {
        id: 'fail-tests',
        patch: { '.agent-memory/experiences/core/a.md': 'a' },
        result: {
          testsPassed: false,
          securityGrade: 'A',
          featureMapStatus: 'VERIFIED',
          score: 99,
          evidence: 'npm test failed',
        },
      },
      {
        id: 'low-grade',
        patch: { '.agent-memory/experiences/core/b.md': 'b' },
        result: {
          testsPassed: true,
          securityGrade: 'C',
          featureMapStatus: 'VERIFIED',
          score: 95,
          evidence: 'security grade C',
        },
      },
      {
        id: 'regressed-map',
        patch: { '.agent-memory/experiences/core/c.md': 'c' },
        result: {
          testsPassed: true,
          securityGrade: 'A',
          featureMapStatus: 'REGRESSED',
          score: 98,
          evidence: 'feature map regressed',
        },
      },
    ],
    { taskId: 'T-1', domain: 'core', premise: 'Test hard filter' },
  );

  assert.equal(result.verdict, 'ALL_CANDIDATES_REJECTED');
  assert.equal(result.winner, null);
  assert.equal(result.adoptedPatch, null);
  assert.equal(result.candidates.every((c) => c.disqualified === true), true);
  assert.match(result.candidates[0].disqualificationReasons.join(' '), /testsPassed/i);
  assert.match(result.candidates[1].disqualificationReasons.join(' '), /securityGrade/i);
  assert.match(result.candidates[2].disqualificationReasons.join(' '), /REGRESSED/i);
});

test('evaluateProbes: returns BLOCKED when runtimeBlocked is true and no valid passing candidate exists', () => {
  const result = evaluateProbes([
    {
      id: 'blocked-cand',
      patch: { '.agent-memory/experiences/core/a.md': 'a' },
      result: {
        testsPassed: false,
        securityGrade: 'A',
        featureMapStatus: 'UNVERIFIED',
        score: 0,
        evidence: 'dev server failed to start',
        runtimeBlocked: true,
      },
    },
  ]);

  assert.equal(result.verdict, 'BLOCKED');
  assert.equal(result.winner, null);
  assert.equal(result.adoptedPatch, null);
});

test('evaluateProbes: ranks VERIFIED above UNVERIFIED, then highest score, and returns experience triad', () => {
  const result = evaluateProbes(
    [
      {
        id: 'unverified-high-score',
        hypothesis: 'Higher unit score but unverified runtime',
        patch: { '.agent-memory/experiences/nestjs-backend/u.md': 'u' },
        result: {
          testsPassed: true,
          securityGrade: 'A',
          featureMapStatus: 'UNVERIFIED',
          score: 99,
          testsPassCount: 20,
          evidence: 'unit tests passed',
        },
      },
      {
        id: 'verified-lower-score',
        hypothesis: 'Use transactional outbox for token rotation',
        patch: { '.agent-memory/experiences/nestjs-backend/v.md': 'v' },
        result: {
          testsPassed: true,
          securityGrade: 'B',
          featureMapStatus: 'VERIFIED',
          score: 85,
          testsPassCount: 15,
          evidence: 'docs/verification/evidence/auth-42.log',
        },
      },
    ],
    {
      taskId: 'AUTH-42',
      domain: 'nestjs-backend',
      premise: 'Concurrent token rotation race',
    },
  );

  assert.equal(result.verdict, 'COMPOSED');
  assert.equal(result.winner.id, 'verified-lower-score');
  assert.deepEqual(result.adoptedPatch, {
    '.agent-memory/experiences/nestjs-backend/v.md': 'v',
  });
  assert.equal(result.experience.domain, 'nestjs-backend');
  assert.equal(result.experience.taskId, 'AUTH-42');
  assert.equal(result.experience.cue, 'Concurrent token rotation race');
  assert.equal(result.experience.lesson, 'Use transactional outbox for token rotation');
  assert.equal(result.experience.evidence, 'docs/verification/evidence/auth-42.log');
});

test('recordProbeResult & composeWinningHarness: full session lifecycle', () => {
  const dir = createTempDir();
  try {
    createProbeSession(dir, {
      taskId: 'BUILD-99',
      domain: 'web-frontend',
      premise: 'Hydration mismatch in dashboard widget',
      candidates: [
        {
          id: 'c1',
          hypothesis: 'Wrap client-only clock in useEffect',
          patch: { '.agent-memory/experiences/web-frontend/hydration.md': 'useEffect guard' },
        },
        {
          id: 'c2',
          hypothesis: 'Suppress warning',
          patch: { '.agent-memory/experiences/web-frontend/suppress.md': 'suppressHydrationWarning' },
        },
      ],
    });

    recordProbeResult(dir, 'BUILD-99', 'c1', {
      testsPassed: true,
      securityGrade: 'A',
      featureMapStatus: 'VERIFIED',
      score: 92,
      evidence: 'playwright e2e passed',
      runtimeBlocked: false,
    });

    recordProbeResult(dir, 'BUILD-99', 'c2', {
      testsPassed: true,
      securityGrade: 'A',
      featureMapStatus: 'REGRESSED',
      score: 95,
      evidence: 'clock flickered in e2e',
      runtimeBlocked: false,
    });

    const composed = composeWinningHarness(dir, 'BUILD-99');
    assert.equal(composed.verdict, 'COMPOSED');
    assert.equal(composed.winner.id, 'c1');

    const persisted = JSON.parse(
      readFileSync(join(dir, '_workspace', 'probes', 'BUILD-99.json'), 'utf8'),
    );
    assert.equal(persisted.status, 'COMPOSED');
    assert.equal(persisted.composition.winner.id, 'c1');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('CLI interface: create, record, compose', () => {
  const dir = createTempDir();
  try {
    const candidatesJson = JSON.stringify([
      {
        id: 'cli-c1',
        hypothesis: 'CLI winning hypothesis',
        patch: { '.agent-memory/experiences/core/cli.md': 'ok' },
      },
    ]);

    const createOut = execFileSync(
      process.execPath,
      [
        SCRIPT_PATH,
        'create',
        `--project-dir=${dir}`,
        '--task=CLI-1',
        '--domain=core',
        '--premise=CLI probe test',
        `--candidates=${candidatesJson}`,
      ],
      { encoding: 'utf8' },
    );
    assert.equal(JSON.parse(createOut).taskId, 'CLI-1');

    const recordOut = execFileSync(
      process.execPath,
      [
        SCRIPT_PATH,
        'record',
        `--project-dir=${dir}`,
        '--task=CLI-1',
        '--candidate=cli-c1',
        '--tests-passed=true',
        '--security-grade=A',
        '--feature-map-status=VERIFIED',
        '--score=90',
        '--evidence=vitest passed',
      ],
      { encoding: 'utf8' },
    );
    assert.equal(JSON.parse(recordOut).candidates[0].result.testsPassed, true);

    const composeOut = execFileSync(
      process.execPath,
      [SCRIPT_PATH, 'compose', `--project-dir=${dir}`, '--task=CLI-1'],
      { encoding: 'utf8' },
    );
    const composed = JSON.parse(composeOut);
    assert.equal(composed.verdict, 'COMPOSED');
    assert.equal(composed.winner.id, 'cli-c1');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
