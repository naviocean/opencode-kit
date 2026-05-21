---
name: coding-standards
description: TypeScript coding standards — strict mode, naming conventions, imports, error handling for all agents
---

# coding-standards

## Description

TypeScript coding standards for all agents in the opencode-saas-kit project. Consistent code style, type safety, and best practices across the entire codebase.

## When to Trigger

- Writing any TypeScript or TypeScript React code
- Reviewing code for standards compliance
- Refactoring existing code
- User says "code style", "standards", "lint", "type safety"

## Instructions

### TypeScript Configuration

```json
// tsconfig.json - strict mode is non-negotiable
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

### Type Safety Rules

```typescript
// ❌ NEVER: any type
const data: any = fetchSomething();

// ✅ ALWAYS: explicit types
interface UserData {
  id: string;
  name: string;
  email: string;
}
const data: UserData = fetchSomething();

// ❌ NEVER: @ts-ignore
// @ts-ignore
const value = obj.property;

// ✅ ALWAYS: proper type narrowing
if ('property' in obj) {
  const value = obj.property;
}

// ❌ NEVER: type assertions without justification
const user = data as User;

// ✅ ALWAYS: type guards
function isUser(data: unknown): data is User {
  return typeof data === 'object' && data !== null && 'id' in data;
}
if (isUser(data)) {
  const user = data; // safely typed
}
```

### Naming Conventions

```typescript
// Variables and functions: camelCase
const userName = 'John';
function getUserById(id: string): User { }

// Classes and interfaces: PascalCase
class UserService { }
interface UserProfile { }
type PaymentStatus = 'pending' | 'completed' | 'failed';

// Constants: UPPER_SNAKE_CASE
const MAX_RETRY_COUNT = 3;
const API_BASE_URL = 'https://api.example.com';

// Boolean variables: is/has/can/should prefix
const isActive = true;
const hasPermission = false;
const canEdit = checkPermission();
const shouldRedirect = status === 'success';

// Event handlers: handle/on prefix
function handleClick(): void { }
function onSubmit(event: FormEvent): void { }
const onChange = (value: string): void => { };
```

### Function Rules

```typescript
// Max 30 lines per function
// If longer, extract sub-functions

// ❌ BAD: 100-line function
function processOrder(order: Order): Result {
  // ... 100 lines of logic
}

// ✅ GOOD: Small, focused functions
function processOrder(order: Order): Result {
  const validated = validateOrder(order);
  const priced = calculateTotal(validated);
  const charged = processPayment(priced);
  return createConfirmation(charged);
}

// Explicit return types on exported functions
export function getUser(id: string): Promise<User> {
  return db.users.findById(id);
}

// ❌ BAD: Implicit return type
export function getUser(id) {
  return db.users.findById(id);
}
```

### Import Order

```typescript
// 1. Node.js built-ins
import { readFileSync } from 'fs';
import path from 'path';

// 2. External packages
import { z } from 'zod';
import { NextResponse } from 'next/server';

// 3. Internal absolute imports (via @ alias)
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

// 4. Relative imports
import { validateInput } from './utils';
import { UserCard } from './UserCard';
```

### Early Returns

```typescript
// ❌ BAD: Nested conditions
function getUser(id: string): User | null {
  if (id) {
    if (isValidId(id)) {
      const user = db.find(id);
      if (user) {
        return user;
      }
    }
  }
  return null;
}

// ✅ GOOD: Early returns
function getUser(id: string): User | null {
  if (!id) return null;
  if (!isValidId(id)) return null;
  
  return db.find(id) ?? null;
}
```

### Error Handling

```typescript
// ❌ BAD: Swallowing errors
try {
  await riskyOperation();
} catch (e) {
  // silently ignored
}

// ❌ BAD: Generic catch
try {
  await riskyOperation();
} catch (e) {
  console.log('error');
}

// ✅ GOOD: Specific error handling
try {
  await riskyOperation();
} catch (error) {
  if (error instanceof NetworkError) {
    logger.warn('Network unavailable', { error });
    return { error: 'SERVICE_UNAVAILABLE' };
  }
  logger.error('Unexpected error', { error });
  throw error; // Re-throw unknown errors
}
```

### No Magic Numbers

```typescript
// ❌ BAD: Magic numbers
if (users.length > 50) { }
setTimeout(retry, 3000);
const price = quantity * 9.99;

// ✅ GOOD: Named constants
const MAX_USERS_PER_PAGE = 50;
const RETRY_DELAY_MS = 3000;
const UNIT_PRICE = 9.99;

if (users.length > MAX_USERS_PER_PAGE) { }
setTimeout(retry, RETRY_DELAY_MS);
const price = quantity * UNIT_PRICE;
```

### File Organization

```
Max 300 lines per file. If longer:
1. Extract utilities to separate files
2. Extract types to types.ts
3. Extract constants to constants.ts
4. Split into sub-modules
```

## Examples

### Example 1: API Route

```typescript
// src/app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = CreateUserSchema.safeParse(body);
  
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const user = await db.users.create(parsed.data);
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    logger.error('Failed to create user', { error, data: parsed.data });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Example 2: React Component

```typescript
// src/components/UserCard.tsx
import { FC } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';

interface UserCardProps {
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
  onSelect: (userId: string) => void;
}

export const UserCard: FC<UserCardProps> = ({ user, onSelect }) => {
  const handleClick = (): void => {
    onSelect(user.id);
  };

  return (
    <Card onClick={handleClick} className="cursor-pointer hover:shadow-md">
      <Avatar src={user.avatarUrl} fallback={user.name[0]} />
      <div>
        <p className="font-medium">{user.name}</p>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </div>
    </Card>
  );
};
```

## Anti-Patterns

- **Don't use `any`.** Ever. If you don't know the type, use `unknown` and narrow it.
- **Don't use `@ts-ignore` or `@ts-expect-error`.** Fix the type issue instead of suppressing it.
- **Don't swallow errors silently.** Every catch block must either log, re-throw, or return an error state.
- **Don't use vague variable names.** `data`, `temp`, `result`, `item` are acceptable only in very small scopes.
- **Don't write functions longer than 30 lines.** Extract, extract, extract.
- **Don't use `var`.** Use `const` by default, `let` when reassignment is needed.
- **Don't mix async and sync patterns.** If a function does async work, it returns a Promise.
- **Don't use default exports.** Named exports are easier to refactor and search.
- **Don't inline complex logic.** Extract to named functions or variables with descriptive names.
- **Don't skip return types on public APIs.** Internal helpers can have inferred types. Exported functions must be explicit.
