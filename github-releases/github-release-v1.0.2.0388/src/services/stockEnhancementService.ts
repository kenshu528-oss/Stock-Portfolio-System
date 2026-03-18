// 股票增強服務 - 疊加式功能添加
// 遵循 safe-development.md：不破壞現有功能，只添加新功能

import type { StockRecord } from '../types';
import { identifyBondETF } from './bondETFService';
import { autoUpdateDividends, shouldUpdateDividends } from './dividendAutoService';

/**
 * 增強股票記錄 - 添加債券ETF識別和股息自動計算
 * 這是一個疊加式功能，不會破壞現有的 addStock 邏輯
 */
export async function enhanceStockRecord(stock: StockRecord): Promise<StockRecord> {
  try {
    console.log(`開始增強股票記錄: ${stock.symbol}`);
    
    // 1. 識別債券ETF並設定證交稅率（疊加功能）
    const bondInfo = identifyBondETF(stock.symbol, stock.name);
    
    // 2. 創建增強版股票記錄（保留所有原有欄位）
    let enhancedStock: StockRecord = {
      ...stock, // 保留所有原有資料
      isBondETF: bondInfo.isBondETF,
      transactionTaxRate: bondInfo.transactionTaxRate,
    };
    
    // 3. 自動計算配股配息（疊加功能，不影響原有邏輯）
    // ✅ 對於新增股票，總是執行配股配息處理
    console.log(`${stock.symbol} 新增股票，開始自動計算配股配息...`);
    enhancedStock = await autoUpdateDividends(enhancedStock);
    
    console.log(`股票記錄增強完成: ${stock.symbol}`, {
      isBondETF: enhancedStock.isBondETF,
      transactionTaxRate: enhancedStock.transactionTaxRate,
      dividendCount: enhancedStock.dividendRecords?.length || 0
    });
    
    return enhancedStock;
    
  } catch (error) {
    console.error(`增強股票記錄失敗 ${stock.symbol}:`, error);
    // 發生錯誤時返回原始記錄，確保系統不會崩潰
    return stock;
  }
}

/**
 * 批量增強股票記錄
 * 用於匯入或批量處理時使用
 */
export async function batchEnhanceStocks(
  stocks: StockRecord[],
  onProgress?: (current: number, total: number, symbol: string) => void
): Promise<StockRecord[]> {
  const enhancedStocks: StockRecord[] = [];
  
  for (let i = 0; i < stocks.length; i++) {
    const stock = stocks[i];
    
    // 通知進度
    if (onProgress) {
      onProgress(i + 1, stocks.length, stock.symbol);
    }
    
    try {
      const enhancedStock = await enhanceStockRecord(stock);
      enhancedStocks.push(enhancedStock);
      
      // 避免API請求過於頻繁
      if (i < stocks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    } catch (error) {
      console.error(`批量增強失敗 ${stock.symbol}:`, error);
      enhancedStocks.push(stock); // 保留原始記錄
    }
  }
  
  return enhancedStocks;
}

/**
 * 檢查股票是否需要增強
 * 用於判斷是否需要執行增強邏輯
 */
export function needsEnhancement(stock: StockRecord): boolean {
  // 檢查是否缺少債券ETF資訊
  if (stock.isBondETF === undefined || stock.transactionTaxRate === undefined) {
    return true;
  }
  
  // 檢查是否需要更新股息
  if (shouldUpdateDividends(stock)) {
    return true;
  }
  
  return false;
}

/**
 * 安全的股票記錄更新函數
 * 確保更新過程不會破壞現有資料
 */
export function safeUpdateStock(
  originalStock: StockRecord, 
  updates: Partial<StockRecord>
): StockRecord {
  try {
    // 合併更新，保留所有原有欄位
    const updatedStock: StockRecord = {
      ...originalStock,
      ...updates,
      // 確保關鍵欄位不會被意外清空
      id: originalStock.id,
      symbol: originalStock.symbol,
      accountId: originalStock.accountId,
    };
    
    return updatedStock;
  } catch (error) {
    console.error('安全更新股票記錄失敗:', error);
    return originalStock; // 返回原始記錄
  }
}

// 導出常數
export const ENHANCEMENT_CONSTANTS = {
  API_DELAY: 300,           // API請求間隔（毫秒）
  MAX_BATCH_SIZE: 10,       // 最大批量處理數量
  RETRY_ATTEMPTS: 2,        // 重試次數
} as const;