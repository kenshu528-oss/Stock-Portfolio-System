# API 使用標準規範 (API Standards)

> 合併自：api-data-integrity.md, finmind-api-priority.md, finmind-api-usage.md, dual-api-strategy.md

## 🎯 核心原則

### 資料完整性優先
- ✅ **只使用真實 API 資料**：禁止虛假或硬編碼資料
- ✅ **API 失敗返回 null**：不提供預設值或虛假資料
- ✅ **誠實的錯誤訊息**：明確告知用戶問題

### API 優先順序策略

#### 一般股票（如 2330、2886、0050）
```
1. FinMind API（首選）- 台股專用，中文名稱
   ↓ 失敗
2. 證交所 OpenAPI（備用）- 官方資料
   ↓ 失敗
3. Yahoo Finance（最後備用）- 國際通用
```

#### 債券 ETF（如 00679B、00687B）
```
1. Yahoo Finance API（首選）- 配息資料最完整
   ↓ 失敗
2. FinMind API（備用）- 部分資料可能不完整
```

---

## 📊 股價查詢規範

### 優先順序（即時性優先）
```typescript
async function getStockPrice(symbol: string) {
  // 1. 證交所 OpenAPI（最即時）
  try {
    const data = await TWSEOpenApiService.getStockPrice(symbol);
    if (data?.price > 0) return data;
  } catch (error) {
    logger.warn('api', `證交所失敗: ${symbol}`);
  }
  
  // 2. FinMind API（延遲數分鐘）
  try {
    const data = await FinMindService.getStockPrice(symbol);
    if (data?.price > 0) return data;
  } catch (error) {
    logger.warn('api', `FinMind失敗: ${symbol}`);
  }
  
  // 3. Yahoo Finance（最後備用）
  try {
    const data = await YahooFinanceService.getStockPrice(symbol);
    if (data?.price > 0) return data;
  } catch (error) {
    logger.error('api', `所有API失敗: ${symbol}`);
  }
  
  return null; // ⚠️ 不提供虛假資料
}
```

---

## 💰 除權息查詢規範

### 優先順序（完整性優先）

#### 一般股票
```typescript
async function getDividendData(symbol: string) {
  // 1. FinMind API（歷史資料最完整）
  try {
    const data = await FinMindService.getDividendData(symbol);
    if (data?.dividends.length > 0) return data;
  } catch (error) {
    logger.warn('api', `FinMind除權息失敗: ${symbol}`);
  }
  
  // 2. 證交所 OpenAPI（最新公告）
  try {
    const data = await TWSEOpenApiService.getDividendData(symbol);
    if (data?.dividends.length > 0) return data;
  } catch (error) {
    logger.error('api', `所有除權息API失敗: ${symbol}`);
  }
  
  return null;
}
```

#### 債券 ETF
```typescript
async function getBondETFDividendData(symbol: string) {
  // 1. Yahoo Finance（配息資料最完整）
  try {
    const data = await YahooFinanceService.getDividendData(symbol);
    if (data?.dividends.length > 0) return data;
  } catch (error) {
    logger.warn('api', `Yahoo除權息失敗: ${symbol}`);
  }
  
  // 2. FinMind API（備用）
  try {
    const data = await FinMindService.getDividendData(symbol);
    if (data?.dividends.length > 0) return data;
  } catch (error) {
    logger.error('api', `債券ETF除權息失敗: ${symbol}`);
  }
  
  return null;
}
```

---

## 🔍 FinMind API 使用規範

### 股息配股資料集：TaiwanStockDividend

```typescript
// ✅ 正確的資料集和欄位
dataset: 'TaiwanStockDividend'

// 現金股利計算
cashDividend = CashEarningsDistribution + CashStatutorySurplus

// 股票股利計算
stockDividend = StockEarningsDistribution + StockStatutorySurplus

// 配股比例計算（每1000股配X股）
stockDividendRatio = (stockDividend / 10) * 1000

// 除息日期
exDate = CashExDividendTradingDate || StockExDividendTradingDate

// 民國年轉西元年
year = parseInt(year.replace('年', '')) + 1911
```

### 債券 ETF 識別

```typescript
// ✅ 正確：使用正則表達式精確識別
const isBondETF = /^00\d{2,3}B$/i.test(symbol);

// 範例：
// ✅ 00679B - 債券 ETF
// ✅ 00687B - 債券 ETF
// ❌ 2330 - 不是債券 ETF
```

---

## 🚫 絕對禁止的做法

### 1. 使用虛假資料
```typescript
// ❌ 錯誤：提供虛假資料
if (!apiData) {
  return { name: '股票名稱', price: 10.0 };
}

// ✅ 正確：返回 null
if (!apiData) {
  return null;
}
```

### 2. 使用本地硬編碼對照表
```typescript
// ❌ 錯誤：本地股票名稱對照表
const STOCK_NAMES = {
  '2330': '台積電',
  '2886': '兆豐金'
};

// ✅ 正確：從 API 獲取
const stockInfo = await FinMindService.getStockInfo(symbol);
```

### 3. 錯誤的資料集
```typescript
// ❌ 錯誤：TaiwanStockDividendResult 沒有詳細欄位
dataset: 'TaiwanStockDividendResult'

// ✅ 正確：TaiwanStockDividend 有完整欄位
dataset: 'TaiwanStockDividend'
```

---

## ⚠️ 錯誤處理規範

### 標準錯誤處理
```typescript
try {
  const result = await apiCall();
  
  if (!result) {
    throw new Error('無資料');
  }
  
  return result;
  
} catch (error) {
  const message = error instanceof Error ? error.message : '未知錯誤';
  logger.error('api', `API失敗: ${message}`);
  
  // ⚠️ 返回 null，不提供虛假資料
  return null;
}
```

### 404 錯誤處理
```typescript
// ✅ 正確：404 是正常情況（資料不存在）
if (!response.ok) {
  if (response.status === 404) {
    // 不輸出警告，直接返回 null
    return null;
  }
  throw new Error(`HTTP ${response.status}`);
}
```

---

## 📋 開發檢查清單

### 新增 API 調用時
- [ ] 確認 API 優先順序正確
- [ ] 一般股票優先 FinMind
- [ ] 債券 ETF 優先 Yahoo Finance
- [ ] 完整的錯誤處理（try-catch）
- [ ] API 失敗返回 null
- [ ] 不提供虛假或預設資料
- [ ] 添加 logger 記錄

### 測試時
- [ ] 測試正常情況
- [ ] 測試 404 情況
- [ ] 測試網路錯誤
- [ ] 測試超時情況
- [ ] 檢查錯誤訊息友好

---

## 💡 最佳實踐

### 1. 多層備援
每個 API 調用都要有備援方案，確保服務穩定。

### 2. 誠實優先
寧願告訴用戶「找不到資料」，也不提供虛假資料。

### 3. 詳細日誌
記錄每個 API 的嘗試結果，方便調試。

### 4. 性能優化
- 使用適當的快取機制
- 設定合理的超時時間
- 批次處理時控制並發數量

---

**記住：API 資料完整性是用戶信任的基礎！寧可誠實地說「找不到」，也不提供虛假資料！**
