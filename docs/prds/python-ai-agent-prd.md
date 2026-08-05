# PRD: Python AI Agent — Senior Python Developer for AI Applications

> **Status**: Draft
> **Author**: PM Agent
> **Created**: 2026-08-05
> **Version**: 1.0.0
> **Stakeholders**: Kit owner, Tech Lead

---

## 1. Problem Statement

**Current state**: The opencode-saas-kit ships 8 agents (pm, tech-lead, designer, frontend, backend, rustacean, qa, security-auditor) covering a TypeScript/NestJS/Rust stack. There is **zero Python capability**: no agent that writes Python, no Python skills in the 116-skill library, and no Python territory defined. Users who build AI applications (LLM agents, ML, scraping, automation) in Python have no dedicated agent to dispatch.

**Desired state**: A new `python` agent — a senior Python developer specialized in AI applications — that can be dispatched for any Python work. It follows the modern Python AI stack (`uv`, `pydantic`, `ruff`, `pytest`), has a proper skill library (wshobson Python skills + AI skills), respects cross-domain boundaries, and is registered in the agent registry.

**Impact of not solving**: AI-heavy SaaS users can't use the kit's agent orchestration for their Python/AI work; they fall back to generic agents, losing the MUST-rule guardrails, skill loading, and territory enforcement the kit provides.

---

## 2. Target Users

| User Type | Description | Priority |
|---|---|---|
| Kit owner | Wants to dispatch a Python specialist for AI app code | Must Have |
| AI application developer | Builds LLM agents, ML pipelines, scraping, automation in Python | Must Have |

---

## 3. User Stories

### Must Have (P0)

- [ ] **US-001**: As a kit owner, I want a `python` agent I can dispatch for Python AI work, so that the work gets territory-aware, skill-backed execution like other agents.
  - Acceptance Criteria:
    - [ ] Given a request mentioning Python/AI code, when I dispatch the `python` agent, then it responds as a senior Python developer
    - [ ] Given the agent registry, when `python` is registered, then it loads its always/conditional skills automatically

- [ ] **US-002**: As a kit owner, I want the `python` agent to respect cross-domain boundaries, so that it does not corrupt frontend/backend/desktop code.
  - Acceptance Criteria:
    - [ ] Given a Python task, when the agent works, then it only touches Python files
    - [ ] Given a task crossing into another app's territory, when boundary conflict is detected, then the agent escalates rather than editing

- [ ] **US-003**: As a kit owner, I want the `python` agent to follow the modern Python AI stack, so that generated code is consistent and idiomatic.
  - Acceptance Criteria:
    - [ ] Given new Python code, when the agent writes it, then it uses `uv` project layout, `pydantic` models, `ruff`-clean style, and `pytest` tests

- [ ] **US-004**: As a kit owner, I want Python skills installed, so that the agent has domain knowledge to draw on.
  - Acceptance Criteria:
    - [ ] Given the skill library, when I install the Python skills, then the 10 wshobson Python skills + pydantic-ai-harness + langchain deepagents are present and loadable

### Should Have (P1)

- [ ] **US-005**: As a kit owner, I want testing discipline to be flexible, so that exploratory AI scripts aren't blocked by mandatory coverage but production code is.
  - Acceptance Criteria:
    - [ ] Given an exploratory AI script, when the agent writes it, then tests are optional
    - [ ] Given production-bound Python code, when the agent ships it, then TDD with coverage is enforced

- [ ] **US-006**: As a kit owner, I want the broken PM agent model fixed, so that `/plan` pipeline dispatch works again.
  - Acceptance Criteria:
    - [ ] Given the PM agent, when dispatched, then its model resolves and the subagent starts

### Nice to Have (P2)

- [ ] **US-007**: As a kit owner, I want the trigger map in `AGENTS.md` updated, so that the new agent is discoverable.

---

## 4. Functional Requirements

### 4.1 Agent Definition

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-001 | Create `.opencode/agents/python.md` with frontmatter (name, description, mode, model) and body (Startup AUTO-EXECUTE, Role, Tools/GitNexus MUST rules, scope boundaries) | P0 | File exists, matches existing agent file conventions |
| FR-002 | Agent is registered in `.opencode/agent-registry.json` via `skill-registry.mjs` | P0 | `npx node .opencode/scripts/skill-registry.mjs` regenerates registry containing `python` |
| FR-003 | Agent model left unset (opencode default), consistent with user choice | P0 | No `model:` override in python.md frontmatter |
| FR-004 | Agent loads its assigned always/conditional skills at startup | P0 | Startup section references agent-registry lookup pattern |

### 4.2 Skills Installation

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-005 | Install 10 wshobson Python skills: performance-optimization, testing-patterns, design-patterns, async-python-patterns, code-style, project-structure, error-handling, packaging, anti-patterns, type-safety | P0 | All 10 present in `.opencode/skills/` |
| FR-006 | Install AI skills: pydantic-ai-harness, langchain deepagents-python-quickstart | P0 | Both present and loadable |
| FR-007 | Skills wired into agent-registry `skills.always` / `skills.conditional` mapping | P0 | Registry maps `python` → installed skills |

### 4.3 Territory & Boundaries

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-008 | Python agent recognizes `.py` files anywhere (no fixed directory ownership) | P0 | Agent description states file-based territory, not path-based |
| FR-009 | Escalation rule for files in other agents' territories (apps/api, apps/web, apps/desktop) | P0 | Agent body defines escalation path instead of silent editing |

---

## 5. Non-Functional Requirements

| Category | Requirement | Target |
|---|---|---|
| Compatibility | Agent file format matches existing agents | Same frontmatter + body structure |
| Maintainability | Registry regeneration | One command, no manual edit |
| Consistency | Skill install | Via `skills-lock.json` + CLI, reproducible |
| Security | No secrets | Agent follows security-standards.md |

---

## 6. Technical Constraints

- Agent files live in `.opencode/agents/<name>.md`
- Registry is auto-generated by `node .opencode/scripts/skill-registry.mjs` — must not be hand-edited (source of truth in agent files + `skills-lock.json`)
- Skills installed via `npx skills add <owner/repo@skill>` into `.opencode/skills/` (project scope) or tracked by `skills-lock.json`
- All agents follow `.opencode/standards/conventions.md` (TS strict, security, TDD, git) — Python agent must document its Python equivalents (ruff, pytest)
- Hard Rule #1: PRD must be approved before implementation

---

## 7. Out of Scope

- ❌ Building a FastAPI/NestJS-style API backend agent — the user explicitly said the Python agent is NOT an API-comparison agent
- ❌ Data/ETL-dedicated agent — covered by the Python agent's generalist AI focus
- ❌ Changing the cross-domain rule #8 itself — only adding the Python agent's boundary + escalation rule
- ❌ Python framework apps scaffolding (Django/Flask) — stack is `uv` + pydantic + ruff + pytest, framework-agnostic otherwise
- ❌ A separate model/provider setup for the Python agent

---

## 8. Success Metrics

| Metric | Current | Target | Measurement |
|---|---|---|---|
| Python agent dispatchable | 0 agents | `python` agent exists + registers | Dispatch succeeds |
| Python skills in library | 0 | 12 installed | `skills-lock.json` + directory count |
| Cross-domain safety | n/a | Escalation rule documented | Agent body contains rule |
| /plan pipeline health | PM model broken | PM dispatches | Subagent starts without model error |

---

## 9. Open Questions

| # | Question | Owner | Status | Resolution |
|---|---|---|---|---|
| 1 | Territory: no fixed directory vs cross-domain #8 — how does the agent decide a `.py` file belongs to it vs another app? | Tech Lead | Open | Needs escalation rule design |
| 2 | Do the 10 wshobson skills need adaptation for opencode tool names (TodoWrite → todowrite, EnterPlanMode)? | Tech Lead | Open | Needs skill review |
| 3 | Does `pydantic-ai-harness` / langchain skill pull runtime deps or just docs? | Tech Lead | Open | Verify install scope |
| 4 | PM model `my_xiaomi/mimo-v2.5-pro` is invalid — what's the fix target? | Tech Lead | Open | See US-006 |

---

## 10. Dependencies

| Dependency | Type | Status | Impact |
|---|---|---|---|
| `skills` CLI (npx) | Tool | Available | Install wshobson + AI skills |
| wshobson/agents skill repo | External | Available | 10 Python skills |
| pydantic/skills | External | Available | pydantic-ai-harness |
| langchain-ai/langchain-skills | External | Available | deepagents quickstart |
| skill-registry.mjs script | Internal | Existing | Registry regeneration |

---

## 11. Timeline

| Phase | Duration | Deliverable |
|---|---|---|
| Design | 1 day | Tech Lead plan approved |
| Implementation | 1-2 days | Agent file + skills + registry |
| Testing | 0.5 day | Verify agent loads, skills load, dispatch works |
| Launch | — | PRD + plan reviewed, approved |

---

**Next Step**: [Plan Document](./plan-template.md) — Tech Lead
