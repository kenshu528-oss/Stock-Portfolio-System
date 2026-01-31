/**
 * Vercel Edge Functions 股價服務
 * 🚨 重要：這是雲端環境的唯一解決方案，絕對不能移除
 * API 端點：https://vercel-stock-api.vercel.app
 * 提供穩定的股價獲取功能，但在 UI 上不顯示 Vercel 標註
 */

import { logger } from '../utils/logger';

interface StockPrice {
  price: number;
  change: number;
  changePercent: number;
  source: string;
  timestamp: string;
}

class VercelStockPriceService {
  // 🚨 關鍵：雲端環境唯一解決方案的 API 端點
  private readonly baseUrl = 'https://vercel-stock-api.vercel.app/api';

  /**
   * 從 Vercel Edge Functions 獲取股價
   * 🚨 重要：這是雲端環境股價獲取的唯一穩定方案
   * 返回的 source 標記為 "Yahoo Finance" 而不是 "Vercel"
   */
  async getStockPrice(symbol: string): Promise<StockPrice | null> {
    try {
      const yahooSymbol = await this.getYahooSymbol(symbol);
      const url = `${this.baseUrl}/stock?symbol=${encodeURIComponent(yahooSymbol)}`;
      
      logger.debug('stock', `Vercel API 請求 (雲端唯一解法): ${symbol} → ${yahooSymbol}`, { 
        url: this.baseUrl,
        fullUrl: url 
      });
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Stock-Portfolio-System/1.0.2.0372'
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

      logger.info('stock', `✅ Vercel API 獲取成功 (雲端唯一解法)`, { 
        symbol, 
        price: data.price,
        actualSource: 'vercel-stock-api.vercel.app',
        displaySource: 'Yahoo Finance'
      });

      // 🔧 關鍵：返回 "Yahoo Finance" 而不是 "Vercel"，隱藏 Vercel 標註
      return {
        price: Math.round(data.price * 100) / 100,
        change: Math.round((data.change || 0) * 100) / 100,
        changePercent: Math.round((data.changePercent || 0) * 100) / 100,
        source: 'Yahoo Finance', // UI 顯示為 Yahoo Finance
        timestamp: data.timestamp || new Date().toISOString()
      };

    } catch (error) {
      const message = error instanceof Error ? error.message : '未知錯誤';
      logger.error('stock', `❌ Vercel API 失敗 (雲端唯一解法): ${symbol}`, { 
        error: message,
        endpoint: this.baseUrl
      });
      throw error;
    }
  }

  /**
   * 獲取 Yahoo Finance 符號
   */
  private async getYahooSymbol(symbol: string): Promise<string> {
    if (symbol.includes('.')) return symbol;

    // 嘗試從 Stock List 獲取預定義後綴
    try {
      const { stockListService } = await import('./stockListService');
      const yahooSymbol = await stockListService.getYahooSymbol(symbol);
      logger.debug('stock', `Stock List 後綴查詢: ${symbol} → ${yahooSymbol}`);
      return yahooSymbol;
    } catch (error) {
      logger.warn('stock', `Stock List 查詢失敗，使用備用邏輯: ${symbol}`, error);
    }

    // 備用邏輯
    return this.fallbackGetYahooSymbol(symbol);
  }

  /**
   * 備用的 Yahoo Finance 符號判斷邏輯
   */
  private fallbackGetYahooSymbol(symbol: string): string {
    const code = parseInt(symbol.substring(0, 4));
    const isBondETF = /^00\d{2,3}B$/i.test(symbol);
    const isETF = /^00\d{2,3}[A-Z]?$/i.test(symbol);

    // 特殊案例
    const specialCases: Record<string, string> = {
      '8112': '.TW', // 至上
      '4585': '.TW', // 達明
    };
    
    if (specialCases[symbol]) {
      return `${symbol}${specialCases[symbol]}`;
    }

    // 債券 ETF：優先櫃買中心
    if (isBondETF) {
      return `${symbol}.TWO`;
    }
    
    // 一般 ETF：優先櫃買中心
    if (isETF) {
      return `${symbol}.TWO`;
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
}

// 導出單例
export const vercelStockPriceService = new VercelStockPriceService();
export default VercelStockPriceService;