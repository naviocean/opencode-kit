---
name: continuous-learning
description: Auto-extract patterns from sessions with confidence scoring — instincts evolve into reusable skills over time
---

# continuous-learning

## Description

Auto-extract reusable patterns from successful sessions. Store as "instincts" with confidence scoring for future reuse. Inspired by ECC's instinct-based learning system. Enables agents to get smarter over time without manual skill authoring.

## When to Trigger

- End of a successful task/session
- After a complex problem is solved
- When a pattern is used successfully 3+ times
- When a new approach outperforms existing methods
- Periodically during session review
- User says "learn from this", "extract pattern", "save instinct", "what did we learn"

## Instructions

### Instinct Structure

```json
{
  "id": "inst_20240115_001",
  "name": "api-error-handling-pattern",
  "description": "Use try/catch with specific error types and structured logging for API routes",
  "category": "error-handling",
  "pattern": {
    "trigger": "When writing API route error handling",
    "solution": "Catch specific errors, log structured data, return typed error responses",
    "code": "try { ... } catch (error) { if (error instanceof SpecificError) { ... } }"
  },
  "confidence": 0.85,
  "usageCount": 5,
  "successCount": 5,
  "lastUsed": "2024-01-15T10:30:00Z",
  "source": "session_ses_abc123",
  "tags": ["api", "error-handling", "typescript"]
}
```

### Confidence Scoring

```
Confidence = successCount / usageCount

Thresholds:
- 0.0 - 0.3: Low confidence (candidate pattern, needs validation)
- 0.3 - 0.7: Medium confidence (promising, use with caution)
- 0.7 - 1.0: High confidence (reliable, reusable skill candidate)

Promotion rules:
- After 10 successful uses: Consider promoting to full SKILL.md
- After 20 successful uses: Auto-promote to SKILL.md with review
- Below 0.3 after 5 uses: Archive as anti-pattern or remove
```

### Extraction Workflow

```
1. SESSION ENDS
   ↓
2. Review session for patterns:
   - Problems solved in novel ways
   - Repeated code structures
   - Successful debugging approaches
   - Effective prompt patterns
   - Useful tool combinations
   ↓
3. Evaluate pattern:
   - Is this reusable? (not one-off)
   - Is this already in skills? (no duplication)
   - Does this contain secrets? (reject if yes)
   ↓
4. Create instinct:
   - Generate unique ID
   - Write clear description
   - Extract trigger/solution/code
   - Set initial confidence: 0.5
   - Tag appropriately
   ↓
5. Store in .opencode/memory/instincts.json
```

### Storage Format

```json
// .opencode/memory/instincts.json
{
  "version": "1.0",
  "instincts": [
    {
      "id": "inst_20240115_001",
      "name": "...",
      "description": "...",
      "category": "...",
      "pattern": { "trigger": "...", "solution": "...", "code": "..." },
      "confidence": 0.85,
      "usageCount": 5,
      "successCount": 5,
      "lastUsed": "2024-01-15T10:30:00Z",
      "source": "session_ses_abc123",
      "tags": ["api", "error-handling"]
    }
  ],
  "metadata": {
    "lastUpdated": "2024-01-15T10:30:00Z",
    "totalInstincts": 42,
    "averageConfidence": 0.72
  }
}
```

### Categories

```
- error-handling    — Error patterns and recovery
- performance       — Optimization techniques
- security          — Security patterns
- testing           — Testing approaches
- architecture      — Code structure patterns
- debugging         — Debugging strategies
- api-design        — API patterns
- ui-patterns       — UI/UX patterns
- tool-usage        — Effective tool combinations
- prompt-patterns   — Effective prompt structures
```

### Team Sharing

```bash
# Export instincts for team
cp .opencode/memory/instincts.json ./shared-instincts.json

# Import from team
cat shared-instincts.json >> .opencode/memory/instincts.json
# Deduplicate by ID

# Merge strategy:
# - Same ID, higher confidence: keep higher
# - Same ID, same confidence: keep newer
# - Different IDs: keep both
```

### Promotion to Skill

When an instinct reaches high confidence (0.8+) with 10+ uses:

```markdown
# 1. Create SKILL.md from instinct
mkdir -p .opencode/skills/{instinct-name}

# 2. Write SKILL.md with:
#    - name, description, when to trigger
#    - Full instructions (expanded from instinct)
#    - Examples from source sessions
#    - Anti-patterns

# 3. Archive the instinct
# Mark as "promoted" in instincts.json
# Keep for reference but no longer active
```

## Examples

### Example 1: Extracting After Success

```
Session: Fixed a complex hydration mismatch in Next.js

Pattern extracted:
- Name: nextjs-hydration-mismatch-fix
- Trigger: When encountering React hydration errors
- Solution: Check for browser-only APIs in component body, 
  wrap in useEffect or dynamic import with ssr: false
- Confidence: 0.5 (initial)
- Tags: ["nextjs", "react", "hydration"]
```

### Example 2: Pattern Reuse Increases Confidence

```
Instinct: api-validation-with-zod
- Used 1: Success → confidence 0.5 → 0.75
- Used 2: Success → confidence 0.75 → 0.83
- Used 3: Success → confidence 0.83 → 0.875
- Used 4: Failure → confidence 0.875 → 0.7
- Used 5: Success → confidence 0.7 → 0.75

Pattern survived failure. Still usable but noted edge case.
```

### Example 3: Anti-Pattern Capture

```
Session: Tried to use server component for interactive form

Anti-pattern extracted:
- Name: server-component-interactive-form
- Trigger: Using React Server Component for forms with client state
- Problem: Forms need useState/event handlers, RSC can't have these
- Solution: Use 'use client' directive or extract interactive parts
- Confidence: 0.9 (learned from failure)
- Tags: ["nextjs", "react", "server-components"]
```

## Anti-Patterns

- **Don't store one-off decisions.** "Used blue for this button" is not a pattern. "Always use design tokens for colors" is.
- **Don't duplicate existing skills.** Before creating an instinct, check if a SKILL.md already covers it.
- **Don't store secrets.** API keys, tokens, passwords, or any sensitive data must never appear in instincts.
- **Don't store without evaluation.** Every extracted pattern needs the trigger/solution/confidence assessment.
- **Don't ignore low-confidence instincts.** Review them. They might be anti-patterns worth documenting.
- **Don't create instincts from failed sessions.** Extract anti-patterns from failures, but not solutions.
- **Don't store session-specific context.** "The user wanted a dashboard" is context. "Dashboards need metric cards, charts, and activity feeds" is a pattern.
- **Don't skip the deduplication check.** Check existing instincts and skills before storing.
- **Don't store without tags.** Tags enable discovery. Untagged instincts are lost instincts.
- **Don't auto-promote without review.** High-confidence instincts need human review before becoming SKILL.md files.
