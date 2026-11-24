/**
 * 靜態股票搜尋服務
 * 適用於 GitHub Pages 等靜態託管環境
 */

import type { StockSearchResult } from '../types';
import { logger } from '../utils/logger';
import { yahooFinanceAPI } from './yahooFinanceAPI';

interface StaticStockData {
  date: string;
  timestamp: string;
  count: number;
  stocks: Record<string, {
    name: string;
    industry: string;
    market: string;
  }>;
}

export class StaticStockSearchService {
  private stockData: StaticStockData | null = null;
  private isLoading = false;

  /**
   * 載入靜態股票清單
   */
  async loadStockList(): Promise<boolean> {
    if (this.stockData) return true;
    if (this.isLoading) return false;

    this.isLoading = true;
    
    try {
      logger.info('stock', '載入靜態股票清單...');
      
      // 從 public 目錄載入股票清單
      const response = await fetch('./stock_list.json');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      this.stockData = await response.json();
      
      logger.success('stock', '靜態股票清單載入成功', {
        count: this.stockData?.count,
        date: this.stockData?.date
      });
      
      return true;
      
    } catch (error) {
      logger.error('stock', '載入靜態股票清單失敗', error);
      return false;
      
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * 搜尋股票
   */
  async searchStocks(query: string): Promise<StockSearchResult[]> {
    // 確保股票清單已載入
    const loaded = await this.loadStockList();
    if (!loaded || !this.stockData) {
      logger.warn('stock', '股票清單未載入，無法搜尋');
      return [];
    }

    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) return [];

    // 本地搜尋匹配的股票
    const matchedStocks = this.findMatchingStocks(trimmedQuery);
    
    if (matchedStocks.length === 0) return [];

    // 為每支股票獲取即時股價
    const results: StockSearchResult[] = [];
    
    for (const stock of matchedStocks.slice(0, 10)) { // 限制 10 筆結果
      try {
        // 使用 Yahoo Finance 獲取即時股價
        const priceData = await yahooFinanceAPI.getStockPrice(stock.symbol);
        
        results.push({
          symbol: stock.symbol,
          name: stock.name,
          price: priceData?.price || 0,
          change: priceData?.change || 0,
          changePercent: priceData?.changePercent || 0,
          market: stock.market
        });
        
      } catch (error) {
        logger.warn('stock', `獲取 ${stock.symbol} 股價失敗`, error);
        
        // 即使沒有股價，也返回股票資訊
        results.push({
          symbol: stock.symbol,
          name: stock.name,
          price: 0,
          change: 0,
          changePercent: 0,
          market: stock.market
        });
      }
    }

    logger.info('stock', `靜態搜尋完成`, {
      query: trimmedQuery,
      matched: matchedStocks.length,
      results: results.length
    });

    return results;
  }

  /**
   * 在本地股票清單中尋找匹配的股票
   */
  private findMatchingStocks(query: string): Array<{
    symbol: string;
    name: string;
    industry: string;
    market: string;
  }> {
    if (!this.stockData) return [];

    const results = [];
    const queryUpper = query.toUpperCase().trim();
    const queryLower = query.toLowerCase().trim();

    // 收集所有匹配的股票
    const allMatches = [];
    for (const [symbol, info] of Object.entries(this.stockData.stocks)) {
      const symbolUpper = symbol.toUpperCase();
      const nameLower = info.name.toLowerCase();
      
      // 1. 精確匹配股票代碼（最高優先級，大小寫不敏感）
      if (symbolUpper === queryUpper) {
        allMatches.push({ symbol, info, priority: 1 });
      }
      // 2. 股票代碼開頭匹配（高優先級，大小寫不敏感）
      else if (symbolUpper.startsWith(queryUpper)) {
        allMatches.push({ symbol, info, priority: 2 });
      }
      // 3. 中文名稱包含查詢字串（中優先級，大小寫不敏感）
      else if (nameLower.includes(queryLower) || info.name.includes(query)) {
        allMatches.push({ symbol, info, priority: 3 });
      }
      // 4. 股票代碼包含查詢字串（低優先級，但排除過短的查詢）
      else if (query.length >= 3 && symbolUpper.includes(queryUpper)) {
        allMatches.push({ symbol, info, priority: 4 });
      }
    }

    // 按優先級和字母順序排序
    allMatches.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.symbol.localeCompare(b.symbol);
    });

    // 轉換為結果格式，限制數量
    for (const match of allMatches.slice(0, 20)) {
      results.push({
        symbol: match.symbol,
        name: match.info.name,
        industry: match.info.industry,
        market: match.info.market
      });
    }

    return results;
  }

  /**
   * 獲取股票清單統計資訊
   */
  getStockListInfo(): { count: number; date: string } | null {
    if (!this.stockData) return null;
    
    return {
      count: this.stockData.count,
      date: this.stockData.date
    };
  }
}

// 創建單例
export const staticStockSearchService = new StaticStockSearchService();