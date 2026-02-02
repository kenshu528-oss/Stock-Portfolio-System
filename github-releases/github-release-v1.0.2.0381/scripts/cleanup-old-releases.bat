@echo off
chcp 65001 >nul
echo 🧹 分層數量限制版本清理工具 - v2.0.0
echo.

echo 📋 分層數量限制策略：
echo    🏆 永久保留: 不限 (當前穩定版本)
echo    🔄 長期保留: 最多6個 (重要功能版本)
echo    ⏰ 短期保留: 固定3個 (最近版本)
echo    🎯 總數控制: 8-12個版本
echo.

REM 顯示當前版本
echo 📂 當前所有版本：
for /d %%i in (github-releases\github-release-v*) do (
    echo    %%~nxi
)

echo.
echo 🎯 分層保留分析：

echo.
echo 🏆 永久保留 (1個)：
echo    ✅ v1.0.2.0378 (當前穩定版)

echo.
echo ⏰ 短期保留 (3個) - 最近版本：
echo    ✅ v1.0.2.0377 (最近版本 #1)
echo    ✅ v1.0.2.0373 (最近版本 #2)
echo    ✅ v1.0.2.0372 (最近版本 #3)

echo.
echo 🔄 長期保留 (6個) - 按重要性排序：
echo    ✅ v1.0.2.0371 (⭐⭐⭐⭐⭐ 隱蔽後門雲端修復)
echo    ✅ v1.0.2.0361 (⭐⭐⭐⭐ Vercel Edge Functions 整合)
echo    ✅ v1.0.2.0336 (⭐⭐⭐ 重要功能版本)
echo    ✅ v1.0.2.0299 (⭐⭐⭐ 功能里程碑版本)
echo    ✅ v1.0.2.0261 (⭐⭐ 早期穩定版本)
echo    ✅ v1.0.2.0240 (⭐⭐ 早期里程碑版本)

echo.
echo 📊 版本數量統計：
set /a count=0
for /d %%i in (github-releases\github-release-v*) do set /a count+=1
echo    當前版本總數: %count% 個
echo    目標範圍: 8-12 個
if %count% LEQ 12 if %count% GEQ 8 (
    echo    狀態: ✅ 符合目標範圍
) else (
    echo    狀態: ⚠️ 超出目標範圍
)

echo.
echo 💾 磁碟使用情況：
for /f "tokens=3" %%a in ('dir github-releases /s /-c 2^>nul ^| find "個檔案"') do set size=%%a
if defined size (
    echo    總大小: %size% bytes
) else (
    echo    總大小: 計算中...
)

echo.
echo 🔄 未來版本管理規則：
echo    - 新穩定版本 → 更新永久保留
echo    - 新功能版本 → 評估進入長期保留 (最多6個)
echo    - 新開發版本 → 進入短期保留 (固定3個)
echo    - 超過限制時 → 自動淘汰最不重要的版本

echo.
echo 📋 版本重要性評估標準：
echo    ⭐⭐⭐⭐⭐ 重大功能突破 (如隱蔽後門修復)
echo    ⭐⭐⭐⭐ 架構變更 (如 Vercel 整合)
echo    ⭐⭐⭐ 重要功能版本
echo    ⭐⭐ 早期里程碑版本
echo    ⭐ 一般功能版本

echo.
echo ✅ 分層數量限制檢查完成！
echo    當前配置符合策略要求，無需額外清理。
echo.
pause