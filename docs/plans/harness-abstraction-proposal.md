# Harness Abstraction Layer — Implementation Proposal

**Status:** Draft v1  
**Author:** AI Agent (harness analysis)  
**Date:** 2026-06-01  
**Target:** v2.0 — Multi-harness Support

---

## 1. Executive Summary

Hiện tại **OpenCode SaaS Kit** tightly coupled với OpenCode platform ở **8 điểm khác nhau** (agent definitions, hooks, subagent dispatch, skill loading, commands, model routing, project rules, MCP config). Portability score: **3/10**.

Mục tiêu: Tách business logic (SaaS development process) ra khỏi harness mechanics, tạo abstraction layer để hỗ trợ **OpenCode** (primary) + **Claude Code** + **Cursor** + **Codex** mà không nhân đôi nội dung agent.

---

## 2. Current Architecture (Tight Coupling)

```
Project Root
├── AGENTS.md                         ← OpenCode auto-inject
├── opencode.json                     ← MCP: $schema = opencode.ai
├── .opencode/
│   ├── agents/   *.md (YAML frontmatter)  ← OpenCode agent runtime
│   ├── commands/ *.md                     ← OpenCode slash commands
│   ├── hooks.json                         ← OpenCode hook system
│   ├── hooks/   *.sh                      ← Pre-exec hooks (model-router, rtk)
│   ├── agent-models.json                  ← OpenCode model routing schema
│   └── agent-registry.json               ← OpenCode skill auto-load
```

**8 harness-specific dependencies:**

| # | Dependency | OpenCode API | Portable? |
|---|-----------|-------------|-----------|
| 1 | Agent frontmatter | `name:`, `mode:`, `model:`, `tools:` in YAML | ❌ |
| 2 | hooks.json | `tool.execute.before` matchers | ❌ |
| 3 | task() dispatch | `subagent_type`, `run_in_background` | ❌ |
| 4 | skill(name="...") | Built-in MCP function | ❌ |
| 5 | Command markdown | `.opencode/commands/*.md` interpreted | ❌ |
| 6 | OMO_AGENT_MODEL | Env var protocol | ❌ |
| 7 | AGENTS.md injection | Auto-injected into every session | ⚠️ rename |
| 8 | opencode.json $schema | URL-based schema ref | ⚠️ path |

---

## 3. Target Architecture

```
Project Root
├── .harness/                           ← MỚI: harness root (gitignored? or committed)
│   └── target                          ← File chứa tên harness hiện tại
│
├── src/
│   └── opencode-saas-kit/
│       ├── core/                       ← HARNESS-AGNOSTIC (business logic)
│       │   ├── agents/                 ← Agent definitions (pure YAML, no frontmatter)
│       │   ├── commands/               ← Workflow defs (YAML, not markdown)
│       │   ├── skills/                 ← Skill library (giữ nguyên SKILL.md format)
│       │   ├── rules/                  ← Coding/Git/Testing/Security
│       │   └── standards/              ← Document templates
│       │
│       ├── adapters/                   ← MỚI: mỗi harness = 1 adapter
│       │   ├── opencode/               ← Hiện tại, tái cấu trúc
│       │   ├── claude-code/            ← MỚI
│       │   └── cursor/                 ← MỚI
│       │
│       └── cli/                        ← Init/update/verify commands
│           ├── init.mjs
│           ├── update.mjs
│           └── verify.mjs
│
├── AGENTS.md                           ← GENERATED (opencode adapter)
├── CLAUDE.md                           ← GENERATED (claude-code adapter)
├── .cursorrules                        ← GENERATED (cursor adapter)
├── opencode.json                       ← GENERATED
├── claude.json                         ← GENERATED
│
└── .opencode/                          ← GENERATED (opencode adapter)
    ├── agents/
    ├── commands/
    ├── hooks.json
    └── ...
```

### Adapter Pattern

```
core/ (portable)
  │
  ├── opencode/render.mjs
  │     →  .opencode/agents/*.md       (frontmatter: name, mode, model, tools)
  │     →  .opencode/commands/*.md     (OpenCode markdown format)
  │     →  .opencode/hooks.json        (tool.execute.before)
  │     →  AGENTS.md                   (entry point)
  │     →  opencode.json               (MCP with opencode.ai $schema)
  │
  ├── claude-code/render.mjs
  │     →  ~/.claude/agents/*.md       (Claude's TOML frontmatter?)
  │     →  CLAUDE.md                   (Claude's project rules)
  │     →  claude.json                 (MCP for Claude)
  │     →  Skill injection via system prompt (vì Claude không có skill())
  │
  └── cursor/render.mjs
        →  .cursorrules                (flatten 8 agents → 1 file)
        →  .cursor/mcp.json            (MCP for Cursor)
```

---

## 4. Core: Harness-Agnostic Definitions

### 4.1 Agent Manifest (`core/agents/*.yaml`)

```yaml
# core/agents/backend.yaml
name: backend
description: "NestJS + Prisma + PostgreSQL backend engineer"
ownership:
  - API layer (controllers, resolvers, routes, middleware)
  - Business logic (services, use cases, domain rules)
  - Database (Prisma schema, migrations, queries, transactions)
  - Authentication (JWT, guards, refresh)
  - Integration tests (Supertest)

skills:
  always:
    - nestjs-best-practices
  conditional:
    - skill: prisma-client-api
      when: "Writing Prisma queries — CRUD, filtering, pagination"
    - skill: jwt-auth
      when: "Implementing auth — Passport JWT, guards, RBAC"

gitnexus_must:
  - rule: "Run query() before new module"
    why: "Architectural drift — costs days to untangle"
  - rule: "Run context() before modifying shared module"
    why: "Cascading import errors — broken DI graph"

models:
  default:
    tier: "base"  # maps to cheapest capable model
  tasks:
    deep: "pro"   # complex multi-file work
    quick: "base" # single-file mechanical
    ultrabrain: "pro" # novel algorithms
```

### 4.2 Command Manifest (`core/commands/*.yaml`)

```yaml
# core/commands/plan.yaml
name: plan
description: "Socratic planning session → PRD + design + technical plan"
phases:
  - name: context-check
    mode: orchestrator
    description: "Check existing PRDs/designs/plans to avoid redoing work"
  - name: pm-interview
    mode: sequential
    agent: pm
    description: "5-7 Socratic questions, one at a time"
  - name: pm-spec
    mode: sequential
    agent: pm
    description: "Write PRD to docs/prds/"
  - name: designer-ux
    mode: sequential
    agent: designer
    description: "UI/UX design (skip if non-UI feature)"
  - name: tech-lead-arch
    mode: sequential
    agent: tech-lead
    description: "Architecture plan + task breakdown"

outputs:
  - path: "docs/prds/{feature}-prd.md"
    template: "prd-template.md"
  - path: "docs/designs/{feature}-design.md"
    template: "design-doc-template.md"
  - path: "docs/plans/{feature}-plan.md"
    template: "plan-template.md"

hard_gates:
  - "No code before spec approval (HARD-GATE)"
  - "No TBD/TODO in specs"
```

### 4.3 Model Policy (`core/models.yaml`)

```yaml
# core/models.yaml — maps logical tiers to actual models
# Adapter renders this to harness-specific format (agent-models.json, etc.)
tiers:
  base:
    capability: "mechanical — single file, known patterns"
    recommended: "gpt-4o-mini / claude-3-haiku / gemini-2.0-flash"
  pro:
    capability: "complex — multi-file, architecture-sensitive"
    recommended: "gpt-4o / claude-3.5-sonnet / gemini-2.0-pro"

agents:
  tech-lead:
    tiers: { default: "pro", quick: "base" }
  pm:
    tiers: { default: "pro" }
  designer:
    tiers: { default: "pro" }
  backend:
    tiers: { default: "base", deep: "pro", ultrabrain: "pro" }
  frontend:
    tiers: { default: "base", deep: "pro" }
  rustacean:
    tiers: { default: "base", deep: "pro" }
  qa:
    tiers: { default: "base" }
  security-auditor:
    tiers: { default: "base" }
```

---

## 5. Adapter Specifications

### 5.1 OpenCode Adapter (Primary)

| Core → Output | Implementation |
|--------------|---------------|
| `agents/*.yaml` → `.opencode/agents/*.md` | Render YAML frontmatter (`name`, `mode`, `model`, `tools`) + markdown body (skills table, GitNexus MUST rules, tech stack, etc.) |
| `commands/*.yaml` → `.opencode/commands/*.md` | Render phase descriptions as markdown sections + execution mode tables |
| `models.yaml` → `.opencode/agent-models.json` | Map logical tiers to actual model names |
| `skills/*` → `.opencode/skills/*` | Copy as-is (OpenCode native format) |
| Hook scripts → `.opencode/hooks/` | Copy + generate `hooks.json` |
| `opencode.json` | MCP server definitions with `$schema: https://opencode.ai/config.json` |
| `AGENTS.md` | Entry point: trigger map, file map, hard rules |

**Status:** ~80% của adapter này đã tồn tại dưới dạng code hiện tại. Cần tách core content ra khỏi harness mechanics.

### 5.2 Claude Code Adapter (New)

**Key differences from OpenCode:**

| Aspect | OpenCode | Claude Code |
|--------|----------|-------------|
| Entry point | `AGENTS.md` | `CLAUDE.md` |
| Agent definitions | `.opencode/agents/*.md` | `~/.claude/agents/*.md` or system prompt |
| Multi-agent | Native `task()` with `subagent_type` | `Task` tool but API shape differs |
| Skills | `skill(name="...")` built-in | No equivalent — inject via prompt |
| Hooks | `hooks.json` pre-tool-execute | No native hooks |
| Model routing | `OMO_AGENT_MODEL` env var | `ANTHROPIC_MODEL` or agent-specific model config |
| MCP config | `opencode.json` at project root | `claude.json` or `~/.claude/mcp.json` |

**Rendering logic (`claude-code/render.mjs`):**

```javascript
// Pseudo-code
function render(agents, commands, rules, skills, models) {
  // 1. CLAUDE.md — entry point (like AGENTS.md but Claude-compatible)
  write('CLAUDE.md', renderClaudeMd({agents, commands, rules}));

  // 2. Agent files → ~/.claude/agents/*.md
  // Claude uses its own frontmatter format
  for (const agent of agents) {
    write(`~/.claude/agents/${agent.name}.md`, renderClaudeAgent(agent));
  }

  // 3. Skill injection — vì Claude không có skill() function
  // Skill content được render inline vào agent instructions
  // Ước tính token overhead: ~5-15K tokens/agent

  // 4. MCP config → claude.json
  write('claude.json', renderClaudeMcp());

  // 5. Model routing
  write('.claude/settings.json', renderClaudeModels(models));
}
```

**Challenges:**
- **Skill loading:** Claude Code không có `skill(name="...")`. Phải inject content trực tiếp vào system prompt → token cost tăng 15-30%.
- **Commands:** Không có `.opencode/commands/*.md` tương đương. Phải dùng `Task` tool instructions.
- **Hooks:** Không có pre-exec hook system. `model-router.sh` không hoạt động — model routing phải dùng Claude's agent config.

### 5.3 Cursor Adapter (New)

**Key constraints:**
- Cursor không có multi-agent system
- Cursor chỉ có single `.cursorrules` file
- Cursor có MCP support nhưng config format khác

**Rendering logic (`cursor/render.mjs`):**

```javascript
function render(agents, commands, rules, skills, models) {
  // 1. Flatten all 8 agents + rules → single .cursorrules
  // Thứ tự ưu tiên: HARDRULES → Agent triggers → Domain instructions
  const flattened = `
# HARD RULES (NEVER VIOLATE)
${rules.hard.map(r => `- ${r}`).join('\n')}

# AGENT TRIGGER MAP
${agents.map(a => `- ${a.trigger}: ${a.description}`).join('\n')}

# ${agent.name} — Domain Instructions
${agents.map(a => renderAgentSection(a, skills)).join('\n\n')}
  `;

  write('.cursorrules', flattened);

  // 2. MCP config → .cursor/mcp.json
  write('.cursor/mcp.json', renderCursorMcp());

  // 3. Note: Skill auto-load không khả thi trên Cursor
  // → Skill content phải inlined vào .cursorrules
}
```

**Challenges:**
- **Context pollution:** Flatten 8 agents vào 1 file sẽ rất dài (ước tính 15K-25K tokens).
- **No subagent dispatch:** Tất cả công việc phải chạy single-agent tuần tự.
- **No skill loading:** Mọi skill content phải inlined → file cực kỳ lớn.

---

## 6. Render Pipeline

### Init flow

```
npx opencode-saas-kit init --harness claude-code
│
├── 1. Read core/ definitions
│     ├── agents/*.yaml       (8 agents)
│     ├── commands/*.yaml     (7 commands)
│     ├── models.yaml         (tier mapping)
│     ├── rules/*.md          (4 rules)
│     └── standards/*.md      (8 templates)
│
├── 2. Select adapter: claude-code/
│     └── adapter.yaml        (render config)
│
├── 3. Render harness artifacts
│     ├── CLAUDE.md           ← entry point
│     ├── ~/.claude/agents/   ← agent definitions
│     ├── claude.json         ← MCP config
│     └── .claude/settings    ← model config
│
├── 4. Copy shared artifacts
│     ├── core/rules/         → .opencode/rules/ (fallback)
│     ├── core/standards/     → docs/standards/
│     ├── core/skills/        → .opencode/skills/
│     └── core/memory/        → .opencode/memory/
│
└── 5. Write .harness/target = "claude-code"
```

### Verify flow

```
npx opencode-saas-kit verify
│
├── 1. Read .harness/target
│
├── 2. Load adapter for target
│
├── 3. Check all rendered files exist with correct format
│     ├── OpenCode: 92 checks (existing verify.mjs)
│     ├── Claude:   Check CLAUDE.md + claude.json + ~/.claude/agents/
│     └── Cursor:   Check .cursorrules + .cursor/mcp.json
│
└── 4. Print summary: PASS / FAIL
```

---

## 7. Migration Strategy (Phase-by-Phase)

### Phase 1: Core Extraction

**Mục tiêu:** Tách nội dung agent/command/rule ra khỏi harness format.

| Task | Files affected | Effort |
|------|---------------|--------|
| Convert 8 agent `.md` → `core/agents/*.yaml` | `.opencode/agents/*.md` → `src/core/agents/*.yaml` | 2-3 days |
| Convert 7 command `.md` → `core/commands/*.yaml` | `.opencode/commands/*.md` → `src/core/commands/*.yaml` | 1-2 days |
| Create `core/models.yaml` | Extract từ `agent-models.json` | 0.5 day |
| Create `core/rules/` | Copy từ `.opencode/rules/*` (nguyên bản) | 0.5 day |
| Create `core/standards/` | Copy từ `.opencode/standards/*` (nguyên bản) | 0.5 day |

**Rủi ro:** YAML parsing có thể miss edge cases trong markdown frontmatter.
**Testing:** So sánh output của YAML → render với file gốc (diff = 0).

### Phase 2: OpenCode Adapter (Refactor)

**Mục tiêu:** Adapter đầu tiên — output giống hệt code hiện tại.

| Task | Effort |
|------|--------|
| Viết `opencode/render-agents.mjs` — core YAML → `.opencode/agents/*.md` | 2 days |
| Viết `opencode/render-commands.mjs` — core YAML → `.opencode/commands/*.md` | 1 day |
| Viết `opencode/render-hooks.mjs` — hook scripts + hooks.json | 1 day |
| Viết `opencode/render-config.mjs` — agent-models.json + opencode.json | 0.5 day |
| Viết `opencode/render-rules.mjs` — AGENTS.md | 0.5 day |
| Cập nhật `cli.js` — `init --harness opencode` | 1 day |
| Verify: `npx opencode-saas-kit init && npx opencode-saas-kit verify` | 0.5 day |

**Kiểm tra:** Output của Phase 2 phải giống hệt codebase hiện tại (diff = 0).

### Phase 3: Claude Code Adapter

**Mục tiêu:** Hỗ trợ Claude Code như harness thứ hai.

| Task | Effort | Rủi ro |
|------|--------|--------|
| Viết `claude-code/render-agents.mjs` | 2 days | Claude agent format chưa ổn định |
| Viết `claude-code/render-rules.mjs` → CLAUDE.md | 0.5 day | Thấp |
| Viết skill injection strategy (vì Claude không có skill()) | 3 days | **CAO** — token overhead |
| Viết `claude-code/render-config.mjs` → claude.json + model config | 1 day | Medium |
| Kiểm tra E2E: Claude Code chạy `/plan` → `/build` | 2 days | **CAO** — nhiều edge case |

**Skill injection strategies cho Claude Code:**

| Strategy | Token overhead | Complexity | Recommended? |
|----------|---------------|------------|--------------|
| **A. Inline all skill content** | +20-40K tokens/agent | Thấp | ❌ File quá lớn |
| **B. Reference + load on demand** | +0 (chỉ reference) | **CAO** | ⚠️ Cần cơ chế mới |
| **C. Hybrid: always skills inline + conditional as reference** | +5-15K tokens/agent | Medium | ✅ **Recommended** |

### Phase 4: Cursor Adapter

**Mục tiêu:** Hỗ trợ Cursor.

| Task | Effort | Rủi ro |
|------|--------|--------|
| Viết `cursor/render-flatten.mjs` — 8 agents → 1 .cursorrules | 1 day | **CAO** — context pollution |
| Xử lý skill inlining | 2 days | **CAO** — file size |
| Viết `cursor/render-config.mjs` → .cursor/mcp.json | 0.5 day | Thấp |
| Kiểm tra E2E | 1 day | Medium |

**Cursor limitation:** Vì không có subagent dispatch, workflow `/plan` → `/build` → `/review` → `/ship` phải chạy single-agent. Điều này làm giảm parallelism và tăng token consumption.

### Phase 5: Verify + Docs

| Task | Effort |
|------|--------|
| Mở rộng `verify.mjs` — kiểm tra cả 3 harness | 2 days |
| Viết adapter integration tests | 2 days |
| Cập nhật README — multi-harness section | 1 day |
| Viết migration guide cho user hiện tại | 0.5 day |

---

## 8. File Tree After Migration

```
opencode-saas-kit/
├── README.md
├── AGENTS.md                              ← GENERATED (opencode)
├── CLAUDE.md                              ← GENERATED (claude-code)
├── opencode.json                          ← GENERATED
├── claude.json                            ← GENERATED
├── .cursorrules                           ← GENERATED (cursor)
├── .harness/
│   └── target                             ← "opencode" | "claude-code" | "cursor"
│
├── src/
│   └── opencode-saas-kit/
│       ├── core/                          ← HARMLESS-AGNOSTIC (hand-written)
│       │   ├── agents/
│       │   │   ├── tech-lead.yaml
│       │   │   ├── pm.yaml
│       │   │   ├── designer.yaml
│       │   │   ├── frontend.yaml
│       │   │   ├── backend.yaml
│       │   │   ├── rustacean.yaml
│       │   │   ├── qa.yaml
│       │   │   └── security-auditor.yaml
│       │   │
│       │   ├── commands/
│       │   │   ├── plan.yaml
│       │   │   ├── build.yaml
│       │   │   ├── review.yaml
│       │   │   ├── ship.yaml
│       │   │   ├── design.yaml
│       │   │   ├── security.yaml
│       │   │   └── test.yaml
│       │   │
│       │   ├── models.yaml
│       │   ├── rules/                     # copy từ .opencode/rules/
│       │   ├── skills/                    # copy từ .opencode/skills/
│       │   ├── standards/                 # copy từ .opencode/standards/
│       │   └── memory/                    # copy từ .opencode/memory/
│       │
│       ├── adapters/
│       │   ├── opencode/
│       │   │   ├── adapter.yaml           # config: hooks, entrypoint, agent-path
│       │   │   ├── render-agents.mjs
│       │   │   ├── render-commands.mjs
│       │   │   ├── render-hooks.mjs
│       │   │   ├── render-config.mjs
│       │   │   ├── render-rules.mjs
│       │   │   └── __tests__/
│       │   │       └── render.test.mjs
│       │   │
│       │   ├── claude-code/
│       │   │   ├── adapter.yaml
│       │   │   ├── render-agents.mjs
│       │   │   ├── render-commands.mjs    # Task tool instructions
│       │   │   ├── render-skills.mjs      # Skill injection strategy
│       │   │   ├── render-config.mjs
│       │   │   ├── render-rules.mjs
│       │   │   └── __tests__/
│       │   │       └── render.test.mjs
│       │   │
│       │   └── cursor/
│       │       ├── adapter.yaml
│       │       ├── render-flatten.mjs
│       │       ├── render-config.mjs
│       │       ├── render-skills.mjs
│       │       └── __tests__/
│       │
│       └── cli/
│           ├── init.mjs
│           ├── update.mjs
│           ├── verify.mjs
│           └── __tests__/
│
├── .opencode/                             ← GENERATED (opencode adapter)
├── docs/                                  ← User documents (preserved)
│   ├── prds/
│   ├── designs/
│   ├── plans/
│   └── adr/
│
└── package.json
```

---

## 9. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| OpenCode thay đổi hooks/commands API | Medium | **High** (toàn bộ adapter hỏng) | Abstract layer: chỉ sửa adapter, core không đổi |
| Claude Code thay đổi agent format | Medium | Medium | Adapter riêng, test coverage |
| Token overhead từ skill injection quá lớn | High | **High** (Claude adapter không dùng được) | Hybrid strategy (always = inline, conditional = reference) |
| Cursor không có subagent — workflow không hoạt động | **Certain** | **High** | Document limitation rõ ràng, recommend dùng OpenCode cho complex workflow |
| Migration từ v1 → v2 gây breaking change | Medium | **High** (user hiện tại) | Migration script + backward-compat mode trong 1 release |

---

## 10. Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Portability score | 3/10 | **8/10** |
| Harness supported | 1 | **3** (OpenCode + Claude Code + Cursor) |
| Core content duplication | 0% (nhưng coupled) | **0%** (core dùng chung cho mọi adapter) |
| Init time (OpenCode) | ~2s | **<3s** (tăng nhẹ do render) |
| Init time (Claude Code) | N/A | **<5s** |
| Verify checks | 92 (OpenCode only) | **200+** (3 harness × ~67 checks) |

---

## 11. Phụ lục: Adapter Interface

```typescript
// Mỗi adapter implements interface này
interface HarnessAdapter {
  name: string;
  target: string; // "opencode" | "claude-code" | "cursor"

  // Render methods
  renderAgents(agents: AgentDefinition[]): RenderResult[];
  renderCommands(commands: CommandDefinition[]): RenderResult[];
  renderRules(rules: RuleDefinition[]): RenderResult;
  renderConfig(models: ModelPolicy, mcp: McpConfig): RenderResult[];
  renderSkills(skills: SkillDefinition[]): RenderResult[];

  // Verify
  verify(): VerifyResult;
}
```

```yaml
# adapter.yaml (ví dụ cho opencode)
name: opencode
version: 1
target: opencode

paths:
  entrypoint: AGENTS.md
  agents: ".opencode/agents/"
  commands: ".opencode/commands/"
  hooks: ".opencode/hooks.json"
  config:
    - "opencode.json"
    - ".opencode/agent-models.json"
    - ".opencode/hooks.json"
    - ".opencode/agent-registry.json"

features:
  hooks: true
  skill_loading: "built-in"  # native skill() function
  subagent_dispatch: true
  model_routing: "env-var"   # OMO_AGENT_MODEL

capabilities:
  max_agents: unlimited
  parallel_execution: true
  background_tasks: true
```
