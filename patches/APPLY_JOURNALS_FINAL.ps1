$ErrorActionPreference = "Stop"
# IMPORTANT: local page diverged — reset to origin base first
git fetch origin
git checkout origin/develop -- src/modules/finance/pages/journals-page.tsx
if (Test-Path src/modules/finance/pages/journals-report-html.ts) {
  git checkout origin/develop -- src/modules/finance/pages/journals-report-html.ts
}

$patches = @(
  "patches/journals-FINAL-0.patch",
  "patches/journals-FINAL-1.patch",
  "patches/journals-FINAL-2.patch",
  "patches/journals-FINAL-3.patch",
  "patches/journals-FINAL-4a.patch",
  "patches/journals-FINAL-4b.patch",
  "patches/journals-FINAL-4c.patch",
  "patches/journals-FINAL-4d.patch",
  "patches/journals-FINAL-4e.patch",
  "patches/journals-FINAL-4f.patch",
  "patches/journals-FINAL-report.patch"
)
foreach ($p in $patches) {
  Write-Host "Applying $p ..."
  git apply --whitespace=nowarn $p
  if ($LASTEXITCODE -ne 0) { throw "Failed: $p" }
}
git add src/modules/finance/pages/journals-page.tsx src/modules/finance/pages/journals-report-html.ts
git status
Write-Host "OK - commit then push"
