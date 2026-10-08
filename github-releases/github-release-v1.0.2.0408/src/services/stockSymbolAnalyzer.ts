/**
 * 股票代碼分析器 (Stock Symbol Analyzer)
 * 
 * 基於 v1.0.2.0197 成功修復經驗制定的標準化股票代碼分析邏輯
 * 實作智能後綴判斷，支援所有台灣股票類型
 * 
 * @version 1.0.0
 * @author Stock Portfolio System
 * @date 2026-01-19
 */

import { logger } from '../utils/logger';

// 股票類型定義
export type StockType = 'listed' | 'otc' | 'etf' | 'bond_etf' | 'unknown';

// 市場類型定義
export type MarketType = '上市' | '上櫃' | 'ETF' | '台灣';

// 股票代碼後綴定義
export type StockSuffix = '.TW' | '.TWO';

// 股票分析結果介面
export interface StockAnalysisResult {
  /** 後綴優先順序列表 */
  suffixes: StockSuffix[];
  /** 股票類型 */
  type: StockType;
  /** 市場類型 */
  market: MarketType;
  /** 代碼範圍描述 */
  description: string;
  /** 判斷邏輯說明 */
  reasoning: string;
}

/**
 * 股票代碼分析器類別
 * 
 * 提供標準化的股票代碼分析功能，包括：
 * - 智能後綴判斷
 * - 股票類型識別
 * - 市場分類
 * - 詳細的判斷日誌
 */
export class StockSymbolAnalyzer {
  
  /**
   * 分析股票代碼並返回完整的分析結果
   * 
   * @param symbol 股票代碼（如：2330, 6188, 0050, 00679B）
   * @returns 股票分析結果
   */
  static analyzeSymbol(symbol: string): StockAnalysisResult {
    const normalizedSymbol = symbol.toUpperCase().trim();
    
    logger.debug('stock', `開始分析股票代碼: ${normalizedSymbol}`);
    
    // 檢查債券 ETF（優先級最高）
    if (StockSymbolAnalyzer.isBondETF(normalizedSymbol)) {
      const result: StockAnalysisResult = {
        suffixes: ['.TWO', '.TW'],
        type: 'bond_etf',
        market: 'ETF',
        description: '債券 ETF',
        reasoning: '代碼格式 00XXXB，債券 ETF 優先使用櫃買中心 (.TWO)'
      };
      
      logger.info('stock', `${normalizedSymbol} 識別為債券 ETF`, {
        suffixes: result.suffixes,
        market: result.market
      });
      
      return result;
    }
    
    // 檢查一般 ETF
    if (StockSymbolAnalyzer.isETF(normalizedSymbol)) {
      const result: StockAnalysisResult = {
        suffixes: ['.TWO', '.TW'],
        type: 'etf',
        market: 'ETF',
        description: '一般 ETF',
        reasoning: '代碼格式 00XXX，ETF 優先使用櫃買中心 (.TWO)'
      };
      
      logger.info('stock', `${normalizedSymbol} 識別為一般 ETF`, {
        suffixes: result.suffixes,
        market: result.market
      });
      
      return result;
    }
    
    // 解析數字代碼
    const code = StockSymbolAnalyzer.parseStockCode(normalizedSymbol);
    
    if (code === null) {
      const result: StockAnalysisResult = {
        suffixes: ['.TW', '.TWO'],
        type: 'unknown',
        market: '台灣',
        description: '未知類型',
        reasoning: '無法解析代碼，使用預設後綴順序'
      };
      
      logger.warn('stock', `${normalizedSymbol} 無法解析代碼，使用預設設定`, {
        suffixes: result.suffixes
      });
      
      return result;
    }
    
    // 判斷上櫃股票（3000-7999）- v1.0.2.0320 修正範圍
    if (code >= 3000 && code <= 7999) {
      const result: StockAnalysisResult = {
        suffixes: ['.TWO', '.TW'],
        type: 'otc',
        market: '上櫃',
        description: '上櫃股票',
        reasoning: `代碼 ${code} 在 3000-7999 範圍，上櫃股票優先使用櫃買中心 (.TWO)`
      };
      
      logger.info('stock', `${normalizedSymbol} 識別為上櫃股票`, {
        code,
        suffixes: result.suffixes,
        market: result.market
      });
      
      return result;
    }
    
    // 判斷上市股票（1000-2999）
    if (code >= 1000 && code <= 2999) {
      const result: StockAnalysisResult = {
        suffixes: ['.TW', '.TWO'],
        type: 'listed',
        market: '上市',
        description: '上市股票',
        reasoning: `代碼 ${code} 在 1000-2999 範圍，上市股票優先使用證交所 (.TW)`
      };
      
      logger.info('stock', `${normalizedSymbol} 識別為上市股票`, {
        code,
        suffixes: result.suffixes,
        market: result.market
      });
      
      return result;
    }
    
    // 其他情況使用預設設定
    const result: StockAnalysisResult = {
      suffixes: ['.TW', '.TWO'],
      type: 'unknown',
      market: '台灣',
      description: '其他股票',
      reasoning: `代碼 ${code} 不在標準範圍，使用預設後綴順序`
    };
    
    logger.info('stock', `${normalizedSymbol} 使用預設設定`, {
      code,
      suffixes: result.suffixes,
      market: result.market
    });
    
    return result;
  }
  
  /**
   * 獲取股票代碼的後綴列表（簡化版本）
   * 
   * @param symbol 股票代碼
   * @returns 後綴列表
   */
  static getStockSuffixes(symbol: string): StockSuffix[] {
    return StockSymbolAnalyzer.analyzeSymbol(symbol).suffixes;
  }
  
  /**
   * 獲取股票類型
   * 
   * @param symbol 股票代碼
   * @returns 股票類型
   */
  static getStockType(symbol: string): StockType {
    return StockSymbolAnalyzer.analyzeSymbol(symbol).type;
  }
  
  /**
   * 獲取市場類型
   * 
   * @param symbol 股票代碼
   * @returns 市場類型
   */
  static getMarketType(symbol: string): MarketType {
    return StockSymbolAnalyzer.analyzeSymbol(symbol).market;
  }
  
  /**
   * 檢查是否為債券 ETF
   * 
   * @param symbol 股票代碼
   * @returns 是否為債券 ETF
   */
  private static isBondETF(symbol: string): boolean {
    // 債券 ETF 格式：00XXXB（如：00679B, 00687B）
    return /^00\d{2,3}B$/i.test(symbol);
  }
  
  /**
   * 檢查是否為一般 ETF
   * 
   * @param symbol 股票代碼
   * @returns 是否為一般 ETF
   */
  private static isETF(symbol: string): boolean {
    // 一般 ETF 格式：00XXX 或 00XXXA（如：0050, 00646, 00981A）
    // 排除債券 ETF（已在上面處理）
    return /^00\d{2,3}[A-Z]?$/i.test(symbol) && !StockSymbolAnalyzer.isBondETF(symbol);
  }
  
  /**
   * 解析股票代碼的數字部分
   * 
   * @param symbol 股票代碼
   * @returns 數字代碼，如果無法解析則返回 null
   */
  private static parseStockCode(symbol: string): number | null {
    // 提取前4位數字
    const match = symbol.match(/^(\d{4})/);
    if (match) {
      return parseInt(match[1], 10);
    }
    return null;
  }
  
  /**
   * 驗證股票代碼格式是否有效
   * 
   * @param symbol 股票代碼
   * @returns 是否為有效格式
   */
  static isValidStockSymbol(symbol: string): boolean {
    const normalizedSymbol = symbol.toUpperCase().trim();
    
    // 檢查基本格式
    if (!/^[0-9A-Z]{4,6}$/.test(normalizedSymbol)) {
      return false;
    }
    
    // 檢查具體格式
    return (
      // 4位數字：2330, 0050
      /^\d{4}$/.test(normalizedSymbol) ||
      // 4位數字+有效字母：1565A (只允許特定字母)
      (/^\d{4}[A-Z]$/.test(normalizedSymbol) && 
       ['A', 'B', 'C', 'P', 'U', 'L', 'R'].includes(normalizedSymbol[4])) ||
      // 5位數字ETF：00646
      /^00\d{3}$/.test(normalizedSymbol) ||
      // 6位數字+字母ETF：00679B, 00981A
      /^00\d{3}[A-Z]$/.test(normalizedSymbol)
    );
  }
  
  /**
   * 獲取所有支援的股票類型資訊
   * 
   * @returns 股票類型資訊列表
   */
  static getSupportedStockTypes(): Array<{
    type: StockType;
    market: MarketType;
    codeRange: string;
    suffix: StockSuffix;
    examples: string[];
  }> {
    return [
      {
        type: 'listed',
        market: '上市',
        codeRange: '1000-2999',
        suffix: '.TW',
        examples: ['2330', '2886', '1101']
      },
      {
        type: 'otc',
        market: '上櫃',
        codeRange: '3000-8999',
        suffix: '.TWO',
        examples: ['6188', '4585', '3443']
      },
      {
        type: 'etf',
        market: 'ETF',
        codeRange: '00XXX',
        suffix: '.TWO',
        examples: ['0050', '00646', '00881']
      },
      {
        type: 'bond_etf',
        market: 'ETF',
        codeRange: '00XXXB',
        suffix: '.TWO',
        examples: ['00679B', '00687B', '00751B']
      }
    ];
  }
}

// 導出便利函數
export const analyzeStockSymbol = StockSymbolAnalyzer.analyzeSymbol;
export const getStockSuffixes = StockSymbolAnalyzer.getStockSuffixes;
export const getStockType = StockSymbolAnalyzer.getStockType;
export const getMarketType = StockSymbolAnalyzer.getMarketType;
export const isValidStockSymbol = StockSymbolAnalyzer.isValidStockSymbol;

// 預設導出
export default StockSymbolAnalyzer;