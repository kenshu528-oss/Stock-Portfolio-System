# Quick Restore Script for Stock Portfolio System

param(
    [string]$BackupName
)

if (-not $BackupName) {
    Write-Host "Usage: .\scripts\quick-restore.ps1 <backup-name>" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Available backups:" -ForegroundColor Green
    if (Test-Path "..\backups") {
        Get-ChildItem "..\backups\backup-*" -Directory | Sort-Object CreationTime -Descending | ForEach-Object {
            Write-Host "  $($_.Name)" -ForegroundColor Cyan
        }
    }
    exit 0
}

$backupPath = "..\backups\$BackupName"

if (-not (Test-Path $backupPath)) {
    Write-Host "Error: Backup not found: $backupPath" -ForegroundColor Red
    exit 1
}

Write-Host "WARNING: This will overwrite all current files!" -ForegroundColor Yellow
$confirm = Read-Host "Are you sure you want to continue? (y/N)"
if ($confirm -notmatch "^[Yy]$") {
    Write-Host "Restore cancelled" -ForegroundColor Green
    exit 0
}

Write-Host "Starting restore..." -ForegroundColor Green

# Create emergency backup
$emergencyBackup = "emergency-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Write-Host "Creating emergency backup: $emergencyBackup" -ForegroundColor Green

if (-not (Test-Path "..\backups")) {
    New-Item -ItemType Directory -Path "..\backups" -Force | Out-Null
}

robocopy . "..\backups\$emergencyBackup" /E /XD node_modules .git dist .vscode /XF *.log /R:1 /W:1 /NP

# Remove current files (except important directories)
Write-Host "Cleaning current files..." -ForegroundColor Green
Get-ChildItem -Path "." | Where-Object {
    $_.Name -notin @(".git", "node_modules", "dist", ".vscode", "scripts")
} | Remove-Item -Recurse -Force

# Restore from backup
Write-Host "Restoring files..." -ForegroundColor Green
robocopy $backupPath . /E /XD .git node_modules dist /R:1 /W:1 /NP

# Verify restore
if ((Test-Path "package.json") -and (Test-Path "src")) {
    Write-Host "Restore completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Recommended next steps:" -ForegroundColor Yellow
    Write-Host "  1. npm install" -ForegroundColor White
    Write-Host "  2. npm test" -ForegroundColor White
    Write-Host "  3. npm run build" -ForegroundColor White
    Write-Host "  4. npm run dev" -ForegroundColor White
} else {
    Write-Host "Restore verification failed!" -ForegroundColor Red
    exit 1
}