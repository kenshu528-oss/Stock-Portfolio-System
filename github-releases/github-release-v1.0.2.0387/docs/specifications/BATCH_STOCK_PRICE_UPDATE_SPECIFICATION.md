# 批量股價更新實作規範

## 🎯 目標
將目前的序列股價更新改為批量處理，提升更新效率 60-70%。

## 📋 實作方案

### 方案一：前端直接使用 Vercel 批量服務（推薦）

#### 修改 `src/stores/appStore.ts`
```typescript
updateAllStockPrices: async () => {
  const state = get();
  const stocks = state.stocks;
  
  if (stocks.length === 0) return;
  
  state.setUpdatingPrices(true);
  state.setPriceUpdateProgress(0, stocks.length);
  
  let successCount = 0;
  let failCount = 0;
  
  try {
    // 提取所有股票代號
    const symbols = stocks.map(stock => stock.symbol);
    
    // 使用批量獲取
    const { shouldUseBackendProxy } = await import('../config/api');
    
    if (shouldUseBackendProxy()) {
      // 本機端：使用後端批量 API（需要實作）
      const batchResults = await fetchBatchFromBackend(symbols);
      await processBatchResults(batchResults, stocks, state);
    } else {
      // 雲端環境：使用 Vercel 批量服務
      const { VercelStockPriceService } = await import('../services/vercelStockPriceService');
      const batchResults = await VercelStockPriceService.getBatchStockPrices(symbols);
      await processBatchResults(batchResults, stocks, state);
    }
    
    // 強制觸發狀態更新
    set({ lastPriceUpdate: new Date() });
    
  } finally {
    state.setUpdatingPrices(false);
    state.setPriceUpdateProgress(0, 0);
  }
}

// 處理批量結果的輔助函數
async function processBatchResults(batchResults, stocks, state) {
  let processedCount = 0;
  
  for (const stock of stocks) {
    const priceData = batchResults.get(stock.symbol);
    
    if (priceData && priceData.price > 0) {
      // 更新股價資料
      state.updateStock(stock.id, {
        currentPrice: priceData.price,
        lastUpdated: new Date(),
        priceSource: priceData.source || 'API'
      });
      
      // 處理除權息資料
      await updateStockDividendData(stock, state, true);
      
      logger.info('stock', `✅ ${stock.symbol} 批量更新完成 (${priceData.price})`);
    } else {
      logger.warn('stock', `${stock.symbol} 批量更新失敗`);
    }
    
    // 更新進度
    processedCount++;
    state.setPriceUpdateProgress(processedCount, stocks.length);
  }
}

// 後端批量獲取（需要實作後端 API）
async function fetchBatchFromBackend(symbols) {
  const response = await fetch('/api/stocks/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbols })
  });
  
  if (!response.ok) {
    throw new Error(`批量獲取失敗: ${response.status}`);
  }
  
  const data = await response.json();
  const results = new Map();
  
  data.forEach(item => {
    if (item.symbol && item.price > 0) {
      results.set(item.symbol, {
        price: item.price,
        change: item.change,
        changePercent: item.changePercent,
        source: item.source
      });
    }
  });
  
  return results;
}
```

### 方案二：後端實作批量 API

#### 新增 `backend/server.js` 批量端點
```javascript
// API路由：批量獲取股票價格
app.post('/api/stocks/batch', async (req, res) => {
  try {
    const { symbols } = req.body;
    
    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return res.status(400).json({
        error: 'Invalid symbols',
        message: '請提供有效的股票代號陣列'
      });
    }
    
    if (symbols.length > 50) {
      return res.status(400).json({
        error: 'Too many symbols',
        message: '一次最多查詢50支股票'
      });
    }
    
    console.log(`📊 批量股價查詢: ${symbols.length} 支股票`);
    
    const results = [];
    const BATCH_SIZE = 5; // 控制並發數量
    
    // 分批處理避免過載
    for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
      const batch = symbols.slice(i, i + BATCH_SIZE);
      
      // 並發處理當前批次
      const batchPromises = batch.map(async (symbol) => {
        try {
          const upperSymbol = symbol.toUpperCase();
          
          // 檢查快取
          const cacheKey = `stock_${upperSymbol}`;
          const cached = stockCache.get(cacheKey);
          if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
            return { symbol: upperSymbol, ...cached.data };
          }
          
          // 獲取股價（使用現有邏輯）
          let stockData = null;
          
          // 優先使用 Yahoo Finance
          try {
            stockData = await getYahooStockPrice(upperSymbol);
            if (stockData && stockData.price > 0) {
              // 從 Stock List 獲取中文名稱
              const stockList = loadTodayStockList();
              if (stockList && stockList[upperSymbol]) {
                stockData.name = stockList[upperSymbol].name;
                stockData.source = 'Yahoo+StockList';
              }
              
              // 快取結果
              stockCache.set(cacheKey, {
                data: stockData,
                timestamp: Date.now()
              });
              
              return stockData;
            }
          } catch (error) {
            console.log(`Yahoo Finance 失敗: ${upperSymbol}`);
          }
          
          // 備援：FinMind API
          try {
            stockData = await getFinMindStockPrice(upperSymbol);
            if (stockData && stockData.price > 0) {
              stockCache.set(cacheKey, {
                data: stockData,
                timestamp: Date.now()
              });
              return stockData;
            }
          } catch (error) {
            console.log(`FinMind 失敗: ${upperSymbol}`);
          }
          
          return null;
          
        } catch (error) {
          console.error(`批量處理 ${symbol} 失敗:`, error.message);
          return null;
        }
      });
      
      // 等待當前批次完成
      const batchResults = await Promise.allSettled(batchPromises);
      
      // 收集成功的結果
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          results.push(result.value);
        } else {
          // 失敗的股票也要記錄
          results.push({
            symbol: batch[index].toUpperCase(),
            error: 'Failed to fetch price',
            price: 0
          });
        }
      });
      
      // 批次間稍微延遲
      if (i + BATCH_SIZE < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    console.log(`📊 批量查詢完成: ${results.filter(r => r.price > 0).length}/${symbols.length} 成功`);
    
    res.json(results);
    
  } catch (error) {
    console.error('批量股價API錯誤:', error);
    res.status(500).json({
      error: 'Batch fetch failed',
      message: '批量獲取股價失敗'
    });
  }
});
```

## 🔧 實作步驟

### 階段一：Vercel 批量服務優化
1. ✅ 修改 `src/stores/appStore.ts` 使用批量服務
2. ✅ 測試雲端環境批量更新效能
3. ✅ 確保錯誤處理和進度追蹤正常

### 階段二：後端批量 API（可選）
1. 🔄 實作 `/api/stocks/batch` 端點
2. 🔄 添加批量快取機制
3. 🔄 測試本機環境批量更新

### 階段三：統一配置
1. 🔄 更新 `src/config/api.ts` 配置
2. 🔄 實作環境自動切換邏輯
3. 🔄 完整測試兩種環境

## 📊 效能預期

| 指標 | 目前 | 批量處理 | 改善 |
|------|------|---------|------|
| 10支股票 | 5秒 | 2秒 | 60% |
| 30支股票 | 15秒 | 6秒 | 60% |
| 50支股票 | 25秒 | 10秒 | 60% |

## ⚠️ 注意事項

### API 限制考量
- **Yahoo Finance**: 無明確限制，但建議控制並發
- **FinMind**: 免費版有頻率限制
- **Vercel Edge**: 有執行時間限制 (10秒)

### 錯誤處理
- 部分股票失敗不影響其他股票
- 提供詳細的失敗原因
- 自動重試機制（可選）

### 用戶體驗
- 保持進度指示器
- 顯示成功/失敗統計
- 允許用戶取消操作

## 🎯 建議實作順序

1. **優先實作方案一**：直接使用 Vercel 批量服務
   - 實作簡單，立即見效
   - 雲端環境效能提升明顯

2. **可選實作方案二**：後端批量 API
   - 本機開發體驗改善
   - 統一架構更一致

3. **最終目標**：統一批量處理架構
   - 兩種環境都使用批量處理
   - 配置自動切換

---

**制定日期**: 2026-02-02  
**版本**: 1.0.0  
**預期效能提升**: 60-70%  
**實作優先級**: 高