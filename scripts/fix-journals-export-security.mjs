/**
 * fix-journals-export-security.mjs
 * Usage (from repo root):
 *   git fetch origin
 *   git checkout develop
 *   git pull origin develop
 *   git checkout ba5b82b28ec10a05dd2cfbff5ecae11812cf7dcb -- src/modules/finance/pages/journals-page.tsx
 *   node scripts/fix-journals-export-security.mjs
 *   git add src/modules/finance/pages/journals-page.tsx
 *   git commit -m "fix(finance): remove journal form export; PDF only on saved list rows"
 *   git push origin develop
 */
import fs from "fs";
import path from "path";

const target = path.join(
  process.cwd(),
  "src/modules/finance/pages/journals-page.tsx"
);

if (!fs.existsSync(target)) {
  console.error("File not found:", target);
  process.exit(1);
}

let c = fs.readFileSync(target, "utf8");
console.log("Loaded bytes:", c.length);
if (c.length < 50000) {
  console.error(
    "File too small — restore from ba5b82b first:\n  git checkout ba5b82b28ec10a05dd2cfbff5ecae11812cf7dcb -- src/modules/finance/pages/journals-page.tsx"
  );
  process.exit(1);
}

// 1) Remove form Excel + PDF buttons (keep Close)
{
  const re =
    /<Button type="button" variant="outline" size="sm" className="h-8 shrink-0" onClick=\{\(\) => exportJournalExcel\(\)\} title="خروجی اکسل">[\s\S]*?<\/Button>\s*<Button type="button" variant="outline" size="sm" className="h-8 shrink-0" onClick=\{\(\) => exportJournalPdf\(\)\} title="خروجی PDF">[\s\S]*?<\/Button>\s*<div className="w-px h-5 bg-border mx-0\.5 shrink-0" aria-hidden \/>\s*/;
  const next = c.replace(re, "");
  if (next === c) {
    console.error("FAIL: form export buttons not found");
    process.exit(1);
  }
  c = next;
  console.log("OK: removed form export buttons");
}

// 2) Replace exportJournalExcel + exportJournalPdf with exportSavedJournalPdf
{
  const re =
    /  function exportJournalExcel\(\) \{[\s\S]*?  function exportJournalPdf\(\) \{[\s\S]*?  \}\n\n/;
  const fn = `  async function exportSavedJournalPdf(j: JournalEntryDto) {
    try {
      const full = await journalService.getById(j.journal_entry_id);
      const items = full.items ?? [];
      let debit = 0;
      let credit = 0;
      for (const it of items) {
        debit += Number(it.debit_amount || 0);
        credit += Number(it.credit_amount || 0);
      }
      const diff = Math.abs(debit - credit);
      const isBal = diff < 0.005;
      const companyName =
        companyNameById.get(full.company_id) ||
        (companies ?? []).find((x) => x.company_id === full.company_id)?.name ||
        authOrg?.tenant_name ||
        "—";
      const userLabel = authUser
        ? \`\${authUser.first_name ?? ""} \${authUser.last_name ?? ""}\`.trim() ||
          authUser.email ||
          authUser.mobile ||
          "—"
        : "—";
      const now = new Date().toLocaleString("fa-IR");
      const entryNo = full.entry_number ?? full.draft_number ?? null;
      const meta = {
        companyName,
        orgName: authOrg?.tenant_name ?? "—",
        entryNumber: entryNo,
        documentDate: full.document_date
          ? formatJalaliDate(full.document_date.slice(0, 10))
          : "—",
        periodLabel: periodLabel(full.period_id),
        userLabel: String(userLabel),
        exportedAt: now,
        description: full.description || "",
        isBalanced: isBal,
        totalDebit: debit,
        totalCredit: credit,
        totalDiff: diff,
      };
      const reportLines = items.map((it) => {
        const desc = it.description ?? "";
        return {
          accountLabel: accountLabel(it.account_id),
          description: desc,
          debit: Number(it.debit_amount || 0),
          credit: Number(it.credit_amount || 0),
          costCenterLabel: "",
          businessUnitLabel: "",
          isSystemBalance: isSystemBalanceDescription(desc),
        };
      });
      const html = buildJournalReportHtml(meta, reportLines).replace(
        "</body>",
        "<script>window.onload=function(){window.print();}</script></body>"
      );
      const w = window.open("", "_blank");
      if (!w) {
        toast.error("مرورگر پنجره چاپ را مسدود کرد.");
        return;
      }
      w.document.write(html);
      w.document.close();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خروجی PDF ممکن نشد");
    }
  }

`;
  const next = c.replace(re, fn);
  if (next === c) {
    console.error("FAIL: exportJournalExcel/Pdf functions not found");
    process.exit(1);
  }
  c = next;
  console.log("OK: exportSavedJournalPdf installed");
}

// 3) Row PDF button after openEdit
{
  const marker = 'onClick={() => void openEdit(j, j.status !== "DRAFT")}';
  const i = c.indexOf(marker);
  if (i < 0) {
    console.error("FAIL: openEdit marker not found");
    process.exit(1);
  }
  const j = c.indexOf("</Button>", i);
  if (j < 0) {
    console.error("FAIL: Button end not found");
    process.exit(1);
  }
  const insertAt = j + "</Button>".length;
  const pdfBtn = `
                        {!showDeleted ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2"
                            title="خروجی PDF سند ذخیره‌شده"
                            onClick={() => void exportSavedJournalPdf(j)}
                          >
                            <FileDown className="h-3.5 w-3.5" />
                          </Button>
                        ) : null}`;
  if (c.includes("exportSavedJournalPdf(j)")) {
    const nearby = c.slice(i, i + 800);
    if (nearby.includes("exportSavedJournalPdf(j)")) {
      console.log("OK: row PDF already present");
    } else {
      c = c.slice(0, insertAt) + pdfBtn + c.slice(insertAt);
      console.log("OK: row PDF button inserted");
    }
  } else {
    c = c.slice(0, insertAt) + pdfBtn + c.slice(insertAt);
    console.log("OK: row PDF button inserted");
  }
}

// 4) accountsFlat enabled for list
{
  const re =
    /enabled: formMode !== null && Boolean\(formCompanyId \|\| primaryCompanyId\),\n(\s*)companyId: formCompanyId \|\| primaryCompanyId \|\| undefined,/;
  const next = c.replace(
    re,
    "enabled: canView && Boolean(formCompanyId || listCompanyId || primaryCompanyId),\n$1companyId: formCompanyId || listCompanyId || primaryCompanyId || undefined,"
  );
  if (next !== c) {
    c = next;
    console.log("OK: accountsFlat enabled for list");
  } else {
    console.log("WARN: accountsFlat pattern not found (may already be updated)");
  }
}

// Final guards
if (c.includes("function exportJournalExcel")) {
  console.error("FAIL: exportJournalExcel still present");
  process.exit(1);
}
if (!c.includes("exportSavedJournalPdf")) {
  console.error("FAIL: exportSavedJournalPdf missing");
  process.exit(1);
}
if (c.includes('title="خروجی اکسل"')) {
  console.error("FAIL: form excel title still present");
  process.exit(1);
}

fs.writeFileSync(target, c, "utf8");
console.log("Wrote", target, "len=", c.length);
console.log("SUCCESS — now: git add / commit / push");
