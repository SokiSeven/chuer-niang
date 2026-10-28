$dshHome = if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $env:USERPROFILE '.dsh' }
$targets = Get-CimInstance Win32_Process | Where-Object {
  $_.CommandLine -like '*scanner.mjs*' -and $_.ProcessId -ne $PID
}
foreach ($target in $targets) {
  Stop-Process -Id $target.ProcessId -Force -ErrorAction SilentlyContinue
}
Remove-Item (Join-Path $dshHome 'photo-pet\scanner.lock') -Force -ErrorAction SilentlyContinue
Write-Output "stopped $($targets.Count) scanner process(es)"
