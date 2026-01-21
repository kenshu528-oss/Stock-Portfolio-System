/**
 * API 管理器 (API Manager)
 * 
 * 統一的 API 管理介面，實作 API 優先順序和備援機制
 * 支援超時和重試邏輯，確保股價獲取的穩定性和可靠性
 * 
 * @version 1.0.0
 * @author Stock Portfolio System
 * @date 2026-01-19
 */

import { logger } from '../utils/logger';
import { StockPrice } from '../types';
import { StockSymbolAnalyzer, StockSuffix } from './stockSymbolAnalyzer';

// API 提供者優先級
export enum APIProviderPriority {
  PRIMARY = 1,    // 主要 API
  SECONDARY = 2,  // 次要 API
  FALLBACK = 3    // 備用 API
}

// API 提供者狀態
export enum APIProviderStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNAVAILABLE = 'unavailable'
}

// API 調用結果
export interface APICallResult<T = any> {
  success: boolean;
  data?: T;
  error?: Error;
  provider: string;
  duration: number;
  timestamp: Date;
}

// API 提供者介面
export interface APIProvider {
  /** 提供者名稱 */
  name: string;
  
  /** 優先級（數字越小優先級越高） */
  priority: APIProviderPriority;
  
  /** 超時時間（毫秒） */
  timeout: number;
  
  /** 最大重試次數 */
  maxRetries: number;
  
  /** 重試延遲（毫秒） */
  retryDelay: number;
  
  /**
   * 獲取股票價格
   * @param symbol 股票代碼
   * @param suffixes 後綴列表（可選）
   * @returns 股價資料或 null
   */
  getStockPrice(symbol: string, suffixes?: StockSuffix[]): Promise<StockPrice | null>;
  
  /**
   * 檢查 API 健康狀態
   * @returns 是否健康
   */
  isHealthy(): Promise<boolean>;
  
  /**
   * 獲取 API 狀態
   * @returns API 狀態
   */
  getStatus(): Promise<APIProviderStatus>;
}

// API 管理器配置
export interface APIManagerConfig {
  /** 全域超時時間（毫秒） */
  globalTimeout: number;
  
  /** 全域最大重試次數 */
  globalMaxRetries: number;
  
  /** 並發請求限制 */
  concurrencyLimit: number;
  
  /** 請求間隔（毫秒） */
  requestInterval: number;
  
  /** 熔斷器閾值 */
  circuitBreakerThreshold: number;
  
  /** 健康檢查間隔（毫秒） */
  healthCheckInterval: number;
}

// 預設配置
const DEFAULT_CONFIG: APIManagerConfig = {
  globalTimeout: 10000,        // 10秒
  globalMaxRetries: 3,         // 最多重試3次
  concurrencyLimit: 5,         // 最多5個並發請求
  requestInterval: 300,        // 請求間隔300ms
  circuitBreakerThreshold: 5,  // 連續失敗5次觸發熔斷
  healthCheckInterval: 60000   // 每分鐘檢查一次健康狀態
};

/**
 * API 管理器類別
 * 
 * 提供統一的 API 管理功能，包括：
 * - API 優先順序管理
 * - 自動備援切換
 * - 超時和重試機制
 * - 熔斷器模式
 * - 健康狀態監控
 * - 並發控制
 */
export class APIManager {
  private providers: Map<string, APIProvider> = new Map();
  private providerStats: Map<string, {
    successCount: number;
    failureCount: number;
    lastFailureTime: Date | null;
    consecutiveFailures: number;
    isCircuitOpen: boolean;
  }> = new Map();
  
  private config: APIManagerConfig;
  private activeRequests = 0;
  private requestQueue: Array<() => Promise<void>> = [];
  private healthCheckTimer: NodeJS.Timeout | null = null;
  
  constructor(config: Partial<APIManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startHealthCheck();
    
    logger.info('api', 'API管理器已初始化', {
      config: this.config,
      providers: this.providers.size
    });
  }
  
  /**
   * 註冊 API 提供者
   * 
   * @param provider API 提供者實例
   */
  registerProvider(provider: APIProvider): void {
    this.providers.set(provider.name, provider);
    this.providerStats.set(provider.name, {
      successCount: 0,
      failureCount: 0,
      lastFailureTime: null,
      consecutiveFailures: 0,
      isCircuitOpen: false
    });
    
    logger.info('api', `註冊API提供者: ${provider.name}`, {
      priority: provider.priority,
      timeout: provider.timeout,
      maxRetries: provider.maxRetries
    });
  }
  
  /**
   * 移除 API 提供者
   * 
   * @param providerName 提供者名稱
   */
  unregisterProvider(providerName: string): void {
    this.providers.delete(providerName);
    this.providerStats.delete(providerName);
    
    logger.info('api', `移除API提供者: ${providerName}`);
  }
  
  /**
   * 獲取股票價格（主要方法）
   * 
   * @param symbol 股票代碼
   * @returns 股價資料或 null
   */
  async getStockPrice(symbol: string): Promise<StockPrice | null> {
    const startTime = Date.now();
    
    // 分析股票代碼，獲取後綴資訊
    const analysis = StockSymbolAnalyzer.analyzeSymbol(symbol);
    
    logger.debug('api', `開始獲取股價: ${symbol}`, {
      type: analysis.type,
      market: analysis.market,
      suffixes: analysis.suffixes
    });
    
    // 獲取可用的提供者列表（按優先級排序）
    const availableProviders = this.getAvailableProviders();
    
    if (availableProviders.length === 0) {
      logger.error('api', '沒有可用的API提供者');
      return null;
    }
    
    // 按優先級嘗試每個提供者
    for (const provider of availableProviders) {
      try {
        // 檢查熔斷器狀態
        if (this.isCircuitOpen(provider.name)) {
          logger.warn('api', `${provider.name} 熔斷器開啟，跳過`);
          continue;
        }
        
        // 並發控制
        await this.waitForSlot();
        
        const result = await this.callProviderWithRetry(
          provider,
          symbol,
          analysis.suffixes
        );
        
        if (result.success && result.data) {
          this.recordSuccess(provider.name);
          
          const duration = Date.now() - startTime;
          logger.success('api', `${provider.name} 成功獲取 ${symbol} 股價`, {
            price: result.data.price,
            duration: `${duration}ms`,
            source: result.data.source
          });
          
          return result.data;
        } else {
          this.recordFailure(provider.name, result.error);
        }
        
      } catch (error) {
        this.recordFailure(provider.name, error as Error);
        logger.warn('api', `${provider.name} 調用失敗，嘗試下一個提供者`, error);
      }
    }
    
    const duration = Date.now() - startTime;
    logger.error('api', `所有API提供者都失敗，無法獲取 ${symbol} 股價`, {
      duration: `${duration}ms`,
      providersAttempted: availableProviders.length
    });
    
    return null;
  }
  
  /**
   * 批量獲取股票價格
   * 
   * @param symbols 股票代碼列表
   * @returns 股價資料映射
   */
  async getBatchStockPrices(symbols: string[]): Promise<Map<string, StockPrice>> {
    const results = new Map<string, StockPrice>();
    
    logger.info('api', `開始批量獲取股價`, { count: symbols.length });
    
    // 分批處理，避免過多並發請求
    const batchSize = Math.min(this.config.concurrencyLimit, 5);
    
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      const promises = batch.map(symbol => this.getStockPrice(symbol));
      
      const batchResults = await Promise.allSettled(promises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          results.set(batch[index], result.value);
        }
      });
      
      // 批次間延遲
      if (i + batchSize < symbols.length) {
        await this.delay(this.config.requestInterval);
      }
    }
    
    logger.info('api', `批量獲取完成`, {
      requested: symbols.length,
      successful: results.size,
      successRate: `${((results.size / symbols.length) * 100).toFixed(1)}%`
    });
    
    return results;
  }
  
  /**
   * 獲取所有提供者的健康狀態
   * 
   * @returns 健康狀態報告
   */
  async getHealthStatus(): Promise<{
    overall: 'healthy' | 'degraded' | 'unavailable';
    providers: Array<{
      name: string;
      status: APIProviderStatus;
      stats: {
        successCount: number;
        failureCount: number;
        successRate: number;
        consecutiveFailures: number;
        isCircuitOpen: boolean;
      };
    }>;
  }> {
    const providerStatuses = [];
    let healthyCount = 0;
    
    for (const [name, provider] of this.providers) {
      const status = await provider.getStatus();
      const stats = this.providerStats.get(name)!;
      const totalRequests = stats.successCount + stats.failureCount;
      const successRate = totalRequests > 0 ? (stats.successCount / totalRequests) * 100 : 0;
      
      providerStatuses.push({
        name,
        status,
        stats: {
          successCount: stats.successCount,
          failureCount: stats.failureCount,
          successRate: Math.round(successRate * 100) / 100,
          consecutiveFailures: stats.consecutiveFailures,
          isCircuitOpen: stats.isCircuitOpen
        }
      });
      
      if (status === APIProviderStatus.HEALTHY) {
        healthyCount++;
      }
    }
    
    let overall: 'healthy' | 'degraded' | 'unavailable';
    if (healthyCount === 0) {
      overall = 'unavailable';
    } else if (healthyCount < this.providers.size) {
      overall = 'degraded';
    } else {
      overall = 'healthy';
    }
    
    return {
      overall,
      providers: providerStatuses
    };
  }
  
  /**
   * 重置提供者統計資料
   * 
   * @param providerName 提供者名稱（可選，不提供則重置所有）
   */
  resetStats(providerName?: string): void {
    if (providerName) {
      const stats = this.providerStats.get(providerName);
      if (stats) {
        stats.successCount = 0;
        stats.failureCount = 0;
        stats.lastFailureTime = null;
        stats.consecutiveFailures = 0;
        stats.isCircuitOpen = false;
        
        logger.info('api', `重置 ${providerName} 統計資料`);
      }
    } else {
      for (const [name, stats] of this.providerStats) {
        stats.successCount = 0;
        stats.failureCount = 0;
        stats.lastFailureTime = null;
        stats.consecutiveFailures = 0;
        stats.isCircuitOpen = false;
      }
      
      logger.info('api', '重置所有提供者統計資料');
    }
  }
  
  /**
   * 銷毀管理器，清理資源
   */
  destroy(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
    
    this.providers.clear();
    this.providerStats.clear();
    this.requestQueue = [];
    
    logger.info('api', 'API管理器已銷毀');
  }
  
  // 私有方法
  
  /**
   * 獲取可用的提供者列表（按優先級排序）
   */
  private getAvailableProviders(): APIProvider[] {
    return Array.from(this.providers.values())
      .filter(provider => !this.isCircuitOpen(provider.name))
      .sort((a, b) => a.priority - b.priority);
  }
  
  /**
   * 檢查熔斷器是否開啟
   */
  private isCircuitOpen(providerName: string): boolean {
    const stats = this.providerStats.get(providerName);
    if (!stats) return false;
    
    // 如果熔斷器開啟，檢查是否可以嘗試恢復
    if (stats.isCircuitOpen) {
      const timeSinceLastFailure = stats.lastFailureTime 
        ? Date.now() - stats.lastFailureTime.getTime()
        : 0;
      
      // 30秒後嘗試恢復
      if (timeSinceLastFailure > 30000) {
        stats.isCircuitOpen = false;
        stats.consecutiveFailures = 0;
        logger.info('api', `${providerName} 熔斷器嘗試恢復`);
        return false;
      }
    }
    
    return stats.isCircuitOpen;
  }
  
  /**
   * 等待可用的請求槽位
   */
  private async waitForSlot(): Promise<void> {
    if (this.activeRequests < this.config.concurrencyLimit) {
      this.activeRequests++;
      return;
    }
    
    // 等待有槽位可用
    return new Promise((resolve) => {
      this.requestQueue.push(async () => {
        this.activeRequests++;
        resolve();
      });
    });
  }
  
  /**
   * 釋放請求槽位
   */
  private releaseSlot(): void {
    this.activeRequests--;
    
    // 處理等待中的請求
    if (this.requestQueue.length > 0) {
      const nextRequest = this.requestQueue.shift();
      if (nextRequest) {
        nextRequest();
      }
    }
  }
  
  /**
   * 使用重試機制調用提供者
   */
  private async callProviderWithRetry(
    provider: APIProvider,
    symbol: string,
    suffixes: StockSuffix[]
  ): Promise<APICallResult<StockPrice>> {
    const maxRetries = Math.min(provider.maxRetries, this.config.globalMaxRetries);
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        this.activeRequests++;
        const startTime = Date.now();
        
        // 設定超時
        const timeout = Math.min(provider.timeout, this.config.globalTimeout);
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('請求超時')), timeout);
        });
        
        const result = await Promise.race([
          provider.getStockPrice(symbol, suffixes),
          timeoutPromise
        ]);
        
        const duration = Date.now() - startTime;
        
        return {
          success: true,
          data: result,
          provider: provider.name,
          duration,
          timestamp: new Date()
        };
        
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries) {
          const delay = provider.retryDelay * Math.pow(2, attempt); // 指數退避
          logger.debug('api', `${provider.name} 第${attempt + 1}次嘗試失敗，${delay}ms後重試`, error);
          await this.delay(delay);
        }
      } finally {
        this.releaseSlot();
      }
    }
    
    return {
      success: false,
      error: lastError || new Error('未知錯誤'),
      provider: provider.name,
      duration: 0,
      timestamp: new Date()
    };
  }
  
  /**
   * 記錄成功調用
   */
  private recordSuccess(providerName: string): void {
    const stats = this.providerStats.get(providerName);
    if (stats) {
      stats.successCount++;
      stats.consecutiveFailures = 0;
      stats.isCircuitOpen = false;
    }
  }
  
  /**
   * 記錄失敗調用
   */
  private recordFailure(providerName: string, error?: Error): void {
    const stats = this.providerStats.get(providerName);
    if (stats) {
      stats.failureCount++;
      stats.consecutiveFailures++;
      stats.lastFailureTime = new Date();
      
      // 檢查是否需要開啟熔斷器
      if (stats.consecutiveFailures >= this.config.circuitBreakerThreshold) {
        stats.isCircuitOpen = true;
        logger.warn('api', `${providerName} 熔斷器開啟`, {
          consecutiveFailures: stats.consecutiveFailures,
          error: error?.message
        });
      }
    }
  }
  
  /**
   * 開始健康檢查
   */
  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(async () => {
      try {
        const healthStatus = await this.getHealthStatus();
        logger.debug('api', 'API健康檢查完成', {
          overall: healthStatus.overall,
          healthyProviders: healthStatus.providers.filter(p => p.status === APIProviderStatus.HEALTHY).length,
          totalProviders: healthStatus.providers.length
        });
      } catch (error) {
        logger.error('api', '健康檢查失敗', error);
      }
    }, this.config.healthCheckInterval);
  }
  
  /**
   * 延遲函數
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 創建單例實例
export const apiManager = new APIManager();

// 預設導出
export default APIManager;