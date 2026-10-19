# /hotfix

Fast-track bugfix or urgent isolated patch. Use for bugs, broken tests, runtime errors, regression fixes, or small configuration fixes that do not require full product discovery. Do NOT use for: new features or scope additions (use `/plan`), cross-system architectural refactorings, or major UI overhauls.

**HARD-GATE:** Hotfix scope must be bounded to a single bug or defect. If the request introduces new user flows or modifies product scope, STOP and return: "Scope requires product discovery. Run `/plan` instead."

## Execution Mode: Fast-Track Pipeline (Sequential)

| Phase | Mode | Why |
|---|---|---|
| Phase 0: Triage & Blast Radius | **Subagent** (Tech Lead) | Analyze bug, check blast radius with GitNexus, assign target specialist |
| Phase 1: Reproduce & TDD Fix | **Subagent** (Specialist) | Write failing test first (RED), implement fix (GREEN), refactor |
| Phase 2: QA Verification | **Subagent** (QA) | Run regression test suite and ensure fix passes without side effects |
| Phase 3: Fast Security Gate | **Subagent** (Security Auditor) | Quick check on diff for secrets, OWASP regressions, or permission changes |
| Phase 4: Approval & Commit | **Subagent** (Tech Lead) | Verify clean diff, impact analysis check, prepare single logical commit |

Pipeline flow:
```
Tech Lead (triage) → Specialist (TDD fix) → QA (regression verify) → Security Auditor (fast check) → Tech Lead (sign-off)
```

## Phase 0: Tech Lead — Triage, Repro & Blast Radius

1. **Document exact reproduction steps and error symptoms**:
   - Record input, environment, expected vs actual outcome, and stack trace.
   - Determine affected module: Frontend (`apps/web/`), NestJS (`apps/api/`), Python Backend (Python APIs/DB), AI/LLM (LangGraph/prompts), Desktop (`apps/desktop/`), or Infra (`.github/`, Docker, K8s).
2. **GitNexus Investigation & Root-Cause Tracing**:
   - Run `gitnexus_context({name: affectedSymbol, repo: "<current-repo>"})` to see callers and callees.
   - Run `gitnexus_impact({target: affectedSymbol, direction: "upstream", repo: "<current-repo>"})` to determine blast radius.
   - Distinguish symptom site from root-cause generator (`fix-root-causes`): find the first point the system produced invalid state.
   - If blast radius is CRITICAL (e.g. core auth, shared database schema changes), warn user before proceeding.
3. **Dispatch to single specialist agent**:
   - Web/UI bug → `frontend` (category: `quick` or `deep`)
   - NestJS API/DB/Auth bug → `nestjs` (category: `quick` or `deep`)
   - Python API/DB/Worker bug → `python-backend` (category: `quick` or `deep`)
   - AI/LLM/LangGraph bug → `ai-engineer` (category: `quick` or `deep`)
   - Desktop/IPC bug → `rustacean` (category: `quick` or `deep`)
   - CI/CD / Docker / Infra bug → `devops` (category: `quick` or `deep`)

## Phase 1: Specialist — Reproduce & Fix (TDD + Root-Cause)

The assigned specialist agent executes RED → GREEN → REFACTOR:
1. **RED**: Write an automated reproduction test reproducing the bug. Run test → MUST FAIL.
2. **ROOT-CAUSE FIX**: Fix the generator of the wrong state. Symptom masking (swallowing errors, clamping values, or adding null-checks at crash site when state should never be null) is strictly prohibited.
3. **GREEN**: Apply minimal isolated fix. Run reproduction test → MUST PASS.
4. **REFACTOR**: Clean up without altering logic. Adhere strictly to conventions:
   - No `any`, no `@ts-ignore`, no `console.log`.
   - Strip trivial comments (`comment-quality`); preserve invariant comments.
   - Never cross domain boundaries (e.g. frontend must not edit `apps/api/`).

## Phase 2: QA — Regression & Real-Surface Verification

QA agent verifies:
1. Run the new regression test to confirm fix.
2. Run related unit & integration test suites.
3. Re-verify touched flow on real surface via `maintain-verification-skill` (if Feature Map exists).
4. Capture before/after evidence into `docs/verification/evidence/` and update feature status to `VERIFIED` (or `REGRESSED` if fix fails). If runtime environment is unavailable, report `BLOCKED: Runtime Environment Missing`. Never fake a `VERIFIED` status.
5. Verify test coverage is maintained (>= 80% on affected module).
6. If tests fail → bounce back to specialist with failure details.

## Phase 3: Security Auditor — Fast Gate

Security Auditor scans the diff:
1. Confirm no API keys, tokens, or credentials added in fix.
2. Check for input sanitization or injection risks (especially in SQL/Prisma or shell commands).
3. If critical security risk detected → block and require remediation.

## Phase 4: Tech Lead — Final Approval

1. Run `gitnexus_detect_changes({repo: "<current-repo>"})` — inspect the exact diff.
2. Confirm:
   - Scope is isolated (only bugfix files touched).
   - Tests pass.
   - Security scan clean.
3. Prepare single squashed commit with conventional message:
   `fix(<scope>): <concise description of bug fix>`

## Output

After `/hotfix`:
1. ✅ Failing test written and now passing
2. ✅ Minimal, isolated code fix applied
3. ✅ Full regression test suite passing
4. ✅ Security clearance verified
5. ✅ Clean commit ready to merge
