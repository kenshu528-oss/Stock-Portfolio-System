# 實驗記錄索引

## 📊 最新實驗結果

### 2026-01-28 - 股價 API 穩定性測試
- **Yahoo Finance 代理**: ❌ 極不穩定，所有代理服務都失敗
- **證交所 API**: ✅ Python 環境成功，❌ 瀏覽器 CORS 阻擋
- **用戶反饋**: "Yahoo Finance 代理服務很不穩定" - 完全正確

## 🎯 關鍵發現

### API 穩定性排名
1. **證交所 API** (服務器端): ⭐⭐⭐⭐⭐ 極穩定
2. **Yahoo Finance** (直接): ⭐⭐⭐⭐ 穩定 (需代理)
3. **Yahoo Finance 代理**: ⭐ 極不穩定
4. **FinMind API**: ⭐⭐⭐ 中等穩定

### CORS 限制總結
- **證交所 API**: 有 CORS 限制，需服務器端代理
- **Yahoo Finance**: 有 CORS 限制，代理服務不穩定
- **FinMind API**: 支援 CORS，可直接調用

## 📂 實驗記錄分類

### API 穩定性測試
- [Yahoo Finance 代理失敗記錄](api-stability/yahoo-finance-proxies/2026-01-28-proxy-failures.md)
- [證交所 API CORS 測試](api-stability/twse-api/2026-01-28-cors-testing.md)

### 架構決策記錄
- [雲端股價獲取策略](architecture-decisions/2026-01-28-cloud-stock-price-strategy.md)

## 🔄 建議行動
基於實驗結果，建議：
1. **立即**: 停用不穩定的 Yahoo Finance 代理
2. **短期**: 實作 Netlify Functions 證交所 API 代理
3. **長期**: 建立多重備援和健康檢查機制

## 📈 成功案例
- **用戶 Python 實驗**: 5314 世紀股票成功獲取 (103.0000, 17001 成交量)
- **買進價格式發現**: `b` 欄位 "價格_張數_" 格式解析

## 🎯 下一步實驗
1. Netlify Functions 證交所代理實作測試
2. 多股票批量獲取性能測試
3. 錯誤恢復機制測試