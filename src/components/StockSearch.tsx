import React, { useState, useEffect, useRef } from 'react';

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

  // 模擬股票資料（實際應用中會從API獲取）
  const mockStocks: StockSearchResult[] = [
    { symbol: '2330', name: '台積電', market: '台灣', price: 580, change: 5, changePercent: 0.87 },
    { symbol: '2317', name: '鴻海', market: '台灣', price: 105, change: -1, changePercent: -0.94 },
    { symbol: '2454', name: '聯發科', market: '台灣', price: 1020, change: 15, changePercent: 1.49 },
    { symbol: '2412', name: '中華電', market: '台灣', price: 123, change: 0, changePercent: 0 },
    { symbol: '1301', name: '台塑', market: '台灣', price: 95, change: -2, changePercent: -2.06 },
    { symbol: '1303', name: '南亞', market: '台灣', price: 78, change: 1, changePercent: 1.30 },
    { symbol: '2881', name: '富邦金', market: '台灣', price: 65, change: 0.5, changePercent: 0.78 },
    { symbol: '2882', name: '國泰金', market: '台灣', price: 58, change: -0.5, changePercent: -0.85 },
  ];

  // 搜尋函數
  const searchStocks = (searchQuery: string): StockSearchResult[] => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase();
    return mockStocks.filter(stock => 
      stock.symbol.toLowerCase().includes(query) ||
      stock.name.toLowerCase().includes(query)
    ).slice(0, 8); // 限制顯示8個結果
  };

  // 處理輸入變化
  useEffect(() => {
    if (query.trim()) {
      setIsLoading(true);
      // 模擬API延遲
      const timer = setTimeout(() => {
        const searchResults = searchStocks(query);
        setResults(searchResults);
        setShowResults(true);
        setSelectedIndex(-1);
        setIsLoading(false);
      }, 200);

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