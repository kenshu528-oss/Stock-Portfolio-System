@echo off
REM 提交前檢查腳本 - Windows 版本
REM 在 git commit 前執行，確保代碼質量

echo.
echo ========================================
echo   提交前檢查 (Pre-commit Check)
echo ========================================
echo.

REM 0. 開發助手 - 提示相關 STEERING 規則
echo [0/6] 檢查相關 STEERING 規則...
node scripts/dev-assistant.cjs
echo.

REM 1. 檢查 SVG path 格式
echo [1/6] 檢查 SVG path 格式...
node scripts/check-svg-paths.js
if errorlevel 1 (
    echo.
    echo ❌ SVG path 格式檢查失敗！
    echo 請修復上述錯誤後再提交。
    exit /b 1
)
echo ✅ SVG path 格式正確
echo.

REM 2. 檢查 TypeScript 語法
echo [2/6] 檢查 TypeScript 語法...
call npm run lint
if errorlevel 1 (
    echo.
    echo ❌ TypeScript 語法檢查失敗！
    echo 請修復 lint 錯誤後再提交。
    exit /b 1
)
echo ✅ TypeScript 語法正確
echo.

REM 3. 檢查版本號一致性
echo [3/6] 檢查版本號一致性...
node scripts/check-version-consistency.js
if errorlevel 1 (
    echo.
    echo ❌ 版本號不一致！
    echo 請確保 package.json、version.ts、changelog.ts 版本號一致。
    exit /b 1
)
echo ✅ 版本號一致
echo.

REM 4. 檢查狀態管理 partialize
echo [4/6] 檢查狀態管理配置...
node scripts/check-state-management.cjs
if errorlevel 1 (
    echo.
    echo ❌ 狀態管理檢查失敗！
    echo 請確保 partialize 包含所有需要持久化的狀態。
    exit /b 1
)
echo ✅ 狀態管理配置正確
echo.

REM 5. 檢查除權息計算一致性
echo [5/6] 檢查除權息計算一致性...
node scripts/check-rights-calculation.cjs
if errorlevel 1 (
    echo.
    echo ❌ 除權息計算檢查失敗！
    echo 請確保所有入口都使用統一的計算邏輯。
    exit /b 1
)
echo ✅ 除權息計算一致
echo.

REM 6. 執行測試
echo [6/6] 執行測試...
call npm run test
if errorlevel 1 (
    echo.
    echo ❌ 測試失敗！
    echo 請修復測試錯誤後再提交。
    exit /b 1
)
echo ✅ 測試通過
echo.

echo ========================================
echo   ✅ 所有檢查通過！可以提交代碼。
echo ========================================
echo.
exit /b 0
