---
name: latex-paper-writing
description: End-to-end Overleaf-style workflow for authoring, formatting, citing, and compiling LaTeX documents and technical/research papers in the terminal (pure local TeX toolchain; no LibreOffice or cloud Overleaf API required). Scaffolds projects for IEEE conference, IEEE journal, ACM sigconf, and arXiv; enforces label/citation hygiene; runs BibTeX/Biber + multi-pass pdflatex/xelatex/lualatex with structured log error extraction; and executes pre-submission and double-blind anonymization checks. Trigger on ".tex", ".bib", "LaTeX", "Overleaf", "pdflatex", "xelatex", "bibtex", "IEEEtran", "acmart", or "arXiv paper".
---

# LaTeX Paper Writing (Local Overleaf-Style Workflow)

Guide projects from source scaffolding to a publication-ready PDF without leaving the terminal or depending on external web editors or LibreOffice.

## Components
- **`scripts/`**
  - `check_latex_env.sh` — Diagnoses local TeX toolchain (`pdflatex`, `xelatex`, `lualatex`, `bibtex`, `biber`, `latexmk`, `pdftoppm`) inside an isolated temp directory (never modifies user files).
  - `new_paper.sh` — Scaffolds a self-contained project (`ieee-conference`, `ieee-journal`, `acm-sigconf`, `arxiv`).
  - `compile.sh` — Runs `quick` (single pass) or `full` (4-pass compile + bibliography resolution) and extracts concise `!` / `file:line:` errors instead of flooding context with full logs.
- **`assets/`** — Minimal starter templates (`main.tex`, `abstract.tex`), structured chapter skeletons (`chapters/`), and sample `references.bib`.
- **`references/`** — On-demand guides (load ONLY the relevant guide when needed):
  - `references/writing-guide.md` — Section-by-section structure and clarity checklist.
  - `references/venue-style.md` — Venue class rules, margins, table/figure placement, double-blind anonymization.
  - `references/bibtex-guide.md` — Citation integrity, `.bib` syntax rules, debugging `[?]` / undefined citations.
  - `references/common-errors.md` — Common LaTeX error messages, cascading fixes, and clean aux rebuild commands.

## Workflow A: Initialize & Verify Environment

1. Verify TeX toolchain availability before debugging complex `.tex` issues:
   ```bash
   bash scripts/check_latex_env.sh
   ```
2. Determine target venue (`ieee-conference`, `ieee-journal`, `acm-sigconf`, or `arxiv`) and scaffold:
   ```bash
   bash scripts/new_paper.sh <venue> <target-dir> --title "Paper Title"
   ```
3. Immediately run a baseline compile on the empty scaffold to separate TeX environment issues from content edits:
   ```bash
   bash scripts/compile.sh <target-dir>
   ```

## Workflow B: Authoring & Structure Discipline

- Keep modular section files inside `chapters/` wired into `main.tex` via `\input{...}`.
- **Unique Labels:** Prefix every label consistently (`sec:`, `subsec:`, `fig:`, `tab:`, `eq:`, `alg:`) and place `\label{...}` **after** `\caption{...}` inside floats (`figure`, `table`). Every label must be referenced (`\ref` / `\eqref`).
- **Figures:** Store raster/vector figures inside `figures/` using PDF/PNG/EPS (avoid uncompressed multi-MB TIFFs or spaces/unescaped underscores in filenames).
- **Incremental Compile:** Compile in `quick` mode after completing each section so syntax errors (unclosed braces, broken table `&` counts) are caught immediately.

## Workflow C: Citations & BibTeX Integrity

- Maintain all bibliographic entries in `references.bib`.
- **Never fabricate citations or DOIs.** If exact metadata (authors, venue, year, DOI/eprint) is unverified, add a `% TODO: verify` comment above the entry and surface it explicitly to the user.
- Read `references/bibtex-guide.md` for entry types, acronym bracing (`{IEEE}`, `{LLM}`), and author-separator formatting (`and`).
- Whenever adding new `.bib` entries or `\cite{...}` calls, run a **full compile**:
  ```bash
  bash scripts/compile.sh <target-dir> full
  ```

## Workflow D: Compilation & Targeted Debugging

```bash
bash scripts/compile.sh <dir>          # quick: 1 pass (fast iteration)
bash scripts/compile.sh <dir> full     # full: pass 1 -> bibtex/biber -> pass 2 -> pass 3
```

Environment overrides supported by `compile.sh`:
- `MAIN=report.tex` (default: `main.tex`)
- `ENGINE=xelatex` or `lualatex` (default: `pdflatex`)
- `BIBTOOL=biber` (default: `bibtex`)

On failure:
1. Inspect the **first** reported error only — LaTeX errors cascade; fixing error #1 frequently clears errors #2–N.
2. Consult `references/common-errors.md` for common triggers (`Extra alignment tab`, `Undefined control sequence`, font issues).
3. If an edit caused poisoned `.aux`/`.bbl` state, run a clean rebuild (remove `*.aux *.bbl *.blg *.log *.out *.toc *.fls *.fdb_latexmk *.synctex.gz` and re-run `compile.sh <dir> full`).

## Workflow E: Pre-Submission & Visual QA

Before marking a LaTeX deliverable complete:
1. Run full compile (`compile.sh <dir> full`) and confirm zero `undefined references` / `Citation .* undefined` warnings.
2. Search for leftover placeholders (`TODO`, `placeholder`, `Your Paper Title Here`, `example.com`, `XXX`).
3. If double-blind submission is required, verify every item in the anonymization checklist (`references/venue-style.md` § Anonymization).
4. Optional visual layout inspection without desktop office suites: rasterize critical pages via `pdftoppm -png -r 150 main.pdf preview_page` and inspect visually for overfull boxes, overflowing tables, or clipped figures.

