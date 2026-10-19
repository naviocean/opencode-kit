# Implementation Plan: PStack Engineering Rigor & Runtime Verification Integration

> **Goal:** Integrate Lauren Tan's pstack high-rigor engineering principles and runtime verification skills (create-verification-skill, maintain-verification-skill, Feature Map) into OpenCode SaaS Kit v1.5.0 without disrupting existing multi-agent domain boundaries, Socratic sizing, or AgentShield hard gates.
>
> **Architecture:** Single Source of Truth (`.agent-core/`) expansion. Standardize 24 engineering principles in `standards/engineering-principles.md` and `standards/conventions.md`. Add real-surface verification skills under `skills/` and assign them to the `qa` agent and `core` skill pack. Synchronize adapters across OpenCode, Claude Code, Antigravity, and Codex via `scripts/sync-kit.mjs`.
>
> **Tech Stack:** Node.js (>= 18.0.0), Markdown, YAML frontmatter, Playwright/PTY/cURL test drivers, GitNexus code intelligence.
>
> **Spec:** [PStack Integration Proposal & Consolidated Master Plan](../../docs/plans/2026-10-19-pstack-rigor-verification.md)

---

## Global Constraints

- SSoT is strictly `.agent-core/`. Never edit generated directories (`.opencode/`, `.agents/`, `.claude/`) directly; always edit `.agent-core/` and run `scripts/sync-kit.mjs`.
- Priority Hierarchy: Kit Hard Gates (TDD 80% coverage, AgentShield Security Grade >= B, Socratic Sizing S/M/L) and human decisions strictly override any external principle ("never-block-on-the-human" applies ONLY to reversible tasks).
- Domain Isolation: QA owns verification skills and runtime validation. Tech Lead owns architectural orchestration. Security Auditor retains exclusive ownership of OWASP/AgentShield security audits.
- Zero Deficit: Every skill must have valid frontmatter (`name`, `description`), exist on disk, and be registered in `.agent-core/skill-packs.json` so `agent-skills-audit.test.mjs` passes with zero deficit.
- All existing tests (97 unit tests + 144 verification checks) must pass GREEN before and after implementation.

## Review Focus

1. **Context Bloat Prevention:** The 24 principles must be trigger-based, not forcibly prepended to every trivial prompt.
2. **Honesty Gate:** Verification skills must explicitly report `BLOCKED: Runtime Environment Missing` when real surfaces cannot be run, never faking a `PASS`.
3. **No Regression Masking:** `maintain-verification-skill` must prohibit updating Feature Maps to legitimize actual product regressions.
4. **Clean-Room Attribution:** Clean-room implementation of concepts from Lauren Tan (Cursor pstack) and Michael Denyer (pstack-claude) under standard MIT licensing.
5. **Adapter Parity:** Symlinks and file copies across OpenCode, Claude Code, and Antigravity must resolve without broken paths.

---

### Task 1: Create `.agent-core/standards/engineering-principles.md`

**Files:**
- Create: `.agent-core/standards/engineering-principles.md`

**Interfaces:**
- Produces: 24 standardized engineering principles categorized into 6 operational domains, each with clear triggers, rationale (Why), actionable pattern, and conflict resolution protocol.

- [ ] **Step 1: Write `.agent-core/standards/engineering-principles.md`**
  - Group 1: Architecture & Boundary Discipline (`boundary-discipline`, `type-system-discipline`, `model-the-domain`, `foundational-thinking`, `minimize-reader-load`, `make-operations-idempotent`)
  - Group 2: Debugging & Forensics (`fix-root-causes`, `attack-the-premise`, `explain-the-number`)
  - Group 3: Testing & Verification (`test-behavior-not-implementation`, `prove-it-works`, `sequence-verifiable-units`)
  - Group 4: Refactoring & Technical Debt (`subtract-before-you-add`, `migrate-callers-then-delete-legacy-apis`, `laziness-protocol`, `outcome-oriented-execution`, `redesign-from-first-principles`)
  - Group 5: Agent Ergonomics & Context (`guard-the-context-window`, `never-block-on-the-human`, `build-the-lever`, `encode-lessons-in-structure`, `separate-before-serializing-shared-state`)
  - Group 6: Product & Tradeoffs (`experience-first`, `exhaust-the-design-space`)
  - Include Priority Hierarchy section.

- [ ] **Step 2: Verify file format and link resolution**

---

### Task 2: Update `.agent-core/standards/conventions.md`

**Files:**
- Modify: `.agent-core/standards/conventions.md`

**Interfaces:**
- Consumes: `engineering-principles.md`
- Produces: Expanded Anti-Patterns (Symptom Masking, Over-mocking, Unparsed Boundary Data, Code Slop / No-comments) and pointer section to engineering principles.

- [ ] **Step 1: Add new Code and Process Anti-Patterns**
  - Add `Symptom Masking (hiding bug with guard without addressing root cause)`
  - Add `Testing implementation instead of observable behavior (over-mocking)`
  - Add `AI Slop and trivial comments (no-comments rule)`
  - Add `Unparsed raw external types crossing system boundary`
- [ ] **Step 2: Add Engineering Principles cross-reference section**

---

### Task 3: Create `.agent-core/skills/create-verification-skill/`

**Files:**
- Create: `.agent-core/skills/create-verification-skill/SKILL.md`
- Create: `.agent-core/skills/create-verification-skill/references/feature-map-example.md`

**Interfaces:**
- Produces: Operational skill guiding AI to inspect application runtime, select driver (Playwright/PTY/cURL), define launch/readiness/signals/evidence storage, and generate initial `docs/verification/feature-map.md`.

- [ ] **Step 1: Create `SKILL.md` with valid YAML frontmatter (`name`, `description`)**
  - Define survey steps (runtime, authentication, seed data, user surface)
  - Define driver selection heuristics (Web, CLI/TUI, Backend HTTP)
  - Define evidence protocol (`docs/verification/evidence/`, must survive teardown)
  - Enforce real test execution of at least one feature before completion
- [ ] **Step 2: Create `references/feature-map-example.md` with standardized table layout**

---

### Task 4: Create `.agent-core/skills/maintain-verification-skill/`

**Files:**
- Create: `.agent-core/skills/maintain-verification-skill/SKILL.md`

**Interfaces:**
- Produces: Operational skill to audit Feature Map against code changes, re-run verification on real surface, report product bugs, and prevent legitimizing regressions.

- [ ] **Step 1: Create `SKILL.md` with valid YAML frontmatter (`name`, `description`)**
  - Define audit workflow against touched files
  - Define re-verification loop
  - Define regression detection vs intentional contract change
  - Prohibit altering Feature Map to mask failing behavior

---

### Task 5: Update Agent Definitions (`qa.md` & `tech-lead.md`)

**Files:**
- Modify: `.agent-core/agents/qa.md`
- Modify: `.agent-core/agents/tech-lead.md`

**Interfaces:**
- Consumes: `create-verification-skill`, `maintain-verification-skill`, `engineering-principles.md`
- Produces: QA agent ownership of real-surface verification and runtime evidence; Tech Lead orchestration with context guard and reversible task autonomy.

- [ ] **Step 1: Update `qa.md`**
  - Add `create-verification-skill` and `maintain-verification-skill` to Skills table
  - Add verification workflow to `/build`, `/review`, and `/ship`
  - Add rule: Never report `PASS` when runtime verification could not run
- [ ] **Step 2: Update `tech-lead.md`**
  - Add `guard-the-context-window` and `never-block-on-the-human` directives
  - Wire conflict resolution to `engineering-principles.md`

---

### Task 6: Update `.agent-core/skill-packs.json`

**Files:**
- Modify: `.agent-core/skill-packs.json`

**Interfaces:**
- Consumes: New skills
- Produces: 100% coverage in `core` pack so `agent-skills-audit.test.mjs` passes.

- [ ] **Step 1: Add `create-verification-skill` and `maintain-verification-skill` to `packs.core.skills`**

---

### Task 7: Synchronize Multi-Harness Adapters & Run Test Suite

**Files:**
- Generated targets: `.opencode/`, `.agents/`, `.claude/`

**Interfaces:**
- Executes: `node scripts/sync-kit.mjs`, `node scripts/skill-registry.mjs`, `npm test`, `node scripts/verify.mjs`

- [ ] **Step 1: Run `node scripts/sync-kit.mjs` to synchronize files and symlinks**
- [ ] **Step 2: Run `node scripts/skill-registry.mjs` to regenerate `agent-registry.json`**
- [ ] **Step 3: Run `npm test` across all 13 test suites**
- [ ] **Step 4: Run `node scripts/verify.mjs` to confirm all 144+ checks pass**
