# /build

Activate the full team. Parallel execution until done.

## Agent Flow

```
Tech Lead → Frontend + Backend (parallel) → QA → Security Auditor
```

## Steps

### 1. Tech Lead — Dispatch

The Tech Lead:

- Reads the plan from `/plan` (stored in ICM memory)
- Breaks work into parallel tasks
- Assigns tasks to Frontend and Backend agents
- Uses category-based delegation:
  - `deep` — complex, autonomous work
  - `quick` — single-file changes, typos
  - `ultrabrain` — hard logic, architecture decisions

### 2. Frontend + Backend — Parallel Execution

Both agents work simultaneously:

**Frontend Agent:**
- Implements React components
- Sets up RTK Query endpoints
- Applies Shadcn/Tailwind styling
- Follows design tokens from Designer
- Writes component tests

**Backend Agent:**
- Implements NestJS modules
- Sets up Prisma models and migrations
- Creates API endpoints (REST/GraphQL)
- Implements auth guards
- Writes integration tests

### 3. QA Agent — Verification

After Frontend and Backend complete:

- Runs `nx affected -t test` (only affected tests)
- Checks coverage thresholds
- Runs Playwright E2E for critical flows
- Reports failures with context

### 4. Security Auditor — Scan

Before marking complete:

- Runs `npx ecc-agentshield scan` on agent configs
- Checks for hardcoded secrets
- Validates permission boundaries
- Reports findings by severity

## Output

After `/build`:

1. ✅ Implementation complete
2. ✅ Tests passing
3. ✅ Coverage meets thresholds
4. ✅ Security scan passed

Run `/review` for code review.

## Document Standards

This command produces task documents using the specified template:

| Template | Output Path |
|---|---|
| `task-template.md` | `docs/tasks/` |

- **Task Docs**: Saves to `docs/tasks/{task-name}-task.md`

All task documents must follow the template in `.opencode/templates/`. Do not skip required sections.
