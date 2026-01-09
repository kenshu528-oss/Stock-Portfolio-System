# Quick Backup Script for Stock Portfolio System

Write-Host "Starting backup..." -ForegroundColor Green

# Check if we're in the project root
if (-not (Test-Path "package.json")) {
    Write-Host "Error: Please run this script from the project root directory" -ForegroundColor Red
    exit 1
}

# Read version number
$versionContent = Get-Content "src\constants\version.ts" -Raw
$patchMatch = [regex]::Match($versionContent, "PATCH:\s*(\d+)")
$patchVersion = [int]$patchMatch.Groups[1].Value
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$versionString = "1.0.0.{0:D4}" -f $patchVersion
$backupName = "backup-v$versionString-$timestamp"

Write-Host "Backup name: $backupName" -ForegroundColor Green

# Create backup directory
$backupDir = "..\backups"
$fullBackupPath = "$backupDir\$backupName"

if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
}

Write-Host "Creating backup..." -ForegroundColor Green

# Copy files using robocopy
robocopy . $fullBackupPath /E /XD node_modules .git dist .vscode /XF *.log /R:1 /W:1 /NP

# Create backup info file
$backupInfo = @"
Backup Information
==================
Version: v$versionString
Created: $(Get-Date)
Backup Name: $backupName
Original Path: $(Get-Location)
"@

$backupInfo | Out-File -FilePath "$fullBackupPath\.backup-info" -Encoding UTF8

# Verify backup
if ((Test-Path "$fullBackupPath\package.json") -and (Test-Path "$fullBackupPath\src")) {
    Write-Host "Backup completed successfully!" -ForegroundColor Green
    Write-Host "Backup location: $fullBackupPath" -ForegroundColor Cyan
    Write-Host "To restore: .\scripts\quick-restore.ps1 $backupName" -ForegroundColor Yellow
} else {
    Write-Host "Backup verification failed!" -ForegroundColor Red
    exit 1
}