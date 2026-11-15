# Implementation Plan: Guarded Harness² Integration (v2.0 Recursive Agent Harnessing)

> **Goal:** Integrate Google Research's **Harness²** (*Recursive Agent Harnessing for an Open World*, arXiv:2610.14224) into OpenCode SaaS Kit as a **Guarded Self-Evolving Layer** that works in 100% harmony with **PStack Engineering Rigor & Real-Surface Verification** (v1.6.0) and **Harness v1.9 FSM**.
>
> **Architecture:** Two-Level Guarded Recursion on top of `.agent-core/` and `.agent-memory/`:
> 1. **SurfaceSpec & Immutable Core Enforcement (`scripts/harness-surface.mjs`):** Formalizes the 8 harness components (`c1..c8`), enforces `always_on_max` byte/line caps (`guard-the-context-window`), compiles/validates skill scripts (`compile_skill_scripts`), and strictly locks Tier-1 PStack & Security surfaces (`IMMUTABLE_SURFACES`) while allowing controlled evolution on `EVOLVABLE_SURFACES`.
> 2. **Domain-Scoped Experience Library (`scripts/experience-library.mjs` & `.agent-memory/experiences/`):** Replaces deferred `continuous-learning-v2` with the `Harness²` `Library` contract requiring the strict triad `("cue", "lesson", "evidence")` tied to verifiable PStack evidence (`gitHead`, test/verification log) and indexed per Skill Pack domain (`<pack>/INDEX.md`).
> 3. **Task-Level Propose–Probe–Compose Engine (`scripts/propose-probe-compose.mjs`):** Triggered selectively on PStack Principle #8 (`attack-the-premise` — 2 consecutive failures in `harness-state.json`) or Principle #24 (`exhaust-the-design-space` in `/meeting` / `/build`). Uses PStack Real-Surface Verification (`VERIFIED` / `REGRESSED` / `BLOCKED`) and TDD as a **Hard Disqualification Filter** before composing winning candidates.
> 4. **Workflow & Eval Wiring:** Updates `/hotfix`, `/build`, `/review`, `/ship`, `/meeting`, `verify.mjs`, and `eval-harness.mjs`.
>
> **Tech Stack:** Node.js (>= 18.0.0, zero external runtime dependencies), pure ESM modules, `node:test`.

---

## 1. Compatibility & Conflict Resolution Matrix (Harness² ↔ PStack Verification)

Raw academic `Harness²` is designed for open-world benchmarks without ground-truth tests, whereas PStack Verification enforces strict runtime evidence. To ensure **zero conflict and 100% synergy**, the integration enforces 4 binding reconciliation rules:

| Intersection Point | Raw `Harness²` Behavior | PStack Rigor Rule | Guarded Integration Resolution (Zero Conflict) |
|---|---|---|---|
| **1. Hierarchy of Authority (`c1, c2` Surfaces)** | Allows the Harness Editor to mutate `system prompt` and `guardrails`. | Tier-1 Hard Rules (`AGENTS.md`, `conventions.md`, `engineering-principles.md`, `pre-tool-guard.mjs`, `security-gate.mjs`, verification skills) are **non-negotiable**. | `harness-surface.mjs` classifies `c1, c2` and PStack verification skills as **`IMMUTABLE_SURFACES`**. Any candidate patch touching them is deterministically rejected. Only `EVOLVABLE_SURFACES` (`.agent-memory/experiences/`, additive skill references/scripts) can be updated. |
| **2. Probe Selection vs. `prove-it-works`** | Selects candidate probes via ground-truth-free behavioral contrast. | Never fake `VERIFIED`; never mask a `REGRESSED` feature in `docs/verification/feature-map.md`. | **PStack is the Hard Pre-Filter, Harness² is the Tie-Breaker:** Every probe must first pass TDD + AgentShield + PStack Feature Map checks (zero `REGRESSED`). Behavioral contrast (`Compose`) only compares candidates that pass all hard gates. |
| **3. When Recursion Triggers (`--k` Budget)** | Runs $2K+1$ rollouts on *every* task (5x token cost). | Principle #15 (`laziness-protocol`) & Adaptive Sizing (`S / M / L`): bias toward minimal overhead for routine tasks. | **Conditional Triggering:** Task-level `Propose–Probe–Compose` only triggers when: (a) `harness-state.json` records $\ge 2$ consecutive failures on a task/fix (**PStack #8 `attack-the-premise`**), or (b) explicitly invoked in `/meeting` or `ultrabrain` tasks (**PStack #24 `exhaust-the-design-space`**). |
| **4. Experience Recording (`cue`, `lesson`, `evidence`)** | Reflector writes `EXPERIENCE.md` after any rollout. | Principle #11 (`prove-it-works`) & #21 (`encode-lessons-in-structure`): lessons must be backed by real runtime proof. | `experience-library.mjs` rejects any experience entry whose `evidence` field does not reference a real command output, test result, commit SHA, or `docs/verification/evidence/*.log` artifact, or that contains secrets. |

---

## 2. Architecture Overview

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                     GUARDED HARNESS² + PSTACK ARCHITECTURE                        │
├─────────────────────────────────────────┬─────────────────────────────────────────┤
│ Workstream 1: SurfaceSpec & Caps        │ Workstream 2: Domain Experience Library │
│ scripts/harness-surface.mjs             │ scripts/experience-library.mjs          │
│ - IMMUTABLE vs EVOLVABLE surface guard  │ .agent-memory/experiences/<pack>/       │
│ - always_on_max budget cap enforcement  │ - Strict (cue, lesson, evidence) schema │
│ - compile_skill_scripts syntax check    │ - Secret & PStack evidence validation   │
│ - normalizeRel() path escape guard      │ - Auto-generated per-pack INDEX.md      │
├─────────────────────────────────────────┼─────────────────────────────────────────┤
│ Workstream 3: Propose–Probe–Compose     │ Workstream 4: Command & Eval Wiring     │
│ scripts/propose-probe-compose.mjs       │ - /hotfix, /build, /ship, /meeting      │
│ - Triggered on >=2 failures in FSM      │ - verify.mjs + eval-harness.mjs (6th    │
│   (PStack #8 attack-the-premise)        │   dimension: recursive-harnessing)      │
│ - Hard filter: TDD + PStack Feature Map │ - Replaces deferred continuous-learning │
│ - Omitted-is-inherited delta composer   │   v2 plan with production implementation│
└─────────────────────────────────────────┴─────────────────────────────────────────┘
```

---

## Workstream 1: `SurfaceSpec` Guard, Context Budget Cap & Script Compiler (`scripts/harness-surface.mjs`)

**Goal:** Port `harness2/core/tree.py` (`SurfaceSpec`, `always_on_max`, `compile_skill_scripts`, `normalize_rel`, and `omitted-is-inherited` diff validation) into pure Node.js while locking PStack & Security surfaces as immutable.

### Task 1.1: Create `scripts/harness-surface.mjs` & Unit Tests

**Files:**
- Create: `scripts/__tests__/harness-surface.test.mjs`
- Create: `scripts/harness-surface.mjs`

- [ ] **Step 1 (RED): Write unit tests in `scripts/__tests__/harness-surface.test.mjs`**
  - Test `normalizeRel(relPath)`: rejects absolute paths (`/etc/passwd`), parent traversal (`../../AGENTS.md`), and null bytes.
  - Test `classifySurface(relPath)`:
    - Returns `{ editable: false, tier: 'immutable', component: 'c1_prompt' | 'c2_guardrails' | 'pstack_verification' }` for `AGENTS.md`, `CLAUDE.md`, `.agent-core/standards/*`, `.agent-core/rules/*`, `.agent-core/hooks/*`, `scripts/security-gate.mjs`, `scripts/pre-tool-guard.mjs`, `.agent-core/skills/create-verification-skill/*`, `.agent-core/skills/maintain-verification-skill/*`, and `docs/verification/feature-map.md`.
    - Returns `{ editable: true, tier: 'evolvable', component: 'c3_memory' | 'c6_skills' | 'c7_scripts' }` for `.agent-memory/experiences/**`, `.agent-core/skills/<skill>/references/**`, and `.agent-core/skills/<skill>/scripts/**`.
  - Test `validateAlwaysOnBudget(rootDir)`: enforces `always_on_max` byte/line caps on `AGENTS.md`, `CLAUDE.md`, and `.agent-core/rules/*.md` (aligned with PStack #18 `guard-the-context-window`).
  - Test `validateSkillScripts(rootDir)`: discovers `.py`, `.sh`, `.mjs`, `.js` inside `.agent-core/skills/*/scripts/` and checks syntax (`node --check`, `bash -n`, `python3 -m py_compile` when available).
  - Test `validateHarnessProposal(patchTree)`: validates an `omitted-is-inherited` diff dictionary `{ [relPath]: content }`, rejecting any touch to `IMMUTABLE_SURFACES` or secret patterns.

- [ ] **Step 2 (GREEN): Implement `scripts/harness-surface.mjs`**
  - Export `SURFACE_SPEC`, `normalizeRel`, `classifySurface`, `validateAlwaysOnBudget`, `validateSkillScripts`, `validateHarnessProposal`.
  - Provide CLI modes: `node scripts/harness-surface.mjs check` (runs budget + script syntax checks) and `node scripts/harness-surface.mjs validate-patch <json-file>`.

---

## Workstream 2: Domain-Scoped Experience Library (`scripts/experience-library.mjs`)

**Goal:** Port `harness2/core/library.py` into `.agent-memory/experiences/<pack>/` with PStack evidence verification, superseding the deferred `continuous-learning-v2-plan.md`.

### Task 2.1: Create `scripts/experience-library.mjs` & Unit Tests

**Files:**
- Create: `scripts/__tests__/experience-library.test.mjs`
- Create: `scripts/experience-library.mjs`
- Create: `.agent-core/memory/experiences/README.md`

- [ ] **Step 1 (RED): Write unit tests in `scripts/__tests__/experience-library.test.mjs`**
  - Test `hasValidExperience(entry)`: strictly requires non-empty `domain` (valid pack ID in `skill-packs.json`), `taskId`, `cue`, `lesson`, and `evidence` (must contain concrete verification reference: commit SHA, test command/result, or `docs/verification/evidence/` log path).
  - Test secret rejection: rejects any experience entry containing API keys, tokens, or `.env` dumps.
  - Test `recordExperience(projectDir, entry)`:
    - Writes `.agent-memory/experiences/<domain>/entries/<slug>/EXPERIENCE.md` and optional adopted delta `patch.json`.
    - Regenerates `.agent-memory/experiences/<domain>/INDEX.md` with a concise table (`Task | Cue | Lesson Summary | Evidence`) capped to prevent context bloat.
  - Test `queryExperiences(projectDir, { domain, query })`: returns matching domain experiences sorted by recency/relevance for agent startup injection.
  - Test `forgetExperience(projectDir, domain, taskId)`: cleanly removes an invalidated entry and updates `INDEX.md`.

- [ ] **Step 2 (GREEN): Implement `scripts/experience-library.mjs` & `.agent-core/memory/experiences/README.md`**
  - Export `hasValidExperience`, `recordExperience`, `queryExperiences`, `forgetExperience`, `listDomains`.
  - CLI interface:
    - `node scripts/experience-library.mjs record --domain=nestjs-backend --task=AUTH-01 --cue="..." --lesson="..." --evidence="..."`
    - `node scripts/experience-library.mjs query --domain=nestjs-backend`
    - `node scripts/experience-library.mjs list`

---

## Workstream 3: Conditional `Propose–Probe–Compose` Engine (`scripts/propose-probe-compose.mjs`)

**Goal:** Implement `Harness²`'s task-level contrastive recursion (`Propose → Probe → Compose`) coupled with `scripts/harness-state.mjs` failure tracking and PStack's hard verification filter.

### Task 3.1: Extend `scripts/harness-state.mjs` with Failure Counter & Trigger Detection

**Files:**
- Modify: `scripts/__tests__/harness-state.test.mjs`
- Modify: `scripts/harness-state.mjs`

- [ ] **Step 1 (RED): Add failure counter tests in `scripts/__tests__/harness-state.test.mjs`**
  - Track `attempts` and `consecutiveFailures` per task when `updateTaskStatus(statePath, taskId, 'FAILED', detail)` is called.
  - When `consecutiveFailures >= 2`, automatically set `task.requiresContrastiveProbe = true` and `task.escalationReason = 'PStack #8 attack-the-premise: >=2 consecutive failures — trigger Harness2 Propose-Probe-Compose'`.
  - Reset `consecutiveFailures = 0` and `requiresContrastiveProbe = false` when a task transitions to `'DONE'`.

- [ ] **Step 2 (GREEN): Implement failure tracking in `scripts/harness-state.mjs`**

### Task 3.2: Create `scripts/propose-probe-compose.mjs` & Unit Tests

**Files:**
- Create: `scripts/__tests__/propose-probe-compose.test.mjs`
- Create: `scripts/propose-probe-compose.mjs`

- [ ] **Step 1 (RED): Write unit tests in `scripts/__tests__/propose-probe-compose.test.mjs`**
  - Test `createProbeSession(projectDir, { taskId, domain, premise, candidates })`:
    - Validates each candidate's `patch` via `validateHarnessProposal()` (blocks any candidate mutating `IMMUTABLE_SURFACES`).
  - Test `evaluateProbes(candidatesWithResults)`:
    - **Hard PStack Disqualification Filter:** Any candidate with `testsPassed: false`, `securityGrade` below `'B'`, or `featureMapStatus === 'REGRESSED'` is marked `disqualified: true` with explicit reason.
    - **Contrastive Composer:** Among non-disqualified candidates, ranks by verification status (`VERIFIED` > `UNVERIFIED`), test pass count, and benchmark/probe score, and composes the winning `adoptedPatch` + structured `experience` (`cue`, `lesson`, `evidence`).
    - **Honesty Gate:** If all candidates are disqualified or runtime is `BLOCKED`, returns `verdict: 'BLOCKED'` or `'ALL_CANDIDATES_REJECTED'` — never fakes a `COMPOSED` pass.

- [ ] **Step 2 (GREEN): Implement `scripts/propose-probe-compose.mjs`**
  - Export `createProbeSession`, `recordProbeResult`, `evaluateProbes`, `composeWinningHarness`.
  - CLI interface for orchestrator/subagents during `/hotfix`, `/build`, and `/meeting`.

---

## Workstream 4: Workflow Integration & 6th Compliance Dimension

### Task 4.1: Wire Guarded Harness² into Commands & Standards

**Files:**
- Modify: `.agent-core/commands/hotfix.md`
- Modify: `.agent-core/commands/build.md`
- Modify: `.agent-core/commands/ship.md`
- Modify: `.agent-core/commands/meeting.md`
- Modify: `.agent-core/standards/engineering-principles.md`
- Modify: `docs/plans/continuous-learning-v2-plan.md` (mark superseded by v2.0 Guarded Harness²)

- [ ] **Step 1: Update commands & principles**
  - In `hotfix.md` & `build.md`: Document that if a task fails 2 consecutive attempts (`requiresContrastiveProbe: true` in `harness-state.json`), the agent MUST run `propose-probe-compose.mjs` (PStack #8 `attack-the-premise` + Harness² Task-Level Recursion) before attempting a 3rd code edit.
  - In `ship.md`: Add optional post-ship step to record validated architectural/debugging lessons into `.agent-memory/experiences/` via `experience-library.mjs` (Harness² Harnessing-Level Recursion).
  - In `meeting.md`: Allow Round 2 (Adversarial Critique) to use `propose-probe-compose.mjs` to empirically probe competing RFC candidates.

### Task 4.2: Expand `verify.mjs`, `eval-harness.mjs` & `package.json`

**Files:**
- Modify: `scripts/verify.mjs`
- Modify: `scripts/eval-harness.mjs`
- Modify: `scripts/__tests__/eval-harness.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add Dimension 6 (`recursive-harnessing`) to `eval-harness.mjs`**
  - Verify `IMMUTABLE_SURFACES` protection blocks mutations to `AGENTS.md`, `pre-tool-guard.mjs`, and PStack verification skills.
  - Verify `always_on_max` context budget passes on all active `always-on` files.
  - Verify `compile_skill_scripts` syntax check passes across `.agent-core/skills/*/scripts/`.
  - Verify `experience-library.mjs` enforces the `(cue, lesson, evidence)` triad and rejects unverified or secret-containing lessons.
  - Verify `propose-probe-compose.mjs` disqualifies any probe candidate that causes a PStack `REGRESSED` status.
- [ ] **Step 2: Add new test suites to `package.json` `npm test` script**
  - Add `harness-surface.test.mjs`, `experience-library.test.mjs`, and `propose-probe-compose.test.mjs`.

---

## Verification & Release Gate Plan

1. **Sync All Harnesses:** `node scripts/sync-kit.mjs`
2. **Run All Unit & Integration Test Suites (19 suites):** `npm test`
3. **Run Kit Verification:** `node scripts/verify.mjs`
4. **Run 6-Dimension Behavioral Compliance Eval:** `npm run eval` (Target: **HCI = 100%**)
5. **Run AgentShield Security Gate:** `node scripts/security-gate.mjs --min-grade=B`
