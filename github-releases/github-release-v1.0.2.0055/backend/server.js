const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// 啟用CORS
app.use(cors());
app.use(express.json());

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
    let yahooSymbol = `${symbol}.TW`;
    
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
      
      const stockName = meta.longName || meta.shortName;
      
      if (!stockName) {
        return null;
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
    
    // 優先使用台灣證交所 API
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
    
    // FinMind API 端點
    const currentYear = new Date().getFullYear();
    const startDate = `${currentYear - 3}-01-01`; // 查詢近3年資料
    
    const url = `https://api.finmindtrade.com/api/v4/data`;
    const params = new URLSearchParams({
      dataset: 'TaiwanStockDividendResult',
      data_id: symbol,
      start_date: startDate,
      token: '' // 免費使用，可以不填 token 但有限制
    });
    
    const response = await axios.get(`${url}?${params}`, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });
    
    if (response.status === 200 && response.data) {
      const data = response.data;
      console.log(`FinMind API 回應:`, data);
      
      if (data.status === 200 && data.data && data.data.length > 0) {
        const dividends = data.data
          .filter(item => parseFloat(item.stock_and_cache_dividend) > 0) // 使用正確的欄位名稱
          .map(item => ({
            exDate: item.date, // 除息日
            amount: parseFloat(item.stock_and_cache_dividend), // 現金股利
            type: 'cash',
            year: new Date(item.date).getFullYear(),
            quarter: Math.ceil((new Date(item.date).getMonth() + 1) / 3)
          }))
          .sort((a, b) => new Date(b.exDate) - new Date(a.exDate)); // 按日期排序
        
        if (dividends.length > 0) {
          console.log(`✅ FinMind成功獲取 ${symbol} 的 ${dividends.length} 筆股息記錄`);
          return {
            symbol,
            dividends: dividends
          };
        }
      }
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
    let yahooSymbol = `${symbol}.TW`;
    
    // 使用Yahoo Finance的股息API
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?range=2y&interval=1d&events=div`;
    
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (response.data?.chart?.result?.[0]?.events?.dividends) {
      const dividends = response.data.chart.result[0].events.dividends;
      const dividendArray = [];
      
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
      
      return {
        symbol,
        dividends: dividendArray
      };
    }
    
    return null;
  } catch (error) {
    console.error(`Yahoo股息API錯誤 ${symbol}:`, error.message);
    return null;
  }
}

// API路由：獲取股息資料 - 優先使用FinMind API
app.get('/api/dividend/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const upperSymbol = symbol.toUpperCase();
    
    console.log(`獲取 ${upperSymbol} 股息資料...`);
    
    const cacheKey = `dividend_${upperSymbol}`;
    const cached = stockCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION * 10) { // 股息資料快取10分鐘
      return res.json(cached.data);
    }
    
    let dividendData = null;
    
    // 方法1: 優先使用FinMind（台股專用，資料最準確）
    console.log(`${upperSymbol} 優先嘗試FinMind API`);
    dividendData = await getFinMindDividendData(upperSymbol);
    
    // 方法2: 如果FinMind沒有資料，嘗試其他API
    if (!dividendData || dividendData.dividends.length === 0) {
      if (upperSymbol.match(/^00\d{2,3}[A-Z]?$/)) {
        console.log(`FinMind無資料，${upperSymbol} 是ETF，嘗試Yahoo Finance`);
        dividendData = await getYahooDividendData(upperSymbol);
        
        // 如果Yahoo Finance也沒有資料，再嘗試GoodInfo
        if (!dividendData || dividendData.dividends.length === 0) {
          console.log(`Yahoo Finance無ETF股息資料，嘗試GoodInfo: ${upperSymbol}`);
          dividendData = await getGoodInfoDividendData(upperSymbol);
        }
      } else {
        // 一般股票嘗試GoodInfo
        console.log(`FinMind無資料，嘗試GoodInfo: ${upperSymbol}`);
        dividendData = await getGoodInfoDividendData(upperSymbol);
        
        // 如果GoodInfo沒有資料，回退到Yahoo Finance
        if (!dividendData || dividendData.dividends.length === 0) {
          console.log(`GoodInfo無股息資料，嘗試Yahoo Finance: ${upperSymbol}`);
          dividendData = await getYahooDividendData(upperSymbol);
        }
      }
    }
    
    if (dividendData && dividendData.dividends.length > 0) {
      stockCache.set(cacheKey, {
        data: dividendData,
        timestamp: Date.now()
      });
      res.json(dividendData);
    } else {
      res.status(404).json({
        error: 'No dividend data found',
        message: `找不到股票代碼 ${upperSymbol} 的股息資料`,
        suggestions: [
          '該股票可能沒有配息記錄',
          '或者是新上市股票尚無股息資料',
          '可使用手動股息管理功能添加'
        ]
      });
    }
    
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
  console.log(`   GET /api/dividend/:symbol - 股息資料（建議手動管理）`);
  console.log(`   GET /health - 健康檢查`);
});