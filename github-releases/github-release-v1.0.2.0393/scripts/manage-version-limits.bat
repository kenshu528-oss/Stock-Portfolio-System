@echo off
chcp 65001 >nul
echo 🎯 版本數量限制管理工具 - v2.0.0
echo.

REM 設定分層數量限制
set MAX_PERMANENT=2
set MAX_LONGTERM=6
set MAX_SHORTTERM=3
set /a MAX_TOTAL=%MAX_PERMANENT%+%MAX_LONGTERM%+%MAX_SHORTTERM%

echo 📋 分層數量限制設定：
echo    🏆 永久保留: 最多 %MAX_PERMANENT% 個
echo    🔄 長期保留: 最多 %MAX_LONGTERM% 個  
echo    ⏰ 短期保留: 固定 %MAX_SHORTTERM% 個
echo    🎯 總數上限: %MAX_TOTAL% 個
echo.

REM 計算當前版本數量
set /a current_count=0
for /d %%i in (github-releases\github-release-v*) do set /a current_count+=1

echo 📊 當前狀態：
echo    當前版本總數: %current_count% 個
echo    總數上限: %MAX_TOTAL% 個

if %current_count% LEQ %MAX_TOTAL% (
    echo    狀態: ✅ 符合限制
    echo.
    echo ℹ️  當前版本數量在限制範圍內，無需清理。
    goto :end
) else (
    echo    狀態: ⚠️ 超出限制 (超出 %current_count%-%MAX_TOTAL% = %current_count%-%MAX_TOTAL% 個)
)

echo.
echo 🔍 分析需要清理的版本...

REM 定義當前分層 (這裡需要根據實際情況調整)
echo.
echo 🏆 永久保留版本 (當前1個，限制%MAX_PERMANENT%個)：
echo    v1.0.2.0378 (當前穩定版)

echo.
echo ⏰ 短期保留版本 (當前3個，限制%MAX_SHORTTERM%個)：
echo    v1.0.2.0377, v1.0.2.0373, v1.0.2.0372

echo.
echo 🔄 長期保留版本 (當前6個，限制%MAX_LONGTERM%個)：
echo    v1.0.2.0371 (⭐⭐⭐⭐⭐)
echo    v1.0.2.0361 (⭐⭐⭐⭐)
echo    v1.0.2.0336 (⭐⭐⭐)
echo    v1.0.2.0299 (⭐⭐⭐)
echo    v1.0.2.0261 (⭐⭐)
echo    v1.0.2.0240 (⭐⭐)

echo.
echo 💡 清理建議：
if %current_count% GTR %MAX_TOTAL% (
    set /a excess=%current_count%-%MAX_TOTAL%
    echo    需要清理 %excess% 個版本以符合限制
    echo    建議清理最低重要性的長期保留版本
    echo.
    echo 🗑️  建議清理順序 (從最不重要開始)：
    echo    1. v1.0.2.0240 (⭐⭐ 早期里程碑)
    echo    2. v1.0.2.0261 (⭐⭐ 早期穩定版本)
    echo    3. v1.0.2.0299 (⭐⭐⭐ 功能里程碑)
    echo.
    echo ⚠️  是否要執行自動清理？(y/N)
    set /p choice=請選擇: 
    
    if /i "%choice%"=="y" (
        echo.
        echo 🗑️  開始清理最低重要性版本...
        
        REM 清理最低重要性的版本
        if exist "github-releases\github-release-v1.0.2.0240" (
            echo    清理 v1.0.2.0240 (⭐⭐ 早期里程碑)...
            rmdir /s /q "github-releases\github-release-v1.0.2.0240"
            set /a current_count-=1
        )
        
        if %current_count% GTR %MAX_TOTAL% (
            if exist "github-releases\github-release-v1.0.2.0261" (
                echo    清理 v1.0.2.0261 (⭐⭐ 早期穩定版本)...
                rmdir /s /q "github-releases\github-release-v1.0.2.0261"
                set /a current_count-=1
            )
        )
        
        echo.
        echo ✅ 清理完成！
        echo.
        echo 📊 清理後狀態：
        set /a final_count=0
        for /d %%i in (github-releases\github-release-v*) do set /a final_count+=1
        echo    最終版本總數: %final_count% 個
        echo    總數上限: %MAX_TOTAL% 個
        if %final_count% LEQ %MAX_TOTAL% (
            echo    狀態: ✅ 符合限制
        ) else (
            echo    狀態: ⚠️ 仍超出限制
        )
    ) else (
        echo.
        echo ℹ️  清理已取消。
    )
)

:end
echo.
echo 📋 未來版本管理提醒：
echo    - 新版本發布前先檢查數量限制
echo    - 定期評估長期保留版本的重要性
echo    - 考慮將超舊版本歸檔到外部儲存
echo.
echo ✅ 版本數量限制管理完成！
pause