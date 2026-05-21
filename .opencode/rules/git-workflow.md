# Git Workflow

All agents follow these git conventions.

## Branch Naming

```
feat/user-auth           # New feature
fix/login-redirect       # Bug fix
chore/update-deps        # Maintenance
docs/api-reference       # Documentation
test/user-service        # Test additions
refactor/auth-module     # Code refactoring
```

## Commit Messages

Follow Conventional Commits:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | When to Use |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no code change |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | Performance improvement |
| `test` | Adding or updating tests |
| `chore` | Build process, tooling, dependencies |
| `ci` | CI/CD changes |

### Examples

```
feat(auth): add JWT refresh token endpoint

- Implement token rotation on /auth/refresh
- Revoke old refresh token after rotation
- Add rate limiting to prevent brute force

Closes #123
```

```
fix(user): prevent duplicate email registration

Check for existing email before creating user record.
Previously returned 500, now returns 409 Conflict.
```

```
refactor(api): extract validation into shared pipe

Move request validation from individual controllers
into a reusable ValidationPipe in libs/shared.
```

## Pull Requests

### Title

Same format as commit message: `feat(auth): add JWT refresh token`

### Description Template

```markdown
## What

Brief description of the change.

## Why

Why this change is needed.

## How

How it works (if not obvious).

## Testing

- [ ] Unit tests pass
- [ ] E2E tests pass (if applicable)
- [ ] Manual testing done

## Checklist

- [ ] Code follows coding standards
- [ ] Self-reviewed
- [ ] Documentation updated (if needed)
- [ ] No breaking changes (or documented)
```

## Merge Strategy

- **Squash and merge** for feature branches (clean history)
- **Merge commit** for release branches (preserve history)
- Delete branch after merge

## Agent-Specific Rules

### Tech Lead

- Reviews all PRs before merge
- Uses GitNexus `impact` to analyze blast radius
- Uses GitNexus `detect_changes` to verify scope

### QA Agent

- Runs `nx affected -t test` before approving
- Verifies test coverage meets thresholds
- Blocks merge on test failures

### Security Auditor

- Runs AgentShield scan on PRs that touch agent configs
- Blocks merge on critical security findings
- Warns on medium/low findings

### All Agents

- Never force push to main/develop
- Never commit directly to main
- Always create a branch for changes
- One logical change per PR (no mega PRs)
- Link related issues in PR description
