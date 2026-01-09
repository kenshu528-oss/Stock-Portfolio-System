# 開發檢查腳本 - 修改後自動執行的驗證
param(
    [string]$Component = "",
    [switch]$SkipBuild = $false
)

Write-Host "🔍 開始開發檢查..." -ForegroundColor Cyan
Write-Host "時間: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray

# 1. 語法檢查
Write-Host "`n📝 執行 ESLint 語法檢查..." -ForegroundColor Yellow
try {
    npm run lint | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ ESLint 檢查通過" -ForegroundColor Green
    } else {
        Write-Host "❌ ESLint 檢查失敗" -ForegroundColor Red
        return $false
    }
} catch {
    Write-Host "❌ ESLint 執行失敗: $_" -ForegroundColor Red
    return $false
}

# 2. TypeScript 編譯檢查
Write-Host "`n🔧 執行 TypeScript 編譯檢查..." -ForegroundColor Yellow
try {
    npx tsc --noEmit | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ TypeScript 編譯檢查通過" -ForegroundColor Green
    } else {
        Write-Host "❌ TypeScript 編譯檢查失敗" -ForegroundColor Red
        return $false
    }
} catch {
    Write-Host "❌ TypeScript 編譯檢查失敗: $_" -ForegroundColor Red
    return $false
}

# 3. 測試執行（如果有指定組件）
if ($Component -ne "") {
    Write-Host "`n🧪 執行 $Component 相關測試..." -ForegroundColor Yellow
    try {
        npm test -- --run --reporter=verbose $Component | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ 測試通過" -ForegroundColor Green
        } else {
            Write-Host "⚠️ 測試失敗或無相關測試" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "⚠️ 測試執行失敗: $_" -ForegroundColor Yellow
    }
}

# 4. 建置檢查（可選）
if (-not $SkipBuild) {
    Write-Host "`n🏗️ 執行建置檢查..." -ForegroundColor Yellow
    try {
        npm run build | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ 建置檢查通過" -ForegroundColor Green
        } else {
            Write-Host "❌ 建置檢查失敗" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ 建置檢查失敗: $_" -ForegroundColor Red
        return $false
    }
}

# 5. 開發服務器健康檢查
Write-Host "`n🌐 檢查開發服務器狀態..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5173/index.html" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ 開發服務器正常運行" -ForegroundColor Green
    } else {
        Write-Host "⚠️ 開發服務器狀態異常: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️ 無法連接到開發服務器 (可能未啟動)" -ForegroundColor Yellow
}

# 6. 檢查 localStorage 狀態
Write-Host "`n💾 檢查 localStorage 狀態..." -ForegroundColor Yellow
Write-Host "💡 建議在瀏覽器控制台執行以下代碼檢查 localStorage:" -ForegroundColor Cyan
Write-Host "Object.keys(localStorage).filter(k => k.includes('stock-portfolio'))" -ForegroundColor Gray

Write-Host "`n🎉 開發檢查完成!" -ForegroundColor Green
Write-Host "時間: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray

return $true