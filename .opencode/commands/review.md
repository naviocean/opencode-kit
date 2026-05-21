# /review

Code review and security audit.

## Agent Flow

```
Tech Lead + Security Auditor (parallel)
```

## Steps

### 1. Tech Lead — Code Review

The Tech Lead reviews all changes:

**Review Checklist:**
- [ ] Code follows coding standards
- [ ] No `any` types or type suppressions
- [ ] Functions are focused and small
- [ ] Error handling is proper
- [ ] No hardcoded values
- [ ] Imports are organized
- [ ] Naming is clear and consistent

**Architecture Review:**
- Uses GitNexus `impact` to analyze blast radius
- Uses GitNexus `context` to understand affected areas
- Verifies changes match the plan from `/plan`
- Checks for unintended side effects

**Pattern Review:**
- NestJS patterns followed (modules, guards, etc.)
- Next.js patterns followed (App Router, RSC, etc.)
- Prisma patterns followed (schema, queries, etc.)
- Test patterns followed (TDD, coverage, etc.)

### 2. Security Auditor — Security Review

Runs in parallel with Tech Lead review:

- AgentShield scan on agent configs
- Secret detection in changed files
- Permission boundary validation
- Input validation check
- SQL injection risk assessment
- XSS risk assessment

### 3. Verdict

**Approved:** All checks pass, no critical issues
**Changes Requested:** Issues found with specific fix instructions
**Blocked:** Critical security findings, must fix before merge

## Output

After `/review`:

1. ✅ Code review feedback (from Tech Lead)
2. ✅ Security findings (from Security Auditor)
3. ✅ Verdict: Approved / Changes Requested / Blocked

Run `/ship` if approved.

## Document Standards

This command produces security review documents using the specified template:

| Template | Output Path |
|---|---|
| `security-review-template.md` | `docs/` |

- **Security Review**: Saves to `docs/{feature-name}-security-review.md`

All review documents must follow the template in `.opencode/templates/`. Do not skip required sections.
