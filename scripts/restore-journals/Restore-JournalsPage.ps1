# Restore journals-page.tsx from base64 parts.
# From repo root:
#   powershell -ExecutionPolicy Bypass -File scripts/restore-journals/Restore-JournalsPage.ps1
$ErrorActionPreference = "Stop"
$here = $PSScriptRoot
$repoRoot = (Resolve-Path (Join-Path $here "..\..")).Path
$parts = Get-ChildItem -Path $here -Filter "part*.b64" | Sort-Object { [int]($_.BaseName -replace 'part','') }
if (-not $parts) { throw "No part*.b64 in $here" }
$b64 = -join ($parts | ForEach-Object { (Get-Content -Raw -Path $_.FullName).Trim() })
$bytes = [Convert]::FromBase64String($b64)
$target = Join-Path $repoRoot "src\modules\finance\pages\journals-page.tsx"
[System.IO.File]::WriteAllBytes($target, $bytes)
$len = (Get-Item $target).Length
Write-Host "Restored: $target"
Write-Host "Size: $len bytes"
if ($len -lt 80000) { throw "File too small ($len). Abort." }
Write-Host ""
Write-Host "Next:"
Write-Host "  git add src/modules/finance/pages/journals-page.tsx"
Write-Host "  git commit -m `"fix(finance): restore journals-page full content and Persian labels`""
Write-Host "  git push origin develop"
