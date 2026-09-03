# Coding Standards

These rules apply to ALL agents and ALL code written in this project.

## TypeScript

- Strict mode enabled (`"strict": true` in tsconfig)
- No `any` type — use `unknown` and narrow with type guards
- No `@ts-ignore` or `@ts-expect-error` — fix the type error
- Prefer `interface` for object shapes, `type` for unions/intersections
- Use `const` assertions for literal values
- Explicit return types on exported functions
- No implicit `any` in function parameters

## Python

- Formatting & Linting: Enforce `ruff check` and `ruff format`. Zero linter warnings permitted.
- Dependency Management: Use `uv` with `pyproject.toml` and lockfile.
- Type Safety: Full type annotations on all function parameters and return types. Verify with `mypy` or `pyright`.
- Data Modeling: Use Pydantic v2 (`BaseModel`, `Field`) for validation and DTOs. Use `pydantic-settings` for typed config.
- Async I/O: Always use `async`/`await` for I/O. Never call synchronous blocking I/O (`requests`, `time.sleep`) inside `async def` — use `httpx` or `asyncio.sleep`.
- No Anti-Patterns:
  - ❌ NEVER use mutable default arguments (`def f(items=[])` → use `items: list | None = None`)
  - ❌ NEVER use wildcard imports (`from module import *`)
  - ❌ NEVER use bare `except:` without specifying exception classes

## Rust

- Linting: `cargo clippy --all-targets -- -D warnings` MUST pass with zero warnings. Format with `cargo fmt`.
- Error Handling: Always return `Result<T, E>`. Use `thiserror` for domain/library errors, `anyhow` for application errors.
- No Panics in Production: **NEVER** use `.unwrap()` or `.expect()` in production paths. Handle errors with `?`, `unwrap_or_default()`, or `match`.
- Ownership & Borrowing: Prefer borrowing (`&str`, `&[T]`) over taking ownership. Do NOT gratuitously `.clone()` to appease the borrow checker.
- Unsafe Code: Disallow `unsafe` blocks unless strictly required for FFI/performance; any `unsafe` block MUST contain a `// SAFETY:` explanatory comment.

## Naming Conventions

| Element | Convention | Example |
|---|---|---|
| Variables | camelCase | `userId`, `isActive` |
| Functions | camelCase | `getUserById`, `formatDate` |
| Classes | PascalCase | `UserService`, `AuthGuard` |
| Interfaces | PascalCase, no `I` prefix | `UserProfile`, `AuthToken` |
| Types | PascalCase | `UserRole`, `HttpStatus` |
| Enums | PascalCase | `enum Status { ACTIVE, INACTIVE }` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`, `API_BASE_URL` |
| Files (components) | PascalCase | `UserProfile.tsx`, `AuthGuard.tsx` |
| Files (utilities) | camelCase | `formatDate.ts`, `validateEmail.ts` |
| Files (tests) | Same as source + `.test`/`.spec` | `UserService.spec.ts` |
| Directories | kebab-case | `user-profile/`, `auth-guard/` |

## Import Order

```typescript
// 1. Node built-ins
import { join } from 'path';

// 2. External packages
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// 3. Internal absolute imports (via NX paths)
import { CreateUserDto } from '@shared/types';

// 4. Internal relative imports
import { validateEmail } from './utils';
```

## Code Style

- Prefer early returns over deep nesting
- Prefer guard clauses at function top
- Max function length: 30 lines (extract helpers if longer)
- Max file length: 300 lines (split into modules if longer)
- Max nesting depth: 3 levels
- No magic numbers — extract to named constants
- Prefer `readonly` for properties that shouldn't change
- Use optional chaining (`?.`) and nullish coalescing (`??`)

## Error Handling

- Never swallow errors silently — log or rethrow
- Use custom error classes, not generic `Error`
- Provide error context (what failed, why, what to do)
- Prefer `Result` pattern or throwing — don't return `null` for errors

```typescript
// Good
class UserNotFoundError extends Error {
  constructor(public readonly userId: string) {
    super(`User ${userId} not found`);
    this.name = 'UserNotFoundError';
  }
}

// Bad
catch (e) { /* silently ignore */ }
```

## Comments

- No AI slop comments ("Here we...", "This function...", "Let me...")
- Code should be self-documenting — prefer clear naming over comments
- Use comments only for: WHY (not WHAT), complex algorithms, workarounds with ticket links
- JSDoc on exported public APIs only
- No commented-out code — delete it (git has history)

## File Structure

```
feature/
├── index.ts              # Public exports only (barrel)
├── feature.service.ts    # Business logic
├── feature.controller.ts # HTTP handlers (NestJS) or route handlers (Next.js)
├── feature.types.ts      # Types, interfaces, DTOs
├── feature.utils.ts      # Pure utility functions
├── feature.constants.ts  # Constants
├── feature.spec.ts       # Tests (co-located)
└── feature.module.ts     # NestJS module (if applicable)
```

## Git Hygiene

- Commit messages: conventional commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`)
- One logical change per commit
- No generated files in commits (dist, node_modules, .next)
- Branch naming: `feat/`, `fix/`, `chore/`, `docs/` + short description
