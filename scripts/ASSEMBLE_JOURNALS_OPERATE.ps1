# Assemble journals-page OPERATE UX final
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
if (-not $root) { $root = Get-Location }
$dest = Join-Path $root "src\modules\finance\pages\journals-page.tsx"
$partsDir = Join-Path $PSScriptRoot "journals_operate_parts"
if (-not (Test-Path $partsDir)) {
  $partsDir = Join-Path $root "scripts\journals_operate_parts"
}
$files = Get-ChildItem $partsDir -Filter "part*.b64" | Sort-Object Name
if ($files.Count -lt 1) { throw "No part*.b64 found in $partsDir" }
$b64 = ($files | ForEach-Object { Get-Content $_.FullName -Raw }) -join ""
$bytes = [Convert]::FromBase64String($b64.Trim())
[System.IO.File]::WriteAllBytes($dest, $bytes)
Write-Host "OK wrote $dest size=$($bytes.Length)"
