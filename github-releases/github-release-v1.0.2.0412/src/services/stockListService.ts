/**
 * 股票清單服務 - 統一管理本機端和雲端環境的股票清單存取
 * 遵循 STEERING 規則：單一真相來源，環境適應性
 */

import { logger } from '../utils/logger';

interface StockListData {
  date: string;
  timestamp: string;
  count: number;
  stocks: Record<string, {
    name: string;
    industry: string;
    market: string;
    marketType?: '上市' | '上櫃' | '興櫃';
    yahooSuffix?: '.TW' | '.TWO';
  }>;
}

interface StockListService {
  loadStockList(): Promise<StockListData | null>;
  isDataFresh(data: StockListData): boolean;
  getEnvironmentInfo(): {
    isDevelopment: boolean;
    isGitHubPages: boolean;
    environment: string;
  };
}

class UnifiedStockListService implements StockListService {
  private cachedData: StockListData | null = null;
  private lastLoadTime: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5分鐘快取

  /**
   * 獲取環境資訊
   */
  getEnvironmentInfo() {
    const isDevelopment = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1';
    const isGitHubPages = window.location.hostname.includes('github.io') || 
                         window.location.hostname.includes('github.com');
    
    let environment = 'unknown';
    if (isDevelopment) environment = 'development';
    else if (isGitHubPages) environment = 'github-pages';
    else environment = 'production';

    return { isDevelopment, isGitHubPages, environment };
  }

  /**
   * 載入股票清單 - 統一入口，自動適應環境
   */
  async loadStockList(): Promise<StockListData | null> {
    // 檢查快取
    const now = Date.now();
    if (this.cachedData && (now - this.lastLoadTime) < this.CACHE_DURATION) {
      logger.debug('stock', '使用快取的股票清單', { 
        cacheAge: Math.round((now - this.lastLoadTime) / 1000) 
      });
      return this.cachedData;
    }

    const envInfo = this.getEnvironmentInfo();
    logger.info('stock', '載入股票清單', envInfo);

    try {
      let data: StockListData | null = null;

      if (envInfo.isDevelopment) {
        // 本機環境：優先使用後端，備用前端檔案
        data = await this.loadFromDevelopment();
      } else {
        // 雲端環境：使用前端檔案
        data = await this.loadFromProduction();
      }

      if (data) {
        // v1.0.2.0321: 增強股票清單，添加市場類別和 Yahoo 後綴
        const enhancedData = this.enhanceStockList(data);
        this.cachedData = enhancedData;
        this.lastLoadTime = now;
        logger.success('stock', '股票清單載入成功', {
          date: enhancedData.date,
          count: enhancedData.count,
          environment: envInfo.environment,
          enhanced: true
        });
        return enhancedData;
      } else {
        logger.warn('stock', '股票清單載入失敗', envInfo);
      }

      return data;

    } catch (error) {
      logger.error('stock', '股票清單載入錯誤', error);
      return null;
    }
  }

  /**
   * 本機環境載入策略
   * 🔧 優化：直接使用前端檔案，避免 503 錯誤
   */
  private async loadFromDevelopment(): Promise<StockListData | null> {
    logger.debug('stock', '本機環境載入策略：直接使用前端檔案');

    // 🔧 本機環境優化：直接使用前端檔案，跳過後端檢查
    // 避免 503 Service Unavailable 錯誤干擾開發體驗
    logger.debug('stock', '跳過後端檢查，直接使用前端檔案');
    return await this.loadFromFile();
  }

  /**
   * 雲端環境載入策略
   */
  private async loadFromProduction(): Promise<StockListData | null> {
    logger.debug('stock', '雲端環境載入策略');
    return await this.loadFromFile();
  }

  /**
   * 從檔案載入（統一的檔案載入邏輯）
   * 遵循 v1.0.2.0266 的檔案路徑邏輯
   */
  private async loadFromFile(): Promise<StockListData | null> {
    // 🔧 遵循 v1.0.2.0266 的檔案路徑邏輯
    const filePaths = [
      './stock_list.json',           // 主要路徑：public/stock_list.json (與 v1.0.2.0266 相同)
      '/stock_list.json',            // 備用路徑 1：絕對路徑
      './public/stock_list.json',    // 備用路徑 2：明確指定 public 目錄
    ];

    for (const filePath of filePaths) {
      try {
        logger.debug('stock', `嘗試載入檔案: ${filePath}`);
        
        const response = await fetch(filePath, {
          signal: AbortSignal.timeout(5000) // 5秒超時
        });

        if (response.ok) {
          const data = await response.json();
          
          // 驗證資料格式
          if (this.validateStockListData(data)) {
            logger.debug('stock', `檔案載入成功: ${filePath}`, { 
              count: data.count,
              date: data.date 
            });
            return data;
          } else {
            logger.warn('stock', `檔案格式無效: ${filePath}`);
          }
        } else if (response.status === 404) {
          // 404 是正常情況，不輸出警告
          logger.debug('stock', `檔案不存在: ${filePath}`);
        } else {
          logger.debug('stock', `檔案載入失敗: ${filePath} (HTTP ${response.status})`);
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'TimeoutError') {
          logger.debug('stock', `檔案載入超時: ${filePath}`);
        } else {
          logger.debug('stock', `檔案載入錯誤: ${filePath}`, error);
        }
        continue; // 嘗試下一個路徑
      }
    }

    logger.error('stock', '所有檔案路徑都載入失敗');
    return null;
  }

  /**
   * 驗證股票清單資料格式
   */
  private validateStockListData(data: any): data is StockListData {
    return (
      data &&
      typeof data === 'object' &&
      typeof data.date === 'string' &&
      typeof data.count === 'number' &&
      typeof data.stocks === 'object' &&
      data.count > 0
    );
  }

  /**
   * 檢查資料是否新鮮（當日資料）
   */
  isDataFresh(data: StockListData): boolean {
    const today = new Date().toISOString().split('T')[0];
    const isFresh = data.date === today;
    
    if (!isFresh) {
      const daysDiff = Math.floor(
        (new Date(today).getTime() - new Date(data.date).getTime()) / 
        (1000 * 60 * 60 * 24)
      );
      logger.info('stock', '股票清單資料不是最新', { 
        dataDate: data.date, 
        today, 
        daysDiff 
      });
    }

    return isFresh;
  }

  /**
   * 清除快取
   */
  clearCache(): void {
    this.cachedData = null;
    this.lastLoadTime = 0;
    logger.debug('stock', '股票清單快取已清除');
  }

  /**
   * 獲取快取狀態
   */
  getCacheStatus() {
    const now = Date.now();
    const cacheAge = this.lastLoadTime > 0 ? now - this.lastLoadTime : 0;
    const isValid = this.cachedData && cacheAge < this.CACHE_DURATION;

    return {
      hasCachedData: !!this.cachedData,
      cacheAge: Math.round(cacheAge / 1000), // 秒
      isValid,
      expiresIn: isValid ? Math.round((this.CACHE_DURATION - cacheAge) / 1000) : 0
    };
  }

  /**
   * 增強股票清單 - 添加市場類別和 Yahoo 後綴
   * v1.0.2.0350 - 強化後綴判斷邏輯
   */
  private enhanceStockList(data: StockListData): StockListData {
    logger.debug('stock', '開始增強股票清單', { originalCount: data.count });
    
    const enhancedStocks: Record<string, any> = {};
    let enhancedCount = 0;
    
    for (const [stockId, basicInfo] of Object.entries(data.stocks)) {
      try {
        const enhancedInfo = this.enhanceStockInfo(stockId, basicInfo);
        enhancedStocks[stockId] = enhancedInfo;
        enhancedCount++;
      } catch (error) {
        logger.warn('stock', `增強股票資訊失敗: ${stockId}`, error);
        // 保留原始資訊
        enhancedStocks[stockId] = basicInfo;
      }
    }
    
    const enhancedData = {
      ...data,
      stocks: enhancedStocks,
      enhanced: true,
      enhancedAt: new Date().toISOString()
    };
    
    logger.success('stock', '股票清單增強完成', { 
      enhancedCount,
      totalCount: data.count 
    });
    
    return enhancedData;
  }

  /**
   * 增強股票資訊 - 添加市場類別和 Yahoo 後綴
   * v1.0.2.0350 - 完整的後綴判斷邏輯
   */
  private enhanceStockInfo(stockId: string, basicInfo: any): any {
    const code = parseInt(stockId.substring(0, 4));
    const isBondETF = /^00\d{2,3}B$/i.test(stockId);
    const isETF = /^00\d{2,3}[A-Z]?$/i.test(stockId);
    
    let marketType: '上市' | '上櫃' | '興櫃';
    let yahooSuffix: '.TW' | '.TWO';
    let reasoning: string;
    
    // 特殊案例處理（基於實際測試結果）
    const specialCases: Record<string, { suffix: '.TW' | '.TWO', market: '上市' | '上櫃' | '興櫃', reason: string }> = {
      '8112': { suffix: '.TW', market: '上櫃', reason: '至上：雖在 8000 範圍但 Yahoo Finance 使用 .TW' },
      '4585': { suffix: '.TW', market: '興櫃', reason: '達明：興櫃股票，最常用 .TW' },
    };
    
    if (specialCases[stockId]) {
      const special = specialCases[stockId];
      marketType = special.market;
      yahooSuffix = special.suffix;
      reasoning = special.reason;
    } else if (isBondETF) {
      // 債券 ETF：優先櫃買中心
      marketType = '上櫃';
      yahooSuffix = '.TWO';
      reasoning = '債券 ETF，優先使用櫃買中心 (.TWO)';
    } else if (isETF) {
      // 一般 ETF：優先櫃買中心
      marketType = '上櫃';
      yahooSuffix = '.TWO';
      reasoning = '一般 ETF，優先使用櫃買中心 (.TWO)';
    } else if (code >= 3000 && code <= 8999) {
      // 上櫃股票（3000-8999）：優先櫃買中心
      marketType = '上櫃';
      yahooSuffix = '.TWO';
      reasoning = '上櫃股票，優先使用櫃買中心 (.TWO)';
    } else if (code >= 1000 && code <= 2999) {
      // 上市股票（1000-2999）：優先證交所
      marketType = '上市';
      yahooSuffix = '.TW';
      reasoning = '上市股票，優先使用證交所 (.TW)';
    } else {
      // 其他情況：預設證交所
      marketType = '上市';
      yahooSuffix = '.TW';
      reasoning = '其他情況，預設使用證交所 (.TW)';
    }
    
    return {
      ...basicInfo,
      marketType,
      yahooSuffix,
      reasoning,
      enhanced: true
    };
  }

  /**
   * 獲取股票的 Yahoo Finance 後綴
   * 新增方法：直接從 Stock List 獲取預定義的後綴
   */
  async getYahooSuffix(symbol: string): Promise<'.TW' | '.TWO' | null> {
    const stockList = await this.loadStockList();
    if (!stockList) {
      logger.warn('stock', `無法載入股票清單，無法獲取 ${symbol} 的後綴`);
      return null;
    }

    const stockInfo = stockList.stocks[symbol];
    if (!stockInfo) {
      logger.debug('stock', `股票 ${symbol} 不在清單中`);
      return null;
    }

    if (stockInfo.yahooSuffix) {
      logger.debug('stock', `從股票清單獲取後綴: ${symbol} → ${stockInfo.yahooSuffix}`, {
        reasoning: stockInfo.reasoning
      });
      return stockInfo.yahooSuffix;
    }

    logger.warn('stock', `股票 ${symbol} 缺少 yahooSuffix 資訊`);
    return null;
  }

  /**
   * 獲取股票的完整 Yahoo Finance 符號
   * 新增方法：結合股票代碼和預定義後綴
   */
  async getYahooSymbol(symbol: string): Promise<string> {
    // 如果已經有後綴，直接返回
    if (symbol.includes('.')) {
      return symbol;
    }

    // 嘗試從股票清單獲取預定義後綴
    const predefinedSuffix = await this.getYahooSuffix(symbol);
    if (predefinedSuffix) {
      return `${symbol}${predefinedSuffix}`;
    }

    // 備用：使用邏輯判斷（與之前的邏輯相同）
    logger.debug('stock', `使用備用邏輯判斷 ${symbol} 的後綴`);
    return this.fallbackGetYahooSymbol(symbol);
  }

  /**
   * 備用的後綴判斷邏輯
   * 當股票清單中沒有預定義後綴時使用
   */
  private fallbackGetYahooSymbol(symbol: string): string {
    const code = parseInt(symbol.substring(0, 4));
    const isBondETF = /^00\d{2,3}B$/i.test(symbol);
    const isETF = /^00\d{2,3}[A-Z]?$/i.test(symbol);

    // 特殊案例處理
    const specialCases: Record<string, string> = {
      '8112': '.TW', // 至上：雖在 8000 範圍但需使用 .TW
      '4585': '.TW', // 達明：興櫃股票，最常用 .TW
    };
    
    if (specialCases[symbol]) {
      return `${symbol}${specialCases[symbol]}`;
    }

    // 債券 ETF：優先櫃買中心
    if (isBondETF) {
      return `${symbol}.TWO`;
    }
    
    // 一般 ETF：優先櫃買中心
    if (isETF) {
      return `${symbol}.TWO`;
    }
    
    // 上櫃股票（3000-8999）：優先櫃買中心
    if (code >= 3000 && code <= 8999) {
      return `${symbol}.TWO`;
    }
    
    // 上市股票（1000-2999）：優先證交所
    return `${symbol}.TW`;
  }

  /**
   * 獲取快取的資料（供其他服務使用）
   */
  getCachedData(): StockListData | null {
    return this.cachedData;
  }
}

// 導出單例
export const stockListService = new UnifiedStockListService();

// 導出類型
export type { StockListData };
export type { StockListData };