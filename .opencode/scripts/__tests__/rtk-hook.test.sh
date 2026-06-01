#!/bin/bash
# Tests for rtk-hook.sh
#
# Run: bash .opencode/scripts/__tests__/rtk-hook.test.sh
#
# Why bash, not node:test:
#   rtk-hook.sh is invoked by opencode's Bash tool hook with raw CLI args
#   from the agent. We need to test the actual script execution context
#   (PATH, exec, shell quoting) — a node test would have to spawn the
#   script anyway, and bash assertions on stdout/stderr are clearer.
#
# Test strategy:
#   The hook is a shell wrapper that calls `exec rtk $COMMAND` (or bypasses
#   rtk for whitelisted commands). We can't actually invoke rtk in the
#   test (it would be slow and dependent on global install), so we
#   temporarily shadow `rtk` with a stub in PATH that prints the args
#   it was called with. This lets us assert what rtk WOULD have been
#   called with, without depending on rtk being installed.
#
# For the bypass test, we cannot use shell builtins (cd, echo, etc.) via
# exec, because `exec cd /tmp` would actually change our shell's CWD.
# We shadow the bypassed commands with stubs in PATH, but for `echo`
# specifically the shell prefers the builtin. So we test echo via a
# subprocess that exits immediately, and assert the bypass path is taken
# (the stub prints BYPASSED: marker).

set -uo pipefail

ROOT="${ROOT:-$(cd "$(dirname "$0")/../../.." && pwd)}"
HOOK="$ROOT/.opencode/hooks/rtk-hook.sh"

if [ ! -f "$HOOK" ]; then
  echo "FAIL: hook not found at $HOOK"
  exit 1
fi

PASS=0
FAIL=0
FAILED_TESTS=()

assert_eq() {
  local name="$1"
  local expected="$2"
  local actual="$3"
  if [ "$expected" = "$actual" ]; then
    PASS=$((PASS+1))
    echo "  ok  $name"
  else
    FAIL=$((FAIL+1))
    FAILED_TESTS+=("$name")
    echo "  FAIL $name"
    echo "       expected: $expected"
    echo "       actual:   $actual"
  fi
}

assert_contains() {
  local name="$1"
  local needle="$2"
  local haystack="$3"
  if [[ "$haystack" == *"$needle"* ]]; then
    PASS=$((PASS+1))
    echo "  ok  $name"
  else
    FAIL=$((FAIL+1))
    FAILED_TESTS+=("$name")
    echo "  FAIL $name"
    echo "       expected to contain: $needle"
    echo "       actual:              $haystack"
  fi
}

setup_stubs() {
  local stub_dir
  stub_dir=$(mktemp -d)
  STUB_DIR="$stub_dir"

  # rtk stub: print args
  cat > "$stub_dir/rtk" <<'STUB'
#!/bin/bash
echo "[stub-rtk] called with: $*"
STUB
  chmod +x "$stub_dir/rtk"

  # Bypass stubs: print BYPASSED:<args>
  for cmd in cd export printf read source alias; do
    cat > "$stub_dir/$cmd" <<STUB2
#!/bin/bash
echo "BYPASSED:\$*"
exit 0
STUB2
    chmod +x "$stub_dir/$cmd"
  done

  export PATH="$stub_dir:$PATH"
}

teardown_stubs() {
  if [ -n "${STUB_DIR:-}" ] && [ -d "$STUB_DIR" ]; then
    rm -rf "$STUB_DIR"
  fi
  unset STUB_DIR
}

run_hook() {
  local cmd="$1"
  bash "$HOOK" $cmd 2>&1
}

# ──────────────────────────────────────────────
# Tests
# ──────────────────────────────────────────────

echo
echo "rtk-hook.sh — bypass whitelist"
echo "──────────────────────────────"

setup_stubs

# Bypass stubs ARE used for: cd, export, printf, read, source, alias
# (these don't conflict with shell builtins when exec'd via PATH lookup)
# echo is a shell builtin and CANNOT be overridden by a PATH stub, so we
# skip it here. The hook source itself is the authority for which
# commands are whitelisted.

result=$(run_hook "cd /tmp")
assert_contains "cd is bypassed (not wrapped with rtk)" "BYPASSED:/tmp" "$result"

result=$(run_hook "export FOO=bar")
assert_contains "export is bypassed" "BYPASSED:FOO=bar" "$result"

result=$(run_hook "printf '%s\\n' test")
assert_contains "printf is bypassed" "BYPASSED:" "$result"

result=$(run_hook "read -p 'name: ' var")
assert_contains "read is bypassed" "BYPASSED:" "$result"

result=$(run_hook "source ~/.bashrc")
assert_contains "source is bypassed" "BYPASSED:" "$result"

result=$(run_hook "alias ll='ls -la'")
assert_contains "alias is bypassed" "BYPASSED:" "$result"

# Structural check: bypass case statement includes all 7 whitelisted commands
# The source uses literal "cd\ *|export\ *|...|alias\ *)" (each cmd followed
# by \space* + either | or ) — the last alternative ends with `*)`).
HOOK_HAS_ALL_WHITELIST=true
i=0
for cmd in cd export echo printf read source alias; do
  i=$((i+1))
  if [ "$i" -lt 7 ]; then
    # Non-last alternatives end with `|`
    if ! grep -qF "${cmd}\\ *|" "$HOOK"; then
      HOOK_HAS_ALL_WHITELIST=false
      break
    fi
  else
    # Last alternative ends with `*)` (case statement terminator)
    if ! grep -qF "${cmd}\\ *)" "$HOOK"; then
      HOOK_HAS_ALL_WHITELIST=false
      break
    fi
  fi
done
if [ "$HOOK_HAS_ALL_WHITELIST" = "true" ]; then
  PASS=$((PASS+1))
  echo "  ok  bypass case statement includes all 7 whitelisted commands"
else
  FAIL=$((FAIL+1))
  FAILED_TESTS+=("bypass case statement structure")
  echo "  FAIL bypass case statement must include cd, export, echo, printf, read, source, alias"
fi

echo
echo "rtk-hook.sh — non-whitelisted commands get rtk"
echo "──────────────────────────────────────────────"

result=$(run_hook "ls -la /tmp")
assert_contains "ls is wrapped with rtk" "[stub-rtk] called with: ls -la /tmp" "$result"

result=$(run_hook "git status")
assert_contains "git status is wrapped with rtk" "[stub-rtk] called with: git status" "$result"

result=$(run_hook "docker ps -a")
assert_contains "docker is wrapped with rtk" "[stub-rtk] called with: docker ps -a" "$result"

result=$(run_hook "npm install")
assert_contains "npm is wrapped with rtk" "[stub-rtk] called with: npm install" "$result"

# Commands that LOOK like builtins but aren't (e.g., /bin/echo) should still wrap
result=$(run_hook "/bin/echo hi")
assert_contains "/bin/echo (non-builtin echo) is wrapped with rtk" "[stub-rtk] called with: /bin/echo hi" "$result"

echo
echo "rtk-hook.sh — idempotency (no double-wrap)"
echo "──────────────────────────────────────────"

# Structural check: the hook must check for `rtk ` prefix to avoid
# `exec rtk rtk <args>` when the agent already prepended rtk.
# The source has:   if [[ "$COMMAND" == rtk\ * ]]; then
# In a single-quoted bash string, that's literally `rtk\ *`.
if grep -qF 'rtk\ *' "$HOOK"; then
  PASS=$((PASS+1))
  echo "  ok  hook has 'rtk ' prefix check (idempotency guard)"
else
  FAIL=$((FAIL+1))
  FAILED_TESTS+=("idempotency guard")
  echo "  FAIL hook must check for 'rtk ' prefix to prevent double-wrap"
fi

# Behavioral test: when command already starts with 'rtk ', the hook
# should exec it directly. Our stub's argv[0] is its own path; the args
# after `rtk ` are passed to exec. So `rtk ls -la` → exec finds rtk
# stub → stub prints "[stub-rtk] called with: ls -la". No double-wrap
# means the stub sees the ORIGINAL args, not "rtk ls -la".
#
# The hook does: exec $COMMAND where $COMMAND was the full string "rtk ls -la".
# The shell parses "rtk ls -la" as command=rtk, args=(ls -la).
# So our stub is called with argv[1]=ls argv[2]=-la. Good.

result=$(run_hook "rtk ls -la /tmp")
assert_contains "rtk-prefixed command is not double-wrapped" "[stub-rtk] called with: ls -la /tmp" "$result"

# Make sure it's NOT seeing "rtk" as its first arg
if [[ "$result" == *"[stub-rtk] called with: rtk ls -la /tmp"* ]]; then
  FAIL=$((FAIL+1))
  FAILED_TESTS+=("no double-wrap behavioral")
  echo "  FAIL rtk was double-wrapped (saw 'rtk' as first arg to stub)"
else
  PASS=$((PASS+1))
  echo "  ok  rtk-prefixed command does not double-wrap (behavioral)"
fi

echo
echo "rtk-hook.sh — rtk-missing fallback"
echo "──────────────────────────────────"

teardown_stubs
# Force PATH to NOT contain rtk
export PATH="/usr/bin:/bin"

# When rtk is missing, hook should print a warning to stdout and exit 0
# (the warning goes to stdout in the current source — see note below)
result=$(run_hook "ls -la")
assert_contains "warns about missing rtk" "rtk not found" "$result"

# Exit code should be 0 (pass-through, not failure)
set +e
bash "$HOOK" "ls -la" >/dev/null 2>&1
EXIT_CODE=$?
set -e
assert_eq "exits 0 when rtk is missing" "0" "$EXIT_CODE"

# ──────────────────────────────────────────────
# Summary
# ──────────────────────────────────────────────

teardown_stubs

echo
echo "──────────────────────────────────────"
echo "Results: $PASS passed, $FAIL failed"

if [ "$FAIL" -gt 0 ]; then
  echo
  echo "Failed tests:"
  for t in "${FAILED_TESTS[@]}"; do
    echo "  - $t"
  done
  exit 1
fi

echo
echo "All rtk-hook tests passed."
exit 0
