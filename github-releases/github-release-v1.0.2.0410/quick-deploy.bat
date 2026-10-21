@echo off
echo ========================================
echo Stock Portfolio System - Quick Deploy
echo ========================================
echo.

echo 正在初始化Git...
git init

echo 正在添加所有檔案...
git add .

echo 正在提交變更...
git commit -m "v1.0.1.0001: 首次GitHub正式發布"

echo 正在連接到GitHub...
git remote add origin https://github.com/kenshu528-oss/stock-portfolio-system.git

echo 正在推送到GitHub...
git push -u origin main

echo.
echo ========================================
echo 部署完成！
echo ========================================
echo.
echo 請前往GitHub啟用Pages：
echo 1. 訪問：https://github.com/kenshu528-oss/stock-portfolio-system
echo 2. Settings → Pages → Source選擇"GitHub Actions"
echo 3. 等待5-10分鐘完成部署
echo 4. 訪問：https://kenshu528-oss.github.io/stock-portfolio-system/
echo.
pause