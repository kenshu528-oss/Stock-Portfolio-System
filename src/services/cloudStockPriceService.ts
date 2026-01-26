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
   * 獲取股價 - 雲端環境優化版本 (v1.0.2.0323 - 添加重試機制)
   */
  async getStockPrice(symbol: string, maxRetries: number = 2): Promise<StockPrice | null> {
    // 檢查快取
    const cached = this.getCachedPrice(symbol);
    if (cached) {
      logger.debug('stock', `使用快取股價: ${symbol}`, { price: cached.price });
      return cached;
    }

    // 按優先順序嘗試各種資料源，帶重試機制
    const sources = this.getPriceSources();
    
    for (const source of sources) {
      let lastError: Error | null = null;
      
      // 對每個來源進行重試
      for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
        try {
          logger.debug('stock', `嘗試 ${source.name}: ${symbol} (第${attempt}次)`, { 
            attempt, 
            maxRetries: maxRetries + 1 
          });
          
          const result = await Promise.race([
            source.fetcher(symbol),
            this.createTimeoutPromise(source.timeout)
          ]);

          if (result && result.price > 0) {
            logger.info('stock', `${source.name} 獲取成功`, { 
              symbol, 
              price: result.price,
              source: result.source,
              attempt
            });
            
            // 快取結果
            this.setCachedPrice(symbol, result);
            return result;
          }
        } catch (error) {
          lastError = error instanceof Error ? error : new Error('未知錯誤');
          
          if (attempt <= maxRetries) {
            logger.debug('stock', `${source.name} 第${attempt}次失敗，準備重試: ${symbol}`, { 
              error: lastError.message,
              nextAttempt: attempt + 1
            });
            
            // 重試前等待一小段時間
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          } else {
            logger.debug('stock', `${source.name} 所有重試都失敗: ${symbol}`, { 
              error: lastError.message,
              totalAttempts: attempt
            });
          }
        }
      }
    }

    logger.warn('stock', `所有股價源都失敗: ${symbol}`, { 
      sourcesAttempted: sources.length,
      retriesPerSource: maxRetries + 1
    });
    return null;
  }

  /**
   * 定義股價資料源（按優先順序）
   * v1.0.2.0328 - 基於成功倉庫經驗，TWSE API 優先
   */
  private getPriceSources(): PriceSource[] {
    return [
      {
        name: 'TWSE (台灣證交所)',
        priority: 1,
        timeout: 8000,
        fetcher: this.fetchFromTWSE.bind(this)
      },
      {
        name: 'Yahoo Finance (AllOrigins)',
        priority: 2,
        timeout: 5000,
        fetcher: this.fetchFromYahooAllOrigins.bind(this)
      },
      {
        name: 'Yahoo Finance (CodeTabs)',
        priority: 3,
        timeout: 5000,
        fetcher: this.fetchFromYahooCodeTabs.bind(this)
      },
      {
        name: 'Yahoo Finance (ThingProxy)',
        priority: 4,
        timeout: 5000,
        fetcher: this.fetchFromYahooThingProxy.bind(this)
      },
      {
        name: 'Static Price (Fallback)',
        priority: 5,
        timeout: 1000,
        fetcher: this.fetchStaticPrice.bind(this)
      }
    ];
  }

  /**
   * Alpha Vantage API - v1.0.2.0326
   * 免費的股價 API，支援 CORS
   */
  private async fetchFromAlphaVantage(symbol: string): Promise<StockPrice | null> {
    try {
      // Alpha Vantage 免費 API Key (demo key)
      const apiKey = 'demo';
      const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const quote = data['Global Quote'];
      
      if (!quote) throw new Error('無股價資料');

      const currentPrice = parseFloat(quote['05. price']) || 0;
      const change = parseFloat(quote['09. change']) || 0;
      const changePercent = parseFloat(quote['10. change percent']?.replace('%', '')) || 0;

      if (currentPrice > 0) {
        return {
          price: Math.round(currentPrice * 100) / 100,
          change: Math.round(change * 100) / 100,
          changePercent: Math.round(changePercent * 100) / 100,
          source: 'Alpha Vantage',
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      // Alpha Vantage 可能不支援台股，繼續嘗試其他方案
    }

    throw new Error('Alpha Vantage 失敗');
  }

  /**
   * IEX Cloud API - v1.0.2.0326
   * 另一個免費的股價 API
   */
  private async fetchFromIEXCloud(symbol: string): Promise<StockPrice | null> {
    try {
      // IEX Cloud 免費版本
      const url = `https://cloud.iexapis.com/stable/stock/${symbol}/quote?token=pk_test`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      
      const currentPrice = data.latestPrice || 0;
      const change = data.change || 0;
      const changePercent = data.changePercent ? data.changePercent * 100 : 0;

      if (currentPrice > 0) {
        return {
          price: Math.round(currentPrice * 100) / 100,
          change: Math.round(change * 100) / 100,
          changePercent: Math.round(changePercent * 100) / 100,
          source: 'IEX Cloud',
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      // IEX Cloud 可能不支援台股
    }

    throw new Error('IEX Cloud 失敗');
  }

  /**
   * Yahoo Finance 無 CORS 方案 - v1.0.2.0326
   * 嘗試使用 JSONP 或其他無 CORS 限制的方法
   */
  private async fetchFromYahooNoCORS(symbol: string): Promise<StockPrice | null> {
    const yahooSymbol = this.getYahooSymbol(symbol);
    
    try {
      // 嘗試使用 Yahoo Finance 的 CSV API (通常沒有 CORS 限制)
      const csvUrl = `https://query1.finance.yahoo.com/v7/finance/download/${yahooSymbol}?period1=0&period2=9999999999&interval=1d&events=history`;
      
      const response = await fetch(csvUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const csvText = await response.text();
      const lines = csvText.split('\n');
      
      if (lines.length < 2) throw new Error('無資料');
      
      // 取最後一行資料 (最新的股價)
      const lastLine = lines[lines.length - 2]; // -2 因為最後一行可能是空的
      const values = lastLine.split(',');
      
      if (values.length >= 5) {
        const currentPrice = parseFloat(values[4]) || 0; // Close price
        const previousPrice = lines.length > 2 ? parseFloat(lines[lines.length - 3].split(',')[4]) || currentPrice : currentPrice;
        const change = currentPrice - previousPrice;
        const changePercent = previousPrice > 0 ? (change / previousPrice) * 100 : 0;

        if (currentPrice > 0) {
          return {
            price: Math.round(currentPrice * 100) / 100,
            change: Math.round(change * 100) / 100,
            changePercent: Math.round(changePercent * 100) / 100,
            source: 'Yahoo Finance (CSV)',
            timestamp: new Date().toISOString()
          };
        }
      }
    } catch (error) {
      // CSV API 也失敗了
    }

    throw new Error('Yahoo Finance 無 CORS 方案失敗');
  }

  /**
   * 靜態價格備援 - v1.0.2.0325
   * 當所有 API 都失敗時，提供基本的靜態價格
   */
  private async fetchStaticPrice(symbol: string): Promise<StockPrice | null> {
    // 提供一些常見股票的靜態價格作為最後備援
    const staticPrices: Record<string, number> = {
      '2330': 1760,  // 台積電
      '2317': 120,   // 鴻海
      '2454': 1200,  // 聯發科
      '2886': 40,    // 兆豐金
      '0050': 170,   // 元大台灣50
      '00940': 9.79, // 元大台灣價值高息 (更新為正確價格)
      '6188': 110,   // 廣明
      '4585': 340,   // 達明
    };

    const price = staticPrices[symbol];
    if (price) {
      logger.info('stock', `使用靜態價格: ${symbol}`, { price });
      return {
        price,
        change: 0,
        changePercent: 0,
        source: '靜態價格 (備援)',
        timestamp: new Date().toISOString()
      };
    }

    throw new Error('無靜態價格資料');
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
   * TWSE (台灣證交所) API - v1.0.2.0328
   * 基於成功倉庫 v1.2.2.0035 的實作經驗
   */
  private async fetchFromTWSE(symbol: string): Promise<StockPrice | null> {
    try {
      logger.debug('stock', `TWSE API 請求: ${symbol}`, { symbol });

      // 基於成功倉庫的 TWSE API 端點
      const response = await fetch(
        `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=tse_${symbol}.tw|otc_${symbol}.tw`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data?.msgArray || data.msgArray.length === 0) {
        throw new Error('無股價資料');
      }

      const stockData = data.msgArray[0];
      if (!stockData || !stockData.z) {
        throw new Error('股價資料格式錯誤');
      }

      const currentPrice = parseFloat(stockData.z) || 0;
      const previousClose = parseFloat(stockData.y) || 0;
      const change = currentPrice - previousClose;
      const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

      if (currentPrice <= 0) {
        throw new Error(`無效股價: ${currentPrice}`);
      }

      logger.info('stock', `TWSE 獲取成功: ${symbol}`, { 
        price: currentPrice,
        change,
        changePercent: changePercent.toFixed(2) + '%',
        market: stockData.ex === 'tse' ? '上市' : '上櫃'
      });

      return {
        price: Math.round(currentPrice * 100) / 100,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        source: 'TWSE (台灣證交所)',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      const message = error instanceof Error ? error.message : '未知錯誤';
      logger.debug('stock', `TWSE 失敗: ${symbol}`, { error: message });
      throw new Error(`TWSE API 失敗: ${message}`);
    }
  }

  /**
   * Yahoo Finance 通過 AllOrigins 代理 - v1.0.2.0327 優化版
   * 基於成功倉庫 v1.2.2.0035 的實作經驗
   */
  private async fetchFromYahooAllOrigins(symbol: string): Promise<StockPrice | null> {
    const yahooSymbol = this.getYahooSymbol(symbol);
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`;
    
    // 使用與成功倉庫相同的 AllOrigins 代理方式
    const corsProxy = 'https://api.allorigins.win/raw?url=';
    const proxyUrl = corsProxy + encodeURIComponent(yahooUrl);

    try {
      logger.debug('stock', `AllOrigins 代理請求: ${symbol}`, { 
        yahooSymbol, 
        proxyUrl: proxyUrl.substring(0, 100) + '...' 
      });

      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const yahooData = await response.json();
      
      const result = yahooData?.chart?.result?.[0];
      if (!result?.meta) {
        throw new Error('無效的 Yahoo Finance 資料結構');
      }

      const currentPrice = result.meta.regularMarketPrice || result.meta.previousClose || 0;
      const previousClose = result.meta.previousClose || 0;
      const change = currentPrice - previousClose;
      const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

      if (currentPrice <= 0) {
        throw new Error(`無效股價: ${currentPrice}`);
      }

      logger.info('stock', `AllOrigins 獲取成功: ${symbol}`, { 
        yahooSymbol,
        price: currentPrice,
        change,
        changePercent: changePercent.toFixed(2) + '%'
      });

      return {
        price: Math.round(currentPrice * 100) / 100,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        source: 'Yahoo Finance (AllOrigins)',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      const message = error instanceof Error ? error.message : '未知錯誤';
      logger.debug('stock', `AllOrigins 失敗: ${symbol}`, { 
        error: message,
        yahooSymbol 
      });
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
  /**
   * 獲取 Yahoo Finance 符號 - v1.0.2.0327 優化版
   * 基於成功倉庫的 formatTaiwanSymbol 邏輯
   */
  private getYahooSymbol(symbol: string): string {
    if (symbol.includes('.')) return symbol; // 已有後綴

    // 基於成功倉庫經驗的台股符號格式化邏輯
    const code = parseInt(symbol.substring(0, 4));
    const isBondETF = /^00\d{2,3}B$/i.test(symbol);
    const isETF = /^00\d{2,3}[A-Z]?$/i.test(symbol);

    // 特殊案例處理（基於實際測試結果）
    const specialCases: Record<string, string> = {
      '8112': '.TW', // 至上：雖在 8000 範圍但需使用 .TW
      '4585': '.TW', // 達明：興櫃股票，最常用 .TW
    };
    
    if (specialCases[symbol]) {
      return `${symbol}${specialCases[symbol]}`;
    }

    // 債券 ETF：優先櫃買中心
    if (isBondETF) {
      return `${symbol}.TWO`;
    }
    
    // 一般 ETF：優先證交所
    if (isETF) {
      return `${symbol}.TW`;
    }
    
    // 上櫃股票（3000-8999）：優先櫃買中心
    if (code >= 3000 && code <= 8999) {
      return `${symbol}.TWO`;
    }
    
    // 上市股票（1000-2999）：優先證交所
    if (code >= 1000 && code <= 2999) {
      return `${symbol}.TW`;
    }
    
    // 其他情況：預設證交所
    return `${symbol}.TW`;
  }





  /**
   * 獲取日期字串（YYYY-MM-DD 格式）
   */
  private getDateString(daysOffset: number): string {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    return date.toISOString().split('T')[0];
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