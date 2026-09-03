# PRD: Continuous Learning v2 (Instinct-Based Learning Engine)

> **Status**: Draft (Deferred / Future)  
> **Author**: PM Agent  
> **Created**: 2026-09-03  
> **Version**: 1.0.0  
> **Stakeholders**: Lead Developers, Tech Lead, AI Specialist Agents  

---

## 1. Problem Statement

**Current state**:
In `opencode-saas-kit` v1.x, developer preferences, architectural conventions, and recurring bug fixes across sessions are only retained via static files (`AGENTS.md`, `.opencode/rules/`) or manual ICM memory calls. When a developer frequently applies a specific pattern, they must repeatedly instruct the agents or write rules manually.

**Desired state**:
An automated, safe, and token-efficient Continuous Learning system inspired by [ECC (Everything Claude Code)](https://github.com/affaan-m/ECC). The system silently observes sessions via lightweight telemetry hooks, runs an asynchronous background observer using an ultra-cheap cloud model, extracts behavioral "instincts" with confidence scoring (0.3 to 0.9), isolates tentative instincts from the prompt context, and allows the developer to inspect (`/instinct-status`), clean (`/instinct-prune`), and promote (`/evolve`) validated instincts into permanent rules/skills via an interactive diff review.

---

## 2. Target Users

| User Type | Description | Priority |
|---|---|---|
| **Fullstack SaaS Developer** | Primary user interacting with agents via slash commands and coding tasks | Must Have |
| **Tech Lead / Architect** | Reviews evolved rules and maintains project conventions | Must Have |
| **Team Collaborators** | Developers sharing exported instincts across a multi-member engineering team | Should Have |

---

## 3. Key Concepts (ECC Model)

1. **Instincts**: Discrete learned units with confidence score (0.3 to 0.9).
2. **Isolation Sandbox**: Confidence < 0.7 is strictly isolated from system prompts.
3. **Targeted Injection**: Confidence >= 0.7 is injected only into the relevant specialist agent.
4. **TTL Decay & Prune**: Unreinforced instincts older than 30 days are purged via `/instinct-prune`.
5. **Interactive Promotion**: `/evolve` requires explicit human approval via diff preview (`[Y/n/edit]`).

---

## 4. Commands

- `/instinct-status`: Display current learned instincts and confidence scores.
- `/instinct-prune`: Clean expired tentative instincts.
- `/evolve`: Cluster instincts and propose promotions into Skills or Rules.
- `/instinct-export` / `/instinct-import`: Share instincts across machines or teams.
