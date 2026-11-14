#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SCHEMA_VERSION = '1.0.0';
export const PHASES = ['IDLE', 'PLAN', 'BUILD', 'REVIEW', 'SHIP', 'COMPLETED'];

const VALID_GATES = new Set(['review', 'qa', 'security']);
const APPROVED_VERDICTS = new Set(['APPROVED', 'APPROVED_WITH_NOTES', 'PASSED']);
const BLOCKED_VERDICTS = new Set(['BLOCKED', 'FAILED', 'REJECTED', 'CHANGES_REQUESTED']);
const ACTIVE_TASK_STATUSES = new Set(['pending', 'running', 'in_progress']);

const TRANSITIONS = {
  IDLE: ['PLAN'],
  PLAN: ['BUILD'],
  BUILD: ['REVIEW'],
  REVIEW: ['SHIP', 'BUILD'],
  SHIP: ['COMPLETED', 'BUILD'],
  COMPLETED: [],
};

/**
 * Resolve the harness state file path from a string path or options object.
 */
export function resolveStatePath(targetOrOpts) {
  if (typeof targetOrOpts === 'string' && targetOrOpts.length > 0) {
    return targetOrOpts;
  }
  if (targetOrOpts && typeof targetOrOpts === 'object') {
    if (targetOrOpts.statePath) {
      return targetOrOpts.statePath;
    }
    const baseDir = targetOrOpts.projectDir || process.cwd();
    return join(baseDir, '_workspace', 'harness-state.json');
  }
  return join(process.cwd(), '_workspace', 'harness-state.json');
}

/**
 * Resolve the current git HEAD SHA for a repository directory, or null if unavailable.
 */
export function getGitHead(cwd = process.cwd()) {
  try {
    const out = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return out.trim() || null;
  } catch {
    return null;
  }
}

function inferProjectDir(statePath, options = {}) {
  if (options.projectDir) {
    return options.projectDir;
  }
  const parent = dirname(statePath);
  return parent.endsWith('_workspace') ? dirname(parent) : parent;
}

/**
 * Atomically write state JSON using a temp file in the same directory + fs.renameSync.
 */
export function writeStateAtomic(target, state) {
  const statePath = resolveStatePath(target);
  const dir = dirname(statePath);
  mkdirSync(dir, { recursive: true });

  const tmpPath = join(dir, `.harness-state.${process.pid}.${randomUUID()}.tmp`);
  try {
    writeFileSync(tmpPath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
    renameSync(tmpPath, statePath);
  } catch (err) {
    if (existsSync(tmpPath)) {
      try {
        unlinkSync(tmpPath);
      } catch {
        // Ignore cleanup failure
      }
    }
    throw err;
  }
  return statePath;
}

/**
 * Read harness state from disk, or return null if not initialized.
 */
export function readState(target) {
  const statePath = resolveStatePath(target);
  if (!existsSync(statePath)) {
    return null;
  }
  return JSON.parse(readFileSync(statePath, 'utf8'));
}

/**
 * Initialize a new harness state file atomically.
 */
export function initState(target, options = {}) {
  const statePath = resolveStatePath(target);
  const projectDir = inferProjectDir(statePath, options);
  const gitHead = options.gitHead !== undefined ? options.gitHead : getGitHead(projectDir);
  const now = new Date().toISOString();

  const state = {
    version: SCHEMA_VERSION,
    sessionId: options.sessionId || randomUUID(),
    gitHead: gitHead ?? null,
    sizing: options.sizing || options.size || null,
    planPath: options.planPath || options.plan || null,
    phase: 'IDLE',
    status: 'active',
    tasks: {},
    gates: {
      review: null,
      qa: null,
      security: null,
    },
    createdAt: now,
    updatedAt: now,
  };

  writeStateAtomic(statePath, state);
  return state;
}

/**
 * Check whether the harness can proceed to targetPhase given current state and gitHead.
 */
export function canProceedToPhase(target, targetPhase, currentGitHead) {
  const normalizedPhase = String(targetPhase || '').toUpperCase();
  if (!PHASES.includes(normalizedPhase)) {
    return { allowed: false, reason: `Unknown phase: ${targetPhase}` };
  }

  const statePath = resolveStatePath(target);
  const state = readState(statePath);
  if (!state) {
    return { allowed: false, reason: 'Harness state not initialized' };
  }

  const isSamePhase = state.phase === normalizedPhase;
  const allowedNext = new Set(TRANSITIONS[state.phase] || []);
  if (state.phase === 'IDLE' && state.sizing === 'S') {
    allowedNext.add('BUILD');
  }

  if (!isSamePhase && !allowedNext.has(normalizedPhase)) {
    return {
      allowed: false,
      reason: `Illegal phase transition: cannot move from ${state.phase} to ${normalizedPhase} (expected ${[...allowedNext].join(', ') || 'none'})`,
    };
  }

  if (normalizedPhase === 'SHIP') {
    const reviewGate = state.gates?.review;
    if (!reviewGate || !APPROVED_VERDICTS.has(reviewGate.verdict)) {
      return { allowed: false, reason: 'Review gate has not been approved' };
    }

    const head =
      currentGitHead !== undefined
        ? currentGitHead
        : getGitHead(inferProjectDir(statePath));
    if (head && reviewGate.gitHead && head !== reviewGate.gitHead) {
      return { allowed: false, reason: 'Review gate is stale (commit mismatch)' };
    }
  }

  if (normalizedPhase === 'COMPLETED') {
    if (state.gates?.qa && BLOCKED_VERDICTS.has(state.gates.qa.verdict)) {
      return { allowed: false, reason: `QA gate is ${state.gates.qa.verdict}` };
    }
    if (state.gates?.security && BLOCKED_VERDICTS.has(state.gates.security.verdict)) {
      return { allowed: false, reason: `Security gate is ${state.gates.security.verdict}` };
    }
  }

  return { allowed: true };
}

/**
 * Transition the harness FSM to targetPhase, rejecting illegal jumps or stale gates.
 */
export function transitionPhase(target, targetPhase, options = {}) {
  const statePath = resolveStatePath(target);
  const normalizedPhase = String(targetPhase || '').toUpperCase();
  const check = canProceedToPhase(statePath, normalizedPhase, options.gitHead);

  if (!check.allowed) {
    throw new Error(check.reason);
  }

  const state = readState(statePath);
  const now = new Date().toISOString();
  state.phase = normalizedPhase;
  state.status = normalizedPhase === 'COMPLETED' ? 'completed' : 'active';
  if (options.gitHead !== undefined) {
    state.gitHead = options.gitHead;
  }
  state.updatedAt = now;

  writeStateAtomic(statePath, state);
  return state;
}

/**
 * Register a subagent task in the harness state for crash/timeout tracking.
 */
export function registerTask(target, taskId, meta = {}) {
  const statePath = resolveStatePath(target);
  const state = readState(statePath);
  if (!state) {
    throw new Error('Harness state not initialized');
  }

  const now = new Date().toISOString();
  const task = {
    id: taskId,
    status: meta.status || 'pending',
    ...meta,
    registeredAt: now,
    updatedAt: now,
  };
  state.tasks[taskId] = task;
  state.updatedAt = now;

  writeStateAtomic(statePath, state);
  return task;
}

/**
 * Update the status and metadata of a registered subagent task.
 */
export function updateTaskStatus(target, taskId, status, detail = {}) {
  const statePath = resolveStatePath(target);
  const state = readState(statePath);
  if (!state) {
    throw new Error('Harness state not initialized');
  }
  const existing = state.tasks[taskId];
  if (!existing) {
    throw new Error(`Unknown task: ${taskId}`);
  }

  const now = new Date().toISOString();
  const extra = typeof detail === 'string' ? { message: detail } : detail || {};
  const updated = {
    ...existing,
    ...extra,
    id: taskId,
    status,
    updatedAt: now,
  };
  state.tasks[taskId] = updated;
  state.updatedAt = now;

  writeStateAtomic(statePath, state);
  return updated;
}

/**
 * Return active tasks whose updatedAt age exceeds timeoutMs.
 */
export function detectStaleTasks(target, timeoutMs = 300000, nowMs = Date.now()) {
  const state = readState(target);
  if (!state || !state.tasks) {
    return [];
  }

  const stale = [];
  for (const task of Object.values(state.tasks)) {
    if (!ACTIVE_TASK_STATUSES.has(task.status)) {
      continue;
    }
    const updatedMs = Date.parse(task.updatedAt);
    if (Number.isNaN(updatedMs)) {
      continue;
    }
    const ageMs = nowMs - updatedMs;
    if (ageMs > timeoutMs) {
      stale.push({ ...task, ageMs });
    }
  }
  return stale;
}

/**
 * Record a gate verdict (review, qa, security) bound to the current gitHead commit SHA.
 */
export function recordGateVerdict(target, gateName, verdict, gitHead) {
  const normalizedGate = String(gateName || '').toLowerCase();
  if (!VALID_GATES.has(normalizedGate)) {
    throw new Error(`Invalid gate name: ${gateName}`);
  }

  const statePath = resolveStatePath(target);
  const state = readState(statePath);
  if (!state) {
    throw new Error('Harness state not initialized');
  }

  const projectDir = inferProjectDir(statePath);
  const resolvedHead =
    gitHead !== undefined ? gitHead : getGitHead(projectDir) || state.gitHead;
  const now = new Date().toISOString();

  const entry = {
    verdict: String(verdict || '').toUpperCase(),
    gitHead: resolvedHead ?? null,
    recordedAt: now,
  };
  state.gates[normalizedGate] = entry;
  state.updatedAt = now;

  writeStateAtomic(statePath, state);
  return entry;
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

function runCli() {
  const { command, flags } = parseCliArgs(process.argv.slice(2));
  const target = {
    statePath: flags.state || flags['state-path'],
    projectDir: flags['project-dir'],
  };

  try {
    switch (command) {
      case 'status': {
        const state = readState(target);
        if (!state) {
          console.log(JSON.stringify({ initialized: false, statePath: resolveStatePath(target) }, null, 2));
          process.exit(0);
        }
        console.log(JSON.stringify(state, null, 2));
        process.exit(0);
      }

      case 'init': {
        const state = initState(target, {
          sizing: flags.size || flags.sizing,
          planPath: flags.plan || flags['plan-path'],
          gitHead: flags['git-head'],
        });
        console.log(JSON.stringify(state, null, 2));
        process.exit(0);
      }

      case 'transition': {
        const state = transitionPhase(target, flags.phase, {
          gitHead: flags['git-head'],
        });
        console.log(JSON.stringify(state, null, 2));
        process.exit(0);
      }

      case 'gate': {
        const entry = recordGateVerdict(
          target,
          flags.name,
          flags.verdict,
          flags['git-head'],
        );
        console.log(JSON.stringify(entry, null, 2));
        process.exit(0);
      }

      case 'check-gate': {
        const result = canProceedToPhase(target, flags.phase, flags['git-head']);
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.allowed ? 0 : 1);
      }

      default: {
        console.error(
          'Usage: node scripts/harness-state.mjs <status|init|transition|gate|check-gate> [options]',
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
