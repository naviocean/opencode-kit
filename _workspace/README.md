# `_workspace/` — Runtime State (gitignored)

This directory holds **runtime state only** — never committed.

## 1. Orchestration State Machine

`_workspace/harness-state.json`

Tracks the deterministic workflow lifecycle (`IDLE → PLAN → BUILD → REVIEW → SHIP → COMPLETED`), parallel subagent task status, and commit-SHA freshness for quality gates.

```bash
node scripts/harness-state.mjs status
```

## 2. Harness Checkpoints

`_workspace/0[1-9]_<phase>_<artifact>.md`

Intermediate artifacts between phases of a multi-phase workflow (`/plan` → `/build` → `/review` → `/ship`). Examples:

- `01_pm_interview.md` — Socratic interview transcript
- `02_<agent>_*` — Specialist parallel implementation outputs
- `03_qa_report.md` — QA verification results (`/build`)
- `04_security_report.md` — Security scan results (`/build`)
- `05_review_code.md` & `05_review_security.md` — `/review` gate reports
- `06_qa_ship.md` & `06_security_ship.md` — `/ship` final gate reports
- `harness-compliance-report.md` — Behavioral compliance scorecard (`npm run eval`)

These are workspace state, not deliverables. Final deliverables go to `docs/{prds,designs,plans,tasks,adr,verification}/` (committed).

## 3. Model Routing & Health Check

Agent models are routed by each harness via the `model:` field in each agent's frontmatter (synced from `.agent-core/presets/`). To diagnose model availability (read-only, does not change config):

```bash
node scripts/model-health-check.mjs
# or
npm run health
```
