#!/usr/bin/env node

/**
 * AgentShield PreToolUse Runtime Guard Hook
 *
 * Intercepts tool calls before execution to protect against:
 * 1. Modifications to sensitive credential files (.env, private keys)
 * 2. High-risk destructive shell commands (rm -rf /, curl | bash, secret dumps)
 *
 * Returns { blocked: boolean, reason?: string }
 */

import { basename } from 'path';

// Files that must never be created/modified by agents
const BLOCKED_FILE_PATTERNS = [
  /^\.env(\.[a-zA-Z0-9_-]+)?$/,     // .env, .env.production, .env.local
  /^id_(rsa|dsa|ecdsa|ed25519)/,     // SSH private keys
  /\.pem$/,                          // Certificates / private keys
  /\.key$/,                          // Private keys
  /^credentials\.json$/,             // Cloud credentials
  /^service-account.*\.json$/,       // GCP service accounts
];

// Whitelist for harmless sample/template files
const SAFE_FILE_WHITELIST = [
  /\.env\.(example|sample|template|dist)$/i,
  /\.example$/i,
  /\.template$/i,
];

// Dangerous shell command patterns
const DANGEROUS_COMMAND_PATTERNS = [
  {
    regex: /(curl|wget)\s+[^|]+\|\s*(ba|z)?sh/i,
    reason: 'Piped web execution (curl | bash) is blocked by AgentShield Runtime Guard',
  },
  {
    regex: /rm\s+(-[a-zA-Z]*r[a-zA-Z]*f[a-zA-Z]*|-[a-zA-Z]*f[a-zA-Z]*r[a-zA-Z]*)\s+(\/|~|\.\.|\*)/,
    reason: 'Destructive root/home directory deletion is blocked by AgentShield Runtime Guard',
  },
  {
    regex: /chmod\s+(-R\s+)?777/,
    reason: 'Global read/write/execute permission (chmod 777) is blocked by AgentShield Runtime Guard',
  },
  {
    regex: /(cat|head|tail|less|more|bat)\s+.*\.env(\s|$)/,
    reason: 'Direct credential access (.env dump) is blocked by AgentShield Runtime Guard',
  },
];

/**
 * Check if a file path points to a sensitive credential file
 */
export function isSensitiveFile(filePath) {
  if (!filePath || typeof filePath !== 'string') return false;

  const fileName = basename(filePath.trim());

  // Check if explicitly allowed (e.g. .env.example)
  for (const white of SAFE_FILE_WHITELIST) {
    if (white.test(fileName)) return false;
  }

  // Check blocked patterns
  for (const pattern of BLOCKED_FILE_PATTERNS) {
    if (pattern.test(fileName)) return true;
  }

  return false;
}

/**
 * Check a single tool invocation for security policy compliance
 */
export function checkToolInvocation(toolName, toolArgs = {}) {
  const name = (toolName || '').toLowerCase();

  // 1. File modification tools
  const isFileWriteTool =
    name.includes('write') ||
    name.includes('replace') ||
    name.includes('edit') ||
    name.includes('append') ||
    name.includes('create_file');

  if (isFileWriteTool) {
    const target =
      toolArgs.TargetFile ||
      toolArgs.targetFile ||
      toolArgs.path ||
      toolArgs.filePath ||
      toolArgs.file;

    if (isSensitiveFile(target)) {
      return {
        blocked: true,
        reason: `Modifying credential file "${basename(target)}" is forbidden by AgentShield Runtime Guard. Edit .env.example instead.`,
      };
    }
  }

  // 2. Shell execution tools
  const isShellTool =
    name.includes('command') ||
    name.includes('bash') ||
    name.includes('shell') ||
    name.includes('exec');

  if (isShellTool) {
    const cmd =
      toolArgs.CommandLine ||
      toolArgs.commandLine ||
      toolArgs.command ||
      toolArgs.cmd;

    if (typeof cmd === 'string') {
      for (const dangerous of DANGEROUS_COMMAND_PATTERNS) {
        if (dangerous.regex.test(cmd)) {
          return {
            blocked: true,
            reason: dangerous.reason,
          };
        }
      }
    }
  }

  return { blocked: false };
}

// ──────────────────────────────────────────────
// CLI Hook Entry Point (if invoked via hook pipe)
// ──────────────────────────────────────────────
if (process.argv[1] && process.argv[1].endsWith('pre-tool-guard.mjs')) {
  // Read JSON payload from stdin if available
  let inputData = '';
  process.stdin.setEncoding('utf-8');

  process.stdin.on('data', chunk => {
    inputData += chunk;
  });

  process.stdin.on('end', () => {
    if (!inputData.trim()) {
      process.exit(0);
    }

    try {
      const payload = JSON.parse(inputData);
      const result = checkToolInvocation(payload.toolName || payload.tool, payload.args || payload.parameters);

      if (result.blocked) {
        console.error(`🚨 AgentShield Runtime Guard Block: ${result.reason}`);
        process.exit(1);
      }
      process.exit(0);
    } catch {
      process.exit(0);
    }
  });
}
