// 股價API服務

import { StockPrice, StockSearchResult } from '../types';
import { getApiBaseUrl, shouldUseBackendProxy } from '../config/api';
import { StockSymbolAnalyzer } from './stockSymbolAnalyzer';
import { UnifiedStockPriceService } from './unifiedStockPriceService';
import { logger } from '../utils/logger';

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
      // 檢查是否應該使用後端代理
      if (!shouldUseBackendProxy()) {
        logger.info('stock', `GitHub Pages 環境，使用 CORS 代理獲取 ${symbol} 股價`);
        
        // 🔧 GitHub Pages 環境：使用 CORS 代理服務
        return await this.getStockPriceWithCORSProxy(symbol);
      }
      
      logger.debug('stock', `從後端代理獲取 ${symbol} 股價...`);
      
      const response = await fetch(`${API_CONFIG.BACKEND_PROXY.baseUrl}/stock?symbol=${symbol}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(API_CONFIG.BACKEND_PROXY.timeout)
      });

      if (!response.ok) {
        if (response.status === 404) {
          logger.debug('stock', `${symbol} 股價資料不存在 (404)`);
          return null;
        }
        throw new Error(`後端API錯誤: ${response.status}`);
      }

      const data = await response.json();
      
      if (data && data.symbol) {
        const stockPrice: StockPrice = {
          symbol: data.symbol,
          price: data.price || 0,
          change: data.change || 0,
          changePercent: data.changePercent || 0,
          timestamp: new Date(data.timestamp || Date.now()),
          source: 'Backend Proxy' as any
        };
        
        // 快取股價資料
        this.setCachedPrice(symbol, stockPrice);
        
        return stockPrice;
      }
      
      return null;
    } catch (error) {
      logger.error('stock', `股價獲取失敗 ${symbol}`, error);
      
      // 嘗試使用快取資料
      const cachedPrice = this.getCachedPrice(symbol);
      if (cachedPrice) {
        logger.info('stock', `使用快取的 ${symbol} 股價（API 失敗）`);
        return cachedPrice;
      }
      
      return null;
    }
  }

  // 使用 CORS 代理獲取股價（GitHub Pages 環境）
  private async getStockPriceWithCORSProxy(symbol: string): Promise<StockPrice | null> {
    // 先檢查快取
    const cachedPrice = this.getCachedPrice(symbol);
    if (cachedPrice) {
      logger.debug('stock', `使用快取的 ${symbol} 股價`);
      return cachedPrice;
    }

    try {
      // 方法 1: Yahoo Finance API (主要)
      const yahooResult = await this.fetchYahooFinanceWithProxy(symbol);
      if (yahooResult) {
        this.setCachedPrice(symbol, yahooResult);
        return yahooResult;
      }
    } catch (error) {
      logger.warn('stock', `Yahoo Finance 代理失敗 ${symbol}`, error);
    }

    try {
      // 方法 2: 證交所 API (備援)
      const twseResult = await this.fetchTWSEWithProxy(symbol);
      if (twseResult) {
        this.setCachedPrice(symbol, twseResult);
        return twseResult;
      }
    } catch (error) {
      logger.warn('stock', `證交所 API 代理失敗 ${symbol}`, error);
    }

    logger.error('stock', `所有 API 代理都失敗 ${symbol}`);
    return null;
  }

  // 使用 CORS 代理調用 Yahoo Finance API
  private async fetchYahooFinanceWithProxy(symbol: string): Promise<StockPrice | null> {
    const suffixes = this.getStockSuffixes(symbol);
    
    for (const suffix of suffixes) {
      try {
        const yahooSymbol = `${symbol}${suffix}`;
        const apiUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`;
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(apiUrl)}`;
        
        logger.debug('stock', `Yahoo Finance 代理請求: ${yahooSymbol}`);
        
        const response = await fetch(proxyUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) continue;

        const proxyData = await response.json();
        const data = JSON.parse(proxyData.contents);

        if (data?.chart?.result?.[0]?.meta) {
          const meta = data.chart.result[0].meta;
          const price = meta.regularMarketPrice || 0;
          const previousClose = meta.previousClose || price;
          const change = price - previousClose;
          const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

          const result: StockPrice = {
            symbol: symbol,
            price: price,
            change: change,
            changePercent: changePercent,
            timestamp: new Date(),
            source: 'Yahoo Finance' as any
          };

          logger.success('stock', `Yahoo Finance 成功獲取 ${symbol}`, {
            price: result.price,
            change: result.change,
            suffix: suffix
          });

          return result;
        }
      } catch (error) {
        logger.debug('stock', `Yahoo Finance ${symbol}${suffix} 失敗`, error);
        continue;
      }
    }

    return null;
  }

  // 使用 CORS 代理調用證交所 API
  private async fetchTWSEWithProxy(symbol: string): Promise<StockPrice | null> {
    try {
      const apiUrl = `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=tse_${symbol}.tw|otc_${symbol}.tw`;
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(apiUrl)}`;
      
      logger.debug('stock', `證交所 API 代理請求: ${symbol}`);
      
      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) return null;

      const proxyData = await response.json();
      const data = JSON.parse(proxyData.contents);

      if (data?.msgArray?.[0]) {
        const stockData = data.msgArray[0];
        const price = parseFloat(stockData.z) || 0;
        const previousClose = parseFloat(stockData.y) || price;
        const change = price - previousClose;
        const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

        const result: StockPrice = {
          symbol: symbol,
          price: price,
          change: change,
          changePercent: changePercent,
          timestamp: new Date(),
          source: 'TWSE' as any
        };

        logger.success('stock', `證交所 API 成功獲取 ${symbol}`, {
          price: result.price,
          change: result.change
        });

        return result;
      }
    } catch (error) {
      logger.debug('stock', `證交所 API ${symbol} 失敗`, error);
    }

    return null;
  }

  // 獲取股票後綴（根據代碼判斷市場）
  private getStockSuffixes(symbol: string): string[] {
    const code = parseInt(symbol.substring(0, 4));
    const isBondETF = /^00\d{2,3}B$/i.test(symbol);
    
    if (isBondETF) {
      return ['.TWO', '.TW']; // 債券 ETF：櫃買中心優先
    } else if (code >= 3000 && code <= 8999) {
      return ['.TWO', '.TW']; // 上櫃股票：櫃買中心優先
    } else {
      return ['.TW', '.TWO']; // 上市股票：證交所優先
    }
  }

  // 獲取快取的股價
  private getCachedPrice(symbol: string): StockPrice | null {
    try {
      const cached = localStorage.getItem(`stock_price_${symbol}`);
      if (cached) {
        const data = JSON.parse(cached);
        // 檢查快取是否過期（24小時）
        const cacheAge = Date.now() - new Date(data.timestamp).getTime();
        if (cacheAge < 24 * 60 * 60 * 1000) {
          return {
            ...data,
            timestamp: new Date(data.timestamp)
          };
        }
      }
    } catch (error) {
      logger.debug('stock', `讀取 ${symbol} 快取失敗`, error);
    }
    return null;
  }

  // 設定快取的股價
  private setCachedPrice(symbol: string, price: StockPrice): void {
    try {
      localStorage.setItem(`stock_price_${symbol}`, JSON.stringify(price));
    } catch (error) {
      logger.debug('stock', `設定 ${symbol} 快取失敗`, error);
    }
  }

  // 手動更新股價（供用戶使用）
  async updateStockPriceManually(symbol: string, price: number): Promise<StockPrice> {
    const stockPrice: StockPrice = {
      symbol: symbol,
      price: price,
      change: 0, // 手動輸入時無法計算變化
      changePercent: 0,
      timestamp: new Date(),
      source: 'Manual' as any
    };
    
    this.setCachedPrice(symbol, stockPrice);
    logger.info('stock', `手動更新 ${symbol} 股價: ${price}`);
    
    return stockPrice;
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
      // 檢查是否應該使用後端代理
      if (!shouldUseBackendProxy()) {
        logger.debug('stock', `GitHub Pages 環境，使用外部 API 獲取 ${symbol} 股票名稱...`);
        // 在 GitHub Pages 環境下，直接使用 UnifiedStockPriceService
        const unifiedService = new UnifiedStockPriceService();
        const stockData = await unifiedService.getStockPrice(symbol);
        return stockData?.name || null;
      }
      
      logger.debug('stock', `從後端代理獲取 ${symbol} 股票名稱...`);
      
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
      logger.error('stock', `獲取股票名稱失敗 ${symbol}`, error);
      return null;
    }
  }

  // 搜尋股票（代碼或名稱）
  async searchStock(query: string): Promise<StockSearchResult | null> {
    try {
      const trimmedQuery = query.trim();
      
      // 支援多種股票代碼格式
      if (StockSymbolAnalyzer.isValidStockSymbol(trimmedQuery)) {
        // 檢查是否應該使用後端代理
        if (!shouldUseBackendProxy()) {
          logger.debug('stock', `GitHub Pages 環境，使用外部 API 搜尋 ${trimmedQuery}...`);
          // 在 GitHub Pages 環境下，直接使用 UnifiedStockPriceService
          const unifiedService = new UnifiedStockPriceService();
          const stockData = await unifiedService.getStockPrice(trimmedQuery);
          if (stockData) {
            return {
              symbol: stockData.symbol,
              name: stockData.name,
              market: StockSymbolAnalyzer.getMarketType(stockData.symbol),
              price: stockData.price,
              source: stockData.source
            };
          }
          return null;
        }
        
        logger.debug('stock', `從後端代理搜尋 ${trimmedQuery}...`);
        
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
            market: data.market || StockSymbolAnalyzer.getMarketType(data.symbol),
            price: data.price,
            change: data.change,
            changePercent: data.changePercent
          };
        }
      }

      return null;
    } catch (error) {
      logger.error('stock', `搜尋股票失敗 ${query}`, error);
      return null;
    }
  }

  // 台灣證交所API（備用方法）
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
      logger.error('stock', `TWSE API請求失敗 ${symbol}`, error);
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
      logger.error('stock', `Yahoo API請求失敗 ${symbol}`, error);
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
      logger.error('stock', `Finnhub API請求失敗 ${symbol}`, error);
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
      logger.error('stock', '解析TWSE回應失敗', error);
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
      logger.error('stock', '解析Yahoo回應失敗', error);
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
      logger.error('stock', '解析Finnhub回應失敗', error);
      return null;
    }
  }

}

// 創建單例實例
export const stockPriceService = new StockPriceService();

// 使用真實的後端代理服務
export const stockService = stockPriceService;