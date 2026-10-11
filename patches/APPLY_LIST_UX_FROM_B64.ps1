$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
git fetch origin
git checkout develop
git pull origin develop

$base = 'https://raw.githubusercontent.com/akhlaghimhd/hamarehSaasErp-Front/develop/patches/list-ux-b64'
$dir = Join-Path $PWD 'patches/list-ux-b64'
New-Item -ItemType Directory -Force -Path $dir | Out-Null
foreach ($f in @('a0.txt','a1.txt','b0.txt','b1.txt')) {
  Invoke-WebRequest -Uri "$base/$f" -OutFile (Join-Path $dir $f) -UseBasicParsing
}
$a = (Get-Content (Join-Path $dir 'a0.txt') -Raw) + (Get-Content (Join-Path $dir 'a1.txt') -Raw)
$b = (Get-Content (Join-Path $dir 'b0.txt') -Raw) + (Get-Content (Join-Path $dir 'b1.txt') -Raw)
$a = ($a -replace "`r|`n",'').Trim()
$b = ($b -replace "`r|`n",'').Trim()
[IO.File]::WriteAllBytes((Join-Path $PWD 'patches/journals-list-ux-A.patch'), [Convert]::FromBase64String($a))
[IO.File]::WriteAllBytes((Join-Path $PWD 'patches/journals-list-ux-B.patch'), [Convert]::FromBase64String($b))
git apply --whitespace=nowarn patches/journals-list-ux-A.patch
if ($LASTEXITCODE -ne 0) { throw 'A failed' }
git apply --whitespace=nowarn patches/journals-list-ux-B.patch
if ($LASTEXITCODE -ne 0) { throw 'B failed' }
Select-String -Path 'src/modules/finance/pages/journals-page.tsx' -Pattern 'exportListExcel','listPage','bulkPostSelected'
git add src/modules/finance/pages/journals-page.tsx
git commit -m 'feat(finance): journals list paging, bulk ops, column picker, export, compact filters'
git push origin develop
Write-Host 'Done'
