# FinMind API 使用規範指南

## 🎯 核心原則

FinMind API 是**台股資料的首選來源**，提供最準確的中文名稱、股價、股息、配股等資料。

---

## 📊 API 優先順序

### 股票搜尋和股價查詢
1. **FinMind API** (首選) - 台股專用，中文名稱，資料最準確
2. **台灣證交所 API** (備用) - 中文名稱，官方資料
3. **Yahoo Finance API** (最後備用) - 英文名稱，國際通用

### 股息和配股查詢
1. **FinMind API** (首選) - 完整的除權息資料，包含配股
2. **GoodInfo** (備用) - 網頁爬蟲，可能不穩定
3. **Yahoo Finance API** (最後備用) - 只有現金股利，無配股資料

---

## 🔧 FinMind API 資料集使用規範

### 1. 股票基本資訊 - `TaiwanStockInfo`

**用途**: 獲取股票中文名稱

**API 端點**:
```
https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockInfo&data_id={股票代碼}&token=
```

**重要欄位**:
- `stock_id`: 股票代碼
- `stock_name`: 股票中文名稱 ✅

**使用範例**:
```javascript
const infoUrl = `https://api.finmindtrade.com/api/v4/data`;
const infoParams = new URLSearchParams({
  dataset: 'TaiwanStockInfo',
  data_id: '2330',
  token: ''
});

const response = await axios.get(`${infoUrl}?${infoParams}`);
const stockName = response.data.data[0].stock_name; // "台積電"
```

---

### 2. 股票價格 - `TaiwanStockPrice`

**用途**: 獲取股票即時或歷史股價

**API 端點**:
```
https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockPrice&data_id={股票代碼}&start_date={開始日期}&token=
```

**重要欄位**:
- `date`: 日期
- `stock_id`: 股票代碼
- `open`: 開盤價
- `close`: 收盤價 ✅ (使用此欄位作為股價)
- `high`: 最高價
- `low`: 最低價
- `volume`: 成交量

**使用範例**:
```javascript
const priceUrl = `https://api.finmindtrade.com/api/v4/data`;
const priceParams = new URLSearchParams({
  dataset: 'TaiwanStockPrice',
  data_id: '2330',
  start_date: '2024-01-01',
  token: ''
});

const response = await axios.get(`${priceUrl}?${priceParams}`);
const latestData = response.data.data[response.data.data.length - 1];
const price = parseFloat(latestData.close); // 收盤價
```

---

### 3. 股息配股資料 - `TaiwanStockDividend` ⭐ **重要**

**用途**: 獲取完整的除權息資料，包含現金股利和股票股利（配股）

**API 端點**:
```
https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockDividend&data_id={股票代碼}&start_date=2020-01-01&end_date=2025-12-31&token=
```

**⚠️ 注意**: 必須使用 `TaiwanStockDividend`，**不是** `TaiwanStockDividendResult`！

**重要欄位**:

#### 現金股利相關
- `CashEarningsDistribution`: 現金股利（盈餘分配）✅
- `CashStatutorySurplus`: 現金股利（法定盈餘）✅
- `CashExDividendTradingDate`: 除息交易日 ✅
- `CashDividendPaymentDate`: 現金股利發放日

**現金股利計算**:
```javascript
const cashDividend = parseFloat(item.CashEarningsDistribution || 0) + 
                     parseFloat(item.CashStatutorySurplus || 0);
```

#### 股票股利（配股）相關
- `StockEarningsDistribution`: 股票股利（盈餘分配）✅
- `StockStatutorySurplus`: 股票股利（法定盈餘）✅
- `StockExDividendTradingDate`: 除權交易日 ✅

**股票股利計算**:
```javascript
const stockDividend = parseFloat(item.StockEarningsDistribution || 0) + 
                      parseFloat(item.StockStatutorySurplus || 0);
```

**配股比例計算** (每1000股配X股):
```javascript
// 假設面額10元
// 配股比例 = (股票股利 ÷ 10) × 1000
const stockDividendRatio = stockDividend > 0 
  ? Math.round((stockDividend / 10) * 1000) 
  : 0;

// 範例：股票股利 0.3 元
// 配股比例 = (0.3 ÷ 10) × 1000 = 30‰
// 表示每1000股配30股
```

#### 其他欄位
- `year`: 年度（民國年，如"112年"）
- `date`: 股東會日期
- `AnnouncementDate`: 公告日期
- `ParticipateDistributionOfTotalShares`: 參與分配總股數

**除權息類型判斷**:
```javascript
let type = 'cash';
if (cashDividend > 0 && stockDividend > 0) {
  type = 'both';  // 除權息
} else if (stockDividend > 0) {
  type = 'stock'; // 除權
}
// else: type = 'cash' (除息)
```

**民國年轉西元年**:
```javascript
const westernYear = parseInt(item.year.replace('年', '')) + 1911;
// "112年" → 112 + 1911 = 2023
```

**完整使用範例**:
```javascript
const dividendUrl = `https://api.finmindtrade.com/api/v4/data`;
const dividendParams = new URLSearchParams({
  dataset: 'TaiwanStockDividend',
  data_id: '2886',
  start_date: '2020-01-01',
  end_date: '2025-12-31',
  token: ''
});

const response = await axios.get(`${dividendUrl}?${dividendParams}`);
const dividends = response.data.data.map(item => {
  // 計算現金股利
  const cashDividend = parseFloat(item.CashEarningsDistribution || 0) + 
                       parseFloat(item.CashStatutorySurplus || 0);
  
  // 計算股票股利
  const stockDividend = parseFloat(item.StockEarningsDistribution || 0) + 
                        parseFloat(item.StockStatutorySurplus || 0);
  
  // 計算配股比例
  const stockDividendRatio = stockDividend > 0 
    ? Math.round((stockDividend / 10) * 1000) 
    : 0;
  
  // 判斷類型
  let type = 'cash';
  if (cashDividend > 0 && stockDividend > 0) {
    type = 'both';
  } else if (stockDividend > 0) {
    type = 'stock';
  }
  
  // 除息日期
  const exDate = item.CashExDividendTradingDate || 
                 item.StockExDividendTradingDate || 
                 item.date;
  
  // 民國年轉西元年
  const year = parseInt(item.year.replace('年', '')) + 1911;
  
  return {
    exDate,
    cashDividend,
    stockDividend,
    stockDividendRatio,
    totalDividend: cashDividend + stockDividend,
    type,
    year
  };
});
```

---

## ❌ 常見錯誤

### 錯誤 1: 使用錯誤的資料集

```javascript
// ❌ 錯誤：使用 TaiwanStockDividendResult
dataset: 'TaiwanStockDividendResult'

// ✅ 正確：使用 TaiwanStockDividend
dataset: 'TaiwanStockDividend'
```

**原因**: `TaiwanStockDividendResult` 只有價差資料（`stock_and_cache_dividend`），沒有詳細的現金股利和股票股利欄位。

---

### 錯誤 2: 使用錯誤的欄位名稱

```javascript
// ❌ 錯誤：這些欄位不存在於 TaiwanStockDividend
const cashDividend = item.cash_dividend;
const stockDividend = item.stock_dividend;

// ✅ 正確：使用正確的欄位名稱
const cashDividend = parseFloat(item.CashEarningsDistribution || 0) + 
                     parseFloat(item.CashStatutorySurplus || 0);
const stockDividend = parseFloat(item.StockEarningsDistribution || 0) + 
                      parseFloat(item.StockStatutorySurplus || 0);
```

---

### 錯誤 3: 配股比例計算錯誤

```javascript
// ❌ 錯誤：直接使用股票股利作為配股比例
const stockDividendRatio = stockDividend * 1000; // 0.3 × 1000 = 300‰ (錯誤！)

// ✅ 正確：先除以面額再乘以1000
const stockDividendRatio = (stockDividend / 10) * 1000; // (0.3 ÷ 10) × 1000 = 30‰
```

**原因**: 股票股利單位是「元」，需要先除以面額（通常10元）轉換為股數，再計算配股比例。

---

### 錯誤 4: 忽略法定盈餘

```javascript
// ❌ 錯誤：只使用盈餘分配
const cashDividend = item.CashEarningsDistribution;

// ✅ 正確：盈餘分配 + 法定盈餘
const cashDividend = parseFloat(item.CashEarningsDistribution || 0) + 
                     parseFloat(item.CashStatutorySurplus || 0);
```

---

### 錯誤 5: 民國年未轉換

```javascript
// ❌ 錯誤：直接使用民國年
const year = parseInt(item.year); // "112年" → 112 (錯誤！)

// ✅ 正確：民國年轉西元年
const year = parseInt(item.year.replace('年', '')) + 1911; // 112 + 1911 = 2023
```

---

## 📋 實際案例驗證

### 2886 兆豐金 2024年除權息

**FinMind API 原始資料**:
```json
{
  "stock_id": "2886",
  "year": "112年",
  "CashEarningsDistribution": 1.5,
  "CashStatutorySurplus": 0,
  "StockEarningsDistribution": 0.3,
  "StockStatutorySurplus": 0,
  "CashExDividendTradingDate": "2024-08-08",
  "StockExDividendTradingDate": "2024-08-08"
}
```

**正確解析結果**:
- 現金股利: 1.5 + 0 = **1.5 元** ✅
- 股票股利: 0.3 + 0 = **0.3 元** ✅
- 配股比例: (0.3 ÷ 10) × 1000 = **30‰** ✅
- 總股利: 1.5 + 0.3 = **1.8 元** ✅
- 類型: **both** (除權息) ✅
- 除息日: **2024-08-08** ✅
- 年度: 112 + 1911 = **2023** ✅

**配股計算**:
- 持股 1000 股
- 配股數量: 1000 × 30‰ = **30 股** ✅
- 除權後持股: 1000 + 30 = **1030 股** ✅

**系統驗證**: v1.0.2.0111 已完整驗證 ✅

---

## 🔒 API 資料完整性規則

遵循 `api-data-integrity.md` STEERING 規則：

### ✅ 允許的做法
- 使用真實的 FinMind API 資料
- API 失敗時返回明確的 404 錯誤
- 提供清楚的錯誤訊息和建議

### ❌ 禁止的做法
- 使用本地硬編碼股票名稱對照表
- 提供虛假或過時的股票資料
- API 失敗時返回預設價格或配股資料
- 混用真實 API 資料和虛假本地資料

---

## 📚 參考資源

- **FinMind 官方文檔**: https://finmindtrade.com/
- **API 端點**: https://api.finmindtrade.com/api/v4/data
- **資料集列表**: https://finmindtrade.com/analysis/#/data/Taiwan
- **STEERING 規則**: `finmind-api-priority.md`, `api-data-integrity.md`

---

## 🎯 檢查清單

每次使用 FinMind API 時，請確認：

- [ ] 使用正確的資料集名稱（`TaiwanStockDividend` 而非 `TaiwanStockDividendResult`）
- [ ] 使用正確的欄位名稱（`CashEarningsDistribution` 而非 `cash_dividend`）
- [ ] 現金股利 = 盈餘分配 + 法定盈餘
- [ ] 股票股利 = 盈餘分配 + 法定盈餘
- [ ] 配股比例 = (股票股利 ÷ 10) × 1000
- [ ] 民國年轉西元年 = 民國年 + 1911
- [ ] 除權息類型根據股利組成正確判斷
- [ ] 遵循 API 資料完整性規則，不使用虛假資料

---

**最後更新**: v1.0.2.0111 (2026-01-14)
**驗證狀態**: ✅ 已完整驗證配股功能正常運作

