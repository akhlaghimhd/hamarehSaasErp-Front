# FIX_JOURNALS_SCOPE_WIRE.ps1
# Wire useFinanceCompanyScope + fix broken read-only banners
$ErrorActionPreference = "Stop"
$path = "src\modules\finance\pages\journals-page.tsx"
if (-not (Test-Path $path)) { throw "Run from Front repo root" }

$t = [System.IO.File]::ReadAllText((Resolve-Path $path).Path)
$t = $t -replace "`r`n", "`n"

if ($t -match "<<<<<<|>>>>>>|SEE_ARTIFACTS|PLACEHOLDER") {
  throw "File still has conflict markers or PLACEHOLDER - restore clean file first"
}

# --- A) Wire hook if missing ---
$hasWire = $t -match 'isTechnicalOwnerReadOnly,\s*\n\s*isGroupObserver'
$hasCall = $t.Contains('= useFinanceCompanyScope()')
if (-not $hasWire -or -not $hasCall) {
  $t = [regex]::Replace($t, '(?s)\n  const \{\n    canOperateCompany,\n    isTechnicalOwnerReadOnly,\n    isGroupObserver,\n  \} = useFinanceCompanyScope\(\);\n  const canOperateOn = \(companyId\?: string \| null\) =>\n    Boolean\(companyId && canOperateCompany\(companyId\)\);\n', "`n")

  $needle = $null
  foreach ($cand in @(
    '  const canReverse = usePermission(FinancePermissions.journalReverse);'
  )) {
    if ($t.Contains($cand)) { $needle = $cand; break }
  }
  if (-not $needle) {
    if ($t -match 'const canPost = usePermission\(FinancePermissions\.journalPost\);') {
      $needle = $Matches[0]
      if (-not $needle.StartsWith('  ')) { $needle = '  ' + $needle.TrimStart() }
    } else {
      throw "Cannot find permission lines to insert after"
    }
  }

  $block = @"
$needle

  const {
    canOperateCompany,
    isTechnicalOwnerReadOnly,
    isGroupObserver,
  } = useFinanceCompanyScope();
  const canOperateOn = (companyId?: string | null) =>
    Boolean(companyId && canOperateCompany(companyId));
"@
  $block = $block -replace "`r`n", "`n"
  $t = $t.Replace($needle, $block, 1)
  Write-Host "WIRED hook after permission block"
} else {
  Write-Host "Hook already wired"
}

if ($t -notmatch 'useFinanceCompanyScope') {
  throw "Missing import useFinanceCompanyScope"
}

$goodFa = 'دسترسی شما در این سطح فقط مشاهده و گزارش است؛ ثبت یا ویرایش سند روی شرکت‌های زیرمجموعه مجاز نیست.'
$t = [regex]::Replace(
  $t,
  '(?s)(\{\(isTechnicalOwnerReadOnly \|\| isGroupObserver\) && \(\s*<div className="rounded-lg border border-amber-200[^"]*"[^>]*>\s*)([^<]+)(\s*</div>)',
  { param($m) $m.Groups[1].Value + $goodFa + $m.Groups[3].Value }
)

$utf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText((Resolve-Path $path).Path, $t, $utf8)

Write-Host "--- verify ---"
Select-String -Path $path -Pattern "useFinanceCompanyScope\(\)|isTechnicalOwnerReadOnly|canOperateOn =" |
  ForEach-Object { "{0}:{1}" -f $_.LineNumber, $_.Line.Trim().Substring(0, [Math]::Min(100, $_.Line.Trim().Length)) }

if ($t -notmatch 'isTechnicalOwnerReadOnly,\s*\n\s*isGroupObserver') {
  throw "FAILED: isTechnicalOwnerReadOnly still not destructured"
}
Write-Host "OK - refresh browser"
