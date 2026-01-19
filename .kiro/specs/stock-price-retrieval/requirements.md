# 股價獲取系統規格 (Stock Price Retrieval System)

## 簡介

本規格定義了台灣股票市場股價獲取的標準化方法，基於 v1.0.2.0197 成功修復的經驗，確保所有股票類型都能正確獲取即時股價。

## 詞彙表

- **Stock_Price_Service**: 股價獲取服務，負責從多個 API 來源獲取股價資料
- **Yahoo_Finance_API**: Yahoo Finance 股價 API，提供即時股價資料
- **FinMind_API**: FinMind 台股 API，提供中文股票名稱和歷史資料
- **Stock_Symbol_Suffix**: 股票代碼後綴，用於區分不同交易所（.TW 上市、.TWO 上櫃）
- **Listed_Stock**: 上市股票，代碼範圍 1000-2999，在台灣證券交易所交易
- **OTC_Stock**: 上櫃股票，代碼範圍 3000-8999，在櫃買中心交易
- **ETF**: 指數股票型基金，代碼格式 00XXX 或 00XXXB
- **Bond_ETF**: 債券 ETF，代碼格式 00XXXB，在櫃買中心交易

---

## 需求

### 需求 1: 智能股票代碼後綴判斷

**用戶故事**: 作為系統開發者，我希望系統能自動判斷股票代碼的正確後綴，以便正確調用 Yahoo Finance API 獲取股價。

#### 驗收標準

1. WHEN 系統接收到上市股票代碼（1000-2999）THEN Stock_Price_Service SHALL 優先使用 .TW 後綴，備用 .TWO 後綴
2. WHEN 系統接收到上櫃股票代碼（3000-8999）THEN Stock_Price_Service SHALL 優先使用 .TWO 後綴，備用 .TW 後綴
3. WHEN 系統接收到債券 ETF 代碼（00XXXB 格式）THEN Stock_Price_Service SHALL 優先使用 .TWO 後綴，備用 .TW 後綴
4. WHEN 系統接收到一般 ETF 代碼（00XXX 格式）THEN Stock_Price_Service SHALL 優先使用 .TWO 後綴，備用 .TW 後綴
5. WHEN 後綴判斷完成 THEN Stock_Price_Service SHALL 記錄判斷邏輯和嘗試順序到日誌

### 需求 2: 多重 API 備援機制

**用戶故事**: 作為系統用戶，我希望股價獲取功能穩定可靠，即使某個 API 失敗也能從其他來源獲取資料。

#### 驗收標準

1. WHEN 獲取股價時 THEN Stock_Price_Service SHALL 按順序嘗試 Yahoo_Finance_API、FinMind_API、證交所 API
2. WHEN Yahoo_Finance_API 成功獲取股價 THEN Stock_Price_Service SHALL 同時嘗試從 FinMind_API 獲取中文名稱
3. WHEN 主要 API 失敗 THEN Stock_Price_Service SHALL 自動切換到下一個備用 API
4. WHEN 所有 API 都失敗 THEN Stock_Price_Service SHALL 返回 null 並記錄錯誤
5. WHEN 使用混合資料來源 THEN Stock_Price_Service SHALL 標記資料來源為 "Yahoo+FinMind"

### 需求 3: 股價資料完整性

**用戶故事**: 作為投資者，我希望獲取的股價資料包含完整的資訊，包括股價、漲跌幅、中文名稱等。

#### 驗收標準

1. WHEN 成功獲取股價 THEN Stock_Price_Service SHALL 返回包含 symbol、name、price、change、changePercent、timestamp、source、market 的完整資料
2. WHEN 股價為零或無效 THEN Stock_Price_Service SHALL 拒絕該資料並嘗試下一個 API
3. WHEN 獲取中文名稱 THEN Stock_Price_Service SHALL 優先使用 FinMind_API 提供的中文名稱
4. WHEN 無法獲取中文名稱 THEN Stock_Price_Service SHALL 使用 Yahoo_Finance_API 提供的英文名稱
5. WHEN 資料獲取完成 THEN Stock_Price_Service SHALL 標記正確的市場類型（上市、上櫃、ETF）

### 需求 4: 錯誤處理和用戶反饋

**用戶故事**: 作為系統用戶，我希望當股價獲取失敗時能收到清楚的錯誤訊息和建議。

#### 驗收標準

1. WHEN 股票代碼無效 THEN Stock_Price_Service SHALL 返回 404 錯誤和友好的錯誤訊息
2. WHEN API 超時 THEN Stock_Price_Service SHALL 記錄超時錯誤並嘗試下一個 API
3. WHEN 網路連線失敗 THEN Stock_Price_Service SHALL 提供重試建議
4. WHEN 所有 API 都無法獲取資料 THEN Stock_Price_Service SHALL 提供檢查股票代碼的建議
5. WHEN 發生錯誤 THEN Stock_Price_Service SHALL 記錄詳細的錯誤日誌供調試使用

### 需求 5: 前後端一致性

**用戶故事**: 作為系統開發者，我希望前端和後端使用相同的股價獲取邏輯，確保行為一致。

#### 驗收標準

1. WHEN 前端直接獲取股價時 THEN 前端服務 SHALL 使用與後端相同的後綴判斷邏輯
2. WHEN 前端使用 CORS 代理時 THEN 前端服務 SHALL 按相同順序嘗試多個代理服務
3. WHEN 前端 API 失敗時 THEN 前端服務 SHALL 自動降級到 FinMind_API
4. WHEN 前端獲取成功時 THEN 前端服務 SHALL 記錄與後端相同格式的日誌
5. WHEN 前端和後端都實作時 THEN 兩者 SHALL 產生相同的股價資料格式

### 需求 6: 效能和快取優化

**用戶故事**: 作為系統用戶，我希望股價獲取速度快且不會對 API 造成過度負載。

#### 驗收標準

1. WHEN 獲取股價時 THEN Stock_Price_Service SHALL 實作 5 秒快取機制避免重複請求
2. WHEN 批量更新股價時 THEN Stock_Price_Service SHALL 限制並發請求數量為 5 個
3. WHEN API 請求完成時 THEN Stock_Price_Service SHALL 在請求間等待 300ms 避免限流
4. WHEN 單一股票請求時 THEN Stock_Price_Service SHALL 在 10 秒內完成或超時
5. WHEN 快取過期時 THEN Stock_Price_Service SHALL 自動清理過期的快取資料

---

## 技術規範

### 股票代碼分類邏輯
```typescript
function getStockSuffixes(symbol: string): string[] {
  const code = parseInt(symbol.substring(0, 4));
  const isBondETF = /^00\d{2,3}B$/i.test(symbol);
  
  if (isBondETF) {
    return ['.TWO', '.TW']; // 債券 ETF 優先櫃買中心
  } else if (code >= 3000 && code <= 8999) {
    return ['.TWO', '.TW']; // 上櫃股票優先櫃買中心
  } else {
    return ['.TW', '.TWO']; // 上市股票優先證交所
  }
}
```

### API 優先順序
1. **Yahoo Finance API** (主要) - 即時股價
2. **FinMind API** (輔助) - 中文名稱 + 備用股價
3. **證交所 API** (最後備用) - 官方資料

### 資料格式標準
```typescript
interface StockPrice {
  symbol: string;        // 股票代碼
  name: string;          // 中文名稱
  price: number;         // 股價
  change: number;        // 漲跌金額
  changePercent: number; // 漲跌百分比
  timestamp: string;     // 時間戳記
  source: string;        // 資料來源
  market: string;        // 市場類型
}
```

---

## 驗證測試案例

### 測試案例 1: 上市股票
- **輸入**: 2330 (台積電)
- **預期**: 使用 2330.TW 獲取股價，顯示中文名稱「台積電」

### 測試案例 2: 上櫃股票  
- **輸入**: 6188 (廣明)
- **預期**: 使用 6188.TWO 獲取股價，顯示中文名稱「廣明」

### 測試案例 3: 債券 ETF
- **輸入**: 00679B (元大美債20年)
- **預期**: 使用 00679B.TWO 獲取股價，顯示中文名稱

### 測試案例 4: 一般 ETF
- **輸入**: 0050 (元大台灣50)
- **預期**: 使用 0050.TWO 獲取股價，顯示中文名稱

### 測試案例 5: 無效代碼
- **輸入**: 9999
- **預期**: 返回 404 錯誤和友好提示訊息

---

## 實作檢查清單

### 後端實作
- [ ] 實作智能後綴判斷邏輯
- [ ] 實作多重 API 備援機制  
- [ ] 實作混合資料來源策略
- [ ] 實作錯誤處理和日誌記錄
- [ ] 實作快取和效能優化

### 前端實作
- [ ] 同步後綴判斷邏輯
- [ ] 實作 CORS 代理備援
- [ ] 實作相同的錯誤處理
- [ ] 統一資料格式和日誌
- [ ] 測試前後端一致性

### 測試驗證
- [ ] 測試所有股票類型
- [ ] 測試 API 失敗情況
- [ ] 測試效能和快取
- [ ] 測試錯誤處理
- [ ] 驗證前後端一致性

---

**重要**: 此規格基於 v1.0.2.0197 的成功修復經驗制定，所有未來的股價獲取功能都必須遵循此規範！