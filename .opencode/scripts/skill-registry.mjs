#!/usr/bin/env node

/**
 * Skill Registry Generator
 * 
 * Quét tất cả .opencode/agents/*.md files, parse Skills section,
 * kết hợp với agent-models.json, xuất ra agent-registry.json.
 * 
 * Usage: node .opencode/scripts/skill-registry.mjs
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const AGENTS_DIR = join(ROOT, '.opencode', 'agents');
const MODELS_FILE = join(ROOT, '.opencode', 'agent-models.json');
const OUTPUT_FILE = join(ROOT, '.opencode', 'agent-registry.json');

// ──────────────────────────────────────────────
// Parse YAML frontmatter
// ──────────────────────────────────────────────
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  
  const result = {};
  for (const line of match[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.+)/);
    if (kv) {
      let value = kv[2].trim();
      // Remove quotes
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      result[kv[1]] = value;
    }
  }
  return result;
}

// ──────────────────────────────────────────────
// Parse Skills section from agent MD
// ──────────────────────────────────────────────
function parseSkills(content) {
  const always = [];
  const conditional = [];
  const seen = new Set(); // dedupe
  
  // Find ## Skills section. The lookahead matches the next top-level
  // heading (## Heading, not ### subsection) or end of file.
  // IMPORTANT: use $, not \Z — in JavaScript regex, \Z is treated as a
  // literal Z and never matches end-of-string, so the section would
  // silently fail to parse if Skills is the last heading in the file.
  const skillsMatch = content.match(/## Skills\n([\s\S]*?)(?=\n## [^#]|\n---|$)/);
  if (!skillsMatch) return { always, conditional };
  
  const skillsSection = skillsMatch[1];
  
  // Extract full table rows that contain backtick skill names
  // Supports 2-col (| `skill` | desc |) and 3-col (| `skill` | desc | Always |) tables
  const lines = skillsSection.split('\n');
  
  for (const line of lines) {
    // Must be a table row with a backtick-wrapped skill name
    if (!line.includes('|') || !line.includes('`')) continue;
    
    const nameMatch = line.match(/\|\s*`([^`]+)`\s*\|/);
    if (!nameMatch) continue;
    
    const skillName = nameMatch[1].trim();
    
    // Check if "Always" appears anywhere in the FULL line
    const isAlways = /\*?\*?Always\*?\*?/i.test(line) && !/not.*Always/i.test(line);
    
    // Dedupe: allow upgrade from conditional → always, skip if already always
    if (seen.has(skillName)) {
      if (isAlways && !always.includes(skillName)) {
        // Upgrade: remove from conditional, add to always
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
      // Extract description: everything between first and last pipe, after skill name
      const parts = line.split('|').map(p => p.trim()).filter(Boolean);
      // parts[0] = skill name (with backticks), parts[1] = description
      const when = parts.length > 1 ? parts[1] : 'When context matches';
      conditional.push({ skill: skillName, when });
    }
  }
  
  return { always, conditional };
}

// ──────────────────────────────────────────────
// Load agent models config
// ──────────────────────────────────────────────
function loadModels() {
  try {
    return JSON.parse(readFileSync(MODELS_FILE, 'utf-8'));
  } catch {
    console.warn(`⚠ ${MODELS_FILE} not found, using defaults`);
    return { default_fallback: [], agents: {} };
  }
}

// ──────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────
function main() {
  const models = loadModels();
  const registry = {};
  
  // Read all agent MD files
  const agentFiles = readdirSync(AGENTS_DIR)
    .filter(f => f.endsWith('.md'))
    .sort();
  
  for (const file of agentFiles) {
    const content = readFileSync(join(AGENTS_DIR, file), 'utf-8');
    const frontmatter = parseFrontmatter(content);
    const name = frontmatter.name || file.replace('.md', '');
    const description = frontmatter.description || '';
    const mode = frontmatter.mode || 'subagent';
    
    // Parse skills
    const skills = parseSkills(content);
    
    // Get model config
    const modelConfig = models.agents?.[name] || {};
    const model = modelConfig.model || null;
    const fallback = modelConfig.fallback || models.default_fallback || [];
    const variant = modelConfig.variant || null;
    const temperature = modelConfig.temperature || null;
    
    registry[name] = {
      description,
      mode,
      model,
      fallback,
      ...(variant && { variant }),
      ...(temperature !== null && { temperature }),
      skills
    };
  }
  
  // Write output
  const output = {
    _generated: new Date().toISOString(),
    _source: 'node .opencode/scripts/skill-registry.mjs',
    agents: registry
  };
  
  writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2) + '\n');
  
  // Summary
  console.log(`✅ Generated ${OUTPUT_FILE}`);
  console.log(`   ${Object.keys(registry).length} agents processed:`);
  for (const [name, data] of Object.entries(registry)) {
    const alwaysCount = data.skills.always.length;
    const condCount = data.skills.conditional.length;
    const modelStr = data.model || 'no model';
    const fbStr = data.fallback.length ? ` → ${data.fallback.join(' → ')}` : '';
    console.log(`   • ${name}: ${modelStr}${fbStr} | ${alwaysCount} always, ${condCount} conditional skills`);
  }
}

main();
