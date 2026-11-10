#!/usr/bin/env python3
"""Pure-Python Excel Formula Validator & Workbook Integrity Checker.

Validates formulas, cell references, syntax, and cached error tokens in .xlsx/.xlsm
workbooks using openpyxl without requiring LibreOffice or Excel.

Usage:
    python scripts/validate_formulas.py output.xlsx
    python scripts/validate_formulas.py output.xlsx --strict
"""

import json
import re
import sys
from pathlib import Path

from openpyxl import load_workbook

EXCEL_ERRORS = [
    "#VALUE!",
    "#DIV/0!",
    "#REF!",
    "#NAME?",
    "#NULL!",
    "#NUM!",
    "#N/A",
]


def _check_balanced_delimiters(formula: str) -> str | None:
    """Verify parentheses and string quotes are balanced outside string literals."""
    in_string = False
    paren_depth = 0
    i = 0
    n = len(formula)

    while i < n:
        ch = formula[i]
        if ch == '"':
            if in_string and i + 1 < n and formula[i + 1] == '"':
                # Escaped quote inside Excel string literal ("")
                i += 2
                continue
            in_string = not in_string
        elif not in_string:
            if ch == "(":
                paren_depth += 1
            elif ch == ")":
                paren_depth -= 1
                if paren_depth < 0:
                    return "Unbalanced closing parenthesis ')'"
        i += 1

    if in_string:
        return "Unclosed string literal '\"'"
    if paren_depth != 0:
        return f"Unbalanced parentheses (missing {paren_depth} closing ')')"
    return None


def _strip_string_literals(formula: str) -> str:
    """Replace double-quoted string literals with empty quotes for safe scanning."""
    return re.sub(r'"(?:""|[^"])*"', '""', formula)


def _check_sheet_references(formula_body: str, sheet_names: set[str]) -> list[str]:
    """Validate that cross-sheet references point to existing sheets in workbook."""
    missing = []
    # Quoted sheet names: 'My Sheet'!A1
    for m in re.finditer(r"'([^']+)'!", formula_body):
        ref_sheet = m.group(1).replace("''", "'")
        if ref_sheet not in sheet_names:
            missing.append(ref_sheet)

    # Unquoted sheet names: Sheet1!A1 (avoid matching strings already quoted)
    unquoted = re.sub(r"'[^']+'!", "", formula_body)
    for m in re.finditer(r"\b([A-Za-z_][A-Za-z0-9_\.]*)!", unquoted):
        ref_sheet = m.group(1)
        if ref_sheet not in sheet_names:
            missing.append(ref_sheet)

    return missing


def validate_workbook(filename: str) -> dict:
    """Inspect all formulas and cached values in workbook without LibreOffice."""
    path = Path(filename)
    if not path.exists():
        return {"error": f"File '{filename}' does not exist"}

    error_details: dict[str, list[str]] = {err: [] for err in EXCEL_ERRORS}
    syntax_errors: list[dict[str, str]] = []
    total_errors = 0
    total_formulas = 0

    try:
        # Check cached error values if any exist
        wb_values = load_workbook(filename, data_only=True, read_only=True)
        for sheet_name in wb_values.sheetnames:
            ws = wb_values[sheet_name]
            for row in ws.iter_rows(values_only=False):
                for cell in row:
                    val = cell.value
                    if val is not None and isinstance(val, str):
                        for err in EXCEL_ERRORS:
                            if err in val:
                                loc = f"{sheet_name}!{cell.coordinate}"
                                error_details[err].append(loc)
                                total_errors += 1
                                break
        wb_values.close()

        # Check formula syntax, embedded error tokens, and sheet references
        wb_formulas = load_workbook(filename, data_only=False, read_only=True)
        sheet_names = set(wb_formulas.sheetnames)

        for sheet_name in wb_formulas.sheetnames:
            ws = wb_formulas[sheet_name]
            for row in ws.iter_rows(values_only=False):
                for cell in row:
                    val = cell.value
                    if not (isinstance(val, str) and val.startswith("=")):
                        continue

                    total_formulas += 1
                    loc = f"{sheet_name}!{cell.coordinate}"
                    body = val[1:].strip()

                    if not body:
                        syntax_errors.append({"location": loc, "issue": "Empty formula '='"})
                        total_errors += 1
                        continue

                    stripped = _strip_string_literals(body)

                    # Embedded Excel errors inside formulas (e.g. =SUM(#REF!))
                    for err in EXCEL_ERRORS:
                        if err in stripped:
                            if loc not in error_details[err]:
                                error_details[err].append(loc)
                                total_errors += 1

                    # Parentheses and quotes balance
                    delim_issue = _check_balanced_delimiters(body)
                    if delim_issue:
                        syntax_errors.append({"location": loc, "issue": delim_issue})
                        total_errors += 1

                    # Missing cross-sheet references
                    missing_sheets = _check_sheet_references(stripped, sheet_names)
                    for ref in missing_sheets:
                        syntax_errors.append({
                            "location": loc,
                            "issue": f"Referenced sheet '{ref}' does not exist",
                        })
                        total_errors += 1

        wb_formulas.close()

        result = {
            "status": "success" if total_errors == 0 else "errors_found",
            "engine": "openpyxl-pure-python",
            "total_errors": total_errors,
            "total_formulas": total_formulas,
            "error_summary": {},
            "syntax_errors": syntax_errors[:20],
        }

        for err_type, locations in error_details.items():
            if locations:
                result["error_summary"][err_type] = {
                    "count": len(locations),
                    "locations": locations[:20],
                }

        return result

    except Exception as e:
        return {"error": str(e)}


def main():
    args = sys.argv[1:]
    strict = "--strict" in args
    files = [a for a in args if not a.startswith("--")]

    if not files:
        print("Usage: python validate_formulas.py <excel_file> [--strict]")
        print("\nPure-Python formula & reference validator (no LibreOffice required).")
        sys.exit(1)

    result = validate_workbook(files[0])
    print(json.dumps(result, indent=2))

    if "error" in result or (strict and result.get("total_errors", 0) > 0):
        sys.exit(1)


if __name__ == "__main__":
    main()

