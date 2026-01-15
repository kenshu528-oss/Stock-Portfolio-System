# 配股計算規範 (Stock Dividend Calculation Standards)

## 🎯 核心原則：時間順序決定計算順序

### 絕對要求的規範
- ✅ **必須按時間從舊到新排序**：配股計算前必須先排序除權息記錄
- ✅ **累積計算持股數**：每次配股基於上一次的除權後持股數
- ✅ **使用最終持股數**：更新股票記錄時使用最後一筆的 sharesAfterRight
- ✅ **記錄排序日誌**：添加日誌記錄原始順序和排序後順序

## ⚠️ 嚴重錯誤：配股計算順序錯誤

### 問題描述
FinMind API 返回的除權息記錄是**按時間從新到舊排序**（2025→2024→2023），但配股計算必須**從舊到新累積**（2023→2024→2025），因為每次配股會增加持股數，影響下一次的配股計算。

### 錯誤範例
```typescript
// ❌ 錯誤：直接使用 API 返回的順序（從新到舊）
const apiDividends = await getHistoricalDividends(symbol, purchaseDate);
// API 返回順序：[2025-08-21, 2024-08-22, 2023-08-09]

let currentShares = 4000;
const records = apiDividends.map(dividend => {
  const stockDividendShares = Math.floor(currentShares * dividend.stockDividendRatio / 1000);
  currentShares += stockDividendShares;
  return { ...dividend, stockDividendShares };
});

// 結果（錯誤）：
// 2025年：4000股 × 34‰ = 136股 → 4136股
// 2024年：4136股 × 25‰ = 103股 → 4239股  // 錯誤！
// 2023年：4239股 × 20‰ = 84股  → 4323股  // 錯誤！
```

### 正確範例
```typescript
// ✅ 正確：先排序為從舊到新，再計算配股
const apiDividends = await getHistoricalDividends(symbol, purchaseDate);

// ⚠️ 關鍵步驟：排序為從舊到新
const sortedDividends = apiDividends.sort((a, b) => 
  new Date(a.exDividendDate).getTime() - new Date(b.exDividendDate).getTime()
);
// 排序後順序：[2023-08-09, 2024-08-22, 2025-08-21]

logger.debug('dividend', `${symbol} 除權息排序`, {
  原始順序: apiDividends.map(d => d.exDividendDate),
  排序後: sortedDividends.map(d => d.exDividendDate)
});

let currentShares = 4000;
const records = sortedDividends.map(dividend => {
  const stockDividendShares = Math.floor(currentShares * dividend.stockDividendRatio / 1000);
  currentShares += stockDividendShares;
  return { ...dividend, stockDividendShares };
});

// 結果（正確）：
// 2023年：4000股 × 20‰ = 80股  → 4080股  ✅
// 2024年：4080股 × 25‰ = 102股 → 4182股  ✅
// 2025年：4182股 × 34‰ = 142股 → 4324股  ✅
```

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

## 🔄 標準實作流程

### 步驟 1: 獲取 API 資料
```typescript
const apiDividends = await DividendApiService.getHistoricalDividends(
  stock.symbol, 
  stock.purchaseDate
);
```

### 步驟 2: ⚠️ 排序為從舊到新（關鍵步驟）
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

### 步驟 3: 初始化變數
```typescript
let currentShares = stock.shares;
let currentCostPrice = stock.costPrice;
let totalStockDividendShares = 0;
```

### 步驟 4: 按順序計算配股
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
    id: `api-${Date.now()}-${index}-${stock.id}`,
    stockId: stock.id,
    symbol: dividend.symbol,
    exDividendDate: new Date(dividend.exDividendDate),
    exRightDate: new Date(dividend.exDividendDate),
    
    // 現金股利
    cashDividendPerShare: dividend.cashDividendPerShare || 0,
    totalCashDividend: (dividend.cashDividendPerShare || 0) * currentShares,
    
    // 股票股利（配股）
    stockDividendRatio: dividend.stockDividendRatio || 0,
    stockDividendShares: stockDividendShares,
    
    // 持股狀況
    sharesBeforeRight: currentShares,
    sharesAfterRight: sharesAfterRight,
    
    // 成本價
    costPriceBeforeRight: currentCostPrice,
    costPriceAfterRight: adjustedCostPrice,
    
    // 其他資訊
    type: (dividend.stockDividendRatio && dividend.stockDividendRatio > 0) ? 'both' : 'cash'
  };
  
  // ⚠️ 關鍵：累積更新供下一筆使用
  currentShares = sharesAfterRight;
  currentCostPrice = adjustedCostPrice;
  totalStockDividendShares += stockDividendShares;
  
  logger.debug('rights', `${stock.symbol} 除權息計算`, {
    date: dividend.exDividendDate,
    cash: dividend.cashDividendPerShare,
    stockRatio: dividend.stockDividendRatio,
    stockDiv: stockDividendShares,
    sharesBeforeRight: record.sharesBeforeRight,
    sharesAfterRight: sharesAfterRight
  });
  
  return record;
});
```

### 步驟 5: 更新股票記錄
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

logger.success('dividend', `${stock.symbol} 除權息更新完成`, {
  records: newDividendRecords.length,
  totalStockDiv: totalStockDividendShares,
  finalShares: finalShares,
  adjustedCost: currentCostPrice.toFixed(2)
});
```

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

## 🚨 常見錯誤

### 錯誤 1: 未排序就計算
```typescript
// ❌ 錯誤
const records = apiDividends.map(dividend => {
  // 直接使用 API 返回的順序
});
```

### 錯誤 2: 使用錯誤的持股數
```typescript
// ❌ 錯誤：每次都用原始持股數
const stockDividendShares = Math.floor(stock.shares * dividend.stockDividendRatio / 1000);

// ✅ 正確：使用上一次的除權後持股數
const stockDividendShares = Math.floor(currentShares * dividend.stockDividendRatio / 1000);
currentShares = currentShares + stockDividendShares; // 累積更新
```

### 錯誤 3: 使用累加的配股總數
```typescript
// ❌ 錯誤：累加配股總數
const finalShares = stock.shares + totalStockDividendShares;

// ✅ 正確：使用最後一筆記錄的除權後持股數
const finalShares = newDividendRecords[newDividendRecords.length - 1].sharesAfterRight;
```

## 📋 開發檢查清單

### 每次修改配股計算邏輯必須確認
- [ ] API 資料已按時間從舊到新排序？
- [ ] 配股計算使用 currentShares（累積值）而非 stock.shares（原始值）？
- [ ] 每次計算後更新 currentShares 供下一筆使用？
- [ ] 最終持股數使用最後一筆記錄的 sharesAfterRight？
- [ ] 添加了排序日誌記錄原始順序和排序後順序？
- [ ] 測試了多年配股的累積計算？
- [ ] 驗證了配股數量與 GoodInfo 等網站一致？

### 測試案例
- [ ] 單年配股：計算正確
- [ ] 多年配股：累積計算正確
- [ ] 無配股年份：不影響其他年份
- [ ] 混合除權息：現金股利和配股都正確
- [ ] API 順序測試：從新到舊、從舊到新都能正確處理

## 💡 最佳實踐

### 1. 總是排序
無論 API 返回什麼順序，總是在計算前排序為從舊到新。

### 2. 添加日誌
記錄排序前後的順序，方便調試。

### 3. 使用累積變數
使用 `currentShares` 和 `currentCostPrice` 累積更新，不要直接修改原始值。

### 4. 驗證結果
與 GoodInfo、證交所等官方網站對比，確保計算正確。

### 5. 單元測試
為配股計算編寫單元測試，覆蓋各種情況。

---

**記住：配股計算必須按時間從舊到新順序進行，因為每次配股會影響下一次的計算基數！**
