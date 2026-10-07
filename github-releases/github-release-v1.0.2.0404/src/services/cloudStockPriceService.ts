/**
 * 雲端環境股價獲取服務 - 遵循 api-standards.md 股價專精原則
 * 專門針對 GitHub Pages 等雲端環境，只使用 Vercel Edge Functions
 * v1.0.2.0383: 移除證交所API，完全遵循股價專精原則
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
   * 獲取股價 - 遵循 api-standards.md 股價專精原則，只使用 Vercel Edge Functions
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

    // 🔧 遵循 api-standards.md 股價專精原則：只使用 Vercel Edge Functions
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        logger.debug('stock', `嘗試獲取 ${symbol} 股價 (第${attempt}次)${forceRefresh ? ' [強制刷新]' : ''}`);
        
        // 只使用 Vercel Edge Functions - 遵循股價專精原則
        const vercelResult = await Promise.race([
          this.fetchFromVercel(symbol, forceRefresh),
          this.createTimeoutPromise(10000) // 10秒超時
        ]);

        if (vercelResult && vercelResult.price > 0) {
          logger.info('stock', `Vercel 股價獲取成功`, { 
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
   * Vercel Edge Functions 股價獲取 - 遵循 api-standards.md 股價專精原則
   * 唯一的股價來源，無 CORS 限制
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