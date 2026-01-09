// 台灣股票歷史股息資料庫
// 資料來源：各公司官網、證交所公告

export interface HistoricalDividend {
  symbol: string;
  exDividendDate: string; // YYYY-MM-DD格式
  dividendPerShare: number;
  year: number;
  quarter?: number; // 季配息
}

// 台灣主要ETF和股票的歷史股息資料
export const DIVIDEND_DATABASE: HistoricalDividend[] = [
  // 00878 國泰永續高股息 (季配息)
  {
    symbol: '00878',
    exDividendDate: '2025-11-18',
    dividendPerShare: 0.4,
    year: 2025,
    quarter: 3
  },
  {
    symbol: '00878',
    exDividendDate: '2025-08-18',
    dividendPerShare: 0.4,
    year: 2025,
    quarter: 2
  },
  {
    symbol: '00878',
    exDividendDate: '2025-05-19',
    dividendPerShare: 0.47,
    year: 2025,
    quarter: 1
  },
  {
    symbol: '00878',
    exDividendDate: '2024-11-18',
    dividendPerShare: 0.35,
    year: 2024,
    quarter: 4
  },
  {
    symbol: '00878',
    exDividendDate: '2024-08-19',
    dividendPerShare: 0.35,
    year: 2024,
    quarter: 3
  },
  {
    symbol: '00878',
    exDividendDate: '2024-05-20',
    dividendPerShare: 0.4,
    year: 2024,
    quarter: 2
  },
  {
    symbol: '00878',
    exDividendDate: '2024-02-19',
    dividendPerShare: 0.4,
    year: 2024,
    quarter: 1
  },

  // 00919 群益台灣精選高息 (半年配息)
  {
    symbol: '00919',
    exDividendDate: '2024-12-16',
    dividendPerShare: 0.38,
    year: 2024
  },
  {
    symbol: '00919',
    exDividendDate: '2024-06-17',
    dividendPerShare: 0.35,
    year: 2024
  },
  {
    symbol: '00919',
    exDividendDate: '2023-12-18',
    dividendPerShare: 0.32,
    year: 2023
  },
  {
    symbol: '00919',
    exDividendDate: '2023-06-19',
    dividendPerShare: 0.3,
    year: 2023
  },

  // 0056 元大高股息 (年配息)
  {
    symbol: '0056',
    exDividendDate: '2024-10-21',
    dividendPerShare: 2.2,
    year: 2024
  },
  {
    symbol: '0056',
    exDividendDate: '2023-10-23',
    dividendPerShare: 2.2,
    year: 2023
  },
  {
    symbol: '0056',
    exDividendDate: '2022-10-24',
    dividendPerShare: 1.8,
    year: 2022
  },

  // 0050 元大台灣50 (半年配息)
  {
    symbol: '0050',
    exDividendDate: '2024-10-21',
    dividendPerShare: 1.85,
    year: 2024
  },
  {
    symbol: '0050',
    exDividendDate: '2024-04-22',
    dividendPerShare: 1.85,
    year: 2024
  },
  {
    symbol: '0050',
    exDividendDate: '2023-10-23',
    dividendPerShare: 1.7,
    year: 2023
  },
  {
    symbol: '0050',
    exDividendDate: '2023-04-24',
    dividendPerShare: 1.7,
    year: 2023
  },

  // 2330 台積電 (季配息)
  {
    symbol: '2330',
    exDividendDate: '2024-12-12',
    dividendPerShare: 4.0,
    year: 2024,
    quarter: 4
  },
  {
    symbol: '2330',
    exDividendDate: '2024-09-12',
    dividendPerShare: 4.0,
    year: 2024,
    quarter: 3
  },
  {
    symbol: '2330',
    exDividendDate: '2024-06-13',
    dividendPerShare: 4.0,
    year: 2024,
    quarter: 2
  },
  {
    symbol: '2330',
    exDividendDate: '2024-03-14',
    dividendPerShare: 4.0,
    year: 2024,
    quarter: 1
  },

  // 2317 鴻海 (年配息)
  {
    symbol: '2317',
    exDividendDate: '2024-07-15',
    dividendPerShare: 5.2,
    year: 2024
  },
  {
    symbol: '2317',
    exDividendDate: '2023-07-17',
    dividendPerShare: 5.0,
    year: 2023
  },

  // 2454 聯發科 (年配息)
  {
    symbol: '2454',
    exDividendDate: '2024-06-20',
    dividendPerShare: 75.0,
    year: 2024
  },
  {
    symbol: '2454',
    exDividendDate: '2023-06-21',
    dividendPerShare: 70.0,
    year: 2023
  },

  // 2881 富邦金 (年配息)
  {
    symbol: '2881',
    exDividendDate: '2024-07-22',
    dividendPerShare: 1.3,
    year: 2024
  },
  {
    symbol: '2881',
    exDividendDate: '2023-07-24',
    dividendPerShare: 1.2,
    year: 2023
  },

  // 2882 國泰金 (年配息)
  {
    symbol: '2882',
    exDividendDate: '2024-07-18',
    dividendPerShare: 1.5,
    year: 2024
  },
  {
    symbol: '2882',
    exDividendDate: '2023-07-19',
    dividendPerShare: 1.4,
    year: 2023
  }
];

// 股息資料庫服務
export class DividendDatabaseService {
  /**
   * 根據股票代碼和購買日期獲取歷史股息
   */
  static getHistoricalDividends(symbol: string, purchaseDate: Date): HistoricalDividend[] {
    return DIVIDEND_DATABASE
      .filter(dividend => 
        dividend.symbol === symbol && 
        new Date(dividend.exDividendDate) >= purchaseDate
      )
      .sort((a, b) => new Date(a.exDividendDate).getTime() - new Date(b.exDividendDate).getTime());
  }

  /**
   * 獲取特定股票的所有歷史股息
   */
  static getAllDividends(symbol: string): HistoricalDividend[] {
    return DIVIDEND_DATABASE
      .filter(dividend => dividend.symbol === symbol)
      .sort((a, b) => new Date(b.exDividendDate).getTime() - new Date(a.exDividendDate).getTime());
  }

  /**
   * 計算歷史應得股息總額
   */
  static calculateHistoricalDividends(symbol: string, purchaseDate: Date, shares: number): number {
    const dividends = this.getHistoricalDividends(symbol, purchaseDate);
    return dividends.reduce((total, dividend) => total + (dividend.dividendPerShare * shares), 0);
  }

  /**
   * 獲取最近一年的股息
   */
  static getRecentYearDividends(symbol: string): HistoricalDividend[] {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    return DIVIDEND_DATABASE
      .filter(dividend => 
        dividend.symbol === symbol && 
        new Date(dividend.exDividendDate) >= oneYearAgo
      )
      .sort((a, b) => new Date(b.exDividendDate).getTime() - new Date(a.exDividendDate).getTime());
  }

  /**
   * 計算年化殖利率
   */
  static calculateAnnualYield(symbol: string, currentPrice: number): number {
    if (currentPrice <= 0) return 0;
    
    const recentDividends = this.getRecentYearDividends(symbol);
    const totalDividend = recentDividends.reduce((sum, dividend) => sum + dividend.dividendPerShare, 0);
    
    return (totalDividend / currentPrice) * 100;
  }

  /**
   * 檢查是否有股息資料
   */
  static hasDividendData(symbol: string): boolean {
    return DIVIDEND_DATABASE.some(dividend => dividend.symbol === symbol);
  }

  /**
   * 獲取支援的股票列表
   */
  static getSupportedStocks(): string[] {
    const symbols = new Set(DIVIDEND_DATABASE.map(dividend => dividend.symbol));
    return Array.from(symbols).sort();
  }
}

export default DividendDatabaseService;