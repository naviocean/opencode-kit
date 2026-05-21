# /plan

Socratic planning session. No code is written until the spec is clear.

## Agent Flow

```
PM → Designer → Tech Lead
```

## Steps

### 1. PM Agent — Socratic Interview

The PM agent interviews you to clarify the request. Expect 5-7 questions covering:

- **Target users**: Who will use this? What's their skill level?
- **Core features**: What are the must-haves vs nice-to-haves?
- **Success metrics**: How do we know this works?
- **Constraints**: Timeline, budget, technical limitations?
- **Scope**: What's explicitly OUT of scope?
- **Dependencies**: External APIs, services, data sources?
- **Priority**: If we can only ship 3 features, which 3?

### 2. PM Agent — Spec Document

After the interview, the PM writes a spec:

```markdown
## Problem Statement
[What problem are we solving?]

## User Stories
- As a [user type], I want [action] so that [benefit]
- ...

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Technical Constraints
- [Constraints and decisions]

## Out of Scope
- [Explicitly excluded items]
```

### 3. Designer Agent — UI/UX Plan

Once spec is approved, the Designer:

- Maps user flows (entry → action → outcome)
- Identifies required screens/pages
- Defines component inventory
- Creates design tokens (colors, spacing, typography)
- Optionally generates designs in Stitch or Pencil

### 4. Tech Lead — Architecture Plan

The Tech Lead creates the technical plan:

- NX project structure (apps, libs)
- Data model (Prisma schema outline)
- API design (endpoints or GraphQL schema)
- Task breakdown with dependencies
- Parallel execution opportunities

## Output

After `/plan`, you'll have:

1. ✅ Approved spec (from PM)
2. ✅ UI/UX plan (from Designer)
3. ✅ Technical plan with task breakdown (from Tech Lead)

Run `/build` to start implementation.

## Document Standards

This command produces the following documents using the specified templates:

| Template | Output Path |
|---|---|
| `prd-template.md` | `docs/prds/` |
| `design-doc-template.md` | `docs/designs/` |
| `plan-template.md` | `docs/plans/` |

- **PRD**: Saves to `docs/prds/{feature-name}-prd.md`
- **Design Doc**: Saves to `docs/designs/{feature-name}-design.md`
- **Plan**: Saves to `docs/plans/{feature-name}-plan.md`

All documents must follow the templates in `.opencode/templates/`. Do not skip required sections.
