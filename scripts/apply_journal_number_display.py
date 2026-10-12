#!/usr/bin/env python3
"""Wire displayJournalNumber helper (DR-05-######) into journals-page.tsx."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / "src" / "modules" / "finance" / "pages" / "journals-page.tsx"

text = PAGE.read_text(encoding="utf-8")

# Remove any local displayJournalNumber (Persian abbrev or other)
text2, n = re.subn(
    r"/\*\* ADR-FIN-002[\s\S]*?function displayJournalNumber\([\s\S]*?\n\}\n\n",
    "",
    text,
    count=1,
)
if n == 0:
    text2, n = re.subn(
        r"function displayJournalNumber\([\s\S]*?\n\}\n\n",
        "",
        text,
        count=1,
    )

if "display-journal-number" not in text2:
    needle = '} from "../types";\n'
    insert = '} from "../types";\nimport { displayJournalNumber } from "../lib/display-journal-number";\n'
    if needle not in text2:
        raise SystemExit("types import not found — abort")
    text2 = text2.replace(needle, insert, 1)

PAGE.write_text(text2, encoding="utf-8")
print(f"OK wrote {PAGE} bytes {PAGE.stat().st_size}")
if "function displayJournalNumber" in text2:
    raise SystemExit("local displayJournalNumber still present")
if "display-journal-number" not in text2:
    raise SystemExit("import missing")
print("sanity OK")
