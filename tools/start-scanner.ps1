$pet = Split-Path -Parent $PSScriptRoot
$dshHome = if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $env:USERPROFILE '.dsh' }
$env:DSH_HOME = $dshHome
$env:PHOTO_PET_SCAN_ROOT = if ($env:PHOTO_PET_SCAN_ROOT) { $env:PHOTO_PET_SCAN_ROOT } else { Split-Path -Parent $pet }
$env:PHOTO_PET_DSH_URL = if ($env:PHOTO_PET_DSH_URL) { $env:PHOTO_PET_DSH_URL } else { 'http://127.0.0.1:64480' }
$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) {
  $node = Join-Path $env:USERPROFILE '.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'
}
$scanner = Join-Path $pet 'plugin\scanner.mjs'
Start-Process -FilePath $node -ArgumentList $scanner -WindowStyle Hidden
Write-Output "scanner started"
