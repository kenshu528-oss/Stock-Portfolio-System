import React, { useState, useEffect, useRef } from 'react';
import { API_ENDPOINTS } from '../config/api';

interface StockSearchResult {
  symbol: string;
  name: string;
  market: string;
  price?: number;
  change?: number;
  changePercent?: number;
}

interface StockSearchProps {
  onSelect: (stock: StockSearchResult) => void;
  placeholder?: string;
  className?: string;
}

const StockSearch: React.FC<StockSearchProps> = ({
  onSelect,
  placeholder = "搜尋台股美股代號/名稱",
  className = ""
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // 從API搜尋股票
  const searchStocks = async (searchQuery: string): Promise<StockSearchResult[]> => {
    if (!searchQuery.trim()) return [];
    
    try {
      // 檢查是否為 GitHub Pages 環境
      const isGitHubPages = window.location.hostname.includes('github.io') || 
                           window.location.hostname.includes('github.com');
      
      if (isGitHubPages) {
        // GitHub Pages 環境：使用直接 API 調用
        return await searchStocksDirectly(searchQuery);
      } else {
        // 其他環境：使用後端代理
        const response = await fetch(API_ENDPOINTS.searchStock(searchQuery));
        if (response.ok) {
          const stockData = await response.json();
          return [{
            symbol: stockData.symbol,
            name: stockData.name,
            market: stockData.market || '台灣',
            price: stockData.price,
            change: stockData.change,
            changePercent: stockData.changePercent
          }];
        }
      }
    } catch (error) {
      console.error('搜尋API錯誤:', error);
      // 如果後端搜尋失敗，嘗試直接搜尋
      return await searchStocksDirectly(searchQuery);
    }
    
    return [];
  };

  // 直接搜尋股票（不依賴後端）
  const searchStocksDirectly = async (query: string): Promise<StockSearchResult[]> => {
    try {
      // 使用 FinMind API 搜尋台股
      const finmindUrl = `https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockInfo&token=`;
      const response = await fetch(finmindUrl);
      
      if (response.ok) {
        const data = await response.json();
        if (data.data && Array.isArray(data.data)) {
          // 過濾符合查詢條件的股票
          const filtered = data.data.filter((stock: any) => {
            const symbol = stock.stock_id || '';
            const name = stock.stock_name || '';
            
            // 支援股票代碼或中文名稱搜尋
            return symbol.includes(query) || name.includes(query);
          }).slice(0, 10); // 限制結果數量
          
          // 為每個股票獲取即時價格
          const stocksWithPrice = await Promise.all(
            filtered.map(async (stock: any) => {
              const priceData = await getStockPriceDirectly(stock.stock_id);
              return {
                symbol: stock.stock_id,
                name: stock.stock_name,
                price: priceData?.price || 0,
                market: '台灣',
                change: priceData?.change || 0,
                changePercent: priceData?.changePercent || 0
              };
            })
          );
          
          return stocksWithPrice;
        }
      }
      
      // 如果 FinMind 失敗，返回空陣列
      return [];
      
    } catch (error) {
      console.error('直接搜尋失敗:', error);
      return [];
    }
  };

  // 直接獲取股價（不依賴後端）
  const getStockPriceDirectly = async (symbol: string): Promise<{price: number, change: number, changePercent: number} | null> => {
    try {
      // 使用 FinMind 股價 API（避免 CORS 問題）
      const today = new Date();
      const startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000); // 7天前
      const finmindPriceUrl = `https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockPrice&data_id=${symbol}&start_date=${startDate.toISOString().split('T')[0]}&end_date=${today.toISOString().split('T')[0]}&token=`;
      
      const finmindResponse = await fetch(finmindPriceUrl);
      
      if (finmindResponse.ok) {
        const finmindData = await finmindResponse.json();
        if (finmindData.data && finmindData.data.length > 0) {
          const latestPrice = finmindData.data[finmindData.data.length - 1];
          const currentPrice = latestPrice.close || 0;
          const previousPrice = finmindData.data.length > 1 ? finmindData.data[finmindData.data.length - 2].close : currentPrice;
          const change = currentPrice - previousPrice;
          const changePercent = previousPrice > 0 ? (change / previousPrice) * 100 : 0;
          
          return {
            price: currentPrice,
            change: change,
            changePercent: changePercent
          };
        }
      }
      
      // 如果 FinMind 失敗，嘗試使用 CORS 代理調用 Yahoo Finance
      try {
        const yahooSymbol = symbol.includes('.TW') ? symbol : `${symbol}.TW`;
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`)}`;
        
        const proxyResponse = await fetch(proxyUrl);
        if (proxyResponse.ok) {
          const proxyData = await proxyResponse.json();
          const yahooData = JSON.parse(proxyData.contents);
          const result = yahooData?.chart?.result?.[0];
          if (result?.meta) {
            const currentPrice = result.meta.regularMarketPrice || 0;
            const previousClose = result.meta.previousClose || 0;
            const change = currentPrice - previousClose;
            const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;
            
            return {
              price: currentPrice,
              change: change,
              changePercent: changePercent
            };
          }
        }
      } catch (proxyError) {
        console.warn(`CORS 代理調用失敗: ${proxyError}`);
      }
      
      return null;
    } catch (error) {
      console.error(`獲取 ${symbol} 股價失敗:`, error);
      return null;
    }
  };

  // 處理輸入變化
  useEffect(() => {
    if (query.trim()) {
      setIsLoading(true);
      // 使用真實API搜尋
      const timer = setTimeout(async () => {
        try {
          const searchResults = await searchStocks(query);
          setResults(searchResults);
          setShowResults(true);
          setSelectedIndex(-1);
        } catch (error) {
          console.error('搜尋失敗:', error);
          setResults([]);
        } finally {
          setIsLoading(false);
        }
      }, 300); // 增加延遲以減少API調用

      return () => clearTimeout(timer);
    } else {
      setResults([]);
      setShowResults(false);
      setSelectedIndex(-1);
    }
  }, [query]);

  // 處理鍵盤導航
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showResults || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : results.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowResults(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // 處理選擇
  const handleSelect = (stock: StockSearchResult) => {
    onSelect(stock);
    setQuery('');
    setShowResults(false);
    setSelectedIndex(-1);
  };

  // 處理點擊外部關閉
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        resultsRef.current &&
        !resultsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 格式化價格變化
  const formatChange = (change: number, changePercent: number) => {
    const sign = change > 0 ? '+' : '';
    const colorClass = change > 0 ? 'text-green-400' : change < 0 ? 'text-red-400' : 'text-slate-400';
    
    return (
      <span className={`text-sm ${colorClass}`}>
        {sign}{change.toFixed(2)} ({sign}{changePercent.toFixed(2)}%)
      </span>
    );
  };

  return (
    <div className={`relative ${className}`}>
      {/* 搜尋輸入框 */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) {
              setShowResults(true);
            }
          }}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-3 bg-slate-800 border-2 border-blue-500 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-400 transition-colors"
        />
        
        {/* 清除按鈕 */}
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setShowResults(false);
              inputRef.current?.focus();
            }}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        
        {/* 載入指示器 */}
        {isLoading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
          </div>
        )}
      </div>

      {/* 搜尋結果 */}
      {showResults && results.length > 0 && (
        <div
          ref={resultsRef}
          className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-h-80 overflow-y-auto"
        >
          {results.map((stock, index) => (
            <div
              key={`${stock.symbol}-${stock.market}`}
              onClick={() => handleSelect(stock)}
              className={`px-4 py-3 cursor-pointer border-b border-slate-700 last:border-b-0 transition-colors ${
                index === selectedIndex
                  ? 'bg-slate-700'
                  : 'hover:bg-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-blue-400 font-mono font-medium">
                      {stock.symbol}
                    </span>
                    <span className="text-white">
                      {stock.name}
                    </span>
                  </div>
                  <div className="text-sm text-slate-400 mt-1">
                    {stock.market}
                  </div>
                </div>
                
                {stock.price && (
                  <div className="text-right">
                    <div className="text-white font-medium">
                      ${stock.price.toFixed(2)}
                    </div>
                    {stock.change !== undefined && stock.changePercent !== undefined && (
                      <div>
                        {formatChange(stock.change, stock.changePercent)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 無結果提示 */}
      {showResults && !isLoading && query.trim() && results.length === 0 && (
        <div
          ref={resultsRef}
          className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl p-4 text-center text-slate-400"
        >
          找不到相關股票，請嘗試其他關鍵字
        </div>
      )}
    </div>
  );
};

export default StockSearch;