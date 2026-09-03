---
name: git-workflow
description: Git conventions — branch naming, conventional commits, merge strategy, PR format for all agents
---

# git-workflow

## Description

Git conventions for all agents in the opencode-saas-kit project. Standardized branching, committing, merging, and PR practices to maintain a clean repository history.

## When to Trigger

- Creating a new branch for work
- Writing commit messages
- Creating or reviewing pull requests
- Merging branches
- Resolving merge conflicts
- User says "commit", "branch", "PR", "merge", "push"

## Instructions

### Branch Naming

```
feat/short-description    → New features
fix/short-description     → Bug fixes
chore/short-description   → Maintenance, deps, config
docs/short-description    → Documentation only
refactor/short-description → Code restructuring
test/short-description    → Adding or fixing tests
```

Examples:
```
feat/user-dashboard
fix/login-redirect-loop
chore/upgrade-next-15
docs/api-endpoint-docs
refactor/extract-auth-module
test/payment-flow-e2e
```

### Conventional Commits

Format: `type(scope): description`

**Types:**
- `feat` — New feature
- `fix` — Bug fix
- `docs` — Documentation
- `style` — Formatting, no code change
- `refactor` — Code restructuring
- `test` — Adding/fixing tests
- `chore` — Maintenance
- `perf` — Performance improvement
- `ci` — CI/CD changes
- `build` — Build system changes

**Scopes (examples):**
- `auth`, `dashboard`, `billing`, `settings`, `api`, `ui`, `db`, `config`

**Examples:**
```
feat(dashboard): add metric cards with real-time updates
fix(auth): prevent redirect loop on expired session
docs(api): document webhook endpoints
refactor(billing): extract Stripe logic to service layer
test(settings): add integration tests for profile update
chore(deps): upgrade Next.js to 15.1
```

**Breaking changes:**
```
feat(api)!: change authentication endpoint response format

BREAKING CHANGE: /api/auth/login now returns { token, user } 
instead of { access_token, profile }
```

### Commit Best Practices

```
# Good: One logical change
git commit -m "feat(dashboard): add revenue chart component"

# Bad: Multiple unrelated changes
git commit -m "add chart and fix login and update deps"

# Good: Atomic commits
git add src/components/RevenueChart.tsx
git commit -m "feat(dashboard): add revenue chart component"
git add src/lib/auth.ts
git commit -m "fix(auth): handle expired token refresh"
```

### PR Conventions

**Title:** Same as commit format — `feat(dashboard): add revenue chart`

**Description template:**
```markdown
## What
Brief description of changes.

## Why
Reason for the change.

## How
Implementation approach.

## Testing
How to verify the change.

## Screenshots
(if UI changes)
```

**PR rules:**
- One logical change per PR
- Max ~400 lines of diff (excluding generated files)
- Link to issue/ticket if applicable
- Request review from appropriate agent/person
- All CI checks must pass
- Security scan must pass

### Merge Strategy

```
# Always squash and merge for features
# This keeps main branch history clean

# Before merging:
1. Ensure all CI passes
2. Security scan passes
3. Review all comments resolved
4. Squash merge (not regular merge)

# After merging:
1. Delete the feature branch
2. Pull latest main if continuing work
```

### Rules for main Branch

```
NEVER:
- Force push to main
- Commit directly to main
- Merge without CI passing
- Merge without security scan
- Leave broken code on main

ALWAYS:
- Use PRs for all changes
- Squash merge features
- Delete branches after merge
- Keep main deployable at all times
```

## Examples

### Example 1: Feature Branch Lifecycle

```bash
# Create branch
git checkout -b feat/payment-flow

# Work with atomic commits
git add src/components/PaymentForm.tsx
git commit -m "feat(billing): add payment form component"

git add src/lib/stripe.ts
git commit -m "feat(billing): integrate Stripe payment processing"

git add src/app/billing/page.tsx
git commit -m "feat(billing): add billing page with payment form"

# Push and create PR
git push origin feat/payment-flow

# PR gets squash-merged
# Branch deleted
```

### Example 2: Bug Fix

```bash
# Create branch from main
git checkout -b fix/login-redirect

# Fix with clear commit
git add src/middleware.ts
git commit -m "fix(auth): prevent infinite redirect on expired session

The middleware was redirecting to /login which triggered the same 
middleware check, causing a loop. Added check for auth routes."

# Push, PR, merge
```

### Example 3: Dependency Update

```bash
# Create branch
git checkout -b chore/upgrade-react

# Update deps
npm install react@19 react-dom@19

# Commit
git add package.json package-lock.json
git commit -m "chore(deps): upgrade React to v19

Updated react and react-dom. No breaking changes affect our usage."

# Push, PR, merge
```

## Anti-Patterns

- **Don't commit directly to main.** All changes go through PRs. No exceptions.
- **Don't create mega PRs.** 1000+ line PRs are impossible to review properly. Break them up.
- **Don't use vague commit messages.** "fix stuff", "update", "WIP" are useless. Be specific.
- **Don't mix unrelated changes.** One commit = one logical change. One PR = one feature or fix.
- **Don't force push to main.** Ever. Force push to feature branches is fine (with caution).
- **Don't leave broken commits on main.** Every commit on main should be deployable.
- **Don't forget to delete merged branches.** Stale branches clutter the repo.
- **Don't skip the PR template.** Empty PR descriptions make review harder.
- **Don't merge without CI passing.** Broken CI = broken code. Fix it first.
- **Don't use `git add .` blindly.** Review what you're staging. Accidentally committed secrets are a security incident.
