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
    } catch (error) {
      console.error('搜尋API錯誤:', error);
    }
    
    return [];
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