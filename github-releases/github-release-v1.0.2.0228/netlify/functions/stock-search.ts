import type { Handler, HandlerEvent } from '@netlify/functions';

/**
 * Netlify Function: 股票搜尋
 * 端點: /.netlify/functions/stock-search?query=台積電
 */
export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  const query = event.queryStringParameters?.query;

  if (!query) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: '缺少 query 參數' }),
    };
  }

  try {
    // 先嘗試作為股票代碼查詢
    const response = await fetch(
      `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=tse_${query}.tw|otc_${query}.tw`,
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

    if (data.msgArray && data.msgArray.length > 0) {
      const stockData = data.msgArray[0];
      
      const result = [{
        symbol: query,
        name: stockData.n || '',
        price: parseFloat(stockData.z) || 0,
        market: stockData.ex === 'tse' ? '上市' : '上櫃',
      }];

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(result),
      };
    }

    // 如果找不到，返回空陣列
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([]),
    };
  } catch (error) {
    console.error('股票搜尋錯誤:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: '股票搜尋失敗',
        message: error instanceof Error ? error.message : '未知錯誤',
      }),
    };
  }
};
