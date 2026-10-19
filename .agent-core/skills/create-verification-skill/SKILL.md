---
name: create-verification-skill
description: Inspect a target application's real runtime, select an interaction driver (Playwright, PTY, curl), configure launch and readiness probes, and generate a persistent Feature Map with verifiable user journeys.
---

# Create Verification Skill

Use this skill when initializing or establishing a real-surface verification suite for a project. This bridges the gap between unit test suites and verifiable end-to-end user workflows.

## 1. Objectives

- Discover how the application runs, its environment variables, authentication flow, and seed data.
- Choose the correct real-surface driver:
  - **Web Applications:** Playwright browser automation or headless navigation.
  - **Terminal / CLI / TUI:** PTY terminal session or subshell execution.
  - **Backend / Microservices:** Direct HTTP / cURL invocations against running server endpoints.
- Establish launch commands, readiness probes, and clean teardown.
- Scaffold the project-level **Feature Map** at `docs/verification/feature-map.md`.
- Verify at least one real user flow end-to-end to confirm the verification harness works before declaring completion.

---

## 2. Investigation Protocol (Survey)

Before generating any verification instructions, determine:

1. **How the app boots:** Check `package.json` scripts, `Cargo.toml`, `Makefile`, or `docker-compose.yml`.
   - Command: `npm run dev`, `cargo run`, `docker compose up -d`...
   - Port & Host: e.g., `http://localhost:3000` or `http://localhost:4000/api/health`.
2. **Readiness Probe:** How does the harness know the app is ready for traffic?
   - HTTP health check (e.g. `curl -sI http://localhost:3000 | grep "200 OK"`).
   - Log line pattern (e.g. `Ready in 1.2s` or `Listening on port 3000`).
3. **Authentication & Identity:**
   - Seeded test accounts (e.g. `admin@test.local / testpass123`).
   - Mock JWT generation script or test token header (`Authorization: Bearer <token>`).
4. **Seed Data & Preconditions:**
   - Database fixtures (`prisma db seed` or `cargo run --bin seed`).
   - Clean slate isolation (in-memory SQLite, test Postgres schema, or transaction rollback).

---

## 3. Unified Status Vocabulary & Evidence Specification

### Standard Status Vocabulary
Every entry in `docs/verification/feature-map.md` MUST use exactly one of these 4 statuses:
- **`VERIFIED`**: The feature user journey was executed against the real runtime surface, all observable signals matched specifications, and fresh evidence was recorded.
- **`REGRESSED`**: A previously verified feature failed upon re-execution against recent code changes. Must link failure evidence.
- **`BLOCKED`**: Verification cannot execute due to missing host prerequisites (e.g. Docker daemon inactive, headless browser dependencies missing, credentials unset). Never fake a pass.
- **`UNVERIFIED`**: The feature journey is cataloged in the map but has not yet been executed on the live runtime surface.

### Fresh Evidence Standard
Evidence files MUST be saved to:
```
docs/verification/evidence/
├── [YYYY-MM-DD]-[feature-id]-[STATUS].log
└── [YYYY-MM-DD]-[feature-id]-screenshot.png (for Web UI)
```

**Verifiable Freshness Rule:**
Each evidence log must contain an explicit metadata header:
```text
=== Feature Verification Evidence ===
Feature ID: <FEATURE-ID>
Status: VERIFIED | REGRESSED | BLOCKED
Git Commit: <HEAD_SHA>
Timestamp: <ISO-8601>
Driver: <Playwright | PTY | cURL>
Surface URL: <URL>
```
- Evidence is considered **FRESH** if and only if `Status` is `VERIFIED` and the recorded `Git Commit` SHA exactly matches the current `git rev-parse HEAD`.
- If `HEAD` differs from the recorded `Git Commit` SHA, the evidence is deemed **STALE** and must be re-executed before `/review` or `/ship`.
- Evidence files must persist AFTER application shutdown or container teardown. Never store evidence only in volatile `/tmp` or unrecorded terminal output.

---

## 4. Feature Map Structure

Create `docs/verification/feature-map.md` using the following standardized schema:

```markdown
# Project Feature Verification Map

Last Updated: [Date]
Harness Driver: [Playwright | PTY | cURL]
Runtime URL / Surface: [e.g. http://localhost:3000]

| Feature ID | Feature Name | User Journey / Trigger | Observable Signal (Success) | Status | Evidence Path |
|---|---|---|---|---|---|
| FEAT-01 | User Login | POST /api/auth/login or Web UI Form | Cookie `auth_session` set, 302 to /dashboard | VERIFIED | docs/verification/evidence/2026-10-19-FEAT-01.log |
| FEAT-02 | Dashboard Load | GET /dashboard with valid session | Header text "Welcome Back", Stats cards render | VERIFIED | docs/verification/evidence/2026-10-19-FEAT-02.png |
```

For reference and detailed syntax, see [references/feature-map-example.md](./references/feature-map-example.md).

---

## 5. Execution Steps

1. **Step 1 — Environment Survey:**
   - Identify tech stack (`Next.js`, `NestJS`, `Rust/Axum`, `FastAPI`).
   - Find active port and database requirements.
2. **Step 2 — Driver Selection:**
   - If Web UI: Select Playwright (`npx playwright test` or headless browser script).
   - If CLI: Select terminal execution (`node bin/cli.js ...` or PTY runner).
   - If REST/GraphQL API: Select `curl` or Supertest HTTP runner.
3. **Step 3 — Write Verification Runner:**
   - Create a deterministic verification script (e.g., `scripts/verify-real-surface.mjs`).
   - Include readiness polling loop (up to 30s timeout).
   - Include graceful shutdown in a `finally` block that preserves log artifacts.
4. **Step 4 — Execute Smoke Test:**
   - Run the script against at least ONE core feature.
   - Inspect the generated artifact in `docs/verification/evidence/`.
   - If successful, record status `VERIFIED` in `feature-map.md`.
5. **Step 5 — Honesty Gate (Non-Negotiable):**
   - If the local host cannot run the runtime (e.g., missing Docker daemon, no display server for browser, missing credentials):
     - **DO NOT** fake a passing result.
     - Record status strictly as `BLOCKED` in `feature-map.md`.
     - Document the missing prerequisite (e.g. `Missing Docker daemon`, `Missing API key`) in evidence notes and in the Feature Map notes/evidence path.
     - Output the exact missing prerequisite to the user.
