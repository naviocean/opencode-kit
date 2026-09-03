# OpenCode SaaS Kit — Agent Instructions

**You are an agent in a multi-agent SaaS development team.** This file is your entry point. It is intentionally short. For depth, follow the file map below.

## HARD RULES (never violate)

1. **Adaptive Socratic Sizing (S / M / L).** All requests are right-sized before implementation:
   - **Size S (< 50 LOC, bugfix, CSS/text, config):** Fast-track directly to domain specialist or `/hotfix`. Enforce strict TDD (RED → GREEN → REFACTOR) and AgentShield security scan. Zero PRD ceremony.
   - **Size M (Single endpoint, 1 component, isolated refactor):** Mini-Plan (`docs/plans/mini-*.md`) with 1-2 targeted questions. Skips formal 7-question PRD pipeline.
   - **Size L/XL (Cross-domain, multi-module, new feature/system):** Full Socratic pipeline (`/plan`) with PM interview (5-7 questions) → PRD → Architecture → Parallel Build (`/build`) → QA → Security.
2. **Spec before implementation for M & L.** A plan (`docs/plans/mini-*.md` for M, or `docs/prds/` + `docs/plans/` for L) must exist before specialist agents touch code. Size S bugfixes/tweaks require verified failing tests (TDD) before implementation.
3. **Tests before code (TDD).** RED → GREEN → REFACTOR for all business logic. 80%+ statement coverage required.
4. **Security before ship.** No agent ships without a security scan passing. Secrets in code = automatic block.
5. **No `any`, no `@ts-ignore`, no `console.log` in production code.** TypeScript strict mode, always.
6. **One logical change per commit.** Squash before merge. Never force-push to main.
7. **GitNexus MUST rules are not negotiable.** Each has a documented "if skipped, X risk" rationale.
8. **Cross-domain code is forbidden.** Frontend does not touch `apps/api/`. `nestjs` does not touch `apps/web/`. Rustacean owns Rust desktop apps (`apps/desktop/`), Axum microservices, and native crates (`crates/`), but does not touch `apps/web/`. `ai-engineer` owns AI/LLM workflows, LangGraph graphs, and RAG pipelines. `python-backend` owns Python server APIs, microservices, and background tasks. `devops` owns CI/CD (`.github/`), Docker (`Dockerfile`, `docker-compose`), and IaC (`infra/`, `k8s/`, `terraform/`) but does not touch application business logic. Escalate to Tech Lead.

## Agent Trigger Map

| If the request mentions… | Activate | Model |
|---|---|---|
| New feature, requirement unclear, prioritization, stakeholder, scope | **pm** | `commandcode/deepseek/deepseek-v4-pro` |
| Architecture decision, multi-agent dispatch, code review, final approval, plain-text request | **tech-lead** | `commandcode/deepseek/deepseek-v4-pro` |
| UI/UX, design tokens, UX flow, wireframe, Pencil/Stitch output, DESIGN.md | **designer** | `opencode/deepseek-v4-flash-free` |
| Next.js, React, Shadcn, Tailwind, `apps/web/`, component, page, RTK Query | **frontend** | `opencode/deepseek-v4-flash-free` |
| NestJS, Prisma, PostgreSQL, REST/GraphQL, JWT, `apps/api/`, DTO, migration | **nestjs** | `opencode/deepseek-v4-flash-free` |
| Rust, Tauri v2, Axum, Tokio, `apps/desktop/`, `src-tauri/`, `crates/`, IPC, systems programming | **rustacean** | `opencode/deepseek-v4-flash-free` |
| LLM agent, LangChain, LangGraph, RAG, prompt engineering, agentic loop, eval, StateGraph | **ai-engineer** | `opencode/deepseek-v4-flash-free` |
| Python API, FastAPI, microservice, SQLAlchemy, Alembic, Celery, async worker, pydantic | **python-backend** | `opencode/deepseek-v4-flash-free` |
| CI/CD, GitHub Actions, Docker, Kubernetes, Helm, Terraform, Prometheus, Grafana, deployment, infra | **devops** | `opencode/deepseek-v4-flash-free` |
| Test, coverage, vitest, playwright, flaky, regression, TDD enforcement | **qa** | `opencode/deepseek-v4-flash-free` |
| Audit, scan, CVE, secret, OWASP, prompt injection, permissions | **security-auditor** | `opencode/deepseek-v4-flash-free` |

## File Map

| Need | Location |
|---|---|
| **Coding standards** (TS strict, naming, imports) | `.opencode/standards/conventions.md` § Coding |
| **Security guidelines** (AgentShield, secret rules) | `.opencode/standards/conventions.md` § Security |
| **Testing requirements** (TDD, coverage thresholds) | `.opencode/standards/conventions.md` § Testing |
| **Git workflow** (commits, branches, PRs) | `.opencode/standards/conventions.md` § Git |
| **Anti-patterns** (blocking) | `.opencode/standards/conventions.md` § Anti-Patterns |
| **Document templates** (PRD, design, plan, ADR, task) | `.opencode/standards/*.md` |
| **Project-specific memory** (decisions, contracts, context) | `.agent-memory/` |
| **Agent definitions** (frontmatter, skills, MUST rules) | `.opencode/agents/<name>.md` |
| **Slash commands** (`/plan`, `/build`, etc.) | `.opencode/commands/<name>.md` |
| **Workflow rules** (always-on) | `.opencode/rules/*.md` |
| **Skill library** (skills) | `.opencode/skills/<category>/SKILL.md` |
| **Scripts + tests** | `scripts/`, `scripts/__tests__/` |
| **Runtime state** (gitignored) | `_workspace/` (harness checkpoints) |
| **End-user docs** (humans installing the kit) | `README.md` |

## Persistent Memory (Universal)

Project-specific memory persists across sessions in `.agent-memory/` (and via ICM for semantic retrieval):
- **Stack & Conventions**: Read `.agent-memory/project-context.md` before planning or architectural changes.
- **Decisions Log**: Tech Lead appends architectural decisions to `.agent-memory/decisions.md`.
- **Contracts**: Backend/Specialists update verified API endpoints & schemas to `.agent-memory/contracts.md`.
- **Learned Patterns**: Recorded in `.agent-memory/instincts.json` via continuous-learning.
- **Dynamic Semantic Retrieval**: Query via `icm recall "<query>"` / Store via `icm store -t <topic>`.

## Workflow Shortcuts

| Command | Phase | Reads | Writes |
|---|---|---|---|
| `/plan` | Phase 1 — Requirements | User request | `docs/prds/`, `docs/designs/`, `docs/plans/` |
| `/build` | Phase 2 — Implementation | Approved plan | `apps/`, `libs/` |
| `/review` | Phase 3 — Code review | `git diff` | Review verdict |
| `/ship` | Phase 4 — Deploy gate | All artifacts | Final approval |
| `/design` | Design only (no code) | Spec or brief | `docs/designs/`, `DESIGN.md` |
| `/security` | Security scan only | Any | Security report |
| `/test` | Run test suite + coverage | Any | Test report |
| `/hotfix` | Fast-track bugfix | Issue / error log | Bugfix diff + test report |

For command details, read `.opencode/commands/<name>.md`.

## Quick Start

```bash
# Install kit
npx opencode-saas-kit init

# Verify installation
npx opencode-saas-kit verify

# Start building
/plan "Build a SaaS dashboard with user auth, analytics, and billing"
```

## Skill Packs & Modular Presets

The kit groups 130+ specialized skills into installable domain packs (`.agent-core/skill-packs.json`), keeping AI context clean and focused:
- `core`: Base workflows, strict TDD, Git, security scanning, Socratic planning.
- `web-fullstack`: Next.js, React, Tailwind CSS, NestJS, UI design tokens.
- `python-ai`: FastAPI, async Python, LangGraph agents, RAG, LLM eval.
- `rust-systems`: Tokio async, Axum web framework, memory safety, RTK TDD.
- `devops-cloud`: GitHub Actions, Docker, K8s, Helm, Prometheus, SLOs.
- `web3`: Solidity security, DeFi protocols, NFT standards, Hardhat testing.
- `mobile`: React Native architecture, animations, iOS HIG, Android Material 3.
- `data-ml`: Apache Airflow, Spark optimization, MLOps, dbt, data contracts.

Manage packs via CLI:
```bash
npx opencode-saas-kit pack list
npx opencode-saas-kit pack add <pack-name>
npx opencode-saas-kit pack remove <pack-name>
npx opencode-saas-kit pack auto
```

For human-facing documentation (installation, configuration, troubleshooting), see `README.md`.

## Changelog

| Version | Date | Change |
|---|---|---|
| 1.3.3 | 2026-09-03 | Implement BMad Borrowed Point 3 (Skill Packs & Modular Presets): Defined 8 modular domain packs in `.agent-core/skill-packs.json`, created `scripts/skill-pack-manager.mjs`, integrated pack auto-detection into repo scanner and CLI (`npx opencode-saas-kit pack [list/add/remove/auto]`). 84 unit tests + 120 verification checks pass. |
| 1.3.2 | 2026-09-03 | Implement BMad patterns: Brownfield Repo Scanner (Node, Python, Rust, Go), Safe Context Markers (`<!-- opencode-saas-kit:start/end -->`), and Adaptive Socratic Sizing (S / M / L) with Mini-Plan template and triage-sizer. 80 unit tests + 120 verification checks pass. |
| 1.3.1 | 2026-09-03 | Implement Universal Dedicated Memory Architecture: decoupled neutral `.agent-memory/` SSoT across OpenCode, Claude Code, Antigravity, and Codex via symlinks; updated memory pointers and removed prompt-polluting memory from AGENTS.md/CLAUDE.md. |
| 1.3.0 | 2026-09-03 | Implement Universal Multi-Harness Architecture: SSoT `.agent-core/`, sync engine `scripts/sync-kit.mjs` with relative symlinks and copy fallback, multi-harness adapters for OpenCode, Claude Code (`CLAUDE.md`), Antigravity (`AGENTS.md`), and OpenAI Codex (`CODEX.md`), model SSoT via `agent-models.json` with preset profiles. 65 unit tests + 120 verification checks pass. |
| 1.2.7 | 2026-09-03 | Implement AgentShield Automated Security Gating (ECC Multi-tier Architecture): PreToolUse runtime guard hook (`.opencode/hooks/pre-tool-guard.mjs`), programmatic `security-gate.mjs` CLI with grade thresholds (Grade >= B), hard-gates in `/review` and `/ship`, and CI/CD GitHub Action (`.github/workflows/agentshield.yml`). Added unit test suites. |
| 1.2.6 | 2026-09-02 | Upgrade `rustacean` to full Rust Systems, Concurrency (Tokio), and High-Performance Services (Axum). Install 5 core Rust skills (`rust-async-patterns`, `memory-safety-patterns`, `rust-best-practices`, `rust-testing`, `axum-web-framework`). Total 157 skills. |
| 1.2.5 | 2026-09-02 | Refactor `backend` → `nestjs` and decompose `python` → `ai-engineer` + `python-backend`. Expand team to 11 specialized agents, 8 commands, 152 skills. |
| 1.2.4 | 2026-09-02 | Add 10th agent `devops` (SRE & Cloud Infrastructure). Install 13 DevOps skills (CI/CD, Docker, K8s, Helm, Terraform, Prometheus, Grafana, SLO). Synchronize docs and CLI to 10 agents, 8 commands, 152 skills. |
| 1.2.3 | 2026-09-02 | Add 8th command `/hotfix` (fast-track bugfix pipeline with TDD + QA + Security). Add 5 LangGraph skills to `python` agent. Synchronize docs and CLI to 9 agents, 8 commands, 140 skills. |
| 1.2.2 | 2026-08-05 | Add 9th agent `python` (senior Python dev for AI apps). Install 21 Python/AI skills (19 wshobson + pydantic-ai-harness + langchain). Fix pm/tech-lead `.pro` model. |
| 1.2.0 | 2026-06-01 | Refactor to pointer pattern. Detail moved to `.opencode/standards/conventions.md`. GitNexus MUST rules now have WHY annotations. Pushy descriptions on all 8 agents. Model-fallback uses runtime state (no MD mutation). Added test suite. |
| 1.2.1 | 2026-08-05 | Fix CLI MCP config to OpenCode format (`{type, command, enabled}`). Add `rustacean` to CLI verify. Install 10 missing skills (116 total). Fix stale skill references. |
| 1.1.0 | prior | Initial 8-agent / 111-skill / 7-command structure |
| 1.0.0 | prior | First release |
