# Implementation Plan: AgentShield Automated Security Gating (ECC Architecture)

> **Status**: Complete  
> **Author**: Tech Lead Agent  
> **Created**: 2026-09-03  
> **Completed**: 2026-09-03  
> **Version**: 1.0.0  
> **PRD**: [AgentShield Automated Security Gating PRD](../prds/agentshield-gating-prd.md)  

---

## 1. Summary

We will implement the multi-tier AgentShield Automated Security Gating architecture inspired by the latest ECC (Everything Claude Code) release. This solution delivers:
1. **Runtime Protection**: A `pre-tool-guard.mjs` hook to intercept dangerous shell commands and protect sensitive credential files (`.env`, private keys) from being modified or leaked during active sessions.
2. **Programmatic Gating**: A new script `.opencode/scripts/security-gate.mjs` that runs AgentShield, evaluates findings against strict thresholds (Grade >= B), returns standard exit codes (0 = pass, 1 = block), and generates structured Markdown reports.
3. **Workflow Integration**: Hard gates wired directly into `.opencode/commands/review.md` and `.opencode/commands/ship.md`.
4. **CI/CD Enforcement**: A production GitHub Actions workflow at `.github/workflows/agentshield.yml` enforcing automated security gates on pull requests.

All logic scripts will follow strict TDD (RED → GREEN → REFACTOR) with Vitest unit tests achieving 80%+ statement coverage.

---

## 2. Architecture & File Map

```
opencode-saas-kit/
├── .github/
│   └── workflows/
│       └── agentshield.yml              # NEW: GitHub Action PR security gate
├── .opencode/
│   ├── hooks/
│   │   └── pre-tool-guard.mjs           # NEW: Runtime hook intercepting dangerous actions
│   ├── scripts/
│   │   ├── security-gate.mjs            # NEW: Programmatic security gate CLI
│   │   └── __tests__/
│   │       └── security-gate.test.mjs   # NEW: Vitest unit tests for security gate
│   └── commands/
│       ├── review.md                    # UPDATED: Enforce security-gate.mjs in Phase 2
│       └── ship.md                      # UPDATED: Enforce security-gate.mjs hard-gate in Phase 2
└── docs/
    ├── prds/agentshield-gating-prd.md
    └── plans/agentshield-gating-plan.md
```

### Defense Flow Architecture

```
[Agent Tool Execution]
       │
       ▼
[pre-tool-guard.mjs] ──(Detects .env write, rm -rf, curl|bash)──> [BLOCKED: Access Denied]
       │
       ▼ (Safe)
[Tool Runs Normally]

─────────────────────────────────────────────────────────────────────────────

[/review or /ship Triggered]
       │
       ▼
[security-gate.mjs] ──> runs npx ecc-agentshield scan --json
       │
       ├── Grade A or B (No Critical Secrets) ──> [EXIT 0: PASSED] ──> Proceed to next phase
       │
       └── Grade C/D/F or Secret Leak ──────────> [EXIT 1: BLOCKED] ──> Abort pipeline & display report
```

---

## 3. Implementation Phases

### Phase 1: Security Gate Core CLI & TDD (Completed)

**Goal**: Build `security-gate.mjs` with comprehensive Vitest tests verifying exit codes, threshold evaluation, and report generation.

| Task | Status | Agent | Dependencies | Estimate |
|---|---|---|---|---|
| T-001: Write failing unit tests in `security-gate.test.mjs` | ✅ Done | QA | None | 2h |
| T-002: Implement `security-gate.mjs` to satisfy tests | ✅ Done | Tech Lead | T-001 | 3h |
| T-003: Add graceful offline / mock fallback if `ecc-agentshield` is unreachable | ✅ Done | Tech Lead | T-002 | 1h |

**Deliverable**: `security-gate.mjs` passes 100% unit tests with >=80% statement coverage.

---

### Phase 2: Runtime Guard Hook (Completed)

**Goal**: Implement `pre-tool-guard.mjs` to protect environment files and intercept high-risk shell commands.

| Task | Status | Agent | Dependencies | Estimate |
|---|---|---|---|---|
| T-004: Write unit tests for guard rules (`pre-tool-guard.test.mjs`) | ✅ Done | QA | None | 1.5h |
| T-005: Implement `.opencode/hooks/pre-tool-guard.mjs` with sub-10ms latency | ✅ Done | Tech Lead | T-004 | 2h |
| T-006: Document hook behavior and configuration options | ✅ Done | Tech Lead | T-005 | 1h |

**Deliverable**: Active runtime protection hook preventing accidental secret modifications.

---

### Phase 3: Command Integration (`/review` and `/ship`) (Completed)

**Goal**: Update command specs to programmatically enforce security gates.

| Task | Status | Agent | Dependencies | Estimate |
|---|---|---|---|---|
| T-007: Update `.opencode/commands/review.md` Phase 2 to execute `security-gate.mjs --scope=changed` | ✅ Done | Tech Lead | Phase 1 | 1h |
| T-008: Update `.opencode/commands/ship.md` Phase 2 to execute `security-gate.mjs --min-grade=B` | ✅ Done | Tech Lead | Phase 1 | 1h |
| T-009: Test full simulation of `/review` and `/ship` failure and success paths | ✅ Done | QA | T-007, T-008 | 2h |

**Deliverable**: `/review` and `/ship` automatically abort on security failures.

---

### Phase 4: CI/CD GitHub Action & Documentation (Completed)

**Goal**: Establish pull request enforcement and update project documentation.

| Task | Status | Agent | Dependencies | Estimate |
|---|---|---|---|---|
| T-010: Create `.github/workflows/agentshield.yml` configured with `affaan-m/agentshield@v1` | ✅ Done | DevOps | None | 1.5h |
| T-011: Update `README.md` and `.opencode/standards/conventions.md` to document the security gate | ✅ Done | Tech Lead | Phase 3 | 1h |
| T-012: Run complete verification script (`node .opencode/scripts/verify.mjs`) | ✅ Done | QA | T-010, T-011 | 1h |

**Deliverable**: Full automated security gating ready for production use.

---

## 4. Bite-Sized Task Breakdown (TDD)

1. **Step 1 (RED)**: Create `.opencode/scripts/__tests__/security-gate.test.mjs` with mock findings. ✅
2. **Step 2 (GREEN)**: Create `.opencode/scripts/security-gate.mjs` implementing score evaluation and report generation. ✅
3. **Step 3 (REFACTOR)**: Add JSON/Markdown dual output formatting. ✅
4. **Step 4**: Implement runtime hook `.opencode/hooks/pre-tool-guard.mjs`. ✅
5. **Step 5**: Update `/review.md` and `/ship.md`. ✅
6. **Step 6**: Create `.github/workflows/agentshield.yml`. ✅

---

## 5. Verification Protocol

1. ✅ `npm test` runs `security-gate.test.mjs` and passes with >=80% coverage.
2. ✅ Running `node .opencode/scripts/security-gate.mjs --help` outputs available flags (`--min-grade`, `--changed`, `--json`).
3. ✅ Running `node .opencode/scripts/verify.mjs` passes all integrity checks (120/120 checks passed).
4. ✅ Attempting to simulate a secret leak blocks `/ship` with exit code 1.

---

## 6. Anti-patterns (BLOCKING)

- ❌ Allowing `/ship` to proceed when security gate returns non-zero.
- ❌ Hardcoding bypass flags or skipping verification.
- ❌ Running slow adversarial LLM scans on routine local commits.
- ❌ Swallowing error codes in bash/shell command execution.
