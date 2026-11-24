// 除權息事件處理服務
import type { StockRecord, DividendRecord } from '../types';
import { RightsAdjustmentService } from './rightsAdjustmentService';
import { DividendApiService, type DividendApiRecord } from './dividendApiService';
import { logger } from '../utils/logger';

export class RightsEventService {
  
  /**
   * 將 API 除權息資料轉換為系統 DividendRecord
   */
  static convertApiRecordToDividendRecord(
    apiRecord: DividendApiRecord,
    stockRecord: StockRecord,
    recordId: string,
    currentShares: number,
    currentCostPrice: number
  ): DividendRecord {
    
    const exRightDate = new Date(apiRecord.exDividendDate);
    
    // 計算配股數量
    const stockDividendRatio = apiRecord.stockDividendRatio || 0;
    const stockDividendShares = Math.floor(currentShares * stockDividendRatio / 1000);
    
    // 計算現金股利總額
    const totalCashDividend = currentShares * apiRecord.dividendPerShare;
    
    // 計算除權息後的調整
    const { adjustedCostPrice, sharesAfterRight } = RightsAdjustmentService.calculateAdjustedCostPrice(
      currentCostPrice,
      currentShares,
      apiRecord.dividendPerShare,
      stockDividendRatio
    );
    
    return {
      id: recordId,
      stockId: stockRecord.id,
      symbol: stockRecord.symbol,
      exRightDate: exRightDate,
      
      // 現金股利
      cashDividendPerShare: apiRecord.dividendPerShare,
      totalCashDividend: totalCashDividend,
      
      // 股票股利
      stockDividendRatio: stockDividendRatio,
      stockDividendShares: stockDividendShares,
      
      // 持股狀況
      sharesBeforeRight: currentShares,
      sharesAfterRight: sharesAfterRight,
      
      // 成本價調整
      costPriceBeforeRight: currentCostPrice,
      costPriceAfterRight: adjustedCostPrice,
      
      // 其他資訊
      recordDate: apiRecord.recordDate ? new Date(apiRecord.recordDate) : undefined,
      paymentDate: apiRecord.paymentDate ? new Date(apiRecord.paymentDate) : undefined,
      type: apiRecord.type || 'cash',
      
      // 向後相容欄位
      exDividendDate: exRightDate,
      dividendPerShare: apiRecord.dividendPerShare,
      totalDividend: totalCashDividend,
      shares: currentShares
    };
  }
  
  /**
   * 處理股票的除權息事件
   * @param forceRecalculate 強制重新計算所有除權息（即使已存在記錄）
   */
  static async processStockRightsEvents(
    stockRecord: StockRecord,
    onProgress?: (message: string) => void,
    forceRecalculate: boolean = false
  ): Promise<StockRecord> {
    
    try {
      onProgress?.(`🔍 獲取 ${stockRecord.symbol} 的除權息資料...`);
      
      // 先取得 API 全部歷史除息資料（不過濾購買日），用於判斷 API 本身是否有資料
      const allApiRecords = await DividendApiService.getDividendData(stockRecord.symbol);
      
      // 再取購買日之後的除息資料（用於實際計算）
      const apiRecords = await DividendApiService.getHistoricalDividends(
        stockRecord.symbol,
        stockRecord.purchaseDate
      );
      
      if (apiRecords.length === 0) {
        // 判斷是否為債券 ETF
        const isBondETF = /^00\d{2,3}B$/i.test(stockRecord.symbol);
        
        if (isBondETF) {
          onProgress?.(`💡 ${stockRecord.symbol} 是債券 ETF，API 無配息資料`);
          onProgress?.(`📊 建議手動輸入配息記錄`);
          onProgress?.(`🔗 資料來源：https://goodinfo.tw/tw/StockDividendPolicy.asp?STOCK_ID=${stockRecord.symbol}`);
        } else {
          onProgress?.(`ℹ️ ${stockRecord.symbol} 無除權息資料`);
        }
        
        // ⚠️ 關鍵修復（修正版）：只有在「API 有資料但全被日期過濾掉」時才清除舊記錄
        // allApiRecords.length > 0 = API 有此股票的除息資料，只是購買日後無除息（如 9/23 買、9/23 除息）
        //   → 說明舊記錄是錯誤的，應清除
        // allApiRecords.length === 0 = API 本身查不到（如債券 ETF 手動輸入記錄）
        //   → 保留手動記錄，不清除
        if (forceRecalculate && allApiRecords.length > 0 && (stockRecord.dividendRecords?.length || 0) > 0) {
          const totalStockDividend = (stockRecord.dividendRecords || []).reduce(
            (sum, record) => sum + (record.stockDividendShares || 0), 0
          );
          const originalShares = stockRecord.shares - totalStockDividend;
          logger.debug('rights', `forceRecalculate 清除 ${stockRecord.symbol} 舊除息記錄（API 有資料但購買日後無除息）`);
          return {
            ...stockRecord,
            shares: originalShares,
            dividendRecords: [],
            adjustedCostPrice: undefined,
            lastDividendUpdate: undefined
          };
        }
        
        return stockRecord;
      }
      
      onProgress?.(`📊 找到 ${apiRecords.length} 筆除權息記錄`);
      
      // ⚠️ 關鍵：必須按時間從舊到新排序（API 可能返回從新到舊）
      const sortedApiRecords = apiRecords.sort((a, b) => 
        new Date(a.exDividendDate).getTime() - new Date(b.exDividendDate).getTime()
      );
      
      // console.log(`🔄 除權息排序: ${stockRecord.symbol}`, {
      //   原始順序: apiRecords.map(d => d.exDividendDate),
      //   排序後: sortedApiRecords.map(d => d.exDividendDate)
      // });
      logger.debug('rights', `除權息排序: ${stockRecord.symbol}`, {
        原始順序: apiRecords.map(d => d.exDividendDate),
        排序後: sortedApiRecords.map(d => d.exDividendDate)
      });
      
      // 如果強制重新計算，清除現有記錄並重置到原始狀態
      if (forceRecalculate) {
        // console.log(`🔄 強制重新計算 ${stockRecord.symbol} 的除權息`);
        logger.debug('rights', `強制重新計算 ${stockRecord.symbol} 的除權息`);
        
        // 計算原始持股數（扣除所有配股）
        const totalStockDividend = (stockRecord.dividendRecords || []).reduce(
          (sum, record) => sum + (record.stockDividendShares || 0), 
          0
        );
        const originalShares = stockRecord.shares - totalStockDividend;
        
        // console.log(`📊 重置 ${stockRecord.symbol}: 當前持股 ${stockRecord.shares} → 原始持股 ${originalShares}`);
        logger.debug('rights', `重置 ${stockRecord.symbol}: 當前持股 ${stockRecord.shares} → 原始持股 ${originalShares}`);
        
        stockRecord = {
          ...stockRecord,
          shares: originalShares, // 重置到原始持股數
          dividendRecords: [],
          adjustedCostPrice: undefined,
          lastDividendUpdate: undefined
        };
      }
      
      // 轉換為系統格式並處理
      let updatedStock = { ...stockRecord };
      const newDividendRecords: DividendRecord[] = [];
      const existingRecords = stockRecord.dividendRecords || [];
      
      // ⚠️ 關鍵：使用累積的 currentShares，而非固定的 stockRecord.shares
      let currentShares = updatedStock.shares;
      let currentCostPrice = updatedStock.adjustedCostPrice || updatedStock.costPrice;
      
      for (let i = 0; i < sortedApiRecords.length; i++) {
        const apiRecord = sortedApiRecords[i];
        const recordId = `${stockRecord.id}_dividend_${apiRecord.exDividendDate.replace(/-/g, '')}`;
        
        // 檢查是否已經處理過這筆除權息（只檢查日期和代碼）
        const alreadyProcessed = existingRecords.some(existing => {
          const existingDate = existing.exRightDate || existing.exDividendDate;
          if (!existingDate) return false;
          
          // 安全地轉換日期為字符串
          const existingDateStr = existingDate instanceof Date 
            ? existingDate.toISOString().split('T')[0]
            : new Date(existingDate).toISOString().split('T')[0];
          const apiDateStr = apiRecord.exDividendDate;
          
          // 只檢查日期和代碼（同一天不可能有兩次除權息）
          const sameDate = existingDateStr === apiDateStr;
          const sameSymbol = existing.symbol === stockRecord.symbol;
          
          return sameDate && sameSymbol;
        });
        
        if (alreadyProcessed) {
          // console.log(`⚠️ 跳過已處理的除權息: ${stockRecord.symbol} ${apiRecord.exDividendDate}`);
          logger.debug('rights', `跳過已處理的除權息: ${stockRecord.symbol} ${apiRecord.exDividendDate}`);
          continue;
        }
        
        // 轉換為系統格式
        const dividendRecord = this.convertApiRecordToDividendRecord(
          apiRecord,
          updatedStock,
          recordId,
          currentShares,
          currentCostPrice
        );
        
        // 應用除權息調整
        updatedStock = RightsAdjustmentService.processRightsAdjustment(
          updatedStock,
          dividendRecord
        );
        
        // ⚠️ 關鍵：累積更新 currentShares 供下一筆使用
        currentShares = dividendRecord.sharesAfterRight;
        currentCostPrice = dividendRecord.costPriceAfterRight;
        
        // console.log(`📊 ${stockRecord.symbol} ${apiRecord.exDividendDate}: ${dividendRecord.sharesBeforeRight} → ${dividendRecord.sharesAfterRight} 股 (配股: ${dividendRecord.stockDividendShares})`);
        logger.debug('rights', `${stockRecord.symbol} ${apiRecord.exDividendDate}: ${dividendRecord.sharesBeforeRight} → ${dividendRecord.sharesAfterRight} 股 (配股: ${dividendRecord.stockDividendShares})`);
        
        newDividendRecords.push(dividendRecord);
        
        onProgress?.(`✅ 處理除權息: ${apiRecord.exDividendDate} (現金: $${apiRecord.dividendPerShare}, 配股: ${apiRecord.stockDividendRatio || 0}‰)`);
      }
      
      // 合併新舊除權息記錄（避免重複）
      const mergedRecords = this.mergeDividendRecords(existingRecords, newDividendRecords);
      
      updatedStock.dividendRecords = mergedRecords;
      updatedStock.lastDividendUpdate = new Date().toISOString();
      
      onProgress?.(`🎉 ${stockRecord.symbol} 除權息處理完成，共 ${mergedRecords.length} 筆記錄`);
      
      return updatedStock;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知錯誤';
      onProgress?.(`❌ ${stockRecord.symbol} 除權息處理失敗: ${errorMessage}`);
      console.error(`除權息處理失敗 ${stockRecord.symbol}:`, error);
      return stockRecord;
    }
  }
  
  /**
   * 合併除權息記錄，避免重複
   */
  static mergeDividendRecords(
    existingRecords: DividendRecord[],
    newRecords: DividendRecord[]
  ): DividendRecord[] {
    
    const merged = [...existingRecords];
    
    for (const newRecord of newRecords) {
      // 使用更嚴格的重複檢查邏輯 - 只檢查日期和代碼
      const exists = merged.some(existing => {
        const existingDate = existing.exRightDate || existing.exDividendDate;
        const newDate = newRecord.exRightDate || newRecord.exDividendDate;
        
        if (!existingDate || !newDate) return false;
        
        // 檢查日期（轉換為字串比較，避免時間差異）
        const existingDateStr = existingDate instanceof Date 
          ? existingDate.toISOString().split('T')[0]
          : new Date(existingDate).toISOString().split('T')[0];
        const newDateStr = newDate instanceof Date
          ? newDate.toISOString().split('T')[0]
          : new Date(newDate).toISOString().split('T')[0];
        
        // 只要日期和代碼相同就視為重複（同一天不可能有兩次除權息）
        const sameDate = existingDateStr === newDateStr;
        const sameSymbol = existing.symbol === newRecord.symbol;
        
        if (sameDate && sameSymbol) {
          // console.log(`⚠️ 跳過重複除權息記錄: ${newRecord.symbol} ${newDateStr}`);
          logger.debug('rights', `跳過重複除權息記錄: ${newRecord.symbol} ${newDateStr}`);
          return true;
        }
        
        return false;
      });
      
      if (!exists) {
        const newDateStr = newRecord.exRightDate instanceof Date
          ? newRecord.exRightDate.toISOString().split('T')[0]
          : newRecord.exDividendDate instanceof Date
          ? newRecord.exDividendDate.toISOString().split('T')[0]
          : 'unknown';
        // console.log(`✅ 添加新除權息記錄: ${newRecord.symbol} ${newDateStr}`);
        logger.debug('rights', `添加新除權息記錄: ${newRecord.symbol} ${newDateStr}`);
        merged.push(newRecord);
      }
    }
    
    // 按日期排序
    return merged.sort((a, b) => {
      const dateA = a.exRightDate || a.exDividendDate || new Date(0);
      const dateB = b.exRightDate || b.exDividendDate || new Date(0);
      
      // 安全地轉換為 Date 對象
      const timeA = dateA instanceof Date ? dateA.getTime() : new Date(dateA).getTime();
      const timeB = dateB instanceof Date ? dateB.getTime() : new Date(dateB).getTime();
      
      return timeA - timeB;
    });
  }
  
  /**
   * 批次處理多支股票的除權息事件
   */
  static async processBatchRightsEvents(
    stockRecords: StockRecord[],
    onProgress?: (current: number, total: number, message: string) => void,
    batchSize: number = 3,
    delayMs: number = 1500
  ): Promise<StockRecord[]> {
    
    const results: StockRecord[] = [];
    
    for (let i = 0; i < stockRecords.length; i += batchSize) {
      const batch = stockRecords.slice(i, i + batchSize);
      
      onProgress?.(i, stockRecords.length, `處理第 ${Math.floor(i / batchSize) + 1} 批股票...`);
      
      // 並行處理當前批次
      const batchPromises = batch.map(stock => 
        this.processStockRightsEvents(stock, (message) => {
          onProgress?.(i + batch.indexOf(stock), stockRecords.length, message);
        })
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // 批次間延遲
      if (i + batchSize < stockRecords.length) {
        onProgress?.(i + batchSize, stockRecords.length, `等待 ${delayMs}ms 後處理下一批...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    onProgress?.(stockRecords.length, stockRecords.length, '✅ 所有股票除權息處理完成');
    
    return results;
  }
  
  /**
   * 檢查股票是否需要更新除權息資料
   */
  static shouldUpdateRightsData(stockRecord: StockRecord, forceUpdate: boolean = false): boolean {
    if (forceUpdate) {
      return true; // 強制更新
    }
    
    if (!stockRecord.lastDividendUpdate) {
      return true; // 從未更新過
    }
    
    const lastUpdate = new Date(stockRecord.lastDividendUpdate);
    const now = new Date();
    const daysSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
    
    // 改為1天，讓更新更頻繁
    return daysSinceUpdate > 1;
  }
  
  /**
   * 獲取股票的除權息摘要
   */
  static getRightsEventsSummary(stockRecord: StockRecord): {
    totalCashDividend: number;
    totalStockDividend: number;
    eventsCount: number;
    lastEventDate: Date | null;
  } {
    
    const records = stockRecord.dividendRecords || [];
    
    const totalCashDividend = records.reduce((sum, record) => 
      sum + (record.totalCashDividend || record.totalDividend || 0), 0
    );
    
    const totalStockDividend = records.reduce((sum, record) => 
      sum + (record.stockDividendShares || 0), 0
    );
    
    const lastEventDate = records.length > 0 
      ? records.reduce((latest, record) => {
          const recordDate = record.exRightDate || record.exDividendDate;
          if (!recordDate) return latest;
          return !latest || recordDate > latest ? recordDate : latest;
        }, null as Date | null)
      : null;
    
    return {
      totalCashDividend,
      totalStockDividend,
      eventsCount: records.length,
      lastEventDate
    };
  }
}

export default RightsEventService;