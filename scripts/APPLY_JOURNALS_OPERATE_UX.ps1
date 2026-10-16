# APPLY_JOURNALS_OPERATE_UX.ps1  (ASCII-safe + LF normalize)
# powershell -ExecutionPolicy Bypass -File scripts\APPLY_JOURNALS_OPERATE_UX.ps1
$ErrorActionPreference = "Stop"
$path = Join-Path $PSScriptRoot "..\src\modules\finance\pages\journals-page.tsx"
$path = [System.IO.Path]::GetFullPath($path)
if (-not (Test-Path $path)) { throw "File not found: $path" }
$len = (Get-Item $path).Length
Write-Host "File size: $len"
if ($len -lt 80000) { throw "journals-page.tsx too small ($len). Restore full file first." }

$utf8 = New-Object System.Text.UTF8Encoding $false
$c = [System.IO.File]::ReadAllText($path, $utf8)
$c = $c.Replace("`r`n", "`n").Replace("`r", "`n")

function Norm([string]$s) {
  return $s.Replace("`r`n", "`n").Replace("`r", "`n")
}

function Replace-Once([string]$hay, [string]$old, [string]$new, [string]$label) {
  $old = Norm $old
  $new = Norm $new
  if ($hay.Contains($old)) {
    $idx = $hay.IndexOf($old)
    return ($hay.Substring(0, $idx) + $new + $hay.Substring($idx + $old.Length)), $true
  }
  Write-Host "MISS $label"
  return $hay, $false
}

if ($c.Contains("operableCompanyOptions")) {
  Write-Host "SKIP 1: already applied"
} else {
  $old1 = Norm @'
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
  $new1 = Norm @'
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
  $pair = Replace-Once $c $old1 $new1 "BLOCK1"
  $c = $pair[0]
  if (-not $pair[1]) {
    $i = $c.IndexOf("const companyOptions = companies")
    Write-Host "companyOptions idx=$i"
    if ($i -ge 0) { Write-Host $c.Substring($i, [Math]::Min(400, $c.Length - $i)) }
    throw "BLOCK1 not found"
  }
  Write-Host "OK 1"
}

if ($c.Contains("operableCompanyOptions.map")) {
  Write-Host "SKIP 2"
} else {
  $old2 = Norm @'
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
  $new2 = Norm @'
value={formCompanyId || defaultOperateCompanyId}
                disabled={viewOnly || operableCompanyOptions.length <= 1}
                onChange={(e) => {
                  markDirty();
                  setFormCompanyId(e.target.value);
                  setFormBranchId("");
                }}
              >
                {operableCompanyOptions.length === 0 ? (
                  <option value="">--</option>
                ) : (
                  operableCompanyOptions.map((c) => (
                    <option key={c.company_id} value={c.company_id}>
                      {(c as { name?: string; legal_name?: string }).name || (c as { legal_name?: string }).legal_name || c.company_id.slice(0, 8)}
                    </option>
                  ))
                )}
              </select>
'@
  $pair = Replace-Once $c $old2 $new2 "BLOCK2"
  $c = $pair[0]
  if (-not $pair[1]) { throw "BLOCK2 not found" }
  Write-Host "OK 2"
}

if ($c.Contains("if (!canCreateOnAny)")) {
  Write-Host "SKIP 3"
} else {
  $old3 = "function openNew() {`n    setViewOnly(false);"
  $new3 = "function openNew() {`n    if (!canCreateOnAny) {`n      setFormError(`"NO_OPERATE_COMPANY`");`n      return;`n    }`n    setViewOnly(false);"
  $pair = Replace-Once $c $old3 $new3 "BLOCK3"
  $c = $pair[0]
  if ($pair[1]) { Write-Host "OK 3" } else { Write-Host "WARN 3 skipped" }
}

$old4 = Norm @'
            {canCreate ? (
              <Button type="button" size="sm" className="h-8" onClick={openNew}>
                <Plus className="h-4 w-4 ml-1" />
'@
$new4 = Norm @'
            {canCreate && canCreateOnAny ? (
              <Button type="button" size="sm" className="h-8" onClick={openNew}>
                <Plus className="h-4 w-4 ml-1" />
'@
if ($c.Contains("canCreate && canCreateOnAny ? (")) {
  Write-Host "SKIP 4"
} else {
  $pair = Replace-Once $c $old4 $new4 "BLOCK4"
  $c = $pair[0]
  if ($pair[1]) { Write-Host "OK 4" } else { Write-Host "WARN 4 skipped" }
}

$old5 = "{(isTechnicalOwnerReadOnly || isGroupObserver) && ("
$new5 = "{(isTechnicalOwnerReadOnly || isGroupObserver || !canCreateOnAny) && ("
$count5 = 0
while ($c.Contains($old5)) {
  $pair = Replace-Once $c $old5 $new5 "BLOCK5"
  $c = $pair[0]
  if (-not $pair[1]) { break }
  $count5++
}
Write-Host "OK 5: banner conditions x$count5"

$old6 = "const { data: accountsFlat } = useAccountFlat({ enabled: formMode !== null });"
$new6 = Norm @'
const { data: accountsFlat } = useAccountFlat({
    enabled: formMode !== null && Boolean(formCompanyId || primaryCompanyId),
    companyId: formCompanyId || primaryCompanyId || undefined,
  });
'@
if ($c.Contains("companyId: formCompanyId || primaryCompanyId")) {
  Write-Host "SKIP 6"
} else {
  $pair = Replace-Once $c $old6 $new6 "BLOCK6"
  $c = $pair[0]
  if ($pair[1]) { Write-Host "OK 6" } else { Write-Host "WARN 6 skipped" }
}

$fa = [string]::Concat(
  [char]0x0634,[char]0x0645,[char]0x0627,[char]0x0020,
  [char]0x0628,[char]0x0631,[char]0x0627,[char]0x06CC,[char]0x0020,
  [char]0x0647,[char]0x06CC,[char]0x0686,[char]0x0020,
  [char]0x0634,[char]0x0631,[char]0x06A9,[char]0x062A,[char]0x06CC,[char]0x0020,
  [char]0x0645,[char]0x062C,[char]0x0648,[char]0x0632,[char]0x0020,
  [char]0x062B,[char]0x0628,[char]0x062A,[char]0x0020,
  [char]0x0633,[char]0x0646,[char]0x062F,[char]0x0020,
  [char]0x0646,[char]0x062F,[char]0x0627,[char]0x0631,[char]0x06CC,[char]0x062F,[char]0x002E,[char]0x0020,
  [char]0x0641,[char]0x0642,[char]0x0637,[char]0x0020,
  [char]0x0645,[char]0x0634,[char]0x0627,[char]0x0647,[char]0x062F,[char]0x0647,[char]0x0020,
  [char]0x0645,[char]0x062C,[char]0x0627,[char]0x0632,[char]0x0020,
  [char]0x0627,[char]0x0633,[char]0x062A,[char]0x002E
)
$c = $c.Replace("NO_OPERATE_COMPANY", $fa)

[System.IO.File]::WriteAllText($path, $c, $utf8)
Write-Host ""
Write-Host "Done. Size=$((Get-Item $path).Length)"
Write-Host "Verify operableCompanyOptions:"
Select-String -Path $path -Pattern "operableCompanyOptions" | Select-Object -First 3
Write-Host "Restart npm run dev + Ctrl+Shift+R"
