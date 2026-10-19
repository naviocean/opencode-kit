---
name: maintain-verification-skill
description: Audit and update an existing Feature Map against code changes, re-verify touched user flows on real runtime surfaces, detect regressions, and maintain verification evidence integrity.
---

# Maintain Verification Skill

Use this skill when modifying, refactoring, or extending code in a repository that already has a Feature Map (`docs/verification/feature-map.md`). This skill ensures that user journeys remain intact and prevents regression masking.

## 1. Core Responsibilities

1. **Audit Affected Features:** Determine which features in `docs/verification/feature-map.md` are touched by recent commits or PR diffs.
2. **Re-Execute Real-Surface Verification:** Run the verification runner against touched features.
3. **Capture Fresh Evidence:** Refresh logs/screenshots in `docs/verification/evidence/`.
4. **Detect & Report Regressions:** If a previously verified feature fails, file a regression report immediately.
5. **Legitimate Contract Evolution:** Update feature definitions ONLY when an intentional product change is specified in an approved PRD or design doc.

---

## 2. The Cardinal Rule: No Regression Masking

> [!CAUTION]
> **NEVER ALTER THE FEATURE MAP TO LEGITIMIZE A BREAKAGE.**
> 
> If a feature previously marked `VERIFIED` fails on the real surface:
> - **DO NOT** delete the feature from the map.
> - **DO NOT** loosen the assertion (e.g. changing "redirects to /dashboard" to "displays error page").
> - **DO NOT** mark it as "DEPRECATED" without explicit PM approval.
> 
> **Correct Action:** Mark the feature status as `REGRESSED` in the Feature Map, link the failure evidence log (`docs/verification/evidence/[YYYY-MM-DD]-[FEATURE-ID]-REGRESSED.log`), and block the build/ship gate.

---

## 3. Maintenance Protocol

### Step 1 — Impact Analysis
1. Inspect touched files using `gitnexus_detect_changes()` or `git diff --name-only main...HEAD`.
2. Map modified modules (e.g., `apps/api/src/auth/` or `apps/web/src/components/Dashboard.tsx`) to relevant Feature IDs in `docs/verification/feature-map.md`.
3. Check evidence freshness: if an existing feature has evidence recorded at an older `Git Commit`, it is considered STALE and must be re-verified.

### Step 2 — Re-run Real Surface Tests
Execute the verification driver for affected feature IDs:
```bash
node scripts/verify-real-surface.mjs --feature <FEATURE-ID>
```

### Step 3 — Evaluate Outcome
- **Case A: Pass.**
  - Save fresh evidence with current HEAD SHA to `docs/verification/evidence/[YYYY-MM-DD]-[FEATURE-ID]-VERIFIED.log`.
  - Update `Status: VERIFIED` and timestamp in `feature-map.md`.
- **Case B: Failure (Regression).**
  - Save failure log to `docs/verification/evidence/[YYYY-MM-DD]-[FEATURE-ID]-REGRESSED.log`.
  - Update `Status: REGRESSED` in `feature-map.md`.
  - Preserve the original `User Journey` and `Observable Signal` (never mask the breakage).
  - Halt workflow and escalate bug details to Tech Lead and the responsible domain agent.
- **Case C: Legitimate Feature Evolution (Intentional Spec Change).**
  - If a new PR intentionally changes a UX flow (e.g. changing 2-step checkout to 1-click):
    - Verify against approved PRD/Plan.
    - Update `User Journey` and `Observable Signal` to match new specification.
    - Run verification to produce new baseline evidence.
- **Case D: New Feature Added.**
  - Append new feature rows with unique sequential IDs (`FEAT-XXX`).
  - Initially mark as `UNVERIFIED`.
  - Run verification on real surface; transition to `VERIFIED` only after real evidence is recorded.

---

## 4. Quality Checklist Before Merging

- [ ] All touched features have been re-verified on the real runtime surface.
- [ ] No existing feature tests were deleted or weakened to make CI pass.
- [ ] Fresh evidence files are committed or stored in `docs/verification/evidence/`.
- [ ] `docs/verification/feature-map.md` status table accurately reflects current reality.
- [ ] Any blocked features carry documented explanations for missing environment prerequisites.
