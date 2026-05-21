# /ship

Final validation before deployment.

## Agent Flow

```
QA → Security Auditor → Tech Lead
```

## Steps

### 1. QA Agent — Full Test Suite

Runs the complete test suite:

```bash
# Unit + integration tests
nx run-many -t test

# E2E tests
npx playwright test

# Coverage report
nx run-many -t test --coverage
```

**Checks:**
- All tests pass
- Coverage meets thresholds (80% statements, 75% branches)
- No skipped tests without linked issues
- E2E critical flows verified

### 2. Security Auditor — Final Gate

Final security validation:

```bash
# AgentShield scan
npx ecc-agentshield scan

# npm audit
npm audit --production
```

**Gates:**
- AgentShield grade: A or B (pass), C (warn), D/F (block)
- No critical npm audit findings
- No hardcoded secrets
- Permission boundaries intact

### 3. Tech Lead — Final Approval

The Tech Lead:

- Reviews QA and Security reports
- Uses GitNexus `detect_changes` for final diff summary
- Verifies all acceptance criteria from spec are met
- Gives final approval or lists remaining issues

## Output

After `/ship`:

1. ✅ All tests passing
2. ✅ Security gate passed
3. ✅ Acceptance criteria met
4. ✅ Ready to deploy

## Deployment

After Tech Lead approval:

```bash
# If using Docker
docker build -t app:latest .
docker push registry/app:latest

# If deploying to Vercel/Railway
git push origin main
```

The kit does not handle deployment (that's your DevOps team's job), but ensures code is ready for it.

## Document Standards

This command produces security review documents using the specified template:

| Template | Output Path |
|---|---|
| `security-review-template.md` | `docs/` |

- **Security Review**: Saves to `docs/{feature-name}-security-review.md`

All ship documents must follow the template in `.opencode/templates/`. Do not skip required sections.
