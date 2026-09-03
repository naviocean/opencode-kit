#!/usr/bin/env node

/**
 * opencode-saas-kit CLI
 * 
 * Usage:
 *   npx opencode-saas-kit init          # Install kit to current project
 *   npx opencode-saas-kit init --global # Install tools globally
 *   npx opencode-saas-kit verify        # Verify installation
 *   npx opencode-saas-kit --help        # Show help
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { injectMarkedContent } = require(path.join(__dirname, '..', 'scripts', 'lib', 'context-marker.cjs'));

// ─── Constants ──────────────────────────────────────────────────────────────

const KIT_NAME = 'opencode-saas-kit';
const VERSION = '1.3.2';

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const ICONS = {
  success: `${COLORS.green}✔${COLORS.reset}`,
  error: `${COLORS.red}✘${COLORS.reset}`,
  warn: `${COLORS.yellow}⚠${COLORS.reset}`,
  info: `${COLORS.blue}ℹ${COLORS.reset}`,
  arrow: `${COLORS.cyan}→${COLORS.reset}`,
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function log(msg) { console.log(msg); }
function logSuccess(msg) { console.log(`  ${ICONS.success} ${msg}`); }
function logError(msg) { console.log(`  ${ICONS.error} ${msg}`); }
function logWarn(msg) { console.log(`  ${ICONS.warn} ${msg}`); }
function logInfo(msg) { console.log(`  ${ICONS.info} ${msg}`); }
function logStep(msg) { console.log(`\n${COLORS.bold}${msg}${COLORS.reset}`); }

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return false;
  
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
  return true;
}

function commandExists(cmd) {
  try {
    execSync(`which ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function runCommand(cmd, options = {}) {
  try {
    execSync(cmd, { stdio: options.silent ? 'ignore' : 'inherit', ...options });
    return true;
  } catch {
    return false;
  }
}

// ─── Commands ───────────────────────────────────────────────────────────────

function showHelp() {
  log(`
${COLORS.bold}${KIT_NAME}${COLORS.reset} v${VERSION}

${COLORS.dim}Universal multi-agent development team kit for OpenCode, Claude Code, Antigravity, and Codex${COLORS.reset}

${COLORS.bold}Usage:${COLORS.reset}
  npx ${KIT_NAME} init            Install kit to current project
  npx ${KIT_NAME} init --tools    Install kit + tools (gitnexus)
  npx ${KIT_NAME} sync            Sync kit across harnesses (OpenCode, Claude, Antigravity, Codex)
  npx ${KIT_NAME} update          Update kit files (preserves your docs)
  npx ${KIT_NAME} update --skills Update kit + refresh skills from registry
  npx ${KIT_NAME} verify          Verify installation
  npx ${KIT_NAME} --help          Show this help

${COLORS.bold}Options:${COLORS.reset}
  --preset      Model preset: opencode, claude, antigravity, codex
  --target      Target harness for sync: all, opencode, claude, codex, antigravity
  --copy        Use copy mode instead of relative symlinks
  --tools       Install tools (gitnexus) globally
  --skills      Update skills from skills.sh registry
  --skip-mcp    Skip opencode.json MCP configuration
  --dry-run     Show what would be done without making changes
  --yes, -y     Skip confirmation prompts

${COLORS.bold}What gets installed:${COLORS.reset}
  .agent-core/   Single Source of Truth (11 agents, 8 commands, 4 rules, skills, standards)
  .agent-memory/ Universal persistent memory (decisions, contracts, context)
  .opencode/     OpenCode integration (symlinks + opencode.json)
  AGENTS.md      Universal project rules (Antigravity & OpenAI Codex)
  .agents/       Skills and rules for Antigravity & OpenAI Codex
  CLAUDE.md      Claude Code instructions
  docs/          Document output directories (prds, designs, plans, adr, tasks)

${COLORS.bold}More info:${COLORS.reset}
  https://github.com/naviocean/opencode-kit
`);
}

function verifyPrerequisites() {
  const checks = [];

  // Node.js version
  const nodeVersion = process.version;
  const major = parseInt(nodeVersion.slice(1).split('.')[0]);
  checks.push({
    name: `Node.js >= 18 (found ${nodeVersion})`,
    pass: major >= 18,
  });

  // npm
  checks.push({
    name: 'npm available',
    pass: commandExists('npm'),
  });

  return checks;
}

function verifyInstallation(projectDir) {
  logStep('Verifying installation...');

  const checks = [];

  // Check .opencode directory
  const opencodeDir = path.join(projectDir, '.opencode');
  checks.push({ name: '.opencode/ directory', pass: fs.existsSync(opencodeDir) });

  // Check agents — derive from agent-models.json (single source of truth)
  const agentsDir = path.join(opencodeDir, 'agents');
  const modelsJsonPath = path.join(opencodeDir, 'agent-models.json');
  let expectedAgents;
  try {
    const modelsJson = JSON.parse(fs.readFileSync(modelsJsonPath, 'utf8'));
    expectedAgents = Object.keys(modelsJson.agents || {}).sort();
  } catch {
    // Fallback: scan agents directory for .md files
    expectedAgents = fs.existsSync(agentsDir)
      ? fs.readdirSync(agentsDir).filter(f => f.endsWith('.md')).map(f => f.replace('.md', '')).sort()
      : [];
  }
  for (const agent of expectedAgents) {
    checks.push({ name: `.opencode/agents/${agent}.md`, pass: fs.existsSync(path.join(agentsDir, `${agent}.md`)) });
  }

  // Check commands
  const commandsDir = path.join(opencodeDir, 'commands');
  const expectedCommands = ['plan', 'build', 'review', 'ship', 'security', 'design', 'test', 'hotfix'];
  for (const cmd of expectedCommands) {
    checks.push({ name: `.opencode/commands/${cmd}.md`, pass: fs.existsSync(path.join(commandsDir, `${cmd}.md`)) });
  }

  // Check rules
  const rulesDir = path.join(opencodeDir, 'rules');
  const expectedRules = ['coding-standards', 'git-workflow', 'testing-standards', 'security-standards'];
  for (const rule of expectedRules) {
    checks.push({ name: `.opencode/rules/${rule}.md`, pass: fs.existsSync(path.join(rulesDir, `${rule}.md`)) });
  }

  // Check standards
  const standardsDir = path.join(opencodeDir, 'standards');
  checks.push({ name: '.opencode/standards/', pass: fs.existsSync(standardsDir) });

  // Check skills
  const skillsDir = path.join(opencodeDir, 'skills');
  const skillsCount = fs.existsSync(skillsDir) ? fs.readdirSync(skillsDir).length : 0;
  checks.push({ name: `.opencode/skills/ (${skillsCount} skills)`, pass: skillsCount >= 50 });

  // Check AGENTS.md
  checks.push({ name: 'AGENTS.md', pass: fs.existsSync(path.join(projectDir, 'AGENTS.md')) });

  // Check .agent-memory
  checks.push({ name: '.agent-memory/ (Universal persistent memory)', pass: fs.existsSync(path.join(projectDir, '.agent-memory')) });

  // Check docs
  const docsDir = path.join(projectDir, 'docs');
  checks.push({ name: 'docs/', pass: fs.existsSync(docsDir) });

  // Print results
  let allPassed = true;
  for (const check of checks) {
    if (check.pass) {
      logSuccess(check.name);
    } else {
      logError(check.name);
      allPassed = false;
    }
  }

  log('');
  if (allPassed) {
    log(`${COLORS.green}${COLORS.bold}All checks passed!${COLORS.reset} Kit is ready to use.`);
    log(`\nStart with: ${COLORS.cyan}/plan "your feature description"${COLORS.reset}`);
  } else {
    log(`${COLORS.red}${COLORS.bold}Some checks failed.${COLORS.reset} Run ${COLORS.cyan}npx ${KIT_NAME} init${COLORS.reset} to fix.`);
  }

  return allPassed;
}

function isGitRepo(projectDir) {
  return fs.existsSync(path.join(projectDir, '.git'));
}

function installTools(projectDir, dryRun = false) {
  logStep('Installing tools...');

  // ─── GitNexus ─────────────────────────────────────────────────────────
  if (commandExists('gitnexus')) {
    logSuccess('GitNexus — already installed');
  } else if (dryRun) {
    logInfo('GitNexus — would install');
  } else {
    log(`  ${ICONS.arrow} Installing GitNexus...`);
    if (!runCommand('npx gitnexus setup', { cwd: projectDir })) {
      logWarn('GitNexus setup — failed (install manually)');
      logInfo('ICM: Install manually via `brew install rtk-ai/tap/icm` or download from github.com/rtk-ai/icm');
      return;
    }
    logSuccess('GitNexus — installed');
  }

  // Analyze project with GitNexus
  if (!dryRun) {
    log(`  ${ICONS.arrow} Indexing project with GitNexus...`);
    const hasGit = isGitRepo(projectDir);
    if (!hasGit) {
      logInfo('No git repo detected, using --skip-git (indexing without version history)');
    }
    const analyzeCmd = hasGit
      ? 'npx gitnexus analyze --skip-agents-md'
      : 'npx gitnexus analyze --skip-agents-md --skip-git';
    if (runCommand(analyzeCmd, { cwd: projectDir })) {
      logSuccess('GitNexus — project indexed');
    } else {
      logWarn('GitNexus analyze — failed (run manually: npx gitnexus analyze --skip-agents-md)');
    }
  }

  logInfo('ICM: Install manually via `brew install rtk-ai/tap/icm` or download from github.com/rtk-ai/icm');
}

function configureMcp(projectDir, dryRun = false) {
  logStep('Configuring OpenCode MCP...');

  const opencodeJsonPath = path.join(projectDir, 'opencode.json');
  const opencodeJsoncPath = path.join(projectDir, 'opencode.jsonc');

  let config = {};
  let configPath = opencodeJsonPath;

  // Read existing config
  if (fs.existsSync(opencodeJsoncPath)) {
    configPath = opencodeJsoncPath;
    try {
      const raw = fs.readFileSync(opencodeJsoncPath, 'utf8');
      config = JSON.parse(raw.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, ''));
    } catch {
      config = {};
    }
  } else if (fs.existsSync(opencodeJsonPath)) {
    try {
      config = JSON.parse(fs.readFileSync(opencodeJsonPath, 'utf8'));
    } catch {
      config = {};
    }
  }

  // Add MCP servers
  if (!config.mcp) config.mcp = {};

  // OpenCode expects { type, command: [...], enabled } per server.
  const mcpServers = {
    icm: { type: 'local', command: ['icm', 'serve'], enabled: true },
    gitnexus: { type: 'local', command: ['npx', '-y', 'gitnexus@latest', 'mcp'], enabled: true },
  };

  let added = [];
  for (const [name, serverConfig] of Object.entries(mcpServers)) {
    if (!config.mcp[name]) {
      config.mcp[name] = serverConfig;
      added.push(name);
    }
  }

  if (added.length === 0) {
    logSuccess('MCP servers already configured');
    return;
  }

  if (dryRun) {
    logInfo(`Would add MCP servers: ${added.join(', ')}`);
    return;
  }

  // Write config
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
  logSuccess(`Added MCP servers: ${added.join(', ')} → ${path.basename(configPath)}`);
}

function initProject(projectDir, options = {}) {
  const { installToolsFlag = false, skipMcp = false, dryRun = false, yes = false } = options;

  log(`\n${COLORS.bold}${COLORS.cyan}${KIT_NAME} v${VERSION}${COLORS.reset}`);
  log(`${COLORS.dim}Multi-agent development team kit for OpenCode${COLORS.reset}\n`);

  // 1. Verify prerequisites
  logStep('Checking prerequisites...');
  const prereqs = verifyPrerequisites();
  for (const check of prereqs) {
    if (check.pass) {
      logSuccess(check.name);
    } else {
      logError(check.name);
      process.exit(1);
    }
  }

  // 2. Detect existing installation
  const opencodeDir = path.join(projectDir, '.opencode');
  if (fs.existsSync(opencodeDir)) {
    logWarn('.opencode/ directory already exists');
    logInfo('Files will be merged (existing files overwritten)');
  }

  // 3. Brownfield Scan & Onboarding
  logStep('Scanning repository profile...');
  const scannerScript = path.join(kitDir, '..', 'scripts', 'repo-scanner.mjs');
  if (fs.existsSync(scannerScript)) {
    if (dryRun) {
      logInfo('Would scan repository and generate .agent-memory/project-context.md');
    } else {
      try {
        execSync(`node "${scannerScript}" --write "${projectDir}"`, { stdio: 'ignore' });
        logSuccess('Repository profile scanned → .agent-memory/project-context.md');
      } catch (err) {
        logWarn(`Repository scan skipped (${err.message})`);
      }
    }
  }

  // 4. Copy kit files
  logStep('Installing kit files...');

  const copyTasks = [
    { src: '.agent-core', dest: '.agent-core', desc: 'Single Source of Truth: 11 agents, 8 commands, rules, skills, standards' },
    { src: '.opencode', dest: '.opencode', desc: 'OpenCode integration' },
    { src: 'scripts', dest: 'scripts', desc: 'Universal sync engine and tool scripts' },
    { src: 'AGENTS.md', dest: 'AGENTS.md', desc: 'Universal project rules' },
    { src: 'docs', dest: 'docs', desc: 'Document output directories' },
  ];

  for (const task of copyTasks) {
    const srcPath = path.join(kitDir, '..', task.src);
    const destPath = path.join(projectDir, task.dest);

    // Safe handling for AGENTS.md: inject within markers to preserve existing human rules
    if (task.dest === 'AGENTS.md') {
      if (dryRun) {
        logInfo(`Would safely inject kit rules into ${task.dest} with markers`);
      } else if (fs.existsSync(srcPath)) {
        const kitContent = fs.readFileSync(srcPath, 'utf-8');
        const existingContent = fs.existsSync(destPath) ? fs.readFileSync(destPath, 'utf-8') : '';
        const merged = injectMarkedContent(existingContent, kitContent, { markerId: 'opencode-saas-kit' });
        fs.writeFileSync(destPath, merged, 'utf-8');
        logSuccess(`${task.dest} — ${task.desc} (safe context marker injected)`);
      }
      continue;
    }

    if (dryRun) {
      logInfo(`Would copy ${task.src}/ → ${task.dest}/ (${task.desc})`);
    } else {
      if (fs.existsSync(srcPath)) {
        if (copyRecursive(srcPath, destPath)) {
          logSuccess(`${task.dest}/ — ${task.desc}`);
        } else {
          logError(`Failed to copy ${task.src}`);
        }
      }
    }
  }

  // Run sync to link environments
  if (!dryRun) {
    syncProject(projectDir, {
      target: options.target || 'all',
      mode: options.mode || 'symlink',
      dryRun,
    });
  }

  // Copy opencode.json template if not exists
  const opencodeJsonPath = path.join(projectDir, 'opencode.json');
  const opencodeJsoncPath = path.join(projectDir, 'opencode.jsonc');
  if (!fs.existsSync(opencodeJsonPath) && !fs.existsSync(opencodeJsoncPath)) {
    const templatePath = path.join(kitDir, '..', 'opencode.json');
    if (fs.existsSync(templatePath)) {
      if (dryRun) {
        logInfo('Would create opencode.json (MCP config)');
      } else {
        fs.copyFileSync(templatePath, opencodeJsonPath);
        logSuccess('opencode.json — MCP configuration (gitnexus, context7, etc.)');
      }
    }
  }

  // 4. Install tools (optional)
  if (installToolsFlag) {
    installTools(projectDir, dryRun);
  }

  // 5. Configure MCP (optional)
  if (!skipMcp) {
    configureMcp(projectDir, dryRun);
  }

  // 6. Summary
  logStep('Installation complete!');
  log(`
${COLORS.bold}What was installed:${COLORS.reset}
  .opencode/agents/         11 agent definitions
  .opencode/commands/       8 slash commands
  .opencode/rules/          4 always-follow rules
  .opencode/skills/         157 skills (146 from skills.sh + 11 custom)
  .opencode/standards/      7 document templates
  .agent-memory/            Universal persistent memory (decisions, contracts, context)
  AGENTS.md                 Project rules
  docs/                     Document output directories

${COLORS.bold}Quick start:${COLORS.reset}
  1. Open your project in OpenCode
  2. Type: ${COLORS.cyan}/plan "describe your feature"${COLORS.reset}
  3. PM agent will interview you with Socratic questions
  4. Follow the workflow: /plan → /build → /review → /ship

${COLORS.bold}Commands:${COLORS.reset}
  ${COLORS.cyan}/plan${COLORS.reset}     Socratic interview → spec → design → plan
  ${COLORS.cyan}/build${COLORS.reset}    Parallel execution (Frontend + Backend)
  ${COLORS.cyan}/review${COLORS.reset}   Code review + security audit
  ${COLORS.cyan}/ship${COLORS.reset}     Final tests + security gate + approval
  ${COLORS.cyan}/design${COLORS.reset}   Create UI Kit + UX flow
  ${COLORS.cyan}/security${COLORS.reset} Run AgentShield scan
  ${COLORS.cyan}/test${COLORS.reset}     Run test suite, analyze coverage
  ${COLORS.cyan}/hotfix${COLORS.reset}   Fast-track bugfix or urgent patch

${COLORS.bold}More info:${COLORS.reset}
  README.md — Full documentation
  .opencode/standards/README.md — Document standards
`);
}

function updateProject(projectDir, options = {}) {
  const { updateSkills = false, skipMcp = false, dryRun = false, yes = false } = options;

  log(`\n${COLORS.bold}${COLORS.cyan}${KIT_NAME} update${COLORS.reset}`);
  log(`${COLORS.dim}Updating kit files (preserving your documents)${COLORS.reset}\n`);

  const opencodeDir = path.join(projectDir, '.opencode');
  if (!fs.existsSync(opencodeDir)) {
    logError('.opencode/ not found. Run `npx opencode-saas-kit init` first.');
    process.exit(1);
  }

  const kitDir = path.dirname(__filename);

  logStep('Updating kit files...');

  const updateTasks = [
    { src: '.opencode/agents', dest: '.opencode/agents', desc: '10 agent definitions' },
    { src: '.opencode/commands', dest: '.opencode/commands', desc: '8 slash commands' },
    { src: '.opencode/rules', dest: '.opencode/rules', desc: '4 rules' },
    { src: '.opencode/standards', dest: '.opencode/standards', desc: '7 document templates' },
    { src: '.opencode/memory', dest: '.opencode/memory', desc: 'Continuous learning config' },
    { src: 'AGENTS.md', dest: 'AGENTS.md', desc: 'Project rules' },
  ];

  for (const task of updateTasks) {
    const srcPath = path.join(kitDir, '..', task.src);
    const destPath = path.join(projectDir, task.dest);

    if (dryRun) {
      logInfo(`Would update ${task.dest} (${task.desc})`);
    } else {
      if (copyRecursive(srcPath, destPath)) {
        logSuccess(`${task.dest} — ${task.desc}`);
      } else {
        logWarn(`${task.src} — not found in kit`);
      }
    }
  }

  logStep('Preserving user documents...');
  const docsDir = path.join(projectDir, 'docs');
  if (fs.existsSync(docsDir)) {
    logSuccess('docs/ — preserved (your PRDs, designs, plans, tasks)');
  } else {
    if (dryRun) {
      logInfo('Would create docs/ directories');
    } else {
      const docDirs = ['prds', 'designs', 'plans', 'adr', 'tasks'];
      for (const dir of docDirs) {
        fs.mkdirSync(path.join(docsDir, dir), { recursive: true });
      }
      logSuccess('docs/ — created (prds, designs, plans, adr, tasks)');
    }
  }

  if (updateSkills) {
    logStep('Updating skills from registry...');
    if (dryRun) {
      logInfo('Would run: npx skills add ... (all skill sources)');
    } else {
      const skillsDir = path.join(projectDir, '.opencode', 'skills');
      const skillSources = [
        'https://github.com/nrwl/nx-ai-agents-config',
        'abhigyanpatwari/gitnexus',
        'rtk-ai/rtk',
        'obra/superpowers',
        'vercel-labs/agent-skills',
        'shadcn/ui',
        'kadajett/agent-nestjs-skills',
        'prisma/skills',
        'antfu/skills',
        'mattpocock/skills',
        'google-labs-code/stitch-skills',
        'leonxlnx/taste-skill',
        'wshobson/agents',
        'giuseppe-trisciuoglio/developer-kit',
        'currents-dev/playwright-best-practices-skill',
        'julianoczkowski/designer-skills',
        'chiroro-jr/pencil-design-skill',
        'vercel-labs/skills',
        'zhanghandong/rust-skills',
        'mohitmishra786/low-level-dev-skills',
        'nodnarbnitram/claude-code-extensions',
      ];

      for (const source of skillSources) {
        log(`  ${ICONS.arrow} ${source}...`);
        runCommand(`npx skills add ${source} -a '*' -y --skill '*'`, { cwd: projectDir, silent: true });
      }

      const skillsCount = fs.existsSync(skillsDir) ? fs.readdirSync(skillsDir).length : 0;
      logSuccess(`Skills updated — ${skillsCount} skills in .opencode/skills/`);
    }
  }

  if (!skipMcp) {
    logStep('Updating MCP configuration...');
    configureMcp(projectDir, dryRun);
  }

  logStep('Update complete!');
  log(`
${COLORS.bold}What was updated:${COLORS.reset}
  .opencode/agents/         Agent definitions
  .opencode/commands/       Slash commands
  .opencode/rules/          Rules
  .opencode/standards/      Document templates
  .opencode/memory/         Continuous learning config
  AGENTS.md                 Project rules

${COLORS.bold}What was preserved:${COLORS.reset}
  docs/                     Your PRDs, designs, plans, tasks
  .opencode/skills/         Skills (use --skills to refresh)
  opencode.json             Your MCP configuration

${COLORS.bold}Verify:${COLORS.reset}
  npx ${KIT_NAME} verify
`);
}

function syncProject(projectDir, options = {}) {
  const { target = 'all', mode = 'symlink', preset = null, dryRun = false } = options;
  const syncScript = path.join(projectDir, 'scripts', 'sync-kit.mjs');
  if (!fs.existsSync(syncScript)) {
    logError('scripts/sync-kit.mjs not found. Make sure opencode-saas-kit is initialized.');
    return false;
  }
  const flags = [];
  if (target) flags.push(`--target ${target}`);
  if (preset) flags.push(`--preset ${preset}`);
  if (mode === 'copy') flags.push('--copy');
  if (dryRun) flags.push('--dry-run');

  logStep(`Synchronizing Universal Agent Kit (${target}${preset ? ', preset: ' + preset : ''})...`);
  return runCommand(`node "${syncScript}" ${flags.join(' ')}`, { cwd: projectDir });
}

// ─── Main ───────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  // Parse flags
  let target = 'all';
  const targetIdx = args.indexOf('--target');
  if (targetIdx !== -1 && args[targetIdx + 1]) {
    target = args[targetIdx + 1];
  } else {
    const targetEq = args.find(a => a.startsWith('--target='));
    if (targetEq) target = targetEq.split('=')[1];
  }

  let preset = null;
  const presetIdx = args.indexOf('--preset');
  if (presetIdx !== -1 && args[presetIdx + 1]) {
    preset = args[presetIdx + 1];
  } else {
    const presetEq = args.find(a => a.startsWith('--preset='));
    if (presetEq) preset = presetEq.split('=')[1];
  }

  const flags = {
    target,
    preset,
    copy: args.includes('--copy'),
    tools: args.includes('--tools'),
    skills: args.includes('--skills'),
    skipMcp: args.includes('--skip-mcp'),
    dryRun: args.includes('--dry-run'),
    yes: args.includes('--yes') || args.includes('-y'),
    help: args.includes('--help') || args.includes('-h'),
    version: args.includes('--version') || args.includes('-v'),
  };

  // Show help
  if (flags.help || !command) {
    showHelp();
    process.exit(0);
  }

  // Show version
  if (flags.version) {
    log(`${KIT_NAME} v${VERSION}`);
    process.exit(0);
  }

  // Get project directory
  const projectDir = process.cwd();

  // Execute command
  switch (command) {
    case 'init':
      initProject(projectDir, {
        target: flags.target,
        preset: flags.preset,
        mode: flags.copy ? 'copy' : 'symlink',
        installToolsFlag: flags.tools,
        skipMcp: flags.skipMcp,
        dryRun: flags.dryRun,
        yes: flags.yes,
      });
      break;

    case 'sync':
      syncProject(projectDir, {
        target: flags.target,
        preset: flags.preset,
        mode: flags.copy ? 'copy' : 'symlink',
        dryRun: flags.dryRun,
      });
      break;

    case 'update':
      updateProject(projectDir, {
        updateSkills: flags.skills,
        skipMcp: flags.skipMcp,
        dryRun: flags.dryRun,
        yes: flags.yes,
      });
      break;

    case 'verify':
      verifyInstallation(projectDir);
      break;

    default:
      logError(`Unknown command: ${command}`);
      log(`Run ${COLORS.cyan}npx ${KIT_NAME} --help${COLORS.reset} for usage`);
      process.exit(1);
  }
}

main();
