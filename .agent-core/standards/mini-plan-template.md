# Mini-Plan: [Task / Feature Name]

> **Scale**: Size M (Medium — Single Component, API Endpoint, or Isolated Refactor)
> **Author**: Tech Lead / PM Agent
> **Date**: YYYY-MM-DD
> **Status**: Approved

---

## 1. Objective & Scope
- **Goal**: Concise description of the addition or modification.
- **In Scope**: Specific component, endpoint, or utility to build.
- **Out of Scope**: Anything beyond this isolated deliverable.

## 2. Technical Specification & Contract
- **Interface / Schema / Signature**:
  ```typescript
  // Target contract, DTO, or component props
  ```
- **Files Affected**:
  - `path/to/target.ts` (create or modify)
  - `path/to/target.test.ts` (unit/integration test)

## 3. Execution Steps (Strict TDD)
1. **RED**: Write failing test in `path/to/target.test.ts`.
2. **GREEN**: Implement minimal business logic to pass test.
3. **REFACTOR**: Type check (no `any`), adhere to coding standards.
4. **VERIFY**: Run test suite and ensure security scan passes.
