$ErrorActionPreference = 'Stop'
Set-Location "E:\myProject\hamarehSaasErp-Front"
git fetch origin
git checkout develop
git pull origin develop

$base = "https://raw.githubusercontent.com/akhlaghimhd/hamarehSaasErp-Front/develop/patches/list-ux-hunks"
New-Item -ItemType Directory -Force -Path "patches\list-ux-hunks" | Out-Null

0..10 | ForEach-Object {
  $name = "h{0:D2}.patch" -f $_
  $out = "patches\list-ux-hunks\$name"
  Write-Host "Download $name"
  Invoke-WebRequest -Uri "$base/$name" -OutFile $out -UseBasicParsing
  Write-Host "Apply $name"
  git apply --whitespace=nowarn $out
  if ($LASTEXITCODE -ne 0) { throw "Failed $name" }
}

Select-String -Path "src\modules\finance\pages\journals-page.tsx" -Pattern "exportListExcel","listPage","bulkPostSelected"
git add src/modules/finance/pages/journals-page.tsx
git commit -m "feat(finance): journals list paging, bulk ops, column picker, export, compact filters"
git push origin develop
Write-Host "Done - hard refresh the page"
