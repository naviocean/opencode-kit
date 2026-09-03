# /security

Run AgentShield security scan on demand. Use for: ad-hoc security audit, pre-merge check, post-incident review. Do NOT use for: full deployment gate (`/ship`), code review (`/review`).

**Note:** Security scan runs as part of `/review` and `/ship`. Use `/security` only when you need a standalone audit.

## Execution Mode: Single Subagent

Security Auditor runs alone — no parallelization needed for a single scan+report.

## Agent Flow

```
Security Auditor
```

## Steps

### 1. Security Auditor — Full Scan

```bash
npx ecc-agentshield scan                    # full project
npx ecc-agentshield scan --path .opencode/   # agent configs only
npx ecc-agentshield scan --changed           # since last commit
npx ecc-agentshield scan --verbose           # explain each finding
npx ecc-agentshield scan --fix               # auto-fix safe issues
```

**Why 5 modes?** Different scan depths catch different issues. `--changed` is fast for pre-commit. `--path .opencode/` for agent-config audits. Full scan for periodic reviews.

### 2. Interpret Findings

| Grade | Score | Action |
|---|---|---|
| A | 90-100 | ✅ Excellent — no action needed |
| B | 80-89 | ✅ Good — minor issues, low priority |
| C | 70-79 | ⚠️ Fair — should address before ship |
| D | 60-69 | ❌ Poor — significant vulnerabilities |
| F | 0-59 | 🚨 Critical — fix immediately |

**Why grade?** A single number is hard to act on. Letter grade + threshold gives the team a clear "ship / don't ship" signal.

### 3. Fix and Re-scan

For each finding:
1. Explain the risk in plain language (what attacker can do)
2. Provide specific fix with file:line
3. Apply fix (or auto-fix if safe)
4. **Re-scan to verify** — a fix that introduces a new finding is worse than the original

**Why re-scan mandatory?** Manual fixes often miss secondary issues. The re-scan is the verification step that catches regressions.

## Output

After `/security`:
1. ✅ Security report with grade
2. ✅ Findings list with severity
3. ✅ Fix suggestions for each finding
4. ✅ Re-scan verification (if fixes applied)
5. Output: `_workspace/07_security_audit.md`

## Document Standards

| Output | Path | Template |
|---|---|---|
| Security report | `_workspace/07_security_audit.md` | `.opencode/standards/security-review-template.md` |

## Anti-patterns (BLOCKING)

- ❌ Shipping fixes without re-scan
- ❌ Treating Info and Critical the same (triage ruthlessly)
- ❌ Using `/security` instead of `/ship` for final gate (different scope)
