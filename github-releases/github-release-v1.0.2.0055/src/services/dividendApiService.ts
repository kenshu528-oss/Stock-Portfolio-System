// 股息API服務 - 從證交所動態獲取股息資料

export interface DividendApiRecord {
  symbol: string;
  exDividendDate: string;
  dividendPerShare: number;
  year: number;
  quarter?: number;
  paymentDate?: string;
  recordDate?: string;
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
      console.log(`📦 從快取返回 ${symbol} 股息資料`);
      return cached.data;
    }

    try {
      console.log(`🔍 獲取 ${symbol} 股息資料...`);
      
      let dividendData: DividendApiRecord[] = [];
      
      // 方法1: 優先使用後端API（避免CORS問題）
      try {
        dividendData = await this.fetchFromAlternativeAPI(symbol);
        if (dividendData.length > 0) {
          console.log(`✅ 後端API成功獲取 ${symbol} 股息資料: ${dividendData.length} 筆`);
        } else {
          console.log(`ℹ️ 後端API無資料，嘗試證交所API`);
        }
      } catch (error) {
        console.log(`❌ 後端API失敗:`, error);
      }

      // 方法2: 如果後端API沒有資料，嘗試證交所API
      if (dividendData.length === 0) {
        try {
          console.log(`🔍 嘗試證交所API獲取 ${symbol} 股息資料...`);
          dividendData = await this.fetchFromTWSEDividendAPI(symbol);
          if (dividendData.length > 0) {
            console.log(`✅ 證交所API成功獲取 ${symbol} 股息資料: ${dividendData.length} 筆`);
          } else {
            console.log(`ℹ️ 證交所API也無資料`);
          }
        } catch (error) {
          console.log(`❌ 證交所API也失敗:`, error);
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
      console.error(`獲取 ${symbol} 股息資料失敗:`, error);
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
            console.log(`嘗試證交所API: ${url}`);
            
            const response = await fetch(url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
                'Referer': 'https://www.twse.com.tw/'
              }
            });

            if (!response.ok) {
              console.log(`證交所API ${url} 返回 ${response.status}`);
              continue;
            }

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
              console.log(`證交所API ${url} 返回非JSON格式`);
              continue;
            }

            const data = await response.json();
            console.log(`證交所API回應:`, data);
            
            if (data.stat === 'OK' && data.data && data.data.length > 0) {
              const dividends = data.data.map((item: any[]) => ({
                symbol: symbol,
                exDividendDate: this.formatTaiwanDate(item[0]), // 除權息日期
                dividendPerShare: parseFloat(item[2]) || 0, // 現金股利
                year: year,
                paymentDate: this.formatTaiwanDate(item[1]), // 發放日
                recordDate: this.formatTaiwanDate(item[3]) // 停止過戶日
              })).filter((div: DividendApiRecord) => div.dividendPerShare > 0);

              allDividends.push(...dividends);
              console.log(`✅ 證交所API成功獲取 ${symbol} ${year}年 ${dividends.length} 筆股息記錄`);
              break; // 成功獲取資料，跳出API嘗試循環
            }
          } catch (apiError) {
            console.log(`證交所API ${url} 錯誤:`, apiError);
            continue;
          }
        }
      } catch (error) {
        console.log(`獲取 ${year} 年股息資料失敗:`, error);
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
          year: dividend.year,
          quarter: dividend.quarter,
          paymentDate: dividend.paymentDate,
          recordDate: dividend.recordDate
        }));
      }
      
      return [];
    } catch (error) {
      console.error('備用API請求失敗:', error);
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
      console.error('日期格式轉換失敗:', taiwanDate, error);
      return '';
    }
  }

  /**
   * 根據購買日期獲取應得股息
   */
  static async getHistoricalDividends(symbol: string, purchaseDate: Date): Promise<DividendApiRecord[]> {
    console.log(`🔍 getHistoricalDividends 被調用: ${symbol}, 購買日期: ${purchaseDate.toISOString()}`);
    
    const allDividends = await this.getDividendData(symbol);
    console.log(`📊 getDividendData 返回 ${symbol} 的所有股息:`, allDividends);
    
    const filteredDividends = allDividends.filter(dividend => {
      const exDate = new Date(dividend.exDividendDate);
      const isAfterPurchase = exDate >= purchaseDate;
      console.log(`📅 股息日期 ${dividend.exDividendDate} >= 購買日期 ${purchaseDate.toISOString().split('T')[0]}: ${isAfterPurchase}`);
      return isAfterPurchase;
    }).sort((a, b) => new Date(a.exDividendDate).getTime() - new Date(b.exDividendDate).getTime());
    
    console.log(`✅ 過濾後的 ${symbol} 股息資料:`, filteredDividends);
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