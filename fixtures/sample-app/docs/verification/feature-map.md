# Sample SaaS Verification Feature Map

Last Updated: 2026-10-19
Harness Driver: cURL / HTTP
Runtime URL / Surface: http://localhost:49152

| Feature ID | Feature Name | User Journey / Trigger | Observable Signal (Success) | Status | Evidence Path |
|---|---|---|---|---|---|
| `AUTH-001` | User Authentication | POST /api/login with valid admin credentials | 200 OK and JWT session token returned | VERIFIED | docs/verification/evidence/2026-10-19-AUTH-001-VERIFIED.log |
| `DASH-001` | Metric Aggregation | GET /api/dashboard with Bearer token | 200 OK and JSON metrics (activeUsers, mrr) returned | VERIFIED | docs/verification/evidence/2026-10-19-DASH-001-VERIFIED.log |
