# Mini-Plan: GitNexus Code Intelligence Alignment

> **Scale**: Size M (Isolated Refactor & Alignment)  
> **Author**: Tech Lead / Pair Programming Agent  
> **Date**: 2026-10-02  
> **Status**: Approved  

---

## 1. Objective & Scope
- **Goal**: Fix GitNexus code intelligence calls across all 11 specialized agents, slash commands (`/review`, `/hotfix`, `/ship`), and skills to ensure real-world reliability across all harnesses.
- **In Scope**:
  1. Fix parameter mismatch: Change `query` parameter to `search_query` for `gitnexus_query`.
  2. Enforce `repo` parameter: Require agents to supply `repo: "<repo-name>"` (project directory name / registered alias) in all GitNexus MCP calls to avoid the fatal "Multiple repositories indexed" crash.
  3. Document harness naming convention (`gitnexus_<tool>`, `mcp__gitnexus__<tool>`, `call_mcp_tool`).
  4. Synchronize `.agent-core/` changes across harnesses (`.agents/`, `.claude/`, `.opencode/`) via `scripts/sync-kit.mjs`.
  5. Add regression test suite to verify all agent definitions and commands use valid GitNexus parameters.
- **Out of Scope**:
  - Modifying external GitNexus package binaries or DuckDB extensions.

## 2. Technical Specification & Contract
- **Tool Parameter Contracts**:
  - `gitnexus_query({ search_query: string, repo: string })`
  - `gitnexus_context({ name: string, repo: string })`
  - `gitnexus_impact({ target: string, direction: "upstream" | "downstream", repo: string, includeTests?: boolean })`
  - `gitnexus_detect_changes({ repo: string, scope?: "unstaged" | "staged" | "all" | "compare" })`
  - `gitnexus_rename({ symbol_name: string, new_name: string, repo: string, dry_run?: boolean })`

- **Files Affected**:
  - `scripts/__tests__/gitnexus-contract.test.mjs` (NEW: regression test)
  - `.agent-core/agents/*.md` (all 11 agents)
  - `.agent-core/commands/*.md` (`review.md`, `hotfix.md`, `ship.md`)
  - `.agent-core/skills/gitnexus*/*.md`
  - `scripts/verify.mjs` (optional verification check)

## 3. Execution Steps (Strict TDD)
1. **RED**: Create test suite `scripts/__tests__/gitnexus-contract.test.mjs` asserting that no agent or command uses `{query: ...}` without `search_query`, and that instructions mandate `repo` parameter. Verify tests FAIL.
2. **GREEN**: Update `.agent-core/agents/*.md`, `.agent-core/commands/*.md`, and `.agent-core/skills/` with the aligned GitNexus contract.
3. **REFACTOR / SYNC**: Run `node scripts/sync-kit.mjs` to propagate `.agent-core` changes to `.agents/`, `.claude/`, `.opencode/`.
4. **VERIFY**: Run `npm test` and `node scripts/verify.mjs`. Ensure all checks pass.
