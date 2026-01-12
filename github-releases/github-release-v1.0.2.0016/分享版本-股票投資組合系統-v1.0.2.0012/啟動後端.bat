@echo off
chcp 65001 >nul
title 股票系統 - 後端服務
echo ========================================
echo 股票投資組合系統 - 後端服務
echo ========================================
echo.
echo 正在啟動後端API服務器...
echo 地址：http://localhost:3001
echo.
echo 請保持此視窗開啟
echo 關閉此視窗將停止後端服務
echo ========================================
echo.

cd /d "%~dp0\backend"
node server.js