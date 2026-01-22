/**
 * Yahoo Finance API 標準化實作
 * 
 * 基於 v1.0.2.0197 成功經驗制定的標準化 Yahoo Finance API 服務
 * 使用智能後綴判斷邏輯，實作多後綴嘗試機制
 * 
 * @version 1.0.0
 * @author Stock Portfolio System
 * @date 2026-01-19
 */

import { StockPrice } from '../types';
import { logger } from '../utils/logger';
import { StockSymbolAnalyzer, StockSuffix } from './stockSymbolAnalyzer';
import { APIProvider, APIProviderPriority, APIProviderStatus, APICallResult } from './apiManager';

// Yahoo Finance API 配置
const YAHOO_CONFIG = {
  baseUrl: process.env.NODE_ENV === 'development' 
    ? '/api/yahoo/v8/finance/chart'  // 開發環境使用代理
    : 'https://query1.finance.yahoo.com/v8/finance/chart',  // 生產環境直接調用
  timeout: 10000,
  maxRetries: 3,
  retryDelay: 1000,
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
};

// Yahoo Finance 錯誤類型
export enum YahooFinanceErrorType {
  NETWORK_ERROR = 'network_error',
  API_ERROR = 'api_error',
  DATA_ERROR = 'data_error',
  TIMEOUT_ERROR = 'timeout_error',
  INVALID_SYMBOL = 'invalid_symbol'
}

// Yahoo Finance 錯誤類別
export class YahooFinanceError extends Error {
  constructor(
    public type: YahooFinanceErrorType,
    message: string,
    public originalError?: Error,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'YahooFinanceError';
  }
}

// Yahoo Finance API 回應介面
interface YahooFinanceResponse {
  chart: {
    result: Array<{
      meta: {
        symbol: string;
        regularMarketPrice?: number;
        previousClose: number;
        longName?: string;
        shortName?: string;
        currency: string;
        exchangeName: string;
        marketState: string;
      };
      timestamp: number[];
      indicators: {
        quote: Array<{
          close: number[];
          high: number[];
          low: number[];
          open: number[];
          volume: number[];
        }>;
      };
    }>;
    error?: {
      code: string;
      description: string;
    };
  };
}

/**
 * Yahoo Finance API 提供者實作
 */
export class YahooFinanceAPIProvider implements APIProvider {
  name = 'Yahoo Finance';
  priority = APIProviderPriority.PRIMARY;
  timeout = YAHOO_CONFIG.timeout;
  maxRetries = YAHOO_CONFIG.maxRetries;
  retryDelay = YAHOO_CONFIG.retryDelay;
  
  private lastRequestTime = 0;
  private requestCount = 0;
  
  /**
   * 獲取股票價格
   * 
   * @param symbol 股票代碼
   * @param suffixes 後綴列表（可選，會自動分析）
   * @returns 股價資料或 null
   */
  async getStockPrice(symbol: string, suffixes?: StockSuffix[]): Promise<StockPrice | null> {
    // 如果沒有提供後綴，自動分析
    const targetSuffixes = suffixes || StockSymbolAnalyzer.getStockSuffixes(symbol);
    const analysis = StockSymbolAnalyzer.analyzeSymbol(symbol);
    
    logger.debug('api', `Yahoo Finance 開始獲取 ${symbol}`, {
      type: analysis.type,
      market: analysis.market,
      suffixes: targetSuffixes,
      reasoning: analysis.reasoning
    });
    
    // 按優先順序嘗試不同後綴
    for (let i = 0; i < targetSuffixes.length; i++) {
      const suffix = targetSuffixes[i];
      const yahooSymbol = `${symbol}${suffix}`;
      
      try {
        logger.debug('api', `嘗試 Yahoo Finance: ${yahooSymbol} (${i + 1}/${targetSuffixes.length})`);
        
        const result = await this.fetchStockData(yahooSymbol);
        
        if (result && result.price > 0) {
          logger.success('api', `Yahoo Finance 成功: ${yahooSymbol}`, {
            price: result.price,
            change: result.change,
            changePercent: result.changePercent,
            source: result.source
          });
          
          return result;
        } else {
          logger.debug('api', `Yahoo Finance ${yahooSymbol} 無有效資料`);
        }
        
      } catch (error) {
        const isLastAttempt = i === targetSuffixes.length - 1;
        
        if (error instanceof YahooFinanceError) {
          if (error.type === YahooFinanceErrorType.INVALID_SYMBOL && !isLastAttempt) {
            logger.debug('api', `Yahoo Finance ${yahooSymbol} 無效代碼，嘗試下一個後綴`);
            continue;
          }
        }
        
        if (isLastAttempt) {
          logger.warn('api', `Yahoo Finance 所有後綴都失敗: ${symbol}`, {
            suffixes: targetSuffixes,
            lastError: error instanceof Error ? error.message : String(error)
          });
          throw error;
        } else {
          logger.debug('api', `Yahoo Finance ${yahooSymbol} 失敗，嘗試下一個後綴`, error);
        }
      }
    }
    
    logger.warn('api', `Yahoo Finance 無法獲取 ${symbol} 股價`, {
      suffixes: targetSuffixes
    });
    
    return null;
  }
  
  /**
   * 檢查 API 健康狀態
   * 
   * @returns 是否健康
   */
  async isHealthy(): Promise<boolean> {
    try {
      // 在開發環境中跳過健康檢查，避免 CORS 錯誤
      if (process.env.NODE_ENV === 'development') {
        return true; // 開發環境假設 API 可用
      }
      
      // 使用台股代碼測試，避免 CORS 問題
      const testResult = await this.fetchStockData('2330.TW');
      return testResult !== null;
    } catch (error) {
      logger.debug('api', 'Yahoo Finance 健康檢查失敗', error);
      return false;
    }
  }
  
  /**
   * 獲取 API 狀態
   * 
   * @returns API 狀態
   */
  async getStatus(): Promise<APIProviderStatus> {
    try {
      const isHealthy = await this.isHealthy();
      return isHealthy ? APIProviderStatus.HEALTHY : APIProviderStatus.DEGRADED;
    } catch (error) {
      return APIProviderStatus.UNAVAILABLE;
    }
  }
  
  /**
   * 獲取多個股票的價格（批量處理）
   * 
   * @param symbols 股票代碼列表
   * @returns 股價資料映射
   */
  async getBatchStockPrices(symbols: string[]): Promise<Map<string, StockPrice>> {
    const results = new Map<string, StockPrice>();
    
    // Yahoo Finance 不支援真正的批量查詢，所以逐一處理
    for (const symbol of symbols) {
      try {
        const price = await this.getStockPrice(symbol);
        if (price) {
          results.set(symbol, price);
        }
      } catch (error) {
        logger.debug('api', `批量處理 ${symbol} 失敗`, error);
      }
      
      // 避免過於頻繁的請求
      await this.rateLimitDelay();
    }
    
    return results;
  }
  
  // 私有方法
  
  /**
   * 獲取股票資料
   * 
   * @param yahooSymbol Yahoo Finance 格式的股票代碼
   * @returns 股價資料或 null
   */
  private async fetchStockData(yahooSymbol: string): Promise<StockPrice | null> {
    try {
      // 速率限制
      await this.rateLimitDelay();
      
      const url = `${YAHOO_CONFIG.baseUrl}/${yahooSymbol}`;
      const startTime = Date.now();
      
      logger.trace('api', `Yahoo Finance 請求: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': YAHOO_CONFIG.userAgent,
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache'
        },
        signal: AbortSignal.timeout(this.timeout)
      });
      
      const duration = Date.now() - startTime;
      this.requestCount++;
      
      if (!response.ok) {
        throw new YahooFinanceError(
          this.getErrorTypeFromStatus(response.status),
          `HTTP ${response.status}: ${response.statusText}`,
          undefined,
          response.status
        );
      }
      
      const data: YahooFinanceResponse = await response.json();
      
      logger.trace('api', `Yahoo Finance 回應: ${yahooSymbol}`, {
        duration: `${duration}ms`,
        hasData: !!data.chart?.result?.[0]
      });
      
      return this.parseYahooResponse(yahooSymbol, data);
      
    } catch (error) {
      if (error instanceof YahooFinanceError) {
        throw error;
      }
      
      if (error instanceof Error) {
        if (error.name === 'AbortError' || error.message.includes('timeout')) {
          throw new YahooFinanceError(
            YahooFinanceErrorType.TIMEOUT_ERROR,
            `請求超時: ${yahooSymbol}`,
            error
          );
        }
        
        if (error.message.includes('fetch')) {
          throw new YahooFinanceError(
            YahooFinanceErrorType.NETWORK_ERROR,
            `網路錯誤: ${error.message}`,
            error
          );
        }
      }
      
      throw new YahooFinanceError(
        YahooFinanceErrorType.API_ERROR,
        `未知錯誤: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * 解析 Yahoo Finance 回應
   * 
   * @param yahooSymbol Yahoo Finance 格式的股票代碼
   * @param data API 回應資料
   * @returns 股價資料或 null
   */
  private parseYahooResponse(yahooSymbol: string, data: YahooFinanceResponse): StockPrice | null {
    try {
      // 檢查是否有錯誤
      if (data.chart?.error) {
        throw new YahooFinanceError(
          YahooFinanceErrorType.API_ERROR,
          `Yahoo Finance API 錯誤: ${data.chart.error.description}`,
          undefined,
          parseInt(data.chart.error.code) || 400
        );
      }
      
      // 檢查資料結構
      if (!data.chart?.result?.[0]?.meta) {
        throw new YahooFinanceError(
          YahooFinanceErrorType.DATA_ERROR,
          `無效的資料結構: ${yahooSymbol}`
        );
      }
      
      const meta = data.chart.result[0].meta;
      const symbol = yahooSymbol.replace(/\.(TW|TWO)$/, ''); // 移除後綴
      
      // 獲取價格資料
      const currentPrice = meta.regularMarketPrice || meta.previousClose;
      const previousClose = meta.previousClose;
      
      if (!currentPrice || currentPrice <= 0) {
        throw new YahooFinanceError(
          YahooFinanceErrorType.DATA_ERROR,
          `無效的價格資料: ${yahooSymbol}, price: ${currentPrice}`
        );
      }
      
      // 計算漲跌
      const change = currentPrice - previousClose;
      const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;
      
      // 獲取股票名稱
      const name = meta.longName || meta.shortName || symbol;
      
      const result: StockPrice = {
        symbol,
        price: currentPrice,
        change,
        changePercent,
        timestamp: new Date(),
        source: 'Yahoo Finance'
      };
      
      // 如果有名稱且不同於代碼，則添加
      if (name && name !== symbol) {
        (result as any).name = name;
      }
      
      // 添加市場資訊
      if (meta.exchangeName) {
        (result as any).exchange = meta.exchangeName;
      }
      
      if (meta.currency) {
        (result as any).currency = meta.currency;
      }
      
      logger.debug('api', `Yahoo Finance 解析成功: ${yahooSymbol}`, {
        symbol: result.symbol,
        price: result.price,
        change: result.change,
        changePercent: result.changePercent.toFixed(2) + '%',
        name: (result as any).name
      });
      
      return result;
      
    } catch (error) {
      if (error instanceof YahooFinanceError) {
        throw error;
      }
      
      throw new YahooFinanceError(
        YahooFinanceErrorType.DATA_ERROR,
        `解析回應失敗: ${yahooSymbol}`,
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * 根據 HTTP 狀態碼判斷錯誤類型
   */
  private getErrorTypeFromStatus(status: number): YahooFinanceErrorType {
    if (status === 404) {
      return YahooFinanceErrorType.INVALID_SYMBOL;
    } else if (status >= 500) {
      return YahooFinanceErrorType.API_ERROR;
    } else if (status === 429) {
      return YahooFinanceErrorType.API_ERROR; // 速率限制
    } else {
      return YahooFinanceErrorType.API_ERROR;
    }
  }
  
  /**
   * 速率限制延遲
   */
  private async rateLimitDelay(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minInterval = 100; // 最小間隔 100ms
    
    if (timeSinceLastRequest < minInterval) {
      const delay = minInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }
}

// 創建單例實例
export const yahooFinanceAPI = new YahooFinanceAPIProvider();

// 預設導出
export default YahooFinanceAPIProvider;