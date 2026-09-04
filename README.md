# OpenCode SaaS Kit

A multi-agent development team kit for OpenCode. Eleven specialized AI agents work together like a real product team — PM, Tech Lead, Designer, Frontend, NestJS, AI Engineer, Python Backend, Rustacean, DevOps, QA, and Security Auditor — to build SaaS products from spec to ship.

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
- **Frontend / NestJS / AI Engineer / Python Backend / Rustacean** specialist agents work in parallel on their domains
- **AI Engineer** builds LangGraph multi-agent workflows, RAG pipelines, and LLM evaluation suites
- **Python Backend** builds FastAPI microservices, SQLAlchemy data layers, and async workers
- **Rustacean** owns Tauri desktop apps (`apps/desktop/`), Axum microservices, Tokio concurrency, and native crates (`crates/`)
- **DevOps** owns CI/CD, Docker, Kubernetes, Terraform, and Observability
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
     ┌────────┼────────┬───────────────┬────────────────┬───────────┬─────────┬────────┬─────────────────┐
     │        │        │               │                │           │         │        │                 │
     ▼        ▼        ▼               ▼                ▼           ▼         ▼        ▼                 ▼
 Frontend   NestJS   AI Engineer  Python Backend   Rustacean    DevOps       QA   Security Auditor
 /build     /build   /build       /build           /build       /build      /test  /review + /ship
```

### Agent Responsibilities

| Agent | Role | Key Tools |
|---|---|---|
| **Tech Lead** | Orchestrator. Architecture decisions, code review, dispatch work to parallel agents. Final approval on all changes. | GitNexus (impact analysis), ICM (architectural memory) |
| **PM** | Primary `/plan` entrypoint. Socratic interview before coding, writes specs, defines priorities, sets acceptance criteria. | Stitch (ideation), ICM (decision memory) |
| **Designer** | UI/UX specialist. Creates UI Kit, UX flows, design tokens, prototypes before frontend implementation. | Stitch (AI design), Pencil (IDE-native canvas) |
| **Frontend** | Next.js 16, React 19, Shadcn, Tailwind 4. Implements UI from Designer's specs. | GitNexus (code context), ICM (pattern memory) |
| **NestJS** | NestJS, Prisma, PostgreSQL, REST/GraphQL, JWT auth. Builds apps/api/ layer and business logic. | GitNexus (code context), ICM (pattern memory) |
| **AI Engineer** | LangGraph, LangChain, Pydantic-AI, RAG, prompt engineering, agentic loops, eval suites. | LangGraph, Pydantic v2, pytest, GitNexus |
| **Python Backend** | FastAPI, Starlette, SQLAlchemy, Alembic, Celery, async background workers, model serving APIs. | FastAPI, uv, pydantic, pytest, GitNexus |
| **Rustacean** | Tauri v2, Rust systems, Axum microservices, Tokio async, shared crates (`crates/`). Owns desktop apps and high-performance Rust services. | Cargo, Tokio, Axum, Tauri CLI, GitNexus |
| **DevOps** | CI/CD pipelines, Docker, Kubernetes/Helm, Terraform, Prometheus/Grafana observability. | GitHub Actions, Docker, Helm, Prometheus, Grafana |
| **QA** | Test strategy, Vitest unit tests, Playwright E2E, coverage analysis. Enforces TDD. | GitNexus (detect changes), ICM (test memory) |
| **Security Auditor** | AgentShield scans, OWASP checks, secret detection, permission audits. Gates deployment. | AgentShield CLI, ICM (security memory) |

## Tools Integration

### ICM (Intelligent Context Manager)

Persistent memory across sessions. All 10 agents share one SQLite database per project.

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
npx gitnexus analyze --skip-agents-md
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

## Model-per-Agent

Each agent runs on its own model. Configure in `.opencode/agent-models.json`:

```jsonc
{
  "default_fallback": ["my_xiaomi/mimo-v2.5"],
  "agents": {
    "tech-lead": { "model": "my_xiaomi/mimo-v2.5-pro", "fallback": ["my_xiaomi/mimo-v2.5"] },
    "pm":        { "model": "my_xiaomi/mimo-v2.5-pro", "fallback": ["my_xiaomi/mimo-v2.5"] },
    "designer":  { "model": "my_xiaomi/mimo-v2.5-pro", "fallback": ["my_xiaomi/mimo-v2.5"] },
    "frontend":  { "model": "my_xiaomi/mimo-v2.5",     "fallback": ["my_xiaomi/mimo-v2.5-pro"] },
    "nestjs":    { "model": "my_xiaomi/mimo-v2.5",     "fallback": ["my_xiaomi/mimo-v2.5-pro"] },
    "rustacean": { "model": "my_xiaomi/mimo-v2.5",     "fallback": ["my_xiaomi/mimo-v2.5-pro"] },
    "python":    { "model": "my_xiaomi/mimo-v2.5",     "fallback": ["my_xiaomi/mimo-v2.5-pro"] },
    "devops":    { "model": "my_xiaomi/mimo-v2.5",     "fallback": ["my_xiaomi/mimo-v2.5-pro"] },
    "qa":        { "model": "my_xiaomi/mimo-v2.5",     "fallback": ["my_xiaomi/mimo-v2.5-pro"] },
    "security-auditor": { "model": "my_xiaomi/mimo-v2.5", "fallback": ["my_xiaomi/mimo-v2.5-pro"] }
  }
}
```

Model is enforced via YAML frontmatter in each agent `.md` file. Opencode reads `model:` and applies it when spawning the agent:

```yaml
---
name: nestjs
description: NestJS, Prisma, PostgreSQL
mode: subagent
model: my_xiaomi/mimo-v2.5
---
```

### Model Routing

Opencode routes each subagent to its configured model via the `model:` field in
each agent's frontmatter (enforced by `verify.mjs` § 7 cross-check). No runtime
override layer is used — the frontmatter IS the source of truth.

```bash
# Diagnostic: test model availability (read-only, does not change config)
node scripts/model-health-check.mjs        # all agents
node scripts/model-health-check.mjs nestjs # single agent
```

### Model & Skill Sync

`.opencode/agent-models.json` is the single source of truth for agent models. Whenever you update models in `agent-models.json`, run:

```bash
# Auto-sync models to .opencode/agents/*.md frontmatter + regenerate agent-registry.json
node scripts/skill-registry.mjs

# Optional: sync models AND run health check to update model-health.json in one command
node scripts/skill-registry.mjs --health
```

## Skill Auto-Load

Agents automatically load their skills at startup — no need to pass `load_skills` manually.

Each agent `.md` file has a `## Startup (AUTO-EXECUTE)` section that:

1. Reads `.opencode/agent-registry.json`
2. Loads all `skills.always` via `skill(name="...")`
3. Loads `skills.conditional` when task context matches

```markdown
## Startup (AUTO-EXECUTE)

Before doing ANYTHING else, load your mandatory skills:

1. Read `.opencode/agent-registry.json`
2. Find your agent name in `agents`
3. Load ALL skills in `skills.always` — call `skill(name="...")` for each
4. For `skills.conditional` — load when task context matches
```

### How It Works

```
Agent MD files (skills section)
        │
        ▼
skill-registry.mjs → agent-registry.json
        │
        ▼
Agent Startup section reads registry
        │
        ▼
skill(name="nestjs-best-practices")  ← auto-loaded
```

### Verify Configuration

```bash
# Check all agents, models, skills, hooks
node scripts/verify.mjs
```

## Tech Stack

| Layer | Technology |
|---|---|
| Language | TypeScript (strict mode) |
| Monorepo | NX |
| Frontend | Next.js 16 (App Router) + React 19 + Shadcn + Tailwind 4 |
| Backend | NestJS + Prisma + PostgreSQL |
| API | REST or GraphQL (per-project decision) |
| Auth | Custom JWT (NestJS Passport) |
| State | React hooks + Context (or per-project choice) |
| Testing | Vitest (unit/integration) + Playwright (E2E) |
| Memory | ICM (Intelligent Context Manager) |
| Code Intelligence | GitNexus |
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
│Frontend│ │ NestJS │  Parallel execution
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
# One command — Brownfield scan, universal setup, and safe context markers
npx opencode-saas-kit init

# Or install kit + tools (gitnexus)
npx opencode-saas-kit init --tools
```

This will:
- Run Brownfield repository scan (detecting Node, Python, Rust, Go) → `.agent-memory/project-context.md`
- Install Single Source of Truth (`.agent-core/`) with 11 agents, 8 commands, 4 rules, skills, standards
- Safely inject kit instructions into `AGENTS.md` and `CLAUDE.md` using safe context markers (`<!-- opencode-saas-kit:start/end -->`) preserving human custom rules
- Set up Universal Persistent Memory in `.agent-memory/`
- Synchronize adapters across OpenCode (`.opencode/`), Claude Code (`CLAUDE.md`), Antigravity (`.agents/`, `AGENTS.md`), and OpenAI Codex
- Configure `opencode.json` with recommended MCP servers

### Prerequisites

- Node.js 20+
- OpenCode installed
- PostgreSQL (for backend)

### Manual Tool Setup

If you prefer to install tools manually:

#### GitNexus

Code intelligence — indexes codebase into a knowledge graph for agents.

```bash
# Install
npm install -g gitnexus

# Setup (creates MCP config)
npx gitnexus setup

# Index your codebase
npx gitnexus analyze --skip-agents-md

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
| `/build` | Activate full team, parallel execution | Tech Lead → Dynamic Specialists → QA |
| `/review` | Code review + security audit | Tech Lead + Security Auditor |
| `/ship` | Final tests + security gate + approval | QA + Security Auditor + Tech Lead |
| `/security` | Run AgentShield scan | Security Auditor |
| `/design` | Create UI Kit + UX flow | Designer |
| `/test` | Run test suite, analyze coverage | QA |
| `/hotfix` | Fast-track bugfix or urgent patch | Tech Lead → Specialist → QA → Security Auditor |

## Skills & Skill Packs

The kit includes **273 skills** organized into modular, **agent-centric skill packs** (`.agent-core/skill-packs.json`). Each pack covers 100% of the skills required by the corresponding squad, ensuring zero missing skills:

- **`core`**: Core Leadership & Quality Gate (`tech-lead`, `pm`, `qa`, `security-auditor`) — 74 skills
- **`web-frontend`**: Frontend & UI/UX Design Squad (`frontend`, `designer`) — 44 skills
- **`nestjs-backend`**: NestJS & TypeScript Backend Squad (`nestjs`) — 24 skills
- **`python-ai`**: Python & AI Engineering Squad (`ai-engineer`, `python-backend`) — 26 skills
- **`rust-systems`**: Rust Systems & High-Performance Squad (`rustacean`) — 11 skills
- **`devops-infra`**: DevOps & SRE Infrastructure Squad (`devops`) — 16 skills

### Skill Pack CLI Management

Manage domain skill packs dynamically:

```bash
# List all packs and their active/inactive status
npx opencode-saas-kit pack list

# Automatically detect tech stack and activate matching packs
npx opencode-saas-kit pack auto

# Activate a domain pack
npx opencode-saas-kit pack add rust-systems

# Deactivate a domain pack
npx opencode-saas-kit pack remove python-ai
```

## Adaptive Socratic Sizing (S / M / L)

Not all tasks need a heavy PRD and multi-agent ceremony. Requests are right-sized before implementation:

- **Size S (< 50 LOC, bugfix, CSS/text, config):**
  Fast-track directly to domain specialist or `/hotfix`. Strict TDD (RED → GREEN → REFACTOR) and AgentShield security scan. Zero PRD ceremony.
- **Size M (Single endpoint, 1 component, isolated refactor):**
  Mini-Plan (`docs/plans/mini-*.md`) with 1-2 targeted questions. Skips formal 7-question PRD pipeline.
- **Size L/XL (Cross-domain, multi-module, new feature/system):**
  Full Socratic pipeline (`/plan`) with PM interview (5-7 questions) → PRD → Architecture → Parallel Build (`/build`) → QA → Security.

## Document Standards

Standard templates for all project documentation. Agents use these templates when creating documents.

| Template | Used By | Output Path |
|---|---|---|
| [Mini-Plan Template](/.agent-core/standards/mini-plan-template.md) | Tech Lead / Specialists | `docs/plans/mini-*.md` |
| [PRD Template](/.agent-core/standards/prd-template.md) | PM | `docs/prds/` |
| [Design Doc Template](/.agent-core/standards/design-doc-template.md) | Tech Lead + Designer | `docs/designs/` |
| [Implementation Plan](/.agent-core/standards/plan-template.md) | Tech Lead | `docs/plans/` |
| [Task Breakdown](/.agent-core/standards/task-template.md) | Tech Lead → Agents | `docs/tasks/` |
| [ADR Template](/.agent-core/standards/adr-template.md) | Tech Lead | `docs/adr/` |
| [Security Review](/.agent-core/standards/security-review-template.md) | Security Auditor | `docs/` |

### Document Lifecycle

```
Size S:  Issue / Bug Log ───────────────→ /hotfix ───→ TDD (Red-Green) ──→ Security Gate
Size M:  User Request ──→ Mini-Plan ────→ Specialist ─→ Tests ───────────→ Security Gate
Size L:  User Request ──→ PRD (PM) ─────→ Design Doc ─→ Plan (TL) ───────→ Parallel Build → QA → Ship
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
├── README.md                          # Human-facing documentation
├── AGENTS.md                          # Universal project rules (Antigravity & OpenAI Codex)
├── CLAUDE.md                          # Claude Code instructions
├── package.json                       # npm package config (v1.3.4)
│
├── .agent-core/                       # Single Source of Truth (SSoT)
│   ├── agents/ (11)                   # Agent definitions
│   ├── commands/ (8)                  # Slash commands
│   ├── rules/ (4)                     # Always-follow rules
│   ├── standards/ (8)                 # Document templates + conventions.md + mini-plan
│   ├── skills/ (273)                  # Skill library
│   ├── skill-packs.json               # Modular skill pack definitions (100% agent coverage)
│   └── hooks/                         # Security hooks (pre-tool-guard.mjs)
│
├── .agent-memory/                     # Universal persistent memory (neutral SSoT)
│   ├── project-context.md             # Stack & conventions
│   ├── decisions.md                   # Architecture decisions log
│   ├── contracts.md                   # Verified endpoints & schemas
│   └── instincts.json                 # Continuous learning
│
├── .opencode/                         # OpenCode Adapter (symlinks + opencode.json)
├── .agents/                           # Antigravity & OpenAI Codex Adapter
├── .claude/                           # Claude Code Adapter
│
├── scripts/                           # Toolchain & verification scripts
│   ├── sync-kit.mjs                   # Universal multi-harness sync engine
│   ├── repo-scanner.mjs               # Brownfield tech stack scanner
│   ├── triage-sizer.mjs               # Adaptive S/M/L request sizer
│   ├── skill-pack-manager.mjs         # Skill pack manager & CLI
│   ├── security-gate.mjs              # AgentShield programmatic security gate
│   ├── verify.mjs                     # E2E test verification
│   └── __tests__/ (12 suites)         # 90 unit tests
│
└── docs/                              # Document output directories
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
| [BMad Method](https://github.com/bmad-code-org/bmad-method) | Brownfield Onboarding | `repo-scanner.mjs` auto-profiles existing repos (Node, Python, Rust, Go) |
| BMad Method | Safe Context Markers | `<!-- opencode-saas-kit:start/end -->` preserves custom human rules |
| BMad Method | Adaptive Socratic Sizing | Right-sized triage (S bugfix, M mini-plan, L full PRD) |
| BMad Method | Modular Skill Packs | Squad-centric skill packs with 100% agent coverage & auto-detection |
| [ECC](https://github.com/affaan-m/ECC) | SKILL.md format | Standard skill definition |
| ECC | Hook patterns | Pre/Post tool use hooks |
| ECC | Instinct-based learning | Continuous learning with confidence scoring |
| ECC | Verification loops | Checkpoint and continuous evaluation |
| ECC | AgentShield integration | Security scanning |
| [GitNexus](https://github.com/abhigyanpatwari/GitNexus) | Code intelligence | Knowledge graph for agents |
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

### v1.3.4 (Current)

- ✅ **CLI ReferenceError Fix** — Fixed `ReferenceError: kitDir is not defined` in `bin/cli.js` `initProject()`.
- ✅ **Automated CLI Regression Test Suite** — Added `scripts/__tests__/cli.test.mjs` verifying subcommands (`init --dry-run`, `sync`, `pack list`, `--help`, `verify`).
- ✅ **Test & Verification Suite** — 90 unit tests across 12 test suites + 132 E2E verification checks passing.

### v1.3.3

- ✅ **Skill Packs & Modular Presets (BMad Borrowed Pattern)** — Defined 6 agent-centric domain packs in `.agent-core/skill-packs.json` guaranteeing 100% agent skill coverage with zero deficit.
- ✅ **Skill Pack Manager CLI** — Added `scripts/skill-pack-manager.mjs` and CLI commands `npx opencode-saas-kit pack [list/add/remove/auto]`.
- ✅ **Auto-detection Integration** — Integrated pack auto-detection into repo scanner to automatically activate domain packs matching codebase.

### v1.3.2

- ✅ **Brownfield Repo Scanner** — `scripts/repo-scanner.mjs` automatically profiles Node.js, Python, Rust, and Go codebases into `.agent-memory/project-context.md`.
- ✅ **Safe Context Markers** — `<!-- opencode-saas-kit:start/end -->` markers preserve human custom instructions in `AGENTS.md` and `CLAUDE.md`.
- ✅ **Adaptive Socratic Sizing (S / M / L)** — Sized development flow: Size S fast-track bugfix/hotfix, Size M Mini-Plan (`mini-plan-template.md`), Size L full PRD + architecture pipeline.

### v1.3.1

- ✅ **Universal Dedicated Memory Architecture** — Decoupled persistent memory into neutral `.agent-memory/` SSoT across OpenCode, Claude Code, Antigravity, and Codex via symlinks.

### v1.3.0

- ✅ **Universal Multi-Harness Architecture** — Cross-platform compatibility with OpenCode (`.opencode/`), Claude Code (`.claude/`, `CLAUDE.md`), Antigravity (`.agents/`, `AGENTS.md`), and OpenAI Codex (`.codex/`, `CODEX.md`).
- ✅ **Single Source of Truth (`.agent-core/`)** — Centralized repository of 11 agent roles, 273 skills, standards, templates, and commands with zero disk duplication via relative symlinks (with automated copy fallback).
- ✅ **Single Source of Truth for Models (`agent-models.json`)** — Directly configure models in `agent-models.json`, and run `npm run sync` or `npx opencode-saas-kit sync` to propagate across all agent frontmatters and platform configs.
- ✅ **Model Presets** — Ready-to-use model configurations (`agent-models-opencode.json`, `agent-models-claude.json`, `agent-models-antigravity.json`, `agent-models-codex.json`). Switch dynamically with `npm run sync -- --preset <name>`.
- ✅ **Sync Engine CLI** — `npx opencode-saas-kit sync` (with `--target`, `--preset`, `--mode`, `--dry-run`).

### v1.2.7 (Previous)

- ✅ 11 specialized agents (PM, Tech Lead, Designer, Frontend, NestJS, AI Engineer, Python Backend, Rustacean, DevOps, QA, Security Auditor)
- ✅ 157 skills (146 from skills.sh + 11 custom)
- ✅ 8 commands (/plan, /build, /review, /ship, /design, /security, /test, /hotfix) — each with Phase 0 context check, pushy descriptions, Execution Mode
- ✅ **AgentShield Automated Security Gating (ECC Architecture)** — Multi-tier runtime defense: PreToolUse guard hook (`pre-tool-guard.mjs`), programmatic security gate (`security-gate.mjs`) with exit code gating (Grade >= B), hard-gates in `/review` and `/ship`, and CI/CD GitHub Action (`.github/workflows/agentshield.yml`)
- ✅ Document standards (PRD, Design Doc, Plan, Task, ADR, Security Review templates + conventions.md)
- ✅ AGENTS.md pointer pattern — detail moved to `.opencode/standards/conventions.md`
- ✅ GitNexus MUST rules with "because X, if skipped Y" annotations on all 9 agents
- ✅ Model-per-agent via frontmatter `model:` (opencode-native routing, verified by `verify.mjs` § 7)
- ✅ Test suite: `verify.mjs` (120 checks) + 5 test suites (58 unit tests including security-gate & pre-tool-guard)
- ✅ Superpowers patterns (HARD-GATE, Socratic, two-stage review, no placeholders)
- ✅ ICM memory integration
- ✅ GitNexus code intelligence integration
- ✅ Designer workflow with Stitch, Pencil, and DESIGN.md-oriented handoff
- ✅ CLI tool (npx opencode-saas-kit init/update/verify)

### v2.0 (Planned)

- 🔄 **Continuous Learning** — Hook-based observation, background observer agent, instinct extraction with confidence scoring, `/evolve` and `/instinct-status` commands
- 🔄 **Designer Agent Enhancement** — Standardize Stitch + Pencil handoff with richer `DESIGN.md` generation (tokens, typography, spacing, component specs)
- 🔄 **Multi-project Support** — Project-scoped instincts, cross-project pattern sharing
- 🔄 **CI/CD Integration** — GitHub Actions for automated `/ship` workflow, test execution, container builds, and deployment pipelines
- 🔄 **Team Collaboration** — Instinct export/import, shared team patterns

### v3.0 (Future)

- 🔮 **Plugin Marketplace** — Share custom skills and agents
- 🔮 **Analytics Dashboard** — Agent performance, token usage, learning progress

## Credits

Built with patterns from [Superpowers](https://github.com/obra/superpowers) and [ECC](https://github.com/affaan-m/ECC).

Tools: [ICM](https://github.com/rtk-ai/icm), [GitNexus](https://github.com/abhigyanpatwari/GitNexus), [AgentShield](https://github.com/affaan-m/agentshield), [Stitch](https://stitch.withgoogle.com), [Pencil](https://pencil.dev).

