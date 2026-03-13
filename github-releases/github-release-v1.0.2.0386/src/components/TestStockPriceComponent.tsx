/**
 * 測試股價獲取功能的獨立組件
 * 用於驗證 cloudStockPriceService 的功能
 */

import React, { useState } from 'react';
import { cloudStockPriceService } from '../services/cloudStockPriceService';

interface TestResult {
  symbol: string;
  success: boolean;
  price?: number;
  source?: string;
  responseTime?: number;
  error?: string;
  fromCache?: boolean;
}

const TestStockPriceComponent: React.FC = () => {
  const [testSymbol, setTestSymbol] = useState('2330');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  // 測試單一股票
  const testSingleStock = async () => {
    if (!testSymbol.trim()) return;
    
    setIsLoading(true);
    const startTime = Date.now();
    
    try {
      console.log(`🧪 [TestComponent] 開始測試: ${testSymbol}`);
      const result = await cloudStockPriceService.getStockPrice(testSymbol);
      const responseTime = Date.now() - startTime;
      
      const testResult: TestResult = {
        symbol: testSymbol,
        success: !!result,
        responseTime,
        ...(result && {
          price: result.price,
          source: result.source,
          fromCache: false // cloudStockPriceService 會處理快取
        })
      };
      
      console.log(`🧪 [TestComponent] 測試結果:`, testResult);
      setResults(prev => [testResult, ...prev]);
      
    } catch (error) {
      const testResult: TestResult = {
        symbol: testSymbol,
        success: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : '未知錯誤'
      };
      
      console.error(`🧪 [TestComponent] 測試失敗:`, error);
      setResults(prev => [testResult, ...prev]);
    } finally {
      setIsLoading(false);
    }
  };

  // 測試多個股票
  const testMultipleStocks = async () => {
    const symbols = ['2330', '2317', '6188', '0050', '00679B'];
    setIsLoading(true);
    
    console.log(`🧪 [TestComponent] 開始批次測試:`, symbols);
    
    for (const symbol of symbols) {
      const startTime = Date.now();
      
      try {
        const result = await cloudStockPriceService.getStockPrice(symbol);
        const responseTime = Date.now() - startTime;
        
        const testResult: TestResult = {
          symbol,
          success: !!result,
          responseTime,
          ...(result && {
            price: result.price,
            source: result.source
          })
        };
        
        setResults(prev => [testResult, ...prev]);
        
      } catch (error) {
        const testResult: TestResult = {
          symbol,
          success: false,
          responseTime: Date.now() - startTime,
          error: error instanceof Error ? error.message : '未知錯誤'
        };
        
        setResults(prev => [testResult, ...prev]);
      }
      
      // 批次測試間稍微延遲
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setIsLoading(false);
    console.log(`🧪 [TestComponent] 批次測試完成`);
  };

  // 清除結果
  const clearResults = () => {
    setResults([]);
    console.log(`🧪 [TestComponent] 結果已清除`);
  };

  // 清除快取
  const clearCache = () => {
    cloudStockPriceService.clearCache();
    console.log(`🧪 [TestComponent] 快取已清除`);
  };

  return (
    <div className="p-6 bg-slate-800 rounded-lg">
      <h2 className="text-xl font-bold text-white mb-4">🧪 股價服務測試</h2>
      
      {/* 測試控制 */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={testSymbol}
            onChange={(e) => setTestSymbol(e.target.value)}
            placeholder="輸入股票代碼"
            className="px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded"
          />
          <button
            onClick={testSingleStock}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-slate-600"
          >
            {isLoading ? '測試中...' : '測試單一股票'}
          </button>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={testMultipleStocks}
            disabled={isLoading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-slate-600"
          >
            批次測試 (5支股票)
          </button>
          <button
            onClick={clearCache}
            className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
          >
            清除快取
          </button>
          <button
            onClick={clearResults}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            清除結果
          </button>
        </div>
      </div>

      {/* 統計資訊 */}
      {results.length > 0 && (
        <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-700 p-3 rounded">
            <div className="text-sm text-slate-400">總測試數</div>
            <div className="text-lg font-bold text-white">{results.length}</div>
          </div>
          <div className="bg-slate-700 p-3 rounded">
            <div className="text-sm text-slate-400">成功數</div>
            <div className="text-lg font-bold text-green-400">
              {results.filter(r => r.success).length}
            </div>
          </div>
          <div className="bg-slate-700 p-3 rounded">
            <div className="text-sm text-slate-400">成功率</div>
            <div className="text-lg font-bold text-blue-400">
              {results.length > 0 ? ((results.filter(r => r.success).length / results.length) * 100).toFixed(1) : '0.0'}%
            </div>
          </div>
          <div className="bg-slate-700 p-3 rounded">
            <div className="text-sm text-slate-400">平均響應時間</div>
            <div className="text-lg font-bold text-yellow-400">
              {Math.round(results.reduce((sum, r) => sum + (r.responseTime || 0), 0) / results.length)}ms
            </div>
          </div>
        </div>
      )}

      {/* 測試結果 */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {results.map((result, index) => (
          <div
            key={index}
            className={`p-3 rounded border-l-4 ${
              result.success
                ? 'bg-green-900/20 border-green-500'
                : 'bg-red-900/20 border-red-500'
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="font-bold text-white">
                  {result.success ? '✅' : '❌'} {result.symbol}
                </div>
                {result.success ? (
                  <div className="text-sm text-slate-300">
                    價格: ${result.price} | 來源: {result.source}
                  </div>
                ) : (
                  <div className="text-sm text-red-400">
                    錯誤: {result.error}
                  </div>
                )}
              </div>
              <div className="text-sm text-slate-400">
                {result.responseTime}ms
              </div>
            </div>
          </div>
        ))}
      </div>

      {results.length === 0 && (
        <div className="text-center text-slate-400 py-8">
          點擊上方按鈕開始測試股價獲取功能
        </div>
      )}
    </div>
  );
};

export default TestStockPriceComponent;