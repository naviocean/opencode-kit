---
name: trace-forensics
description: Analyze captured profiling and trace artifacts (Chrome tracing JSON, cpuprofile, heap snapshot, spindump, flamegraph) without conflating them with live executions.
---

# Trace Forensics

Use this skill when the user or CI has provided a static profiling artifact (a CPU profile, a Chrome DevTools trace, a heap snapshot file, a crash spindump, or an OpenTelemetry JSON dump).

## 1. Operating Principle: Artifact Fidelity

> [!IMPORTANT]
> Trace forensics is post-mortem analysis of an existing captured artifact.
> **DO NOT** restart the application, run random curl commands, and assume the new state matches the historical artifact.
> Confine your analysis strictly to the evidence recorded in the provided trace file.

---

## 2. Artifact Types & Inspection Methods

1. **CPU Profiles (`.cpuprofile`):**
   - Parse top nodes by `selfWeight` (time spent directly in the function).
   - Trace parent call trees to identify the caller triggering the expensive operation.
   - Look for synchronous serialization, JSON parsing of huge payloads, or nested array searches.
2. **Heap Snapshots (`.heapsnapshot`):**
   - Inspect Constructor dominator trees.
   - Look for high Shallow Size vs Retained Size.
   - Common culprits: global arrays, circular references in closures, unpruned caches.
3. **Chrome / Playwright Traces (`trace.zip`, `trace.json`):**
   - Inspect main thread activity slices.
   - Differentiate Long Tasks (> 50ms) from layout recalculations, network waterfalls, or composite rendering.
4. **macOS / Linux Crash Spindumps (`.spindump`, `pstack` core dumps):**
   - Look for threads in `D` (uninterruptible sleep) or waiting on mutex locks.

---

## 3. Reporting Structure

When reporting on a trace artifact:
1. **Source Artifact:** Exact filename, size, and capture duration.
2. **Dominant Bottleneck:** The single function or event accounting for >50% of the duration or memory retention.
3. **Evidence Excerpt:** JSON node snippet, stack trace frames, or flamegraph coordinates.
4. **Resolution Strategy:** Recommended architectural or algorithmic refactor.
