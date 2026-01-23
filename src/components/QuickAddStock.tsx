import React, { useState, useRef, useEffect, useCallback } from 'react';
import Button from './ui/Button';
import Input from './ui/Input';
import { SearchIcon, CheckIcon, XIcon } from './ui/Icons';
import type { StockFormData, StockSearchResult } from '../types';
import { API_ENDPOINTS, shouldUseBackendProxy } from '../config/api';

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
  const currentRequestRef = useRef<AbortController | null>(null); // 🔧 添加請求控制器

  // 搜尋本地股票清單
  const searchLocalStockList = (query: string, stocks: Record<string, any>): StockSearchResult[] => {
    const queryUpper = query.toUpperCase();
    const results: StockSearchResult[] = [];
    
    // 搜尋股票代碼和名稱
    for (const [symbol, info] of Object.entries(stocks)) {
      const symbolUpper = symbol.toUpperCase();
      const name = info.name || '';
      
      // 精確匹配股票代碼
      if (symbolUpper === queryUpper) {
        results.push({
          symbol,
          name,
          price: 0, // 本地清單沒有價格資訊
          market: info.market || '台股'
        });
        continue;
      }
      
      // 股票代碼開頭匹配
      if (symbolUpper.startsWith(queryUpper)) {
        results.push({
          symbol,
          name,
          price: 0,
          market: info.market || '台股'
        });
        continue;
      }
      
      // 名稱包含匹配
      if (name.includes(query)) {
        results.push({
          symbol,
          name,
          price: 0,
          market: info.market || '台股'
        });
      }
    }
    
    // 排序：精確匹配 > 開頭匹配 > 名稱匹配
    return results.slice(0, 10); // 限制結果數量
  };

  // 從後端API搜尋股票
  const searchStocks = async (query: string): Promise<StockSearchResult[]> => {
    console.log(`🔍 [QuickAddStock] 開始搜尋: "${query}"`);
    
    // 🔧 取消之前的請求
    if (currentRequestRef.current) {
      console.log(`🚫 [QuickAddStock] 取消之前的請求`);
      currentRequestRef.current.abort();
    }
    
    // 🔧 創建新的請求控制器
    const abortController = new AbortController();
    currentRequestRef.current = abortController;
    
    try {
      // 檢查是否應該使用後端代理
      const useBackend = shouldUseBackendProxy();
      console.log(`🌐 [QuickAddStock] 環境檢查: useBackend=${useBackend}`);
      
      if (useBackend) {
        // 使用後端代理
        const endpoint = API_ENDPOINTS.searchStock(query);
        console.log(`🖥️ [QuickAddStock] 使用後端搜尋，端點: ${endpoint}`);
        
        if (!endpoint) {
          console.log(`❌ [QuickAddStock] 後端端點為空，使用前端直接搜尋`);
          const directResults = await searchStocksDirectly(query);
          return directResults;
        }
        
        console.log(`📡 [QuickAddStock] 發送後端請求: ${endpoint}`);
        const response = await fetch(endpoint, {
          signal: abortController.signal // 🔧 添加請求取消信號
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ [QuickAddStock] 後端搜尋成功:`, data);
          
          // 後端返回陣列格式，直接使用
          if (Array.isArray(data)) {
            const results = data.map((stock) => ({
              symbol: stock.symbol,
              name: stock.name,
              price: stock.price || 0,
              market: stock.market || '台灣'
            }));
            console.log(`📊 [QuickAddStock] 處理後端結果: ${results.length} 筆`);
            console.log(`📋 [QuickAddStock] 後端結果詳情:`, results.map(r => r.symbol));
            return results;
          } else {
            // 如果是單一物件，轉換為陣列
            const result = [{
              symbol: data.symbol,
              name: data.name,
              price: data.price || 0,
              market: data.market || '台灣'
            }];
            console.log(`📊 [QuickAddStock] 處理後端單一結果:`, result);
            return result;
          }
        } else if (response.status === 404) {
          // 股票不存在
          console.log(`❌ [QuickAddStock] 後端返回 404，股票不存在`);
          return [];
        } else {
          console.log(`❌ [QuickAddStock] 後端搜尋失敗: HTTP ${response.status}`);
          throw new Error(`API錯誤: ${response.status}`);
        }
      } else {
        console.log(`🌐 [QuickAddStock] GitHub Pages 環境，使用本地股票清單搜尋`);
        
        // 在 GitHub Pages 環境下，使用本地股票清單搜尋
        try {
          // 嘗試載入本地股票清單
          const stockListResponse = await fetch('/public/stock_list.json');
          if (stockListResponse.ok) {
            const stockListData = await stockListResponse.json();
            console.log(`📋 [QuickAddStock] 載入本地股票清單成功: ${stockListData.count} 支股票`);
            
            // 搜尋匹配的股票
            const results = searchLocalStockList(query, stockListData.stocks);
            console.log(`🔍 [QuickAddStock] 本地搜尋結果: ${results.length} 筆`);
            return results;
          } else {
            console.log(`❌ [QuickAddStock] 無法載入本地股票清單，返回空結果`);
            return [];
          }
        } catch (error) {
          console.error('🚨 [QuickAddStock] 本地股票清單搜尋失敗:', error);
          return [];
        }
      }
      
    } catch (error) {
      // 🔧 檢查是否為請求取消
      if (error instanceof Error && error.name === 'AbortError') {
        console.log(`🚫 [QuickAddStock] 請求已取消: "${query}"`);
        return []; // 請求被取消，返回空結果
      }
      
      console.error('🚨 [QuickAddStock] 搜尋API錯誤:', error);
      
      // 🔧 修復：與 StockSearch 保持一致，不自動觸發備用搜尋
      if (window.location.hostname.includes('github.io') || 
          window.location.hostname.includes('github.com')) {
        console.log(`🌐 [QuickAddStock] GitHub Pages 環境，使用前端直接搜尋`);
        const directResults = await searchStocksDirectly(query);
        return directResults;
      } else {
        console.log(`🖥️ [QuickAddStock] 本機環境，後端搜尋失敗，返回空結果`);
        return []; // 本機環境下，後端失敗就返回空結果
      }
    } finally {
      // 🔧 清理請求控制器
      if (currentRequestRef.current === abortController) {
        currentRequestRef.current = null;
      }
    }
  };

  // 直接搜尋股票（不依賴後端）- 保留模糊匹配，Yahoo Finance 優先獲取股價
  const searchStocksDirectly = async (query: string): Promise<StockSearchResult[]> => {
    console.log(`🔍 [QuickAddStock] 開始前端直接搜尋: "${query}"`);
    
    try {
      // 🔧 遵循 api-standards.md：Yahoo Finance 優先，FinMind 備用
      // 🔧 修復搜尋邏輯：與後端保持一致
      
      console.log(`🔍 [QuickAddStock] FinMind 搜尋股票列表: ${query}`);
      try {
        const finmindUrl = `https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockInfo&token=`;
        const response = await fetch(finmindUrl);
        
        if (response.ok) {
          const data = await response.json();
          if (data.data && Array.isArray(data.data)) {
            console.log(`📊 [QuickAddStock] FinMind 返回 ${data.data.length} 筆股票資料`);
            
            // 🔧 修復：使用與後端一致的智能匹配邏輯
            const queryUpper = query.toUpperCase().trim();
            const queryLower = query.toLowerCase().trim();
            const queryHasLetter = /[A-Z]/.test(queryUpper);
            const queryIsNumber = /^\d+$/.test(queryUpper);
            
            console.log(`🧮 [QuickAddStock] 查詢分析: 包含字母=${queryHasLetter}, 純數字=${queryIsNumber}`);
            
            const filtered = data.data.filter((stock: any) => {
              const symbol = stock.stock_id || '';
              const name = stock.stock_name || '';
              const symbolUpper = symbol.toUpperCase();
              const nameLower = name.toLowerCase();
              
              // 1. 精確匹配股票代碼（最高優先級）
              if (symbolUpper === queryUpper) {
                console.log(`✅ [QuickAddStock] 精確匹配: ${symbol}`);
                return true;
              }
              
              // 2. 智能開頭匹配：包含字母的查詢不進行開頭匹配
              if (symbolUpper.startsWith(queryUpper)) {
                if (queryIsNumber) {
                  console.log(`📝 [QuickAddStock] 純數字開頭匹配: ${symbol}`);
                  return true;
                } else if (!queryHasLetter) {
                  console.log(`📝 [QuickAddStock] 一般開頭匹配: ${symbol}`);
                  return true;
                } else {
                  console.log(`⚠️ [QuickAddStock] 跳過包含字母的開頭匹配: ${symbol} (查詢: ${query})`);
                  return false;
                }
              }
              
              // 3. 中文名稱包含查詢字串
              if (nameLower.includes(queryLower) || name.includes(query)) {
                console.log(`🏷️ [QuickAddStock] 名稱匹配: ${symbol} - ${name}`);
                return true;
              }
              
              // 4. 股票代碼包含查詢字串（低優先級，排除過短查詢）
              if (query.length >= 3 && query.length < 5 && symbolUpper.includes(queryUpper)) {
                console.log(`🔤 [QuickAddStock] 代碼包含匹配: ${symbol}`);
                return true;
              }
              
              return false;
            });
            
            console.log(`🎯 [QuickAddStock] 過濾後找到 ${filtered.length} 筆匹配結果`);
            
            // 按匹配優先級排序
            const sortedFiltered = filtered.sort((a: any, b: any) => {
              const aSymbol = (a.stock_id || '').toUpperCase();
              const bSymbol = (b.stock_id || '').toUpperCase();
              
              // 精確匹配排在最前面
              if (aSymbol === queryUpper && bSymbol !== queryUpper) return -1;
              if (bSymbol === queryUpper && aSymbol !== queryUpper) return 1;
              
              // 開頭匹配排在前面
              const aStarts = aSymbol.startsWith(queryUpper);
              const bStarts = bSymbol.startsWith(queryUpper);
              if (aStarts && !bStarts) return -1;
              if (bStarts && !aStarts) return 1;
              
              return aSymbol.localeCompare(bSymbol);
            }).slice(0, 10); // 限制結果數量
            
            console.log(`📋 [QuickAddStock] 排序後結果:`, sortedFiltered.map((s: any) => s.stock_id));
            
            // 🔧 為每個股票獲取即時價格（Yahoo Finance 優先）
            const stocksWithPrice = await Promise.all(
              sortedFiltered.map(async (stock: any) => {
                console.log(`💰 [QuickAddStock] 獲取 ${stock.stock_id} 股價...`);
                const price = await getStockPriceDirectly(stock.stock_id);
                return {
                  symbol: stock.stock_id,
                  name: stock.stock_name,
                  price: price || 0,
                  market: '台灣'
                };
              })
            );
            
            console.log(`✅ [QuickAddStock] 最終返回 ${stocksWithPrice.length} 筆結果`);
            return stocksWithPrice;
          }
        }
      } catch (finmindError) {
        console.error('❌ [QuickAddStock] FinMind 搜尋失敗:', finmindError);
        // 如果是 402 錯誤，記錄但不影響功能
        if (finmindError instanceof Error && finmindError.message.includes('402')) {
          console.log(`💡 [QuickAddStock] FinMind API 需要付費，已跳過`);
        }
      }
      
      // 如果所有方法都失敗，返回空陣列
      console.log(`❌ [QuickAddStock] 搜尋失敗: ${query}`);
      return [];
      
    } catch (error) {
      console.error('❌ [QuickAddStock] 直接搜尋失敗:', error);
      return [];
    }
  };

  // 直接獲取股價（不依賴後端）- Yahoo Finance 優先
  const getStockPriceDirectly = async (symbol: string): Promise<number | null> => {
    try {
      // 🔧 遵循 api-standards.md：Yahoo Finance 優先，FinMind 備用
      
      // 1. 優先嘗試 Yahoo Finance API
      console.log(`📊 優先嘗試 Yahoo Finance: ${symbol}`);
      const yahooPrice = await tryYahooFinanceAPI(symbol);
      if (yahooPrice && yahooPrice > 0) {
        console.log(`✅ Yahoo Finance 成功: ${symbol} = ${yahooPrice}`);
        return yahooPrice;
      }
      
      // 2. Yahoo Finance 失敗，嘗試 FinMind 備用
      console.log(`📊 Yahoo Finance 失敗，嘗試 FinMind 備用: ${symbol}`);
      const finmindPrice = await tryFinMindAPI(symbol);
      if (finmindPrice && finmindPrice > 0) {
        console.log(`✅ FinMind 備用成功: ${symbol} = ${finmindPrice}`);
        return finmindPrice;
      }
      
      console.log(`❌ 所有 API 都失敗: ${symbol}`);
      return null;
      
    } catch (error) {
      console.error(`獲取 ${symbol} 股價失敗:`, error);
      return null;
    }
  };

  // Yahoo Finance API 調用函數
  const tryYahooFinanceAPI = async (symbol: string): Promise<number | null> => {
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

      const correctSymbol = getCorrectSymbol(symbol);
      const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${correctSymbol}`;
      
      const response = await fetch(yahooUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        signal: AbortSignal.timeout(8000) // 8秒超時
      });
      
      if (response.ok) {
        const data = await response.json();
        const result = data?.chart?.result?.[0];
        
        if (result?.meta) {
          const meta = result.meta;
          const currentPrice = meta.regularMarketPrice || meta.previousClose || 0;
          return currentPrice;
        }
      }
      
      return null;
    } catch (error) {
      console.error(`Yahoo Finance API 失敗 ${symbol}:`, error);
      return null;
    }
  };

  // FinMind API 調用函數（備用）
  const tryFinMindAPI = async (symbol: string): Promise<number | null> => {
    try {
      const today = new Date();
      const startDate = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000); // 14天前
      const finmindPriceUrl = `https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockPrice&data_id=${symbol}&start_date=${startDate.toISOString().split('T')[0]}&end_date=${today.toISOString().split('T')[0]}&token=`;
      
      const finmindResponse = await fetch(finmindPriceUrl, {
        signal: AbortSignal.timeout(8000) // 8秒超時
      });
      
      if (finmindResponse.ok) {
        const finmindData = await finmindResponse.json();
        if (finmindData.data && finmindData.data.length > 0) {
          // 取最新的收盤價
          const latestData = finmindData.data[finmindData.data.length - 1];
          const price = parseFloat(latestData.close);
          return price > 0 ? price : null;
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

  // 防抖搜尋
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // 實際的搜尋函數
  const performSearch = useCallback(async (query: string) => {
    console.log(`🔍 [QuickAddStock] performSearch 開始: "${query}"`);
    setError('');
    
    const trimmedQuery = query.trim();
    
    // 如果查詢字串太短，不進行搜尋
    if (trimmedQuery.length < 2) {
      console.log(`⚠️ [QuickAddStock] 查詢太短，跳過搜尋: "${trimmedQuery}"`);
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    
    // 檢查是否為數字（股票代碼）
    const isNumeric = /^\d+[A-Z]*$/i.test(trimmedQuery);
    
    // 如果是純數字但少於 3 碼，不搜尋（避免過多結果）
    if (isNumeric && trimmedQuery.length < 3) {
      console.log(`⚠️ [QuickAddStock] 純數字查詢太短，跳過搜尋: "${trimmedQuery}"`);
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    
    console.log(`🚀 [QuickAddStock] 開始執行搜尋: "${query}"`);
    setIsSearching(true);
    try {
      const results = await searchStocks(query);
      console.log(`✅ [QuickAddStock] performSearch 完成: ${results.length} 筆結果`);
      setSearchResults(results);
      setShowResults(true);
      
      if (results.length === 0) {
        setError('找不到相關股票，請檢查輸入是否正確');
      } else {
        setError('');
      }
    } catch (err) {
      console.error('🚨 [QuickAddStock] performSearch 搜尋錯誤:', err);
      setError(err instanceof Error ? err.message : '搜尋失敗，請稍後再試');
      setSearchResults([]);
      setShowResults(false);
    } finally {
      setIsSearching(false);
    }
  }, []); // 🔧 修復：移除 searchStocks 依賴，在函數內部直接調用

  // 處理搜尋（帶防抖）
  const handleSearch = useCallback((query: string) => {
    console.log(`🎯 [QuickAddStock] handleSearch 被調用: "${query}"`);
    setSearchQuery(query);
    
    // 清除之前的定時器
    if (searchTimeout) {
      console.log(`⏰ [QuickAddStock] 清除之前的搜尋計時器`);
      clearTimeout(searchTimeout);
    }
    
    // 設置新的定時器（300ms 防抖）
    const newTimeout = setTimeout(() => {
      console.log(`🚀 [QuickAddStock] 防抖計時器觸發，開始搜尋: "${query}"`);
      performSearch(query);
    }, 300);
    
    setSearchTimeout(newTimeout);
  }, []); // 🔧 修復：移除 performSearch 依賴，避免循環依賴

  // 清理定時器
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

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
    <div className={`bg-slate-800 border border-slate-700 rounded-lg p-2 md:p-3 max-w-full ${className}`}>
      <div className="grid grid-cols-12 gap-1 md:gap-2 items-end">
        {/* 股票搜尋 - 手機版佔全寬，桌面版佔4欄 */}
        <div className="col-span-12 md:col-span-4 relative" ref={resultsRef}>
          <label className="block text-xs md:text-sm font-medium text-slate-400 mb-1">
            股票搜尋
          </label>
          <div className="relative">
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="輸入股票代號（至少4碼）或名稱..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pr-20"
            />
            
            {/* 搜尋圖示、清除按鈕或載入指示器 */}
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
              ) : searchQuery.length > 0 ? (
                // 當輸入框有文字時顯示清除按鈕
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    setShowResults(false);
                    setError('');
                    searchInputRef.current?.focus();
                  }}
                  className="p-1.5 bg-slate-600 hover:bg-slate-500 rounded-full transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-110"
                  title="清除輸入"
                >
                  <XIcon size="sm" className="text-slate-300" />
                </button>
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
            <div className="absolute top-full left-0 right-0 bg-slate-900 border-2 border-blue-400 rounded-lg shadow-2xl max-h-60 overflow-y-auto z-[9999] mt-1">
              {searchResults.map((stock, index) => (
                <div
                  key={`${stock.symbol}-${index}`}
                  className="p-3 hover:bg-blue-600 cursor-pointer border-b border-slate-600 last:border-b-0 transition-colors"
                  onClick={() => handleSelectStock(stock)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-base">{stock.symbol}</span>
                        <span className="text-blue-200 font-medium">{stock.name}</span>
                        <span className="text-xs px-2 py-1 bg-blue-500 text-white rounded font-medium">
                          {stock.market}
                        </span>
                      </div>
                      <div className="text-sm text-green-300 mt-1 font-medium">
                        股價: ${stock.price}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* 無搜尋結果 */}
          {showResults && searchResults.length === 0 && !isSearching && searchQuery.length >= 4 && (
            <div className="absolute top-full left-0 right-0 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50 mt-1">
              <div className="p-4 text-center text-slate-400">
                <SearchIcon />
                <p>找不到相關股票</p>
                <p className="text-sm">請檢查股票代號（4-6碼）或名稱是否正確</p>
              </div>
            </div>
          )}
          
          {/* 輸入提示 */}
          {searchQuery.length > 0 && searchQuery.length < 4 && (
            <div className="absolute top-full left-0 right-0 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50 mt-1">
              <div className="p-3 text-center text-slate-400">
                <p className="text-sm">請輸入股票代號或中文名稱</p>
                <p className="text-xs text-slate-500">代號：2330、00679B | 中文：富邦、台積</p>
              </div>
            </div>
          )}
        </div>
        
        {/* 持股數 - 手機版佔6欄，桌面版佔2欄 */}
        <div className="col-span-6 md:col-span-2">
          <label className="block text-xs md:text-sm font-medium text-slate-400 mb-1">
            持股數
          </label>
          <Input
            type="number"
            placeholder="預設1000"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            onKeyDown={handleKeyDown}
            min="1"
            className="w-full"
          />
        </div>
        
        {/* 成本價 - 手機版佔6欄，桌面版佔2欄 */}
        <div className="col-span-6 md:col-span-2">
          <label className="block text-xs md:text-sm font-medium text-slate-400 mb-1">
            成本價
          </label>
          <Input
            type="number"
            placeholder="預設18.50"
            value={costPrice}
            onChange={(e) => setCostPrice(e.target.value)}
            onKeyDown={handleKeyDown}
            min="0"
            step="0.01"
            className="w-full"
          />
        </div>
        
        {/* 購買日期 - 手機版佔6欄，桌面版佔2欄 */}
        <div className="col-span-6 md:col-span-2">
          <label className="block text-xs md:text-sm font-medium text-slate-400 mb-1">
            購買日期
          </label>
          <Input
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            onKeyDown={handleKeyDown}
            max={new Date().toISOString().split('T')[0]}
            className="w-full"
          />
        </div>
        
        {/* 新增按鈕 - 手機版佔6欄，桌面版佔2欄 */}
        <div className="col-span-6 md:col-span-2 flex items-end">
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