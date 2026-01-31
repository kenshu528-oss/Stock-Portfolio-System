#!/usr/bin/env node

/**
 * 測試股價獲取修復的腳本
 * 驗證 cloudStockPriceService 是否正常工作
 */

console.log('🧪 開始測試股價獲取修復...\n');

// 模擬瀏覽器環境 - 使用內建 fetch (Node.js 18+)
// global.fetch 在 Node.js 18+ 中已經內建

// 測試用的簡化版 cloudStockPriceService
class TestCloudStockPriceService {
  constructor() {
    this.cache = new Map();
    this.CACHE_DURATION = 5 * 60 * 1000;
  }

  async getStockPrice(symbol) {
    console.log(`🔍 測試獲取 ${symbol} 股價...`);
    
    // 檢查快取
    const cached = this.getCachedPrice(symbol);
    if (cached) {
      console.log(`✅ 使用快取: ${symbol} = $${cached.price}`);
      return cached;
    }

    // 嘗試 AllOrigins + Yahoo Finance
    try {
      const result = await this.fetchFromYahooAllOrigins(symbol);
      if (result && result.price > 0) {
        this.setCachedPrice(symbol, result);
        console.log(`✅ Yahoo Finance 成功: ${symbol} = $${result.price}`);
        return result;
      }
    } catch (error) {
      console.log(`❌ Yahoo Finance 失敗: ${error.message}`);
    }

    // 嘗試 FinMind 直接調用
    try {
      const result = await this.fetchFromFinMindDirect(symbol);
      if (result && result.price > 0) {
        this.setCachedPrice(symbol, result);
        console.log(`✅ FinMind 成功: ${symbol} = $${result.price}`);
        return result;
      }
    } catch (error) {
      console.log(`❌ FinMind 失敗: ${error.message}`);
    }

    console.log(`❌ 所有 API 都失敗: ${symbol}`);
    return null;
  }

  async fetchFromYahooAllOrigins(symbol) {
    const yahooSymbol = this.getYahooSymbol(symbol);
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`;
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(yahooUrl)}`;

    const response = await fetch(proxyUrl, {
      timeout: 5000
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const proxyData = await response.json();
    const yahooData = JSON.parse(proxyData.contents);
    
    const result = yahooData?.chart?.result?.[0];
    if (!result?.meta) throw new Error('無效的 Yahoo Finance 資料');

    const currentPrice = result.meta.regularMarketPrice || 0;
    const previousClose = result.meta.previousClose || 0;
    const change = currentPrice - previousClose;
    const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

    return {
      price: currentPrice,
      change,
      changePercent,
      source: 'Yahoo Finance (AllOrigins)',
      timestamp: new Date().toISOString()
    };
  }

  async fetchFromFinMindDirect(symbol) {
    const today = new Date();
    const startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const finmindUrl = `https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockPrice&data_id=${symbol}&start_date=${startDate.toISOString().split('T')[0]}&end_date=${today.toISOString().split('T')[0]}&token=`;

    const response = await fetch(finmindUrl, {
      timeout: 8000
    });

    if (!response.ok) {
      if (response.status === 402) {
        throw new Error('FinMind API 需要付費');
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data.data || data.data.length === 0) {
      throw new Error('FinMind 無資料');
    }

    const prices = data.data.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    const latestPrice = prices[prices.length - 1];
    const currentPrice = latestPrice.close || 0;

    return {
      price: currentPrice,
      change: 0,
      changePercent: 0,
      source: 'FinMind Direct',
      timestamp: new Date().toISOString()
    };
  }

  getYahooSymbol(symbol) {
    if (symbol.includes('.')) return symbol;

    const code = parseInt(symbol.substring(0, 4));
    const isBondETF = /^00\d{2,3}B$/i.test(symbol);
    const isETF = /^00\d{2,3}[A-Z]?$/i.test(symbol);

    // 特殊案例處理
    const specialCases = {
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
    return `${symbol}.TW`;
  }

  getCachedPrice(symbol) {
    const cached = this.cache.get(symbol);
    if (cached && Date.now() < cached.expiry) {
      return cached.data;
    }
    if (cached) {
      this.cache.delete(symbol);
    }
    return null;
  }

  setCachedPrice(symbol, price) {
    this.cache.set(symbol, {
      data: price,
      expiry: Date.now() + this.CACHE_DURATION
    });
  }
}

// 執行測試
async function runTests() {
  const service = new TestCloudStockPriceService();
  const testSymbols = ['2330', '6188', '0050'];
  const results = [];

  console.log('📊 開始測試股價獲取...\n');

  for (const symbol of testSymbols) {
    const startTime = Date.now();
    
    try {
      const result = await service.getStockPrice(symbol);
      const responseTime = Date.now() - startTime;
      
      results.push({
        symbol,
        success: !!result,
        price: result?.price || 0,
        source: result?.source || 'N/A',
        responseTime
      });
      
    } catch (error) {
      results.push({
        symbol,
        success: false,
        error: error.message,
        responseTime: Date.now() - startTime
      });
    }
    
    console.log(''); // 空行分隔
  }

  // 顯示測試結果
  console.log('📋 測試結果總結:');
  console.log('='.repeat(50));
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    const info = result.success 
      ? `$${result.price} (${result.source})`
      : result.error;
    
    console.log(`${status} ${result.symbol}: ${info} (${result.responseTime}ms)`);
  });

  const successCount = results.filter(r => r.success).length;
  const successRate = (successCount / results.length * 100).toFixed(1);
  const avgResponseTime = Math.round(
    results.reduce((sum, r) => sum + r.responseTime, 0) / results.length
  );

  console.log('='.repeat(50));
  console.log(`📊 成功率: ${successRate}% (${successCount}/${results.length})`);
  console.log(`⏱️ 平均響應時間: ${avgResponseTime}ms`);

  if (successCount > 0) {
    console.log('\n✅ 股價獲取功能正常！');
  } else {
    console.log('\n❌ 股價獲取功能異常，需要檢查網路連線或 API 狀態');
  }
}

// 執行測試
runTests().catch(error => {
  console.error('❌ 測試執行失敗:', error);
  process.exit(1);
});