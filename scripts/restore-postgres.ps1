param(
  [string]$DatabaseUrl = $env:DIRECT_DATABASE_URL,
  [string]$BackupFile,
  [switch]$ConfirmProduction,
  [switch]$Help
)

$ErrorActionPreference = "Stop"

if ($Help) {
  Write-Host "Usage: scripts/restore-postgres.ps1 -DatabaseUrl <url> -BackupFile <dump> [-ConfirmProduction]"
  Write-Host "Production restores must be rehearsed and require -ConfirmProduction."
  exit 0
}

if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) {
  throw "DIRECT_DATABASE_URL or -DatabaseUrl is required. Do not embed credentials in this script."
}
if ([string]::IsNullOrWhiteSpace($BackupFile) -or -not (Test-Path $BackupFile)) {
  throw "-BackupFile must point to an existing pg_dump custom-format backup."
}
if ($env:NODE_ENV -eq "production" -and -not $ConfirmProduction) {
  throw "Production restore requires -ConfirmProduction."
}

Write-Host "Restoring PostgreSQL backup from $BackupFile"
pg_restore --clean --if-exists --no-owner --no-acl --dbname $DatabaseUrl $BackupFile
Write-Host "Restore complete."
