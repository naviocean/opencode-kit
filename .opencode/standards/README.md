# Document Standards

Standard templates for all project documentation. Every agent MUST follow these templates when creating documents.

## Template Index

| Template | Used By | When |
|---|---|---|
| [PRD (Product Requirements Document)](./prd-template.md) | PM | `/plan` — After Socratic interview |
| [Technical Design Document](./design-doc-template.md) | Tech Lead, Designer | `/plan` — After PRD approved |
| [Implementation Plan](./plan-template.md) | Tech Lead | `/plan` — After design approved |
| [Task Breakdown](./task-template.md) | Tech Lead | `/build` — Before dispatching work |
| [Architecture Decision Record](./adr-template.md) | Tech Lead | Any architectural decision |
| [Security Review Report](./security-review-template.md) | Security Auditor | `/review`, `/ship` |

## Document Lifecycle

```
User Request
     │
     ▼
┌─────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────┐
│   PRD   │ ──→ │ Design Doc   │ ──→ │ Impl. Plan   │ ──→ │  Tasks   │
│  (PM)   │     │ (Tech Lead + │     │  (Tech Lead) │     │(TL → Dev)│
│         │     │  Designer)   │     │              │     │          │
└─────────┘     └──────────────┘     └──────────────┘     └──────────┘
     │                │                     │                   │
     ▼                ▼                     ▼                   ▼
  Approved?        Approved?            Approved?           Execute
  (User)           (User + TL)          (TL)              (Frontend +
                                                           Backend)
```

## Naming Convention

```
docs/
├── prds/
│   ├── 001-user-authentication.md
│   └── 002-billing-system.md
├── designs/
│   ├── 001-auth-flow.md
│   └── 002-billing-architecture.md
├── plans/
│   ├── 001-auth-implementation.md
│   └── 002-billing-implementation.md
├── adr/
│   ├── 001-use-jwt-not-sessions.md
│   └── 002-prisma-not-drizzle.md
└── tasks/
    ├── 001-auth/
    │   ├── T-001-setup-jwt-module.md
    │   ├── T-002-implement-login.md
    │   └── T-003-implement-refresh.md
    └── 002-billing/
        ├── T-001-stripe-integration.md
        └── T-002-subscription-model.md
```

## Rules

1. **Every feature** starts with a PRD (even small ones — just shorter)
2. **Every PRD** leads to a Design Doc (unless trivial)
3. **Every Design Doc** leads to an Implementation Plan
4. **Every Plan** breaks into Tasks
5. **Architectural decisions** get ADRs (permanent record)
6. **Security-sensitive changes** get Security Review Reports

## Version Control

All documents are version-controlled in Git. Changes to approved documents require:
- Change reason documented
- Approval from document owner
- Version bump in document header
