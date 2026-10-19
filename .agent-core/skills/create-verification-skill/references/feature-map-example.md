# Reference: Feature Map Example Layout

This reference demonstrates the standardized layout for `docs/verification/feature-map.md`.

---

```markdown
# Project Feature Verification Map

> **Project:** SaaS Analytics Platform  
> **Target Environment:** Local Dev (`http://localhost:3000`, API `http://localhost:4000`)  
> **Driver Engine:** Playwright (Web) + cURL (REST API)  
> **Evidence Directory:** `docs/verification/evidence/`  
> **Last Full Run:** 2026-10-19T10:00:00Z  

## Status Summary

- Total Features: 4
- ✅ VERIFIED: 3
- ⚠️ BLOCKED: 1
- ❌ REGRESSED: 0
- ⏳ UNVERIFIED: 0


---

## Feature Inventory

| Feature ID | Feature Name | User Journey / Trigger | Observable Signal (Success) | Status | Evidence Path |
|---|---|---|---|---|---|
| AUTH-001 | Email/Password Login | Enter valid credentials in `/login`, click Submit | Cookie `access_token` set; URL redirects to `/dashboard` within 2s | VERIFIED | `docs/verification/evidence/2026-10-19-AUTH-001.png` |
| DASH-001 | Metrics Cards Display | Navigate to `/dashboard` with valid session | 4 Metric cards (`MRR`, `Churn`, `MAU`, `LTV`) render with non-zero numeric values | VERIFIED | `docs/verification/evidence/2026-10-19-DASH-001.png` |
| API-001 | Health Check Endpoint | `curl -sI http://localhost:4000/api/health` | HTTP/1.1 200 OK with JSON `{"status":"ok","uptime":...}` | VERIFIED | `docs/verification/evidence/2026-10-19-API-001.log` |
| BILL-001 | Stripe Checkout Webhook | Dispatch simulated `checkout.session.completed` event | User `plan` column in database updates to `PRO` | BLOCKED | `docs/verification/evidence/2026-10-19-BILL-001.log` (Missing Stripe CLI webhook listener) |

---

## Verification Runbook

### Prerequisites
1. Local database running: `docker compose up -d postgres redis`
2. Seed data populated: `npx prisma db seed`
3. Dev servers active: `npm run dev`

### Execution Command
```bash
# Run real surface test suite
node scripts/verify-real-surface.mjs

# Or run specific feature
node scripts/verify-real-surface.mjs --feature AUTH-001
```

### Evidence Collection Rule
Every run records logs and screenshots to `docs/verification/evidence/`. If a feature fails or cannot be verified, record exact failure logs without modifying the Feature Map contract.
```
