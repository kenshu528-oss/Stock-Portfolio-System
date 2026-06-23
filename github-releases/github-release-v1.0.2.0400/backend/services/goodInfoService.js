// GoodInfo 爬蟲服務 - 專門處理債券 ETF 配息資料
const axios = require('axios');
const cheerio = require('cheerio');

class GoodInfoService {
  /**
   * 判斷是否為債券 ETF
   */
  static isBondETF(symbol) {
    // 債券 ETF 通常以 B 結尾，例如 00679B, 00687B
    return /^00\d{2,3}B$/i.test(symbol);
  }

  /**
   * 從 GoodInfo 獲取配息資料
   */
  static async getDividendData(symbol) {
    try {
      console.log(`🔍 GoodInfo: 開始獲取 ${symbol} 配息資料...`);
      
      // 構建 URL - 使用配息政策頁面
      const url = `https://goodinfo.tw/tw/StockDividendPolicy.asp?STOCK_ID=${symbol}`;
      
      // 第一次請求 - 模擬真實瀏覽器
      const response = await axios.get(url, {
        timeout: 20000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Cache-Control': 'max-age=0',
          'Referer': 'https://goodinfo.tw/tw/'
        },
        maxRedirects: 5,
        validateStatus: (status) => status < 500
      });

      if (response.status !== 200) {
        console.log(`❌ GoodInfo: ${symbol} HTTP ${response.status}`);
        return null;
      }

      let html = response.data;
      console.log(`📄 GoodInfo: ${symbol} 第一次請求 HTML 長度 ${html.length}`);

      // 檢查是否需要處理 JavaScript 重定向或驗證
      if (html.length < 5000 || html.includes('window.location') || html.includes('請稍候')) {
        console.log(`🔄 GoodInfo: ${symbol} 檢測到重定向或驗證，等待 1 秒後重試...`);
        
        // 等待 1 秒後重試
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const retryResponse = await axios.get(url, {
          timeout: 20000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html',
            'Accept-Language': 'zh-TW,zh;q=0.9',
            'Referer': 'https://goodinfo.tw/tw/',
            'Cookie': response.headers['set-cookie']?.join('; ') || ''
          }
        });
        
        html = retryResponse.data;
        console.log(`📄 GoodInfo: ${symbol} 重試後 HTML 長度 ${html.length}`);
      }

      // 如果 HTML 還是太短，可能是被擋了
      if (html.length < 5000) {
        console.log(`⚠️ GoodInfo: ${symbol} HTML 內容過短 (${html.length} bytes)，可能被反爬蟲機制阻擋`);
        return null;
      }

      // 解析 HTML
      const dividends = this.parseHTML(html, symbol);
      
      if (dividends && dividends.length > 0) {
        console.log(`✅ GoodInfo: ${symbol} 成功獲取 ${dividends.length} 筆配息記錄`);
        return {
          symbol,
          dividends: dividends.sort((a, b) => new Date(b.exDate) - new Date(a.exDate))
        };
      }

      console.log(`ℹ️ GoodInfo: ${symbol} 無配息資料`);
      return null;

    } catch (error) {
      console.error(`❌ GoodInfo: ${symbol} 錯誤 -`, error.message);
      return null;
    }
  }

  /**
   * 解析 GoodInfo HTML
   */
  static parseHTML(html, symbol) {
    try {
      const $ = cheerio.load(html);
      const dividends = [];

      console.log(`🔍 GoodInfo: 開始解析 ${symbol} HTML...`);

      // 尋找配息表格 - GoodInfo 使用特定的 table id
      const tables = $('table');
      console.log(`📊 GoodInfo: 找到 ${tables.length} 個表格`);

      tables.each((tableIndex, table) => {
        const $table = $(table);
        
        // 檢查表格是否包含配息相關標題
        const tableText = $table.text();
        const hasDividendKeyword = /除息|配息|股利|現金|配發/.test(tableText);
        
        if (!hasDividendKeyword) {
          return; // 跳過不相關的表格
        }

        console.log(`✓ GoodInfo: 表格 ${tableIndex + 1} 包含配息關鍵字`);

        // 解析表格行
        const rows = $table.find('tr');
        console.log(`📋 GoodInfo: 表格有 ${rows.length} 行`);

        rows.each((rowIndex, row) => {
          const $row = $(row);
          const cells = $row.find('td');
          
          if (cells.length < 6) {
            return; // 跳過欄位不足的行
          }

          // 提取欄位文字
          const cellTexts = [];
          cells.each((i, cell) => {
            const text = $(cell).text().trim().replace(/\s+/g, ' ');
            cellTexts.push(text);
          });

          // 嘗試解析配息記錄
          // GoodInfo 表格格式通常為：
          // [年度, 季度, 除息日, 現金股利, 股票股利, ...]
          const dividend = this.parseDividendRow(cellTexts, symbol);
          
          if (dividend) {
            dividends.push(dividend);
            console.log(`✓ GoodInfo: 解析到配息 ${dividend.exDate} $${dividend.amount}`);
          }
        });
      });

      // 去除重複記錄
      const uniqueDividends = this.removeDuplicates(dividends);
      console.log(`📊 GoodInfo: 最終 ${uniqueDividends.length} 筆配息記錄`);

      return uniqueDividends;

    } catch (error) {
      console.error(`❌ GoodInfo: HTML 解析失敗 -`, error.message);
      return [];
    }
  }

  /**
   * 解析單行配息資料
   */
  static parseDividendRow(cells, symbol) {
    try {
      // 嘗試不同的欄位組合
      for (let i = 0; i < cells.length - 3; i++) {
        // 尋找年份欄位 (YYYY 格式)
        const yearMatch = cells[i].match(/^(\d{4})$/);
        if (!yearMatch) continue;

        const year = parseInt(yearMatch[1]);
        if (year < 2000 || year > 2030) continue;

        // 尋找除息日期 (可能在後面幾個欄位)
        for (let j = i + 1; j < Math.min(i + 5, cells.length); j++) {
          const exDate = this.parseDate(cells[j]);
          if (!exDate) continue;

          // 尋找現金股利金額 (可能在後面幾個欄位)
          for (let k = j + 1; k < Math.min(j + 5, cells.length); k++) {
            const amount = this.parseAmount(cells[k]);
            if (amount <= 0 || amount > 100) continue; // 合理範圍檢查

            // 成功解析到完整記錄
            return {
              exDate: exDate.toISOString().split('T')[0],
              amount: amount,
              cashDividendPerShare: amount,
              type: 'cash',
              year: year,
              quarter: this.getQuarter(exDate)
            };
          }
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * 解析日期
   */
  static parseDate(dateStr) {
    try {
      if (!dateStr || dateStr === '-' || dateStr === '') return null;

      // 移除非數字和斜線字符
      const clean = dateStr.replace(/[^\d\/\-]/g, '');

      // 格式 1: YYYY/MM/DD
      let match = clean.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
      if (match) {
        const [, year, month, day] = match;
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }

      // 格式 2: YY/MM/DD
      match = clean.match(/^(\d{2})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
      if (match) {
        const [, yy, month, day] = match;
        const year = parseInt(yy) + (parseInt(yy) > 50 ? 1900 : 2000);
        return new Date(year, parseInt(month) - 1, parseInt(day));
      }

      // 格式 3: YYYYMMDD
      match = clean.match(/^(\d{4})(\d{2})(\d{2})$/);
      if (match) {
        const [, year, month, day] = match;
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * 解析金額
   */
  static parseAmount(amountStr) {
    try {
      if (!amountStr || amountStr === '-' || amountStr === '') return 0;

      // 移除非數字和小數點字符
      const clean = amountStr.replace(/[^\d\.]/g, '');
      const amount = parseFloat(clean);

      return isNaN(amount) ? 0 : amount;
    } catch (error) {
      return 0;
    }
  }

  /**
   * 獲取季度
   */
  static getQuarter(date) {
    const month = date.getMonth() + 1;
    return Math.ceil(month / 3);
  }

  /**
   * 去除重複記錄
   */
  static removeDuplicates(dividends) {
    const seen = new Set();
    return dividends.filter(dividend => {
      const key = `${dividend.exDate}_${dividend.amount}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}

module.exports = GoodInfoService;
