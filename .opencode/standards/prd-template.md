# PRD: [Feature Name]

> **Status**: Draft | In Review | Approved | Deprecated
> **Author**: PM Agent
> **Created**: YYYY-MM-DD
> **Version**: 1.0.0
> **Stakeholders**: [List key stakeholders]

---

## 1. Problem Statement

<!-- What problem are we solving? Why now? -->

**Current state**: [Describe the current situation and pain points]

**Desired state**: [Describe what success looks like]

**Impact of not solving**: [What happens if we don't build this?]

---

## 2. Target Users

<!-- Who will use this? Be specific. -->

| User Type | Description | Priority |
|---|---|---|
| [Primary user] | [Description] | Must Have |
| [Secondary user] | [Description] | Should Have |
| [Admin] | [Description] | Must Have |

---

## 3. User Stories

<!-- As a [user], I want [action] so that [benefit] -->

### Must Have (P0)

- [ ] **US-001**: As a [user], I want [action] so that [benefit]
  - Acceptance Criteria:
    - [ ] Given [context], when [action], then [result]
    - [ ] Given [context], when [action], then [result]

- [ ] **US-002**: As a [user], I want [action] so that [benefit]
  - Acceptance Criteria:
    - [ ] Given [context], when [action], then [result]

### Should Have (P1)

- [ ] **US-003**: As a [user], I want [action] so that [benefit]
  - Acceptance Criteria:
    - [ ] Given [context], when [action], then [result]

### Nice to Have (P2)

- [ ] **US-004**: As a [user], I want [action] so that [benefit]

---

## 4. Functional Requirements

<!-- What must the system do? -->

### 4.1 [Feature Area 1]

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-001 | [Requirement] | P0 | [How to verify] |
| FR-002 | [Requirement] | P0 | [How to verify] |
| FR-003 | [Requirement] | P1 | [How to verify] |

### 4.2 [Feature Area 2]

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-004 | [Requirement] | P0 | [How to verify] |

---

## 5. Non-Functional Requirements

| Category | Requirement | Target |
|---|---|---|
| Performance | Page load time | < 2s |
| Performance | API response time | < 200ms (p95) |
| Availability | Uptime | 99.9% |
| Security | Authentication | JWT with refresh tokens |
| Security | Data encryption | At rest + in transit |
| Scalability | Concurrent users | 10,000 |
| Accessibility | WCAG compliance | AA level |

---

## 6. Technical Constraints

<!-- What constraints must we work within? -->

- [Must use existing tech stack: Next.js, NestJS, Prisma, PostgreSQL]
- [Must integrate with: Stripe, SendGrid, etc.]
- [Must comply with: GDPR, SOC2, etc.]
- [Budget constraint: ...]
- [Timeline constraint: ...]

---

## 7. Out of Scope

<!-- What are we explicitly NOT building? -->

- ❌ [Feature/behavior explicitly excluded]
- ❌ [Feature/behavior explicitly excluded]
- ❌ [Feature/behavior explicitly excluded]

---

## 8. Success Metrics

| Metric | Current | Target | Measurement |
|---|---|---|---|
| [Metric 1] | [Baseline] | [Goal] | [How to measure] |
| [Metric 2] | [Baseline] | [Goal] | [How to measure] |

---

## 9. Open Questions

| # | Question | Owner | Status | Resolution |
|---|---|---|---|---|
| 1 | [Question] | [Who] | Open | [Answer when resolved] |
| 2 | [Question] | [Who] | Resolved | [Answer] |

---

## 10. Dependencies

| Dependency | Type | Status | Impact |
|---|---|---|---|
| [External service] | API | Available | [What it affects] |
| [Internal team] | Integration | In Progress | [What it affects] |

---

## 11. Timeline

| Phase | Duration | Deliverable |
|---|---|---|
| Design | [X days] | Design Doc approved |
| Implementation | [X days] | Features complete |
| Testing | [X days] | All tests pass |
| Launch | [X days] | Feature live |

---

## Appendix

### A. Wireframes / Mockups

<!-- Link to design files or embed images -->

### B. API Contract Preview

<!-- Preliminary API design if applicable -->

### C. Data Model Preview

<!-- Preliminary data model if applicable -->

---

**Next Step**: [Design Document](./design-doc-template.md) — Tech Lead + Designer
