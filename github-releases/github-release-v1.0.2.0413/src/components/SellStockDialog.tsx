import React, { useState, useMemo } from 'react';
import type { StockRecord, SellTransaction } from '../types';
import { useAppStore } from '../stores/appStore';
import { getTransactionTaxRate } from '../services/bondETFService';

interface SellStockDialogProps {
  isOpen: boolean;
  onClose: () => void;
  stock: StockRecord;            // 該筆買進記錄
}

const SellStockDialog: React.FC<SellStockDialogProps> = ({ isOpen, onClose, stock }) => {
  const { accounts, addSellTransaction } = useAppStore();

  const account = accounts.find(a => a.id === stock.accountId);
  const brokerageFeeRate = account?.brokerageFee ?? 0.1425;
  const taxRate = getTransactionTaxRate(stock.symbol, stock.name);

  const [sellShares, setSellShares] = useState<string>('');
  const [sellPrice, setSellPrice] = useState<string>(String(stock.currentPrice || ''));
  const [sellDate, setSellDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 計算預覽
  const preview = useMemo(() => {
    const shares = parseInt(sellShares) || 0;
    const price = parseFloat(sellPrice) || 0;

    if (shares <= 0 || price <= 0) return null;

    const grossAmount = shares * price;
    const brokerage = Math.round(grossAmount * brokerageFeeRate / 100);
    const tax = Math.round(grossAmount * taxRate / 100);
    const netSellAmount = grossAmount - brokerage - tax;

    const buyCost = shares * stock.costPrice;
    const realizedGainLoss = netSellAmount - buyCost;
    const realizedGainLossPercent = buyCost > 0 ? (realizedGainLoss / buyCost) * 100 : 0;

    // 按比例計算持有期間股息（賣出股數 / 原始持股數）
    const ratio = stock.shares > 0 ? shares / stock.shares : 0;
    const dividendIncome = (stock.dividendRecords || []).reduce((sum, d) => {
      return sum + (d.totalCashDividend ?? d.totalDividend ?? 0);
    }, 0) * ratio;

    const totalReturn = realizedGainLoss + dividendIncome;
    const totalReturnPercent = buyCost > 0 ? (totalReturn / buyCost) * 100 : 0;

    const holdingDays = Math.floor(
      (new Date(sellDate).getTime() - new Date(stock.purchaseDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      shares,
      price,
      grossAmount,
      brokerage,
      tax,
      netSellAmount,
      buyCost,
      realizedGainLoss,
      realizedGainLossPercent,
      dividendIncome,
      totalReturn,
      totalReturnPercent,
      holdingDays
    };
  }, [sellShares, sellPrice, sellDate, stock, brokerageFeeRate, taxRate]);

  const handleSubmit = async () => {
    if (!preview) return;

    const shares = parseInt(sellShares);
    if (shares > stock.shares) {
      alert(`賣出股數（${shares}）不能超過持有股數（${stock.shares}）`);
      return;
    }
    if (shares <= 0) {
      alert('請輸入有效的賣出股數');
      return;
    }

    setIsSubmitting(true);
    try {
      const tx: SellTransaction = {
        id: `sell-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        accountId: stock.accountId,
        stockId: stock.id,
        symbol: stock.symbol,
        name: stock.name,
        sellDate: new Date(sellDate),
        sellShares: preview.shares,
        sellPrice: preview.price,
        sellAmount: preview.netSellAmount,
        buyPrice: stock.costPrice,
        buyCost: preview.buyCost,
        brokerageFee: preview.brokerage,
        transactionTax: preview.tax,
        realizedGainLoss: preview.realizedGainLoss,
        realizedGainLossPercent: preview.realizedGainLossPercent,
        dividendIncome: preview.dividendIncome,
        totalReturn: preview.totalReturn,
        totalReturnPercent: preview.totalReturnPercent,
        holdingDays: preview.holdingDays,
        notes
      };

      // addSellTransaction 已經在 store 裡處理了股數更新和移除
      // 這裡不需要再呼叫 updateStock
      addSellTransaction(tx);

      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const maxShares = stock.shares;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-60 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
        <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg border border-slate-700 my-auto">
          {/* 標題 */}
          <div className="flex items-center justify-between p-5 border-b border-slate-700 sticky top-0 bg-slate-800 rounded-t-xl z-10">
            <div>
              <h2 className="text-lg font-semibold text-white">賣出股票</h2>
              <p className="text-sm text-slate-400 mt-0.5">
                {stock.symbol} · {stock.name} · 持有 {stock.shares.toLocaleString()} 股
              </p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 表單 */}
          <div className="p-5 space-y-4">
            {/* 買進資訊提示 */}
            <div className="bg-slate-900 rounded-lg p-3 text-sm">
              <div className="flex justify-between text-slate-400">
                <span>買進日期</span>
                <span className="text-slate-300">{new Date(stock.purchaseDate).toLocaleDateString('zh-TW')}</span>
              </div>
              <div className="flex justify-between text-slate-400 mt-1">
                <span>買進成本價</span>
                <span className="text-slate-300">${stock.costPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400 mt-1">
                <span>可賣出股數</span>
                <span className="text-yellow-400 font-semibold">{stock.shares.toLocaleString()} 股</span>
              </div>
            </div>

            {/* 賣出股數 */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                賣出股數 <span className="text-red-400">*</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={maxShares}
                  value={sellShares}
                  onChange={e => setSellShares(e.target.value)}
                  placeholder={`最多 ${maxShares.toLocaleString()} 股`}
                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
                <button
                  onClick={() => setSellShares(String(maxShares))}
                  className="px-3 py-2 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors whitespace-nowrap"
                >
                  全部賣出
                </button>
              </div>
            </div>

            {/* 賣出價格 */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                賣出價格 <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                min={0.01}
                step={0.01}
                value={sellPrice}
                onChange={e => setSellPrice(e.target.value)}
                placeholder="輸入賣出價格"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>

            {/* 賣出日期 */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">賣出日期</label>
              <input
                type="date"
                value={sellDate}
                onChange={e => setSellDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>

            {/* 備註 */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">備註（選填）</label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="例如：獲利了結"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>

            {/* 損益預覽 */}
            {preview && (
              <div className="bg-slate-900 rounded-lg p-4 border border-slate-600 space-y-2">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">損益預覽</h3>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">賣出金額（稅前）</span>
                  <span className="text-slate-300">${preview.grossAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">手續費 ({brokerageFeeRate}%)</span>
                  <span className="text-red-400">-${preview.brokerage.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">交易稅 ({taxRate}%)</span>
                  <span className="text-red-400">-${preview.tax.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">實得金額</span>
                  <span className="text-white font-medium">${preview.netSellAmount.toLocaleString()}</span>
                </div>
                <div className="border-t border-slate-700 pt-2 mt-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">買進成本</span>
                    <span className="text-slate-300">-${preview.buyCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold mt-1">
                    <span className="text-slate-300">交易損益</span>
                    <span className={preview.realizedGainLoss >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {preview.realizedGainLoss >= 0 ? '+' : ''}${preview.realizedGainLoss.toLocaleString()}
                      <span className="text-xs ml-1 font-normal">
                        ({preview.realizedGainLossPercent >= 0 ? '+' : ''}{preview.realizedGainLossPercent.toFixed(2)}%)
                      </span>
                    </span>
                  </div>
                  {preview.dividendIncome > 0 && (
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-slate-400">累計股息（比例）</span>
                      <span className="text-green-400">+${preview.dividendIncome.toFixed(0)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold mt-2 pt-2 border-t border-slate-600">
                    <span className="text-white">總報酬</span>
                    <span className={preview.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {preview.totalReturn >= 0 ? '+' : ''}${preview.totalReturn.toFixed(0)}
                      <span className="text-xs ml-1 font-normal">
                        ({preview.totalReturnPercent >= 0 ? '+' : ''}{preview.totalReturnPercent.toFixed(2)}%)
                      </span>
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1 text-right">
                    持有 {preview.holdingDays} 天
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 底部按鈕 */}
          <div className="flex justify-end gap-3 p-5 border-t border-slate-700 sticky bottom-0 bg-slate-800 rounded-b-xl">
            <button
              onClick={onClose}
              className="px-5 py-2 text-slate-400 hover:text-white transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={!preview || isSubmitting}
              className="px-6 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-slate-600 disabled:text-slate-400 text-white rounded-lg font-medium transition-colors"
            >
              {isSubmitting ? '處理中...' : '確認賣出'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default SellStockDialog;
