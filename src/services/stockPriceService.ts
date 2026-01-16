// 股價API服務

import { StockPrice, StockSearchResult } from '../types';
import { getApiBaseUrl } from '../config/api';

// API配置
const API_CONFIG = {
  // 使用本地後端代理服務
  BACKEND_PROXY: {
    baseUrl: getApiBaseUrl(),
    timeout: 10000
  },
  // 台灣證交所API（備用）
  TWSE: {
    baseUrl: 'https://mis.twse.com.tw/stock/api/getStockInfo.jsp',
    timeout: 10000
  },
  // Yahoo Finance API（備用）
  YAHOO: {
    baseUrl: 'https://query1.finance.yahoo.com/v8/finance/chart',
    timeout: 10000
  },
  // Finnhub API（備用）
  FINNHUB: {
    baseUrl: 'https://finnhub.io/api/v1/quote',
    apiKey: 'your-api-key-here',
    timeout: 10000
  }
};

// 股價服務類別
export class StockPriceService {
  private retryCount = 3;
  private retryDelay = 1000; // 1秒

  // 獲取單一股票價格（主要方法）
  async getStockPrice(symbol: string): Promise<StockPrice | null> {
    try {
      console.log(`從後端代理獲取 ${symbol} 股價...`);
      const response = await fetch(`${API_CONFIG.BACKEND_PROXY.baseUrl}/api/stock/${symbol}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(API_CONFIG.BACKEND_PROXY.timeout)
      });

      if (!response.ok) {
        throw new Error(`後端API錯誤: ${response.status}`);
      }

      const data = await response.json();
      
      if (data && data.symbol) {
        return {
          symbol: data.symbol,
          price: data.price || 0,
          change: data.change || 0,
          changePercent: data.changePercent || 0,
          timestamp: new Date(data.timestamp),
          source: 'Backend Proxy' as 'TWSE' | 'Yahoo' | 'Investing'
        };
      }
      
      return null;
    } catch (error) {
      console.error(`後端代理請求失敗 ${symbol}:`, error);
      return null;
    }
  }

  // 批次獲取多支股票價格
  async getBatchStockPrices(symbols: string[]): Promise<Map<string, StockPrice>> {
    const results = new Map<string, StockPrice>();
    
    // 並行請求，但限制並發數量避免被限流
    const batchSize = 5;
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      const promises = batch.map(symbol => this.getStockPrice(symbol));
      
      const batchResults = await Promise.allSettled(promises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          results.set(batch[index], result.value);
        }
      });
      
      // 批次間延遲，避免API限流
      if (i + batchSize < symbols.length) {
        await this.delay(500);
      }
    }
    
    return results;
  }

  // 獲取股票名稱
  async getStockName(symbol: string): Promise<string | null> {
    try {
      console.log(`從後端代理獲取 ${symbol} 股票名稱...`);
      // 使用 /api/stock 端點獲取股票資訊（包含名稱）
      const response = await fetch(`${API_CONFIG.BACKEND_PROXY.baseUrl}/api/stock/${symbol}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(API_CONFIG.BACKEND_PROXY.timeout)
      });

      if (!response.ok) {
        throw new Error(`後端API錯誤: ${response.status}`);
      }

      const data = await response.json();
      
      if (data && data.name) {
        return data.name;
      }
      
      return null;
    } catch (error) {
      console.error(`獲取股票名稱失敗 ${symbol}:`, error);
      return null;
    }
  }

  // 搜尋股票（代碼或名稱）
  async searchStock(query: string): Promise<StockSearchResult | null> {
    try {
      const trimmedQuery = query.trim();
      
      // 支援多種股票代碼格式
      if (this.isValidStockSymbol(trimmedQuery)) {
        console.log(`從後端代理搜尋 ${trimmedQuery}...`);
        // 使用 /api/stock 端點獲取股票資訊
        const response = await fetch(`${API_CONFIG.BACKEND_PROXY.baseUrl}/api/stock/${trimmedQuery}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(API_CONFIG.BACKEND_PROXY.timeout)
        });

        if (!response.ok) {
          throw new Error(`後端API錯誤: ${response.status}`);
        }

        const data = await response.json();
        
        if (data && data.symbol && data.name) {
          return {
            symbol: data.symbol,
            name: data.name,
            market: data.market || this.getStockMarket(data.symbol),
            price: data.price,
            change: data.change,
            changePercent: data.changePercent
          };
        }
      }

      return null;
    } catch (error) {
      console.error(`搜尋股票失敗 ${query}:`, error);
      return null;
    }
  }

  // 驗證股票代碼格式
  private isValidStockSymbol(symbol: string): boolean {
    // 支援多種格式：
    // 4位數字：2330, 0050
    // 5位數字ETF：00646
    // 6位數字+字母ETF：00679B, 00981A
    // 4位數字+字母（特殊情況）：1565A
    const upperSymbol = symbol.toUpperCase();
    
    // 4位數字，可選1個字母
    if (/^\d{4}[A-Z]?$/.test(upperSymbol)) {
      // 如果有字母，必須是特定的有效字母
      if (upperSymbol.length === 5) {
        const letter = upperSymbol[4];
        return ['A', 'B', 'C', 'P', 'U', 'L', 'R'].includes(letter);
      }
      return true;
    }
    
    // 00開頭的ETF格式：00646 或 00679B 或 00981A
    if (/^00\d{3}[A-Z]?$/.test(upperSymbol)) {
      return true;
    }
    
    return false;
  }

  // 判斷股票市場
  private getStockMarket(symbol: string): string {
    // ETF判斷
    if (/^00\d{2,3}[A-Z]?$/.test(symbol)) {
      return 'ETF';
    }
    
    // 上市股票（1000-2999, 部分3000-3999）
    const code = parseInt(symbol.substring(0, 4));
    if ((code >= 1000 && code <= 2999) || 
        (code >= 3000 && code <= 3999 && this.isListedStock(symbol))) {
      return '上市';
    }
    
    // 上櫃股票（主要是3000-8999）
    if (code >= 3000 && code <= 8999) {
      return '上櫃';
    }
    
    // 興櫃股票
    if (this.isEmergingStock(symbol)) {
      return '興櫃';
    }
    
    return '台灣';
  }

  // 判斷是否為上市股票
  private isListedStock(symbol: string): boolean {
    const listedRanges = [
      { start: 1000, end: 1999 },
      { start: 2000, end: 2999 },
      { start: 3000, end: 3099 }
    ];
    
    const code = parseInt(symbol.substring(0, 4));
    return listedRanges.some(range => code >= range.start && code <= range.end);
  }

  // 判斷是否為興櫃股票
  private isEmergingStock(symbol: string): boolean {
    const emergingStocks = ['1565', '1566', '1567', '3663', '3664', '3665', '4126', '4127', '4128'];
    return emergingStocks.includes(symbol);
  }

  // 台灣證交所API
  private async getTWSEPrice(symbol: string): Promise<StockPrice | null> {
    try {
      // 使用證交所即時股價API
      const response = await fetch(`${API_CONFIG.TWSE.baseUrl}?ex_ch=tse_${symbol}.tw&json=1&delay=0`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(API_CONFIG.TWSE.timeout)
      });

      if (!response.ok) {
        throw new Error(`TWSE API錯誤: ${response.status}`);
      }

      const data = await response.json();
      return this.parseTWSEResponse(symbol, data);
    } catch (error) {
      console.error(`TWSE API請求失敗 ${symbol}:`, error);
      throw error;
    }
  }

  // Yahoo Finance API
  private async getYahooPrice(symbol: string): Promise<StockPrice | null> {
    try {
      // 台灣股票需要加上.TW後綴
      const yahooSymbol = `${symbol}.TW`;
      const response = await fetch(`${API_CONFIG.YAHOO.baseUrl}/${yahooSymbol}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        signal: AbortSignal.timeout(API_CONFIG.YAHOO.timeout)
      });

      if (!response.ok) {
        throw new Error(`Yahoo API錯誤: ${response.status}`);
      }

      const data = await response.json();
      return this.parseYahooResponse(symbol, data);
    } catch (error) {
      console.error(`Yahoo API請求失敗 ${symbol}:`, error);
      throw error;
    }
  }

  // Finnhub API（備用）
  private async getFinnhubPrice(symbol: string): Promise<StockPrice | null> {
    try {
      // Finnhub使用不同的台灣股票格式
      const finnhubSymbol = `${symbol}.TW`;
      const response = await fetch(`${API_CONFIG.FINNHUB.baseUrl}?symbol=${finnhubSymbol}&token=${API_CONFIG.FINNHUB.apiKey}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(API_CONFIG.FINNHUB.timeout)
      });

      if (!response.ok) {
        throw new Error(`Finnhub API錯誤: ${response.status}`);
      }

      const data = await response.json();
      return this.parseFinnhubResponse(symbol, data);
    } catch (error) {
      console.error(`Finnhub API請求失敗 ${symbol}:`, error);
      throw error;
    }
  }

  // 重試機制
  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error;
    
    for (let i = 0; i < this.retryCount; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        if (i < this.retryCount - 1) {
          await this.delay(this.retryDelay * Math.pow(2, i));
        }
      }
    }
    
    throw lastError!;
  }

  // 延遲函數
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 解析TWSE回應
  private parseTWSEResponse(symbol: string, data: any): StockPrice | null {
    try {
      if (data && data.msgArray && data.msgArray.length > 0) {
        const stockData = data.msgArray[0];
        const price = parseFloat(stockData.z) || parseFloat(stockData.y); // z是成交價，y是昨收價
        const previousClose = parseFloat(stockData.y);
        const change = price - previousClose;
        
        return {
          symbol,
          price,
          change,
          changePercent: previousClose > 0 ? (change / previousClose) * 100 : 0,
          timestamp: new Date(),
          source: 'TWSE'
        };
      }
      return null;
    } catch (error) {
      console.error(`解析TWSE回應失敗:`, error);
      return null;
    }
  }

  // 解析Yahoo回應
  private parseYahooResponse(symbol: string, data: any): StockPrice | null {
    try {
      if (data?.chart?.result?.[0]?.meta) {
        const meta = data.chart.result[0].meta;
        const price = meta.regularMarketPrice || meta.previousClose;
        const previousClose = meta.previousClose;
        const change = price - previousClose;
        
        // 只使用API返回的股票名稱，如果沒有則不添加名稱
        const stockName = meta.longName || meta.shortName;
        
        const result: StockPrice = {
          symbol,
          price,
          change,
          changePercent: (change / previousClose) * 100,
          timestamp: new Date(),
          source: 'Yahoo'
        };
        
        // 如果有名稱，才添加到結果中
        if (stockName) {
          (result as any).name = stockName;
        }
        
        return result;
      }
      return null;
    } catch (error) {
      console.error(`解析Yahoo回應失敗:`, error);
      return null;
    }
  }

  // 解析Finnhub回應
  private parseFinnhubResponse(symbol: string, data: any): StockPrice | null {
    try {
      if (data && typeof data.c === 'number') {
        const currentPrice = data.c; // current price
        const previousClose = data.pc; // previous close
        const change = currentPrice - previousClose;
        
        return {
          symbol,
          price: currentPrice,
          change,
          changePercent: previousClose > 0 ? (change / previousClose) * 100 : 0,
          timestamp: new Date(),
          source: 'Investing' as 'TWSE' | 'Yahoo' | 'Investing'
        };
      }
      return null;
    } catch (error) {
      console.error(`解析Finnhub回應失敗:`, error);
      return null;
    }
  }

}

// 創建單例實例
export const stockPriceService = new StockPriceService();

// 使用真實的後端代理服務
export const stockService = stockPriceService;