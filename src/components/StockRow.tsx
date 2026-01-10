import React, { useState, useRef, useEffect } from 'react';
import EditableCell from './EditableCell';
import DeleteConfirmDialog from './DeleteConfirmDialog';
import DividendManager from './DividendManager';
import PurchaseHistoryManager from './PurchaseHistoryManager';
import { useAppStore } from '../stores/appStore';
import type { StockRecord } from '../types';

interface StockRowProps {
  stock: StockRecord;
  onUpdateStock: (id: string, updates: Partial<StockRecord>) => void;
  onDeleteStock: (id: string) => void;
  showDeleteConfirm?: boolean;
  hasMultipleRecords?: boolean;    // 是否有多筆記錄
  isExpanded?: boolean;            // 是否已展開
  onToggleExpansion?: () => void;  // 切換展開狀態
  isDetailRow?: boolean;           // 是否為詳細記錄列
  detailIndex?: number;            // 詳細記錄的索引
}

const StockRow: React.FC<StockRowProps> = ({
  stock,
  onUpdateStock,
  onDeleteStock,
  showDeleteConfirm = true,
  hasMultipleRecords = false,
  isExpanded = false,
  onToggleExpansion,
  isDetailRow = false,
  detailIndex
}) => {
  // 狀態管理
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDividendManagerOpen, setIsDividendManagerOpen] = useState(false);
  const [isPurchaseHistoryOpen, setIsPurchaseHistoryOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // 從store獲取成本價顯示模式
  const { showAdjustedCost } = useAppStore();

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

  // 計算顯示的成本價
  const displayCostPrice = showAdjustedCost && stock.adjustedCostPrice 
    ? stock.adjustedCostPrice 
    : stock.costPrice;
  
  // 計算市值
  const marketValue = stock.shares * stock.currentPrice;
  
  // 計算總股息（使用記錄中的總股息金額）
  const totalDividend = stock.dividendRecords?.reduce((sum, dividend) => {
    // 使用記錄中已計算好的總股息金額
    return sum + dividend.totalDividend;
  }, 0) || 0;

  // 計算損益（使用調整成本價或原始成本價）
  const costBasis = stock.adjustedCostPrice || stock.costPrice;
  const totalCost = stock.shares * costBasis;
  const gainLoss = marketValue - totalCost;
  const gainLossPercent = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;

  // 處理持股數更新（合併記錄的特殊處理）
  const handleSharesUpdate = (newShares: number) => {
    if (hasMultipleRecords && !isDetailRow) {
      // 對於合併記錄，按比例調整所有原始記錄
      const originalRecords = (stock as any).originalRecords || [];
      const totalOriginalShares = originalRecords.reduce((sum: number, record: any) => sum + record.shares, 0);
      
      originalRecords.forEach((record: any) => {
        const ratio = record.shares / totalOriginalShares;
        const newRecordShares = Math.round(newShares * ratio);
        onUpdateStock(record.id, { shares: newRecordShares });
      });
    } else {
      onUpdateStock(stock.id, { shares: newShares });
    }
  };

  // 處理成本價更新（合併記錄的特殊處理）
  const handleCostPriceUpdate = (newCostPrice: number) => {
    if (hasMultipleRecords && !isDetailRow) {
      // 對於合併記錄，更新所有原始記錄的成本價
      const originalRecords = (stock as any).originalRecords || [];
      originalRecords.forEach((record: any) => {
        onUpdateStock(record.id, { costPrice: newCostPrice });
      });
    } else {
      onUpdateStock(stock.id, { costPrice: newCostPrice });
    }
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
    // 開啟購買歷史管理介面
    setIsPurchaseHistoryOpen(true);
  };

  const handleViewDividends = () => {
    setIsMenuOpen(false);
    // 開啟股息管理介面
    setIsDividendManagerOpen(true);
  };

  // 處理刪除股票（合併記錄的特殊處理）
  const handleDelete = () => {
    setIsMenuOpen(false);
    if (hasMultipleRecords && !isDetailRow) {
      // 對於合併記錄，需要刪除所有原始記錄
      if (showDeleteConfirm) {
        setIsDeleteDialogOpen(true);
      } else {
        const originalRecords = (stock as any).originalRecords || [];
        originalRecords.forEach((record: any) => {
          onDeleteStock(record.id);
        });
      }
    } else {
      if (showDeleteConfirm) {
        setIsDeleteDialogOpen(true);
      } else {
        onDeleteStock(stock.id);
      }
    }
  };

  // 確認刪除（合併記錄的特殊處理）
  const handleConfirmDelete = () => {
    if (hasMultipleRecords && !isDetailRow) {
      // 刪除所有原始記錄
      const originalRecords = (stock as any).originalRecords || [];
      originalRecords.forEach((record: any) => {
        onDeleteStock(record.id);
      });
    } else {
      onDeleteStock(stock.id);
    }
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
      <tr className={`transition-colors ${
        isDetailRow 
          ? 'bg-slate-850 hover:bg-slate-800 border-l-2 border-blue-500' 
          : 'hover:bg-slate-700'
      }`}>
        {/* 股票代碼 */}
        <td className="px-6 py-4">
          <div>
            <div className="flex items-center">
              {/* 展開/收合按鈕 */}
              {hasMultipleRecords && !isDetailRow && (
                <button
                  onClick={onToggleExpansion}
                  className="mr-2 p-1 text-slate-400 hover:text-white hover:bg-slate-600 rounded transition-colors"
                  title={isExpanded ? '收合詳細記錄' : '展開詳細記錄'}
                >
                  <svg 
                    className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
              
              {/* 詳細記錄的縮排指示 */}
              {isDetailRow && (
                <div className="mr-2 flex items-center">
                  <div className="w-4 h-4 flex items-center justify-center">
                    <div className="w-2 h-px bg-slate-600"></div>
                  </div>
                  <span className="text-xs text-slate-500 mr-2 bg-slate-700 px-2 py-1 rounded">#{detailIndex}</span>
                </div>
              )}
              
              <span className={`font-mono font-medium ${
                isDetailRow ? 'text-slate-500' : 'text-blue-400'
              }`}>
                {stock.symbol}
              </span>
            </div>
            
            {/* 多筆記錄指示 - 移到股票代碼下方 */}
            {hasMultipleRecords && !isDetailRow && (
              <div className="mt-1">
                <span className="text-xs px-2 py-1 bg-blue-600 rounded-full text-white font-medium">
                  {(stock as any).originalRecords?.length || 1}筆
                </span>
              </div>
            )}
          </div>
        </td>

        {/* 股票名稱 */}
        <td className="px-6 py-4">
          <div>
            <span className={`${isDetailRow ? 'text-slate-500' : 'text-slate-300'}`}>
              {stock.name}
            </span>
            {isDetailRow && (
              <div className="text-xs text-slate-500 mt-1">
                買入日期: {new Date(stock.purchaseDate).toLocaleDateString('zh-TW')}
              </div>
            )}
            {hasMultipleRecords && !isDetailRow && (stock as any).originalRecords && (
              <div className="text-xs text-slate-500 mt-1">
                {(() => {
                  const records = (stock as any).originalRecords;
                  const dates = records.map((r: any) => new Date(r.purchaseDate));
                  const earliest = new Date(Math.min(...dates.map((d: Date) => d.getTime())));
                  const latest = new Date(Math.max(...dates.map((d: Date) => d.getTime())));
                  
                  if (earliest.getTime() === latest.getTime()) {
                    return `買入日期: ${earliest.toLocaleDateString('zh-TW')}`;
                  } else {
                    return `買入期間: ${earliest.toLocaleDateString('zh-TW')} ~ ${latest.toLocaleDateString('zh-TW')}`;
                  }
                })()}
              </div>
            )}
          </div>
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
          <div>
            <EditableCell
              value={displayCostPrice}
              onSave={handleCostPriceUpdate}
              type="decimal"
              min={0.01}
              max={99999}
              displayFormat={formatPrice}
            />
            {showAdjustedCost && stock.adjustedCostPrice && stock.adjustedCostPrice !== stock.costPrice && (
              <div className="text-xs text-slate-500 mt-1" title="調整後成本價">
                已扣除股息
              </div>
            )}
            {!showAdjustedCost && stock.adjustedCostPrice && stock.adjustedCostPrice !== stock.costPrice && (
              <div className="text-xs text-slate-500 mt-1" title="原始成本價">
                原始成本
              </div>
            )}
          </div>
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
        <td className="px-6 py-4 text-right">
          {isDetailRow ? (
            // 詳細記錄的簡化操作
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => onDeleteStock(stock.id)}
                className="text-red-400 hover:text-red-300 transition-colors p-1 rounded hover:bg-slate-600"
                title="刪除此筆記錄"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ) : (
            // 主要記錄的完整操作選單
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

                  {/* 展開詳情（僅合併記錄顯示） */}
                  {hasMultipleRecords && (
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        onToggleExpansion?.();
                      }}
                      className="w-full mb-3 p-3 text-left text-white hover:bg-slate-700 transition-colors flex items-center rounded-lg bg-slate-700"
                    >
                      <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium">
                        {isExpanded ? '收合詳情' : '展開詳情'}
                      </span>
                    </button>
                  )}

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
                    <span className="text-sm font-medium">
                      {hasMultipleRecords ? '刪除全部' : '刪除'}
                    </span>
                  </button>
                </div>
              </>
            )}
            </div>
          )}
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

      {/* 購買歷史管理對話框 */}
      <PurchaseHistoryManager
        isOpen={isPurchaseHistoryOpen}
        onClose={() => setIsPurchaseHistoryOpen(false)}
        stock={stock}
        onUpdateStock={onUpdateStock}
      />
    </>
  );
};

export default StockRow;