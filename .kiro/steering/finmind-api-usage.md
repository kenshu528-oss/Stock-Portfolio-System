# FinMind API 使用規範 (FinMind API Usage Standards)

## 🎯 核心原則：FinMind 是台股資料的首選來源

### 絕對要求的規範
- ✅ **FinMind API 為首選**：台股資料必須優先使用 FinMind API
- ✅ **使用正確的資料集**：股息配股必須使用 `TaiwanStockDividend`
- ✅ **使用正確的欄位**：現金股利和股票股利有專用欄位
- ✅ **正確計算配股比例**：(股票股利 ÷ 10) × 1000

## 📊 資料集使用規範

### 1. 股票基本資訊 - `TaiwanStockInfo`
```javascript
// ✅ 正確：獲取股票中文名稱
dataset: 'TaiwanStockInfo'
欄位: stock_name // 股票中文名稱
```

### 2. 股票價格 - `TaiwanStockPrice`
```javascript
// ✅ 正確：獲取股票價格
dataset: 'TaiwanStockPrice'
欄位: close // 收盤價
```

### 3. 股息配股 - `TaiwanStockDividend` ⭐ **重要**
```javascript
// ✅ 正確：獲取完整除權息資料
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

## ❌ 絕對禁止的錯誤

### 錯誤 1: 使用錯誤的資料集
```javascript
// ❌ 錯誤：TaiwanStockDividendResult 沒有詳細股利欄位
dataset: 'TaiwanStockDividendResult'

// ✅ 正確：TaiwanStockDividend 有完整股利欄位
dataset: 'TaiwanStockDividend'
```

### 錯誤 2: 使用錯誤的欄位名稱
```javascript
// ❌ 錯誤：這些欄位不存在
item.cash_dividend
item.stock_dividend

// ✅ 正確：使用正確的欄位名稱
item.CashEarningsDistribution + item.CashStatutorySurplus
item.StockEarningsDistribution + item.StockStatutorySurplus
```

### 錯誤 3: 配股比例計算錯誤
```javascript
// ❌ 錯誤：直接乘以1000
stockDividendRatio = stockDividend * 1000 // 0.3 × 1000 = 300‰ (錯誤！)

// ✅ 正確：先除以面額再乘以1000
stockDividendRatio = (stockDividend / 10) * 1000 // (0.3 ÷ 10) × 1000 = 30‰
```

### 錯誤 4: 忽略法定盈餘
```javascript
// ❌ 錯誤：只使用盈餘分配
cashDividend = item.CashEarningsDistribution

// ✅ 正確：盈餘分配 + 法定盈餘
cashDividend = item.CashEarningsDistribution + item.CashStatutorySurplus
```

### 錯誤 5: 民國年未轉換
```javascript
// ❌ 錯誤：直接使用民國年
year = parseInt(item.year) // "112年" → 112 (錯誤！)

// ✅ 正確：民國年轉西元年
year = parseInt(item.year.replace('年', '')) + 1911 // 112 + 1911 = 2023
```

### 錯誤 6: 配股計算順序錯誤 ⚠️ **嚴重錯誤**
```javascript
// ❌ 錯誤：直接使用 API 返回的順序（從新到舊）
const records = apiDividends.map(dividend => {
  const stockDividendShares = Math.floor(currentShares * dividend.stockDividendRatio / 1000);
  currentShares += stockDividendShares; // 錯誤的累積順序！
  return { ...dividend, stockDividendShares };
});

// ✅ 正確：必須先排序為從舊到新，再計算配股
const sortedDividends = apiDividends.sort((a, b) => 
  new Date(a.exDividendDate).getTime() - new Date(b.exDividendDate).getTime()
);

const records = sortedDividends.map(dividend => {
  const stockDividendShares = Math.floor(currentShares * dividend.stockDividendRatio / 1000);
  currentShares += stockDividendShares; // 正確的累積順序
  return { ...dividend, stockDividendShares };
});
```

**為什麼必須排序？**
- FinMind API 返回的資料是**從新到舊**排序（2025→2024→2023）
- 配股計算必須**從舊到新**累積（2023→2024→2025）
- 因為每次配股會增加持股數，影響下一次的配股計算

**錯誤範例（2890 永豐金）：**
```javascript
// ❌ 錯誤：使用 API 原始順序（從新到舊）
// 2025年：4000股 × 34‰ = 136股 → 4136股
// 2024年：4136股 × 25‰ = 103股 → 4239股  // 錯誤！
// 2023年：4239股 × 20‰ = 84股  → 4323股  // 錯誤！

// ✅ 正確：先排序為從舊到新
// 2023年：4000股 × 20‰ = 80股  → 4080股  ✅
// 2024年：4080股 × 25‰ = 102股 → 4182股  ✅
// 2025年：4182股 × 34‰ = 142股 → 4324股  ✅
```

## 📋 實際案例：2886 兆豐金 2024年除權息

### FinMind API 原始資料
```json
{
  "CashEarningsDistribution": 1.5,
  "CashStatutorySurplus": 0,
  "StockEarningsDistribution": 0.3,
  "StockStatutorySurplus": 0,
  "CashExDividendTradingDate": "2024-08-08"
}
```

### 正確解析結果
- 現金股利: 1.5 + 0 = **1.5 元** ✅
- 股票股利: 0.3 + 0 = **0.3 元** ✅
- 配股比例: (0.3 ÷ 10) × 1000 = **30‰** ✅
- 總股利: 1.5 + 0.3 = **1.8 元** ✅
- 類型: **both** (除權息) ✅

### 配股計算
- 持股 1000 股 × 30‰ = **30 股配股** ✅
- 除權後持股: 1000 + 30 = **1030 股** ✅

## 🔒 API 資料完整性規則

### ✅ 允許的做法
- 使用真實的 FinMind API 資料
- API 失敗時返回明確的 404 錯誤
- 提供清楚的錯誤訊息

### ❌ 禁止的做法
- 使用本地硬編碼股票資料
- 提供虛假或過時的資料
- API 失敗時返回預設值
- 混用真實和虛假資料

## 🔄 配股計算流程規範

### 必須遵循的步驟
1. **從 FinMind API 獲取除權息資料**
2. **⚠️ 關鍵步驟：按時間從舊到新排序**
3. **初始化持股數和成本價**
4. **按順序計算每筆除權息的配股**
5. **累積更新持股數和成本價**

### 標準實作範例
```typescript
// 步驟 1: 獲取 API 資料
const apiDividends = await DividendApiService.getHistoricalDividends(symbol, purchaseDate);

// 步驟 2: ⚠️ 必須排序為從舊到新
const sortedDividends = apiDividends.sort((a, b) => 
  new Date(a.exDividendDate).getTime() - new Date(b.exDividendDate).getTime()
);

// 步驟 3: 初始化
let currentShares = stock.shares;
let currentCostPrice = stock.costPrice;

// 步驟 4-5: 按順序計算配股
const records = sortedDividends.map(dividend => {
  // 計算配股
  const { adjustedCostPrice, sharesAfterRight, stockDividendShares } = 
    RightsAdjustmentService.calculateAdjustedCostPrice(
      currentCostPrice,
      currentShares,
      dividend.cashDividendPerShare || 0,
      dividend.stockDividendRatio || 0
    );
  
  // 創建記錄
  const record = {
    ...dividend,
    sharesBeforeRight: currentShares,
    sharesAfterRight: sharesAfterRight,
    stockDividendShares: stockDividendShares,
    costPriceBeforeRight: currentCostPrice,
    costPriceAfterRight: adjustedCostPrice
  };
  
  // 累積更新（供下一筆使用）
  currentShares = sharesAfterRight;
  currentCostPrice = adjustedCostPrice;
  
  return record;
});

// 步驟 6: 更新股票記錄
updateStock(stock.id, {
  shares: currentShares,  // 使用最終持股數
  adjustedCostPrice: currentCostPrice,
  dividendRecords: records
});
```

### 檢查清單
- [ ] API 資料已按時間從舊到新排序？
- [ ] 配股計算使用上一筆的除權後持股數？
- [ ] 最終持股數使用最後一筆記錄的 sharesAfterRight？
- [ ] 添加了排序日誌供調試？
- [ ] 測試了多年配股的累積計算？

## 📚 相關文檔

- 詳細指南: `FINMIND_API_GUIDE.md`
- STEERING 規則: `finmind-api-priority.md`, `api-data-integrity.md`

---

**記住：FinMind API 是台股資料的最佳選擇，必須使用正確的資料集和欄位！**
