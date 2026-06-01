# /build

Activate the full team for parallel implementation. Use ONLY when an approved plan exists in `docs/plans/`. Do NOT use for: planning (`/plan`), security-only audit (`/security`), final approval (`/ship`), or single-file mechanical edits (dispatch Tech Lead with category `quick` directly).

**HARD-GATE:** If no `docs/plans/*-plan.md` exists, STOP and return: "Run `/plan` first. /build requires an approved plan."

## Execution Mode: Hybrid

| Phase | Mode | Why |
|---|---|---|
| Phase 0: Context Check | (orchestrator) | Decide resume vs initial — avoids redoing completed work |
| Phase 1: Dispatch | (orchestrator) | Plan + break into tasks |
| Phase 2: Implementation | **Subagents in parallel** | Frontend + Backend loosely coupled via API contract; parallel = max(fe,be), not sum |
| Phase 3: QA | **Sequential** | Needs actual implementation to verify, not promises |
| Phase 4: Security | **Sequential** | Fast check (regex + config); run last to fail-fast on expensive QA first |

## Agent Flow

```
Tech Lead → Frontend + Backend (parallel) → QA → Security Auditor
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
- Breaks work into parallel tasks → `docs/tasks/{name}-task.md`
- Assigns each task with category:
  - `deep` — complex autonomous work, multi-file/multi-system (uses opus/pro)
  - `quick` — single-file, mechanical (typo, rename, config) (uses base — cheaper)
  - `ultrabrain` — hard logic, novel algorithm, architecture (uses opus/pro)

**Why categories?** They map to model cost. Mis-categorize and you either burn tokens on trivial work or produce bad output on hard work. When unsure, default to `deep`.

## Phase 2: Frontend + Backend — Parallel Execution

**Mode: Subagents in parallel** (`run_in_background: true`)

Both agents read disjoint slices of the plan and write to `_workspace/02_{agent}_*.{ext}` so they don't conflict. Orchestrator reads both and produces final files at the end.

**Frontend Agent:**
- Reads tasks from `docs/tasks/frontend-*.md`
- Implements React components, RTK Query endpoints, Shadcn/Tailwind styling
- Follows design tokens from Designer
- Writes component tests
- Outputs to `_workspace/02_frontend_*.{tsx,ts,test.ts}`

**Backend Agent:**
- Reads tasks from `docs/tasks/backend-*.md`
- Implements NestJS modules, Prisma models/migrations, API endpoints, auth guards
- Writes integration tests
- Outputs to `_workspace/02_backend_*.{ts,test.ts}`

**Integration seam:** API contract from the plan. QA verifies in Phase 3 that Backend's response shape matches Frontend's RTK Query types — this catches shape drift at the boundary.

## Phase 3: QA Agent — Verification

**Why after Phase 2?** QA needs actual implementation to verify. Parallel-with-impl would test against nothing.

- Reads `_workspace/02_*` outputs
- Runs `nx affected -t test` — only affected tests (faster, regression-focused)
- Checks coverage thresholds (80% statements / 75% branches per AGENTS.md)
- Runs Playwright E2E for critical flows listed in plan
- **Boundary check:** compares Backend response shape vs Frontend RTK Query types
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
- ❌ Frontend/Backend writing to same path (use `_workspace/` for intermediates)
- ❌ Marking complete when QA has any CRITICAL/FAIL
