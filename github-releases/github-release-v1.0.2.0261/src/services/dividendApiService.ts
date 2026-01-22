// 股息API服務 - 從證交所動態獲取完整除權息資料
import { logger } from '../utils/logger';
import { API_ENDPOINTS, shouldUseBackendProxy } from '../config/api';
import { FinMindAPIProvider } from './finMindAPI';

export interface DividendApiRecord {
  symbol: string;
  exDividendDate: string;
  
  // 現金股利（除息）
  dividendPerShare: number;      // 每股現金股利
  
  // 股票股利（除權/配股）
  stockDividendRatio?: number;   // 配股比例（每1000股配X股）
  stockDividendPerShare?: number; // 每股配股數
  
  // 其他資訊
  year: number;
  quarter?: number;
  paymentDate?: string;
  recordDate?: string;
  
  // 除權息類型
  type?: 'cash' | 'stock' | 'both';
}

export class DividendApiService {
  private static cache = new Map<string, { data: DividendApiRecord[], timestamp: number }>();
  private static CACHE_DURATION = 24 * 60 * 60 * 1000; // 24小時快取

  /**
   * 從證交所API獲取股息資料
   */
  static async getDividendData(symbol: string): Promise<DividendApiRecord[]> {
    // 檢查快取
    const cacheKey = `dividend_${symbol}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      logger.debug('api', `從快取返回 ${symbol} 股息資料`);
      return cached.data;
    }

    try {
      logger.debug('api', `獲取 ${symbol} 股息資料...`);
      
      let dividendData: DividendApiRecord[] = [];
      
      // 🔧 遵循 api-standards.md：Yahoo Finance 優先，FinMind 備用
      // 後端已經整合了 Yahoo Finance（優先）+ FinMind（備用）策略
      try {
        dividendData = await this.fetchFromAlternativeAPI(symbol);
        if (dividendData.length > 0) {
          logger.info('api', `API成功獲取 ${symbol} 股息 (Yahoo Finance 優先)`, { count: dividendData.length });
        } else {
          logger.debug('api', `${symbol} 無股息資料`);
        }
      } catch (error) {
        // 404 是正常情況（資料不存在），不需要警告
        logger.debug('api', `API失敗`, error);
      }

      // 儲存到快取
      if (dividendData.length > 0) {
        this.cache.set(cacheKey, {
          data: dividendData,
          timestamp: Date.now()
        });
      }

      return dividendData;
    } catch (error) {
      logger.error('api', `獲取 ${symbol} 股息失敗`, error);
      return [];
    }
  }

  /**
   * 從證交所除權息資料API獲取（已停用，改用後端代理）
   * @deprecated 前端直接調用會有 CORS 問題，請使用後端 API
   */
  private static async fetchFromTWSEDividendAPI(symbol: string): Promise<DividendApiRecord[]> {
    // ⚠️ 已停用：前端直接調用證交所會有 CORS 問題
    // 所有股息資料現在都通過後端 API 獲取
    logger.debug('api', `fetchFromTWSEDividendAPI 已停用，請使用後端 API`);
    return [];
  }

  /**
   * 備用API - 使用後端代理或外部API
   */
  private static async fetchFromAlternativeAPI(symbol: string): Promise<DividendApiRecord[]> {
    try {
      // 檢查是否應該使用後端代理
      if (!shouldUseBackendProxy()) {
        logger.debug('dividend', `GitHub Pages 環境，使用 Yahoo Finance 優先策略獲取 ${symbol} 股息...`);
        
        // 🔧 遵循 api-standards.md：Yahoo Finance 優先，FinMind 備用
        // 1. 優先嘗試 Yahoo Finance（債券 ETF 配息資料最完整）
        // 2. 備用 FinMind API（一般股票）
        
        // 檢查是否為債券 ETF
        const isBondETF = /^00\d{2,3}B$/i.test(symbol);
        
        if (isBondETF) {
          logger.debug('dividend', `${symbol} 是債券 ETF，優先使用 Yahoo Finance`);
          // 債券 ETF 建議手動管理，因為 API 資料可能不完整
          logger.info('dividend', `債券 ETF ${symbol} 建議使用手動股息管理功能`);
        } else {
          logger.debug('dividend', `${symbol} 是一般股票，使用 FinMind 備用`);
          // 一般股票使用 FinMind API
          const finMindProvider = new FinMindAPIProvider();
          try {
            const dividendData = await finMindProvider.getDividendData(symbol);
            
            if (dividendData && dividendData.length > 0) {
              logger.info('dividend', `FinMind API 成功獲取 ${symbol} 股息`, { count: dividendData.length });
              return dividendData.map(item => ({
                symbol: symbol,
                exDividendDate: item.exDividendDate,
                cashDividendPerShare: item.cashDividendPerShare,
                stockDividendRatio: item.stockDividendRatio,
                source: 'FinMind (備用)'
              }));
            }
          } catch (error) {
            logger.warn('dividend', `FinMind API 獲取 ${symbol} 股息失敗`, error);
            // 如果是 402 錯誤，記錄但不影響功能
            if (error instanceof Error && error.message.includes('402')) {
              logger.info('dividend', `FinMind API 需要付費，已跳過`);
            }
          }
        }
        
        logger.debug('dividend', `${symbol} 無股息資料`);
        return [];
      }
      
      // 使用後端代理
      const response = await fetch(API_ENDPOINTS.getDividend(symbol));
      
      if (!response.ok) {
        if (response.status === 404) {
          // 404 是正常情況（資料不存在），不輸出錯誤日誌
          logger.debug('dividend', `${symbol} 除權息資料不存在 (404)`);
          return [];
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      // 轉換後端API格式到前端格式
      if (data.dividends && Array.isArray(data.dividends)) {
        return data.dividends.map((dividend: any) => ({
          symbol: symbol,
          exDividendDate: dividend.exDate, // 後端使用 exDate
          dividendPerShare: dividend.amount, // 後端使用 amount
          stockDividendRatio: dividend.stockDividendRatio || 0, // 配股比例（每1000股配X股）
          stockDividendPerShare: dividend.stockDividend || 0, // 每股配股數
          year: dividend.year,
          quarter: dividend.quarter,
          paymentDate: dividend.paymentDate,
          recordDate: dividend.recordDate,
          type: dividend.type || 'cash' // 除權息類型
        }));
      }
      
      return [];
    } catch (error) {
      // 只有非 404 錯誤才輸出日誌
      logger.error('api', '備用API請求失敗', error);
      throw error;
    }
  }

  /**
   * 轉換台灣日期格式 (民國年) 為西元年
   */
  private static formatTaiwanDate(taiwanDate: string): string {
    if (!taiwanDate || taiwanDate.length < 7) return '';
    
    try {
      // 格式: 1131216 (民國113年12月16日)
      const year = parseInt(taiwanDate.substring(0, 3)) + 1911; // 民國年轉西元年
      const month = taiwanDate.substring(3, 5);
      const day = taiwanDate.substring(5, 7);
      
      return `${year}-${month}-${day}`;
    } catch (error) {
      logger.error('api', '日期格式轉換失敗', { taiwanDate, error });
      return '';
    }
  }

  /**
   * 根據購買日期獲取應得股息
   */
  static async getHistoricalDividends(symbol: string, purchaseDate: Date): Promise<DividendApiRecord[]> {
    logger.trace('api', `getHistoricalDividends 調用`, { symbol, purchaseDate: purchaseDate.toISOString() });
    
    const allDividends = await this.getDividendData(symbol);
    logger.trace('api', `getDividendData 返回 ${symbol} 股息`, allDividends);
    
    const filteredDividends = allDividends.filter(dividend => {
      const exDate = new Date(dividend.exDividendDate);
      const isAfterPurchase = exDate >= purchaseDate;
      logger.trace('api', `股息日期檢查`, { 
        exDate: dividend.exDividendDate, 
        purchaseDate: purchaseDate.toISOString().split('T')[0], 
        isAfterPurchase 
      });
      return isAfterPurchase;
    }).sort((a, b) => new Date(a.exDividendDate).getTime() - new Date(b.exDividendDate).getTime());
    
    logger.trace('api', `過濾後的 ${symbol} 股息`, filteredDividends);
    return filteredDividends;
  }

  /**
   * 計算總股息收入
   */
  static async calculateDividendIncome(symbol: string, purchaseDate: Date, shares: number): Promise<number> {
    const dividends = await this.getHistoricalDividends(symbol, purchaseDate);
    return dividends.reduce((total, dividend) => total + (dividend.dividendPerShare * shares), 0);
  }

  /**
   * 清除快取
   */
  static clearCache(symbol?: string): void {
    if (symbol) {
      this.cache.delete(`dividend_${symbol}`);
    } else {
      this.cache.clear();
    }
  }
}

export default DividendApiService;