import React, { useState, useEffect } from 'react';
import ErrorBoundary from './ErrorBoundary';
import DividendApiService from '../services/dividendApiService';
import type { StockRecord, DividendRecord } from '../types';

interface DividendSectionProps {
  stocks: StockRecord[];
  onUpdateStock: (id: string, updates: Partial<StockRecord>) => void;
}

const DividendSection: React.FC<DividendSectionProps> = ({ stocks, onUpdateStock }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshDividends = async () => {
    setIsLoading(true);
    setError(null);

    try {
      for (const stock of stocks) {
        if (!stock.dividendRecords || stock.dividendRecords.length === 0) {
          
          try {
            const historicalDividends = await DividendApiService.getHistoricalDividends(
              stock.symbol, 
              stock.purchaseDate
            );
            
            if (historicalDividends.length > 0) {
              const dividendRecords: DividendRecord[] = historicalDividends.map((dividend, index) => ({
                id: `${Date.now()}-${index}-${stock.id}`,
                stockId: stock.id,
                symbol: dividend.symbol,
                exDividendDate: new Date(dividend.exDividendDate),
                dividendPerShare: dividend.dividendPerShare,
                totalDividend: dividend.dividendPerShare * stock.shares,
                shares: stock.shares
              }));
              
              const totalDividendPerShare = dividendRecords.reduce(
                (sum, record) => sum + record.dividendPerShare, 0
              );
              const adjustedCostPrice = stock.costPrice - totalDividendPerShare;
              
              onUpdateStock(stock.id, {
                dividendRecords,
                adjustedCostPrice: Math.max(adjustedCostPrice, 0)
              });
            }
          } catch (stockError) {
            console.error(`${stock.symbol} 股息獲取失敗:`, stockError);
          }
        }
      }
    } catch (globalError) {
      const errorMessage = globalError instanceof Error ? globalError.message : '未知錯誤';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // 自動刷新邏輯（安全的）
  useEffect(() => {
    const stocksNeedingDividends = stocks.filter(stock => 
      !stock.dividendRecords || stock.dividendRecords.length === 0
    );
    
    if (stocksNeedingDividends.length > 0) {
      // 延遲執行，避免阻塞主線程
      setTimeout(() => {
        refreshDividends().catch(err => {
          console.error('自動刷新股息失敗:', err);
        });
      }, 1000);
    }
  }, [stocks.length]);

  return (
    <ErrorBoundary
      fallback={({ error, retry }) => (
        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
          <h3 className="text-yellow-400 font-medium mb-2">股息功能暫時無法使用</h3>
          <p className="text-yellow-300 text-sm mb-3">
            股息計算模組發生錯誤，但不影響其他功能。錯誤：{error?.message}
          </p>
          <button
            onClick={retry}
            className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded"
          >
            重新載入股息功能
          </button>
        </div>
      )}
    >
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">股息管理</h3>
          <button
            onClick={refreshDividends}
            disabled={isLoading}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              isLoading
                ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {isLoading ? '更新中...' : '刷新股息資料'}
          </button>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-500/30 rounded p-3 mb-4">
            <p className="text-red-400 text-sm">錯誤: {error}</p>
          </div>
        )}

        <div className="text-sm text-slate-400">
          <p>股息資料會自動從API獲取，如遇問題不會影響其他功能的正常使用。</p>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default DividendSection;