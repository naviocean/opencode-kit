# /meeting

Multi-agent council deliberation and architectural debate forum. Convenes specialized agents to debate complex trade-offs, evaluate technical forks (RFCs), challenge architectural assumptions, and produce binding Architecture Decision Records (ADRs).

Use for: Competing technical proposals, technology stack evaluation, library selection, major refactoring strategy, cross-domain trade-offs (e.g. security vs DX, perf vs cost).
Do NOT use for: Routine bugfixes (use `/hotfix`), standard feature planning with clear scope (use `/plan`), or simple UI changes (use `/design` or `/build`).

**HARD-GATES:**
1. **Socratic Framing First:** The Host MUST interview the user with 1 to 3 targeted clarifying questions **ONE AT A TIME** before opening the floor. Never batch questions. Debates without clarified constraints are invalid.
2. **Bounded Attendance:** Maximum 3 to 4 specialist agents summoned per meeting (plus Moderator). Never run an all-hands meeting across all 12 agents.
3. **Bounded Rounds:** Maximum 2 debate rounds (Round 1: Opening Proposals, Round 2: Adversarial Critique) before Moderator synthesis (Round 3) to prevent token exhaustion and circular arguments.
4. **Mandatory Devil's Advocate:** At least one summoned agent MUST explicitly challenge the leading proposal with worst-case failure modes, security attack vectors, and operational complexity. "Yes-man" echo chambers are strictly forbidden.
5. **Binding ADR Output:** Every meeting MUST conclude with a formal ADR in `docs/adr/ADR-{YYYYMMDD}-{slug}.md` using `adr-template.md` and be recorded into `.agent-memory/decisions.md`.

## Execution Mode: Council Deliberation Pipeline

| Phase | Mode | Role | Why |
|---|---|---|---|
| Phase 0: Context & Prior Decisions | (orchestrator) | Moderator | Check existing ADRs, memory, and code impact to prevent redundant debates |
| Phase 1: Socratic Framing Interview | **Subagent** (Tech Lead / PM) | Host ↔ User | Ask 1 to 3 targeted questions ONE AT A TIME to lock down scale, budget, and trade-off priorities |
| Phase 2: Squad Summoning | **Subagent** (Tech Lead / PM) | Moderator | Select 2 to 4 relevant specialist agents based on clarified constraints |
| Phase 3: Round 1 — Opening Proposals | **Subagents** (Specialists) | Council | Each specialist articulates their optimal solution through their domain lens |
| Phase 4: Round 2 — Adversarial Critique | **Subagents** (Specialists) | Devil's Advocates | Cross-examination: poke holes in rival proposals, highlight risks & trade-offs |
| Phase 5: Round 3 — Synthesis & Verdict | **Subagent** (Tech Lead / PM) | Moderator / Judge | Formulate trade-off matrix, deliver definitive verdict, or propose binary A/B vote |
| Phase 6: ADR Generation & Memory | (orchestrator) | Scribe | Write formal ADR to `docs/adr/` and persist decision to `.agent-memory/decisions.md` |

Pipeline flow:
```
Context Check → Socratic Framing (1-by-1) → Squad Summoning → Round 1 (Proposals) → Round 2 (Cross-Exam) → Round 3 (Verdict) → ADR & Memory
```

---

## Phase 0: Context & Prior Decisions Check

1. **Inspect existing ADRs & Decisions**:
   - Read `docs/adr/` (or `docs/adrs/`) — check if this topic was already decided.
   - Read `.agent-memory/decisions.md` — verify current architectural baseline.
   - If ICM is available, run `icm recall "<topic keywords>"` to retrieve past context.
2. **GitNexus Investigation (if debate affects existing codebase)**:
   - Identify affected modules, classes, or interfaces.
   - Run `gitnexus_context({name: affectedSymbol, repo: "<current-repo>"})` to inspect dependencies.
   - Run `gitnexus_impact({target: affectedSymbol, direction: "both", repo: "<current-repo>"})` to evaluate blast radius.

---

## Phase 1: Host — Socratic Framing Interview (One Question at a Time)

Before summoning specialist agents, the Host (`tech-lead` for engineering/architecture questions, `pm` for product scope & prioritization trade-offs) interviews the user to establish real-world boundaries:

- Ask **1 to 3 clarifying questions, ONE AT A TIME** (Superpowers style).
- **Wait for user response between each question. Do NOT batch questions.**

**Why one at a time?**
When presented with 3 simultaneous questions, users either skip questions or provide rushed, superficial answers. One question at a time produces crisp, actionable constraints that anchor the entire debate and prevent agents from arguing over false assumptions.

### Question Bank (Host selects 1-3 most relevant depending on topic):

1. **Scale & SLA Constraints**:
   *"What is the expected volume, request throughput, or P99 latency SLA for this capability over the next 6-12 months?"*
2. **Budget & Operational Boundaries**:
   *"Are we constrained to our existing infrastructure stack (e.g. PostgreSQL, Redis, Node), or are we willing to introduce dedicated external services / new runtimes (e.g. Qdrant, Kafka, Rust microservices)?"*
3. **Core Trade-off Priority**:
   *"When trade-offs conflict, what is the #1 non-negotiable priority: Implementation Speed (Time-to-Market), Peak Performance / Scalability, or Minimal Long-term Maintenance?"*

### Outcome:
Host summarizes the user's answers into a **Framed RFC Statement** (Problem Statement, Hard Constraints, Decision Criteria) and announces the start of the council deliberation.

---

## Phase 2: Squad Summoning Matrix

Using the Framed RFC Statement, the Moderator summons **2 to 4 specialist agents** from the squad matrix:

| Debate Domain | Summoned Attendees | Typical Tension / Conflict |
|---|---|---|
| **Backend Data & Persistence** (ORM, DB, Caching) | `tech-lead` (Host), `nestjs`, `devops`, `security-auditor` | Data integrity & type safety vs DB migration risk & connection scaling |
| **Frontend Architecture** (SSR vs SPA, State, UI) | `tech-lead` (Host), `frontend`, `designer`, `qa` | DX & rich interactions vs bundle size, TTFB & testing complexity |
| **High-Throughput / Systems** (Axum, Tokio, Tauri) | `tech-lead` (Host), `rustacean`, `devops`, `nestjs` | Extreme performance & memory safety vs team cognitive load & build times |
| **Mobile & Cross-Platform** (Native, Sync, Storage) | `tech-lead` (Host), `mobile`, `frontend`, `nestjs` | Native responsiveness & offline-first sync vs cross-platform code sharing |
| **AI Workflows & RAG** (LangGraph, Prompts, Evals) | `tech-lead` (Host), `ai-engineer`, `python-backend`, `devops` | Agentic flexibility & reasoning power vs token cost, latency & deterministic evals |
| **Product Scope vs Dev Velocity** (MVP Feasibility) | `pm` (Host), `tech-lead`, `frontend`, `nestjs` | Time-to-market & rich UX vs technical debt & architectural rigidity |

*User Override:* If user explicitly provides `--attendees agent1,agent2,...`, adhere strictly to user-specified attendees.

---

## Phase 3: Round 1 — Opening Proposals

Each summoned agent provides their structured standpoint grounded in the user's clarified constraints (maximum 150 words per agent):
1. **Proposed Stance**: Preferred approach and implementation pattern.
2. **Domain Justification**: Why this is superior from their domain specialty.
3. **Pragmatic Compromise**: What trade-off they acknowledge making.

*Format:*
```markdown
### [Agent Name] Opening Proposal
- **Stance**: ...
- **Core Advantages**: ...
- **Acknowledged Trade-off**: ...
```

---

## Phase 4: Round 2 — Adversarial Critique & Cross-Examination

To eliminate LLM agreeableness ("Yes-man bias"), every agent is required to act as a **Devil's Advocate** against competing approaches using domain-specific stress tests:

- **`security-auditor`**: *Where are the new attack vectors? How does this impact auth, secrets, or data exfiltration?*
- **`devops`**: *What is the Day-2 operational overhead? How does it fail under network partition, high load, or memory leaks?*
- **`qa`**: *How testable is this? Does it require complex mocking, fragile integration tests, or nondeterministic fixtures?*
- **`frontend` / `mobile`**: *What is the impact on bundle size, UI responsiveness, or offline usability?*
- **`tech-lead`**: *Does this introduce accidental complexity or tight coupling? What is the rollback cost?*

*Format:*
```markdown
### [Agent Name] Cross-Examination & Critiques
- **Critique on [Competing Proposal]**: [Specific risk, failure mode, or hidden cost]
- **Mitigation Requirement**: [What must be proven or addressed before adopting it]
```

---

## Phase 5: Round 3 — Synthesis, Trade-off Matrix & Verdict

The Moderator synthesizes the debate:

1. **Trade-off Comparison Matrix**:
   | Evaluation Criteria | Option A ([Name]) | Option B ([Name]) |
   |---|---|---|
   | Performance & Scalability | ... | ... |
   | Implementation Velocity | ... | ... |
   | Long-term Maintenance | ... | ... |
   | Security & Compliance | ... | ... |
   | Operational / Infra Cost | ... | ... |

2. **Verdict Decision**:
   - **Clear Consensus / Technical Dominance:** Moderator issues a binding verdict with explicit rationale and mitigations for acknowledged drawbacks.
   - **Balanced Trade-off (Subjective Business Decision):** Moderator presents a crisp A/B summary to the user with a recommended default, prompting the user for the final call.

---

## Phase 6: ADR Generation & Memory Persistence

1. **Generate ADR File**:
   - Write to `docs/adr/ADR-{YYYYMMDD}-{topic-slug}.md` (create directory `docs/adr/` if not present) conforming to `adr-template.md`:
     - Status: `Accepted`
     - Deciders: Moderator + Summoned Agents
     - Context, Decision, Consequences (Positive, Negative, Neutral)
     - Alternatives Considered & Why Rejected
2. **Record into Persistent Memory**:
   - Append concise summary to `.agent-memory/decisions.md`.
   - If ICM is available, execute:
     `icm store -t decisions-{project} -c "ADR: {Decision Title} - {Summary of choice and trade-off}" -i high`
3. **Hand-off Recommendation**:
   - Point user to the generated ADR file.
   - State next recommended command:
     - Run `/plan` to turn this architectural decision into user stories and implementation specs.
     - Or run `/build` if the implementation plan is already waiting on this decision.

---

## Output

After `/meeting`:
1. ✅ Socratic Framing completed (user constraints captured one-by-one)
2. ✅ Council deliberation completed with multi-agent cross-examination
3. ✅ Formal ADR generated at `docs/adr/ADR-{YYYYMMDD}-{topic}.md`
4. ✅ Architectural decision persisted to `.agent-memory/decisions.md` and ICM
5. ✅ Clear path forward defined for `/plan` or `/build`
