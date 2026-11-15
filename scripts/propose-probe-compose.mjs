#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PASSING_SECURITY_GRADES = new Set(['A+', 'A', 'A-', 'B+', 'B']);

const FALLBACK_IMMUTABLE_PREFIXES = [
  '.agent-core/standards/',
  '.agent-core/rules/',
  '.agent-core/hooks/',
  '.agent-core/skills/create-verification-skill/',
  '.agent-core/skills/maintain-verification-skill/',
];

const FALLBACK_IMMUTABLE_EXACT = new Set([
  'AGENTS.md',
  'CLAUDE.md',
  'scripts/security-gate.mjs',
  'scripts/pre-tool-guard.mjs',
  'docs/verification/feature-map.md',
]);

function fallbackValidateHarnessProposal(patchTree) {
  const errors = [];
  if (!patchTree || typeof patchTree !== 'object' || Array.isArray(patchTree)) {
    return { valid: false, errors: ['patchTree must be a plain object'] };
  }
  for (const rawPath of Object.keys(patchTree)) {
    if (!rawPath || rawPath.includes('\0') || rawPath.startsWith('/') || rawPath.split(/[\\/]/).includes('..')) {
      errors.push(`Invalid relative path: ${rawPath}`);
      continue;
    }
    const normalized = rawPath.replace(/\\/g, '/').replace(/^\.\//, '');
    if (
      FALLBACK_IMMUTABLE_EXACT.has(normalized) ||
      FALLBACK_IMMUTABLE_PREFIXES.some((prefix) => normalized.startsWith(prefix))
    ) {
      errors.push(`Cannot mutate IMMUTABLE_SURFACES path: ${normalized}`);
    }
  }
  return { valid: errors.length === 0, errors };
}

let validateHarnessProposal;
try {
  ({ validateHarnessProposal } = await import('./harness-surface.mjs'));
} catch (err) {
  if (err && err.code === 'ERR_MODULE_NOT_FOUND') {
    validateHarnessProposal = fallbackValidateHarnessProposal;
  } else {
    throw err;
  }
}

function resolveProbeSessionPath(projectDir, taskId) {
  if (!projectDir || typeof projectDir !== 'string') {
    throw new Error('projectDir is required');
  }
  if (
    !taskId ||
    typeof taskId !== 'string' ||
    taskId.includes('\0') ||
    taskId.includes('/') ||
    taskId.includes('\\') ||
    taskId.includes('..')
  ) {
    throw new Error(`Invalid taskId: ${taskId}`);
  }
  return join(projectDir, '_workspace', 'probes', `${taskId}.json`);
}

function readProbeSession(projectDir, taskId) {
  const sessionPath = resolveProbeSessionPath(projectDir, taskId);
  if (!existsSync(sessionPath)) {
    throw new Error(`Probe session not found for task: ${taskId}`);
  }
  return { sessionPath, session: JSON.parse(readFileSync(sessionPath, 'utf8')) };
}

function writeProbeSession(sessionPath, session) {
  mkdirSync(dirname(sessionPath), { recursive: true });
  writeFileSync(sessionPath, `${JSON.stringify(session, null, 2)}\n`, 'utf8');
}

/**
 * Create a new Propose-Probe-Compose session after validating all candidate patches
 * against IMMUTABLE_SURFACES via validateHarnessProposal().
 */
export function createProbeSession(projectDir, { taskId, domain, premise, candidates }) {
  const sessionPath = resolveProbeSessionPath(projectDir, taskId);
  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new Error('candidates must be a non-empty array');
  }

  const normalizedCandidates = candidates.map((candidate) => {
    if (!candidate || typeof candidate !== 'object' || !candidate.id) {
      throw new Error('Each candidate must be an object with an id');
    }
    const patch = candidate.patch || {};
    const validation = validateHarnessProposal(patch);
    if (!validation.valid) {
      throw new Error(
        `Candidate "${candidate.id}" rejected (IMMUTABLE_SURFACES / surface policy): ${validation.errors.join('; ')}`,
      );
    }
    return {
      id: String(candidate.id),
      hypothesis: candidate.hypothesis || candidate.description || '',
      patch,
      result: null,
    };
  });

  const now = new Date().toISOString();
  const session = {
    taskId,
    domain: domain || null,
    premise: premise || '',
    status: 'PENDING',
    candidates: normalizedCandidates,
    composition: null,
    createdAt: now,
    updatedAt: now,
  };

  writeProbeSession(sessionPath, session);
  return session;
}

/**
 * Record empirical probe verification results for a candidate in an existing session.
 */
export function recordProbeResult(projectDir, taskId, candidateId, result) {
  const { sessionPath, session } = readProbeSession(projectDir, taskId);
  const candidate = session.candidates.find((c) => c.id === candidateId);
  if (!candidate) {
    throw new Error(`Unknown candidate "${candidateId}" in probe session "${taskId}"`);
  }

  const now = new Date().toISOString();
  candidate.result = {
    testsPassed: Boolean(result?.testsPassed),
    testsPassCount: typeof result?.testsPassCount === 'number' ? result.testsPassCount : 0,
    securityGrade: result?.securityGrade ?? null,
    featureMapStatus: result?.featureMapStatus ?? 'UNVERIFIED',
    score: typeof result?.score === 'number' ? result.score : 0,
    evidence: result?.evidence ?? '',
    runtimeBlocked: Boolean(result?.runtimeBlocked),
    recordedAt: now,
  };
  session.updatedAt = now;

  writeProbeSession(sessionPath, session);
  return session;
}

function evaluateCandidate(candidate) {
  const res = candidate.result !== undefined ? candidate.result : candidate;
  const reasons = [];

  if (!res || typeof res !== 'object') {
    reasons.push('probe result missing');
  } else {
    if (res.runtimeBlocked === true) {
      reasons.push('runtimeBlocked is true');
    }
    if (res.testsPassed !== true) {
      reasons.push('testsPassed is not true');
    }
    const grade = res.securityGrade ? String(res.securityGrade).trim().toUpperCase() : '';
    if (!PASSING_SECURITY_GRADES.has(grade)) {
      reasons.push(`securityGrade '${res.securityGrade ?? 'missing'}' is below 'B'`);
    }
    if (res.featureMapStatus === 'REGRESSED') {
      reasons.push("featureMapStatus is 'REGRESSED'");
    }
  }

  return {
    ...candidate,
    result: res,
    disqualified: reasons.length > 0,
    disqualificationReasons: reasons,
  };
}

function compareEligibleCandidates(a, b) {
  const aVerified = a.result?.featureMapStatus === 'VERIFIED' ? 1 : 0;
  const bVerified = b.result?.featureMapStatus === 'VERIFIED' ? 1 : 0;
  if (aVerified !== bVerified) {
    return bVerified - aVerified;
  }

  const aScore = typeof a.result?.score === 'number' ? a.result.score : 0;
  const bScore = typeof b.result?.score === 'number' ? b.result.score : 0;
  if (aScore !== bScore) {
    return bScore - aScore;
  }

  const aPassCount = typeof a.result?.testsPassCount === 'number' ? a.result.testsPassCount : 0;
  const bPassCount = typeof b.result?.testsPassCount === 'number' ? b.result.testsPassCount : 0;
  return bPassCount - aPassCount;
}

/**
 * Evaluate probe candidates using the Hard PStack Disqualification Filter
 * and rank eligible candidates by VERIFIED status, score, and testsPassCount.
 */
export function evaluateProbes(candidatesWithResults, context = {}) {
  if (!Array.isArray(candidatesWithResults)) {
    throw new Error('candidatesWithResults must be an array');
  }

  const evaluated = candidatesWithResults.map(evaluateCandidate);
  const eligible = evaluated.filter((c) => !c.disqualified);

  if (eligible.length === 0) {
    const hasBlocked = evaluated.some((c) => c.result?.runtimeBlocked === true);
    return {
      verdict: hasBlocked ? 'BLOCKED' : 'ALL_CANDIDATES_REJECTED',
      winner: null,
      adoptedPatch: null,
      experience: null,
      candidates: evaluated,
    };
  }

  eligible.sort(compareEligibleCandidates);
  const winner = eligible[0];

  return {
    verdict: 'COMPOSED',
    winner,
    adoptedPatch: winner.patch || {},
    experience: {
      domain: context.domain ?? winner.domain ?? null,
      taskId: context.taskId ?? winner.taskId ?? null,
      cue: context.premise || winner.cue || `Contrastive probe for ${context.taskId || winner.id}`,
      lesson:
        winner.hypothesis ||
        winner.lesson ||
        `Adopted candidate ${winner.id} after passing PStack verification gates`,
      evidence:
        winner.result?.evidence ||
        `testsPassed=true, securityGrade=${winner.result?.securityGrade}, featureMapStatus=${winner.result?.featureMapStatus}`,
    },
    candidates: evaluated,
  };
}

/**
 * Evaluate all recorded probe results for a task session and persist the composition verdict.
 */
export function composeWinningHarness(projectDir, taskId) {
  const { sessionPath, session } = readProbeSession(projectDir, taskId);
  const composition = evaluateProbes(session.candidates, {
    taskId: session.taskId,
    domain: session.domain,
    premise: session.premise,
  });

  session.status = composition.verdict;
  session.composition = composition;
  session.updatedAt = new Date().toISOString();

  writeProbeSession(sessionPath, session);
  return composition;
}

function parseCliArgs(argv) {
  const [command, ...rest] = argv;
  const flags = {};
  for (const arg of rest) {
    if (!arg.startsWith('--')) continue;
    const eqIdx = arg.indexOf('=');
    if (eqIdx === -1) {
      flags[arg.slice(2)] = true;
    } else {
      flags[arg.slice(2, eqIdx)] = arg.slice(eqIdx + 1);
    }
  }
  return { command, flags };
}

function parseBooleanFlag(val) {
  if (typeof val === 'boolean') return val;
  return String(val).toLowerCase() === 'true';
}

function runCli() {
  const { command, flags } = parseCliArgs(process.argv.slice(2));
  const projectDir = flags['project-dir'] || process.cwd();

  try {
    switch (command) {
      case 'create': {
        const candidates = flags['candidates-file']
          ? JSON.parse(readFileSync(flags['candidates-file'], 'utf8'))
          : JSON.parse(flags.candidates || '[]');
        const session = createProbeSession(projectDir, {
          taskId: flags.task,
          domain: flags.domain || null,
          premise: flags.premise || '',
          candidates,
        });
        console.log(JSON.stringify(session, null, 2));
        process.exit(0);
      }

      case 'record': {
        const result = flags.result
          ? JSON.parse(flags.result)
          : {
              testsPassed: parseBooleanFlag(flags['tests-passed']),
              testsPassCount: Number(flags['tests-pass-count'] || 0),
              securityGrade: flags['security-grade'] || null,
              featureMapStatus: flags['feature-map-status'] || 'UNVERIFIED',
              score: Number(flags.score || 0),
              evidence: flags.evidence || '',
              runtimeBlocked: parseBooleanFlag(flags['runtime-blocked'] || false),
            };
        const session = recordProbeResult(projectDir, flags.task, flags.candidate, result);
        console.log(JSON.stringify(session, null, 2));
        process.exit(0);
      }

      case 'compose': {
        const composition = composeWinningHarness(projectDir, flags.task);
        console.log(JSON.stringify(composition, null, 2));
        process.exit(0);
      }

      default: {
        console.error(
          'Usage: node scripts/propose-probe-compose.mjs <create|record|compose> [options]',
        );
        process.exit(1);
      }
    }
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

const isMain =
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (isMain) {
  runCli();
}
