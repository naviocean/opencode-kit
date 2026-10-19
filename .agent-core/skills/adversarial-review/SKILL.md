---
name: adversarial-review
description: Adversarial code review targeting high-risk diffs. Actively probes for race conditions, memory leaks, state desynchronization, unhandled edge cases, and boundary vulnerabilities.
---

# Adversarial Review

Adversarial review is an aggressive, quality-hardening review pass designed to break code before it reaches production. Unlike standard code reviews that verify formatting and basic conventions, an adversarial reviewer operates with a hostile mindset, actively searching for subtle failure modes that typical tests miss.

## 1. Triggers (When to Activate)

Do NOT run adversarial review on routine Size S/M tweaks. Activate ONLY when:
- `gitnexus_impact` indicates **HIGH** or **CRITICAL** blast radius.
- Diff touches security-critical boundaries (authentication, authorization, token rotation, cryptography).
- Diff touches financial transactions, payments, or billing flows.
- Diff introduces multi-actor concurrency (Tokio tasks, worker queues, WebSocket synchronizers, database locks).
- Diff touches cross-module shared state or core database migrations.

---

## 2. Review Methodology (The Adversarial Mindset)

The adversarial reviewer is an independent subagent dispatched with **read-only** permissions on the diff. It assumes the code is broken until proven resilient.

### Probing Vectors:
1. **Race Conditions & Concurrency:**
   - What happens if two requests arrive with the exact same ID within 5ms?
   - Is there a check-then-act race (TOCTOU)?
   - Can an in-flight operation be interrupted by a process restart or network timeout?
2. **State Desynchronization & Leaks:**
   - Does a failed intermediate step leave orphaned records in the database?
   - Are in-memory caches invalidated when a write fails halfway?
   - Does any connection, file descriptor, or listener fail to close in error paths?
3. **Boundary & Injection Exploits:**
   - Can unexpected unicode, oversized payloads, or negative numbers bypass validation?
   - Are raw database IDs or internal exceptions exposed across the public API?
4. **Symptom Masking & Swallowed Errors:**
   - Did the author use a blanket `try/catch` or null-coalescing operator (`?? null`) to conceal an unhandled state?
   - Does the error handler log the failure, or does it silently fail?

---

## 3. Findings Classification

Every finding MUST link to a specific code path (`file:line`) and describe an exact reproduction sequence.

| Severity | Definition | Action Required |
|---|---|---|
| **MUST-FIX** | Reproducible crash, race condition, data corruption, or security flaw. | Merging is **BLOCKED**. Author must fix with regression test. |
| **CONSIDER** | Latent fragility, missing timeout, or scalability bottleneck under high load. | Tech Lead reviews; may defer with a tracked issue. |
| **REJECT** | Stylistic preference, hypothetical refactor, or out-of-scope nit. | Discarded by Tech Lead with technical rationale. |

---

## 4. Transparency & Honesty Rule (Non-Negotiable)

> [!IMPORTANT]
> If the current environment or AI harness does not support independent subagent dispatch:
> - **DO NOT** claim that the adversarial review gate passed.
> - Report explicitly: `LIMITATION: Independent adversarial review unavailable in current harness`.
> - Tech Lead notes this as an unverified risk in the review summary.
