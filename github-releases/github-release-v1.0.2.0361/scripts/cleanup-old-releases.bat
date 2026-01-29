@echo off
echo 🧹 清理舊版本發布資料夾...
echo.

REM 設定保留策略
set KEEP_RECENT=5
set KEEP_MILESTONE=1

echo 📋 當前版本清理策略：
echo    - 保留最近 %KEEP_RECENT% 個版本
echo    - 保留重要里程碑版本 (如 .0001, .0100 等)
echo    - 清理中間開發版本
echo.

REM 顯示當前版本
echo 📂 當前保留的版本：
dir /b github-releases

echo.
echo ⚠️  注意：此腳本需要手動執行具體的清理操作
echo    建議先檢查版本重要性再決定是否清理
echo.

REM 顯示磁碟使用情況
echo 💾 github-releases 資料夾大小：
powershell -command "Get-ChildItem -Path 'github-releases' -Recurse | Measure-Object -Property Length -Sum | Select-Object @{Name='Size(MB)';Expression={[math]::Round($_.Sum/1MB,2)}}"

echo.
echo ✅ 檢查完成！
pause