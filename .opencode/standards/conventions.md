# Conventions

Detailed rules for all agents. **AGENTS.md is the pointer file (short, always
read on startup); this file is the detail (read on demand).** Every agent
MUST consult this file when:

- Writing or reviewing code (Coding, Git, Anti-Patterns)
- Creating tests (Testing)
- Touching auth, secrets, or permissions (Security)
- Approving or blocking work (Anti-Patterns)

Sections are alphabetically ordered. Skim the table of contents first.

## Table of Contents

1. [Anti-Patterns](#anti-patterns) — actions that always fail review
2. [Coding](#coding) — TypeScript strict, naming, imports, errors
3. [Git](#git) — branches, commits, PRs
4. [Security](#security) — AgentShield, OWASP, secrets
5. [Testing](#testing) — TDD, coverage, framework

---

## Anti-Patterns

These are **automatic review failures**. No exceptions, no "but it's a small case."

### Code

| Anti-Pattern | Why Blocked | Correct Alternative |
|---|---|---|
| `any` type | Disables type checking; runtime errors that tests would catch | Use `unknown` and narrow, or define a proper type |
| `@ts-ignore` | Hides type errors that exist for a reason | `@ts-expect-error` with a comment, or fix the type |
| `@ts-nocheck` at top of file | Marks entire file as unchecked | Add proper types, or use `.js` extension |
| `console.log` in production code | Pollutes output, no log level, no structure | Use structured logger (`pino`, `winston`) |
| `eval()` / `new Function()` | Code injection vector | Refactor to explicit logic |
| Hardcoded secrets, tokens, connection strings | Credential leak | Environment variables, secret manager |
| `dangerouslySetInnerHTML` without sanitization | XSS vector | Sanitize with DOMPurify, or use safe content |
| Direct `prisma.findMany()` without pagination | OOM on large tables | Always pass `take` and `skip` or cursor |
| `await` inside a `for` loop for I/O | Serial when could be parallel | `Promise.all` or `Promise.allSettled` |
| Mutations of imported objects | Cross-module side effects | Clone first, or use immutable pattern |

### Process

| Anti-Pattern | Why Blocked | Correct Alternative |
|---|---|---|
| Skipping PM and writing code directly for a "small" feature | "Small" features grow; spec drift costs 10x | 5-minute Socratic, 10-minute spec, then build |
| Force-push to `main` | Destroys team history | Branch + PR + squash merge |
| Committing without running tests locally | CI catches what local would have caught | `nx affected -t test` before push |
| "I'll add tests later" | Later never comes; 80% coverage rule violated | TDD: test first, then code |
| Rejecting code review without specific feedback | Agent can't act on vague "looks bad" | File path + line + issue + suggested fix |
| Reusing a feature branch across PRs | Mixes review scopes, hard to revert | One branch per logical change |
| Mixing refactor with feature | Review can't focus; revert is all-or-nothing | Separate commits or separate PRs |
| Disabling ESLint/Prettier to make code "pass" | Hides real issues | Fix the issue, or document the rule change in PR description |
| Lying about test coverage ("80% covered" without checking) | Inflated metrics → false confidence | Run `nx test --coverage` and report actual number |

### Cross-Domain

| Anti-Pattern | Why Blocked | Correct Alternative |
|---|---|---|
| Frontend agent editing `apps/api/` | Breaks domain ownership; backend can't review | Escalate to Tech Lead; backend does the edit |
| Backend agent editing `apps/web/` | Same | Same |
| Rustacean editing web code | Same | Same |
| Designer writing production logic | Design owns spec, not code | Designer → handoff → Frontend implements |
| QA skipping test review on a "trivial" PR | Trivial PRs have 30% of bugs | Always run affected tests |

---

## Coding

### TypeScript Strict Mode

`tsconfig.json` MUST have:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

**Non-negotiable. Any agent that turns off a strict flag to make code compile gets rejected.**

### Naming Conventions

| Element | Convention | Example |
|---|---|---|
| Files (TS) | `kebab-case.ts` | `user-profile.ts` |
| Components (React) | `PascalCase.tsx` | `UserProfile.tsx` |
| Hooks (React) | `use-<name>.ts` | `use-debounce.ts` |
| Types/Interfaces | `PascalCase` | `UserProfile` |
| Functions/Variables | `camelCase` | `getUserProfile` |
| Constants (module-level) | `UPPER_SNAKE_CASE` | `MAX_RETRY_COUNT` |
| Enums (use sparingly) | `PascalCase` (values: `PascalCase`) | `UserRole.Admin` |
| Database tables | `snake_case` (Prisma convention) | `user_profiles` |
| Database columns | `snake_case` | `created_at` |
| API routes | `kebab-case` (path), `camelCase` (params) | `/user-profiles`, `?userId=` |
| Branch names | `type/scope-description` | `feat/user-auth` |
| Commit messages | Conventional Commits | `feat: add JWT refresh` |

### Imports

Order (enforced by ESLint `import/order`):

1. Node built-ins (`fs`, `path`)
2. External packages (`react`, `@nestjs/common`)
3. Workspace packages (`@kit/shared-types`, `@kit/api-client`)
4. Relative imports (`./`, `../`)

Within each group: alphabetical. No deep imports (`@nestjs/common/decorators`) — use the public entry.

```typescript
// ✅ Correct
import { readFileSync } from 'fs';
import { Injectable } from '@nestjs/common';
import type { UserProfile } from '@kit/shared-types';
import { UserService } from '../user/user.service';

// ❌ Wrong
import { UserService } from '../user/user.service';  // relative before external
import { Injectable } from '@nestjs/common/decorators';  // deep import
```

### Error Handling

**Never** swallow errors silently:

```typescript
// ❌ Wrong
try {
  await riskyOperation();
} catch (e) {
  // ignored
}

// ✅ Correct
try {
  await riskyOperation();
} catch (e) {
  logger.error({ err: e, context: 'riskyOperation' }, 'operation failed');
  throw new OperationError('Failed to complete operation', { cause: e });
}
```

**Use specific error types**, not generic `Error`:

```typescript
// ✅ Custom error hierarchy
class DomainError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'DomainError';
  }
}

class UserNotFoundError extends DomainError {
  constructor(userId: string) {
    super(`User ${userId} not found`, 'USER_NOT_FOUND');
  }
}
```

**Return discriminated unions** for known failure modes:

```typescript
type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

// ✅ Caller MUST narrow before use
const result = await fetchUser(id);
if (result.ok) {
  console.log(result.value.name);
} else {
  // TypeScript knows result.error exists
  return handleError(result.error);
}
```

---

## Git

### Branch Naming

`<type>/<scope>-<short-description>`

| Type | Use |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code change that doesn't add features or fix bugs |
| `docs` | Documentation only |
| `test` | Test additions or fixes |
| `chore` | Build, CI, dependency updates |

Examples:
- `feat/auth-jwt-refresh`
- `fix/billing-stripe-webhook-timeout`
- `refactor/api-error-handler`
- `docs/update-readme-quickstart`

### Commit Messages (Conventional Commits)

```
<type>(<scope>): <subject>

<body>

<footer>
```

- Subject: imperative, lowercase, no period, max 72 chars
- Body: explain WHY, not WHAT (the diff shows WHAT)
- Footer: `Refs: #123`, `BREAKING CHANGE: ...`

Examples:
```
feat(auth): add JWT refresh token rotation

The previous implementation issued a new refresh token on every access.
This caused token churn and complicated revocation. Now we rotate refresh
tokens on use, with a 7-day reuse window for mobile clients.

Refs: #234
```

```
fix(api): prevent N+1 in user list endpoint

The previous query loaded each user's profile individually, causing
100ms+ latency on lists of 50+ users. Now using Prisma `include` to
batch-load.

Closes: #456
```

### PR Workflow

1. **One logical change per PR.** A PR can have multiple commits, but they MUST tell one story.
2. **Title**: conventional commit format, no period.
3. **Description**: link issue, explain WHY, list test plan, include screenshots for UI.
4. **CI green** before review request.
5. **2 approvals** (or 1 + tech-lead override) for merge.
6. **Squash merge** with a conventional commit title.
7. **Delete branch** after merge.

### NEVER

- ❌ Force-push to `main`
- ❌ Commit secrets (use `.env` + `.gitignore`)
- ❌ Commit `node_modules`, `dist`, `build`
- ❌ Commit `console.log` left over from debugging
- ❌ Commit with `--no-verify` (skip hooks) without team approval
- ❌ Mix feature + refactor + format in one commit

---

## Security

### AgentShield (Mandatory)

Run `npx ecc-agentshield scan` before every `/ship` and `/review`. 102 rules across 5 categories:

| Category | Rules | Examples |
|---|---|---|
| Secrets | 14 | Hardcoded API keys, tokens, passwords, connection strings, private keys |
| Permissions | 31 | Overly broad `allowedTools`, missing deny lists, excessive filesystem access |
| Hooks | 34 | Suspicious commands in pre/post hooks, `curl \| bash`, env var leaks |
| MCP Servers | 23 | Typosquatted packages, unverified sources, auto-approve configs |
| Agent Configs | — | Prompt injection, hidden instructions, unsafe external links |

**Findings classification**:

| Severity | Action |
|---|---|
| Critical | Block immediately. Cannot merge. |
| High | Block. Must fix before merge. |
| Medium | Fix in same PR or file follow-up issue. |
| Low | Note in PR description. Tech Lead decides. |
| Info | No action. |

### OWASP Top 10 (Always Check)

| Risk | Defense |
|---|---|
| Injection (SQL, NoSQL, command) | Parameterized queries, ORM, never string-concat user input |
| Broken auth | JWT validation, refresh rotation, MFA for admin |
| Sensitive data exposure | Encrypt at rest, TLS in transit, no PII in logs |
| XXE | Disable external entities in XML parsers (don't use XML) |
| Broken access control | RBAC checks on EVERY endpoint, not just UI |
| Security misconfig | No default credentials, no debug mode in prod, headers set |
| XSS | React's auto-escape (don't bypass), CSP headers, sanitize user HTML |
| Insecure deserialization | Don't deserialize untrusted data; use JSON Schema validation |
| Vulnerable components | `npm audit` + Renovate for updates |
| Insufficient logging | Log all auth events, permission changes, sensitive operations |

### Secret Management

- **Never** commit `.env` files with real values. Use `.env.example` for placeholders.
- **Always** load secrets from env vars at runtime, not at build time.
- **Prefer** secret managers (AWS Secrets Manager, Vault) for production.
- **Rotate** any secret that may have been exposed (commits, logs, screenshots) immediately.
- **Test** for leaked secrets in CI: `gitleaks` or `trufflehog`.

### Permission Audits

When reviewing a PR that changes `.opencode/agents/*.md` or `hooks.json`:

- Reject `allowedTools: ["*"]` — too broad
- Reject new `Bash()` patterns that allow destructive commands
- Reject missing `--deny` lists when `allowedTools` includes `Bash`
- Reject new hook commands without source attribution

---

## Testing

### TDD (Test-Driven Development)

**Required for all business logic.** The cycle:

```
RED      → Write a failing test that defines the desired behavior
GREEN    → Write the minimal code to make the test pass
REFACTOR → Clean up without changing behavior (tests still pass)
DELETE   → Remove any code written BEFORE the test existed
```

**TDD applies to**:
- Service classes and business logic
- API route handlers
- Custom hooks with state management
- Utility functions with branching logic
- Database query builders and transformers

**TDD does NOT apply to**:
- Configuration files
- Type definitions
- Simple presentational components (no logic)
- Database migrations

### Coverage Requirements

| Metric | Minimum | Stretch |
|---|---|---|
| Statements | 80% | 90% |
| Branches | 75% | 85% |
| Functions | 80% | 90% |
| Lines | 80% | 90% |

**Coverage below 80% statements = block merge.** No exceptions.

### Test Structure (AAA Pattern)

```typescript
describe('UserService.createUser', () => {
  it('creates a user with hashed password', async () => {
    // Arrange
    const dto: CreateUserDto = {
      email: 'test@example.com',
      password: 'plain-text-password',
    };
    const mockPrisma = createMockPrisma();

    // Act
    const result = await service.createUser(dto);

    // Assert
    expect(result).toMatchObject({ email: 'test@example.com' });
    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          passwordHash: expect.not.stringMatching(/plain-text/),
        }),
      })
    );
  });
});
```

### Test Frameworks

| Layer | Framework | Why |
|---|---|---|
| Unit (TS/JS) | Vitest | Fast, Jest-compatible, native ESM |
| Component (React) | Vitest + Testing Library | Behavior-focused, no snapshot bloat |
| E2E (Web) | Playwright | Multi-browser, auto-wait, video trace |
| API (NestJS) | Supertest | HTTP-level, no transport |
| Rust | `cargo test` (built-in) | Native, no JS interop needed |

### Mocking

- **DO** mock external services (Stripe, SendGrid, third-party APIs)
- **DO** mock databases with `vi.mock` (Vitest) or `prisma-mock`
- **DO NOT** mock the system under test
- **DO NOT** mock the entire module — narrow to the function
- **DO** prefer fakes over mocks (in-memory DB > `vi.mock` for complex queries)
- **DO** verify mock calls: `expect(mock).toHaveBeenCalledWith(...)`

### Test Isolation

- **Each test** starts with a fresh DB (transaction rollback or in-memory)
- **No shared state** between tests
- **No order dependency** — tests can run in any sequence
- **No `beforeAll`** for mutable state — use `beforeEach` instead
