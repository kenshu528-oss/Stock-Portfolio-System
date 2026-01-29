/**
 * 雲端環境股價獲取服務
 * 專門針對 GitHub Pages 等雲端環境優化的股價獲取策略
 */

import { logger } from '../utils/logger';

interface StockPrice {
  price: number;
  change: number;
  changePercent: number;
  source: string;
  timestamp: string;
}

interface PriceSource {
  name: string;
  priority: number;
  timeout: number;
  fetcher: (symbol: string) => Promise<StockPrice | null>;
}

class CloudStockPriceService {
  private cache = new Map<string, { data: StockPrice; expiry: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5分鐘快取

  /**
   * 獲取股價 - 雲端環境優化版本 (v1.0.2.0323 - 添加重試機制)
   */
  async getStockPrice(symbol: string, maxRetries: number = 2): Promise<StockPrice | null> {
    // 檢查快取
    const cached = this.getCachedPrice(symbol);
    if (cached) {
      logger.debug('stock', `使用快取股價: ${symbol}`, { price: cached.price });
      return cached;
    }

    // 按優先順序嘗試各種資料源，帶重試機制
    const sources = this.getPriceSources();
    
    for (const source of sources) {
      let lastError: Error | null = null;
      
      // 對每個來源進行重試
      for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
        try {
          logger.debug('stock', `嘗試 ${source.name}: ${symbol} (第${attempt}次)`, { 
            attempt, 
            maxRetries: maxRetries + 1 
          });
          
          const result = await Promise.race([
            source.fetcher(symbol),
            this.createTimeoutPromise(source.timeout)
          ]);

          if (result && result.price > 0) {
            logger.info('stock', `${source.name} 獲取成功`, { 
              symbol, 
              price: result.price,
              source: result.source,
              attempt
            });
            
            // 快取結果
            this.setCachedPrice(symbol, result);
            return result;
          }
        } catch (error) {
          lastError = error instanceof Error ? error : new Error('未知錯誤');
          
          if (attempt <= maxRetries) {
            logger.debug('stock', `${source.name} 第${attempt}次失敗，準備重試: ${symbol}`, { 
              error: lastError.message,
              nextAttempt: attempt + 1
            });
            
            // 重試前等待一小段時間
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          } else {
            logger.debug('stock', `${source.name} 所有重試都失敗: ${symbol}`, { 
              error: lastError.message,
              totalAttempts: attempt
            });
          }
        }
      }
    }

    logger.warn('stock', `所有股價源都失敗: ${symbol}`, { 
      sourcesAttempted: sources.length,
      retriesPerSource: maxRetries + 1
    });
    return null;
  }

  /**
   * 定義股價資料源（按優先順序）
   * v1.0.2.0360 - 修正：證交所API有CORS限制，雲端環境使用Yahoo Finance代理
   */
  private getPriceSources(): PriceSource[] {
    return [
      {
        name: 'Yahoo Finance (AllOrigins)',
        priority: 1,
        timeout: 8000,
        fetcher: this.fetchFromYahooAllOrigins.bind(this)
      },
      {
        name: 'Yahoo Finance (CodeTabs)',
        priority: 2,
        timeout: 8000,
        fetcher: this.fetchFromYahooCodeTabs.bind(this)
      },
      {
        name: 'Yahoo Finance (ThingProxy)',
        priority: 3,
        timeout: 8000,
        fetcher: this.fetchFromYahooThingProxy.bind(this)
      },
      {
        name: 'Yahoo Finance (本機端)',
        priority: 4,
        timeout: 8000,
        fetcher: this.fetchFromYahooLocal.bind(this)
      }
    ];
  }

  /**
   * Alpha Vantage API - v1.0.2.0326
   * 免費的股價 API，支援 CORS
   */
  private async fetchFromAlphaVantage(symbol: string): Promise<StockPrice | null> {
    try {
      // Alpha Vantage 免費 API Key (demo key)
      const apiKey = 'demo';
      const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const quote = data['Global Quote'];
      
      if (!quote) throw new Error('無股價資料');

      const currentPrice = parseFloat(quote['05. price']) || 0;
      const change = parseFloat(quote['09. change']) || 0;
      const changePercent = parseFloat(quote['10. change percent']?.replace('%', '')) || 0;

      if (currentPrice > 0) {
        return {
          price: Math.round(currentPrice * 100) / 100,
          change: Math.round(change * 100) / 100,
          changePercent: Math.round(changePercent * 100) / 100,
          source: 'Alpha Vantage',
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      // Alpha Vantage 可能不支援台股，繼續嘗試其他方案
    }

    throw new Error('Alpha Vantage 失敗');
  }

  /**
   * IEX Cloud API - v1.0.2.0326
   * 另一個免費的股價 API
   */
  private async fetchFromIEXCloud(symbol: string): Promise<StockPrice | null> {
    try {
      // IEX Cloud 免費版本
      const url = `https://cloud.iexapis.com/stable/stock/${symbol}/quote?token=pk_test`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      
      const currentPrice = data.latestPrice || 0;
      const change = data.change || 0;
      const changePercent = data.changePercent ? data.changePercent * 100 : 0;

      if (currentPrice > 0) {
        return {
          price: Math.round(currentPrice * 100) / 100,
          change: Math.round(change * 100) / 100,
          changePercent: Math.round(changePercent * 100) / 100,
          source: 'IEX Cloud',
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      // IEX Cloud 可能不支援台股
    }

    throw new Error('IEX Cloud 失敗');
  }

  /**
   * Yahoo Finance 無 CORS 方案 - v1.0.2.0326
   * 嘗試使用 JSONP 或其他無 CORS 限制的方法
   */
  private async fetchFromYahooNoCORS(symbol: string): Promise<StockPrice | null> {
    const yahooSymbol = await this.getYahooSymbol(symbol);
    
    try {
      // 嘗試使用 Yahoo Finance 的 CSV API (通常沒有 CORS 限制)
      const csvUrl = `https://query1.finance.yahoo.com/v7/finance/download/${yahooSymbol}?period1=0&period2=9999999999&interval=1d&events=history`;
      
      const response = await fetch(csvUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const csvText = await response.text();
      const lines = csvText.split('\n');
      
      if (lines.length < 2) throw new Error('無資料');
      
      // 取最後一行資料 (最新的股價)
      const lastLine = lines[lines.length - 2]; // -2 因為最後一行可能是空的
      const values = lastLine.split(',');
      
      if (values.length >= 5) {
        const currentPrice = parseFloat(values[4]) || 0; // Close price
        const previousPrice = lines.length > 2 ? parseFloat(lines[lines.length - 3].split(',')[4]) || currentPrice : currentPrice;
        const change = currentPrice - previousPrice;
        const changePercent = previousPrice > 0 ? (change / previousPrice) * 100 : 0;

        if (currentPrice > 0) {
          return {
            price: Math.round(currentPrice * 100) / 100,
            change: Math.round(change * 100) / 100,
            changePercent: Math.round(changePercent * 100) / 100,
            source: 'Yahoo Finance (CSV)',
            timestamp: new Date().toISOString()
          };
        }
      }
    } catch (error) {
      // CSV API 也失敗了
    }

    throw new Error('Yahoo Finance 無 CORS 方案失敗');
  }

  /**
   * 靜態價格備援 - v1.0.2.0325
   * 當所有 API 都失敗時，提供基本的靜態價格
   */
  private async fetchStaticPrice(symbol: string): Promise<StockPrice | null> {
    // 提供一些常見股票的靜態價格作為最後備援
    const staticPrices: Record<string, number> = {
      '2330': 1760,  // 台積電
      '2317': 120,   // 鴻海
      '2454': 1200,  // 聯發科
      '2886': 40,    // 兆豐金
      '0050': 170,   // 元大台灣50
      '00940': 9.79, // 元大台灣價值高息 (更新為正確價格)
      '6188': 110,   // 廣明
      '4585': 340,   // 達明
    };

    const price = staticPrices[symbol];
    if (price) {
      logger.info('stock', `使用靜態價格: ${symbol}`, { price });
      return {
        price,
        change: 0,
        changePercent: 0,
        source: '靜態價格 (備援)',
        timestamp: new Date().toISOString()
      };
    }

    throw new Error('無靜態價格資料');
  }

  /**
   * Netlify Functions 股價獲取 - v1.0.2.0310
   * 使用自己的後端代理，如 Python yfinance 般穩定
   */
  private async fetchFromNetlifyFunctions(symbol: string): Promise<StockPrice | null> {
    try {
      // 檢測當前環境，決定使用哪個 Netlify Functions 端點
      const isGitHubPages = window.location.hostname.includes('github.io');
      const baseUrl = isGitHubPages 
        ? 'https://stock-portfolio-system.netlify.app'  // GitHub Pages 使用 Netlify 代理
        : '';  // 本地開發使用相對路徑

      const functionUrl = `${baseUrl}/.netlify/functions/stock?symbol=${encodeURIComponent(symbol)}`;
      
      logger.debug('stock', `調用 Netlify Functions: ${symbol}`, { url: functionUrl });
      
      const response = await fetch(functionUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`股票代碼 ${symbol} 不存在`);
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data || typeof data.price !== 'number' || data.price <= 0) {
        throw new Error('無效的股價資料');
      }

      logger.info('stock', `Netlify Functions 獲取成功`, { 
        symbol, 
        price: data.price,
        source: data.source || 'Netlify Functions'
      });

      return {
        price: Math.round(data.price * 100) / 100,
        change: Math.round((data.change || 0) * 100) / 100,
        changePercent: Math.round((data.changePercent || 0) * 100) / 100,
        source: data.source || 'Netlify Functions',
        timestamp: data.timestamp || new Date().toISOString()
      };

    } catch (error) {
      const message = error instanceof Error ? error.message : '未知錯誤';
      logger.warn('stock', `Netlify Functions 失敗: ${symbol}`, { error: message });
      throw error;
    }
  }

  /**
   * TWSE MIS API - v1.0.2.0357 即時行情 API
   * 基於用戶詳細指導實作：精準市場路徑 + 即時價格陷阱處理
   * 
   * 關鍵要點：
   * 1. 市場路徑要精準：上市用tse，上櫃用otc，走錯路抓不到資料
   * 2. 即時價格陷阱：z(成交價)是橫槓-時，改抓b(買進價)
   * 3. 用途：GitHub Pages即時監控專用，配股配息用FinMind
   */
  private async fetchFromTWSEMIS(symbol: string): Promise<StockPrice | null> {
    try {
      logger.debug('stock', `嘗試從 TWSE MIS (即時行情) 獲取 ${symbol} 股價...`);
      
      // 精準判斷市場類型：上市(tse) vs 上櫃(otc)
      const market = this.getMarketTypeForTWSE(symbol);
      
      // 使用精準的市場路徑：tse_2881.tw 或 otc_5314.tw
      const apiUrl = `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=${market}_${symbol}.tw&json=1`;
      
      logger.debug('stock', `TWSE MIS API URL: ${apiUrl}`, { market, symbol });
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.msgArray || data.msgArray.length === 0) {
        throw new Error('TWSE MIS 無資料或股票代碼錯誤');
      }

      const info = data.msgArray[0];
      
      // 處理即時價格陷阱：z(成交價)是橫槓-時，改抓b(買進價)
      let currentPrice = 0;
      let priceSource = '';
      
      if (info.z && info.z !== '-' && !isNaN(parseFloat(info.z))) {
        // 有成交價，使用成交價
        currentPrice = parseFloat(info.z);
        priceSource = '成交價';
        logger.debug('stock', `${symbol} 使用成交價: ${currentPrice}`);
      } else if (info.b && info.b !== '-') {
        // 沒成交，改抓買進價
        // b 格式通常為 "價格_張數_"，取第一個底線前的內容
        const buyPrices = info.b.split('_');
        const buyPrice = buyPrices[0];
        if (buyPrice && !isNaN(parseFloat(buyPrice))) {
          currentPrice = parseFloat(buyPrice);
          priceSource = '買進價';
          logger.debug('stock', `${symbol} 無成交，使用買進價: ${currentPrice} (原始: ${info.b})`);
        } else {
          throw new Error(`買進價格式錯誤: b=${info.b}`);
        }
      } else {
        throw new Error(`無有效價格資料: z=${info.z}, b=${info.b}`);
      }
      
      const yesterdayPrice = parseFloat(info.y) || currentPrice; // y=昨收價
      
      if (currentPrice <= 0) {
        throw new Error(`無效股價: ${currentPrice}`);
      }

      // 計算漲跌
      const change = currentPrice - yesterdayPrice;
      const changePercent = yesterdayPrice > 0 ? (change / yesterdayPrice) * 100 : 0;

      logger.info('stock', `✅ TWSE MIS (即時行情) 成功獲取 ${symbol}: ${currentPrice}`, {
        market,
        name: info.n,
        time: info.t,
        volume: info.v,
        priceSource: priceSource
      });

      return {
        price: Math.round(currentPrice * 100) / 100,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        source: 'TWSE MIS (即時行情)',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      const message = error instanceof Error ? error.message : '未知錯誤';
      logger.debug('stock', `❌ TWSE MIS (即時行情) 失敗: ${message}`);
      throw new Error(`TWSE MIS API 失敗: ${message}`);
    }
  }

  /**
   * 精準判斷股票市場類型 - 基於用戶指導
   * 市場路徑要精準：走錯路就抓不到資料
   * 
   * 範例：
   * - 富邦金 (2881) → tse (上市)
   * - 世紀 (5314) → otc (上櫃)
   */
  private getMarketTypeForTWSE(symbol: string): 'tse' | 'otc' {
    const code = parseInt(symbol.substring(0, 4));
    
    // ETF 通常在上市 (tse)
    if (symbol.match(/^00\d+/)) {
      logger.debug('stock', `${symbol} 判斷為 ETF → tse`);
      return 'tse';
    }
    
    // 上市股票 (1000-2999) → tse
    if (code >= 1000 && code <= 2999) {
      logger.debug('stock', `${symbol} 判斷為上市股票 → tse`);
      return 'tse';
    }
    
    // 上櫃股票 (3000-8999) → otc
    // 例如：世紀 (5314) 必須用 otc_5314.tw
    if (code >= 3000 && code <= 8999) {
      logger.debug('stock', `${symbol} 判斷為上櫃股票 → otc`);
      return 'otc';
    }
    
    // 預設上市 (tse)
    logger.debug('stock', `${symbol} 預設判斷為上市 → tse`);
    return 'tse';
  }

  /**
   * TWSE (台灣證交所) API - v1.0.2.0332 正確版本
   * 使用與成功倉庫完全相同的 STOCK_DAY API
   */
  private async fetchFromTWSE(symbol: string): Promise<StockPrice | null> {
    try {
      logger.debug('stock', `嘗試從 TWSE (台灣證交所) 獲取 ${symbol} 股價...`);
      
      // 使用與成功倉庫完全相同的 API 端點
      const today = new Date();
      const dateStr = today.getFullYear() + 
                     String(today.getMonth() + 1).padStart(2, '0') + 
                     String(today.getDate()).padStart(2, '0');
      
      const apiUrl = `https://www.twse.com.tw/exchangeReport/STOCK_DAY?response=json&date=${dateStr}&stockNo=${symbol}`;
      
      logger.debug('stock', `TWSE API URL: ${apiUrl}`);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.stat !== 'OK' || !data.data || data.data.length === 0) {
        throw new Error('TWSE 無資料或股票代碼錯誤');
      }

      // 取最新一天的資料（陣列最後一筆）
      const latestData = data.data[data.data.length - 1];
      const closePrice = parseFloat(latestData[6].replace(/,/g, '')) || 0;

      if (closePrice <= 0) {
        throw new Error(`無效股價: ${closePrice}`);
      }

      // 計算漲跌（與前一天比較）
      const previousClose = data.data.length > 1 ? 
        parseFloat(data.data[data.data.length - 2][6].replace(/,/g, '')) : closePrice;
      const change = closePrice - previousClose;
      const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

      logger.info('stock', `✅ TWSE (台灣證交所) 成功獲取 ${symbol}: $${closePrice}`);

      return {
        price: Math.round(closePrice * 100) / 100,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        source: 'TWSE (台灣證交所)',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      const message = error instanceof Error ? error.message : '未知錯誤';
      logger.debug('stock', `❌ TWSE (台灣證交所) 失敗: ${message}`);
      throw new Error(`TWSE API 失敗: ${message}`);
    }
  }

  /**
   * 股票類型判斷 - 基於成功倉庫邏輯
   */
  private getStockType(stockCode: string): 'listed' | 'otc' | 'etf' | 'unknown' {
    if (stockCode.match(/^00\d+/)) return 'etf'; // ETF
    if (stockCode.match(/^[1-2]\d{3}$/)) return 'listed'; // 上市股票 (1000-2999)
    if (stockCode.match(/^[3-8]\d{3}$/)) return 'otc'; // 上櫃股票 (3000-8999)
    return 'unknown';
  }

  /**
   * 上市股票 API - 完全基於成功倉庫實作
   */
  private async fetchFromTWSEListed(stockCode: string): Promise<StockPrice | null> {
    const today = new Date();
    const dateStr = today.getFullYear() + 
                   String(today.getMonth() + 1).padStart(2, '0') + 
                   String(today.getDate()).padStart(2, '0');
    
    const twseUrl = `https://www.twse.com.tw/exchangeReport/STOCK_DAY?response=json&date=${dateStr}&stockNo=${stockCode}`;
    
    try {
      const response = await this.fetchWithTimeout(twseUrl, { timeout: 5000 });
      
      if (!response.ok) {
        throw new Error(`TWSE API 錯誤: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.stat !== 'OK' || !data.data || data.data.length === 0) {
        throw new Error('TWSE 無資料或股票代碼錯誤');
      }
      
      const latestData = data.data[data.data.length - 1];
      const closePrice = parseFloat(latestData[6].replace(/,/g, ''));
      
      if (isNaN(closePrice) || closePrice <= 0) {
        throw new Error('無效的價格資料');
      }
      
      // 計算漲跌
      const previousClose = data.data.length > 1 ? 
        parseFloat(data.data[data.data.length - 2][6].replace(/,/g, '')) : closePrice;
      const change = closePrice - previousClose;
      const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;
      
      return {
        price: Math.round(closePrice * 100) / 100,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        source: 'TWSE',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      throw new Error(`上市股票API失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    }
  }

  /**
   * 上櫃股票 API - 完全基於成功倉庫實作
   */
  private async fetchFromTPEx(stockCode: string): Promise<StockPrice | null> {
    const today = new Date();
    const dateStr = today.getFullYear() + '/' + 
                   String(today.getMonth() + 1).padStart(2, '0') + '/' + 
                   String(today.getDate()).padStart(2, '0');
    
    const tpexUrl = `https://www.tpex.org.tw/web/stock/aftertrading/daily_close_quotes/stk_quote_result.php?l=zh-tw&d=${dateStr}&stkno=${stockCode}`;
    
    try {
      const response = await this.fetchWithTimeout(tpexUrl, { timeout: 10000 });
      
      if (!response.ok) {
        throw new Error(`TPEx API 錯誤: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.aaData || data.aaData.length === 0) {
        throw new Error('TPEx 無資料或股票代碼錯誤');
      }
      
      const stockData = data.aaData[0];
      const closePrice = parseFloat(stockData[2]);
      
      if (isNaN(closePrice) || closePrice <= 0) {
        throw new Error('無效的價格資料');
      }
      
      // 計算漲跌 (TPEx API 通常有漲跌資料)
      const change = parseFloat(stockData[3]) || 0;
      const changePercent = closePrice > 0 && change !== 0 ? (change / (closePrice - change)) * 100 : 0;
      
      return {
        price: Math.round(closePrice * 100) / 100,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        source: 'TPEx',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      throw new Error(`上櫃股票API失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    }
  }

  /**
   * 嘗試所有證交所 API - 基於成功倉庫邏輯
   */
  private async fetchFromAllTWSE(stockCode: string): Promise<StockPrice | null> {
    const apis = [
      { name: '上市', method: this.fetchFromTWSEListed.bind(this) },
      { name: '上櫃', method: this.fetchFromTPEx.bind(this) }
    ];
    
    for (const api of apis) {
      try {
        logger.debug('stock', `嘗試${api.name}API: ${stockCode}`);
        const result = await api.method(stockCode);
        if (result && result.price > 0) {
          logger.debug('stock', `${api.name}API成功: ${stockCode} - 價格: ${result.price}`);
          return result;
        }
      } catch (error) {
        logger.debug('stock', `${api.name}API失敗: ${stockCode}`);
        continue;
      }
    }
    
    throw new Error('所有證交所API都無法找到此股票');
  }

  /**
   * 帶逾時的 fetch - 基於成功倉庫實作
   */
  private async fetchWithTimeout(url: string, options: { timeout?: number } = {}): Promise<Response> {
    const { timeout = 5000, ...fetchOptions } = options;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('請求超時');
      }
      throw error;
    }
  }

  /**
   * Yahoo Finance 通過 AllOrigins 代理 - v1.0.2.0327 優化版
   * 基於成功倉庫 v1.2.2.0035 的實作經驗
   */
  private async fetchFromYahooAllOrigins(symbol: string): Promise<StockPrice | null> {
    const yahooSymbol = await this.getYahooSymbol(symbol);
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`;
    
    // 使用與成功倉庫相同的 AllOrigins 代理方式
    const corsProxy = 'https://api.allorigins.win/raw?url=';
    const proxyUrl = corsProxy + encodeURIComponent(yahooUrl);

    try {
      logger.debug('stock', `AllOrigins 代理請求: ${symbol}`, { 
        yahooSymbol, 
        proxyUrl: proxyUrl.substring(0, 100) + '...' 
      });

      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const yahooData = await response.json();
      
      const result = yahooData?.chart?.result?.[0];
      if (!result?.meta) {
        throw new Error('無效的 Yahoo Finance 資料結構');
      }

      const currentPrice = result.meta.regularMarketPrice || result.meta.previousClose || 0;
      const previousClose = result.meta.previousClose || 0;
      const change = currentPrice - previousClose;
      const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

      if (currentPrice <= 0) {
        throw new Error(`無效股價: ${currentPrice}`);
      }

      logger.info('stock', `AllOrigins 獲取成功: ${symbol}`, { 
        yahooSymbol,
        price: currentPrice,
        change,
        changePercent: changePercent.toFixed(2) + '%'
      });

      return {
        price: Math.round(currentPrice * 100) / 100,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        source: 'Yahoo Finance (AllOrigins)',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      const message = error instanceof Error ? error.message : '未知錯誤';
      logger.debug('stock', `AllOrigins 失敗: ${symbol}`, { 
        error: message,
        yahooSymbol 
      });
      throw new Error(`AllOrigins 代理失敗: ${message}`);
    }
  }

  /**
   * Yahoo Finance 通過 CodeTabs 代理
   */
  private async fetchFromYahooCodeTabs(symbol: string): Promise<StockPrice | null> {
    const yahooSymbol = await this.getYahooSymbol(symbol);
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`;
    const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(yahooUrl)}`;

    try {
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const yahooData = await response.json();
      
      const result = yahooData?.chart?.result?.[0];
      if (!result?.meta) throw new Error('無效的 Yahoo Finance 資料');

      const currentPrice = result.meta.regularMarketPrice || 0;
      const previousClose = result.meta.previousClose || 0;
      const change = currentPrice - previousClose;
      const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

      return {
        price: Math.round(currentPrice * 100) / 100,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        source: 'Yahoo Finance (CodeTabs)',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知錯誤';
      throw new Error(`CodeTabs 代理失敗: ${message}`);
    }
  }

  /**
   * Yahoo Finance 通過 ThingProxy 代理
   */
  private async fetchFromYahooThingProxy(symbol: string): Promise<StockPrice | null> {
    const yahooSymbol = await this.getYahooSymbol(symbol);
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`;
    const proxyUrl = `https://thingproxy.freeboard.io/fetch/${yahooUrl}`;

    try {
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const yahooData = await response.json();
      
      const result = yahooData?.chart?.result?.[0];
      if (!result?.meta) throw new Error('無效的 Yahoo Finance 資料');

      const currentPrice = result.meta.regularMarketPrice || 0;
      const previousClose = result.meta.previousClose || 0;
      const change = currentPrice - previousClose;
      const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

      return {
        price: Math.round(currentPrice * 100) / 100,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        source: 'Yahoo Finance (ThingProxy)',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知錯誤';
      throw new Error(`ThingProxy 代理失敗: ${message}`);
    }
  }

  /**
   * Yahoo Finance 通過 CORS Anywhere 代理
   */
  private async fetchFromYahooCORSAnywhere(symbol: string): Promise<StockPrice | null> {
    const yahooSymbol = await this.getYahooSymbol(symbol);
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`;
    const proxyUrl = `https://cors-anywhere.herokuapp.com/${yahooUrl}`;

    try {
      const response = await fetch(proxyUrl, {
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const yahooData = await response.json();
      
      const result = yahooData?.chart?.result?.[0];
      if (!result?.meta) throw new Error('無效的 Yahoo Finance 資料');

      const currentPrice = result.meta.regularMarketPrice || 0;
      const previousClose = result.meta.previousClose || 0;
      const change = currentPrice - previousClose;
      const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

      return {
        price: Math.round(currentPrice * 100) / 100,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        source: 'Yahoo Finance (CORS Anywhere)',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知錯誤';
      throw new Error(`CORS Anywhere 代理失敗: ${message}`);
    }
  }
  /**
   * 獲取 Yahoo Finance 符號 - v1.0.2.0350 強化版
   * 優先使用 Stock List 預定義後綴，備用邏輯判斷
   */
  private async getYahooSymbol(symbol: string): Promise<string> {
    if (symbol.includes('.')) return symbol; // 已有後綴

    // 嘗試從 Stock List 獲取預定義後綴
    try {
      const { stockListService } = await import('./stockListService');
      const yahooSymbol = await stockListService.getYahooSymbol(symbol);
      logger.debug('stock', `Stock List 後綴查詢: ${symbol} → ${yahooSymbol}`);
      return yahooSymbol;
    } catch (error) {
      logger.warn('stock', `Stock List 查詢失敗，使用備用邏輯: ${symbol}`, error);
    }

    // 備用：使用原有的邏輯判斷
    return this.fallbackGetYahooSymbol(symbol);
  }

  /**
   * 備用的 Yahoo Finance 符號判斷邏輯
   * 當 Stock List 不可用時使用
   */
  private fallbackGetYahooSymbol(symbol: string): string {
    const code = parseInt(symbol.substring(0, 4));
    const isBondETF = /^00\d{2,3}B$/i.test(symbol);
    const isETF = /^00\d{2,3}[A-Z]?$/i.test(symbol);

    // 特殊案例處理（基於實際測試結果）
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
    if (code >= 1000 && code <= 2999) {
      return `${symbol}.TW`;
    }
    
    // 其他情況：預設證交所
    return `${symbol}.TW`;
  }





  /**
   * 獲取日期字串（YYYY-MM-DD 格式）
   */
  private getDateString(daysOffset: number): string {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    return date.toISOString().split('T')[0];
  }

  /**
   * 創建超時 Promise
   */
  private createTimeoutPromise(timeout: number): Promise<null> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), timeout);
    });
  }

  /**
   * 獲取快取的股價
   */
  private getCachedPrice(symbol: string): StockPrice | null {
    const cached = this.cache.get(symbol);
    if (cached && Date.now() < cached.expiry) {
      return cached.data;
    }
    
    // 清除過期快取
    if (cached) {
      this.cache.delete(symbol);
    }
    
    return null;
  }

  /**
   * 設定快取的股價
   */
  private setCachedPrice(symbol: string, price: StockPrice): void {
    this.cache.set(symbol, {
      data: price,
      expiry: Date.now() + this.CACHE_DURATION
    });
  }

  /**
   * 清除所有快取
   */
  clearCache(): void {
    this.cache.clear();
    logger.debug('stock', '股價快取已清除');
  }

  /**
   * 獲取快取統計
   */
  getCacheStats() {
    const now = Date.now();
    const total = this.cache.size;
    const valid = Array.from(this.cache.values()).filter(item => now < item.expiry).length;
    
    return {
      total,
      valid,
      expired: total - valid
    };
  }

  /**
   * 批次獲取多個股票價格
   */
  async getBatchStockPrices(symbols: string[]): Promise<Map<string, StockPrice | null>> {
    const results = new Map<string, StockPrice | null>();
    
    // 控制並發數量，避免過多請求
    const BATCH_SIZE = 3;
    
    for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
      const batch = symbols.slice(i, i + BATCH_SIZE);
      
      const promises = batch.map(async (symbol) => {
        const price = await this.getStockPrice(symbol);
        return { symbol, price };
      });
      
      const batchResults = await Promise.allSettled(promises);
      
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.set(result.value.symbol, result.value.price);
        } else {
          logger.error('stock', `批次獲取股價失敗`, result.reason);
          results.set('unknown', null);
        }
      });
      
      // 批次間稍微延遲，避免過於頻繁的請求
      if (i + BATCH_SIZE < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    return results;
  }

  /**
   * Yahoo Finance 本機端 API - v1.0.2.0336
   * 使用本機端的 Yahoo Finance API，無 CORS 問題
   */
  private async fetchFromYahooLocal(symbol: string): Promise<StockPrice | null> {
    try {
      // 使用本機端的 Yahoo Finance API 服務
      const { YahooFinanceAPI } = await import('./yahooFinanceAPI');
      const yahooAPI = new YahooFinanceAPI();
      
      logger.debug('stock', `Yahoo Finance 本機端請求: ${symbol}`);
      
      const result = await yahooAPI.getStockPrice(symbol);
      
      if (result && result.price > 0) {
        logger.info('stock', `Yahoo Finance 本機端獲取成功: ${symbol}`, { 
          price: result.price,
          source: result.source
        });
        
        return {
          price: result.price,
          change: result.change || 0,
          changePercent: result.changePercent || 0,
          source: 'Yahoo Finance (本機端)',
          timestamp: new Date().toISOString()
        };
      } else {
        throw new Error('無效的股價資料');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知錯誤';
      logger.debug('stock', `Yahoo Finance 本機端失敗: ${symbol}`, { 
        error: message
      });
      throw new Error(`Yahoo Finance 本機端失敗: ${message}`);
    }
  }
}

// 導出單例
export const cloudStockPriceService = new CloudStockPriceService();

// 導出類型
export type { StockPrice };