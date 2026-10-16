#!/usr/bin/env node
/**
 * Patch journals-page.tsx for FIN-HOLD operate UX:
 * - only operable companies in create form
 * - single read-only banner
 * - pass companyId to useAccountFlat
 * - hide create when no operable company
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname, "../src/modules/finance/pages/journals-page.tsx");
let s = fs.readFileSync(file, "utf8");
const size0 = s.length;
if (size0 < 50000) {
  console.error("journals-page.tsx too small:", size0, "- restore full file first");
  process.exit(1);
}

function once(label, from, to) {
  if (!s.includes(from)) {
    console.warn("SKIP", label, "- pattern not found");
    return false;
  }
  s = s.replace(from, to);
  console.log("OK", label);
  return true;
}

// 1) operable company list
once(
  "operableCompanyOptions",
  `  const companyOptions = companies ?? [];\n  const multiCompany = companyOptions.length > 1;\n  const [listCompanyId, setListCompanyId] = useState<string>("");\n  const [formCompanyId, setFormCompanyId] = useState<string>("");`,
  `  const companyOptions = companies ?? [];\n  const multiCompany = companyOptions.length > 1;\n  const operableCompanyOptions = useMemo(\n    () => companyOptions.filter((c) => canOperateCompany(c.company_id)),\n    [companyOptions, canOperateCompany]\n  );\n  const defaultOperateCompanyId = operableCompanyOptions[0]?.company_id ?? "";\n  const canCreateOnAny = operableCompanyOptions.length > 0;\n  const [listCompanyId, setListCompanyId] = useState<string>("");\n  const [formCompanyId, setFormCompanyId] = useState<string>("");`
);

// 2) form default company = operable only
once(
  "formDefaultEffect",
  `  useEffect(() => {\n    if (!companyOptions.length) return;\n    if (!multiCompany) {\n      const only = companyOptions[0]?.company_id ?? primaryCompanyId;\n      setListCompanyId(only);\n      setFormCompanyId((prev) => prev || only);\n      return;\n    }\n    // parent: default list = all (""); form default = primary\n    setFormCompanyId((prev) => prev || primaryCompanyId || companyOptions[0]?.company_id || "");\n  }, [companies, multiCompany, primaryCompanyId]);`,
  `  useEffect(() => {\n    if (!companyOptions.length) return;\n    if (!multiCompany) {\n      const only = companyOptions[0]?.company_id ?? primaryCompanyId;\n      setListCompanyId(only);\n      setFormCompanyId((prev) => {\n        if (prev && canOperateCompany(prev)) return prev;\n        return canOperateCompany(only) ? only : defaultOperateCompanyId;\n      });\n      return;\n    }\n    setFormCompanyId((prev) => {\n      if (prev && canOperateCompany(prev)) return prev;\n      return defaultOperateCompanyId;\n    });\n  }, [companies, multiCompany, primaryCompanyId, defaultOperateCompanyId, canOperateCompany]);`
);

// 3) accounts by company
once(
  "useAccountFlat",
  `const { data: accountsFlat } = useAccountFlat({ enabled: formMode !== null });`,
  `const { data: accountsFlat } = useAccountFlat({\n    enabled: formMode !== null && Boolean(formCompanyId || primaryCompanyId),\n    companyId: formCompanyId || primaryCompanyId || undefined,\n  });`
);

// 4) openNew guard
once(
  "openNewGuard",
  `function openNew() {\n    setViewOnly(false);`,
  `function openNew() {\n    if (!canCreateOnAny) {\n      setFormError("no-operate-company");\n      return;\n    }\n    setViewOnly(false);`
);

// 5) remove ALL old triple banners (same block)
const oldBanner =
  `      {(isTechnicalOwnerReadOnly || isGroupObserver) && (\n        <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-900">\n          \u062f\u0633\u062a\u0631\u0633\u06cc \u0634\u0645\u0627 \u062f\u0631 \u0627\u06cc\u0646 \u0633\u0637\u062d \u0641\u0642\u0637 \u0645\u0634\u0627\u0647\u062f\u0647 \u0648 \u06af\u0632\u0627\u0631\u0634 \u0627\u0633\u062a\u061b \u062b\u0628\u062a \u06cc\u0627 \u0648\u06cc\u0631\u0627\u06cc\u0634 \u0633\u0646\u062f \u0631\u0648\u06cc \u0634\u0631\u06a9\u062a\u200c\u0647\u0627\u06cc \u0632\u06cc\u0631\u0645\u062c\u0645\u0648\u0639\u0647 \u0645\u062c\u0627\u0632 \u0646\u06cc\u0633\u062a.\n        </div>\n      )}`;
// Also match without unicode escapes if file already has Persian
const oldBannerFa = `{(isTechnicalOwnerReadOnly || isGroupObserver) && (`;
let removed = 0;
while (s.includes(oldBannerFa)) {
  // remove from condition start through closing )}
  const i = s.indexOf(oldBannerFa);
  const j = s.indexOf(")}", i);
  if (j < 0) break;
  // include leading whitespace/newline
  let start = i;
  while (start > 0 && (s[start - 1] === " " || s[start - 1] === "\n")) start--;
  s = s.slice(0, start) + s.slice(j + 2);
  removed++;
}
console.log("OK removed banners", removed);

// inject single banner after PageHeader self-close near FileText icon
const injectNeedle = `icon={<FileText className="h-4 w-4" />}`;
const inj = s.indexOf(injectNeedle);
if (inj >= 0 && !s.includes("canCreateOnAny) && (")) {
  const end = s.indexOf("/>", inj);
  if (end > 0) {
    const single =
      `\n\n      {(isTechnicalOwnerReadOnly || isGroupObserver || !canCreateOnAny) && (\n        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">\n          read-only: need company-operator scope to create journals.\n        </div>\n      )}`;
    s = s.slice(0, end + 2) + single + s.slice(end + 2);
    console.log("OK single banner");
  }
}

// 6) gate create buttons
s = s.replaceAll(
  `{canCreate ? (\n              <Button type="button" size="sm" className="h-8" onClick={openNew}>`,
  `{canCreate && canCreateOnAny ? (\n              <Button type="button" size="sm" className="h-8" onClick={openNew}>`
);
s = s.replaceAll(
  `{!showDeleted && canCreate ? (\n              <Button size="sm" onClick={openNew}>`,
  `{!showDeleted && canCreate && canCreateOnAny ? (\n              <Button size="sm" onClick={openNew}>`
);
console.log("OK create gates");

// 7) form company select options = operable only
once(
  "formSelect",
  `value={formCompanyId || primaryCompanyId}\n                onChange={(e) => {\n                  markDirty();\n                  setFormCompanyId(e.target.value);\n                  setFormBranchId("");\n                }\n              >\n                {companyOptions.map((c) => (`,
  `value={formCompanyId || defaultOperateCompanyId}\n                onChange={(e) => {\n                  markDirty();\n                  setFormCompanyId(e.target.value);\n                  setFormBranchId("");\n                }}\n                disabled={viewOnly || operableCompanyOptions.length <= 1}\n              >\n                {operableCompanyOptions.map((c) => (`
);

fs.writeFileSync(file, s, "utf8");
console.log("Done. size", size0, "->", s.length);
console.log("canCreateOnAny", (s.match(/canCreateOnAny/g) || []).length);
console.log("operableCompanyOptions", (s.match(/operableCompanyOptions/g) || []).length);
