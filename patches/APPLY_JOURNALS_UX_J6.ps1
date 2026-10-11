$ErrorActionPreference = "Stop"
# Ensure journals-report-html.ts is present (already on develop)
git apply --whitespace=nowarn patches/journals-UX-j6-0.patch
git apply --whitespace=nowarn patches/journals-UX-j6-1.patch
git apply --whitespace=nowarn patches/journals-UX-j6-2.patch
git apply --whitespace=nowarn patches/journals-UX-j6-3.patch
git apply --whitespace=nowarn patches/journals-UX-j6-3b.patch
git apply --whitespace=nowarn patches/journals-UX-j6-4.patch
git apply --whitespace=nowarn patches/journals-UX-j6-5.patch
git apply --whitespace=nowarn patches/journals-UX-j6-6.patch
git apply --whitespace=nowarn patches/journals-UX-j6-7.patch
git add src/modules/finance/pages/journals-page.tsx src/modules/finance/pages/journals-report-html.ts
git status
Write-Host "OK - commit and push"
