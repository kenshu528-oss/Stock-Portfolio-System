import type { Handler, HandlerEvent } from '@netlify/functions';

/**
 * Netlify Function: 股息資料查詢
 * 端點: /.netlify/functions/dividend?symbol=2330
 */
export const handler: Handler = async (event: HandlerEvent) => {
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
    // 調用 FinMind API 獲取股息資料
    const response = await fetch(
      `https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockDividend&data_id=${symbol}&token=`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`FinMind API 請求失敗: ${response.status}`);
    }

    const data = await response.json();

    // 檢查是否有資料
    if (!data.data || data.data.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: '找不到股息資料' }),
      };
    }

    // 格式化回應
    const dividends = data.data.map((item: any) => ({
      exDate: item.CashExDividendTradingDate || item.StockExDividendTradingDate,
      cashDividend: parseFloat(item.CashEarningsDistribution || 0) + parseFloat(item.CashStatutorySurplus || 0),
      stockDividend: parseFloat(item.StockEarningsDistribution || 0) + parseFloat(item.StockStatutorySurplus || 0),
      year: item.year,
    }));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600', // 快取 1 小時
      },
      body: JSON.stringify({
        symbol: symbol,
        dividends: dividends,
      }),
    };
  } catch (error) {
    console.error('股息查詢錯誤:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: '股息查詢失敗',
        message: error instanceof Error ? error.message : '未知錯誤',
      }),
    };
  }
};
