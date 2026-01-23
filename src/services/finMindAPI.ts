/**
 * FinMind API 標準化實作
 * 
 * 基於 api-standards.md steering 規則制定的標準化 FinMind API 服務
 * 專為台股設計，提供中文名稱和完整的股價資料
 * 
 * @version 1.0.0
 * @author Stock Portfolio System
 * @date 2026-01-19
 */

import { StockPrice } from '../types';
import { logger } from '../utils/logger';
import { APIProvider, APIProviderPriority, APIProviderStatus } from './apiManager';

// FinMind API 配置
const FINMIND_CONFIG = {
  baseUrl: 'https://api.finmindtrade.com/api/v4/data',
  timeout: 15000,
  maxRetries: 2,
  retryDelay: 2000,
  datasets: {
    stockPrice: 'TaiwanStockPrice',
    stockInfo: 'TaiwanStockInfo'
  },
  // 從環境變數獲取 Token
  getToken: () => import.meta.env.VITE_FINMIND_TOKEN || ''
};

// FinMind API 回應介面
interface FinMindResponse {
  msg: string;
  status: number;
  data: any[];
}

interface FinMindStockPriceData {
  date: string;
  stock_id: string;
  Trading_Volume: number;
  Trading_money: number;
  open: number;
  max: number;
  min: number;
  close: number;
  spread: number;
  Trading_turnover: number;
}

interface FinMindStockInfoData {
  stock_id: string;
  stock_name: string;
  industry_category: string;
  stock_type: string;
  date: string;
}

/**
 * FinMind API 提供者實作
 */
export class FinMindAPIProvider implements APIProvider {
  name = 'FinMind';
  priority = APIProviderPriority.SECONDARY;
  timeout = FINMIND_CONFIG.timeout;
  maxRetries = FINMIND_CONFIG.maxRetries;
  retryDelay = FINMIND_CONFIG.retryDelay;
  
  /**
   * 獲取股票價格
   * 
   * @param symbol 股票代碼
   * @returns 股價資料或 null
   */
  async getStockPrice(symbol: string): Promise<StockPrice | null> {
    try {
      logger.debug('api', `FinMind 開始獲取 ${symbol} 股價`);
      
      // 同時獲取股價和股票資訊
      const [priceData, stockInfo] = await Promise.allSettled([
        this.getLatestStockPrice(symbol),
        this.getStockInfo(symbol)
      ]);
      
      // 檢查股價資料
      if (priceData.status === 'rejected' || !priceData.value) {
        logger.warn('api', `FinMind 無法獲取 ${symbol} 股價資料`);
        return null;
      }
      
      const price = priceData.value;
      
      // 嘗試獲取中文名稱
      let chineseName = symbol; // 預設使用代碼
      if (stockInfo.status === 'fulfilled' && stockInfo.value) {
        chineseName = stockInfo.value;
      }
      
      const result: StockPrice = {
        symbol,
        price: price.close,
        change: price.spread,
        changePercent: price.close > 0 ? (price.spread / (price.close - price.spread)) * 100 : 0,
        timestamp: new Date(price.date),
        source: 'FinMind'
      };
      
      // 添加中文名稱
      if (chineseName && chineseName !== symbol) {
        (result as any).name = chineseName;
      }
      
      // 添加額外資訊
      (result as any).volume = price.Trading_Volume;
      (result as any).high = price.max;
      (result as any).low = price.min;
      (result as any).open = price.open;
      
      logger.success('api', `FinMind 成功獲取 ${symbol}`, {
        price: result.price,
        change: result.change,
        name: chineseName,
        date: price.date
      });
      
      return result;
      
    } catch (error) {
      logger.error('api', `FinMind 獲取 ${symbol} 失敗`, error);
      return null;
    }
  }
  
  /**
   * 獲取股票資訊（中文名稱等）
   * 
   * @param symbol 股票代碼
   * @returns 中文名稱或 null
   */
  async getStockInfo(symbol: string): Promise<string | null> {
    try {
      const url = new URL(FINMIND_CONFIG.baseUrl);
      url.searchParams.set('dataset', FINMIND_CONFIG.datasets.stockInfo);
      url.searchParams.set('data_id', symbol);
      
      // 添加 Token 參數
      const token = FINMIND_CONFIG.getToken();
      if (token) {
        url.searchParams.set('token', token);
      }
      
      logger.trace('api', `FinMind 股票資訊請求: ${symbol}`);
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Stock-Portfolio-System/1.0'
        },
        signal: AbortSignal.timeout(this.timeout)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data: FinMindResponse = await response.json();
      
      if (data.status !== 200 || !data.data || data.data.length === 0) {
        logger.debug('api', `FinMind 無 ${symbol} 股票資訊`);
        return null;
      }
      
      // 獲取最新的股票資訊
      const latestInfo = data.data[data.data.length - 1] as FinMindStockInfoData;
      
      if (latestInfo.stock_name) {
        logger.debug('api', `FinMind 獲取 ${symbol} 中文名稱: ${latestInfo.stock_name}`);
        return latestInfo.stock_name;
      }
      
      return null;
      
    } catch (error) {
      logger.debug('api', `FinMind 獲取 ${symbol} 股票資訊失敗`, error);
      return null;
    }
  }
  
  /**
   * 檢查 API 健康狀態
   */
  async isHealthy(): Promise<boolean> {
    try {
      // 使用一個已知的股票代碼測試
      const testResult = await this.getLatestStockPrice('2330');
      return testResult !== null;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * 獲取 API 狀態
   */
  async getStatus(): Promise<APIProviderStatus> {
    try {
      const isHealthy = await this.isHealthy();
      return isHealthy ? APIProviderStatus.HEALTHY : APIProviderStatus.DEGRADED;
    } catch (error) {
      return APIProviderStatus.UNAVAILABLE;
    }
  }
  
  // 私有方法
  
  /**
   * 獲取最新股價資料
   */
  private async getLatestStockPrice(symbol: string): Promise<FinMindStockPriceData | null> {
    try {
      // 獲取最近5天的資料，確保能取到最新交易日
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 5);
      
      const url = new URL(FINMIND_CONFIG.baseUrl);
      url.searchParams.set('dataset', FINMIND_CONFIG.datasets.stockPrice);
      url.searchParams.set('data_id', symbol);
      url.searchParams.set('start_date', this.formatDate(startDate));
      url.searchParams.set('end_date', this.formatDate(endDate));
      
      // 添加 Token 參數
      const token = FINMIND_CONFIG.getToken();
      if (token) {
        url.searchParams.set('token', token);
      }
      
      logger.trace('api', `FinMind 股價請求: ${symbol}`);
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Stock-Portfolio-System/1.0'
        },
        signal: AbortSignal.timeout(this.timeout)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data: FinMindResponse = await response.json();
      
      if (data.status !== 200 || !data.data || data.data.length === 0) {
        logger.debug('api', `FinMind 無 ${symbol} 股價資料`);
        return null;
      }
      
      // 獲取最新的股價資料
      const latestPrice = data.data[data.data.length - 1] as FinMindStockPriceData;
      
      // 驗證資料有效性
      if (!this.validatePriceData(latestPrice)) {
        logger.warn('api', `FinMind ${symbol} 資料無效`, latestPrice);
        return null;
      }
      
      return latestPrice;
      
    } catch (error) {
      logger.debug('api', `FinMind 獲取 ${symbol} 股價失敗`, error);
      return null;
    }
  }
  
  /**
   * 驗證股價資料有效性
   */
  private validatePriceData(data: FinMindStockPriceData): boolean {
    return (
      data &&
      typeof data.close === 'number' &&
      data.close > 0 &&
      typeof data.open === 'number' &&
      data.open > 0 &&
      typeof data.max === 'number' &&
      data.max > 0 &&
      typeof data.min === 'number' &&
      data.min > 0 &&
      data.date &&
      typeof data.date === 'string'
    );
  }
  
  /**
   * 格式化日期為 YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * 獲取股息數據
   * 
   * @param symbol 股票代碼
   * @returns 股息記錄陣列或 null
   */
  async getDividendData(symbol: string): Promise<any[] | null> {
    try {
      const url = new URL(FINMIND_CONFIG.baseUrl);
      url.searchParams.set('dataset', 'TaiwanStockDividend');
      url.searchParams.set('data_id', symbol);
      
      // 添加 Token 參數
      const token = FINMIND_CONFIG.getToken();
      if (token) {
        url.searchParams.set('token', token);
      }
      
      logger.trace('api', `FinMind 股息請求: ${symbol}`);
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Stock-Portfolio-System/1.0'
        },
        signal: AbortSignal.timeout(this.timeout)
      });
      
      if (!response.ok) {
        if (response.status === 402) {
          throw new Error('FinMind API 需要付費');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data: FinMindResponse = await response.json();
      
      if (!data.data || data.data.length === 0) {
        logger.debug('api', `FinMind 無 ${symbol} 股息資料`);
        return null;
      }
      
      // 轉換為標準格式
      const dividendRecords = data.data.map((item: any) => ({
        exDividendDate: item.CashExDividendTradingDate || item.StockExDividendTradingDate,
        cashDividendPerShare: (item.CashEarningsDistribution || 0) + (item.CashStatutorySurplus || 0),
        stockDividendRatio: ((item.StockEarningsDistribution || 0) + (item.StockStatutorySurplus || 0)) / 10 * 1000
      })).filter((record: any) => record.exDividendDate);
      
      logger.success('api', `FinMind 成功獲取 ${symbol} 股息`, { count: dividendRecords.length });
      return dividendRecords;
      
    } catch (error) {
      logger.error('api', `FinMind 獲取 ${symbol} 股息失敗`, error);
      return null;
    }
  }
}

// 創建單例實例
export const finMindAPI = new FinMindAPIProvider();

// 預設導出
export default FinMindAPIProvider;