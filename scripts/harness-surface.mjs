#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/**
 * Guarded Harness² SurfaceSpec: defines always-on context budgets,
 * immutable PStack/security surfaces, and evolvable harness surfaces.
 */
export const SURFACE_SPEC = {
  alwaysOnMax: {
    'AGENTS.md': 24576,
    'CLAUDE.md': 8192,
    '.agent-core/rules/*.md': 12288,
  },
  immutable: [
    { pattern: /^AGENTS\.md$/, component: 'c1_prompt' },
    { pattern: /^CLAUDE\.md$/, component: 'c1_prompt' },
    { pattern: /^CODEX\.md$/, component: 'c1_prompt' },
    { pattern: /^\.agent-core\/standards\/.+$/, component: 'c2_guardrails' },
    { pattern: /^\.agent-core\/rules\/.+$/, component: 'c2_guardrails' },
    { pattern: /^\.agent-core\/hooks\/.+$/, component: 'c2_guardrails' },
    { pattern: /^scripts\/security-gate\.mjs$/, component: 'c2_guardrails' },
    { pattern: /^scripts\/harness-state\.mjs$/, component: 'c2_guardrails' },
    { pattern: /^scripts\/harness-surface\.mjs$/, component: 'c2_guardrails' },
    { pattern: /^\.agent-core\/skills\/create-verification-skill\/.+$/, component: 'pstack_verification' },
    { pattern: /^\.agent-core\/skills\/maintain-verification-skill\/.+$/, component: 'pstack_verification' },
    { pattern: /^docs\/verification\/feature-map\.md$/, component: 'pstack_verification' },
  ],
  evolvable: [
    { pattern: /^\.agent-memory\/experiences\/.+$/, component: 'c3_memory' },
    { pattern: /^\.agent-core\/skills\/[^/]+\/references\/.+$/, component: 'c6_skills' },
    { pattern: /^\.agent-core\/skills\/[^/]+\/scripts\/.+$/, component: 'c7_scripts' },
    { pattern: /^\.agent-core\/skills\/[^/]+\/SKILL\.md$/, component: 'c6_skills' },
  ],
};

const SECRET_PATTERNS = [
  { name: 'API key (sk-)', regex: /\bsk-[A-Za-z0-9_-]{16,}/ },
  { name: 'AWS access key (AKIA)', regex: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'Private key block', regex: /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/ },
  { name: 'GitHub token (ghp_)', regex: /\bghp_[A-Za-z0-9_]{16,}/ },
];

/**
 * Normalizes a relative harness path, rejecting escapes, absolute paths,
 * empty strings, and null bytes.
 * @param {string} relPath
 * @returns {string}
 */
export function normalizeRel(relPath) {
  if (typeof relPath !== 'string' || relPath.includes('\0')) {
    throw new Error(`path escapes the harness: ${String(relPath)}`);
  }

  const trimmed = relPath.trim();
  if (!trimmed) {
    throw new Error(`path escapes the harness: ${relPath}`);
  }

  let normalized = trimmed.replace(/\\/g, '/');
  if (normalized.startsWith('/') || /^[A-Za-z]:/.test(normalized)) {
    throw new Error(`path escapes the harness: ${relPath}`);
  }

  while (normalized.startsWith('./')) {
    normalized = normalized.slice(2);
  }
  normalized = normalized.replace(/\/+/g, '/');

  const segments = normalized.split('/').filter((seg) => seg !== '' && seg !== '.');
  if (segments.length === 0 || segments.some((seg) => seg === '..')) {
    throw new Error(`path escapes the harness: ${relPath}`);
  }

  return segments.join('/');
}

/**
 * Classifies a harness path into immutable, evolvable, or restricted tiers.
 * Immutable rules are evaluated before evolvable rules so verification skills
 * remain locked even though they live under `.agent-core/skills/`.
 * @param {string} relPath
 * @returns {{ editable: boolean, tier: 'immutable' | 'evolvable' | 'restricted', component: string }}
 */
export function classifySurface(relPath) {
  const rel = normalizeRel(relPath);

  for (const rule of SURFACE_SPEC.immutable) {
    if (rule.pattern.test(rel)) {
      return { editable: false, tier: 'immutable', component: rule.component };
    }
  }

  for (const rule of SURFACE_SPEC.evolvable) {
    if (rule.pattern.test(rel)) {
      return { editable: true, tier: 'evolvable', component: rule.component };
    }
  }

  return { editable: false, tier: 'restricted', component: 'unknown' };
}

/**
 * Enforces `always_on_max` byte caps on always-on prompt/rule files.
 * @param {string} rootDir
 * @returns {{ passed: boolean, results: Array<{ file: string, bytes: number, maxBytes: number, ok: boolean }> }}
 */
export function validateAlwaysOnBudget(rootDir) {
  const root = resolve(rootDir);
  const targets = [
    { file: 'AGENTS.md', maxBytes: SURFACE_SPEC.alwaysOnMax['AGENTS.md'] },
    { file: 'CLAUDE.md', maxBytes: SURFACE_SPEC.alwaysOnMax['CLAUDE.md'] },
  ];

  const rulesDir = join(root, '.agent-core', 'rules');
  if (existsSync(rulesDir)) {
    const ruleMax = SURFACE_SPEC.alwaysOnMax['.agent-core/rules/*.md'];
    const entries = readdirSync(rulesDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
      .sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      targets.push({ file: `.agent-core/rules/${entry.name}`, maxBytes: ruleMax });
    }
  }

  const results = [];
  for (const target of targets) {
    const fullPath = join(root, target.file);
    if (!existsSync(fullPath)) continue;
    const bytes = statSync(fullPath).size;
    results.push({
      file: target.file,
      bytes,
      maxBytes: target.maxBytes,
      ok: bytes <= target.maxBytes,
    });
  }

  return {
    passed: results.every((r) => r.ok),
    results,
  };
}

function collectSkillScripts(rootDir) {
  const skillsDir = join(rootDir, '.agent-core', 'skills');
  if (!existsSync(skillsDir)) return [];

  const collected = [];
  const supportedExts = new Set(['.mjs', '.js', '.sh', '.py']);

  function walk(dirPath, relPrefix) {
    for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
      const full = join(dirPath, entry.name);
      const rel = `${relPrefix}/${entry.name}`;
      if (entry.isDirectory()) {
        walk(full, rel);
      } else if (entry.isFile() && supportedExts.has(extname(entry.name))) {
        collected.push({ fullPath: full, relPath: rel, ext: extname(entry.name) });
      }
    }
  }

  for (const skillEntry of readdirSync(skillsDir, { withFileTypes: true })) {
    if (!skillEntry.isDirectory()) continue;
    const scriptsDir = join(skillsDir, skillEntry.name, 'scripts');
    if (existsSync(scriptsDir)) {
      walk(scriptsDir, `.agent-core/skills/${skillEntry.name}/scripts`);
    }
  }

  return collected.sort((a, b) => a.relPath.localeCompare(b.relPath));
}

function hasPython3() {
  try {
    execFileSync('python3', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Scans `.agent-core/skills/<skill>/scripts/` and runs syntax checks
 * (`node --check`, `bash -n`, `python3 -m py_compile` if python3 exists).
 * @param {string} rootDir
 * @returns {{ passed: boolean, checked: number, errors: Array<{ file: string, error: string }> }}
 */
export function validateSkillScripts(rootDir) {
  const root = resolve(rootDir);
  const scripts = collectSkillScripts(root);
  const pythonAvailable = scripts.some((s) => s.ext === '.py') && hasPython3();
  const pycacheDir = pythonAvailable ? mkdtempSync(join(tmpdir(), 'harness-pycache-')) : null;
  const errors = [];
  let checked = 0;

  try {
    for (const script of scripts) {
      if (script.ext === '.py' && !pythonAvailable) continue;
      checked += 1;

      try {
        if (script.ext === '.mjs' || script.ext === '.js') {
          execFileSync(process.execPath, ['--check', script.fullPath], { stdio: 'pipe' });
        } else if (script.ext === '.sh') {
          execFileSync('bash', ['-n', script.fullPath], { stdio: 'pipe' });
        } else if (script.ext === '.py') {
          execFileSync('python3', ['-m', 'py_compile', script.fullPath], {
            stdio: 'pipe',
            env: { ...process.env, PYTHONPYCACHEPREFIX: pycacheDir },
          });
        }
      } catch (err) {
        const stderr = err.stderr ? err.stderr.toString().trim() : '';
        errors.push({ file: script.relPath, error: stderr || err.message });
      }
    }
  } finally {
    if (pycacheDir) {
      rmSync(pycacheDir, { recursive: true, force: true });
    }
  }

  return {
    passed: errors.length === 0,
    checked,
    errors,
  };
}

/**
 * Validates an omitted-is-inherited harness proposal `{ [relPath]: content }`.
 * Rejects path escapes, non-evolvable surfaces, and secret patterns.
 * @param {Record<string, string>} patchTree
 * @returns {{ valid: boolean, errors: string[], touchedSurfaces: Array<{ path: string, tier: string, component: string }> }}
 */
export function validateHarnessProposal(patchTree) {
  if (!patchTree || typeof patchTree !== 'object' || Array.isArray(patchTree)) {
    return {
      valid: false,
      errors: ['patchTree must be a non-null object'],
      touchedSurfaces: [],
    };
  }

  const errors = [];
  const touchedSurfaces = [];

  for (const [rawPath, content] of Object.entries(patchTree)) {
    let rel;
    try {
      rel = normalizeRel(rawPath);
    } catch (err) {
      errors.push(err.message);
      continue;
    }

    const surface = classifySurface(rel);
    touchedSurfaces.push({ path: rel, tier: surface.tier, component: surface.component });

    if (!surface.editable) {
      errors.push(`Surface is not editable (${surface.tier}): ${rel}`);
    }

    if (typeof content === 'string') {
      for (const secret of SECRET_PATTERNS) {
        if (secret.regex.test(content)) {
          errors.push(`Secret pattern detected (${secret.name}) in ${rel}`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    touchedSurfaces,
  };
}

function runCli() {
  const [, , command, arg] = process.argv;

  if (command === 'check') {
    const rootDir = process.cwd();
    const budget = validateAlwaysOnBudget(rootDir);
    const scripts = validateSkillScripts(rootDir);
    const passed = budget.passed && scripts.passed;

    console.log(
      `Harness surface check ${passed ? 'PASSED' : 'FAILED'}: ` +
        `budget=${budget.results.filter((r) => r.ok).length}/${budget.results.length} ok, ` +
        `scripts=${scripts.checked} checked (${scripts.errors.length} errors)`,
    );

    if (!budget.passed) {
      for (const r of budget.results.filter((item) => !item.ok)) {
        console.error(`  [BUDGET] ${r.file}: ${r.bytes} bytes > ${r.maxBytes} max`);
      }
    }
    if (!scripts.passed) {
      for (const e of scripts.errors) {
        console.error(`  [SCRIPT] ${e.file}: ${e.error}`);
      }
    }

    process.exit(passed ? 0 : 1);
  }

  if (command === 'validate-patch') {
    if (!arg) {
      console.error('Usage: node scripts/harness-surface.mjs validate-patch <json-file>');
      process.exit(1);
    }
    const raw = readFileSync(resolve(arg), 'utf8');
    const patchTree = JSON.parse(raw);
    const result = validateHarnessProposal(patchTree);
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.valid ? 0 : 1);
  }

  console.error('Usage: node scripts/harness-surface.mjs <check | validate-patch <json-file>>');
  process.exit(1);
}

const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain || (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)) {
  runCli();
}
