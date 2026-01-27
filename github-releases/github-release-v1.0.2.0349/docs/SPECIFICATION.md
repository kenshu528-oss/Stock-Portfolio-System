# Stock Portfolio System 完整規格文檔

## 📋 專案概述

### 基本資訊
- **專案名稱**: Stock Portfolio System
- **當前版本**: v1.0.2.0340
- **類型**: 現代化股票投資組合管理系統
- **技術棧**: React 18 + TypeScript + Vite + Zustand + TailwindCSS
- **目標用戶**: 個人投資者、股票交易員
- **部署環境**: 本機端開發 + 雲端生產環境

### 專案目標
提供一個功能完整、用戶友好的股票投資組合管理系統，支援多帳戶管理、即時股價更新、除權息計算、雲端同步等核心功能。系統設計為本機端和雲端雙環境運行，確保在不同環境下都能提供最佳的用戶體驗。

---

## 🏗️ 系統架構

### 整體架構圖
```
┌─────────────────────────────────────────────────────────────┐
│                    Stock Portfolio System                   │
├─────────────────────────────────────────────────────────────┤
│  前端應用 (React + TypeScript + Vite + Zustand)            │
│  ├── 用戶介面層 (UI Components)                             │
│  ├── 狀態管理層 (Zustand Store)                            │
│  ├── 服務層 (API Services)                                 │
│  └── 工具層 (Utils & Helpers)                              │
├─────────────────────────────────────────────────────────────┤
│                    環境適配層                                │
│  ├── 本機端環境 (localhost:5173)                           │
│  └── 雲端環境 (GitHub Pages / Netlify)                     │
├─────────────────────────────────────────────────────────────┤
│                    後端服務層                                │
│  ├── 本機端後端 (Node.js Express - localhost:3001)        │
│  ├── Netlify Functions (雲端無服務器函數)                   │
│  └── 外部 API 服務                                         │
├─────────────────────────────────────────────────────────────┤
│                    資料來源層                                │
│  ├── Yahoo Finance API (主要股價來源)                      │
│  ├── FinMind API (台股專用資料)                             │
│  ├── 台灣證交所 OpenAPI (官方資料)                          │
│  └── GitHub Gist API (雲端同步)                            │
└─────────────────────────────────────────────────────────────┘
```

### 前端技術棧
```
React 18              - UI 框架，支援 Concurrent Features
TypeScript            - 類型安全，提升開發體驗
Vite                  - 現代化建置工具，快速熱重載
Zustand               - 輕量級狀態管理，支援持久化
TailwindCSS           - 原子化 CSS 框架
Vitest                - 單元測試框架
ESLint + Prettier     - 代碼品質控制
```

### 後端服務架構
```
本機端後端服務:
├── Node.js Express Server (localhost:3001)
│   ├── CORS 支援
│   ├── 股價 API 代理
│   ├── 快取機制
│   └── 錯誤處理

雲端無服務器函數:
├── Netlify Functions
│   ├── /stock - 股價查詢
│   ├── /stock-search - 股票搜尋
│   ├── /dividend - 除權息查詢
│   └── /health - 健康檢查
```

---

## 🌐 環境架構與工作機制

### 本機端環境 (Development Environment)

#### 環境特徵
- **前端**: `http://localhost:5173` (Vite Dev Server)
- **後端**: `http://localhost:3001` (Node.js Express Server)
- **檢測方式**: `window.location.hostname === 'localhost'`
- **優勢**: 無 CORS 限制，完整功能，快速開發

#### 工作機制
```typescript
// 本機端環境檢測
const isLocalhost = window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1';

if (isLocalhost) {
  // 使用本機端後端代理
  const apiUrl = 'http://localhost:3001/api/stock/2330';
  // 後端代理會調用 Yahoo Finance API 並返回結果
}
```

#### 股價獲取流程
```
用戶請求股價
    ↓
前端調用本機端後端 API (localhost:3001)
    ↓
後端代理調用 Yahoo Finance API
    ↓
後端處理並快取結果
    ↓
返回股價資料給前端
    ↓
前端顯示股價 (來源: Yahoo)
```

#### 本機端後端服務功能
- **股價代理**: 代理 Yahoo Finance API 請求
- **CORS 處理**: 解決跨域問題
- **快取機制**: 5秒快取避免重複請求
- **錯誤處理**: 優雅處理 API 失敗
- **日誌記錄**: 詳細的請求日誌

### 雲端環境 (Production Environment)

#### 環境特徵
- **GitHub Pages**: `https://username.github.io/repository`
- **Netlify**: `https://app-name.netlify.app`
- **檢測方式**: `!window.location.hostname.includes('localhost')`
- **限制**: CORS 限制，需要代理服務

#### 工作機制
```typescript
// 雲端環境檢測
const isGitHubPages = window.location.hostname.includes('github.io');

if (isGitHubPages) {
  // GitHub Pages 使用 Netlify Functions 作為代理
  const apiUrl = 'https://stock-portfolio-system.netlify.app/.netlify/functions/stock?symbol=2330';
} else {
  // Netlify 環境使用相對路徑
  const apiUrl = '/.netlify/functions/stock?symbol=2330';
}
```

#### 股價獲取流程
```
用戶請求股價
    ↓
前端調用 Netlify Functions
    ↓
Netlify Functions 調用多個 API:
├── Yahoo Finance API (優先)
├── FinMind API (備援)
└── 證交所 API (最後備援)
    ↓
返回股價資料給前端
    ↓
前端顯示股價 (來源: Yahoo Finance (Netlify))
```

#### Netlify Functions 功能
- **多重 API 備援**: Yahoo Finance → FinMind → 證交所
- **智能後綴判斷**: 自動判斷 .TW 或 .TWO
- **錯誤處理**: 404 和 500 錯誤處理
- **快取控制**: HTTP 快取標頭
- **CORS 支援**: 跨域請求支援

### 環境切換邏輯

#### API 配置自動切換
```typescript
// src/config/api.ts
export const shouldUseBackendProxy = (): boolean => {
  const isLocalhost = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1';
  
  if (isLocalhost) {
    return true;  // 本機端使用後端代理
  }
  
  return false;   // 雲端環境使用 Netlify Functions
};
```

#### 股價服務自動適配
```typescript
// src/services/stockPriceService.ts
async getStockPrice(symbol: string): Promise<StockPrice | null> {
  if (!shouldUseBackendProxy()) {
    // 雲端環境：使用 UnifiedStockPriceService
    const unifiedService = new UnifiedStockPriceService();
    return await unifiedService.getStockPrice(symbol);
  }
  
  // 本機端環境：使用後端代理
  const response = await fetch(`${API_CONFIG.BACKEND_PROXY.baseUrl}/api/stock/${symbol}`);
  // ...
}
```

---

## 🎯 核心功能規格

### 1. 多帳戶管理系統

#### 1.1 帳戶資料結構
```typescript
interface Account {
  id: string;                    // 唯一識別碼
  name: string;                  // 帳戶名稱
  brokerageFee: number;          // 證券手續費率 (預設 0.1425%)
  transactionTax: number;        // 交易稅率 (固定 0.3%)
  stockCount: number;            // 股票數量
  createdAt: Date;               // 建立時間
  updatedAt: Date;               // 更新時間
}
```

#### 1.2 帳戶管理功能
- **新增帳戶**: 動態建立新投資帳戶
- **編輯帳戶**: 修改帳戶名稱和費率設定
- **刪除帳戶**: 刪除帳戶及其所有股票記錄
- **帳戶排序**: 支援拖拽重新排序
- **帳戶切換**: 快速切換當前操作帳戶
- **股票統計**: 自動統計每個帳戶的股票數量

#### 1.3 預設帳戶配置
```typescript
const DEFAULT_ACCOUNTS: Account[] = [
  {
    id: 'account-1',
    name: '帳戶1',
    brokerageFee: 0.1425,
    transactionTax: 0.3,
    stockCount: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'account-2', 
    name: '帳戶2',
    brokerageFee: 0.1425,
    transactionTax: 0.3,
    stockCount: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];
```

### 2. Stock List 系統 (股票清單管理)

#### 2.1 Stock List 資料結構
```typescript
interface StockListData {
  date: string;                  // 資料日期 (YYYY-MM-DD)
  timestamp: string;             // 更新時間戳
  count: number;                 // 股票總數
  stocks: Record<string, {
    name: string;                // 股票中文名稱
    industry: string;            // 行業分類
    market: string;              // 市場 (台股)
    marketType?: '上市' | '上櫃' | '興櫃'; // 市場類型
    yahooSuffix?: '.TW' | '.TWO'; // Yahoo Finance 後綴
  }>;
}
```

#### 2.2 Stock List 工作機制

##### 資料來源與更新
```
資料來源: FinMind API (TaiwanStockInfo 資料集)
更新頻率: 每日自動更新
檔案位置: public/stock_list_YYYY-MM-DD.json
當前檔案: stock_list_2026-01-26.json (4054支股票)
```

##### 自動更新機制
```typescript
// 每日檢查與更新流程
class StockListUpdateService {
  // 1. 檢查當前 Stock List 是否為今日資料
  async checkStockListFreshness(): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];
    const stockListData = await stockListService.loadStockList();
    return stockListData?.date === today;
  }
  
  // 2. 觸發更新 (本機端/雲端不同策略)
  async triggerStockListUpdate(): Promise<boolean> {
    const envInfo = stockListService.getEnvironmentInfo();
    
    if (envInfo.isDevelopment) {
      // 本機端: 調用後端 API 或 npm 腳本
      return await this.triggerBackendUpdate();
    } else {
      // 雲端: GitHub Actions 自動更新
      return true;
    }
  }
}
```

##### 更新策略詳解

**本機端更新策略**:
```typescript
// 本機端自動更新流程
private async triggerBackendUpdate(): Promise<boolean> {
  try {
    // 1. 嘗試調用後端更新 API
    const response = await fetch('http://localhost:3001/api/update-stock-list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trigger: 'frontend-auto-check',
        timestamp: new Date().toISOString()
      })
    });
    
    if (response.ok) {
      logger.success('stock', '後端自動更新成功');
      return true;
    }
  } catch (error) {
    // 2. 後端 API 不可用，提供手動更新指引
    logger.info('stock', '請手動執行: npm run update:stock-list');
    return false;
  }
}
```

**雲端更新策略**:
```yaml
# GitHub Actions 自動更新 (.github/workflows/update-stock-list.yml)
name: Update Stock List
on:
  schedule:
    - cron: '0 1 * * 1-5'  # 每個工作日凌晨1點執行
  workflow_dispatch:        # 支援手動觸發

jobs:
  update-stock-list:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.9'
          
      - name: Install dependencies
        run: |
          pip install requests pandas
          
      - name: Update Stock List
        run: |
          python scripts/update_stock_list.py
          
      - name: Commit and Push
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add stock_list_*.json
          git commit -m "Auto update stock list $(date +%Y-%m-%d)" || exit 0
          git push
```

##### 更新腳本實作
```python
# scripts/update_stock_list.py
import requests
import json
from datetime import datetime

def update_stock_list():
    """從 FinMind API 更新股票清單"""
    
    # 1. 調用 FinMind API 獲取最新股票清單
    url = "https://api.finmindtrade.com/api/v4/data"
    params = {
        "dataset": "TaiwanStockInfo",
        "token": ""  # 免費使用
    }
    
    response = requests.get(url, params=params)
    if response.status_code != 200:
        raise Exception(f"API 調用失敗: {response.status_code}")
    
    data = response.json()
    if not data.get('data'):
        raise Exception("API 返回空資料")
    
    # 2. 處理股票資料
    stocks = {}
    for item in data['data']:
        stock_id = item['stock_id']
        stocks[stock_id] = {
            'name': item['stock_name'],
            'industry': item['industry_category'],
            'market': '台股'
        }
    
    # 3. 生成新的股票清單檔案
    today = datetime.now().strftime('%Y-%m-%d')
    stock_list_data = {
        'date': today,
        'timestamp': datetime.now().isoformat(),
        'count': len(stocks),
        'stocks': stocks
    }
    
    # 4. 保存檔案
    filename = f'stock_list_{today}.json'
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(stock_list_data, f, ensure_ascii=False, indent=2)
    
    # 5. 更新主要檔案連結
    with open('stock_list.json', 'w', encoding='utf-8') as f:
        json.dump(stock_list_data, f, ensure_ascii=False, indent=2)
    
    print(f"✅ 股票清單更新完成: {len(stocks)} 支股票")
    return True

if __name__ == "__main__":
    update_stock_list()
```

##### 應用啟動時的檢查機制
```typescript
// App.tsx 中的初始化邏輯
useEffect(() => {
  const initializeStockListService = async () => {
    try {
      // 1. 初始化股票清單更新服務
      stockListUpdateService.init();
      
      // 2. 檢查並更新股票清單 (如果需要)
      await stockListUpdateService.checkAndUpdate();
      
      logger.info('stock', '股票清單服務初始化完成');
    } catch (error) {
      logger.error('stock', '股票清單服務初始化失敗', error);
    }
  };
  
  initializeStockListService();
}, []);
```

##### 定期檢查機制
```typescript
// 每小時檢查一次股票清單新鮮度
class StockListUpdateService {
  private readonly CHECK_INTERVAL = 60 * 60 * 1000; // 1小時
  
  init(): void {
    // 設定定期檢查
    setInterval(() => {
      this.checkStockListFreshness().then(needsUpdate => {
        if (needsUpdate) {
          logger.info('stock', '檢測到股票清單需要更新');
          this.triggerStockListUpdate();
        }
      });
    }, this.CHECK_INTERVAL);
    
    logger.info('stock', '股票清單更新服務已初始化');
  }
}
```

#### 2.4 Stock List 的核心作用

##### 作為股票名稱的單一真相來源
```typescript
// Stock List 提供統一的股票名稱來源
interface StockNameProvider {
  // 1. 搜尋時提供中文名稱
  searchByName(query: string): StockInfo[];
  
  // 2. 股價更新時補充名稱
  getStockName(symbol: string): string | null;
  
  // 3. 新增股票時驗證代碼
  validateStockSymbol(symbol: string): boolean;
}

// 實際使用範例
const getStockInfo = async (symbol: string) => {
  const stockListData = await stockListService.loadStockList();
  const stockInfo = stockListData?.stocks[symbol];
  
  return {
    symbol,
    name: stockInfo?.name || symbol,           // 優先使用 Stock List 名稱
    market: stockInfo?.market || '台灣',
    marketType: stockInfo?.marketType || '上市',
    yahooSuffix: stockInfo?.yahooSuffix || '.TW'
  };
};
```

##### 支援智能股票代碼後綴判斷
```typescript
// Stock List 增強後提供 Yahoo Finance 後綴資訊
const getYahooSymbolFromStockList = (symbol: string): string => {
  const stockListData = stockListService.getCachedData();
  const stockInfo = stockListData?.stocks[symbol];
  
  if (stockInfo?.yahooSuffix) {
    // 使用 Stock List 提供的後綴
    return `${symbol}${stockInfo.yahooSuffix}`;
  }
  
  // 備援：使用智能判斷邏輯
  return stockListService.getYahooSuffix(symbol);
};
```

##### 提供完整的市場分類資訊
```typescript
// Stock List 提供詳細的市場分類
interface EnhancedStockInfo {
  name: string;                    // 中文名稱
  industry: string;                // 行業分類
  market: string;                  // 市場 (台股)
  marketType: '上市' | '上櫃' | '興櫃'; // 具體市場類型
  yahooSuffix: '.TW' | '.TWO';     // Yahoo Finance 後綴
}

// 使用範例：根據市場類型選擇不同的股價 API 策略
const selectPriceAPI = (stockInfo: EnhancedStockInfo) => {
  if (stockInfo.marketType === '上櫃') {
    // 上櫃股票可能需要特殊處理
    return 'yahoo_with_two_suffix';
  } else {
    // 上市股票使用標準處理
    return 'yahoo_with_tw_suffix';
  }
};
```
#### 2.5 環境適應載入策略
```typescript
// 本機端載入策略
async loadFromDevelopment(): Promise<StockListData | null> {
  // 1. 優先嘗試後端 API
  try {
    const response = await fetch('http://localhost:3001/api/stock-list');
    if (response.ok) return await response.json();
  } catch (error) {
    // 後端不可用，使用備用方案
  }
  
  // 2. 備用: 前端檔案
  return await this.loadFromFile();
}

// 雲端載入策略  
async loadFromProduction(): Promise<StockListData | null> {
  // 直接使用前端檔案
  return await this.loadFromFile();
}

// 統一檔案載入
async loadFromFile(): Promise<StockListData | null> {
  const filePaths = [
    './stock_list.json',           // 主要路徑
    '/stock_list.json',            // 備用路徑 1
    './public/stock_list.json',    // 備用路徑 2
  ];
  
  for (const filePath of filePaths) {
    try {
      const response = await fetch(filePath);
      if (response.ok) {
        const data = await response.json();
        if (this.validateStockListData(data)) {
          return this.enhanceStockList(data); // 增強市場類型和後綴
        }
      }
    } catch (error) {
      continue; // 嘗試下一個路徑
    }
  }
  
  return null;
}
```

#### 2.3 Stock List 增強機制
```typescript
// 自動增強股票資訊
private enhanceStockInfo(stockId: string, basicInfo: any): any {
  const code = parseInt(stockId.substring(0, 4));
  const isBondETF = /^00\d{2,3}B$/i.test(stockId);
  
  let marketType: '上市' | '上櫃' | '興櫃';
  let yahooSuffix: '.TW' | '.TWO';
  
  // 特殊案例處理
  const specialCases: Record<string, string> = {
    '8112': '.TW', // 至上：雖在 8000 範圍但需使用 .TW
    '4585': '.TW', // 達明：興櫃股票，最常用 .TW
  };
  
  if (specialCases[stockId]) {
    yahooSuffix = specialCases[stockId] as '.TW' | '.TWO';
    marketType = yahooSuffix === '.TW' ? '上市' : '上櫃';
  } else if (isBondETF) {
    marketType = '上櫃';
    yahooSuffix = '.TWO';
  } else if (code >= 3000 && code <= 8999) {
    marketType = '上櫃';
    yahooSuffix = '.TWO';
  } else {
    marketType = '上市';
    yahooSuffix = '.TW';
  }
  
  return {
    ...basicInfo,
    marketType,
    yahooSuffix
  };
}
```

### 3. 股票搜尋系統

#### 3.1 搜尋流程架構
```
用戶輸入搜尋關鍵字
    ↓
環境檢測 (本機端 vs 雲端)
    ↓
┌─────────────────┬─────────────────┐
│   本機端搜尋     │    雲端搜尋      │
│                │                │
│ 1. 後端 API     │ 1. 前端直接搜尋  │
│ 2. 前端備援     │                │
└─────────────────┴─────────────────┘
    ↓
從 Stock List 取得股票名稱
    ↓
調用對應環境的股價 API 獲取即時股價
    ↓
返回完整搜尋結果 (名稱 + 即時股價)
```

#### 3.2 本機端搜尋實作
```typescript
// 本機端搜尋策略
const searchStocks = async (searchQuery: string): Promise<StockSearchResult[]> => {
  const envInfo = stockListService.getEnvironmentInfo();
  
  if (envInfo.isDevelopment) {
    // 1. 優先使用後端搜尋 API
    try {
      const response = await fetch(API_ENDPOINTS.searchStock(searchQuery));
      if (response.ok) {
        const stockDataArray = await response.json();
        // 後端已整合 Stock List + 即時股價
        return Array.isArray(stockDataArray) ? stockDataArray : [stockDataArray];
      }
    } catch (backendError) {
      // 後端失敗，使用前端備援
    }
  }
  
  // 2. 前端直接搜尋 (雲端環境或本機端備援)
  return await searchStocksDirectly(searchQuery);
};
```

#### 3.3 前端直接搜尋實作
```typescript
// 前端直接搜尋 (使用 Stock List + 雲端股價 API)
const searchStocksDirectly = async (query: string): Promise<StockSearchResult[]> => {
  // 1. 從 Stock List 搜尋股票名稱
  const stockListData = await stockListService.loadStockList();
  if (!stockListData?.stocks) return [];
  
  // 2. 智能搜尋邏輯 (精確匹配優先)
  const stocks = Object.entries(stockListData.stocks);
  const filtered = stocks.filter(([symbol, info]) => {
    const queryUpper = query.toUpperCase().trim();
    const symbolUpper = symbol.toUpperCase();
    const queryLower = query.toLowerCase().trim();
    const nameLower = info.name.toLowerCase();
    
    // 精確匹配股票代碼 (最高優先級)
    if (symbolUpper === queryUpper) return true;
    
    // 股票代碼開頭匹配 (高優先級)
    if (symbolUpper.startsWith(queryUpper)) return true;
    
    // 中文名稱包含查詢字串 (中優先級)
    if (nameLower.includes(queryLower)) return true;
    
    // 股票代碼包含查詢字串 (低優先級，查詢長度>=3)
    if (query.length >= 3 && symbolUpper.includes(queryUpper)) return true;
    
    return false;
  });
  
  // 3. 按匹配優先級排序，限制結果數量
  const sortedFiltered = filtered.sort(([aSymbol], [bSymbol]) => {
    const aSymbolUpper = aSymbol.toUpperCase();
    const bSymbolUpper = bSymbol.toUpperCase();
    const queryUpper = query.toUpperCase().trim();
    
    // 精確匹配排在最前面
    if (aSymbolUpper === queryUpper && bSymbolUpper !== queryUpper) return -1;
    if (bSymbolUpper === queryUpper && aSymbolUpper !== queryUpper) return 1;
    
    // 開頭匹配排在前面
    const aStarts = aSymbolUpper.startsWith(queryUpper);
    const bStarts = bSymbolUpper.startsWith(queryUpper);
    if (aStarts && !bStarts) return -1;
    if (bStarts && !aStarts) return 1;
    
    // 其他按字母順序
    return aSymbolUpper.localeCompare(bSymbolUpper);
  }).slice(0, 10);
  
  // 4. 為每個股票獲取即時股價
  const stocksWithPrice = await Promise.all(
    sortedFiltered.map(async ([symbol, info]) => {
      // 使用環境適應的股價服務
      const priceData = await cloudStockPriceService.getStockPrice(symbol);
      
      return {
        symbol: symbol,
        name: info.name,                    // 來自 Stock List
        price: priceData?.price || 0,       // 來自即時股價 API
        market: info.market || '台灣',
        change: priceData?.change || 0,
        changePercent: priceData?.changePercent || 0
      };
    })
  );
  
  return stocksWithPrice;
};
```

#### 3.4 搜尋結果資料結構
```typescript
interface StockSearchResult {
  symbol: string;        // 股票代碼 (來自 Stock List)
  name: string;          // 股票名稱 (來自 Stock List)
  market: string;        // 市場類型 (來自 Stock List)
  price?: number;        // 即時股價 (來自股價 API)
  change?: number;       // 漲跌金額 (來自股價 API)
  changePercent?: number; // 漲跌百分比 (來自股價 API)
}
```

### 4. 股票記錄管理系統

#### 4.1 股票記錄資料結構
```typescript
interface StockRecord {
  id: string;                    // 唯一識別碼
  accountId: string;             // 所屬帳戶ID
  symbol: string;                // 股票代碼 (如: 2330)
  name: string;                  // 股票名稱 (如: 台積電)
  shares: number;                // 持股數 (含配股調整)
  costPrice: number;             // 原始成本價
  adjustedCostPrice?: number;    // 調整後成本價 (扣除股息)
  purchaseDate: Date;            // 購買日期
  currentPrice: number;          // 現價
  change: number;                // 漲跌金額
  changePercent: number;         // 漲跌百分比
  lastUpdated: Date;             // 最後更新時間
  priceSource: string;           // 價格來源 (Yahoo/FinMind/TWSE)
  dividendRecords?: DividendRecord[]; // 除權息記錄
  lastDividendUpdate?: string;   // 最後除權息更新時間
  isBondETF?: boolean;           // 是否為債券ETF
  market?: string;               // 市場類型 (上市/上櫃/ETF)
}
```

#### 4.2 股票操作功能
- **新增股票**: 手動輸入或搜尋新增股票
- **編輯股票**: 修改持股數、成本價等資訊
- **刪除股票**: 移除股票記錄
- **快速新增**: QuickAddStock 組件提供快速新增
- **股票搜尋**: 支援代碼和名稱搜尋
- **批次操作**: 批次更新股價和除權息

#### 4.3 股價更新機制

##### 本機端股價更新
```typescript
// 本機端使用後端代理
const response = await fetch('http://localhost:3001/api/stock/2330');
const stockData = await response.json();
// stockData.source = 'Yahoo' (後端代理實際調用Yahoo Finance)
```

##### 雲端股價更新
```typescript
// 雲端使用 Netlify Functions
const response = await fetch('/.netlify/functions/stock?symbol=2330');
const stockData = await response.json();
// stockData.source = 'Yahoo Finance (Netlify)'
```

##### 股價更新與 Stock List 整合
```typescript
// 股價更新流程
async function updateStockPrice(stockRecord: StockRecord) {
  // 1. 從 Stock List 獲取股票名稱 (如果沒有)
  if (!stockRecord.name) {
    const stockListData = await stockListService.loadStockList();
    const stockInfo = stockListData?.stocks[stockRecord.symbol];
    if (stockInfo) {
      stockRecord.name = stockInfo.name;
    }
  }
  
  // 2. 根據環境選擇股價 API
  const envInfo = stockListService.getEnvironmentInfo();
  let priceData;
  
  if (envInfo.isDevelopment) {
    // 本機端: 使用後端代理
    priceData = await stockPriceService.getStockPrice(stockRecord.symbol);
  } else {
    // 雲端: 使用雲端股價服務
    priceData = await cloudStockPriceService.getStockPrice(stockRecord.symbol);
  }
  
  // 3. 更新股票記錄
  if (priceData) {
    stockRecord.currentPrice = priceData.price;
    stockRecord.change = priceData.change;
    stockRecord.changePercent = priceData.changePercent;
    stockRecord.priceSource = priceData.source;
    stockRecord.lastUpdated = new Date();
  }
}
```

##### 智能後綴判斷
```typescript
function getYahooSymbol(symbol: string): string {
  const code = parseInt(symbol.substring(0, 4));
  const isBondETF = /^00\d{2,3}B$/i.test(symbol);
  
  // 特殊案例
  if (symbol === '8112') return '8112.TW';  // 至上
  if (symbol === '4585') return '4585.TW';  // 達明
  
  // 債券 ETF 優先櫃買中心
  if (isBondETF) return `${symbol}.TWO`;
  
  // 上櫃股票 (3000-8999) 優先櫃買中心
  if (code >= 3000 && code <= 8999) return `${symbol}.TWO`;
  
  // 上市股票 (1000-2999) 優先證交所
  return `${symbol}.TW`;
}
```

### 5. 除權息計算系統

#### 5.1 除權息記錄結構
```typescript
interface DividendRecord {
  id: string;                    // 唯一識別碼
  stockId: string;               // 關聯股票記錄ID
  symbol: string;                // 股票代碼
  exRightDate: Date;             // 除權息日期
  cashDividendPerShare: number;  // 每股現金股利
  totalCashDividend: number;     // 總現金股利金額
  stockDividendRatio: number;    // 配股比例 (每1000股配X股)
  stockDividendShares: number;   // 配得股數
  sharesBeforeRight: number;     // 除權息前持股數
  sharesAfterRight: number;      // 除權息後持股數
  costPriceBeforeRight: number;  // 除權息前成本價
  costPriceAfterRight: number;   // 除權息後調整成本價
  recordDate?: Date;             // 停止過戶日
  paymentDate?: Date;            // 發放日
  type: 'cash' | 'stock' | 'both'; // 除權息類型
}
```

#### 5.2 計算公式與規則

##### 配股計算公式
```typescript
// 配股數量計算
const stockDividendShares = Math.floor(sharesBeforeRight * stockDividendRatio / 1000);

// 除權後持股數
const sharesAfterRight = sharesBeforeRight + stockDividendShares;
```

##### 調整後成本價公式
```typescript
// 調整後成本價計算
const totalCostBeforeRight = costPriceBeforeRight * sharesBeforeRight;
const totalCashDividend = sharesBeforeRight * cashDividendPerShare;
const adjustedCostPrice = (totalCostBeforeRight - totalCashDividend) / sharesAfterRight;
```

##### 時間順序計算規則
```typescript
// ⚠️ 關鍵：必須按時間從舊到新排序
const sortedDividends = apiDividends.sort((a, b) => 
  new Date(a.exDividendDate).getTime() - new Date(b.exDividendDate).getTime()
);

// 累積計算持股數
let currentShares = stock.shares;
sortedDividends.forEach(dividend => {
  const stockDividendShares = Math.floor(currentShares * dividend.stockDividendRatio / 1000);
  currentShares = currentShares + stockDividendShares; // 累積更新
});
```

#### 5.3 除權息處理服務
```typescript
// 統一除權息處理服務
class RightsEventService {
  static async processStockRightsEvents(
    stockRecord: StockRecord,
    onProgress?: (message: string) => void,
    forceRecalculate: boolean = false
  ): Promise<StockRecord> {
    // 1. 獲取 API 除權息資料
    // 2. 按時間排序 (從舊到新)
    // 3. 累積計算配股
    // 4. 更新股票記錄
  }
}
```

#### 5.4 除權息模式切換
- **不含權息模式** (`excluding_rights`): 顯示原始成本價和損益
- **含權息模式** (`including_rights`): 顯示調整後成本價和損益

### 6. 投資組合統計系統

#### 6.1 統計資料結構
```typescript
interface PortfolioStats {
  totalMarketValue: number;      // 總市值
  totalCost: number;             // 總成本
  totalGainLoss: number;         // 總損益
  totalGainLossPercent: number;  // 總損益率
  totalDividend: number;         // 總股息收入
  totalReturn: number;           // 總報酬 (損益+股息)
  todayChange: number;           // 今日變化
  todayChangePercent: number;    // 今日變化率
  stockCount: number;            // 股票數量
  accountCount: number;          // 帳戶數量
}
```

#### 6.2 統計計算邏輯
```typescript
// 投資組合統計計算
const calculatePortfolioStats = (stocks: StockRecord[], rightsMode: string) => {
  return stocks.reduce((stats, stock) => {
    const costPrice = rightsMode === 'including_rights' 
      ? (stock.adjustedCostPrice || stock.costPrice)
      : stock.costPrice;
    
    const marketValue = stock.currentPrice * stock.shares;
    const totalCost = costPrice * stock.shares;
    const gainLoss = marketValue - totalCost;
    
    stats.totalMarketValue += marketValue;
    stats.totalCost += totalCost;
    stats.totalGainLoss += gainLoss;
    
    return stats;
  }, initialStats);
};
```

#### 6.3 隱私模式保護
```typescript
// 隱私模式顯示邏輯
const formatCurrency = (amount: number, isPrivacyMode: boolean) => {
  if (isPrivacyMode) {
    return '***,***';
  }
  return amount.toLocaleString('zh-TW');
};
```

### 7. 雲端同步系統

#### 7.1 GitHub Gist 整合

##### Gist 資料結構
```typescript
interface GistData {
  accounts: Account[];           // 帳戶資料
  stocks: StockRecord[];         // 股票資料
  metadata: {
    version: string;             // 資料版本
    exportDate: string;          // 匯出日期
    totalAccounts: number;       // 帳戶總數
    totalStocks: number;         // 股票總數
  };
}
```

##### GitHub Token 管理
```typescript
interface GitHubConfig {
  token: string;                 // Personal Access Token
  gistId?: string;              // Gist ID (自動搜尋)
  autoSync: boolean;            // 自動同步開關
  syncInterval: number;         // 同步間隔 (分鐘)
}
```

#### 7.2 同步功能實作

##### 自動搜尋 Gist
```typescript
// 自動搜尋用戶的投資組合 Gists
const searchUserGists = async (token: string) => {
  const response = await fetch('https://api.github.com/gists', {
    headers: { 'Authorization': `token ${token}` }
  });
  
  const gists = await response.json();
  return gists.filter(gist => 
    gist.description?.includes('Stock Portfolio') ||
    Object.keys(gist.files).some(filename => 
      filename.includes('portfolio') || filename.includes('stock')
    )
  );
};
```

##### 資料上傳
```typescript
// 上傳投資組合資料到 GitHub Gist
const uploadToGist = async (data: GistData, token: string) => {
  const gistContent = {
    description: `Stock Portfolio System - ${new Date().toISOString()}`,
    files: {
      'portfolio-data.json': {
        content: JSON.stringify(data, null, 2)
      }
    }
  };
  
  const response = await fetch('https://api.github.com/gists', {
    method: 'POST',
    headers: {
      'Authorization': `token ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(gistContent)
  });
  
  return await response.json();
};
```

##### 資料下載
```typescript
// 從 GitHub Gist 下載投資組合資料
const downloadFromGist = async (gistId: string, token: string) => {
  const response = await fetch(`https://api.github.com/gists/${gistId}`, {
    headers: { 'Authorization': `token ${token}` }
  });
  
  const gist = await response.json();
  const fileContent = Object.values(gist.files)[0]?.content;
  
  return JSON.parse(fileContent);
};
```

#### 7.3 雲端同步開發規範

##### 統一資料導入邏輯
```typescript
// 所有雲端同步都使用相同的資料導入邏輯
const handleCloudDataSync = (cloudData: GistData) => {
  const { importData, setCurrentAccount } = useAppStore.getState();
  
  // 使用統一的 importData 方法
  importData(cloudData.accounts, cloudData.stocks || [], 'replace');
  
  // 自動切換到第一個帳戶
  if (cloudData.accounts.length > 0) {
    setCurrentAccount(cloudData.accounts[0].name);
  }
  
  // 自動啟用隱私模式
  if (!isPrivacyMode) {
    togglePrivacyMode();
  }
};
```

##### 自動容錯機制
```typescript
// 不依賴本地狀態，能自動尋找雲端資料
const downloadData = async (token: string) => {
  try {
    // 自動搜尋，不依賴本地 gistId
    const gists = await searchUserGists(token);
    if (gists.length > 0) {
      return await downloadFromGist(gists[0].id, token);
    }
  } catch (error) {
    // 優雅處理錯誤
    throw new Error(`雲端同步失敗: ${error.message}`);
  }
};
```

### 8. 資料匯入匯出系統

#### 8.1 匯出功能

##### JSON 格式匯出
```typescript
interface ExportData {
  metadata: {
    version: string;             // 系統版本
    exportDate: string;          // 匯出日期
    totalAccounts: number;       // 帳戶總數
    totalStocks: number;         // 股票總數
  };
  accounts: Account[];           // 帳戶資料
  stocks: StockRecord[];         // 股票資料
  settings: {
    isPrivacyMode: boolean;      // 隱私模式
    rightsAdjustmentMode: string; // 除權息模式
  };
}
```

##### Excel 格式匯出
```typescript
// Excel 匯出格式
const excelData = stocks.map(stock => ({
  '帳戶': getAccountName(stock.accountId),
  '股票代碼': stock.symbol,
  '股票名稱': stock.name,
  '持股數': stock.shares,
  '成本價': stock.costPrice,
  '現價': stock.currentPrice,
  '市值': stock.currentPrice * stock.shares,
  '損益': (stock.currentPrice - stock.costPrice) * stock.shares,
  '損益率': ((stock.currentPrice - stock.costPrice) / stock.costPrice * 100).toFixed(2) + '%'
}));
```

#### 8.2 匯入功能

##### 資料驗證
```typescript
// 匯入資料驗證
const validateImportData = (data: any): boolean => {
  if (!data.accounts || !Array.isArray(data.accounts)) return false;
  if (!data.stocks || !Array.isArray(data.stocks)) return false;
  
  // 驗證帳戶資料結構
  for (const account of data.accounts) {
    if (!account.id || !account.name) return false;
  }
  
  // 驗證股票資料結構
  for (const stock of data.stocks) {
    if (!stock.id || !stock.symbol || !stock.accountId) return false;
  }
  
  return true;
};
```

##### 衝突處理
```typescript
// 匯入模式選擇
type ImportMode = 'replace' | 'merge' | 'skip';

const importData = (accounts: Account[], stocks: StockRecord[], mode: ImportMode) => {
  switch (mode) {
    case 'replace':
      // 完全替換現有資料
      setAccounts(accounts);
      setStocks(stocks);
      break;
      
    case 'merge':
      // 合併資料，重複的以新資料為準
      const mergedAccounts = mergeAccounts(existingAccounts, accounts);
      const mergedStocks = mergeStocks(existingStocks, stocks);
      setAccounts(mergedAccounts);
      setStocks(mergedStocks);
      break;
      
    case 'skip':
      // 跳過重複資料，保留現有資料
      const newAccounts = accounts.filter(acc => !existingAccounts.find(e => e.id === acc.id));
      const newStocks = stocks.filter(stock => !existingStocks.find(e => e.id === stock.id));
      setAccounts([...existingAccounts, ...newAccounts]);
      setStocks([...existingStocks, ...newStocks]);
      break;
  }
};
```

---

## 🎨 用戶介面系統

### 1. 設計系統規範

#### 1.1 色彩系統
```css
/* 主要色彩 */
--primary-bg: #0f172a;        /* 深色背景 */
--secondary-bg: #1e293b;      /* 次要背景 */
--accent-bg: #334155;         /* 強調背景 */

/* 功能色彩 */
--success: #10b981;           /* 成功/上漲 */
--danger: #ef4444;            /* 錯誤/下跌 */
--warning: #f59e0b;           /* 警告 */
--info: #3b82f6;              /* 資訊 */

/* 文字色彩 */
--text-primary: #f8fafc;      /* 主要文字 */
--text-secondary: #cbd5e1;    /* 次要文字 */
--text-muted: #64748b;        /* 弱化文字 */
```

#### 1.2 統一圖示系統
```typescript
// src/components/ui/Icons.tsx
export const Icons = {
  Check: ({ size = 'md', className = '' }) => (
    <svg className={`${sizeClasses[size]} ${className}`}>
      <path d="M9 12l2 2 4-4" strokeWidth="3" />
    </svg>
  ),
  
  X: ({ size = 'md', className = '' }) => (
    <svg className={`${sizeClasses[size]} ${className}`}>
      <path d="M18 6L6 18M6 6l12 12" strokeWidth="3" />
    </svg>
  ),
  
  Edit: ({ size = 'md', className = '' }) => (
    <svg className={`${sizeClasses[size]} ${className}`}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeWidth="2" />
    </svg>
  )
};

const sizeClasses = {
  sm: 'w-4 h-4',   // 16px
  md: 'w-5 h-5',   // 20px  
  lg: 'w-6 h-6'    // 24px
};
```

#### 1.3 按鈕設計規範
```typescript
// 按鈕樣式標準
const buttonStyles = {
  success: 'bg-green-600 hover:bg-green-700 text-white',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
  neutral: 'bg-slate-600 hover:bg-slate-700 text-white',
  
  sizes: {
    sm: 'h-6 px-2 text-xs',
    md: 'h-8 px-3 text-sm', 
    lg: 'h-10 px-4 text-base'
  }
};
```

### 2. 響應式設計

#### 2.1 斷點系統
```css
/* TailwindCSS 斷點 */
sm: 640px    /* 小型設備 */
md: 768px    /* 平板設備 */
lg: 1024px   /* 桌面設備 */
xl: 1280px   /* 大型桌面 */
2xl: 1536px  /* 超大桌面 */
```

#### 2.2 佈局適配
```typescript
// 響應式佈局組件
const Layout = () => (
  <div className="min-h-screen bg-slate-900 text-white">
    {/* 桌面版側邊欄 */}
    <div className="hidden lg:block fixed left-0 top-0 h-full w-64">
      <Sidebar />
    </div>
    
    {/* 主要內容區 */}
    <div className="lg:ml-64">
      <Header />
      <main className="p-4 lg:p-6">
        {children}
      </main>
    </div>
    
    {/* 移動版底部導航 */}
    <div className="lg:hidden fixed bottom-0 left-0 right-0">
      <MobileNavigation />
    </div>
  </div>
);
```

### 3. 隱私保護機制

#### 3.1 隱私模式實作
```typescript
// 隱私模式狀態管理
interface PrivacyState {
  isPrivacyMode: boolean;
  togglePrivacyMode: () => void;
}

// 敏感資料顯示邏輯
const formatSensitiveData = (value: number, isPrivacyMode: boolean) => {
  if (isPrivacyMode) {
    return '***,***';
  }
  return value.toLocaleString('zh-TW');
};
```

#### 3.2 隱私保護範圍
- **金額資訊**: 股價、市值、損益、股息
- **持股數量**: 股票持有數量
- **投資組合統計**: 總市值、總損益等
- **個人資料**: 帳戶名稱可選擇隱藏

---

## 🔧 技術實作規格

### 1. 狀態管理系統

#### 1.1 Zustand Store 架構
```typescript
interface AppState {
  // UI 狀態
  isSidebarOpen: boolean;
  isAccountManagerOpen: boolean;
  isAddStockFormOpen: boolean;
  
  // 帳戶狀態  
  currentAccount: string;
  accounts: Account[];
  
  // 股票狀態
  stocks: StockRecord[];
  
  // 設定狀態
  isPrivacyMode: boolean;
  rightsAdjustmentMode: 'excluding_rights' | 'including_rights';
  
  // 股價更新狀態
  isUpdatingPrices: boolean;
  lastPriceUpdate: Date | null;
  priceUpdateProgress: { current: number; total: number; };
  
  // 雲端同步狀態
  cloudSync: {
    isEnabled: boolean;
    token: string;
    gistId?: string;
    lastSync?: Date;
  };
}
```

#### 1.2 持久化策略
```typescript
// Zustand 持久化配置
persist(
  (set, get) => ({ ...storeActions }),
  {
    name: 'stock-portfolio-storage-v7',
    
    // 選擇性持久化
    partialize: (state) => ({
      currentAccount: state.currentAccount,
      accounts: state.accounts,
      stocks: state.stocks,
      isPrivacyMode: state.isPrivacyMode,
      rightsAdjustmentMode: state.rightsAdjustmentMode,
      cloudSync: state.cloudSync
    }),
    
    // 版本遷移
    onRehydrateStorage: () => (state, error) => {
      if (error) {
        localStorage.removeItem('stock-portfolio-storage-v6');
        localStorage.removeItem('stock-portfolio-storage-v7');
        return;
      }
      
      if (state) {
        // 清理舊版本遺留狀態
        if ((state as any).oldField !== undefined) {
          delete (state as any).oldField;
        }
        
        // 確保新狀態存在
        if (!state.rightsAdjustmentMode) {
          state.rightsAdjustmentMode = 'excluding_rights';
        }
      }
    }
  }
)
```

### 2. API 整合系統

#### 2.1 API 優先順序策略 (整合 Stock List)

##### 本機端 API 優先順序
```
股價獲取流程:
1. 從 Stock List 獲取股票基本資訊 (名稱、市場類型、Yahoo後綴)
2. Yahoo Finance API (透過後端代理) - 使用 Stock List 提供的後綴
3. FinMind API (透過後端代理) - 備援股價來源

搜尋流程:
1. 後端搜尋 API (整合 Stock List + 即時股價)
2. 前端直接搜尋 (Stock List 搜尋 + 雲端股價 API)

除權息查詢:
1. FinMind API - 歷史資料最完整
2. 證交所 OpenAPI - 官方資料
```

##### 雲端 API 優先順序  
```
股價獲取流程:
1. 從 Stock List 獲取股票基本資訊 (名稱、市場類型、Yahoo後綴)
2. Vercel Edge Functions - 最穩定，使用 Stock List 後綴資訊
3. Yahoo Finance (AllOrigins) - 第三方代理
4. Yahoo Finance (CodeTabs) - 第三方代理
5. Yahoo Finance (ThingProxy) - 第三方代理

搜尋流程:
1. 前端直接搜尋 (Stock List 搜尋 + 雲端股價 API)

除權息查詢:
1. FinMind API - 歷史資料最完整
2. 證交所 OpenAPI - 官方資料
```

##### Stock List 與 API 整合範例
```typescript
// 整合 Stock List 的股價獲取
async function getStockPriceWithStockList(symbol: string): Promise<StockPrice | null> {
  // 1. 從 Stock List 獲取基本資訊
  const stockListData = await stockListService.loadStockList();
  const stockInfo = stockListData?.stocks[symbol];
  
  if (!stockInfo) {
    logger.warn('stock', `股票代碼 ${symbol} 不在 Stock List 中`);
    return null;
  }
  
  // 2. 根據環境選擇 API 策略
  const envInfo = stockListService.getEnvironmentInfo();
  let priceData: StockPrice | null = null;
  
  if (envInfo.isDevelopment) {
    // 本機端：使用後端代理
    priceData = await stockPriceService.getStockPrice(symbol);
  } else {
    // 雲端：使用 Netlify Functions，傳入 Stock List 的後綴資訊
    const yahooSymbol = `${symbol}${stockInfo.yahooSuffix}`;
    priceData = await cloudStockPriceService.getStockPrice(symbol);
  }
  
  // 3. 整合 Stock List 資訊到結果中
  if (priceData) {
    return {
      ...priceData,
      name: stockInfo.name,           // 來自 Stock List
      market: stockInfo.market,       // 來自 Stock List
      marketType: stockInfo.marketType, // 來自 Stock List
      industry: stockInfo.industry    // 來自 Stock List
    };
  }
  
  return null;
}
```

#### 2.2 錯誤處理規範
```typescript
// 標準 API 錯誤處理
const apiCall = async (url: string) => {
  try {
    const response = await fetch(url, { timeout: 10000 });
    
    if (!response.ok) {
      if (response.status === 404) {
        // 404 是正常情況，不輸出警告
        return null;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知錯誤';
    logger.error('api', `API 調用失敗: ${message}`);
    return null; // 不提供虛假資料
  }
};
```

### 3. 日誌系統

#### 3.1 Logger 架構
```typescript
// 日誌等級定義
enum LogLevel {
  ERROR = 0,   // 錯誤：必須顯示
  WARN = 1,    // 警告：重要提示  
  INFO = 2,    // 資訊：一般訊息（預設）
  DEBUG = 3,   // 調試：詳細資訊
  TRACE = 4    // 追蹤：超詳細資訊
}

// 模組分類
type LogModule = 'global' | 'dividend' | 'stock' | 'api' | 'cloud' | 'import' | 'export' | 'rights';
```

#### 3.2 Logger 使用規範
```typescript
// 正確的日誌使用方式
logger.error('dividend', '更新失敗', error);
logger.warn('api', 'API 回應慢', { time: 5000 });
logger.info('stock', '股價更新完成', { count: 10 });
logger.debug('dividend', '計算配股', { shares: 100 });
logger.success('import', '匯入完成', { accounts: 5 });

// 禁止的做法
console.log('🔍 開始處理...', fullData); // ❌ 直接使用 console.log
```

### 4. 建置與部署

#### 4.1 開發環境配置
```json
// package.json scripts
{
  "scripts": {
    "dev": "vite",
    "build": "vite build", 
    "preview": "vite preview",
    "test": "vitest",
    "lint": "eslint . --ext ts,tsx",
    "check:all": "npm run check:version && npm run check:svg && npm run lint",
    "check:version": "node scripts/check-version-consistency.js",
    "check:svg": "node scripts/check-svg-format.js"
  }
}
```

#### 4.2 環境變數配置
```bash
# .env.local (本機端開發)
VITE_API_BASE_URL=http://localhost:3001
VITE_FINMIND_TOKEN=your_finmind_token
VITE_DEV_SERVER_URL=http://localhost:5173

# .env.production (生產環境)
VITE_API_BASE_URL=https://stock-portfolio-system.netlify.app/.netlify/functions
```

#### 4.3 建置配置
```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2015',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          utils: ['zustand', 'date-fns']
        }
      }
    }
  },
  server: {
    port: 5173,
    host: true
  }
});
```

---

## 🛡️ 安全與品質保證

### 1. 開發標準規範

#### 1.1 安全開發原則
- **疊加式開發**: 只添加功能，不破壞現有功能
- **功能開關**: 新功能可以安全地開啟/關閉
- **快速回滾**: 出問題能立即恢復到穩定版本
- **錯誤隔離**: 單一功能失敗不影響整體系統

#### 1.2 代碼品質檢查
```bash
# 完整品質檢查流程
npm run check:all

# 包含以下檢查項目:
npm run check:version    # 版本號一致性檢查
npm run check:svg        # SVG 格式檢查  
npm run check:state      # 狀態管理檢查
npm run check:rights     # 除權息計算檢查
npm run lint             # ESLint 代碼檢查
npm run test             # 單元測試
```

### 2. 版本管理規範

#### 2.1 版本號系統
```
格式: v{MAJOR}.{MINOR}.{RELEASE}.{PATCH}
範例: v1.0.2.0339

MAJOR: 主要版本 (重大架構變更)
MINOR: 次要版本 (新功能添加)  
RELEASE: 發布版本 (穩定版本發布)
PATCH: 修補版本 (錯誤修復、小改進)
```

#### 2.2 三處同步更新
```typescript
// 1. package.json
"version": "1.0.2.0339"

// 2. src/constants/version.ts  
PATCH: 339

// 3. src/constants/changelog.ts
{
  version: '1.0.2.0339',
  date: '2026-01-27',
  changes: ['修復內容...']
}
```

#### 2.3 版本歸檔規範
```bash
# GitHub 上傳前必須歸檔
mkdir github-releases/github-release-v1.0.2.0339

# 複製專案檔案（排除不需要的目錄）
robocopy . github-releases/github-release-v1.0.2.0339 /E /XD node_modules dist .git export github-releases

# 驗證歸檔完整性後才能上傳
git push origin main
```

### 3. 備援與恢復機制

#### 3.1 自動備份策略
```typescript
// 關鍵操作前自動備份
const createBackup = async (type: 'pre_import' | 'pre_reset' | 'pre_sync') => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${type}_${timestamp}.json`;
  
  const backupData = {
    accounts: useAppStore.getState().accounts,
    stocks: useAppStore.getState().stocks,
    settings: {
      isPrivacyMode: useAppStore.getState().isPrivacyMode,
      rightsAdjustmentMode: useAppStore.getState().rightsAdjustmentMode
    },
    metadata: {
      version: VERSION.FULL,
      backupDate: new Date().toISOString(),
      backupType: type
    }
  };
  
  // 保存到 export/backups/ 目錄
  await saveBackupFile(filename, backupData);
};
```

#### 3.2 恢復機制
```typescript
// 自動恢復觸發條件
const shouldAutoRecover = () => {
  // 檢測系統崩潰
  const lastSession = localStorage.getItem('last-session-timestamp');
  const now = Date.now();
  
  if (lastSession && (now - parseInt(lastSession)) > 5 * 60 * 1000) {
    return true; // 超過5分鐘未正常關閉
  }
  
  // 檢測資料異常
  const accounts = useAppStore.getState().accounts;
  if (!accounts || accounts.length === 0) {
    return true; // 帳戶資料遺失
  }
  
  return false;
};
```

---

## 📊 性能與監控

### 1. 性能指標

#### 1.1 載入性能目標
```
首次內容繪製 (FCP): < 1.5s
最大內容繪製 (LCP): < 2.5s  
累積版面偏移 (CLS): < 0.1
首次輸入延遲 (FID): < 100ms
```

#### 1.2 功能性能目標
```
股價更新 (單支): < 3s
股價更新 (批次10支): < 10s
除權息計算: < 2s
資料匯入匯出: < 5s
雲端同步: < 8s
```

### 2. 快取策略

#### 2.1 本機端快取
```typescript
// 後端服務快取 (5秒)
const stockCache = new Map();
const CACHE_DURATION = 5000;

// 前端快取 (5分鐘)
const frontendCache = new Map();
const FRONTEND_CACHE_DURATION = 5 * 60 * 1000;
```

#### 2.2 雲端快取
```typescript
// Netlify Functions HTTP 快取
headers: {
  'Cache-Control': 'public, max-age=60', // 1分鐘快取
}

// 前端雲端服務快取 (5分鐘)
class CloudStockPriceService {
  private cache = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000;
}
```

### 3. 錯誤監控

#### 3.1 錯誤分類
```typescript
// API 錯誤監控
interface APIError {
  type: 'network' | 'timeout' | 'server' | 'client';
  endpoint: string;
  statusCode?: number;
  message: string;
  timestamp: Date;
}

// 業務邏輯錯誤
interface BusinessError {
  type: 'calculation' | 'validation' | 'data_integrity';
  module: string;
  operation: string;
  details: any;
  timestamp: Date;
}
```

#### 3.2 錯誤處理策略
```typescript
// 優雅降級處理
const handleAPIError = (error: APIError) => {
  switch (error.type) {
    case 'network':
      // 顯示網路錯誤提示，提供重試選項
      showErrorMessage('網路連線異常，請檢查網路設定後重試');
      break;
      
    case 'timeout':
      // 顯示超時提示，自動重試
      showErrorMessage('請求超時，正在自動重試...');
      autoRetry();
      break;
      
    case 'server':
      // 顯示服務器錯誤，建議稍後重試
      showErrorMessage('服務暫時不可用，請稍後再試');
      break;
      
    default:
      // 通用錯誤處理
      showErrorMessage('操作失敗，請重試或聯繫客服');
  }
};
```

---

## 🔮 未來發展規劃

### 1. 短期目標 (v1.1.x)

#### 1.1 功能增強
- **技術分析模組**: 添加基本技術指標 (MA, RSI, MACD)
- **報表系統**: 生成投資績效報表和圖表
- **提醒系統**: 股價提醒和除權息提醒
- **批次操作**: 批次編輯股票資訊

#### 1.2 用戶體驗優化
- **快捷鍵支援**: 常用操作快捷鍵
- **拖拽排序**: 股票列表拖拽排序
- **搜尋增強**: 模糊搜尋和歷史記錄
- **主題系統**: 多種深色主題選擇

### 2. 中期目標 (v1.2.x)

#### 2.1 市場擴展
- **美股支援**: 整合美股資料和交易時間
- **港股支援**: 添加港股市場支援
- **加密貨幣**: 支援主流加密貨幣追蹤
- **外匯市場**: 匯率追蹤和換算

#### 2.2 進階功能
- **投資組合分析**: 風險評估和資產配置建議
- **回測系統**: 歷史投資策略回測
- **API 開放**: 提供第三方整合 API
- **行動應用**: PWA 或原生 App 開發

### 3. 長期目標 (v2.0.x)

#### 3.1 智能化功能
- **AI 分析**: 機器學習投資建議
- **智能提醒**: 基於用戶行為的個性化提醒
- **自動化交易**: 整合券商 API 實現自動交易
- **風險管理**: 智能風險控制和預警

#### 3.2 社群與協作
- **投資組合分享**: 匿名分享投資組合
- **社群討論**: 投資心得和策略討論
- **專家分析**: 專業分析師觀點整合
- **教育內容**: 投資教學和市場分析

---

## 📝 附錄

### A. 開發環境設定

#### A.1 系統要求
```
Node.js: >= 18.0.0
npm: >= 8.0.0
Git: >= 2.30.0
瀏覽器: Chrome/Firefox/Safari 最新版本
```

#### A.2 安裝步驟
```bash
# 1. 克隆專案
git clone https://github.com/username/stock-portfolio-system.git
cd stock-portfolio-system

# 2. 安裝依賴
npm install

# 3. 設定環境變數
cp .env.example .env.local
# 編輯 .env.local 設定 API Token

# 4. 啟動後端服務 (本機端開發)
cd backend
npm install
npm start

# 5. 啟動前端服務
cd ..
npm run dev
```

### B. API 文檔

#### B.1 本機端 API
```
GET /api/stock/:symbol          - 獲取股票資訊
GET /api/stock-search?query=    - 搜尋股票
GET /api/dividend/:symbol       - 獲取除權息資料
GET /health                     - 健康檢查
```

#### B.2 Netlify Functions API
```
GET /.netlify/functions/stock?symbol=           - 獲取股票資訊
GET /.netlify/functions/stock-search?query=     - 搜尋股票  
GET /.netlify/functions/dividend?symbol=        - 獲取除權息資料
GET /.netlify/functions/health                  - 健康檢查
```

### C. 故障排除

#### C.1 常見問題
```
Q: 本機端股價更新失敗
A: 檢查後端服務是否啟動 (localhost:3001)

Q: 雲端環境 CORS 錯誤  
A: 確認使用 Netlify Functions 而非直接 API 調用

Q: 除權息計算錯誤
A: 檢查 RightsEventService 是否正確導入 logger

Q: 版本號不一致
A: 執行 npm run check:version 檢查並手動同步
```

#### C.2 調試工具
```javascript
// 瀏覽器 Console 調試工具
window.debugAppStore = {
  getState: () => useAppStore.getState(),
  clearStorage: () => localStorage.clear(),
  validateState: () => /* 驗證邏輯 */
};
```

### D. 貢獻指南

#### D.1 開發流程
```
1. Fork 專案並建立功能分支
2. 遵循 STEERING 規則開發
3. 執行完整測試 (npm run check:all)
4. 提交 Pull Request
5. Code Review 和合併
```

#### D.2 提交規範
```
feat: 新功能
fix: 錯誤修復  
docs: 文檔更新
style: 代碼格式調整
refactor: 代碼重構
test: 測試相關
chore: 建置工具或輔助工具變動
```

---

**文檔版本**: v1.0.2.0341  
**最後更新**: 2026-01-27  
**維護者**: Stock Portfolio System 開發團隊

**重要說明**: 本規格文檔基於實際運行的系統功能編寫，經過全面的 STEERING 規則檢查和版本一致性驗證。明確定義了本機端和雲端環境的不同工作機制，特別強調了 Stock List 系統作為股票名稱和市場資訊的單一真相來源，以及每日自動更新機制，確保開發者能夠準確理解系統架構和實作細節。所有功能實作都遵循 STEERING 規範，包括版本管理、API 標準、開發標準、UI 設計標準等。