# Kiro 右鍵選單設定腳本
# 需要以管理員權限執行

Write-Host "正在設定 Kiro 右鍵選單..." -ForegroundColor Green

# 檢查 Kiro 安裝路徑
$possiblePaths = @(
    "$env:LOCALAPPDATA\Programs\Kiro\Kiro.exe",
    "$env:PROGRAMFILES\Kiro\Kiro.exe",
    "$env:PROGRAMFILES(X86)\Kiro\Kiro.exe",
    "C:\Program Files\Kiro\Kiro.exe",
    "C:\Program Files (x86)\Kiro\Kiro.exe"
)

$kiroPath = $null
foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        $kiroPath = $path
        Write-Host "找到 Kiro: $kiroPath" -ForegroundColor Yellow
        break
    }
}

if (-not $kiroPath) {
    Write-Host "錯誤: 找不到 Kiro 安裝路徑" -ForegroundColor Red
    Write-Host "請手動指定 Kiro.exe 的完整路徑:" -ForegroundColor Yellow
    $kiroPath = Read-Host "Kiro.exe 路徑"
    
    if (-not (Test-Path $kiroPath)) {
        Write-Host "錯誤: 指定的路徑不存在" -ForegroundColor Red
        exit 1
    }
}

try {
    # 添加資料夾右鍵選單
    Write-Host "添加資料夾右鍵選單..." -ForegroundColor Cyan
    
    $folderShellKey = "HKCR:\Directory\shell\OpenWithKiro"
    $folderCommandKey = "HKCR:\Directory\shell\OpenWithKiro\command"
    
    New-Item -Path $folderShellKey -Force | Out-Null
    Set-ItemProperty -Path $folderShellKey -Name "(Default)" -Value "用 Kiro 開啟"
    Set-ItemProperty -Path $folderShellKey -Name "Icon" -Value "$kiroPath,0"
    
    New-Item -Path $folderCommandKey -Force | Out-Null
    Set-ItemProperty -Path $folderCommandKey -Name "(Default)" -Value "`"$kiroPath`" `"%1`""
    
    # 添加資料夾背景右鍵選單
    Write-Host "添加資料夾背景右鍵選單..." -ForegroundColor Cyan
    
    $backgroundShellKey = "HKCR:\Directory\Background\shell\OpenWithKiro"
    $backgroundCommandKey = "HKCR:\Directory\Background\shell\OpenWithKiro\command"
    
    New-Item -Path $backgroundShellKey -Force | Out-Null
    Set-ItemProperty -Path $backgroundShellKey -Name "(Default)" -Value "用 Kiro 開啟"
    Set-ItemProperty -Path $backgroundShellKey -Name "Icon" -Value "$kiroPath,0"
    
    New-Item -Path $backgroundCommandKey -Force | Out-Null
    Set-ItemProperty -Path $backgroundCommandKey -Name "(Default)" -Value "`"$kiroPath`" `"%V`""
    
    Write-Host "✅ Kiro 右鍵選單設定完成！" -ForegroundColor Green
    Write-Host "現在你可以在資料夾上右鍵選擇「用 Kiro 開啟」" -ForegroundColor Yellow
    
} catch {
    Write-Host "❌ 設定失敗: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "請確保以管理員權限執行此腳本" -ForegroundColor Yellow
}

Write-Host "按任意鍵繼續..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")