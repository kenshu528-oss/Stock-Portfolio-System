@echo off
echo ========================================
echo GitHub 推送準備腳本
echo ========================================
echo.

REM 獲取當前版本號
for /f "tokens=2 delims=:" %%a in ('findstr "version" package.json') do (
    set VERSION_LINE=%%a
)
for /f "tokens=1 delims=," %%b in ("%VERSION_LINE%") do (
    set VERSION=%%b
)
set VERSION=%VERSION:"=%
set VERSION=%VERSION: =%

echo 當前版本: %VERSION%
echo.

echo ========================================
echo 1. 執行版本號檢查...
echo ========================================
call npm run check:version
if %ERRORLEVEL% neq 0 (
    echo ❌ 版本號檢查失敗！請修正後重試。
    pause
    exit /b 1
)
echo ✅ 版本號檢查通過
echo.

echo ========================================
echo 2. 執行代碼質量檢查...
echo ========================================

echo 檢查 SVG 格式...
call npm run check:svg
if %ERRORLEVEL% neq 0 (
    echo ❌ SVG 格式檢查失敗！
    pause
    exit /b 1
)
echo ✅ SVG 格式檢查通過

echo 檢查狀態管理...
call npm run check:state
if %ERRORLEVEL% neq 0 (
    echo ❌ 狀態管理檢查失敗！
    pause
    exit /b 1
)
echo ✅ 狀態管理檢查通過

echo 檢查除權息計算...
call npm run check:rights
if %ERRORLEVEL% neq 0 (
    echo ❌ 除權息計算檢查失敗！
    pause
    exit /b 1
)
echo ✅ 除權息計算檢查通過
echo.

echo ========================================
echo 3. 執行建置檢查...
echo ========================================
call npm run build
if %ERRORLEVEL% neq 0 (
    echo ❌ 建置失敗！請修正錯誤後重試。
    pause
    exit /b 1
)
echo ✅ 建置檢查通過
echo.

echo ========================================
echo 4. 創建版本歸檔...
echo ========================================
set ARCHIVE_DIR=github-releases\github-release-%VERSION%

if exist "%ARCHIVE_DIR%" (
    echo 警告: 歸檔目錄已存在 - %ARCHIVE_DIR%
    set /p OVERWRITE="是否覆蓋? (y/N): "
    if /i not "%OVERWRITE%"=="y" (
        echo 取消歸檔操作
        goto :skip_archive
    )
    rmdir /s /q "%ARCHIVE_DIR%"
)

echo 創建歸檔目錄: %ARCHIVE_DIR%
mkdir "%ARCHIVE_DIR%"

echo 複製專案檔案...
robocopy . "%ARCHIVE_DIR%" /E /XD node_modules dist .git export github-releases /NFL /NDL /NJH /NJS /nc /ns /np
if %ERRORLEVEL% gtr 7 (
    echo ❌ 檔案複製失敗！
    pause
    exit /b 1
)

echo ✅ 版本歸檔完成: %ARCHIVE_DIR%
echo.

:skip_archive

echo ========================================
echo 5. Git 狀態檢查...
echo ========================================
git status
echo.

echo ========================================
echo 🎉 推送準備完成！
echo ========================================
echo 版本: %VERSION%
echo 歸檔: %ARCHIVE_DIR%
echo.
echo 接下來請執行以下命令完成推送:
echo.
echo   git add .
echo   git commit -m "版本更新 - %VERSION%: [功能描述]"
echo   git tag %VERSION%
echo   git push origin main
echo   git push --tags
echo.
echo 或者執行: scripts\push-to-github.bat
echo.

pause