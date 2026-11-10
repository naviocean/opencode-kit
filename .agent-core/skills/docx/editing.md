# Editing Documents

## When Given a Template — EDIT IT, NEVER Recreate

**If a .docx or .dotx template is attached, you MUST edit it directly. NEVER use docx-js to create from scratch.**

### Finding the Template

The template file may have any name and be in any directory. **Search for ALL Word file extensions**:

```bash
find . -type f \( -name "*.docx" -o -name "*.dotx" -o -name "*.dotm" \) 2>/dev/null
```

⚠️ **Do NOT search for only `*.doc*`** — the glob `*.doc*` does NOT match `.dotx` files. Always list all extensions explicitly.

If a template file is found, you MUST use it. Do NOT create from scratch.

### Critical Rules

1. **ALWAYS edit the template file, even when the content doesn't match.** Unpack the template, use `replace_text.py` to swap the text, keep everything else.

2. **NEVER create from scratch with docx-js when a template exists.** Styled shapes, decorative elements, custom headers/footers, theme colors are all lost when recreating.

3. **Do NOT adapt the template's colors or fonts to "match" the topic.** Keep the exact fonts, colors, and decorative elements from the template.

4. **Reuse, don't recreate.** Use `inspect_doc.py --media` to see template assets. Preserve original media files.

5. **.dotx files work the same as .docx** — `unpack.py` handles both. Do NOT try to convert .dotx to .docx first.

6. **Never edit XML directly.** Always use the provided scripts. Do not use grep, sed, or the Edit tool on XML files.

---

## Template Filling Workflow

**unpack → inspect → replace text → check headers → repack**

```bash
# 1. Unpack (.docx and .dotx both work)
python scripts/office/unpack.py template.docx unpacked/

# 2. Inspect structure, text, tables, headers, and media
python scripts/inspect_doc.py unpacked/ --sections --media
python scripts/inspect_tables.py unpacked/
python scripts/inspect_headers.py unpacked/

# 3. Replace placeholder text (handles split runs automatically)
python scripts/replace_text.py unpacked/ --match "Name Surname" --text "Jane Smith"
python scripts/replace_text.py unpacked/ --match "Job Title" --text "Photographer"

# Or batch replace from a JSON map:
python scripts/replace_text.py unpacked/ --map replacements.json --all-files

# 3b. For templates with merge fields or content controls:
python scripts/replace_field.py unpacked/ --list
python scripts/replace_field.py unpacked/ --map fields.json

# 4. Repack
python scripts/office/pack.py unpacked/ output.docx --original template.docx
```

---

## Scripts

| Script | Purpose |
|--------|---------|
| `inspect_doc.py` | **Inspect page setup, fonts, styles, text, media** — use first |
| `inspect_headers.py` | **Inspect headers & footers** (separate XML files) |
| `inspect_tables.py` | **Inspect tables** — dimensions, column widths, cell content, merged cells |
| `list_sections.py` | **List document sections** with page setup per section |
| `replace_text.py` | **Replace text** preserving formatting (handles split runs) |
| `replace_field.py` | **Replace merge fields, content controls, bookmarks** |
| `delete_sections.py` | **Delete sections by index** from large templates |
| `comment.py` | **Add comments** to document |
| `unpack.py` | Extract and pretty-print DOCX/DOTX |
| `pack.py` | Repack with validation and auto-repair |

### inspect_doc.py

```bash
# Full inspection: page setup, theme, styles, text, media
python scripts/inspect_doc.py unpacked/ --text --media

# Text grouped by document section (for large templates)
python scripts/inspect_doc.py unpacked/ --sections --media
```

Shows page size, orientation, margins, theme fonts/colors, document styles, text content (deduplicated, noise-filtered), and media file inventory.

### inspect_tables.py

```bash
python scripts/inspect_tables.py unpacked/
```

Shows all tables with dimensions, column widths, cell content (truncated), and merged cell indicators. Example output:
```
=== Tables (2) ===

  Table 0 (3 rows × 4 cols)
    widths: 2.5" | 2.5" | 2.5" | 2.5"
    [0,0] "Name"          [0,1] "Department"   [0,2] "Phone"        [0,3] "Email"
    [1,0] "John Doe"      [1,1] "Engineering"  [1,2] "x4201"        [1,3] "john@..."

  Table 1 (2 rows × 3 cols, has merged cells)
    [0,0] "Q1 Results" (colspan=3)
    [1,0] "Revenue"       [1,1] "$1.2M"        [1,2] "↑ 15%"
```

### replace_text.py

```bash
# Single replacement (case-insensitive, handles split runs)
python scripts/replace_text.py unpacked/ --match "Work Phone" --text "+1 (555) 123-4567"

# Batch replace from JSON mapping
python scripts/replace_text.py unpacked/ --map replacements.json

# Include headers and footers
python scripts/replace_text.py unpacked/ --map replacements.json --all-files

# Preview without modifying
python scripts/replace_text.py unpacked/ --match "old" --text "new" --dry-run
```

JSON map format:
```json
{
  "Name Surname": "Jane Smith",
  "Job Title": "Wedding Photographer",
  "Work Phone": "+1 (555) 123-4567"
}
```

### replace_field.py

```bash
# List all merge fields, content controls, and bookmarks
python scripts/replace_field.py unpacked/ --list

# Replace merge field by name
python scripts/replace_field.py unpacked/ --field "CompanyName" --text "Acme Corp"

# Replace content control by tag
python scripts/replace_field.py unpacked/ --sdt "author_name" --text "Jane Smith"

# Batch replace from JSON
python scripts/replace_field.py unpacked/ --map fields.json
```

### Handling Large Templates

Templates with many sections (planners, calendars, multi-page layouts) can be trimmed down:

```bash
# 1. See what sections exist
python scripts/list_sections.py unpacked/

# 2. See text per section to decide what to keep
python scripts/inspect_doc.py unpacked/ --sections

# 3. Keep only the sections you need, delete the rest
python scripts/delete_sections.py unpacked/ --keep 0,1,2,13

# 4. Replace text in the kept sections
python scripts/replace_text.py unpacked/ --map replacements.json --all-files

# 5. Repack
python scripts/office/pack.py unpacked/ output.docx --original template.docx
```

---

## Common Pitfalls

- **Text may be split internally** — `replace_text.py` handles this. Always use it instead of grep or manual editing.
- **Headers and footers are separate** — use `inspect_headers.py` to see them, and `--all-files` with `replace_text.py` to edit them.
- **Multi-section documents** have different page sizes/margins per section. Use `list_sections.py` to detect section breaks.
- **.dotx files unpack directly** — do NOT convert to .docx first. `unpack.py` handles both.
- **Never edit XML directly** — use the provided scripts for all modifications.
- **Do NOT use `pandoc` on `.dotx` files** — it hangs. Use `unpack.py` + `inspect_doc.py` instead.
- **OOXML Structural Integrity** — always run `scripts/office/validate.py output.docx` after packing.

---

## Exporting / Inspecting Text

```bash
# Extract text / Markdown from DOCX (no LibreOffice needed)
pandoc --track-changes=all document.docx -o output.md

# Validate final DOCX OOXML schema
python scripts/office/validate.py output.docx
```
