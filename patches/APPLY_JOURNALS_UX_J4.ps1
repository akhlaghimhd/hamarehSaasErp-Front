$ErrorActionPreference = "Stop"
git apply --whitespace=nowarn patches/journals-UX-j4-0.patch
git apply --whitespace=nowarn patches/journals-UX-j4-1.patch
git apply --whitespace=nowarn patches/journals-UX-j4-2.patch
git apply --whitespace=nowarn patches/journals-UX-j4-3.patch
git apply --whitespace=nowarn patches/journals-UX-j4-4.patch
git apply --whitespace=nowarn patches/journals-UX-j4-5.patch
git add src/modules/finance/pages/journals-page.tsx
git status
Write-Host "OK - commit and push"
