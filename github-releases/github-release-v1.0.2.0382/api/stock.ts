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

    // 🔧 修復：優先獲取即時股價，與本機端邏輯一致
    let currentPrice = 0;
    const previousClose = result.meta.previousClose || 0;
    
    // 1. 優先使用最新的交易資料（即時價格）
    if (result.indicators?.quote?.[0] && result.timestamp) {
      const quotes = result.indicators.quote[0];
      const timestamps = result.timestamp;
      const latestIndex = timestamps.length - 1;
      
      // 獲取最新的收盤價、開盤價或最後交易價
      currentPrice = quotes.close?.[latestIndex] || 
                    quotes.open?.[latestIndex] || 
                    quotes.high?.[latestIndex] || 
                    quotes.low?.[latestIndex] || 0;
      
      console.log(`📊 ${yahooSymbol} 即時資料: close=${quotes.close?.[latestIndex]}, open=${quotes.open?.[latestIndex]}`);
    }
    
    // 2. 如果沒有即時資料，使用 meta 中的價格
    if (currentPrice <= 0) {
      currentPrice = result.meta.regularMarketPrice || result.meta.previousClose || 0;
      console.log(`📊 ${yahooSymbol} 使用 meta 價格: regularMarketPrice=${result.meta.regularMarketPrice}`);
    }
    
    const change = currentPrice - previousClose;
    const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;
    
    // 3. 記錄市場狀態和時間資訊
    const marketState = result.meta.marketState || 'UNKNOWN';
    const regularMarketTime = result.meta.regularMarketTime ? new Date(result.meta.regularMarketTime * 1000) : new Date();
    
    console.log(`📊 ${yahooSymbol} 市場狀態: ${marketState}, 更新時間: ${regularMarketTime.toLocaleString('zh-TW')}`);
    console.log(`✅ Vercel API 成功: ${yahooSymbol} = ${currentPrice} [${marketState}]`);

    const stockData = {
      price: Math.round(currentPrice * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      source: `Yahoo Finance (Vercel) (${marketState})`,
      timestamp: new Date().toISOString(),
      marketState: marketState,
      lastUpdate: regularMarketTime.toISOString()
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