# Implementation Plan: Continuous Learning v2 (ECC-Based Instinct Engine)

> **Status**: Draft (Deferred / Future)  
> **Author**: Tech Lead Agent  
> **Created**: 2026-09-03  
> **Version**: 1.0.0  
> **PRD**: [Continuous Learning v2 PRD](../prds/continuous-learning-v2-prd.md)  

---

## 1. Summary

Reference implementation plan for Continuous Learning v2 based on ECC architecture. Retained for future implementation when prioritized.

### Core Architecture
- Telemetry logging via lightweight PreToolUse/PostToolUse hooks.
- Background Observer agent running ultra-cheap cloud model.
- 2-tier storage: `.opencode/instincts/` (project) and `~/.opencode/instincts/` (dev profile).
- Confidence gating: 0.3 (Tentative Sandbox), 0.7 (Targeted Injection), 0.9 (Promotion candidate).
- Commands: `/instinct-status`, `/instinct-prune`, `/evolve` with interactive diff preview.
