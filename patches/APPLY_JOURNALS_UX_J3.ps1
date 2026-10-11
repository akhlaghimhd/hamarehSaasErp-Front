$ErrorActionPreference = "Stop"
git apply --whitespace=nowarn patches/journals-UX-j3-0.patch
git apply --whitespace=nowarn patches/journals-UX-j3-1.patch
git apply --whitespace=nowarn patches/journals-UX-j3-2.patch
git apply --whitespace=nowarn patches/journals-UX-j3-3.patch
git apply --whitespace=nowarn patches/journals-UX-j3-4.patch
git add src/modules/finance/pages/journals-page.tsx
git status
Write-Host "OK - then commit and push"
