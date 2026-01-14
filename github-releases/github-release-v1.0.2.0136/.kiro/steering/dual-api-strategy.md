---
title: 雙 API 策略規範
category: api
priority: high
version: 1.0.0
date: 2026-01-14
---

# 雙 API 策略規範 (Dual API Strategy Standards)

## 🎯 核心原則：最佳資料來源組合

### 絕對要求的策略
- ✅ **股價查詢優先證交所 OpenAPI**：即時性最高
- ✅ **除權息查詢優先 FinMind**：歷史資料最完整
- ✅ **多層備援機制**：確保服務穩定性
- ✅ **智能降級策略**：API 失敗時自動切換

## 📊 API 選擇策略

### 1. 股價查詢（即時性優先）

**優先順序**：
```
1. 證交所 OpenAPI（首選）- 最即時
   ↓ 失敗
2. FinMind API（備用）- 延遲數分鐘
   ↓ 失敗
3. Yahoo Finance（最後備用）- 國際通用
```

**理由**：
- ✅ 證交所 OpenAPI 資料最即時
- ✅ 官方資料，最權威
- ✅ 完全免費，無限制

**實作範例**：
```typescript
async function getStockPrice(symbol: string) {
  // 1. 優先證交所 OpenAPI
  try {
    const data = await TWSEOpenApiService.getStockPrice(symbol);
    if (data && data.price > 0) return data;
  } catch (error) {
    logger.warn('api', `證交所 API 失敗: ${symbol}`);
  }
  
  // 2. 降級到 FinMind
  try {
    const data = await FinMindService.getStockPrice(symbol);
    if (data && data.price > 0) return data;
  } catch (error) {
    logger.warn('api', `FinMind API 失敗: ${symbol}`);
  }
  
  // 3. 最後嘗試 Yahoo Finance
  try {
    const data = await YahooFinanceService.getStockPrice(symbol);
    if (data && data.price > 0) return data;
  } catch (error) {
    logger.error('api', `所有股價 API 都失敗: ${symbol}`);
  }
  
  return null;
}
```

### 2. 除權息查詢（完整性優先）

**優先順序**：
```
1. FinMind API（首選）- 歷史資料最完整
   ↓ 失敗
2. 證交所 OpenAPI（備用）- 最新公告
   ↓ 失敗
3. GoodInfo 爬蟲（債券 ETF）- 特殊情況
```

**理由**：
- ✅ FinMind 歷史資料完整
- ✅ 包含配股資訊
- ✅ 資料格式統一

**實作範例**：
```typescript
async function getDividendData(symbol: string) {
  const isBondETF = /^00\d{2,3}B$/i.test(symbol);
  
  // 1. 優先 FinMind
  try {
    const data = await FinMindService.getDividendData(symbol);
    if (data && data.dividends.length > 0) return data;
  } catch (error) {
    logger.warn('api', `FinMind 除權息失敗: ${symbol}`);
  }
  
  // 2. 降級到證交所 OpenAPI
  try {
    const data = await TWSEOpenApiService.getDividendData(symbol);
    if (data && data.dividends.length > 0) return data;
  } catch (error) {
    logger.warn('api', `證交所除權息失敗: ${symbol}`);
  }
  
  // 3. 債券 ETF 嘗試 GoodInfo
  if (isBondETF) {
    try {
      const data = await GoodInfoService.getDividendData(symbol);
      if (data && data.dividends.length > 0) return data;
    } catch (error) {
      logger.warn('api', `GoodInfo 失敗: ${symbol}`);
    }
  }
  
  return null;
}
```

### 3. 股票基本資訊（名稱查詢）

**優先順序**：
```
1. FinMind API（首選）- 中文名稱
   ↓ 失敗
2. 證交所 OpenAPI（備用）- 官方名稱
   ↓ 失敗
3. Yahoo Finance（最後備用）- 英文名稱
```

## 🔧 證交所 OpenAPI 整合規範

### 1. API 端點定義

**股價查詢**：
```
端點：https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY
方法：GET
參數：
  - date: YYYYMMDD（查詢日期）
  - stockNo: 股票代碼
回應：JSON 格式
```

**除權息查詢**：
```
端點：https://openapi.twse.com.tw/v1/exchangeReport/TWT48
方法：GET
參數：
  - date: YYYYMMDD（查詢年度）
  - stockNo: 股票代碼
回應：JSON 格式
```

### 2. 資料格式轉換

**證交所格式 → 系統格式**：
```typescript
interface TWSEStockPrice {
  stat: string;           // "OK" 表示成功
  date: string;           // "20240115"
  data: Array<[
    string,               // 股票代碼
    string,               // 股票名稱
    string,               // 收盤價
    // ... 其他欄位
  ]>;
}

// 轉換函數
function convertTWSEStockPrice(twseData: TWSEStockPrice): StockPrice {
  if (twseData.stat !== 'OK' || !twseData.data || twseData.data.length === 0) {
    throw new Error('證交所 API 無資料');
  }
  
  const [symbol, name, closePrice] = twseData.data[0];
  
  return {
    symbol: symbol,
    name: name,
    price: parseFloat(closePrice),
    timestamp: new Date().toISOString(),
    source: 'TWSE OpenAPI'
  };
}
```

### 3. 錯誤處理規範

**必須處理的錯誤**：
```typescript
try {
  const response = await fetch(url, { timeout: 10000 });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  
  const data = await response.json();
  
  if (data.stat !== 'OK') {
    throw new Error(`API 錯誤: ${data.stat}`);
  }
  
  return convertTWSEFormat(data);
  
} catch (error) {
  if (error.name === 'AbortError') {
    logger.error('api', '證交所 API 超時');
  } else if (error.message.includes('HTTP')) {
    logger.error('api', `證交所 API HTTP 錯誤: ${error.message}`);
  } else {
    logger.error('api', `證交所 API 未知錯誤: ${error.message}`);
  }
  
  // 降級到下一個 API
  return null;
}
```

## 📋 實作階段規劃

### 階段 1：研究與測試（1-2 天）

**任務**：
- [ ] 研究證交所 OpenAPI Swagger 文檔
- [ ] 測試股價查詢端點
- [ ] 測試除權息查詢端點
- [ ] 記錄資料格式和欄位對應
- [ ] 確認錯誤處理機制

**產出**：
- 證交所 API 測試報告
- 資料格式對應表
- 錯誤處理策略文檔

### 階段 2：服務實作（2-3 天）

**任務**：
- [ ] 創建 `TWSEOpenApiService.ts`
- [ ] 實作股價查詢功能
- [ ] 實作除權息查詢功能
- [ ] 實作資料格式轉換
- [ ] 實作錯誤處理和重試機制
- [ ] 添加單元測試

**產出**：
- `backend/services/twseOpenApiService.js`
- `src/services/twseOpenApiService.ts`
- 單元測試文件

### 階段 3：整合與優化（2-3 天）

**任務**：
- [ ] 更新 `backend/server.js` API 路由
- [ ] 整合雙 API 策略
- [ ] 實作智能降級機制
- [ ] 添加性能監控
- [ ] 優化快取策略
- [ ] 完整測試

**產出**：
- 更新的 API 路由
- 性能監控報告
- 完整測試報告

### 階段 4：文檔與部署（1 天）

**任務**：
- [ ] 更新 API 使用文檔
- [ ] 更新 STEERING 規則
- [ ] 創建遷移指南
- [ ] 部署到生產環境
- [ ] 監控 API 成功率

**產出**：
- API 使用文檔
- 遷移指南
- 監控儀表板

## 🎯 成功指標

### 性能指標
- **股價查詢成功率**：> 99%
- **除權息查詢成功率**：> 95%
- **平均回應時間**：< 2 秒
- **證交所 API 使用率**：> 80%（股價）

### 品質指標
- **資料準確性**：100%（與官方一致）
- **錯誤處理完整性**：100%
- **日誌記錄完整性**：100%
- **單元測試覆蓋率**：> 80%

## 🚨 風險管理

### 風險 1：證交所 API 不穩定
**應對**：
- ✅ 保留 FinMind 作為備援
- ✅ 實作自動降級機制
- ✅ 監控 API 成功率

### 風險 2：資料格式變更
**應對**：
- ✅ 版本化 API 端點
- ✅ 資料格式驗證
- ✅ 錯誤日誌記錄

### 風險 3：整合工作量超出預期
**應對**：
- ✅ 分階段實作
- ✅ 保持現有功能運作
- ✅ 可隨時回滾

## 📊 監控與維護

### 日常監控
```typescript
// API 成功率監控
const apiStats = {
  twse: { success: 0, fail: 0, avgTime: 0 },
  finmind: { success: 0, fail: 0, avgTime: 0 },
  yahoo: { success: 0, fail: 0, avgTime: 0 }
};

// 記錄 API 調用
function recordApiCall(api: string, success: boolean, time: number) {
  if (success) {
    apiStats[api].success++;
  } else {
    apiStats[api].fail++;
  }
  apiStats[api].avgTime = (apiStats[api].avgTime + time) / 2;
}

// 每日報告
function generateDailyReport() {
  console.log('API 使用統計：');
  console.log(`證交所：成功率 ${apiStats.twse.success / (apiStats.twse.success + apiStats.twse.fail) * 100}%`);
  console.log(`FinMind：成功率 ${apiStats.finmind.success / (apiStats.finmind.success + apiStats.finmind.fail) * 100}%`);
}
```

### 定期檢查
- **每週**：檢查 API 成功率
- **每月**：評估 API 性能
- **每季**：檢討 API 策略

## 🔗 相關規則

- **finmind-api-priority.md**：FinMind 優先策略（除權息）
- **api-data-integrity.md**：API 資料完整性
- **safe-development.md**：安全開發原則
- **code-quality-standards.md**：代碼質量標準

## 💡 最佳實踐

### 1. API 調用順序
```typescript
// ✅ 正確：按優先順序嘗試
const data = await tryAPIs([
  () => TWSEOpenApiService.get(symbol),
  () => FinMindService.get(symbol),
  () => YahooFinanceService.get(symbol)
]);

// ❌ 錯誤：只用一個 API
const data = await FinMindService.get(symbol);
```

### 2. 錯誤處理
```typescript
// ✅ 正確：詳細的錯誤日誌
try {
  return await api.call();
} catch (error) {
  logger.error('api', `${apiName} 失敗`, {
    symbol,
    error: error.message,
    timestamp: new Date()
  });
  return null;
}

// ❌ 錯誤：忽略錯誤
try {
  return await api.call();
} catch (error) {
  return null;
}
```

### 3. 快取策略
```typescript
// ✅ 正確：不同資料不同快取時間
const CACHE_DURATION = {
  stockPrice: 60 * 1000,      // 1 分鐘
  dividend: 24 * 60 * 60 * 1000, // 24 小時
  stockInfo: 7 * 24 * 60 * 60 * 1000 // 7 天
};

// ❌ 錯誤：所有資料相同快取時間
const CACHE_DURATION = 60 * 1000;
```

---

**制定日期**: 2026-01-14  
**版本**: 1.0.0  
**狀態**: 規劃中  
**預計完成**: 2026-01-21
