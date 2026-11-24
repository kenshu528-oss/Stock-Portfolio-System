# 雙 API 策略實作檢查清單

## 📋 總覽

**目標**：整合證交所 OpenAPI 與 FinMind，建立最佳資料來源組合  
**預計時程**：7-9 天  
**當前狀態**：✅ 規劃完成，準備實作  
**版本**：v1.0.2.0129

---

## 階段 1：研究與測試（1-2 天）

### 任務清單

#### 1.1 研究證交所 OpenAPI 文檔
- [ ] 訪問 https://openapi.twse.com.tw/
- [ ] 閱讀 Swagger 文檔
- [ ] 記錄可用的 API 端點
- [ ] 確認 API 限制和配額
- [ ] 記錄認證方式（如需要）

**產出**：`docs/TWSE_OpenAPI_Research.md`

#### 1.2 測試股價查詢端點
- [ ] 測試端點：`/v1/exchangeReport/STOCK_DAY`
- [ ] 測試參數：date, stockNo
- [ ] 記錄回應格式
- [ ] 測試錯誤情況（無效代碼、日期）
- [ ] 測試回應時間

**測試命令**：
```bash
curl "https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY?date=20240115&stockNo=2330"
```

**產出**：`docs/TWSE_StockPrice_Test_Report.md`

#### 1.3 測試除權息查詢端點
- [ ] 測試端點：`/v1/exchangeReport/TWT48`
- [ ] 測試參數：date, stockNo
- [ ] 記錄回應格式
- [ ] 對比 FinMind 資料格式
- [ ] 確認資料完整性

**測試命令**：
```bash
curl "https://openapi.twse.com.tw/v1/exchangeReport/TWT48?date=20240101&stockNo=2330"
```

**產出**：`docs/TWSE_Dividend_Test_Report.md`

#### 1.4 資料格式對應表
- [ ] 股價欄位對應
- [ ] 除權息欄位對應
- [ ] 日期格式轉換規則
- [ ] 特殊情況處理

**產出**：`docs/Data_Format_Mapping.md`

#### 1.5 錯誤處理策略
- [ ] HTTP 錯誤處理
- [ ] 資料格式錯誤處理
- [ ] 超時處理
- [ ] 降級策略

**產出**：`docs/Error_Handling_Strategy.md`

---

## 階段 2：服務實作（2-3 天）

### 任務清單

#### 2.1 創建後端服務
- [ ] 創建 `backend/services/twseOpenApiService.js`
- [ ] 實作股價查詢函數
- [ ] 實作除權息查詢函數
- [ ] 實作資料格式轉換
- [ ] 實作錯誤處理

**檔案結構**：
```
backend/services/
├── twseOpenApiService.js    (新增)
├── finmindService.js         (現有)
├── goodInfoService.js        (現有)
└── yahooFinanceService.js    (現有)
```

#### 2.2 創建前端服務
- [ ] 創建 `src/services/twseOpenApiService.ts`
- [ ] 定義 TypeScript 介面
- [ ] 實作 API 調用邏輯
- [ ] 實作快取機制

**檔案結構**：
```
src/services/
├── twseOpenApiService.ts     (新增)
├── dividendApiService.ts     (現有)
└── stockEnhancementService.ts (現有)
```

#### 2.3 實作資料格式轉換
- [ ] 股價格式轉換函數
- [ ] 除權息格式轉換函數
- [ ] 日期格式轉換函數
- [ ] 錯誤格式統一

**範例**：
```typescript
function convertTWSEStockPrice(twseData: any): StockPrice {
  return {
    symbol: twseData.data[0][0],
    name: twseData.data[0][1],
    price: parseFloat(twseData.data[0][2]),
    source: 'TWSE OpenAPI'
  };
}
```

#### 2.4 實作錯誤處理和重試
- [ ] HTTP 錯誤處理
- [ ] 超時處理（10 秒）
- [ ] 重試機制（最多 2 次）
- [ ] 降級邏輯

#### 2.5 添加單元測試
- [ ] 測試股價查詢
- [ ] 測試除權息查詢
- [ ] 測試錯誤處理
- [ ] 測試資料轉換

**測試檔案**：
```
tests/
├── twseOpenApiService.test.js
└── twseOpenApiService.test.ts
```

---

## 階段 3：整合與優化（2-3 天）

### 任務清單

#### 3.1 更新後端 API 路由
- [ ] 修改 `backend/server.js`
- [ ] 整合證交所 API 到股價查詢
- [ ] 整合證交所 API 到除權息查詢
- [ ] 實作智能降級機制

**修改位置**：
```javascript
// backend/server.js
app.get('/api/stock/:symbol', async (req, res) => {
  // 1. 優先證交所 OpenAPI
  // 2. 降級到 FinMind
  // 3. 最後 Yahoo Finance
});
```

#### 3.2 更新前端 API 調用
- [ ] 修改 `src/services/dividendApiService.ts`
- [ ] 更新 API 調用順序
- [ ] 添加 API 來源標記
- [ ] 更新錯誤處理

#### 3.3 實作性能監控
- [ ] API 成功率統計
- [ ] 回應時間記錄
- [ ] 每日報告生成
- [ ] 監控儀表板（可選）

**監控代碼**：
```typescript
const apiStats = {
  twse: { success: 0, fail: 0, avgTime: 0 },
  finmind: { success: 0, fail: 0, avgTime: 0 },
  yahoo: { success: 0, fail: 0, avgTime: 0 }
};
```

#### 3.4 優化快取策略
- [ ] 股價快取：1 分鐘
- [ ] 除權息快取：24 小時
- [ ] 股票資訊快取：7 天
- [ ] 快取清理機制

#### 3.5 完整測試
- [ ] 單元測試
- [ ] 整合測試
- [ ] 端對端測試
- [ ] 性能測試
- [ ] 錯誤情況測試

**測試案例**：
- 正常股票（2330）
- ETF（0050）
- 債券 ETF（00679B）
- 無效代碼
- API 失敗情況

---

## 階段 4：文檔與部署（1 天）

### 任務清單

#### 4.1 更新 API 使用文檔
- [ ] 更新 `README.md`
- [ ] 更新 API 端點說明
- [ ] 添加使用範例
- [ ] 更新錯誤處理說明

#### 4.2 更新 STEERING 規則
- [ ] 確認 `dual-api-strategy.md` 完整
- [ ] 更新相關規則連結
- [ ] 添加最佳實踐範例

#### 4.3 創建遷移指南
- [ ] 舊版本到新版本的遷移步驟
- [ ] 相容性說明
- [ ] 回滾方案

**產出**：`docs/Migration_Guide.md`

#### 4.4 部署到生產環境
- [ ] 備份當前版本
- [ ] 部署新版本
- [ ] 驗證功能正常
- [ ] 監控 API 成功率

#### 4.5 監控 API 成功率
- [ ] 設定監控告警
- [ ] 每日檢查報告
- [ ] 記錄問題和解決方案

---

## 成功標準

### 必須達成
- ✅ 股價查詢成功率 > 99%
- ✅ 除權息查詢成功率 > 95%
- ✅ 平均回應時間 < 2 秒
- ✅ 證交所 API 使用率 > 80%（股價）
- ✅ 所有單元測試通過
- ✅ 無破壞性變更

### 期望達成
- 🎯 股價查詢成功率 > 99.5%
- 🎯 除權息查詢成功率 > 98%
- 🎯 平均回應時間 < 1 秒
- 🎯 完整的監控儀表板

---

## 風險與應對

### 風險 1：證交所 API 不穩定
**機率**：中  
**影響**：高  
**應對**：
- ✅ 保留 FinMind 作為備援
- ✅ 實作自動降級機制
- ✅ 監控 API 成功率

### 風險 2：資料格式變更
**機率**：低  
**影響**：高  
**應對**：
- ✅ 版本化 API 端點
- ✅ 資料格式驗證
- ✅ 錯誤日誌記錄

### 風險 3：整合工作量超出預期
**機率**：中  
**影響**：中  
**應對**：
- ✅ 分階段實作
- ✅ 保持現有功能運作
- ✅ 可隨時回滾

---

## 進度追蹤

| 階段 | 預計時間 | 實際時間 | 狀態 | 完成度 |
|------|---------|---------|------|--------|
| 階段 1：研究與測試 | 1-2 天 | - | ⏳ 待開始 | 0% |
| 階段 2：服務實作 | 2-3 天 | - | ⏳ 待開始 | 0% |
| 階段 3：整合與優化 | 2-3 天 | - | ⏳ 待開始 | 0% |
| 階段 4：文檔與部署 | 1 天 | - | ⏳ 待開始 | 0% |
| **總計** | **7-9 天** | **-** | **⏳ 待開始** | **0%** |

---

## 相關文件

- ✅ [雙 API 策略規範](.kiro/steering/dual-api-strategy.md)
- ✅ [OpenAPI 評估報告](OPENAPI_EVALUATION.md)
- ⏳ [證交所 API 研究報告](docs/TWSE_OpenAPI_Research.md) - 待創建
- ⏳ [資料格式對應表](docs/Data_Format_Mapping.md) - 待創建
- ⏳ [遷移指南](docs/Migration_Guide.md) - 待創建

---

**創建日期**：2026-01-14  
**版本**：v1.0.2.0129  
**負責人**：開發團隊  
**預計完成**：2026-01-21
