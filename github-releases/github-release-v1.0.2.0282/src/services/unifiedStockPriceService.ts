/**
 * 統一股價獲取服務 (Unified Stock Price Service)
 * 
 * 整合所有股價獲取組件的統一服務
 * 基於 v1.0.2.0197 成功經驗和 steering 規則制定
 * 
 * @version 1.0.0
 * @author Stock Portfolio System
 * @date 2026-01-19
 */

import { StockPrice, StockSearchResult } from '../types';
import { logger } from '../utils/logger';
import { APIManager, apiManager } from './apiManager';
import { StockSymbolAnalyzer } from './stockSymbolAnalyzer';
import { YahooFinanceAPIProvider } from './yahooFinanceAPI';
import { FinMindAPIProvider } from './finMindAPI';
import { StockDataMerger, DataSourcePriority } from './stockDataMerger';
import { StockPriceCache, stockPriceCache } from './stockPriceCache';

// 統一服務配置
export interface UnifiedServiceConfig {
  /** 是否啟用快取 */
  enableCache: boolean;
  
  /** 預設資料來源策略 */
  defaultStrategy: DataSourcePriority;
  
  /** 是否包含中文名稱 */
  includeChineseName: boolean;
  
  /** 批量處理大小 */
  batchSize: number;
  
  /** 請求間隔（毫秒） */
  requestInterval: number;
  
  /** 全域超時（毫秒） */
  globalTimeout: number;
  
  /** 是否啟用詳細日誌 */
  enableDetailedLogging: boolean;
}

// 預設配置
const DEFAULT_CONFIG: UnifiedServiceConfig = {
  enableCache: true,
  defaultStrategy: process.env.NODE_ENV === 'development' 
    ? DataSourcePriority.YAHOO_FINMIND  // 開發環境：混合策略
    : DataSourcePriority.FINMIND_ONLY,  // 🔧 生產環境：只用 FinMind（避免代理問題）
  includeChineseName: true,
  batchSize: 5,
  requestInterval: 300,
  globalTimeout: 15000,
  enableDetailedLogging: false
};

/**
 * 統一股價獲取服務類別
 */
export class UnifiedStockPriceService {
  private config: UnifiedServiceConfig;
  private apiManager: APIManager;
  private cache: StockPriceCache;
  private isInitialized = false;
  
  constructor(config: Partial<UnifiedServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.apiManager = apiManager;
    this.cache = stockPriceCache;
    
    this.initialize();
  }
  
  /**
   * 初始化服務
   */
  private initialize(): void {
    if (this.isInitialized) return;
    
    // 註冊 API 提供者
    this.apiManager.registerProvider(new YahooFinanceAPIProvider());
    this.apiManager.registerProvider(new FinMindAPIProvider());
    
    this.isInitialized = true;
    
    logger.info('stock', '統一股價獲取服務已初始化', {
      strategy: this.config.defaultStrategy,
      cacheEnabled: this.config.enableCache,
      chineseNameEnabled: this.config.includeChineseName
    });
  }
  
  /**
   * 獲取單一股票價格（主要方法）
   * 
   * @param symbol 股票代碼
   * @param options 選項
   * @returns 股價資料或 null
   */
  async getStockPrice(
    symbol: string,
    options: {
      useCache?: boolean;
      strategy?: DataSourcePriority;
      timeout?: number;
    } = {}
  ): Promise<StockPrice | null> {
    const startTime = Date.now();
    const useCache = options.useCache ?? this.config.enableCache;
    const strategy = options.strategy ?? this.config.defaultStrategy;
    
    // 驗證股票代碼
    if (!StockSymbolAnalyzer.isValidStockSymbol(symbol)) {
      logger.warn('stock', `無效的股票代碼: ${symbol}`);
      return null;
    }
    
    // 檢查快取
    if (useCache) {
      const cachedData = this.cache.get(symbol);
      if (cachedData) {
        logger.debug('stock', `${symbol} 使用快取資料`, {
          price: cachedData.price,
          age: `${Date.now() - cachedData.timestamp.getTime()}ms`
        });
        return cachedData;
      }
    }
    
    try {
      // 分析股票代碼
      const analysis = StockSymbolAnalyzer.analyzeSymbol(symbol);
      
      if (this.config.enableDetailedLogging) {
        logger.debug('stock', `開始獲取 ${symbol} 股價`, {
          type: analysis.type,
          market: analysis.market,
          strategy,
          suffixes: analysis.suffixes
        });
      }
      
      // 根據策略獲取資料
      let stockData: StockPrice | null = null;
      
      switch (strategy) {
        case DataSourcePriority.YAHOO_FINMIND:
          stockData = await StockDataMerger.getStockPrice(symbol, {
            preferredSource: DataSourcePriority.YAHOO_FINMIND,
            includeChineseName: this.config.includeChineseName,
            timeout: options.timeout || this.config.globalTimeout
          });
          break;
          
        case DataSourcePriority.YAHOO_ONLY:
          stockData = await this.apiManager.getStockPrice(symbol);
          break;
          
        case DataSourcePriority.FINMIND_ONLY:
          stockData = await StockDataMerger.getStockPrice(symbol, {
            preferredSource: DataSourcePriority.FINMIND_ONLY,
            timeout: options.timeout || this.config.globalTimeout
          });
          break;
          
        default:
          stockData = await StockDataMerger.getStockPrice(symbol);
      }
      
      // 驗證資料
      if (!StockDataMerger.validateStockData(stockData)) {
        logger.warn('stock', `${symbol} 資料驗證失敗`);
        return null;
      }
      
      // 存入快取
      if (useCache && stockData) {
        this.cache.set(symbol, stockData);
      }
      
      const duration = Date.now() - startTime;
      
      if (stockData) {
        logger.success('stock', `${symbol} 股價獲取成功`, {
          price: stockData.price,
          change: stockData.change,
          source: stockData.source,
          duration: `${duration}ms`
        });
      } else {
        logger.warn('stock', `${symbol} 股價獲取失敗`, {
          duration: `${duration}ms`
        });
      }
      
      return stockData;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('stock', `${symbol} 股價獲取異常`, {
        error: error instanceof Error ? error.message : String(error),
        duration: `${duration}ms`
      });
      return null;
    }
  }
  
  /**
   * 批量獲取股票價格
   * 
   * @param symbols 股票代碼列表
   * @param options 選項
   * @returns 股價資料映射
   */
  async getBatchStockPrices(
    symbols: string[],
    options: {
      useCache?: boolean;
      strategy?: DataSourcePriority;
      batchSize?: number;
      requestInterval?: number;
    } = {}
  ): Promise<Map<string, StockPrice>> {
    const results = new Map<string, StockPrice>();
    const useCache = options.useCache ?? this.config.enableCache;
    const batchSize = options.batchSize ?? this.config.batchSize;
    const requestInterval = options.requestInterval ?? this.config.requestInterval;
    
    logger.info('stock', `開始批量獲取股價`, {
      count: symbols.length,
      strategy: options.strategy ?? this.config.defaultStrategy,
      batchSize,
      cacheEnabled: useCache
    });
    
    // 分批處理
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      const promises = batch.map(symbol => 
        this.getStockPrice(symbol, {
          useCache,
          strategy: options.strategy
        })
      );
      
      const batchResults = await Promise.allSettled(promises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          results.set(batch[index], result.value);
        }
      });
      
      // 批次間延遲
      if (i + batchSize < symbols.length) {
        await this.delay(requestInterval);
      }
    }
    
    const successRate = (results.size / symbols.length) * 100;
    
    logger.info('stock', `批量獲取完成`, {
      requested: symbols.length,
      successful: results.size,
      successRate: `${successRate.toFixed(1)}%`
    });
    
    return results;
  }
  
  /**
   * 搜尋股票
   * 
   * @param query 搜尋關鍵字
   * @returns 搜尋結果或 null
   */
  async searchStock(query: string): Promise<StockSearchResult | null> {
    const trimmedQuery = query.trim();
    
    if (!trimmedQuery) {
      return null;
    }
    
    // 如果是有效的股票代碼，直接獲取股價
    if (StockSymbolAnalyzer.isValidStockSymbol(trimmedQuery)) {
      logger.debug('stock', `搜尋股票: ${trimmedQuery}`);
      
      const stockPrice = await this.getStockPrice(trimmedQuery);
      
      if (stockPrice) {
        const analysis = StockSymbolAnalyzer.analyzeSymbol(trimmedQuery);
        
        return {
          symbol: stockPrice.symbol,
          name: (stockPrice as any).name || stockPrice.symbol,
          market: analysis.market,
          price: stockPrice.price,
          change: stockPrice.change,
          changePercent: stockPrice.changePercent
        };
      }
    }
    
    logger.debug('stock', `無法搜尋到股票: ${query}`);
    return null;
  }
  
  /**
   * 獲取股票名稱
   * 
   * @param symbol 股票代碼
   * @returns 股票名稱或 null
   */
  async getStockName(symbol: string): Promise<string | null> {
    // 先檢查快取
    if (this.config.enableCache) {
      const cachedData = this.cache.get(symbol);
      if (cachedData && (cachedData as any).name) {
        return (cachedData as any).name;
      }
    }
    
    // 獲取股價資料（包含名稱）
    const stockData = await this.getStockPrice(symbol);
    
    if (stockData && (stockData as any).name) {
      return (stockData as any).name;
    }
    
    return null;
  }
  
  /**
   * 獲取服務健康狀態
   * 
   * @returns 健康狀態報告
   */
  async getHealthStatus(): Promise<{
    overall: 'healthy' | 'degraded' | 'unavailable';
    apiManager: any;
    cache: any;
  }> {
    const apiStatus = await this.apiManager.getHealthStatus();
    const cacheStats = this.cache.getStats();
    
    return {
      overall: apiStatus.overall,
      apiManager: apiStatus,
      cache: cacheStats
    };
  }
  
  /**
   * 清理快取
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('stock', '股價快取已清理');
  }
  
  /**
   * 獲取快取統計
   */
  getCacheStats() {
    return this.cache.getStats();
  }
  
  /**
   * 更新配置
   * 
   * @param newConfig 新配置
   */
  updateConfig(newConfig: Partial<UnifiedServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    logger.info('stock', '服務配置已更新', newConfig);
  }
  
  /**
   * 銷毀服務
   */
  destroy(): void {
    this.cache.destroy();
    this.apiManager.destroy();
    this.isInitialized = false;
    
    logger.info('stock', '統一股價獲取服務已銷毀');
  }
  
  // 私有方法
  
  /**
   * 延遲函數
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 創建單例實例
export const unifiedStockPriceService = new UnifiedStockPriceService();

// 便利函數
export const getStockPrice = (symbol: string, options?: any) => 
  unifiedStockPriceService.getStockPrice(symbol, options);

export const getBatchStockPrices = (symbols: string[], options?: any) => 
  unifiedStockPriceService.getBatchStockPrices(symbols, options);

export const searchStock = (query: string) => 
  unifiedStockPriceService.searchStock(query);

export const getStockName = (symbol: string) => 
  unifiedStockPriceService.getStockName(symbol);

// 預設導出
export default UnifiedStockPriceService;