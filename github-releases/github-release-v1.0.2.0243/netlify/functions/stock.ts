import type { Handler, HandlerEvent } from '@netlify/functions';

/**
 * Netlify Function: 股票資訊查詢
 * 端點: /.netlify/functions/stock?symbol=2330
 */
export const handler: Handler = async (event: HandlerEvent) => {
  // 只允許 GET 請求
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  const symbol = event.queryStringParameters?.symbol;

  if (!symbol) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: '缺少 symbol 參數' }),
    };
  }

  try {
    // 調用台灣證交所 API
    const response = await fetch(
      `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=tse_${symbol}.tw|otc_${symbol}.tw`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`API 請求失敗: ${response.status}`);
    }

    const data = await response.json();

    // 檢查是否有資料
    if (!data.msgArray || data.msgArray.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: '找不到股票資料' }),
      };
    }

    const stockData = data.msgArray[0];

    // 格式化回應
    const result = {
      symbol: symbol,
      name: stockData.n || '',
      price: parseFloat(stockData.z) || 0,
      change: parseFloat(stockData.z) - parseFloat(stockData.y) || 0,
      changePercent: ((parseFloat(stockData.z) - parseFloat(stockData.y)) / parseFloat(stockData.y) * 100) || 0,
      volume: parseInt(stockData.v) || 0,
      market: stockData.ex === 'tse' ? '上市' : '上櫃',
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60', // 快取 1 分鐘
      },
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('股票查詢錯誤:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: '股票查詢失敗',
        message: error instanceof Error ? error.message : '未知錯誤',
      }),
    };
  }
};
