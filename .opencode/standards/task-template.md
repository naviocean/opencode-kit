# Task: [Task ID] — [Task Title]

> **Status**: Pending | In Progress | In Review | Done | Blocked
> **Assigned To**: [Agent Name]
> **Created**: YYYY-MM-DD
> **Plan**: [Link to Implementation Plan](../plans/XXX-feature-name.md)
> **Blocked By**: [Task IDs if any]

---

## 1. Objective

<!-- What needs to be done? One sentence. -->

[Clear, specific description of the task]

---

## 2. Acceptance Criteria

- [ ] [Criterion 1 — specific, measurable]
- [ ] [Criterion 2 — specific, measurable]
- [ ] [Criterion 3 — specific, measurable]

---

## 3. Technical Context

### Files to Modify/Create

| File | Action | Purpose |
|---|---|---|
| `apps/api/src/[module]/[file].ts` | Create | [Purpose] |
| `apps/web/src/[path]/[file].tsx` | Create | [Purpose] |
| `libs/shared/types/[file].ts` | Modify | [Purpose] |

### Dependencies

| Dependency | Type | Status |
|---|---|---|
| [Other task] | Blocks this task | [Status] |
| [External API] | Required | [Status] |

### Existing Code to Reference

- `apps/api/src/[similar-module]/` — Similar pattern to follow
- `libs/shared/test-utils/` — Test utilities to use

---

## 4. Implementation Steps

<!-- Step-by-step guide. Enough detail for an enthusiastic junior engineer. -->

1. **[Step 1]**
   - [Detailed instruction]
   - [Expected outcome]

2. **[Step 2]**
   - [Detailed instruction]
   - [Expected outcome]

3. **[Step 3]**
   - [Detailed instruction]
   - [Expected outcome]

---

## 5. Testing Requirements

### Unit Tests

```typescript
// File: [test-file-path]
describe('[Feature]', () => {
  it('should [expected behavior]', () => {
    // Arrange
    // Act
    // Assert
  });
});
```

### Integration Tests (if applicable)

```typescript
// File: [test-file-path]
describe('[Feature] API', () => {
  it('should return [expected] when [condition]', () => {
    // Test with supertest
  });
});
```

---

## 6. Code Quality Checklist

- [ ] TypeScript strict mode (no `any`)
- [ ] Follows coding standards (`.opencode/rules/coding-standards.md`)
- [ ] Error handling implemented
- [ ] Input validation added
- [ ] Tests written and passing
- [ ] No console.log in production code
- [ ] Imports organized

---

## 7. Definition of Done

- [ ] All acceptance criteria met
- [ ] All tests pass (`nx affected -t test`)
- [ ] No linting errors
- [ ] Code review ready
- [ ] Self-reviewed

---

## 8. Notes / Blockers

<!-- Any additional context, blockers, or notes -->

---

**Assigned Agent**: [agent-name]
**Estimated Effort**: [X hours]
