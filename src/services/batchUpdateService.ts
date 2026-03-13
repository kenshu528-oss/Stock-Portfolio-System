/**
 * 批量更新服務
 * 
 * 實作本機端的分批股價更新功能，減少 FinMind API 的使用次數
 * 
 * 策略：
 * 1. 將股票分批處理（每批 10 支）
 * 2. 每批之間有延遲，避免 API 限制
 * 3. 優先使用後端代理服務（本機端）
 * 4. 失敗時自動重試
 * 
 * @version 1.0.0
 * @date 2026-03-13
 */

import { logger } from '../utils/logger';
import { StockRecord } from '../types';
import { shouldUseBackendProxy } from '../config/api';

// 批量配置
const BATCH_CONFIG = {
  batchSize: 10,           // 每批處理 10 支股票
  batchDelay: 1000,        // 批次之間延遲 1 秒
  requestDelay: 200,       // 單個請求之間延遲 200ms
  maxRetries: 2,           // 最多重試 2 次
  retryDelay: 2000         // 重試延遲 2 秒
};

export interface BatchUpdateProgress {
  current: number;
  total: number;
  currentBatch: number;
  totalBatches: number;
  successCount: number;
  failCount: number;
}

export interface BatchUpdateResult {
  success: boolean;
  successCount: number;
  failCount: number;
  results: Map<string, any>;
  errors: Map<string, string>;
}

/**
 * 批量更新服務類
 */
export class BatchUpdateService {
  private static instance: BatchUpdateService;
  
  private constructor() {}
  
  static getInstance(): BatchUpdateService {
    if (!BatchUpdateService.instance) {
      BatchUpdateService.instance = new BatchUpdateService();
    }
    return BatchUpdateService.instance;
  }
  
  /**
   * 批量更新股票價格
   * 
   * @param stocks 股票列表
   * @param onProgress 進度回調
   * @returns 更新結果
   */
  async batchUpdateStockPrices(
    stocks: StockRecord[],
    onProgress?: (progress: BatchUpdateProgress) => void
  ): Promise<BatchUpdateResult> {
    if (stocks.length === 0) {
      return {
        success: true,
        successCount: 0,
        failCount: 0,
        results: new Map(),
        errors: new Map()
      };
    }
    
    logger.info('stock', `開始批量更新: ${stocks.length} 支股票`);
    
    // 分批處理
    const batches = this.splitIntoBatches(stocks, BATCH_CONFIG.batchSize);
    const totalBatches = batches.length;
    
    const results = new Map<string, any>();
    const errors = new Map<string, string>();
    let successCount = 0;
    let failCount = 0;
    let processedCount = 0;
    
    // 逐批處理
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      logger.debug('stock', `處理第 ${batchIndex + 1}/${totalBatches} 批`, {
        size: batch.length
      });
      
      // 處理當前批次
      const batchResults = await this.processBatch(batch, batchIndex, totalBatches);
      
      // 合併結果
      batchResults.forEach((result, symbol) => {
        processedCount++;
        
        if (result.success) {
          results.set(symbol, result.data);
          successCount++;
        } else {
          errors.set(symbol, result.error || '未知錯誤');
          failCount++;
        }
        
        // 回調進度
        if (onProgress) {
          onProgress({
            current: processedCount,
            total: stocks.length,
            currentBatch: batchIndex + 1,
            totalBatches,
            successCount,
            failCount
          });
        }
      });
      
      // 批次之間延遲（最後一批不需要延遲）
      if (batchIndex < batches.length - 1) {
        await this.delay(BATCH_CONFIG.batchDelay);
      }
    }
    
    logger.info('stock', `批量更新完成`, {
      success: successCount,
      fail: failCount,
      total: stocks.length
    });
    
    return {
      success: failCount === 0,
      successCount,
      failCount,
      results,
      errors
    };
  }
  
  /**
   * 處理單個批次
   */
  private async processBatch(
    batch: StockRecord[],
    batchIndex: number,
    totalBatches: number
  ): Promise<Map<string, { success: boolean; data?: any; error?: string }>> {
    const results = new Map<string, { success: boolean; data?: any; error?: string }>();
    
    // 檢查是否使用後端代理
    const useBackend = shouldUseBackendProxy();
    
    if (useBackend) {
      // 本機端：使用後端批量 API
      logger.debug('stock', `使用後端批量 API 處理批次 ${batchIndex + 1}`);
      return await this.processBatchViaBackend(batch);
    } else {
      // 雲端環境：逐個處理（使用雲端服務）
      logger.debug('stock', `使用雲端服務逐個處理批次 ${batchIndex + 1}`);
      return await this.processBatchSequentially(batch);
    }
  }
  
  /**
   * 通過後端批量 API 處理
   */
  private async processBatchViaBackend(
    batch: StockRecord[]
  ): Promise<Map<string, { success: boolean; data?: any; error?: string }>> {
    const results = new Map();
    const symbols = batch.map(s => s.symbol);
    
    try {
      // 調用後端批量 API
      const response = await fetch('http://localhost:3001/api/stocks/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ symbols })
      });
      
      if (!response.ok) {
        throw new Error(`後端 API 錯誤: ${response.status}`);
      }
      
      const data = await response.json();
      
      // 處理批量結果
      if (data.success && data.results) {
        Object.entries(data.results).forEach(([symbol, priceData]: [string, any]) => {
          if (priceData && priceData.price > 0) {
            results.set(symbol, {
              success: true,
              data: priceData
            });
          } else {
            results.set(symbol, {
              success: false,
              error: '無效的股價資料'
            });
          }
        });
      }
      
      // 處理失敗的股票
      if (data.errors) {
        Object.entries(data.errors).forEach(([symbol, error]: [string, any]) => {
          if (!results.has(symbol)) {
            results.set(symbol, {
              success: false,
              error: error.message || '獲取失敗'
            });
          }
        });
      }
      
    } catch (error) {
      logger.error('stock', '後端批量 API 調用失敗', error);
      
      // 批量失敗時，降級為逐個處理
      logger.warn('stock', '降級為逐個處理');
      return await this.processBatchSequentially(batch);
    }
    
    return results;
  }
  
  /**
   * 逐個處理批次（雲端環境或後端失敗時使用）
   */
  private async processBatchSequentially(
    batch: StockRecord[]
  ): Promise<Map<string, { success: boolean; data?: any; error?: string }>> {
    const results = new Map();
    
    // 動態導入雲端服務
    const { cloudStockPriceService } = await import('./cloudStockPriceService');
    
    for (let i = 0; i < batch.length; i++) {
      const stock = batch[i];
      
      try {
        const priceData = await cloudStockPriceService.getStockPrice(stock.symbol);
        
        if (priceData && priceData.price > 0) {
          results.set(stock.symbol, {
            success: true,
            data: priceData
          });
        } else {
          results.set(stock.symbol, {
            success: false,
            error: '無法獲取股價'
          });
        }
      } catch (error) {
        results.set(stock.symbol, {
          success: false,
          error: error.message || '獲取失敗'
        });
      }
      
      // 請求之間延遲
      if (i < batch.length - 1) {
        await this.delay(BATCH_CONFIG.requestDelay);
      }
    }
    
    return results;
  }
  
  /**
   * 將股票列表分批
   */
  private splitIntoBatches(stocks: StockRecord[], batchSize: number): StockRecord[][] {
    const batches: StockRecord[][] = [];
    
    for (let i = 0; i < stocks.length; i += batchSize) {
      batches.push(stocks.slice(i, i + batchSize));
    }
    
    return batches;
  }
  
  /**
   * 延遲函數
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 導出單例
export const batchUpdateService = BatchUpdateService.getInstance();
