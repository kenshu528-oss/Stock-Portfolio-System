import React from 'react';
import { useAppStore } from '../stores/appStore';
import { getTransactionTaxRate } from '../services/bondETFService';
import type { StockRecord, PortfolioStats as PortfolioStatsType } from '../types';

interface PortfolioStatsProps {
  stocks: StockRecord[];
  currentAccountId: string;
  isPrivacyMode: boolean;
  className?: string;
}

const PortfolioStats: React.FC<PortfolioStatsProps> = ({
  stocks,
  currentAccountId,
  isPrivacyMode,
  className = ''
}) => {
  // 獲取股價更新狀態和帳戶資訊
  const { lastPriceUpdate, isUpdatingPrices, accounts } = useAppStore();
  
  // 過濾當前帳戶的股票
  const currentAccountStocks = stocks.filter(stock => stock.accountId === currentAccountId);

  // 格式化最後更新時間
  const formatLastUpdateTime = (date: Date | null): string => {
    if (!date) return '尚未更新';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return '剛剛更新';
    if (diffMins < 60) return `${diffMins}分鐘前更新`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}小時前更新`;
    
    return `${date.toLocaleDateString('zh-TW')} 更新`;
  };

  // 計算投資組合統計
  const calculateStats = (): PortfolioStatsType => {
    if (currentAccountStocks.length === 0) {
      return {
        totalMarketValue: 0,
        totalCost: 0,
        totalGainLoss: 0,
        totalGainLossPercent: 0,
        totalDividend: 0,
        totalReturn: 0,
        todayChange: 0,
        todayChangePercent: 0
      };
    }

    // 獲取帳戶資訊以取得手續費率
    const account = accounts.find(acc => acc.id === currentAccountId);
    const brokerageFeeRate = account?.brokerageFee ?? 0.1425;
    const transactionTaxRate = account?.transactionTax ?? 0.3;

    // 計算總市值（毛額）
    const totalMarketValue = currentAccountStocks.reduce((sum, stock) => 
      sum + (stock.shares * stock.currentPrice), 0
    );

    // 計算總買入成本（包含買入手續費，考慮最低手續費20元）
    const totalBuyCost = currentAccountStocks.reduce((sum, stock) => {
      const costBasis = stock.adjustedCostPrice || stock.costPrice;
      const grossCost = stock.shares * costBasis;
      const buyBrokerageFee = Math.max(20, Math.round(grossCost * (brokerageFeeRate / 100)));
      return sum + grossCost + buyBrokerageFee;
    }, 0);

    // 計算總賣出收入（扣除賣出手續費和證交稅，考慮債券ETF稅率）
    const totalNetSellValue = currentAccountStocks.reduce((sum, stock) => {
      const grossSellValue = stock.shares * stock.currentPrice;
      const sellBrokerageFee = Math.max(20, Math.round(grossSellValue * (brokerageFeeRate / 100)));
      
      // 根據股票類型計算正確的證交稅率
      const actualTaxRate = stock.transactionTaxRate ?? getTransactionTaxRate(stock.symbol, stock.name);
      const sellTransactionTax = Math.round(grossSellValue * (actualTaxRate / 100));
      
      return sum + grossSellValue - sellBrokerageFee - sellTransactionTax;
    }, 0);

    // 計算真實總損益（淨賣出收入 - 總買入成本）
    const totalGainLoss = totalNetSellValue - totalBuyCost;

    // 計算總損益率
    const totalGainLossPercent = totalBuyCost > 0 ? (totalGainLoss / totalBuyCost) * 100 : 0;

    // 計算總股息收入（根據當前股數重新計算）
    const totalDividend = currentAccountStocks.reduce((sum, stock) => {
      if (stock.dividendRecords && stock.dividendRecords.length > 0) {
        return sum + stock.dividendRecords.reduce((dividendSum, dividend) => 
          dividendSum + (stock.shares * dividend.dividendPerShare), 0
        );
      }
      return sum;
    }, 0);

    // 計算總報酬（損益 + 股息）
    const totalReturn = totalGainLoss + totalDividend;

    // TODO: 實作今日變化計算（需要昨日收盤價資料）
    const todayChange = 0;
    const todayChangePercent = 0;

    return {
      totalMarketValue,
      totalCost: totalBuyCost,
      totalGainLoss,
      totalGainLossPercent,
      totalDividend,
      totalReturn,
      todayChange,
      todayChangePercent
    };
  };

  const stats = calculateStats();

  // 格式化金額顯示
  const formatCurrency = (amount: number): string => {
    if (isPrivacyMode) {
      return '****';
    }
    return `$${amount.toLocaleString('zh-TW', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    })}`;
  };

  // 格式化百分比顯示
  const formatPercent = (percent: number): string => {
    if (isPrivacyMode) {
      return '**%';
    }
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  // 獲取損益顏色
  const getGainLossColor = (value: number): string => {
    if (value > 0) return 'text-green-400';
    if (value < 0) return 'text-red-400';
    return 'text-slate-300';
  };

  return (
    <div className={`bg-slate-800 border border-slate-700 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">投資組合統計</h3>
        
        {/* 股價更新狀態顯示 */}
        <div className="flex items-center space-x-2 text-xs">
          {isUpdatingPrices ? (
            <div className="flex items-center text-blue-400">
              <svg className="w-3 h-3 animate-spin mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>更新中...</span>
            </div>
          ) : (
            <div className="text-slate-400">
              {formatLastUpdateTime(lastPriceUpdate)}
            </div>
          )}
        </div>
      </div>
      
      {currentAccountStocks.length === 0 ? (
        <div className="text-center py-8">
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
            <p className="text-lg font-medium mb-2">尚無投資資料</p>
            <p className="text-sm text-slate-500">
              新增股票後即可查看投資組合統計
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 總市值 */}
          <div className="bg-slate-900 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">總市值</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(stats.totalMarketValue)}
                </p>
              </div>
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </div>

          {/* 總成本 */}
          <div className="bg-slate-900 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">總成本</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(stats.totalCost)}
                </p>
              </div>
              <div className="p-2 bg-slate-500/10 rounded-lg">
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* 總損益 */}
          <div className="bg-slate-900 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">總損益</p>
                <p className={`text-2xl font-bold ${getGainLossColor(stats.totalGainLoss)}`}>
                  {isPrivacyMode ? '****' : `${stats.totalGainLoss >= 0 ? '+' : ''}${stats.totalGainLoss.toFixed(0)}`}
                </p>
                <p className={`text-sm ${getGainLossColor(stats.totalGainLoss)}`}>
                  {formatPercent(stats.totalGainLossPercent)}
                </p>
              </div>
              <div className={`p-2 rounded-lg ${
                stats.totalGainLoss >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'
              }`}>
                <svg className={`w-6 h-6 ${getGainLossColor(stats.totalGainLoss)}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {stats.totalGainLoss >= 0 ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                  )}
                </svg>
              </div>
            </div>
          </div>

          {/* 股息收入 */}
          <div className="bg-slate-900 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">股息收入</p>
                <p className="text-2xl font-bold text-green-400">
                  {formatCurrency(stats.totalDividend)}
                </p>
              </div>
              <div className="p-2 bg-green-500/10 rounded-lg">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 詳細統計 */}
      {currentAccountStocks.length > 0 && (
        <div className="mt-6 pt-6 border-t border-slate-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">持股檔數:</span>
              <span className="text-white font-medium">{currentAccountStocks.length} 檔</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">總報酬:</span>
              <span className={`font-medium ${getGainLossColor(stats.totalReturn)}`}>
                {isPrivacyMode ? '****' : `${stats.totalReturn >= 0 ? '+' : ''}${stats.totalReturn.toFixed(0)}`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">平均成本:</span>
              <span className="text-white font-medium">
                {isPrivacyMode ? '****' : `$${(stats.totalCost / currentAccountStocks.length).toFixed(0)}`}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortfolioStats;