# 簡化的開發檢查腳本
Write-Host "🔍 開始開發檢查..." -ForegroundColor Cyan

# 1. ESLint 檢查
Write-Host "`n📝 ESLint 檢查..." -ForegroundColor Yellow
npm run lint
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ ESLint 通過" -ForegroundColor Green
} else {
    Write-Host "❌ ESLint 失敗" -ForegroundColor Red
}

# 2. TypeScript 檢查
Write-Host "`n🔧 TypeScript 檢查..." -ForegroundColor Yellow
npx tsc --noEmit
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ TypeScript 通過" -ForegroundColor Green
} else {
    Write-Host "❌ TypeScript 失敗" -ForegroundColor Red
}

# 3. 服務器檢查
Write-Host "`n🌐 服務器檢查..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5173/index.html" -UseBasicParsing -TimeoutSec 3
    Write-Host "✅ 服務器正常 ($($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "⚠️ 服務器未啟動" -ForegroundColor Yellow
}

Write-Host "`n🎉 檢查完成!" -ForegroundColor Green