const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// 啟用CORS
app.use(cors());
app.use(express.json());

// 股票名稱對照表
const stockNames = {
  // ETF
  '0050': '元大台灣50',
  '0056': '元大高股息',
  '00878': '國泰永續高股息',
  '00919': '群益台灣精選高息',
  '00939': '統一台灣高息動能',
  '00940': '元大台灣價值高息',
  '00929': '復華台灣科技優息',
  '00934': '中信成長高股息',
  '00936': '台新永續高息中小',
  '00937': '統一台灣高息動能',
  '00935': '野村臺灣新科技50',
  '00932': '兆豐永續高息等權',
  '00933': '國泰台灣領袖50',
  '00931': '國泰台灣5G+',
  '00927': '群益半導體收益',
  '00923': '群益台ESG低碳50',
  '00922': '國泰台灣領袖50',
  '00921': '兆豐台灣晶圓製造',
  '00915': '凱基優選高股息30',
  '00913': '兆豐台灣藍籌30',
  '00912': '中信中國高股息',
  '00900': '富邦特選高股息30',
  '00937B': '群益ESG投等債20+',
  '00981A': '中信綠能及電動車',
  '00679B': '元大美債20年',
  '00687B': '國泰20年美債',
  '00695B': '富邦美債7-10',
  '00696B': '富邦美債1-3',
  '00646L': '元大S&P500正2',
  '00631L': '元大台灣50正2',
  '00637L': '元大滬深300正2',
  '00655L': '國泰中國A50正2',
  '00663L': '國泰台灣加權正2',
  '00632R': '元大台灣50反1',
  '00638R': '元大滬深300反1',
  '00664R': '國泰台灣加權反1',
  
  // 上市股票
  '2330': '台積電',
  '2317': '鴻海',
  '2454': '聯發科',
  '2881': '富邦金',
  '2882': '國泰金',
  '2883': '開發金',
  '2884': '玉山金',
  '2885': '元大金',
  '2886': '兆豐金',
  '2887': '台新金',
  '2888': '新光金',
  '2891': '中信金',
  '2892': '第一金',
  '2912': '統一超',
  '3008': '大立光',
  '3711': '日月光投控',
  '5880': '合庫金',
  '6505': '台塑化'
};

// 獲取股票中文名稱
function getStockName(symbol) {
  return stockNames[symbol] || `股票${symbol}`;
}

// 股票資料快取
const stockCache = new Map();
const CACHE_DURATION = 60000; // 1分鐘快取

// 清理過期快取
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of stockCache.entries()) {
    if (now - data.timestamp > CACHE_DURATION) {
      stockCache.delete(key);
    }
  }
}, 30000);

// 從Yahoo Finance獲取股價
async function getYahooStockPrice(symbol) {
  try {
    // 對於台灣股票，嘗試不同的後綴
    const suffixes = ['.TW', '.TWO'];
    let yahooSymbol = `${symbol}.TW`;
    
    // 對於ETF，可能需要不同的後綴
    if (/^00\d{2,3}[A-Z]?$/.test(symbol)) {
      yahooSymbol = `${symbol}.TW`;
    }
    
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`;
    
    console.log(`嘗試Yahoo Finance API: ${url}`);
    
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (response.data?.chart?.result?.[0]?.meta) {
      const meta = response.data.chart.result[0].meta;
      const price = meta.regularMarketPrice || meta.previousClose || 0;
      const previousClose = meta.previousClose || price;
      const change = price - previousClose;
      const stockName = getStockName(symbol) || meta.longName || meta.shortName || `股票${symbol}`;
      
      console.log(`Yahoo Finance成功獲取 ${symbol}: ${stockName}, 價格: ${price}`);
      
      return {
        symbol,
        name: stockName,
        price: Math.round(price * 100) / 100,
        change: Math.round(change * 100) / 100,
        changePercent: previousClose > 0 ? Math.round((change / previousClose) * 100 * 100) / 100 : 0,
        timestamp: new Date().toISOString(),
        source: 'Yahoo Finance',
        market: getStockMarket(symbol)
      };
    }
    
    return null;
  } catch (error) {
    console.error(`Yahoo API錯誤 ${symbol}:`, error.message);
    throw error;
  }
}

// 從台灣證交所獲取股價
async function getTWSEStockPrice(symbol) {
  try {
    let url;
    if (/^00\d{2,3}[A-Z]?$/.test(symbol)) {
      url = `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=otc_${symbol}.tw&json=1&delay=0`;
    } else {
      url = `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=tse_${symbol}.tw&json=1&delay=0`;
    }
    
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (response.data?.msgArray && response.data.msgArray.length > 0) {
      const stockData = response.data.msgArray[0];
      const price = parseFloat(stockData.z) || parseFloat(stockData.y) || 0;
      const previousClose = parseFloat(stockData.y) || price;
      const change = price - previousClose;
      const stockName = getStockName(symbol) || stockData.n || `股票${symbol}`;
      
      return {
        symbol,
        name: stockName,
        price: Math.round(price * 100) / 100,
        change: Math.round(change * 100) / 100,
        changePercent: previousClose > 0 ? Math.round((change / previousClose) * 100 * 100) / 100 : 0,
        timestamp: new Date().toISOString(),
        source: 'TWSE',
        market: getStockMarket(symbol)
      };
    }
    
    return null;
  } catch (error) {
    console.error(`TWSE API錯誤 ${symbol}:`, error.message);
    throw error;
  }
}

// 判斷股票市場
function getStockMarket(symbol) {
  if (/^00\d{2,3}[A-Z]?$/.test(symbol)) return 'ETF';
  const code = parseInt(symbol.substring(0, 4));
  if (code >= 1000 && code <= 2999) return '上市';
  if (code >= 3000 && code <= 8999) return '上櫃';
  return '台灣';
}

// 測試股息資料
function getTestDividendData(symbol) {
  const testData = {
    '2330': [
      // 台積電 - 2024年已發放的股息（購買日期2025/01/02之前）
      { symbol: '2330', exDividendDate: '2024-12-12', dividendPerShare: 4.0, year: 2024, source: 'Test' },
      { symbol: '2330', exDividendDate: '2024-09-12', dividendPerShare: 4.0, year: 2024, source: 'Test' },
      { symbol: '2330', exDividendDate: '2024-06-13', dividendPerShare: 4.0, year: 2024, source: 'Test' },
      { symbol: '2330', exDividendDate: '2024-03-14', dividendPerShare: 4.0, year: 2024, source: 'Test' },
      // 2025年預計股息（購買日期2025/01/02之後）
      { symbol: '2330', exDividendDate: '2025-03-14', dividendPerShare: 4.0, year: 2025, source: 'Test' },
      { symbol: '2330', exDividendDate: '2025-06-13', dividendPerShare: 4.0, year: 2025, source: 'Test' },
      { symbol: '2330', exDividendDate: '2025-09-12', dividendPerShare: 4.0, year: 2025, source: 'Test' },
      { symbol: '2330', exDividendDate: '2025-12-12', dividendPerShare: 4.0, year: 2025, source: 'Test' }
    ],
    '00878': [
      // 國泰永續高股息 - 2024年已發放（購買日期之前）
      { symbol: '00878', exDividendDate: '2024-11-15', dividendPerShare: 0.35, year: 2024, source: 'Test' },
      { symbol: '00878', exDividendDate: '2024-08-15', dividendPerShare: 0.35, year: 2024, source: 'Test' },
      { symbol: '00878', exDividendDate: '2024-05-15', dividendPerShare: 0.35, year: 2024, source: 'Test' },
      { symbol: '00878', exDividendDate: '2024-02-15', dividendPerShare: 0.35, year: 2024, source: 'Test' },
      // 2025年預計股息（購買日期2025/01/02之後）
      { symbol: '00878', exDividendDate: '2025-02-15', dividendPerShare: 0.35, year: 2025, source: 'Test' },
      { symbol: '00878', exDividendDate: '2025-05-15', dividendPerShare: 0.35, year: 2025, source: 'Test' },
      { symbol: '00878', exDividendDate: '2025-08-15', dividendPerShare: 0.35, year: 2025, source: 'Test' },
      { symbol: '00878', exDividendDate: '2025-11-15', dividendPerShare: 0.35, year: 2025, source: 'Test' }
    ],
    '00919': [
      // 群益台灣精選高息 - 2024年已發放
      { symbol: '00919', exDividendDate: '2024-12-16', dividendPerShare: 0.54, year: 2024, source: 'Test' },
      { symbol: '00919', exDividendDate: '2024-06-17', dividendPerShare: 0.54, year: 2024, source: 'Test' },
      // 2025年預計股息（購買日期2025/01/02之後）
      { symbol: '00919', exDividendDate: '2025-06-17', dividendPerShare: 0.54, year: 2025, source: 'Test' },
      { symbol: '00919', exDividendDate: '2025-12-16', dividendPerShare: 0.54, year: 2025, source: 'Test' }
    ],
    '00939': [
      // 統一台灣高息動能 - 2024年已發放
      { symbol: '00939', exDividendDate: '2024-12-18', dividendPerShare: 0.12, year: 2024, source: 'Test' },
      { symbol: '00939', exDividendDate: '2024-11-20', dividendPerShare: 0.12, year: 2024, source: 'Test' },
      { symbol: '00939', exDividendDate: '2024-10-21', dividendPerShare: 0.12, year: 2024, source: 'Test' },
      { symbol: '00939', exDividendDate: '2024-09-18', dividendPerShare: 0.12, year: 2024, source: 'Test' },
      // 2025年預計股息（購買日期2025/01/02之後）
      { symbol: '00939', exDividendDate: '2025-01-20', dividendPerShare: 0.12, year: 2025, source: 'Test' },
      { symbol: '00939', exDividendDate: '2025-02-18', dividendPerShare: 0.12, year: 2025, source: 'Test' },
      { symbol: '00939', exDividendDate: '2025-03-20', dividendPerShare: 0.12, year: 2025, source: 'Test' },
      { symbol: '00939', exDividendDate: '2025-04-21', dividendPerShare: 0.12, year: 2025, source: 'Test' },
      { symbol: '00939', exDividendDate: '2025-05-19', dividendPerShare: 0.12, year: 2025, source: 'Test' },
      { symbol: '00939', exDividendDate: '2025-06-18', dividendPerShare: 0.12, year: 2025, source: 'Test' },
      { symbol: '00939', exDividendDate: '2025-07-21', dividendPerShare: 0.12, year: 2025, source: 'Test' },
      { symbol: '00939', exDividendDate: '2025-08-19', dividendPerShare: 0.12, year: 2025, source: 'Test' },
      { symbol: '00939', exDividendDate: '2025-09-18', dividendPerShare: 0.12, year: 2025, source: 'Test' },
      { symbol: '00939', exDividendDate: '2025-10-21', dividendPerShare: 0.12, year: 2025, source: 'Test' },
      { symbol: '00939', exDividendDate: '2025-11-20', dividendPerShare: 0.12, year: 2025, source: 'Test' },
      { symbol: '00939', exDividendDate: '2025-12-18', dividendPerShare: 0.12, year: 2025, source: 'Test' }
    ],
    '00940': [
      // 元大台灣價值高息 - 2024年已發放
      { symbol: '00940', exDividendDate: '2024-11-18', dividendPerShare: 0.11, year: 2024, source: 'Test' },
      { symbol: '00940', exDividendDate: '2024-10-21', dividendPerShare: 0.11, year: 2024, source: 'Test' },
      { symbol: '00940', exDividendDate: '2024-09-16', dividendPerShare: 0.11, year: 2024, source: 'Test' },
      { symbol: '00940', exDividendDate: '2024-08-19', dividendPerShare: 0.11, year: 2024, source: 'Test' },
      // 2025年預計股息（購買日期2025/01/02之後）
      { symbol: '00940', exDividendDate: '2025-01-19', dividendPerShare: 0.11, year: 2025, source: 'Test' },
      { symbol: '00940', exDividendDate: '2025-02-16', dividendPerShare: 0.11, year: 2025, source: 'Test' },
      { symbol: '00940', exDividendDate: '2025-03-19', dividendPerShare: 0.11, year: 2025, source: 'Test' },
      { symbol: '00940', exDividendDate: '2025-04-21', dividendPerShare: 0.11, year: 2025, source: 'Test' },
      { symbol: '00940', exDividendDate: '2025-05-19', dividendPerShare: 0.11, year: 2025, source: 'Test' },
      { symbol: '00940', exDividendDate: '2025-06-16', dividendPerShare: 0.11, year: 2025, source: 'Test' },
      { symbol: '00940', exDividendDate: '2025-07-21', dividendPerShare: 0.11, year: 2025, source: 'Test' },
      { symbol: '00940', exDividendDate: '2025-08-19', dividendPerShare: 0.11, year: 2025, source: 'Test' },
      { symbol: '00940', exDividendDate: '2025-09-16', dividendPerShare: 0.11, year: 2025, source: 'Test' },
      { symbol: '00940', exDividendDate: '2025-10-21', dividendPerShare: 0.11, year: 2025, source: 'Test' },
      { symbol: '00940', exDividendDate: '2025-11-18', dividendPerShare: 0.11, year: 2025, source: 'Test' },
      { symbol: '00940', exDividendDate: '2025-12-16', dividendPerShare: 0.11, year: 2025, source: 'Test' }
    ],
    '00937B': [
      // 群益ESG投等債20+ - 2024年已發放
      { symbol: '00937B', exDividendDate: '2024-12-16', dividendPerShare: 0.072, year: 2024, source: 'Test' },
      { symbol: '00937B', exDividendDate: '2024-11-18', dividendPerShare: 0.072, year: 2024, source: 'Test' },
      // 2025年預計股息（購買日期2025/01/02之後）
      { symbol: '00937B', exDividendDate: '2025-01-18', dividendPerShare: 0.072, year: 2025, source: 'Test' },
      { symbol: '00937B', exDividendDate: '2025-02-16', dividendPerShare: 0.072, year: 2025, source: 'Test' },
      { symbol: '00937B', exDividendDate: '2025-03-18', dividendPerShare: 0.072, year: 2025, source: 'Test' },
      { symbol: '00937B', exDividendDate: '2025-04-16', dividendPerShare: 0.072, year: 2025, source: 'Test' },
      { symbol: '00937B', exDividendDate: '2025-05-18', dividendPerShare: 0.072, year: 2025, source: 'Test' },
      { symbol: '00937B', exDividendDate: '2025-06-16', dividendPerShare: 0.072, year: 2025, source: 'Test' },
      { symbol: '00937B', exDividendDate: '2025-07-18', dividendPerShare: 0.072, year: 2025, source: 'Test' },
      { symbol: '00937B', exDividendDate: '2025-08-16', dividendPerShare: 0.072, year: 2025, source: 'Test' },
      { symbol: '00937B', exDividendDate: '2025-09-18', dividendPerShare: 0.072, year: 2025, source: 'Test' },
      { symbol: '00937B', exDividendDate: '2025-10-16', dividendPerShare: 0.072, year: 2025, source: 'Test' },
      { symbol: '00937B', exDividendDate: '2025-11-18', dividendPerShare: 0.072, year: 2025, source: 'Test' },
      { symbol: '00937B', exDividendDate: '2025-12-16', dividendPerShare: 0.072, year: 2025, source: 'Test' }
    ],
    '0056': [
      // 元大高股息 - 2024年已發放
      { symbol: '0056', exDividendDate: '2024-10-21', dividendPerShare: 2.2, year: 2024, source: 'Test' },
      // 2025年預計股息（購買日期2025/01/02之後）
      { symbol: '0056', exDividendDate: '2025-10-21', dividendPerShare: 2.2, year: 2025, source: 'Test' }
    ],
    '0050': [
      // 元大台灣50 - 2024年已發放
      { symbol: '0050', exDividendDate: '2024-10-21', dividendPerShare: 1.85, year: 2024, source: 'Test' },
      { symbol: '0050', exDividendDate: '2024-04-22', dividendPerShare: 1.85, year: 2024, source: 'Test' },
      // 2025年預計股息（購買日期2025/01/02之後）
      { symbol: '0050', exDividendDate: '2025-04-22', dividendPerShare: 1.85, year: 2025, source: 'Test' },
      { symbol: '0050', exDividendDate: '2025-10-21', dividendPerShare: 1.85, year: 2025, source: 'Test' }
    ]
  };
  
  return testData[symbol] || [];
}

// API路由：獲取股票價格
app.get('/api/stock/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const upperSymbol = symbol.toUpperCase();
    
    const cacheKey = `stock_${upperSymbol}`;
    const cached = stockCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return res.json(cached.data);
    }
    
    let stockData = null;
    
    try {
      stockData = await getYahooStockPrice(upperSymbol);
    } catch (error) {
      try {
        stockData = await getTWSEStockPrice(upperSymbol);
      } catch (twseError) {
        console.log(`兩個API都失敗，嘗試使用本地資料: ${upperSymbol}`);
        
        // 如果API都失敗，但股票在對照表中，返回基本資料
        const stockName = getStockName(upperSymbol);
        if (stockName && stockName !== `股票${upperSymbol}`) {
          stockData = {
            symbol: upperSymbol,
            name: stockName,
            price: 10.0, // 預設價格
            change: 0,
            changePercent: 0,
            timestamp: new Date().toISOString(),
            source: 'Local Database',
            market: getStockMarket(upperSymbol)
          };
        }
      }
    }
    
    if (stockData) {
      stockCache.set(cacheKey, {
        data: stockData,
        timestamp: Date.now()
      });
      res.json(stockData);
    } else {
      res.status(404).json({
        error: 'Stock not found',
        message: `找不到股票代碼 ${upperSymbol} 的資訊`
      });
    }
    
  } catch (error) {
    console.error('API錯誤:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: '伺服器內部錯誤'
    });
  }
});

// API路由：搜尋股票
app.get('/api/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const upperQuery = query.toUpperCase();
    
    if (/^\d{4,6}[A-Z]?$/.test(upperQuery)) {
      try {
        const stockData = await getYahooStockPrice(upperQuery);
        if (stockData) {
          return res.json(stockData);
        }
      } catch (error) {
        try {
          const stockData = await getTWSEStockPrice(upperQuery);
          if (stockData) {
            return res.json(stockData);
          }
        } catch (twseError) {
          // 兩個API都失敗，使用本地對照表
          console.log(`API失敗，嘗試使用本地資料: ${upperQuery}`);
        }
      }
      
      // 如果API都失敗，但股票在對照表中，返回基本資料
      const stockName = getStockName(upperQuery);
      if (stockName && stockName !== `股票${upperQuery}`) {
        console.log(`使用本地對照表資料: ${upperQuery} - ${stockName}`);
        return res.json({
          symbol: upperQuery,
          name: stockName,
          price: 10.0, // 預設價格，實際使用時會更新
          change: 0,
          changePercent: 0,
          timestamp: new Date().toISOString(),
          source: 'Local Database',
          market: getStockMarket(upperQuery)
        });
      }
      
      return res.status(404).json({
        error: 'Stock not found',
        message: `找不到股票代碼 ${upperQuery} 的資訊`
      });
    }
    
    return res.status(400).json({
      error: 'Invalid search query',
      message: `請輸入有效的股票代碼`
    });
    
  } catch (error) {
    console.error('搜尋錯誤:', error);
    res.status(500).json({
      error: 'Search error',
      message: '搜尋時發生錯誤'
    });
  }
});

// API路由：獲取股息資料
app.get('/api/dividend/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const upperSymbol = symbol.toUpperCase();
    
    console.log(`獲取 ${upperSymbol} 股息資料...`);
    
    // 直接使用測試資料，因為證交所API有限制
    const testDividends = getTestDividendData(upperSymbol);
    
    res.json({
      symbol: upperSymbol,
      dividends: testDividends,
      count: testDividends.length,
      source: 'Test'
    });
    
  } catch (error) {
    console.error('股息API錯誤:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: '獲取股息資料時發生錯誤'
    });
  }
});

// 健康檢查
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    cache_size: stockCache.size
  });
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`🚀 股票代理伺服器啟動於 http://localhost:${PORT}`);
  console.log(`📊 支援的API端點:`);
  console.log(`   GET /api/stock/:symbol - 獲取股票價格`);
  console.log(`   GET /api/search/:query - 搜尋股票`);
  console.log(`   GET /api/dividend/:symbol - 獲取股息資料`);
  console.log(`   GET /health - 健康檢查`);
});