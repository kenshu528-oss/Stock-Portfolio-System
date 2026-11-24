@echo off
chcp 65001 >nul
echo 🎯 版本數量限制管理工具 - v3.0.0 (動態版)
echo.

REM 設定分層數量限制
set MAX_PERMANENT=1
set MAX_LONGTERM=6
set MAX_SHORTTERM=3
set /a MAX_TOTAL=%MAX_PERMANENT%+%MAX_LONGTERM%+%MAX_SHORTTERM%

echo 📋 分層數量限制設定：
echo    🏆 永久保留: 最多 %MAX_PERMANENT% 個 (當前版本)
echo    🔄 長期保留: 最多 %MAX_LONGTERM% 個 (重要里程碑)
echo    ⏰ 短期保留: 固定 %MAX_SHORTTERM% 個 (最近版本)
echo    🎯 總數上限: %MAX_TOTAL% 個
echo.

REM 動態計算當前版本數量
set /a current_count=0
for /d %%i in (github-releases\github-release-v*) do set /a current_count+=1

echo 📊 當前狀態：
echo    當前版本總數: %current_count% 個
echo    總數上限: %MAX_TOTAL% 個

echo.
echo 📂 現有版本清單：
for /d %%i in (github-releases\github-release-v*) do echo    %%~nxi

if %current_count% LEQ %MAX_TOTAL% (
    echo.
    echo    狀態: ✅ 符合限制 (%current_count%/%MAX_TOTAL%)
    echo.
    echo ℹ️  當前版本數量在限制範圍內，無需清理。
) else (
    set /a excess=%current_count%-%MAX_TOTAL%
    echo.
    echo    狀態: ⚠️ 超出限制 (超出 !excess! 個)
    echo.
    echo 💡 請手動評估並刪除最不重要的版本：
    echo    建議優先刪除：中間開發版本、功能重複版本
    echo    保留原則：當前版本 + 最近3個 + 重要里程碑6個
)

echo.
echo 📋 保留原則提醒：
echo    🏆 永久: 當前最新版本 (PATCH 最大)
echo    ⏰ 短期: 最近 3 個版本 (快速回滾用)
echo    🔄 長期: 重要功能里程碑 (最多 6 個)
echo.
echo ✅ 版本數量限制管理完成！
pause
