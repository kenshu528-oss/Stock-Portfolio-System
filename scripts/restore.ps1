# 快速復原腳本 - Stock Portfolio System (PowerShell 版本)

param(
    [string]$BackupName,
    [switch]$List,
    [switch]$Git,
    [switch]$File,
    [switch]$Help,
    [switch]$Force
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

function Write-Question {
    param([string]$Message)
    Write-ColorOutput "[QUESTION] $Message" "Blue"
}

# 顯示使用說明
function Show-Usage {
    Write-Host "Stock Portfolio System 復原工具"
    Write-Host ""
    Write-Host "使用方式:"
    Write-Host "  .\scripts\restore.ps1 [參數] [備份名稱]"
    Write-Host ""
    Write-Host "參數:"
    Write-Host "  -List       列出可用的備份"
    Write-Host "  -Git        使用 Git 復原"
    Write-Host "  -File       使用檔案系統復原"
    Write-Host "  -Force      強制復原，不詢問確認"
    Write-Host "  -Help       顯示此說明"
    Write-Host ""
    Write-Host "範例:"
    Write-Host "  .\scripts\restore.ps1 -List"
    Write-Host "  .\scripts\restore.ps1 backup-v1.0.0.0005-20240108-143022"
    Write-Host "  .\scripts\restore.ps1 -Git backup-v1.0.0.0005-20240108-143022"
}

# 列出可用備份
function Show-Backups {
    Write-Info "可用的 Git 備份標籤:"
    if (Test-Path ".git") {
        try {
            $gitTags = git tag 2>$null | Where-Object { $_ -like "backup-*" } | Sort-Object -Descending | Select-Object -First 10
            foreach ($tag in $gitTags) {
                try {
                    $commitDate = git log -1 --format="%ci" $tag 2>$null
                    Write-Host "  $tag ($commitDate)" -ForegroundColor Cyan
                }
                catch {
                    Write-Host "  $tag" -ForegroundColor Cyan
                }
            }
        }
        catch {
            Write-Warning "無法讀取 Git 標籤"
        }
    }
    else {
        Write-Warning "未找到 Git 倉庫"
    }
    
    Write-Host ""
    Write-Info "可用的檔案系統備份:"
    if (Test-Path "..\backups") {
        $backups = Get-ChildItem "..\backups\stock-portfolio-backup-*" -Directory 2>$null | 
                   Sort-Object CreationTime -Descending | 
                   Select-Object -First 10
        
        foreach ($backup in $backups) {
            $backupInfoPath = Join-Path $backup.FullName ".backup-info"
            if (Test-Path $backupInfoPath) {
                try {
                    $backupInfo = Get-Content $backupInfoPath -Raw
                    $timeMatch = [regex]::Match($backupInfo, "建立時間:\s*(.+)")
                    if ($timeMatch.Success) {
                        $backupTime = $timeMatch.Groups[1].Value.Trim()
                        Write-Host "  $($backup.Name) ($backupTime)" -ForegroundColor Cyan
                    }
                    else {
                        Write-Host "  $($backup.Name)" -ForegroundColor Cyan
                    }
                }
                catch {
                    Write-Host "  $($backup.Name)" -ForegroundColor Cyan
                }
            }
            else {
                Write-Host "  $($backup.Name)" -ForegroundColor Cyan
            }
        }
    }
    else {
        Write-Warning "未找到備份目錄"
    }
}

# Git 復原
function Restore-FromGit {
    param([string]$BackupTag)
    
    if (-not (Test-Path ".git")) {
        Write-Error "未找到 Git 倉庫"
        return $false
    }
    
    # 檢查標籤是否存在
    try {
        $tags = git tag 2>$null
        if ($tags -notcontains $BackupTag) {
            Write-Error "備份標籤 '$BackupTag' 不存在"
            return $false
        }
    }
    catch {
        Write-Error "無法檢查 Git 標籤"
        return $false
    }
    
    if (-not $Force) {
        Write-Warning "這將會重置所有未提交的變更！"
        Write-Question "確定要繼續嗎？(y/N)"
        $confirm = Read-Host
        if ($confirm -notmatch "^[Yy]$") {
            Write-Info "取消復原"
            return $false
        }
    }
    
    try {
        Write-Info "復原到 Git 標籤: $BackupTag"
        git reset --hard $BackupTag 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Info "Git 復原完成"
            return $true
        }
        else {
            Write-Error "Git 復原失敗"
            return $false
        }
    }
    catch {
        Write-Error "Git 復原過程中發生錯誤: $_"
        return $false
    }
}

# 檔案系統復原
function Restore-FromFile {
    param([string]$BackupName)
    
    $backupPath = "..\backups\stock-portfolio-$BackupName"
    
    if (-not (Test-Path $backupPath)) {
        Write-Error "備份目錄不存在: $backupPath"
        return $false
    }
    
    if (-not $Force) {
        Write-Warning "這將會覆蓋當前的所有檔案！"
        Write-Question "確定要繼續嗎？(y/N)"
        $confirm = Read-Host
        if ($confirm -notmatch "^[Yy]$") {
            Write-Info "取消復原"
            return $false
        }
    }
    
    try {
        Write-Info "從檔案系統復原: $backupPath"
        
        # 備份當前狀態（以防萬一）
        $currentBackup = "emergency-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        Write-Info "建立緊急備份: $currentBackup"
        
        if (-not (Test-Path "..\backups")) {
            New-Item -ItemType Directory -Path "..\backups" -Force | Out-Null
        }
        
        $emergencyPath = "..\backups\$currentBackup"
        New-Item -ItemType Directory -Path $emergencyPath -Force | Out-Null
        
        # 複製當前狀態到緊急備份
        $currentItems = Get-ChildItem -Path "." -Recurse | Where-Object {
            $item = $_
            $excludePatterns = @(".git", "node_modules", "dist")
            $shouldExclude = $false
            foreach ($pattern in $excludePatterns) {
                if ($item.FullName -like "*$pattern*") {
                    $shouldExclude = $true
                    break
                }
            }
            -not $shouldExclude
        }
        
        foreach ($item in $currentItems) {
            $relativePath = $item.FullName.Substring((Get-Location).Path.Length + 1)
            $targetPath = Join-Path $emergencyPath $relativePath
            
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
        
        # 復原檔案
        Write-Info "復原檔案..."
        
        # 刪除現有檔案（除了 .git, node_modules, dist）
        $itemsToDelete = Get-ChildItem -Path "." | Where-Object {
            $_.Name -notin @(".git", "node_modules", "dist", ".vscode")
        }
        
        foreach ($item in $itemsToDelete) {
            Remove-Item $item.FullName -Recurse -Force
        }
        
        # 從備份復原
        $backupItems = Get-ChildItem -Path $backupPath -Recurse
        
        foreach ($item in $backupItems) {
            $relativePath = $item.FullName.Substring($backupPath.Length + 1)
            $targetPath = Join-Path "." $relativePath
            
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
        
        Write-Info "檔案系統復原完成"
        return $true
    }
    catch {
        Write-Error "檔案系統復原過程中發生錯誤: $_"
        return $false
    }
}

# 復原後驗證
function Test-Restore {
    Write-Info "驗證復原結果..."
    
    # 檢查關鍵檔案
    $criticalFiles = @("package.json", "src", "src\constants\version.ts")
    $allGood = $true
    
    foreach ($file in $criticalFiles) {
        if (-not (Test-Path $file)) {
            Write-Error "$file 不存在"
            $allGood = $false
        }
    }
    
    if (-not $allGood) {
        return $false
    }
    
    # 讀取版本號
    try {
        $versionContent = Get-Content "src\constants\version.ts" -Raw
        $patchMatch = [regex]::Match($versionContent, "PATCH:\s*(\d+)")
        
        if ($patchMatch.Success) {
            $patchVersion = [int]$patchMatch.Groups[1].Value
            $versionString = "v1.0.0.{0:D4}" -f $patchVersion
            Write-Info "當前版本: $versionString"
        }
        else {
            Write-Warning "無法讀取版本號"
        }
    }
    catch {
        Write-Warning "版本檔案讀取失敗"
    }
    
    Write-Info "基本驗證通過"
    
    # 建議後續步驟
    Write-Host ""
    Write-Info "建議執行以下步驟完成復原:"
    Write-Host "  1. npm install          # 重新安裝相依套件" -ForegroundColor White
    Write-Host "  2. npm test            # 執行測試" -ForegroundColor White
    Write-Host "  3. npm run build       # 驗證建置" -ForegroundColor White
    Write-Host "  4. npm run dev         # 啟動開發伺服器" -ForegroundColor White
    
    return $true
}

# 主程式
function Main {
    # 顯示說明
    if ($Help) {
        Show-Usage
        return
    }
    
    # 列出備份
    if ($List) {
        Show-Backups
        return
    }
    
    # 檢查是否在專案根目錄
    if (-not (Test-Path "package.json")) {
        Write-Error "請在專案根目錄執行此腳本"
        exit 1
    }
    
    # 如果沒有指定備份目標，顯示可用備份
    if (-not $BackupName) {
        Write-Info "未指定備份目標，顯示可用備份:"
        Write-Host ""
        Show-Backups
        Write-Host ""
        Write-Question "請輸入要復原的備份名稱:"
        $BackupName = Read-Host
        
        if (-not $BackupName) {
            Write-Info "取消復原"
            return
        }
    }
    
    Write-Info "開始復原程序..."
    Write-Info "目標備份: $BackupName"
    
    $success = $false
    
    # 執行復原
    if ($Git) {
        Write-Info "使用 Git 復原"
        $success = Restore-FromGit $BackupName
    }
    elseif ($File) {
        Write-Info "使用檔案系統復原"
        $success = Restore-FromFile $BackupName
    }
    else {
        # 自動選擇復原方式
        if ((Test-Path ".git")) {
            try {
                $tags = git tag 2>$null
                if ($tags -contains $BackupName) {
                    Write-Info "使用 Git 復原"
                    $success = Restore-FromGit $BackupName
                }
                else {
                    Write-Info "使用檔案系統復原"
                    $success = Restore-FromFile $BackupName
                }
            }
            catch {
                Write-Info "使用檔案系統復原"
                $success = Restore-FromFile $BackupName
            }
        }
        elseif (Test-Path "..\backups\stock-portfolio-$BackupName") {
            Write-Info "使用檔案系統復原"
            $success = Restore-FromFile $BackupName
        }
        else {
            Write-Error "找不到備份: $BackupName"
            exit 1
        }
    }
    
    if ($success) {
        # 驗證復原結果
        if (Test-Restore) {
            Write-Info "復原完成！"
        }
        else {
            Write-Error "復原驗證失敗"
            exit 1
        }
    }
    else {
        Write-Error "復原失敗"
        exit 1
    }
}

# 執行主程式
Main