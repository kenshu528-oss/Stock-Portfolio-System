import React, { useState, useRef, useEffect } from 'react';
import Button from './ui/Button';
import Input from './ui/Input';
import { SearchIcon, CheckIcon, XIcon } from './ui/Icons';
import type { StockFormData } from '../types';

// 使用內建圖示替代 lucide-react
const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

interface QuickAddStockProps {
  currentAccount: string;
  onSubmit: (stockData: StockFormData) => void;
  className?: string;
}

interface StockSearchResult {
  symbol: string;
  name: string;
  price: number;
  market: string;
}

const QuickAddStock: React.FC<QuickAddStockProps> = ({
  currentAccount,
  onSubmit,
  className = ''
}) => {
  // 表單狀態
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStock, setSelectedStock] = useState<StockSearchResult | null>(null);
  const [shares, setShares] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  
  // UI 狀態
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState('');
  
  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // 從後端API搜尋股票
  const searchStocks = async (query: string): Promise<StockSearchResult[]> => {
    try {
      // 使用正確的股票API端點
      const response = await fetch(`http://localhost:3001/api/stock/${encodeURIComponent(query)}`);
      
      if (response.ok) {
        const stockData = await response.json();
        // 後端返回單一股票資料，轉換為陣列格式
        return [{
          symbol: stockData.symbol,
          name: stockData.name,
          price: stockData.price,
          market: stockData.market || '台灣'
        }];
      } else if (response.status === 404) {
        // 股票不存在
        return [];
      } else {
        throw new Error(`API錯誤: ${response.status}`);
      }
      
    } catch (error) {
      console.error('搜尋API錯誤:', error);
      
      // API失敗時顯示錯誤
      throw new Error('搜尋服務暫時無法使用，請稍後再試');
    }
  };

  // 處理搜尋
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setError('');
    
    if (query.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    
    // 支援股票代碼和股票名稱搜尋
    const isValidStockCode = /^\d{4,6}[A-Z]?$/i.test(query);
    const isValidStockName = /^[\u4e00-\u9fff\u3400-\u4dbf\w\s]+$/i.test(query) && query.length >= 2;
    
    if (!isValidStockCode && !isValidStockName) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    
    console.log(`QuickAddStock 搜尋: "${query}", 代碼: ${isValidStockCode}, 名稱: ${isValidStockName}`);
    
    setIsSearching(true);
    try {
      const results = await searchStocks(query); // 移除 toUpperCase，保持原始輸入
      setSearchResults(results);
      setShowResults(true);
      
      if (results.length === 0) {
        setError('找不到相關股票，請檢查輸入是否正確');
      }
    } catch (err) {
      console.error('搜尋錯誤:', err);
      setError(err instanceof Error ? err.message : '搜尋失敗，請稍後再試');
      setSearchResults([]);
      setShowResults(false);
    } finally {
      setIsSearching(false);
    }
  };

  // 選擇股票
  const handleSelectStock = (stock: StockSearchResult) => {
    setSelectedStock(stock);
    setSearchQuery(`${stock.symbol} - ${stock.name}`);
    setCostPrice(stock.price.toString());
    setShowResults(false);
  };

  // 清除選擇
  const handleClearSelection = () => {
    setSelectedStock(null);
    setSearchQuery('');
    setCostPrice('');
    setShowResults(false);
    searchInputRef.current?.focus();
  };

  // 驗證表單
  const isFormValid = () => {
    return selectedStock && 
           costPrice && 
           parseFloat(costPrice) > 0 && 
           purchaseDate &&
           currentAccount;
  };

  // 提交表單
  const handleSubmit = () => {
    if (!isFormValid() || !selectedStock) return;
    
    // 如果沒有輸入持股數，預設使用1000
    const finalShares = shares && parseInt(shares) > 0 ? shares : '1000';
    
    const stockData: StockFormData = {
      symbol: selectedStock.symbol,
      name: selectedStock.name,
      price: selectedStock.price,
      shares: finalShares,
      costPrice: costPrice,
      purchaseDate: purchaseDate,
      account: currentAccount
    };
    
    onSubmit(stockData);
    
    // 清空表單
    setSelectedStock(null);
    setSearchQuery('');
    setShares('');
    setCostPrice('');
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setError('');
  };

  // 點擊外部關閉搜尋結果
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (resultsRef.current && !resultsRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 鍵盤事件處理
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && isFormValid()) {
      handleSubmit();
    } else if (event.key === 'Escape') {
      setShowResults(false);
    }
  };

  return (
    <div className={`bg-slate-800 border border-slate-700 rounded-lg p-4 mb-4 ${className}`}>
      <div className="grid grid-cols-12 gap-3 items-end">
        {/* 股票搜尋 - 佔4欄 */}
        <div className="col-span-12 md:col-span-4 relative" ref={resultsRef}>
          <label className="block text-sm font-medium text-slate-400 mb-1">
            股票搜尋
          </label>
          <div className="relative">
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="輸入股票代號或名稱..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pr-20"
            />
            
            {/* 搜尋圖示或載入指示器 */}
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
              {isSearching ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
              ) : selectedStock ? (
                <>
                  <div className="p-1.5 bg-green-600 hover:bg-green-700 rounded-full shadow-lg transition-colors">
                    <CheckIcon size="sm" className="text-white" />
                  </div>
                  <button
                    onClick={handleClearSelection}
                    className="p-1.5 bg-red-600 hover:bg-red-700 rounded-full transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-110"
                    title="清除選擇"
                  >
                    <XIcon size="sm" className="text-white" />
                  </button>
                </>
              ) : (
                <div className="flex items-center">
                  <SearchIcon 
                    size="md" 
                    className="text-slate-400 hover:text-blue-400 transition-colors cursor-pointer" 
                  />
                </div>
              )}
            </div>
          </div>
          
          {/* 搜尋結果下拉選單 */}
          {showResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-slate-800 border border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto z-50 mt-1">
              {searchResults.map((stock) => (
                <div
                  key={stock.symbol}
                  className="p-3 hover:bg-slate-700 cursor-pointer border-b border-slate-700 last:border-b-0"
                  onClick={() => handleSelectStock(stock)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{stock.symbol}</span>
                        <span className="text-slate-300">{stock.name}</span>
                        <span className="text-xs px-2 py-1 bg-slate-600 rounded text-slate-300">
                          {stock.market}
                        </span>
                      </div>
                      <div className="text-sm text-slate-400 mt-1">
                        股價: ${stock.price}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* 無搜尋結果 */}
          {showResults && searchResults.length === 0 && !isSearching && searchQuery.length >= 2 && (
            <div className="absolute top-full left-0 right-0 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50 mt-1">
              <div className="p-4 text-center text-slate-400">
                <SearchIcon />
                <p>找不到相關股票</p>
                <p className="text-sm">請檢查股票代號或名稱是否正確</p>
              </div>
            </div>
          )}
        </div>
        
        {/* 持股數 - 佔2欄 */}
        <div className="col-span-6 md:col-span-2">
          <label className="block text-sm font-medium text-slate-400 mb-1">
            持股數
          </label>
          <Input
            type="number"
            placeholder="預設1000"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            onKeyDown={handleKeyDown}
            min="1"
          />
        </div>
        
        {/* 成本價 - 佔2欄 */}
        <div className="col-span-6 md:col-span-2">
          <label className="block text-sm font-medium text-slate-400 mb-1">
            成本價
          </label>
          <Input
            type="number"
            placeholder="18.50"
            value={costPrice}
            onChange={(e) => setCostPrice(e.target.value)}
            onKeyDown={handleKeyDown}
            step="0.01"
            min="0.01"
          />
        </div>
        
        {/* 購買日期 - 佔2欄 */}
        <div className="col-span-6 md:col-span-2">
          <label className="block text-sm font-medium text-slate-400 mb-1">
            購買日期
          </label>
          <Input
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        
        {/* 新增按鈕 - 佔2欄 */}
        <div className="col-span-6 md:col-span-2">
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid()}
            className={`w-full font-semibold text-white shadow-lg transition-all duration-200 ${
              isFormValid() 
                ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 hover:shadow-xl transform hover:scale-105' 
                : 'bg-slate-600 cursor-not-allowed opacity-50'
            }`}
            aria-label="新增股票"
          >
            <div className="flex items-center justify-center gap-2">
              <PlusIcon />
              <span className="text-sm">新增</span>
            </div>
          </Button>
        </div>
      </div>
      
      {/* 錯誤提示 */}
      {error && (
        <div className="mt-3 p-3 bg-red-900/20 border border-red-700 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
      
      {/* 當前帳戶提示 */}
      <div className="mt-3 text-xs text-slate-500">
        將新增至帳戶：<span className="text-slate-400 font-medium">{currentAccount}</span>
      </div>
    </div>
  );
};

export default QuickAddStock;