# Testing Standards

All agents follow these testing conventions.

## Stack

| Ecosystem | Layer | Tool | Purpose |
|---|---|---|---|
| **TypeScript / Web / API** | Unit & Integration | Vitest 4 + Supertest | Function, class, and API endpoint testing |
| | Component | Vitest + React Testing Library | React component behavior and DOM rendering |
| | E2E | Playwright | Full user flows across browsers |
| | Mocking | MSW (Mock Service Worker) | API network mocking |
| **Python / AI** | Unit & Integration | `pytest` + `pytest-asyncio` | Service, model, agent, and LangGraph pipeline tests |
| | Test Doubles | `pytest-mock` / `unittest.mock` | External API and LLM call mocking |
| | Coverage | `pytest-cov` | Statement/branch coverage reporting |
| **Rust / Desktop** | Unit & Integration | `cargo test` | Module unit tests (`#[test]`) & integration tests (`tests/`) |
| | Mocking | `mockall` | Trait-based mocking for native systems |
| | Coverage | `cargo-llvm-cov` / `cargo-tarpaulin` | Line/branch coverage verification |

## Test Pyramid

```
        ╱╲
       ╱  ╲         E2E (few)
      ╱    ╲        - Critical user flows only
     ╱──────╲       - Auth, billing, core CRUD
    ╱        ╲
   ╱ Integration╲   Integration (some)
  ╱──────────────╲  - API endpoints, DB queries, LLM pipelines
 ╱                ╲ - Desktop IPC, service boundaries
╱    Unit Tests    ╲ Unit (many)
╱────────────────────╲
- Business logic, utilities, components, pure algorithms
```

## TDD Workflow (RED-GREEN-REFACTOR)

Borrowed from Superpowers (obra/superpowers):

```
1. RED:    Write a failing test that describes the behavior
2. GREEN:  Write the MINIMUM code to make the test pass
3. REFACTOR: Clean up the code while keeping tests green
4. DELETE: Remove any code written before the test
```

**Rules:**
- Never write production code without a failing test
- Never write more of a test than is sufficient to fail
- Never write more production code than is sufficient to pass

## Coverage Thresholds

| Metric | Minimum | Target |
|---|---|---|
| Statements | 80% | 90% |
| Branches | 75% | 85% |
| Functions | 80% | 90% |
| Lines | 80% | 90% |

**Enforcement:**
- TypeScript: `nx affected -t test` runs only affected tests
- Python: `pytest --cov --cov-fail-under=80` enforced on `.py` changes
- Rust: `cargo test` 100% pass required on `src-tauri/`
- Coverage report generated on every test run
- PR blocked if coverage drops below minimum

## Unit Test Patterns

### Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node', // or 'jsdom' for React
    include: ['**/*.spec.ts', '**/*.test.ts'],
    coverage: {
      provider: 'v8',
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
});
```

### Test File Structure

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('UserService', () => {
  let service: UserService;
  let fakeUserRepo: FakeUserRepository;

  beforeEach(() => {
    fakeUserRepo = new FakeUserRepository();
    service = new UserService(fakeUserRepo);
  });

  describe('createUser', () => {
    it('should create user with valid data', async () => {
      const user = await service.createUser({
        email: 'test@example.com',
        name: 'Test User',
      });

      expect(user).toBeDefined();
      expect(user.email).toBe('test@example.com');
    });

    it('should throw on duplicate email', async () => {
      fakeUserRepo.seed([{ email: 'test@example.com' }]);

      await expect(
        service.createUser({ email: 'test@example.com' })
      ).rejects.toThrow('Email already exists');
    });
  });
});
```

### Naming Convention

```
describe('ClassName') → describes the unit under test
  describe('methodName') → describes the method
    it('should [expected behavior] when [condition]') → describes the case
```

## Component Test Patterns

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { UserCard } from './UserCard';

describe('UserCard', () => {
  it('should display user name', () => {
    render(<UserCard name="John" email="john@example.com" />);

    expect(screen.getByText('John')).toBeInTheDocument();
  });

  it('should call onDelete when delete button clicked', () => {
    const onDelete = vi.fn();
    render(<UserCard name="John" onDelete={onDelete} />);

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));

    expect(onDelete).toHaveBeenCalledOnce();
  });
});
```

## Integration Test Patterns (NestJS + Supertest)

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';

describe('AuthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/login', () => {
    it('should return JWT on valid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'password123' })
        .expect(200)
        .expect((res) => {
          expect(res.body.accessToken).toBeDefined();
        });
    });

    it('should return 401 on invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'wrong' })
        .expect(401);
    });
  });
});
```

## E2E Test Patterns (Playwright)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication flow', () => {
  test('should login and access dashboard', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[data-testid="email"]', 'user@example.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');

    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByText('Welcome')).toBeVisible();
  });

  test('should show error on invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[data-testid="email"]', 'user@example.com');
    await page.fill('[data-testid="password"]', 'wrong');
    await page.click('[data-testid="login-button"]');

    await expect(page.getByText('Invalid credentials')).toBeVisible();
  });
});
```

## Shared Test Utils

Located in `libs/shared/test-utils/`:

```typescript
// libs/shared/test-utils/src/fake-user-service.ts
export class FakeUserService {
  private users: User[] = [];

  seed(data: Partial<User>[]) {
    this.users = data.map((u, i) => ({
      id: `user-${i}`,
      email: `user${i}@example.com`,
      name: `User ${i}`,
      ...u,
    }));
  }

  findAll() { return this.users; }
  findById(id: string) { return this.users.find(u => u.id === id); }
  findByEmail(email: string) { return this.users.find(u => u.email === email); }
  create(data: Partial<User>) {
    const user = { id: `user-${this.users.length}`, ...data } as User;
    this.users.push(user);
    return user;
  }
  delete(id: string) {
    this.users = this.users.filter(u => u.id !== id);
  }
  reset() { this.users = []; }
}
```

## When to Write Tests

| Situation | Test Type Required |
|---|---|
| New business logic | Unit test (TDD mandatory) |
| New API endpoint | Integration test |
| New React component | Component test |
| Critical user flow | E2E test |
| Bug fix | Regression test (before fix) |
| Refactor | Existing tests must pass (no new tests needed) |

## Test Anti-Patterns (DO NOT)

- ❌ Testing implementation details (test behavior, not internals)
- ❌ Mocking everything (use fakes, not mocks, for dependencies)
- ❌ Shared mutable state between tests
- ❌ Tests that depend on execution order
- ❌ Snapshot tests for logic (only for UI snapshots if needed)
- ❌ `test.skip` without a linked issue to fix it
- ❌ Deleting failing tests to "pass"
