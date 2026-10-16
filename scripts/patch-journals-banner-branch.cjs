const fs = require("fs");
const path = process.argv[2] || "src/modules/finance/pages/journals-page.tsx";
let t = fs.readFileSync(path, "utf8");

const BANNER_BLOCK = `      {(isTechnicalOwnerReadOnly || isGroupObserver) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-900">
          دسترسی شما در این سطح فقط مشاهده و گزارش است؛ ثبت یا ویرایش سند روی شرکت‌های زیرمجموعه مجاز نیست.
        </div>
      )}`;

const parts = t.split(BANNER_BLOCK);
if (parts.length > 2) {
  t = parts[0] + BANNER_BLOCK + parts.slice(1).join("");
  console.log("collapsed banners to 1");
} else {
  console.log("banner parts", parts.length);
}

t = t.replace(
  /\{toFaDigits\(filtered\.length\)\} سند\s*\n\s*\{?\(isTechnicalOwnerReadOnly[\s\S]*?\}\)\s*\{selectedIds\.length > 0 \? \(/,
  `{toFaDigits(filtered.length)} سند\n              {selectedIds.length > 0 ? (`
);

if (!t.includes("useAllBranches")) {
  t = t.replace(
    'import { useBranches } from "@/modules/organization/hooks/use-branches";',
    'import { useBranches, useAllBranches } from "@/modules/organization/hooks/use-branches";'
  );
}
if (!t.includes("branchNameById")) {
  t = t.replace(
    "  const branchOptions = formBranches ?? [];",
    `  const branchOptions = formBranches ?? [];
  const { data: allBranches } = useAllBranches("active");
  const branchNameById = useMemo(() => {
    const m = new Map();
    for (const b of allBranches ?? []) {
      const label = b.ref_code || b.name || b.code || b.branch_id.slice(0, 8);
      m.set(b.branch_id, label);
    }
    return m;
  }, [allBranches]);`
  );
}

t = t.replace(
  "return { number: true, date: true, period: true, status: true, desc: true, debit: true, credit: true, actions: true };",
  "return { number: true, date: true, period: true, status: true, branch: true, desc: true, debit: true, credit: true, actions: true };"
);
t = t.replace(
  "...{ number: true, date: true, period: true, status: true, desc: true, debit: true, credit: true, actions: true }, ...JSON.parse(raw) };",
  "...{ number: true, date: true, period: true, status: true, branch: true, desc: true, debit: true, credit: true, actions: true }, ...JSON.parse(raw) };"
);

if (!t.includes('["branch", "شعبه"]')) {
  t = t.replace(
    '["status", "وضعیت"],\n                  ["desc", "شرح"],',
    '["status", "وضعیت"],\n                  ["branch", "شعبه"],\n                  ["desc", "شرح"],'
  );
}

if (!t.includes('visibleCols.branch !== false ? <th')) {
  t = t.replace(
    '{visibleCols.status !== false ? <th className="px-2 py-1 font-medium">وضعیت</th> : null}\n                {visibleCols.desc !== false ? <th className="px-2 py-1 font-medium">شرح</th> : null}',
    '{visibleCols.status !== false ? <th className="px-2 py-1 font-medium">وضعیت</th> : null}\n                {visibleCols.branch !== false ? <th className="px-2 py-1 font-medium">شعبه</th> : null}\n                {visibleCols.desc !== false ? <th className="px-2 py-1 font-medium">شرح</th> : null}'
  );
}

if (!t.includes("branchNameById.get")) {
  const needle = `{statusLabel[j.status] ?? j.status}
                        </span>
                      </td>
                    ) : null}
                    {visibleCols.desc !== false ? (`;
  const insert = `{statusLabel[j.status] ?? j.status}
                        </span>
                      </td>
                    ) : null}
                    {visibleCols.branch !== false ? (
                      <td className="px-2 py-1 text-xs max-w-[120px] truncate">
                        {(j as { branch_id?: string | null }).branch_id
                          ? (branchNameById.get((j as { branch_id: string }).branch_id) ?? "شعبه")
                          : "بدون شعبه"}
                      </td>
                    ) : null}
                    {visibleCols.desc !== false ? (`;
  if (t.includes(needle)) {
    t = t.replace(needle, insert);
    console.log("branch cell inserted");
  } else {
    console.log("WARN: branch cell needle not found");
  }
}

fs.writeFileSync(path, t);
console.log("written", path, "banners", (t.match(/دسترسی شما در این سطح فقط مشاهده/g) || []).length);
