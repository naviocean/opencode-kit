#!/usr/bin/env node

/**
 * Agent Skills Audit Test Suite
 *
 * Verifies that:
 * 1. Every agent in .agent-core/agents/ has a valid ## Skills section with parsed skills.
 * 2. Every skill referenced by an agent exists on disk as a directory with a non-empty SKILL.md.
 * 3. Every SKILL.md contains valid YAML frontmatter (name, description).
 * 4. Every agent belongs to an active squad in .agent-core/skill-packs.json.
 * 5. Every skill required by each agent is 100% covered in its squad pack (zero deficit).
 * 6. Every skill referenced by agents resolves properly in .opencode/skills/ and .agents/skills/ without broken symlinks.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, statSync, realpathSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

const CORE_DIR = join(ROOT, '.agent-core');
const AGENTS_DIR = join(CORE_DIR, 'agents');
const SKILLS_DIR = join(CORE_DIR, 'skills');
const PACKS_FILE = join(CORE_DIR, 'skill-packs.json');
const REGISTRY_FILE = join(ROOT, '.opencode', 'agent-registry.json');
const OPENCODE_SKILLS = join(ROOT, '.opencode', 'skills');
const AGENTS_SKILLS = join(ROOT, '.agents', 'skills');

/**
 * Parses skills from an agent's markdown content (table-based).
 */
function parseSkillsFromMd(content) {
  const always = [];
  const conditional = [];
  const seen = new Set();
  const skillsMatch = content.match(/## Skills\n([\s\S]*?)(?=\n## [^#]|\n---|$)/);
  if (!skillsMatch) return { always, conditional };

  const lines = skillsMatch[1].split('\n');
  for (const line of lines) {
    if (!line.includes('|') || !line.includes('`')) continue;
    const nameMatch = line.match(/\|\s*`([^`]+)`\s*\|/);
    if (!nameMatch) continue;

    const skillName = nameMatch[1].trim();
    const isAlways = /\*?\*?Always\*?\*?/i.test(line) && !/not.*Always/i.test(line);

    if (seen.has(skillName)) continue;
    seen.add(skillName);

    if (isAlways) always.push(skillName);
    else conditional.push(skillName);
  }
  return { always, conditional };
}

test('agent-skills-audit: all agents declare valid skills and have zero missing skill files', () => {
  const agentFiles = readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md'));
  assert.ok(agentFiles.length >= 11, `Expected at least 11 agents, got ${agentFiles.length}`);

  let totalSkillChecks = 0;
  const missingSkills = [];

  for (const file of agentFiles) {
    const agentName = file.replace('.md', '');
    const content = readFileSync(join(AGENTS_DIR, file), 'utf-8');
    const { always, conditional } = parseSkillsFromMd(content);
    const allSkills = [...always, ...conditional];

    assert.ok(
      allSkills.length > 0,
      `Agent [${agentName}] must have at least 1 skill in ## Skills section (found 0)`
    );

    for (const skill of allSkills) {
      totalSkillChecks++;
      const sDir = join(SKILLS_DIR, skill);
      if (!existsSync(sDir)) {
        missingSkills.push({ agent: agentName, skill, reason: 'directory not found in .agent-core/skills/' });
        continue;
      }
      const sFile = join(sDir, 'SKILL.md');
      if (!existsSync(sFile)) {
        missingSkills.push({ agent: agentName, skill, reason: 'SKILL.md missing' });
        continue;
      }
      const stat = statSync(sFile);
      if (stat.size < 20) {
        missingSkills.push({ agent: agentName, skill, reason: 'SKILL.md is empty' });
      }
    }
  }

  assert.equal(
    missingSkills.length,
    0,
    `Found ${missingSkills.length} missing skill errors:\n` +
      missingSkills.map(m => ` - Agent [${m.agent}] missing skill [${m.skill}]: ${m.reason}`).join('\n')
  );

  assert.ok(totalSkillChecks >= 150, `Expected at least 150 skill checks, verified ${totalSkillChecks}`);
});

test('agent-skills-audit: all referenced SKILL.md files have valid frontmatter (name & description)', () => {
  const agentFiles = readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md'));
  const checkedSkills = new Set();
  const invalidFrontmatter = [];

  for (const file of agentFiles) {
    const content = readFileSync(join(AGENTS_DIR, file), 'utf-8');
    const { always, conditional } = parseSkillsFromMd(content);
    const allSkills = [...always, ...conditional];

    for (const skill of allSkills) {
      if (checkedSkills.has(skill)) continue;
      checkedSkills.add(skill);

      const sFile = join(SKILLS_DIR, skill, 'SKILL.md');
      if (!existsSync(sFile)) continue;

      const skillContent = readFileSync(sFile, 'utf-8');
      const hasName = /^name:\s*.+$/m.test(skillContent);
      const hasDesc = /^description:\s*.+$/m.test(skillContent);

      if (!hasName || !hasDesc) {
        invalidFrontmatter.push({ skill, hasName, hasDesc });
      }
    }
  }

  assert.equal(
    invalidFrontmatter.length,
    0,
    `Found ${invalidFrontmatter.length} skills with invalid frontmatter:\n` +
      invalidFrontmatter.map(f => ` - Skill [${f.skill}]: hasName=${f.hasName}, hasDesc=${f.hasDesc}`).join('\n')
  );
});

test('agent-skills-audit: skill-packs.json covers 100% of agent skills with zero deficit', () => {
  assert.ok(existsSync(PACKS_FILE), 'skill-packs.json must exist');
  const packsData = JSON.parse(readFileSync(PACKS_FILE, 'utf-8')).packs;

  const agentFiles = readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md'));
  const deficits = [];

  for (const file of agentFiles) {
    const agentName = file.replace('.md', '');
    const content = readFileSync(join(AGENTS_DIR, file), 'utf-8');
    const { always, conditional } = parseSkillsFromMd(content);
    const requiredSkills = [...always, ...conditional];

    // Find pack that owns this agent
    const packEntry = Object.entries(packsData).find(([, p]) => (p.agents || []).includes(agentName));
    assert.ok(packEntry, `Agent [${agentName}] must belong to a pack in skill-packs.json`);

    const [packId, pack] = packEntry;
    const packSkills = new Set(pack.skills || []);

    for (const skill of requiredSkills) {
      if (!packSkills.has(skill)) {
        deficits.push({
          agent: agentName,
          pack: packId,
          skill,
          error: `Skill [${skill}] required by agent [${agentName}] is missing from pack [${packId}]`
        });
      }
    }
  }

  assert.equal(
    deficits.length,
    0,
    `Detected skill pack deficits:\n` + deficits.map(d => ` - ${d.error}`).join('\n')
  );
});

test('agent-skills-audit: skills resolve without dangling symlinks across harnesses', () => {
  if (existsSync(OPENCODE_SKILLS)) {
    const opencodeEntries = readdirSync(OPENCODE_SKILLS);
    assert.ok(opencodeEntries.length >= 100, '.opencode/skills must have entries');
    for (const entry of opencodeEntries) {
      const real = realpathSync(join(OPENCODE_SKILLS, entry));
      assert.ok(existsSync(real), `.opencode/skills/${entry} must not be a broken symlink`);
    }
  }

  if (existsSync(AGENTS_SKILLS)) {
    const agentsEntries = readdirSync(AGENTS_SKILLS);
    assert.ok(agentsEntries.length >= 100, '.agents/skills must have entries');
    for (const entry of agentsEntries) {
      const real = realpathSync(join(AGENTS_SKILLS, entry));
      assert.ok(existsSync(real), `.agents/skills/${entry} must not be a broken symlink`);
    }
  }
});
