$ErrorActionPreference = 'Stop'

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $here
$port = 5180

Write-Host ''
Write-Host '  VR/AR WebXR demo - Week 1' -ForegroundColor Cyan
Write-Host '  ----------------------------------------'

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host '  [ERROR] Node.js not found in PATH.' -ForegroundColor Red
  Write-Host '  Install Node.js LTS, then run this script again.'
  exit 1
}

Write-Host ('  URL : http://localhost:{0}' -f $port)
Write-Host '  Stop: Ctrl+C'
Write-Host '  ----------------------------------------'
Write-Host ''

Start-Process ('http://localhost:{0}' -f $port)

node "$here\server.js"
