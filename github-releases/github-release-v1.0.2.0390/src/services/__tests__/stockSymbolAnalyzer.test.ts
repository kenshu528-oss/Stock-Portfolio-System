/**
 * 股票代碼分析器測試
 * 
 * 測試基於 v1.0.2.0197 成功修復經驗制定的標準化邏輯
 */

import { describe, test, expect } from 'vitest';
import { StockSymbolAnalyzer, analyzeStockSymbol, getStockSuffixes } from '../stockSymbolAnalyzer';

describe('StockSymbolAnalyzer', () => {
  
  describe('上市股票 (1000-2999)', () => {
    test('2330 台積電應該優先使用 .TW 後綴', () => {
      const result = StockSymbolAnalyzer.analyzeSymbol('2330');
      
      expect(result.suffixes).toEqual(['.TW', '.TWO']);
      expect(result.type).toBe('listed');
      expect(result.market).toBe('上市');
      expect(result.description).toBe('上市股票');
    });
    
    test('2886 兆豐金應該優先使用 .TW 後綴', () => {
      const result = StockSymbolAnalyzer.analyzeSymbol('2886');
      
      expect(result.suffixes).toEqual(['.TW', '.TWO']);
      expect(result.type).toBe('listed');
      expect(result.market).toBe('上市');
    });
    
    test('1101 台泥應該優先使用 .TW 後綴', () => {
      const result = StockSymbolAnalyzer.analyzeSymbol('1101');
      
      expect(result.suffixes).toEqual(['.TW', '.TWO']);
      expect(result.type).toBe('listed');
      expect(result.market).toBe('上市');
    });
  });
  
  describe('上櫃股票 (3000-8999)', () => {
    test('6188 廣明應該優先使用 .TWO 後綴', () => {
      const result = StockSymbolAnalyzer.analyzeSymbol('6188');
      
      expect(result.suffixes).toEqual(['.TWO', '.TW']);
      expect(result.type).toBe('otc');
      expect(result.market).toBe('上櫃');
      expect(result.description).toBe('上櫃股票');
    });
    
    test('4585 達明應該優先使用 .TWO 後綴', () => {
      const result = StockSymbolAnalyzer.analyzeSymbol('4585');
      
      expect(result.suffixes).toEqual(['.TWO', '.TW']);
      expect(result.type).toBe('otc');
      expect(result.market).toBe('上櫃');
    });
    
    test('3443 創意應該優先使用 .TWO 後綴', () => {
      const result = StockSymbolAnalyzer.analyzeSymbol('3443');
      
      expect(result.suffixes).toEqual(['.TWO', '.TW']);
      expect(result.type).toBe('otc');
      expect(result.market).toBe('上櫃');
    });
  });
  
  describe('一般 ETF (00XXX)', () => {
    test('0050 元大台灣50應該優先使用 .TWO 後綴', () => {
      const result = StockSymbolAnalyzer.analyzeSymbol('0050');
      
      expect(result.suffixes).toEqual(['.TWO', '.TW']);
      expect(result.type).toBe('etf');
      expect(result.market).toBe('ETF');
      expect(result.description).toBe('一般 ETF');
    });
    
    test('00646 元大S&P500應該優先使用 .TWO 後綴', () => {
      const result = StockSymbolAnalyzer.analyzeSymbol('00646');
      
      expect(result.suffixes).toEqual(['.TWO', '.TW']);
      expect(result.type).toBe('etf');
      expect(result.market).toBe('ETF');
    });
    
    test('00881 國泰台灣5G+應該優先使用 .TWO 後綴', () => {
      const result = StockSymbolAnalyzer.analyzeSymbol('00881');
      
      expect(result.suffixes).toEqual(['.TWO', '.TW']);
      expect(result.type).toBe('etf');
      expect(result.market).toBe('ETF');
    });
  });
  
  describe('債券 ETF (00XXXB)', () => {
    test('00679B 元大美債20年應該優先使用 .TWO 後綴', () => {
      const result = StockSymbolAnalyzer.analyzeSymbol('00679B');
      
      expect(result.suffixes).toEqual(['.TWO', '.TW']);
      expect(result.type).toBe('bond_etf');
      expect(result.market).toBe('ETF');
      expect(result.description).toBe('債券 ETF');
    });
    
    test('00687B 國泰20年美債應該優先使用 .TWO 後綴', () => {
      const result = StockSymbolAnalyzer.analyzeSymbol('00687B');
      
      expect(result.suffixes).toEqual(['.TWO', '.TW']);
      expect(result.type).toBe('bond_etf');
      expect(result.market).toBe('ETF');
    });
    
    test('00751B 元大AAA至A公司債應該優先使用 .TWO 後綴', () => {
      const result = StockSymbolAnalyzer.analyzeSymbol('00751B');
      
      expect(result.suffixes).toEqual(['.TWO', '.TW']);
      expect(result.type).toBe('bond_etf');
      expect(result.market).toBe('ETF');
    });
  });
  
  describe('邊界情況測試', () => {
    test('無效代碼應該返回預設設定', () => {
      const result = StockSymbolAnalyzer.analyzeSymbol('9999');
      
      expect(result.suffixes).toEqual(['.TW', '.TWO']);
      expect(result.type).toBe('unknown');
      expect(result.market).toBe('台灣');
    });
    
    test('空字串應該返回預設設定', () => {
      const result = StockSymbolAnalyzer.analyzeSymbol('');
      
      expect(result.suffixes).toEqual(['.TW', '.TWO']);
      expect(result.type).toBe('unknown');
      expect(result.market).toBe('台灣');
    });
    
    test('小寫代碼應該正確處理', () => {
      const result = StockSymbolAnalyzer.analyzeSymbol('2330');
      
      expect(result.suffixes).toEqual(['.TW', '.TWO']);
      expect(result.type).toBe('listed');
      expect(result.market).toBe('上市');
    });
  });
  
  describe('便利函數測試', () => {
    test('getStockSuffixes 應該返回正確的後綴列表', () => {
      expect(getStockSuffixes('2330')).toEqual(['.TW', '.TWO']);
      expect(getStockSuffixes('6188')).toEqual(['.TWO', '.TW']);
      expect(getStockSuffixes('0050')).toEqual(['.TWO', '.TW']);
      expect(getStockSuffixes('00679B')).toEqual(['.TWO', '.TW']);
    });
    
    test('getStockType 應該返回正確的股票類型', () => {
      expect(StockSymbolAnalyzer.getStockType('2330')).toBe('listed');
      expect(StockSymbolAnalyzer.getStockType('6188')).toBe('otc');
      expect(StockSymbolAnalyzer.getStockType('0050')).toBe('etf');
      expect(StockSymbolAnalyzer.getStockType('00679B')).toBe('bond_etf');
    });
    
    test('getMarketType 應該返回正確的市場類型', () => {
      expect(StockSymbolAnalyzer.getMarketType('2330')).toBe('上市');
      expect(StockSymbolAnalyzer.getMarketType('6188')).toBe('上櫃');
      expect(StockSymbolAnalyzer.getMarketType('0050')).toBe('ETF');
      expect(StockSymbolAnalyzer.getMarketType('00679B')).toBe('ETF');
    });
  });
  
  describe('股票代碼驗證', () => {
    test('有效的股票代碼應該通過驗證', () => {
      expect(StockSymbolAnalyzer.isValidStockSymbol('2330')).toBe(true);
      expect(StockSymbolAnalyzer.isValidStockSymbol('6188')).toBe(true);
      expect(StockSymbolAnalyzer.isValidStockSymbol('0050')).toBe(true);
      expect(StockSymbolAnalyzer.isValidStockSymbol('00646')).toBe(true);
      expect(StockSymbolAnalyzer.isValidStockSymbol('00679B')).toBe(true);
      expect(StockSymbolAnalyzer.isValidStockSymbol('1565A')).toBe(true);
    });
    
    test('無效的股票代碼應該不通過驗證', () => {
      expect(StockSymbolAnalyzer.isValidStockSymbol('')).toBe(false);
      expect(StockSymbolAnalyzer.isValidStockSymbol('123')).toBe(false);
      expect(StockSymbolAnalyzer.isValidStockSymbol('12345')).toBe(false);
      expect(StockSymbolAnalyzer.isValidStockSymbol('AAAA')).toBe(false);
      expect(StockSymbolAnalyzer.isValidStockSymbol('2330X')).toBe(false);
    });
  });
  
  describe('支援的股票類型資訊', () => {
    test('getSupportedStockTypes 應該返回完整的類型資訊', () => {
      const types = StockSymbolAnalyzer.getSupportedStockTypes();
      
      expect(types).toHaveLength(4);
      expect(types[0].type).toBe('listed');
      expect(types[1].type).toBe('otc');
      expect(types[2].type).toBe('etf');
      expect(types[3].type).toBe('bond_etf');
      
      // 檢查每個類型都有必要的資訊
      types.forEach(type => {
        expect(type.market).toBeDefined();
        expect(type.codeRange).toBeDefined();
        expect(type.suffix).toBeDefined();
        expect(type.examples).toBeDefined();
        expect(type.examples.length).toBeGreaterThan(0);
      });
    });
  });
  
  describe('v1.0.2.0197 驗證測試案例', () => {
    test('所有 v1.0.2.0197 成功案例都應該正確分析', () => {
      const testCases = [
        { symbol: '2330', expectedType: 'listed', expectedSuffix: '.TW' },
        { symbol: '2886', expectedType: 'listed', expectedSuffix: '.TW' },
        { symbol: '6188', expectedType: 'otc', expectedSuffix: '.TWO' },
        { symbol: '4585', expectedType: 'otc', expectedSuffix: '.TWO' },
        { symbol: '0050', expectedType: 'etf', expectedSuffix: '.TWO' },
        { symbol: '00646', expectedType: 'etf', expectedSuffix: '.TWO' },
        { symbol: '00679B', expectedType: 'bond_etf', expectedSuffix: '.TWO' }
      ];
      
      testCases.forEach(({ symbol, expectedType, expectedSuffix }) => {
        const result = analyzeStockSymbol(symbol);
        
        expect(result.type).toBe(expectedType);
        expect(result.suffixes[0]).toBe(expectedSuffix);
      });
    });
  });
});