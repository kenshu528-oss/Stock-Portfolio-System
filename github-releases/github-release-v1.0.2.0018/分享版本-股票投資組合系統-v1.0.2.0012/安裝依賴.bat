@echo off
chcp 65001 >nul
echo ========================================
echo 股票投資組合系統 v1.0.2.0012
echo 正在安裝系統依賴...
echo ========================================
echo.

echo [1/3] 檢查 Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 未找到 Node.js，請先安裝 Node.js
    echo 下載地址：https://nodejs.org/
    pause
    exit /b 1
)
echo ✅ Node.js 已安裝

echo.
echo [2/3] 安裝前端依賴...
cd /d "%~dp0"
call npm install
if errorlevel 1 (
    echo ❌ 前端依賴安裝失敗
    pause
    exit /b 1
)

echo.
echo [3/3] 安裝後端依賴...
cd backend
call npm install
if errorlevel 1 (
    echo ❌ 後端依賴安裝失敗
    pause
    exit /b 1
)

cd /d "%~dp0"
echo.
echo ========================================
echo ✅ 安裝完成！
echo 現在可以執行「啟動系統.bat」開始使用
echo ========================================
pause