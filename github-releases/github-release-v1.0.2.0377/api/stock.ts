import { NextRequest, NextResponse } from 'next/server';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: NextRequest) {
  // 設定 CORS 標頭
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // 處理 OPTIONS 請求
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get('symbol');

    if (!symbol) {
      return NextResponse.json(
        { error: '缺少股票代碼參數' },
        { status: 400, headers: corsHeaders }
      );
    }

    // 智能判斷股票代碼後綴
    const getYahooSymbol = (symbol: string): string => {
      if (symbol.includes('.')) return symbol;
      
      const code = parseInt(symbol.substring(0, 4));
      const isBondETF = /^00\d{2,3}B$/i.test(symbol);
      
      if (isBondETF) {
        return `${symbol}.TWO`;
      } else if (code >= 3000 && code <= 8999) {
        return `${symbol}.TWO`;
      } else {
        return `${symbol}.TW`;
      }
    };

    const yahooSymbol = getYahooSymbol(symbol);
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`;

    // 直接調用 Yahoo Finance API（Vercel Edge 無 CORS 限制）
    const response = await fetch(yahooUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Yahoo Finance API 錯誤: ${response.status}`);
    }

    const data = await response.json();
    const result = data?.chart?.result?.[0];
    
    if (!result?.meta) {
      throw new Error('無效的 Yahoo Finance 資料');
    }

    const currentPrice = result.meta.regularMarketPrice || 0;
    const previousClose = result.meta.previousClose || 0;
    const change = currentPrice - previousClose;
    const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

    const stockData = {
      price: Math.round(currentPrice * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      source: 'Yahoo Finance (Vercel)',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(stockData, { headers: corsHeaders });

  } catch (error) {
    console.error('股價獲取錯誤:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : '未知錯誤',
        source: 'Vercel Edge Function'
      },
      { status: 500, headers: corsHeaders }
    );
  }
}