# host.ps1 — run the World Cup hub + a Cloudflare Tunnel together.
#
# Usage:
#   .\host.ps1            # QUICK tunnel: instant public https://<random>.trycloudflare.com
#                         # (no account/domain needed; URL changes each run; no access lock)
#   .\host.ps1 -Named worldcup
#                         # NAMED tunnel "worldcup": stable URL on your domain
#                         # (requires the one-time setup in HOSTING.md first)
#
# Stop everything with Ctrl+C.

param(
  [string]$Named = "",
  [int]$Port = 3001
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

# load .env (ODDS_API_KEY etc.) if present — KEY=value lines
$envFile = Join-Path $root ".env"
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([^#=]+?)\s*=\s*(.*)$') {
      [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
    }
  }
  Write-Host "Loaded .env" -ForegroundColor DarkGray
}
$env:PORT = "$Port"

# start the Node server in the background
Write-Host "Starting World Cup hub on http://localhost:$Port ..." -ForegroundColor Cyan
$server = Start-Process node -ArgumentList (Join-Path $root "server.js") -PassThru -NoNewWindow

try {
  Start-Sleep -Seconds 2
  if ($Named) {
    Write-Host "Opening NAMED Cloudflare Tunnel '$Named' ..." -ForegroundColor Cyan
    cloudflared tunnel run $Named
  } else {
    Write-Host "Opening QUICK Cloudflare Tunnel (watch for the trycloudflare.com URL below) ..." -ForegroundColor Cyan
    cloudflared tunnel --url "http://localhost:$Port"
  }
}
finally {
  Write-Host "`nShutting down server (PID $($server.Id)) ..." -ForegroundColor DarkGray
  if ($server -and !$server.HasExited) { Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue }
}
