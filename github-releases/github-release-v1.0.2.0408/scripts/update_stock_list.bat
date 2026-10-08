@echo off
echo ================================================
echo 股票清單更新工具 - 統一管理
echo ================================================

:: 設定路徑
set "BACKEND_DIR=%~dp0..\backend"
set "PUBLIC_DIR=%~dp0..\public"
set "TODAY=%date:~0,4%-%date:~5,2%-%date:~8,2%"

echo 當前日期: %TODAY%
echo 後端目錄: %BACKEND_DIR%
echo 公共目錄: %PUBLIC_DIR%

:: 切換到後端目錄
cd /d "%BACKEND_DIR%"

:: 執行 Python 腳本獲取最新股票清單
echo.
echo 正在獲取最新股票清單...
python fetch_stock_list.py

:: 檢查是否成功生成檔案
set "NEW_FILE=stock_list_%TODAY%.json"
if exist "%NEW_FILE%" (
    echo.
    echo ✅ 股票清單獲取成功: %NEW_FILE%
    
    :: 移動到 public 目錄並重命名為標準名稱
    echo 正在更新 public/stock_list.json...
    move "%NEW_FILE%" "%PUBLIC_DIR%\stock_list.json"
    
    if exist "%PUBLIC_DIR%\stock_list.json" (
        echo ✅ 股票清單已更新到 public/stock_list.json
        
        :: 顯示檔案資訊
        echo.
        echo 檔案資訊:
        dir "%PUBLIC_DIR%\stock_list.json"
        
        :: 顯示前幾行內容
        echo.
        echo 檔案內容預覽:
        powershell -Command "Get-Content '%PUBLIC_DIR%\stock_list.json' | Select-Object -First 10"
        
    ) else (
        echo ❌ 檔案移動失敗
        exit /b 1
    )
    
) else (
    echo ❌ 股票清單獲取失敗，檔案不存在: %NEW_FILE%
    exit /b 1
)

echo.
echo ================================================
echo 股票清單更新完成！
echo ================================================
echo.
echo 📍 統一位置: public/stock_list.json
echo 📅 更新日期: %TODAY%
echo 🔄 建議每日執行此腳本保持資料最新
echo.

pause