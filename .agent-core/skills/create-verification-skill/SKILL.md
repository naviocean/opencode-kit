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

## 3. Evidence Storage Specification

All real-surface verification runs MUST save observable evidence to:
```
docs/verification/evidence/
├── [YYYY-MM-DD]-[feature-id]-[run-status].log
└── [YYYY-MM-DD]-[feature-id]-screenshot.png (for Web UI)
```

**Rule:** Evidence files must persist AFTER application shutdown or container teardown. Never store evidence only in volatile `/tmp` or unrecorded terminal output.

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
     - Record status `BLOCKED: Runtime Environment Missing`.
     - Output the exact missing prerequisite to the user.
