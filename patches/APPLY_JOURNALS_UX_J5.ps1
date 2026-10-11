$ErrorActionPreference = "Stop"
git apply --whitespace=nowarn patches/journals-UX-j5-0.patch
git apply --whitespace=nowarn patches/journals-UX-j5-1.patch
git apply --whitespace=nowarn patches/journals-UX-j5-2.patch
git apply --whitespace=nowarn patches/journals-UX-j5-3.patch
git add src/modules/finance/pages/journals-page.tsx src/modules/finance/pages/journals-report-html.ts
git status
Write-Host "OK - commit and push"
