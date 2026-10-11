# Apply journals UX r2 patches from repo (run from Front root on develop)
$ErrorActionPreference = "Stop"
git apply --whitespace=nowarn patches/journals-UX-r2p1.patch
git apply --whitespace=nowarn patches/journals-UX-r2p2.patch
git apply --whitespace=nowarn patches/journals-UX-r2p3.patch
git add src/modules/finance/pages/journals-page.tsx
git status
Write-Host "Ready to commit. Run:"
Write-Host 'git commit -m "feat(finance): journals UX - typeahead, Alt shortcuts, amount separators, sticky footer"'
Write-Host "git push origin develop"
