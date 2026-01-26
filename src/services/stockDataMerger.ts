/**
 * 股價資料合併器 (Stock Data Merger)
 * 
 * 實作混合資料來源策略，結合多個 API 的優勢
 * Yahoo Finance 股價 + FinMind 中文名稱 = 最佳組合
 * 
 * @version 1.0.0
 * @author Stock Portfolio System
 * @date 2026-01-19
 */

import { StockPrice } from '../types';
import { logger } from '../utils/logger';
import { StockSymbolAnalyzer } from './stockSymbolAnalyzer';
import { yahooFinanceAPI } from './yahooFinanceAPI';
import { finMindAPI } from './finMindAPI';

// 資料來源優先級 - v1.0.2.0315 股價專精版
export enum DataSourcePriority {
  VERCEL_EDGE = 'Yahoo Finance (Vercel)',  // Vercel Edge Functions（推薦）
  YAHOO_ONLY = 'Yahoo Finance',            // 僅 Yahoo Finance
  FINMIND_ONLY = 'FinMind',               // 僅 FinMind
  TWSE_ONLY = 'TWSE'                      // 僅證交所
}

// 資料合併選項
export interface DataMergeOptions {
  /** 優先使用的資料來源 */
  preferredSource?: DataSourcePriority;
  
  /** 是否嘗試獲取中文名稱 */
  includeChineseName?: boolean;
  
  /** 是否包含額外的市場資訊 */
  includeMarketInfo?: boolean;
  
  /** 超時時間（毫秒） */
  timeout?: number;
  
  /** 是否允許部分失敗 */
  allowPartialFailure?: boolean;
}

// 預設選項
const DEFAULT_OPTIONS: Required<DataMergeOptions> = {
  preferredSource: DataSourcePriority.YAHOO_FINMIND,
  includeChineseName: true,
  includeMarketInfo: true,
  timeout: 15000,
  allowPartialFailure: true
};

/**
 * 股價資料合併器類別
 */
export class StockDataMerger {
  
  /**
   * 獲取股票價格（使用混合策略）
   * 
   * @param symbol 股票代碼
   * @param options 合併選項
   * @returns 股價資料或 null
   */
  static async getStockPrice(
    symbol: string, 
    options: DataMergeOptions = {}
  ): Promise<StockPrice | null> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const analysis = StockSymbolAnalyzer.analyzeSymbol(symbol);
    
    logger.debug('stock', `開始混合資料獲取: ${symbol}`, {
      type: analysis.type,
      market: analysis.market,
      strategy: opts.preferredSource
    });
    
    switch (opts.preferredSource) {
      case DataSourcePriority.YAHOO_FINMIND:
        return await this.getYahooFinMindData(symbol, opts);
        
      case DataSourcePriority.YAHOO_ONLY:
        return await yahooFinanceAPI.getStockPrice(symbol);
        
      case DataSourcePriority.FINMIND_ONLY:
        return await finMindAPI.getStockPrice(symbol);
        
      default:
        return await this.getYahooFinMindData(symbol, opts);
    }
  }
  
  /**
   * 批量獲取股票價格
   * 
   * @param symbols 股票代碼列表
   * @param options 合併選項
   * @returns 股價資料映射
   */
  static async getBatchStockPrices(
    symbols: string[],
    options: DataMergeOptions = {}
  ): Promise<Map<string, StockPrice>> {
    const results = new Map<string, StockPrice>();
    
    logger.info('stock', `開始批量混合資料獲取`, { 
      count: symbols.length,
      strategy: options.preferredSource || DEFAULT_OPTIONS.preferredSource
    });
    
    // 並行處理，但限制並發數
    const batchSize = 5;
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      const promises = batch.map(symbol => this.getStockPrice(symbol, options));
      
      const batchResults = await Promise.allSettled(promises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          results.set(batch[index], result.value);
        }
      });
      
      // 批次間延遲
      if (i + batchSize < symbols.length) {
        await this.delay(300);
      }
    }
    
    logger.info('stock', `批量混合資料獲取完成`, {
      requested: symbols.length,
      successful: results.size,
      successRate: `${((results.size / symbols.length) * 100).toFixed(1)}%`
    });
    
    return results;
  }
  
  /**
   * 合併多個資料來源的資料
   * 
   * @param yahooData Yahoo Finance 資料
   * @param finmindData FinMind 資料
   * @param symbol 股票代碼
   * @returns 合併後的資料
   */
  static mergeStockData(
    yahooData: StockPrice | null,
    finmindData: StockPrice | null,
    symbol: string
  ): StockPrice | null {
    // 如果 Yahoo Finance 有有效資料，優先使用
    if (yahooData && yahooData.price > 0) {
      const result = { ...yahooData };
      
      // 嘗試使用 FinMind 的中文名稱
      if (finmindData && (finmindData as any).name && 
          (finmindData as any).name !== symbol) {
        (result as any).name = (finmindData as any).name;
        result.source = DataSourcePriority.YAHOO_FINMIND;
        
        logger.debug('stock', `${symbol} 使用混合資料`, {
          priceSource: 'Yahoo Finance',
          nameSource: 'FinMind',
          name: (finmindData as any).name
        });
      }
      
      return result;
    }
    
    // 如果 Yahoo Finance 沒有資料，使用 FinMind
    if (finmindData && finmindData.price > 0) {
      logger.debug('stock', `${symbol} 使用 FinMind 資料`, {
        price: finmindData.price,
        name: (finmindData as any).name
      });
      
      return finmindData;
    }
    
    logger.warn('stock', `${symbol} 所有資料來源都無有效資料`);
    return null;
  }
  
  /**
   * 驗證股價資料完整性
   * 
   * @param data 股價資料
   * @returns 是否有效
   */
  static validateStockData(data: StockPrice | null): boolean {
    if (!data) return false;
    
    const isValid = (
      data.symbol &&
      typeof data.symbol === 'string' &&
      data.symbol.length > 0 &&
      typeof data.price === 'number' &&
      data.price > 0 &&
      typeof data.change === 'number' &&
      typeof data.changePercent === 'number' &&
      data.timestamp instanceof Date &&
      data.source &&
      typeof data.source === 'string'
    );
    
    if (!isValid) {
      logger.warn('stock', '股價資料驗證失敗', {
        symbol: data?.symbol,
        price: data?.price,
        source: data?.source,
        timestamp: data?.timestamp
      });
    }
    
    return isValid;
  }
  
  // 私有方法
  
  /**
   * 獲取 Yahoo Finance + FinMind 混合資料
   */
  private static async getYahooFinMindData(
    symbol: string,
    options: Required<DataMergeOptions>
  ): Promise<StockPrice | null> {
    try {
      // 並行獲取兩個資料來源
      const [yahooResult, finmindResult] = await Promise.allSettled([
        yahooFinanceAPI.getStockPrice(symbol),
        options.includeChineseName ? finMindAPI.getStockPrice(symbol) : Promise.resolve(null)
      ]);
      
      // 提取資料
      const yahooData = yahooResult.status === 'fulfilled' ? yahooResult.value : null;
      const finmindData = finmindResult.status === 'fulfilled' ? finmindResult.value : null;
      
      // 記錄獲取結果
      logger.debug('stock', `${symbol} 資料來源結果`, {
        yahoo: yahooData ? '成功' : '失敗',
        finmind: finmindData ? '成功' : '失敗',
        yahooPrice: yahooData?.price,
        finmindPrice: finmindData?.price,
        finmindName: (finmindData as any)?.name
      });
      
      // 合併資料
      const mergedData = this.mergeStockData(yahooData, finmindData, symbol);
      
      // 驗證資料完整性
      if (!this.validateStockData(mergedData)) {
        logger.error('stock', `${symbol} 合併後資料驗證失敗`);
        return null;
      }
      
      // 添加市場資訊
      if (options.includeMarketInfo && mergedData) {
        const analysis = StockSymbolAnalyzer.analyzeSymbol(symbol);
        (mergedData as any).market = analysis.market;
        (mergedData as any).stockType = analysis.type;
      }
      
      return mergedData;
      
    } catch (error) {
      logger.error('stock', `${symbol} 混合資料獲取失敗`, error);
      return null;
    }
  }
  
  /**
   * 延遲函數
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 便利函數
export const getStockPrice = StockDataMerger.getStockPrice;
export const getBatchStockPrices = StockDataMerger.getBatchStockPrices;
export const mergeStockData = StockDataMerger.mergeStockData;
export const validateStockData = StockDataMerger.validateStockData;

// 預設導出
export default StockDataMerger;