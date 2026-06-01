# /ship

Final validation before deployment. Use after `/review` is approved. Do NOT use for: code review (`/review`), implementation (`/build`), deployment (kit stops here, your DevOps handles the rest).

**HARD-GATE:** Only run after `/review` returned Approved. If no review report at `_workspace/05_review_*.md`, STOP and return: "Run `/review` first."

## Execution Mode: Sequential (each step depends on previous)

| Phase | Mode | Why |
|---|---|---|
| Phase 0: Context Check | (orchestrator) | Verify `/review` was approved |
| Phase 1: QA full tests | **Subagent** (QA) | Cannot skip — ship gate |
| Phase 2: Security final | **Subagent** (Security Auditor) | Catches what /review might have missed |
| Phase 3: Tech Lead approval | (orchestrator) | Final human-like sign-off |

Sequential (not parallel) because each phase can fail and block the next. QA fail = no need to run Security. Security fail = no need for Tech Lead approval.

## Agent Flow

```
QA → Security Auditor → Tech Lead
```

## Phase 0: Context Check

1. Verify `_workspace/05_review_*.md` exists with Approved verdict
2. If not → return HARD-GATE error
3. Read prior `/review` summary

## Phase 1: QA Agent — Full Test Suite

```bash
nx run-many -t test --coverage
npx playwright test
```

**Why full suite (not affected)?** Ship is the last gate. Any test that has ever failed in any branch must pass now. Affected-only would miss regressions in unrelated code.

**Checks:**
- All tests pass
- Coverage: 80% statements, 75% branches (per AGENTS.md)
- No skipped tests without linked issues
- E2E critical flows verified
- Output: `_workspace/06_qa_ship.md`

## Phase 2: Security Auditor — Final Gate

```bash
npx ecc-agentshield scan
npm audit --production
```

**Why after QA?** If QA already blocks, no need to scan. Save security scan time for runs that might actually ship.

**Gates:**
- AgentShield grade: A or B (pass), C (warn), D/F (block)
- No critical npm audit findings
- No hardcoded secrets (full project scan)
- Permission boundaries intact
- Output: `_workspace/06_security_ship.md`

## Phase 3: Tech Lead — Final Approval

The Tech Lead:
- Reviews QA + Security reports
- `gitnexus_detect_changes()` for final diff summary
- Verifies all acceptance criteria from spec are met
- Approves or lists remaining issues

**Why Tech Lead at the end?** Two automated gates are not enough for production. Human-like judgment ("is this actually ready?") is the final filter.

## Output

After `/ship`:
1. ✅ All tests passing
2. ✅ Security gate passed (grade ≥ B)
3. ✅ Acceptance criteria met
4. ✅ Tech Lead final approval
5. ✅ Ready to deploy

## Deployment

After Tech Lead approval, deployment is YOUR DevOps team's responsibility. This kit does not deploy.

## Document Standards

| Output | Path | Template |
|---|---|---|
| QA report | `_workspace/06_qa_ship.md` | — |
| Security report | `_workspace/06_security_ship.md` | `.opencode/standards/security-review-template.md` |

## Anti-patterns (BLOCKING)

- ❌ Shipping without `/review` approval (HARD-GATE)
- ❌ Skipping full test suite (affected-only is for `/build` only)
- ❌ Approving Critical security findings at ship gate
- ❌ Tech Lead skipping QA/Security review of reports
