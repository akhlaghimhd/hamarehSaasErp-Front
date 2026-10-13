#!/usr/bin/env python3
"""Apply journals list load-perf: fewer queries, defer accounts/CC/BU until form open."""
from pathlib import Path
import sys
root = Path(__file__).resolve().parents[1]
path = root / "src/modules/finance/pages/journals-page.tsx"
t = path.read_text(encoding="utf-8")
if "needsSeparateList" in t and "enabled: formMode !== null" in t:
    print("already applied")
    sys.exit(0)

old = '''  const { data, isLoading, error, refetch } = useJournals(filters);
  /** شمارنده‌ها باید از کل (غیرحذف‌شده) باشند نه از فیلتر وضعیت فعلی */
  const { data: activeForCounts } = useJournals({
    company_id: effectiveListCompanyId,
    period_id: periodFilter || undefined,
  });
  const { data: deletedForCounts } = useJournals({
    company_id: effectiveListCompanyId,
    deleted: true,
  });
  const { data: accountsFlat } = useAccountFlat();

  const [costCenters, setCostCenters] = useState<CostCenterDto[]>([]);
  const [businessUnits, setBusinessUnits] = useState<BusinessUnitDto[]>([]);
  const activeFormCompanyId = formCompanyId || primaryCompanyId;
  useEffect(() => {
    if (!activeFormCompanyId) return;
    void costCenterService.list(activeFormCompanyId).then(setCostCenters).catch(() => setCostCenters([]));
    void businessUnitService.list().then(setBusinessUnits).catch(() => setBusinessUnits([]));
  }, [activeFormCompanyId]);
'''

new = '''  /** one base list for counts; filtered list only when status/deleted needed */
  const baseListFilters = useMemo(
    () => ({
      company_id: effectiveListCompanyId,
      period_id: periodFilter || undefined,
    }),
    [effectiveListCompanyId, periodFilter]
  );
  const needsSeparateList = Boolean(statusFilter) || showDeleted;
  const { data: activeForCounts, isLoading: loadingActive, error: errorActive, refetch: refetchActive } =
    useJournals(baseListFilters);
  const { data: filteredList, isLoading: loadingFiltered, error: errorFiltered, refetch: refetchFiltered } =
    useJournals(filters, { enabled: needsSeparateList });
  const { data: deletedForCounts } = useJournals(
    { company_id: effectiveListCompanyId, deleted: true },
    { enabled: true }
  );
  const data = needsSeparateList ? filteredList : activeForCounts;
  const isLoading = needsSeparateList ? loadingFiltered : loadingActive;
  const error = needsSeparateList ? errorFiltered : errorActive;
  const refetch = needsSeparateList ? refetchFiltered : refetchActive;

  const [costCenters, setCostCenters] = useState<CostCenterDto[]>([]);
  const [businessUnits, setBusinessUnits] = useState<BusinessUnitDto[]>([]);
  const activeFormCompanyId = formCompanyId || primaryCompanyId;
'''

if old not in t:
    print("ERROR: query block not found", file=sys.stderr)
    sys.exit(1)
t = t.replace(old, new, 1)

needle = 'const [formMode, setFormMode] = useState<"new" | string | null>(null);'
if needle not in t:
    print("ERROR: formMode decl not found", file=sys.stderr)
    sys.exit(1)
if "enabled: formMode !== null" not in t:
    insert = needle + '''
  useEffect(() => {
    if (formMode === null || !activeFormCompanyId) return;
    void costCenterService.list(activeFormCompanyId).then(setCostCenters).catch(() => setCostCenters([]));
    void businessUnitService.list().then(setBusinessUnits).catch(() => setBusinessUnits([]));
  }, [formMode, activeFormCompanyId]);
  const { data: accountsFlat } = useAccountFlat({ enabled: formMode !== null });
'''
    t = t.replace(needle, insert, 1)

if "function journalTotals" not in t:
    old_sum = '''function sumLines(
  items: Array<{ debit_amount?: number | string; credit_amount?: number | string }> | undefined
) {
  let d = 0;
  let c = 0;
  for (const i of items ?? []) {
    d += Number(i.debit_amount || 0);
    c += Number(i.credit_amount || 0);
  }
  return { debit: d, credit: c };
}
'''
    new_sum = old_sum + '''
function journalTotals(j: JournalEntryDto): { debit: number; credit: number } {
  const any = j as JournalEntryDto & {
    items_debit_sum?: number | string | null;
    items_credit_sum?: number | string | null;
  };
  if (any.items_debit_sum != null || any.items_credit_sum != null) {
    return { debit: Number(any.items_debit_sum || 0), credit: Number(any.items_credit_sum || 0) };
  }
  return sumLines(j.items as JournalItemDto[] | undefined);
}
'''
    if old_sum not in t:
        print("ERROR: sumLines not found", file=sys.stderr)
        sys.exit(1)
    t = t.replace(old_sum, new_sum, 1)
    t = t.replace("sumLines(j.items as JournalItemDto[] | undefined)", "journalTotals(j)")

path.write_text(t, encoding="utf-8")
print(f"OK wrote {path} bytes={path.stat().st_size}")
