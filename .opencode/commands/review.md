# /review

Code review + security audit before merge. Use after `/build` completes, before `/ship`. Do NOT use for: implementation (`/build`), final deploy gate (`/ship`), security-only audit (`/security`).

**HARD-GATE:** Only run on actual changes. If `gitnexus_detect_changes()` shows no diff, return: "No changes to review."

## Execution Mode: Subagents in Parallel

| Phase | Mode | Why |
|---|---|---|
| Phase 0: Context Check | (orchestrator) | Verify diff exists, no wasted scan |
| Phase 1: Code Review | **Subagent** (Tech Lead) | Reads files, evaluates patterns |
| Phase 2: Security Audit | **Subagent** (Security Auditor) | AgentShield + OWASP, independent of code review |
| Phase 3: Verdict | (orchestrator) | Synthesize both reports |

Parallel (not sequential) because code review and security audit look at different concerns. Code review = patterns/quality. Security = vulnerabilities. They don't depend on each other's findings.

## Agent Flow

```
Tech Lead + Security Auditor (parallel)
```

## Phase 0: Context Check

1. Run `gitnexus_detect_changes()` — confirm there ARE changes
2. If no changes → return HARD-GATE error
3. List changed files for review scope

## Phase 1: Tech Lead — Code Review

Two-stage review (Superpowers pattern):

**Stage 1 — Automated:**
1. `gitnexus_impact({target, direction: "upstream"})` — blast radius per change
2. Scope check: Does diff match the assigned task? Scope creep = reject.
3. Pattern check: New patterns without justification = reject.

**Stage 2 — Deep:**
- Read changed files. Evaluate against:
  - Patterns: follow codebase conventions
  - Architecture: respect module boundaries
  - Quality: no `any`, no `@ts-ignore`, no disabled lint
  - Testing: business logic has tests
  - Security: no hardcoded secrets, proper input validation

**Why two stages?** Stage 1 catches mechanical issues fast. Stage 2 catches design issues. One-stage review misses 40%+ of issues (industry data).

## Phase 2: Security Auditor — Security Review

Runs in parallel:

- AgentShield scan: `npx ecc-agentshield scan`
- Secret detection in changed files
- Permission boundary validation
- OWASP checks: A01 (access control), A03 (injection), A07 (XSS)
- Prompt injection in agent configs

**Why in parallel?** Security scan takes time (full project scan). Running after code review doubles wall-clock. They look at different concerns anyway.

## Phase 3: Verdict

| Tech Lead | Security | Verdict |
|---|---|---|
| ✅ | ✅ (A or B) | **Approved** |
| ⚠️ Changes Requested | ✅ | **Changes Requested** (with fix list) |
| ✅ | ⚠️ Medium | **Approved with notes** |
| ❌ | ❌ Critical | **Blocked** |

## Output

After `/review`:
1. ✅ Code review feedback (`_workspace/05_review_code.md`)
2. ✅ Security findings (`_workspace/05_review_security.md`)
3. ✅ Verdict: Approved / Changes Requested / Blocked

**Next:** If Approved, run `/ship`. If Changes Requested, fix and re-run `/build` then `/review`.

## Document Standards

| Output | Path | Template |
|---|---|---|
| Code review | `_workspace/05_review_code.md` | — |
| Security review | `_workspace/05_review_security.md` | `.opencode/standards/security-review-template.md` |

## Anti-patterns (BLOCKING)

- ❌ Reviewing unchanged code (waste, HARD-GATE)
- ❌ Approving without running `gitnexus_impact` (incomplete review)
- ❌ Approving Critical security findings (block)
- ❌ Sequential code + security review (slower, no benefit)
