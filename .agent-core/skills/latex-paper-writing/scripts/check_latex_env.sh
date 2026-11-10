#!/usr/bin/env bash
# =============================================================
# check_latex_env.sh — Diagnose local LaTeX & BibTeX toolchain.
# Runs compilation test inside an isolated mktemp directory.
# =============================================================
set -uo pipefail

echo "LaTeX Environment Check"
echo "======================="

OS=$(uname -s)
case "$OS" in
    Darwin*)               PLATFORM="macOS" ;;
    Linux*)                PLATFORM="Linux" ;;
    CYGWIN*|MINGW*|MSYS*)  PLATFORM="Windows" ;;
    *)                     PLATFORM="Unknown ($OS)" ;;
esac
echo "Platform: $PLATFORM"

echo ""
echo "TeX binaries:"
TOOLS=("pdflatex" "xelatex" "lualatex" "bibtex" "biber" "latexmk" "pdftoppm")
HAS_PDFLATEX=0
for tool in "${TOOLS[@]}"; do
    if command -v "$tool" >/dev/null 2>&1; then
        loc=$(command -v "$tool")
        if [[ "$tool" == "pdftoppm" ]]; then
            ver=$("$tool" -v 2>&1 | head -n 1 || true)
        else
            ver=$("$tool" --version 2>&1 | head -n 1 || true)
        fi
        echo "  [OK]      $tool -> $loc ($ver)"
        [[ "$tool" == "pdflatex" ]] && HAS_PDFLATEX=1
    else
        echo "  [MISSING] $tool"
    fi
done

echo ""
echo "Smoke compile test (isolated temp dir):"
if [[ "$HAS_PDFLATEX" -eq 1 ]]; then
    TMP_DIR=$(mktemp -d)
    trap 'rm -rf "$TMP_DIR"' EXIT
    cat > "$TMP_DIR/hello.tex" <<'TEXEOF'
\documentclass{article}
\begin{document}
LaTeX smoke test.
\end{document}
TEXEOF
    if (cd "$TMP_DIR" && pdflatex -interaction=nonstopmode hello.tex >/dev/null 2>&1) && [[ -f "$TMP_DIR/hello.pdf" ]]; then
        echo "  [OK] pdflatex compiled hello.tex -> hello.pdf"
    else
        echo "  [FAIL] pdflatex failed on minimal hello.tex"
    fi
else
    echo "  [SKIP] pdflatex not installed"
fi

echo ""
echo "Install hints (if missing):"
case "$PLATFORM" in
    macOS)
        echo "  brew install --cask basictex   # or mactex"
        echo "  sudo tlmgr update --self && sudo tlmgr install ieeetran acmart booktabs subfig algorithms algorithmicx"
        ;;
    Linux)
        echo "  sudo apt-get install texlive-latex-recommended texlive-latex-extra texlive-publishers texlive-fonts-extra"
        ;;
    Windows)
        echo "  Install MiKTeX or TeX Live for Windows"
        ;;
esac
echo "======================="
