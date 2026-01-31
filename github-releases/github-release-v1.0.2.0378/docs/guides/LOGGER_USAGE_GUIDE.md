# Logger 系統使用指南

## 🎯 快速開始

### 1. 基本使用
```typescript
import { logger } from './utils/logger';

// 一般訊息（預設會顯示）
logger.info('stock', '股價更新完成', { count: 10 });

// 成功訊息
logger.success('import', '匯入完成', { accounts: 5 });

// 警告訊息
logger.warn('api', 'API 回應慢', { time: 5000 });

// 錯誤訊息（總是顯示）
logger.error('dividend', '更新失敗', error);
```

### 2. 調試時開啟詳細 Log

在瀏覽器 Console 中輸入：

```javascript
// 開啟股息模組的詳細 log
window.setLogLevel('dividend', 3);

// 開啟所有模組的超詳細 log
window.setLogLevel('global', 4);

// 查看可用的 log 等級
window.LogLevel
// {ERROR: 0, WARN: 1, INFO: 2, DEBUG: 3, TRACE: 4}
```

## 📊 Log 等級說明

| 等級 | 數值 | 用途 | 預設顯示 |
|------|------|------|----------|
| ERROR | 0 | 錯誤、異常 | ✅ 總是顯示 |
| WARN | 1 | 警告、潛在問題 | ✅ 顯示 |
| INFO | 2 | 重要操作、狀態變更 | ✅ 顯示 |
| DEBUG | 3 | 詳細流程、計算過程 | ❌ 需手動開啟 |
| TRACE | 4 | 超詳細資料、完整物件 | ❌ 需手動開啟 |

## 🔧 常見使用場景

### 場景 1：調試配股計算問題
```javascript
// 在瀏覽器 Console 中
window.setLogLevel('dividend', 3);  // 開啟 DEBUG
window.setLogLevel('rights', 3);    // 開啟配股詳細 log

// 然後執行批量更新，就能看到詳細的計算過程
```

### 場景 2：調試 API 調用問題
```javascript
// 開啟 API 模組的詳細 log
window.setLogLevel('api', 3);

// 開啟股票模組的詳細 log
window.setLogLevel('stock', 3);
```

### 場景 3：調試雲端同步問題
```javascript
// 開啟雲端同步的詳細 log
window.setLogLevel('cloud', 3);
window.setLogLevel('import', 3);
```

### 場景 4：關閉所有 log（只看錯誤）
```javascript
// 設定為 ERROR 等級
window.setLogLevel('global', 0);
```

## 💡 開發建議

### 開發新功能時
1. 先使用 `logger.debug()` 輸出詳細資訊
2. 功能穩定後改為 `logger.info()` 只輸出關鍵訊息
3. 錯誤處理使用 `logger.error()`

### 遇到問題時
1. 在 Console 中開啟相關模組的 DEBUG 等級
2. 重現問題，觀察詳細 log
3. 問題解決後關閉 DEBUG 等級

### 與 Kiro 協作時
1. 預設 log 輸出少，複製給 Kiro 不會太長
2. 需要詳細資訊時，開啟 DEBUG 再複製
3. 可以只複製關鍵的錯誤訊息

## 📋 可用模組列表

- `global` - 全域通用
- `dividend` - 股息相關
- `stock` - 股票相關
- `api` - API 調用
- `cloud` - 雲端同步
- `import` - 匯入功能
- `export` - 匯出功能
- `rights` - 配股處理

## 🎯 效果對比

### 之前（使用 console.log）
```
🔍 AppStore: 更新 2330 的除權息資料
✅ AppStore: 獲取到 4 筆除權息資料
📊 AppStore: 發現 4 筆新的除權息資料，合併到現有記錄
📈 2330 除權息: 現金 2.5/股, 配股 0 股, 新持股 1000
📈 2330 除權息: 現金 3.0/股, 配股 0 股, 新持股 1000
📈 2330 除權息: 現金 2.75/股, 配股 0 股, 新持股 1000
📈 2330 除權息: 現金 3.5/股, 配股 0 股, 新持股 1000
✅ AppStore: 2330 除權息資料更新完成，總記錄: 4，配股總數: 0，新持股: 1000，調整後成本價: 488.25
... (還有更多)
```

### 現在（使用 logger，預設 INFO 等級）
```
ℹ️ [dividend] 2330 獲取到 4 筆除權息資料
✅ [dividend] 2330 除權息更新完成 {"records":4,"stockDiv":0,"newShares":1000,"adjustedCost":"488.25"}
```

**Log 數量減少 80% 以上！** 🎉

需要詳細資訊時：
```javascript
window.setLogLevel('dividend', 3);  // 開啟 DEBUG
```

就能看到完整的計算過程！
