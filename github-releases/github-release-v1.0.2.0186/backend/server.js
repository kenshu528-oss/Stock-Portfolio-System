const express = require('express');
const cors = require('cors');
const axios = require('axios');
const GoodInfoService = require('./services/goodInfoService');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// 啟用CORS
app.use(cors());
app.use(express.json());

// 股票資料快取
const stockCache = new Map();
const CACHE_DURATION = 5000; // 🔬 實驗：改為 5 秒快取，測試即時性

// 清理過期快取
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of stockCache.entries()) {
    if (now - data.timestamp > CACHE_DURATION) {
      stockCache.delete(key);
    }
  }
}, 30000);

// 從FinMind API獲取股價（台股專用，資料最準確）
async function getFinMindStockPrice(symbol) {
  try {
    console.log(`正在從FinMind獲取 ${symbol} 股價資料...`);
    
    // 步驟1: 獲取股票基本資訊（中文名稱）
    const infoUrl = `https://api.finmindtrade.com/api/v4/data`;
    const infoParams = new URLSearchParams({
      dataset: 'TaiwanStockInfo',
      data_id: symbol,  // 使用 data_id（免費無 token 可用）
      token: '' // 免費使用
    });
    
    let stockName = symbol; // 預設使用代碼
    
    try {
      const infoResponse = await axios.get(`${infoUrl}?${infoParams}`, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json'
        }
      });
      
      if (infoResponse.data?.status === 200 && infoResponse.data?.data?.length > 0) {
        const stockInfo = infoResponse.data.data[0];
        stockName = stockInfo.stock_name || symbol;
        console.log(`✅ FinMind獲取 ${symbol} 中文名稱: ${stockName}`);
      }
    } catch (infoError) {
      console.log(`FinMind股票資訊API失敗 ${symbol}:`, infoError.message);
    }
    
    // 步驟2: 獲取股價資料（使用最近7天的資料，確保能獲取到最新交易日）
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    
    const priceUrl = `https://api.finmindtrade.com/api/v4/data`;
    const priceParams = new URLSearchParams({
      dataset: 'TaiwanStockPrice',
      data_id: symbol,  // 使用 data_id（免費無 token 可用）
      start_date: sevenDaysAgo.toISOString().split('T')[0], // 最近7天
      token: '' // 免費使用
    });
    
    const response = await axios.get(`${priceUrl}?${priceParams}`, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });
    
    if (response.status === 200 && response.data) {
      const data = response.data;
      console.log(`FinMind股價API回應 ${symbol}:`, data.status, data.data?.length || 0, '筆資料');
      
      if (data.status === 200 && data.data && data.data.length > 0) {
        // 取最新的股價資料
        const latestData = data.data[data.data.length - 1];
        const price = parseFloat(latestData.close) || parseFloat(latestData.open) || 0;
        const previousClose = parseFloat(latestData.open) || price;
        const change = price - previousClose;
        
        if (price > 0) {
          console.log(`✅ FinMind ${symbol} 股價: ${price}, 名稱: ${stockName}`);
          return {
            symbol,
            name: stockName, // 使用中文名稱
            price: Math.round(price * 100) / 100,
            change: Math.round(change * 100) / 100,
            changePercent: previousClose > 0 ? Math.round((change / previousClose) * 100 * 100) / 100 : 0,
            timestamp: new Date().toISOString(),
            source: 'FinMind',
            market: getStockMarket(symbol)
          };
        }
      }
    }
    
    console.log(`ℹ️ FinMind: ${symbol} 無股價資料或資料無效`);
    
    // 即使股價失敗，也返回中文名稱供其他API使用
    if (stockName && stockName !== symbol) {
      return {
        symbol,
        name: stockName,
        price: 0, // 標記股價無效
        change: 0,
        changePercent: 0,
        timestamp: new Date().toISOString(),
        source: 'FinMind (名稱)',
        market: getStockMarket(symbol)
      };
    }
    
    return null;
  } catch (error) {
    console.error(`FinMind股價API錯誤 ${symbol}:`, error.message);
    return null;
  }
}

// 從Yahoo Finance獲取股價
async function getYahooStockPrice(symbol) {
  try {
    // 🔬 改進：參考 Python 範例，根據代碼末尾判斷後綴
    // 債券 ETF（末尾為 B）：優先使用 .TWO（櫃買中心），備用 .TW
    // 一般股票：優先使用 .TW（證交所），備用 .TWO
    const isBondETF = /^00\d{2,3}B$/i.test(symbol);
    const suffixes = isBondETF ? ['.TWO', '.TW'] : ['.TW', '.TWO'];
    
    console.log(`🔍 Yahoo Finance: ${symbol} ${isBondETF ? '(債券 ETF)' : '(一般股票)'} 嘗試後綴順序: ${suffixes.join(', ')}`);
    
    // 嘗試不同的後綴
    for (const suffix of suffixes) {
      const yahooSymbol = `${symbol}${suffix}`;
      console.log(`   → 嘗試 ${yahooSymbol}...`);
      
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`;
        
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
          
          const stockName = meta.longName || meta.shortName || symbol;
          
          if (price > 0) {
            console.log(`✅ Yahoo Finance 成功: ${yahooSymbol} = ${price} (${stockName})`);
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
        }
      } catch (err) {
        console.log(`   ✗ ${yahooSymbol} 失敗: ${err.message}`);
        // 繼續嘗試下一個後綴
      }
    }
    
    console.log(`❌ Yahoo Finance: ${symbol} 所有後綴都失敗`);
    return null;
  } catch (error) {
    console.error(`Yahoo API錯誤 ${symbol}:`, error.message);
    throw error;
  }
}

// 從台灣證交所獲取股價
async function getTWSEStockPrice(symbol) {
  try {
    // 對於 ETF，需要嘗試不同的交易所
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
      // 一般股票：先嘗試上市，再嘗試上櫃
      // 先嘗試上市 API
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
          
          // 處理股票名稱
          let stockName = stockData.n;
          
          // 只有當有真實的股票名稱時才返回資料
          // 如果沒有名稱，表示這不是上市股票，應該嘗試其他市場
          if (stockName && !stockName.includes('?') && stockName.trim() !== '') {
            // 有效的上市股票資料
            const finalPrice = price > 0 ? price : (previousClose > 0 ? previousClose : 0);
            const status = price <= 0 ? '暫停交易' : '';
            
            console.log(`✅ 上市API獲取 ${symbol}: ${stockName}, 價格: ${finalPrice}, 狀態: ${status}`);
            return {
              symbol,
              name: stockName + (status ? ` (${status})` : ''),
              price: Math.round(finalPrice * 100) / 100,
              change: Math.round(change * 100) / 100,
              changePercent: previousClose > 0 ? Math.round((change / previousClose) * 100 * 100) / 100 : 0,
              timestamp: new Date().toISOString(),
              source: 'TWSE',
              market: getStockMarket(symbol),
              status: status || 'normal'
            };
          }
        }
      } catch (tseError) {
        console.log(`上市 API 失敗，嘗試上櫃: ${symbol}`, tseError.message);
      }

      // 如果上市失敗，嘗試上櫃 API
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
          // 上櫃股票的價格欄位可能不同，嘗試多個欄位
          const price = parseFloat(stockData.z) || parseFloat(stockData.pz) || parseFloat(stockData.y) || 0;
          const previousClose = parseFloat(stockData.y) || price;
          const change = price - previousClose;
          
          // 股票名稱可能有編碼問題，先嘗試原始名稱，如果是問號則使用代碼
          let stockName = stockData.n;
          if (!stockName || stockName.includes('?') || stockName.trim() === '') {
            stockName = `${symbol} (上櫃)`;
          }
          
          if (stockName && price > 0) {
            console.log(`✅ 上櫃API成功獲取 ${symbol}: ${stockName}, 價格: ${price}`);
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
        console.log(`上櫃 API 失敗，嘗試興櫃: ${symbol}`, otcError.message);
      }

      // 如果上櫃也失敗，嘗試興櫃 API (使用上櫃的端點，但可能有不同的資料格式)
      try {
        const emergingUrl = `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=otc_${symbol}.tw&json=1&delay=0`;
        const emergingResponse = await axios.get(emergingUrl, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        if (emergingResponse.data?.msgArray && emergingResponse.data.msgArray.length > 0) {
          const stockData = emergingResponse.data.msgArray[0];
          // 興櫃股票可能有不同的價格欄位
          const price = parseFloat(stockData.z) || parseFloat(stockData.pz) || parseFloat(stockData.y) || 0;
          const previousClose = parseFloat(stockData.y) || price;
          const change = price - previousClose;
          
          let stockName = stockData.n;
          if (!stockName || stockName.includes('?') || stockName.trim() === '') {
            stockName = `${symbol} (興櫃)`;
          }
          
          if (stockName && price > 0) {
            console.log(`✅ 興櫃API成功獲取 ${symbol}: ${stockName}, 價格: ${price}`);
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
      } catch (emergingError) {
        console.log(`興櫃 API 也失敗: ${symbol}`, emergingError.message);
      }
    }
    
    return null;
  } catch (error) {
    console.error(`TWSE API錯誤 ${symbol}:`, error.message);
    throw error;
  }
}

// 判斷股票市場 - 完整支援所有證交所產品
function getStockMarket(symbol) {
  // ETF判斷 (00開頭)
  if (/^00\d{2,3}[A-Z]?$/.test(symbol)) return 'ETF';
  
  const code = parseInt(symbol.substring(0, 4));
  
  // 上市股票 (1000-2999)
  if (code >= 1000 && code <= 2999) return '上市';
  
  // 上櫃股票 (3000-8999)
  if (code >= 3000 && code <= 8999) return '上櫃';
  
  // 興櫃股票 (通常7000-7999範圍，但也可能在其他範圍)
  if (code >= 7000 && code <= 7999) return '興櫃';
  
  // 特殊代碼處理
  if (code >= 9000 && code <= 9999) return '其他';
  
  // 債券 (通常以特定格式命名)
  if (/^\d{5,6}[A-Z]?$/.test(symbol)) return '債券';
  
  // 權證 (通常以特定格式命名)
  if (/^\d{5}[A-Z]$/.test(symbol)) return '權證';
  
  // 預設分類
  return '台灣';
}

// API路由：獲取股票價格 - 優先使用FinMind API
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
    let chineseName = null; // 儲存中文名稱
    
    // 🔬 實驗：優先使用 Yahoo Finance（測試即時性）
    // 方法1: 優先使用 Yahoo Finance API（即時性最高）
    try {
      console.log(`${upperSymbol}: 🔬 實驗：優先嘗試 Yahoo Finance API（測試即時性）`);
      stockData = await getYahooStockPrice(upperSymbol);
      if (stockData && stockData.price > 0) {
        console.log(`✅ Yahoo Finance 成功獲取 ${upperSymbol} 股價資料（即時）`);
        
        // 嘗試從 FinMind 獲取中文名稱（不影響股價）
        try {
          const finmindData = await getFinMindStockPrice(upperSymbol);
          if (finmindData && finmindData.name && finmindData.name !== upperSymbol) {
            stockData.name = finmindData.name;
            stockData.source = 'Yahoo+FinMind'; // 標記混合來源
            console.log(`📝 使用 FinMind 中文名稱: ${finmindData.name}`);
          }
        } catch (e) {
          console.log(`FinMind 名稱獲取失敗（不影響股價）`);
        }
        
        stockCache.set(cacheKey, {
          data: stockData,
          timestamp: Date.now()
        });
        return res.json(stockData); // Yahoo Finance 成功，直接返回
      }
    } catch (yahooError) {
      console.log(`Yahoo Finance API 失敗: ${upperSymbol}`, yahooError.message);
    }
    
    // 方法2: 如果 Yahoo Finance 失敗，嘗試 FinMind API（台股專用，中文名稱）
    if (!stockData || stockData.price <= 0) {
      try {
        console.log(`${upperSymbol}: Yahoo Finance 失敗，嘗試 FinMind API（中文名稱）`);
        stockData = await getFinMindStockPrice(upperSymbol);
        if (stockData && stockData.price > 0) {
          console.log(`✅ FinMind 成功獲取 ${upperSymbol} 中文名稱股價資料`);
          stockCache.set(cacheKey, {
            data: stockData,
            timestamp: Date.now()
          });
          return res.json(stockData); // FinMind 成功，返回結果
        } else if (stockData && stockData.name && stockData.name !== upperSymbol) {
          // FinMind 獲取到中文名稱但股價失敗，保存中文名稱
          chineseName = stockData.name;
          console.log(`📝 FinMind 獲取到中文名稱: ${chineseName}，但股價失敗，嘗試其他API`);
        }
      } catch (finmindError) {
        console.log(`FinMind API 失敗: ${upperSymbol}`, finmindError.message);
      }
    }
    
    // 方法3: 最後嘗試台灣證交所 API（中文名稱，作為最後備用）
    if (!stockData || stockData.price <= 0) {
      try {
        console.log(`${upperSymbol}: 前兩個 API 都失敗，嘗試證交所 API（中文名稱）`);
        stockData = await getTWSEStockPrice(upperSymbol);
        if (stockData && stockData.price > 0) {
          // 如果有 FinMind 的中文名稱，優先使用
          if (chineseName) {
            stockData.name = chineseName;
            stockData.source = 'FinMind+TWSE'; // 標記混合來源
            console.log(`✅ 證交所獲取股價，使用 FinMind 中文名稱: ${chineseName}`);
          } else {
            console.log(`✅ 證交所成功獲取 ${upperSymbol} 中文名稱股價資料`);
          }
          stockCache.set(cacheKey, {
            data: stockData,
            timestamp: Date.now()
          });
          return res.json(stockData); // 證交所成功，返回結果
        }
      } catch (twseError) {
        console.log(`證交所 API 失敗: ${upperSymbol}`, twseError.message);
      }
    }
    
    if (stockData) {
      stockCache.set(cacheKey, {
        data: stockData,
        timestamp: Date.now()
      });
      res.json(stockData);
    } else {
      // 遵循API資料完整性規則：不提供虛假資料
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

// FinMind API 獲取股息資料
async function getFinMindDividendData(symbol) {
  try {
    console.log(`正在從FinMind獲取 ${symbol} 股息資料...`);
    
    // 使用FinMind API獲取股息資料 (TaiwanStockDividend dataset - 包含詳細的現金和股票股利)
    // 注意：使用 data_id 參數（免費無 token 可用）
    const finmindUrl = `https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockDividend&data_id=${symbol}&start_date=2020-01-01&end_date=2025-12-31&token=`;
    
    console.log(`🔍 正在獲取 ${symbol} 的股息資料...`);
    const finmindResponse = await axios.get(finmindUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });
    
    if (!finmindResponse.data || !finmindResponse.data.data || finmindResponse.data.data.length === 0) {
      console.log(`❌ FinMind API 沒有找到 ${symbol} 的股息資料`);
      return null;
    }

    const finmindData = finmindResponse.data.data;
    console.log(`📊 FinMind API 返回 ${finmindData.length} 筆股息記錄`);
    
    // 輸出第一筆原始資料來檢查欄位結構
    if (finmindData.length > 0) {
      console.log(`🔍 FinMind 原始資料範例 (第一筆):`, JSON.stringify(finmindData[0], null, 2));
    }

    // 處理FinMind資料
    const dividends = finmindData.map(item => {
      console.log(`\n🔍 處理股息記錄 (原始資料):`, item);

      // 使用除息交易日期（如果有的話，否則使用公告日期）
      const exDate = item.CashExDividendTradingDate || item.StockExDividendTradingDate || item.date;
      
      // FinMind TaiwanStockDividend API 欄位說明：
      // - CashEarningsDistribution: 現金股利（盈餘分配）
      // - CashStatutorySurplus: 現金股利（法定盈餘）
      // - StockEarningsDistribution: 股票股利（盈餘分配）
      // - StockStatutorySurplus: 股票股利（法定盈餘）
      
      const cashFromEarnings = parseFloat(item.CashEarningsDistribution) || 0;
      const cashFromSurplus = parseFloat(item.CashStatutorySurplus) || 0;
      const stockFromEarnings = parseFloat(item.StockEarningsDistribution) || 0;
      const stockFromSurplus = parseFloat(item.StockStatutorySurplus) || 0;
      
      // 計算總現金股利和總股票股利
      const cashDividend = cashFromEarnings + cashFromSurplus;
      const stockDividendAmount = stockFromEarnings + stockFromSurplus;
      
      // 股票股利轉換為配股比例（每1000股配X股）
      // 股票股利單位是「元」，假設面額10元，則配股數 = 股票股利 / 10
      // 配股比例 = (配股數 / 1) * 1000 = 股票股利 / 10 * 1000
      const stockDividendRatio = stockDividendAmount > 0 ? Math.round((stockDividendAmount / 10) * 1000) : 0;
      
      // 判斷類型
      let type = 'cash';
      if (cashDividend > 0 && stockDividendAmount > 0) {
        type = 'both';
      } else if (stockDividendAmount > 0) {
        type = 'stock';
      }
      
      const totalDividend = cashDividend + stockDividendAmount;

      console.log(`📈 計算結果:`, {
        exDate,
        cashFromEarnings: cashFromEarnings.toFixed(4),
        cashFromSurplus: cashFromSurplus.toFixed(4),
        stockFromEarnings: stockFromEarnings.toFixed(4),
        stockFromSurplus: stockFromSurplus.toFixed(4),
        cashDividend: cashDividend.toFixed(4),
        stockDividendAmount: stockDividendAmount.toFixed(4),
        stockDividendRatio,
        totalDividend: totalDividend.toFixed(4),
        type
      });

      return {
        exDate,
        amount: parseFloat(cashDividend.toFixed(4)),
        cashDividendPerShare: parseFloat(cashDividend.toFixed(4)),
        stockDividendRatio,
        stockDividend: parseFloat(stockDividendAmount.toFixed(4)),
        totalDividend: parseFloat(totalDividend.toFixed(4)),
        type,
        year: parseInt(item.year.replace('年', '')) + 1911, // 民國年轉西元年
        quarter: Math.ceil((new Date(exDate).getMonth() + 1) / 3),
        // 保留原始資料供參考
        cashFromEarnings: parseFloat(cashFromEarnings.toFixed(4)),
        cashFromSurplus: parseFloat(cashFromSurplus.toFixed(4)),
        stockFromEarnings: parseFloat(stockFromEarnings.toFixed(4)),
        stockFromSurplus: parseFloat(stockFromSurplus.toFixed(4))
      };
    })
    .filter(item => item.amount > 0 || item.stockDividend > 0 || item.stockDividendRatio > 0) // 過濾有效記錄
    .sort((a, b) => new Date(b.exDate) - new Date(a.exDate)); // 按日期排序
    
    if (dividends.length > 0) {
      console.log(`✅ FinMind成功獲取 ${symbol} 的 ${dividends.length} 筆股息記錄`);
      return {
        symbol,
        dividends: dividends
      };
    }
    
    console.log(`ℹ️ FinMind: ${symbol} 無股息資料`);
    return null;
  } catch (error) {
    console.error(`FinMind API錯誤 ${symbol}:`, error.message);
    return null;
  }
}
async function getGoodInfoDividendData(symbol) {
  try {
    console.log(`正在從GoodInfo獲取 ${symbol} 股息資料...`);
    
    // 對於ETF，可能需要不同的URL格式
    let url;
    if (symbol.match(/^00\d{2,3}[A-Z]?$/)) {
      // ETF 使用不同的URL格式
      url = `https://goodinfo.tw/tw/StockDividendSchedule.asp?STOCK_ID=${symbol}&YEAR_ID=9999`;
    } else {
      // 一般股票
      url = `https://goodinfo.tw/tw/StockDividendSchedule.asp?STOCK_ID=${symbol}`;
    }
    
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Referer': 'https://goodinfo.tw/tw/'
      }
    });

    if (response.status === 200 && response.data) {
      let html = response.data;
      console.log(`第一次請求 ${symbol} HTML長度: ${html.length}`);
      
      // 檢查是否需要處理JavaScript重定向
      if (html.includes('window.location.replace') && html.length < 2000) {
        console.log(`${symbol}: 檢測到JavaScript重定向，嘗試解析重定向URL`);
        
        // 解析重定向URL
        const redirectMatch = html.match(/window\.location\.replace\('([^']+)'\)/);
        if (redirectMatch) {
          const redirectUrl = `https://goodinfo.tw/tw/${redirectMatch[1]}`;
          console.log(`${symbol}: 重定向到: ${redirectUrl}`);
          
          // 等待600ms後請求重定向URL
          await new Promise(resolve => setTimeout(resolve, 600));
          
          try {
            const secondResponse = await axios.get(redirectUrl, {
              timeout: 15000,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Referer': url
              }
            });
            
            html = secondResponse.data;
            console.log(`第二次請求 ${symbol} HTML長度: ${html.length}`);
          } catch (redirectError) {
            console.log(`${symbol}: 重定向請求失敗:`, redirectError.message);
            return null;
          }
        }
      }
      
      // 解析HTML內容
      const dividends = parseGoodInfoDividendData(html, symbol);
      
      if (dividends && dividends.length > 0) {
        console.log(`✅ GoodInfo成功獲取 ${symbol} 的 ${dividends.length} 筆股息記錄`);
        return {
          symbol,
          dividends: dividends
        };
      } else {
        console.log(`ℹ️ GoodInfo: ${symbol} 無股息資料`);
        return null;
      }
    }
    
    return null;
  } catch (error) {
    console.error(`GoodInfo API錯誤 ${symbol}:`, error.message);
    return null;
  }
}

// 解析GoodInfo的HTML股息資料
function parseGoodInfoDividendData(html, symbol) {
  try {
    const dividends = [];
    
    console.log(`開始解析 ${symbol} 的GoodInfo HTML，長度: ${html.length}`);
    
    // 檢查是否為錯誤頁面或重定向頁面
    if (html.length < 2000 || html.includes('404') || html.includes('Not Found')) {
      console.log(`${symbol}: HTML內容過短或包含錯誤信息，可能是無效頁面`);
      return [];
    }
    
    // 對於ETF，尋找不同的表格模式
    let tableRegex;
    if (symbol.match(/^00\d{2,3}[A-Z]?$/)) {
      // ETF 可能使用不同的表格結構
      tableRegex = /<table[^>]*>[\s\S]*?<\/table>/gi;
    } else {
      // 一般股票
      tableRegex = /<table[^>]*class[^>]*noborder[^>]*>[\s\S]*?<\/table>/gi;
    }
    
    let tables = html.match(tableRegex);
    
    if (!tables) {
      // 如果沒找到特定表格，嘗試所有表格
      const allTableRegex = /<table[^>]*>[\s\S]*?<\/table>/gi;
      tables = html.match(allTableRegex);
    }
    
    if (!tables) {
      console.log(`${symbol}: 未找到任何表格`);
      return [];
    }
    
    console.log(`${symbol}: 找到 ${tables.length} 個表格`);
    
    // 尋找包含股息資料的表格
    for (let i = 0; i < tables.length; i++) {
      const table = tables[i];
      console.log(`${symbol}: 檢查第 ${i+1} 個表格...`);
      
      // 檢查表格是否包含股息相關的標題
      const dividendKeywords = ['除息', '配息', '股利', '現金', '配發', '股息', '分配'];
      const hasKeyword = dividendKeywords.some(keyword => table.includes(keyword));
      
      if (hasKeyword) {
        console.log(`${symbol}: 第 ${i+1} 個表格包含股息關鍵字`);
        
        // 尋找表格行
        const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
        const rows = table.match(rowRegex);
        
        if (!rows) continue;
        
        console.log(`${symbol}: 表格有 ${rows.length} 行`);
        
        for (let j = 0; j < rows.length; j++) {
          const row = rows[j];
          
          // 解析每一行的股息資料
          const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
          const cells = [];
          let match;
          
          while ((match = cellRegex.exec(row)) !== null) {
            // 清理HTML標籤和空白字符
            const cellText = match[1]
              .replace(/<[^>]*>/g, '')
              .replace(/&nbsp;/g, ' ')
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .trim();
            cells.push(cellText);
          }
          
          // 檢查是否為股息資料行
          if (cells.length >= 6) {
            console.log(`${symbol}: 第 ${j+1} 行有 ${cells.length} 個欄位:`, cells.slice(0, 10));
            
            // 嘗試不同的欄位組合來解析股息資料
            for (let k = 0; k < cells.length - 5; k++) {
              try {
                // 嘗試多種可能的欄位組合
                const possibleYear = cells[k];
                const possibleQuarter = cells[k+1];
                const possibleExDate = cells[k+2];
                
                // 尋找現金股息欄位（可能在不同位置）
                for (let m = k+3; m < Math.min(k+10, cells.length); m++) {
                  const possibleDividend = parseFloat(cells[m]);
                  
                  if (possibleDividend > 0 && possibleDividend < 100) { // 合理的股息範圍
                    // 檢查年份格式
                    if (possibleYear && possibleYear.match(/^\d{4}$/)) {
                      const exDate = parseGoodInfoDate(possibleExDate);
                      
                      if (exDate) {
                        dividends.push({
                          exDate: exDate.toISOString().split('T')[0],
                          amount: possibleDividend,
                          type: 'cash',
                          year: parseInt(possibleYear),
                          quarter: possibleQuarter && possibleQuarter.includes('Q') ? 
                            parseInt(possibleQuarter.replace('Q', '')) : null
                        });
                        
                        console.log(`${symbol}: 成功解析股息記錄: ${possibleYear} ${possibleQuarter} ${possibleExDate} ${possibleDividend}`);
                        break; // 找到一個有效的股息記錄，跳出內層循環
                      }
                    }
                  }
                }
              } catch (parseError) {
                // 忽略解析錯誤，繼續嘗試下一個組合
              }
            }
          }
        }
      }
    }
    
    // 按日期排序（最新的在前）
    dividends.sort((a, b) => new Date(b.exDate) - new Date(a.exDate));
    
    // 去除重複記錄
    const uniqueDividends = dividends.filter((dividend, index, self) => 
      index === self.findIndex(d => d.exDate === dividend.exDate && d.amount === dividend.amount)
    );
    
    console.log(`${symbol}: 最終解析到 ${uniqueDividends.length} 筆股息記錄`);
    return uniqueDividends;
    
  } catch (error) {
    console.error(`解析GoodInfo HTML失敗 ${symbol}:`, error.message);
    return [];
  }
}

// 解析GoodInfo的日期格式
function parseGoodInfoDate(dateStr) {
  try {
    // GoodInfo可能使用不同的日期格式，需要處理多種情況
    // 例如: "25/11/21", "2025/11/21", "25/11/21" 等
    
    if (!dateStr || dateStr === '-') return null;
    
    // 移除多餘的空白和特殊字符
    const cleanDate = dateStr.replace(/[^\d\/]/g, '');
    
    if (cleanDate.match(/^\d{2}\/\d{2}\/\d{2}$/)) {
      // 格式: YY/MM/DD
      const [year, month, day] = cleanDate.split('/');
      const fullYear = parseInt(year) + (parseInt(year) > 50 ? 1900 : 2000);
      return new Date(fullYear, parseInt(month) - 1, parseInt(day));
    } else if (cleanDate.match(/^\d{4}\/\d{2}\/\d{2}$/)) {
      // 格式: YYYY/MM/DD
      const [year, month, day] = cleanDate.split('/');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    
    return null;
  } catch (error) {
    console.warn(`日期解析失敗: ${dateStr}`, error.message);
    return null;
  }
}

// 備用股息資料（當API無法獲取時使用）
function getBackupDividendData(symbol) {
  // 遵循 API 資料完整性規則：
  // ❌ 絕對禁止使用本地硬編碼股票名稱對照表
  // ❌ 絕對禁止提供虛假或過時的股票資料  
  // ❌ 絕對禁止在API失敗時返回預設價格
  // ❌ 絕對禁止混用真實API資料和虛假本地資料
  
  console.log(`❌ 不提供備用股息資料 ${symbol}：遵循API資料完整性規則`);
  return null;
}
async function getYahooDividendData(symbol) {
  try {
    // 嘗試多種 Yahoo Finance 符號格式
    const symbolVariants = [
      `${symbol}.TW`,      // 台股標準格式
      `${symbol}.TWO`,     // 上櫃格式
      symbol               // 無後綴
    ];
    
    for (const yahooSymbol of symbolVariants) {
      try {
        console.log(`🔍 Yahoo Finance: 嘗試 ${yahooSymbol}...`);
        
        // 方法1: 使用 chart API (包含股息事件)
        const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?range=5y&interval=1d&events=div`;
        
        const chartResponse = await axios.get(chartUrl, {
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json',
            'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7'
          }
        });

        if (chartResponse.data?.chart?.result?.[0]?.events?.dividends) {
          const dividends = chartResponse.data.chart.result[0].events.dividends;
          const dividendArray = [];
          
          console.log(`✅ Yahoo Finance (${yahooSymbol}) 找到 ${Object.keys(dividends).length} 筆股息記錄`);
          
          // 轉換Yahoo Finance股息資料格式
          for (const [timestamp, dividendInfo] of Object.entries(dividends)) {
            const date = new Date(parseInt(timestamp) * 1000);
            dividendArray.push({
              exDate: date.toISOString().split('T')[0],
              amount: dividendInfo.amount,
              type: 'cash',
              year: date.getFullYear(),
              quarter: Math.ceil((date.getMonth() + 1) / 3)
            });
          }
          
          // 按日期排序（最新的在前）
          dividendArray.sort((a, b) => new Date(b.exDate) - new Date(a.exDate));
          
          console.log(`✅ Yahoo Finance 成功返回 ${dividendArray.length} 筆股息資料`);
          
          return {
            symbol,
            dividends: dividendArray
          };
        }
        
        // 方法2: 嘗試使用 v7 API
        const v7Url = `https://query2.finance.yahoo.com/v7/finance/download/${yahooSymbol}?period1=0&period2=${Math.floor(Date.now() / 1000)}&interval=1d&events=div`;
        
        try {
          const v7Response = await axios.get(v7Url, {
            timeout: 15000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'text/csv'
            }
          });
          
          if (v7Response.data && typeof v7Response.data === 'string' && v7Response.data.includes('Dividends')) {
            console.log(`✅ Yahoo Finance v7 API (${yahooSymbol}) 找到股息資料`);
            
            // 解析 CSV 格式
            const lines = v7Response.data.split('\n').filter(line => line.trim());
            const dividendArray = [];
            
            for (let i = 1; i < lines.length; i++) {
              const parts = lines[i].split(',');
              if (parts.length >= 2) {
                const date = parts[0];
                const amount = parseFloat(parts[1]);
                
                if (date && !isNaN(amount)) {
                  const dateObj = new Date(date);
                  dividendArray.push({
                    exDate: date,
                    amount: amount,
                    type: 'cash',
                    year: dateObj.getFullYear(),
                    quarter: Math.ceil((dateObj.getMonth() + 1) / 3)
                  });
                }
              }
            }
            
            if (dividendArray.length > 0) {
              dividendArray.sort((a, b) => new Date(b.exDate) - new Date(a.exDate));
              console.log(`✅ Yahoo Finance v7 成功返回 ${dividendArray.length} 筆股息資料`);
              
              return {
                symbol,
                dividends: dividendArray
              };
            }
          }
        } catch (v7Error) {
          // v7 API 失敗，繼續嘗試下一個符號
        }
        
      } catch (variantError) {
        // 這個符號格式失敗，嘗試下一個
        continue;
      }
    }
    
    console.log(`⚠️ Yahoo Finance: ${symbol} 所有格式都找不到資料`);
    return null;
    
  } catch (error) {
    console.error(`❌ Yahoo股息API錯誤 ${symbol}:`, error.message);
    return null;
  }
}

// API路由：獲取股息資料 - 智能選擇最佳資料來源
app.get('/api/dividend/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const upperSymbol = symbol.toUpperCase();
    
    console.log(`\n📊 ===== 獲取 ${upperSymbol} 股息資料 =====`);
    
    const cacheKey = `dividend_${upperSymbol}`;
    const cached = stockCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION * 10) { // 股息資料快取10分鐘
      console.log(`✅ 從快取返回 ${upperSymbol} 股息資料`);
      return res.json(cached.data);
    }
    
    let dividendData = null;
    const isBondETF = GoodInfoService.isBondETF(upperSymbol);
    
    // 策略：債券 ETF 優先使用 Yahoo Finance（FinMind 資料不完整，GoodInfo 已移除）
    if (isBondETF) {
      console.log(`💰 ${upperSymbol} 是債券 ETF`);
      
      // 方法1: Yahoo Finance（首選，債券 ETF 配息資料最完整）
      console.log(`嘗試 Yahoo Finance API...`);
      dividendData = await getYahooDividendData(upperSymbol);
      
      // 方法2: 如果 Yahoo Finance 失敗，嘗試 FinMind（備用，可能資料不完整）
      if (!dividendData || dividendData.dividends.length === 0) {
        console.log(`Yahoo Finance 無資料，嘗試 FinMind: ${upperSymbol}`);
        dividendData = await getFinMindDividendData(upperSymbol);
      }
    } else {
      console.log(`📈 ${upperSymbol} 是一般股票，優先使用 FinMind`);
      
      // 方法1: FinMind（一般股票首選）
      dividendData = await getFinMindDividendData(upperSymbol);
      
      // 方法2: 如果 FinMind 失敗，嘗試 Yahoo Finance
      if (!dividendData || dividendData.dividends.length === 0) {
        console.log(`FinMind 無資料，嘗試 Yahoo Finance: ${upperSymbol}`);
        dividendData = await getYahooDividendData(upperSymbol);
      }
    }
    
    if (dividendData && dividendData.dividends.length > 0) {
      stockCache.set(cacheKey, {
        data: dividendData,
        timestamp: Date.now()
      });
      console.log(`✅ 成功返回 ${upperSymbol} ${dividendData.dividends.length} 筆股息資料\n`);
      res.json(dividendData);
    } else {
      console.log(`❌ 所有 API 都無法獲取 ${upperSymbol} 股息資料\n`);
      
      // 針對債券 ETF 提供特別的提示
      const suggestions = isBondETF ? [
        '💡 債券 ETF 配息資料建議手動輸入',
        '📊 資料來源：GoodInfo (https://goodinfo.tw/tw/StockDividendPolicy.asp?STOCK_ID=' + upperSymbol + ')',
        '📅 月配息 ETF 建議每月更新一次',
        '✅ 使用「手動股息管理」功能添加配息記錄'
      ] : [
        '該股票可能沒有配息記錄',
        '或者是新上市股票尚無股息資料',
        '可使用手動股息管理功能添加'
      ];
      
      res.status(404).json({
        error: 'No dividend data found',
        message: `找不到股票代碼 ${upperSymbol} 的股息資料`,
        isBondETF: isBondETF,
        suggestions: suggestions,
        dataSource: isBondETF ? `https://goodinfo.tw/tw/StockDividendPolicy.asp?STOCK_ID=${upperSymbol}` : null
      });
    }
    
  } catch (error) {
    console.error('❌ 股息API錯誤:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: '獲取股息資料時發生錯誤'
    });
  }
});

// API路由：股票搜尋 - Yahoo Finance 優先，FinMind 備用
app.get('/api/stock-search', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.length < 2) {
      return res.json([]);
    }
    
    console.log(`🔍 股票搜尋: "${query}" - Yahoo Finance 優先`);
    
    const searchResults = [];
    
    // 如果是數字，當作股票代碼搜尋
    if (/^\d+[A-Z]*$/i.test(query)) {
      try {
        // 1. 優先嘗試 Yahoo Finance API
        console.log(`📊 優先嘗試 Yahoo Finance: ${query}`);
        const yahooData = await getYahooStockPrice(query.toUpperCase());
        if (yahooData && yahooData.name && yahooData.name !== query) {
          // Yahoo Finance 成功，但嘗試從 FinMind 獲取中文名稱
          console.log(`✅ Yahoo Finance 獲取股價成功: ${yahooData.price}`);
          
          let chineseName = yahooData.name; // 預設使用 Yahoo 的英文名稱
          try {
            console.log(`🔍 嘗試從 FinMind 獲取中文名稱: ${query}`);
            const finmindData = await getFinMindStockPrice(query.toUpperCase());
            if (finmindData && finmindData.name && finmindData.name !== query && finmindData.name !== yahooData.name) {
              chineseName = finmindData.name;
              console.log(`✅ FinMind 獲取中文名稱成功: ${chineseName}`);
            }
          } catch (finmindError) {
            console.log(`⚠️ FinMind 獲取中文名稱失敗，使用 Yahoo 名稱`);
          }
          
          searchResults.push({
            symbol: query.toUpperCase(),
            name: chineseName, // 優先使用中文名稱
            price: yahooData.price || 0,
            market: '台股',
            type: 'stock',
            source: chineseName === yahooData.name ? 'Yahoo Finance' : 'Yahoo+FinMind'
          });
          console.log(`✅ 搜尋成功: ${query} = ${chineseName} (${yahooData.price})`);
        } else {
          // 2. Yahoo Finance 失敗，嘗試 FinMind API
          console.log(`📊 Yahoo Finance 失敗，嘗試 FinMind: ${query}`);
          const finmindData = await getFinMindStockPrice(query.toUpperCase());
          if (finmindData && finmindData.name && finmindData.name !== query) {
            searchResults.push({
              symbol: query.toUpperCase(),
              name: finmindData.name,
              price: finmindData.price || 0,
              market: '台股',
              type: 'stock',
              source: 'FinMind'
            });
            console.log(`✅ FinMind 搜尋成功: ${finmindData.name}`);
          }
        }
      } catch (error) {
        console.log(`❌ 搜尋 ${query} 失敗:`, error.message);
      }
    } else {
      // 如果是中文或英文，當作股票名稱搜尋
      console.log(`📝 中文名稱搜尋: "${query}"`);
      
      // 建立股票名稱對照表（常見股票）
      const stockNameMap = {
        // 金融股
        '富邦金': '2881',
        '兆豐金': '2886', 
        '國泰金': '2882',
        '中信金': '2891',
        '第一金': '2892',
        '華南金': '2880',
        '永豐金': '2890',
        '玉山金': '2884',
        '台新金': '2887',
        
        // 科技股
        '台積電': '2330',
        '聯發科': '2454',
        '鴻海': '2317',
        '廣達': '2382',
        '台達電': '2308',
        '聯電': '2303',
        '日月光': '2311',
        '宏達電': '2498',
        
        // ETF
        '元大台灣50': '0050',
        '元大高股息': '0056',
        '富邦台50': '006208',
        '元大美債20年': '00679B',
        
        // 其他
        '台塑': '1301',
        '中華電': '2412',
        '台灣大': '3045',
        '遠傳': '4904'
      };
      
      // 搜尋匹配的股票代碼
      const matchedSymbol = stockNameMap[query];
      if (matchedSymbol) {
        console.log(`✅ 找到匹配股票: ${query} → ${matchedSymbol}`);
        
        try {
          // 獲取股價資料
          const yahooData = await getYahooStockPrice(matchedSymbol);
          if (yahooData && yahooData.price) {
            searchResults.push({
              symbol: matchedSymbol,
              name: query, // 使用用戶輸入的中文名稱
              price: yahooData.price,
              market: '台股',
              type: 'stock',
              source: 'Name Search + Yahoo Finance'
            });
            console.log(`✅ 名稱搜尋成功: ${query} (${matchedSymbol}) = ${yahooData.price}`);
          }
        } catch (error) {
          console.log(`❌ 名稱搜尋獲取股價失敗: ${error.message}`);
        }
      } else {
        console.log(`❌ 未找到匹配的股票名稱: ${query}`);
      }
    }
    
    // 如果沒有找到結果，返回一些常見的股票建議
    if (searchResults.length === 0) {
      console.log(`💡 提供常見股票建議`);
      const commonStocks = [
        { symbol: '2330', name: '台積電', market: '台股', type: 'stock' },
        { symbol: '2317', name: '鴻海', market: '台股', type: 'stock' },
        { symbol: '2454', name: '聯發科', market: '台股', type: 'stock' },
        { symbol: '2886', name: '兆豐金', market: '台股', type: 'stock' },
        { symbol: '0050', name: '元大台灣50', market: '台股', type: 'etf' },
        { symbol: '00679B', name: '元大美債20年', market: '台股', type: 'bond' }
      ];
      
      // 根據查詢字串過濾
      const filtered = commonStocks.filter(stock => 
        stock.symbol.includes(query.toUpperCase()) || 
        stock.name.includes(query)
      );
      
      searchResults.push(...filtered.slice(0, 5));
    }
    
    console.log(`✅ 搜尋結果: ${searchResults.length} 筆`);
    res.json(searchResults);
    
  } catch (error) {
    console.error('❌ 股票搜尋錯誤:', error);
    res.status(500).json({
      error: 'Search failed',
      message: '搜尋失敗'
    });
  }
});

// 健康檢查
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cache_size: stockCache.size,
    version: '1.0.2.0114'
  });
});

// 重啟服務器端點（開發環境用）
app.post('/api/restart', (req, res) => {
  res.json({
    message: '服務器重啟請求已接收',
    timestamp: new Date().toISOString()
  });
  
  // 延遲重啟，讓回應先發送
  setTimeout(() => {
    console.log('🔄 收到重啟請求，正在重啟服務器...');
    process.exit(0); // 退出進程，由進程管理器重啟
  }, 1000);
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`🚀 股票代理伺服器啟動於 http://localhost:${PORT}`);
  console.log(`📊 支援的API端點:`);
  console.log(`   GET /api/stock/:symbol - 獲取股票價格`);
  console.log(`   GET /api/dividend/:symbol - 股息資料（建議手動管理）`);
  console.log(`   GET /api/stock-search?query=XXX - 股票搜尋`);
  console.log(`   GET /health - 健康檢查`);
});