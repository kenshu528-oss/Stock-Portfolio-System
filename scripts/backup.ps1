# 自動備份腳本 - Stock Portfolio System (PowerShell 版本)

param(
    [switch]$Help,
    [switch]$Verbose
)

# 顏色函數
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Write-Info {
    param([string]$Message)
    Write-ColorOutput "[INFO] $Message" "Green"
}

function Write-Warning {
    param([string]$Message)
    Write-ColorOutput "[WARN] $Message" "Yellow"
}

function Write-Error {
    param([string]$Message)
    Write-ColorOutput "[ERROR] $Message" "Red"
}

# 顯示說明
if ($Help) {
    Write-Host "Stock Portfolio System 備份工具"
    Write-Host ""
    Write-Host "使用方式:"
    Write-Host "  .\scripts\backup.ps1 [-Verbose] [-Help]"
    Write-Host ""
    Write-Host "參數:"
    Write-Host "  -Verbose    顯示詳細資訊"
    Write-Host "  -Help       顯示此說明"
    exit 0
}

# 檢查是否在專案根目錄
if (-not (Test-Path "package.json") -or -not (Test-Path "src")) {
    Write-Error "請在專案根目錄執行此腳本"
    exit 1
}

# 讀取當前版本號
if (-not (Test-Path "src\constants\version.ts")) {
    Write-Error "找不到版本檔案: src\constants\version.ts"
    exit 1
}

try {
    $versionContent = Get-Content "src\constants\version.ts" -Raw
    $patchMatch = [regex]::Match($versionContent, "PATCH:\s*(\d+)")
    
    if (-not $patchMatch.Success) {
        Write-Error "無法讀取版本號"
        exit 1
    }
    
    $patchVersion = [int]$patchMatch.Groups[1].Value
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $versionString = "1.0.0.{0:D4}" -f $patchVersion
    $backupName = "backup-v$versionString-$timestamp"
    
    Write-Info "開始建立備份: $backupName"
    
    # 檢查 Git 狀態
    if (Test-Path ".git") {
        try {
            # 檢查是否有未提交的變更
            $gitStatus = git status --porcelain 2>$null
            if ($gitStatus) {
                Write-Warning "發現未提交的變更，將包含在備份中"
            }
            
            # 建立 Git 備份
            Write-Info "建立 Git 備份點..."
            git add . 2>$null
            git commit -m "Auto backup: $backupName" 2>$null
            if ($LASTEXITCODE -ne 0) {
                Write-Warning "Git commit 失敗，可能沒有變更"
            }
            git tag $backupName 2>$null
            Write-Info "Git 備份完成: 標籤 $backupName"
        catch {
            Write-Warning "Git 操作失敗: $($_.Exception.Message)"
        }
    }
    else {
        Write-Warning "未找到 Git 倉庫，跳過 Git 備份"
    }
    
    # 建立檔案系統備份
    Write-Info "建立檔案系統備份..."
    $backupDir = "..\backups"
    $fullBackupPath = "$backupDir\stock-portfolio-$backupName"
    
    # 建立備份目錄
    if (-not (Test-Path $backupDir)) {
        New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    }
    
    # 複製專案檔案（排除不必要的檔案）
    Write-Info "複製專案檔案到: $fullBackupPath"
    $excludePatterns = @("node_modules", ".git", "dist", ".vscode", "*.log")
    
    # 建立目標目錄
    New-Item -ItemType Directory -Path $fullBackupPath -Force | Out-Null
    
    # 複製檔案
    $items = Get-ChildItem -Path "." -Recurse | Where-Object {
        $item = $_
        $shouldExclude = $false
        foreach ($pattern in $excludePatterns) {
            if ($item.FullName -like "*$pattern*") {
                $shouldExclude = $true
                break
            }
        }
        -not $shouldExclude
    }
    
    foreach ($item in $items) {
        $relativePath = $item.FullName.Substring((Get-Location).Path.Length + 1)
        $targetPath = Join-Path $fullBackupPath $relativePath
        
        if ($item.PSIsContainer) {
            if (-not (Test-Path $targetPath)) {
                New-Item -ItemType Directory -Path $targetPath -Force | Out-Null
            }
        }
        else {
            $targetDir = Split-Path $targetPath -Parent
            if (-not (Test-Path $targetDir)) {
                New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
            }
            Copy-Item $item.FullName $targetPath -Force
        }
    }
    
    # 建立備份資訊檔案
    $backupInfo = @"
備份資訊
========
版本: v$versionString
建立時間: $(Get-Date)
備份名稱: $backupName
原始路徑: $(Get-Location)
Git Commit: $(if (Test-Path ".git") { git rev-parse HEAD 2>$null } else { "N/A" })
"@
    
    $backupInfo | Out-File -FilePath "$fullBackupPath\.backup-info" -Encoding UTF8
    
    Write-Info "檔案系統備份完成"
    
    # 驗證備份
    Write-Info "驗證備份完整性..."
    if ((Test-Path "$fullBackupPath\package.json") -and (Test-Path "$fullBackupPath\src")) {
        Write-Info "備份驗證成功"
    }
    else {
        Write-Error "備份驗證失敗"
        exit 1
    }
    
    # 清理舊備份（保留最近 10 個）
    Write-Info "清理舊備份..."
    $oldBackups = Get-ChildItem "$backupDir\stock-portfolio-backup-*" -Directory 2>$null | 
                  Sort-Object CreationTime -Descending | 
                  Select-Object -Skip 10
    
    foreach ($oldBackup in $oldBackups) {
        Remove-Item $oldBackup.FullName -Recurse -Force
        if ($Verbose) {
            Write-Info "已刪除舊備份: $($oldBackup.Name)"
        }
    }
    
    # 顯示備份資訊
    Write-Info "備份完成！"
    Write-Host "備份名稱: $backupName" -ForegroundColor Cyan
    Write-Host "備份位置: $fullBackupPath" -ForegroundColor Cyan
    Write-Host "Git 標籤: $backupName" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "復原指令:" -ForegroundColor Yellow
    Write-Host "  Git 復原: git reset --hard $backupName" -ForegroundColor White
    Write-Host "  檔案復原: .\scripts\restore.ps1 $backupName" -ForegroundColor White
}
catch {
    Write-Error "備份過程中發生錯誤: $($_.Exception.Message)"
    exit 1
}