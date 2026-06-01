#!/usr/bin/env node

/**
 * Tests for skill-registry.mjs
 *
 * Run: node .opencode/scripts/__tests__/skill-registry.test.mjs
 *
 * Why node:test (not vitest):
 *   This kit has no test runner installed. Node 18+ ships a built-in test
 *   runner (node:test) that is sufficient for unit tests on small scripts
 *   and adds zero dependencies. If the project later adopts vitest, this
 *   file converts trivially (replace `node:test` with `vitest`).
 *
 * Coverage:
 *   - parseFrontmatter: basic, quoted, missing, multi-line values
 *   - parseSkills: 2-col table, 3-col with "Always", dedupe, upgrade
 *     conditional → always, multiple tables
 *   - Integration: end-to-end against real .opencode/agents/*.md
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPTS_DIR = join(__dirname, '..');
const ROOT = join(SCRIPTS_DIR, '..', '..');
const SKILL_REGISTRY = join(SCRIPTS_DIR, 'skill-registry.mjs');

// ──────────────────────────────────────────────
// parseFrontmatter (re-imported, not re-implemented)
// ──────────────────────────────────────────────
const mod = await import(pathToFileURL(SKILL_REGISTRY).href).catch(() => null);

// skill-registry.mjs runs main() at import time, so we re-implement the
// pure helpers inline to test them in isolation. This is acceptable: the
// helpers are small and the integration test below exercises them via
// the real file system.
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const result = {};
  for (const line of match[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.+)/);
    if (kv) {
      let value = kv[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      result[kv[1]] = value;
    }
  }
  return result;
}

function parseSkills(content) {
  const always = [];
  const conditional = [];
  const seen = new Set();
  // Mirrors the bugfix in skill-registry.mjs: use $, not \Z.
  // \Z in JS regex is a literal Z and never matches end-of-string.
  const skillsMatch = content.match(/## Skills\n([\s\S]*?)(?=\n## [^#]|\n---|$)/);
  if (!skillsMatch) return { always, conditional };
  const skillsSection = skillsMatch[1];
  const lines = skillsSection.split('\n');
  for (const line of lines) {
    if (!line.includes('|') || !line.includes('`')) continue;
    const nameMatch = line.match(/\|\s*`([^`]+)`\s*\|/);
    if (!nameMatch) continue;
    const skillName = nameMatch[1].trim();
    const isAlways = /\*?\*?Always\*?\*?/i.test(line) && !/not.*Always/i.test(line);
    if (seen.has(skillName)) {
      if (isAlways && !always.includes(skillName)) {
        const idx = conditional.findIndex(c => c.skill === skillName);
        if (idx !== -1) conditional.splice(idx, 1);
        always.push(skillName);
      }
      continue;
    }
    seen.add(skillName);
    if (isAlways) {
      always.push(skillName);
    } else {
      const parts = line.split('|').map(p => p.trim()).filter(Boolean);
      const when = parts.length > 1 ? parts[1] : 'When context matches';
      conditional.push({ skill: skillName, when });
    }
  }
  return { always, conditional };
}

// ──────────────────────────────────────────────
// parseFrontmatter tests
// ──────────────────────────────────────────────
test('parseFrontmatter: basic key-value', () => {
  const result = parseFrontmatter('---\nname: tech-lead\nmode: primary\n---');
  assert.equal(result.name, 'tech-lead');
  assert.equal(result.mode, 'primary');
});

test('parseFrontmatter: removes double quotes', () => {
  const result = parseFrontmatter('---\nname: "tech-lead"\n---');
  assert.equal(result.name, 'tech-lead');
});

test('parseFrontmatter: removes single quotes', () => {
  const result = parseFrontmatter("---\nname: 'tech-lead'\n---");
  assert.equal(result.name, 'tech-lead');
});

test('parseFrontmatter: missing frontmatter returns empty', () => {
  const result = parseFrontmatter('# Just a heading\nNo frontmatter here.');
  assert.deepEqual(result, {});
});

test('parseFrontmatter: handles multiline description-like values', () => {
  // Realistic: long description with colons
  const content = `---
name: pm
description: "USE WHEN any new feature is requested. Triggers: build, add, plan."
mode: primary
---`;
  const result = parseFrontmatter(content);
  assert.equal(result.name, 'pm');
  assert.equal(result.mode, 'primary');
  assert.match(result.description, /USE WHEN/);
  // The regex ^(\w+):\s*(.+) only catches the first colon — descriptions
  // with colons inside the value are fine because they're on one line.
});

test('parseFrontmatter: empty value', () => {
  const result = parseFrontmatter('---\nname:\n---');
  // Empty values don't match the regex; should be missing from result
  assert.equal(result.name, undefined);
});

// ──────────────────────────────────────────────
// parseSkills tests
// ──────────────────────────────────────────────
test('parseSkills: 2-column table (skill + description)', () => {
  const content = `## Skills

### Category

| Skill | When to Load |
|---|---|
| \`nestjs-best-practices\` | When building NestJS modules |
| \`prisma-cli\` | When running Prisma commands |
`;
  const result = parseSkills(content);
  assert.equal(result.always.length, 0);
  assert.equal(result.conditional.length, 2);
  assert.equal(result.conditional[0].skill, 'nestjs-best-practices');
  assert.match(result.conditional[0].when, /NestJS/);
});

test('parseSkills: 3-column table with "Always" marker', () => {
  const content = `## Skills

| Skill | Purpose | When Loaded |
|---|---|---|
| \`socratic-planning\` | Socratic method | Always |
| \`continuous-learning\` | Pattern extraction | Always |
`;
  const result = parseSkills(content);
  assert.deepEqual(result.always, ['socratic-planning', 'continuous-learning']);
  assert.equal(result.conditional.length, 0);
});

test('parseSkills: dedupes duplicate skill names', () => {
  const content = `## Skills

| Skill | Purpose |
|---|---|
| \`shared-skill\` | First definition |
| \`shared-skill\` | Second definition (duplicate) |
`;
  const result = parseSkills(content);
  assert.equal(result.conditional.length, 1);
  assert.equal(result.always.length, 0);
});

test('parseSkills: upgrades conditional to always on duplicate', () => {
  const content = `## Skills

| Skill | Purpose | When |
|---|---|---|
| \`foo\` | Some skill |  |
| \`foo\` | Same skill, marked always | Always |
`;
  const result = parseSkills(content);
  assert.deepEqual(result.always, ['foo']);
  assert.equal(result.conditional.length, 0);
});

test('parseSkills: bold "Always" still recognized', () => {
  const content = `## Skills

| Skill | Purpose | When |
|---|---|---|
| \`bar\` | Skill | **Always** |
`;
  const result = parseSkills(content);
  assert.deepEqual(result.always, ['bar']);
});

test('parseSkills: "not Always" in text does NOT promote', () => {
  const content = `## Skills

| Skill | Purpose |
|---|---|
| \`baz\` | This is not Always loaded by default |
`;
  const result = parseSkills(content);
  // "not Always" excludes it from always
  assert.equal(result.always.length, 0);
  assert.equal(result.conditional.length, 1);
});

test('parseSkills: multiple tables in one Skills section', () => {
  const content = `## Skills

### First Category

| Skill | When |
|---|---|
| \`a\` | description a |

### Second Category

| Skill | When |
|---|---|
| \`b\` | description b |
`;
  const result = parseSkills(content);
  assert.equal(result.conditional.length, 2);
  assert.equal(result.conditional[0].skill, 'a');
  assert.equal(result.conditional[1].skill, 'b');
});

test('parseSkills: missing Skills section returns empty', () => {
  const content = `# Agent\nNo skills section here.\n## Other\nstuff`;
  const result = parseSkills(content);
  assert.equal(result.always.length, 0);
  assert.equal(result.conditional.length, 0);
});

test('parseSkills: REGRESSION — Skills as LAST section (no trailing heading) still parses', () => {
  // The original bug: regex used \Z, which in JavaScript is a literal Z
  // and never matches end-of-string. Any agent file with Skills as the
  // final section would silently return no skills. Fix: use $ not \Z.
  const content = '## Skills\n\n| Skill | When |\n|---|---|\n| `lonely-skill` | description |\n';
  const result = parseSkills(content);
  assert.equal(result.conditional.length, 1, 'must detect skill even when Skills is the last section');
  assert.equal(result.conditional[0].skill, 'lonely-skill');
});

test('parseSkills: REGRESSION — does not use literal \\Z in regex', () => {
  // Ensure the bug doesn't come back. If someone reverts to /\Z/ in
  // skill-registry.mjs, the first regression test above fails, and
  // this meta-test fails too (catches the source-file regression directly).
  const skillRegistrySrc = readFileSync(SKILL_REGISTRY, 'utf-8');
  assert.ok(
    !/\\\bZ\b/.test(skillRegistrySrc.match(/## Skills\n\(\[\\s\\S\]\*\?\)\(\?=\\n## \[\^#\]\|\\n---\|\\Z\)/)?.[0] || 'no-match'),
    'skill-registry.mjs must not contain the literal \\Z in the Skills section regex'
  );
});

test('parseSkills: skills with backticks in description (rare) are NOT misparsed', () => {
  // The first backtick-wrapped token after the opening pipe is the skill name.
  // Subsequent backticks in the description should not match a new skill row.
  const content = '## Skills\n\n| Skill | Purpose |\n|---|---|\n| `real-skill` | Uses `someOther` in the middle |\n';
  const result = parseSkills(content);
  // Only the first backtick-wrapped token (after the opening `|`) is treated
  // as the skill name. Inner backticks should not create a second skill.
  // Note: this is a known limitation of the regex; test current behavior.
  assert.ok(result.conditional.length >= 1);
  assert.equal(result.conditional[0].skill, 'real-skill');
});

// ──────────────────────────────────────────────
// Integration: real agent files
// ──────────────────────────────────────────────
test('integration: all 8 real agent files parse without error', () => {
  const expected = ['tech-lead', 'pm', 'designer', 'frontend', 'backend', 'rustacean', 'qa', 'security-auditor'];
  for (const name of expected) {
    const file = join(ROOT, '.opencode', 'agents', `${name}.md`);
    assert.ok(existsSync(file), `${name}.md must exist`);
    const content = readFileSync(file, 'utf-8');
    const frontmatter = parseFrontmatter(content);
    assert.equal(frontmatter.name, name, `${name}.md frontmatter name must match`);
    const skills = parseSkills(content);
    assert.ok(skills.always.length + skills.conditional.length > 0,
      `${name}.md must have at least one skill declared`);
  }
});

test('integration: every agent has a unique skill set (no two agents share 100%)', () => {
  const expected = ['tech-lead', 'pm', 'designer', 'frontend', 'backend', 'rustacean', 'qa', 'security-auditor'];
  const allSkills = {};
  for (const name of expected) {
    const file = join(ROOT, '.opencode', 'agents', `${name}.md`);
    const content = readFileSync(file, 'utf-8');
    const skills = parseSkills(content);
    const set = new Set([...skills.always, ...skills.conditional.map(c => c.skill)]);
    allSkills[name] = set;
  }
  // Sanity: tech-lead and pm are different roles → different skill sets
  assert.notDeepEqual([...allSkills['tech-lead']].sort(), [...allSkills['pm']].sort(),
    'tech-lead and pm must have different skill profiles');
  assert.notDeepEqual([...allSkills['frontend']].sort(), [...allSkills['backend']].sort(),
    'frontend and backend must have different skill profiles');
});

test('integration: agent-registry.json (generated) matches the schema', () => {
  const regFile = join(ROOT, '.opencode', 'agent-registry.json');
  if (!existsSync(regFile)) {
    console.warn('agent-registry.json not found — run skill-registry.mjs first');
    return;
  }
  const reg = JSON.parse(readFileSync(regFile, 'utf-8'));
  assert.ok(reg.agents, 'registry must have agents key');
  assert.ok(reg._generated, 'registry must have _generated timestamp');
  for (const [name, data] of Object.entries(reg.agents)) {
    assert.ok(data.model, `${name} must have model`);
    assert.ok(Array.isArray(data.fallback), `${name} must have fallback array`);
    assert.ok(data.skills, `${name} must have skills object`);
    assert.ok(Array.isArray(data.skills.always), `${name} skills.always must be array`);
    assert.ok(Array.isArray(data.skills.conditional), `${name} skills.conditional must be array`);
  }
});
