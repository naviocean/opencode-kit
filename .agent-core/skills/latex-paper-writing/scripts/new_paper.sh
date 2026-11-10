#!/usr/bin/env bash
# =============================================================
# new_paper.sh — Scaffold a clean LaTeX paper workspace.
#
# Usage:
#   new_paper.sh <venue> <target-dir> [--title "Paper Title"]
#
# Venues: ieee-conference | ieee-journal | acm-sigconf | arxiv
# =============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ASSETS_DIR="$SCRIPT_DIR/../assets"
VENUES="ieee-conference ieee-journal acm-sigconf arxiv"

usage() {
    echo "Usage: $0 <venue> <target-dir> [--title \"Paper Title\"]"
    echo "Venues: $VENUES"
    exit 1
}

VENUE=""
TARGET=""
TITLE=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --title)
            [[ $# -lt 2 ]] && usage
            TITLE="$2"
            shift 2
            ;;
        -h|--help)
            usage
            ;;
        *)
            if [[ -z "$VENUE" ]]; then
                VENUE="$1"
            elif [[ -z "$TARGET" ]]; then
                TARGET="$1"
            else
                echo "Unexpected argument: $1" >&2
                usage
            fi
            shift
            ;;
    esac
done

[[ -z "$VENUE" || -z "$TARGET" ]] && usage

if ! echo "$VENUES" | grep -qw "$VENUE"; then
    echo "ERROR: unknown venue '$VENUE' (available: $VENUES)" >&2
    exit 1
fi

if [[ -e "$TARGET" ]] && [[ -n "$(ls -A "$TARGET" 2>/dev/null)" ]]; then
    echo "ERROR: target directory '$TARGET' already exists and is not empty" >&2
    exit 1
fi

mkdir -p "$TARGET/chapters" "$TARGET/figures"

cp "$ASSETS_DIR/$VENUE/main.tex" "$TARGET/"
cp "$ASSETS_DIR/$VENUE/abstract.tex" "$TARGET/chapters/"
cp "$ASSETS_DIR/chapters/"*.tex "$TARGET/chapters/"
cp "$ASSETS_DIR/references.bib" "$TARGET/"

if [[ -n "$TITLE" ]]; then
    python3 -B - "$TARGET/main.tex" "$TITLE" <<'PYEOF'
import re
import sys
from pathlib import Path

main_path = Path(sys.argv[1])
raw_title = sys.argv[2]

escapes = {
    "\\": r"\textbackslash{}",
    "&": r"\&",
    "%": r"\%",
    "$": r"\$",
    "#": r"\#",
    "_": r"\_",
    "{": r"\{",
    "}": r"\}",
}
escaped = re.sub(r"[\\&%$#_{}]", lambda m: escapes[m.group()], raw_title)
content = main_path.read_text(encoding="utf-8")
main_path.write_text(content.replace("Your Paper Title Here", escaped), encoding="utf-8")
PYEOF
fi

echo "Scaffolded '$VENUE' LaTeX project at: $TARGET"
echo "Next steps:"
echo "  1. Fill in authors and affiliations in $TARGET/main.tex"
echo "  2. Edit section files in $TARGET/chapters/"
echo "  3. Add verified entries in $TARGET/references.bib"
echo "  4. Compile baseline: bash $SCRIPT_DIR/compile.sh $TARGET"

