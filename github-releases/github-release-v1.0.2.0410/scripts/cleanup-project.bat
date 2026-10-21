@echo off
chcp 65001 >nul
echo ========================================
echo 專案清理工具 - 移除用不到的檔案
echo ========================================
echo.

echo 準備清理以下檔案：
echo.
echo [1] 根目錄的舊 stock_list 檔案（19個）
echo     - stock_list_2026-02-23.json 到 stock_list_2026-03-12.json
echo     - 保留 public/stock_list.json（主要檔案）
echo.
echo [2] public 目錄的舊 stock_list 檔案（除了最新的）
echo.
echo [3] 環境機制定義.md（已整合到 docs）
echo.
echo [4] 舊的測試檔案（已過時的 debug 檔案）
echo.

set /p confirm="確定要清理這些檔案嗎？(Y/N): "
if /i not "%confirm%"=="Y" (
    echo 取消清理
    exit /b 0
)

echo.
echo 開始清理...
echo.

REM 清理根目錄的舊 stock_list 檔案
echo [1/4] 清理根目錄的舊 stock_list 檔案...
del /q "stock_list_2026-*.json" 2>nul
if %errorlevel%==0 (
    echo ✓ 已清理根目錄的舊 stock_list 檔案
) else (
    echo ✓ 根目錄沒有需要清理的 stock_list 檔案
)

REM 清理 public 目錄的舊檔案（保留最新的）
echo [2/4] 清理 public 目錄的舊 stock_list 檔案...
cd public
for /f "skip=2 delims=" %%f in ('dir /b /o-d stock_list_2026-*.json 2^>nul') do (
    del /q "%%f"
    echo   - 刪除: %%f
)
cd ..
echo ✓ 已清理 public 目錄的舊檔案（保留最新2個）

REM 清理環境機制定義.md
echo [3/4] 清理環境機制定義.md...
if exist "環境機制定義.md" (
    del /q "環境機制定義.md"
    echo ✓ 已刪除 環境機制定義.md
) else (
    echo ✓ 環境機制定義.md 不存在
)

REM 清理舊的測試檔案
echo [4/4] 清理舊的測試檔案...
cd tests
del /q "test-*-debug.html" 2>nul
del /q "test-*-fix.html" 2>nul
del /q "test-*-verification.html" 2>nul
del /q "test-*-simple.html" 2>nul
cd ..
echo ✓ 已清理舊的測試檔案

echo.
echo ========================================
echo 清理完成！
echo ========================================
echo.
echo 建議執行以下命令確認：
echo   git status
echo.
pause
