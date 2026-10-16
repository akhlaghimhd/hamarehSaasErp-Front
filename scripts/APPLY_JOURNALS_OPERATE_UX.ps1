# APPLY_JOURNALS_OPERATE_UX.ps1
# Run from hamarehSaasErp-Front root:
#   powershell -ExecutionPolicy Bypass -File scripts/APPLY_JOURNALS_OPERATE_UX.ps1
$ErrorActionPreference = "Stop"
$path = "src\modules\finance\pages\journals-page.tsx"
if (-not (Test-Path $path)) { throw "File not found: $path" }
$len = (Get-Item $path).Length
if ($len -lt 80000) { throw "journals-page.tsx is too small ($len). Restore full file first." }

$utf8 = New-Object System.Text.UTF8Encoding $false
$c = [System.IO.File]::ReadAllText((Resolve-Path $path), $utf8)

$old1 = @'
  const companyOptions = companies ?? [];
  const multiCompany = companyOptions.length > 1;
  const [listCompanyId, setListCompanyId] = useState<string>("");
  const [formCompanyId, setFormCompanyId] = useState<string>("");
  /** FIN-HOLD-W3: optional branch for branch-series numbering; empty = company series */
  const [formBranchId, setFormBranchId] = useState<string>("");

  useEffect(() => {
    if (!companyOptions.length) return;
    if (!multiCompany) {
      const only = companyOptions[0]?.company_id ?? primaryCompanyId;
      setListCompanyId(only);
      setFormCompanyId((prev) => prev || only);
      return;
    }
    // parent: default list = all (""); form default = primary
    setFormCompanyId((prev) => prev || primaryCompanyId || companyOptions[0]?.company_id || "");
  }, [companies, multiCompany, primaryCompanyId]);
'@

$new1 = @'
  const companyOptions = companies ?? [];
  const multiCompany = companyOptions.length > 1;
  /** Create form: only companies actor can OPERATE (FIN-HOLD). List filter stays all readable. */
  const operableCompanyOptions = useMemo(
    () => companyOptions.filter((c) => canOperateCompany(c.company_id)),
    [companyOptions, canOperateCompany]
  );
  const defaultOperateCompanyId = operableCompanyOptions[0]?.company_id ?? "";
  const canCreateOnAny = operableCompanyOptions.length > 0;
  const [listCompanyId, setListCompanyId] = useState<string>("");
  const [formCompanyId, setFormCompanyId] = useState<string>("");
  /** FIN-HOLD-W3: optional branch for branch-series numbering; empty = company series */
  const [formBranchId, setFormBranchId] = useState<string>("");

  useEffect(() => {
    if (!companyOptions.length) return;
    if (!multiCompany) {
      const only = companyOptions[0]?.company_id ?? primaryCompanyId;
      setListCompanyId(only);
      if (canOperateCompany(only)) {
        setFormCompanyId((prev) => prev || only);
      } else {
        setFormCompanyId(defaultOperateCompanyId);
      }
      return;
    }
    setFormCompanyId((prev) => {
      if (prev && canOperateCompany(prev)) return prev;
      return defaultOperateCompanyId;
    });
  }, [companies, multiCompany, primaryCompanyId, defaultOperateCompanyId, canOperateCompany]);
'@

if ($c.Contains($old1)) {
  $c = $c.Replace($old1, $new1)
  Write-Host "OK 1: operableCompanyOptions"
} elseif ($c.Contains("operableCompanyOptions")) {
  Write-Host "SKIP 1: already applied"
} else {
  throw "BLOCK1 not found"
}

if ($c -match 'operableCompanyOptions\.map') {
  Write-Host "SKIP 2: form select already operable"
} else {
  $old2 = @'
value={formCompanyId || primaryCompanyId}
                onChange={(e) => {
                  markDirty();
                  setFormCompanyId(e.target.value);
                  setFormBranchId("");
                }}
              >
                {companyOptions.map((c) => (
                  <option key={c.company_id} value={c.company_id}>
                    {(c as { name?: string; legal_name?: string }).name || (c as { legal_name?: string }).legal_name || c.company_id.slice(0, 8)}
                  </option>
                ))}
              </select>
'@
  $new2 = @'
value={formCompanyId || defaultOperateCompanyId}
                disabled={viewOnly || operableCompanyOptions.length <= 1}
                onChange={(e) => {
                  markDirty();
                  setFormCompanyId(e.target.value);
                  setFormBranchId("");
                }}
              >
                {operableCompanyOptions.length === 0 ? (
                  <option value="">شرکت قابل ثبت ندارید</option>
                ) : (
                  operableCompanyOptions.map((c) => (
                    <option key={c.company_id} value={c.company_id}>
                      {(c as { name?: string; legal_name?: string }).name || (c as { legal_name?: string }).legal_name || c.company_id.slice(0, 8)}
                    </option>
                  ))
                )}
              </select>
'@
  if ($c.Contains($old2)) {
    $c = $c.Replace($old2, $new2)
    Write-Host "OK 2: form select"
  } else {
    throw "BLOCK2 form select not found"
  }
}

if ($c.Contains('if (!canCreateOnAny)')) {
  Write-Host "SKIP 3: openNew guard exists"
} else {
  $old3 = "  function openNew() {`n    setViewOnly(false);"
  $new3 = "  function openNew() {`n    if (!canCreateOnAny) {`n      setFormError(\"شما برای هیچ شرکتی مجوز ثبت سند ندارید. فقط مشاهده مجاز است.\");`n      return;`n    }`n    setViewOnly(false);"
  if ($c.Contains($old3)) {
    $c = $c.Replace($old3, $new3)
    Write-Host "OK 3: openNew guard"
  } else {
    Write-Host "WARN 3: openNew pattern not found"
  }
}

# gate first canCreate button near header
if (-not $c.Contains('canCreate && canCreateOnAny')) {
  $c = $c.Replace('{canCreate ? (', '{canCreate && canCreateOnAny ? (', 1)
  Write-Host "OK 4: create button gated"
} else {
  Write-Host "SKIP 4"
}

$oldBannerMsg = 'دسترسی شما در این سطح فقط مشاهده و گزارش است؛ ثبت یا ویرایش سند روی شرکت‌های زیرمجموعه مجاز نیست.'
$newBannerMsg = 'دسترسی شما فقط مشاهده و گزارش است. برای ثبت سند باید نقش اپراتور شرکت با Scope همان شرکت داشته باشید.'
if ($c.Contains($oldBannerMsg)) {
  $c = $c.Replace($oldBannerMsg, $newBannerMsg)
  Write-Host "OK 5: banner text"
}
$c = $c.Replace(
  '{(isTechnicalOwnerReadOnly || isGroupObserver) && (',
  '{(isTechnicalOwnerReadOnly || isGroupObserver || !canCreateOnAny) && ('
)

$oldAcc = 'const { data: accountsFlat } = useAccountFlat({ enabled: formMode !== null });'
$newAcc = "const { data: accountsFlat } = useAccountFlat({\n    enabled: formMode !== null && Boolean(formCompanyId || primaryCompanyId),\n    companyId: formCompanyId || primaryCompanyId || undefined,\n  });"
if ($c.Contains($oldAcc)) {
  $c = $c.Replace($oldAcc, $newAcc)
  Write-Host "OK 6: useAccountFlat companyId"
} else {
  Write-Host "SKIP 6"
}

[System.IO.File]::WriteAllText((Resolve-Path $path), $c, $utf8)
Write-Host "Done. Size=$((Get-Item $path).Length)"
Write-Host "Restart npm run dev + Ctrl+Shift+R"
