import React, { useState, useMemo } from 'react';
import { useAppStore } from '../stores/appStore';
import type { SellTransaction } from '../types';

/**
 * 已實現損益面板
 * 顯示在帳戶統計區塊下方，分兩個子區塊：
 * 1. 已實現損益彙總（賣出交易）
 * 2. 已實現股息明細
 */
const RealizedGainLossPanel: React.FC = () => {
  const { sellTransactions, currentAccount, accounts, isPrivacyMode, deleteSellTransaction } = useAppStore();
  const [activeTab, setActiveTab] = useState<'gainloss' | 'dividend'>('gainloss');
  const [expandedTx, setExpandedTx] = useState<string | null>(null);

  const account = accounts.find(a => a.name === currentAccount);

  // 篩選當前帳戶的賣出記錄
  const accountTransactions = useMemo(() =>
    sellTransactions.filter(tx => tx.accountId === account?.id)
      .sort((a, b) => new Date(b.sellDate).getTime() - new Date(a.sellDate).getTime()),
    [sellTransactions, account?.id]
  );

  // 計算彙總統計
  const summary = useMemo(() => {
    const totalRealizedGainLoss = accountTransactions.reduce((s, tx) => s + tx.realizedGainLoss, 0);
    const totalDividend = accountTransactions.reduce((s, tx) => s + tx.dividendIncome, 0);
    const totalReturn = accountTransactions.reduce((s, tx) => s + tx.totalReturn, 0);
    const totalBuyCost = accountTransactions.reduce((s, tx) => s + tx.buyCost, 0);
    const totalReturnPercent = totalBuyCost > 0 ? (totalReturn / totalBuyCost) * 100 : 0;
    return { totalRealizedGainLoss, totalDividend, totalReturn, totalBuyCost, totalReturnPercent };
  }, [accountTransactions]);

  // 股息明細：只列出有股息收入的賣出記錄
  const dividendTransactions = useMemo(() =>
    accountTransactions.filter(tx => tx.dividendIncome > 0),
    [accountTransactions]
  );

  const pv = (v: string) => isPrivacyMode ? '****' : v;

  const formatMoney = (v: number) => pv(`$${Math.abs(v).toLocaleString('zh-TW', { maximumFractionDigits: 0 })}`);
  const colorClass = (v: number) => v >= 0 ? 'text-green-400' : 'text-red-400';
  const sign = (v: number) => v >= 0 ? '+' : '-';

  if (accountTransactions.length === 0) {
    return (
      <div className="mx-4 mb-4 bg-slate-800 rounded-xl border border-slate-700 p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1 h-5 bg-yellow-500 rounded-full" />
          <h3 className="text-sm font-semibold text-slate-300">已實現損益</h3>
        </div>
        <p className="text-xs text-slate-500 py-3 text-center">尚無已實現損益記錄</p>
      </div>
    );
  }

  return (
    <div className="mx-4 mb-4 bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      {/* 標題列 */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 bg-yellow-500 rounded-full" />
          <h3 className="text-sm font-semibold text-slate-300">已實現損益</h3>
          <span className="text-xs bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded">
            {accountTransactions.length} 筆
          </span>
        </div>
        {/* 彙總數字 */}
        <div className="flex items-center gap-4 text-xs">
          <div className="text-right">
            <div className="text-slate-500">交易損益</div>
            <div className={`font-semibold ${colorClass(summary.totalRealizedGainLoss)}`}>
              {sign(summary.totalRealizedGainLoss)}{formatMoney(summary.totalRealizedGainLoss)}
            </div>
          </div>
          {summary.totalDividend > 0 && (
            <div className="text-right">
              <div className="text-slate-500">已領股息</div>
              <div className="text-green-400 font-semibold">+{formatMoney(summary.totalDividend)}</div>
            </div>
          )}
          <div className="text-right">
            <div className="text-slate-500">總報酬</div>
            <div className={`font-semibold ${colorClass(summary.totalReturn)}`}>
              {sign(summary.totalReturn)}{formatMoney(summary.totalReturn)}
              <span className="text-slate-400 font-normal ml-1">
                ({summary.totalReturnPercent >= 0 ? '+' : ''}{summary.totalReturnPercent.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab 切換 */}
      <div className="flex border-b border-slate-700 px-4">
        <button
          onClick={() => setActiveTab('gainloss')}
          className={`text-xs px-3 py-2 font-medium transition-colors border-b-2 ${
            activeTab === 'gainloss'
              ? 'border-yellow-500 text-yellow-400'
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          交易明細
        </button>
        <button
          onClick={() => setActiveTab('dividend')}
          className={`text-xs px-3 py-2 font-medium transition-colors border-b-2 ${
            activeTab === 'dividend'
              ? 'border-green-500 text-green-400'
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          股息明細
          {dividendTransactions.length > 0 && (
            <span className="ml-1 bg-green-900 text-green-400 px-1 rounded text-xs">
              {dividendTransactions.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab 內容 */}
      <div className="p-2">
        {activeTab === 'gainloss' && (
          <div className="space-y-1">
            {accountTransactions.map(tx => (
              <TransactionRow
                key={tx.id}
                tx={tx}
                isExpanded={expandedTx === tx.id}
                onToggle={() => setExpandedTx(expandedTx === tx.id ? null : tx.id)}
                onDelete={() => {
                  if (confirm(`確定要刪除 ${tx.symbol} 的賣出記錄嗎？`)) {
                    deleteSellTransaction(tx.id);
                  }
                }}
                formatMoney={formatMoney}
                colorClass={colorClass}
                sign={sign}
                isPrivacyMode={isPrivacyMode}
              />
            ))}
          </div>
        )}

        {activeTab === 'dividend' && (
          <div>
            {dividendTransactions.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center">無股息收入記錄</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-700">
                    <th className="text-left py-2 px-2">股票</th>
                    <th className="text-right py-2 px-2">賣出日</th>
                    <th className="text-right py-2 px-2">持有天數</th>
                    <th className="text-right py-2 px-2">股息收入</th>
                  </tr>
                </thead>
                <tbody>
                  {dividendTransactions.map(tx => (
                    <tr key={tx.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="py-2 px-2">
                        <div className="font-medium text-slate-300">{tx.symbol}</div>
                        <div className="text-slate-500 text-xs">{tx.name}</div>
                      </td>
                      <td className="py-2 px-2 text-right text-slate-400">
                        {new Date(tx.sellDate).toLocaleDateString('zh-TW')}
                      </td>
                      <td className="py-2 px-2 text-right text-slate-400">
                        {tx.holdingDays} 天
                      </td>
                      <td className="py-2 px-2 text-right text-green-400 font-semibold">
                        +{formatMoney(tx.dividendIncome)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-600">
                    <td colSpan={3} className="py-2 px-2 text-slate-400 text-right font-medium">合計</td>
                    <td className="py-2 px-2 text-right text-green-400 font-bold">
                      +{formatMoney(summary.totalDividend)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// 單筆交易列
interface TransactionRowProps {
  tx: SellTransaction;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  formatMoney: (v: number) => string;
  colorClass: (v: number) => string;
  sign: (v: number) => string;
  isPrivacyMode: boolean;
}

const TransactionRow: React.FC<TransactionRowProps> = ({
  tx, isExpanded, onToggle, onDelete, formatMoney, colorClass, sign
}) => {
  return (
    <div className="bg-slate-900 rounded-lg overflow-hidden">
      {/* 主列 */}
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-slate-700/50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3 min-w-0">
          <svg
            className={`w-3 h-3 text-slate-500 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-blue-400">{tx.symbol}</span>
              <span className="text-xs text-slate-500 truncate">{tx.name}</span>
            </div>
            <div className="text-xs text-slate-500">
              {new Date(tx.sellDate).toLocaleDateString('zh-TW')} · {tx.sellShares.toLocaleString()} 股 · 持有 {tx.holdingDays} 天
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="text-right">
            <div className={`text-sm font-semibold ${colorClass(tx.realizedGainLoss)}`}>
              {sign(tx.realizedGainLoss)}{formatMoney(tx.realizedGainLoss)}
            </div>
            <div className={`text-xs ${colorClass(tx.realizedGainLossPercent)}`}>
              ({tx.realizedGainLossPercent >= 0 ? '+' : ''}{tx.realizedGainLossPercent.toFixed(2)}%)
            </div>
          </div>
        </div>
      </div>

      {/* 展開詳情 */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-slate-700/50">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">買進成本</span>
              <span className="text-slate-300">${tx.buyCost.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">買進價格</span>
              <span className="text-slate-300">${tx.buyPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">賣出金額（實得）</span>
              <span className="text-slate-300">${tx.sellAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">賣出價格</span>
              <span className="text-slate-300">${tx.sellPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">手續費</span>
              <span className="text-red-400">-${tx.brokerageFee.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">交易稅</span>
              <span className="text-red-400">-${tx.transactionTax.toLocaleString()}</span>
            </div>
            {tx.dividendIncome > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">已領股息</span>
                <span className="text-green-400">+${tx.dividendIncome.toFixed(0)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold">
              <span className="text-slate-400">總報酬</span>
              <span className={colorClass(tx.totalReturn)}>
                {sign(tx.totalReturn)}{formatMoney(tx.totalReturn)}
                <span className="font-normal text-slate-400 ml-1">
                  ({tx.totalReturnPercent >= 0 ? '+' : ''}{tx.totalReturnPercent.toFixed(2)}%)
                </span>
              </span>
            </div>
            {tx.notes && (
              <div className="flex justify-between col-span-2">
                <span className="text-slate-500">備註</span>
                <span className="text-slate-400">{tx.notes}</span>
              </div>
            )}
          </div>
          <div className="flex justify-end mt-2">
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-900/30 transition-colors"
            >
              刪除此記錄
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RealizedGainLossPanel;
