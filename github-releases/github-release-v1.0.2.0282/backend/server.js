const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
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
        console.log(`FinMind獲取 ${symbol} 中文名稱: ${stockName}`);
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
          console.log(`FinMind ${symbol} 股價: ${price}, 名稱: ${stockName}`);
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
    // 🔬 改進：根據股票代碼智能判斷後綴順序
    const isBondETF = /^00\d{2,3}B$/i.test(symbol);
    const code = parseInt(symbol.substring(0, 4));
    
    let suffixes;
    let description;
    
    if (isBondETF) {
      // 債券 ETF：優先 .TWO（櫃買中心）
      suffixes = ['.TWO', '.TW'];
      description = '債券 ETF';
    } else if (code >= 6000 && code <= 8999) {
      // 上櫃股票（6000-8999）：優先 .TWO
      suffixes = ['.TWO', '.TW'];
      description = '上櫃股票';
    } else if (code >= 3000 && code <= 5999) {
      // 上櫃股票（3000-5999）：優先 .TWO
      suffixes = ['.TWO', '.TW'];
      description = '上櫃股票';
    } else {
      // 上市股票（1000-2999）：優先 .TW
      suffixes = ['.TW', '.TWO'];
      description = '上市股票';
    }
    
    console.log(` Yahoo Finance: ${symbol} (${description}) 嘗試後綴順序: ${suffixes.join(', ')}`);
    
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
            console.log(` Yahoo Finance 成功: ${yahooSymbol} = ${price} (${stockName})`);
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
    
    console.log(` Yahoo Finance: ${symbol} 所有後綴都失敗`);
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
            
            console.log(` 上市API獲取 ${symbol}: ${stockName}, 價格: ${finalPrice}, 狀態: ${status}`);
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
            console.log(` 上櫃API成功獲取 ${symbol}: ${stockName}, 價格: ${price}`);
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
            console.log(` 興櫃API成功獲取 ${symbol}: ${stockName}, 價格: ${price}`);
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
        console.log(` Yahoo Finance 成功獲取 ${upperSymbol} 股價資料（即時）`);
        
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
          console.log(` FinMind 成功獲取 ${upperSymbol} 中文名稱股價資料`);
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
            console.log(` 證交所獲取股價，使用 FinMind 中文名稱: ${chineseName}`);
          } else {
            console.log(` 證交所成功獲取 ${upperSymbol} 中文名稱股價資料`);
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
    
    console.log(` 正在獲取 ${symbol} 的股息資料...`);
    const finmindResponse = await axios.get(finmindUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });
    
    if (!finmindResponse.data || !finmindResponse.data.data || finmindResponse.data.data.length === 0) {
      console.log(` FinMind API 沒有找到 ${symbol} 的股息資料`);
      return null;
    }

    const finmindData = finmindResponse.data.data;
    console.log(` FinMind API 返回 ${finmindData.length} 筆股息記錄`);
    
    // 輸出第一筆原始資料來檢查欄位結構
    if (finmindData.length > 0) {
      console.log(` FinMind 原始資料範例 (第一筆):`, JSON.stringify(finmindData[0], null, 2));
    }

    // 處理FinMind資料
    const dividends = finmindData.map(item => {
      console.log(`\n 處理股息記錄 (原始資料):`, item);

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
      console.log(` FinMind成功獲取 ${symbol} 的 ${dividends.length} 筆股息記錄`);
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
        console.log(` GoodInfo成功獲取 ${symbol} 的 ${dividends.length} 筆股息記錄`);
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
  //  絕對禁止使用本地硬編碼股票名稱對照表
  //  絕對禁止提供虛假或過時的股票資料  
  //  絕對禁止在API失敗時返回預設價格
  //  絕對禁止混用真實API資料和虛假本地資料
  
  console.log(` 不提供備用股息資料 ${symbol}：遵循API資料完整性規則`);
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
        console.log(` Yahoo Finance: 嘗試 ${yahooSymbol}...`);
        
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
          
          console.log(` Yahoo Finance (${yahooSymbol}) 找到 ${Object.keys(dividends).length} 筆股息記錄`);
          
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
          
          console.log(` Yahoo Finance 成功返回 ${dividendArray.length} 筆股息資料`);
          
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
            console.log(` Yahoo Finance v7 API (${yahooSymbol}) 找到股息資料`);
            
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
              console.log(` Yahoo Finance v7 成功返回 ${dividendArray.length} 筆股息資料`);
              
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
    console.error(` Yahoo股息API錯誤 ${symbol}:`, error.message);
    return null;
  }
}

// API路由：獲取股息資料 - 智能選擇最佳資料來源
app.get('/api/dividend/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const upperSymbol = symbol.toUpperCase();
    
    console.log(`\n ===== 獲取 ${upperSymbol} 股息資料 =====`);
    
    const cacheKey = `dividend_${upperSymbol}`;
    const cached = stockCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION * 10) { // 股息資料快取10分鐘
      console.log(` 從快取返回 ${upperSymbol} 股息資料`);
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
      console.log(` 成功返回 ${upperSymbol} ${dividendData.dividends.length} 筆股息資料\n`);
      res.json(dividendData);
    } else {
      console.log(` 所有 API 都無法獲取 ${upperSymbol} 股息資料\n`);
      
      // 針對債券 ETF 提供特別的提示
      const suggestions = isBondETF ? [
        ' 債券 ETF 配息資料建議手動輸入',
        ' 資料來源：GoodInfo (https://goodinfo.tw/tw/StockDividendPolicy.asp?STOCK_ID=' + upperSymbol + ')',
        ' 月配息 ETF 建議每月更新一次',
        ' 使用「手動股息管理」功能添加配息記錄'
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
    console.error(' 股息API錯誤:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: '獲取股息資料時發生錯誤'
    });
  }
});

// 獲取當前載入的股票清單日期
function getStockListDate() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const rootDir = path.join(__dirname, '..');
    
    // 檢查今日檔案
    const todayFilename = `stock_list_${today}.json`;
    const todayFilePath = path.join(rootDir, todayFilename);
    
    if (fs.existsSync(todayFilePath)) {
      return today;
    }
    
    // 尋找最新的股票清單檔案
    const files = fs.readdirSync(rootDir);
    const stockListFiles = files
      .filter(file => file.startsWith('stock_list_') && file.endsWith('.json'))
      .sort()
      .reverse();
    
    if (stockListFiles.length > 0) {
      const latestFile = stockListFiles[0];
      const dateMatch = latestFile.match(/stock_list_(\d{4}-\d{2}-\d{2})\.json/);
      return dateMatch ? dateMatch[1] : null;
    }
    
    return null;
  } catch (error) {
    console.error('獲取股票清單日期失敗:', error);
    return null;
  }
}

// 載入本地股票清單的函數 - 改善版：支援備援機制
function loadTodayStockList() {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const rootDir = path.join(__dirname, '..'); // 上一層目錄
    
    // 🔧 策略1：優先載入今日檔案
    const todayFilename = `stock_list_${today}.json`;
    const todayFilePath = path.join(rootDir, todayFilename);
    
    if (fs.existsSync(todayFilePath)) {
      const data = fs.readFileSync(todayFilePath, 'utf8');
      const stockData = JSON.parse(data);
      console.log(` 載入今日股票清單: ${todayFilename} (${stockData.count} 支股票)`);
      return stockData.stocks;
    }
    
    // 🔧 策略2：今日檔案不存在，尋找最新的股票清單檔案
    console.log(`⚠️ 今日股票清單不存在: ${todayFilename}，尋找最新檔案...`);
    
    const files = fs.readdirSync(rootDir);
    const stockListFiles = files
      .filter(file => file.startsWith('stock_list_') && file.endsWith('.json'))
      .sort()
      .reverse(); // 按日期降序排列，最新的在前
    
    console.log(` 找到股票清單檔案: ${stockListFiles.slice(0, 3).join(', ')}${stockListFiles.length > 3 ? '...' : ''}`);
    
    // 嘗試載入最新的檔案
    for (const filename of stockListFiles.slice(0, 5)) { // 最多嘗試5個最新檔案
      try {
        const filePath = path.join(rootDir, filename);
        const data = fs.readFileSync(filePath, 'utf8');
        const stockData = JSON.parse(data);
        
        if (stockData.stocks && Object.keys(stockData.stocks).length > 0) {
          const fileDate = filename.replace('stock_list_', '').replace('.json', '');
          const daysOld = Math.floor((new Date(today) - new Date(fileDate)) / (1000 * 60 * 60 * 24));
          
          console.log(` 載入備援股票清單: ${filename} (${stockData.count} 支股票, ${daysOld} 天前)`);
          
          if (daysOld > 7) {
            console.log(`⚠️ 警告：股票清單已過期 ${daysOld} 天，建議更新`);
          }
          
          return stockData.stocks;
        }
      } catch (fileError) {
        console.log(` 載入 ${filename} 失敗: ${fileError.message}`);
        continue;
      }
    }
    
    console.log(` 所有股票清單檔案都無法載入`);
    return null;
    
  } catch (error) {
    console.error(' 載入股票清單失敗:', error.message);
    return null;
  }
}

// 內建的基本股票清單（最後備援）- 包含最常搜尋的股票
const BUILTIN_STOCK_LIST = {
  // 權值股
  '2330': { name: '台積電', market: '上市', industry: '半導體' },
  '2317': { name: '鴻海', market: '上市', industry: '電子' },
  '2454': { name: '聯發科', market: '上市', industry: '半導體' },
  '2881': { name: '富邦金', market: '上市', industry: '金融' },
  '2882': { name: '國泰金', market: '上市', industry: '金融' },
  '2886': { name: '兆豐金', market: '上市', industry: '金融' },
  '2891': { name: '中信金', market: '上市', industry: '金融' },
  '2892': { name: '第一金', market: '上市', industry: '金融' },
  
  // 熱門 ETF
  '0050': { name: '元大台灣50', market: 'ETF', industry: 'ETF' },
  '0056': { name: '元大高股息', market: 'ETF', industry: 'ETF' },
  '00878': { name: '國泰永續高股息', market: 'ETF', industry: 'ETF' },
  '00881': { name: '國泰台灣5G+', market: 'ETF', industry: 'ETF' },
  '00646': { name: '元大S&P500', market: 'ETF', industry: 'ETF' },
  '00662': { name: '富邦NASDAQ', market: 'ETF', industry: 'ETF' },
  
  // 債券 ETF
  '00679B': { name: '元大美債20年', market: 'ETF', industry: 'ETF' },
  '00687B': { name: '國泰20年美債', market: 'ETF', industry: 'ETF' },
  '00751B': { name: '元大AAA至A公司債', market: 'ETF', industry: 'ETF' },
  
  // 常見個股
  '2303': { name: '聯電', market: '上市', industry: '半導體' },
  '2308': { name: '台達電', market: '上市', industry: '電子' },
  '2412': { name: '中華電', market: '上市', industry: '通信' },
  '2474': { name: '可成', market: '上市', industry: '電子' },
  '3008': { name: '大立光', market: '上市', industry: '光電' },
  '3711': { name: '日月光投控', market: '上市', industry: '半導體' },
  '5880': { name: '合庫金', market: '上市', industry: '金融' },
  '6505': { name: '台塑化', market: '上市', industry: '石化' },
  
  // 上櫃熱門股
  '4938': { name: '和碩', market: '上櫃', industry: '電子' },
  '6488': { name: '環球晶', market: '上櫃', industry: '半導體' },
  '8454': { name: '富邦媒', market: '上櫃', industry: '媒體' }
};

// FinMind API 直接搜尋函數（作為備援）
async function searchStocksViaFinMindAPI(query) {
  try {
    console.log(` FinMind API 直接搜尋: "${query}"`);
    
    const finmindUrl = `https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockInfo&token=`;
    const response = await axios.get(finmindUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });
    
    if (response.data?.data && Array.isArray(response.data.data)) {
      const queryUpper = query.toUpperCase().trim();
      const queryLower = query.toLowerCase().trim();
      
      // 🔧 使用與本地搜尋相同的匹配邏輯
      const allMatches = [];
      
      for (const stock of response.data.data) {
        const symbol = stock.stock_id || '';
        const name = stock.stock_name || '';
        const symbolUpper = symbol.toUpperCase();
        const nameLower = name.toLowerCase();
        
        // 1. 精確匹配股票代碼（最高優先級）
        if (symbolUpper === queryUpper) {
          allMatches.push({ stock, priority: 1 });
        }
        // 2. 股票代碼開頭匹配（高優先級）
        else if (symbolUpper.startsWith(queryUpper)) {
          allMatches.push({ stock, priority: 2 });
        }
        // 3. 中文名稱包含查詢字串（中優先級）
        else if (nameLower.includes(queryLower) || name.includes(query)) {
          allMatches.push({ stock, priority: 3 });
        }
        // 4. 股票代碼包含查詢字串（低優先級）
        else if (query.length >= 3 && symbolUpper.includes(queryUpper)) {
          allMatches.push({ stock, priority: 4 });
        }
      }
      
      // 按優先級排序並限制結果數量
      allMatches.sort((a, b) => {
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        return a.stock.stock_id.localeCompare(b.stock.stock_id);
      });
      
      // 轉換為結果格式並獲取股價
      const results = [];
      for (const match of allMatches.slice(0, 10)) {
        const stock = match.stock;
        
        try {
          // 嘗試獲取股價
          const yahooData = await getYahooStockPrice(stock.stock_id);
          const price = yahooData ? yahooData.price : 0;
          
          results.push({
            symbol: stock.stock_id,
            name: stock.stock_name,
            price: price,
            market: getStockMarket(stock.stock_id),
            industry: stock.industry_category || 'N/A',
            type: 'stock',
            source: yahooData ? 'FinMind+Yahoo' : 'FinMind Only'
          });
        } catch (priceError) {
          // 即使沒有股價也返回基本資訊
          results.push({
            symbol: stock.stock_id,
            name: stock.stock_name,
            price: 0,
            market: getStockMarket(stock.stock_id),
            industry: stock.industry_category || 'N/A',
            type: 'stock',
            source: 'FinMind Only'
          });
        }
      }
      
      console.log(` FinMind API 搜尋結果: ${results.length} 筆`);
      return results;
    }
    
    return [];
  } catch (error) {
    console.error(` FinMind API 搜尋失敗: ${error.message}`);
    return [];
  }
}

// 本地股票搜尋函數 - 智能匹配邏輯
function searchLocalStocks(query, stockList) {
  if (!stockList) return [];
  
  console.log(` [searchLocalStocks] 開始本地搜尋: "${query}"`);
  
  const queryUpper = query.toUpperCase().trim();
  const queryLower = query.toLowerCase().trim();
  
  console.log(` [searchLocalStocks] 查詢轉換: "${query}" → 大寫:"${queryUpper}" 小寫:"${queryLower}"`);
  
  // 檢查查詢是否包含字母
  const queryHasLetter = /[A-Z]/.test(queryUpper);
  const queryIsNumber = /^\d+$/.test(queryUpper);
  
  console.log(` [searchLocalStocks] 查詢分析: 包含字母=${queryHasLetter}, 純數字=${queryIsNumber}`);
  
  // 收集所有匹配的股票
  const allMatches = [];
  
  for (const [symbol, info] of Object.entries(stockList)) {
    const symbolUpper = symbol.toUpperCase();
    const nameLower = info.name.toLowerCase();
    
    // 1. 精確匹配股票代碼（最高優先級，大小寫不敏感）
    if (symbolUpper === queryUpper) {
      console.log(` [searchLocalStocks] 精確匹配: ${symbol}`);
      allMatches.push({ symbol, info, priority: 1 });
    }
    // 2. 🔧 智能開頭匹配邏輯：
    // - 如果查詢包含字母，不進行開頭匹配（避免 00981a 匹配到 009810）
    // - 如果查詢是純數字，進行開頭匹配
    else if (symbolUpper.startsWith(queryUpper)) {
      if (queryIsNumber) {
        // 純數字查詢：進行開頭匹配
        console.log(`📝 [searchLocalStocks] 純數字開頭匹配: ${symbol}`);
        allMatches.push({ symbol, info, priority: 2 });
      } else if (!queryHasLetter) {
        // 其他情況（不包含字母）：正常開頭匹配
        console.log(`📝 [searchLocalStocks] 一般開頭匹配: ${symbol}`);
        allMatches.push({ symbol, info, priority: 2 });
      } else {
        // 包含字母的查詢不進行開頭匹配，只依賴精確匹配
        console.log(`⚠️ [searchLocalStocks] 跳過包含字母的開頭匹配: ${symbol} (查詢: ${query})`);
      }
    }
    // 3. 中文名稱包含查詢字串（中等優先級）
    else if (nameLower.includes(queryLower) || info.name.includes(query)) {
      console.log(`🏷️ [searchLocalStocks] 名稱匹配: ${symbol} - ${info.name}`);
      allMatches.push({ symbol, info, priority: 4 });
    }
    // 4. 股票代碼包含查詢字串（低優先級，但排除過短的查詢和過長的查詢）
    else if (query.length >= 3 && query.length < 5 && symbolUpper.includes(queryUpper)) {
      console.log(` [searchLocalStocks] 代碼包含匹配: ${symbol}`);
      allMatches.push({ symbol, info, priority: 5 });
    }
  }

  console.log(` [searchLocalStocks] 總共找到 ${allMatches.length} 筆匹配`);

  // 按優先級和字母順序排序
  allMatches.sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    return a.symbol.localeCompare(b.symbol);
  });

  // 🔧 修復：如果有精確匹配，只返回精確匹配結果
  const exactMatches = allMatches.filter(match => match.priority === 1);
  if (exactMatches.length > 0) {
    console.log(`🎯 [searchLocalStocks] 找到精確匹配，只返回精確匹配結果: ${exactMatches.length} 筆`);
    const results = exactMatches.map(match => ({
      symbol: match.symbol,
      name: match.info.name,
      industry: match.info.industry,
      market: match.info.market
    }));
    console.log(` [searchLocalStocks] 精確匹配結果:`, results.map(r => r.symbol));
    return results;
  }

  // 轉換為結果格式，限制數量
  const results = [];
  for (const match of allMatches.slice(0, 10)) {
    results.push({
      symbol: match.symbol,
      name: match.info.name,
      industry: match.info.industry,
      market: match.info.market
    });
  }
  
  console.log(` [searchLocalStocks] 最終返回 ${results.length} 筆結果:`, results.map(r => r.symbol));
  return results;
}

// API路由：股票搜尋 - 本地匹配 + Yahoo Finance 股價
app.get('/api/stock-search', async (req, res) => {
  const requestId = Math.random().toString(36).substr(2, 9);
  console.log(` [Backend-${requestId}] 收到搜尋請求`);
  
  try {
    const { query } = req.query;
    
    if (!query || query.length < 2) {
      console.log(` [Backend-${requestId}] 搜尋查詢太短，返回空結果: "${query}"`);
      return res.json([]);
    }
    
    console.log(` [Backend-${requestId}] 股票搜尋開始: "${query}" - 本地匹配 + Yahoo Finance 股價`);
    
    // 1. 載入今日股票清單（改善版：支援備援）
    const stockList = loadTodayStockList();
    
    // 🔧 添加股票清單日期到響應頭
    const today = new Date().toISOString().split('T')[0];
    const stockListDate = getStockListDate();
    res.set('X-Stock-List-Date', stockListDate || 'unknown');
    res.set('X-Stock-List-Is-Today', stockListDate === today ? 'true' : 'false');
    
    if (!stockList) {
      console.log(` [Backend-${requestId}] 無法載入股票清單，嘗試 API 直接搜尋...`);
      
      // 🔧 降級策略：使用 FinMind API 直接搜尋
      try {
        const finmindResults = await searchStocksViaFinMindAPI(query);
        if (finmindResults.length > 0) {
          console.log(` [Backend-${requestId}] FinMind API 直接搜尋成功: ${finmindResults.length} 筆結果`);
          return res.json(finmindResults);
        }
      } catch (apiError) {
        console.log(` [Backend-${requestId}] FinMind API 搜尋也失敗: ${apiError.message}`);
      }
      
      return res.status(503).json({
        error: 'Stock list not available',
        message: '股票清單暫時無法使用，請稍後再試',
        suggestions: [
          '請執行 python fetch_stock_list.py 來更新股票清單',
          '或使用完整的股票代碼進行搜尋',
          '檢查是否有最新的 stock_list_YYYY-MM-DD.json 檔案'
        ],
        fallback: 'API direct search attempted but failed'
      });
    }
    
    console.log(` [Backend-${requestId}] 股票清單載入成功，共 ${Object.keys(stockList).length} 支股票`);
    
    // 2. 本地搜尋匹配的股票
    const matchedStocks = searchLocalStocks(query, stockList);
    console.log(` [Backend-${requestId}] 本地匹配找到 ${matchedStocks.length} 支股票`);
    console.log(` [Backend-${requestId}] 匹配的股票:`, matchedStocks.map(s => s.symbol));
    
    if (matchedStocks.length === 0) {
      console.log(` [Backend-${requestId}] 沒有找到匹配的股票，返回空結果`);
      return res.json([]);
    }
    
    // 3. 為每支匹配的股票獲取 Yahoo Finance 即時股價
    const searchResults = [];
    
    for (const stock of matchedStocks) {
      try {
        console.log(` [Backend-${requestId}] 獲取 ${stock.symbol} 的即時股價...`);
        
        // 使用 Yahoo Finance 獲取即時股價
        const yahooData = await getYahooStockPrice(stock.symbol);
        const price = yahooData ? yahooData.price : 0;
        
        searchResults.push({
          symbol: stock.symbol,
          name: stock.name,
          price: price,
          market: stock.market,
          industry: stock.industry,
          type: 'stock',
          source: yahooData ? 'Local+Yahoo' : 'Local Only'
        });
        
        console.log(` ${stock.symbol} (${stock.name}) 價格: ${price}`);
        
      } catch (priceError) {
        console.log(`⚠️ 獲取 ${stock.symbol} 股價失敗:`, priceError.message);
        
        // 即使沒有股價，也返回股票資訊
        searchResults.push({
          symbol: stock.symbol,
          name: stock.name,
          price: 0,
          market: stock.market,
          industry: stock.industry,
          type: 'stock',
          source: 'Local Only'
        });
      }
    }
    
    console.log(` [Backend-${requestId}] 搜尋結果: ${searchResults.length} 筆`);
    console.log(` [Backend-${requestId}] 最終返回結果:`, searchResults.map(r => r.symbol));
    res.json(searchResults);
    
  } catch (error) {
    console.error(` [Backend-${requestId}] 股票搜尋錯誤:`, error);
    res.status(500).json({
      error: 'Search failed',
      message: '搜尋失敗'
    });
  }
});

// API路由：觸發股票清單更新
app.post('/api/update-stock-list', async (req, res) => {
  try {
    console.log('🔄 收到股票清單更新請求');
    
    // 檢查是否為本機環境
    const isLocalhost = req.hostname === 'localhost' || req.hostname === '127.0.0.1';
    
    if (!isLocalhost) {
      return res.status(403).json({
        error: 'Forbidden',
        message: '股票清單更新僅限本機環境'
      });
    }
    
    // 檢查今日檔案是否已存在
    const today = new Date().toISOString().split('T')[0];
    const todayFilename = `stock_list_${today}.json`;
    const todayFilePath = path.join(__dirname, '..', todayFilename);
    
    if (fs.existsSync(todayFilePath)) {
      console.log(` 今日股票清單已存在: ${todayFilename}`);
      return res.json({
        success: true,
        message: '今日股票清單已是最新版本',
        date: today,
        filename: todayFilename
      });
    }
    
    // 嘗試執行 Python 腳本更新股票清單
    console.log(' 執行 Python 股票清單更新腳本...');
    
    const { spawn } = require('child_process');
    // 添加 --force 參數強制更新
    const pythonProcess = spawn('python', ['fetch_stock_list.py', '--force'], {
      cwd: path.join(__dirname),
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let output = '';
    let errorOutput = '';
    
    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        console.log(' Python 腳本執行成功');
        console.log('輸出:', output);
        
        // 檢查檔案是否成功創建
        if (fs.existsSync(todayFilePath)) {
          res.json({
            success: true,
            message: '股票清單更新成功',
            date: today,
            filename: todayFilename,
            output: output
          });
        } else {
          res.status(500).json({
            success: false,
            message: '腳本執行成功但檔案未創建',
            output: output,
            error: errorOutput
          });
        }
      } else {
        console.error(' Python 腳本執行失敗');
        console.error('錯誤輸出:', errorOutput);
        
        res.status(500).json({
          success: false,
          message: 'Python 腳本執行失敗',
          code: code,
          output: output,
          error: errorOutput,
          suggestions: [
            '檢查 Python 是否正確安裝',
            '檢查 FinMind 套件是否安裝',
            '檢查網路連線',
            '檢查 FinMind Token 是否有效'
          ]
        });
      }
    });
    
    // 設定超時（30秒）
    setTimeout(() => {
      pythonProcess.kill();
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          message: '股票清單更新超時',
          timeout: 30000
        });
      }
    }, 30000);
    
  } catch (error) {
    console.error(' 股票清單更新API錯誤:', error);
    res.status(500).json({
      success: false,
      message: '股票清單更新失敗',
      error: error.message
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
  console.log(` 股票代理伺服器啟動於 http://localhost:${PORT}`);
  console.log(` 支援的API端點:`);
  console.log(`   GET /api/stock/:symbol - 獲取股票價格`);
  console.log(`   GET /api/dividend/:symbol - 股息資料（建議手動管理）`);
  console.log(`   GET /api/stock-search?query=XXX - 股票搜尋`);
  console.log(`   GET /health - 健康檢查`);
});