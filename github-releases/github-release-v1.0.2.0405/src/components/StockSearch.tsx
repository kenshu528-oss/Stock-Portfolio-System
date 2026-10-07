import React, { useState, useEffect, useRef } from 'react';
import { API_ENDPOINTS } from '../config/api';
import { stockListService } from '../services/stockListService';
import { cloudStockPriceService } from '../services/cloudStockPriceService';

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
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentSearchRef = useRef<string>(''); // 追蹤當前搜尋

  // 從API搜尋股票
  const searchStocks = async (searchQuery: string): Promise<StockSearchResult[]> => {
    if (!searchQuery.trim()) return [];
    
    console.log(`🔍 [StockSearch] 開始搜尋: "${searchQuery}"`);
    
    try {
      // 🔧 使用統一的環境檢測
      const envInfo = stockListService.getEnvironmentInfo();
      console.log(`🌐 [StockSearch] 環境檢查:`, envInfo);
      
      if (envInfo.isDevelopment) {
        // 本機環境：優先使用後端代理
        console.log(`🖥️ [StockSearch] 本機環境，使用後端搜尋: "${searchQuery}"`);
        try {
          const response = await fetch(API_ENDPOINTS.searchStock(searchQuery));
          if (response.ok) {
            const stockDataArray = await response.json();
            
            console.log(`✅ [StockSearch] 後端搜尋成功: ${Array.isArray(stockDataArray) ? stockDataArray.length : 1} 筆結果`);
            
            // 後端返回的是陣列，直接使用
            if (Array.isArray(stockDataArray)) {
              return stockDataArray.map(stockData => ({
                symbol: stockData.symbol,
                name: stockData.name,
                market: stockData.market || '台灣',
                price: stockData.price || 0,
                change: stockData.change || 0,
                changePercent: stockData.changePercent || 0
              }));
            } else {
              // 如果是單一物件（舊格式），包裝成陣列
              return [{
                symbol: stockDataArray.symbol,
                name: stockDataArray.name,
                market: stockDataArray.market || '台灣',
                price: stockDataArray.price || 0,
                change: stockDataArray.change || 0,
                changePercent: stockDataArray.changePercent || 0
              }];
            }
          } else {
            console.log(`❌ [StockSearch] 後端搜尋失敗: HTTP ${response.status}`);
          }
        } catch (backendError) {
          console.log(`❌ [StockSearch] 後端搜尋錯誤，使用前端搜尋:`, backendError);
        }
      }
      
      // 雲端環境或後端失敗：使用前端直接搜尋
      console.log(`📡 [StockSearch] 使用前端直接搜尋: "${searchQuery}"`);
      return await searchStocksDirectly(searchQuery);
      
    } catch (error) {
      console.error('🚨 [StockSearch] 搜尋API錯誤:', error);
      return [];
    }
  };

  // 直接搜尋股票（不依賴後端）
  const searchStocksDirectly = async (query: string): Promise<StockSearchResult[]> => {
    console.log(`🔍 [searchStocksDirectly] 開始前端直接搜尋: "${query}"`);
    
    try {
      // 🔧 使用統一的股票清單服務
      const stockListData = await stockListService.loadStockList();
      
      if (!stockListData || !stockListData.stocks) {
        console.log(`❌ [searchStocksDirectly] 無法載入股票清單`);
        return [];
      }
      
      console.log(`📊 [searchStocksDirectly] 股票清單載入成功: ${stockListData.count} 支股票`);
      
      // 🔧 改善搜尋邏輯：精確匹配優先，大小寫不敏感
      const stocks = Object.entries(stockListData.stocks);
      const filtered = stocks.filter(([symbol, info]) => {
        const queryUpper = query.toUpperCase().trim();
        const symbolUpper = symbol.toUpperCase();
        const queryLower = query.toLowerCase().trim();
        const nameLower = info.name.toLowerCase();
        
        // 1. 精確匹配股票代碼（最高優先級，大小寫不敏感）
        if (symbolUpper === queryUpper) {
          console.log(`✅ [searchStocksDirectly] 精確匹配: ${symbol}`);
          return true;
        }
        
        // 2. 股票代碼開頭匹配（高優先級，大小寫不敏感）
        if (symbolUpper.startsWith(queryUpper)) {
          console.log(`📝 [searchStocksDirectly] 開頭匹配: ${symbol}`);
          return true;
        }
        
        // 3. 中文名稱包含查詢字串（中優先級，大小寫不敏感）
        if (nameLower.includes(queryLower) || info.name.includes(query)) {
          console.log(`🏷️ [searchStocksDirectly] 名稱匹配: ${symbol} - ${info.name}`);
          return true;
        }
        
        // 4. 股票代碼包含查詢字串（低優先級，但排除過短的查詢）
        if (query.length >= 3 && symbolUpper.includes(queryUpper)) {
          console.log(`🔤 [searchStocksDirectly] 代碼包含匹配: ${symbol}`);
          return true;
        }
        
        return false;
      });
      
      console.log(`🎯 [searchStocksDirectly] 過濾後找到 ${filtered.length} 筆匹配結果`);
      
      // 🔧 按匹配優先級排序（大小寫不敏感）
      const sortedFiltered = filtered.sort(([aSymbol], [bSymbol]) => {
        const aSymbolUpper = aSymbol.toUpperCase();
        const bSymbolUpper = bSymbol.toUpperCase();
        const queryUpper = query.toUpperCase().trim();
        
        // 精確匹配排在最前面
        if (aSymbolUpper === queryUpper && bSymbolUpper !== queryUpper) return -1;
        if (bSymbolUpper === queryUpper && aSymbolUpper !== queryUpper) return 1;
        
        // 開頭匹配排在前面
        const aStarts = aSymbolUpper.startsWith(queryUpper);
        const bStarts = bSymbolUpper.startsWith(queryUpper);
        if (aStarts && !bStarts) return -1;
        if (bStarts && !aStarts) return 1;
        
        // 其他按字母順序
        return aSymbolUpper.localeCompare(bSymbolUpper);
      }).slice(0, 10); // 限制結果數量
      
      console.log(`📋 [searchStocksDirectly] 排序後結果:`, sortedFiltered.map(([symbol]) => symbol));
      
      // 🔧 為每個股票獲取即時價格（使用優化的雲端股價服務）
      const stocksWithPrice = await Promise.all(
        sortedFiltered.map(async ([symbol, info]) => {
          console.log(`💰 [searchStocksDirectly] 獲取 ${symbol} 股價...`);
          
          // 使用優化的雲端股價服務
          const priceData = await cloudStockPriceService.getStockPrice(symbol);
          
          return {
            symbol: symbol,
            name: info.name,
            price: priceData?.price || 0,
            market: info.market || '台灣',
            change: priceData?.change || 0,
            changePercent: priceData?.changePercent || 0
          };
        })
      );
      
      console.log(`✅ [searchStocksDirectly] 最終返回 ${stocksWithPrice.length} 筆結果`);
      return stocksWithPrice;
      
    } catch (error) {
      console.error('❌ [searchStocksDirectly] 直接搜尋失敗:', error);
      return [];
    }
  };

  // 直接獲取股價（不依賴後端）- Yahoo Finance 優先
  const getStockPriceDirectly = async (symbol: string): Promise<{price: number, change: number, changePercent: number} | null> => {
    try {
      // 🔧 遵循 api-standards.md：Yahoo Finance 優先，FinMind 備用
      
      // 1. 優先嘗試 Yahoo Finance API
      console.log(`📊 優先嘗試 Yahoo Finance: ${symbol}`);
      const yahooResult = await tryYahooFinanceAPI(symbol);
      if (yahooResult && yahooResult.price > 0) {
        console.log(`✅ Yahoo Finance 成功: ${symbol} = ${yahooResult.price}`);
        return yahooResult;
      }
      
      // 2. Yahoo Finance 失敗，嘗試 FinMind 備用
      console.log(`📊 Yahoo Finance 失敗，嘗試 FinMind 備用: ${symbol}`);
      const finmindResult = await tryFinMindAPI(symbol);
      if (finmindResult && finmindResult.price > 0) {
        console.log(`✅ FinMind 備用成功: ${symbol} = ${finmindResult.price}`);
        return finmindResult;
      }
      
      console.log(`❌ 所有 API 都失敗: ${symbol}`);
      return null;
      
    } catch (error) {
      console.error(`獲取股價失敗 ${symbol}:`, error);
      return null;
    }
  };

  // FinMind API 嘗試（備用）
  const tryFinMindAPI = async (symbol: string): Promise<{price: number, change: number, changePercent: number} | null> => {
    try {
      const today = new Date();
      const startDate = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000); // 14天前
      const finmindPriceUrl = `https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockPrice&data_id=${symbol}&start_date=${startDate.toISOString().split('T')[0]}&end_date=${today.toISOString().split('T')[0]}&token=${import.meta.env.VITE_FINMIND_TOKEN || ''}`;
      
      const finmindResponse = await fetch(finmindPriceUrl, {
        signal: AbortSignal.timeout(8000) // 8秒超時
      });
      
      if (finmindResponse.ok) {
        const finmindData = await finmindResponse.json();
        if (finmindData.data && finmindData.data.length > 0) {
          const latestPrice = finmindData.data[finmindData.data.length - 1];
          const currentPrice = latestPrice.close || 0;
          const previousPrice = finmindData.data.length > 1 ? finmindData.data[finmindData.data.length - 2].close : currentPrice;
          const change = currentPrice - previousPrice;
          const changePercent = previousPrice > 0 ? (change / previousPrice) * 100 : 0;
          
          console.log(`✅ ${symbol} FinMind 最新價格: ${currentPrice} (${latestPrice.date})`);
          return {
            price: currentPrice,
            change: change,
            changePercent: changePercent
          };
        }
      }
      return null;
    } catch (error) {
      console.error(`FinMind API 失敗 ${symbol}:`, error);
      // 如果是 402 錯誤，記錄但不影響功能
      if (error instanceof Error && error.message.includes('402')) {
        console.log(`💡 FinMind API 需要付費，已跳過`);
      }
      return null;
    }
  };

  // Yahoo Finance API 調用函數（僅在必要時使用，快速失敗）
  const tryYahooFinanceAPI = async (symbol: string): Promise<{ price: number; change: number; changePercent: number } | null> => {
    try {
      // 智能判斷股票代碼後綴
      const getCorrectSymbol = (stockSymbol: string) => {
        if (stockSymbol.includes('.')) return stockSymbol; // 已有後綴
        
        const code = parseInt(stockSymbol.substring(0, 4));
        const isBondETF = /^00\d{2,3}B$/i.test(stockSymbol);
        
        if (isBondETF) {
          // 債券 ETF：優先 .TWO
          return `${stockSymbol}.TWO`;
        } else if (code >= 3000 && code <= 8999) {
          // 上櫃股票（3000-8999）：使用 .TWO
          return `${stockSymbol}.TWO`;
        } else {
          // 上市股票（1000-2999）：使用 .TW
          return `${stockSymbol}.TW`;
        }
      };

      // 嘗試多個 CORS 代理服務（僅作為備用，快速失敗）
      const proxyServices = [
        'https://api.allorigins.win/get?url=',
        'https://cors-anywhere.herokuapp.com/',
        'https://api.codetabs.com/v1/proxy?quest='
      ];
      
      for (const proxyService of proxyServices) {
        try {
          const yahooSymbol = getCorrectSymbol(symbol);
          const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`;
          const proxyUrl = proxyService.includes('allorigins') 
            ? `${proxyService}${encodeURIComponent(yahooUrl)}`
            : `${proxyService}${yahooUrl}`;
          
          const proxyResponse = await fetch(proxyUrl, {
            signal: AbortSignal.timeout(3000) // 3秒超時，快速失敗
          });
          
          if (proxyResponse.ok) {
            let yahooData;
            if (proxyService.includes('allorigins')) {
              const proxyData = await proxyResponse.json();
              yahooData = JSON.parse(proxyData.contents);
            } else {
              yahooData = await proxyResponse.json();
            }
            
            const result = yahooData?.chart?.result?.[0];
            if (result?.meta) {
              const currentPrice = result.meta.regularMarketPrice || 0;
              const previousClose = result.meta.previousClose || 0;
              const change = currentPrice - previousClose;
              const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;
              
              console.log(`✅ ${symbol} (${yahooSymbol}) Yahoo Finance 價格: ${currentPrice}`);
              return {
                price: currentPrice,
                change: change,
                changePercent: changePercent
              };
            }
          }
        } catch (proxyError) {
          // 快速失敗，不輸出詳細錯誤
          continue;
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  // 處理輸入變化
  useEffect(() => {
    console.log(`🎯 [useEffect] 搜尋輸入變化: "${query}"`);
    
    // 清除之前的搜尋計時器
    if (searchTimeoutRef.current) {
      console.log(`⏰ [useEffect] 清除之前的搜尋計時器`);
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.trim()) {
      setIsLoading(true);
      currentSearchRef.current = query; // 記錄當前搜尋
      console.log(`📝 [useEffect] 設定當前搜尋: "${query}"`);
      
      // 使用真實API搜尋
      const delay = query.length >= 5 ? 200 : 300; // 較長的查詢延遲更短
      console.log(`⏱️ [useEffect] 設定搜尋延遲: ${delay}ms`);
      
      searchTimeoutRef.current = setTimeout(async () => {
        const searchQuery = query.trim();
        console.log(`🚀 [useEffect] 開始執行搜尋: "${searchQuery}"`);
        
        // 檢查是否還是當前的搜尋（避免過期的搜尋結果覆蓋新的）
        if (currentSearchRef.current !== searchQuery) {
          console.log(`⚠️ [useEffect] 搜尋已過期，跳過: "${searchQuery}" (當前: "${currentSearchRef.current}")`);
          return;
        }
        
        try {
          const searchResults = await searchStocks(searchQuery);
          console.log(`📊 [useEffect] 搜尋結果: ${searchResults.length} 筆`);
          console.log(`📋 [useEffect] 搜尋結果詳情:`, searchResults.map(s => s.symbol));
          
          // 再次檢查是否還是當前的搜尋
          if (currentSearchRef.current !== searchQuery) {
            console.log(`⚠️ [useEffect] 搜尋結果已過期，跳過更新: "${searchQuery}"`);
            return;
          }
          
          // 🔧 額外的去重保護：確保沒有重複的股票代碼
          const uniqueResults = searchResults.filter((stock, index, self) => 
            index === self.findIndex(s => s.symbol === stock.symbol)
          );
          
          if (uniqueResults.length !== searchResults.length) {
            console.log(`🔄 [useEffect] 去重: ${searchResults.length} → ${uniqueResults.length} 筆`);
          }
          
          setResults(uniqueResults);
          setShowResults(true);
          setSelectedIndex(-1);
          console.log(`✅ [useEffect] 搜尋完成，顯示 ${uniqueResults.length} 筆結果`);
        } catch (error) {
          // 只有當前搜尋才處理錯誤
          if (currentSearchRef.current === searchQuery) {
            console.error('🚨 [useEffect] 搜尋失敗:', error);
            setResults([]);
          }
        } finally {
          // 只有當前搜尋才更新載入狀態
          if (currentSearchRef.current === searchQuery) {
            console.log(`🏁 [useEffect] 搜尋結束，關閉載入狀態`);
            setIsLoading(false);
          }
        }
      }, delay); // 動態延遲以減少API調用
    } else {
      console.log(`🧹 [useEffect] 清空搜尋結果`);
      setResults([]);
      setShowResults(false);
      setSelectedIndex(-1);
      setIsLoading(false);
      currentSearchRef.current = '';
    }

    // 清理函數
    return () => {
      if (searchTimeoutRef.current) {
        console.log(`🧹 [useEffect cleanup] 清理搜尋計時器`);
        clearTimeout(searchTimeoutRef.current);
      }
    };
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
        {sign}{(change || 0).toFixed(2)} ({sign}{(changePercent || 0).toFixed(2)}%)
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
              key={`${stock.symbol}-${index}`}
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
                      ${(stock.price || 0).toFixed(2)}
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