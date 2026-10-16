# APPLY_JOURNALS_W3_BRANCH_INLINE.ps1
# FIN-HOLD-W3: optional branch selector on journal create form
# Run from hamarehSaasErp-Front root.

$ErrorActionPreference = "Stop"
$path = "src\modules\finance\pages\journals-page.tsx"
if (-not (Test-Path $path)) {
  throw "Not found: $path - cd to hamarehSaasErp-Front root first"
}

$t = [System.IO.File]::ReadAllText((Resolve-Path $path).Path)
$t = $t -replace "`r`n", "`n"

if ($t.Trim() -eq "PLACEHOLDER") {
  throw "File is PLACEHOLDER. Restore first with: git checkout 1dfc2e7b2d08aadb20570aebdecca4fa14a03fa3 -- src/modules/finance/pages/journals-page.tsx"
}
if ($t -match "formBranchId") {
  Write-Host "Already has formBranchId - skip."
  exit 0
}
if ($t -notmatch "export function JournalsPage") {
  throw "Unexpected journals-page content (no JournalsPage export)"
}

function Assert-Contains([string]$hay, [string]$needle, [string]$label) {
  if (-not $hay.Contains($needle)) { throw "Pattern not found: $label" }
}

# 1) import useBranches
$n1 = 'import { useCompanies } from "@/modules/organization/hooks/use-companies";'
Assert-Contains $t $n1 "useCompanies import"
$t = $t.Replace($n1, "import { useCompanies } from `"@/modules/organization/hooks/use-companies`";`nimport { useBranches } from `"@/modules/organization/hooks/use-branches`";")

# 2) formBranchId state
$n2 = '  const [formCompanyId, setFormCompanyId] = useState<string>("");'
Assert-Contains $t $n2 "formCompanyId state"
$t = $t.Replace($n2, "  const [formCompanyId, setFormCompanyId] = useState<string>(`"`");`n  /** FIN-HOLD-W3: optional branch for branch-series numbering; empty = company series */`n  const [formBranchId, setFormBranchId] = useState<string>(`"`");")

# 3) useBranches
$n3 = '  const activeFormCompanyId = formCompanyId || primaryCompanyId;'
Assert-Contains $t $n3 "activeFormCompanyId"
$t = $t.Replace($n3, "  const activeFormCompanyId = formCompanyId || primaryCompanyId;`n  const { data: formBranches } = useBranches(activeFormCompanyId || null, `"active`");`n  const branchOptions = formBranches ?? [];")

# 4) draft type + restore
$n4a = "formCompanyId?: string;`n          savedAt?: string;"
if ($t.Contains($n4a)) {
  $t = $t.Replace($n4a, "formCompanyId?: string;`n          formBranchId?: string;`n          savedAt?: string;")
} else {
  Write-Host "WARN: draft type block not found"
}

$n4b = '          if (d.formCompanyId) setFormCompanyId(d.formCompanyId);'
if ($t.Contains($n4b)) {
  $t = $t.Replace($n4b, "          if (d.formCompanyId) setFormCompanyId(d.formCompanyId);`n          if (d.formBranchId !== undefined) setFormBranchId(d.formBranchId || `"`");")
}

# 5) openNew clear branch
$n5 = "    setFormMode(`"new`");`n    setDocumentDate(todayIso());`n    setPeriodId(DEMO_PERIOD_ID);`n    setDescription(`"`");`n    setLines([emptyLine(), emptyLine()]);"
if ($t.Contains($n5)) {
  $t = $t.Replace($n5, "    setFormMode(`"new`");`n    setDocumentDate(todayIso());`n    setPeriodId(DEMO_PERIOD_ID);`n    setDescription(`"`");`n    setFormBranchId(`"`");`n    setLines([emptyLine(), emptyLine()]);")
} else {
  Write-Host "WARN: openNew block not found"
}

# 6) persist draft
$n6 = '            formCompanyId: formCompanyId || primaryCompanyId,'
if ($t.Contains($n6)) {
  $t = $t.Replace($n6, "            formCompanyId: formCompanyId || primaryCompanyId,`n            formBranchId: formBranchId || `"`",")
}

# 7) deps
if ($t.Contains("formCompanyId,`n    periodId,")) {
  $t = $t.Replace("formCompanyId,`n    periodId,", "formCompanyId,`n    formBranchId,`n    periodId,")
} elseif ($t.Contains("formCompanyId,`n  ]")) {
  $t = $t.Replace("formCompanyId,`n  ]", "formCompanyId,`n    formBranchId,`n  ]")
}

# 8) openEdit
$n8 = '    if (j.company_id) setFormCompanyId(j.company_id);'
if ($t.Contains($n8)) {
  $t = $t.Replace($n8, "    if (j.company_id) setFormCompanyId(j.company_id);`n    setFormBranchId((j as { branch_id?: string | null }).branch_id || `"`");")
}
$n8b = "      setEntryNumber(full.entry_number ?? null);`n      setDirty(false);"
if ($t.Contains($n8b)) {
  $t = $t.Replace($n8b, "      setEntryNumber(full.entry_number ?? null);`n      setFormBranchId((full as { branch_id?: string | null }).branch_id || `"`");`n      setDirty(false);")
}

# 9) createDraft
$n9 = "        const created = await journalService.createDraft({`n          company_id: formCompanyId || primaryCompanyId,`n          period_id: periodId,"
Assert-Contains $t $n9 "createDraft payload"
$t = $t.Replace($n9, "        const created = await journalService.createDraft({`n          company_id: formCompanyId || primaryCompanyId,`n          branch_id: formBranchId || undefined,`n          period_id: periodId,")

# 10) company onChange
$n10 = "                onChange={(e) => {`n                  markDirty();`n                  setFormCompanyId(e.target.value);`n                }}"
if ($t.Contains($n10)) {
  $t = $t.Replace($n10, "                onChange={(e) => {`n                  markDirty();`n                  setFormCompanyId(e.target.value);`n                  setFormBranchId(`"`");`n                }}")
} else {
  Write-Host "WARN: form company onChange not found"
}

# 11) UI insert before first ShamsiDatePicker
$picker = "<ShamsiDatePicker"
$idx = $t.IndexOf($picker)
if ($idx -lt 0) { throw "ShamsiDatePicker not found" }
$divStart = $t.LastIndexOf('          <div className="space-y-1">', $idx)
if ($divStart -lt 0) { throw "date field div not found before ShamsiDatePicker" }

$branchUi = @'
          <div className="space-y-1 min-w-[160px]">
            <label className="text-xs text-muted-foreground">شعبه (اختیاری)</label>
            {formMode === "new" && !viewOnly ? (
              <select
                className="h-9 w-full min-w-[160px] rounded-md border bg-background px-2 text-sm"
                value={formBranchId}
                onChange={(e) => {
                  markDirty();
                  setFormBranchId(e.target.value);
                }}
              >
                <option value="">بدون شعبه - سری شرکت</option>
                {branchOptions.map((b) => (
                  <option key={b.branch_id} value={b.branch_id}>
                    {b.name || b.branch_id.slice(0, 8)}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex h-9 items-center px-1 text-xs text-muted-foreground">
                {formBranchId
                  ? branchOptions.find((b) => b.branch_id === formBranchId)?.name ||
                    formBranchId.slice(0, 8)
                  : "-"}
              </div>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">تاریخ سند</label>
            <ShamsiDatePicker
'@
$branchUi = $branchUi -replace "`r`n", "`n"
$t = $t.Substring(0, $divStart) + $branchUi + $t.Substring($idx + $picker.Length)

$utf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText((Resolve-Path $path).Path, $t, $utf8)

Write-Host "--- verify ---"
Select-String -Path $path -Pattern "formBranchId|useBranches|branch_id: formBranchId" |
  ForEach-Object {
    $line = $_.Line.Trim()
    if ($line.Length -gt 90) { $line = $line.Substring(0, 90) }
    "{0}:{1}" -f $_.LineNumber, $line
  }

if (-not (Select-String -Path $path -Pattern "formBranchId" -Quiet)) {
  throw "Patch failed: formBranchId still missing"
}
Write-Host "OK"
Write-Host "Next:"
Write-Host "  git add src/modules/finance/pages/journals-page.tsx"
Write-Host '  git commit -m "feat(finance): FIN-HOLD-W3 journal form optional branch selector for branch series numbering"'
