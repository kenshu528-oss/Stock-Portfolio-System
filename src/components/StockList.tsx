import React from 'react';
import StockRow from './StockRow';
import type { StockRecord } from '../types';

interface StockListProps {
  stocks: StockRecord[];
  currentAccountId: string;
  onUpdateStock: (id: string, updates: Partial<StockRecord>) => void;
  onDeleteStock: (id: string) => void;
  isLoading?: boolean;
  emptyMessage?: string;
}

const StockList: React.FC<StockListProps> = ({
  stocks,
  currentAccountId,
  onUpdateStock,
  onDeleteStock,
  isLoading = false,
  emptyMessage = '尚無股票記錄'
}) => {
  // 過濾當前帳戶的股票（暫時不合併，避免錯誤）
  const currentAccountStocks = stocks.filter(stock => stock.accountId === currentAccountId);
  const mergedStocks = currentAccountStocks;

  // 載入狀態
  if (isLoading) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
        <div className="p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
          <p className="mt-4 text-slate-400">載入股票資料中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg">
      <div className="overflow-x-auto overflow-y-visible">
        <table className="min-w-full divide-y divide-slate-700">
          {/* 表頭 */}
          <thead className="bg-slate-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                股票代碼
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                股票名稱
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                持股數
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                成本價
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                現價
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                市值
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                損益率
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                股息
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>

          {/* 表身 */}
          <tbody className="bg-slate-800 divide-y divide-slate-700">
            {mergedStocks.length > 0 ? (
              mergedStocks.map((stock) => (
                <StockRow
                  key={stock.id}
                  stock={stock}
                  onUpdateStock={onUpdateStock}
                  onDeleteStock={onDeleteStock}
                />
              ))
            ) : (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center">
                  <div className="text-slate-400">
                    <svg 
                      className="mx-auto h-12 w-12 text-slate-500 mb-4" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={1} 
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" 
                      />
                    </svg>
                    <p className="text-lg font-medium mb-2">{emptyMessage}</p>
                    <p className="text-sm text-slate-500">
                      點擊選單中的「新增股票」開始記錄您的投資組合
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 統計資訊 */}
      {mergedStocks.length > 0 && (
        <div className="bg-slate-900 px-6 py-3 border-t border-slate-700">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400">
              共 {mergedStocks.length} 支股票
            </span>
            <div className="flex space-x-6 text-slate-400">
              <span>
                總市值: <span className="text-white font-medium">
                  ${mergedStocks.reduce((sum, stock) => 
                    sum + (stock.shares * stock.currentPrice), 0
                  ).toLocaleString()}
                </span>
              </span>
              <span>
                總成本: <span className="text-white font-medium">
                  ${mergedStocks.reduce((sum, stock) => 
                    sum + (stock.shares * (stock.adjustedCostPrice || stock.costPrice)), 0
                  ).toLocaleString()}
                </span>
              </span>
              <span>
                總損益: <span className={`font-medium ${
                  mergedStocks.reduce((sum, stock) => {
                    const marketValue = stock.shares * stock.currentPrice;
                    const costBasis = stock.shares * (stock.adjustedCostPrice || stock.costPrice);
                    return sum + (marketValue - costBasis);
                  }, 0) >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {(() => {
                    const totalGainLoss = mergedStocks.reduce((sum, stock) => {
                      const marketValue = stock.shares * stock.currentPrice;
                      const costBasis = stock.shares * (stock.adjustedCostPrice || stock.costPrice);
                      return sum + (marketValue - costBasis);
                    }, 0);
                    return `${totalGainLoss >= 0 ? '+' : ''}${totalGainLoss.toFixed(0)}`;
                  })()}
                </span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockList;