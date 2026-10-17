/**
 * Safe surgical patch for journals-page.tsx
 * node scripts/patch-journals-sort-branch-draft.mjs [path]
 */
import fs from "fs";
import path from "path";

const target = path.resolve(process.argv[2] || "src/modules/finance/pages/journals-page.tsx");
if (!fs.existsSync(target)) {
  console.error("FILE NOT FOUND:", target);
  process.exit(1);
}

const raw = fs.readFileSync(target, "utf8");
const before = raw.length;
const usedCrlf = (raw.match(/\r\n/g) || []).length > (raw.match(/[^\r]\n/g) || []).length / 2;
let t = raw.replace(/\r\n/g, "\n");

if (before < 50000 || !t.includes("export function JournalsPage")) {
  console.error("ABORT: file too small or missing JournalsPage export");
  process.exit(1);
}

function reOnce(label, regex, replacement, doneMarker) {
  if (doneMarker && t.includes(doneMarker)) {
    console.log("SKIP (already):", label);
    return true;
  }
  if (!regex.test(t)) {
    console.error("MISS:", label);
    const hints = {
      "sort-state": "const [listPage, setListPage]",
      "filtered-sort": "if (dateFrom) list = list.filter",
      "branch-company-name-maps": "branchNameById = useMemo",
      "branch-cell": '?? "شعبه"',
      "clear-draft-after-save": "await refetch();",
    };
    const hint = hints[label];
    if (hint) {
      const i = t.indexOf(hint);
      if (i >= 0) console.error("  near:", JSON.stringify(t.slice(Math.max(0, i - 20), i + 140)));
      else console.error("  hint missing:", hint);
    }
    return false;
  }
  regex.lastIndex = 0;
  t = t.replace(regex, replacement);
  console.log("OK:", label);
  return true;
}

let ok = true;

ok =
  reOnce(
    "sort-state",
    /const \[listPage, setListPage\] = useState\(1\);\n(?:[ \t]*\n)*[ \t]*const \[pageSize, setPageSize\] = useState\(15\);/,
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
  const [pageSize, setPageSize] = useState(15);`,
    "type JournalSortKey"
  ) && ok;

ok =
  reOnce(
    "filtered-sort",
    /if \(dateFrom\) list = list\.filter\(\(j\) => \(j\.document_date \?\? ""\)\.slice\(0, 10\) >= dateFrom\);\n[ \t]*if \(dateTo\) list = list\.filter\(\(j\) => \(j\.document_date \?\? ""\)\.slice\(0, 10\) <= dateTo\);\n[ \t]*return list;\n[ \t]*\}, \[data, search, dateFrom, dateTo\]\);/,
    `if (dateFrom) list = list.filter((j) => (j.document_date ?? "").slice(0, 10) >= dateFrom);
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
  }, [data, search, dateFrom, dateTo, sortKey, sortDir]);`,
    "sortKey, sortDir]);"
  ) && ok;

ok =
  reOnce(
    "reset-page-deps",
    /\}, \[statusFilter, periodFilter, dateFrom, dateTo, search, pageSize, listCompanyId\]\);/,
    "}, [statusFilter, periodFilter, dateFrom, dateTo, search, pageSize, listCompanyId, sortKey, sortDir]);",
    "listCompanyId, sortKey, sortDir]"
  ) && ok;

function headerPlain(col, label, className) {
  const plain = `{visibleCols.${col} !== false ? <th className="${className}">${label}</th> : null}`;
  const rich = `{visibleCols.${col} !== false ? (
                  <th className="${className}">
                    <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("${col}")}>
                      ${label}{sortKey === "${col}" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                    </button>
                  </th>
                ) : null}`;
  return reOnce(
    "header:" + col,
    new RegExp(plain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    rich,
    `toggleSort("${col}")`
  );
}

ok = headerPlain("number", "شماره", "px-2 py-1 font-medium") && ok;
ok = headerPlain("date", "تاریخ", "px-2 py-1 font-medium") && ok;
ok = headerPlain("period", "دوره", "px-2 py-1 font-medium") && ok;
ok = headerPlain("status", "وضعیت", "px-2 py-1 font-medium") && ok;
ok = headerPlain("branch", "شعبه", "px-2 py-1 font-medium") && ok;
ok = headerPlain("desc", "شرح", "px-2 py-1 font-medium") && ok;

ok =
  reOnce(
    "header:debit",
    /\{visibleCols\.debit !== false \? <th className="px-2 py-1 font-medium min-w-\[7rem\] text-sky-800">بدهکار<\/th> : null\}/,
    `{visibleCols.debit !== false ? (
                  <th className="px-2 py-1 font-medium min-w-[7rem] text-sky-800">
                    <button type="button" className="inline-flex items-center gap-1 hover:text-sky-900" onClick={() => toggleSort("debit")}>
                      بدهکار{sortKey === "debit" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                    </button>
                  </th>
                ) : null}`,
    'toggleSort("debit")'
  ) && ok;

ok =
  reOnce(
    "header:credit",
    /\{visibleCols\.credit !== false \? <th className="px-2 py-1 font-medium text-emerald-800">بستانکار<\/th> : null\}/,
    `{visibleCols.credit !== false ? (
                  <th className="px-2 py-1 font-medium text-emerald-800">
                    <button type="button" className="inline-flex items-center gap-1 hover:text-emerald-900" onClick={() => toggleSort("credit")}>
                      بستانکار{sortKey === "credit" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                    </button>
                  </th>
                ) : null}`,
    'toggleSort("credit")'
  ) && ok;

ok =
  reOnce(
    "branch-company-name-maps",
    /branchNameById = useMemo\(\(\) => \{\n[ \t]*const m = new Map(?:<string, string>)?\(\);\n[ \t]*for \(const b of allBranches \?\? \[\]\) \{\n[ \t]*const label = b\.(?:ref_code \|\| b\.name|name \|\| b\.ref_code) \|\| b\.code \|\| b\.branch_id\.slice\(0, 8\);\n[ \t]*m\.set\(b\.branch_id, label\);\n[ \t]*\}\n[ \t]*return m;\n[ \t]*\}, \[allBranches\]\);\n\n[ \t]*const postMut = usePostJournal\(\);/,
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

  const postMut = usePostJournal();`,
    "companyNameById = useMemo"
  ) && ok;

ok =
  reOnce(
    "branch-cell",
    /\(j as \{ branch_id\?: string \| null \}\)\.branch_id\n[ \t]*\? \(branchNameById\.get\(\(j as \{ branch_id: string \}\)\.branch_id\) \?\? "شعبه"\)\n[ \t]*: "بدون شعبه"\}/,
    `(j as { branch_id?: string | null }).branch_id
                          ? (branchNameById.get((j as { branch_id: string }).branch_id) ?? "—")
                          : (companyNameById.get(j.company_id) ?? "—")}`,
    "companyNameById.get(j.company_id)"
  ) && ok;

ok =
  reOnce(
    "clear-draft-after-save",
    /setDirty\(false\);\n[ \t]*(?:clearLocalDraft\(\);\n[ \t]*)?setFormMode\(null\);\n[ \t]*await refetch\(\);/,
    `setDirty(false);
      clearLocalDraft();
      setFormMode(null);
      await refetch();`,
    "clearLocalDraft();\n      setFormMode(null);\n      await refetch()"
  ) && ok;

if (!t.includes("export function JournalsPage") || t.length < 50000) {
  console.error("ABORT WRITE: integrity check failed");
  process.exit(1);
}
if (!ok) {
  console.error("Some patches MISS — file NOT written.");
  process.exit(1);
}

const out = usedCrlf ? t.replace(/\n/g, "\r\n") : t;
fs.writeFileSync(target, out, "utf8");
console.log("Done. before=", before, "after=", out.length, "delta=", out.length - before);
