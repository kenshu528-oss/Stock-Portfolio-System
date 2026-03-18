/**
 * 股價快取管理器 (Stock Price Cache Manager)
 * 
 * 實作標準化快取機制，提升股價獲取效能
 * 5秒TTL快取策略，LRU清理機制，自動過期清理
 * 
 * @version 1.0.0
 * @author Stock Portfolio System
 * @date 2026-01-19
 */

import { StockPrice } from '../types';
import { logger } from '../utils/logger';

// 快取項目介面
export interface CacheEntry {
  /** 快取的資料 */
  data: StockPrice;
  /** 創建時間戳 */
  timestamp: number;
  /** 存活時間（毫秒） */
  ttl: number;
  /** 最後訪問時間 */
  lastAccessed: number;
  /** 訪問次數 */
  accessCount: number;
}

// 快取配置
export interface CacheConfig {
  /** 預設TTL（毫秒） */
  defaultTTL: number;
  /** 最大快取項目數 */
  maxSize: number;
  /** 清理間隔（毫秒） */
  cleanupInterval: number;
  /** LRU清理比例（0-1） */
  cleanupRatio: number;
  /** 是否啟用統計 */
  enableStats: boolean;
}

// 快取統計
export interface CacheStats {
  /** 總請求數 */
  totalRequests: number;
  /** 快取命中數 */
  hits: number;
  /** 快取未命中數 */
  misses: number;
  /** 命中率 */
  hitRate: number;
  /** 當前快取大小 */
  currentSize: number;
  /** 最大快取大小 */
  maxSize: number;
  /** 過期清理次數 */
  expiredCleanups: number;
  /** LRU清理次數 */
  lruCleanups: number;
}

// 預設配置
const DEFAULT_CONFIG: CacheConfig = {
  defaultTTL: 5000,        // 5秒
  maxSize: 1000,           // 最多1000個項目
  cleanupInterval: 30000,  // 30秒清理一次
  cleanupRatio: 0.2,       // 清理20%的項目
  enableStats: true
};

/**
 * 股價快取管理器類別
 */
export class StockPriceCache {
  private cache = new Map<string, CacheEntry>();
  private config: CacheConfig;
  private stats: CacheStats;
  private cleanupTimer: NodeJS.Timeout | null = null;
  
  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.stats = {
      totalRequests: 0,
      hits: 0,
      misses: 0,
      hitRate: 0,
      currentSize: 0,
      maxSize: this.config.maxSize,
      expiredCleanups: 0,
      lruCleanups: 0
    };
    
    this.startCleanupTimer();
    
    logger.info('stock', '股價快取管理器已初始化', {
      defaultTTL: `${this.config.defaultTTL}ms`,
      maxSize: this.config.maxSize,
      cleanupInterval: `${this.config.cleanupInterval}ms`
    });
  }
  
  /**
   * 獲取快取的股價資料
   * 
   * @param symbol 股票代碼
   * @returns 股價資料或 null
   */
  get(symbol: string): StockPrice | null {
    this.updateStats('request');
    
    const entry = this.cache.get(symbol);
    
    if (!entry) {
      this.updateStats('miss');
      logger.trace('stock', `快取未命中: ${symbol}`);
      return null;
    }
    
    // 檢查是否過期
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(symbol);
      this.updateStats('miss');
      logger.trace('stock', `快取過期: ${symbol}`, {
        age: `${now - entry.timestamp}ms`,
        ttl: `${entry.ttl}ms`
      });
      return null;
    }
    
    // 更新訪問資訊
    entry.lastAccessed = now;
    entry.accessCount++;
    
    this.updateStats('hit');
    logger.trace('stock', `快取命中: ${symbol}`, {
      age: `${now - entry.timestamp}ms`,
      accessCount: entry.accessCount
    });
    
    return entry.data;
  }
  
  /**
   * 設定股價資料到快取
   * 
   * @param symbol 股票代碼
   * @param data 股價資料
   * @param ttl 存活時間（可選，使用預設值）
   */
  set(symbol: string, data: StockPrice, ttl?: number): void {
    const now = Date.now();
    const effectiveTTL = ttl || this.config.defaultTTL;
    
    const entry: CacheEntry = {
      data: { ...data }, // 深拷貝避免外部修改
      timestamp: now,
      ttl: effectiveTTL,
      lastAccessed: now,
      accessCount: 1
    };
    
    // 檢查是否需要清理空間
    if (this.cache.size >= this.config.maxSize) {
      this.performLRUCleanup();
    }
    
    this.cache.set(symbol, entry);
    this.updateStats('set');
    
    logger.trace('stock', `快取設定: ${symbol}`, {
      price: data.price,
      ttl: `${effectiveTTL}ms`,
      cacheSize: this.cache.size
    });
  }
  
  /**
   * 刪除快取項目
   * 
   * @param symbol 股票代碼
   * @returns 是否成功刪除
   */
  delete(symbol: string): boolean {
    const deleted = this.cache.delete(symbol);
    
    if (deleted) {
      this.updateStats('delete');
      logger.trace('stock', `快取刪除: ${symbol}`);
    }
    
    return deleted;
  }
  
  /**
   * 檢查快取中是否存在指定項目
   * 
   * @param symbol 股票代碼
   * @returns 是否存在且未過期
   */
  has(symbol: string): boolean {
    const entry = this.cache.get(symbol);
    
    if (!entry) return false;
    
    // 檢查是否過期
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(symbol);
      return false;
    }
    
    return true;
  }
  
  /**
   * 清空所有快取
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.resetStats();
    
    logger.info('stock', `快取已清空`, { clearedItems: size });
  }
  
  /**
   * 手動執行清理
   * 
   * @returns 清理統計
   */
  cleanup(): { expired: number; lru: number } {
    const expiredCount = this.cleanupExpired();
    const lruCount = this.cache.size > this.config.maxSize ? this.performLRUCleanup() : 0;
    
    logger.debug('stock', '手動快取清理完成', {
      expired: expiredCount,
      lru: lruCount,
      currentSize: this.cache.size
    });
    
    return { expired: expiredCount, lru: lruCount };
  }
  
  /**
   * 獲取快取統計資訊
   * 
   * @returns 統計資訊
   */
  getStats(): CacheStats {
    this.stats.currentSize = this.cache.size;
    this.stats.hitRate = this.stats.totalRequests > 0 
      ? (this.stats.hits / this.stats.totalRequests) * 100 
      : 0;
    
    return { ...this.stats };
  }
  
  /**
   * 重置統計資訊
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      hits: 0,
      misses: 0,
      hitRate: 0,
      currentSize: this.cache.size,
      maxSize: this.config.maxSize,
      expiredCleanups: 0,
      lruCleanups: 0
    };
    
    logger.info('stock', '快取統計已重置');
  }
  
  /**
   * 獲取所有快取的股票代碼
   * 
   * @returns 股票代碼列表
   */
  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }
  
  /**
   * 獲取快取大小
   * 
   * @returns 當前快取項目數
   */
  size(): number {
    return this.cache.size;
  }
  
  /**
   * 銷毀快取管理器
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    this.clear();
    
    logger.info('stock', '股價快取管理器已銷毀');
  }
  
  // 私有方法
  
  /**
   * 開始清理定時器
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      const expiredCount = this.cleanupExpired();
      
      if (expiredCount > 0) {
        logger.debug('stock', '定時清理過期快取', {
          expired: expiredCount,
          remaining: this.cache.size
        });
      }
    }, this.config.cleanupInterval);
  }
  
  /**
   * 清理過期項目
   * 
   * @returns 清理的項目數
   */
  private cleanupExpired(): number {
    const now = Date.now();
    let expiredCount = 0;
    
    for (const [symbol, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(symbol);
        expiredCount++;
      }
    }
    
    if (expiredCount > 0) {
      this.stats.expiredCleanups++;
    }
    
    return expiredCount;
  }
  
  /**
   * 執行 LRU 清理
   * 
   * @returns 清理的項目數
   */
  private performLRUCleanup(): number {
    const targetSize = Math.floor(this.config.maxSize * (1 - this.config.cleanupRatio));
    const itemsToRemove = this.cache.size - targetSize;
    
    if (itemsToRemove <= 0) return 0;
    
    // 按最後訪問時間排序
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
    
    let removedCount = 0;
    for (let i = 0; i < itemsToRemove && i < entries.length; i++) {
      const [symbol] = entries[i];
      this.cache.delete(symbol);
      removedCount++;
    }
    
    if (removedCount > 0) {
      this.stats.lruCleanups++;
      logger.debug('stock', 'LRU清理完成', {
        removed: removedCount,
        remaining: this.cache.size,
        targetSize
      });
    }
    
    return removedCount;
  }
  
  /**
   * 更新統計資訊
   */
  private updateStats(operation: 'request' | 'hit' | 'miss' | 'set' | 'delete'): void {
    if (!this.config.enableStats) return;
    
    switch (operation) {
      case 'request':
        this.stats.totalRequests++;
        break;
      case 'hit':
        this.stats.hits++;
        break;
      case 'miss':
        this.stats.misses++;
        break;
      case 'set':
        this.stats.currentSize = this.cache.size;
        break;
      case 'delete':
        this.stats.currentSize = this.cache.size;
        break;
    }
  }
}

// 創建單例實例
export const stockPriceCache = new StockPriceCache();

// 預設導出
export default StockPriceCache;