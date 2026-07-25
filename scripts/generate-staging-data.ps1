param(
  [int]$Colleges = 1,
  [int]$Students = 50,
  [string]$Prefix = "loadtest",
  [switch]$Cleanup
)

$ErrorActionPreference = "Stop"

if ($env:NODE_ENV -eq "production" -or $env:APP_ENV -eq "production") {
  throw "Staging data generation is blocked in production."
}

if ($env:NODE_ENV -ne "staging" -and $env:APP_ENV -ne "staging" -and $env:NODE_ENV -ne "development") {
  throw "Set NODE_ENV or APP_ENV to staging/development before generating synthetic data."
}

Write-Host "Staging data generation placeholder."
Write-Host "Prefix=$Prefix Colleges=$Colleges Students=$Students Cleanup=$Cleanup"
Write-Host "Use API seed/generation endpoints or Prisma scripts in a staging-only environment."
