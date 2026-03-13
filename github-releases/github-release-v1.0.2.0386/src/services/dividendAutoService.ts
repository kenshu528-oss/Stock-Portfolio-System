// 股息自動計算服務
// 遵循 api-data-integrity.md：使用真實API資料，不提供虛假預設資料
// 遵循 rights-calculation.md：統一使用 RightsEventService 處理配股配息

import type { StockRecord } from '../types';
import { RightsEventService } from './rightsEventService';
import { logger } from '../utils/logger';

/**
 * 自動更新股票的股息記錄
 * 遵循 rights-calculation.md：統一使用 RightsEventService.processStockRightsEvents
 * @param stock 股票記錄
 * @returns 更新後的股票記錄
 */
export async function autoUpdateDividends(stock: StockRecord): Promise<StockRecord> {
  try {
    logger.info('dividend', `開始自動更新 ${stock.symbol} 的配股配息資料`);
    
    // ✅ 遵循 rights-calculation.md：統一使用 RightsEventService
    // 使用 forceRecalculate=false 進行增量更新（新增股票時的預設行為）
    const updatedStock = await RightsEventService.processStockRightsEvents(
      stock,
      (message) => {
        logger.debug('dividend', `${stock.symbol} 處理進度: ${message}`);
      },
      false // 增量更新，不強制重新計算
    );
    
    logger.success('dividend', `${stock.symbol} 配股配息資料更新完成`, {
      配股配息記錄: updatedStock.dividendRecords?.length || 0,
      最終持股數: updatedStock.shares,
      調整後成本價: updatedStock.adjustedCostPrice
    });
    
    return updatedStock;
    
  } catch (error) {
    logger.error('dividend', `自動更新 ${stock.symbol} 配股配息失敗`, error);
    return stock; // 返回原始記錄，不影響其他功能
  }
}

/**
 * 批量更新多支股票的股息記錄
 * 遵循 rights-calculation.md：統一使用 RightsEventService.processStockRightsEvents
 * @param stocks 股票記錄陣列
 * @param onProgress 進度回調函數
 * @returns 更新後的股票記錄陣列
 */
export async function batchUpdateDividends(
  stocks: StockRecord[],
  onProgress?: (current: number, total: number, symbol: string) => void
): Promise<StockRecord[]> {
  const updatedStocks: StockRecord[] = [];
  
  for (let i = 0; i < stocks.length; i++) {
    const stock = stocks[i];
    
    // 通知進度
    if (onProgress) {
      onProgress(i + 1, stocks.length, stock.symbol);
    }
    
    try {
      // ✅ 遵循 rights-calculation.md：統一使用 RightsEventService
      const updatedStock = await RightsEventService.processStockRightsEvents(
        stock,
        (message) => {
          logger.debug('dividend', `${stock.symbol} 批量處理: ${message}`);
        },
        false // 批量更新使用增量更新
      );
      
      updatedStocks.push(updatedStock);
      
      // 避免API請求過於頻繁
      if (i < stocks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      logger.error('dividend', `批量更新 ${stock.symbol} 配股配息失敗`, error);
      updatedStocks.push(stock); // 保留原始記錄
    }
  }
  
  return updatedStocks;
}

/**
 * 檢查股票是否需要更新股息
 * @param stock 股票記錄
 * @returns 是否需要更新
 */
export function shouldUpdateDividends(stock: StockRecord): boolean {
  // 如果從未更新過股息，需要更新
  if (!stock.lastDividendUpdate) {
    return true;
  }
  
  // 如果超過24小時未更新，需要更新
  const lastUpdate = new Date(stock.lastDividendUpdate);
  const now = new Date();
  const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
  
  return hoursSinceUpdate > 24;
}

/**
 * 計算股票的總股息收入
 * @param stock 股票記錄
 * @returns 總股息收入
 */
export function calculateTotalDividends(stock: StockRecord): number {
  if (!stock.dividendRecords || stock.dividendRecords.length === 0) {
    return 0;
  }
  
  return stock.dividendRecords.reduce((total, dividend) => {
    return total + (dividend.dividendPerShare * stock.shares);
  }, 0);
}

// 導出常數
export const DIVIDEND_SERVICE_CONSTANTS = {
  UPDATE_INTERVAL_HOURS: 24,     // 股息更新間隔（小時）
  API_REQUEST_DELAY: 500,        // API請求間隔（毫秒）
  MAX_RETRIES: 3,                // 最大重試次數
} as const;