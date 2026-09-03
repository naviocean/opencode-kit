# Security Standards

All agents follow these security conventions.

## Secrets Management

### NEVER

- ❌ Hardcode API keys, tokens, passwords in source code
- ❌ Commit `.env` files (add to `.gitignore`)
- ❌ Log sensitive data (passwords, tokens, PII)
- ❌ Store secrets in agent memory (ICM, AGENTS.md, etc.)
- ❌ Pass secrets in URL query parameters

### ALWAYS

- ✅ Use environment variables for secrets
- ✅ Use `.env.example` (without real values) as template
- ✅ Validate env vars on application startup
- ✅ Use short-lived tokens where possible
- ✅ Rotate secrets regularly

```typescript
// Good: Validate on startup
const config = {
  database: {
    url: requireEnv('DATABASE_URL'),
  },
  jwt: {
    secret: requireEnv('JWT_SECRET'),
    expiresIn: '15m',
  },
};

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}
```

## Authentication (JWT)

- Access token: short-lived (15 minutes max)
- Refresh token: longer-lived (7 days), stored securely
- Implement token rotation on refresh
- Revoke refresh token after use
- Use `httpOnly` cookies for refresh tokens (not localStorage)
- Implement rate limiting on auth endpoints

```typescript
// JWT Guard pattern
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err: Error, user: any) {
    if (err || !user) {
      throw new UnauthorizedException('Invalid or expired token');
    }
    return user;
  }
}
```

## Input Validation

- Validate ALL input at the API boundary
- Use DTOs with class-validator (NestJS) or zod
- Whitelist allowed fields (don't blacklist)
- Sanitize user input before storage
- Validate file uploads (type, size, content)

```typescript
// DTO validation
export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain uppercase, lowercase, and number',
  })
  password: string;
}
```

## SQL Injection Prevention

- ✅ Use Prisma (parameterized queries by default)
- ✅ Use Prisma's `where` clause, never string concatenation
- ❌ Never use `$queryRaw` with string interpolation
- ❌ Never construct SQL from user input

```typescript
// Good: Prisma parameterized
const user = await prisma.user.findUnique({
  where: { email: userInput.email },
});

// Bad: Raw query with interpolation
const user = await prisma.$queryRaw(
  `SELECT * FROM users WHERE email = '${userInput.email}'`
);
```

## XSS Prevention

- React auto-escapes by default (don't use `dangerouslySetInnerHTML`)
- Sanitize HTML if absolutely necessary (use DOMPurify)
- Set proper Content-Security-Policy headers
- Use `httpOnly` cookies for auth tokens

```typescript
// NestJS Helmet middleware
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
}));
```

## CORS

- Whitelist specific origins (never `*` in production)
- Restrict methods to what's needed
- Restrict headers to what's needed

```typescript
app.enableCors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true,
});
```

## Rate Limiting

- Apply to auth endpoints (login, register, password reset)
- Apply to expensive operations (file upload, search)
- Use sliding window algorithm
- Return `429 Too Many Requests` with `Retry-After` header

```typescript
// NestJS Throttle
@Throttle({ default: { limit: 10, ttl: 60000 } })
@Controller('auth')
export class AuthController {
  @Post('login')
  async login(@Body() dto: LoginDto) { ... }
}
```

## Authorization

- Implement role-based access control (RBAC)
- Check permissions at the service level, not just controller
- Use guards for declarative authorization
- Default to deny (whitelist, not blacklist)

```typescript
// Role guard
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>(
      'roles',
      context.getHandler(),
    );
    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user.role);
  }
}

// Usage
@Roles('admin')
@Delete(':id')
async deleteUser(@Param('id') id: string) { ... }
```

## Multi-Tenant Data Isolation (SaaS Security)

Cross-tenant data leaks are the #1 vulnerability in SaaS platforms.

- **Mandatory Tenant Scoping:** Every database query touching multi-tenant tables MUST filter by `tenantId` / `organizationId`.
- **JWT-Derived Context:** ALWAYS extract `tenantId` from verified JWT claims on the server. NEVER trust a `tenantId` passed in query parameters or request body from the client.
- **Prisma Client Extensions:** Use Prisma client extensions or middleware to automatically apply `{ where: { tenantId } }` on find, update, and delete queries.
- **Row-Level Security (RLS):** When using PostgreSQL, implement Row Level Security (RLS) policies as defense-in-depth against application bugs.
- **Vector DB Isolation:** Vector queries (Pinecone, Qdrant, pgvector) MUST apply a metadata filter `{ tenantId: session.tenantId }` to prevent cross-tenant knowledge leaks.

```typescript
// Good: tenantId strictly enforced from JWT
@Get('projects')
async getProjects(@CurrentUser() user: JwtUserPayload) {
  return this.projectService.findAll({
    where: { tenantId: user.tenantId },
  });
}

// Bad: IDOR vulnerability — trusting route parameter without tenant check
@Get('projects/:id')
async getProject(@Param('id') id: string) {
  return this.prisma.project.findUnique({ where: { id } }); // LEAKS OTHER TENANTS' DATA!
}
```

## LLM & AI Application Security (OWASP Top 10 for LLMs)

When developing AI pipelines, LangGraph workflows, and tool integrations (owned by `python` agent):

- **Prompt Injection Defense:** Untrusted user input must never be interpolated directly into system prompts. Treat all external content (scraped data, user inputs, file contents) as untrusted user role text.
- **Tool Least-Privilege:** Agent tools must only have the minimum required scopes. Destructive actions (data deletion, financial transactions, mass emails) require human-in-the-loop confirmation.
- **No Raw Code Execution:** Never pass LLM-generated strings directly to `eval()`, `exec()`, or raw SQL interpreters without validation against a strict Pydantic model.
- **Sensitive Data Redaction:** Filter PII, auth tokens, and internal server IPs before passing prompts to external LLM providers.
- **Output Validation:** Always parse LLM structured output through Pydantic v2 schemas (`model_validate`) before downstream consumption.

## File Upload Security

- Validate file type (whitelist allowed extensions)
- Validate file size (max 10MB)
- Scan content (not just extension)
- Store outside web root
- Generate random filenames (don't use user-provided names)

## Dependency Security

- Run `npm audit` regularly
- Use Dependabot or Renovate for automated updates
- Review dependency changes in PRs
- Pin major versions, allow minor/patch updates

## Agent-Specific Security

### Security Auditor Agent

- Run `npx ecc-agentshield scan` on every PR touching agent configs
- Block merge on critical findings (grade F)
- Warn on medium findings (grade C-D)
- Report on all findings

### All Agents

- Never execute untrusted code without sandboxing
- Never read `~/.ssh/`, `~/.aws/`, or other credential directories
- Never approve outbound network requests without user confirmation
- Log all tool calls for audit trail

## Security Checklist (Pre-Ship)

Before deploying, verify:

- [ ] No hardcoded secrets in codebase
- [ ] All inputs validated at API boundary (DTO / Pydantic / Zod)
- [ ] Multi-tenant isolation verified (all queries scoped by JWT tenantId, no IDOR)
- [ ] Auth tokens are short-lived with rotation (httpOnly cookies)
- [ ] Rate limiting on auth endpoints
- [ ] CORS configured for specific origins
- [ ] Security headers set (Helmet)
- [ ] SQL injection prevention (Prisma parameterized queries / RLS)
- [ ] XSS prevention (React default escaping)
- [ ] File upload validation (type, size, content)
- [ ] LLM defenses enforced (prompt injection boundaries, tool least-privilege)
- [ ] Dependencies audited (`npm audit`)
- [ ] AgentShield scan passed (grade A-B)
