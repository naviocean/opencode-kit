# Design Doc: [Feature Name]

> **Status**: Draft | In Review | Approved | Implemented
> **Author**: Tech Lead Agent (+ Designer Agent for UI)
> **Created**: YYYY-MM-DD
> **Version**: 1.0.0
> **PRD**: [Link to PRD](../prds/XXX-feature-name.md)

---

## 1. Overview

<!-- One paragraph summary of the technical approach -->

This document describes the technical design for [feature name] as specified in the PRD. The approach uses [technology/pattern] to [achieve goal].

---

## 2. Goals & Non-Goals

### Goals

- ✅ [Technical goal 1]
- ✅ [Technical goal 2]
- ✅ [Technical goal 3]

### Non-Goals

- ❌ [What we're explicitly NOT solving technically]
- ❌ [What we're explicitly NOT solving technically]

---

## 3. High-Level Architecture

<!-- System diagram showing components and data flow -->

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │ ──→ │   API       │ ──→ │  Database   │
│  (Next.js)  │     │  (NestJS)   │     │ (PostgreSQL)│
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  External   │
                    │  Service    │
                    └─────────────┘
```

### Component Responsibilities

| Component | Responsibility | Technology |
|---|---|---|
| [Component 1] | [What it does] | [Tech] |
| [Component 2] | [What it does] | [Tech] |

---

## 4. Data Model

### Database Schema

```prisma
// prisma/schema.prisma

model [Entity] {
  id        String   @id @default(cuid())
  field1    String
  field2    Int
  field3    Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  relation  RelatedEntity[]

  @@map("[table_name]")
}
```

### Entity Relationships

```
[Entity1] ──1:N──→ [Entity2]
[Entity1] ──M:N──→ [Entity3]
```

---

## 5. API Design

### REST Endpoints

| Method | Path | Description | Auth |
|---|---|---|---|
| `GET` | `/api/[resource]` | List [resources] | Yes |
| `GET` | `/api/[resource]/:id` | Get [resource] by ID | Yes |
| `POST` | `/api/[resource]` | Create [resource] | Yes |
| `PATCH` | `/api/[resource]/:id` | Update [resource] | Yes |
| `DELETE` | `/api/[resource]/:id` | Delete [resource] | Yes (Admin) |

### Request/Response Examples

```typescript
// POST /api/[resource]
// Request
{
  "field1": "value",
  "field2": 123
}

// Response (201 Created)
{
  "id": "clx1234567890",
  "field1": "value",
  "field2": 123,
  "createdAt": "2026-01-15T10:30:00Z"
}
```

### Error Responses

```typescript
// 400 Bad Request
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    { "field": "field1", "message": "must not be empty" }
  ]
}

// 401 Unauthorized
{
  "statusCode": 401,
  "message": "Invalid or expired token"
}

// 404 Not Found
{
  "statusCode": 404,
  "message": "Resource not found"
}
```

---

## 6. Authentication & Authorization

### Auth Flow

```
1. Client → POST /auth/login { email, password }
2. Server → Validate credentials → Return { accessToken, refreshToken }
3. Client → Store accessToken in memory, refreshToken in httpOnly cookie
4. Client → API requests with Authorization: Bearer <accessToken>
5. Server → Validate JWT → Process request
6. On 401 → Client → POST /auth/refresh → New accessToken
```

### Role-Based Access

| Role | Permissions |
|---|---|
| `user` | Read own data, create/update own resources |
| `admin` | All user permissions + manage all resources |
| `super_admin` | All permissions + system configuration |

---

## 7. Frontend Design

### Page Structure

```
/[feature]/
├── page.tsx              # Main page (Server Component)
├── loading.tsx           # Loading state
├── error.tsx             # Error boundary
├── components/
│   ├── [Feature]List.tsx     # List view (Client Component)
│   ├── [Feature]Form.tsx     # Create/Edit form
│   └── [Feature]Detail.tsx   # Detail view
└── hooks/
    └── use[Feature].ts       # Custom hooks
```

### Component Hierarchy

```
[Feature]Page (Server)
├── [Feature]Header
├── [Feature]Filters (Client)
├── [Feature]List (Client)
│   └── [Feature]Item (Client)
└── [Feature]Pagination (Client)
```

### Design Tokens

```css
/* Specific to this feature */
--[feature]-bg: var(--color-background);
--[feature]-text: var(--color-foreground);
--[feature]-accent: var(--color-primary);
```

---

## 8. Error Handling

### Strategy

| Layer | Error Type | Handling |
|---|---|---|
| API Validation | Invalid input | 400 with field-level errors |
| Business Logic | Rule violation | 422 with business error message |
| Auth | Invalid token | 401, redirect to login |
| Not Found | Missing resource | 404 |
| Server | Unexpected error | 500, log to monitoring |

### Custom Error Classes

```typescript
class [Feature]ValidationError extends Error {
  constructor(public fields: FieldError[]) {
    super('Validation failed');
    this.name = '[Feature]ValidationError';
  }
}

class [Feature]NotFoundError extends Error {
  constructor(public id: string) {
    super(`[Feature] ${id} not found`);
    this.name = '[Feature]NotFoundError';
  }
}
```

---

## 9. Testing Strategy

| Layer | Tool | Coverage Target |
|---|---|---|
| Unit (Service) | Vitest | 90% |
| Unit (Component) | Vitest + RTL | 80% |
| Integration (API) | Vitest + Supertest | 85% |
| E2E | Playwright | Critical flows only |

### Key Test Scenarios

- [ ] [Scenario 1: Happy path]
- [ ] [Scenario 2: Error case]
- [ ] [Scenario 3: Edge case]
- [ ] [Scenario 4: Auth/permission]

---

## 10. Performance Considerations

| Concern | Strategy |
|---|---|
| Database queries | Prisma `select` for minimal data, cursor pagination |
| API responses | Caching with `Cache-Control` headers |
| Frontend | Server Components where possible, lazy loading |
| Real-time | Polling (not WebSockets) for v1 |

---

## 11. Security Considerations

| Concern | Mitigation |
|---|---|
| SQL Injection | Prisma parameterized queries |
| XSS | React auto-escaping, input sanitization |
| CSRF | SameSite cookies, CSRF tokens |
| Rate Limiting | Throttle on auth endpoints |
| Data Exposure | DTO serialization, never return raw entities |

---

## 12. Migration & Rollout

### Database Migration

```bash
# Add migration
npx prisma migrate dev --name add_[feature]

# Rollback
npx prisma migrate resolve --rolled-back [migration_name]
```

### Feature Rollout

| Phase | Scope | Duration |
|---|---|---|
| Internal | Dev team only | 1 week |
| Beta | 10% of users | 1 week |
| GA | All users | - |

---

## 13. Monitoring & Observability

| What | Tool | Alert Threshold |
|---|---|---|
| Error rate | Sentry | > 1% of requests |
| Latency (p95) | APM | > 500ms |
| Database queries | Prisma metrics | > 100ms avg |

---

## 14. Open Technical Questions

| # | Question | Owner | Status | Resolution |
|---|---|---|---|---|
| 1 | [Technical question] | [Who] | Open | [Answer] |

---

## 15. Alternatives Considered

| Alternative | Pros | Cons | Why Rejected |
|---|---|---|---|
| [Alternative 1] | [Pros] | [Cons] | [Reason] |
| [Alternative 2] | [Pros] | [Cons] | [Reason] |

---

## Appendix

### A. Sequence Diagrams

### B. Database Indexes

### C. API Rate Limits

---

**Next Step**: [Implementation Plan](./plan-template.md) — Tech Lead
