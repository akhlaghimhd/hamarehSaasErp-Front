# FIX_JOURNALS_SCOPE_WIRE.ps1 - ASCII only, wires useFinanceCompanyScope
$ErrorActionPreference = "Stop"
$path = "src\modules\finance\pages\journals-page.tsx"
if (-not (Test-Path $path)) { throw "Run from hamarehSaasErp-Front root" }

$full = (Resolve-Path $path).Path
$t = [System.IO.File]::ReadAllText($full)
$t = $t.Replace("`r`n", "`n")

if ($t.Contains("<<<<<<") -or $t.Contains(">>>>>>>") -or $t.Contains("SEE_ARTIFACTS") -or $t.Contains("PLACEHOLDER")) {
  throw "Conflict markers or PLACEHOLDER still present - restore clean journals-page first"
}

if ($t.Contains("= useFinanceCompanyScope()") -and $t.Contains("isTechnicalOwnerReadOnly,")) {
  Write-Host "Already wired - nothing to do"
  exit 0
}

$needle = "  const canReverse = usePermission(FinancePermissions.journalReverse);"
if (-not $t.Contains($needle)) {
  $needle = "  const canPost = usePermission(FinancePermissions.journalPost);"
  if (-not $t.Contains($needle)) {
    throw "Permission lines not found"
  }
}

$block = $needle + "`n`n" +
"  const {`n" +
"    canOperateCompany,`n" +
"    isTechnicalOwnerReadOnly,`n" +
"    isGroupObserver,`n" +
"  } = useFinanceCompanyScope();`n" +
"  const canOperateOn = (companyId?: string | null) =>`n" +
"    Boolean(companyId && canOperateCompany(companyId));"

$idx = $t.IndexOf($needle)
if ($idx -lt 0) { throw "needle not found" }
$t = $t.Substring(0, $idx) + $block + $t.Substring($idx + $needle.Length)

if (-not $t.Contains("useFinanceCompanyScope")) {
  throw "Missing import of useFinanceCompanyScope"
}

$utf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($full, $t, $utf8)

Write-Host "WIRED OK"
Select-String -Path $path -Pattern "useFinanceCompanyScope\(\)|isTechnicalOwnerReadOnly," |
  ForEach-Object { "$($_.LineNumber): $($_.Line.Trim())" }
