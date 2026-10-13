#!/usr/bin/env python3
"""Journals page: replace full deleted list fetch with useJournalSummary for badges."""
from pathlib import Path
import sys

path = Path(__file__).resolve().parents[1] / "src/modules/finance/pages/journals-page.tsx"
t = path.read_text(encoding="utf-8")

if "useJournalSummary" in t and "deletedForCounts" not in t:
    print("already applied")
    sys.exit(0)

# import hook
if "useJournalSummary" not in t:
    if "useJournals," not in t:
        print("ERROR: useJournals import not found", file=sys.stderr)
        sys.exit(1)
    t = t.replace("useJournals,", "useJournals,\n  useJournalSummary,", 1)

old_block = """  const { data: deletedForCounts } = useJournals(
    { company_id: effectiveListCompanyId, deleted: true },
    { enabled: true }
  );
"""
new_block = """  const { data: statusSummary } = useJournalSummary({
    company_id: effectiveListCompanyId,
    period_id: periodFilter || undefined,
  });
"""
if old_block not in t:
    print("ERROR: deletedForCounts block not found", file=sys.stderr)
    sys.exit(1)
t = t.replace(old_block, new_block, 1)

old_counts = """  const statusCounts = useMemo(() => {
    const all = activeForCounts ?? [];
    return {
      all: all.length,
      DRAFT: all.filter((j) => j.status === "DRAFT").length,
      POSTED: all.filter((j) => j.status === "POSTED").length,
      REVERSED: all.filter((j) => j.status === "REVERSED").length,
      DELETED: (deletedForCounts ?? []).length,
    };
  }, [activeForCounts, deletedForCounts]);
"""
new_counts = """  const statusCounts = useMemo(() => {
    if (statusSummary) {
      return {
        all: statusSummary.all,
        DRAFT: statusSummary.DRAFT,
        POSTED: statusSummary.POSTED,
        REVERSED: statusSummary.REVERSED,
        DELETED: statusSummary.DELETED,
      };
    }
    const all = activeForCounts ?? [];
    return {
      all: all.length,
      DRAFT: all.filter((j) => j.status === "DRAFT").length,
      POSTED: all.filter((j) => j.status === "POSTED").length,
      REVERSED: all.filter((j) => j.status === "REVERSED").length,
      DELETED: 0,
    };
  }, [statusSummary, activeForCounts]);
"""
if old_counts not in t:
    print("ERROR: statusCounts block not found", file=sys.stderr)
    sys.exit(1)
t = t.replace(old_counts, new_counts, 1)

# numberById should not depend on deletedForCounts full list
old_map = """    for (const j of [...(activeForCounts ?? []), ...(deletedForCounts ?? []), ...(data ?? [])]) {
"""
new_map = """    for (const j of [...(activeForCounts ?? []), ...(data ?? [])]) {
"""
if old_map in t:
    t = t.replace(old_map, new_map, 1)

old_dep = "[activeForCounts, deletedForCounts, data]"
new_dep = "[activeForCounts, data]"
if old_dep in t:
    t = t.replace(old_dep, new_dep, 1)

if "deletedForCounts" in t:
    print("WARNING: deletedForCounts still referenced", file=sys.stderr)

path.write_text(t, encoding="utf-8")
print(f"OK applied summary to {path}")
