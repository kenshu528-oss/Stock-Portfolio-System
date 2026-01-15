# 統一除權息計算規範 (Unified Rights Calculation Standards)

## 🎯 核心原則：單一真相來源 (Single Source of Truth)

### 絕對要求的規範
- ✅ **所有除權息計算必須使用 RightsEventService.processStockRightsEvents**
- ✅ **所有更新入口必須傳入相同的 forceRecalculate 參數**
- ✅ **禁止在多處實作除權息計算邏輯**
- ✅ **修改除權息邏輯時必須檢查所有調用點**

## 🚨 嚴重錯誤：多處實作導致邏輯不一致

### 問題描述
系統有多個除權息更新入口：
1. **Header 批量更新按鈕**（右上角）
2. **個股除權息管理按鈕**（個股內）
3. **自動載入除權息**（App.tsx）

如果這些入口使用不同的邏輯或參數，會導致：
- ❌ 配股數量計算結果不一致
- ❌ 持股數更新不一致
- ❌ 調整後成本價不一致
- ❌ 用戶困惑：為什麼不同按鈕結果不同？

### 歷史問題
- **v1.0.2.0127**：統一使用 RightsEventService，但忘記傳入 forceRecalculate 參數
- **v1.0.2.0131**：修復 forceRecalculate 邏輯，但 Header 批量更新仍未傳入
- **v1.0.2.0132**：再次修復，確保所有入口都傳入 forceRecalculate: true

## 📋 標準實作規範

### 1. 唯一的除權息計算服務
```typescript
// ✅ 正確：所有除權息計算都使用這個服務
import { RightsEventService } from '../services/rightsEventService';

const updatedStock = await RightsEventService.processStockRightsEvents(
  stock,
  (message) => console.log(message),
  forceRecalculate // ⚠️ 必須明確傳入
);
```

### 2. 所有調用點必須傳入 forceRecalculate
```typescript
// ❌ 錯誤：沒有傳入 forceRecalculate（預設為 false）
await RightsEventService.processStockRightsEvents(stock, onProgress);

// ✅ 正確：明確傳入 forceRecalculate
await RightsEventService.processStockRightsEvents(stock, onProgress, true);
```

### 3. 批量更新函數必須接受並傳遞參數
```typescript
// ❌ 錯誤：updateStockDividendData 沒有 forceRecalculate 參數
const updateStockDividendData = async (stock: StockRecord, state: any) => {
  await RightsEventService.processStockRightsEvents(stock, onProgress);
};

// ✅ 正確：接受並傳遞 forceRecalculate 參數
const updateStockDividendData = async (
  stock: StockRecord, 
  state: any, 
  forceRecalculate: boolean = false
) => {
  await RightsEventService.processStockRightsEvents(stock, onProgress, forceRecalculate);
};
```

## 🔍 所有除權息更新入口

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

### 3. 不同入口使用不同的 forceRecalculate 值
```typescript
// ❌ 錯誤：Header 用 false，個股用 true
// Header:
await updateStockDividendData(stock, state, false);

// 個股:
await RightsEventService.processStockRightsEvents(stock, onProgress, true);

// ✅ 正確：統一使用 true（強制重新計算）
// Header:
await updateStockDividendData(stock, state, true);

// 個股:
await RightsEventService.processStockRightsEvents(stock, onProgress, true);
```

## 📋 修改檢查清單

### 每次修改除權息邏輯時必須確認

#### 修改 RightsEventService.processStockRightsEvents 時
- [ ] 檢查 src/stores/appStore.ts 的 updateStockDividendData
- [ ] 檢查 src/stores/appStore.ts 的 updateAllStockPrices
- [ ] 檢查 src/components/RightsEventManager.tsx 的 handleProcessRightsEvents
- [ ] 檢查 src/App.tsx 的 loadDividendsForExistingStocks
- [ ] 確保所有調用點都傳入正確的 forceRecalculate 參數

#### 修改批量更新邏輯時
- [ ] 確保 updateStockDividendData 接受 forceRecalculate 參數
- [ ] 確保 updateAllStockPrices 傳入 forceRecalculate: true
- [ ] 測試 Header 批量更新按鈕
- [ ] 測試個股除權息管理按鈕
- [ ] 確認兩者結果完全一致

#### 添加新的除權息更新入口時
- [ ] 必須使用 RightsEventService.processStockRightsEvents
- [ ] 必須明確傳入 forceRecalculate 參數
- [ ] 添加到本文檔的「所有除權息更新入口」清單
- [ ] 測試與其他入口的一致性

## 🔧 測試驗證

### 測試步驟
1. **準備測試資料**：
   - 添加一支有配股的股票（如 2886 兆豐金）
   - 記錄初始持股數（如 1000 股）

2. **測試 Header 批量更新**：
   - 點擊右上角更新按鈕
   - 記錄更新後的持股數（應該是 1030 股，配股 30 股）

3. **重置資料**：
   - 恢復到初始持股數 1000 股

4. **測試個股內更新**：
   - 點擊個股的「更新除權息資料」按鈕
   - 記錄更新後的持股數（應該是 1030 股，配股 30 股）

5. **驗證一致性**：
   - ✅ 兩次更新的持股數必須完全相同
   - ✅ 兩次更新的配股數必須完全相同
   - ✅ 兩次更新的調整後成本價必須完全相同

### 自動化測試（建議）
```typescript
// tests/rightsCalculation.test.ts
describe('除權息計算一致性', () => {
  it('Header 批量更新和個股更新結果應該一致', async () => {
    const stock = createTestStock({ symbol: '2886', shares: 1000 });
    
    // 測試 Header 批量更新
    const result1 = await updateStockDividendData(stock, state, true);
    
    // 重置
    stock.shares = 1000;
    stock.dividendRecords = [];
    
    // 測試個股更新
    const result2 = await RightsEventService.processStockRightsEvents(stock, null, true);
    
    // 驗證一致性
    expect(result1.shares).toBe(result2.shares);
    expect(result1.adjustedCostPrice).toBe(result2.adjustedCostPrice);
    expect(result1.dividendRecords.length).toBe(result2.dividendRecords.length);
  });
});
```

## 💡 最佳實踐

### 1. 單一真相來源
- 所有除權息計算邏輯只在 RightsEventService 中實作
- 其他地方只調用，不實作

### 2. 明確的參數傳遞
- 不依賴預設值
- 明確傳入 forceRecalculate 參數
- 添加註解說明為什麼使用 true 或 false

### 3. 完整的調用鏈
```
用戶點擊按鈕
  ↓
Header.handleRefreshPrices() 或 RightsEventManager.handleProcessRightsEvents()
  ↓
appStore.updateAllStockPrices() 或直接調用
  ↓
appStore.updateStockDividendData(stock, state, true) ⚠️ 必須傳入 true
  ↓
RightsEventService.processStockRightsEvents(stock, onProgress, true) ⚠️ 必須傳入 true
  ↓
計算配股、更新持股數、調整成本價
```

### 4. 代碼審查重點
- 搜尋所有 `processStockRightsEvents` 調用
- 確認每個調用都傳入了 forceRecalculate 參數
- 確認批量更新和個股更新使用相同的參數

## 🎯 目標效果

### 用戶體驗
- **一致性**：無論從哪個入口更新，結果都完全相同
- **可預測性**：用戶知道更新按鈕會做什麼
- **可靠性**：不會因為選擇不同的更新方式而得到不同的結果

### 技術指標
- **代碼重複率**：0%（只有一處實作）
- **邏輯一致性**：100%（所有入口使用相同邏輯）
- **維護成本**：最低（只需維護一處）
- **測試覆蓋率**：> 90%（關鍵邏輯必須測試）

## 📚 相關規則

- **safe-development.md**：疊加式開發，不破壞現有功能
- **code-quality-standards.md**：代碼質量標準
- **stock-dividend-calculation.md**：配股計算規範

---

**記住：除權息計算必須統一！所有入口都使用 RightsEventService.processStockRightsEvents，並明確傳入 forceRecalculate 參數！**

**制定日期**: 2026-01-14  
**版本**: 1.0.0  
**最後更新**: 2026-01-14  
**觸發原因**: v1.0.2.0132 修復 Header 批量更新和個股更新邏輯不一致問題
