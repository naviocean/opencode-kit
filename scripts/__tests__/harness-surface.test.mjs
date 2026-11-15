#!/usr/bin/env node

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  SURFACE_SPEC,
  classifySurface,
  normalizeRel,
  validateAlwaysOnBudget,
  validateHarnessProposal,
  validateSkillScripts,
} from '../harness-surface.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = join(__dirname, '..', 'harness-surface.mjs');
const REPO_ROOT = join(__dirname, '..', '..');

function createTempDir() {
  return mkdtempSync(join(tmpdir(), 'harness-surface-test-'));
}

function writeTempFile(rootDir, relPath, content) {
  const fullPath = join(rootDir, relPath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, 'utf8');
  return fullPath;
}

test('SURFACE_SPEC defines expected alwaysOnMax budgets', () => {
  assert.equal(SURFACE_SPEC.alwaysOnMax['AGENTS.md'], 24576);
  assert.equal(SURFACE_SPEC.alwaysOnMax['CLAUDE.md'], 8192);
  assert.equal(SURFACE_SPEC.alwaysOnMax['.agent-core/rules/*.md'], 12288);
});

test('normalizeRel: normalizes valid relative paths and strips leading ./', () => {
  assert.equal(normalizeRel('AGENTS.md'), 'AGENTS.md');
  assert.equal(normalizeRel('./AGENTS.md'), 'AGENTS.md');
  assert.equal(normalizeRel('.\\.agent-core\\rules\\coding-standards.md'), '.agent-core/rules/coding-standards.md');
  assert.equal(normalizeRel('.agent-core//skills/tdd/SKILL.md'), '.agent-core/skills/tdd/SKILL.md');
});

test('normalizeRel: rejects empty strings, null bytes, absolute paths, and parent traversal', () => {
  for (const bad of ['', '   ', '/etc/passwd', '../../AGENTS.md', 'foo/../../bar', 'AGENTS.md\0.txt', '.']) {
    assert.throws(
      () => normalizeRel(bad),
      /path escapes the harness/,
      `Expected normalizeRel(${JSON.stringify(bad)}) to throw`,
    );
  }
});

test('classifySurface: locks IMMUTABLE_SURFACES with editable: false', () => {
  const immutableCases = [
    ['AGENTS.md', 'c1_prompt'],
    ['CLAUDE.md', 'c1_prompt'],
    ['CODEX.md', 'c1_prompt'],
    ['.agent-core/standards/conventions.md', 'c2_guardrails'],
    ['.agent-core/rules/security-standards.md', 'c2_guardrails'],
    ['.agent-core/hooks/pre-tool-guard.mjs', 'c2_guardrails'],
    ['scripts/security-gate.mjs', 'c2_guardrails'],
    ['scripts/harness-state.mjs', 'c2_guardrails'],
    ['scripts/harness-surface.mjs', 'c2_guardrails'],
    ['.agent-core/skills/create-verification-skill/SKILL.md', 'pstack_verification'],
    ['.agent-core/skills/create-verification-skill/scripts/check.mjs', 'pstack_verification'],
    ['.agent-core/skills/maintain-verification-skill/SKILL.md', 'pstack_verification'],
    ['docs/verification/feature-map.md', 'pstack_verification'],
  ];

  for (const [relPath, expectedComponent] of immutableCases) {
    const result = classifySurface(relPath);
    assert.equal(result.editable, false, `${relPath} must not be editable`);
    assert.equal(result.tier, 'immutable', `${relPath} must be immutable`);
    assert.equal(result.component, expectedComponent, `${relPath} component mismatch`);
  }
});

test('classifySurface: allows EVOLVABLE_SURFACES with editable: true', () => {
  const evolvableCases = [
    ['.agent-memory/experiences/nestjs-backend/INDEX.md', 'c3_memory'],
    ['.agent-memory/experiences/core/entries/auth/EXPERIENCE.md', 'c3_memory'],
    ['.agent-core/skills/tdd/references/patterns.md', 'c6_skills'],
    ['.agent-core/skills/tdd/SKILL.md', 'c6_skills'],
    ['.agent-core/skills/monitor-ci/scripts/ci-poll-decide.mjs', 'c7_scripts'],
  ];

  for (const [relPath, expectedComponent] of evolvableCases) {
    const result = classifySurface(relPath);
    assert.equal(result.editable, true, `${relPath} must be editable`);
    assert.equal(result.tier, 'evolvable', `${relPath} must be evolvable`);
    assert.equal(result.component, expectedComponent, `${relPath} component mismatch`);
  }
});

test('classifySurface: marks unrecognized paths as restricted/unknown', () => {
  for (const restrictedPath of ['package.json', 'apps/web/src/App.tsx', 'scripts/verify.mjs', 'README.md']) {
    const result = classifySurface(restrictedPath);
    assert.deepEqual(result, { editable: false, tier: 'restricted', component: 'unknown' });
  }
});

test('validateAlwaysOnBudget: passes within caps and fails when exceeded', () => {
  const dir = createTempDir();
  try {
    writeTempFile(dir, 'AGENTS.md', 'a'.repeat(1000));
    writeTempFile(dir, 'CLAUDE.md', 'b'.repeat(500));
    writeTempFile(dir, '.agent-core/rules/coding-standards.md', 'c'.repeat(2000));

    const okReport = validateAlwaysOnBudget(dir);
    assert.equal(okReport.passed, true);
    assert.equal(okReport.results.length, 3);
    assert.ok(okReport.results.every((r) => r.ok));

    writeTempFile(dir, 'CLAUDE.md', 'x'.repeat(8193));
    const failReport = validateAlwaysOnBudget(dir);
    assert.equal(failReport.passed, false);
    const claudeEntry = failReport.results.find((r) => r.file === 'CLAUDE.md');
    assert.equal(claudeEntry.ok, false);
    assert.equal(claudeEntry.bytes, 8193);
    assert.equal(claudeEntry.maxBytes, 8192);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('validateSkillScripts: passes valid scripts and catches syntax errors', () => {
  const dir = createTempDir();
  try {
    writeTempFile(dir, '.agent-core/skills/demo/scripts/good.mjs', 'export const x = 1;\n');
    writeTempFile(dir, '.agent-core/skills/demo/scripts/good.sh', '#!/usr/bin/env bash\necho "ok"\n');

    const okReport = validateSkillScripts(dir);
    assert.equal(okReport.passed, true);
    assert.equal(okReport.checked, 2);
    assert.deepEqual(okReport.errors, []);

    writeTempFile(dir, '.agent-core/skills/demo/scripts/bad.mjs', 'export const broken = (\n');
    const failReport = validateSkillScripts(dir);
    assert.equal(failReport.passed, false);
    assert.equal(failReport.checked, 3);
    assert.equal(failReport.errors.length, 1);
    assert.equal(failReport.errors[0].file, '.agent-core/skills/demo/scripts/bad.mjs');
    assert.ok(failReport.errors[0].error.length > 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('validateHarnessProposal: accepts valid evolvable patch and rejects immutable/restricted/secret patches', () => {
  const validPatch = {
    '.agent-memory/experiences/core/INDEX.md': '# Core Experiences\n',
    '.agent-core/skills/tdd/references/notes.md': '# Notes\n',
  };
  const okResult = validateHarnessProposal(validPatch);
  assert.equal(okResult.valid, true);
  assert.deepEqual(okResult.errors, []);
  assert.equal(okResult.touchedSurfaces.length, 2);

  const immutablePatch = {
    'AGENTS.md': '# hijacked',
    '.agent-core/skills/create-verification-skill/SKILL.md': '# hijacked',
  };
  const immutableResult = validateHarnessProposal(immutablePatch);
  assert.equal(immutableResult.valid, false);
  assert.equal(immutableResult.errors.length, 2);

  const escapePatch = {
    '../../etc/passwd': 'root:x:0:0:',
  };
  const escapeResult = validateHarnessProposal(escapePatch);
  assert.equal(escapeResult.valid, false);
  assert.match(escapeResult.errors[0], /path escapes the harness/);

  const secretSamples = [
    'apiKey = "sk-proj-1234567890abcdef1234567890"',
    'aws = "AKIAIOSFODNN7EXAMPLE"',
    '-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----',
    'token = "ghp_1234567890abcdef1234567890abcd"',
  ];
  for (const sample of secretSamples) {
    const secretResult = validateHarnessProposal({
      '.agent-memory/experiences/core/INDEX.md': sample,
    });
    assert.equal(secretResult.valid, false, `Expected secret rejection for: ${sample}`);
  }
});

test('CLI: check passes on current repo and validate-patch validates JSON file', () => {
  const checkOut = execFileSync(process.execPath, [SCRIPT_PATH, 'check'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  assert.match(checkOut, /passed/i);

  const dir = createTempDir();
  try {
    const patchPath = join(dir, 'patch.json');
    writeFileSync(
      patchPath,
      JSON.stringify({ '.agent-memory/experiences/core/INDEX.md': '# Valid\n' }),
      'utf8',
    );
    const patchOut = execFileSync(process.execPath, [SCRIPT_PATH, 'validate-patch', patchPath], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
    const parsed = JSON.parse(patchOut);
    assert.equal(parsed.valid, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
