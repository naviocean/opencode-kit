#!/usr/bin/env bash
# =============================================================
# compile.sh — Compile a LaTeX project with concise error output.
#
# Usage:
#   compile.sh [dir] [quick|full]
#
# Env overrides:
#   MAIN=main.tex
#   ENGINE=pdflatex   (pdflatex | xelatex | lualatex)
#   BIBTOOL=bibtex    (bibtex | biber)
# =============================================================
set -uo pipefail

DIR="."
MODE="quick"

for arg in "$@"; do
    case "$arg" in
        quick|full) MODE="$arg" ;;
        -h|--help)
            sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'
            exit 0
            ;;
        *) DIR="$arg" ;;
    esac
done

if [[ ! -d "$DIR" ]]; then
    echo "ERROR: directory not found: $DIR" >&2
    exit 1
fi

cd "$DIR" || { echo "ERROR: cannot enter directory: $DIR" >&2; exit 1; }

MAIN="${MAIN:-main.tex}"
ENGINE="${ENGINE:-pdflatex}"
BIBTOOL="${BIBTOOL:-bibtex}"

if [[ ! -f "$MAIN" ]]; then
    echo "ERROR: $MAIN not found in $DIR (set MAIN=<file> to override)" >&2
    exit 1
fi

if ! command -v "$ENGINE" >/dev/null 2>&1; then
    echo "ERROR: TeX engine '$ENGINE' not found on PATH. Run check_latex_env.sh first." >&2
    exit 1
fi

JOB="${MAIN%.tex}"

run_tex_pass() {
    "$ENGINE" -interaction=nonstopmode -file-line-error "$MAIN" >/dev/null 2>&1
    local rc=$?
    if [[ $rc -ne 0 ]]; then
        echo "COMPILE FAILED ($ENGINE) — first errors in $JOB.log:" >&2
        echo "---------------------------------------------------" >&2
        grep -E "^!|^[^ :][^:]*\.tex:[0-9]+:" "$JOB.log" 2>/dev/null | head -n 25 >&2 || true
        echo "---------------------------------------------------" >&2
        echo "Inspect $DIR/$JOB.log (always fix the FIRST error first)." >&2
        exit 1
    fi
}

report_unresolved() {
    if [[ ! -f "$JOB.log" ]]; then
        return
    fi
    local warnings
    warnings=$(grep -E "Warning.*[Cc]itation .* undefined|Warning.*Reference .* undefined|There were undefined references|There were multiply-defined labels" "$JOB.log" 2>/dev/null | sort -u || true)
    if [[ -n "$warnings" ]]; then
        echo ""
        echo "WARNING — unresolved/duplicate references (run full compile if citations changed):"
        echo "$warnings" | head -n 15
    fi
}

echo "[$MODE compile | $ENGINE] $DIR ($MAIN)"

if [[ "$MODE" == "full" ]]; then
    run_tex_pass
    echo "  pass 1/4 done (.aux generated)"
    if command -v "$BIBTOOL" >/dev/null 2>&1; then
        if ! "$BIBTOOL" "$JOB" >/dev/null 2>&1; then
            if [[ -s "$JOB.blg" ]]; then
                echo "BIBLIOGRAPHY WARNINGS/ERRORS ($JOB.blg):" >&2
                grep -iE "error|warning" "$JOB.blg" | head -n 10 >&2 || true
            fi
        fi
        echo "  $BIBTOOL pass done"
    else
        echo "  WARNING: '$BIBTOOL' not found; skipping bibliography pass" >&2
    fi
    run_tex_pass
    echo "  pass 2/4 done (bibliography injected)"
    run_tex_pass
    echo "  pass 3/4 done (cross-references resolved)"
    run_tex_pass
    echo "  pass 4/4 done (layout stabilized)"
    report_unresolved
else
    run_tex_pass
    report_unresolved
fi

if [[ -f "$JOB.pdf" ]]; then
    PAGES=""
    if command -v pdfinfo >/dev/null 2>&1; then
        PAGES=$(pdfinfo "$JOB.pdf" 2>/dev/null | awk '/^Pages:/ {print $2}')
    fi
    echo "OK -> $DIR/$JOB.pdf${PAGES:+ ($PAGES pages)}"
else
    echo "ERROR: PDF was not created — inspect $DIR/$JOB.log" >&2
    exit 1
fi

