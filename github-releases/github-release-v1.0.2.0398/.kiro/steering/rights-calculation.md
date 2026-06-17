# 除權息計算規範 (Rights Calculation Standards)

> 合併自：unified-rights-calculation.md, stock-dividend-calculation.md

## 🎯 核心原則

### 單一真相來源
- ✅ **統一使用 RightsEventService**：所有除權息計算都使用同一個服務
- ✅ **所有入口傳入 forceRecalculate**：確保邏輯一致
- ✅ **按時間順序計算**：除權息記錄必須從舊到新排序

### 時間順序決定計算順序
- ✅ **必須先排序**：API 返回的資料可能是從新到舊
- ✅ **累積計算持股數**：每次配股基於上一次的除權後持股數
- ✅ **使用最終持股數**：更新股票記錄時使用最後一筆的 sharesAfterRight

---

## 🔄 所有除權息更新入口

### 必須檢查的文件和函數

#### 1. src/stores/appStore.ts
```typescript
// updateStockDividendData 函數
const updateStockDividendData = async (
  stock: StockRecord, 
  state: any, 
  forceRecalculate: boolean = false // ⚠️ 必須有這個參數
) => {
  await RightsEventService.processStockRightsEvents(
    stock, 
    onProgress, 
    forceRecalculate // ⚠️ 必須傳入
  );
};

// updateAllStockPrices 函數
updateAllStockPrices: async () => {
  await updateStockDividendData(stock, state, true); // ⚠️ 必須傳入 true
}
```

#### 2. src/components/RightsEventManager.tsx
```typescript
// handleProcessRightsEvents 函數
const handleProcessRightsEvents = async (forceRecalculate: boolean = false) => {
  await RightsEventService.processStockRightsEvents(
    stock, 
    onProgress, 
    forceRecalculate // ⚠️ 必須傳入
  );
};

// 按鈕點擊
<button onClick={() => handleProcessRightsEvents(true)}>
  更新除權息資料
</button>
```

#### 3. src/App.tsx
```typescript
// loadDividendsForExistingStocks 函數
const loadDividendsForExistingStocks = async () => {
  await RightsEventService.processStockRightsEvents(
    stock, 
    onProgress, 
    false // 自動載入使用增量更新
  );
};
```

---

## 📋 配股計算公式

### 基本公式
```typescript
// 配股數量 = Math.floor(除權前持股數 × 配股比例 / 1000)
const stockDividendShares = Math.floor(sharesBeforeRight * stockDividendRatio / 1000);

// 除權後持股數 = 除權前持股數 + 配股數量
const sharesAfterRight = sharesBeforeRight + stockDividendShares;
```

### 調整後成本價公式
```typescript
// 調整後成本價 = (除權前成本價 × 除權前股數 - 現金股利總額) / 除權後股數
const totalCostBeforeRight = costPriceBeforeRight * sharesBeforeRight;
const totalCashDividend = sharesBeforeRight * cashDividendPerShare;
const adjustedCostPrice = (totalCostBeforeRight - totalCashDividend) / sharesAfterRight;
```

### 配股比例計算
```typescript
// 配股比例 = (股票股利 ÷ 面額10元) × 1000
stockDividendRatio = (stockDividend / 10) * 1000

// 範例：股票股利 0.3 元
// 配股比例 = (0.3 ÷ 10) × 1000 = 30‰
```

---

## 🔄 標準實作流程

### 步驟 1：獲取 API 資料
```typescript
const apiDividends = await DividendApiService.getHistoricalDividends(
  stock.symbol, 
  stock.purchaseDate
);
```

### 步驟 2：⚠️ 排序為從舊到新（關鍵步驟）
```typescript
const sortedDividends = apiDividends.sort((a, b) => 
  new Date(a.exDividendDate).getTime() - new Date(b.exDividendDate).getTime()
);

// 添加日誌記錄
logger.debug('dividend', `${stock.symbol} 除權息排序`, {
  原始順序: apiDividends.map(d => d.exDividendDate),
  排序後: sortedDividends.map(d => d.exDividendDate)
});
```

### 步驟 3：初始化變數
```typescript
let currentShares = stock.shares;
let currentCostPrice = stock.costPrice;
let totalStockDividendShares = 0;
```

### 步驟 4：按順序計算配股
```typescript
const newDividendRecords = sortedDividends.map((dividend, index) => {
  // 計算配股和調整後成本價
  const { adjustedCostPrice, sharesAfterRight, stockDividendShares } = 
    RightsAdjustmentService.calculateAdjustedCostPrice(
      currentCostPrice,
      currentShares,
      dividend.cashDividendPerShare || 0,
      dividend.stockDividendRatio || 0
    );
  
  // 創建除權息記錄
  const record = {
    // ... 記錄詳情
    sharesBeforeRight: currentShares,
    sharesAfterRight: sharesAfterRight,
    stockDividendShares: stockDividendShares,
  };
  
  // ⚠️ 關鍵：累積更新供下一筆使用
  currentShares = sharesAfterRight;
  currentCostPrice = adjustedCostPrice;
  totalStockDividendShares += stockDividendShares;
  
  return record;
});
```

### 步驟 5：更新股票記錄
```typescript
// ⚠️ 使用最後一筆記錄的除權後持股數
const finalShares = newDividendRecords.length > 0 
  ? newDividendRecords[newDividendRecords.length - 1].sharesAfterRight
  : stock.shares;

updateStock(stock.id, {
  shares: finalShares,  // 使用最終持股數
  adjustedCostPrice: currentCostPrice,
  dividendRecords: [...(stock.dividendRecords || []), ...newDividendRecords]
});
```

---

## 📊 實際案例：2890 永豐金

### 購買資訊
- 購買日期：2023/08/08
- 購買股數：4000 股
- 購買成本：$18.65

### 除權息記錄（FinMind API 返回順序：從新到舊）
```json
[
  { "exDate": "2025-08-21", "cashDividend": 0.91, "stockDividendRatio": 34 },
  { "exDate": "2024-08-22", "cashDividend": 0.73, "stockDividendRatio": 25 },
  { "exDate": "2023-08-09", "cashDividend": 0.60, "stockDividendRatio": 20 }
]
```

### ❌ 錯誤計算（未排序）
```
2025年：4000股 × 34‰ = 136股 → 4136股
2024年：4136股 × 25‰ = 103股 → 4239股
2023年：4239股 × 20‰ = 84股  → 4323股
總配股：136 + 103 + 84 = 323股 ❌
```

### ✅ 正確計算（已排序）
```
排序後：[2023-08-09, 2024-08-22, 2025-08-21]

2023年：4000股 × 20‰ = 80股  → 4080股
2024年：4080股 × 25‰ = 102股 → 4182股
2025年：4182股 × 34‰ = 142股 → 4324股
總配股：80 + 102 + 142 = 324股 ✅
```

---

## 🚫 絕對禁止的做法

### 1. 在多處實作除權息計算邏輯
```typescript
// ❌ 錯誤：在 appStore.ts 中自己實作配股計算
const updateStockDividendData = async (stock: StockRecord) => {
  const stockDividendShares = Math.floor(stock.shares * ratio / 1000);
  // ... 自己的計算邏輯
};

// ✅ 正確：調用統一的服務
const updateStockDividendData = async (stock: StockRecord) => {
  await RightsEventService.processStockRightsEvents(stock, onProgress, true);
};
```

### 2. 忘記傳入 forceRecalculate 參數
```typescript
// ❌ 錯誤：依賴預設值（false）
await RightsEventService.processStockRightsEvents(stock, onProgress);

// ✅ 正確：明確傳入
await RightsEventService.processStockRightsEvents(stock, onProgress, true);
```

### 3. 未排序就計算
```typescript
// ❌ 錯誤：直接使用 API 返回的順序
const records = apiDividends.map(dividend => {
  // 直接計算
});

// ✅ 正確：先排序為從舊到新
const sortedDividends = apiDividends.sort((a, b) => 
  new Date(a.exDividendDate).getTime() - new Date(b.exDividendDate).getTime()
);
const records = sortedDividends.map(dividend => {
  // 計算
});
```

### 4. 使用錯誤的持股數
```typescript
// ❌ 錯誤：每次都用原始持股數
const stockDividendShares = Math.floor(stock.shares * ratio / 1000);

// ✅ 正確：使用上一次的除權後持股數
const stockDividendShares = Math.floor(currentShares * ratio / 1000);
currentShares = currentShares + stockDividendShares; // 累積更新
```

---

## 📋 開發檢查清單

### 每次修改除權息邏輯必須確認
- [ ] API 資料已按時間從舊到新排序
- [ ] 配股計算使用 currentShares（累積值）而非 stock.shares（原始值）
- [ ] 每次計算後更新 currentShares 供下一筆使用
- [ ] 最終持股數使用最後一筆記錄的 sharesAfterRight
- [ ] 添加了排序日誌記錄原始順序和排序後順序
- [ ] 所有入口都傳入 forceRecalculate 參數
- [ ] 測試了多年配股的累積計算
- [ ] 驗證了配股數量與 GoodInfo 等網站一致

---

## 🎯 自動化檢查

### 除權息計算一致性檢查
```bash
npm run check:rights
```

**檢查內容**：
- 所有 processStockRightsEvents 調用是否傳入 forceRecalculate
- updateStockDividendData 是否接受並傳遞 forceRecalculate
- 除權息記錄是否按時間排序
- 是否使用累積的 currentShares

---

**記住：除權息計算必須統一！所有入口都使用 RightsEventService.processStockRightsEvents，並明確傳入 forceRecalculate 參數！配股計算必須按時間從舊到新順序進行！**
