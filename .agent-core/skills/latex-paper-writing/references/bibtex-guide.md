# BibTeX & Citation Integrity Guide

Strict rules for authoring and debugging `references.bib` without fabricated metadata or unresolved citations.

## Citation Authenticity Rule

- **Never invent bibliography entries, DOIs, author lists, or arXiv IDs.**
- Obtain verified BibTeX from authoritative indexes (DBLP, ACM Digital Library, IEEE Xplore, Crossref DOI resolver, or arXiv).
- When exact metadata cannot be verified offline, insert a minimal placeholder marked with `% TODO: verify citation metadata` and notify the user before submission.

## Standard Entry Anatomy & Hygiene

```bibtex
@inproceedings{smith2024efficient,
  author    = {Smith, Jane and Doe, John},
  title     = {Efficient Document Indexing with {LLM} Pipelines},
  booktitle = {Proceedings of the IEEE International Conference on Systems},
  year      = {2024},
  pages     = {101--112},
  publisher = {IEEE},
  doi       = {10.1109/SYS.2024.000101}
}
```

- **Authors:** Separate authors strictly with `and` (`Last, First and Last, First`), never commas between distinct authors. Wrap institutional authors in braces (`{OpenCode Contributors}`).
- **Title casing:** Protect acronyms and proper nouns using `{...}` (e.g., `{IEEE}`, `{PDF}`, `{LaTeX}`, `{Transformer}`), since BibTeX styles often downcase unbraced title words.
- **Page ranges:** Use en-dashes (`--`), not single hyphens (`pages = {12--24}`).
- **Months:** Unquoted 3-letter abbreviations (`month = oct`).
- **Keys:** Prefer lowercase `firstauthorYEARkeyword` without colons or spaces (e.g. `smith2024efficient`).
- **Deduplication:** Cite either the peer-reviewed publication OR the preprint — avoid duplicating the same paper under two citation keys.

## Troubleshooting Citation Warnings

| Symptom | Cause | Resolution |
|---|---|---|
| `[?]` in output PDF | Only single-pass quick compile ran after adding `\cite` | Run `bash scripts/compile.sh <dir> full` |
| `Citation 'x' undefined` in `.log` | Key typo, missing entry in `.bib`, or BibTeX failed earlier | Match key case-sensitively; inspect `<job>.blg` |
| Entry exists in `.bib` but missing in output | Entry has no `\cite{key}` in any `\input`-ted `.tex` file | Cite it or prune unused entries before final build |
| `I'm skipping whatever remains of this entry` | Unclosed `{` / `}`, missing trailing comma, or raw `%`/`&` inside field | Add missing comma; balance braces |
| Wrong author initials ("J. Smith" scrambled) | Comma used instead of `and` between coauthors | Replace separator with `and` |

