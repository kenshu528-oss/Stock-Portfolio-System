@echo off
chcp 65001 >nul
title 股票系統 - 前端服務
echo ========================================
echo 股票投資組合系統 - 前端服務
echo ========================================
echo.
echo 正在啟動前端開發服務器...
echo 地址：http://localhost:5173
echo.
echo 請保持此視窗開啟
echo 關閉此視窗將停止前端服務
echo ========================================
echo.

cd /d "%~dp0"
npm run dev