$ErrorActionPreference = "Stop"
Write-Host "=== Journals FINAL apply ==="

# 1) Discard LOCAL edits on these two files so pull/apply can work
git fetch origin
git restore --source=HEAD --worktree --staged -- src/modules/finance/pages/journals-page.tsx 2>$null
git checkout HEAD -- src/modules/finance/pages/journals-page.tsx
if (Test-Path src/modules/finance/pages/journals-report-html.ts) {
  git checkout HEAD -- src/modules/finance/pages/journals-report-html.ts
}

# 2) Pull patch files + latest develop
git pull origin develop

# 3) Reset page to origin base (patches target origin content)
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
  if (-not (Test-Path $p)) { throw "Missing $p - run git pull origin develop first" }
  Write-Host "Applying $p ..."
  git apply --whitespace=nowarn $p
  if ($LASTEXITCODE -ne 0) { throw "Failed: $p" }
}

git add src/modules/finance/pages/journals-page.tsx src/modules/finance/pages/journals-report-html.ts
git status
Write-Host ""
Write-Host "OK. Now run:"
Write-Host '  git commit -m "feat(finance): journal leave guard, local draft, footer, system balance, jalali export"'
Write-Host "  git push origin develop"
