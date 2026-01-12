import React from 'react';
import StockRow from './StockRow';
import type { StockRecord } from '../types';

// 合併後的股票記錄介面
interface MergedStockRecord extends StockRecord {
  originalRecords: StockRecord[];  // 原始記錄列表
  isExpanded?: boolean;            // 是否展開詳情
}

// 合併相同股票的記錄
const mergeStockRecords = (stocks: StockRecord[]): MergedStockRecord[] => {
  const stockGroups = new Map<string, StockRecord[]>();
  
  // 按股票代號分組
  stocks.forEach(stock => {
    const key = stock.symbol;
    if (!stockGroups.has(key)) {
      stockGroups.set(key, []);
    }
    stockGroups.get(key)!.push(stock);
  });
  
  // 合併每組股票
  const mergedStocks: MergedStockRecord[] = [];
  
  stockGroups.forEach((records, symbol) => {
    if (records.length === 1) {
      // 只有一筆記錄，直接使用
      mergedStocks.push({
        ...records[0],
        originalRecords: records
      });
    } else {
      // 多筆記錄，需要合併
      const totalShares = records.reduce((sum, record) => sum + record.shares, 0);
      const totalCost = records.reduce((sum, record) => sum + (record.shares * record.costPrice), 0);
      const totalAdjustedCost = records.reduce((sum, record) => sum + (record.shares * (record.adjustedCostPrice || record.costPrice)), 0);
      const avgCostPrice = totalCost / totalShares;
      const avgAdjustedCostPrice = totalAdjustedCost / totalShares;
      
      // 合併股息記錄
      const allDividendRecords = records.flatMap(record => record.dividendRecords || []);
      
      // 使用最新的股價和更新時間
      const latestRecord = records.reduce((latest, current) => 
        new Date(current.lastUpdated) > new Date(latest.lastUpdated) ? current : latest
      );
      
      // 使用最早的購買日期
      const earliestRecord = records.reduce((earliest, current) => 
        new Date(current.purchaseDate) < new Date(earliest.purchaseDate) ? current : earliest
      );
      
      // 創建合併記錄
      const mergedRecord: MergedStockRecord = {
        id: `merged-${symbol}`,
        accountId: records[0].accountId,
        symbol: symbol,
        name: records[0].name,
        shares: totalShares,
        costPrice: avgCostPrice,
        adjustedCostPrice: avgAdjustedCostPrice,
        purchaseDate: earliestRecord.purchaseDate, // 使用最早的購買日期
        currentPrice: latestRecord.currentPrice,
        lastUpdated: latestRecord.lastUpdated,
        priceSource: latestRecord.priceSource,
        dividendRecords: allDividendRecords,
        originalRecords: records,
        isExpanded: false
      };
      
      mergedStocks.push(mergedRecord);
    }
  });
  
  return mergedStocks.sort((a, b) => a.symbol.localeCompare(b.symbol));
};

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
  const [expandedStocks, setExpandedStocks] = React.useState<Set<string>>(new Set());
  
  // 切換股票展開狀態
  const toggleStockExpansion = (symbol: string) => {
    const newExpanded = new Set(expandedStocks);
    if (newExpanded.has(symbol)) {
      newExpanded.delete(symbol);
    } else {
      newExpanded.add(symbol);
    }
    setExpandedStocks(newExpanded);
  };
  // 過濾當前帳戶的股票
  const currentAccountStocks = stocks.filter(stock => stock.accountId === currentAccountId);
  
  // 合併相同股票的記錄
  const mergedStocks = mergeStockRecords(currentAccountStocks);

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
              mergedStocks.flatMap((mergedStock) => {
                const rows = [];
                const isExpanded = expandedStocks.has(mergedStock.symbol);
                const hasMultipleRecords = mergedStock.originalRecords.length > 1;
                
                // 主要合併列
                rows.push(
                  <StockRow
                    key={mergedStock.id}
                    stock={mergedStock}
                    onUpdateStock={onUpdateStock}
                    onDeleteStock={onDeleteStock}
                    hasMultipleRecords={hasMultipleRecords}
                    isExpanded={isExpanded}
                    onToggleExpansion={() => toggleStockExpansion(mergedStock.symbol)}
                  />
                );
                
                // 展開的詳細記錄
                if (isExpanded && hasMultipleRecords) {
                  mergedStock.originalRecords.forEach((originalRecord, index) => {
                    rows.push(
                      <StockRow
                        key={`${mergedStock.symbol}-detail-${index}`}
                        stock={originalRecord}
                        onUpdateStock={onUpdateStock}
                        onDeleteStock={onDeleteStock}
                        isDetailRow={true}
                        detailIndex={index + 1}
                      />
                    );
                  });
                }
                
                return rows;
              })
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