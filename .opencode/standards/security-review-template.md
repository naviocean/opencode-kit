# Security Review: [Feature/Component Name]

> **Status**: Pending | In Progress | Passed | Failed | Conditional Pass
> **Reviewer**: Security Auditor Agent
> **Date**: YYYY-MM-DD
> **Scope**: [What was reviewed]

---

## 1. Review Summary

**Overall Grade**: [A/B/C/D/F]

**Verdict**: [PASS / CONDITIONAL PASS / FAIL]

**Critical Findings**: [Number]
**High Findings**: [Number]
**Medium Findings**: [Number]
**Low Findings**: [Number]

---

## 2. Scope Reviewed

| Component | Status | Notes |
|---|---|---|
| Authentication | ✅ Reviewed | [Notes] |
| Authorization | ✅ Reviewed | [Notes] |
| Input Validation | ✅ Reviewed | [Notes] |
| API Endpoints | ✅ Reviewed | [Notes] |
| Database Queries | ✅ Reviewed | [Notes] |
| File Operations | ⬜ N/A | [Notes] |
| External APIs | ✅ Reviewed | [Notes] |

---

## 3. Findings

### Critical (Must Fix Before Ship)

| ID | Finding | File | Line | Fix |
|---|---|---|---|---|
| SEC-001 | [Finding description] | [file] | [line] | [Fix instruction] |

### High (Should Fix Before Ship)

| ID | Finding | File | Line | Fix |
|---|---|---|---|---|
| SEC-002 | [Finding description] | [file] | [line] | [Fix instruction] |

### Medium (Fix Soon)

| ID | Finding | File | Line | Fix |
|---|---|---|---|---|
| SEC-003 | [Finding description] | [file] | [line] | [Fix instruction] |

### Low (Fix When Convenient)

| ID | Finding | File | Line | Fix |
|---|---|---|---|---|
| SEC-004 | [Finding description] | [file] | [line] | [Fix instruction] |

---

## 4. OWASP Top 10 Checklist

| # | Category | Status | Notes |
|---|---|---|---|
| A01 | Broken Access Control | ✅ Pass | [Notes] |
| A02 | Cryptographic Failures | ✅ Pass | [Notes] |
| A03 | Injection | ✅ Pass | Prisma parameterized queries |
| A04 | Insecure Design | ✅ Pass | [Notes] |
| A05 | Security Misconfiguration | ✅ Pass | [Notes] |
| A06 | Vulnerable Components | ✅ Pass | [Notes] |
| A07 | Auth Failures | ✅ Pass | JWT with refresh |
| A08 | Data Integrity Failures | ✅ Pass | [Notes] |
| A09 | Logging Failures | ⚠️ Warning | [Notes] |
| A10 | SSRF | ✅ Pass | [Notes] |

---

## 5. AgentShield Scan Results

```
$ npx ecc-agentshield scan

Grade: [A/B/C/D/F]
Score: [0-100]/100

[Scan output]
```

---

## 6. Recommendations

| Priority | Recommendation | Effort |
|---|---|---|
| High | [Recommendation 1] | [Hours] |
| Medium | [Recommendation 2] | [Hours] |
| Low | [Recommendation 3] | [Hours] |

---

## 7. Sign-Off

- [ ] All critical findings resolved
- [ ] All high findings resolved or accepted with justification
- [ ] Security scan passed
- [ ] Approved for deployment

**Security Auditor**: [Name]
**Date**: [Date]

---

**Used in**: `/review`, `/ship` commands
