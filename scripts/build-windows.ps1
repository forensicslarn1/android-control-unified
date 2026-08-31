$ErrorActionPreference = 'Stop'

$Root = Resolve-Path (Join-Path $PSScriptRoot '..')
$Desktop = Join-Path $Root 'desktop-companion'
$Resources = Join-Path $Desktop 'resources\adb'
$Archive = Join-Path $env:TEMP 'platform-tools-latest-windows.zip'
$Url = 'https://dl.google.com/android/repository/platform-tools-latest-windows.zip'

New-Item -ItemType Directory -Force -Path $Resources | Out-Null
Write-Host 'Downloading official Android Platform Tools...'
Invoke-WebRequest -Uri $Url -OutFile $Archive
Expand-Archive -Path $Archive -DestinationPath (Join-Path $env:TEMP 'android-platform-tools') -Force
$PlatformTools = Join-Path $env:TEMP 'android-platform-tools\platform-tools'

foreach ($File in @('adb.exe', 'AdbWinApi.dll', 'AdbWinUsbApi.dll')) {
    Copy-Item (Join-Path $PlatformTools $File) $Resources -Force
}

Push-Location $Desktop
try {
    cargo build --release
} finally {
    Pop-Location
}

$Target = Join-Path $Desktop 'target\release\android-control-center-desktop.exe'
if (-not (Test-Path $Target)) { throw "Build output was not found: $Target" }
Write-Host "Windows executable created: $Target"
Write-Host 'The executable discovers resources\adb\adb.exe next to the installed application.'

Remove-Item $Archive -Force -ErrorAction SilentlyContinue
Remove-Item (Join-Path $env:TEMP 'android-platform-tools') -Recurse -Force -ErrorAction SilentlyContinue
