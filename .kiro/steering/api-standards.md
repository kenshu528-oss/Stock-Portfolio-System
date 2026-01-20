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
1. Yahoo Finance API（首選）- 即時股價，穩定性佳
   ↓ 失敗
2. FinMind API（備用）- 台股專用，中文名稱
   ↓ 失敗
3. 證交所 OpenAPI（最後備用）- 官方資料
```

#### 債券 ETF（如 00679B、00687B）
```
1. Yahoo Finance API（首選）- 配息資料最完整
   ↓ 失敗
2. FinMind API（備用）- 部分資料可能不完整
```

---

## 📊 股價查詢規範 (v1.0.2.0197 標準)

### ⭐ 智能股票代碼後綴判斷（核心標準）

**基於 v1.0.2.0197 成功修復經驗制定**

```typescript
function getStockSuffixes(symbol: string): { suffixes: string[], type: string, market: string } {
  const code = parseInt(symbol.substring(0, 4));
  const isBondETF = /^00\d{2,3}B$/i.test(symbol);
  const isETF = /^00\d{2,3}[A-Z]?$/i.test(symbol);
  
  if (isBondETF) {
    return {
      suffixes: ['.TWO', '.TW'],  // 債券 ETF 優先櫃買中心
      type: 'bond_etf',
      market: 'ETF'
    };
  } else if (isETF) {
    return {
      suffixes: ['.TWO', '.TW'],  // 一般 ETF 優先櫃買中心
      type: 'etf', 
      market: 'ETF'
    };
  } else if (code >= 3000 && code <= 8999) {
    return {
      suffixes: ['.TWO', '.TW'], // 上櫃股票優先櫃買中心
      type: 'otc',
      market: '上櫃'
    };
  } else if (code >= 1000 && code <= 2999) {
    return {
      suffixes: ['.TW', '.TWO'], // 上市股票優先證交所
      type: 'listed',
      market: '上市'
    };
  } else {
    return {
      suffixes: ['.TW', '.TWO'],
      type: 'unknown',
      market: '台灣'
    };
  }
}
```

### API 優先順序（Yahoo Finance 優先 + 混合策略）

```typescript
async function getStockPrice(symbol: string) {
  const { suffixes, market } = getStockSuffixes(symbol);
  let chineseName = null;
  
  // 1. Yahoo Finance API（首選）- 即時股價，穩定性佳
  try {
    const data = await YahooFinanceService.getStockPrice(symbol, suffixes);
    if (data?.price > 0) {
      // 同時嘗試獲取 FinMind 中文名稱
      try {
        const finmindData = await FinMindService.getStockInfo(symbol);
        if (finmindData?.name && finmindData.name !== symbol) {
          data.name = finmindData.name;
          data.source = 'Yahoo+FinMind'; // 混合來源標記
        }
      } catch (e) {
        // 中文名稱獲取失敗不影響股價
      }
      return data;
    }
  } catch (error) {
    logger.warn('api', `Yahoo Finance失敗: ${symbol}`);
  }
  
  // 2. FinMind API（備用）- 中文名稱 + 歷史股價
  try {
    const data = await FinMindService.getStockPrice(symbol);
    if (data?.price > 0) return data;
    // 保存中文名稱供其他 API 使用
    if (data?.name && data.name !== symbol) {
      chineseName = data.name;
    }
  } catch (error) {
    logger.warn('api', `FinMind失敗: ${symbol}`);
  }
  
  // 3. 證交所 API（最後備用）- 官方資料
  try {
    const data = await TWSEService.getStockPrice(symbol);
    if (data?.price > 0) {
      // 使用之前獲取的中文名稱
      if (chineseName) {
        data.name = chineseName;
        data.source = 'FinMind+TWSE';
      }
      return data;
    }
  } catch (error) {
    logger.error('api', `所有API失敗: ${symbol}`);
  }
  
  return null; // ⚠️ 不提供虛假資料
}
```

### 驗證測試案例

**所有股價獲取實作都必須通過以下測試**：

```typescript
const TEST_CASES = [
  // 上市股票 - 優先 .TW
  { symbol: '2330', expectedSuffix: '.TW', market: '上市', name: '台積電' },
  { symbol: '2886', expectedSuffix: '.TW', market: '上市', name: '兆豐金' },
  
  // 上櫃股票 - 優先 .TWO  
  { symbol: '6188', expectedSuffix: '.TWO', market: '上櫃', name: '廣明' },
  { symbol: '4585', expectedSuffix: '.TWO', market: '上櫃', name: '達明' },
  
  // ETF - 優先 .TWO
  { symbol: '0050', expectedSuffix: '.TWO', market: 'ETF', name: '元大台灣50' },
  { symbol: '00646', expectedSuffix: '.TWO', market: 'ETF', name: '元大S&P500' },
  
  // 債券 ETF - 優先 .TWO
  { symbol: '00679B', expectedSuffix: '.TWO', market: 'ETF', name: '元大美債20年' },
];
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

## 🎯 股價獲取標準實作規範 (v1.0.2.0197)

### ⭐ 必須遵循的核心標準

**基於成功修復 6188、4585、00679B 等股票的經驗制定**

#### 1. 智能後綴判斷（絕對標準）
```typescript
// ✅ 標準實作：所有股價獲取都必須使用此邏輯
function getStockSuffixes(symbol: string): string[] {
  const code = parseInt(symbol.substring(0, 4));
  const isBondETF = /^00\d{2,3}B$/i.test(symbol);
  
  if (isBondETF) {
    return ['.TWO', '.TW']; // 債券 ETF：櫃買中心優先
  } else if (code >= 3000 && code <= 8999) {
    return ['.TWO', '.TW']; // 上櫃股票：櫃買中心優先
  } else {
    return ['.TW', '.TWO']; // 上市股票：證交所優先
  }
}
```

#### 2. 驗證成功的測試案例
```typescript
// ✅ 必須通過的標準測試案例
const VERIFIED_TEST_CASES = [
  { symbol: '2330', suffix: '.TW', market: '上市', name: '台積電', price: 1760 },
  { symbol: '2886', suffix: '.TW', market: '上市', name: '兆豐金', price: 40.55 },
  { symbol: '6188', suffix: '.TWO', market: '上櫃', name: '廣明', price: 109 },
  { symbol: '4585', suffix: '.TWO', market: '上櫃', name: '達明', price: 338 },
  { symbol: '7566', suffix: '.TWO', market: '上櫃', name: '亞果遊艇', price: 15.2 },
  { symbol: '0050', suffix: '.TWO', market: 'ETF', name: '元大台灣50', price: 72.6 },
  { symbol: '00646', suffix: '.TWO', market: 'ETF', name: '元大S&P500', price: 68.1 },
  { symbol: '00679B', suffix: '.TWO', market: 'ETF', name: '元大美債20年', price: 27.19 }
];
```

#### 3. 混合資料來源策略（推薦標準）
```typescript
// ✅ 最佳實作：Yahoo Finance 股價 + FinMind 中文名稱
async function getOptimalStockPrice(symbol: string): Promise<StockPrice | null> {
  // 步驟 1: 使用 Yahoo Finance 獲取即時股價
  const yahooData = await getYahooStockPrice(symbol);
  
  if (yahooData && yahooData.price > 0) {
    // 步驟 2: 同時獲取 FinMind 中文名稱
    try {
      const finmindData = await getFinMindStockInfo(symbol);
      if (finmindData?.name && finmindData.name !== symbol) {
        return {
          ...yahooData,
          name: finmindData.name,
          source: 'Yahoo+FinMind' // 標記混合來源
        };
      }
    } catch (e) {
      // 中文名稱獲取失敗不影響股價
    }
    
    return yahooData;
  }
  
  // 步驟 3: Yahoo Finance 失敗時使用 FinMind 備援
  return await getFinMindStockPrice(symbol);
}
```

### 🚨 強制執行的規範

#### 絕對禁止
- ❌ **硬編碼股票列表**：`const otcStocks = ['6188', '4585']`
- ❌ **固定後綴**：`${symbol}.TW` 不考慮股票類型
- ❌ **忽略備援**：只嘗試一個後綴就放棄
- ❌ **虛假資料**：API 失敗時提供預設價格

#### 必須實作
- ✅ **智能判斷**：根據代碼範圍自動選擇後綴
- ✅ **多重嘗試**：主要後綴失敗時嘗試備用後綴
- ✅ **詳細日誌**：記錄判斷邏輯和嘗試過程
- ✅ **混合策略**：結合多個 API 的優勢

### 📋 實作檢查清單

#### 每次實作股價獲取功能時必須確認
- [ ] 使用智能後綴判斷邏輯
- [ ] 上櫃股票（3000-8999）優先使用 .TWO
- [ ] 上市股票（1000-2999）優先使用 .TW
- [ ] 債券 ETF（00XXXB）優先使用 .TWO
- [ ] 實作多重後綴嘗試機制
- [ ] 添加詳細的日誌記錄
- [ ] 通過所有驗證測試案例
- [ ] 前後端邏輯保持一致

---

**記住：此標準基於 v1.0.2.0197 的成功修復制定，是經過實戰驗證的最佳實作！所有股價獲取功能都必須遵循此規範！**
