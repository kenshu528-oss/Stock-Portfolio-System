@echo off
echo ========================================
echo 股票清單抓取工具
echo ========================================

REM 檢查 Python 是否安裝
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python 未安裝或不在 PATH 中
    echo 💡 請先安裝 Python 3.7+
    pause
    exit /b 1
)

REM 檢查 FinMind 套件是否安裝
python -c "import FinMind" >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️ FinMind 套件未安裝，正在安裝...
    pip install FinMind
    if %errorlevel% neq 0 (
        echo ❌ FinMind 安裝失敗
        pause
        exit /b 1
    )
)

REM 執行股票清單抓取腳本
echo 🚀 開始抓取股票清單...
python fetch_stock_list.py

if %errorlevel% equ 0 (
    echo.
    echo ✅ 股票清單抓取完成！
    echo 💡 後端服務器現在可以使用本地股票清單進行搜尋
) else (
    echo.
    echo ❌ 股票清單抓取失敗！
    echo 💡 請檢查網路連線和 FinMind Token
)

echo.
echo 按任意鍵繼續...
pause >nul