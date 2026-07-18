param(
  [string]$DatabaseUrl = $env:DIRECT_DATABASE_URL,
  [string]$OutputDir = "backups"
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) {
  throw "DIRECT_DATABASE_URL or -DatabaseUrl is required. Do not embed credentials in this script."
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$output = Join-Path $OutputDir "campustest-$timestamp.dump"

Write-Host "Creating PostgreSQL logical backup at $output"
pg_dump --format=custom --no-owner --no-acl --file $output $DatabaseUrl
Write-Host "Backup complete: $output"
