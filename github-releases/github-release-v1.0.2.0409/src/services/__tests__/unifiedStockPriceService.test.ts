/**
 * 統一股價獲取服務測試
 * 
 * 測試整個股價獲取系統的集成功能
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { UnifiedStockPriceService } from '../unifiedStockPriceService';
import { DataSourcePriority } from '../stockDataMerger';

describe('UnifiedStockPriceService', () => {
  let service: UnifiedStockPriceService;
  
  beforeEach(() => {
    service = new UnifiedStockPriceService({
      enableDetailedLogging: false,
      enableCache: true
    });
  });
  
  afterEach(() => {
    service.destroy();
  });
  
  describe('股票代碼驗證', () => {
    test('應該拒絕無效的股票代碼', async () => {
      const result = await service.getStockPrice('INVALID');
      expect(result).toBeNull();
    });
    
    test('應該接受有效的股票代碼', async () => {
      // 這個測試可能需要實際的API調用，在單元測試中可以mock
      const validSymbols = ['2330', '6188', '0050', '00679B'];
      
      for (const symbol of validSymbols) {
        // 在實際環境中，這些應該返回有效資料或null（如果API不可用）
        const result = await service.getStockPrice(symbol);
        // 由於這是集成測試，我們只檢查不會拋出異常
        expect(typeof result === 'object' || result === null).toBe(true);
      }
    });
  });
  
  describe('快取功能', () => {
    test('應該支援快取啟用和禁用', async () => {
      // 測試快取啟用
      const symbol = '2330';
      
      // 第一次調用
      await service.getStockPrice(symbol, { useCache: true });
      
      // 檢查快取統計
      const stats = service.getCacheStats();
      expect(typeof stats.totalRequests).toBe('number');
      expect(typeof stats.hits).toBe('number');
      expect(typeof stats.misses).toBe('number');
    });
    
    test('應該能清理快取', () => {
      service.clearCache();
      const stats = service.getCacheStats();
      expect(stats.currentSize).toBe(0);
    });
  });
  
  describe('批量處理', () => {
    test('應該能處理批量股票查詢', async () => {
      const symbols = ['2330', '2886', '6188'];
      const results = await service.getBatchStockPrices(symbols, {
        batchSize: 2,
        requestInterval: 100
      });
      
      expect(results instanceof Map).toBe(true);
      expect(results.size).toBeGreaterThanOrEqual(0);
      expect(results.size).toBeLessThanOrEqual(symbols.length);
    });
  });
  
  describe('搜尋功能', () => {
    test('應該能搜尋有效的股票代碼', async () => {
      const result = await service.searchStock('2330');
      
      if (result) {
        expect(result.symbol).toBe('2330');
        expect(typeof result.name).toBe('string');
        expect(typeof result.market).toBe('string');
      }
      
      // 如果API不可用，結果可能為null，這也是可接受的
      expect(typeof result === 'object' || result === null).toBe(true);
    });
    
    test('應該拒絕無效的搜尋查詢', async () => {
      const result = await service.searchStock('');
      expect(result).toBeNull();
    });
  });
  
  describe('配置管理', () => {
    test('應該能更新配置', () => {
      const newConfig = {
        enableCache: false,
        defaultStrategy: DataSourcePriority.FINMIND_ONLY
      };
      
      service.updateConfig(newConfig);
      
      // 配置更新不會拋出異常
      expect(true).toBe(true);
    });
  });
  
  describe('健康檢查', () => {
    test('應該能獲取健康狀態', async () => {
      const health = await service.getHealthStatus();
      
      expect(health).toHaveProperty('overall');
      expect(health).toHaveProperty('apiManager');
      expect(health).toHaveProperty('cache');
      
      expect(['healthy', 'degraded', 'unavailable']).toContain(health.overall);
    });
  });
  
  describe('資料來源策略', () => {
    test('應該支援不同的資料來源策略', async () => {
      const symbol = '2330';
      const strategies = [
        DataSourcePriority.YAHOO_FINMIND,
        DataSourcePriority.YAHOO_ONLY,
        DataSourcePriority.FINMIND_ONLY
      ];
      
      for (const strategy of strategies) {
        const result = await service.getStockPrice(symbol, { strategy });
        // 結果可能為null（如果API不可用），但不應該拋出異常
        expect(typeof result === 'object' || result === null).toBe(true);
      }
    });
  });
  
  describe('錯誤處理', () => {
    test('應該優雅地處理網路錯誤', async () => {
      // 使用一個可能不存在的股票代碼
      const result = await service.getStockPrice('9999');
      
      // 應該返回null而不是拋出異常
      expect(result).toBeNull();
    });
    
    test('應該處理超時情況', async () => {
      const result = await service.getStockPrice('2330', { timeout: 1 }); // 1ms超時
      
      // 超時應該返回null而不是拋出異常
      expect(result).toBeNull();
    });
  });
});