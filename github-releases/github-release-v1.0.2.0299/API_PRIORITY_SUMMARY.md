# API 優先順序調整總結

## 🎯 目標：Yahoo Finance 優先，FinMind 備用

### ✅ 已完成的修改

#### 後端 (backend/server.js)
1. **股票搜尋 API** (`/api/stock-search`)
   - ✅ Yahoo Finance 優先獲取股價
   - ✅ FinMind 備用獲取中文名稱
   - ✅ 移除本地股票數據庫
   - ✅ 優雅處理 FinMind 402 錯誤

2. **股票價格 API** (`/api/stock/:symbol`)
   - ✅ Yahoo Finance 優先
   - ✅ FinMind 備用
   - ✅ 智能後綴判斷 (.TW/.TWO)

3. **股息資料 API** (`/api/dividend/:symbol`)
   - ✅ 債券 ETF：Yahoo Finance 優先
   - ✅ 一般股票：Yahoo Finance 優先，FinMind 備用

#### 前端服務層
1. **DividendApiService** (`src/services/dividendApiService.ts`)
   - ✅ 遵循 Yahoo Finance 優先策略
   - ✅ 債券 ETF 特殊處理
   - ✅ 優雅處理 FinMind 402 錯誤

2. **StockDataMerger** (`src/services/stockDataMerger.ts`)
   - ✅ Yahoo Finance 股價 + FinMind 中文名稱混合策略
   - ✅ 預設使用 YAHOO_FINMIND 策略

3. **UnifiedStockPriceService** (`src/services/unifiedStockPriceService.ts`)
   - ✅ 預設策略：DataSourcePriority.YAHOO_FINMIND
   - ✅ 統一使用 StockDataMerger

#### 前端組件層
1. **StockSearch.tsx**
   - ✅ searchStocksDirectly：Yahoo Finance 優先
   - ✅ getStockPriceDirectly：Yahoo Finance 優先
   - ✅ 優雅處理 FinMind 402 錯誤

2. **QuickAddStock.tsx**
   - ✅ searchStocksDirectly：Yahoo Finance 優先
   - ✅ getStockPriceDirectly：Yahoo Finance 優先
   - ✅ 優雅處理 FinMind 402 錯誤

3. **AddStockForm.tsx**
   - ✅ 使用 stockService.searchStock（已遵循正確規則）

4. **AppStore** (`src/stores/appStore.ts`)
   - ✅ updateAllStockPrices：通過後端 API（已遵循正確規則）
   - ✅ updateStockDividendData：使用 RightsEventService（已遵循正確規則）

### 🔧 API 優先順序策略

#### 股票搜尋和股價
```
1. Yahoo Finance API（首選）- 即時股價，穩定性佳
   ↓ 失敗
2. FinMind API（備用）- 台股專用，中文名稱
   ↓ 失敗  
3. 返回 null（不提供虛假資料）
```

#### 股息資料
```
債券 ETF（如 00679B、00687B）：
1. Yahoo Finance API（首選）- 配息資料最完整
   ↓ 失敗
2. FinMind API（備用）- 部分資料可能不完整

一般股票（如 2330、2886）：
1. Yahoo Finance API（首選）- 穩定性佳
   ↓ 失敗
2. FinMind API（備用）- 台股專用
```

### 🛡️ 錯誤處理

#### FinMind 402 錯誤
- ✅ 優雅處理，記錄日誌但不影響功能
- ✅ 自動跳過，不顯示錯誤給用戶
- ✅ 使用 Yahoo Finance 作為主要來源

#### 404 錯誤
- ✅ 正常情況（資料不存在），不輸出警告
- ✅ 返回 null，不提供虛假資料

### 🎯 遵循的 STEERING 規則

#### api-standards.md ✅
- ✅ **只使用真實 API 資料**：禁止虛假或硬編碼資料
- ✅ **API 失敗返回 null**：不提供預設值或虛假資料
- ✅ **Yahoo Finance 優先**：免費且穩定的股價資料
- ✅ **FinMind 備用**：處理 402 錯誤，不影響主要功能

#### development-standards.md ✅
- ✅ **使用 logger 系統**：禁止直接使用 console.log
- ✅ **優雅錯誤處理**：每個 API 調用都有 try-catch
- ✅ **詳細日誌記錄**：記錄 API 嘗試結果和錯誤

### 📊 測試驗證

#### 後端測試
```bash
# 測試股票搜尋（Yahoo Finance 優先）
curl http://localhost:3001/api/stock-search?query=2330

# 測試股票價格（Yahoo Finance 優先）
curl http://localhost:3001/api/stock/2330

# 測試股息資料（Yahoo Finance 優先）
curl http://localhost:3001/api/dividend/00679B
```

#### 前端測試
- ✅ GitHub Pages 環境：直接使用前端 API 調用
- ✅ 本地開發環境：使用後端代理
- ✅ 股票搜尋：Yahoo Finance 優先，FinMind 備用
- ✅ 股價更新：通過後端 API（已遵循正確規則）

### 🎉 完成狀態

**前後端已完全遵循 Yahoo Finance 優先、FinMind 備用的 API 策略！**

- ✅ 後端：3 個 API 端點全部調整完成
- ✅ 前端服務層：4 個主要服務全部調整完成  
- ✅ 前端組件層：3 個搜尋組件全部調整完成
- ✅ 狀態管理：AppStore 使用正確的服務
- ✅ 錯誤處理：優雅處理 FinMind 402 錯誤
- ✅ 遵循規範：完全符合 api-standards.md 要求

**系統現在使用統一的 API 策略：Yahoo Finance 優先，FinMind 備用，無本地數據庫！** 🎯✨