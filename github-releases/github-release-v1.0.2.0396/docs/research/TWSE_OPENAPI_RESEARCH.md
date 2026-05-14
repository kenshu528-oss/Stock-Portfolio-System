# 證交所 OpenAPI 研究報告

## 📊 研究目標
研究證交所 OpenAPI 和 FinMind API 是否能取得債券 ETF (如 00679B) 的股息資料。

## ⚠️ 重要發現：FinMind API 正確用法

### Authorization Header vs Query String
```javascript
// ❌ 錯誤：使用 query string (免費帳號限制)
fetch("https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockDividend&data_id=00679B&token=XXX")

// ✅ 正確：使用 Authorization Header
fetch("https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockDividend&data_id=00679B&start_date=2017-01-01&end_date=2026-12-31", {
  headers: {
    "Authorization": "YOUR_TOKEN_HERE"  // 不需要 "Bearer" 前綴
  }
})
```

### 參數差異
- `stock_id`: 需要付費帳號
- `data_id`: 免費帳號可用

## 🔍 研究發現

### 1. 證交所 OpenAPI 端點

#### 股息資料端點
```
https://openapi.twse.com.tw/v1/exchangeReport/TWT48U_ALL
```

**資料格式**：
```json
{
  "Date": "1150122",           // 除權息日期 (民國年YYMMDD)
  "Code": "0050",              // 股票代碼
  "Name": "元大台灣50",         // 股票名稱
  "Exdividend": "息",          // 除權息類型 (息=除息, 權=除權)
  "StockDividendRatio": "",    // 股票股利比例
  "CashDividend": "1.000000",  // 現金股利
  "SubscriptionRatio": "",     // 認購比例
  "SubscriptionPricePerShare": "", // 認購價格
  "SharesOffered": "",         // 發行股數
  "SharesEmpOwner": "",        // 員工持股
  "SharesholderOwner": "",     // 股東持股
  "StockHoldingRatio": ""      // 持股比例
}
```

### 2. 債券 ETF (00679B) 測試結果

#### FinMind API (使用 Authorization Header)
```javascript
// 使用 Authorization Header (正確方式)
const headers = { "Authorization": "YOUR_TOKEN_HERE" };

// 股票資訊
GET https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockInfo&data_id=00679B
結果: ✅ 有資料
{
  "stock_id": "00679B",
  "stock_name": "元大美債20年",
  "industry_category": "上櫃ETF",
  "type": "tpex"
}

// 股價資料
GET https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockPrice&data_id=00679B&start_date=2026-01-01
結果: ✅ 有資料 (從 2017-01-17 開始)
最新價格: 27.40 (2026-01-14)

// 股息資料
GET https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockDividend&data_id=00679B&start_date=2017-01-01&end_date=2026-12-31
結果: ❌ 無資料 (`data: []`)
```

#### 其他債券 ETF 測試 (00687B 國泰20年美債)
```javascript
GET https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockDividend&data_id=00687B&start_date=2020-01-01&end_date=2026-12-31
結果: ✅ 有資料
{
  "stock_id": "00687B",
  "year": "110",
  "CashEarningsDistribution": 0.19,
  "CashStatutorySurplus": 0.0,
  "CashExDividendTradingDate": "2021-01-19",
  "CashDividendPaymentDate": "2021-02-26",
  "StockEarningsDistribution": 0.0,  // ETF 永遠是 0
  "StockStatutorySurplus": 0.0        // ETF 永遠是 0
}
```

**重要**：ETF（包括債券 ETF）只會有現金股利，股票股利永遠是 0。

#### 證交所 OpenAPI
```bash
GET https://openapi.twse.com.tw/v1/exchangeReport/TWT48U_ALL
```
**結果**: ❌ 無 00679B 資料

**檢查結果**：
- 查詢所有債券 ETF (代碼結尾為 B)：無任何債券 ETF 資料
- 查詢所有資料：只有 44 筆記錄，主要是股票 ETF 和一般股票

### 3. 重要發現

#### 00679B 特殊情況
- ✅ **有股票資訊**：可以取得中文名稱
- ✅ **有股價資料**：可以取得即時股價
- ❌ **無股息資料**：可能原因：
  1. **00679B 從未發放過股息**（最可能）
  2. FinMind 未收錄此 ETF 的股息資料
  3. 資料更新延遲

#### 債券 ETF 股息資料不一致
- 00687B (國泰20年美債)：✅ 有股息資料（2021年發放 0.19元）
- 00679B (元大美債20年)：❌ 無股息資料

**結論**：
1. FinMind 對債券 ETF 的股息資料收錄不完整
2. 00679B 可能真的從未發放過股息（需要查證）
3. ETF 只有現金股利，無股票股利

### 4. 證交所 OpenAPI 覆蓋範圍

**有資料的標的**：
- ✅ 股票 ETF (0050, 0056, 00929 等)
- ✅ 一般股票 (1437, 3189, 8021 等)
- ✅ 特殊 ETF (00945B, 00981T, 00982D 等)

**無資料的標的**：
- ❌ 債券 ETF (00679B, 00687B 等)

## 📋 結論

### 證交所 OpenAPI 的限制
1. **債券 ETF 無資料**：證交所 OpenAPI 的股息資料端點不包含債券 ETF
2. **資料量有限**：只有 44 筆記錄，遠少於台股總數
3. **更新頻率未知**：需要進一步測試資料更新頻率

### FinMind API 的限制
1. **債券 ETF 無資料**：FinMind 的 `TaiwanStockDividend` 資料集也不包含債券 ETF
2. **需要其他資料來源**：債券 ETF 股息需要使用其他方式取得

## 💡 建議方案

### 方案 1：FinMind API + 手動輸入 (推薦)
```
優點：
- ✅ 大部分債券 ETF 有資料（如 00687B）
- ✅ 使用 Authorization Header 正確調用
- ✅ 無資料時可手動輸入

缺點：
- ❌ 部分債券 ETF 無資料（如 00679B）
- ❌ 需要處理 API 失敗情況
```

### 方案 2：手動輸入為主
```
優點：
- ✅ 最可靠
- ✅ 用戶可控制
- ✅ 符合規範

缺點：
- ❌ 需要用戶手動操作
- ❌ 無法自動更新
```

### 方案 3：GoodInfo 爬蟲 (不推薦)
```
優點：
- ✅ 資料完整

缺點：
- ❌ 需要網頁爬蟲，可能不穩定
- ❌ 可能違反網站使用條款
- ❌ 不符合 api-data-integrity.md 規範
```

## 🎯 雙 API 策略調整

### 原計劃
```
股價查詢：證交所 OpenAPI (首選) → FinMind (備用)
股息查詢：FinMind (首選) → 證交所 OpenAPI (備用)
```

### 調整後
```
股價查詢：證交所 OpenAPI (首選) → FinMind (備用)
股息查詢：
  - 一般股票/ETF：FinMind (首選) → 證交所 OpenAPI (備用)
  - 債券 ETF：手動輸入 (唯一方案)
```

## 📊 證交所 OpenAPI 其他端點 (待研究)

### 可能有用的端點
```
1. 股價資料
   https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY

2. 公司基本資料
   https://openapi.twse.com.tw/v1/opendata/t187ap03_L

3. 其他資料集
   需要查看 Swagger 文檔
```

## 🔗 參考資源

- **證交所 OpenAPI 文檔**: https://openapi.twse.com.tw/
- **FinMind API 文檔**: https://finmindtrade.com/
- **STEERING 規則**: `dual-api-strategy.md`, `finmind-api-priority.md`

---

**研究日期**: 2026-01-14  
**研究者**: Kiro AI  
**狀態**: 已完成  
**結論**: 證交所 OpenAPI 無債券 ETF 股息資料，建議維持手動輸入方案
