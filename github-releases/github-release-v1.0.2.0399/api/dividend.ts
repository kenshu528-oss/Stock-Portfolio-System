import { NextRequest, NextResponse } from 'next/server';

export const config = {
  runtime: 'edge',
};

/**
 * Vercel Edge Function: 除息資料查詢
 * 端點: /api/dividend?symbol=00981A
 * 
 * 策略：
 * 1. FinMind API（一般股票首選，空 token 走免費通道）
 * 2. Yahoo Finance API（備援，ETF 配息資料較完整）
 */
export default async function handler(req: NextRequest) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 200, headers: corsHeaders });
  }

  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json({ error: '缺少 symbol 參數' }, { status: 400, headers: corsHeaders });
  }

  const upperSymbol = symbol.toUpperCase();

  // 智能判斷後綴
  const getYahooSymbol = (sym: string): string => {
    if (sym.includes('.')) return sym;
    const code = parseInt(sym.substring(0, 4));
    const isBondETF = /^00\d{2,3}B$/i.test(sym);
    if (isBondETF || code >= 3000) return `${sym}.TWO`;
    return `${sym}.TW`;
  };

  // 1. 嘗試 FinMind（空 token 走免費匿名通道）
  try {
    const today = new Date().toISOString().split('T')[0];
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
    const startDate = threeYearsAgo.toISOString().split('T')[0];

    const finmindUrl = `https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockDividend&data_id=${upperSymbol}&start_date=${startDate}&end_date=${today}&token=`;
    const finmindRes = await fetch(finmindUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000),
    });

    if (finmindRes.ok) {
      const finmindData = await finmindRes.json();
      if (finmindData?.data?.length > 0) {
        const dividends = finmindData.data
          .map((item: any) => {
            const cashDividend = (parseFloat(item.CashEarningsDistribution) || 0) +
                                 (parseFloat(item.CashStatutorySurplus) || 0);
            const stockDividend = (parseFloat(item.StockEarningsDistribution) || 0) +
                                  (parseFloat(item.StockStatutorySurplus) || 0);
            const exDate = item.CashExDividendTradingDate || item.StockExDividendTradingDate;
            if (!exDate) return null;
            return {
              exDate,
              amount: cashDividend,
              stockDividendRatio: stockDividend > 0 ? (stockDividend / 10) * 1000 : 0,
              type: stockDividend > 0 ? 'both' : 'cash',
              year: item.year,
            };
          })
          .filter(Boolean);

        if (dividends.length > 0) {
          return NextResponse.json(
            { symbol: upperSymbol, dividends, source: 'FinMind' },
            { headers: { ...corsHeaders, 'Cache-Control': 'public, max-age=3600' } }
          );
        }
      }
    }
  } catch (_) {
    // FinMind 失敗，繼續嘗試 Yahoo Finance
  }

  // 2. 備援：Yahoo Finance 除息資料
  try {
    const yahooSymbol = getYahooSymbol(upperSymbol);
    // 使用 v8 chart API 取得除息資料（events=div）
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?events=div&range=3y&interval=1d`;
    const yahooRes = await fetch(yahooUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(10000),
    });

    if (!yahooRes.ok) throw new Error(`Yahoo HTTP ${yahooRes.status}`);

    const yahooData = await yahooRes.json();
    const events = yahooData?.chart?.result?.[0]?.events?.dividends;

    if (events && Object.keys(events).length > 0) {
      const dividends = Object.values(events as Record<string, { amount: number; date: number }>)
        .map((div) => ({
          exDate: new Date(div.date * 1000).toISOString().split('T')[0],
          amount: Math.round(div.amount * 10000) / 10000,
          stockDividendRatio: 0,
          type: 'cash' as const,
          year: new Date(div.date * 1000).getFullYear(),
        }))
        .sort((a, b) => a.exDate.localeCompare(b.exDate));

      return NextResponse.json(
        { symbol: upperSymbol, dividends, source: 'Yahoo Finance (Vercel)' },
        { headers: { ...corsHeaders, 'Cache-Control': 'public, max-age=3600' } }
      );
    }
  } catch (_) {
    // Yahoo Finance 也失敗
  }

  return NextResponse.json(
    { error: '找不到除息資料', symbol: upperSymbol },
    { status: 404, headers: corsHeaders }
  );
}
