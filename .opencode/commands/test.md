# /test

Run tests and analyze coverage.

## Agent Flow

```
QA
```

## Steps

### 1. QA Agent — Run Tests

```bash
# Run all tests
nx run-many -t test

# Run only affected tests (faster)
nx affected -t test

# Run with coverage
nx run-many -t test --coverage

# Run specific app tests
nx test web        # Frontend
nx test api        # Backend

# Run E2E tests
npx playwright test

# Run E2E with UI
npx playwright test --ui
```

### 2. QA Agent — Analyze Results

**If tests pass:**
- Report coverage summary
- Flag any coverage drops
- Suggest areas needing more tests

**If tests fail:**
- Identify failing tests
- Analyze failure reason
- Suggest fix (or fix directly)
- Re-run to verify fix

### 3. QA Agent — Coverage Report

```
Coverage Summary:
├── Statements: 87% (threshold: 80%) ✅
├── Branches:   78% (threshold: 75%) ✅
├── Functions:  91% (threshold: 80%) ✅
└── Lines:      85% (threshold: 80%) ✅

Areas below target:
├── src/billing/   : 62% branches (needs more edge case tests)
└── src/analytics/ : 71% statements (complex calculations)
```

### 4. QA Agent — TDD Guidance

If the user is writing new code, enforce TDD:

```
1. RED:    Write a failing test
   → "Write test for: User registration with duplicate email should fail"

2. GREEN:  Write minimum code to pass
   → "Add unique constraint check in UserService.create()"

3. REFACTOR: Clean up
   → "Extract email validation into separate method"

4. DELETE: Remove code written before test
   → "Delete the old registration logic"
```

## Output

After `/test`:

1. ✅ Test results (pass/fail)
2. ✅ Coverage report with thresholds
3. ✅ Failure analysis and fix suggestions
4. ✅ TDD guidance (if writing new code)

## Document Standards

This command produces task documents for test tasks using the specified template:

| Template | Output Path |
|---|---|
| `task-template.md` | `docs/tasks/` |

- **Test Task Docs**: Saves to `docs/tasks/{test-task-name}-task.md`

All task documents must follow the template in `.opencode/templates/`. Do not skip required sections.
