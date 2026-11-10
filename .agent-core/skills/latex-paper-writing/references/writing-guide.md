# LaTeX Paper Writing Guide

Practical structure and precision checklist when drafting or revising research/technical sections in `.tex` files.

## Core Principles

- **One focal claim per paragraph:** Lead with the topic sentence, support with data or derivation, and conclude with transition or implication.
- **Evidence before adjectives:** Replace unsubstantiated claims ("much faster", "obviously better") with concrete numbers, citations, or statistical comparisons.
- **Active voice & consistent tense:** Use present tense for the paper itself ("Section~\ref{sec:method} presents...") and established facts; past tense for completed experiments ("We evaluated...").
- **Label discipline:** Attach unique prefixes (`sec:`, `subsec:`, `fig:`, `tab:`, `eq:`, `alg:`) and always reference each label (`\ref` / `\eqref`). Inside floats, place `\label{...}` **after** `\caption{...}`.

## Section Blueprints

1. **Abstract (150–250 words):** Four compact moves — context/problem, core method insight, quantitative headline results, broader impact. Avoid citations (`\cite`), undefined acronyms, and forward section pointers; write the abstract last.
2. **Introduction (1–1.5 pages):** Move from problem scope → concrete gap in existing approaches (with citations) → key idea of this work → 3–4 verifiable contribution bullets aligned with evaluation sections.
3. **Background & Related Work:** Keep preliminaries brief (notation, core definitions used later). Organize related work **thematically** by paradigm and end with clear differentiation ("Unlike prior X, our method handles Y").
4. **Methodology:** Present architecture overview first, then formalize problem inputs/outputs/objectives consistently with notation in figures and tables, then implementation details needed for reproducibility.
5. **Evaluation:** Frame around explicit Research Questions (`RQ1`, `RQ2`, ...). Use `booktabs` tables (no vertical rules, `\toprule`/`\midrule`/`\bottomrule`) paired with written analysis explaining *why* metrics move, including ablations and multi-seed variance.
6. **Conclusion:** Summarize fulfilled contributions with key numbers, honest limitations, and focused follow-up directions.

## Pre-Delivery Prose Pass

- Confirm numbers in the Abstract, Introduction, Tables, and Conclusion match identically.
- Verify no unescaped LaTeX special characters (`%`, `&`, `_`, `#`) leak into text mode.
- Search for leftover `TODO`, `XXX`, `Your Paper Title Here`, or placeholder domains (`example.com`).

