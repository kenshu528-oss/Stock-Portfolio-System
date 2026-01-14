// 增強版股票操作 Hook - 疊加式功能
// 遵循 safe-development.md：不破壞現有功能，只添加增強功能

import { useCallback } from 'react';
import { useAppStore } from '../stores/appStore';
import { enhanceStockRecord } from '../services/stockEnhancementService';
import type { StockRecord } from '../types';

/**
 * 增強版股票操作 Hook
 * 在原有 addStock 基礎上添加股息自動計算和債券ETF識別
 */
export function useEnhancedStock() {
  const { addStock: originalAddStock } = useAppStore();

  /**
   * 增強版新增股票函數
   * 自動計算股息並識別債券ETF，然後調用原有的 addStock
   */
  const addStockWithEnhancements = useCallback(async (stock: StockRecord) => {
    try {
      console.log(`開始新增增強版股票: ${stock.symbol}`);
      
      // 1. 增強股票記錄（添加股息和債券ETF資訊）
      const enhancedStock = await enhanceStockRecord(stock);
      
      // 2. 調用原有的 addStock 函數（保持現有邏輯不變）
      originalAddStock(enhancedStock);
      
      console.log(`增強版股票新增完成: ${stock.symbol}`, {
        isBondETF: enhancedStock.isBondETF,
        transactionTaxRate: enhancedStock.transactionTaxRate,
        dividendCount: enhancedStock.dividendRecords?.length || 0
      });
      
      return { success: true, stock: enhancedStock };
      
    } catch (error) {
      console.error(`增強版股票新增失敗 ${stock.symbol}:`, error);
      
      // 發生錯誤時，仍然使用原有的 addStock（確保功能不會完全失效）
      console.log(`回退到原有 addStock: ${stock.symbol}`);
      originalAddStock(stock);
      
      return { success: false, stock, error: error instanceof Error ? error.message : '未知錯誤' };
    }
  }, [originalAddStock]);

  /**
   * 批量新增增強版股票
   * 用於匯入功能
   */
  const batchAddStocksWithEnhancements = useCallback(async (
    stocks: StockRecord[],
    onProgress?: (current: number, total: number, symbol: string) => void
  ) => {
    const results = [];
    
    for (let i = 0; i < stocks.length; i++) {
      const stock = stocks[i];
      
      // 通知進度
      if (onProgress) {
        onProgress(i + 1, stocks.length, stock.symbol);
      }
      
      const result = await addStockWithEnhancements(stock);
      results.push(result);
      
      // 避免過於頻繁的操作
      if (i < stocks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    return results;
  }, [addStockWithEnhancements]);

  return {
    addStockWithEnhancements,
    batchAddStocksWithEnhancements,
    // 也提供原有函數的訪問（向後相容）
    addStock: originalAddStock
  };
}

/**
 * 簡化版 Hook，用於不需要增強功能的場景
 * 確保向後相容性
 */
export function useBasicStock() {
  const { addStock } = useAppStore();
  return { addStock };
}