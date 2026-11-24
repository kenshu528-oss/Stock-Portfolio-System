// 資料生成器（用於測試和開發）

import { StockRecord, Account, DividendRecord, StockSearchResult } from '../types';

// 生成隨機ID
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 生成隨機股票代碼
export function generateStockSymbol(): string {
  const symbols = ['2330', '2317', '2454', '2412', '1301', '1303', '2881', '2882', '0050', '0056'];
  return symbols[Math.floor(Math.random() * symbols.length)];
}

// 生成隨機股票名稱
export function generateStockName(symbol: string): string {
  const nameMap: Record<string, string> = {
    '2330': '台積電',
    '2317': '鴻海',
    '2454': '聯發科',
    '2412': '中華電',
    '1301': '台塑',
    '1303': '南亞',
    '2881': '富邦金',
    '2882': '國泰金',
    '0050': '元大台灣50',
    '0056': '元大高股息'
  };
  return nameMap[symbol] || `股票${symbol}`;
}

// 生成隨機價格
export function generatePrice(min: number = 10, max: number = 1000): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

// 生成隨機整數
export function generateInteger(min: number = 1, max: number = 10000): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 生成隨機日期
export function generateDate(startDate?: Date, endDate?: Date): Date {
  const start = startDate || new Date(2020, 0, 1);
  const end = endDate || new Date();
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// 生成隨機帳戶
export function generateAccount(overrides: Partial<Account> = {}): Account {
  const accountNames = ['元大證券', '富邦證券', '國泰證券', '中信證券', '永豐證券'];
  
  return {
    id: generateId(),
    name: accountNames[Math.floor(Math.random() * accountNames.length)],
    stockCount: generateInteger(0, 20),
    brokerageFee: 0.1425,
    transactionTax: 0.3,
    createdAt: generateDate(),
    ...overrides
  };
}

// 生成隨機股票記錄
export function generateStockRecord(overrides: Partial<StockRecord> = {}): StockRecord {
  const symbol = generateStockSymbol();
  const costPrice = generatePrice(50, 500);
  const currentPrice = generatePrice(costPrice * 0.8, costPrice * 1.5);
  
  return {
    id: generateId(),
    accountId: overrides.accountId || generateId(),
    symbol,
    name: generateStockName(symbol),
    shares: generateInteger(100, 5000),
    costPrice,
    adjustedCostPrice: costPrice,
    purchaseDate: generateDate(new Date(2020, 0, 1), new Date()),
    currentPrice,
    lastUpdated: new Date(),
    priceSource: ['TWSE', 'Yahoo', 'Investing'][Math.floor(Math.random() * 3)] as any,
    ...overrides
  };
}

// 生成隨機股息記錄
export function generateDividendRecord(stockRecord: StockRecord, overrides: Partial<DividendRecord> = {}): DividendRecord {
  return {
    id: generateId(),
    stockId: stockRecord.id,
    symbol: stockRecord.symbol,
    exDividendDate: generateDate(stockRecord.purchaseDate, new Date()),
    dividendPerShare: Math.round(Math.random() * 5 * 100) / 100, // 0-5元
    totalDividend: 0, // 會在計算時更新
    shares: stockRecord.shares,
    ...overrides
  };
}

// 生成隨機股票搜尋結果
export function generateStockSearchResult(overrides: Partial<StockSearchResult> = {}): StockSearchResult {
  const symbol = generateStockSymbol();
  const price = generatePrice(50, 1000);
  const change = Math.round((Math.random() - 0.5) * 20 * 100) / 100; // -10 到 +10
  
  return {
    symbol,
    name: generateStockName(symbol),
    market: '台灣',
    price,
    change,
    changePercent: Math.round((change / price) * 100 * 100) / 100,
    ...overrides
  };
}

// 生成測試用帳戶列表
export function generateTestAccounts(count: number = 3): Account[] {
  return Array.from({ length: count }, (_, index) => 
    generateAccount({ 
      name: `測試帳戶${index + 1}`,
      stockCount: generateInteger(0, 10)
    })
  );
}

// 生成測試用股票記錄列表
export function generateTestStocks(accountId: string, count: number = 5): StockRecord[] {
  const symbols = ['2330', '2317', '2454', '2412', '1301'];
  return symbols.slice(0, count).map(symbol => 
    generateStockRecord({ 
      accountId,
      symbol,
      name: generateStockName(symbol)
    })
  );
}

// 生成完整的測試資料集
export function generateTestDataSet() {
  const accounts = generateTestAccounts(2);
  const stocks: StockRecord[] = [];
  const dividends: DividendRecord[] = [];

  accounts.forEach(account => {
    const accountStocks = generateTestStocks(account.id, 3);
    stocks.push(...accountStocks);
    
    // 為每支股票生成1-2筆股息記錄
    accountStocks.forEach(stock => {
      const dividendCount = Math.floor(Math.random() * 2) + 1;
      for (let i = 0; i < dividendCount; i++) {
        const dividend = generateDividendRecord(stock);
        dividend.totalDividend = dividend.dividendPerShare * dividend.shares;
        dividends.push(dividend);
      }
    });
    
    // 更新帳戶的股票數量
    account.stockCount = accountStocks.length;
  });

  return { accounts, stocks, dividends };
}

// 模擬股票資料庫
export const MOCK_STOCK_DATABASE: StockSearchResult[] = [
  { symbol: '2330', name: '台積電', market: '台灣', price: 580, change: 5, changePercent: 0.87 },
  { symbol: '2317', name: '鴻海', market: '台灣', price: 105, change: -1, changePercent: -0.94 },
  { symbol: '2454', name: '聯發科', market: '台灣', price: 1020, change: 15, changePercent: 1.49 },
  { symbol: '2412', name: '中華電', market: '台灣', price: 123, change: 0, changePercent: 0 },
  { symbol: '1301', name: '台塑', market: '台灣', price: 95, change: -2, changePercent: -2.06 },
  { symbol: '1303', name: '南亞', market: '台灣', price: 78, change: 1, changePercent: 1.30 },
  { symbol: '2881', name: '富邦金', market: '台灣', price: 65, change: 0.5, changePercent: 0.78 },
  { symbol: '2882', name: '國泰金', market: '台灣', price: 58, change: -0.5, changePercent: -0.85 },
  { symbol: '0050', name: '元大台灣50', market: '台灣', price: 145, change: 1.2, changePercent: 0.83 },
  { symbol: '0056', name: '元大高股息', market: '台灣', price: 35, change: -0.3, changePercent: -0.85 }
];

// 根據股票代碼搜尋
export function searchStockBySymbol(symbol: string): StockSearchResult | undefined {
  return MOCK_STOCK_DATABASE.find(stock => 
    stock.symbol.toLowerCase() === symbol.toLowerCase()
  );
}

// 根據名稱搜尋股票
export function searchStockByName(name: string): StockSearchResult[] {
  const query = name.toLowerCase();
  return MOCK_STOCK_DATABASE.filter(stock => 
    stock.name.toLowerCase().includes(query) ||
    stock.symbol.toLowerCase().includes(query)
  );
}

// 生成隨機市場資料
export function generateMarketData() {
  return MOCK_STOCK_DATABASE.map(stock => ({
    ...stock,
    price: generatePrice((stock.price || 50) * 0.9, (stock.price || 50) * 1.1),
    change: Math.round((Math.random() - 0.5) * 10 * 100) / 100,
    changePercent: Math.round((Math.random() - 0.5) * 5 * 100) / 100
  }));
}