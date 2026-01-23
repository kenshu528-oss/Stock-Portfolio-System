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
   */
  private getPriceSources(): PriceSource[] {
    return [
      {
        name: 'Yahoo Finance (AllOrigins)',
        priority: 1,
        timeout: 5000,
        fetcher: this.fetchFromYahooAllOrigins.bind(this)
      },
      {
        name: 'FinMind Direct',
        priority: 2,
        timeout: 8000,
        fetcher: this.fetchFromFinMindDirect.bind(this)
      },
      {
        name: 'Yahoo Finance (Backup)',
        priority: 3,
        timeout: 3000,
        fetcher: this.fetchFromYahooBackup.bind(this)
      }
    ];
  }

  /**
   * Yahoo Finance 通過 AllOrigins 代理
   */
  private async fetchFromYahooAllOrigins(symbol: string): Promise<StockPrice | null> {
    const yahooSymbol = this.getYahooSymbol(symbol);
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`;
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(yahooUrl)}`;

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
      price: currentPrice,
      change,
      changePercent,
      source: 'Yahoo Finance (AllOrigins)',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * FinMind 直接調用
   */
  private async fetchFromFinMindDirect(symbol: string): Promise<StockPrice | null> {
    const today = new Date();
    const startDate = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
    
    const finmindUrl = `https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockPrice&data_id=${symbol}&start_date=${startDate.toISOString().split('T')[0]}&end_date=${today.toISOString().split('T')[0]}&token=`;

    const response = await fetch(finmindUrl);
    if (!response.ok) {
      if (response.status === 402) {
        throw new Error('FinMind API 需要付費');
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data.data || data.data.length === 0) {
      throw new Error('FinMind 無資料');
    }

    const prices = data.data.sort((a: any, b: any) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    const latestPrice = prices[prices.length - 1];
    const previousPrice = prices.length > 1 ? prices[prices.length - 2] : latestPrice;
    
    const currentPrice = latestPrice.close || 0;
    const prevClose = previousPrice.close || currentPrice;
    const change = currentPrice - prevClose;
    const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

    return {
      price: currentPrice,
      change,
      changePercent,
      source: 'FinMind Direct',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Yahoo Finance 備用方案（其他代理）
   */
  private async fetchFromYahooBackup(symbol: string): Promise<StockPrice | null> {
    // 可以在這裡實作其他 CORS 代理或備用方案
    // 目前先返回 null，表示不可用
    return null;
  }

  /**
   * 智能判斷 Yahoo Finance 股票代碼後綴
   */
  private getYahooSymbol(symbol: string): string {
    if (symbol.includes('.')) return symbol; // 已有後綴

    const code = parseInt(symbol.substring(0, 4));
    const isBondETF = /^00\d{2,3}B$/i.test(symbol);

    if (isBondETF) {
      return `${symbol}.TWO`; // 債券 ETF 優先櫃買中心
    } else if (code >= 3000 && code <= 8999) {
      return `${symbol}.TWO`; // 上櫃股票優先櫃買中心
    } else {
      return `${symbol}.TW`; // 上市股票優先證交所
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