# Implementation Plan: Python AI Agent

> **Status**: Draft
> **Author**: Tech Lead Agent
> **Created**: 2026-08-05
> **Version**: 1.0.0
> **Design Doc**: N/A (no UI — config-only feature)
> **PRD**: [Python AI Agent PRD](../prds/python-ai-agent-prd.md)

---

## 1. Summary

We will add a 9th agent — `python` (senior Python developer for AI applications) — to the opencode-saas-kit. The work has 4 phases: (1) install the 12 Python/AI skills, (2) write `.opencode/agents/python.md` following the existing agent-file conventions, (3) regenerate `agent-registry.json` and wire the `python` agent into `AGENTS.md` trigger map, (4) fix the broken PM/Tech-Lead model (`my_xiaomi/mimo-v2.5-pro`) so `/plan` dispatch works. Estimated total effort: 1.5 days.

Key finding driving the approach: `skills-lock.json` **already locks 19 Python skills from `wshobson/agents`** (they are declared but 170/274 locked skills are not yet physically installed). `bin/cli.js` already lists `wshobson/agents` as a skill source. So we install the specific locked skills + the 2 AI skills, and the existing `skill-registry.mjs` pipeline handles registry generation.

---

## 2. Implementation Phases

### Phase 1: Install Python + AI Skills (Day 1)

**Goal**: Get the 12 skills physically present in `.opencode/skills/` and recorded in `skills-lock.json`.

| Task | Agent | Dependencies | Estimate |
|---|---|---|---|
| T-001: Install ALL wshobson/agents skills per lock via `npx skills add wshobson/agents -a '*' -y --skill '*'` (yields the 19 locked Python skills) | (orchestrator) | None | 30m |
| T-002: Install AI skills: `pydantic/skills@pydantic-ai-harness`, `langchain-ai/langchain-skills@deepagents-python-quickstart` | (orchestrator) | None | 10m |
| T-003: Verify Python + AI skills present + registered in `skills-lock.json` | (orchestrator) | T-001, T-002 | 5m |

**Decision (user-approved 2026-08-05)**: install per lock — run the same command `bin/cli.js` uses for the `wshobson/agents` source, so the lock and disk stay in sync instead of cherry-picking 12 skills.

**Exact command for T-001** (run from repo root):

```bash
npx skills add wshobson/agents -a '*' -y --skill '*'
```

**Exact commands for T-002:**

```bash
npx skills add pydantic/skills@pydantic-ai-harness -y
npx skills add langchain-ai/langchain-skills@deepagents-python-quickstart -y
```

**T-003 verification:**

```bash
ls .opencode/skills/ | grep -iE "python|pydantic|langchain|llm"
# Expect: 10+ python-* + pydantic-ai-harness + langchain-* visible
python3 -c "import json; lock=json.load(open('skills-lock.json')); print([k for k in lock['skills'] if 'python' in k or 'pydantic' in k or 'langchain' in k])"
```

**Note**: These skills may be installed into `.opencode/skills/` in `plugin/<category>/skills/<name>/SKILL.md` sub-paths (matching how wshobson skillPath is recorded in the lock, e.g. `plugins/data-engineering/skills/...`). If so, the skill loader (which scans `**/SKILL.md` recursively) still finds them — but the `agent-registry.mjs`-driven startup must reference them by name. Verify actual path after install and record it.

**Deliverable**: 12 Python/AI skills installed and locked.

---

### Phase 2: Create `python` Agent (Day 1)

**Goal**: Write `.opencode/agents/python.md` following backend.md / rustacean.md conventions.

| Task | Agent | Dependencies | Estimate |
|---|---|---|---|
| T-004: Write `.opencode/agents/python.md` (frontmatter + body) | (orchestrator) | None | 2h |
| T-005: Self-review against conventions.md (§ Coding, § Security, § Testing) | (orchestrator) | T-004 | 30m |

**T-004 file spec** (mirror `backend.md` structure):

Frontmatter:
```yaml
---
name: python
description: USE WHEN Python code for AI applications must be created or modified — LLM agents/LangChain, ML training/inference (pytorch/tensorflow), web scraping, automation/data scripts, or FastAPI services. Triggers: "write a Python script", "build an LLM agent", "LangChain/LangGraph RAG", "fine-tune a model", "scrape this site", "automate X in Python", "FastAPI endpoint", ".py files", "uv/pydantic/ruff/pytest". DO NOT use for: apps/api (route to backend), apps/web (route to frontend), apps/desktop (route to rustacean). Owns ALL Python code in the repo regardless of directory, escalates when a .py file lives in another agent's app directory.
mode: subagent
---
```

**Model**: NO `model:` key — intentionally left unset (user choice #3 = opencode default).

Body sections (copy the exact patterns from backend.md):
1. **Startup (AUTO-EXECUTE)** — read `.opencode/agent-registry.json`, find `"python"`, load always/conditional skills via `skill(name="...")`
2. **Role** — ownership table: LLM agents, ML pipelines, scraping, automation, FastAPI serving, Python project structure (`uv`/`pyproject.toml`), type safety (pydantic/mypy), testing (pytest)
3. **Tools — GitNexus MUST rules** — 4 MUST rules with WHY annotations (copy structure from backend.md):
   - `gitnexus_query` before new module (Python module boundaries, `uv` layout)
   - `gitnexus_context` before modifying shared Python package
   - `gitnexus_impact` before submitting (consumers of a pydantic model / function)
   - `gitnexus_detect_changes` after implementation
4. **Territory & Cross-Domain Escalation** (FR-008, FR-009):
   - Owns `.py` files ANYWHERE (no fixed directory)
   - If a `.py` file resides inside `apps/api/`, `apps/web/`, or `apps/desktop/`, the agent MUST NOT edit it — escalate to Tech Lead (the owning agent owns the directory, not the extension)
5. **Testing Discipline** (US-005): exploratory/AI scripts → tests optional; production-bound code → RED→GREEN→REFACTOR with pytest, 80% statement coverage
6. **## Skills** section (required by skill-registry.mjs parser — MUST be the last `## ` section or the parser's regex `(?=\n## [^#]|\n---|$)` may miss it):

```markdown
## Skills

| Skill | When |
|---|---|
| `python-testing-patterns` | Always |
| `python-code-style` | Always |
| `python-type-safety` | Always |
| `python-design-patterns` | When designing Python classes/modules, dependency injection, abstractions |
| `async-python-patterns` | When writing async/await, asyncio, aiohttp, concurrent Python |
| `python-error-handling` | When handling exceptions, logging, error propagation |
| `python-performance-optimization` | When optimizing slow Python code, profiling, caching |
| `python-project-structure` | When structuring a new Python project, pyproject.toml, uv layout |
| `python-packaging` | When packaging/distributing Python code |
| `python-anti-patterns` | When reviewing Python code for common mistakes |
| `pydantic-ai-harness` | When building pydantic-ai based agents |
| `langchain-architecture` | When building LangChain/LangGraph applications |
```

**Note**: use skill names matching what the `npx skills add` installs. If `langchain-architecture` (already in lock) installs instead of `deepagents-python-quickstart` (not in lock), prefer the locked name. Adjust table after Phase 1 real install output.

**Deliverable**: `.opencode/agents/python.md` complete.

---

### Phase 3: Register + Wire Agent (Day 2)

**Goal**: Registry regenerated, agent discoverable, cross-refs updated.

| Task | Agent | Dependencies | Estimate |
|---|---|---|---|
| T-006: Regenerate `.opencode/agent-registry.json` | (orchestrator) | T-004 | 5m |
| T-007: Update `AGENTS.md` — trigger map row + file map + agent count (8 → 9) | (orchestrator) | T-006 | 20m |
| T-008: Update `README.md` agent list if present | (orchestrator) | T-007 | 10m |
| T-009: Update `package.json` description "8 agents" → "9 agents" | (orchestrator) | T-007 | 5m |

**T-006 command:**

```bash
node .opencode/scripts/skill-registry.mjs
# Verify: python3 -c "import json; d=json.load(open('.opencode/agent-registry.json')); print('python' in d['agents'])"
```

**T-007 exact AGENTS.md edits:**
- Agent Trigger Map table: add row `| Python, .py, LLM agent, LangChain, ML, scraping, FastAPI, uv, pydantic, pytest | **python** |`
- File Map: add row `| Python agent definition | `.opencode/agents/python.md` |`
- Changelog: add 1.2.2 entry
- Agent count references (8 → 9)

**Deliverable**: `python` agent registered and discoverable; docs consistent.

---

### Phase 4: Fix PM/Tech-Lead Model + Verify (Day 2)

**Goal**: `/plan` pipeline works; new agent verifies clean.

| Task | Agent | Dependencies | Estimate |
|---|---|---|---|
| T-010: Fix `my_xiaomi/mimo-v2.5-pro` model refs in `.opencode/agents/pm.md` and `.opencode/agents/tech-lead.md` | (orchestrator) | None | 15m |
| T-011: Run `node bin/cli.js verify` to confirm kit integrity | (orchestrator) | T-006, T-010 | 10m |
| T-012: Manual dispatch smoke test — invoke `python` agent on a sample task | (orchestrator) | T-006 | 10m |

**T-010 exact fix**: Replace `model: my_xiaomi/mimo-v2.5-pro` with `model: my_xiaomi/mimo-v2.5` in `pm.md` and `tech-lead.md` frontmatter (the `.pro` suffix model does not exist for this provider — confirmed by dispatch error "Model not found: my_xiaomi/mimo-v2.5-pro"). If a `.pro` model is desired, the user must first add it to their provider config in `~/.config/opencode/opencode.json`.

**Deliverable**: `/plan` dispatch works; `verify` passes; `python` agent dispatches.

---

## 3. Parallel Execution Map

```
Day 1:  [T-001 → T-002 → T-003] → [T-004 → T-005]
Day 2:  [T-006 → T-007 → T-008 → T-009]  [T-010]
        [T-011 → T-012]
```

No real parallelism — this is a small sequential config feature. T-010 (model fix) is independent and could run in parallel with Phase 2/3.

---

## 4. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| wshobson skills install into sub-paths (`plugin/<cat>/skills/`) that skill-registry parser mishandles | Medium | Medium | Verify actual path in Phase 1; record it; adjust registry table skill names to installed reality |
| Skill name mismatch: `deepagents-python-quickstart` vs locked `langchain-architecture` | Medium | Low | Prefer names already in `skills-lock.json` (langchain-architecture, llm-evaluation) |
| Changing PM/Tech-Lead model breaks other behaviors that relied on `.pro` | Low | Medium | Model only affects dispatch; verify with T-011/T-012 smoke test |
| 170 stale locked skills cause `verify` noise (skills in lock, not installed) | High | Low | Out of scope for this PRD; note as follow-up, do not block agent addition |

---

## 5. Definition of Done

- [ ] 12 Python/AI skills installed and visible in `.opencode/skills/` (or sub-path)
- [ ] `.opencode/agents/python.md` written with Startup/Role/MUST-rules/Territory/Testing/Skills sections
- [ ] `agent-registry.json` regenerated and contains `python` with skills mapping
- [ ] `AGENTS.md` trigger map + file map updated; agent count corrected
- [ ] `pm.md` + `tech-lead.md` model fixed to a resolvable value
- [ ] `node bin/cli.js verify` passes
- [ ] Smoke test: `python` agent dispatches and loads its skills

---

## 6. Rollback Plan

Config-only change — rollback is trivial:

1. `git checkout .opencode/agents/ .opencode/agent-registry.json AGENTS.md` to revert agent/config changes
2. Remove newly installed skill dirs from `.opencode/skills/` (or revert `skills-lock.json`)
3. Re-run `node .opencode/scripts/skill-registry.mjs` to restore registry

---

## 7. No Placeholders Policy

All commands, file paths, frontmatter, and body-section specs are written out above (Phase 1-4). No "TBD" steps. The only post-install adjustment (skill sub-path or name variance) is a verifiable step, not a placeholder.

---

## 8. Self-Review

1. **Spec coverage**: FR-001/002/003/004 → T-004/T-006; FR-005/006/007 → T-001/T-002/T-003; FR-008/009 → T-004 body; US-005 → T-004 testing section; US-006 → T-010; US-007 → T-007. ✅
2. **Placeholder scan**: No TBD/TODO. The "adjust to installed reality" step is concrete (verify + record). ✅
3. **Type/name consistency**: Skill names in `## Skills` table match `skills-lock.json` keys where possible; model value `my_xiaomi/mimo-v2.5` matches working agents (backend.md, frontend.md, rustacean.md). ✅

---

## 9. Execution Handoff

After approval, offer the user an execution choice:

1. **Subagent-Driven (recommended)** — fresh subagent per phase, two-stage review
2. **Inline Execution** — execute in current session with checkpoints after each phase

Present both options with trade-offs and let the user decide.

---

**Next Step**: [Task Breakdown](./task-template.md) — Tech Lead → Orchestrator
