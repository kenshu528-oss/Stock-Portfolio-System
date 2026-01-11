const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// 啟用CORS
app.use(cors());
app.use(express.json());

// 股票名稱對照表（常見台股）
const STOCK_NAME_MAP = {
  // 權值股
  '台積電': { symbol: '2330', name: '台灣積體電路製造股份有限公司', market: '上市' },
  '鴻海': { symbol: '2317', name: '鴻海精密工業股份有限公司', market: '上市' },
  '聯發科': { symbol: '2454', name: '聯發科技股份有限公司', market: '上市' },
  '台塑': { symbol: '1301', name: '台灣塑膠工業股份有限公司', market: '上市' },
  '中華電': { symbol: '2412', name: '中華電信股份有限公司', market: '上市' },
  '富邦金': { symbol: '2881', name: '富邦金融控股股份有限公司', market: '上市' },
  '國泰金': { symbol: '2882', name: '國泰金融控股股份有限公司', market: '上市' },
  '台達電': { symbol: '2308', name: '台達電子工業股份有限公司', market: '上市' },
  '廣達': { symbol: '2382', name: '廣達電腦股份有限公司', market: '上市' },
  '和碩': { symbol: '4938', name: '和碩聯合科技股份有限公司', market: '上市' },
  
  // ETF
  '元大台灣50': { symbol: '0050', name: '元大台灣卓越50基金', market: '上市' },
  '元大高股息': { symbol: '0056', name: '元大台灣高股息基金', market: '上市' },
  '富邦台50': { symbol: '006208', name: '富邦台灣采吉50基金', market: '上市' },
  '國泰永續高股息': { symbol: '00878', name: '國泰永續高股息ETF基金', market: '上市' },
  '元大台灣ESG永續': { symbol: '00850', name: '元大台灣ESG永續ETF基金', market: '上市' },
  
  // 債券ETF
  '元大美債20年': { symbol: '00679B', name: '元大美國20年期以上公債ETF基金', market: '上市' },
  '國泰20年美債': { symbol: '00687B', name: '國泰20年期(以上)美國公債ETF基金', market: '上市' },
  
  // 科技股
  '聯電': { symbol: '2303', name: '聯華電子股份有限公司', market: '上市' },
  '日月光投控': { symbol: '3711', name: '日月光投資控股股份有限公司', market: '上市' },
  '宏達電': { symbol: '2498', name: '宏達國際電子股份有限公司', market: '上市' },
  '華碩': { symbol: '2357', name: '華碩電腦股份有限公司', market: '上市' },
  '技嘉': { symbol: '2376', name: '技嘉科技股份有限公司', market: '上市' },
  
  // 金融股
  '玉山金': { symbol: '2884', name: '玉山金融控股股份有限公司', market: '上市' },
  '第一金': { symbol: '2892', name: '第一金融控股股份有限公司', market: '上市' },
  '兆豐金': { symbol: '2886', name: '兆豐金融控股股份有限公司', market: '上市' },
  '中信金': { symbol: '2891', name: '中國信託金融控股股份有限公司', market: '上市' },
  
  // 傳產股
  '台泥': { symbol: '1101', name: '台灣水泥股份有限公司', market: '上市' },
  '亞泥': { symbol: '1102', name: '亞洲水泥股份有限公司', market: '上市' },
  '遠東新': { symbol: '1402', name: '遠東新世紀股份有限公司', market: '上市' },
  '統一': { symbol: '1216', name: '統一企業股份有限公司', market: '上市' },
  '中鋼': { symbol: '2002', name: '中國鋼鐵股份有限公司', market: '上市' }
};

// 根據股票名稱搜尋股票
function searchStockByName(query) {
  const searchTerm = query.trim();
  
  // 精確匹配
  if (STOCK_NAME_MAP[searchTerm]) {
    return STOCK_NAME_MAP[searchTerm];
  }
  
  // 模糊匹配（包含搜尋）
  for (const [name, info] of Object.entries(STOCK_NAME_MAP)) {
    if (name.includes(searchTerm) || searchTerm.includes(name)) {
      return info;
    }
  }
  
  return null;
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
      
      // 只使用API返回的股票名稱，如果沒有則返回null
      const stockName = meta.longName || meta.shortName;
      
      // 如果API沒有返回股票名稱，視為無效資料
      if (!stockName) {
        console.log(`Yahoo Finance API 未返回股票名稱: ${symbol}`);
        return null;
      }
      
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
    // 對於 ETF，先嘗試上市 (tse_)，失敗後再嘗試上櫃 (otc_)
    if (/^00\d{2,3}[A-Z]?$/.test(symbol)) {
      // 先嘗試上市 ETF
      try {
        const tseUrl = `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=tse_${symbol}.tw&json=1&delay=0`;
        const tseResponse = await axios.get(tseUrl, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        if (tseResponse.data?.msgArray && tseResponse.data.msgArray.length > 0) {
          const stockData = tseResponse.data.msgArray[0];
          const price = parseFloat(stockData.z) || parseFloat(stockData.y) || 0;
          const previousClose = parseFloat(stockData.y) || price;
          const change = price - previousClose;
          
          const stockName = stockData.n;
          
          if (stockName) {
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
        }
      } catch (tseError) {
        console.log(`上市 ETF API 失敗，嘗試上櫃: ${symbol}`, tseError.message);
      }

      // 如果上市失敗，嘗試上櫃 ETF
      try {
        const otcUrl = `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=otc_${symbol}.tw&json=1&delay=0`;
        const otcResponse = await axios.get(otcUrl, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        if (otcResponse.data?.msgArray && otcResponse.data.msgArray.length > 0) {
          const stockData = otcResponse.data.msgArray[0];
          const price = parseFloat(stockData.z) || parseFloat(stockData.y) || 0;
          const previousClose = parseFloat(stockData.y) || price;
          const change = price - previousClose;
          
          const stockName = stockData.n;
          
          if (stockName) {
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
        }
      } catch (otcError) {
        console.log(`上櫃 ETF API 也失敗: ${symbol}`, otcError.message);
      }

      return null;
    } else {
      // 一般股票使用上市 API
      const url = `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=tse_${symbol}.tw&json=1&delay=0`;
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
        
        const stockName = stockData.n;
        
        if (!stockName) {
          console.log(`證交所API 未返回股票名稱: ${symbol}`);
          return null;
        }
        
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
    
    // 對於台股，優先使用台灣證交所 API（返回中文名稱）
    try {
      stockData = await getTWSEStockPrice(upperSymbol);
    } catch (twseError) {
      console.log(`證交所 API 失敗: ${upperSymbol}`, twseError.message);
    }
    
    // 如果證交所 API 失敗，再嘗試 Yahoo Finance API
    if (!stockData) {
      try {
        stockData = await getYahooStockPrice(upperSymbol);
      } catch (error) {
        console.log(`Yahoo Finance API 失敗: ${upperSymbol}`, error.message);
      }
    }
    
    if (stockData) {
      stockCache.set(cacheKey, {
        data: stockData,
        timestamp: Date.now()
      });
      res.json(stockData);
    } else {
      // 兩個API都失敗，返回404錯誤，不提供虛假資料
      console.log(`所有API都失敗，找不到股票: ${upperSymbol}`);
      res.status(404).json({
        error: 'Stock not found',
        message: `找不到股票代碼 ${upperSymbol} 的資訊`,
        suggestions: [
          '請確認股票代碼是否正確',
          '檢查是否為有效的台股代碼',
          '稍後再試或聯繫客服'
        ]
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
    
    // 檢查是否為股票代碼格式
    if (/^\d{4,6}[A-Z]?$/.test(upperQuery)) {
      // 股票代碼搜尋邏輯
      try {
        const stockData = await getTWSEStockPrice(upperQuery);
        if (stockData) {
          return res.json(stockData);
        }
      } catch (twseError) {
        console.log(`證交所 API 失敗: ${upperQuery}`, twseError.message);
      }
      
      try {
        const stockData = await getYahooStockPrice(upperQuery);
        if (stockData) {
          return res.json(stockData);
        }
      } catch (error) {
        console.log(`Yahoo Finance API 失敗: ${upperQuery}`, error.message);
      }
      
      console.log(`所有API都失敗，找不到股票: ${upperQuery}`);
      return res.status(404).json({
        error: 'Stock not found',
        message: `找不到股票代碼 ${upperQuery} 的資訊`,
        suggestions: [
          '請確認股票代碼是否正確',
          '檢查是否為有效的台股代碼',
          '稍後再試或聯繫客服'
        ]
      });
    } else {
      // 股票名稱搜尋邏輯
      console.log(`搜尋股票名稱: ${query}`);
      const stockByName = searchStockByName(query);
      if (stockByName) {
        // 找到股票後，獲取即時價格
        try {
          const stockData = await getTWSEStockPrice(stockByName.symbol);
          if (stockData) {
            return res.json(stockData);
          }
        } catch (error) {
          // 如果無法獲取即時價格，返回基本資訊
          return res.json({
            symbol: stockByName.symbol,
            name: stockByName.name,
            market: stockByName.market,
            price: 0,
            change: 0,
            changePercent: 0,
            source: 'Name Search'
          });
        }
      }
      
      return res.status(404).json({
        error: 'Stock not found',
        message: `找不到股票名稱 "${query}" 的資訊`,
        suggestions: [
          '請確認股票名稱是否正確',
          '嘗試使用股票代碼搜尋',
          '檢查是否為完整的公司名稱'
        ]
      });
    }
    
    return res.status(400).json({
      error: 'Invalid search query',
      message: '請輸入有效的股票代碼格式（例：2330、0050、00878）'
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