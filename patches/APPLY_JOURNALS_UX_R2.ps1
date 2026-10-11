# Apply journals UX r2 sequential patches (run from Front repo root on develop)
$ErrorActionPreference = "Stop"
git apply --whitespace=nowarn patches/journals-UX-n0.patch
git apply --whitespace=nowarn patches/journals-UX-n1.patch
git apply --whitespace=nowarn patches/journals-UX-n2.patch
git apply --whitespace=nowarn patches/journals-UX-n3.patch
git apply --whitespace=nowarn patches/journals-UX-n4.patch
git add src/modules/finance/pages/journals-page.tsx
git status
Write-Host "OK. Next:"
Write-Host 'git commit -m "feat(finance): journals UX - typeahead, Alt shortcuts, amount separators, sticky footer"'
Write-Host "git push origin develop"
