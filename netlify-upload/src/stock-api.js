/**
 * 存股紀錄系統 - 股價 API 模組
 * Stock Portfolio System - Stock API Module
 * 
 * 版權所有 (c) 2025 徐國洲
 * Copyright (c) 2025 Xu Guo Zhou
 * 
 * 採用 CC BY-NC 4.0 授權條款 (禁止商業使用)
 * Licensed under CC BY-NC 4.0 License (Non-Commercial)
 */

// 股價 API 整合模組
class StockAPI {
    constructor() {
        this.apiSources = [
            {
                name: 'Yahoo Finance',
                method: this.fetchFromYahoo.bind(this),
                priority: 1
            },
            {
                name: 'Investing.com',
                method: this.fetchFromInvesting.bind(this),
                priority: 2
            },
            {
                name: 'TWSE (台灣證交所)',
                method: this.fetchFromTWSE.bind(this),
                priority: 3
            }
        ];
    }

    async getStockPrice(stockCode) {
        // 按優先順序嘗試各個 API
        const sortedSources = this.apiSources.sort((a, b) => a.priority - b.priority);
        
        for (const source of sortedSources) {
            try {
                console.log(`嘗試從 ${source.name} 獲取 ${stockCode} 股價...`);
                const result = await source.method(stockCode);
                
                if (result && result.price > 0) {
                    console.log(`✅ ${source.name} 成功獲取 ${stockCode}: $${result.price}`);
                    return {
                        price: result.price,
                        source: source.name,
                        timestamp: new Date(),
                        ...result
                    };
                }
            } catch (error) {
                console.warn(`❌ ${source.name} 失敗:`, error.message);
                continue;
            }
        }
        
        throw new Error(`所有 API 來源都無法獲取 ${stockCode} 的股價`);
    }

    async fetchFromYahoo(stockCode) {
        const symbol = this.formatTaiwanSymbol(stockCode);
        
        // 使用 CORS 代理
        const corsProxy = 'https://api.allorigins.win/raw?url=';
        const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
        
        const response = await this.fetchWithTimeout(
            corsProxy + encodeURIComponent(yahooUrl),
            { timeout: 8000 }
        );
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        const result = data.chart?.result?.[0];
        
        if (!result) {
            throw new Error('無效的回應格式');
        }
        
        const meta = result.meta;
        const price = meta.regularMarketPrice || meta.previousClose;
        
        if (!price || price <= 0) {
            throw new Error('無法獲取有效價格');
        }
        
        return {
            price: price,
            currency: meta.currency || 'TWD',
            marketState: meta.marketState,
            previousClose: meta.previousClose,
            change: price - (meta.previousClose || 0),
            changePercent: meta.previousClose ? ((price - meta.previousClose) / meta.previousClose * 100) : 0
        };
    }

    async fetchFromInvesting(stockCode) {
        // Investing.com 的台股資料
        const investingId = this.getInvestingId(stockCode);
        if (!investingId) {
            throw new Error('不支援的股票代碼');
        }
        
        const corsProxy = 'https://api.allorigins.win/raw?url=';
        const investingUrl = `https://api.investing.com/api/financialdata/${investingId}/historical/chart/?period=P1D&interval=PT1M&pointscount=1`;
        
        const response = await this.fetchWithTimeout(
            corsProxy + encodeURIComponent(investingUrl),
            { 
                timeout: 8000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            }
        );
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.data && data.data.length > 0) {
            const latest = data.data[data.data.length - 1];
            return {
                price: latest.close || latest.price,
                volume: latest.volume,
                timestamp: new Date(latest.date)
            };
        }
        
        throw new Error('無資料');
    }

    async fetchFromTWSE(stockCode) {
        // 台灣證交所即時報價 (僅限交易時間)
        const today = new Date();
        const dateStr = today.getFullYear() + 
                       String(today.getMonth() + 1).padStart(2, '0') + 
                       String(today.getDate()).padStart(2, '0');
        
        const twseUrl = `https://www.twse.com.tw/exchangeReport/STOCK_DAY?response=json&date=${dateStr}&stockNo=${stockCode}`;
        
        const response = await this.fetchWithTimeout(twseUrl, { timeout: 10000 });
        
        if (!response.ok) {
            throw new Error(`TWSE API 錯誤: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.stat !== 'OK' || !data.data || data.data.length === 0) {
            throw new Error('TWSE 無資料或股票代碼錯誤');
        }
        
        // 取最新一天的資料
        const latestData = data.data[data.data.length - 1];
        const closePrice = parseFloat(latestData[6].replace(/,/g, '')); // 收盤價
        
        if (isNaN(closePrice) || closePrice <= 0) {
            throw new Error('無效的價格資料');
        }
        
        return {
            price: closePrice,
            volume: parseInt(latestData[1].replace(/,/g, '')),
            high: parseFloat(latestData[4].replace(/,/g, '')),
            low: parseFloat(latestData[5].replace(/,/g, '')),
            open: parseFloat(latestData[3].replace(/,/g, ''))
        };
    }

    formatTaiwanSymbol(stockCode) {
        // 台股代碼轉換為 Yahoo Finance 格式
        if (stockCode.match(/^\d{4}$/)) {
            return `${stockCode}.TW`; // 一般股票
        } else if (stockCode.match(/^00\d+/)) {
            return `${stockCode}.TW`; // ETF
        }
        return `${stockCode}.TW`;
    }

    getInvestingId(stockCode) {
        // 常見台股在 Investing.com 的 ID 對照表
        const idMap = {
            '2330': '2330', // 台積電
            '2317': '2317', // 鴻海
            '2454': '2454', // 聯發科
            '2881': '2881', // 富邦金
            '0050': '0050', // 元大台灣50
            '0056': '0056', // 元大高股息
            // 可以繼續擴充...
        };
        
        return idMap[stockCode];
    }

    async fetchWithTimeout(url, options = {}) {
        const { timeout = 5000, ...fetchOptions } = options;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, {
                ...fetchOptions,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('請求超時');
            }
            throw error;
        }
    }

    // 獲取股票基本資訊
    async getStockInfo(stockCode) {
        try {
            const symbol = this.formatTaiwanSymbol(stockCode);
            const corsProxy = 'https://api.allorigins.win/raw?url=';
            const searchUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${symbol}`;
            
            const response = await this.fetchWithTimeout(
                corsProxy + encodeURIComponent(searchUrl),
                { timeout: 5000 }
            );
            
            if (!response.ok) throw new Error('搜尋 API 錯誤');
            
            const data = await response.json();
            const quote = data.quotes?.[0];
            
            if (quote) {
                return {
                    name: quote.longname || quote.shortname || stockCode,
                    symbol: quote.symbol,
                    exchange: quote.exchange,
                    type: quote.quoteType
                };
            }
            
            throw new Error('找不到股票資訊');
        } catch (error) {
            // 備用方案：使用股票代碼作為名稱
            console.warn('獲取股票資訊失敗，使用預設名稱:', error);
            return {
                name: stockCode,
                symbol: stockCode,
                exchange: 'TPE',
                type: 'EQUITY'
            };
        }
    }
}

// 匯出給主程式使用
window.StockAPI = StockAPI;