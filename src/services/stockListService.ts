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
   * 遵循 v1.0.2.0266 的邏輯：優先後端 API，備用前端檔案
   */
  private async loadFromDevelopment(): Promise<StockListData | null> {
    logger.debug('stock', '本機環境載入策略');

    // 策略 1：嘗試後端 API (與 v1.0.2.0266 相同)
    try {
      // 🔧 使用與 v1.0.2.0266 相同的後端檢查邏輯
      const backendUrl = 'http://localhost:3001/api/stock-search?query=test';
      const response = await fetch(backendUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(3000) // 3秒超時
      });

      if (response.ok) {
        // 後端可用，嘗試獲取股票清單
        try {
          const listUrl = 'http://localhost:3001/api/stock-list';
          const listResponse = await fetch(listUrl, {
            signal: AbortSignal.timeout(5000)
          });
          
          if (listResponse.ok) {
            const data = await listResponse.json();
            if (this.validateStockListData(data)) {
              logger.debug('stock', '後端 API 載入成功', { count: data.count });
              return data;
            }
          }
        } catch (listError) {
          logger.debug('stock', '後端股票清單 API 不可用', listError);
        }
      }
    } catch (error) {
      logger.debug('stock', '後端 API 不可用，使用備用方案', error);
    }

    // 策略 2：備用 - 前端檔案 (與 v1.0.2.0266 相同)
    logger.debug('stock', '使用前端檔案作為備用方案');
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
   * 增強股票資訊 - 添加市場類別和 Yahoo 後綴
   * 基於 FinMind API 的 industry_category 邏輯 (v1.0.2.0321)
   */
  private enhanceStockInfo(stockId: string, basicInfo: any): any {
    const code = parseInt(stockId.substring(0, 4));
    const isBondETF = /^00\d{2,3}B$/i.test(stockId);
    
    let marketType: '上市' | '上櫃' | '興櫃';
    let yahooSuffix: '.TW' | '.TWO';
    
    // 遵循 FinMind API 的 industry_category 邏輯
    if (isBondETF) {
      // 債券 ETF 通常在上櫃
      marketType = '上櫃';
      yahooSuffix = '.TWO';
    } else if (code >= 3000 && code <= 7999) {
      // 上櫃股票範圍：3000-7999
      marketType = '上櫃';
      yahooSuffix = '.TWO';
    } else if (code >= 8000 && code <= 8999) {
      // 8000-8999 範圍：上市股票（如 8112 至上）
      marketType = '上市';
      yahooSuffix = '.TW';
    } else {
      // 其他範圍（1000-2999 等）：上市股票
      marketType = '上市';
      yahooSuffix = '.TW';
    }
    
    return {
      ...basicInfo,
      marketType,
      yahooSuffix
    };
  }

  /**
   * 增強整個股票清單
   */
  private enhanceStockList(data: StockListData): StockListData {
    const enhancedStocks: Record<string, any> = {};
    
    for (const [stockId, stockInfo] of Object.entries(data.stocks)) {
      enhancedStocks[stockId] = this.enhanceStockInfo(stockId, stockInfo);
    }
    
    return {
      ...data,
      stocks: enhancedStocks
    };
  }

  /**
   * 根據股票代碼獲取 Yahoo Finance 後綴
   * 公開方法，供其他服務使用
   */
  getYahooSuffix(stockId: string): '.TW' | '.TWO' {
    const enhanced = this.enhanceStockInfo(stockId, {});
    return enhanced.yahooSuffix;
  }
}

// 導出單例
export const stockListService = new UnifiedStockListService();

// 導出類型
export type { StockListData, StockListService };