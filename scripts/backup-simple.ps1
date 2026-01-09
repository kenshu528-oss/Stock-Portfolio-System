# 簡化版備份腳本 - Stock Portfolio System

Write-Host "[INFO] 開始建立備份..." -ForegroundColor Green

# 檢查是否在專案根目錄
if (-not (Test-Path "package.json")) {
    Write-Host "[ERROR] 請在專案根目錄執行此腳本" -ForegroundColor Red
    exit 1
}

# 讀取版本號
try {
    $versionContent = Get-Content "src\constants\version.ts" -Raw
    $patchMatch = [regex]::Match($versionContent, "PATCH:\s*(\d+)")
    $patchVersion = [int]$patchMatch.Groups[1].Value
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $versionString = "1.0.0.{0:D4}" -f $patchVersion
    $backupName = "backup-v$versionString-$timestamp"
    
    Write-Host "[INFO] 備份名稱: $backupName" -ForegroundColor Green
    
    # 建立備份目錄
    $backupDir = "..\backups"
    $fullBackupPath = "$backupDir\stock-portfolio-$backupName"
    
    if (-not (Test-Path $backupDir)) {
        New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    }
    
    Write-Host "[INFO] 建立檔案系統備份..." -ForegroundColor Green
    
    # 使用 robocopy 複製檔案（Windows 內建工具）
    $excludeDirs = @("node_modules", ".git", "dist", ".vscode")
    $excludeFiles = @("*.log")
    
    $robocopyArgs = @(
        ".",
        $fullBackupPath,
        "/E",  # 複製子目錄，包括空目錄
        "/XD", ($excludeDirs -join " "),  # 排除目錄
        "/XF", ($excludeFiles -join " "), # 排除檔案
        "/R:1", # 重試次數
        "/W:1"  # 等待時間
    )
    
    $result = Start-Process -FilePath "robocopy" -ArgumentList $robocopyArgs -Wait -PassThru -NoNewWindow
    
    # robocopy 的退出碼 0-7 都是成功
    if ($result.ExitCode -le 7) {
        Write-Host "[INFO] 檔案複製完成" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] 檔案複製失敗" -ForegroundColor Red
        exit 1
    }
    
    # 建立備份資訊檔案
    $backupInfo = @"
備份資訊
========
版本: v$versionString
建立時間: $(Get-Date)
備份名稱: $backupName
原始路徑: $(Get-Location)
"@
    
    $backupInfo | Out-File -FilePath "$fullBackupPath\.backup-info" -Encoding UTF8
    
    # 驗證備份
    if ((Test-Path "$fullBackupPath\package.json") -and (Test-Path "$fullBackupPath\src")) {
        Write-Host "[INFO] 備份驗證成功" -ForegroundColor Green
        Write-Host "備份位置: $fullBackupPath" -ForegroundColor Cyan
        Write-Host "復原指令: .\scripts\restore-simple.ps1 $backupName" -ForegroundColor Yellow
    } else {
        Write-Host "[ERROR] 備份驗證失敗" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "[ERROR] 備份失敗: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}