# OpenCode SaaS Kit — Agent Instructions

**Version:** 1.1.0 | **Agents:** 8 | **Skills:** 111 | **Commands:** 7

## Overview

Multi-agent development team kit for building SaaS products. Eight specialized AI agents work together like a real product team — PM, Tech Lead, Designer, Frontend, Backend, Rustacean, QA, and Security Auditor — following structured workflows from spec to ship.

## Core Principles

1. **Plan Before Code** — PM interviews with Socratic method before new features. Small fixes/tweaks routed directly by Tech Lead via Task Triage (see Agent Orchestration)
2. **Design Before Build** — Designer creates UI Kit + UX flows before Frontend implements
3. **Test-Driven** — Write tests before code. RED → GREEN → REFACTOR. 80%+ coverage required
4. **Security-First** — Never compromise on security. Scan before ship.
5. **Parallel Execution** — Frontend + Backend work simultaneously when possible
6. **Evidence Over Claims** — Verify before declaring success

## Tech Stack

| Layer | Technology |
|---|---|
| Language | TypeScript (strict mode), Rust |
| Monorepo | NX |
| Frontend | Next.js 16 + React 19 + Shadcn + Tailwind 4 |
| Backend | NestJS + Prisma + PostgreSQL |
| Desktop | Tauri v2 + Rust + React/SolidJS |
| API | REST or GraphQL (per-project decision) |
| Auth | Custom JWT (NestJS Passport) |
| State | React hooks + Context (or per-project choice) |
| Testing | Vitest (unit/integration) + Playwright (E2E) + cargo test |

## Agent Orchestration

| Agent | Role | When to Activate |
|---|---|---|
| **Tech Lead** | Orchestrator. Architecture decisions, task breakdown, code review (final). | Always. Coordinates workflow. |
| **PM** | Socratic interview. Writes specs, defines priorities, acceptance criteria. | `/plan` — Before any feature work |
| **Designer** | UI/UX specialist. UI Kit, UX flows, design tokens, prototypes. | `/plan`, `/design` — Before Frontend implementation |
| **Frontend** | Next.js 16, React 19, Shadcn, Tailwind 4. | `/build` — Implements web app UI from Designer's specs |
| **Backend** | NestJS, Prisma, PostgreSQL, REST/GraphQL, JWT auth. | `/build` — Implements API and business logic |
| **Rustacean** | Rust, Tauri desktop apps, native integrations. Full stack desktop — Rust + UI. | `/build` — Implements Tauri desktop app end-to-end |
| **QA** | Test strategy, Vitest, Playwright, coverage analysis, TDD enforcement. | `/build`, `/test` — Verifies quality |
| **Security Auditor** | AgentShield scans, OWASP checks, secret detection. | `/review`, `/ship` — Gates deployment |

### Dispatch Rules

- Tech Lead is the **single entry point** for all requests. For plain-text requests (no slash command), Tech Lead classifies task size and dispatches a single agent directly for small tasks (see Task Triage Protocol in `.opencode/agents/tech-lead.md`)
- For `/build`: Tech Lead dispatches work to Frontend + Backend + Rustacean **in parallel**
- Each agent owns their domain — don't cross boundaries
- Use category-based delegation: `deep` (complex), `quick` (simple), `ultrabrain` (architecture)
- Tech Lead has **final approval** on all changes

## Development Workflow

### Phase 1: Plan (`/plan`)

```
User Request → PM (Socratic) → Designer (UI/UX) → Tech Lead (Architecture)
                  ↓                    ↓                    ↓
             PRD/Spec            Design Doc          Implementation Plan
           docs/prds/          docs/designs/         docs/plans/
```

- PM asks 5-7 clarifying questions before writing spec
- Designer creates UI Kit + UX flows from approved spec
- Tech Lead creates architecture + task breakdown
- All documents follow templates in `.opencode/standards/`

**Note:** Socratic method applies to ALL requests, not just `/plan`. Even small requests get 1-2 clarifying questions before implementation.

**Design Approval (HARD-GATE):**
- Design approval is MANDATORY before UI implementation begins
- Non-UI tasks (API, database, migrations, security audits, config) skip the Designer
- Propose 2-3 approaches with trade-offs before settling on one
- Present design in sections, get approval after each section
- Spec self-review before presenting to user for approval

### Phase 2: Build (`/build`)

```
Tech Lead → Frontend + Backend + Rustacean (parallel) → QA → Security Auditor
                ↓              ↓              ↓          ↓           ↓
           Components      API/DB        Desktop      Tests pass   Scan pass
```

- Tech Lead dispatches parallel tasks
- Frontend implements web UI, Backend implements API, Rustacean implements desktop app
- QA runs `nx affected -t test` after each change
- Security Auditor scans for vulnerabilities

### Phase 3: Review (`/review`)

```
Tech Lead (code review) + Security Auditor (security scan)
                ↓                        ↓
         Patterns, quality         AgentShield, OWASP
         GitNexus impact           Secret detection
```

- Tech Lead reviews code quality, architecture, patterns
- Security Auditor runs AgentShield scan (102 rules)
- Both must approve before merge

### Phase 4: Ship (`/ship`)

```
QA (full tests) → Security Auditor (final gate) → Tech Lead (approval)
       ↓                    ↓                           ↓
  vitest + playwright   Grade A/B required         Final sign-off
```

## Security Guidelines

**Before ANY commit:**
- No hardcoded secrets (API keys, passwords, tokens)
- All user inputs validated at API boundary
- SQL injection prevention (Prisma parameterized queries)
- XSS prevention (React auto-escaping)
- CSRF protection enabled
- Rate limiting on auth endpoints
- Error messages don't leak sensitive data

**Secret management:** NEVER hardcode secrets. Use environment variables. Validate required secrets at startup. Rotate exposed secrets immediately.

**If security issue found:** STOP → Security Auditor agent → fix CRITICAL issues → rotate secrets → review for similar issues.

## Coding Standards

**TypeScript strict mode. No exceptions.**

- No `any` type — use `unknown` and narrow
- No `@ts-ignore` or `@ts-expect-error`
- Explicit return types on exported functions
- Prefer `interface` for objects, `type` for unions
- Max 30 lines per function, 300 lines per file
- Prefer early returns, guard clauses
- No magic numbers — extract to named constants

**Naming:**
- Variables/functions: `camelCase`
- Classes/interfaces: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Files: `kebab-case.ts`, Components: `PascalCase.tsx`

**Imports:**
```
1. Node built-ins
2. External packages
3. Internal absolute (@shared/*)
4. Internal relative (./)
```

## Testing Requirements

**Minimum coverage: 80% statements, 75% branches**

| Layer | Tool | What to Test |
|---|---|---|
| Unit | Vitest | Business logic, utilities, hooks |
| Component | Vitest + RTL | React component rendering, interactions |
| Integration | Vitest + Supertest | API endpoints, database operations |
| E2E | Playwright | Critical user flows only |

**TDD workflow (mandatory for business logic):**
1. RED — Write failing test
2. GREEN — Write minimal code to pass
3. REFACTOR — Clean up while keeping green
4. DELETE — Remove code written before test

**Test naming:** `describe('ClassName') → describe('methodName') → it('should [behavior] when [condition]')`

## Git Workflow

**Commit format:** `type(scope): description`

| Type | When |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code change (no feature/fix) |
| `test` | Adding tests |
| `docs` | Documentation |
| `chore` | Build, tooling, dependencies |

**Branch naming:** `feat/`, `fix/`, `chore/`, `docs/` + short description

**Rules:**
- One logical change per commit
- Squash and merge for feature branches
- Never force push to main
- Delete branch after merge

## Document Standards

All documents follow templates in `.opencode/standards/`:

| Document | Template | Created By | Output |
|---|---|---|---|
| PRD | `prd-template.md` | PM | `docs/prds/` |
| Design Doc | `design-doc-template.md` | Tech Lead + Designer | `docs/designs/` |
| Implementation Plan | `plan-template.md` | Tech Lead | `docs/plans/` |
| Task Breakdown | `task-template.md` | Tech Lead | `docs/tasks/` |
| ADR | `adr-template.md` | Tech Lead | `docs/adr/` |
| Security Review | `security-review-template.md` | Security Auditor | `docs/` |

## Tools & MCP Servers

| Tool | Purpose | Auto-configured |
|---|---|---|
| **RTK** | Token compression (60-90% CLI output reduction) | `rtk init --global` |
| **ICM** | Persistent memory across sessions | `icm init --project` |
| **GitNexus** | Code intelligence (knowledge graph) | `npx gitnexus setup` |
| **Context7** | Official library documentation | Yes (MCP) |
| **grep.app** | GitHub code search | Yes (MCP) |
| **Playwright** | Browser automation | Yes (MCP) |
| **Prisma** | Database migrations & queries | Yes (MCP) |

## GitNexus — Keep Index Fresh

After committing significant code changes, re-index the knowledge graph:

```bash
npx gitnexus analyze --skip-agents-md
```

The `--skip-agents-md` flag prevents GitNexus from overwriting this manually curated AGENTS.md.

## Memory & Learning

- **ICM memory**: `.icm/memory.db` — shared across all agents
- **Project memory**: `.opencode/memory/project-context.md`
- **Continuous learning**: `.opencode/memory/instincts.json` — auto-extracted patterns with confidence scoring
- **Document output**: `docs/` — PRDs, designs, plans, tasks, ADRs

## Anti-Patterns (BLOCKING)

**Code:**
- ❌ `as any`, `@ts-ignore`, `@ts-expect-error`
- ❌ Empty catch blocks `catch(e) {}`
- ❌ Deleting failing tests to "pass"
- ❌ Hardcoded secrets
- ❌ Console.log in production code
- ❌ `.unwrap()` / `.expect()` in production Rust code
- ❌ Holding `MutexGuard` across `.await` in Rust
- ❌ Unnecessary `.clone()` to satisfy borrow checker

**Workflow:**
- ❌ Skipping the planning phase for new features (small fixes/tweaks dispatch via Tech Lead Triage)
- ❌ Writing code without tests
- ❌ Committing directly to main
- ❌ Skipping security scan before ship
- ❌ Cross-domain code changes (Frontend touching Backend, Rustacean touching web app)
- ❌ Skipping design for UI tasks (non-UI tasks skip the Designer)
- ❌ Implementing without user approval on design
- ❌ Single review (must be two-stage: spec compliance + code quality)
- ❌ Asking "should I continue?" between tasks (continuous execution)
- ❌ Using capable model for mechanical tasks (waste of resources)
- ❌ Placeholder content in plans (TBD, TODO, "similar to Task N")
- ❌ Accepting "close enough" on spec compliance

**Git:**
- ❌ Force push to main
- ❌ Mega PRs (one logical change per PR)
- ❌ Vague commit messages

## Project Structure

```
project/
├── .opencode/
│   ├── agents/              7 agent definitions
│   ├── commands/            7 slash commands
│   ├── rules/               4 always-follow rules
│   ├── standards/           7 document templates
│   ├── memory/              Continuous learning
│   └── skills/              106 skills
│
├── docs/
│   ├── prds/                PRDs from /plan
│   ├── designs/             Design docs
│   ├── plans/               Implementation plans
│   ├── adr/                 Architecture decisions
│   └── tasks/               Task breakdowns
│
├── apps/
│   ├── web/                 Next.js 16
│   │   ├── src/
│   │   ├── e2e/
│   │   ├── vitest.config.ts
│   │   └── playwright.config.ts
│   ├── api/                 NestJS
│   │   ├── src/
│   │   ├── test/
│   │   └── vitest.config.ts
│   └── desktop/             Tauri v2 + Rust
│       ├── src-tauri/       Rust backend
│       ├── src/             Desktop UI
│       └── vite.config.ts
│
├── libs/
│   └── shared/
│       ├── types/           DTOs, interfaces
│       ├── test-utils/      Shared fakes, fixtures
│       └── utils/           Pure functions
│
├── AGENTS.md                This file
├── opencode.json            MCP configuration
├── nx.json                  NX configuration
└── package.json
```

## Commands

```bash
/plan      PM Socratic interview → spec → design → plan
/build     Parallel execution (Frontend + Backend → QA)
/review    Code review + security audit
/ship      Final tests + security gate + approval
/design    Create UI Kit + UX flow
/security  Run AgentShield scan
/test      Run test suite, analyze coverage
```

## Quick Start

```bash
# Install kit
npx opencode-saas-kit init

# Verify installation
npx opencode-saas-kit verify

# Start building
/plan "Build a SaaS dashboard with user auth, analytics, and billing"
```


