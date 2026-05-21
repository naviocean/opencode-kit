# /security

Run AgentShield security scan.

## Agent Flow

```
Security Auditor
```

## Steps

### 1. Security Auditor — Full Scan

```bash
# Scan project
npx ecc-agentshield scan

# Scan specific path
npx ecc-agentshield scan --path .opencode/

# Verbose output
npx ecc-agentshield scan --verbose

# Auto-fix safe issues
npx ecc-agentshield scan --fix

# Deep analysis with Opus agents
npx ecc-agentshield scan --opus --stream
```

### 2. Interpret Findings

| Grade | Score | Action |
|---|---|---|
| A | 90-100 | ✅ Excellent — no action needed |
| B | 80-89 | ✅ Good — minor issues, low priority |
| C | 70-79 | ⚠️ Fair — should address before ship |
| D | 60-69 | ❌ Poor — significant vulnerabilities |
| F | 0-59 | 🚨 Critical — fix immediately |

### 3. Fix and Re-scan

For each finding:
1. Explain the risk in plain language
2. Provide specific fix instructions
3. Apply fix (if auto-fixable)
4. Re-scan to verify fix

## Categories Scanned

| Category | Rules | What It Catches |
|---|---|---|
| Secrets | 14 | Hardcoded API keys, tokens, passwords |
| Permissions | 31 | Overly broad allowedTools, missing deny lists |
| Hooks | 34 | Suspicious commands, data exfiltration |
| MCP Servers | 23 | Typosquatted packages, unverified sources |
| Agent Configs | — | Prompt injection, hidden instructions |

## Output

After `/security`:

1. ✅ Security report with grade
2. ✅ Findings list with severity
3. ✅ Fix suggestions for each finding
4. ✅ Re-scan verification (if fixes applied)

## Document Standards

This command produces security review documents using the specified template:

| Template | Output Path |
|---|---|
| `security-review-template.md` | `docs/` |

- **Security Review**: Saves to `docs/{scan-target}-security-review.md`

All security documents must follow the template in `.opencode/templates/`. Do not skip required sections.
