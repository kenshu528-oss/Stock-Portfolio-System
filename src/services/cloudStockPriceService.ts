/**
 * 雲端環境股價獲取服務
 * 專門針對 GitHub Pages 等雲端環境優化的股價獲取策略
 */

import { logger } from '../utils/logger';

interface StockPrice {
  price: number;
  change: number;
  changePercent: number;
  source: string;
  timestamp: string;
}

interface PriceSource {
  name: string;
  priority: number;
  timeout: number;
  fetcher: (symbol: string) => Promise<StockPrice | null>;
}

class CloudStockPriceService {
  private cache = new Map<string, { data: StockPrice; expiry: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5分鐘快取

  /**
   * 獲取股價 - 雲端環境優化版本
   */
  async getStockPrice(symbol: string): Promise<StockPrice | null> {
    // 檢查快取
    const cached = this.getCachedPrice(symbol);
    if (cached) {
      logger.debug('stock', `使用快取股價: ${symbol}`, { price: cached.price });
      return cached;
    }

    // 按優先順序嘗試各種資料源
    const sources = this.getPriceSources();
    
    for (const source of sources) {
      try {
        logger.debug('stock', `嘗試 ${source.name}: ${symbol}`);
        
        const result = await Promise.race([
          source.fetcher(symbol),
          this.createTimeoutPromise(source.timeout)
        ]);

        if (result && result.price > 0) {
          logger.info('stock', `${source.name} 獲取成功`, { 
            symbol, 
            price: result.price,
            source: result.source 
          });
          
          // 快取結果
          this.setCachedPrice(symbol, result);
          return result;
        }
      } catch (error) {
        logger.debug('stock', `${source.name} 失敗: ${symbol}`, error);
        continue;
      }
    }

    logger.warn('stock', `所有股價源都失敗: ${symbol}`);
    return null;
  }

  /**
   * 定義股價資料源（按優先順序）
   * v1.0.2.0315 - 使用 Vercel Edge Functions，最穩定的解決方案
   */
  private getPriceSources(): PriceSource[] {
    return [
      {
        name: 'Vercel Edge Functions',
        priority: 1,
        timeout: 8000,
        fetcher: this.fetchFromVercel.bind(this)
      },
      {
        name: 'Yahoo Finance (AllOrigins)',
        priority: 2,
        timeout: 6000,
        fetcher: this.fetchFromYahooAllOrigins.bind(this)
      },
      {
        name: 'Yahoo Finance (CodeTabs)',
        priority: 3,
        timeout: 6000,
        fetcher: this.fetchFromYahooCodeTabs.bind(this)
      },
      {
        name: 'Yahoo Finance (ThingProxy)',
        priority: 4,
        timeout: 6000,
        fetcher: this.fetchFromYahooThingProxy.bind(this)
      }
    ];
  }

  /**
   * Vercel Edge Functions 股價獲取 - v1.0.2.0315
   * 最穩定的解決方案，無 CORS 問題，直接調用 Yahoo Finance
   */
  private async fetchFromVercel(symbol: string): Promise<StockPrice | null> {
    try {
      // 檢測環境，決定使用哪個 Vercel 端點
      const isGitHubPages = window.location.hostname.includes('github.io');
      const baseUrl = isGitHubPages 
        ? 'https://stock-portfolio-system.vercel.app'  // GitHub Pages 使用 Vercel 代理
        : '';  // 本地開發使用相對路徑

      const vercelUrl = `${baseUrl}/api/stock?symbol=${encodeURIComponent(symbol)}`;
      
      logger.debug('stock', `調用 Vercel Edge Functions: ${symbol}`, { url: vercelUrl });
      
      const response = await fetch(vercelUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`股票代碼 ${symbol} 不存在`);
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data || typeof data.price !== 'number' || data.price <= 0) {
        throw new Error('無效的股價資料');
      }

      logger.info('stock', `Vercel Edge Functions 獲取成功`, { 
        symbol, 
        price: data.price,
        source: data.source || 'Vercel Edge Functions'
      });

      return {
        price: Math.round(data.price * 100) / 100,
        change: Math.round((data.change || 0) * 100) / 100,
        changePercent: Math.round((data.changePercent || 0) * 100) / 100,
        source: data.source || 'Yahoo Finance (Vercel)',
        timestamp: data.timestamp || new Date().toISOString()
      };

    } catch (error) {
      const message = error instanceof Error ? error.message : '未知錯誤';
      logger.warn('stock', `Vercel Edge Functions 失敗: ${symbol}`, { error: message });
      throw new Error(`Vercel 代理失敗: ${message}`);
    }
  }

  /**
   * Netlify Functions 股價獲取 - v1.0.2.0310
   * 使用自己的後端代理，如 Python yfinance 般穩定
   */
  private async fetchFromNetlifyFunctions(symbol: string): Promise<StockPrice | null> {
    try {
      // 檢測當前環境，決定使用哪個 Netlify Functions 端點
      const isGitHubPages = window.location.hostname.includes('github.io');
      const baseUrl = isGitHubPages 
        ? 'https://stock-portfolio-system.netlify.app'  // GitHub Pages 使用 Netlify 代理
        : '';  // 本地開發使用相對路徑

      const functionUrl = `${baseUrl}/.netlify/functions/stock?symbol=${encodeURIComponent(symbol)}`;
      
      logger.debug('stock', `調用 Netlify Functions: ${symbol}`, { url: functionUrl });
      
      const response = await fetch(functionUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`股票代碼 ${symbol} 不存在`);
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data || typeof data.price !== 'number' || data.price <= 0) {
        throw new Error('無效的股價資料');
      }

      logger.info('stock', `Netlify Functions 獲取成功`, { 
        symbol, 
        price: data.price,
        source: data.source || 'Netlify Functions'
      });

      return {
        price: Math.round(data.price * 100) / 100,
        change: Math.round((data.change || 0) * 100) / 100,
        changePercent: Math.round((data.changePercent || 0) * 100) / 100,
        source: data.source || 'Netlify Functions',
        timestamp: data.timestamp || new Date().toISOString()
      };

    } catch (error) {
      const message = error instanceof Error ? error.message : '未知錯誤';
      logger.warn('stock', `Netlify Functions 失敗: ${symbol}`, { error: message });
      throw error;
    }
  }

  /**
   * Yahoo Finance 通過 AllOrigins 代理
   */
  private async fetchFromYahooAllOrigins(symbol: string): Promise<StockPrice | null> {
    const yahooSymbol = this.getYahooSymbol(symbol);
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`;
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(yahooUrl)}`;

    try {
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const proxyData = await response.json();
      const yahooData = JSON.parse(proxyData.contents);
      
      const result = yahooData?.chart?.result?.[0];
      if (!result?.meta) throw new Error('無效的 Yahoo Finance 資料');

      const currentPrice = result.meta.regularMarketPrice || 0;
      const previousClose = result.meta.previousClose || 0;
      const change = currentPrice - previousClose;
      const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

      return {
        price: Math.round(currentPrice * 100) / 100,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        source: 'Yahoo Finance (AllOrigins)',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知錯誤';
      throw new Error(`AllOrigins 代理失敗: ${message}`);
    }
  }

  /**
   * Yahoo Finance 通過 CodeTabs 代理
   */
  private async fetchFromYahooCodeTabs(symbol: string): Promise<StockPrice | null> {
    const yahooSymbol = this.getYahooSymbol(symbol);
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`;
    const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(yahooUrl)}`;

    try {
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const yahooData = await response.json();
      
      const result = yahooData?.chart?.result?.[0];
      if (!result?.meta) throw new Error('無效的 Yahoo Finance 資料');

      const currentPrice = result.meta.regularMarketPrice || 0;
      const previousClose = result.meta.previousClose || 0;
      const change = currentPrice - previousClose;
      const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

      return {
        price: Math.round(currentPrice * 100) / 100,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        source: 'Yahoo Finance (CodeTabs)',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知錯誤';
      throw new Error(`CodeTabs 代理失敗: ${message}`);
    }
  }

  /**
   * Yahoo Finance 通過 ThingProxy 代理
   */
  private async fetchFromYahooThingProxy(symbol: string): Promise<StockPrice | null> {
    const yahooSymbol = this.getYahooSymbol(symbol);
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`;
    const proxyUrl = `https://thingproxy.freeboard.io/fetch/${yahooUrl}`;

    try {
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const yahooData = await response.json();
      
      const result = yahooData?.chart?.result?.[0];
      if (!result?.meta) throw new Error('無效的 Yahoo Finance 資料');

      const currentPrice = result.meta.regularMarketPrice || 0;
      const previousClose = result.meta.previousClose || 0;
      const change = currentPrice - previousClose;
      const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

      return {
        price: Math.round(currentPrice * 100) / 100,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        source: 'Yahoo Finance (ThingProxy)',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知錯誤';
      throw new Error(`ThingProxy 代理失敗: ${message}`);
    }
  }

  /**
   * Yahoo Finance 通過 CORS Anywhere 代理
   */
  private async fetchFromYahooCORSAnywhere(symbol: string): Promise<StockPrice | null> {
    const yahooSymbol = this.getYahooSymbol(symbol);
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`;
    const proxyUrl = `https://cors-anywhere.herokuapp.com/${yahooUrl}`;

    try {
      const response = await fetch(proxyUrl, {
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const yahooData = await response.json();
      
      const result = yahooData?.chart?.result?.[0];
      if (!result?.meta) throw new Error('無效的 Yahoo Finance 資料');

      const currentPrice = result.meta.regularMarketPrice || 0;
      const previousClose = result.meta.previousClose || 0;
      const change = currentPrice - previousClose;
      const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

      return {
        price: Math.round(currentPrice * 100) / 100,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        source: 'Yahoo Finance (CORS Anywhere)',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知錯誤';
      throw new Error(`CORS Anywhere 代理失敗: ${message}`);
    }
  }
  private getYahooSymbol(symbol: string): string {
    if (symbol.includes('.')) return symbol; // 已有後綴

    const code = parseInt(symbol.substring(0, 4));
    const isBondETF = /^00\d{2,3}B$/i.test(symbol);

    if (isBondETF) {
      return `${symbol}.TWO`; // 債券 ETF 優先櫃買中心
    } else if (code >= 3000 && code <= 7999) { // 修正：上櫃股票範圍改為 3000-7999
      return `${symbol}.TWO`; // 上櫃股票優先櫃買中心
    } else {
      return `${symbol}.TW`; // 上市股票（包含 8000-8999）優先證交所
    }
  }





  /**
   * 創建超時 Promise
   */
  private createTimeoutPromise(timeout: number): Promise<null> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), timeout);
    });
  }

  /**
   * 獲取快取的股價
   */
  private getCachedPrice(symbol: string): StockPrice | null {
    const cached = this.cache.get(symbol);
    if (cached && Date.now() < cached.expiry) {
      return cached.data;
    }
    
    // 清除過期快取
    if (cached) {
      this.cache.delete(symbol);
    }
    
    return null;
  }

  /**
   * 設定快取的股價
   */
  private setCachedPrice(symbol: string, price: StockPrice): void {
    this.cache.set(symbol, {
      data: price,
      expiry: Date.now() + this.CACHE_DURATION
    });
  }

  /**
   * 清除所有快取
   */
  clearCache(): void {
    this.cache.clear();
    logger.debug('stock', '股價快取已清除');
  }

  /**
   * 獲取快取統計
   */
  getCacheStats() {
    const now = Date.now();
    const total = this.cache.size;
    const valid = Array.from(this.cache.values()).filter(item => now < item.expiry).length;
    
    return {
      total,
      valid,
      expired: total - valid
    };
  }

  /**
   * 批次獲取多個股票價格
   */
  async getBatchStockPrices(symbols: string[]): Promise<Map<string, StockPrice | null>> {
    const results = new Map<string, StockPrice | null>();
    
    // 控制並發數量，避免過多請求
    const BATCH_SIZE = 3;
    
    for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
      const batch = symbols.slice(i, i + BATCH_SIZE);
      
      const promises = batch.map(async (symbol) => {
        const price = await this.getStockPrice(symbol);
        return { symbol, price };
      });
      
      const batchResults = await Promise.allSettled(promises);
      
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.set(result.value.symbol, result.value.price);
        } else {
          logger.error('stock', `批次獲取股價失敗`, result.reason);
          results.set('unknown', null);
        }
      });
      
      // 批次間稍微延遲，避免過於頻繁的請求
      if (i + BATCH_SIZE < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    return results;
  }
}

// 導出單例
export const cloudStockPriceService = new CloudStockPriceService();

// 導出類型
export type { StockPrice };