/**
 * 雲端環境股價獲取服務 - 修復版本，優先使用證交所即時 API
 * 專門針對 GitHub Pages 等雲端環境優化的股價獲取策略
 * v1.0.2.0381: 添加證交所即時 API 作為第一優先級，獲取真正的即時價格
 */

import { logger } from '../utils/logger';
import { VercelStockPriceService } from './vercelStockPriceService';

export interface StockPrice {
  price: number;
  change: number;
  changePercent: number;
  source: string;
  timestamp: string;
}

class CloudStockPriceService {
  private cache = new Map<string, { data: StockPrice; expiry: number }>();
  private readonly CACHE_DURATION = 2 * 60 * 1000; // 縮短為2分鐘快取，確保即時性

  /**
   * 獲取股價 - 修復版本，優先使用證交所即時 API
   */
  async getStockPrice(symbol: string, maxRetries: number = 2, forceRefresh: boolean = false): Promise<StockPrice | null> {
    // 🔧 修復：支援強制刷新，跳過快取
    if (!forceRefresh) {
      // 檢查快取
      const cached = this.getCachedPrice(symbol);
      if (cached) {
        logger.debug('stock', `使用快取股價: ${symbol}`, { price: cached.price });
        return cached;
      }
    } else {
      // 強制刷新時清除快取
      this.cache.delete(symbol);
      logger.debug('stock', `強制刷新，已清除 ${symbol} 快取`);
    }

    // 🔧 修復：優先使用證交所即時 API 獲取真正的即時價格
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        logger.debug('stock', `嘗試獲取 ${symbol} 即時股價 (第${attempt}次)${forceRefresh ? ' [強制刷新]' : ''}`);
        
        // 1. 優先嘗試證交所即時 API
        const twseResult = await Promise.race([
          this.fetchFromTWSE(symbol),
          this.createTimeoutPromise(8000) // 8秒超時
        ]);

        if (twseResult && twseResult.price > 0) {
          logger.info('stock', `證交所即時 API 獲取成功`, { 
            symbol, 
            price: twseResult.price,
            source: twseResult.source,
            attempt,
            forceRefresh
          });
          
          // 快取結果
          this.setCachedPrice(symbol, twseResult);
          return twseResult;
        }
        
        // 2. 證交所失敗時使用 Vercel Edge Functions 作為備援
        const vercelResult = await Promise.race([
          this.fetchFromVercel(symbol, forceRefresh),
          this.createTimeoutPromise(10000) // 10秒超時
        ]);

        if (vercelResult && vercelResult.price > 0) {
          logger.info('stock', `Vercel Edge Functions 備援獲取成功`, { 
            symbol, 
            price: vercelResult.price,
            source: vercelResult.source,
            attempt,
            forceRefresh
          });
          
          // 快取結果
          this.setCachedPrice(symbol, vercelResult);
          return vercelResult;
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('未知錯誤');
        
        if (attempt <= maxRetries) {
          logger.debug('stock', `第${attempt}次獲取失敗，準備重試: ${symbol}`, { 
            error: lastError.message,
            nextAttempt: attempt + 1,
            forceRefresh
          });
          
          // 重試前等待
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        } else {
          logger.debug('stock', `所有重試都失敗: ${symbol}`, { 
            error: lastError.message,
            totalAttempts: attempt,
            forceRefresh
          });
        }
      }
    }

    logger.warn('stock', `所有股價來源都失敗: ${symbol}`, { 
      retriesAttempted: maxRetries + 1,
      forceRefresh
    });
    return null;
  }

  /**
   * 證交所即時 API 股價獲取 - 新增，獲取真正的即時價格
   * v1.0.2.0381 - 第一優先級，最即時的解決方案
   */
  private async fetchFromTWSE(symbol: string): Promise<StockPrice | null> {
    try {
      // 判斷股票所屬市場
      const code = parseInt(symbol.substring(0, 4));
      const isOTC = code >= 3000 && code <= 8999; // 上櫃股票
      const exchange = isOTC ? 'otc' : 'tse';
      const exchangeSymbol = isOTC ? `${symbol}.tw` : `${symbol}.tw`;
      
      const url = `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=${exchange}_${exchangeSymbol}`;
      
      logger.debug('stock', `證交所即時 API 請求: ${symbol}`, { url, exchange });
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Referer': 'https://mis.twse.com.tw/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (!response.ok) {
        throw new Error(`證交所 API HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.msgArray || data.msgArray.length === 0) {
        logger.warn('stock', `證交所 API 無資料: ${symbol}`);
        return null;
      }
      
      const stockData = data.msgArray[0];
      const currentPrice = parseFloat(stockData.z); // z = 現價
      const previousClose = parseFloat(stockData.y); // y = 昨收價
      
      if (!currentPrice || currentPrice <= 0) {
        logger.warn('stock', `證交所 API 無效價格: ${symbol}`, { currentPrice });
        return null;
      }
      
      const change = currentPrice - previousClose;
      const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;
      
      const result: StockPrice = {
        price: parseFloat(currentPrice.toFixed(2)),
        change: parseFloat(change.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2)),
        source: `證交所即時 (${exchange.toUpperCase()})`,
        timestamp: new Date().toISOString()
      };
      
      logger.success('stock', `${symbol} 證交所即時獲取成功`, {
        price: result.price,
        source: result.source,
        exchange,
        time: stockData.t // 交易時間
      });
      
      return result;
      
    } catch (error) {
      logger.error('stock', `證交所即時 API 錯誤: ${symbol}`, error instanceof Error ? error.message : error);
      return null;
    }
  }

  /**
   * Vercel Edge Functions 股價獲取 - 修復版本，作為備援
   * v1.0.2.0381 - 第二優先級，備援解決方案
   */
  private async fetchFromVercel(symbol: string, forceRefresh: boolean = false): Promise<StockPrice | null> {
    try {
      // 🔧 修復：添加時間戳參數避免快取
      const timestamp = forceRefresh ? `&_t=${Date.now()}` : '';
      const url = `https://vercel-stock-api.vercel.app/api/stock-price?symbol=${symbol}${timestamp}`;
      
      logger.debug('stock', `Vercel Edge Functions 請求: ${symbol}${forceRefresh ? ' [強制刷新]' : ''}`, { url });
      
      const vercelData = await VercelStockPriceService.getStockPrice(symbol);
      
      if (!vercelData || !vercelData.success) {
        logger.warn('stock', `Vercel API 無資料: ${symbol}`);
        return null;
      }
      
      const result: StockPrice = {
        price: vercelData.price,
        change: vercelData.change,
        changePercent: vercelData.changePercent,
        source: vercelData.source, // "Yahoo Finance (Vercel)"
        timestamp: vercelData.timestamp
      };
      
      logger.success('stock', `${symbol} Vercel 備援獲取成功`, {
        price: result.price,
        source: result.source,
        fullSymbol: vercelData.fullSymbol,
        forceRefresh
      });
      
      return result;
      
    } catch (error) {
      logger.error('stock', `Vercel API 錯誤: ${symbol}`, error instanceof Error ? error.message : error);
      return null;
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
   * 批次獲取多個股票價格 - 優化版
   */
  async getBatchStockPrices(symbols: string[]): Promise<Map<string, StockPrice | null>> {
    const results = new Map<string, StockPrice | null>();
    
    if (symbols.length === 0) {
      return results;
    }
    
    logger.info('stock', `雲端批量獲取 ${symbols.length} 支股票價格`);
    
    // 使用 Vercel 批量服務
    try {
      const vercelResults = await VercelStockPriceService.getBatchStockPrices(symbols);
      
      // 轉換格式
      for (const [symbol, vercelData] of vercelResults) {
        if (vercelData && vercelData.success) {
          const stockPrice: StockPrice = {
            price: vercelData.price,
            change: vercelData.change,
            changePercent: vercelData.changePercent,
            source: vercelData.source,
            timestamp: vercelData.timestamp
          };
          
          results.set(symbol, stockPrice);
          
          // 快取結果
          this.setCachedPrice(symbol, stockPrice);
        } else {
          results.set(symbol, null);
        }
      }
      
      // 處理未獲取到的股票（降級處理）
      const missingSymbols = symbols.filter(symbol => !results.has(symbol));
      if (missingSymbols.length > 0) {
        logger.warn('stock', `${missingSymbols.length} 支股票需要降級處理: ${missingSymbols.join(', ')}`);
        
        // 對未獲取到的股票進行單獨處理
        for (const symbol of missingSymbols) {
          try {
            const price = await this.getStockPrice(symbol, 1); // 只重試1次
            results.set(symbol, price);
          } catch (error) {
            logger.warn('stock', `降級處理 ${symbol} 失敗`, error.message);
            results.set(symbol, null);
          }
        }
      }
      
    } catch (error) {
      logger.error('stock', 'Vercel 批量服務失敗，降級到序列處理', error);
      
      // 完全降級到序列處理
      const BATCH_SIZE = 3;
      for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
        const batch = symbols.slice(i, i + BATCH_SIZE);
        
        const promises = batch.map(async (symbol) => {
          try {
            const price = await this.getStockPrice(symbol, 1);
            return { symbol, price };
          } catch (error) {
            logger.warn('stock', `序列處理 ${symbol} 失敗`, error.message);
            return { symbol, price: null };
          }
        });
        
        const batchResults = await Promise.allSettled(promises);
        
        batchResults.forEach((result) => {
          if (result.status === 'fulfilled') {
            results.set(result.value.symbol, result.value.price);
          }
        });
        
        // 批次間延遲
        if (i + BATCH_SIZE < symbols.length) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
    }
    
    const successCount = Array.from(results.values()).filter(price => price !== null).length;
    logger.info('stock', `雲端批量獲取完成`, {
      total: symbols.length,
      success: successCount,
      failed: symbols.length - successCount,
      successRate: `${Math.round((successCount / symbols.length) * 100)}%`
    });
    
    return results;
  }
}

// 導出單例
export const cloudStockPriceService = new CloudStockPriceService();

// 導出類別
export { CloudStockPriceService };