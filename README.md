# OpenCode SaaS Kit

A multi-agent development team kit for OpenCode. Seven specialized AI agents work together like a real product team — PM, Tech Lead, Designer, Frontend, Backend, QA, and Security Auditor — to build SaaS products from spec to ship.

## Quick Start

```bash
# Install kit into your project
npx opencode-saas-kit init

# Verify installation
npx opencode-saas-kit verify

# Start building
/plan "Build a SaaS dashboard with user auth, analytics, and billing"
```

## Why This Exists

Most coding agent setups treat AI as a single generalist. Real product teams don't work that way. They have specialists who own specific domains, review each other's work, and follow structured workflows.

OpenCode SaaS Kit brings that structure to AI-assisted development:

- **PM** is the primary entrypoint for `/plan` and interviews you before any code is written
- **Designer** creates UI Kit and UX flows before frontend implements
- **Tech Lead** orchestrates `/build`, reviews, and makes architecture decisions
- **Frontend/Backend** agents work in parallel on their domains
- **QA** enforces testing strategy and verifies coverage
- **Security Auditor** scans for vulnerabilities before ship

## Architecture

```
     ┌────────────┐
     │     PM     │  /plan entrypoint: Socratic interview + PRD
     └─────┬──────┘
           │
           ▼
     ┌────────────┐
     │  Designer  │  /plan and /design: UI kit + UX flows
     └─────┬──────┘
           │
           ▼
     ┌─────────────────┐
     │   Tech Lead     │  architecture, task breakdown, final approval
     │  (Orchestrator) │
     └────────┬────────┘
              │
     ┌────────┼────────┬─────────────────┐
     │        │        │                 │
     ▼        ▼        ▼                 ▼
 Frontend  Backend    QA          Security Auditor
 /build    /build   /test         /review + /ship
```

### Agent Responsibilities

| Agent | Role | Key Tools |
|---|---|---|
| **Tech Lead** | Orchestrator. Architecture decisions, code review, dispatch work to parallel agents. Final approval on all changes. | GitNexus (impact analysis), ICM (architectural memory) |
| **PM** | Primary `/plan` entrypoint. Socratic interview before coding, writes specs, defines priorities, sets acceptance criteria. | Stitch (ideation), ICM (decision memory) |
| **Designer** | UI/UX specialist. Creates UI Kit, UX flows, design tokens, prototypes before frontend implementation. | Stitch (AI design), Pencil (IDE-native canvas) |
| **Frontend** | Next.js 16, React 19, Shadcn, Tailwind 4. Implements UI from Designer's specs. | GitNexus (code context), ICM (pattern memory) |
| **Backend** | NestJS, Prisma, PostgreSQL, REST/GraphQL, JWT auth. Builds API and business logic. | GitNexus (code context), ICM (pattern memory) |
| **QA** | Test strategy, Vitest unit tests, Playwright E2E, coverage analysis. Enforces TDD. | GitNexus (detect changes), ICM (test memory) |
| **Security Auditor** | AgentShield scans, OWASP checks, secret detection, permission audits. Gates deployment. | AgentShield CLI, ICM (security memory) |

## Tools Integration

### RTK (Rust Token Killer)

Compresses CLI command output before it reaches the AI context window. 60-90% token reduction.

```bash
rtk init --global
```

Installs a PreToolUse hook that automatically rewrites Bash commands to RTK equivalents. Zero config after install.

### ICM (Intelligent Context Manager)

Persistent memory across sessions. All 7 agents share one SQLite database per project.

```bash
icm init --project
```

| Memory Type | Purpose | Lifecycle |
|---|---|---|
| **Memories** | Decisions, errors, configs, preferences | Temporal decay. Critical = forever. Low = fades. |
| **Memoirs** | Architecture graphs, domain models, relationships | Permanent. Refined over time. |
| **Feedback** | Corrections when agent is wrong | Closed-loop learning. |

### GitNexus

Code intelligence engine. Indexes codebase into a knowledge graph, exposes via MCP.

```bash
npx gitnexus setup
npx gitnexus analyze
```

| MCP Tool | Agent Usage |
|---|---|
| `query` | Hybrid search grouped by execution flow |
| `context` | 360° symbol view — callers, callees |
| `impact` | Blast radius analysis before approve |
| `detect_changes` | Git-diff impact — what changed, what's affected |
| `rename` | Coordinated multi-file rename |
| `generate_map` | Auto-generate architecture docs (Mermaid) |

### AgentShield

Security scanner for agent configurations. 102 rules across 5 categories.

```bash
npx ecc-agentshield scan
```

| Category | What It Catches |
|---|---|
| Secrets | Hardcoded API keys, tokens, passwords |
| Permissions | Overly broad allowedTools, missing deny lists |
| Hooks | Suspicious commands, data exfiltration patterns |
| MCP Servers | Typosquatted packages, unverified sources |
| Agent Configs | Prompt injection, hidden instructions, unsafe links |

### Stitch (Google)

AI-powered design tool. Text/image → high-fidelity UI designs + code export.

- Free: 350 generations/month
- Exports: HTML/CSS, Tailwind, React, Figma, DESIGN.md
- MCP server for agentic workflows

### Pencil.dev

IDE-native vector design tool. Runs inside VS Code/Cursor as an extension.

- Bidirectional design ↔ code sync
- `.pen` files live in Git repo
- Local MCP server for agent integration
- Generates React, Next.js, Vue, Svelte, HTML/CSS

## Tech Stack

| Layer | Technology |
|---|---|
| Language | TypeScript (strict mode) |
| Monorepo | NX |
| Frontend | Next.js 16 + React 19 + Shadcn + Tailwind 4 |
| Backend | NestJS + Prisma + PostgreSQL |
| API | REST or GraphQL (per-project decision) |
| Auth | Custom JWT (NestJS Passport) |
| State | React hooks + Context (or per-project choice) |
| Testing | Vitest (unit/integration) + Playwright (E2E) |
| Memory | ICM (Intelligent Context Manager) |
| Code Intelligence | GitNexus |
| Token Optimization | RTK (Rust Token Killer) |
| Security | AgentShield |

### Why Vitest Over Jest

- 3.7x faster cold start
- 10.6x faster watch mode (0.3s vs 3.4s)
- 58% less memory
- NestJS v12: Vitest is the new default
- NX has dedicated `@nx/vitest` plugin

### Why Playwright Over Cypress

- Official Next.js support for App Router
- Server Components require E2E testing (can't unit test async RSC)
- Free parallel execution (Cypress Cloud = paid)
- API + UI tests in the same file

## Workflow

### 1. Plan (`/plan`)

```
User: /plan "Build a SaaS dashboard with user auth, analytics, and billing"
         │
         ▼
┌─────────────────┐
│   PM Agent      │  Socratic interview
│                 │  "Who are the users? What metrics? Billing provider?"
└────────┬────────┘
         │ Spec document with acceptance criteria
         ▼
┌─────────────────┐
│  Designer       │  UI Kit + UX flow
│  Agent          │  Wireframes → Stitch → Pencil → design tokens
└────────┬────────┘
         │ Design specs + component list
         ▼
┌─────────────────┐
│  Tech Lead      │  Architecture decisions
│  Agent          │  Data model, API design, NX project structure
└────────┬────────┘
         │ Technical plan with task breakdown
         ▼
      Ready to build
```

### 2. Build (`/build`)

```
User: /build
         │
         ▼
┌─────────────────┐
│  Tech Lead      │  Dispatches parallel tasks
│  (Orchestrator) │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌────────┐
│Frontend│ │Backend │  Parallel execution
│ Agent  │ │ Agent  │  Each agent owns their domain
└───┬────┘ └───┬────┘
    │          │
    ▼          ▼
┌─────────────────┐
│  QA Agent       │  Runs affected tests
│                 │  nx affected -t test
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Security       │  AgentShield scan
│  Auditor        │  Permission + secret audit
└────────┬────────┘
         │
         ▼
      Ready to review
```

### 3. Review (`/review`)

```
User: /review
         │
         ▼
┌─────────────────┐
│  Tech Lead      │  Code review
│                 │  GitNexus: impact analysis
│                 │  Checks: patterns, architecture, quality
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Security       │  Final security scan
│  Auditor        │  AgentShield + OWASP checks
└────────┬────────┘
         │
         ▼
      Approved / Issues found
```

### 4. Ship (`/ship`)

```
User: /ship
         │
         ▼
┌─────────────────┐
│  QA Agent       │  Full test suite
│                 │  vitest run + playwright test
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Security       │  Final security gate
│  Auditor        │  No critical findings → pass
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Tech Lead      │  Final approval
│                 │  GitNexus: detect_changes summary
└────────┬────────┘
         │
         ▼
      Ready to deploy
```

## Installation

### Quick Start (Recommended)

```bash
# One command — installs kit + RTK + GitNexus
npx opencode-saas-kit init --tools
```

This will:
- Copy agents, commands, rules, skills, standards to `.opencode/`
- Copy AGENTS.md and docs/ to your project
- Create opencode.json with MCP servers
- Install RTK and set up global hook
- Set up GitNexus for code intelligence

### Prerequisites

- Node.js 20+
- OpenCode installed
- PostgreSQL (for backend)

### Manual Tool Setup

If you prefer to install tools manually:

#### RTK (Rust Token Killer)

Token compression — reduces CLI output by 60-90% before it reaches the AI context.

```bash
# Install
npm install -g rtk

# Initialize global hook (auto-rewrites commands)
rtk init --global

# Verify
rtk --version
```

**What it does:**
- `rtk git status` → compact output ("clean" instead of 3 lines)
- `rtk tsc` → TypeScript errors grouped by file (83% savings)
- `rtk next build` → build output with route metrics (87% savings)
- `rtk git diff` → only changed lines

**How it works:** RTK rewrites commands to produce compact output. When installed as a hook, it automatically prefixes Bash commands with `rtk`.

**OpenCode Hook:** The kit includes a pre-configured RTK hook at `.opencode/hooks/rtk-hook.sh`. This hook automatically rewrites Bash commands before execution. The hook configuration is in `.opencode/hooks.json`.

#### GitNexus

Code intelligence — indexes codebase into a knowledge graph for agents.

```bash
# Install
npm install -g gitnexus

# Setup (creates MCP config)
npx gitnexus setup

# Index your codebase
npx gitnexus analyze

# Verify
gitnexus --version
```

**What it does:**
- AST parsing → knowledge graph (KuzuDB)
- 7 MCP tools: query, context, impact, detect_changes, rename, cypher, generate_map
- Agents can ask: "What depends on this function?" or "What's the blast radius of this change?"

#### ICM (Intelligent Context Manager)

Persistent memory — agents remember across sessions.

```bash
# Install (requires Homebrew)
brew install rtk-ai/tap/icm

# Or download binary from: https://github.com/rtk-ai/icm/releases

# Initialize per-project
icm init --project

# Verify
icm --version
```

**What it does:**
- **Memories** — episodic, temporal decay (critical = forever, low = fades)
- **Memoirs** — permanent knowledge graphs (architecture decisions, domain models)
- **Feedback** — corrections when agent is wrong (closed-loop learning)

**Note:** ICM requires Xcode 26.3+ for Homebrew install. If unavailable, download the binary from GitHub releases.

#### AgentShield (Optional)

Security scanner for agent configurations.

```bash
# Install
npm install -g ecc-agentshield

# Scan
npx ecc-agentshield scan
```

### Install Kit (Manual)

```bash
# Clone into your project
git clone https://github.com/naviocean/opencode-kit.git

# Copy kit files to your project
cp -r opencode-kit/.opencode/ your-project/.opencode/
cp opencode-kit/AGENTS.md your-project/AGENTS.md

# Install NX (if not already)
npx create-nx-workspace@latest your-workspace
```

### Configure OpenCode

The kit includes a pre-configured `opencode.json` with MCP servers:

| MCP Server | Purpose | Package |
|---|---|---|
| **ICM** | Persistent memory across sessions | `icm` |
| **GitNexus** | Code intelligence (knowledge graph) | `gitnexus` |
| **Context7** | Official library documentation | `@upstash/context7-mcp` |
| **grep.app** | GitHub code search | `grep-mcp` |
| **Playwright** | Browser automation | `@playwright/mcp` |
| **Prisma** | Database migrations & queries | `prisma` (built-in) |

Some MCP servers require API keys. Set them as environment variables:

```bash
# Context7 (optional, for higher rate limits)
export CONTEXT7_API_KEY=your_key_here
```

## Commands

| Command | Description | Agent Flow |
|---|---|---|
| `/plan` | Socratic interview → spec → architecture plan | PM → Designer → Tech Lead |
| `/build` | Activate full team, parallel execution | Tech Lead → Frontend + Backend → QA |
| `/review` | Code review + security audit | Tech Lead + Security Auditor |
| `/ship` | Final tests + security gate + approval | QA + Security Auditor + Tech Lead |
| `/security` | Run AgentShield scan | Security Auditor |
| `/design` | Create UI Kit + UX flow | Designer |
| `/test` | Run test suite, analyze coverage | QA |

## Skills

106 skills total — 95 from [skills.sh](https://skills.sh) registry + 11 custom skills unique to this kit.

### From skills.sh (95 skills)

| Category | Skills | Source |
|---|---|---|
| **NX Official** | `nx-workspace`, `nx-generate`, `nx-run-tasks`, `nx-plugins`, `nx-import`, `link-workspace-packages`, `monitor-ci`, `nx-workspace-patterns` | [nrwl/nx-ai-agents-config](https://github.com/nrwl/nx-ai-agents-config) |
| **GitNexus** | `gitnexus-impact-analysis`, `gitnexus-exploring`, `gitnexus-refactoring`, `gitnexus-debugging`, `gitnexus-cli`, `gitnexus-guide`, `gitnexus-pr-review` | [abhigyanpatwari/gitnexus](https://github.com/abhigyanpatwari/gitnexus) |
| **Superpowers** | `brainstorming`, `writing-plans`, `systematic-debugging`, `tdd`, `requesting-code-review`, `receiving-code-review`, `using-git-worktrees`, `subagent-driven-development`, `verification-before-completion`, `dispatching-parallel-agents`, `executing-plans` | [obra/superpowers](https://github.com/obra/superpowers) |
| **Next.js** | `nextjs-app-router-patterns` | [wshobson/agents](https://github.com/wshobson/agents) |
| **React** | `react-components`, `react-state-management`, `vercel-react-best-practices` | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) |
| **NestJS** | `nestjs-best-practices` | [kadajett/agent-nestjs-skills](https://github.com/kadajett/agent-nestjs-skills) |
| **Prisma** | `prisma-database-setup`, `prisma-client-api`, `prisma-cli`, `prisma-postgres`, `prisma-postgres-setup` | [prisma/skills](https://github.com/prisma/skills) |
| **TypeScript** | `typescript-advanced-types` | [wshobson/agents](https://github.com/wshobson/agents) |
| **Testing** | `vitest`, `tdd`, `test-driven-development`, `playwright-best-practices`, `e2e-testing-patterns`, `javascript-testing-patterns` | [antfu/skills](https://github.com/antfu/skills), [mattpocock/skills](https://github.com/mattpocock/skills), [currents-dev](https://github.com/currents-dev/playwright-best-practices-skill) |
| **Design** | `shadcn`, `tailwind-design-system`, `design-md`, `stitch-loop`, `pencil-design`, `taste-design`, `design-taste-frontend`, `minimalist-ui`, `information-architecture`, `frontend-design`, `responsive-design`, `visual-design-foundations` | [shadcn/ui](https://github.com/shadcn/ui), [google-labs-code/stitch-skills](https://github.com/google-labs-code/stitch-skills), [leonxlnx/taste-skill](https://github.com/leonxlnx/taste-skill) |
| **RTK** | `rtk-tdd`, `code-simplifier`, `design-patterns` | [rtk-ai/rtk](https://github.com/rtk-ai/rtk) |
| **Architecture** | `architecture-decision-records`, `architecture-patterns`, `api-design-principles`, `monorepo-management`, `database-migration`, `openapi-spec-generation`, `sql-optimization-patterns`, `postgresql-table-design` | Various |
| **Security** | `security-requirement-extraction`, `secrets-management`, `auth-implementation-patterns` | Various |
| **Workflow** | `triage`, `issue-triage`, `pr-triage`, `handoff`, `brief-to-tasks`, `to-prd`, `to-issues`, `review-agent-setup`, `scan`, `diagnose`, `prototype`, `stripe-integration`, `billing-automation`, `changelog-automation`, `track-management`, `find-skills` | Various |

### Custom Skills (11 skills)

| Skill | Agent | Purpose |
|---|---|---|
| `orchestrate` | Tech Lead | Task breakdown, subagent dispatch, dependency ordering, code review |
| `socratic-planning` | PM | Interview before coding with HARD-GATE, scaling questions (from Superpowers brainstorming) |
| `continuous-learning` | All | Auto-extract patterns with confidence scoring (from ECC instincts) |
| `security-scan` | Security Auditor | AgentShield integration |
| `jwt-auth` | Backend | NestJS JWT implementation |
| `ux-flow` | Designer | User journey mapping |
| `coding-standards` | All | TypeScript strict conventions |
| `git-workflow` | All | Git branch/commit conventions |
| `react-components` | Frontend | React component patterns and best practices |
| `stitch-extract-design-md` | Designer | Extract design specs to DESIGN.md format |
| `stitch-generate-design` | Designer | Generate UI designs with Stitch |

## Document Standards

Standard templates for all project documentation. Agents use these templates when creating documents.

| Template | Used By | Output Path |
|---|---|---|
| [PRD Template](/.opencode/standards/prd-template.md) | PM | `docs/prds/` |
| [Design Doc Template](/.opencode/standards/design-doc-template.md) | Tech Lead + Designer | `docs/designs/` |
| [Implementation Plan](/.opencode/standards/plan-template.md) | Tech Lead | `docs/plans/` |
| [Task Breakdown](/.opencode/standards/task-template.md) | Tech Lead → Agents | `docs/tasks/` |
| [ADR Template](/.opencode/standards/adr-template.md) | Tech Lead | `docs/adr/` |
| [Security Review](/.opencode/standards/security-review-template.md) | Security Auditor | `docs/` |

### Document Lifecycle

```
User Request → PRD (PM) → Design Doc (TL+Designer) → Plan (TL) → Tasks (TL → Agents)
```

## Superpowers Patterns

This kit integrates key patterns from [Superpowers](https://github.com/obra/superpowers):

| Pattern | Description |
|---|---|
| **HARD-GATE** | No code before design approval. Applies to ALL requests. |
| **Socratic Planning** | One question at a time, scales 1-7 based on complexity |
| **Two-Stage Review** | Spec compliance FIRST, code quality SECOND |
| **Continuous Execution** | Don't stop between tasks — execute entire plan |
| **No Placeholders** | TBD/TODO in plans = plan failure |
| **Bite-Sized Tasks** | Each step is 2-5 minutes |
| **Model Selection** | Cheap for mechanical, capable for architecture |

## Rules

Always-follow guidelines injected into every session.

| Rule | Purpose |
|---|---|
| `coding-standards.md` | TypeScript strict, naming conventions, import order |
| `git-workflow.md` | Branch naming (`feat/`, `fix/`, `chore/`), commit format (conventional commits) |
| `testing-standards.md` | Minimum coverage, TDD for business logic, E2E for critical paths |
| `security-standards.md` | No hardcoded secrets, least privilege, input validation |

## Project Structure

```
opencode-kit/
├── README.md
├── AGENTS.md                          # Project rules (injected every session)
├── skills-lock.json                   # Skills version lock
│
├── .opencode/
│   ├── agents/ (7)                    # Agent definitions
│   ├── commands/ (7)                  # Slash commands
│   ├── rules/ (4)                     # Always-follow rules
│   ├── standards/ (7)                 # Document templates
│   ├── memory/ (2)                    # Continuous learning
│   ├── skills/ (106)                  # All skills
│   ├── hooks/                         # RTK hook
│   │   └── rtk-hook.sh
│   └── hooks.json                     # Hook configuration
│       ├── 95 from skills.sh
│       └── 11 custom
│
└── docs/                              # Document output
    ├── prds/                          # PRDs from /plan
    ├── designs/                       # Design docs
    ├── plans/                         # Implementation plans
    ├── adr/                           # Architecture decisions
    └── tasks/                         # Task breakdowns
```

## Borrowed Patterns

This kit stands on the shoulders of these open-source projects:

| Source | Pattern | How It's Used |
|---|---|---|
| [Superpowers](https://github.com/obra/superpowers) | Socratic brainstorming | PM interview before coding |
| Superpowers | TDD enforcement | RED-GREEN-REFACTOR cycle |
| Superpowers | Git worktrees | Parallel branch development |
| Superpowers | Subagent-driven dev | Fresh agent per task, two-stage review |
| [ECC](https://github.com/affaan-m/ECC) | SKILL.md format | Standard skill definition |
| ECC | Hook patterns | Pre/Post tool use hooks |
| ECC | Instinct-based learning | Continuous learning with confidence scoring |
| ECC | Verification loops | Checkpoint and continuous evaluation |
| ECC | AgentShield integration | Security scanning |
| [GitNexus](https://github.com/abhigyanpatwari/GitNexus) | Code intelligence | Knowledge graph for agents |
| [RTK](https://github.com/rtk-ai/rtk) | Token compression | 60-90% CLI output reduction |
| [ICM](https://github.com/rtk-ai/icm) | Persistent memory | Cross-session knowledge retention |

## License

MIT License

Copyright (c) 2026 naviocean

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Roadmap

### v1.0 (Current)

- ✅ 7 specialized agents (PM, Tech Lead, Designer, Frontend, Backend, QA, Security Auditor)
- ✅ 106 skills (95 from skills.sh + 11 custom)
- ✅ 7 commands (/plan, /build, /review, /ship, /design, /security, /test)
- ✅ Document standards (PRD, Design Doc, Plan, Task, ADR, Security Review templates)
- ✅ Superpowers patterns (HARD-GATE, Socratic, two-stage review, no placeholders)
- ✅ ICM memory integration
- ✅ GitNexus code intelligence integration
- ✅ AgentShield security scan workflow via Security Auditor
- ✅ Designer workflow with Stitch, Pencil, and DESIGN.md-oriented handoff
- ✅ CLI tool (npx opencode-saas-kit init/update/verify)

### v2.0 (Planned)

- 🔄 **Continuous Learning** — Hook-based observation, background observer agent, instinct extraction with confidence scoring, `/evolve` and `/instinct-status` commands
- 🔄 **RTK Token Compression** — Auto-rewrite Bash commands for 60-90% token reduction
- 🔄 **AgentShield Integration** — Expand automated security gating and reporting in `/review` and `/ship`
- 🔄 **Designer Agent Enhancement** — Standardize Stitch + Pencil handoff with richer DESIGN.md generation
- 🔄 **Multi-project Support** — Project-scoped instincts, cross-project pattern sharing
- 🔄 **CI/CD Integration** — GitHub Actions for automated /ship workflow
- 🔄 **Team Collaboration** — Instinct export/import, shared team patterns

### v3.0 (Future)

- 🔮 **Multi-harness Support** — Claude Code, Cursor, Codex compatibility
- 🔮 **Plugin Marketplace** — Share custom skills and agents
- 🔮 **Analytics Dashboard** — Agent performance, token usage, learning progress

## Credits

Built with patterns from [Superpowers](https://github.com/obra/superpowers) and [ECC](https://github.com/affaan-m/ECC).

Tools: [RTK](https://github.com/rtk-ai/rtk), [ICM](https://github.com/rtk-ai/icm), [GitNexus](https://github.com/abhigyanpatwari/GitNexus), [AgentShield](https://github.com/affaan-m/agentshield), [Stitch](https://stitch.withgoogle.com), [Pencil](https://pencil.dev).
