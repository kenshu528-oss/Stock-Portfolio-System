import type { Handler, HandlerEvent } from '@netlify/functions';

/**
 * Netlify Function: 股票資訊查詢 - v1.0.2.0244 穩定版邏輯
 * 端點: /.netlify/functions/stock?symbol=2330
 * 
 * 功能：
 * - 智能後綴判斷（.TW/.TWO）
 * - 多重API備援（Yahoo Finance + FinMind + 證交所）
 * - 混合資料來源策略
 */
export const handler: Handler = async (event: HandlerEvent) => {
  // CORS 標頭
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=60', // 快取 1 分鐘
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  const symbol = event.queryStringParameters?.symbol;

  if (!symbol) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: '缺少 symbol 參數' }),
    };
  }

  try {
    console.log(`🔍 Netlify Function 股價查詢: ${symbol}`);
    
    const upperSymbol = symbol.toUpperCase();
    let stockData = null;
    let chineseName = null;

    // 方法1: 優先使用 Yahoo Finance API（即時性最高）
    try {
      console.log(`📊 優先嘗試 Yahoo Finance: ${upperSymbol}`);
      stockData = await getYahooStockPrice(upperSymbol);
      if (stockData && stockData.price > 0) {
        console.log(`✅ Yahoo Finance 成功: ${stockData.price}`);
        
        // v1.0.2.0315: 股價專精 - 不再獲取 FinMind 名稱，使用 Stock List
        // 專注股價獲取，明確標示來源
        stockData.source = 'Yahoo Finance (Netlify)';
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(stockData),
        };
      }
    } catch (yahooError) {
      console.log(`Yahoo Finance 失敗: ${upperSymbol}`);
    }

    // 方法2: FinMind API（台股專用，中文名稱）
    try {
      console.log(`📊 嘗試 FinMind: ${upperSymbol}`);
      stockData = await getFinMindStockPrice(upperSymbol);
      if (stockData && stockData.price > 0) {
        console.log(`✅ FinMind 成功: ${stockData.price}`);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(stockData),
        };
      } else if (stockData && stockData.name) {
        chineseName = stockData.name;
      }
    } catch (finmindError) {
      console.log(`FinMind 失敗: ${upperSymbol}`);
    }

    // 方法3: 證交所 API（最後備用）
    try {
      console.log(`📊 嘗試證交所 API: ${upperSymbol}`);
      stockData = await getTWSEStockPrice(upperSymbol);
      if (stockData && stockData.price > 0) {
        if (chineseName) {
          stockData.name = chineseName;
          stockData.source = 'FinMind+TWSE';
        }
        console.log(`✅ 證交所成功: ${stockData.price}`);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(stockData),
        };
      }
    } catch (twseError) {
      console.log(`證交所失敗: ${upperSymbol}`);
    }

    // 所有API都失敗
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({
        error: 'Stock not found',
        message: `找不到股票代碼 ${upperSymbol} 的資訊`,
        suggestions: [
          '請確認股票代碼是否正確',
          '檢查是否為有效的台股代碼',
          '稍後再試或聯繫客服'
        ]
      }),
    };

  } catch (error) {
    console.error('❌ Netlify Function 股價查詢錯誤:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: '股票查詢失敗',
        message: error instanceof Error ? error.message : '未知錯誤',
      }),
    };
  }
};

// Yahoo Finance API 調用
async function getYahooStockPrice(symbol: string) {
  const suffixes = getStockSuffixes(symbol);
  
  for (const suffix of suffixes) {
    try {
      const yahooSymbol = `${symbol}${suffix}`;
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`;
      
      const response = await fetch(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const meta = data?.chart?.result?.[0]?.meta;
        
        if (meta && meta.regularMarketPrice > 0) {
          return {
            symbol,
            name: meta.longName || meta.shortName || symbol,
            price: Math.round(meta.regularMarketPrice * 100) / 100,
            change: Math.round((meta.regularMarketPrice - meta.previousClose) * 100) / 100,
            changePercent: meta.previousClose > 0 ? 
              Math.round(((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100 * 100) / 100 : 0,
            timestamp: new Date().toISOString(),
            source: 'Yahoo Finance',
            market: getStockMarket(symbol)
          };
        }
      }
    } catch (err) {
      continue;
    }
  }
  return null;
}

// FinMind 股票資訊
async function getFinMindStockInfo(symbol: string) {
  try {
    const url = `https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockInfo&data_id=${symbol}&token=${process.env.VITE_FINMIND_TOKEN || ''}`;
    const response = await fetch(url, { timeout: 8000 });
    
    if (response.ok) {
      const data = await response.json();
      if (data.data && data.data.length > 0) {
        return {
          symbol,
          name: data.data[0].stock_name,
          source: 'FinMind'
        };
      }
    }
    return null;
  } catch (error) {
    return null;
  }
}

// FinMind 股價查詢
async function getFinMindStockPrice(symbol: string) {
  try {
    const today = new Date();
    const startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const url = `https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockPrice&data_id=${symbol}&start_date=${startDate.toISOString().split('T')[0]}&token=${process.env.VITE_FINMIND_TOKEN || ''}`;
    const response = await fetch(url, { timeout: 10000 });
    
    if (response.ok) {
      const data = await response.json();
      if (data.data && data.data.length > 0) {
        const latest = data.data[data.data.length - 1];
        const price = parseFloat(latest.close) || 0;
        
        if (price > 0) {
          // 同時獲取中文名稱
          const stockInfo = await getFinMindStockInfo(symbol);
          
          return {
            symbol,
            name: stockInfo?.name || symbol,
            price: Math.round(price * 100) / 100,
            change: 0, // 簡化處理
            changePercent: 0,
            timestamp: new Date().toISOString(),
            source: 'FinMind',
            market: getStockMarket(symbol)
          };
        }
      }
    }
    return null;
  } catch (error) {
    return null;
  }
}

// 證交所 API 調用
async function getTWSEStockPrice(symbol: string) {
  try {
    const response = await fetch(
      `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=tse_${symbol}.tw|otc_${symbol}.tw`,
      {
        timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      }
    );

    if (response.ok) {
      const data = await response.json();
      if (data.msgArray && data.msgArray.length > 0) {
        const stockData = data.msgArray[0];
        const price = parseFloat(stockData.z) || 0;
        
        if (price > 0) {
          return {
            symbol,
            name: stockData.n || symbol,
            price: Math.round(price * 100) / 100,
            change: Math.round((price - parseFloat(stockData.y)) * 100) / 100,
            changePercent: parseFloat(stockData.y) > 0 ? 
              Math.round(((price - parseFloat(stockData.y)) / parseFloat(stockData.y)) * 100 * 100) / 100 : 0,
            timestamp: new Date().toISOString(),
            source: 'TWSE',
            market: stockData.ex === 'tse' ? '上市' : '上櫃'
          };
        }
      }
    }
    return null;
  } catch (error) {
    return null;
  }
}

// 智能後綴判斷
function getStockSuffixes(symbol: string): string[] {
  const code = parseInt(symbol.substring(0, 4));
  const isBondETF = /^00\d{2,3}B$/i.test(symbol);
  
  if (isBondETF) {
    return ['.TWO', '.TW']; // 債券 ETF 優先櫃買中心
  } else if (code >= 3000 && code <= 8999) {
    return ['.TWO', '.TW']; // 上櫃股票優先櫃買中心
  } else {
    return ['.TW', '.TWO']; // 上市股票優先證交所
  }
}

// 判斷股票市場
function getStockMarket(symbol: string): string {
  if (/^00\d{2,3}[A-Z]?$/.test(symbol)) return 'ETF';
  
  const code = parseInt(symbol.substring(0, 4));
  if (code >= 1000 && code <= 2999) return '上市';
  if (code >= 3000 && code <= 8999) return '上櫃';
  return '台灣';
}
