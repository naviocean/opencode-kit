# `_workspace/` — Runtime State (gitignored)

This directory holds **runtime state only** — never committed. Two categories:

## 1. Model fallback state

`_workspace/.fallback-state.json`

Written by `node .opencode/scripts/model-fallback.mjs <agent>` when the
primary model for an agent is unhealthy. Read by
`.opencode/hooks/model-router.sh` on every `task()` call to override the
effective model without mutating the agent's `.md` frontmatter or
`.opencode/agent-models.json` (the source of truth).

Schema:

```json
{
  "schema": 1,
  "updatedAt": "2026-06-01T18:00:00.000Z",
  "overrides": {
    "tech-lead": {
      "effective": "my_xiaomi/mimo-v2.5",
      "primary": "my_xiaomi/mimo-v2.5-pro",
      "reason": "primary_unhealthy",
      "since": "...",
      "lastChecked": "..."
    }
  }
}
```

To inspect: `node .opencode/scripts/model-fallback.mjs --list`
To clear: `node .opencode/scripts/model-fallback.mjs <agent> --reset`
To force a fresh check: `node .opencode/scripts/model-fallback.mjs <agent>`

Primary recovery is automatic — `model-fallback.mjs` re-tests primary on
every invocation and clears the override if primary is healthy again.

## 2. Harness checkpoints

`_workspace/0[1-9]_<agent>_<artifact>.md`

Intermediate artifacts between phases of a multi-phase workflow
(`/plan` → `/build` → `/review` → `/ship`). Examples:

- `01_pm_interview.md` — Socratic interview transcript
- `02_designer_spec.md` — UX flow + design tokens draft
- `03_tech_lead_plan.md` — implementation plan draft
- `04_tech_lead_review.md` — review verdict
- `05_tech_lead_ship.md` — final ship approval
- `06_qa_report.md` — test results
- `07_security_report.md` — AgentShield scan + OWASP

These are workspace state, not deliverables. Final deliverables go to
`docs/{prds,designs,plans,tasks,adr}/` (committed).
