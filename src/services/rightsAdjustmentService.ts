// 除權息計算服務
import type { StockRecord, DividendRecord } from '../types';

export type GainLossCalculationMode = 
  | 'excluding_rights'    // 不含除權息
  | 'cash_dividend_only'  // 只含現金股利
  | 'full_rights'         // 含完整除權息（現金+配股）
  | 'adjusted_cost_only'; // 只用調整成本價

export class RightsAdjustmentService {
  
  /**
   * 計算除權息後的調整成本價和持股數
   * 公式：調整成本價 = (除權息前成本價 × 除權息前股數 - 現金股利) ÷ 除權息後股數
   */
  static calculateAdjustedCostPrice(
    originalCostPrice: number,
    sharesBeforeRight: number,
    cashDividendPerShare: number,
    stockDividendRatio: number = 0
  ): { adjustedCostPrice: number; sharesAfterRight: number; stockDividendShares: number } {
    
    // 計算配股數量（每1000股配X股）
    const stockDividendShares = Math.floor(sharesBeforeRight * stockDividendRatio / 1000);
    const sharesAfterRight = sharesBeforeRight + stockDividendShares;
    
    // 計算總現金股利
    const totalCashDividend = sharesBeforeRight * cashDividendPerShare;
    
    // 計算調整後成本價
    const totalCostBeforeRight = originalCostPrice * sharesBeforeRight;
    let adjustedCostPrice: number;
    
    if (sharesAfterRight > 0) {
      adjustedCostPrice = (totalCostBeforeRight - totalCashDividend) / sharesAfterRight;
    } else {
      adjustedCostPrice = originalCostPrice;
    }
    
    // 確保調整後成本價不為負數
    adjustedCostPrice = Math.max(0, adjustedCostPrice);
    
    return {
      adjustedCostPrice,
      sharesAfterRight,
      stockDividendShares
    };
  }
  
  /**
   * 處理除權息事件（安全的疊加式處理）
   */
  static processRightsAdjustment(
    stockRecord: StockRecord,
    dividendRecord: DividendRecord
  ): StockRecord {
    
    const { adjustedCostPrice, sharesAfterRight } = this.calculateAdjustedCostPrice(
      stockRecord.costPrice,
      dividendRecord.sharesBeforeRight,
      dividendRecord.cashDividendPerShare,
      dividendRecord.stockDividendRatio
    );
    
    // 安全的疊加式更新，保持原有資料不變
    return {
      ...stockRecord,
      shares: sharesAfterRight,
      adjustedCostPrice: adjustedCostPrice,
      dividendRecords: [...(stockRecord.dividendRecords || []), dividendRecord]
    };
  }
  
  /**
   * 計算不同模式下的損益（考慮交易成本）
   */
  static calculateGainLossWithRights(
    stock: StockRecord, 
    mode: GainLossCalculationMode,
    brokerageFeeRate: number = 0.1425,
    transactionTaxRate: number = 0.3
  ): number {
    
    // 計算交易成本的通用邏輯
    const calculateWithTransactionCosts = (costPrice: number): number => {
      // 計算買入成本（包含買入手續費）
      const grossBuyCost = stock.shares * costPrice;
      const buyBrokerageFee = Math.max(20, Math.round(grossBuyCost * (brokerageFeeRate / 100)));
      const totalBuyCost = grossBuyCost + buyBrokerageFee;
      
      // 計算賣出收入（扣除賣出手續費和證交稅）
      const grossSellValue = stock.shares * stock.currentPrice;
      const sellBrokerageFee = Math.max(20, Math.round(grossSellValue * (brokerageFeeRate / 100)));
      
      // 使用股票的實際證交稅率
      const actualTaxRate = stock.transactionTaxRate ?? transactionTaxRate;
      const sellTransactionTax = Math.round(grossSellValue * (actualTaxRate / 100));
      const netSellValue = grossSellValue - sellBrokerageFee - sellTransactionTax;
      
      return netSellValue - totalBuyCost;
    };
    
    switch (mode) {
      case 'excluding_rights':
        // 使用原始成本價，不考慮任何除權息
        return calculateWithTransactionCosts(stock.costPrice);
        
      case 'cash_dividend_only':
        // 使用原始成本價 + 現金股利
        const totalCashDividend = this.getTotalCashDividend(stock);
        return calculateWithTransactionCosts(stock.costPrice) + totalCashDividend;
        
      case 'full_rights':
        // 使用調整成本價（已考慮完整除權息）
        const adjustedCostPrice = stock.adjustedCostPrice || stock.costPrice;
        return calculateWithTransactionCosts(adjustedCostPrice);
        
      case 'adjusted_cost_only':
        // 只使用調整成本價，不額外加現金股利
        const adjustedCost = stock.adjustedCostPrice || stock.costPrice;
        return calculateWithTransactionCosts(adjustedCost);
        
      default:
        // 預設使用現有邏輯（向後相容）
        const defaultCostPrice = stock.adjustedCostPrice || stock.costPrice;
        return calculateWithTransactionCosts(defaultCostPrice);
    }
  }
  
  /**
   * 獲取總現金股利（向後相容處理）
   */
  static getTotalCashDividend(stock: StockRecord): number {
    if (!stock.dividendRecords || stock.dividendRecords.length === 0) {
      return 0;
    }
    
    return stock.dividendRecords.reduce((total, dividend) => {
      // 優先使用新欄位，向後相容舊欄位
      const cashDividend = dividend.totalCashDividend ?? dividend.totalDividend ?? 0;
      return total + cashDividend;
    }, 0);
  }
  
  /**
   * 獲取總配股數
   */
  static getTotalStockDividend(stock: StockRecord): number {
    if (!stock.dividendRecords || stock.dividendRecords.length === 0) {
      return 0;
    }
    
    return stock.dividendRecords.reduce((total, dividend) => {
      return total + (dividend.stockDividendShares ?? 0);
    }, 0);
  }
  
  /**
   * 轉換舊格式股息記錄為新格式（向後相容）
   */
  static convertLegacyDividendRecord(
    oldRecord: any,
    currentShares: number,
    currentCostPrice: number
  ): DividendRecord {
    return {
      id: oldRecord.id,
      stockId: oldRecord.stockId,
      symbol: oldRecord.symbol,
      exRightDate: oldRecord.exDividendDate || oldRecord.exRightDate,
      
      // 現金股利
      cashDividendPerShare: oldRecord.dividendPerShare || oldRecord.cashDividendPerShare || 0,
      totalCashDividend: oldRecord.totalDividend || oldRecord.totalCashDividend || 0,
      
      // 股票股利（舊記錄預設為0）
      stockDividendRatio: oldRecord.stockDividendRatio || 0,
      stockDividendShares: oldRecord.stockDividendShares || 0,
      
      // 持股狀況（舊記錄使用當前值）
      sharesBeforeRight: oldRecord.shares || currentShares,
      sharesAfterRight: oldRecord.sharesAfterRight || currentShares,
      
      // 成本價（舊記錄使用當前值）
      costPriceBeforeRight: oldRecord.costPriceBeforeRight || currentCostPrice,
      costPriceAfterRight: oldRecord.costPriceAfterRight || currentCostPrice,
      
      // 其他資訊
      recordDate: oldRecord.recordDate,
      paymentDate: oldRecord.paymentDate,
      type: oldRecord.type || 'cash',
      
      // 向後相容欄位
      exDividendDate: oldRecord.exDividendDate,
      dividendPerShare: oldRecord.dividendPerShare,
      totalDividend: oldRecord.totalDividend,
      shares: oldRecord.shares
    };
  }
}

export default RightsAdjustmentService;