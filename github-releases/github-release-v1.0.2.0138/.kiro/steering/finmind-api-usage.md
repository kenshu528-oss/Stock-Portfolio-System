# FinMind API 使用規範 (FinMind API Usage Standards)

## 🎯 核心原則：FinMind 是台股資料的首選來源（債券 ETF 除外）

### 絕對要求的規範
- ✅ **一般股票優先使用 FinMind API**：台股股票資料必須優先使用 FinMind API
- ⚠️ **債券 ETF 例外**：債券 ETF 配息資料優先使用 Yahoo Finance API（FinMind 資料不完整）
- ✅ **使用正確的資料集**：股息配股必須使用 `TaiwanStockDividend`
- ✅ **使用正確的欄位**：現金股利和股票股利有專用欄位
- ✅ **正確計算配股比例**：(股票股利 ÷ 10) × 1000

## 📊 股息資料來源策略

### 債券 ETF（如 00679B、00687B）
```
優先順序：
1. Yahoo Finance API（首選）- 債券 ETF 配息資料最完整
   ↓ 失敗或無資料
2. FinMind API（備用）- 部分債券 ETF 資料不完整
```

**理由**：
- ✅ Yahoo Finance 對債券 ETF 的配息記錄最完整
- ⚠️ FinMind 對債券 ETF 的配息資料可能缺失或不完整
- ❌ GoodInfo 反爬蟲嚴格，已移除

### 一般股票 & 一般 ETF（如 2330、2886、0050）
```
優先順序：
1. FinMind API（首選）- 台股專用，資料最準確
   ↓ 失敗或無資料
2. Yahoo Finance API（備用）- 國際通用
```

**理由**：
- ✅ FinMind 是台股專用 API，資料最完整
- ✅ Yahoo Finance 作為國際備援

## 📊 資料集使用規範

### 1. 股票基本資訊 - `TaiwanStockInfo`
```javascript
// ✅ 正確：獲取股票中文名稱
dataset: 'TaiwanStockInfo'
欄位: stock_name // 股票中文名稱
```

### 2. 股票價格 - `TaiwanStockPrice`
```javascript
// ✅ 正確：獲取股票價格
dataset: 'TaiwanStockPrice'
欄位: close // 收盤價
```

### 3. 股息配股 - `TaiwanStockDividend` ⭐ **重要**
```javascript
// ✅ 正確：獲取完整除權息資料（一般股票）
dataset: 'TaiwanStockDividend'

// 現金股利計算
cashDividend = CashEarningsDistribution + CashStatutorySurplus

// 股票股利計算
stockDividend = StockEarningsDistribution + StockStatutorySurplus

// 配股比例計算（每1000股配X股）
stockDividendRatio = (stockDividend / 10) * 1000

// 除息日期
exDate = CashExDividendTradingDate || StockExDividendTradingDate

// 民國年轉西元年
year = parseInt(year.replace('年', '')) + 1911
```

## ⚠️ 債券 ETF 特殊處理

### 識別債券 ETF
```javascript
// 債券 ETF 格式：00XXB 或 00XXXB
const isBondETF = /^00\d{2,3}B$/i.test(symbol);
```

### 債券 ETF 資料來源
```javascript
if (isBondETF) {
  // 優先使用 Yahoo Finance
  dividendData = await getYahooDividendData(symbol);
  
  // 備用：FinMind（可能資料不完整）
  if (!dividendData) {
    dividendData = await getFinMindDividendData(symbol);
  }
} else {
  // 一般股票：優先使用 FinMind
  dividendData = await getFinMindDividendData(symbol);
  
  // 備用：Yahoo Finance
  if (!dividendData) {
    dividendData = await getYahooDividendData(symbol);
  }
}
```

## ❌ 絕對禁止的錯誤

### 錯誤 1: 使用錯誤的資料集
```javascript
// ❌ 錯誤：TaiwanStockDividendResult 沒有詳細股利欄位
dataset: 'TaiwanStockDividendResult'

// ✅ 正確：TaiwanStockDividend 有完整股利欄位
dataset: 'TaiwanStockDividend'
```

### 錯誤 2: 債券 ETF 只用 FinMind
```javascript
// ❌ 錯誤：債券 ETF 只用 FinMind（資料可能不完整）
if (isBondETF) {
  dividendData = await getFinMindDividendData(symbol);
}

// ✅ 正確：債券 ETF 優先用 Yahoo Finance
if (isBondETF) {
  dividendData = await getYahooDividendData(symbol);
  if (!dividendData) {
    dividendData = await getFinMindDividendData(symbol);
  }
}
```

### 錯誤 3: 配股比例計算錯誤
```javascript
// ❌ 錯誤：直接乘以1000
stockDividendRatio = stockDividend * 1000 // 0.3 × 1000 = 300‰ (錯誤！)

// ✅ 正確：先除以面額再乘以1000
stockDividendRatio = (stockDividend / 10) * 1000 // (0.3 ÷ 10) × 1000 = 30‰
```

### 錯誤 4: 配股計算順序錯誤 ⚠️ **嚴重錯誤**
```javascript
// ❌ 錯誤：直接使用 API 返回的順序（從新到舊）
const records = apiDividends.map(dividend => {
  const stockDividendShares = Math.floor(currentShares * dividend.stockDividendRatio / 1000);
  currentShares += stockDividendShares; // 錯誤的累積順序！
  return { ...dividend, stockDividendShares };
});

// ✅ 正確：必須先排序為從舊到新，再計算配股
const sortedDividends = apiDividends.sort((a, b) => 
  new Date(a.exDividendDate).getTime() - new Date(b.exDividendDate).getTime()
);

const records = sortedDividends.map(dividend => {
  const stockDividendShares = Math.floor(currentShares * dividend.stockDividendRatio / 1000);
  currentShares += stockDividendShares; // 正確的累積順序
  return { ...dividend, stockDividendShares };
});
```

## 📋 實際案例

### 案例 1: 2886 兆豐金（一般股票）
**資料來源**：FinMind API（首選）

**FinMind API 原始資料**：
```json
{
  "CashEarningsDistribution": 1.5,
  "CashStatutorySurplus": 0,
  "StockEarningsDistribution": 0.3,
  "StockStatutorySurplus": 0,
  "CashExDividendTradingDate": "2024-08-08"
}
```

**正確解析結果**：
- 現金股利: 1.5 + 0 = **1.5 元** ✅
- 股票股利: 0.3 + 0 = **0.3 元** ✅
- 配股比例: (0.3 ÷ 10) × 1000 = **30‰** ✅

### 案例 2: 00679B 元大美債20年（債券 ETF）
**資料來源**：Yahoo Finance API（首選）

**理由**：
- ✅ Yahoo Finance 有完整的 6 筆配息記錄
- ⚠️ FinMind 可能缺少部分配息記錄
- ✅ 成功獲取 2024-2025 年的所有配息

## 🔒 API 資料完整性規則

### ✅ 允許的做法
- 使用真實的 API 資料（FinMind 或 Yahoo Finance）
- API 失敗時返回明確的錯誤
- 根據股票類型選擇最佳資料來源

### ❌ 禁止的做法
- 使用本地硬編碼股票資料
- 提供虛假或過時的資料
- API 失敗時返回預設值
- 忽略債券 ETF 的特殊性

## 📚 相關文檔

- STEERING 規則: `finmind-api-priority.md`, `api-data-integrity.md`, `dual-api-strategy.md`

---

**記住：一般股票優先用 FinMind，債券 ETF 優先用 Yahoo Finance！**
