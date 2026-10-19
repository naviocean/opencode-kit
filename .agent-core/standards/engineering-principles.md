# Software Engineering Principles & Rigor Standards

> **Status:** Active Standard (SSoT)  
> **Source of Truth:** `.agent-core/standards/engineering-principles.md`  
> **Applies to:** All 12 Squad Agents across OpenCode, Claude Code, Antigravity, and OpenAI Codex.  
> **Attribution:** Adapted with clean-room synthesis from Lauren Tan's *pstack* engineering heuristics and Cursor engineering discipline.

---

## 1. Hierarchy of Authority (Non-Negotiable)

When an engineering principle appears to conflict with a project rule or human instruction, resolve strictly by this hierarchy:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Kit Hard Rules (AGENTS.md / conventions.md § Anti-Patterns)│
│    - TDD 80%+ statement coverage                            │
│    - AgentShield Security Grade >= B (Zero secret leaks)     │
│    - Adaptive Socratic Sizing (S / M / L)                   │
│    - Strict Domain Isolation (Rule 8: Cross-domain forbidden)│
├─────────────────────────────────────────────────────────────┤
│ 2. Explicit Human Directives in Current Session             │
├─────────────────────────────────────────────────────────────┤
│ 3. Engineering Rigor Principles (This Document)             │
│    - "Never block on human" applies ONLY to reversible work  │
│    - Never bypass a verification gate or security scan      │
└─────────────────────────────────────────────────────────────┘
```

**Conflict Resolution Rule:** A principle must NEVER be used to bypass an AgentShield gate, skip TDD, violate domain ownership, or override an explicit user preference.

---

## 2. Principle Catalog by Operational Domain

### Domain A: Architecture & Boundary Discipline

#### 1. `boundary-discipline`
* **Trigger:** Writing validation, error handling, input sanitization, or framework adapters (controllers, CLI parsers, webhooks).
* **Why:** Scattered validation throughout business logic is noisy, redundant, and fosters a false sense of security. Keep core logic pure and testable without framework baggage.
* **Pattern:**
  - Place all validation, schema parsing, and type narrowing strictly at **system boundaries** (HTTP controllers, CLI arguments, database ingress, config parsers).
  - Inside system boundaries: Trust internal types unconditionally. Pure functions with zero framework dependencies.
  - No redundant `nil`/`undefined` guards deep in internal call stacks if boundary already validated.

#### 2. `type-system-discipline`
* **Trigger:** Designing types, DTOs, schemas, or reviewing signatures in TypeScript, Rust, or Python.
* **Why:** Type systems should eliminate entire classes of runtime errors before code executes.
* **Pattern:**
  - **Make illegal states unrepresentable:** Use tagged unions / discriminated unions instead of multiple optional booleans (`{ status: 'success', data } | { status: 'error', error }`).
  - **Brand semantic primitives:** `UserId` and `OrderId` should not be interchangeable strings. Use branded types in TypeScript or newtypes in Rust.
  - **Parse, don't validate:** Raw data is untyped until a boundary function transforms it into a domain entity.
  - Derive types from authoritative schemas (Prisma, Zod, OpenAPI) rather than hand-rolling duplicated parallel interfaces.

#### 3. `model-the-domain`
* **Trigger:** Stateful logic, business workflows with complex branching, or shared data shapes across files.
* **Why:** Ad-hoc flags (`isPending`, `isCompleted`, `isRetrying`) cause impossible intermediate states and race conditions.
* **Pattern:**
  - Represent lifecycle transitions as an explicit finite state machine (FSM).
  - Encapsulate valid transitions in domain methods, not random external field assignments.
  - If a concept exists in the real-world business, name it explicitly in code.

#### 4. `foundational-thinking`
* **Trigger:** Before writing logic: picking data structures, sequencing scaffold work, concurrency design.
* **Why:** Choosing the wrong data structure forces downstream code into convoluted workarounds.
* **Pattern:**
  - Get the core data structures right first; downstream algorithmic code becomes obvious and concise.
  - Ask: Who owns this state? Who writes? Who reads? What happens under concurrent access?
  - Prefer immutable data structures for business rules; isolate mutation to well-defined state managers.

#### 5. `minimize-reader-load`
* **Trigger:** Writing or reviewing code that is difficult to follow, or refactoring complex flows.
* **Why:** Code is read 10x more than written. Cognitive friction causes subtle maintenance bugs.
* **Pattern:**
  - Collapse single-caller abstractions and one-line passthrough wrappers.
  - Shrink mutable variable scopes to the minimum necessary block.
  - Minimize the number of layers between a question and its answer. Flat is better than deeply nested.

#### 6. `make-operations-idempotent`
* **Trigger:** Designing CLI commands, background jobs, database migrations, lifecycle hooks, or retry logic.
* **Why:** Distributed systems, container restarts, and network hiccups guarantee that operations will be executed more than once.
* **Pattern:**
  - Ensure running the operation $N$ times produces the exact same end state as running it once.
  - Use upserts (`INSERT ... ON CONFLICT DO UPDATE`), unique idempotency keys, and declarative reconciliations.
  - Verify that a crash midway through can safely resume without duplicating side effects.

---

### Domain B: Debugging & Forensics

#### 7. `fix-root-causes`
* **Trigger:** Debugging any bug, test failure, error report, or production incident.
* **Why:** Symptom fixes mask evidence, leave underlying flaws free to mutate, and inject technical debt.
* **Pattern:**
  - **Repro first:** Never touch production code without reproducing the defect in an automated test.
  - Trace backward through the call chain to the exact first point the system entered an invalid state.
  - Ask: *Is this state legitimate?* If yes, handle it. If no, fix the generator of that state—do NOT just slap an `if (!obj) return` guard at the crash site.
  - If a workaround requires a paragraph-long comment to justify, the design is wrong. Fix the design.

#### 8. `attack-the-premise`
* **Trigger:** Two consecutive fix attempts for the same bug fail the same test or quality gate.
* **Why:** When multiple fixes fail, the underlying mental model of how the system works is wrong.
* **Pattern:**
  - **STOP coding.** Write down the core assumption explicitly (e.g., *"We assumed function X runs synchronously before Y"*).
  - Devise a small, direct probe (log, breakpoint, isolated test) to verify or falsify that assumption.
  - Redesign the solution from the verified reality, not the failed hypothesis.

#### 9. `explain-the-number`
* **Trigger:** Reporting or acting on performance benchmarks, latency drops, speedups, or eval scores.
* **Why:** Unexamined numbers often measure test artifacts, cached results, or irrelevant loops.
* **Pattern:**
  - Identify what physical resource bounds the measurement (CPU cycles, network RTT, disk I/O).
  - Rule out measuring dev-server overhead, cold starts, or compiler optimizations that dead-code-eliminated the benchmark.
  - State both the baseline and the new measurement under strictly identical environments.

---

### Domain C: Testing & Verification

#### 10. `test-behavior-not-implementation`
* **Trigger:** Writing, modifying, or reviewing tests (unit, integration, E2E).
* **Why:** Tests coupled to private helpers break on every refactor and fail to catch actual contract regressions.
* **Pattern:**
  - Assert what callers and end users observe: return values, emitted events, persisted database rows, error types.
  - **The 2-Edit Test:**
    1. *Break behavior:* Change logic to do the wrong thing $\rightarrow$ Test MUST fail.
    2. *Refactor internals:* Completely rewrite private implementation while keeping observable contracts $\rightarrow$ Test MUST pass.
  - Avoid asserting private method call counts or mock invocation sequences unless the contract explicitly dictates external network protocols.

#### 11. `prove-it-works`
* **Trigger:** Before declaring any task, PR, or bugfix complete.
* **Why:** "It compiles" and "my synthetic test passed" are not proof that the user's workflow functions.
* **Pattern:**
  - Run the real artifact against the real surface (run CLI, trigger HTTP endpoint, verify UI in browser).
  - Capture concrete runtime evidence (response payload, screenshot, terminal output) into `docs/verification/evidence/`.
  - If the real runtime cannot be executed in the current environment, state explicitly: `BLOCKED: Runtime Environment Missing`. Never fake a `PASS`.

#### 12. `sequence-verifiable-units`
* **Trigger:** Multi-step implementations, migrations, or large refactorings.
* **Why:** Massive multi-file diffs make review impossible and hide regressions.
* **Pattern:**
  - Break work into small, independently verifiable units.
  - Each unit must leave the repository in a green, working, testable state.
  - Sequence PRs/commits so each step provides proof of correctness to the reviewer.

---

### Domain D: Refactoring & Technical Debt

#### 13. `subtract-before-you-add`
* **Trigger:** Adding a new feature to an existing module or embarking on a refactoring wave.
* **Why:** Adding new code on top of dead code, obsolete guards, or stale abstractions multiplies complexity.
* **Pattern:**
  - First PR/commit: Prune dead code, remove unused exports, eliminate obsolete compatibility shims.
  - Second PR/commit: Implement new functionality on top of the clean, reduced base.

#### 14. `migrate-callers-then-delete-legacy-apis`
* **Trigger:** Introducing a new internal API, DTO, or service method to replace an older version.
* **Why:** Temporary compatibility layers in internal code become permanent tech debt.
* **Pattern:**
  - Introduce new API.
  - Migrate all callers within the monorepo to the new API.
  - Delete the legacy API in the same wave/PR. Do not leave "deprecated" internal wrappers.

#### 15. `laziness-protocol`
* **Trigger:** Designing abstractions, evaluating diff sizes, or tempted to add generic plugins/layers.
* **Why:** Premature abstraction (YAGNI) is the root of unmaintainable software.
* **Pattern:**
  - Bias toward the smallest, simplest diff that directly solves the requirement.
  - Delete code whenever possible. Two concrete usages do not justify a generic framework; wait for three.

#### 16. `outcome-oriented-execution`
* **Trigger:** Planned multi-phase rewrites or major library upgrades.
* **Why:** Spending effort smoothing throwaway intermediate states slows down reaching the target state.
* **Pattern:**
  - Focus energy on converging directly toward the target architecture.
  - Avoid writing elaborate throwaway bridges between obsolete state and future state.

#### 17. `redesign-from-first-principles`
* **Trigger:** A new requirement causes existing abstractions to leak, bloat with flags, or break invariants.
* **Why:** Patching a design that was not built for current assumptions creates fragile spaghetti code.
* **Pattern:**
  - Step back and ask: *"If we built this system today knowing all current requirements, what would it look like?"*
  - Re-align data models with first principles rather than adding conditional branches to an outdated core.

---

### Domain E: Agent Ergonomics & Context

#### 18. `guard-the-context-window`
* **Trigger:** Reading large logs, huge source files (>500 lines), or running broad sweeps.
* **Why:** Saturated LLM context degrades reasoning accuracy and increases hallucination risk.
* **Pattern:**
  - Offload heavy inspection to targeted tools (ripgrep, ast-grep, specific line slices).
  - Delegate bulk discovery to subagents and report concise structured summaries to the main thread.
  - Never dump thousands of lines of raw compiler output or trace logs into the primary context.

#### 19. `never-block-on-the-human` (Scoped)
* **Trigger:** Reversible implementation tasks, exploratory spikes, safe refactors, or running diagnostic commands.
* **Why:** Halting execution to ask trivial permission slows momentum and frustrates users.
* **Pattern:**
  - **Proceed autonomously** on reversible work: writing code in branches/worktrees, running tests, exploring code.
  - **Always pause & confirm** on irreversible operations: force-push, production deployment, database drops, deleting customer data.

#### 20. `build-the-lever`
* **Trigger:** Repeating a manual check, data transform, or code analysis more than twice.
* **Why:** Human or manual agent edits are error-prone; automated tools can be rerun deterministically.
* **Pattern:**
  - Write a reusable script, codemod, or verification probe instead of performing edits by hand.
  - The script becomes a permanent asset that teammates and CI can run.

#### 21. `encode-lessons-in-structure`
* **Trigger:** Correcting an agent or teammate on a recurring convention or rule.
* **Why:** Deducing rules from prompts alone drifts; automated structural guardrails are permanent.
* **Pattern:**
  - Codify the correction into a linter rule, a TypeScript type, a git pre-commit hook, or a test.
  - Prevent the mistake structurally so it is physically impossible to reintroduce.

#### 22. `separate-before-serializing-shared-state`
* **Trigger:** Parallel agent execution, concurrent workers, or shared mutable files/databases.
* **Why:** Shared mutable state causes race conditions, deadlocks, and merge conflicts.
* **Pattern:**
  - Eliminate sharing first: Give each subagent its own isolated worktree, file set, or partition.
  - Only introduce serialization (locks, queues) when a single writer is a strict physical invariant.

---

### Domain F: Product & Tradeoffs

#### 23. `experience-first`
* **Trigger:** Product design, UX flows, API ergonomics, or trade-offs between user experience and dev convenience.
* **Why:** Software exists for the consumer. Implementation difficulty is temporary; bad UX persists forever.
* **Pattern:**
  - Prioritize user delight, responsive feedback, and intuitive ergonomics over internal backend convenience.
  - Ship fewer, impeccably polished features rather than a sprawling set of rough, half-baked screens.

#### 24. `exhaust-the-design-space`
* **Trigger:** Designing a novel UI interaction, core abstraction, or critical architecture with no precedent.
* **Why:** The first solution that comes to mind is rarely the optimal one.
* **Pattern:**
  - Prototype 2–3 competing approaches side by side (e.g., in `/meeting` RFC deliberation).
  - Explicitly document trade-offs (memory, complexity, latency, DX) before committing to production implementation.
