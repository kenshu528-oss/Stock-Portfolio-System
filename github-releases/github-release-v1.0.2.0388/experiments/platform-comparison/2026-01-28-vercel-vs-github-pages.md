# Vercel vs GitHub Pages 平台比較

## 📅 分析日期
2026-01-28

## 🎯 問題背景
當前在 GitHub Pages 遇到雲端 API 代理不穩定問題，考慮轉移到 Vercel 平台。

## 🏗️ 平台比較

### GitHub Pages
**優點**：
- ✅ 免費靜態網站託管
- ✅ 與 GitHub 倉庫完美整合
- ✅ 自動部署

**缺點**：
- ❌ 純靜態託管，無服務器端功能
- ❌ 需要依賴第三方代理服務（不穩定）
- ❌ CORS 限制無法解決
- ❌ 無法直接調用證交所 API

**當前問題**：
- Yahoo Finance 代理服務極不穩定
- AllOrigins: 500 錯誤
- ThingProxy: DNS 失敗
- CodeTabs: 連線失敗

### Vercel
**優點**：
- ✅ 支援 Serverless Functions (Edge Functions)
- ✅ 可以實作自己的 API 代理
- ✅ 無 CORS 限制（服務器端調用）
- ✅ 全球 CDN 加速
- ✅ 自動部署和預覽
- ✅ 免費額度充足

**Serverless Functions 能力**：
- ✅ 可直接調用證交所 API
- ✅ 可實作 Yahoo Finance 代理
- ✅ 支援 Python、Node.js、Go 等
- ✅ 無冷啟動問題（Edge Functions）

## 🎯 Vercel 解決方案

### 架構設計
```
前端 (Vercel) → Vercel Edge Functions → 證交所 API / Yahoo Finance
```

### 實作方案
```javascript
// api/stock/[symbol].js (Vercel Edge Function)
export default async function handler(req, res) {
  const { symbol } = req.query;
  
  // 1. 優先使用證交所 API（基於用戶成功的 Python 實驗）
  try {
    const market = getMarketType(symbol); // tse or otc
    const twseUrl = `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=${market}_${symbol}.tw&json=1`;
    
    const response = await fetch(twseUrl);
    const data = await response.json();
    
    if (data.msgArray && data.msgArray.length > 0) {
      const info = data.msgArray[0];
      
      // 處理買進價格式 "價格_張數_"
      let price = 0;
      if (info.z && info.z !== '-') {
        price = parseFloat(info.z);
      } else if (info.b && info.b !== '-') {
        price = parseFloat(info.b.split('_')[0]);
      }
      
      return res.json({
        symbol,
        name: info.n,
        price,
        change: price - parseFloat(info.y || price),
        source: 'TWSE MIS',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.log('證交所 API 失敗，嘗試 Yahoo Finance...');
  }
  
  // 2. 備援：Yahoo Finance API
  try {
    const yahooSymbol = getYahooSymbol(symbol);
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`;
    
    const response = await fetch(yahooUrl);
    const data = await response.json();
    
    // 解析 Yahoo Finance 資料...
    
  } catch (error) {
    return res.status(500).json({ error: 'All APIs failed' });
  }
}
```

## 📊 預期效果

### 穩定性提升
- **證交所 API**: 直接調用，無代理服務依賴
- **Yahoo Finance**: 服務器端調用，無 CORS 問題
- **整體穩定性**: 從 ⭐ 提升到 ⭐⭐⭐⭐⭐

### 性能提升
- **Edge Functions**: 全球分佈，低延遲
- **無冷啟動**: 比傳統 Serverless 更快
- **CDN 加速**: 靜態資源全球快取

### 維護性提升
- **自己的代理**: 完全控制，可自定義邏輯
- **統一平台**: 前端和 API 在同一平台
- **監控和日誌**: Vercel 提供完整的監控

## 🚀 遷移計劃

### 階段 1: 準備工作
1. 在 Vercel 建立專案
2. 連接 GitHub 倉庫
3. 配置自動部署

### 階段 2: API 實作
1. 實作 `/api/stock/[symbol]` Edge Function
2. 基於用戶 Python 實驗實作證交所 API 調用
3. 實作 Yahoo Finance 備援

### 階段 3: 前端調整
1. 更新 API 端點指向 Vercel Functions
2. 移除不穩定的代理服務依賴
3. 測試驗證

### 階段 4: 部署和測試
1. 部署到 Vercel
2. 全面測試股價獲取功能
3. 性能和穩定性驗證

## 💰 成本考量
- **Vercel 免費額度**: 100GB 頻寬，100 個 Serverless Functions 執行
- **預估使用量**: 遠低於免費額度
- **成本**: $0

## 🎯 結論
**強烈建議遷移到 Vercel**，因為：
1. 完全解決 API 代理不穩定問題
2. 可直接調用證交所 API（基於用戶成功實驗）
3. 提供更好的開發體驗和性能
4. 免費且功能強大

## 📝 用戶反饋驗證
用戶提出的 Vercel 方案完全正確，這將是解決當前雲端 API 問題的最佳方案。