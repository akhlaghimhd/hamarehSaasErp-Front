#!/usr/bin/env python3
"""Fix journalTotals recursive call -> sumLines fallback."""
from pathlib import Path
import sys
path = Path(__file__).resolve().parents[1] / "src/modules/finance/pages/journals-page.tsx"
t = path.read_text(encoding="utf-8")
bad = "  return journalTotals(j);\n}"
# more precise: inside journalTotals only
old = """function journalTotals(j: JournalEntryDto): { debit: number; credit: number } {
  const any = j as JournalEntryDto & {
    items_debit_sum?: number | string | null;
    items_credit_sum?: number | string | null;
  };
  if (any.items_debit_sum != null || any.items_credit_sum != null) {
    return { debit: Number(any.items_debit_sum || 0), credit: Number(any.items_credit_sum || 0) };
  }
  return journalTotals(j);
}"""
new = """function journalTotals(j: JournalEntryDto): { debit: number; credit: number } {
  const any = j as JournalEntryDto & {
    items_debit_sum?: number | string | null;
    items_credit_sum?: number | string | null;
  };
  if (any.items_debit_sum != null || any.items_credit_sum != null) {
    return { debit: Number(any.items_debit_sum || 0), credit: Number(any.items_credit_sum || 0) };
  }
  return sumLines(j.items as JournalItemDto[] | undefined);
}"""
if new in t or "return sumLines(j.items" in t and "function journalTotals" in t:
    # check still recursive?
    if "return journalTotals(j);" in t and "function journalTotals" in t:
        pass
    else:
        print("already fixed")
        sys.exit(0)
if old not in t:
    # try simple replace of the recursive return only once after journalTotals
    idx = t.find("function journalTotals")
    if idx < 0:
        print("ERROR: journalTotals not found", file=sys.stderr)
        sys.exit(1)
    end = t.find("\nfunction ", idx + 1)
    if end < 0:
        end = t.find("\nexport function", idx + 1)
    chunk = t[idx:end]
    if "return journalTotals(j);" not in chunk:
        print("already fixed or unexpected")
        sys.exit(0)
    chunk2 = chunk.replace("return journalTotals(j);", "return sumLines(j.items as JournalItemDto[] | undefined);", 1)
    t = t[:idx] + chunk2 + t[end:]
else:
    t = t.replace(old, new, 1)
path.write_text(t, encoding="utf-8")
print("OK fixed journalTotals recursion")
