# 雲端股價獲取策略決策記錄

## 📅 決策日期
2026-01-28

## 🎯 問題描述
雲端環境 (GitHub Pages) 需要穩定的股價獲取方案，但面臨以下挑戰：
1. Yahoo Finance 代理服務極不穩定
2. 證交所 API 有 CORS 限制
3. 用戶反饋代理服務經常失敗

## 🧪 實驗結果

### Yahoo Finance 代理服務測試
- **AllOrigins**: 500 錯誤，不穩定
- **CodeTabs**: 連線失敗
- **ThingProxy**: DNS 解析失敗
- **結論**: 所有代理服務都不可靠

### 證交所 API 測試
- **Python 環境**: ✅ 完全正常 (5314 世紀測試成功)
- **瀏覽器環境**: ❌ CORS 阻擋
- **結論**: 需要服務器端代理

## 🏗️ 架構決策

### 當前架構 (v1.0.2.0359)
```
本機端: 前端 → 後端代理 (localhost:3001) → Yahoo Finance ✅
雲端:   前端 → Yahoo Finance 代理服務 ❌ (不穩定)
```

### 建議新架構
```
本機端: 前端 → 後端代理 (localhost:3001) → Yahoo Finance ✅
雲端:   前端 → Netlify Functions → 證交所 API ✅ (穩定)
```

## 💡 解決方案選項

### 選項 1: Netlify Functions 代理 (推薦)
**優點**:
- 無 CORS 限制
- 可直接調用證交所 API
- 基於用戶成功的 Python 實驗
- 穩定可靠

**實作**:
```javascript
// netlify/functions/twse-stock.js
exports.handler = async (event) => {
  const { symbol } = event.queryStringParameters;
  const market = getMarketType(symbol); // tse or otc
  const url = `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=${market}_${symbol}.tw&json=1`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  // 處理買進價格式 "價格_張數_"
  // 返回標準化的股價資料
};
```

### 選項 2: 其他股價 API
**考慮**:
- Alpha Vantage (有免費額度限制)
- IEX Cloud (主要美股)
- Finnhub (有免費額度限制)

**問題**: 台股支援度不如證交所 API

### 選項 3: 靜態價格備援
**用途**: 當所有 API 都失敗時的最後備援
**限制**: 不是即時價格，僅供參考

## 🎯 最終決策

### 短期方案 (立即實作)
1. 移除不穩定的 Yahoo Finance 代理
2. 實作 Netlify Functions 證交所 API 代理
3. 基於用戶 Python 實驗的成功經驗

### 長期方案
1. 監控 Netlify Functions 的穩定性
2. 考慮實作多重備援 (證交所 + Yahoo Finance)
3. 建立 API 健康檢查機制

## 📊 預期效果
- **穩定性**: 大幅提升 (基於證交所官方 API)
- **準確性**: 提升 (官方即時資料)
- **維護性**: 改善 (減少對第三方代理的依賴)

## 🔄 實作計劃
1. 建立 Netlify Functions 證交所代理
2. 更新雲端股價服務使用新代理
3. 測試驗證穩定性
4. 部署到生產環境

## 📝 備註
這個決策基於用戶的實際反饋和我們的實驗結果。用戶的 Python 實驗證明了證交所 API 的可靠性，這是我們選擇這個方案的重要依據。