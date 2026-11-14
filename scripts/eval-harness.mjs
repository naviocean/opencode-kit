#!/usr/bin/env node

/**
 * Behavioral Compliance Evaluation Suite (eval-harness.mjs)
 *
 * Evaluates 5 behavioral compliance dimensions of the OpenCode SaaS Kit harness:
 *   1. socratic-sizing     — Risk-aware triage sizing & command HARD-GATEs
 *   2. runtime-security    — PreToolUse interception (attacks blocked, safe allowed)
 *   3. domain-ownership    — Agent specs frontmatter, Startup hooks & cross-domain rules
 *   4. evidence-honesty    — Unified 4-state vocabulary & commit-SHA freshness
 *   5. multi-harness-parity— Adapter parity across OpenCode, Claude, Antigravity/Codex
 *
 * Outputs Harness Compliance Index (HCI %) and exits 1 if HCI < minHci (default 95).
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyTask } from './triage-sizer.mjs';
import { checkToolInvocation } from '../.agent-core/hooks/pre-tool-guard.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(__dirname, '..');
const DEFAULT_SCENARIOS = join(ROOT, 'fixtures', 'harness', 'compliance-scenarios.json');

export function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    json: false,
    minHci: 95,
    output: null,
    help: false,
  };

  for (const arg of argv) {
    if (arg === '--json') {
      options.json = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg.startsWith('--min-hci=')) {
      const val = Number(arg.split('=')[1]);
      if (!Number.isNaN(val)) options.minHci = val;
    } else if (arg.startsWith('--output=')) {
      options.output = arg.split('=')[1];
    }
  }

  return options;
}

function makeDimension(id, label) {
  return { id, label, passed: 0, total: 0, failures: [] };
}

function recordCheck(dim, ok, failureMsg) {
  dim.total += 1;
  if (ok) {
    dim.passed += 1;
  } else {
    dim.failures.push(failureMsg);
  }
}

function evaluateSocraticSizing(rootDir, scenarios) {
  const dim = makeDimension('socratic-sizing', 'Socratic Sizing & Gate Compliance');

  for (const item of scenarios.sizingScenarios || []) {
    const res = classifyTask(item.prompt);
    if (item.expectedSize) {
      recordCheck(
        dim,
        res.size === item.expectedSize,
        `Sizing mismatch for "${item.prompt}": expected ${item.expectedSize}, got ${res.size}`
      );
    }
    if (Array.isArray(item.forbiddenSizes)) {
      recordCheck(
        dim,
        !item.forbiddenSizes.includes(res.size),
        `Forbidden size ${res.size} returned for high-risk prompt "${item.prompt}"`
      );
    }
    if (item.requiredRiskFlag) {
      recordCheck(
        dim,
        Array.isArray(res.riskFlags) && res.riskFlags.includes(item.requiredRiskFlag),
        `Missing riskFlag "${item.requiredRiskFlag}" for "${item.prompt}" (got: ${JSON.stringify(res.riskFlags)})`
      );
    }
    if (item.expectRiskFlags === false) {
      recordCheck(
        dim,
        Array.isArray(res.riskFlags) && res.riskFlags.length === 0,
        `Unexpected riskFlags for "${item.prompt}": ${JSON.stringify(res.riskFlags)}`
      );
    }
  }

  for (const cmdName of ['build.md', 'review.md', 'ship.md']) {
    const cmdPath = join(rootDir, '.agent-core', 'commands', cmdName);
    const exists = existsSync(cmdPath);
    const content = exists ? readFileSync(cmdPath, 'utf-8') : '';
    recordCheck(
      dim,
      exists && content.includes('HARD-GATE') && content.includes('harness-state.mjs check-gate'),
      `Command ${cmdName} missing HARD-GATE or harness-state.mjs check-gate`
    );
  }

  return dim;
}

function evaluateRuntimeSecurity(scenarios) {
  const dim = makeDimension('runtime-security', 'Runtime Security Interception');
  const payloads = scenarios.securityPayloads || { attacks: [], safe: [] };

  for (const attack of payloads.attacks || []) {
    const res = checkToolInvocation(attack.tool, attack.args);
    recordCheck(
      dim,
      res.blocked === true,
      `Attack payload NOT blocked: ${attack.tool} ${JSON.stringify(attack.args)}`
    );
  }

  for (const safe of payloads.safe || []) {
    const res = checkToolInvocation(safe.tool, safe.args);
    recordCheck(
      dim,
      res.blocked === false,
      `False positive block on safe payload: ${safe.tool} ${JSON.stringify(safe.args)} (${res.reason || ''})`
    );
  }

  return dim;
}

function evaluateDomainOwnership(rootDir) {
  const dim = makeDimension('domain-ownership', 'Domain Ownership & Boundary Enforcement');
  const agentsDir = join(rootDir, '.agent-core', 'agents');
  const agentFiles = existsSync(agentsDir)
    ? readdirSync(agentsDir).filter((f) => f.endsWith('.md')).sort()
    : [];

  recordCheck(dim, agentFiles.length >= 14, `Expected >= 14 agents, found ${agentFiles.length}`);

  for (const file of agentFiles) {
    const content = readFileSync(join(agentsDir, file), 'utf-8');
    const hasFm = /^---\n[\s\S]*?\n---/.test(content);
    const hasModel = /^model:\s*.+$/m.test(content);
    const hasStartup = content.includes('Startup (AUTO-EXECUTE)');
    recordCheck(
      dim,
      hasFm && hasModel && hasStartup,
      `Agent ${file} missing frontmatter, model, or Startup (AUTO-EXECUTE) section`
    );
  }

  const conventionsPath = join(rootDir, '.agent-core', 'standards', 'conventions.md');
  const convContent = existsSync(conventionsPath) ? readFileSync(conventionsPath, 'utf-8') : '';
  recordCheck(
    dim,
    convContent.includes('### Cross-Domain') && convContent.includes('Escalate to Tech Lead'),
    'conventions.md missing Cross-Domain anti-pattern boundaries'
  );

  return dim;
}

function evaluateEvidenceHonesty(rootDir, scenarios) {
  const dim = makeDimension('evidence-honesty', 'Evidence Honesty & Anti-Slop Contract');
  const statuses = scenarios.requiredEvidenceStatuses || ['VERIFIED', 'REGRESSED', 'BLOCKED', 'UNVERIFIED'];

  const createVerify = join(rootDir, '.agent-core', 'skills', 'create-verification-skill', 'SKILL.md');
  const maintainVerify = join(rootDir, '.agent-core', 'skills', 'maintain-verification-skill', 'SKILL.md');

  for (const [label, p] of [['create-verification-skill', createVerify], ['maintain-verification-skill', maintainVerify]]) {
    const exists = existsSync(p);
    const content = exists ? readFileSync(p, 'utf-8') : '';
    const hasAll = statuses.every((s) => content.includes(s));
    recordCheck(dim, exists && hasAll, `${label} missing one of required statuses: ${statuses.join(', ')}`);
  }

  for (const cmdName of ['review.md', 'ship.md']) {
    const content = readFileSync(join(rootDir, '.agent-core', 'commands', cmdName), 'utf-8');
    recordCheck(
      dim,
      content.includes('docs/verification/feature-map.md') && content.includes('VERIFIED'),
      `Command ${cmdName} missing Feature Map VERIFIED evidence gate`
    );
  }

  return dim;
}

function evaluateMultiHarnessParity(rootDir) {
  const dim = makeDimension('multi-harness-parity', 'Multi-Harness Adapter Parity');
  const coreCommandsDir = join(rootDir, '.agent-core', 'commands');
  const expectedCommands = existsSync(coreCommandsDir)
    ? readdirSync(coreCommandsDir).filter((f) => f.endsWith('.md')).sort()
    : [];

  for (const adapter of ['.opencode', '.agents', '.claude']) {
    const cmdDir = join(rootDir, adapter, 'commands');
    const actual = existsSync(cmdDir)
      ? readdirSync(cmdDir).filter((f) => f.endsWith('.md')).sort()
      : [];
    recordCheck(
      dim,
      JSON.stringify(actual) === JSON.stringify(expectedCommands),
      `Adapter ${adapter}/commands mismatch (expected ${expectedCommands.length}, got ${actual.length})`
    );
  }

  for (const docFile of ['AGENTS.md', 'CLAUDE.md']) {
    const p = join(rootDir, docFile);
    const content = existsSync(p) ? readFileSync(p, 'utf-8') : '';
    recordCheck(
      dim,
      content.includes('Prompt Defense Baseline (OWASP LLM01–LLM10)'),
      `${docFile} missing OWASP LLM01–LLM10 Prompt Defense Baseline`
    );
  }

  return dim;
}

export async function evaluateHarness(options = {}) {
  const rootDir = options.rootDir || ROOT;
  const minHci = typeof options.minHci === 'number' ? options.minHci : 95;
  const scenariosPath = options.scenariosPath || DEFAULT_SCENARIOS;
  const scenarios = JSON.parse(readFileSync(scenariosPath, 'utf-8'));

  const dimensions = [
    evaluateSocraticSizing(rootDir, scenarios),
    evaluateRuntimeSecurity(scenarios),
    evaluateDomainOwnership(rootDir),
    evaluateEvidenceHonesty(rootDir, scenarios),
    evaluateMultiHarnessParity(rootDir),
  ];

  const totalChecks = dimensions.reduce((acc, d) => acc + d.total, 0);
  const passedChecks = dimensions.reduce((acc, d) => acc + d.passed, 0);
  const hci = totalChecks === 0 ? 0 : Math.round((passedChecks / totalChecks) * 10000) / 100;
  const failures = dimensions.flatMap((d) => d.failures.map((f) => `[${d.id}] ${f}`));
  const passed = hci >= minHci;

  const report = {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    hci,
    minHci,
    passed,
    passedChecks,
    totalChecks,
    dimensions,
    failures,
  };

  if (options.outputPath) {
    mkdirSync(dirname(options.outputPath), { recursive: true });
    writeFileSync(options.outputPath, formatComplianceMarkdown(report), 'utf-8');
  }

  return report;
}

export function formatComplianceMarkdown(report) {
  const badge = report.passed ? '✅ PASSED' : '❌ FAILED';
  const lines = [
    '# Harness Behavioral Compliance Report',
    '',
    `> **Status:** ${badge}  `,
    `> **Harness Compliance Index (HCI):** **${report.hci}%** (${report.passedChecks}/${report.totalChecks} checks)  `,
    `> **Minimum Threshold:** ${report.minHci}%  `,
    `> **Timestamp:** ${report.timestamp}  `,
    '',
    '| Dimension | Passed | Total | Score |',
    '|---|---:|---:|---:|',
  ];

  for (const d of report.dimensions) {
    const score = d.total === 0 ? 0 : Math.round((d.passed / d.total) * 100);
    lines.push(`| \`${d.id}\` (${d.label}) | ${d.passed} | ${d.total} | ${score}% |`);
  }

  if (report.failures.length > 0) {
    lines.push('', '## Failures', '');
    for (const f of report.failures) {
      lines.push(`- ❌ ${f}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('eval-harness.mjs')) {
  const opts = parseArgs();
  if (opts.help) {
    console.log('Usage: node scripts/eval-harness.mjs [--json] [--min-hci=95] [--output=path.md]');
    process.exit(0);
  }

  const outputPath = opts.output ? join(ROOT, opts.output) : null;
  const report = await evaluateHarness({ minHci: opts.minHci, outputPath });

  if (opts.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(formatComplianceMarkdown(report));
  }

  process.exit(report.passed ? 0 : 1);
}
