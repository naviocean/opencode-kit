# /build

Activate implementation. Right-fits execution based on task sizing:
- **Size S (< 50 LOC, bugfix, CSS/text, tweak):** Fast-track directly to domain specialist or `/hotfix` with strict TDD (RED → GREEN → REFACTOR) and AgentShield security scan. No plan document required.
- **Size M (Single component, 1 endpoint, isolated refactor):** Requires an approved Mini-Plan in `docs/plans/mini-*.md` (using `mini-plan-template.md`).
- **Size L/XL (Multi-system, new module, epic):** Requires an approved full plan in `docs/plans/*-plan.md`.

**HARD-GATE:** For Size M/L, if no approved plan (`docs/plans/*-plan.md` or `docs/plans/mini-*.md`) exists, STOP and return: "Run `/plan` first or produce a Mini-Plan. For quick Size S bugfixes, dispatch directly with `/hotfix`."

## Execution Mode: Hybrid

| Phase | Execution Mode | Rationale |
|---|---|---|
| Phase 0: Context Check | (orchestrator) | Decide resume vs initial — avoids redoing completed work |
| Phase 1: Planning & Architecture | **Foreground (Tech Lead)** | Architecture decisions require full context; cannot delegate |
| Phase 2: Implementation | **Subagents in parallel** | Specialists loosely coupled via API/data contracts; parallel = max(times), not sum |
| Phase 3: Verification | **Foreground (QA)** | Must see all changes across all domains to test integration |
| Phase 4: Security Gate | **Foreground (Security)** | Go/no-go gate cannot be parallelized |

## Agent Flow

```
Tech Lead → Dynamic Specialists (Frontend / NestJS / AI Engineer / Python Backend / Rustacean / DevOps in parallel) → QA → Security Auditor
```

## Phase 0: Context Check (enables resume)

Before dispatch, scan existing state:

1. **Read `docs/plans/`** — find latest approved plan
   - Missing → return HARD-GATE error (see above)
2. **List `docs/tasks/*-task.md`** — completed tasks
3. **Check `_workspace/`** — intermediate artifacts from previous run
4. **Determine mode:**
   - `0 tasks exist` → **initial run** → Phase 1
   - `N tasks exist` → **resume** → ask user which to skip, mark done ones with `status: done`
   - `_workspace/` exists + user says "rebuild" → **archive** current to `_workspace_{YYYYMMDD_HHMMSS}/` then initial run

Print summary and wait for confirmation:
```
Plan: {plan-path}
Tasks: {N} completed, {M} pending
Mode: {initial | resume | rebuild}
Proceed? (y/n)
```

## Phase 1: Tech Lead — Dispatch

- Reads the approved plan from `docs/plans/`
- Identifies affected domains (Web, API, AI/Python, Desktop/Rust, DevOps/Infra)
- Breaks work into parallel tasks → `docs/tasks/{name}-task.md`
- Assigns each task with category:
  - `deep` — complex autonomous work, multi-file/multi-system (uses opus/pro)
  - `quick` — single-file, mechanical (typo, rename, config) (uses base — cheaper)
  - `ultrabrain` — hard logic, novel algorithm, architecture (uses opus/pro)

**Why categories?** They map to model cost. Mis-categorize and you either burn tokens on trivial work or produce bad output on hard work. When unsure, default to `deep`.

## Phase 2: Dynamic Specialist Parallel Execution

**Mode: Subagents in parallel** (`run_in_background: true`)

Tech Lead dispatches only the specialists whose domains are touched by the approved plan. All agents read disjoint slices of the plan and write to `_workspace/02_{agent}_*.{ext}` so they don't conflict. Orchestrator coordinates final merging.

**Frontend Agent (Web UI):**
- Reads tasks from `docs/tasks/frontend-*.md`
- Implements React components, RTK Query endpoints, Shadcn/Tailwind styling
- Follows design tokens from Designer
- Writes component tests (Vitest + RTL)
- Outputs to `_workspace/02_frontend_*.{tsx,ts,test.ts}`

**NestJS Agent (NestJS API & Prisma):**
- Reads tasks from `docs/tasks/nestjs-*.md`
- Implements NestJS modules, Prisma models/migrations, API endpoints, auth guards
- Writes integration tests (Supertest)
- Outputs to `_workspace/02_nestjs_*.{ts,test.ts}`

**AI Engineer Agent (AI & LLM Services):**
- Reads tasks from `docs/tasks/ai-engineer-*.md`
- Implements LangGraph state graphs, LLM agents, tool definitions, RAG queries, prompt templates
- Writes evaluation & regression tests (`pytest`, `pytest-asyncio`)
- Outputs to `_workspace/02_ai-engineer_*.py`

**Python Backend Agent (Python APIs & Microservices):**
- Reads tasks from `docs/tasks/python-backend-*.md`
- Implements FastAPI endpoints, SQLAlchemy models/migrations, async handlers, background workers
- Wraps AI models/graphs in HTTP/SSE streaming endpoints
- Writes async integration tests (`pytest`, `httpx.AsyncClient`)
- Outputs to `_workspace/02_python-backend_*.py`

**Rustacean Agent (Systems, Microservices & Desktop):**
- Reads tasks from `docs/tasks/rustacean-*.md`
- Implements Tauri v2 commands, native IPC handlers, Axum REST/WebSocket services, Tokio async tasks, shared crates
- Writes Rust unit, integration & property tests (`cargo test`, `mockall`, `proptest`)
- Outputs to `_workspace/02_rustacean_*.rs`

**DevOps Agent (Infra, CI/CD & Containers):**
- Reads tasks from `docs/tasks/devops-*.md`
- Implements Dockerfiles, docker-compose, GitHub Actions workflows, Terraform, K8s manifests
- Configures Prometheus metrics and Grafana alerts
- Outputs to `_workspace/02_devops_*.{yml,yaml,tf,Dockerfile}`

**Integration seams:**
- Web ↔ NestJS: DTO contracts from plan verified in Phase 3.
- Web / NestJS ↔ Python Backend: HTTP/event/SSE contracts verified in Phase 3.
- AI Engineer ↔ Python Backend: Graph state schema and tool invocation contracts verified in Phase 3.
- Desktop ↔ Native Rust: Tauri IPC invoke schema verified in Phase 3.
- Services ↔ DevOps: Container ports, health probes (`/health/live`, `/health/ready`), environment variables verified in Phase 3.

## Phase 3: QA Agent — Multi-Stack Verification

**Why after Phase 2?** QA needs actual implementation to verify. Parallel-with-impl would test against nothing.

- Reads `_workspace/02_*` outputs
- **Full multi-stack test run:**
  - TypeScript/Web/API: `nx affected -t test`
  - Python/AI: `pytest --cov` (when `.py` files affected)
  - Rust/Desktop: `cargo test` (when `src-tauri/` affected)
- Checks coverage thresholds (80% statements / 75% branches per AGENTS.md)
- Runs Playwright E2E for critical flows listed in plan
- **Boundary checks:** verifies contract compatibility across all communicating agents (e.g. NestJS DTOs vs Frontend types)
- Reports failures with `file:line` context, not just "test failed"
- Writes `_workspace/03_qa_report.md`

## Phase 4: Security Auditor — Scan

**Why last?** Security scan is fast (regex + config audit). QA is slow. Fail fast on expensive checks first.

- Runs `npx ecc-agentshield scan` on `.opencode/`
- Scans `_workspace/02_*` for hardcoded secrets
- Validates permission boundaries against `agent-models.json`
- Reports by severity: CRITICAL (block) / HIGH (warn) / MEDIUM (note) / LOW (FYI)
- Writes `_workspace/04_security_report.md`

## Output

After `/build`:
1. ✅ All `docs/tasks/*-task.md` marked complete
2. ✅ Tests passing (QA report green)
3. ✅ Coverage meets thresholds
4. ✅ Security scan passed (no CRITICAL)
5. ✅ `_workspace/` preserved (audit trail — do not delete)

**Next:** Run `/review` for code review.

## Document Standards

| Output | Path | Template |
|---|---|---|
| Task docs | `docs/tasks/{name}-task.md` | `.opencode/standards/task-template.md` |
| Intermediate | `_workspace/0{phase}_{agent}_{artifact}.{ext}` | — |
| QA report | `_workspace/03_qa_report.md` | — |
| Security report | `_workspace/04_security_report.md` | — |

All task docs must follow the template. Do not skip required sections.

## Anti-patterns (BLOCKING)

- ❌ Running before `/plan` (HARD-GATE)
- ❌ Skipping Phase 0 — redoing completed work is silent waste
- ❌ Multiple agents writing to same path (use `_workspace/` for intermediates)
- ❌ Marking complete when QA has any CRITICAL/FAIL
