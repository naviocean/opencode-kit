#!/bin/bash
# Model Router Hook — enforces model-per-agent dispatch protocol
# Runs on tool.execute.before for task() calls
#
# Two-layer model resolution:
#   1. Read .opencode/agent-models.json → primary model for this agent
#   2. Read _workspace/.fallback-state.json → if a runtime override is active
#      (written by model-fallback.mjs), use that instead
#   3. Export OMO_AGENT_MODEL with the effective model
#
# Why two layers:
#   agent-models.json is the SOURCE OF TRUTH (committed, audited).
#   _workspace/.fallback-state.json is the RUNTIME OVERRIDE (gitignored,
#   temporary). This separation means primary recovery is automatic:
#   model-fallback.mjs tests primary on every invocation and clears the
#   override if primary is healthy again.

set -euo pipefail

REGISTRY=".opencode/agent-models.json"
STATE_FILE="_workspace/.fallback-state.json"

# Exit silently if registry doesn't exist
if [ ! -f "$REGISTRY" ]; then
  exit 0
fi

# Get the subagent_type from the tool arguments
# task() passes: subagent_type, prompt, description
SUBAGENT_TYPE=""
for arg in "$@"; do
  case "$arg" in
    subagent_type=*) SUBAGENT_TYPE="${arg#subagent_type=}" ;;
  esac
done

# If no subagent_type, skip (might be a different tool call)
if [ -z "$SUBAGENT_TYPE" ]; then
  exit 0
fi

# Read primary model from registry
MODEL=$(node -e "
  const r = require('./$REGISTRY');
  const agent = r.agents['$SUBAGENT_TYPE'];
  if (agent && agent.model) {
    console.log(agent.model);
  } else {
    console.log('');
  }
" 2>/dev/null || echo "")

# If no model configured for this agent, skip
if [ -z "$MODEL" ]; then
  exit 0
fi

# Read fallback chain from registry
FALLBACK=$(node -e "
  const r = require('./$REGISTRY');
  const agent = r.agents['$SUBAGENT_TYPE'];
  if (agent && agent.fallback && agent.fallback.length > 0) {
    console.log(agent.fallback.join(' → '));
  } else {
    console.log('');
  }
" 2>/dev/null || echo "")

# Layer 2: read runtime override (if present + still active)
# Override is the effective model; the primary it replaced is preserved for context.
EFFECTIVE_MODEL="$MODEL"
OVERRIDE_REASON=""
if [ -f "$STATE_FILE" ]; then
  OVERRIDE_INFO=$(node -e "
    try {
      const s = JSON.parse(require('fs').readFileSync('$STATE_FILE', 'utf-8'));
      const o = s.overrides?.['$SUBAGENT_TYPE'];
      if (o && o.effective) {
        console.log(o.effective + '|' + (o.reason || ''));
      }
    } catch {}
  " 2>/dev/null || echo "")
  if [ -n "$OVERRIDE_INFO" ]; then
    OVERRIDE_MODEL="${OVERRIDE_INFO%%|*}"
    OVERRIDE_REASON="${OVERRIDE_INFO#*|}"
    EFFECTIVE_MODEL="$OVERRIDE_MODEL"
  fi
fi

# Output model context as environment variable for the agent
# This gets injected into the agent's context
export OMO_AGENT_MODEL="$EFFECTIVE_MODEL"
export OMO_AGENT_FALLBACK="$FALLBACK"
export OMO_AGENT_NAME="$SUBAGENT_TYPE"

# Log the dispatch (with override marker if active)
if [ -n "$OVERRIDE_REASON" ]; then
  echo "[model-router] Dispatching $SUBAGENT_TYPE → model: $EFFECTIVE_MODEL (OVERRIDE: $MODEL → $EFFECTIVE_MODEL, reason: $OVERRIDE_REASON, fallback: $FALLBACK)" >&2
else
  echo "[model-router] Dispatching $SUBAGENT_TYPE → model: $EFFECTIVE_MODEL (fallback: $FALLBACK)" >&2
fi

exit 0
