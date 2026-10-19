---
name: benchmark-checklist
description: Checklist for performance benchmarking and optimization. Enforces baseline measurement, controlled environment, one variable at a time, and explain-the-number rigor.
---

# Benchmark Checklist & Performance Protocol

Use this skill when investigating slow queries, optimizing throughput, reducing latency, or claiming performance improvements. It prevents premature optimization and invalid benchmarking.

## 1. The Cardinal Rule: No Optimization Without a Baseline

> [!CAUTION]
> Never optimize code based on intuition or theoretical speedups.
> Every performance claim must be accompanied by a measured baseline and a post-fix measurement conducted under strictly identical conditions.

---

## 2. Pre-Benchmark Checklist

Before collecting numbers:

- [ ] **Production-Grade Build:** Ensure code is compiled in release/production mode (e.g. `NODE_ENV=production`, `cargo build --release`, `go build`). Never benchmark with dev servers, debuggers, or hot-reloaders attached.
- [ ] **Warmup Cycles:** Execute sufficient warmup iterations (1,000–5,000 runs) to allow JIT compilers (V8) and database query planners to stabilize.
- [ ] **Isolated Environment:** Close background CPU-heavy applications; benchmark in a stable container or dedicated VM if possible.
- [ ] **Statistical Distribution:** Report **p50, p95, and p99** percentiles, not just a simple arithmetic average that masks tail latency spikes.

---

## 3. Scientific Iteration Loop

1. **Step 1 — Baseline:** Measure current performance over $N$ runs. Record exact commands and machine specifications.
2. **Step 2 — Hypothesis & Profiling:** Use CPU profiler or heap snapshot to locate the actual hotspot.
3. **Step 3 — Single Variable Change:** Alter exactly ONE algorithm, query, or data structure. Do not combine refactoring with optimization.
4. **Step 4 — Re-Measure:** Run the exact benchmark suite with the identical input dataset.
5. **Step 5 — Explain the Number:**
   - What bounded the old speed? (e.g. N+1 queries, unindexed scan, repeated string allocations).
   - What bounds the new speed? (e.g. network RTT to Postgres).
   - Rule out that the compiler dead-code-eliminated the benchmarked function.

---

## 4. Benchmark Report Template

```markdown
### Performance Benchmark Report

- **Target Component:** `UsersService.listActiveMembers()`
- **Hardware / Environment:** Node.js v20, Linux x86_64, 4 vCPU, 8GB RAM
- **Baseline (Before):**
  - p50: 142ms | p95: 380ms | p99: 510ms
  - Bottleneck: Missing index on `members.organization_id` causing full table scan.
- **Optimized (After):**
  - p50: 8ms | p95: 14ms | p99: 22ms
  - Change: Added composite index `(organization_id, status)` in migration `20261019_idx_members`.
- **Limiting Factor:** Network round-trip between application server and Postgres instance.
```
