// 測試配股處理工具
import type { StockRecord, DividendRecord } from '../types';

/**
 * 創建測試用的配股記錄
 */
export function createTestStockRights(stock: StockRecord): DividendRecord {
  const testRightsRecord: DividendRecord = {
    id: `${stock.id}_test_rights_${Date.now()}`,
    stockId: stock.id,
    symbol: stock.symbol,
    exRightDate: new Date('2024-08-15'), // 測試除權日
    
    // 現金股利
    cashDividendPerShare: 1.5, // 每股1.5元現金股利
    totalCashDividend: stock.shares * 1.5,
    
    // 配股資料 - 測試每1000股配50股
    stockDividendRatio: 50, // 每1000股配50股 (5%)
    stockDividendShares: Math.floor(stock.shares * 50 / 1000), // 實際配得股數
    
    // 持股狀況
    sharesBeforeRight: stock.shares,
    sharesAfterRight: stock.shares + Math.floor(stock.shares * 50 / 1000),
    
    // 成本價調整 - 簡化計算
    costPriceBeforeRight: stock.costPrice,
    costPriceAfterRight: stock.costPrice * 0.95, // 配股後成本價降低5%
    
    // 其他資訊
    type: 'both', // 除權息
    
    // 向後相容欄位
    exDividendDate: new Date('2024-08-15'),
    dividendPerShare: 1.5,
    totalDividend: stock.shares * 1.5,
    shares: stock.shares
  };
  
  return testRightsRecord;
}

/**
 * 應用測試配股到股票記錄
 */
export function applyTestStockRights(stock: StockRecord): StockRecord {
  const rightsRecord = createTestStockRights(stock);
  
  const updatedStock: StockRecord = {
    ...stock,
    shares: rightsRecord.sharesAfterRight, // 更新持股數量
    adjustedCostPrice: rightsRecord.costPriceAfterRight, // 更新調整成本價
    dividendRecords: [
      ...(stock.dividendRecords || []),
      rightsRecord
    ],
    lastDividendUpdate: new Date().toISOString()
  };
  
  console.log(`🧪 測試配股處理:`, {
    symbol: stock.symbol,
    原持股: stock.shares,
    配股數: rightsRecord.stockDividendShares,
    新持股: updatedStock.shares,
    原成本價: stock.costPrice,
    新調整成本價: updatedStock.adjustedCostPrice
  });
  
  return updatedStock;
}

/**
 * 計算配股摘要
 */
export function getStockRightsSummary(stock: StockRecord) {
  const records = stock.dividendRecords || [];
  const stockRightsRecords = records.filter(r => 
    r.type === 'stock' || r.type === 'both'
  );
  
  const totalStockDividend = stockRightsRecords.reduce((sum, record) => 
    sum + (record.stockDividendShares || 0), 0
  );
  
  const totalCashDividend = records.reduce((sum, record) => 
    sum + (record.totalCashDividend || record.totalDividend || 0), 0
  );
  
  return {
    hasStockRights: stockRightsRecords.length > 0,
    totalStockRightsEvents: stockRightsRecords.length,
    totalStockDividend,
    totalCashDividend,
    originalShares: stockRightsRecords.length > 0 ? 
      stockRightsRecords[0].sharesBeforeRight : stock.shares,
    currentShares: stock.shares
  };
}