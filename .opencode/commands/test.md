# /test

Run tests and analyze coverage. Use for: ad-hoc test runs, coverage checks, debugging failures. Do NOT use for: full deployment gate (`/ship` — uses full suite), code review (`/review`).

**Note:** Tests run automatically as part of `/build` (affected only) and `/ship` (full suite). Use `/test` for ad-hoc runs.

## Execution Mode: Single Subagent (QA)

QA runs alone — test execution is sequential by nature.

## Agent Flow

```
QA
```

## Steps

### 1. QA Agent — Run Tests

```bash
nx run-many -t test                # all tests
nx affected -t test                # only affected (default for /build)
nx run-many -t test --coverage     # with coverage
nx test web                        # specific app
nx test api
npx playwright test                # E2E
npx playwright test --ui           # E2E with UI
```

**Why so many modes?** Different scopes for different needs. Pre-commit = affected. Pre-merge = full. Debug = single file. Each is a different speed/coverage tradeoff.

### 2. QA Agent — Analyze Results

**If tests pass:**
- Report coverage summary
- Flag any coverage drops from baseline
- Suggest areas needing more tests

**If tests fail:**
- Identify failing tests
- Analyze failure reason (read error, not just count)
- Suggest fix (or fix directly)
- Re-run to verify

**Why "analyze, not just count"?** A pass/fail count doesn't tell you what to do next. Analysis tells the user "this is broken, here's the fix."

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
1. RED: Write a failing test
2. GREEN: Write minimum code to pass
3. REFACTOR: Clean up
4. DELETE: Remove code written before test

**Why TDD?** Tests written after code tend to validate the implementation, not the behavior. Tests written first define the contract.

## Output

After `/test`:
1. ✅ Test results (pass/fail)
2. ✅ Coverage report with thresholds
3. ✅ Failure analysis and fix suggestions
4. ✅ TDD guidance (if writing new code)

## Document Standards

| Output | Path | Template |
|---|---|---|
| Test task docs | `docs/tasks/{test-name}-task.md` | `.opencode/standards/task-template.md` |

## Anti-patterns (BLOCKING)

- ❌ Running full suite when affected would suffice (slows feedback loop)
- ❌ Deleting failing tests to "pass" (tech debt, will block /ship)
- ❌ Reporting only pass/fail count without analysis
- ❌ Tests that always pass (testing nothing)
