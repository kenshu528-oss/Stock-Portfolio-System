import React, { useState, useRef, useEffect } from 'react';
import EditableCell from './EditableCell';
import DeleteConfirmDialog from './DeleteConfirmDialog';
import DividendManager from './DividendManager';
import type { StockRecord } from '../types';

interface StockRowProps {
  stock: StockRecord;
  onUpdateStock: (id: string, updates: Partial<StockRecord>) => void;
  onDeleteStock: (id: string) => void;
  showDeleteConfirm?: boolean;
}

const StockRow: React.FC<StockRowProps> = ({
  stock,
  onUpdateStock,
  onDeleteStock,
  showDeleteConfirm = true
}) => {
  // 狀態管理
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDividendManagerOpen, setIsDividendManagerOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 點擊外部關閉選單
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  // 計算市值
  const marketValue = stock.shares * stock.currentPrice;
  
  // 計算總股息（根據當前股數重新計算）
  const totalDividend = stock.dividendRecords?.reduce((sum, dividend) => {
    // 使用當前股數和每股股息重新計算
    return sum + (stock.shares * dividend.dividendPerShare);
  }, 0) || 0;

  // 計算損益（使用調整成本價或原始成本價）
  const costBasis = stock.adjustedCostPrice || stock.costPrice;
  const totalCost = stock.shares * costBasis;
  const gainLoss = marketValue - totalCost;
  const gainLossPercent = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;

  // 處理持股數更新
  const handleSharesUpdate = (newShares: number) => {
    onUpdateStock(stock.id, { shares: newShares });
  };

  // 處理成本價更新
  const handleCostPriceUpdate = (newCostPrice: number) => {
    onUpdateStock(stock.id, { costPrice: newCostPrice });
  };

  // 操作選單功能
  const handleUpdatePrice = async () => {
    setIsMenuOpen(false);
    try {
      // 調用後端API更新股價
      const response = await fetch(`http://localhost:3001/api/stock/${stock.symbol}`);
      if (response.ok) {
        const data = await response.json();
        onUpdateStock(stock.id, {
          currentPrice: data.price,
          lastUpdated: new Date(),
          priceSource: data.source === 'Yahoo Finance' ? 'Yahoo' : 'TWSE'
        });
      }
    } catch (error) {
      console.error('更新股價失敗:', error);
    }
  };

  const handleViewHistory = () => {
    setIsMenuOpen(false);
    // TODO: 實現購買歷史功能
    alert(`查看 ${stock.symbol} 的購買歷史`);
  };

  const handleViewDividends = () => {
    setIsMenuOpen(false);
    // 開啟股息管理介面
    setIsDividendManagerOpen(true);
  };

  // 處理刪除股票
  const handleDelete = () => {
    setIsMenuOpen(false);
    if (showDeleteConfirm) {
      setIsDeleteDialogOpen(true);
    } else {
      onDeleteStock(stock.id);
    }
  };

  // 確認刪除
  const handleConfirmDelete = () => {
    onDeleteStock(stock.id);
  };

  // 格式化價格顯示
  const formatPrice = (price: number): string => {
    return `${price.toFixed(2)}`;
  };

  // 格式化市值顯示
  const formatMarketValue = (value: number): string => {
    return `${value.toLocaleString()}`;
  };

  // 格式化損益顯示
  const formatGainLoss = (amount: number, percent: number): string => {
    const sign = amount >= 0 ? '+' : '';
    return `${sign}${amount.toFixed(0)} (${sign}${percent.toFixed(2)}%)`;
  };

  return (
    <>
      <tr className="hover:bg-slate-700 transition-colors">
        {/* 股票代碼 */}
        <td className="px-6 py-4">
          <span className="text-blue-400 font-mono font-medium">
            {stock.symbol}
          </span>
        </td>

        {/* 股票名稱 */}
        <td className="px-6 py-4">
          <span className="text-slate-300">
            {stock.name}
          </span>
        </td>

        {/* 持股數（可編輯） */}
        <td className="px-6 py-4">
          <EditableCell
            value={stock.shares}
            onSave={handleSharesUpdate}
            type="integer"
            min={1}
            max={999999999}
            displayFormat={(value) => value.toLocaleString()}
          />
        </td>

        {/* 成本價（可編輯） */}
        <td className="px-6 py-4">
          <EditableCell
            value={stock.costPrice}
            onSave={handleCostPriceUpdate}
            type="decimal"
            min={0.01}
            max={99999}
            displayFormat={formatPrice}
          />
        </td>

        {/* 現價 */}
        <td className="px-6 py-4">
          <span className="text-slate-300">
            {formatPrice(stock.currentPrice)}
          </span>
          <div className="text-xs text-slate-500 mt-1">
            {stock.priceSource} • {new Date(stock.lastUpdated).toLocaleTimeString('zh-TW', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </td>

        {/* 市值 */}
        <td className="px-6 py-4">
          <span className="text-slate-300 font-medium">
            {formatMarketValue(marketValue)}
          </span>
        </td>

        {/* 損益率 */}
        <td className="px-6 py-4">
          <span className={`font-medium ${
            gainLoss >= 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {formatGainLoss(gainLoss, gainLossPercent)}
          </span>
          {stock.adjustedCostPrice && stock.adjustedCostPrice !== stock.costPrice && (
            <div className="text-xs text-slate-500 mt-1" title="已調整股息成本">
              調整後成本: {formatPrice(stock.adjustedCostPrice)}
            </div>
          )}
        </td>

        {/* 股息 */}
        <td className="px-6 py-4">
          {totalDividend > 0 ? (
            <div>
              <span className="text-green-400 font-medium">
                +{totalDividend.toFixed(0)}
              </span>
              {stock.dividendRecords && stock.dividendRecords.length > 0 && (
                <div className="text-xs text-slate-500 mt-1">
                  {stock.dividendRecords.length} 次配息
                </div>
              )}
            </div>
          ) : (
            <span className="text-slate-500">-</span>
          )}
        </td>

        {/* 操作 */}
        <td className="px-6 py-4">
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-slate-300 hover:text-white transition-colors p-2 rounded hover:bg-slate-600 border border-slate-600"
              title="更多操作"
              aria-label={`${stock.symbol} 操作選單`}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="2"/>
                <circle cx="12" cy="12" r="2"/>
                <circle cx="12" cy="19" r="2"/>
              </svg>
            </button>

            {/* 全屏選單覆蓋 */}
            {isMenuOpen && (
              <>
                {/* 背景遮罩 */}
                <div 
                  className="fixed inset-0 bg-black bg-opacity-50 z-40"
                  onClick={() => setIsMenuOpen(false)}
                />
                
                {/* 右上角選單 */}
                <div className="fixed top-16 right-4 w-52 bg-slate-800 rounded-lg shadow-2xl z-50 p-3">
                  {/* 更新股價 */}
                  <button
                    onClick={handleUpdatePrice}
                    className="w-full mb-3 p-3 text-left text-white hover:bg-slate-700 transition-colors flex items-center rounded-lg bg-slate-700"
                  >
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium">更新股價</span>
                  </button>

                  {/* 購買歷史 */}
                  <button
                    onClick={handleViewHistory}
                    className="w-full mb-3 p-3 text-left text-white hover:bg-slate-700 transition-colors flex items-center rounded-lg bg-slate-700"
                  >
                    <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium">購買歷史</span>
                  </button>

                  {/* 股息記錄 */}
                  <button
                    onClick={handleViewDividends}
                    className="w-full mb-3 p-3 text-left text-white hover:bg-slate-700 transition-colors flex items-center rounded-lg bg-slate-700"
                  >
                    <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium">股息記錄</span>
                  </button>

                  {/* 刪除 */}
                  <button
                    onClick={handleDelete}
                    className="w-full p-3 text-left text-white hover:bg-red-800 transition-colors flex items-center rounded-lg bg-slate-700"
                  >
                    <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
                        />
                      </svg>
                    </div>
                    <span className="text-sm font-medium">刪除</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </td>
      </tr>

      {/* 刪除確認對話框 */}
      <DeleteConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        stock={stock}
      />

      {/* 股息管理對話框 */}
      <DividendManager
        isOpen={isDividendManagerOpen}
        onClose={() => setIsDividendManagerOpen(false)}
        stock={stock}
      />
    </>
  );
};

export default StockRow;