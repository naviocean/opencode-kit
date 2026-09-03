#!/usr/bin/env node

/**
 * Repo Scanner & Brownfield Onboarding Tool
 *
 * Scans an existing codebase to detect languages, frameworks, package managers,
 * test runners, linters, and architectural features.
 *
 * Usage:
 *   node scripts/repo-scanner.mjs [projectDir]
 *   node scripts/repo-scanner.mjs --write [projectDir]
 */

import fs from 'fs';
import path from 'path';
import { detectRecommendedPacks } from './skill-pack-manager.mjs';

/**
 * Safely reads and parses JSON from a file path.
 */
function readJson(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (_) {}
  return null;
}

/**
 * Safely reads text content from a file path.
 */
function readText(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8');
    }
  } catch (_) {}
  return '';
}

/**
 * Scans a project directory and extracts stack details.
 * @param {string} projectDir
 * @returns {object} Discovered project profile
 */
export function scanRepo(projectDir = process.cwd()) {
  const result = {
    languages: [],
    frameworks: [],
    packageManagers: [],
    primaryPackageManager: null,
    testRunners: [],
    linters: [],
    monorepo: false,
    monorepoType: null,
    docker: false,
    database: [],
    scripts: {},
  };

  // 1. Package Manager Detection
  if (fs.existsSync(path.join(projectDir, 'pnpm-lock.yaml')) || fs.existsSync(path.join(projectDir, 'pnpm-workspace.yaml'))) {
    result.packageManagers.push('pnpm');
    result.primaryPackageManager = 'pnpm';
  } else if (fs.existsSync(path.join(projectDir, 'bun.lockb')) || fs.existsSync(path.join(projectDir, 'bun.lock'))) {
    result.packageManagers.push('bun');
    result.primaryPackageManager = 'bun';
  } else if (fs.existsSync(path.join(projectDir, 'yarn.lock'))) {
    result.packageManagers.push('yarn');
    result.primaryPackageManager = 'yarn';
  } else if (fs.existsSync(path.join(projectDir, 'package-lock.json'))) {
    result.packageManagers.push('npm');
    result.primaryPackageManager = 'npm';
  }

  if (fs.existsSync(path.join(projectDir, 'Cargo.lock')) || fs.existsSync(path.join(projectDir, 'Cargo.toml'))) {
    result.packageManagers.push('cargo');
    if (!result.primaryPackageManager) result.primaryPackageManager = 'cargo';
  }

  if (fs.existsSync(path.join(projectDir, 'uv.lock'))) {
    result.packageManagers.push('uv');
    if (!result.primaryPackageManager) result.primaryPackageManager = 'uv';
  } else if (fs.existsSync(path.join(projectDir, 'poetry.lock'))) {
    result.packageManagers.push('poetry');
    if (!result.primaryPackageManager) result.primaryPackageManager = 'poetry';
  }

  // 2. Monorepo Detection
  if (fs.existsSync(path.join(projectDir, 'pnpm-workspace.yaml'))) {
    result.monorepo = true;
    result.monorepoType = 'pnpm-workspace';
  } else if (fs.existsSync(path.join(projectDir, 'nx.json'))) {
    result.monorepo = true;
    result.monorepoType = 'nx';
  } else if (fs.existsSync(path.join(projectDir, 'turbo.json'))) {
    result.monorepo = true;
    result.monorepoType = 'turborepo';
  } else if (fs.existsSync(path.join(projectDir, 'lerna.json'))) {
    result.monorepo = true;
    result.monorepoType = 'lerna';
  }

  // 3. Node.js Ecosystem Detection (package.json)
  const pkgJsonPath = path.join(projectDir, 'package.json');
  const pkg = readJson(pkgJsonPath);

  if (pkg) {
    if (!result.primaryPackageManager) result.primaryPackageManager = 'npm';
    const allDeps = {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {}),
      ...(pkg.peerDependencies || {}),
    };

    result.scripts = pkg.scripts || {};

    // Language
    if (allDeps.typescript || fs.existsSync(path.join(projectDir, 'tsconfig.json'))) {
      result.languages.push('TypeScript');
    }
    result.languages.push('JavaScript');

    // Frameworks
    if (allDeps.next || fs.existsSync(path.join(projectDir, 'next.config.js')) || fs.existsSync(path.join(projectDir, 'next.config.mjs')) || fs.existsSync(path.join(projectDir, 'next.config.ts'))) {
      result.frameworks.push('Next.js');
    }
    if (allDeps['@nestjs/core'] || allDeps['@nestjs/common']) {
      result.frameworks.push('NestJS');
    }
    if (allDeps.react && !result.frameworks.includes('Next.js')) {
      result.frameworks.push('React');
    }
    if (allDeps.vue || allDeps.nuxt) {
      result.frameworks.push(allDeps.nuxt ? 'Nuxt' : 'Vue');
    }
    if (allDeps.express) {
      result.frameworks.push('Express');
    }
    if (allDeps.fastify) {
      result.frameworks.push('Fastify');
    }

    // Styling
    if (allDeps.tailwindcss || fs.existsSync(path.join(projectDir, 'tailwind.config.js')) || fs.existsSync(path.join(projectDir, 'tailwind.config.ts'))) {
      result.frameworks.push('Tailwind CSS');
    }

    // Database / ORM
    if (allDeps['@prisma/client'] || allDeps.prisma || fs.existsSync(path.join(projectDir, 'prisma'))) {
      result.database.push('Prisma');
    }
    if (allDeps.drizzle_orm || allDeps['drizzle-orm']) {
      result.database.push('Drizzle');
    }
    if (allDeps.typeorm) {
      result.database.push('TypeORM');
    }
    if (allDeps.mongoose) {
      result.database.push('Mongoose (MongoDB)');
    }
    if (allDeps.pg) {
      result.database.push('PostgreSQL');
    }

    // Test Runners
    if (allDeps.vitest || fs.existsSync(path.join(projectDir, 'vitest.config.ts')) || fs.existsSync(path.join(projectDir, 'vitest.config.js'))) {
      result.testRunners.push('Vitest');
    }
    if (allDeps.jest || fs.existsSync(path.join(projectDir, 'jest.config.js')) || fs.existsSync(path.join(projectDir, 'jest.config.ts'))) {
      result.testRunners.push('Jest');
    }
    if (allDeps['@playwright/test']) {
      result.testRunners.push('Playwright');
    }
    if (allDeps.cypress) {
      result.testRunners.push('Cypress');
    }

    // Linters & Formatters
    if (allDeps['@biomejs/biome'] || fs.existsSync(path.join(projectDir, 'biome.json'))) {
      result.linters.push('Biome');
    }
    if (allDeps.eslint || fs.existsSync(path.join(projectDir, '.eslintrc.json')) || fs.existsSync(path.join(projectDir, '.eslintrc.js')) || fs.existsSync(path.join(projectDir, 'eslint.config.js')) || fs.existsSync(path.join(projectDir, 'eslint.config.mjs'))) {
      result.linters.push('ESLint');
    }
    if (allDeps.prettier || fs.existsSync(path.join(projectDir, '.prettierrc')) || fs.existsSync(path.join(projectDir, '.prettierrc.json'))) {
      result.linters.push('Prettier');
    }
  }

  // 4. Rust Ecosystem Detection (Cargo.toml)
  const cargoPath = path.join(projectDir, 'Cargo.toml');
  if (fs.existsSync(cargoPath)) {
    result.languages.push('Rust');
    result.testRunners.push('cargo test');
    result.linters.push('clippy', 'rustfmt');

    const cargoContent = readText(cargoPath);
    if (cargoContent.includes('axum')) result.frameworks.push('Axum');
    if (cargoContent.includes('tokio')) result.frameworks.push('Tokio');
    if (cargoContent.includes('actix-web')) result.frameworks.push('Actix-Web');
    if (cargoContent.includes('tauri') || fs.existsSync(path.join(projectDir, 'src-tauri'))) result.frameworks.push('Tauri');
    if (cargoContent.includes('sqlx')) result.database.push('SQLx');
    if (cargoContent.includes('diesel')) result.database.push('Diesel');
  }

  // 5. Python Ecosystem Detection
  const pyprojectPath = path.join(projectDir, 'pyproject.toml');
  const reqsPath = path.join(projectDir, 'requirements.txt');
  const hasPython = fs.existsSync(pyprojectPath) || fs.existsSync(reqsPath) || fs.existsSync(path.join(projectDir, 'setup.py'));

  if (hasPython) {
    result.languages.push('Python');
    const pyText = readText(pyprojectPath) + '\n' + readText(reqsPath);

    if (pyText.includes('fastapi')) result.frameworks.push('FastAPI');
    if (pyText.includes('django')) result.frameworks.push('Django');
    if (pyText.includes('flask')) result.frameworks.push('Flask');
    if (pyText.includes('langgraph')) result.frameworks.push('LangGraph');
    if (pyText.includes('langchain')) result.frameworks.push('LangChain');
    if (pyText.includes('sqlalchemy')) result.database.push('SQLAlchemy');

    if (pyText.includes('pytest') || fs.existsSync(path.join(projectDir, 'pytest.ini'))) {
      result.testRunners.push('pytest');
    }
    if (pyText.includes('ruff') || fs.existsSync(path.join(projectDir, 'ruff.toml'))) {
      result.linters.push('Ruff');
    }
  }

  // 6. Go Ecosystem Detection
  const goModPath = path.join(projectDir, 'go.mod');
  if (fs.existsSync(goModPath)) {
    result.languages.push('Go');
    result.testRunners.push('go test');
    const goText = readText(goModPath);
    if (goText.includes('gin-gonic/gin')) result.frameworks.push('Gin');
    if (goText.includes('gofiber/fiber')) result.frameworks.push('Fiber');
  }

  // 7. Docker & Infrastructure
  if (fs.existsSync(path.join(projectDir, 'Dockerfile')) || fs.existsSync(path.join(projectDir, 'docker-compose.yml')) || fs.existsSync(path.join(projectDir, 'compose.yaml'))) {
    result.docker = true;
  }

  // Deduplicate arrays
  result.languages = [...new Set(result.languages)];
  result.frameworks = [...new Set(result.frameworks)];
  result.packageManagers = [...new Set(result.packageManagers)];
  result.testRunners = [...new Set(result.testRunners)];
  result.linters = [...new Set(result.linters)];
  result.database = [...new Set(result.database)];
  result.recommendedSkillPacks = detectRecommendedPacks(result);

  return result;
}

/**
 * Formats scan results into markdown for .agent-memory/project-context.md.
 * @param {object} profile
 * @returns {string} Markdown text
 */
export function formatProjectContextMarkdown(profile) {
  const pm = profile.primaryPackageManager || 'npm';
  let testCmd = (profile.testRunners && profile.testRunners[0]) || `${pm} test`;
  if (pm === 'cargo' && !testCmd.includes('cargo')) testCmd = 'cargo test';
  if (pm === 'uv' || pm === 'poetry') testCmd = `${pm} run pytest`;

  const languagesStr = profile.languages.length > 0 ? profile.languages.join(', ') : 'Not specified';
  const frameworksStr = profile.frameworks.length > 0 ? profile.frameworks.join(', ') : 'Vanilla / Standard';
  const databaseStr = profile.database.length > 0 ? profile.database.join(', ') : 'Not detected';
  const lintersStr = profile.linters.length > 0 ? profile.linters.join(', ') : 'Default';
  const packsStr = (profile.recommendedSkillPacks && profile.recommendedSkillPacks.length > 0)
    ? profile.recommendedSkillPacks.map(p => `\`${p}\``).join(', ')
    : '`core`';

  return `# Project Context (Auto-scanned)

This file stores project-specific knowledge that persists across sessions.

## Discovered Stack & Environment
- **Languages**: ${languagesStr}
- **Frameworks & Libs**: ${frameworksStr}
- **Primary Package Manager**: \`${pm}\`
- **Database / ORM**: ${databaseStr}
- **Test Command**: \`${testCmd}\`
- **Linters / Formatters**: ${lintersStr}
- **Recommended Skill Packs**: ${packsStr}
${profile.monorepo ? `- **Monorepo**: Yes (${profile.monorepoType})\n` : ''}${profile.docker ? '- **Containerization**: Docker detected\n' : ''}
## Pointers to Dedicated Memory
- **Architecture Decisions**: See [.agent-memory/decisions.md](decisions.md)
- **API & Data Contracts**: See [.agent-memory/contracts.md](contracts.md)
- **Learned Instincts**: See [.agent-memory/instincts.json](instincts.json)
- **Persistent Semantic Memory (ICM)**: Query via \`icm recall "<topic>"\` / Store via \`icm store -t <topic>\`

## Design Tokens & Theme
<!-- Agent: Designer — auto-updated when design system or tokens change -->

## Known Issues & Gotchas
<!-- Agent: QA & Tech Lead — auto-updated when persistent quirks or workarounds are discovered -->
`;
}

/**
 * Writes or updates the .agent-memory/project-context.md file.
 * @param {string} projectDir
 * @param {object} scanResult
 * @returns {string} File path written
 */
export function writeProjectContext(projectDir, scanResult) {
  const memoryDir = path.join(projectDir, '.agent-memory');
  if (!fs.existsSync(memoryDir)) {
    fs.mkdirSync(memoryDir, { recursive: true });
  }

  const contextFile = path.join(memoryDir, 'project-context.md');
  const markdown = formatProjectContextMarkdown(scanResult);
  fs.writeFileSync(contextFile, markdown, 'utf-8');

  // Initialize active-packs.json if not present
  const activeFile = path.join(memoryDir, 'active-packs.json');
  if (!fs.existsSync(activeFile) && scanResult.recommendedSkillPacks) {
    fs.writeFileSync(activeFile, JSON.stringify({
      updatedAt: new Date().toISOString(),
      packs: scanResult.recommendedSkillPacks
    }, null, 2) + '\n', 'utf-8');
  }

  return contextFile;
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI Direct Execution
// ─────────────────────────────────────────────────────────────────────────────
if (process.argv[1] && process.argv[1].endsWith('repo-scanner.mjs')) {
  const args = process.argv.slice(2);
  const writeFlag = args.includes('--write');
  const targetDir = args.find(a => !a.startsWith('--')) || process.cwd();

  const scan = scanRepo(targetDir);
  console.log('\n🔍 Repository Scan Results:\n');
  console.log(JSON.stringify(scan, null, 2));

  if (writeFlag) {
    const written = writeProjectContext(targetDir, scan);
    console.log(`\n✅ Written project context to: ${written}\n`);
  }
}
