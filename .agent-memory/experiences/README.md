# Domain-Scoped Experience Library

Stores verified `(cue, lesson, evidence)` experiences per Skill Pack domain under `.agent-memory/experiences/<pack>/`.

## Contract

Every experience entry recorded via `scripts/experience-library.mjs` MUST satisfy:

- `domain`: Valid pack ID from `.agent-core/skill-packs.json` (`core`, `web-frontend`, `nestjs-backend`, `python-ai`, `rust-systems`, `devops-infra`, `mobile-native`, `swift-macos`, `document-office`).
- `taskId`: Non-empty task or ticket identifier.
- `cue`: Concrete trigger condition or failure symptom.
- `lesson`: Actionable fix or architectural invariant learned.
- `evidence`: Verifiable PStack proof (test command/pass output, commit SHA, or `docs/verification/evidence/*.log` path). Vague claims and hardcoded secrets are rejected.

## Directory Layout

```text
.agent-memory/experiences/
└── <pack>/
    ├── INDEX.md
    └── entries/
        └── <slug>/
            ├── EXPERIENCE.md
            └── patch.json (optional)
```

## CLI Usage

```bash
node scripts/experience-library.mjs record --domain=nestjs-backend --task=AUTH-01 --cue="..." --lesson="..." --evidence="npm test passed"
node scripts/experience-library.mjs query --domain=nestjs-backend
node scripts/experience-library.mjs list
node scripts/experience-library.mjs forget --domain=nestjs-backend --task=AUTH-01
```
