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
      
      logger.success('vercel', `${symbol} 股價獲取成功`, {
        price: data.price,
        source: data.source,
        fullSymbol: data.fullSymbol
      });
      
      return {
        symbol: data.symbol,
        fullSymbol: data.fullSymbol,
        price: parseFloat(data.price.toFixed(2)),
        change: parseFloat(data.change.toFixed(2)),
        changePercent: parseFloat(data.changePercent.toFixed(2)),
        source: data.source, // "Yahoo Finance (Vercel)"
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
   * 批量獲取股票價格
   */
  static async getBatchStockPrices(symbols: string[]): Promise<Map<string, VercelStockPrice>> {
    const results = new Map<string, VercelStockPrice>();
    
    logger.info('vercel', `批量查詢 ${symbols.length} 支股票`);
    
    // 並發請求，但限制同時請求數量
    const BATCH_SIZE = 5;
    for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
      const batch = symbols.slice(i, i + BATCH_SIZE);
      const promises = batch.map(symbol => this.getStockPrice(symbol));
      
      const batchResults = await Promise.all(promises);
      
      batchResults.forEach((result, index) => {
        if (result) {
          results.set(batch[index], result);
        }
      });
      
      // 批次間稍微延遲，避免過於頻繁的請求
      if (i + BATCH_SIZE < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    logger.info('vercel', `批量查詢完成: ${results.size}/${symbols.length} 成功`);
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