# Run from the repository root in PowerShell, with Docker Desktop open.
$ErrorActionPreference = 'Stop'
if (-not (Test-Path '.env')) {
    Copy-Item '.env.example' '.env'
    Write-Host 'Created .env. EDIT ALL SECRET VALUES, then re-run this script.' -ForegroundColor Yellow
    exit 1
}
docker compose config --quiet
if ($LASTEXITCODE -ne 0) { throw 'Invalid Compose configuration' }
docker compose up --build -d
if ($LASTEXITCODE -ne 0) { throw 'Docker build/start failed. Inspect docker compose logs.' }
docker compose ps
$gatewayAddress = docker compose port gateway 8088
if ($LASTEXITCODE -ne 0 -or -not $gatewayAddress) { throw 'Gateway port unavailable' }
Write-Host ('Gateway: http://' + $gatewayAddress.Trim() + '. Check readiness as described in README.md.') -ForegroundColor Green
