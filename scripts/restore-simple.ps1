# 簡化版復原腳本 - Stock Portfolio System

param(
    [string]$BackupName,
    [switch]$List
)

if ($List) {
    Write-Host "[INFO] 可用的備份:" -ForegroundColor Green
    if (Test-Path "..\backups") {
        $backups = Get-ChildItem "..\backups\stock-portfolio-backup-*" -Directory | Sort-Object CreationTime -Descending
        foreach ($backup in $backups) {
            Write-Host "  $($backup.Name)" -ForegroundColor Cyan
        }
    } else {
        Write-Host "[WARN] 未找到備份目錄" -ForegroundColor Yellow
    }
    exit 0
}

if (-not $BackupName) {
    Write-Host "[ERROR] 請指定備份名稱" -ForegroundColor Red
    Write-Host "使用方式: .\scripts\restore-simple.ps1 <備份名稱>" -ForegroundColor White
    Write-Host "列出備份: .\scripts\restore-simple.ps1 -List" -ForegroundColor White
    exit 1
}

# 檢查是否在專案根目錄
if (-not (Test-Path "package.json")) {
    Write-Host "[ERROR] 請在專案根目錄執行此腳本" -ForegroundColor Red
    exit 1
}

$backupPath = "..\backups\stock-portfolio-$BackupName"

if (-not (Test-Path $backupPath)) {
    Write-Host "[ERROR] 備份不存在: $backupPath" -ForegroundColor Red
    exit 1
}

Write-Host "[WARN] 這將會覆蓋當前的所有檔案！" -ForegroundColor Yellow
$confirm = Read-Host "確定要繼續嗎？(y/N)"
if ($confirm -notmatch "^[Yy]$") {
    Write-Host "[INFO] 取消復原" -ForegroundColor Green
    exit 0
}

try {
    Write-Host "[INFO] 開始復原..." -ForegroundColor Green
    
    # 建立緊急備份
    $emergencyBackup = "emergency-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Write-Host "[INFO] 建立緊急備份: $emergencyBackup" -ForegroundColor Green
    
    if (-not (Test-Path "..\backups")) {
        New-Item -ItemType Directory -Path "..\backups" -Force | Out-Null
    }
    
    # 使用 robocopy 建立緊急備份
    $emergencyPath = "..\backups\$emergencyBackup"
    $robocopyArgs = @(
        ".",
        $emergencyPath,
        "/E",
        "/XD", "node_modules .git dist .vscode",
        "/XF", "*.log",
        "/R:1",
        "/W:1"
    )
    
    Start-Process -FilePath "robocopy" -ArgumentList $robocopyArgs -Wait -NoNewWindow | Out-Null
    
    # 刪除現有檔案（保留重要目錄）
    Write-Host "[INFO] 清理現有檔案..." -ForegroundColor Green
    $itemsToDelete = Get-ChildItem -Path "." | Where-Object {
        $_.Name -notin @(".git", "node_modules", "dist", ".vscode", "scripts")
    }
    
    foreach ($item in $itemsToDelete) {
        Remove-Item $item.FullName -Recurse -Force
    }
    
    # 從備份復原
    Write-Host "[INFO] 復原檔案..." -ForegroundColor Green
    $robocopyArgs = @(
        $backupPath,
        ".",
        "/E",
        "/XD", ".git node_modules dist",
        "/R:1",
        "/W:1"
    )
    
    $result = Start-Process -FilePath "robocopy" -ArgumentList $robocopyArgs -Wait -PassThru -NoNewWindow
    
    if ($result.ExitCode -le 7) {
        Write-Host "[INFO] 復原完成" -ForegroundColor Green
        
        # 驗證復原
        if ((Test-Path "package.json") -and (Test-Path "src")) {
            Write-Host "[INFO] 復原驗證成功" -ForegroundColor Green
            Write-Host ""
            Write-Host "建議執行以下步驟:" -ForegroundColor Yellow
            Write-Host "  1. npm install" -ForegroundColor White
            Write-Host "  2. npm test" -ForegroundColor White
            Write-Host "  3. npm run build" -ForegroundColor White
            Write-Host "  4. npm run dev" -ForegroundColor White
        } else {
            Write-Host "[ERROR] 復原驗證失敗" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "[ERROR] 復原失敗" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "[ERROR] 復原過程中發生錯誤: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}