#!/usr/bin/env node

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  forgetExperience,
  hasValidExperience,
  listDomains,
  loadValidDomains,
  queryExperiences,
  recordExperience,
} from '../experience-library.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..', '..');
const SCRIPT_PATH = join(__dirname, '..', 'experience-library.mjs');

function createTempDir() {
  return mkdtempSync(join(tmpdir(), 'experience-library-test-'));
}

test('loadValidDomains: loads all 9 skill-pack IDs from .agent-core/skill-packs.json', () => {
  const domains = loadValidDomains(ROOT_DIR);
  assert.ok(Array.isArray(domains));
  for (const expected of [
    'core',
    'web-frontend',
    'nestjs-backend',
    'python-ai',
    'rust-systems',
    'devops-infra',
    'mobile-native',
    'swift-macos',
    'document-office',
  ]) {
    assert.ok(domains.includes(expected), `Expected domain ${expected} to be present`);
  }
});

test('hasValidExperience: requires non-empty domain, taskId, cue, lesson, evidence and valid domain', () => {
  const valid = {
    domain: 'nestjs-backend',
    taskId: 'AUTH-01',
    cue: 'JWT refresh token rotation failing under concurrent requests',
    lesson: 'Use atomic Redis SET NX lock around refresh token rotation',
    evidence: 'npm test passed (18 tests passed, commit a1b2c3d)',
  };
  assert.equal(hasValidExperience(valid, { rootDir: ROOT_DIR }), true);

  assert.equal(hasValidExperience(null), false);
  assert.equal(hasValidExperience({ ...valid, domain: 'unknown-pack' }), false);
  assert.equal(hasValidExperience({ ...valid, domain: '' }), false);
  assert.equal(hasValidExperience({ ...valid, taskId: '   ' }), false);
  assert.equal(hasValidExperience({ ...valid, cue: '' }), false);
  assert.equal(hasValidExperience({ ...valid, lesson: '' }), false);
  assert.equal(hasValidExperience({ ...valid, evidence: '' }), false);
});

test('hasValidExperience: enforces PStack evidence honesty check (rejects vague claims)', () => {
  const base = {
    domain: 'core',
    taskId: 'BUG-12',
    cue: 'CLI crashed on missing config',
    lesson: 'Guard config read with existsSync fallback',
  };

  for (const vague of [
    'looks good',
    'it worked',
    'seems fine now',
    'tested manually and fixed',
    'all good',
  ]) {
    assert.equal(
      hasValidExperience({ ...base, evidence: vague }),
      false,
      `Expected vague evidence "${vague}" to be rejected`,
    );
  }

  for (const concrete of [
    'npm test passed (12 tests passed)',
    'pytest tests/test_cli.py - 8 passed',
    'cargo test --workspace passed',
    'commit 4f8a9c2',
    'docs/verification/evidence/cli-guard-2026-11-15.log',
    'node --test scripts/__tests__/cli.test.mjs (6 tests passed)',
  ]) {
    assert.equal(
      hasValidExperience({ ...base, evidence: concrete }),
      true,
      `Expected concrete evidence "${concrete}" to be accepted`,
    );
  }
});

test('hasValidExperience: rejects entries containing hardcoded secrets', () => {
  const base = {
    domain: 'python-ai',
    taskId: 'SEC-01',
    cue: 'API client threw 401 on startup',
    lesson: 'Read API key from process.env.OPENAI_API_KEY',
    evidence: 'pytest tests/test_client.py passed',
  };

  const secretSamples = [
    { field: 'cue', value: 'Failed with key sk-proj-abc1234567890xyz' },
    { field: 'lesson', value: 'Fallback to AKIAIOSFODNN7EXAMPLE123' },
    { field: 'evidence', value: '-----BEGIN RSA PRIVATE KEY----- in log' },
    { field: 'lesson', value: 'Token ghp_abcdefghijklmnopqrstuvwxyz123456' },
    { field: 'cue', value: 'Config had password=supersecretvalue123' },
  ];

  for (const sample of secretSamples) {
    assert.equal(
      hasValidExperience({ ...base, [sample.field]: sample.value }),
      false,
      `Expected secret in ${sample.field} to be rejected`,
    );
  }
});

test('recordExperience: writes EXPERIENCE.md, optional patch.json, and generates concise INDEX.md', () => {
  const dir = createTempDir();
  try {
    const result = recordExperience(dir, {
      domain: 'nestjs-backend',
      taskId: 'AUTH-01',
      cue: 'Prisma transaction timed out on bulk upsert',
      lesson: 'Batch upserts in chunks of 100 rows inside interactive transaction',
      evidence: 'npm test passed (24 tests passed, commit 9b1c2d3)',
      adoptedPatch: { 'apps/api/src/users/users.service.ts': '// chunked upsert' },
    });

    assert.equal(result.domain, 'nestjs-backend');
    assert.equal(result.slug, 'auth-01');
    assert.equal(existsSync(result.entryPath), true);
    assert.equal(existsSync(result.patchPath), true);
    assert.equal(existsSync(result.indexPath), true);

    const expContent = readFileSync(result.entryPath, 'utf8');
    assert.match(expContent, /AUTH-01/);
    assert.match(expContent, /Prisma transaction timed out/);
    assert.match(expContent, /Batch upserts in chunks of 100/);
    assert.match(expContent, /commit 9b1c2d3/);

    const patchContent = JSON.parse(readFileSync(result.patchPath, 'utf8'));
    assert.deepEqual(patchContent, {
      'apps/api/src/users/users.service.ts': '// chunked upsert',
    });

    const indexContent = readFileSync(result.indexPath, 'utf8');
    assert.match(indexContent, /\| Task \| Cue \| Lesson Summary \| Evidence \|/);
    assert.match(indexContent, /\| AUTH-01 \|/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('recordExperience: throws descriptive error on invalid or secret-containing entry', () => {
  const dir = createTempDir();
  try {
    assert.throws(
      () =>
        recordExperience(dir, {
          domain: 'core',
          taskId: 'BAD-01',
          cue: 'Something broke',
          lesson: 'Fixed it',
          evidence: 'looks good',
        }),
      /evidence/i,
    );

    assert.throws(
      () =>
        recordExperience(dir, {
          domain: 'core',
          taskId: 'BAD-02',
          cue: 'Auth failed with sk-live-secret1234567890',
          lesson: 'Use env var',
          evidence: 'npm test passed',
        }),
      /secret/i,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('queryExperiences & listDomains: filters by domain, query, limit and sorts by recency', () => {
  const dir = createTempDir();
  try {
    recordExperience(dir, {
      domain: 'web-frontend',
      taskId: 'UI-01',
      cue: 'Hydration mismatch on date formatting',
      lesson: 'Render locale dates inside useEffect or pass UTC ISO string',
      evidence: 'vitest passed (10 tests passed)',
      recordedAt: '2026-11-10T10:00:00.000Z',
    });
    recordExperience(dir, {
      domain: 'web-frontend',
      taskId: 'UI-02',
      cue: 'Tailwind v4 theme token not resolving in modal portal',
      lesson: 'Define CSS custom properties on :root instead of scoped container',
      evidence: 'docs/verification/evidence/modal-portal.log',
      recordedAt: '2026-11-15T10:00:00.000Z',
    });
    recordExperience(dir, {
      domain: 'rust-systems',
      taskId: 'RS-01',
      cue: 'Tokio channel deadlock on bounded mpsc',
      lesson: 'Avoid holding MutexGuard across await points',
      evidence: 'cargo test passed',
      recordedAt: '2026-11-12T10:00:00.000Z',
    });

    assert.deepEqual(listDomains(dir), ['rust-systems', 'web-frontend']);

    const webAll = queryExperiences(dir, { domain: 'web-frontend' });
    assert.equal(webAll.length, 2);
    assert.equal(webAll[0].taskId, 'UI-02');
    assert.equal(webAll[1].taskId, 'UI-01');

    const hydration = queryExperiences(dir, { query: 'hydration' });
    assert.equal(hydration.length, 1);
    assert.equal(hydration[0].taskId, 'UI-01');

    const limited = queryExperiences(dir, { limit: 2 });
    assert.equal(limited.length, 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('forgetExperience: removes entry directory and regenerates INDEX.md', () => {
  const dir = createTempDir();
  try {
    recordExperience(dir, {
      domain: 'devops-infra',
      taskId: 'CI-01',
      cue: 'Docker buildx cache miss on pnpm store',
      lesson: 'Mount cache=type=gha for /root/.local/share/pnpm/store',
      evidence: 'commit 12ab34c',
    });
    recordExperience(dir, {
      domain: 'devops-infra',
      taskId: 'CI-02',
      cue: 'Helm template failed on empty ingress hosts',
      lesson: 'Guard ingress block with {{- if .Values.ingress.enabled }}',
      evidence: 'verify.mjs passed (14 checks passed)',
    });

    const removed = forgetExperience(dir, 'devops-infra', 'CI-01');
    assert.equal(removed.removed, true);

    const remaining = queryExperiences(dir, { domain: 'devops-infra' });
    assert.equal(remaining.length, 1);
    assert.equal(remaining[0].taskId, 'CI-02');

    const indexPath = join(dir, '.agent-memory', 'experiences', 'devops-infra', 'INDEX.md');
    const indexContent = readFileSync(indexPath, 'utf8');
    assert.doesNotMatch(indexContent, /CI-01/);
    assert.match(indexContent, /CI-02/);

    const missing = forgetExperience(dir, 'devops-infra', 'NON-EXISTENT');
    assert.equal(missing.removed, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('CLI: supports record, query, list, and forget subcommands', () => {
  const dir = createTempDir();
  try {
    execFileSync(
      process.execPath,
      [
        SCRIPT_PATH,
        'record',
        `--project=${dir}`,
        '--domain=nestjs-backend',
        '--task=CLI-01',
        '--cue=DTO validation skipped nested objects',
        '--lesson=Add @ValidateNested({ each: true }) and @Type(() => ChildDto)',
        '--evidence=npm test passed (5 tests passed)',
      ],
      { encoding: 'utf8' },
    );

    const listOut = execFileSync(
      process.execPath,
      [SCRIPT_PATH, 'list', `--project=${dir}`, '--json'],
      { encoding: 'utf8' },
    );
    assert.deepEqual(JSON.parse(listOut), ['nestjs-backend']);

    const queryOut = execFileSync(
      process.execPath,
      [SCRIPT_PATH, 'query', `--project=${dir}`, '--domain=nestjs-backend', '--json'],
      { encoding: 'utf8' },
    );
    const queried = JSON.parse(queryOut);
    assert.equal(queried.length, 1);
    assert.equal(queried[0].taskId, 'CLI-01');

    execFileSync(
      process.execPath,
      [SCRIPT_PATH, 'forget', `--project=${dir}`, '--domain=nestjs-backend', '--task=CLI-01'],
      { encoding: 'utf8' },
    );
    const listAfter = execFileSync(
      process.execPath,
      [SCRIPT_PATH, 'list', `--project=${dir}`, '--json'],
      { encoding: 'utf8' },
    );
    assert.deepEqual(JSON.parse(listAfter), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
