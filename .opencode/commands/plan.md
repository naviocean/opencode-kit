# /plan

Socratic planning session. Use to produce PRD + design + technical plan before any code is written. Do NOT use for: implementation (`/build`), quick fixes (dispatch Tech Lead with `quick` category), security audit (`/security`), final approval (`/ship`), or design-only requests without specs (`/design`).

**HARD-GATE:** If the user request is implementation ("build me X") or unclear, PM interview begins BEFORE any spec work. Skipping the interview = invalid spec.

## Execution Mode: Subagent Pipeline (Sequential)

| Phase | Mode | Why |
|---|---|---|
| Phase 0: Context Check | (orchestrator) | Avoid redoing prior planning on existing specs |
| Phase 1: PM Interview | **Subagent** (PM) | Socratic questions need focused context, no other agents in scope |
| Phase 2: PM Spec | **Subagent** (PM) | Same agent continues — preserves interview context |
| Phase 3: Designer UI/UX | **Subagent** (Designer) | Receives PM spec, handoff via file |
| Phase 4: Tech Lead Architecture | **Subagent** (Tech Lead) | Receives both, handoff via file |

Pipeline (not parallel) because each phase's output is the next phase's input. Parallelism here would produce contradictions.

## Agent Flow

```
PM → Designer → Tech Lead
```

## Phase 0: Context Check (avoid redoing planning)

1. **Read `docs/prds/`** — list existing PRDs
2. **Read `docs/designs/`** — list existing design docs
3. **Read `docs/plans/`** — list existing plans
4. **Determine mode:**
   - User said "new feature" → initial planning, proceed to Phase 1
   - User references existing spec → resume, ask which sections to update
   - User said "revise X" → partial update, only re-run affected phases

Print and confirm:
```
Found PRDs: {list}
Found plans: {list}
Mode: {initial | resume | partial}
Proceed? (y/n)
```

## Phase 1: PM Agent — Socratic Interview

- Ask **5-7 clarifying questions** (one at a time, Superpowers style)
- Scale question count to request complexity (1-2 for bug fix, 5-7 for new module — see pm.md)
- Wait for user response between each question. Do NOT batch questions.

**Why one at a time?** Users overwhelmed by 7 simultaneous questions either skip them or answer superficially. One question → deep answer. Five deep answers = real spec.

## Phase 2: PM Agent — Spec Document

After interview, PM writes PRD to `docs/prds/{feature-name}-prd.md` using `prd-template.md`:
- Problem statement (what, for whom, current workaround)
- User stories (As/I want/So that)
- Acceptance criteria (testable, in/out of scope explicit)
- Technical constraints
- Open questions (anything unresolved)

**Why explicit "Out of Scope"?** Scope creep is the #1 cause of project delay. Writing it down creates accountability and lets you push back later.

## Phase 3: Designer Agent — UI/UX Plan

Only if feature has UI. Non-UI features (API, migrations, config) skip this phase.

- Map user flows (entry → action → outcome)
- Identify required screens/pages
- Define component inventory
- Create design tokens (colors, spacing, typography)
- Optional: generate via Stitch or Pencil
- Output: `docs/designs/{feature-name}-design.md`

**Why designer before Tech Lead?** Tech Lead needs to know UI complexity (component count, state management needs) to plan API surface and task breakdown correctly. Skipping = architects optimize for the wrong thing.

## Phase 4: Tech Lead — Architecture Plan

- NX project structure (apps, libs affected)
- Data model (Prisma schema outline)
- API design (endpoints or GraphQL schema)
- Task breakdown with dependencies
- Parallel execution opportunities (frontend/backend can be parallel?)
- Output: `docs/plans/{feature-name}-plan.md`

**Why Tech Lead last?** Tech Lead synthesizes PM intent + Design complexity into executable plan. Running architect before designer = spec'd into a corner by decisions designer would have flagged.

## Output

After `/plan`:
1. ✅ Approved PRD at `docs/prds/{feature}-prd.md`
2. ✅ Design doc at `docs/designs/{feature}-design.md` (UI features only)
3. ✅ Architecture plan at `docs/plans/{feature}-plan.md`
4. ✅ User has explicitly approved all three

**Next:** Run `/build` to start implementation.

## Document Standards

| Output | Path | Template |
|---|---|---|
| PRD | `docs/prds/{feature}-prd.md` | `.opencode/standards/prd-template.md` |
| Design Doc | `docs/designs/{feature}-design.md` | `.opencode/standards/design-doc-template.md` |
| Plan | `docs/plans/{feature}-plan.md` | `.opencode/standards/plan-template.md` |

All documents must follow templates. Do not skip required sections.

## Anti-patterns (BLOCKING)

- ❌ Skipping Socratic interview (PM HARD-GATE)
- ❌ Multiple questions in one message (user overload)
- ❌ Specs with TBD/TODO (plan failure)
- ❌ Designer phase on non-UI features (waste)
- ❌ Tech Lead before PM spec (architecting in the dark)
