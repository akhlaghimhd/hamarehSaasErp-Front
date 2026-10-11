$ErrorActionPreference = "Stop"
git apply --whitespace=nowarn patches/journals-UX-f0.patch
git apply --whitespace=nowarn patches/journals-UX-f1.patch
git apply --whitespace=nowarn patches/journals-UX-f2.patch
git apply --whitespace=nowarn patches/journals-UX-f3.patch
git apply --whitespace=nowarn patches/journals-UX-f4.patch
git apply --whitespace=nowarn patches/journals-UX-f5.patch
git apply --whitespace=nowarn patches/journals-UX-f6.patch
git add src/modules/finance/pages/journals-page.tsx src/modules/finance/pages/journals-account-typeahead.tsx
git status
Write-Host "OK. Commit then push."
