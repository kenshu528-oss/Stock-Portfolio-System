@echo off
chcp 65001 >nul
echo ========================================
echo 股票投資組合系統 v1.0.2.0012
echo 正在停止系統...
echo ========================================
echo.

echo 正在停止相關服務...

REM 停止 Node.js 進程
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im npm.cmd >nul 2>&1

REM 停止可能的 Vite 進程
for /f "tokens=2" %%i in ('netstat -ano ^| findstr :5173') do taskkill /f /pid %%i >nul 2>&1
for /f "tokens=2" %%i in ('netstat -ano ^| findstr :3001') do taskkill /f /pid %%i >nul 2>&1

echo ✅ 系統已停止
echo.
pause