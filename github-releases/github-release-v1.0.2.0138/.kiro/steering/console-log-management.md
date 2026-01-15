# Console Log 管理規範 (Console Log Management Standards)

## 🎯 核心原則：分級控制，按需輸出

### 絕對要求的規範
- ✅ **使用統一的 logger 系統**：禁止直接使用 console.log
- ✅ **按模組分級管理**：不同模組可設定不同的 log 等級
- ✅ **預設簡潔輸出**：平常只顯示重要訊息（INFO 等級）
- ✅ **需要時開啟詳細 log**：調試時可開啟 DEBUG/TRACE 等級

## 📋 Logger 系統架構

### 1. Log 等級定義
```typescript
LogLevel.ERROR = 0   // 錯誤：必須顯示
LogLevel.WARN = 1    // 警告：重要提示
LogLevel.INFO = 2    // 資訊：一般訊息（預設）
LogLevel.DEBUG = 3   // 調試：詳細資訊
LogLevel.TRACE = 4   // 追蹤：超詳細資訊
```

### 2. 模組分類
```typescript
'global'    // 全域通用
'dividend'  // 股息相關
'stock'     // 股票相關
'api'       // API 調用
'cloud'     // 雲端同步
'import'    // 匯入功能
'export'    // 匯出功能
'rights'    // 配股處理
```

### 3. Logger 使用方式
```typescript
import { logger } from '../utils/logger';

// 錯誤訊息（總是顯示）
logger.error('dividend', '更新失敗', error);

// 警告訊息
logger.warn('api', 'API 回應慢', { time: 5000 });

// 一般訊息（預設顯示）
logger.info('stock', '股價更新完成', { count: 10 });

// 調試訊息（需開啟 DEBUG 等級）
logger.debug('dividend', '計算配股', { shares: 100 });

// 追蹤訊息（需開啟 TRACE 等級）
logger.trace('stock', '詳細資料', { fullData });

// 成功訊息
logger.success('import', '匯入完成', { accounts: 5 });
```

## 🚫 禁止的做法

### 絕對禁止
- ❌ **直接使用 console.log**：必須使用 logger 系統
- ❌ **過度詳細的預設 log**：預設應該簡潔
- ❌ **重複的 log 訊息**：相同資訊不要重複輸出
- ❌ **輸出完整物件**：大物件會讓 console 過長

### 錯誤範例
```typescript
// ❌ 錯誤：直接使用 console.log
console.log('🔍 開始處理...', fullData);

// ❌ 錯誤：過度詳細
console.log('步驟1', data1);
console.log('步驟2', data2);
console.log('步驟3', data3);

// ❌ 錯誤：輸出完整物件
console.log('股票資料:', stock); // 物件太大
```

### 正確範例
```typescript
// ✅ 正確：使用 logger 系統
logger.info('stock', '開始處理', { symbol: stock.symbol });

// ✅ 正確：簡潔輸出
logger.info('stock', '處理完成', { count: 3 });

// ✅ 正確：只輸出關鍵欄位
logger.debug('stock', '股票資料', { 
  symbol: stock.symbol, 
  price: stock.price 
});
```

## 🔧 開發時調整 Log 等級

### 方法 1：在瀏覽器 Console 中調整
```javascript
// 開啟股息模組的詳細 log
window.setLogLevel('dividend', 3); // DEBUG

// 開啟所有模組的超詳細 log
window.setLogLevel('global', 4); // TRACE

// 關閉 API 模組的 log（只顯示錯誤）
window.setLogLevel('api', 0); // ERROR
```

### 方法 2：修改 logger.ts 設定
```typescript
// src/utils/logger.ts
const LOG_CONFIG: Record<LogModule, number> = {
  global: LogLevel.INFO,
  dividend: LogLevel.DEBUG,  // 臨時開啟詳細 log
  stock: LogLevel.INFO,
  // ...
};
```

### 方法 3：註解掉詳細日誌（推薦用於高頻操作）
```typescript
// ✅ 正確：對於高頻操作（如批量處理），直接註解掉詳細日誌
export async function processItems(items: Item[]) {
  // console.log(`開始處理 ${items.length} 個項目...`); // 註解掉
  
  for (const item of items) {
    // console.log(`處理項目: ${item.id}`); // 註解掉
    await processItem(item);
  }
  
  // console.log(`處理完成`); // 註解掉
  return items;
}

// 需要調試時，取消註解即可
```

## 🚨 特殊情況處理

### 1. 瀏覽器 Fetch API 的 404 錯誤
```typescript
// ❌ 問題：瀏覽器會自動顯示 fetch 404 錯誤（無法完全消除）
const response = await fetch(`/api/data/${id}`);
// 瀏覽器 Network 面板會顯示紅色 404

// ✅ 解決方案 1：移除我們的警告日誌（只保留瀏覽器的）
if (!response.ok) {
  // 404 是正常情況（資料不存在），不需要警告
  if (response.status !== 404) {
    console.warn(`API 錯誤: ${response.status}`);
  }
  return null;
}

// ✅ 解決方案 2：後端返回 200 + 空資料（更好）
// 後端改為：res.status(200).json({ data: [] })
// 而不是：res.status(404).json({ error: 'Not found' })
```

### 2. React StrictMode 重複執行問題
```typescript
// ❌ 問題：React 18 StrictMode 會雙重執行 useEffect
useEffect(() => {
  console.log('載入資料...'); // 會執行 2 次
  loadData();
}, []);

// ✅ 解決方案：註解掉高頻日誌，只保留錯誤日誌
useEffect(() => {
  // console.log('載入資料...'); // 註解掉
  loadData().catch(error => {
    console.error('載入失敗:', error); // 保留錯誤日誌
  });
}, []);
```

### 3. 批量操作的日誌優化
```typescript
// ❌ 錯誤：每個項目都輸出日誌
for (const stock of stocks) {
  console.log(`處理 ${stock.symbol}...`); // 11 支股票 = 11 條日誌
  await processStock(stock);
  console.log(`${stock.symbol} 完成`); // 又 11 條日誌
}

// ✅ 正確：只輸出摘要
// console.log(`開始處理 ${stocks.length} 支股票...`); // 註解掉
let successCount = 0;
for (const stock of stocks) {
  // console.log(`處理 ${stock.symbol}...`); // 註解掉
  await processStock(stock);
  successCount++;
}
// console.log(`處理完成: ${successCount}/${stocks.length}`); // 註解掉
```

## 📊 Log 輸出格式

### 標準格式
```
[圖示] [模組] 訊息 資料
```

### 範例
```
✅ [dividend] 2330 除權息更新完成 {"records":4,"stockDiv":10}
🔍 [stock] 開始更新 2330 股價和除權息
❌ [api] 2330 API 調用失敗 "Network timeout"
⚠️ [cloud] Token 即將過期 {"expiresIn":3600}
ℹ️ [import] 匯入完成 {"accounts":5,"stocks":20}
```

## 💡 最佳實踐

### 1. 選擇合適的 Log 等級
- **ERROR**: 錯誤、異常、失敗
- **WARN**: 警告、潛在問題、降級處理
- **INFO**: 重要操作、狀態變更、完成訊息
- **DEBUG**: 詳細流程、中間結果、計算過程
- **TRACE**: 超詳細資料、完整物件、每個步驟

### 2. 資料格式化原則
- 物件超過 5 個欄位時自動截斷
- 只顯示關鍵欄位，避免過長
- 數字保留適當精度
- 日期使用易讀格式

### 3. 模組劃分原則
- 按功能領域劃分模組
- 相關功能使用相同模組名稱
- 避免過度細分模組

### 4. 開發流程建議
```
開發新功能 → 使用 DEBUG/TRACE 等級
↓
功能穩定 → 改為 INFO 等級
↓
上線前 → 檢查 log 輸出量
↓
遇到問題 → 臨時開啟 DEBUG 等級
```

## 🎯 效果目標

### 用戶體驗
- **平常開發**：Console 簡潔清爽，只看到重要訊息
- **遇到問題**：一行指令開啟詳細 log，快速定位問題
- **與 Kiro 協作**：複製 log 給 Kiro 時內容少，不觸發 summarize

### 技術指標
- **預設 log 數量**：減少 80% 以上
- **調試效率**：需要時可立即開啟詳細 log
- **可維護性**：統一管理，易於調整

## 📋 實作檢查清單

### 新增功能時必須確認
- [ ] 是否使用 logger 而非 console.log？
- [ ] 是否選擇了合適的 log 等級？
- [ ] 是否選擇了正確的模組名稱？
- [ ] 資料輸出是否簡潔？
- [ ] 是否避免了重複的 log？

### Code Review 檢查項目
- [ ] 沒有直接使用 console.log
- [ ] Log 等級使用合理
- [ ] 預設輸出量適中
- [ ] 關鍵操作有 log 記錄
- [ ] 錯誤處理有 error log

## ✅ 已完成的檔案

以下檔案已經完成 logger 系統整合：
- ✅ `src/stores/appStore.ts` - 狀態管理
- ✅ `src/components/StockRow.tsx` - 股票列表行
- ✅ `src/components/Header.tsx` - 頁面標題
- ✅ `src/components/StockList.tsx` - 股票列表
- ✅ `src/services/dividendApiService.ts` - 股息 API 服務

---

**記住：Console log 是開發工具，不是展示工具！預設簡潔，需要時詳細！**


## ✅ 已完成的檔案

以下檔案已經完成 logger 系統整合或日誌優化：
- ✅ `src/stores/appStore.ts` - 狀態管理
- ✅ `src/components/StockRow.tsx` - 股票列表行
- ✅ `src/components/Header.tsx` - 頁面標題
- ✅ `src/components/StockList.tsx` - 股票列表
- ✅ `src/services/dividendApiService.ts` - 股息 API 服務
- ✅ `src/services/dividendAutoService.ts` - 股息自動計算（v1.0.2.0117 優化）
- ✅ `src/App.tsx` - 主應用程式（v1.0.2.0117 優化）

### v1.0.2.0117 優化記錄
**優化內容**：
- 註解掉股息自動載入的詳細日誌（從 INFO → DEBUG）
- 移除 404 錯誤的警告日誌（404 是正常情況）
- 減少 Console 輸出量 80-95%

**優化檔案**：
- `dividendAutoService.ts`: 註解掉 `calculateHistoricalDividends` 和 `autoUpdateDividends` 的詳細日誌
- `App.tsx`: 註解掉 `loadDividendsForExistingStocks` 的進度日誌

**效果**：
- 修改前：每支股票 4-6 條日誌 × 11 支股票 × 4-6 次重複 = 176-396 條日誌
- 修改後：只保留錯誤日誌 = 0-5 條日誌（正常情況）
- 減少：80-95% 的日誌輸出

**剩餘的 Console 輸出**：
- React DevTools 提示（開發環境標準）
- Logger 系統提示（一次性）
- Fetch API 404 錯誤（瀏覽器行為，無法完全消除）
- 真正的錯誤日誌（必須保留）

---

**記住：Console log 是開發工具，不是展示工具！預設簡潔，需要時詳細！**
