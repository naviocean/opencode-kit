---
name: comment-quality
description: Audit code comments in diffs. Eliminates redundant AI code slop while strictly preserving comments documenting non-obvious invariants, security constraints, and workarounds.
---

# Comment Quality & Anti-Slop Guide

Use this skill during code review (`/review`) or before committing changes. It enforces concise, self-documenting code without stripping essential context that future engineers need to maintain the system safely.

## 1. Scoping Rule: Diff-Only Inspection

- **Inspect ONLY changed lines in the current diff.**
- **DO NOT** perform sweeping comment deletions across untouched legacy files. Large unprovoked comment purges create noisy git blame histories and risk deleting subtle domain context.

---

## 2. What to Strip (AI Code Slop)

Strip comments that merely restate what clean code already says:

```typescript
// ❌ STRIP THIS: Restating variable assignment or standard language primitives
// set status to active
user.status = 'active';

// ❌ STRIP THIS: Trivial function header descriptions
// function to get user by id
function getUserById(id: string) { ... }

// ❌ STRIP THIS: Conversational AI commentary or self-narration
// Updated logic to fix the bug reported by user
const result = calculateTotal();
```

---

## 3. What to Preserve (Essential Engineering Knowledge)

MUST preserve or require comments for non-obvious facts that cannot be expressed through types and function names alone:

1. **Business Invariants & Domain Rules:**
   ```typescript
   // Invariant: Ledger balance must remain non-negative after double-entry posting.
   ```
2. **Security Constraints & Threat Mitigations:**
   ```typescript
   // Security: Constant-time comparison prevents timing attacks on webhook secret verification.
   crypto.timingSafeEqual(calculatedHmac, receivedHmac);
   ```
3. **Platform / Library / Browser Bug Workarounds:**
   ```typescript
   // Workaround: Safari WebKit bug #23456 requires force-triggering layout redraw on iOS.
   element.offsetHeight;
   ```
4. **Algorithmic Rationale & Mathematical Proofs:**
   ```typescript
   // Exponential backoff with full jitter to avoid thundering herd on upstream rate limits.
   const delay = Math.random() * Math.min(maxBackoff, baseDelay * 2 ** attempt);
   ```

---

## 4. Review Heuristic

Ask: *"Does this comment explain **WHY** something non-obvious is done, or merely **WHAT** the syntax does?"*
- If it explains **WHY** (rationale, constraint, invariant) $\rightarrow$ **KEEP IT.**
- If it explains **WHAT** (syntax, mechanical action) $\rightarrow$ **DELETE IT.**
