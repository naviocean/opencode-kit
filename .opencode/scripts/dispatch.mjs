#!/usr/bin/env node

/**
 * Dispatch Helper — construct dispatch prompt for an agent
 *
 * Three output modes:
 *   (default)        Human-readable prompt with model + skill hints
 *   --json           Same as JSON envelope for programmatic use
 *   --shell          Print the actual shell command to invoke the agent
 *                    (uses `opencode run --agent <name> --model <model> "..."`)
 *   --claude         Print the Task tool invocation JSON (for Claude Code)
 *
 * Usage:
 *   node .opencode/scripts/dispatch.mjs <agent-name> [task-description]
 *   node .opencode/scripts/dispatch.mjs backend "implement JWT auth" --shell
 *   node .opencode/scripts/dispatch.mjs pm "write PRD for billing" --json
 *
 * What it does:
 *   Reads agent-registry.json (model + skills per agent) and constructs a
 *   prompt that the orchestrator (Claude Code Task tool, opencode subagent,
 *   or a human) can pass verbatim. The prompt includes:
 *     - Model assignment (with fallback chain)
 *     - Mandatory skills to load
 *     - The actual task
 *     - Reference to the agent's .md file (load via read tool)
 *
 * Why three modes:
 *   - default: human reads, copies into Task tool
 *   --shell: human pastes into terminal, runs directly
 *   --claude: programmatic invocation in Claude Code (Task tool with subagent_type)
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const REGISTRY_FILE = join(ROOT, '.opencode', 'agent-registry.json');

const agentName = process.argv[2];
const taskDesc = process.argv.slice(3).filter(a => !a.startsWith('--')).join(' ') || '[task not specified]';
const flags = process.argv.filter(a => a.startsWith('--'));

if (!agentName) {
  console.error('Usage: node dispatch.mjs <agent-name> [task-description] [--json|--shell|--claude]');
  console.error('Agents: tech-lead, pm, designer, frontend, backend, rustacean, qa, security-auditor');
  process.exit(1);
}

let registry;
try {
  registry = JSON.parse(readFileSync(REGISTRY_FILE, 'utf-8'));
} catch (e) {
  console.error(`Error: Cannot read ${REGISTRY_FILE}`);
  console.error('Run: node .opencode/scripts/skill-registry.mjs first');
  process.exit(1);
}

const agent = registry.agents[agentName];
if (!agent) {
  console.error(`Error: Agent "${agentName}" not found in registry`);
  console.error(`Available: ${Object.keys(registry.agents).join(', ')}`);
  process.exit(1);
}

// ──────────────────────────────────────────────
// Build prompt sections
// ──────────────────────────────────────────────
const model = agent.model || 'default';
const fallback = agent.fallback?.length ? ` (fallback: ${agent.fallback.join(' → ')})` : '';
const modelHint = `${model}${fallback}`;

const alwaysSkills = agent.skills?.always || [];
const skillHint = alwaysSkills.length > 0
  ? `Load BEFORE working: [${alwaysSkills.map(s => `\`${s}\``).join(', ')}]\nCall skill(name="...") for each.`
  : 'No mandatory skills. Load conditional skills as needed.';

const description = agent.description || '(no description)';
const agentMdPath = `.opencode/agents/${agentName}.md`;

const prompt = `## Dispatch: ${agentName}

### Agent Identity
${description}

### Model Assignment
\`${modelHint}\`
You are running as agent "${agentName}". The orchestrator has already set OMO_AGENT_MODEL=${model}.

### Skill Loading
${skillHint}

### Reference
Full agent spec: ${agentMdPath} (read with file tool before starting).

### Task
${taskDesc}
`;

// ──────────────────────────────────────────────
// Output mode
// ──────────────────────────────────────────────
if (flags.includes('--shell')) {
  // Build shell command for `opencode run`
  // The model-router.sh hook will re-read OMO_AGENT_MODEL from the registry,
  // so we don't need to pass --model explicitly (it will be injected).
  const escapedTask = taskDesc.replace(/'/g, "'\\''");
  const cmd = `opencode run --agent ${agentName} '${escapedTask}'`;
  console.log(cmd);
  process.exit(0);
}

if (flags.includes('--claude')) {
  // Build JSON for Claude Code's Task tool
  // subagent_type: 'general-purpose' is the safest for arbitrary dispatch
  // (specialized types: 'statusline-setup', 'Explore', 'Plan' have constraints)
  const claudeJson = {
    tool: 'Task',
    parameters: {
      subagent_type: 'general-purpose',
      description: `Dispatch ${agentName}: ${taskDesc.substring(0, 50)}`,
      prompt,
    },
  };
  console.log(JSON.stringify(claudeJson, null, 2));
  process.exit(0);
}

if (flags.includes('--json')) {
  console.log(JSON.stringify({
    agent: agentName,
    model,
    fallback: agent.fallback || [],
    alwaysSkills,
    task: taskDesc,
    prompt,
    shellCommand: `opencode run --agent ${agentName} '${taskDesc.replace(/'/g, "'\\''")}'`,
  }, null, 2));
  process.exit(0);
}

// Default: human-readable prompt
console.log(prompt);
