# Implementation Plan: [Feature Name]

> **Status**: Draft | Approved | In Progress | Complete
> **Author**: Tech Lead Agent
> **Created**: YYYY-MM-DD
> **Version**: 1.0.0
> **Design Doc**: [Link to Design Doc](../designs/XXX-feature-name.md)
> **PRD**: [Link to PRD](../prds/XXX-feature-name.md)

---

## 1. Summary

<!-- One paragraph: what are we building, how, and in what order? -->

We will implement [feature] following the design doc. The work is broken into [N] phases, with [Frontend/Backend] working in parallel where possible. Estimated total effort: [X] days.

---

## 2. Implementation Phases

### Phase 1: Foundation (Day 1-2)

**Goal**: Database schema, API scaffolding, basic CRUD

| Task | Agent | Dependencies | Estimate |
|---|---|---|---|
| T-001: Create Prisma schema | Backend | None | 2h |
| T-002: Run migration | Backend | T-001 | 0.5h |
| T-003: Create NestJS module | Backend | T-001 | 1h |
| T-004: Implement service layer | Backend | T-003 | 3h |
| T-005: Implement controller | Backend | T-004 | 2h |
| T-006: Write integration tests | QA | T-005 | 2h |

**Deliverable**: Working API with CRUD operations, tests passing

---

### Phase 2: Frontend (Day 2-3)

**Goal**: UI components, pages, API integration

| Task | Agent | Dependencies | Estimate |
|---|---|---|---|
| T-007: Create page structure | Frontend | Phase 1 API | 1h |
| T-008: Implement list component | Frontend | T-007 | 3h |
| T-009: Implement form component | Frontend | T-007 | 3h |
| T-010: Implement detail view | Frontend | T-007 | 2h |
| T-011: RTK Query integration | Frontend | T-008,T-009,T-010 | 2h |
| T-012: Write component tests | QA | T-011 | 2h |

**Deliverable**: Working UI with API integration, tests passing

---

### Phase 3: Polish & Security (Day 3-4)

**Goal**: Error handling, security, performance

| Task | Agent | Dependencies | Estimate |
|---|---|---|---|
| T-013: Error handling (API) | Backend | Phase 1 | 2h |
| T-014: Error handling (UI) | Frontend | Phase 2 | 2h |
| T-015: Input validation | Backend | T-013 | 1h |
| T-016: Auth guards | Backend | T-015 | 1h |
| T-017: Security scan | Security | T-016 | 1h |
| T-018: E2E tests | QA | Phase 2 | 3h |

**Deliverable**: Production-ready code, security verified, E2E tests passing

---

### Bite-Sized Task Granularity

Each step should be ONE action (2-5 minutes). If a step takes longer, break it down further.

**Good granularity:**
- "Write the failing test" — step
- "Run it to make sure it fails" — step
- "Implement the minimal code to make test pass" — step
- "Run the tests and make sure they pass" — step
- "Commit" — step

**Bad granularity:**
- "Implement the feature with tests and error handling" — too broad, should be 5+ steps
- "Build the CRUD module" — vague, no clear completion criteria

---

## 3. Parallel Execution Map

```
Day 1:  [Backend: T-001 → T-002 → T-003 → T-004 → T-005]
Day 2:  [Backend: T-013 → T-015 → T-016]  [Frontend: T-007 → T-008 → T-009]
        [QA: T-006]
Day 3:  [Frontend: T-010 → T-011]  [Backend: T-014]
        [QA: T-012]
Day 4:  [Security: T-017]  [QA: T-018]
```

---

## 4. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| [Risk 1] | Medium | High | [Mitigation] |
| [Risk 2] | Low | Medium | [Mitigation] |

---

## 5. Definition of Done

- [ ] All tasks completed
- [ ] All unit tests pass (vitest)
- [ ] All integration tests pass (supertest)
- [ ] E2E tests pass for critical flows (playwright)
- [ ] Code review approved by Tech Lead
- [ ] Security scan passed (AgentShield)
- [ ] No critical linting errors
- [ ] Documentation updated

---

## 6. Rollback Plan

If critical issues found after deployment:

1. Feature flag to disable feature
2. Database migration rollback (if needed)
3. Revert to previous deployment

---

## 7. No Placeholders Policy

Every step must contain the actual content an engineer needs. These are **PLAN FAILURES** — never write them:

- ❌ "TBD", "TODO", "implement later", "fill in details"
- ❌ "Add appropriate error handling" / "add validation" / "handle edge cases"
- ❌ "Write tests for the above" (without actual test code)
- ❌ "Similar to Task N" (repeat the code)
- ❌ Steps that describe *what* to do without showing *how*

**Instead, write the actual code, test assertions, error messages, and file paths.** A junior developer should be able to execute any step without asking questions.

---

## 8. Self-Review

After writing the complete plan, review it yourself before presenting to the team:

1. **Spec coverage**: Can you point to a task that implements each requirement from the design doc?
2. **Placeholder scan**: Search for red flags from "No Placeholders Policy" section above
3. **Type consistency**: Do types, method signatures, property names match across tasks?

If you find issues, fix them inline. Don't add a "TODO: fix inconsistencies" step.

---

## 9. Execution Handoff

After saving the plan, offer the user an execution choice:

1. **Subagent-Driven (recommended)** — Fresh subagent per task, two-stage review (spec compliance + code quality)
2. **Inline Execution** — Execute in current session with checkpoints after each phase

Present both options with trade-offs and let the user decide.

---

**Next Step**: [Task Breakdown](./task-template.md) — Tech Lead → Frontend + Backend agents
