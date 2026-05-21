#!/bin/bash
# RTK Hook — rewrites Bash commands for token compression (60-90% savings)

set -euo pipefail

if ! command -v rtk &> /dev/null; then
  echo "Warning: rtk not found. Install: npm install -g rtk"
  exit 0
fi

COMMAND="$@"

if [[ "$COMMAND" == rtk\ * ]]; then
  exec $COMMAND
  exit 0
fi

case "$COMMAND" in
  cd\ *|export\ *|echo\ *|printf\ *|read\ *|source\ *|alias\ *)
    exec $COMMAND
    exit 0
    ;;
esac

exec rtk $COMMAND
