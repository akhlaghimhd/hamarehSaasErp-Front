/**
 * Safe surgical patch for journals-page.tsx
 * - column sort
 * - branch cell: company/branch NAME (not "بدون شعبه"/"شعبه")
 * - clearLocalDraft after successful save
 *
 * Usage:
 *   node scripts/patch-journals-sort-branch-draft.mjs
 *   node scripts/patch-journals-sort-branch-draft.mjs path/to/journals-page.tsx
 */
import fs from "fs";
import path from "path";

const target = path.resolve(
  process.argv[2] || "src/modules/finance/pages/journals-page.tsx"
);

if (!fs.existsSync(target)) {
  console.error("FILE NOT FOUND:", target);
  process.exit(1);
}

let t = fs.readFileSync(target, "utf8");
const before = t.length;

if (before < 50000) {
  console.error("ABORT: file too small (", before, ") — restore from git first");
  process.exit(1);
}
if (!t.includes("export function JournalsPage")) {
  console.error("ABORT: missing export function JournalsPage");
  process.exit(1);
}

function once(label, oldStr, newStr) {
  if (t.includes(newStr) && !t.includes(oldStr)) {
    console.log("SKIP (already applied):", label);
    return true;
  }
  const n = t.split(oldStr).length - 1;
  if (n === 0) {
    console.error("MISS:", label);
    return false;
  }
  if (n > 1) {
    console.error("AMBIGUOUS (", n, "):", label);
    return false;
  }
  t = t.replace(oldStr, newStr);
  console.log("OK:", label);
  return true;
}

let ok = true;

ok =
  once(
    "sort-state",
    "const [listPage, setListPage] = useState(1);\n  const [pageSize, setPageSize] = useState(15);",
    `const [listPage, setListPage] = useState(1);
  type JournalSortKey = "number" | "date" | "period" | "status" | "branch" | "desc" | "debit" | "credit";
  const [sortKey, setSortKey] = useState<JournalSortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  function toggleSort(key: JournalSortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "date" || key === "number" || key === "debit" || key === "credit" ? "desc" : "asc");
    }
  }
  const [pageSize, setPageSize] = useState(15);`
  ) && ok;

ok =
  once(
    "filtered-sort",
    `    if (dateFrom) list = list.filter((j) => (j.document_date ?? "").slice(0, 10) >= dateFrom);
    if (dateTo) list = list.filter((j) => (j.document_date ?? "").slice(0, 10) <= dateTo);
    return list;
  }, [data, search, dateFrom, dateTo]);`,
    `    if (dateFrom) list = list.filter((j) => (j.document_date ?? "").slice(0, 10) >= dateFrom);
    if (dateTo) list = list.filter((j) => (j.document_date ?? "").slice(0, 10) <= dateTo);
    const mul = sortDir === "asc" ? 1 : -1;
    list = [...list].sort((a, b) => {
      const num = (v: unknown) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      };
      let va: string | number = "";
      let vb: string | number = "";
      switch (sortKey) {
        case "number":
          va = a.entry_number ?? "";
          vb = b.entry_number ?? "";
          break;
        case "date":
          va = (a.document_date ?? "").slice(0, 10);
          vb = (b.document_date ?? "").slice(0, 10);
          break;
        case "period":
          va = a.period_id ?? "";
          vb = b.period_id ?? "";
          break;
        case "status":
          va = a.status ?? "";
          vb = b.status ?? "";
          break;
        case "branch":
          va = (a as { branch_id?: string | null }).branch_id ?? a.company_id ?? "";
          vb = (b as { branch_id?: string | null }).branch_id ?? b.company_id ?? "";
          break;
        case "desc":
          va = a.description ?? "";
          vb = b.description ?? "";
          break;
        case "debit":
          va = num((a as { total_debit?: number | string }).total_debit);
          vb = num((b as { total_debit?: number | string }).total_debit);
          break;
        case "credit":
          va = num((a as { total_credit?: number | string }).total_credit);
          vb = num((b as { total_credit?: number | string }).total_credit);
          break;
      }
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * mul;
      return String(va).localeCompare(String(vb), "fa") * mul;
    });
    return list;
  }, [data, search, dateFrom, dateTo, sortKey, sortDir]);`
  ) && ok;

ok =
  once(
    "reset-page-deps",
    "}, [statusFilter, periodFilter, dateFrom, dateTo, search, pageSize, listCompanyId]);",
    "}, [statusFilter, periodFilter, dateFrom, dateTo, search, pageSize, listCompanyId, sortKey, sortDir]);"
  ) && ok;

const headerMap = [
  [
    '{visibleCols.number !== false ? <th className="px-2 py-1 font-medium">شماره</th> : null}',
    `{visibleCols.number !== false ? (
                  <th className="px-2 py-1 font-medium">
                    <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("number")}>
                      شماره{sortKey === "number" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                    </button>
                  </th>
                ) : null}`,
  ],
  [
    '{visibleCols.date !== false ? <th className="px-2 py-1 font-medium">تاریخ</th> : null}',
    `{visibleCols.date !== false ? (
                  <th className="px-2 py-1 font-medium">
                    <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("date")}>
                      تاریخ{sortKey === "date" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                    </button>
                  </th>
                ) : null}`,
  ],
  [
    '{visibleCols.period !== false ? <th className="px-2 py-1 font-medium">دوره</th> : null}',
    `{visibleCols.period !== false ? (
                  <th className="px-2 py-1 font-medium">
                    <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("period")}>
                      دوره{sortKey === "period" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                    </button>
                  </th>
                ) : null}`,
  ],
  [
    '{visibleCols.status !== false ? <th className="px-2 py-1 font-medium">وضعیت</th> : null}',
    `{visibleCols.status !== false ? (
                  <th className="px-2 py-1 font-medium">
                    <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("status")}>
                      وضعیت{sortKey === "status" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                    </button>
                  </th>
                ) : null}`,
  ],
  [
    '{visibleCols.branch !== false ? <th className="px-2 py-1 font-medium">شعبه</th> : null}',
    `{visibleCols.branch !== false ? (
                  <th className="px-2 py-1 font-medium">
                    <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("branch")}>
                      شعبه{sortKey === "branch" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                    </button>
                  </th>
                ) : null}`,
  ],
  [
    '{visibleCols.desc !== false ? <th className="px-2 py-1 font-medium">شرح</th> : null}',
    `{visibleCols.desc !== false ? (
                  <th className="px-2 py-1 font-medium">
                    <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("desc")}>
                      شرح{sortKey === "desc" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                    </button>
                  </th>
                ) : null}`,
  ],
  [
    '{visibleCols.debit !== false ? <th className="px-2 py-1 font-medium min-w-[7rem] text-sky-800">بدهکار</th> : null}',
    `{visibleCols.debit !== false ? (
                  <th className="px-2 py-1 font-medium min-w-[7rem] text-sky-800">
                    <button type="button" className="inline-flex items-center gap-1 hover:text-sky-900" onClick={() => toggleSort("debit")}>
                      بدهکار{sortKey === "debit" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                    </button>
                  </th>
                ) : null}`,
  ],
  [
    '{visibleCols.credit !== false ? <th className="px-2 py-1 font-medium text-emerald-800">بستانکار</th> : null}',
    `{visibleCols.credit !== false ? (
                  <th className="px-2 py-1 font-medium text-emerald-800">
                    <button type="button" className="inline-flex items-center gap-1 hover:text-emerald-900" onClick={() => toggleSort("credit")}>
                      بستانکار{sortKey === "credit" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                    </button>
                  </th>
                ) : null}`,
  ],
];

for (const [oldH, newH] of headerMap) {
  ok = once("header:" + oldH.slice(0, 40), oldH, newH) && ok;
}

ok =
  once(
    "branch-company-name-maps",
    `branchNameById = useMemo(() => {
    const m = new Map();
    for (const b of allBranches ?? []) {
      const label = b.ref_code || b.name || b.code || b.branch_id.slice(0, 8);
      m.set(b.branch_id, label);
    }
    return m;
  }, [allBranches]);

  const postMut = usePostJournal();`,
    `branchNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const b of allBranches ?? []) {
      const label = b.name || b.ref_code || b.code || b.branch_id.slice(0, 8);
      m.set(b.branch_id, label);
    }
    return m;
  }, [allBranches]);

  const companyNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of companyOptions) {
      m.set(c.company_id, c.name || c.code || c.company_id.slice(0, 8));
    }
    return m;
  }, [companyOptions]);

  const postMut = usePostJournal();`
  ) && ok;

ok =
  once(
    "branch-cell",
    `(j as { branch_id?: string | null }).branch_id
                          ? (branchNameById.get((j as { branch_id: string }).branch_id) ?? "شعبه")
                          : "بدون شعبه"}`,
    `(j as { branch_id?: string | null }).branch_id
                          ? (branchNameById.get((j as { branch_id: string }).branch_id) ?? "—")
                          : (companyNameById.get(j.company_id) ?? "—")}`
  ) && ok;

ok =
  once(
    "clear-draft-after-save",
    `setDirty(false);
      setFormMode(null);
      await refetch();`,
    `setDirty(false);
      clearLocalDraft();
      setFormMode(null);
      await refetch();`
  ) && ok;

if (!t.includes("export function JournalsPage")) {
  console.error("ABORT WRITE: export lost");
  process.exit(1);
}
if (t.length < 50000) {
  console.error("ABORT WRITE: size collapsed");
  process.exit(1);
}
if (!ok) {
  console.error("Some patches MISS/AMBIGUOUS — file NOT written. Restore from git if unsure.");
  process.exit(1);
}

fs.writeFileSync(target, t, "utf8");
console.log("Done. before=", before, "after=", t.length, "delta=", t.length - before);
console.log("Target:", target);
