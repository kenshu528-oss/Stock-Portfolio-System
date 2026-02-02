# Stock Portfolio System API 文檔

## 📋 API 概述

Stock Portfolio System 整合了多個外部 API 來提供股價和除權息資料，本文檔詳細說明各 API 的使用方式和整合策略。

---

## 🔗 外部 API 整合

### 1. FinMind API

#### 1.1 基本資訊
- **用途**: 台股股價和除權息資料（主要來源）
- **官網**: https://finmind.github.io/
- **優勢**: 台股專用、中文名稱、歷史資料完整
- **限制**: 免費版有請求限制

#### 1.2 股價查詢
```typescript
// 股價查詢端點
GET https://api.finmindtrade.com/api/v4/data
Parameters:
- dataset: "TaiwanStockPrice"
- data_id: "2330" (股票代碼)
- start_date: "2024-01-01"
- token: "your_token" (可選)

// 回應格式
{
  "data": [
    {
      "date": "2024-01-20",
      "stock_id": "2330",
      "Trading_Volume": 1000000,
      "Trading_money": 50000000,
      "open": 500.0,
      "max": 510.0,
      "min": 495.0,
      "close": 505.0,
      "spread": 5.0,
      "Trading_turnover": 2000
    }
  ]
}
```

#### 1.3 除權息查詢
```typescript
// 除權息查詢端點
GET https://api.finmindtrade.com/api/v4/data
Parameters:
- dataset: "TaiwanStockDividend"
- data_id: "2330"
- start_date: "2020-01-01"

// 回應格式
{
  "data": [
    {
      "stock_id": "2330",
      "AnnouncementDate": "2024-03-15",
      "CashEarningsDistribution": 2.5,
      "CashStatutorySurplus": 0.0,
      "StockEarningsDistribution": 0.0,
      "StockStatutorySurplus": 0.0,
      "CashExDividendTradingDate": "2024-06-20",
      "StockExDividendTradingDate": null
    }
  ]
}
```

### 2. Yahoo Finance API

#### 2.1 基本資訊
- **用途**: 國際股價、債券ETF資料（備用來源）
- **優勢**: 即時資料、國際市場支援、債券ETF配息資料完整
- **限制**: 非官方API，可能不穩定

#### 2.2 股價查詢
```typescript
// 股價查詢端點
GET https://query1.finance.yahoo.com/v8/finance/chart/{symbol}
Parameters:
- symbol: "2330.TW" (股票代碼+後綴)
- interval: "1d"
- range: "1d"

// 回應格式
{
  "chart": {
    "result": [
      {
        "meta": {
          "currency": "TWD",
          "symbol": "2330.TW",
          "regularMarketPrice": 505.0,
          "previousClose": 500.0,
          "regularMarketDayHigh": 510.0,
          "regularMarketDayLow": 495.0
        },
        "timestamp": [1642636800],
        "indicators": {
          "quote": [
            {
              "open": [500.0],
              "high": [510.0],
              "low": [495.0],
              "close": [505.0],
              "volume": [1000000]
            }
          ]
        }
      }
    ]
  }
}
```

### 3. 證交所 OpenAPI

#### 3.1 基本資訊
- **用途**: 官方股價資料（最後備用）
- **官網**: https://openapi.twse.com.tw/
- **優勢**: 官方資料、權威性高
- **限制**: 資料更新較慢、格式複雜

#### 3.2 股價查詢
```typescript
// 個股即時資訊
GET https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL
// 回應格式較複雜，需要解析處理
```

---

## 🎯 API 整合策略

### 1. 智能 API 選擇

#### 1.1 股價查詢優先順序
```typescript
async function getStockPrice(symbol: string) {
  // 1. 判斷股票類型
  const { suffixes, type } = getStockSuffixes(symbol);
  
  if (type === 'bond_etf') {
    // 債券ETF: Yahoo Finance 優先
    return await tryYahooFinance(symbol, suffixes) ||
           await tryFinMind(symbol) ||
           null;
  } else {
    // 一般股票: Yahoo Finance 優先（基於實際使用經驗）
    return await tryYahooFinance(symbol, suffixes) ||
           await tryFinMind(symbol) ||
           await tryTWSE(symbol) ||
           null;
  }
}
```

#### 1.2 智能後綴判斷
```typescript
function getStockSuffixes(symbol: string): { suffixes: string[], type: string } {
  const code = parseInt(symbol.substring(0, 4));
  const isBondETF = /^00\d{2,3}B$/i.test(symbol);
  
  if (isBondETF) {
    return { suffixes: ['.TWO', '.TW'], type: 'bond_etf' };
  } else if (code >= 3000 && code <= 8999) {
    return { suffixes: ['.TWO', '.TW'], type: 'otc' };
  } else {
    return { suffixes: ['.TW', '.TWO'], type: 'listed' };
  }
}
```

### 2. 錯誤處理策略

#### 2.1 HTTP 錯誤處理
```typescript
async function apiRequest(url: string): Promise<any> {
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 404) {
        // 404 是正常情況（資料不存在），不輸出警告
        return null;
      }
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    logger.error('api', 'API請求失敗', error);
    throw error;
  }
}
```

#### 2.2 重試機制
```typescript
async function apiRequestWithRetry(url: string, maxRetries: number = 3): Promise<any> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await apiRequest(url);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      // 指數退避
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
}
```

### 3. 快取策略

#### 3.1 股價快取
```typescript
class StockPriceCache {
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5分鐘
  
  get(symbol: string): StockPrice | null {
    const entry = this.cache.get(symbol);
    if (!entry || Date.now() - entry.timestamp > this.CACHE_DURATION) {
      return null;
    }
    return entry.data;
  }
  
  set(symbol: string, data: StockPrice): void {
    this.cache.set(symbol, {
      data,
      timestamp: Date.now()
    });
  }
}
```

---

## 🔧 內部 API 服務

### 1. 後端代理服務

#### 1.1 股價代理端點
```typescript
// GET /api/stock/:symbol
app.get('/api/stock/:symbol', async (req, res) => {
  const { symbol } = req.params;
  
  try {
    const stockData = await getStockPrice(symbol);
    if (!stockData) {
      return res.status(404).json({ error: 'Stock not found' });
    }
    
    res.json({
      success: true,
      data: stockData,
      source: 'backend-proxy'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
```

#### 1.2 除權息代理端點
```typescript
// GET /api/dividend/:symbol
app.get('/api/dividend/:symbol', async (req, res) => {
  const { symbol } = req.params;
  
  try {
    const dividendData = await getDividendData(symbol);
    if (!dividendData || dividendData.length === 0) {
      return res.status(404).json({ error: 'Dividend data not found' });
    }
    
    res.json({
      success: true,
      dividends: dividendData,
      source: 'backend-proxy'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
```

### 2. GitHub Gist API

#### 2.1 Gist 操作
```typescript
class GitHubGistService {
  // 測試 Token
  static async testToken(token: string): Promise<{ valid: boolean, user?: any, error?: string }> {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: { 'Authorization': `token ${token}` }
      });
      
      if (response.ok) {
        const user = await response.json();
        return { valid: true, user };
      } else {
        return { valid: false, error: 'Invalid token' };
      }
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }
  
  // 上傳資料
  static async uploadData(token: string, data: any): Promise<{ success: boolean, gistId?: string, error?: string }> {
    const gistData = {
      description: 'Stock Portfolio System Data',
      public: false,
      files: {
        'portfolio.json': {
          content: JSON.stringify(data, null, 2)
        }
      }
    };
    
    try {
      const response = await fetch('https://api.github.com/gists', {
        method: 'POST',
        headers: {
          'Authorization': `token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(gistData)
      });
      
      if (response.ok) {
        const result = await response.json();
        return { success: true, gistId: result.id };
      } else {
        return { success: false, error: 'Upload failed' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  // 下載資料
  static async downloadData(token: string): Promise<{ success: boolean, data?: any, error?: string }> {
    try {
      // 搜尋用戶的 Gists
      const gists = await this.searchPortfolioGists(token);
      if (gists.length === 0) {
        return { success: false, error: 'No portfolio data found' };
      }
      
      // 獲取最新的 Gist 內容
      const latestGist = gists[0];
      const gistResponse = await fetch(latestGist.url, {
        headers: { 'Authorization': `token ${token}` }
      });
      
      if (gistResponse.ok) {
        const gistData = await gistResponse.json();
        const portfolioFile = gistData.files['portfolio.json'];
        
        if (portfolioFile) {
          const data = JSON.parse(portfolioFile.content);
          return { success: true, data };
        }
      }
      
      return { success: false, error: 'Failed to download data' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
```

---

## 📊 API 監控與統計

### 1. API 使用統計

#### 1.1 統計指標
```typescript
interface ApiStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  lastRequestTime: Date | null;
  errorRate: number;
}
```

#### 1.2 統計收集
```typescript
class ApiManager {
  private stats = new Map<string, ApiStats>();
  
  recordRequest(provider: string, success: boolean, responseTime: number): void {
    const stats = this.stats.get(provider) || this.createEmptyStats();
    
    stats.totalRequests++;
    stats.lastRequestTime = new Date();
    
    if (success) {
      stats.successfulRequests++;
    } else {
      stats.failedRequests++;
    }
    
    // 更新平均回應時間
    stats.averageResponseTime = (
      (stats.averageResponseTime * (stats.totalRequests - 1) + responseTime) / 
      stats.totalRequests
    );
    
    stats.errorRate = stats.failedRequests / stats.totalRequests;
    
    this.stats.set(provider, stats);
  }
}
```

### 2. 熔斷器機制

#### 2.1 熔斷器實作
```typescript
class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime: Date | null = null;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private failureThreshold: number = 5,
    private recoveryTimeout: number = 60000 // 1分鐘
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }
  
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }
  
  private shouldAttemptReset(): boolean {
    return this.lastFailureTime && 
           (Date.now() - this.lastFailureTime.getTime()) >= this.recoveryTimeout;
  }
}
```

---

## 🔒 安全性考量

### 1. API Key 管理

#### 1.1 Token 安全
- **GitHub Token**: 儲存在 localStorage，僅用於雲端同步
- **API Keys**: 不在前端暴露敏感 API Keys
- **代理服務**: 透過後端代理隱藏真實 API 端點

#### 1.2 請求限制
```typescript
class RateLimiter {
  private requests = new Map<string, number[]>();
  
  isAllowed(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    
    // 清除過期的請求記錄
    const validRequests = requests.filter(time => now - time < windowMs);
    
    if (validRequests.length >= limit) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(key, validRequests);
    return true;
  }
}
```

### 2. 資料驗證

#### 2.1 API 回應驗證
```typescript
function validateStockPrice(data: any): StockPrice | null {
  if (!data || typeof data !== 'object') return null;
  
  const price = parseFloat(data.price);
  if (isNaN(price) || price <= 0) return null;
  
  return {
    symbol: data.symbol || '',
    price: price,
    change: parseFloat(data.change) || 0,
    changePercent: parseFloat(data.changePercent) || 0,
    timestamp: new Date(data.timestamp || Date.now()),
    source: data.source || 'unknown'
  };
}
```

---

## 📈 效能優化

### 1. 批次請求

#### 1.1 批次股價更新
```typescript
async function batchUpdateStockPrices(symbols: string[]): Promise<Map<string, StockPrice>> {
  const results = new Map<string, StockPrice>();
  const batchSize = 5; // 同時處理5支股票
  
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    const promises = batch.map(symbol => getStockPrice(symbol));
    
    const batchResults = await Promise.allSettled(promises);
    
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        results.set(batch[index], result.value);
      }
    });
    
    // 批次間延遲，避免API限制
    if (i + batchSize < symbols.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}
```

### 2. 快取優化

#### 2.1 多層快取
```typescript
class MultiLevelCache {
  private memoryCache = new Map<string, CacheEntry>();
  private readonly MEMORY_CACHE_SIZE = 100;
  private readonly MEMORY_CACHE_TTL = 5 * 60 * 1000; // 5分鐘
  
  async get(key: string): Promise<any> {
    // 1. 檢查記憶體快取
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && !this.isExpired(memoryEntry)) {
      return memoryEntry.data;
    }
    
    // 2. 檢查 localStorage 快取
    const localEntry = this.getFromLocalStorage(key);
    if (localEntry && !this.isExpired(localEntry)) {
      // 回填記憶體快取
      this.memoryCache.set(key, localEntry);
      return localEntry.data;
    }
    
    return null;
  }
  
  set(key: string, data: any): void {
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      ttl: this.MEMORY_CACHE_TTL
    };
    
    // 記憶體快取
    this.memoryCache.set(key, entry);
    this.evictIfNecessary();
    
    // localStorage 快取
    this.setToLocalStorage(key, entry);
  }
}
```

---

## 🧪 測試策略

### 1. API 測試

#### 1.1 單元測試
```typescript
describe('StockPriceService', () => {
  it('should get stock price from FinMind API', async () => {
    const mockResponse = {
      data: [{ close: 500.0, stock_id: '2330' }]
    };
    
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    } as Response);
    
    const result = await getStockPriceFromFinMind('2330');
    expect(result.price).toBe(500.0);
  });
  
  it('should handle API failure gracefully', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));
    
    const result = await getStockPrice('2330');
    expect(result).toBeNull();
  });
});
```

#### 1.2 整合測試
```typescript
describe('API Integration', () => {
  it('should fallback to alternative APIs', async () => {
    // 模擬 FinMind API 失敗
    jest.spyOn(FinMindAPI, 'getStockPrice').mockRejectedValue(new Error('API Error'));
    
    // 模擬 Yahoo Finance API 成功
    jest.spyOn(YahooFinanceAPI, 'getStockPrice').mockResolvedValue({
      symbol: '2330',
      price: 500.0,
      source: 'Yahoo'
    });
    
    const result = await getStockPrice('2330');
    expect(result.source).toBe('Yahoo');
  });
});
```

---

## 📝 API 使用範例

### 1. 基本股價查詢
```typescript
import { getStockPrice } from './services/stockPriceService';

// 查詢台積電股價
const stockPrice = await getStockPrice('2330');
if (stockPrice) {
  console.log(`台積電股價: ${stockPrice.price}`);
  console.log(`漲跌: ${stockPrice.change} (${stockPrice.changePercent}%)`);
}
```

### 2. 批次股價更新
```typescript
import { batchUpdateStockPrices } from './services/stockPriceService';

const symbols = ['2330', '2317', '2454'];
const prices = await batchUpdateStockPrices(symbols);

prices.forEach((price, symbol) => {
  console.log(`${symbol}: ${price.price}`);
});
```

### 3. 除權息資料查詢
```typescript
import { getDividendData } from './services/dividendApiService';

const dividends = await getDividendData('2330');
if (dividends && dividends.length > 0) {
  dividends.forEach(dividend => {
    console.log(`除權息日: ${dividend.exDividendDate}`);
    console.log(`現金股利: ${dividend.cashDividendPerShare}`);
  });
}
```

---

**API 文檔版本**: v1.0.2.0221  
**最後更新**: 2026-01-20  
**相關文檔**: `docs/SPECIFICATION.md`