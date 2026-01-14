// 股息API服務 - 從證交所動態獲取完整除權息資料
import { logger } from '../utils/logger';

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
      
      // 方法1: 優先使用後端API（避免CORS問題）
      try {
        dividendData = await this.fetchFromAlternativeAPI(symbol);
        if (dividendData.length > 0) {
          logger.info('api', `後端API成功獲取 ${symbol} 股息`, { count: dividendData.length });
        } else {
          logger.debug('api', `後端API無資料，嘗試證交所API`);
        }
      } catch (error) {
        // 404 是正常情況（資料不存在），不需要警告
        logger.debug('api', `後端API失敗`, error);
      }

      // 方法2: 如果後端API沒有資料，嘗試證交所API
      if (dividendData.length === 0) {
        try {
          logger.debug('api', `嘗試證交所API獲取 ${symbol} 股息`);
          dividendData = await this.fetchFromTWSEDividendAPI(symbol);
          if (dividendData.length > 0) {
            logger.info('api', `證交所API成功獲取 ${symbol} 股息`, { count: dividendData.length });
          } else {
            logger.debug('api', `證交所API也無資料`);
          }
        } catch (error) {
          // CORS 錯誤或 404 是正常情況，不需要警告
          logger.debug('api', `證交所API失敗`, error);
        }
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
   * 從證交所除權息資料API獲取
   */
  private static async fetchFromTWSEDividendAPI(symbol: string): Promise<DividendApiRecord[]> {
    // 證交所除權息查詢API - 使用正確的端點
    const currentYear = new Date().getFullYear();
    const years = [currentYear, currentYear - 1, currentYear - 2]; // 查詢三年資料
    const allDividends: DividendApiRecord[] = [];

    for (const year of years) {
      try {
        // 嘗試多個可能的證交所API端點
        const apiUrls = [
          `https://www.twse.com.tw/exchangeReport/TWT48?response=json&date=${year}0101&stockNo=${symbol}`,
          `https://www.twse.com.tw/rwd/zh/exRight/TWT48?response=json&date=${year}0101&stockNo=${symbol}`,
          `https://www.twse.com.tw/exchangeReport/TWT49?response=json&date=${year}0101&stockNo=${symbol}`,
          `https://www.twse.com.tw/rwd/zh/exRight/TWT49?response=json&date=${year}0101&stockNo=${symbol}`
        ];
        
        for (const url of apiUrls) {
          try {
            logger.trace('api', `嘗試證交所API: ${url}`);
            
            const response = await fetch(url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
                'Referer': 'https://www.twse.com.tw/'
              }
            });

            if (!response.ok) {
              logger.trace('api', `證交所API ${url} 返回 ${response.status}`);
              continue;
            }

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
              logger.trace('api', `證交所API ${url} 返回非JSON格式`);
              continue;
            }

            const data = await response.json();
            logger.trace('api', `證交所API回應`, data);
            
            if (data.stat === 'OK' && data.data && data.data.length > 0) {
              const dividends = data.data.map((item: any[]) => {
                // 證交所除權息資料格式：
                // item[0]: 除權息日期
                // item[1]: 發放日
                // item[2]: 現金股利
                // item[3]: 停止過戶日
                // item[4]: 配股比例（如果有）
                // item[5]: 配股股數（如果有）
                
                const cashDividend = parseFloat(item[2]) || 0;
                const stockDividendRatio = parseFloat(item[4]) || 0; // 每1000股配X股
                const stockDividendPerShare = parseFloat(item[5]) || 0; // 每股配股數
                
                // 判斷除權息類型
                let type: 'cash' | 'stock' | 'both' = 'cash';
                if (cashDividend > 0 && (stockDividendRatio > 0 || stockDividendPerShare > 0)) {
                  type = 'both';
                } else if (stockDividendRatio > 0 || stockDividendPerShare > 0) {
                  type = 'stock';
                }
                
                return {
                  symbol: symbol,
                  exDividendDate: this.formatTaiwanDate(item[0]), // 除權息日期
                  dividendPerShare: cashDividend, // 現金股利
                  stockDividendRatio: stockDividendRatio, // 配股比例
                  stockDividendPerShare: stockDividendPerShare, // 每股配股數
                  year: year,
                  paymentDate: this.formatTaiwanDate(item[1]), // 發放日
                  recordDate: this.formatTaiwanDate(item[3]), // 停止過戶日
                  type: type
                };
              }).filter((div: DividendApiRecord) => 
                div.dividendPerShare > 0 || div.stockDividendRatio > 0 || div.stockDividendPerShare > 0
              );

              allDividends.push(...dividends);
              logger.debug('api', `證交所API成功獲取 ${symbol} ${year}年`, { count: dividends.length });
              break; // 成功獲取資料，跳出API嘗試循環
            }
          } catch (apiError) {
            logger.trace('api', `證交所API ${url} 錯誤`, apiError);
            continue;
          }
        }
      } catch (error) {
        logger.trace('api', `獲取 ${year} 年股息失敗`, error);
      }
    }

    return allDividends;
  }

  /**
   * 備用API - 使用後端代理
   */
  private static async fetchFromAlternativeAPI(symbol: string): Promise<DividendApiRecord[]> {
    try {
      const response = await fetch(`http://localhost:3001/api/dividend/${symbol}`);
      
      if (!response.ok) {
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