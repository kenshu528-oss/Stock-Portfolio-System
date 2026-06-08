@echo off
chcp 65001 >nul
echo 🧹 版本清理工具 - v3.0.0 (動態版)
echo.

echo 📋 保留策略：
echo    🏆 永久保留: 當前最新版本 (1個)
echo    ⏰ 短期保留: 最近 3 個版本
echo    🔄 長期保留: 重要里程碑 (最多 6 個)
echo    🎯 總數目標: 8-12 個版本
echo.

REM 動態顯示當前版本
echo 📂 當前所有版本：
set /a count=0
for /d %%i in (github-releases\github-release-v*) do (
    echo    %%~nxi
    set /a count+=1
)
echo.
echo    總計: %count% 個版本

if %count% LEQ 12 if %count% GEQ 8 (
    echo    狀態: ✅ 符合目標範圍 (8-12個)
) else if %count% LSS 8 (
    echo    狀態: ℹ️  版本數量偏少
) else (
    echo    狀態: ⚠️  超出目標範圍，建議清理
)

echo.
echo 📋 當前保留分類 (v1.0.2.0394 為基準)：
echo.
echo    🏆 永久保留 (1個)：
echo       ✅ v1.0.2.0394 (當前版本)
echo.
echo    ⏰ 短期保留 (3個)：
echo       ✅ v1.0.2.0393
echo       ✅ v1.0.2.0392
echo       ✅ v1.0.2.0391
echo.
echo    🔄 長期保留 (6個)：
echo       ✅ v1.0.2.0390 (批量更新優化)
echo       ✅ v1.0.2.0386 (重要功能版本)
echo       ✅ v1.0.2.0382 (重要功能版本)
echo       ✅ v1.0.2.0378 (穩定里程碑)
echo       ✅ v1.0.2.0371 (隱蔽後門雲端修復)
echo       ✅ v1.0.2.0361 (Vercel Edge Functions 整合)
echo.
echo ✅ 清理檢查完成！
echo    如需清理，請手動刪除不在上述清單中的版本資料夾。
echo.
pause
