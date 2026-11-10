# LaTeX Compilation Errors & Recovery

Concise reference for interpreting `scripts/compile.sh` error extracts and resolving local TeX issues.

## Reading Error Logs Properly

- Always inspect the **first** `!` error and the preceding `file.tex:LINE:` line (`-file-line-error` flag enabled in `compile.sh`).
- LaTeX errors cascade: one missing `}` or `\end{...}` generates dozens of false errors downstream. Fix error #1 and re-compile rather than chasing error #20.

## Common Errors Table

| Error Message | Common Cause | Fix |
|---|---|---|
| `Undefined control sequence` | Misspelled command or missing `\usepackage{...}` | Fix macro spelling or add required package in `main.tex` |
| `File 'foo.sty' not found` | LaTeX package missing from local TeX Live / BasicTeX | Run `sudo tlmgr install foo` or OS package equivalent |
| `Extra alignment tab has been changed to \cr` | More `&` columns in a table row than declared in `\begin{tabular}{...}` | Match column count or escape literal `&` as `\&` |
| `Misplaced \noalign` | `\toprule` / `\midrule` / `\hline` placed before ending previous row | End row with `\\` before rule command |
| `Missing $ inserted` | Unescaped `_`, `^`, or math symbol in text mode (often file names) | Wrap expression in `$...$` or escape `_` as `\_` |
| `Runaway argument?` / `File ended while scanning` | Unclosed `{` or `\begin{env}` above reported line | Scan upward to balance braces and environments |
| `Float too large for page` | Wide figure or table exceeding column/page height | Constrain image width (`width=0.95\linewidth`) or use `table*`/`figure*` |
| `!pdfTeX error ... cannot find image` | Incorrect relative path or missing file extension | Put assets in `figures/`, check exact case-sensitive path |
| `pdfTeX error (font expansion): ... scalable fonts` | Missing `libertine` fonts required by `acmart` | Install `texlive-fonts-extra` or `tlmgr install libertine libertinust1math` |

## Resolving Reference & Aux State Warnings

- **`Reference 'fig:foo' undefined`**: Place `\label{fig:foo}` **after** `\caption{...}`, confirm file is `\input` in `main.tex`, and run `compile.sh <dir> full`.
- **`There were multiply-defined labels`**: Two sections/floats reuse the same `\label{...}`; deduplicate names globally.
- **Poisoned `.aux` state** (broken build left partial `.aux` / `.bbl` files):
  ```bash
  cd <project-dir>
  rm -f *.aux *.bbl *.blg *.log *.out *.toc *.lof *.lot *.fls *.fdb_latexmk *.synctex.gz
  bash <skill-dir>/scripts/compile.sh . full
  ```

