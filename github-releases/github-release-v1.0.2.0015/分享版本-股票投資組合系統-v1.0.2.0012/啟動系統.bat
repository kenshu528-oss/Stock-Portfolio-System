@echo off
chcp 65001 >nul
echo ========================================
echo 股票投資組合系統 v1.0.2.0012
echo 正在啟動系統...
echo ========================================
echo.

cd /d "%~dp0"

echo [1/3] 啟動後端服務...
start "後端服務" cmd /k "cd backend && echo 後端服務啟動中... && node server.js"

echo [2/3] 等待後端服務啟動...
timeout /t 3 /nobreak >nul

echo [3/3] 啟動前端服務...
start "前端服務" cmd /k "echo 前端服務啟動中... && npm run dev"

echo.
echo ========================================
echo ✅ 系統啟動中...
echo 
echo 📊 前端地址：http://localhost:5173
echo 🔧 後端地址：http://localhost:3001
echo 
echo 瀏覽器將在 10 秒後自動開啟...
echo ========================================

timeout /t 10 /nobreak >nul
start http://localhost:5173

echo.
echo 系統已啟動完成！
echo 關閉此視窗不會影響系統運行
echo 要停止系統請關閉「前端服務」和「後端服務」視窗
pause