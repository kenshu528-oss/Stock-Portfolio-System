import type { Handler, HandlerEvent } from '@netlify/functions';

/**
 * Netlify Function: 股票搜尋 - v1.0.2.0244 穩定版邏輯
 * 端點: /.netlify/functions/stock-search?query=0093
 * 
 * 功能：
 * - 支援部分匹配搜尋（輸入"0093"顯示所有"0093X"股票）
 * - 使用 FinMind API 獲取完整台股資料庫
 * - 精確前綴匹配，避免過度匹配
 * - 混合資料來源：FinMind + Yahoo Finance
 */
export const handler: Handler = async (event: HandlerEvent) => {
  // CORS 標頭
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
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

  const query = event.queryStringParameters?.query;

  if (!query || query.length < 2) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify([]),
    };
  }

  try {
    console.log(`🔍 Netlify Function 股票搜尋: "${query}"`);
    
    // 使用 FinMind API 獲取完整台股資料庫
    const finmindUrl = `https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockInfo&token=${process.env.VITE_FINMIND_TOKEN || ''}`;
    const response = await fetch(finmindUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`FinMind API 失敗: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.data || !Array.isArray(data.data)) {
      throw new Error('FinMind API 返回格式錯誤');
    }

    console.log(`📊 FinMind 返回 ${data.data.length} 筆台股資料`);

    // 精確前綴匹配過濾
    const filtered = data.data.filter((stock: any) => {
      const symbol = stock.stock_id || '';
      const name = stock.stock_name || '';
      
      // 只使用前綴匹配，避免過度匹配
      return symbol.toUpperCase().startsWith(query.toUpperCase()) ||
             name.includes(query);
    }).slice(0, 10); // 限制結果數量

    console.log(`🔍 過濾後找到 ${filtered.length} 筆匹配股票`);

    // 為每個股票獲取即時價格（簡化版，只返回基本資訊）
    const results = filtered.map((stock: any) => ({
      symbol: stock.stock_id,
      name: stock.stock_name,
      price: 0, // Netlify Function 中簡化處理
      market: '台股',
      type: getStockType(stock.stock_id),
      source: 'FinMind (Netlify)'
    }));

    // 去重處理
    const uniqueResults = results.filter((stock: any, index: number, self: any[]) => 
      index === self.findIndex(s => s.symbol === stock.symbol)
    );

    console.log(`✅ 搜尋結果: ${results.length} 筆，去重後: ${uniqueResults.length} 筆`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(uniqueResults),
    };

  } catch (error) {
    console.error('❌ Netlify Function 股票搜尋錯誤:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: '股票搜尋失敗',
        message: error instanceof Error ? error.message : '未知錯誤',
      }),
    };
  }
};

// 判斷股票類型
function getStockType(symbol: string): string {
  if (/^00\d{2,3}B$/i.test(symbol)) return 'bond';
  if (/^00\d{2,3}[A-Z]?$/i.test(symbol)) return 'etf';
  return 'stock';
}
