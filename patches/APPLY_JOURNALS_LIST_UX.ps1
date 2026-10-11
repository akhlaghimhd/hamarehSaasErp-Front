# Apply journals list UX (3 parts) on develop
# Run from repo root:  powershell -File patches/APPLY_JOURNALS_LIST_UX.ps1

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot\..

git fetch origin
git checkout develop
git pull origin develop

$parts = @(
  'patches/journals-list-ux-p0.patch',
  'patches/journals-list-ux-p1.patch',
  'patches/journals-list-ux-p2.patch'
)

foreach ($p in $parts) {
  if (-not (Test-Path $p)) { throw "Missing $p - git pull first" }
  Write-Host "Applying $p ..."
  git apply --whitespace=nowarn $p
  if ($LASTEXITCODE -ne 0) { throw "Failed: $p" }
}

Select-String -Path 'src/modules/finance/pages/journals-page.tsx' -Pattern 'exportListExcel','listPage','bulkPostSelected'

git add src/modules/finance/pages/journals-page.tsx
git commit -m 'feat(finance): journals list paging, bulk ops, column picker, export, compact filters'
git push origin develop

Write-Host 'Done. Hard-refresh the journals page.'
