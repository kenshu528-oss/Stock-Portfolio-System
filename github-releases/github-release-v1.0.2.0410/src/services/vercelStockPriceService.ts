// Vercel Edge Functions 股價服務
// 基於 api-standards.md 股價專精原則 (v1.0.2.0315)

import { logger } from '../utils/logger';

export interface VercelStockPrice {
  symbol: string;
  fullSymbol: string;
  price: number;
  change: number;
  changePercent: number;
  source: string;
  timestamp: string;
  success: boolean;
}

export class VercelStockPriceService {
  private static readonly API_BASE_URL = 'https://vercel-stock-api.vercel.app/api';
  private static readonly TIMEOUT = 10000; // 10秒超時

  /**
   * 獲取股票價格 - Vercel Edge Functions
   * 遵循 api-standards.md 股價專精原則
   */
  static async getStockPrice(symbol: string): Promise<VercelStockPrice | null> {
    try {
      logger.info('vercel', `查詢股票: ${symbol}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT);
      
      const response = await fetch(`${this.API_BASE_URL}/stock-price?symbol=${symbol}`, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        if (response.status === 404) {
          logger.warn('vercel', `股票不存在: ${symbol}`);
          return null;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.success || !data.price || data.price <= 0) {
        logger.warn('vercel', `無效股價數據: ${symbol}`, data);
        return null;
      }
      
      // 🔧 修復：判斷是否為交易時間，標示價格類型
      const now = new Date();
      const hour = now.getHours();
      const minute = now.getMinutes();
      const currentTime = hour * 60 + minute;
      const marketOpen = 9 * 60; // 09:00
      const marketClose = 13 * 60 + 30; // 13:30
      const isMarketHours = currentTime >= marketOpen && currentTime <= marketClose;
      const isWeekday = now.getDay() >= 1 && now.getDay() <= 5;
      const isMarketOpen = isMarketHours && isWeekday;
      
      // 根據市場狀態調整來源標示
      const priceType = isMarketOpen ? '即時' : '收盤';
      const enhancedSource = `${data.source} (${priceType}價)`;
      
      logger.success('vercel', `${symbol} 股價獲取成功`, {
        price: data.price,
        source: enhancedSource,
        fullSymbol: data.fullSymbol,
        priceType,
        isMarketOpen
      });
      
      return {
        symbol: data.symbol,
        fullSymbol: data.fullSymbol,
        price: parseFloat(data.price.toFixed(2)),
        change: parseFloat(data.change.toFixed(2)),
        changePercent: parseFloat(data.changePercent.toFixed(2)),
        source: enhancedSource, // "Yahoo Finance (Vercel) (收盤價)" 或 "Yahoo Finance (Vercel) (即時價)"
        timestamp: data.timestamp,
        success: true
      };
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        logger.error('vercel', `請求超時: ${symbol}`);
      } else {
        logger.error('vercel', `API錯誤: ${symbol}`, error);
      }
      return null;
    }
  }

  /**
   * 批量獲取股票價格 - 優化版
   */
  static async getBatchStockPrices(symbols: string[]): Promise<Map<string, VercelStockPrice>> {
    const results = new Map<string, VercelStockPrice>();
    
    if (symbols.length === 0) {
      return results;
    }
    
    logger.info('api', `Vercel 批量查詢 ${symbols.length} 支股票`);
    
    // 並發請求，但限制同時請求數量
    const BATCH_SIZE = 8; // 增加批次大小以提高效率
    const batches = [];
    
    for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
      batches.push(symbols.slice(i, i + BATCH_SIZE));
    }
    
    logger.debug('api', `分為 ${batches.length} 個批次處理`);
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      logger.debug('api', `處理批次 ${batchIndex + 1}/${batches.length}: ${batch.join(', ')}`);
      
      const promises = batch.map(async (symbol) => {
        try {
          const result = await this.getStockPrice(symbol);
          return { symbol, result };
        } catch (error) {
          logger.warn('api', `${symbol} 獲取失敗`, error.message);
          return { symbol, result: null };
        }
      });
      
      const batchResults = await Promise.allSettled(promises);
      
      batchResults.forEach((promiseResult, index) => {
        const symbol = batch[index];
        
        if (promiseResult.status === 'fulfilled' && promiseResult.value.result) {
          results.set(symbol, promiseResult.value.result);
          logger.debug('api', `✅ ${symbol}: ${promiseResult.value.result.price}`);
        } else {
          logger.warn('api', `❌ ${symbol}: 獲取失敗`);
        }
      });
      
      // 批次間稍微延遲，避免過於頻繁的請求
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    const successCount = results.size;
    const failCount = symbols.length - successCount;
    
    logger.info('api', `Vercel 批量查詢完成`, {
      total: symbols.length,
      success: successCount,
      failed: failCount,
      successRate: `${Math.round((successCount / symbols.length) * 100)}%`
    });
    
    return results;
  }

  /**
   * 檢查 Vercel API 服務狀態
   */
  static async checkServiceHealth(): Promise<boolean> {
    try {
      logger.debug('vercel', '檢查服務狀態');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${this.API_BASE_URL}/stock-price?symbol=2330`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const isHealthy = response.ok;
      logger.info('vercel', `服務狀態: ${isHealthy ? '正常' : '異常'}`);
      
      return isHealthy;
      
    } catch (error) {
      logger.error('vercel', '服務狀態檢查失敗', error);
      return false;
    }
  }
}

export default VercelStockPriceService;