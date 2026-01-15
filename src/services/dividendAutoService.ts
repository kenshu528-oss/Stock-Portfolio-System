// 股息自動計算服務
// 遵循 api-data-integrity.md：使用真實API資料，不提供虛假預設資料

import type { StockRecord, DividendRecord } from '../types';
import { API_ENDPOINTS } from '../config/api';

export interface DividendAPIResponse {
  symbol: string;
  dividends: Array<{
    exDate: string;        // 除息日
    payDate?: string;      // 發放日
    amount: number;        // 每股股息
    type: 'cash' | 'stock' | 'mixed'; // 股息類型
    year: number;          // 年度
    quarter?: number;      // 季度（如果是季配息）
  }>;
}

/**
 * 從API獲取股息資料
 * 遵循 api-data-integrity.md：真實資料優先，API失敗時不提供虛假資料
 */
async function fetchDividendData(symbol: string): Promise<DividendAPIResponse | null> {
  try {
    // 嘗試從後端API獲取股息資料
    const response = await fetch(API_ENDPOINTS.getDividend(symbol));
    
    if (!response.ok) {
      // 404 是正常情況（股票無股息資料），不需要警告
      if (response.status !== 404) {
        console.warn(`股息API回應錯誤: ${response.status} for ${symbol}`);
      }
      return null;
    }
    
    const data = await response.json();
    
    // 驗證API回應格式
    if (!data || !Array.isArray(data.dividends)) {
      console.warn(`股息API回應格式錯誤 for ${symbol}:`, data);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error(`獲取股息資料失敗 for ${symbol}:`, error);
    return null;
  }
}

/**
 * 計算股票的歷史股息記錄
 * @param stock 股票記錄
 * @param purchaseDate 購買日期
 * @returns 符合條件的股息記錄陣列
 */
export async function calculateHistoricalDividends(
  stock: StockRecord, 
  purchaseDate: Date
): Promise<DividendRecord[]> {
  try {
    // 使用 DEBUG 等級，避免過多日誌
    // console.log(`開始計算 ${stock.symbol} 的歷史股息...`);
    
    // 從API獲取股息資料
    const dividendData = await fetchDividendData(stock.symbol);
    
    if (!dividendData || dividendData.dividends.length === 0) {
      // 使用 DEBUG 等級，避免過多日誌
      // console.log(`${stock.symbol} 無股息資料或API無回應`);
      return [];
    }
    
    const purchaseDateObj = new Date(purchaseDate);
    const validDividends: DividendRecord[] = [];
    
    // 篩選購買日期之後的股息
    for (const dividend of dividendData.dividends) {
      const exDateObj = new Date(dividend.exDate);
      
      // 只計算購買日期之後的除息
      if (exDateObj > purchaseDateObj) {
        const dividendRecord: DividendRecord = {
          id: `${stock.symbol}-${dividend.exDate}`,
          stockId: stock.id,
          symbol: stock.symbol,
          exDividendDate: new Date(dividend.exDate),
          dividendPerShare: dividend.amount,
          totalDividend: dividend.amount * stock.shares,
          shares: stock.shares
        };
        
        validDividends.push(dividendRecord);
      }
    }
    
    // 使用 DEBUG 等級，避免過多日誌
    // console.log(`${stock.symbol} 找到 ${validDividends.length} 筆有效股息記錄`);
    return validDividends.sort((a, b) => new Date(a.exDividendDate).getTime() - new Date(b.exDividendDate).getTime());
    
  } catch (error) {
    console.error(`計算 ${stock.symbol} 股息時發生錯誤:`, error);
    return [];
  }
}

/**
 * 自動更新股票的股息記錄
 * @param stock 股票記錄
 * @returns 更新後的股票記錄
 */
export async function autoUpdateDividends(stock: StockRecord): Promise<StockRecord> {
  try {
    // 計算歷史股息
    const dividends = await calculateHistoricalDividends(stock, stock.purchaseDate);
    
    // 計算調整後成本價（成本價 - 累積每股股息）
    let adjustedCostPrice = stock.costPrice;
    if (dividends.length > 0) {
      const totalDividendPerShare = dividends.reduce(
        (sum, dividend) => sum + dividend.dividendPerShare, 
        0
      );
      adjustedCostPrice = Math.max(stock.costPrice - totalDividendPerShare, 0);
      
      console.log(`${stock.symbol} 調整後成本價計算:`, {
        原始成本: stock.costPrice,
        累積股息: totalDividendPerShare,
        調整後成本: adjustedCostPrice
      });
    }
    
    // 更新股票記錄
    const updatedStock: StockRecord = {
      ...stock,
      dividendRecords: dividends,
      adjustedCostPrice: adjustedCostPrice,
      lastDividendUpdate: new Date().toISOString()
    };
    
    // 使用 DEBUG 等級，避免過多日誌
    // console.log(`${stock.symbol} 股息記錄已更新，共 ${dividends.length} 筆`);
    return updatedStock;
    
  } catch (error) {
    console.error(`自動更新 ${stock.symbol} 股息失敗:`, error);
    return stock; // 返回原始記錄，不影響其他功能
  }
}

/**
 * 批量更新多支股票的股息記錄
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
      const updatedStock = await autoUpdateDividends(stock);
      updatedStocks.push(updatedStock);
      
      // 避免API請求過於頻繁
      if (i < stocks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`批量更新 ${stock.symbol} 股息失敗:`, error);
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