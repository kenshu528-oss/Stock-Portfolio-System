import React from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { useAppStore } from '../stores/appStore';
import { getTransactionTaxRate } from '../services/bondETFService';
import type { StockRecord } from '../types';

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  stock: StockRecord | null;
}

const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  stock
}) => {
  // 必須在組件頂層調用 hooks
  const { accounts } = useAppStore();
  
  if (!stock) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  // 計算市值和損益資訊（考慮完整交易成本）
  const account = accounts.find(acc => acc.id === stock.accountId);
  const brokerageFeeRate = account?.brokerageFee ?? 0.1425;
  
  // 計算買入成本（包含買入手續費，考慮最低手續費20元）
  const costBasis = stock.adjustedCostPrice || stock.costPrice;
  const grossBuyCost = stock.shares * costBasis;
  const buyBrokerageFee = Math.max(20, Math.round(grossBuyCost * (brokerageFeeRate / 100)));
  const totalBuyCost = grossBuyCost + buyBrokerageFee;
  
  // 計算賣出收入（扣除賣出手續費和證交稅，考慮債券ETF稅率）
  const grossSellValue = stock.shares * stock.currentPrice;
  const sellBrokerageFee = Math.max(20, Math.round(grossSellValue * (brokerageFeeRate / 100)));
  
  // 根據股票類型計算正確的證交稅率
  const actualTaxRate = stock.transactionTaxRate ?? getTransactionTaxRate(stock.symbol, stock.name);
  const sellTransactionTax = Math.round(grossSellValue * (actualTaxRate / 100));
  
  const netSellValue = grossSellValue - sellBrokerageFee - sellTransactionTax;
  
  // 計算股息收入（安全地添加到損益中）
  const dividendIncome = (stock.dividendRecords || []).reduce((total, dividend) => {
    return total + (dividend.totalDividend || 0);
  }, 0);
  
  // 計算真實損益（淨賣出收入 + 股息收入 - 總買入成本）
  const gainLoss = netSellValue + dividendIncome - totalBuyCost;
  const marketValue = grossSellValue;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="確認刪除股票"
      className="max-w-lg"
    >
      <div className="space-y-4">
        {/* 警告圖示 */}
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
          <svg 
            className="w-6 h-6 text-red-600" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" 
            />
          </svg>
        </div>

        {/* 確認訊息 */}
        <div className="text-center">
          <h3 className="text-lg font-medium text-white mb-2">
            確定要刪除這支股票嗎？
          </h3>
          <p className="text-slate-400 mb-4">
            此操作無法復原，股票記錄將永久刪除。
          </p>
        </div>

        {/* 股票資訊 */}
        <div className="bg-slate-700 rounded-lg p-4 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">股票代碼：</span>
            <span className="text-blue-400 font-mono font-medium">{stock.symbol}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">股票名稱：</span>
            <span className="text-white">{stock.name}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">持股數：</span>
            <span className="text-white">{stock.shares.toLocaleString()} 股</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">成本價：</span>
            <span className="text-white">${(costBasis || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">現價：</span>
            <span className="text-white">${(stock.currentPrice || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">市值：</span>
            <span className="text-white">${marketValue.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">損益：</span>
            <span className={`font-medium ${gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {(gainLoss || 0) >= 0 ? '+' : ''}${(gainLoss || 0).toFixed(0)}
            </span>
          </div>
        </div>

        {/* 操作按鈕 */}
        <div className="flex space-x-3 pt-4">
          <Button
            variant="ghost"
            onClick={onClose}
            className="flex-1"
          >
            取消
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            className="flex-1 bg-red-600 hover:bg-red-700 focus:ring-red-500"
          >
            確定刪除
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default DeleteConfirmDialog;