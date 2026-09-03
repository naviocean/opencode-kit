#!/usr/bin/env node

/**
 * AgentShield Security Gate CLI
 *
 * Programmatic security gate for /review and /ship commands.
 * Runs AgentShield or local fallback scan, evaluates against thresholds,
 * formats markdown reports, and exits with standard codes:
 *   0 = PASSED (Grade >= minGrade and no secrets)
 *   1 = BLOCKED (Grade < minGrade or secrets detected)
 *
 * Usage:
 *   node .opencode/scripts/security-gate.mjs [options]
 *   node .opencode/scripts/security-gate.mjs --min-grade=B --output=_workspace/06_security_ship.md
 *   node .opencode/scripts/security-gate.mjs --scope=changed
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const GRADE_WEIGHTS = {
  A: 4,
  B: 3,
  C: 2,
  D: 1,
  F: 0,
};

/**
 * Parse CLI arguments into options object
 */
export function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    minGrade: 'B',
    scope: 'project', // 'project' | 'changed' | 'config'
    failOnSecrets: true,
    json: false,
    output: null,
    mock: null,
    verbose: false,
  };

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg.startsWith('--min-grade=')) {
      options.minGrade = arg.split('=')[1].toUpperCase();
    } else if (arg.startsWith('--scope=')) {
      options.scope = arg.split('=')[1].toLowerCase();
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--verbose') {
      options.verbose = true;
    } else if (arg === '--no-fail-on-secrets') {
      options.failOnSecrets = false;
    } else if (arg === '--fail-on-secrets') {
      options.failOnSecrets = true;
    } else if (arg.startsWith('--output=')) {
      options.output = arg.split('=')[1];
    } else if (arg.startsWith('--mock=')) {
      options.mock = arg.split('=')[1];
    }
  }

  return options;
}

/**
 * Score to Grade mapper
 */
export function scoreToGrade(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

/**
 * Evaluate scan report against thresholds
 */
export function evaluateSecurityReport(report, options = {}) {
  const minGrade = (options.minGrade || 'B').toUpperCase();
  const failOnSecrets = options.failOnSecrets !== false;

  const score = typeof report.score === 'number' ? report.score : 100;
  const grade = (report.grade || scoreToGrade(score)).toUpperCase();
  const findings = Array.isArray(report.findings) ? report.findings : [];

  const gradeWeight = GRADE_WEIGHTS[grade] ?? 0;
  const minWeight = GRADE_WEIGHTS[minGrade] ?? 3;

  const reasons = [];
  let passed = true;

  // 1. Grade threshold check
  if (gradeWeight < minWeight) {
    passed = false;
    reasons.push(`Grade ${grade} is below required minimum Grade ${minGrade}`);
  }

  // 2. Secret leak check
  const secretFindings = findings.filter(f => {
    const type = (f.type || '').toLowerCase();
    const severity = (f.severity || '').toLowerCase();
    const msg = (f.message || '').toLowerCase();
    return (
      type === 'secret' ||
      type === 'credential' ||
      severity === 'critical' ||
      msg.includes('secret') ||
      msg.includes('api key') ||
      msg.includes('token') ||
      msg.includes('password')
    );
  });

  if (failOnSecrets && secretFindings.length > 0) {
    passed = false;
    reasons.push(`Found ${secretFindings.length} secret/credential leak(s)`);
  }

  // Determine final verdict
  let verdict = 'PASSED';
  if (!passed) {
    verdict = 'BLOCKED';
  } else if (findings.length > 0) {
    verdict = 'APPROVED_WITH_NOTES';
  }

  return {
    passed,
    score,
    grade,
    minGrade,
    verdict,
    reasons,
    findings,
    secretFindingsCount: secretFindings.length,
    timestamp: report.timestamp || new Date().toISOString(),
  };
}

/**
 * Format evaluation results to compliant Markdown Report
 */
export function formatSecurityMarkdownReport(evaluation) {
  const {
    passed,
    score,
    grade,
    minGrade,
    verdict,
    reasons,
    findings,
    timestamp,
  } = evaluation;

  const statusBadge = passed ? '✅ **PASSED**' : '🚨 **BLOCKED**';
  const gradeEmoji = grade === 'A' || grade === 'B' ? '🟢' : grade === 'C' ? '🟡' : '🔴';

  let markdown = `# Security Review Report\n\n`;
  markdown += `> **Status**: ${statusBadge}  \n`;
  markdown += `> **Scan Date**: ${timestamp}  \n`;
  markdown += `> **Security Grade**: **${grade}** (${gradeEmoji})  \n`;
  markdown += `> **Target Threshold**: Grade >= ${minGrade || 'B'}  \n`;
  markdown += `> **Overall Verdict**: **${verdict}**  \n\n`;

  markdown += `## 1. Executive Summary\n\n`;
  markdown += `| Metric | Value | Status |\n`;
  markdown += `|---|---|---|\n`;
  markdown += `| **Security Grade** | ${gradeEmoji} **${grade}** | ${passed ? 'Compliant' : 'Non-compliant'} |\n`;
  markdown += `| **Score** | **${score}/100** | ${score >= 80 ? 'Good' : 'Needs attention'} |\n`;
  markdown += `| **Total Findings** | ${findings.length} | ${findings.length === 0 ? 'Clean' : 'Findings detected'} |\n\n`;

  if (reasons.length > 0) {
    markdown += `### Gate Failure Reasons:\n`;
    for (const r of reasons) {
      markdown += `- ❌ ${r}\n`;
    }
    markdown += `\n`;
  }

  markdown += `## 2. Findings Detail\n\n`;
  if (findings.length === 0) {
    markdown += `✅ No security vulnerabilities or secret leaks detected.\n\n`;
  } else {
    markdown += `| Severity | ID / Type | File / Location | Description |\n`;
    markdown += `|---|---|---|---|\n`;
    for (const f of findings) {
      const sev = (f.severity || 'info').toUpperCase();
      const id = f.id || f.type || 'GENERAL';
      const file = f.file || 'N/A';
      const msg = f.message || 'No description';
      markdown += `| ${sev} | ${id} | \`${file}\` | ${msg} |\n`;
    }
    markdown += `\n`;
  }

  markdown += `## 3. Recommended Actions\n\n`;
  if (passed) {
    markdown += `- ✅ Code is cleared for progression to the next deployment phase.\n`;
  } else {
    markdown += `- 🚨 **Action Required**: Resolve all listed blockers (remove secrets, remediate critical findings) and re-run scan.\n`;
  }

  return markdown;
}

/**
 * Execute scan or read mock file
 */
export function runScan(options) {
  if (options.mock) {
    const content = readFileSync(options.mock, 'utf-8');
    return JSON.parse(content);
  }

  // Construct npx ecc-agentshield command
  let cmd = 'npx --yes ecc-agentshield scan --json';
  if (options.scope === 'changed') {
    cmd += ' --changed';
  } else if (options.scope === 'config') {
    cmd += ' --path .opencode/';
  }

  try {
    const raw = execSync(cmd, {
      cwd: ROOT,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 60000,
    });
    return JSON.parse(raw);
  } catch (err) {
    // If output contains JSON even on error exit
    if (err.stdout) {
      try {
        return JSON.parse(err.stdout.toString());
      } catch {
        // Ignore parse error
      }
    }

    // Graceful local regex fallback scanner if ecc-agentshield is offline/unreachable
    return runLocalFallbackScan(options);
  }
}

/**
 * Fallback local regex secret scanner
 */
function runLocalFallbackScan(options) {
  const secretPatterns = [
    { name: 'Stripe Live Key', regex: /sk_live_[0-9a-zA-Z]{24}/ },
    { name: 'OpenAI API Key', regex: /sk-[a-zA-Z0-9]{32,}/ },
    { name: 'Google AI API Key', regex: /AIzaSy[a-zA-Z0-9_-]{33}/ },
    { name: 'GitHub Personal Token', regex: /ghp_[a-zA-Z0-9]{36}/ },
    { name: 'Private Key Block', regex: /-----BEGIN (RSA|EC|PRIVATE) KEY-----[\r\n]+[a-zA-Z0-9+/=\r\n]{32,}/ },
  ];

  const findings = [];
  try {
    const diffCmd = options.scope === 'changed' ? 'git diff --cached --name-only' : 'git ls-files';
    const files = execSync(diffCmd, { cwd: ROOT, encoding: 'utf-8' })
      .split('\n')
      .filter(f => f.trim() && !f.includes('node_modules') && !f.includes('.git/'));

    for (const relPath of files) {
      const fullPath = join(ROOT, relPath);
      if (!existsSync(fullPath)) continue;
      // Skip test mocks or test files
      if (relPath.includes('__tests__') || relPath.includes('.tmp-')) continue;

      try {
        const content = readFileSync(fullPath, 'utf-8');
        for (const p of secretPatterns) {
          if (p.regex.test(content)) {
            findings.push({
              id: 'SECRET_LEAK',
              type: 'secret',
              severity: 'critical',
              file: relPath,
              message: `Potential hardcoded secret detected: ${p.name}`,
            });
          }
        }
      } catch {
        // Binary or unreadable file, skip
      }
    }
  } catch {
    // Git error fallback
  }

  const score = findings.length === 0 ? 100 : Math.max(0, 100 - findings.length * 30);
  return {
    score,
    grade: scoreToGrade(score),
    findings,
    scanner: 'local-fallback',
  };
}

// ──────────────────────────────────────────────
// CLI Entry Point
// ──────────────────────────────────────────────
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const options = parseArgs();

  if (options.help) {
    console.log(`
AgentShield Security Gate CLI

Usage:
  node .opencode/scripts/security-gate.mjs [options]

Options:
  --min-grade=<A|B|C|D|F>   Minimum grade required to pass (default: B)
  --scope=<project|changed|config> Scan scope (default: project)
  --output=<path>           Write markdown report to path
  --json                    Output JSON report to stdout
  --fail-on-secrets         Fail gate on secret detection (default: true)
  --no-fail-on-secrets      Ignore secret leaks in pass/fail decision
  --mock=<file>             Use mock JSON report for testing
  --verbose                 Print verbose output
  -h, --help                Show this help message
`);
    process.exit(0);
  }

  const rawReport = runScan(options);
  const evaluation = evaluateSecurityReport(rawReport, options);

  if (options.output) {
    const md = formatSecurityMarkdownReport(evaluation);
    const outDir = dirname(join(ROOT, options.output));
    if (!existsSync(outDir)) {
      mkdirSync(outDir, { recursive: true });
    }
    writeFileSync(join(ROOT, options.output), md, 'utf-8');
  }

  if (options.json) {
    console.log(JSON.stringify(evaluation, null, 2));
  } else {
    console.log(`\n🛡️ AgentShield Security Gate`);
    console.log(`Score: ${evaluation.score}/100 | Grade: ${evaluation.grade} (Required: >= ${evaluation.minGrade})`);
    console.log(`Verdict: ${evaluation.verdict === 'PASSED' || evaluation.verdict === 'APPROVED_WITH_NOTES' ? '✅ PASSED' : '🚨 BLOCKED'}`);
    if (evaluation.reasons.length > 0) {
      console.log(`\nBlockers:`);
      for (const r of evaluation.reasons) {
        console.log(`  - ❌ ${r}`);
      }
    }
  }

  process.exit(evaluation.passed ? 0 : 1);
}
