#!/usr/bin/env node

/**
 * Tests for GitNexus Contract Alignment across Agents and Commands
 *
 * Ensures all agent instructions and commands follow the valid GitNexus MCP schema:
 * 1. gitnexus_query MUST use { search_query: ..., repo: ... }, NOT { query: ... }
 * 2. gitnexus_impact, gitnexus_context, gitnexus_detect_changes MUST require repo parameter.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const AGENTS_DIR = join(ROOT, '.agent-core', 'agents');
const COMMANDS_DIR = join(ROOT, '.agent-core', 'commands');

test('gitnexus contract: no agent uses buggy gitnexus_query({query}) pattern', () => {
  const agentFiles = readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md'));
  const violatingAgents = [];

  for (const file of agentFiles) {
    const content = readFileSync(join(AGENTS_DIR, file), 'utf-8');
    if (/gitnexus_query\(\{[^}]*(\bquery\b)[^}]*\}\)/i.test(content) && !content.includes('search_query')) {
      violatingAgents.push(file);
    }
  }

  assert.deepEqual(
    violatingAgents,
    [],
    `Agents still using {query} instead of {search_query, repo}: ${violatingAgents.join(', ')}`
  );
});

test('gitnexus contract: all agents with GitNexus sections specify search_query and repo', () => {
  const agentFiles = readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md'));
  const missingContract = [];

  for (const file of agentFiles) {
    const content = readFileSync(join(AGENTS_DIR, file), 'utf-8');
    if (content.includes('gitnexus_query')) {
      const hasSearchQuery = content.includes('search_query');
      const mentionsRepoParam = /repo[:\s]/i.test(content);
      if (!hasSearchQuery || !mentionsRepoParam) {
        missingContract.push(file);
      }
    }
  }

  assert.deepEqual(
    missingContract,
    [],
    `Agents missing search_query or repo contract: ${missingContract.join(', ')}`
  );
});

test('gitnexus contract: commands enforce repo parameter for GitNexus calls', () => {
  const commandFiles = readdirSync(COMMANDS_DIR).filter(f => f.endsWith('.md'));
  const violatingCommands = [];

  for (const file of commandFiles) {
    const content = readFileSync(join(COMMANDS_DIR, file), 'utf-8');
    if (content.includes('gitnexus_') && !/repo[:\s]/i.test(content)) {
      violatingCommands.push(file);
    }
  }

  assert.deepEqual(
    violatingCommands,
    [],
    `Commands with GitNexus calls missing repo parameter instruction: ${violatingCommands.join(', ')}`
  );
});
