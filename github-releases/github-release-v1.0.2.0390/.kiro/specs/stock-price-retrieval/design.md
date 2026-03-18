# 股價獲取系統設計文件 (Stock Price Retrieval System Design)

## 概述

本設計文件基於 v1.0.2.0197 成功修復的股價獲取問題，提供完整的技術實作方案。系統採用智能後綴判斷 + 多重 API 備援的架構，確保所有台灣股票類型都能正確獲取即時股價。

## 架構設計

### 整體架構
```
前端應用 ←→ 後端代理服務 ←→ 外部 API
    ↓              ↓              ↓
QuickAddStock   Express.js    Yahoo Finance
StockSearch     Node.js       FinMind API  
StockRow        CORS處理      證交所 API
```

### 核心組件

#### 1. 股票代碼分析器 (Stock Symbol Analyzer)
```typescript
class StockSymbolAnalyzer {
  static analyzeSymbol(symbol: string): {
    type: 'listed' | 'otc' | 'etf' | 'bond_etf';
    suffixes: string[];
    market: string;
  }
}
```

#### 2. API 管理器 (API Manager)
```typescript
class StockPriceAPIManager {
  private apis: APIProvider[];
  async getPrice(symbol: string): Promise<StockPrice | null>;
  private async tryAPI(provider: APIProvider, symbol: string): Promise<StockPrice | null>;
}
```

#### 3. 快取管理器 (Cache Manager)
```typescript
class StockPriceCache {
  private cache: Map<string, CacheEntry>;
  get(symbol: string): StockPrice | null;
  set(symbol: string, data: StockPrice): void;
  cleanup(): void;
}
```

## 組件和介面

### 1. 股票代碼後綴判斷

#### 判斷邏輯
```typescript
function getStockSuffixes(symbol: string): { suffixes: string[], type: string, market: string } {
  const code = parseInt(symbol.substring(0, 4));
  const isBondETF = /^00\d{2,3}B$/i.test(symbol);
  const isETF = /^00\d{2,3}[A-Z]?$/i.test(symbol);
  
  if (isBondETF) {
    return {
      suffixes: ['.TWO', '.TW'],
      type: 'bond_etf',
      market: 'ETF'
    };
  } else if (isETF) {
    return {
      suffixes: ['.TWO', '.TW'],
      type: 'etf', 
      market: 'ETF'
    };
  } else if (code >= 6000 && code <= 8999) {
    return {
      suffixes: ['.TWO', '.TW'],
      type: 'otc',
      market: '上櫃'
    };
  } else if (code >= 3000 && code <= 5999) {
    return {
      suffixes: ['.TWO', '.TW'],
      type: 'otc',
      market: '上櫃'
    };
  } else if (code >= 1000 && code <= 2999) {
    return {
      suffixes: ['.TW', '.TWO'],
      type: 'listed',
      market: '上市'
    };
  } else {
    return {
      suffixes: ['.TW', '.TWO'],
      type: 'unknown',
      market: '台灣'
    };
  }
}
```

### 2. API 提供者介面

#### Yahoo Finance API
```typescript
class YahooFinanceAPI implements APIProvider {
  name = 'Yahoo Finance';
  priority = 1;
  
  async getStockPrice(symbol: string, suffixes: string[]): Promise<StockPrice | null> {
    for (const suffix of suffixes) {
      try {
        const yahooSymbol = `${symbol}${suffix}`;
        const response = await this.fetchPrice(yahooSymbol);
        if (response && response.price > 0) {
          return this.parseResponse(symbol, response);
        }
      } catch (error) {
        console.log(`Yahoo Finance ${symbol}${suffix} 失敗: ${error.message}`);
      }
    }
    return null;
  }
}
```

#### FinMind API
```typescript
class FinMindAPI implements APIProvider {
  name = 'FinMind';
  priority = 2;
  
  async getStockPrice(symbol: string): Promise<StockPrice | null> {
    // 獲取股票基本資訊（中文名稱）
    const stockInfo = await this.getStockInfo(symbol);
    
    // 獲取股價資料
    const priceData = await this.getStockPriceData(symbol);
    
    return this.combineData(symbol, stockInfo, priceData);
  }
}
```

### 3. 混合資料策略

#### 資料合併邏輯
```typescript
class DataMerger {
  static mergeStockData(
    yahooData: StockPrice | null,
    finmindData: StockPrice | null
  ): StockPrice | null {
    if (yahooData && yahooData.price > 0) {
      // 使用 Yahoo Finance 股價 + FinMind 中文名稱
      if (finmindData && finmindData.name && finmindData.name !== yahooData.symbol) {
        return {
          ...yahooData,
          name: finmindData.name,
          source: 'Yahoo+FinMind'
        };
      }
      return yahooData;
    }
    
    return finmindData;
  }
}
```

## 資料模型

### 股價資料模型
```typescript
interface StockPrice {
  symbol: string;        // 股票代碼 (必填)
  name: string;          // 股票名稱 (必填)
  price: number;         // 當前股價 (必填, > 0)
  change: number;        // 漲跌金額 (必填)
  changePercent: number; // 漲跌百分比 (必填)
  timestamp: string;     // ISO 時間戳記 (必填)
  source: string;        // 資料來源 (必填)
  market: string;        // 市場類型 (必填)
}
```

### 快取項目模型
```typescript
interface CacheEntry {
  data: StockPrice;
  timestamp: number;
  ttl: number; // 存活時間 (毫秒)
}
```

### API 提供者介面
```typescript
interface APIProvider {
  name: string;
  priority: number;
  timeout: number;
  
  getStockPrice(symbol: string, suffixes?: string[]): Promise<StockPrice | null>;
  isHealthy(): Promise<boolean>;
}
```

## 正確性屬性

*屬性是系統應該在所有有效執行中保持為真的特性或行為-本質上是關於系統應該做什麼的正式陳述。屬性作為人類可讀規範和機器可驗證正確性保證之間的橋樑。*

### 屬性 1: 後綴判斷一致性
*對於任何*有效的台灣股票代碼，後綴判斷邏輯應該根據代碼範圍返回正確的後綴順序，上櫃股票優先 .TWO，上市股票優先 .TW
**驗證: 需求 1.1, 1.2, 1.3, 1.4**

### 屬性 2: API 備援完整性  
*對於任何*股票代碼查詢，如果主要 API 失敗，系統應該自動嘗試備用 API，直到獲得有效資料或所有 API 都失敗
**驗證: 需求 2.1, 2.3, 2.4**

### 屬性 3: 資料完整性驗證
*對於任何*成功的股價查詢，返回的資料應該包含所有必填欄位且股價必須大於零
**驗證: 需求 3.1, 3.2**

### 屬性 4: 混合資料來源一致性
*對於任何*使用混合資料來源的查詢，Yahoo Finance 股價與 FinMind 中文名稱的組合應該正確標記為 "Yahoo+FinMind"
**驗證: 需求 2.2, 2.5, 3.3**

### 屬性 5: 錯誤處理完整性
*對於任何*無效或失敗的查詢，系統應該返回適當的錯誤碼和友好的錯誤訊息
**驗證: 需求 4.1, 4.2, 4.4**

### 屬性 6: 前後端邏輯一致性
*對於任何*股票代碼，前端和後端的後綴判斷邏輯應該產生相同的結果
**驗證: 需求 5.1, 5.2, 5.5**

### 屬性 8: API 資料完整性保證
*對於任何*API 調用，系統絕不應該返回虛假或硬編碼的資料，失敗時必須返回 null 或明確錯誤
**驗證: 需求 7.1, 7.2, 7.3**

### 屬性 9: 智能後綴嘗試完整性
*對於任何*股票代碼，系統應該根據股票類型智能選擇後綴順序，並在失敗時嘗試所有可能的後綴
**驗證: 需求 8.1, 8.2, 8.3, 8.5**

### 屬性 10: 日誌記錄一致性
*對於任何*API 調用過程，系統應該記錄詳細的嘗試過程、結果和錯誤資訊
**驗證: 需求 1.5, 7.5, 8.2, 8.4**

## 錯誤處理

### 錯誤類型分類

#### 1. 輸入驗證錯誤
```typescript
class InvalidSymbolError extends Error {
  constructor(symbol: string) {
    super(`無效的股票代碼: ${symbol}`);
    this.name = 'InvalidSymbolError';
  }
}
```

#### 2. API 連線錯誤
```typescript
class APIConnectionError extends Error {
  constructor(apiName: string, originalError: Error) {
    super(`${apiName} API 連線失敗: ${originalError.message}`);
    this.name = 'APIConnectionError';
  }
}
```

#### 3. 資料驗證錯誤
```typescript
class InvalidDataError extends Error {
  constructor(reason: string) {
    super(`股價資料無效: ${reason}`);
    this.name = 'InvalidDataError';
  }
}
```

### 錯誤處理策略

#### 1. 漸進式降級
```typescript
async function getStockPriceWithFallback(symbol: string): Promise<StockPrice | null> {
  const apis = [YahooFinanceAPI, FinMindAPI, TWSEOpenAPI];
  
  for (const API of apis) {
    try {
      const result = await new API().getStockPrice(symbol);
      if (result && result.price > 0) {
        return result;
      }
    } catch (error) {
      logger.warn(`${API.name} 失敗，嘗試下一個 API`, error);
      continue;
    }
  }
  
  return null;
}
```

#### 2. 超時處理
```typescript
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('請求超時')), timeoutMs);
  });
  
  return Promise.race([promise, timeoutPromise]);
}
```

## 測試策略

### 單元測試

#### 1. 後綴判斷測試
```typescript
describe('Stock Symbol Analyzer', () => {
  test('上市股票應該優先使用 .TW 後綴', () => {
    const result = getStockSuffixes('2330');
    expect(result.suffixes).toEqual(['.TW', '.TWO']);
    expect(result.type).toBe('listed');
  });
  
  test('上櫃股票應該優先使用 .TWO 後綴', () => {
    const result = getStockSuffixes('6188');
    expect(result.suffixes).toEqual(['.TWO', '.TW']);
    expect(result.type).toBe('otc');
  });
});
```

#### 2. API 備援測試
```typescript
describe('API Fallback', () => {
  test('主要 API 失敗時應該嘗試備用 API', async () => {
    const mockYahoo = jest.fn().mockRejectedValue(new Error('Yahoo 失敗'));
    const mockFinMind = jest.fn().mockResolvedValue(mockStockPrice);
    
    const result = await getStockPriceWithFallback('2330');
    
    expect(mockYahoo).toHaveBeenCalled();
    expect(mockFinMind).toHaveBeenCalled();
    expect(result).toEqual(mockStockPrice);
  });
});
```

### 屬性測試

#### 1. 後綴判斷屬性測試
```typescript
// **功能: stock-price-retrieval, 屬性 1: 後綴判斷一致性**
test('property: 後綴判斷一致性', () => {
  fc.assert(fc.property(
    fc.integer({ min: 1000, max: 8999 }).map(n => n.toString()),
    (symbol) => {
      const result = getStockSuffixes(symbol);
      const code = parseInt(symbol);
      
      if (code >= 3000 && code <= 8999) {
        return result.suffixes[0] === '.TWO';
      } else {
        return result.suffixes[0] === '.TW';
      }
    }
  ));
});
```

#### 2. 資料完整性屬性測試
```typescript
// **功能: stock-price-retrieval, 屬性 3: 資料完整性驗證**
test('property: 資料完整性驗證', () => {
  fc.assert(fc.property(
    fc.string({ minLength: 4, maxLength: 6 }),
    async (symbol) => {
      const result = await getStockPrice(symbol);
      
      if (result !== null) {
        return (
          result.symbol === symbol &&
          result.price > 0 &&
          result.name.length > 0 &&
          result.source.length > 0 &&
          result.market.length > 0
        );
      }
      
      return true; // null 結果是可接受的
    }
  ));
});
```

### 整合測試

#### 1. 端到端股價獲取測試
```typescript
describe('End-to-End Stock Price Retrieval', () => {
  test('應該成功獲取各種類型股票的股價', async () => {
    const testCases = [
      { symbol: '2330', expectedMarket: '上市' },
      { symbol: '6188', expectedMarket: '上櫃' },
      { symbol: '0050', expectedMarket: 'ETF' },
      { symbol: '00679B', expectedMarket: 'ETF' }
    ];
    
    for (const testCase of testCases) {
      const result = await getStockPrice(testCase.symbol);
      
      expect(result).not.toBeNull();
      expect(result.symbol).toBe(testCase.symbol);
      expect(result.market).toBe(testCase.expectedMarket);
      expect(result.price).toBeGreaterThan(0);
    }
  });
});
```

## 效能考量

### 1. 快取策略
- **TTL**: 5 秒（平衡即時性與效能）
- **容量**: 最多 1000 個股票快取
- **清理**: 每 30 秒自動清理過期項目

### 2. 並發控制
- **批量更新**: 最多 5 個並發請求
- **請求間隔**: 300ms 防止 API 限流
- **超時設定**: 10 秒單一請求超時

### 3. 記憶體優化
- **快取大小監控**: 超過限制時 LRU 清理
- **物件池**: 重用 HTTP 連線
- **垃圾回收**: 定期清理無用物件

## 部署考量

### 1. 環境配置
```typescript
interface StockPriceConfig {
  cacheTimeout: number;      // 快取超時 (毫秒)
  apiTimeout: number;        // API 超時 (毫秒)
  maxConcurrency: number;    // 最大並發數
  retryAttempts: number;     // 重試次數
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}
```

### 2. 監控指標
- API 成功率
- 平均回應時間
- 快取命中率
- 錯誤率統計

### 3. 健康檢查
```typescript
async function healthCheck(): Promise<HealthStatus> {
  const apis = [YahooFinanceAPI, FinMindAPI];
  const results = await Promise.allSettled(
    apis.map(api => api.isHealthy())
  );
  
  return {
    status: results.every(r => r.status === 'fulfilled') ? 'healthy' : 'degraded',
    apis: results.map((r, i) => ({
      name: apis[i].name,
      status: r.status === 'fulfilled' ? 'up' : 'down'
    }))
  };
}
```

---

**重要**: 此設計基於 v1.0.2.0197 的成功實作，所有未來的股價獲取功能都必須遵循此設計規範！