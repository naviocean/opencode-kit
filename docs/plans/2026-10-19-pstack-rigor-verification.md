# Implementation Plan: PStack Engineering Rigor & Runtime Verification Integration

> **Goal:** Integrate Lauren Tan's pstack high-rigor engineering principles, real-surface verification skills (create-verification-skill, maintain-verification-skill, Feature Map), adversarial review, and forensics workflows into OpenCode SaaS Kit v1.6.0.
>
> **Architecture:** Single Source of Truth (`.agent-core/`) expansion. Standardize 24 engineering principles in `standards/engineering-principles.md` and `standards/conventions.md`. Add real-surface verification skills and rigor skills under `skills/`. Wire typed design sketches, adversarial reviews, and runtime evidence checks into `/hotfix`, `/build`, `/review`, and `/ship`. Provide a runnable fixture project (`fixtures/sample-app/`) with automated E2E verification test. Synchronize adapters across OpenCode, Claude Code, Antigravity, and Codex via `scripts/sync-kit.mjs`.
>
> **Tech Stack:** Node.js (>= 18.0.0), Markdown, YAML frontmatter, Playwright/PTY/cURL test drivers, GitNexus code intelligence.
>
> **Spec:** [PStack Rigor & Verification PRD](../prds/pstack-rigor-verification-prd.md)

---

## Global Constraints

- SSoT is strictly `.agent-core/`. Never edit generated directories (`.opencode/`, `.agents/`, `.claude/`) directly; always edit `.agent-core/` and run `scripts/sync-kit.mjs`.
- Priority Hierarchy: Kit Hard Rules (AGENTS.md, TDD 80% coverage, AgentShield Security Grade >= B, Socratic Sizing S/M/L) and human directives strictly override any external principle.
- Autonomy Scoping: The `never-block-on-the-human` principle applies ONLY to reversible, non-destructive implementation tasks. It MUST NEVER bypass PM discovery, plan approval, scope boundaries, `/review`, or `/ship` gates.
- Comment Quality Scoping: The `no-comments` rule applies strictly to diff-only comments that trivially restate the code. Comments explaining non-obvious business invariants, mathematical proofs, security constraints, or bug workarounds MUST be preserved.
- Domain Isolation: QA owns verification skills and runtime validation. Tech Lead owns architectural orchestration. Security Auditor retains exclusive ownership of OWASP/AgentShield security audits.
- Zero Deficit: Every skill must have valid frontmatter (`name`, `description`), exist on disk, and be registered in `.agent-core/skill-packs.json` so `agent-skills-audit.test.mjs` passes with zero deficit.
- Dynamic Test Criteria: All test suites in `npm test` and all checks in `scripts/verify.mjs` must pass dynamically with 0 failures and 0 warnings.

## Review Focus

1. **Self-Reference Elimination:** The plan references `docs/prds/pstack-rigor-verification-prd.md`, not itself.
2. **Comprehensive Scope Coverage:** Includes tasks for `/hotfix`, `/build`, `/review`, `/ship`, adversarial review, comment quality, and performance forensics.
3. **Runnable Fixture & Evidence:** Adds a runnable fixture app (`fixtures/sample-app/`) and automated contract test verifying runtime launch, probes, and evidence persistence.
4. **Honesty Gate:** Verification skills must record status strictly as `BLOCKED` (documenting the specific prerequisite blocker in evidence notes) when real surfaces cannot be run, never faking a `VERIFIED` status.
5. **No Regression Masking:** `maintain-verification-skill` strictly prohibits updating Feature Maps to legitimize actual product regressions.

---

### Task 1: Refine `.agent-core/standards/engineering-principles.md`

**Files:**
- Modify: `.agent-core/standards/engineering-principles.md`

- [x] **Step 1: Clarify explicit limits of `never-block-on-the-human`**
  - Explicitly document that `never-block-on-the-human` CANNOT skip:
    1. PM Socratic discovery or requirement interviews
    2. Implementation plan review and human approval
    3. Scope change decisions
    4. Code review gate (`/review`)
    5. Hard security and release gates (`/ship`)

---

### Task 2: Refine `.agent-core/standards/conventions.md`

**Files:**
- Modify: `.agent-core/standards/conventions.md`

- [x] **Step 1: Refine the `no-comments` / AI Code Slop rule**
  - Limit the rule to *diff-only comments* that restate obvious code (`// increment counter`).
  - Add explicit exception: comments explaining non-obvious business invariants, security constraints, or hardware/platform workarounds must be preserved.

---

### Task 3: Real-Surface Verification Skills Infrastructure

**Files:**
- Existing Artifacts: `.agent-core/skills/create-verification-skill/SKILL.md`
- Existing Artifacts: `.agent-core/skills/maintain-verification-skill/SKILL.md`
- References: `.agent-core/skills/create-verification-skill/references/feature-map-example.md`

- [x] **Step 1: Establish Unified Status Vocabulary**
  - Standardize on exactly 4 statuses across all skills, commands, fixtures, and reports:
    - `VERIFIED`: User journey probed and passed on real surface with matching observable signals & fresh evidence.
    - `REGRESSED`: Regression detected upon re-execution against new code changes.
    - `BLOCKED`: Environment prerequisite missing (honesty gate). Blocker details documented in evidence notes.
    - `UNVERIFIED`: Defined user journey cataloged, awaiting live execution.
- [x] **Step 2: Define Fresh Evidence Standard (Code-Path Diff Semantics)**
  - Evidence log header metadata: `Feature ID`, `Status`, `Git Commit` (code commit SHA), `Timestamp`, `Driver`, `Surface URL`.
  - Freshness rule: Evidence is STALE if application code has changed between recorded `Git Commit` and current `HEAD` (`git diff --name-only <recorded_sha> HEAD`). Commits containing only verification evidence/docs do not invalidate freshness. CI artifacts tied to test build SHA are also supported.
- [x] **Step 3: Enforce Cardinal Rule in `maintain-verification-skill`**
  - Prohibit regression masking: never delete features, never weaken observable signal assertions. Mark status as `REGRESSED` and link failure log `...-REGRESSED.log`.

---

### Task 4: Create Rigor & Forensics Skills

**Files:**
- Create: `.agent-core/skills/adversarial-review/SKILL.md`
- Create: `.agent-core/skills/comment-quality/SKILL.md`
- Create: `.agent-core/skills/benchmark-checklist/SKILL.md`
- Create: `.agent-core/skills/runtime-forensics/SKILL.md`
- Create: `.agent-core/skills/trace-forensics/SKILL.md`

- [x] **Step 1: Create `adversarial-review/SKILL.md`**
  - Independent reviewer role focused on poking holes: race conditions (TOCTOU), state leakages, memory leaks, unhandled boundary cases.
  - Trace every finding to a concrete code path.
  - Categorize findings: MUST-FIX, CONSIDER, REJECT with technical rationale.
  - Include transparency rule: if independent reviewer cannot run, report limitation; never fake a pass.
- [x] **Step 2: Create `comment-quality/SKILL.md`**
  - Review diffs for unnecessary comments.
  - Protect invariant comments and security constraints.
- [x] **Step 3: Create `benchmark-checklist/SKILL.md`**
  - Baseline measurement, isolated variable changes, equivalent re-measurement, and bounded explanation (`explain-the-number`).
- [x] **Step 4: Create `runtime-forensics/SKILL.md`**
  - Live process diagnosis (CPU profile, heap snapshot, live metrics).
- [x] **Step 5: Create `trace-forensics/SKILL.md`**
  - Post-mortem analysis of captured profiling artifacts (cpuprofile, spindump, trace log) without conflating with live runs.

---

### Task 5: Upgrade Commands (`/hotfix`, `/build`, `/review`, `/ship`)

**Files:**
- Modify: `.agent-core/commands/hotfix.md`
- Modify: `.agent-core/commands/build.md`
- Modify: `.agent-core/commands/review.md`
- Modify: `.agent-core/commands/ship.md`

- [x] **Step 1: Upgrade `hotfix.md`**
  - Require exact reproduction steps before fixing.
  - Enforce root-cause tracing (prohibit symptom masking).
  - Re-run repro test on real surface after fix; report before/after evidence using unified vocabulary.
- [x] **Step 2: Upgrade `build.md`**
  - Add fan-out checkpoint in Phase 1: check independent workstreams and shared state (`separate-before-serializing-shared-state`).
  - Add Typed Design Sketch gate in Phase 1/2: establish typed contracts in `.agent-memory/contracts.md` before coding cross-boundary logic.
  - Add QA Feature Map verification in Phase 3.
- [x] **Step 3: Upgrade `review.md`**
  - Add triggered adversarial review for HIGH/CRITICAL blast radius, auth/payment changes, or multi-module diffs.
  - Add diff comment quality check.
  - Add real-surface evidence verification check in `docs/verification/evidence/` with commit SHA matching.
- [x] **Step 4: Upgrade `ship.md`**
  - Verify all core features in `docs/verification/feature-map.md` are marked `VERIFIED` with fresh evidence (recorded SHA has zero application diff against HEAD, zero `REGRESSED`, `BLOCKED`, or `UNVERIFIED`).

---

### Task 6: Update Agent Roles & Modular Skill Packs

**Files:**
- Modify: `.agent-core/agents/qa.md`
- Modify: `.agent-core/agents/tech-lead.md`
- Modify: `.agent-core/skill-packs.json`

- [x] **Step 1: Update `qa.md`**
  - Declare skills under `skills.always` vs `skills.conditional`.
  - Add conditional skills: `create-verification-skill`, `maintain-verification-skill`, `comment-quality`.
- [x] **Step 2: Update `tech-lead.md`**
  - Add conditional skills: `adversarial-review`, `benchmark-checklist`, `runtime-forensics`, `trace-forensics`.
  - Document triggers for each skill.
- [x] **Step 3: Update `skill-packs.json`**
  - Register all new skills in `core` pack (bringing core pack to 81 skills) ensuring 100% agent coverage and zero deficit.

---

### Task 7: Create Runnable Fixture App & Isolated Verification Test

**Files:**
- Create: `fixtures/sample-app/package.json`
- Create: `fixtures/sample-app/server.mjs`
- Create: `fixtures/sample-app/docs/verification/feature-map.md` (clean baseline in `VERIFIED` state)
- Create: `fixtures/sample-app/docs/verification/evidence/*.log` (baseline evidence files)
- Create: `scripts/__tests__/verification-fixture.test.mjs`
- Modify: `package.json` (add test to `npm test`)

- [x] **Step 1: Create `fixtures/sample-app/`**
  - Lightweight standalone Node HTTP server with `/health`, `/api/login`, and `/api/dashboard`.
  - Clean baseline Feature Map and evidence logs committed in `fixtures/sample-app/docs/`.
- [x] **Step 2: Create `scripts/__tests__/verification-fixture.test.mjs` (Contract & Lifecycle Validation)**
  - Validate the verification contract, schema, and process lifecycle defined by `create-verification-skill` and `maintain-verification-skill` (deterministic contract validation, not autonomous LLM subagent simulation).
  - Run verification tests in an isolated temporary directory (`tmpdir`) per run, preventing mutation of committed baseline files.
  - Await readiness probe `/health`.
  - Execute live user journeys (`AUTH-001` and `DASH-001`).
  - Verify schema, headers, and unified status vocabulary (`VERIFIED`).
  - Terminate server and assert clean child process exit.
  - Assert evidence and feature map persist post-shutdown.
  - Test `maintain-verification-skill` regression flow: verify status transitions to `REGRESSED`, expected signals are preserved without masking, and regression evidence is recorded.
- [x] **Step 3: Wire test into `package.json` `scripts.test`**

---

### Task 8: End-User Documentation & Multi-Harness Sync Parity

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`
- Generated targets: `.opencode/`, `.agents/`, `.claude/`

- [x] **Step 1: Update `README.md`**
  - Introduce v1.6.0 Engineering Rigor & Runtime Verification Suite section.
  - Update skill count to 307 skills (core pack: 81 skills), 12 agents, 9 commands, 14 test suites.
  - Update changelog with v1.6.0, v1.5.0, v1.4.0.
- [x] **Step 2: Run Multi-Harness Sync Engine & Skill Registry**
  - `node scripts/sync-kit.mjs`
  - `node scripts/skill-registry.mjs`
- [x] **Step 3: Run Full Test Suite & E2E Verification**
  - Run `npm test` across all 14 test suites (98 unit tests).
  - Run `node scripts/verify.mjs` (143 checks) and `npm run verify:cli`.
