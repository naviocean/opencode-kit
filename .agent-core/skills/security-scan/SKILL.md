---
name: security-scan
description: AgentShield security scanning — detect secrets, permission issues, hook vulnerabilities, MCP misconfigs
---

# security-scan

## Description

Run AgentShield security scanning on agent configurations, MCP servers, and codebase. Detect secrets, permission issues, hook vulnerabilities, and MCP server misconfigurations before they reach production.

## When to Trigger

- Before shipping any release (mandatory gate)
- On every PR review
- When agent configurations change (AGENTS.md, .opencode/ configs)
- When adding or modifying MCP server configurations
- When hooks or permission rules are updated
- User says "security scan", "check security", "agentship", "before ship"

## Instructions

### Running the Scan

```bash
# Full scan
npx ecc-agentshield scan

# Scan with auto-fix for safe issues
npx ecc-agentshield scan --fix

# Scan specific category
npx ecc-agentshield scan --category secrets
npx ecc-agentshield scan --category permissions
npx ecc-agentshield scan --category hooks
npx ecc-agentshield scan --category mcp-servers

# Scan specific directory
npx ecc-agentshield scan --path .opencode/
```

### Severity Levels and Actions

| Grade | Severity | Action | Example |
|-------|----------|--------|---------|
| A | Clean | Ship | No findings |
| B | Info | Ship, note in PR | Low-risk pattern detected |
| C | Medium | Warn, fix recommended | Overly permissive rule |
| D | Medium-High | Block PR, fix before merge | Exposed non-critical secret |
| F | Critical | **BLOCK SHIP**, fix immediately | API key in code, root permission |

### Scan Categories

**Secrets (14 rules)**
- API keys, tokens, passwords in code
- Hardcoded credentials
- .env files committed to git
- MCP server secrets in config
- JWT secrets exposed

**Permissions (31 rules)**
- Overly broad file access (`/` instead of specific paths)
- Missing permission boundaries
- Agent accessing unauthorized resources
- Root-level permissions granted unnecessarily
- Missing deny rules for sensitive paths

**Hooks (34 rules)**
- Command injection in hook scripts
- Unvalidated user input in hooks
- Hooks running with elevated permissions
- Missing sandboxing for hooks
- Hooks executing arbitrary code

**MCP Servers (23 rules)**
- Unauthenticated MCP server connections
- MCP servers with excessive permissions
- Missing transport security (non-HTTPS)
- MCP servers exposing sensitive tools
- Missing rate limiting on MCP endpoints

### Auto-Fix Workflow

```bash
# 1. Run scan
npx ecc-agentshield scan

# 2. Review findings
# Output shows: [SEVERITY] [CATEGORY] [FILE:LINE] [DESCRIPTION]

# 3. Auto-fix safe issues
npx ecc-agentshield scan --fix
# Fixes: removes committed secrets, tightens permissions, fixes common patterns

# 4. Manual fix for unsafe issues
# AgentShield flags what needs human review

# 5. Re-scan to verify
npx ecc-agentshield scan
# Must show grade improvement before shipping
```

### CI Integration

```yaml
# In CI pipeline
- name: Security Scan
  run: |
    npx ecc-agentshield scan --format json > scan-results.json
    # Fail on F grade
    if grep -q '"grade":"F"' scan-results.json; then
      echo "CRITICAL: Security scan failed with F grade"
      exit 1
    fi
```

## Examples

### Example 1: Pre-Ship Scan

```bash
$ npx ecc-agentshield scan

AgentShield Security Scan v1.2.0
================================

[CRITICAL] Secrets: API key found in .opencode/mcp/stripe.json:3
  → stripe_api_key: "sk_live_..."
  → Fix: Move to environment variable

[MEDIUM] Permissions: Agent has root filesystem access in .opencode/agents/frontend.json:12
  → "allowed_paths": ["/"]
  → Fix: Restrict to ["./src", "./public"]

[INFO] Hooks: Pre-commit hook runs without sandbox in .opencode/hooks/pre-commit.sh:5
  → Consider adding sandbox restrictions

Grade: D → Fix 1 critical, 1 medium issue before shipping
```

### Example 2: PR Review Scan

```bash
$ npx ecc-agentshield scan --diff

# Only scans changed files in current PR
# Fast feedback on new code only

[MEDIUM] Permissions: New MCP server added with broad access
  → .opencode/mcp/database.json allows read+write to all tables
  → Suggestion: Restrict to specific tables
```

### Example 3: Auto-Fix

```bash
$ npx ecc-agentshield scan --fix

Auto-fixing safe issues...
[ FIXED ] Secrets: Moved API key to .env.example placeholder
[ FIXED ] Permissions: Restricted paths from "/" to ["./src"]
[ SKIP  ] Hooks: Manual review needed for command injection

Re-running scan...
Grade: D → B (2 issues auto-fixed, 1 needs manual review)
```

## Anti-Patterns

- **Don't skip the scan before ship.** Even small changes can introduce security issues. Every release gets scanned.
- **Don't ignore medium findings.** Medium issues become critical when combined. Fix them in the same sprint.
- **Don't block on info-only issues.** Info findings are suggestions, not blockers. Note them in PR and move on.
- **Don't commit secrets even temporarily.** "I'll remove it later" is how secrets leak. Use environment variables from the start.
- **Don't grant root permissions to agents.** Always use the principle of least permission. Specify exact paths and tools needed.
- **Don't skip re-scan after fixes.** Fixes can introduce new issues. Always re-scan after changes.
- **Don't run scan only locally.** CI must also run the scan. Local scans can be skipped or forgotten.
- **Don't ignore MCP server security.** MCP servers are attack vectors. Scan them like any other code.
