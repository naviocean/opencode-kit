# PRD: AgentShield Automated Security Gating (ECC Architecture)

> **Status**: Completed  
> **Author**: PM Agent  
> **Created**: 2026-09-03  
> **Completed**: 2026-09-03  
> **Version**: 1.0.0  
> **Stakeholders**: Tech Lead, Security Auditor Agent, Lead Developers  

---

## 1. Problem Statement

**Current state**:
In `opencode-saas-kit` v1.x, AgentShield is only run as an ad-hoc CLI command (`npx ecc-agentshield scan`) via `/security` or as a text recommendation in `/review` and `/ship`. There is no automated enforcement:
1. No runtime guard to stop an agent from executing dangerous shell commands or modifying `.env` secrets during an active session.
2. No programmatic exit-code gating in `/review` or `/ship`—if vulnerabilities or secret leaks are present, the workflow does not automatically abort.
3. No GitHub Action gating to prevent merging vulnerable code on pull requests.

**Desired state**:
Implement the latest Multi-Tier Defense architecture from ECC (Everything Claude Code):
1. **Runtime PreToolUse Guard Hook**: Intercepts dangerous tool calls (e.g. modifying `.env`, running destructive shell commands, accessing files outside workspace) before execution.
2. **Programmatic Security Gate (`security-gate.mjs`)**: Automatically invoked during `/review` and `/ship`. Parses AgentShield findings and enforces strict exit codes: Grade A/B passes, Grade D/F or critical findings abort the pipeline immediately.
3. **CI/CD Hard Gate**: Reusable GitHub Action workflow (`.github/workflows/agentshield.yml`) that blocks PR merges when security checks fail.

**Impact of not solving**:
- Accidental secret leaks (API keys, database credentials) committed to repositories.
- Vulnerable agent configurations or excessive MCP permissions remaining undetected.
- Subagents modifying sensitive production environment files without developer awareness.

---

## 2. Target Users

| User Type | Description | Priority |
|---|---|---|
| **Fullstack SaaS Developer** | Protected in real-time from accidental secret exposure or destructive commands | Must Have |
| **Security Auditor Agent** | Executes automated scans with standardized structured output and grading | Must Have |
| **Tech Lead / Maintainer** | Guaranteed that `/review` and `/ship` will never approve vulnerable code | Must Have |

---

## 3. User Stories

### Must Have (P0)

- [x] **US-001**: As a developer, I want dangerous tool calls blocked in real-time before they execute so that agents cannot compromise system security.
  - Acceptance Criteria:
    - [x] Given an agent attempting to write or append to `.env` or sensitive credential files, when the tool is called, then the PreToolUse guard aborts execution and returns an access denied message.
    - [x] Given an agent attempting to run destructive shell commands (e.g., `rm -rf /`, `curl ... | bash`), when called, then execution is immediately intercepted and blocked.

- [x] **US-002**: As a tech lead, I want `/review` to automatically abort if AgentShield detects critical vulnerabilities or secrets.
  - Acceptance Criteria:
    - [x] Given uncommitted or staged changes containing a hardcoded API key, when `/review` executes Phase 2 (Security Audit), then `security-gate.mjs` returns exit code 1 with a Blocked verdict.

- [x] **US-003**: As a tech lead, I want `/ship` to enforce a hard gate (Grade >= B) before approving production release.
  - Acceptance Criteria:
    - [x] Given a repository audit result with Grade C, D, or F, when running `/ship`, then the security phase fails and blocks subsequent Tech Lead sign-off.
    - [x] Given a clean scan with Grade A or B, when running `/ship`, then the security phase passes and outputs `_workspace/06_security_ship.md`.

- [x] **US-004**: As a team lead, I want a GitHub Actions workflow that runs AgentShield on all PRs to main.
  - Acceptance Criteria:
    - [x] Given a pull request opened on GitHub, when GitHub Actions triggers `.github/workflows/agentshield.yml`, then `affaan-m/agentshield@v1` scans the PR and fails the check if medium/high findings are discovered.

---

## 4. Functional Requirements

### 4.1 Runtime Guard Hook

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-001 | PreToolUse guard hook (`.opencode/hooks/pre-tool-guard.mjs`) | P0 | Intercepts file write/edit and shell execution tools |
| FR-002 | Blocklist for sensitive files (`.env*`, `*.pem`, `id_rsa*`, `credentials.json`) | P0 | Modifications to these files are denied unless explicitly flagged |
| FR-003 | Command sanitization (blocks `curl\|bash`, dangerous rm, credential dumps) | P0 | Intercepts commands matching high-risk patterns |

### 4.2 Programmatic Security Gate

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-004 | Security Gate script (`.opencode/scripts/security-gate.mjs`) | P0 | Runs `ecc-agentshield scan --json` and interprets findings |
| FR-005 | Configurable threshold (`--min-grade=B`, `--fail-on-secrets`) | P0 | Exits 0 on pass, exits 1 on failure with human-readable summary |
| FR-006 | Integration into `.opencode/commands/review.md` | P0 | Enforces exit code check in Phase 2 |
| FR-007 | Integration into `.opencode/commands/ship.md` | P0 | Enforces hard gate in Phase 2 |

### 4.3 CI/CD GitHub Action

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-008 | GitHub Action workflow (`.github/workflows/agentshield.yml`) | P0 | Scans changed files on pull requests to main |

---

## 5. Non-Functional Requirements

| Category | Requirement | Target |
|---|---|---|
| **Performance** | Runtime guard hook latency | < 10ms per tool invocation |
| **Token Cost** | Token overhead | **0 tokens** (pure static analysis & local scripts) |
| **Reliability** | Deterministic enforcement | 100% reproducible results via CLI exit codes |
| **Portability** | OS compatibility | Works seamlessly across macOS, Linux, and Windows |

---

## 6. Technical Constraints

- Must rely on standard Node.js without requiring heavy global dependencies.
- Must execute `npx ecc-agentshield` seamlessly or provide graceful fallback if offline.
- Output reports must comply with `.opencode/standards/security-review-template.md`.

---

## 7. Out of Scope

- ❌ **No expensive LLM adversarial scans (`--opus`) on every local commit** (reserved for manual on-demand `/security` runs).
- ❌ **No modifying source code automatically** during gate enforcement (only reports and blocks).

---

## 8. Success Metrics

| Metric | Target | Measurement |
|---|---|---|
| Secret leaks escaping to remote git | 0 leaks | Verified via pre-commit and CI gates |
| False positive bypass rate | < 5% | Tracked via developer overrides |
| Added latency to `/review` and `/ship` | < 15 seconds | Timed via script execution logs |

---

## 9. Timeline

| Milestone | Deliverable |
|---|---|
| **Milestone 1** | Runtime Guard Hook (`.opencode/hooks/pre-tool-guard.mjs`) |
| **Milestone 2** | Security Gate CLI (`.opencode/scripts/security-gate.mjs`) + Unit Tests |
| **Milestone 3** | Integration into `/review.md` and `/ship.md` commands |
| **Milestone 4** | GitHub Actions Workflow (`.github/workflows/agentshield.yml`) & Documentation |

---

**Next Step**: [Implementation Plan](../plans/agentshield-gating-plan.md)
