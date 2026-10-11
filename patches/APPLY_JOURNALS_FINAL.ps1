$ErrorActionPreference = "Stop"
# Reset page to origin first if local has diverged:
# git checkout origin/develop -- src/modules/finance/pages/journals-page.tsx
# git checkout origin/develop -- src/modules/finance/pages/journals-report-html.ts

$patches = 0..8 | ForEach-Object { "patches/journals-FINAL-$_.patch" }
$patches += "patches/journals-FINAL-report.patch"
foreach ($p in $patches) {
  Write-Host "Applying $p ..."
  git apply --whitespace=nowarn $p
  if ($LASTEXITCODE -ne 0) { throw "Failed: $p" }
}
git add src/modules/finance/pages/journals-page.tsx src/modules/finance/pages/journals-report-html.ts
git status
Write-Host "OK - commit and push"
