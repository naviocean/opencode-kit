# PRD: PStack Engineering Rigor & Runtime Verification Suite

> **Status:** Active  
> **Author:** PM Agent & Tech Lead  
> **Created:** 2026-10-19  
> **Version:** 1.6.0  
> **Stakeholders:** Tech Lead, QA Agent, Developers, SRE/DevOps  
> **Implementation Plan:** [docs/plans/2026-10-19-pstack-rigor-verification.md](../plans/2026-10-19-pstack-rigor-verification.md)

---

## 1. Problem Statement

### Current State:
In `opencode-saas-kit` v1.5.0, testing and verification are largely confined to synthetic test runners:
1. **Synthetic vs Real-Surface Gap:** `/test` runs unit and integration tests (Vitest, Jest, Cargo test). A suite can pass 100%, yet the application may fail in reality (white screen, broken cookies, CORS misconfigurations, unhandled network disconnects).
2. **Symptom Masking during Bugfixes:** Agents fixing bugs frequently apply superficial guards (e.g. `if (!data) return null;` or swallowing errors) at the crash site instead of tracing the root cause back to the invalid state generator.
3. **Over-Mocking Fragility:** Unit tests often mock internal private helpers, causing tests to shatter upon refactoring even when public observable behavior is completely preserved.
4. **AI Code Slop & Conversational Fluff:** Agents generate redundant in-code comments (`// set x to 5`) and verbose conversational explanations, cluttering context and repository history.
5. **Missing Forensics & Adversarial Gates:** When handling performance issues or high-risk architectural diffs, agents lack structured playbooks for profiling artifacts (CPU profiles, heap snapshots, spindumps) and adversarial review.

### Desired State:
Adapt the highest-value engineering heuristics from Lauren Tan's *pstack* and cursor team practices into OpenCode SaaS Kit:
1. **Real-Surface Verification Suite:** Agents inspect real application runtime surfaces (Web Playwright, CLI PTY, Service cURL), scaffold a persistent `docs/verification/feature-map.md`, and record immutable evidence in `docs/verification/evidence/`.
2. **Root-Cause Bugfix Protocol:** `/hotfix` requires reproduction first, root-cause isolation without symptom masking, and re-verification against the original repro on the real surface.
3. **Typed Design Sketch & Fan-Out Gate:** `/build` requires formal contract establishment in `.agent-memory/contracts.md` before cross-boundary implementation begins.
4. **Triggered Adversarial Review:** `/review` automatically triggers an independent adversarial reviewer when high blast radius or cross-module boundaries are touched.
5. **Clean-Room Engineering Principles:** A 24-principle SSoT in `.agent-core/standards/engineering-principles.md` with explicit operational triggers and strict hierarchy of authority.

---

## 2. Target Users & Stakeholders

| Role | Impact & Value |
|---|---|
| **Fullstack SaaS Developer** | Confident that code verified by agents actually works end-to-end on real surfaces, not just in mock memory. |
| **QA Agent** | Equipped with `create-verification-skill` and `maintain-verification-skill` to enforce observable behavior and prevent regression masking. |
| **Tech Lead Agent** | Empowered with adversarial review and typed design sketches to gate architectural integrity before merging. |
| **End User / Customer** | Receives robust, tested user journeys with zero regressions. |

---

## 3. User Stories & Acceptance Criteria

### US-001: Real-Surface Verification & Feature Map (P0)
- **As a** developer or QA engineer,
- **I want** the agent to inspect the real application runtime, choose the right interaction driver (Playwright, PTY, cURL), and scaffold a Feature Map,
- **So that** user journeys are verified against the real running application with persistent evidence.
- **Acceptance Criteria:**
  - [x] Given a project with runnable services, `create-verification-skill` surveys startup commands, readiness probes, authentication, and seed data.
  - [x] Given a target surface, the skill establishes `docs/verification/feature-map.md` with structured user journeys and observable success signals.
  - [x] Given a verification run, evidence (logs, screenshots) is saved to `docs/verification/evidence/` and persists after application teardown.
  - [x] Given missing prerequisites (e.g. no Docker daemon), the agent reports `BLOCKED: Runtime Environment Missing` and NEVER fakes a PASS.
  - [x] Given `maintain-verification-skill`, the agent audits the map against touched code, re-runs affected flows, and is strictly prohibited from altering the map to mask regressions.

### US-002: Root-Cause Bugfix in `/hotfix` (P0)
- **As a** maintainer,
- **I want** `/hotfix` to enforce reproduction-first and root-cause tracing,
- **So that** bug fixes eliminate underlying defects rather than slapping superficial null-checks.
- **Acceptance Criteria:**
  - [x] Repro steps are documented and executed to confirm failure before code edits.
  - [x] The fix addresses the invalid state generator, not merely the crash location.
  - [x] The original repro and affected test suite are re-executed to verify resolution.
  - [x] Pre-fix and post-fix evidence is recorded in the hotfix report.

### US-003: Architectural Fan-Out & Typed Design Sketch in `/build` (P1)
- **As a** Tech Lead,
- **I want** `/build` to checkpoint task fan-out and enforce Typed Design Sketches when changes cross boundaries,
- **So that** parallel specialist agents do not introduce contract mismatches or race conditions.
- **Acceptance Criteria:**
  - [x] When a task crosses function/module/API boundaries, a Typed Design Sketch is recorded in `.agent-memory/contracts.md` before coding.
  - [x] Parallel delegates operate with disjoint file scopes or dedicated worktrees.
  - [x] QA runs Feature Map verification on touched user journeys alongside unit test suites.

### US-004: Triggered Adversarial Review in `/review` (P1)
- **As a** reviewer,
- **I want** an adversarial reviewer subagent triggered on high-risk diffs,
- **So that** subtle race conditions, memory leaks, and edge cases are surfaced before merging.
- **Acceptance Criteria:**
  - [x] When `gitnexus_impact` indicates HIGH/CRITICAL risk or cross-module changes, an independent adversarial review is dispatched.
  - [x] Review findings are mapped to concrete code paths and classified as MUST-FIX, CONSIDER, or REJECT with technical rationale.
  - [x] If an independent reviewer cannot run, the limitation is documented rather than claiming the gate passed.

### US-005: Performance & Trace Forensics (P2)
- **As an** engineer investigating performance or memory issues,
- **I want** specialized playbooks for runtime inspection, trace analysis, and benchmark checklists,
- **So that** performance claims are backed by measured baselines and bounded root causes (`explain-the-number`).
- **Acceptance Criteria:**
  - [x] `benchmark-checklist` requires baseline measurement, isolated variable changes, and equivalent re-measurement.
  - [x] `runtime-forensics` guides live process inspection (CPU profiles, heap snapshots).
  - [x] `trace-forensics` guides post-mortem inspection of captured trace artifacts without confusing them with live runs.

### US-006: Comment Quality & Unslop (P2)
- **As a** code reviewer,
- **I want** diff-only comment quality checks that eliminate AI slop without deleting essential invariant comments,
- **So that** the codebase remains readable, concise, and technically rigorous.
- **Acceptance Criteria:**
  - [x] Trivial restatements of code in diffs are flagged for removal.
  - [x] Comments documenting business invariants, security constraints, or hardware/platform workarounds are preserved.

---

## 4. Non-Functional Requirements & Constraints

1. **Hierarchy of Authority:** Kit Hard Rules (AGENTS.md, TDD 80%, AgentShield Grade >= B, Socratic Sizing) > Human Directives > Engineering Principles.
2. **Autonomy Guardrails:** `never-block-on-the-human` applies ONLY to reversible, non-destructive implementation tasks. It MUST NEVER bypass PM discovery, plan approval, scope boundaries, `/review`, or `/ship` gates.
3. **SSoT Integrity:** All changes originate in `.agent-core/` and propagate via `scripts/sync-kit.mjs`.
4. **Dynamic Verification:** All tests in the test runner must pass cleanly across all supported harnesses with zero failures.
