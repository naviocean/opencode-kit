---
name: runtime-forensics
description: Diagnose live symptoms (CPU spikes, memory leaks, event loop lag, deadlocks) from running processes using runtime instrumentation and snapshots.
---

# Runtime Forensics

Use this skill when diagnosing an actively misbehaving process: high CPU utilization, memory bloat, unhandled event-loop lag, hanging network sockets, or thread deadlocks.

## 1. Investigation Protocol for Live Processes

When an application is experiencing live performance degradation:

1. **Observe without disturbing:** Check resource consumption before attaching heavy diagnostic probes.
   - Node.js: `process.memoryUsage()`, `v8.getHeapStatistics()`, `clinic doctor`.
   - Linux / Containers: `top -H`, `pidstat -u 1`, `vmstat 1`.
   - Rust: `perf top`, `tokio-console`.
2. **Collect targeted diagnostic snapshots:**
   - **Memory Leaks:** Take at least two heap snapshots 5 minutes apart during consistent traffic. Compare retained object trees to find retaining paths.
   - **CPU Spikes:** Capture a 10–30s CPU profile (e.g. `node --cpu-prof`, `perf record`). Identify self-time hotspots versus idle waits.
   - **Event Loop Lag:** Instrument event loop delay (e.g. `perf_hooks.monitorEventLoopDelay`).
3. **Trace Root Cause:**
   - Differentiate between active compute (tight infinite loops, regex catastrophic backtracking) and I/O starvation (unbounded connection pools, unindexed database locks).

---

## 2. Reporting Findings

Distinguish strictly between **hypotheses** and **proven facts**:
- **Observed Symptom:** What was measured in the process (e.g. Heap usage climbing 50MB/hour).
- **Runtime Evidence:** The specific retaining path identified in the snapshot (e.g. `EventEmitter` listeners registered on every request without `.off()`).
- **Proposed Root-Cause Fix:** Code edit that releases the resource or removes the leak.
- **Post-Fix Verification:** Heap stabilization observed after applying fix.
