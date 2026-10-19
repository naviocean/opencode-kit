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
3. **Fixture Validation:** A standalone working app (`fixtures/sample-app/`) proves that `create-verification-skill` and `maintain-verification-skill` execute against real surfaces and retain evidence after teardown.
4. **Honesty Gate:** Verification skills must explicitly report `BLOCKED: Runtime Environment Missing` when real surfaces cannot be run, never faking a `PASS`.
5. **No Regression Masking:** `maintain-verification-skill` strictly prohibits updating Feature Maps to legitimize actual product regressions.

---

### Task 1: Refine `.agent-core/standards/engineering-principles.md`

**Files:**
- Modify: `.agent-core/standards/engineering-principles.md`

- [ ] **Step 1: Clarify explicit limits of `never-block-on-the-human`**
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

- [ ] **Step 1: Refine the `no-comments` / AI Code Slop rule**
  - Limit the rule to *diff-only comments* that restate obvious code (`// increment counter`).
  - Add explicit exception: comments explaining non-obvious business invariants, security constraints, or hardware/platform workarounds must be preserved.

---

### Task 3: Create Rigor & Forensics Skills

**Files:**
- Create: `.agent-core/skills/adversarial-review/SKILL.md`
- Create: `.agent-core/skills/comment-quality/SKILL.md`
- Create: `.agent-core/skills/benchmark-checklist/SKILL.md`
- Create: `.agent-core/skills/runtime-forensics/SKILL.md`
- Create: `.agent-core/skills/trace-forensics/SKILL.md`

- [ ] **Step 1: Create `adversarial-review/SKILL.md`**
  - Independent reviewer role focused on poking holes: race conditions, state leakages, memory leaks, unhandled boundary cases.
  - Trace every finding to a concrete code path.
  - Categorize findings: MUST-FIX, CONSIDER, REJECT with technical rationale.
  - Include transparency rule: if independent reviewer cannot run, report limitation; never fake a pass.
- [ ] **Step 2: Create `comment-quality/SKILL.md`**
  - Review diffs for unnecessary comments.
  - Protect invariant comments and security constraints.
- [ ] **Step 3: Create `benchmark-checklist/SKILL.md`**
  - Baseline measurement, isolated variable changes, equivalent re-measurement, and bounded explanation (`explain-the-number`).
- [ ] **Step 4: Create `runtime-forensics/SKILL.md`**
  - Live process diagnosis (CPU profile, heap snapshot, live metrics).
- [ ] **Step 5: Create `trace-forensics/SKILL.md`**
  - Post-mortem analysis of captured profiling artifacts (cpuprofile, spindump, trace log) without conflating with live runs.

---

### Task 4: Upgrade Commands (`/hotfix`, `/build`, `/review`, `/ship`)

**Files:**
- Modify: `.agent-core/commands/hotfix.md`
- Modify: `.agent-core/commands/build.md`
- Modify: `.agent-core/commands/review.md`
- Modify: `.agent-core/commands/ship.md`

- [ ] **Step 1: Upgrade `hotfix.md`**
  - Require exact reproduction steps before fixing.
  - Enforce root-cause tracing (prohibit symptom masking).
  - Re-run repro test on real surface after fix; report before/after evidence.
- [ ] **Step 2: Upgrade `build.md`**
  - Add fan-out checkpoint in Phase 1: check independent workstreams and shared state (`separate-before-serializing-shared-state`).
  - Add Typed Design Sketch gate in Phase 1/2: establish typed contracts in `.agent-memory/contracts.md` before coding cross-boundary logic.
  - Add QA Feature Map verification in Phase 3.
- [ ] **Step 3: Upgrade `review.md`**
  - Add triggered adversarial review for HIGH/CRITICAL blast radius, auth/payment changes, or multi-module diffs.
  - Add diff comment quality check.
  - Add real-surface evidence verification check in `docs/verification/evidence/`.
- [ ] **Step 4: Upgrade `ship.md`**
  - Verify all core features in `docs/verification/feature-map.md` are marked `VERIFIED` with fresh evidence.

---

### Task 5: Update Agent Roles & Skill Packs

**Files:**
- Modify: `.agent-core/agents/qa.md`
- Modify: `.agent-core/agents/tech-lead.md`
- Modify: `.agent-core/skill-packs.json`

- [ ] **Step 1: Update `qa.md`**
  - Declare skills under `skills.always` vs `skills.conditional`.
  - Add conditional skills: `create-verification-skill`, `maintain-verification-skill`, `comment-quality`.
- [ ] **Step 2: Update `tech-lead.md`**
  - Add conditional skills: `adversarial-review`, `benchmark-checklist`, `runtime-forensics`, `trace-forensics`.
  - Document triggers for each skill.
- [ ] **Step 3: Update `skill-packs.json`**
  - Register all new skills in `core` and `devops-infra` packs.

---

### Task 6: Create Runnable Fixture App & Automated Test

**Files:**
- Create: `fixtures/sample-app/package.json`
- Create: `fixtures/sample-app/server.mjs`
- Create: `scripts/__tests__/verification-fixture.test.mjs`
- Modify: `package.json` (add test to `npm test`)

- [ ] **Step 1: Create `fixtures/sample-app/`**
  - Lightweight standalone Node HTTP server with `/health`, `/api/login`, and `/api/dashboard`.
- [ ] **Step 2: Create `scripts/__tests__/verification-fixture.test.mjs`**
  - Start sample app in child process.
  - Execute real HTTP probes to verify user journeys.
  - Generate Feature Map at `fixtures/sample-app/docs/verification/feature-map.md`.
  - Save evidence to `fixtures/sample-app/docs/verification/evidence/`.
  - Terminate server and assert evidence files persist.
  - Verify regression detection logic.
- [ ] **Step 3: Wire test into `package.json` `scripts.test`**

---

### Task 7: Synchronize Multi-Harness Adapters & Verify

**Files:**
- Generated targets: `.opencode/`, `.agents/`, `.claude/`

- [ ] **Step 1: Run `node scripts/sync-kit.mjs`**
- [ ] **Step 2: Run `node scripts/skill-registry.mjs`**
- [ ] **Step 3: Run `npm test` across all 14 test suites**
- [ ] **Step 4: Run `node scripts/verify.mjs` and `npm run verify:cli`**
