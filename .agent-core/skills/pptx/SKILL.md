---
name: pptx
description: Create, inspect, edit, and restyle PowerPoint presentations (.pptx). Uses pure Node.js (pptxgenjs) and OOXML templates for deck generation, plus pure Python XML tools for unpacking, slide inspection, shape overlap checks, resizing, text replacement, and packing without LibreOffice.
---

# PPTX Skill

## Workflow Selection

| Situation | Action |
|-----------|--------|
| User attaches or references a `.pptx` file | Read [editing.md](editing.md) — edit the template directly |
| No `.pptx` provided — create from scratch | Read [creating.md](creating.md) — use PptxGenJS templates |
| Read/analyze an existing presentation | See Reading Content below |

**When in doubt:** If ANY `.pptx` file is attached or mentioned, use the
editing workflow. The creating workflow is ONLY for when no existing
presentation exists at all.

---

## Reading Content

```bash
# Text extraction
python -m markitdown presentation.pptx

# Raw XML
python scripts/office/unpack.py presentation.pptx unpacked/

# Structured inspection (placeholders, text, images, media — USE THIS)
python scripts/inspect_slide.py unpacked/ --summary --theme --media
python scripts/inspect_slide.py unpacked/ppt/slides/slide1.xml
```


---

## QA (Required)

**Assume there are problems. Your job is to find them.**

Your first render is almost never correct. Approach QA as a bug hunt, not a confirmation step. If you found zero issues on first inspection, you weren't looking hard enough.

### Overlap Check & Auto-Fix (Before Packing)

**Run this on the unpacked XML before packing** — it catches overlapping text boxes instantly without needing a render, and `--fix` auto-applies text auto-shrink:

```bash
# Check and auto-fix (enables normAutofit on overlapping text shapes)
python scripts/check_overlaps.py unpacked/ --fix

# Check only (no modifications)
python scripts/check_overlaps.py unpacked/
```

The `--fix` flag adds `<a:normAutofit/>` to every text shape involved in an overlap or off-slide overflow. This makes PowerPoint auto-shrink text to fit the box. If issues remain after `--fix`, shorten text or resize shapes manually.

### Content QA

```bash
python -m markitdown output.pptx
```

Check for missing content, typos, wrong order.

**When using templates, check for leftover placeholder text:**

```bash
python -m markitdown output.pptx | grep -iE "xxxx|lorem|ipsum|this.*(page|slide).*layout"
```

If grep returns results, fix them before declaring success.

### Automated Checks

Run these before visual inspection to catch common issues automatically:

```bash
python scripts/detect_fonts.py output.pptx
python scripts/office/unpack.py output.pptx unpacked/
python scripts/check_overlaps.py unpacked/ --fix
python scripts/clean.py unpacked/
python scripts/office/pack.py unpacked/ final_output.pptx --original output.pptx
```

Fix any issues these report before proceeding to visual QA.

### Structural & XML QA (Pure Python)

Since no headless LibreOffice conversion is required, verify visual integrity and typography structurally using the unpacked XML checkers and font inspector:

- Check bounding boxes & collisions cleanly via `scripts/check_overlaps.py unpacked/ --fix`
- Verify font availability with `scripts/detect_fonts.py output.pptx`
- Verify media inventory and slide text structure with `scripts/inspect_slide.py unpacked/ --summary --theme --media`
- Validate OOXML schema integrity with `scripts/office/validate.py output.pptx`

Checklist while reviewing `inspect_slide.py` and `check_overlaps.py` outputs:

- Overlapping elements (caught mathematically by `check_overlaps.py`)
- Text overflow or fixed-box clipping (`autofit=fixed` when replacement text exceeds original character budget)
- Decorative lines colliding with wrapped multi-line titles
- Leftover placeholder content (`--list` / `markitdown` grep)
- Style & font consistency across every slide

### Verification Loop

1. Generate slides via Node.js (`pptxgenjs`) or update XML
2. Run `detect_fonts.py`, `unpack.py`, `check_overlaps.py --fix`, `clean.py`, and `pack.py`
3. **List issues found** (leftover template text, overlaps, missing fonts)
4. Fix issues (resize boxes via `resize_shape.py`, shorten copy, enable `--autofit`)
5. **Re-verify affected slides** via `inspect_slide.py` & `validate.py` until zero errors remain

**Do not declare success until you've completed at least one fix-and-verify cycle.**

---

## Images

### Image Aspect Ratio Rule

**Always preserve the original aspect ratio of images.** When resizing, compute the target height from the source image's natural aspect ratio (or vice versa) — never set width and height independently, as this stretches or squashes the image.


### Image Sources

```javascript
// From file path
slide.addImage({ path: "images/chart.png", x: 1, y: 1, w: 5, h: 3 });

// From URL
slide.addImage({ path: "https://example.com/image.jpg", x: 1, y: 1, w: 5, h: 3 });

// From base64 (faster, no file I/O)
slide.addImage({ data: "image/png;base64,iVBORw0KGgo...", x: 1, y: 1, w: 5, h: 3 });
```

### Image Options

```javascript
slide.addImage({
  path: "image.png",
  x: 1, y: 1, w: 5, h: 3,
  rotate: 45,              // 0-359 degrees
  rounding: true,          // Circular crop
  transparency: 50,        // 0-100
  flipH: true,             // Horizontal flip
  flipV: false,            // Vertical flip
  altText: "Description",  // Accessibility
  hyperlink: { url: "https://example.com" }
});
```

### Image Sizing Modes

```javascript
// Contain - fit inside, preserve ratio
{ sizing: { type: 'contain', w: 4, h: 3 } }

// Cover - fill area, preserve ratio (may crop)
{ sizing: { type: 'cover', w: 4, h: 3 } }

// Crop - cut specific portion
{ sizing: { type: 'crop', x: 0.5, y: 0.5, w: 2, h: 2 } }
```

### Calculate Dimensions (preserve aspect ratio)

```javascript
const origWidth = 1978, origHeight = 923, maxHeight = 3.0;
const calcWidth = maxHeight * (origWidth / origHeight);
const centerX = (10 - calcWidth) / 2;

slide.addImage({ path: "image.png", x: centerX, y: 1.2, w: calcWidth, h: maxHeight });
```

---

## Dependencies

**All-in-one install:**

```bash
pip install "markitdown[pptx]" Pillow python-pptx numpy defusedxml
npm install -g pptxgenjs
```

**Optional system tools:**
- `fc-list` (`fontconfig`) — local font availability checks via `scripts/detect_fonts.py`
