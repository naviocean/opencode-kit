# Venue Style & Anonymization Rules

Format expectations across supported starter venues (`ieee-conference`, `ieee-journal`, `acm-sigconf`, `arxiv`). Always check the target CFP for the exact year before submission.

| Venue | Document Class | Columns | Typical Limits | Anonymization Option |
|---|---|---|---|---|
| `ieee-conference` | `IEEEtran` (`conference`) | 2 | 6–10 pages + 2 refs | Strip author block / `\thanks` if double-blind |
| `ieee-journal` | `IEEEtran` (`journal`) | 2 | Venue-dependent | Usually single-blind (include bios on camera-ready) |
| `acm-sigconf` | `acmart` (`sigconf`) | 2 | 8–12 pages incl. refs | `\documentclass[sigconf,review,anonymous]{acmart}` |
| `arxiv` | `article` | 1 | None | Author block visible |

## Key Venue Rules

### IEEE Conference (`IEEEtran`)
- Let `IEEEtran` control fonts and margins — never override with `geometry` or font scaling packages.
- Table captions go **above** tabular content; figure captions go **below** graphics. Use `booktabs` (`\toprule`, `\midrule`, `\bottomrule`) without vertical gridlines.
- Cite using `\cite{key}` as grammatical support ("Prior studies~\cite{smith2024}..."), not as the sentence subject.

### IEEE Journal (`IEEEtran`)
- Include running headers via `\markboth{...}{...}` and begin the introduction with `\IEEEPARstart{I}{n}...`.
- Expect broader related work, failure analyses, and ablations relative to conference workshops.

### ACM (`acmart`)
- Place abstract, `\keywords{...}`, and CCS XML + `\ccsdesc` blocks **before** `\maketitle`.
- Do not modify page geometry or font families — ACM TAPS pipelines reject layout hacks.
- Ensure `texlive-fonts-extra` (Linux Libertine fonts) is installed locally when compiling `acmart` with `pdflatex`.

### arXiv Preprint (`article`)
- Single-column clean typography (`11pt`, `1in` margins) with clickable blue hyperlinks (`hyperref`) and `natbib` citations. Include DOIs/URLs in `.bib` entries where available.

## Double-Blind Anonymization Checklist

1. Remove or pass `anonymous` class flags; omit names, affiliations, emails, and grant numbers in `\thanks`.
2. Exclude Acknowledgments sections during blind review.
3. Refer to your own prior publications in the third person ("Prior work~\cite{...}" instead of "In our earlier paper").
4. Scrub identifying author/creator PDF metadata (`\hypersetup{pdfauthor={},pdftitle={...}}` or inspect with `pdfinfo`).
5. Anonymize public code/artifact links (or omit repo URLs with org usernames) and check `.tex` filenames/`\label`s.

