const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// 啟用CORS
app.use(cors());
app.use(express.json());

// 股票資料快取（避免頻繁請求API）
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
}, 30000); // 每30秒清理一次

// 台灣股票名稱對照表（基本資料）
const TAIWAN_STOCKS = {
  // 主要上市股票
  '2330': '台積電', '2317': '鴻海', '2454': '聯發科', '2412': '中華電',
  '2303': '聯電', '3008': '大立光', '2308': '台達電', '2379': '瑞昱',
  '2382': '廣達', '2357': '華碩', '2409': '友達', '2474': '可成',
  '2327': '國巨', '2301': '光寶科', '2395': '研華', '2408': '南亞科',
  '2603': '長榮', '2609': '陽明', '2615': '萬海', '2618': '長榮航',
  
  // 金融股
  '2881': '富邦金', '2882': '國泰金', '2886': '兆豐金', '2884': '玉山金',
  '2885': '元大金', '2880': '華南金', '2883': '開發金', '2887': '台新金',
  '2891': '中信金', '2892': '第一金', '2890': '永豐金', '5880': '合庫金',
  
  // 傳產股
  '1301': '台塑', '1303': '南亞', '1326': '台化', '2002': '中鋼',
  '1216': '統一', '2912': '統一超', '2105': '正新', '1101': '台泥',
  '1102': '亞泥', '2207': '和泰車', '2227': '裕日車', '2201': '裕隆',
  '2542': '興富發', '2520': '冠德', '2515': '中工', '2501': '國建',
  
  // 電子股
  '2313': '華通', '2324': '仁寶', '2356': '英業達', '2377': '微星',
  '2347': '聯強', '2353': '宏碁', '2376': '技嘉', '2388': '威盛',
  '3037': '欣興', '3045': '台灣大', '3711': '日月光投控', '6505': '台塑化',
  
  // 生技醫療
  '4000': '南紡', '4904': '遠傳', '4938': '和碩', '4958': '臻鼎-KY',
  '4585': '達明', '6415': '矽力-KY', '6446': '藥華藥', '6488': '環球晶',
  
  // 上櫃股票
  '3443': '創意', '3661': '世芯-KY', '5269': '祥碩', '5274': '信驊',
  '6188': '廣明', '6239': '力成', '6285': '啟碁', '8046': '南電',
  '3034': '聯詠', '3481': '群創', '3533': '嘉澤', '3702': '大聯大',
  
  // ETF
  '0050': '元大台灣50', '0051': '元大中型100', '0052': '富邦科技',
  '0056': '元大高股息', '00646': '元大S&P500', '00662': '富邦NASDAQ',
  '00679B': '元大美債20年', '00881': '國泰台灣5G+', '00692': '富邦公司治理',
  '00981A': '統一台灣成長', '00850': '元大台灣ESG永續', '00878': '國泰永續高股息',
  '00919': '群益台灣精選高息'
};

// 從Yahoo Finance獲取股價
async function getYahooStockPrice(symbol) {
  try {
    const yahooSymbol = `${symbol}.TW`;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`;
    
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (response.data?.chart?.result?.[0]?.meta) {
      const meta = response.data.chart.result[0].meta;
      const price = meta.regularMarketPrice || meta.previousClose || 0;
      const previousClose = meta.previousClose || price;
      const change = price - previousClose;
      
      // 優先使用本地對照表的中文名稱，如果沒有則使用Yahoo提供的名稱
      let stockName = TAIWAN_STOCKS[symbol];
      if (!stockName) {
        stockName = meta.longName || meta.shortName || `股票${symbol}`;
      }
      
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
    // 如果是404錯誤，嘗試其他方法
    if (error.response?.status === 404) {
      console.log(`Yahoo Finance 找不到 ${symbol}，嘗試使用本地資料...`);
      
      // 如果本地對照表有這個股票，返回基本資訊
      if (TAIWAN_STOCKS[symbol]) {
        return {
          symbol,
          name: TAIWAN_STOCKS[symbol],
          price: 0,
          change: 0,
          changePercent: 0,
          timestamp: new Date().toISOString(),
          source: 'Local Database',
          market: getStockMarket(symbol)
        };
      }
    }
    
    console.error(`Yahoo API錯誤 ${symbol}:`, error.message);
    throw error;
  }
}

// 從台灣證交所獲取股價（備用）
async function getTWSEStockPrice(symbol) {
  try {
    // 使用證交所的公開API
    const url = `https://www.twse.com.tw/exchangeReport/MI_INDEX?response=json&type=ALLBUT0999&_=${Date.now()}`;
    
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    // 解析證交所回應（這個API返回所有股票資料）
    if (response.data?.data9) {
      const stockData = response.data.data9.find(item => item[0] === symbol);
      if (stockData) {
        const price = parseFloat(stockData[2]) || 0;
        const change = parseFloat(stockData[3]) || 0;
        
        return {
          symbol,
          name: TAIWAN_STOCKS[symbol] || stockData[1] || `股票${symbol}`,
          price,
          change,
          changePercent: price > 0 ? Math.round((change / (price - change)) * 100 * 100) / 100 : 0,
          timestamp: new Date().toISOString(),
          source: 'TWSE',
          market: getStockMarket(symbol)
        };
      }
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

// API路由：獲取單一股票價格
app.get('/api/stock/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const upperSymbol = symbol.toUpperCase();
    
    // 檢查快取
    const cacheKey = `stock_${upperSymbol}`;
    const cached = stockCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`📦 從快取返回 ${upperSymbol} 資料`);
      return res.json(cached.data);
    }
    
    console.log(`🔍 正在獲取 ${upperSymbol} 股價資料...`);
    
    let stockData = null;
    
    // 優先嘗試Yahoo Finance
    try {
      stockData = await getYahooStockPrice(upperSymbol);
      console.log(`✅ Yahoo Finance 成功獲取 ${upperSymbol} 資料`);
    } catch (error) {
      console.log(`❌ Yahoo Finance 失敗，嘗試證交所API...`);
      
      // 備用：嘗試證交所API
      try {
        stockData = await getTWSEStockPrice(upperSymbol);
        console.log(`✅ 證交所 成功獲取 ${upperSymbol} 資料`);
      } catch (twseError) {
        console.log(`❌ 證交所API也失敗`);
      }
    }
    
    if (stockData) {
      // 儲存到快取
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
    
    console.log(`🔍 搜尋股票: ${upperQuery}`);
    
    // 如果是股票代碼，直接查詢
    if (/^\d{4,6}[A-Z]?$/.test(upperQuery)) {
      try {
        const stockData = await getYahooStockPrice(upperQuery);
        if (stockData) {
          console.log(`✅ 找到股票 ${upperQuery}: ${stockData.name}`);
          return res.json(stockData);
        }
      } catch (error) {
        console.log(`❌ Yahoo Finance 查詢失敗: ${error.message}`);
        
        // 如果Yahoo Finance失敗，但本地對照表有這個股票，返回基本資訊
        if (TAIWAN_STOCKS[upperQuery]) {
          console.log(`📋 使用本地資料: ${upperQuery} - ${TAIWAN_STOCKS[upperQuery]}`);
          return res.json({
            symbol: upperQuery,
            name: TAIWAN_STOCKS[upperQuery],
            price: 0,
            change: 0,
            changePercent: 0,
            timestamp: new Date().toISOString(),
            source: 'Local Database',
            market: getStockMarket(upperQuery)
          });
        }
      }
      
      // 如果都找不到，返回404
      console.log(`❌ 找不到股票: ${upperQuery}`);
      return res.status(404).json({
        error: 'Stock not found',
        message: `找不到股票代碼 ${upperQuery} 的資訊，請確認代碼是否正確`
      });
    }
    
    // 如果是名稱搜尋，從本地對照表搜尋
    const matchedSymbols = Object.entries(TAIWAN_STOCKS)
      .filter(([symbol, name]) => 
        name.includes(query) || symbol.includes(query)
      )
      .slice(0, 10); // 限制結果數量
    
    if (matchedSymbols.length === 0) {
      return res.status(404).json({
        error: 'No matches found',
        message: `找不到包含 "${query}" 的股票`
      });
    }
    
    const results = [];
    for (const [symbol, name] of matchedSymbols) {
      try {
        const stockData = await getYahooStockPrice(symbol);
        if (stockData) {
          results.push(stockData);
        }
      } catch (error) {
        // 如果Yahoo Finance失敗，使用本地資料
        results.push({
          symbol,
          name,
          price: 0,
          change: 0,
          changePercent: 0,
          timestamp: new Date().toISOString(),
          source: 'Local Database',
          market: getStockMarket(symbol)
        });
      }
    }
    
    if (results.length > 0) {
      res.json(results.length === 1 ? results[0] : results);
    } else {
      res.status(404).json({
        error: 'No data available',
        message: `無法獲取 "${query}" 的股票資料`
      });
    }
    
  } catch (error) {
    console.error('搜尋錯誤:', error);
    res.status(500).json({
      error: 'Search error',
      message: '搜尋時發生錯誤'
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
  console.log(`   GET /health - 健康檢查`);
});