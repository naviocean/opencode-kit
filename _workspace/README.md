# `_workspace/` — Runtime State (gitignored)

This directory holds **runtime state only** — never committed.

## 1. Harness checkpoints

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

## 2. Model routing (opencode-native)

Agent models are routed by opencode via the `model:` field in each agent's
frontmatter — there is no runtime override layer. To diagnose model
availability, run (read-only, does not change config):

```bash
node .opencode/scripts/model-health-check.mjs
```
