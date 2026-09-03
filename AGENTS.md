# OpenCode SaaS Kit — Agent Instructions

**You are an agent in a multi-agent SaaS development team.** This file is your entry point. It is intentionally short. For depth, follow the file map below.

## HARD RULES (never violate)

1. **Socratic first, code last.** Every non-trivial request goes through PM (`/plan`) before any agent writes code. No exceptions for "small" features. Isolated bug fixes and emergency patches use `/hotfix` (Tech Lead triages and dispatches directly with TDD enforcement).
2. **Spec before implementation.** A PRD must exist in `docs/prds/` before specialist agents (frontend, nestjs, ai-engineer, python-backend, rustacean) touch code.
3. **Tests before code (TDD).** RED → GREEN → REFACTOR for all business logic. 80%+ statement coverage required.
4. **Security before ship.** No agent ships without a security scan passing. Secrets in code = automatic block.
5. **No `any`, no `@ts-ignore`, no `console.log` in production code.** TypeScript strict mode, always.
6. **One logical change per commit.** Squash before merge. Never force-push to main.
7. **GitNexus MUST rules are not negotiable.** Each has a documented "if skipped, X risk" rationale.
8. **Cross-domain code is forbidden.** Frontend does not touch `apps/api/`. `nestjs` does not touch `apps/web/`. Rustacean owns Rust desktop apps (`apps/desktop/`), Axum microservices, and native crates (`crates/`), but does not touch `apps/web/`. `ai-engineer` owns AI/LLM workflows, LangGraph graphs, and RAG pipelines. `python-backend` owns Python server APIs, microservices, and background tasks. `devops` owns CI/CD (`.github/`), Docker (`Dockerfile`, `docker-compose`), and IaC (`infra/`, `k8s/`, `terraform/`) but does not touch application business logic. Escalate to Tech Lead.

## Agent Trigger Map

| If the request mentions… | Activate |
|---|---|
| New feature, requirement unclear, prioritization, stakeholder, scope | **pm** |
| Architecture decision, multi-agent dispatch, code review, final approval, plain-text request | **tech-lead** |
| UI/UX, design tokens, UX flow, wireframe, Pencil/Stitch output, DESIGN.md | **designer** |
| Next.js, React, Shadcn, Tailwind, `apps/web/`, component, page, RTK Query | **frontend** |
| NestJS, Prisma, PostgreSQL, REST/GraphQL, JWT, `apps/api/`, DTO, migration | **nestjs** |
| Rust, Tauri v2, Axum, Tokio, `apps/desktop/`, `src-tauri/`, `crates/`, IPC, systems programming | **rustacean** |
| LLM agent, LangChain, LangGraph, RAG, prompt engineering, agentic loop, eval, StateGraph | **ai-engineer** |
| Python API, FastAPI, microservice, SQLAlchemy, Alembic, Celery, async worker, pydantic | **python-backend** |
| CI/CD, GitHub Actions, Docker, Kubernetes, Helm, Terraform, Prometheus, Grafana, deployment, infra | **devops** |
| Test, coverage, vitest, playwright, flaky, regression, TDD enforcement | **qa** |
| Audit, scan, CVE, secret, OWASP, prompt injection, permissions | **security-auditor** |

## File Map

| Need | Location |
|---|---|
| **Coding standards** (TS strict, naming, imports) | `.opencode/standards/conventions.md` § Coding |
| **Security guidelines** (AgentShield, secret rules) | `.opencode/standards/conventions.md` § Security |
| **Testing requirements** (TDD, coverage thresholds) | `.opencode/standards/conventions.md` § Testing |
| **Git workflow** (commits, branches, PRs) | `.opencode/standards/conventions.md` § Git |
| **Anti-patterns** (blocking) | `.opencode/standards/conventions.md` § Anti-Patterns |
| **Document templates** (PRD, design, plan, ADR, task) | `.opencode/standards/*.md` |
| **Project-specific memory** (decisions, contracts, tokens) | `.opencode/memory/project-context.md` |
| **Agent definitions** (frontmatter, skills, MUST rules) | `.opencode/agents/<name>.md` |
| **Slash commands** (`/plan`, `/build`, etc.) | `.opencode/commands/<name>.md` |
| **Workflow rules** (always-on) | `.opencode/rules/*.md` |
| **Skill library** (skills) | `.opencode/skills/<category>/SKILL.md` |
| **Scripts + tests** | `.opencode/scripts/`, `.opencode/scripts/__tests__/` |
| **Runtime state** (gitignored) | `_workspace/` (harness checkpoints) |
| **End-user docs** (humans installing the kit) | `README.md` |

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

For human-facing documentation (installation, configuration, troubleshooting), see `README.md`.

## Changelog

| Version | Date | Change |
|---|---|---|
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
