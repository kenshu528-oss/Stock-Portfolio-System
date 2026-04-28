import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import EditableCell from './EditableCell';
import DeleteConfirmDialog from './DeleteConfirmDialog';
import DividendManager from './DividendManager';
import RightsEventManager from './RightsEventManager';
import PurchaseHistoryManager from './PurchaseHistoryManager';
import UIEnhancementService from './UIEnhancementService';
import { useAppStore } from '../stores/appStore';
import { getTransactionTaxRate } from '../services/bondETFService';
import { RightsAdjustmentService } from '../services/rightsAdjustmentService';
import { applyTestStockRights, getStockRightsSummary } from '../utils/testStockRights';
import type { StockRecord } from '../types';
import { logger } from '../utils/logger';
import { API_ENDPOINTS } from '../config/api';
import { formatCurrency, formatPercent, formatShares } from '../utils/format';

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
  const [isRightsEventManagerOpen, setIsRightsEventManagerOpen] = useState(false);
  const [isPurchaseHistoryOpen, setIsPurchaseHistoryOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // 從store獲取成本價顯示模式和除權息計算模式
  const { showAdjustedCost, rightsAdjustmentMode } = useAppStore();

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

  // 計算顯示的成本價 - 智能顯示邏輯
  const displayCostPrice = (() => {
    // 如果有調整後成本價且與原始成本價不同，優先顯示調整後成本價
    if (stock.adjustedCostPrice && stock.adjustedCostPrice !== stock.costPrice) {
      return showAdjustedCost ? stock.adjustedCostPrice : stock.costPrice;
    }
    // 否則顯示原始成本價
    return stock.costPrice;
  })();
  
  // 智能顯示模式：有除權息記錄時自動顯示相關資訊
  const shouldShowCostInfo = stock.dividendRecords && stock.dividendRecords.length > 0;
  
  // 調試日誌：檢查adjustedCostPrice和顯示邏輯
  if (stock.symbol === '00679B' || stock.symbol === '4763' || stock.symbol === '2208' || stock.symbol === '2867' || stock.symbol === '2886' || stock.symbol === '2890') {
    logger.trace('stock', `調試 ${stock.symbol}`, {
      costPrice: stock.costPrice,
      adjustedCostPrice: stock.adjustedCostPrice,
      hasDividendRecords: !!stock.dividendRecords?.length,
      dividendRecordsCount: stock.dividendRecords?.length || 0,
      showAdjustedCost,
      shouldShowCostInfo,
      displayCostPrice,
      costPriceDifferent: stock.adjustedCostPrice !== stock.costPrice
    });
  }
  
  // 計算總股息（使用記錄中的總股息金額）
  const totalDividend = stock.dividendRecords?.reduce((sum, dividend) => {
    // 使用記錄中已計算好的總股息金額
    return sum + dividend.totalDividend;
  }, 0) || 0;

  // 計算損益（考慮完整的交易成本）
  const { accounts } = useAppStore();
  const account = accounts.find(acc => acc.id === stock.accountId);
  const brokerageFeeRate = account?.brokerageFee ?? 0.1425;
  const transactionTaxRate = account?.transactionTax ?? 0.3;
  
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
  
  // 計算損益：根據除權息模式切換計算方式
  // 🔍 特殊處理：如果是合併記錄，需要分別計算每筆原始記錄的損益再加總
  const gainLoss = (() => {
    if (hasMultipleRecords && !isDetailRow && (stock as any).originalRecords) {
      // 合併記錄：分別計算每筆原始記錄的損益，然後加總
      const originalRecords = (stock as any).originalRecords || [];
      return originalRecords.reduce((sum: number, record: StockRecord) => {
        const recordGainLoss = RightsAdjustmentService.calculateGainLossWithRights(
          record,
          rightsAdjustmentMode,
          brokerageFeeRate,
          transactionTaxRate
        );
        return sum + recordGainLoss;
      }, 0);
    } else {
      // 單一記錄或詳細記錄：直接計算
      return RightsAdjustmentService.calculateGainLossWithRights(
        stock,
        rightsAdjustmentMode,
        brokerageFeeRate,
        transactionTaxRate
      );
    }
  })();
  
  // 計算損益率（基於調整後成本價）
  const costBasisForPercent = stock.adjustedCostPrice || stock.costPrice;
  const totalCostBasisForPercent = costBasisForPercent * stock.shares;
  const gainLossPercent = totalCostBasisForPercent > 0 ? (gainLoss / totalCostBasisForPercent) * 100 : 0;
  
  // 市值等於總賣出價值
  const marketValue = grossSellValue;

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
      logger.debug('stock', `開始更新 ${stock.symbol} 股價`);
      
      // ✅ 使用與右上角更新相同的邏輯
      let priceData = null;
      
      try {
        // 檢查是否使用後端代理
        const { shouldUseBackendProxy } = await import('../config/api');
        
        if (shouldUseBackendProxy()) {
          // 本機端：使用後端代理服務
          const { StockPriceService } = await import('../services/stockPriceService');
          const stockPriceService = new StockPriceService();
          priceData = await stockPriceService.getStockPrice(stock.symbol);
          logger.debug('stock', `${stock.symbol} 後端代理獲取結果`, { 
            price: priceData?.price, 
            source: priceData?.source 
          });
        } else {
          // 雲端環境：使用雲端股價服務
          const { cloudStockPriceService } = await import('../services/cloudStockPriceService');
          priceData = await cloudStockPriceService.getStockPrice(stock.symbol);
          logger.debug('stock', `${stock.symbol} 雲端服務獲取結果`, { 
            price: priceData?.price, 
            source: priceData?.source 
          });
        }
      } catch (error) {
        logger.warn('stock', `${stock.symbol} 股價獲取失敗`, error.message);
      }
      
      if (priceData && priceData.price > 0) {
        logger.debug('stock', `${stock.symbol} 股價獲取成功`, { 
          price: priceData.price, 
          source: priceData.source 
        });
        
        // 更新股價資料
        if (hasMultipleRecords && !isDetailRow && (stock as any).originalRecords) {
          // 對於合併記錄，需要更新所有原始記錄
          const originalRecords = (stock as any).originalRecords || [];
          logger.debug('stock', `更新合併記錄 ${stock.symbol} 的 ${originalRecords.length} 筆原始記錄`);
          
          originalRecords.forEach((record: any) => {
            onUpdateStock(record.id, {
              currentPrice: priceData.price,
              lastUpdated: new Date(),
              priceSource: priceData.source || 'API'
            });
          });
        } else {
          // 單一記錄或詳細記錄，直接更新
          onUpdateStock(stock.id, {
            currentPrice: priceData.price,
            lastUpdated: new Date(),
            priceSource: priceData.source || 'API'
          });
        }
        
        logger.success('stock', `${stock.symbol} 股價更新成功: ${priceData.price} (${priceData.source})`);
      } else {
        logger.warn('stock', `${stock.symbol} 無法獲取股價資料`);
      }
    } catch (error) {
      logger.error('stock', `${stock.symbol} 股價更新失敗`, error.message);
    }
  };

  // 更新除權息資料的函數（與DividendManager邏輯一致）
  const updateDividendData = async () => {
    try {
      console.log(`🔍 StockRow: 更新 ${stock.symbol} 的除權息資料`);
      
      // 動態導入服務（避免循環依賴）
      const DividendApiService = (await import('../services/dividendApiService')).default;
      
      const apiDividends = await DividendApiService.getHistoricalDividends(
        stock.symbol,
        stock.purchaseDate
      );
      
      if (apiDividends.length > 0) {
        console.log(`✅ StockRow: 獲取到 ${apiDividends.length} 筆除權息資料`);
        
        // 檢查是否有未記錄的股息
        const existingDates = new Set(
          (stock.dividendRecords || []).map(d => {
            const date = d.exDividendDate instanceof Date ? d.exDividendDate : new Date(d.exDividendDate);
            return date.toISOString().split('T')[0];
          })
        );
        
        const missingApiDividends = apiDividends.filter(
          d => !existingDates.has(d.exDividendDate)
        );
        
        if (missingApiDividends.length > 0) {
          console.log(`📊 StockRow: 發現 ${missingApiDividends.length} 筆新的除權息資料，合併到現有記錄`);
          
          // 創建新的股息記錄
          const newDividendRecords = missingApiDividends.map((dividend, index) => ({
            id: `api-${Date.now()}-${index}-${stock.id}`,
            stockId: stock.id,
            symbol: dividend.symbol,
            exDividendDate: new Date(dividend.exDividendDate),
            dividendPerShare: dividend.dividendPerShare,
            totalDividend: dividend.dividendPerShare * stock.shares,
            shares: stock.shares
          }));

          // 合併現有記錄和新記錄
          const allDividendRecords = [...(stock.dividendRecords || []), ...newDividendRecords];

          // 計算調整後成本價（基於所有股息記錄）
          const totalDividendPerShare = allDividendRecords.reduce(
            (sum, record) => sum + record.dividendPerShare, 0
          );
          const adjustedCostPrice = Math.max(stock.costPrice - totalDividendPerShare, 0);

          // 更新股票記錄
          onUpdateStock(stock.id, {
            dividendRecords: allDividendRecords,
            adjustedCostPrice,
            lastDividendUpdate: new Date()
          });

          console.log(`✅ StockRow: ${stock.symbol} 除權息資料更新完成，總記錄: ${allDividendRecords.length}，調整後成本價: ${adjustedCostPrice?.toFixed(2) || 'N/A'}`);
        } else {
          console.log(`ℹ️ StockRow: ${stock.symbol} 除權息資料已是最新`);
          
          // 即使沒有新記錄，也要檢查現有記錄的調整後成本價計算
          if (stock.dividendRecords && stock.dividendRecords.length > 0) {
            console.log(`🔍 StockRow: ${stock.symbol} 檢查現有除權息記錄:`, stock.dividendRecords);
            
            const totalDividendPerShare = stock.dividendRecords.reduce(
              (sum, record) => {
                console.log(`📊 股息記錄: ${record.exDividendDate}, 每股股息: ${record.dividendPerShare}`);
                return sum + record.dividendPerShare;
              }, 0
            );
            
            console.log(`💰 ${stock.symbol} 總每股股息: ${totalDividendPerShare}`);
            console.log(`💰 ${stock.symbol} 原始成本價: ${stock.costPrice}`);
            
            const shouldBeAdjustedCostPrice = Math.max(stock.costPrice - totalDividendPerShare, 0);
            console.log(`💰 ${stock.symbol} 應該的調整後成本價: ${shouldBeAdjustedCostPrice?.toFixed(2) || 'N/A'}`);
            console.log(`💰 ${stock.symbol} 實際的調整後成本價: ${stock.adjustedCostPrice?.toFixed(2) || 'N/A'}`);
            
            // 如果計算結果與實際不符，強制更新
            if (Math.abs(shouldBeAdjustedCostPrice - (stock.adjustedCostPrice || stock.costPrice)) > 0.01) {
              console.log(`🔧 StockRow: ${stock.symbol} 調整後成本價不正確，強制更新`);
              onUpdateStock(stock.id, {
                adjustedCostPrice: shouldBeAdjustedCostPrice,
                lastDividendUpdate: new Date()
              });
            }
          }
        }
      } else {
        console.log(`ℹ️ StockRow: ${stock.symbol} 無除權息資料`);
      }
    } catch (error) {
      console.error(`❌ StockRow: 更新 ${stock.symbol} 除權息資料失敗:`, error);
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

  const handleRightsEventManagement = () => {
    setIsMenuOpen(false);
    // 開啟除權息事件管理介面
    setIsRightsEventManagerOpen(true);
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

  return (
    <>
      <tr className={`transition-colors ${
        isDetailRow 
          ? 'bg-slate-850 hover:bg-slate-800 border-l-2 border-blue-500' 
          : 'hover:bg-slate-700'
      }`}>
        {/* 股票代碼 - 固定寬度 */}
        <td className="px-2 py-2 text-center whitespace-nowrap w-16">
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center">
              {/* 展開/收合按鈕 */}
              {hasMultipleRecords && !isDetailRow && (
                <button
                  onClick={onToggleExpansion}
                  className="mr-1 p-0.5 text-slate-400 hover:text-white hover:bg-slate-600 rounded transition-colors"
                  title={isExpanded ? '收合詳細記錄' : '展開詳細記錄'}
                >
                  <svg 
                    className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
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
                <div className="mr-1 flex items-center">
                  <span className="text-xs text-slate-500 bg-slate-700 px-1 py-0.5 rounded">#{detailIndex}</span>
                </div>
              )}
              
              <span className={`font-mono font-medium text-sm ${
                isDetailRow ? 'text-slate-500' : 'text-blue-400'
              }`}>
                {stock.symbol}
              </span>
            </div>
            
            {/* 多筆記錄指示 */}
            {hasMultipleRecords && !isDetailRow && (
              <div className="mt-0.5">
                <span className="text-xs px-1 py-0.5 bg-blue-600 rounded text-white font-medium">
                  {(stock as any).originalRecords?.length || 1}筆
                </span>
              </div>
            )}
          </div>
        </td>

        {/* 股票名稱 - 靠左對齊 */}
        <td className="px-2 py-2 text-left w-24">
          <div className="truncate">
            <span className={`text-sm ${isDetailRow ? 'text-slate-500' : 'text-slate-300'}`}>
              {UIEnhancementService.fixStockNameDisplay(stock)}
            </span>
          </div>
        </td>

        {/* 現價 - w-20 */}
        <td className="px-3 py-3 text-right whitespace-nowrap w-20">
          <div className="flex flex-col items-end">
            <span className="text-slate-300 text-sm font-medium font-mono">
              {formatCurrency(stock.currentPrice, 2)}
            </span>
            {stock.priceSource && (
              <div className="text-xs text-slate-500 mt-0.5">
                {stock.priceSource === 'Yahoo' ? 'Yahoo' : 
                 stock.priceSource === 'FinMind' ? 'FinMind' : 
                 stock.priceSource.includes('Yahoo') ? 'Yahoo' :
                 stock.priceSource.includes('FinMind') ? 'FinMind' :
                 stock.priceSource}
              </div>
            )}
          </div>
        </td>

        {/* 市值 - w-24 */}
        <td className="px-3 py-3 text-right whitespace-nowrap w-24">
          <span className="text-slate-300 font-medium text-sm font-mono">
            {formatCurrency(marketValue, 0)}
          </span>
        </td>

        {/* 持股數 - w-20，統一寬度 */}
        <td className="px-3 py-3 text-right whitespace-nowrap w-20">
          <EditableCell
            value={stock.shares}
            onSave={handleSharesUpdate}
            type="integer"
            min={1}
            max={999999999}
            displayFormat={(value) => formatShares(value)}
            align="right"
          />
        </td>

        {/* 成本價 - w-24，統一寬度 */}
        <td className="px-3 py-3 text-right w-24">
          <div className="flex flex-col items-end">
            <EditableCell
              value={displayCostPrice}
              onSave={handleCostPriceUpdate}
              type="decimal"
              min={0.01}
              max={99999}
              displayFormat={(value) => formatCurrency(value, 2)}
              align="right"
            />
            {shouldShowCostInfo && stock.adjustedCostPrice && stock.adjustedCostPrice !== stock.costPrice && (
              <div className="text-xs mt-1">
                <div className="text-blue-400 font-mono">除息後: {formatCurrency(stock.adjustedCostPrice, 2)}</div>
              </div>
            )}
          </div>
        </td>

        {/* 損益率 - w-28 */}
        <td className="px-3 py-3 text-right w-28">
          <div className={`flex flex-col items-end ${UIEnhancementService.getGainLossColor(gainLoss)}`}>
            <span className="font-medium text-sm font-mono">
              {formatCurrency(gainLoss, 0)}
            </span>
            <span className="text-xs text-slate-400 mt-0.5">
              {formatPercent(gainLossPercent)}
            </span>
          </div>
        </td>

        {/* 股息 - w-20 */}
        <td className="px-3 py-3 text-right w-20">
          {totalDividend > 0 ? (
            <div className="flex flex-col items-end">
              <span className="text-green-400 font-medium text-sm font-mono">
                {formatCurrency(totalDividend, 0)}
              </span>
              {stock.dividendRecords && stock.dividendRecords.length > 0 && (
                <div className="text-xs text-slate-500 mt-1">
                  {stock.dividendRecords.length} 次
                </div>
              )}
            </div>
          ) : (
            <span className="text-slate-500 text-sm">-</span>
          )}
        </td>

        {/* 操作 - 移除固定定位，讓它可以隨表格滾動 */}
        <td className={`px-1 py-2 text-center whitespace-nowrap w-12 ${
          isDetailRow ? 'bg-slate-850' : 'bg-slate-800'
        }`}>
          {isDetailRow ? (
            // 詳細記錄的簡化操作
            <div className="flex justify-end">
              <button
                onClick={() => onDeleteStock(stock.id)}
                className="text-red-400 hover:text-red-300 transition-colors p-1 rounded hover:bg-slate-600"
                title="刪除此筆記錄"
              >
                <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ) : (
            // 主要記錄的完整操作選單
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-slate-300 hover:text-white transition-colors p-1 rounded hover:bg-slate-600 border border-slate-600"
                title="更多操作"
                aria-label={`${stock.symbol} 操作選單`}
              >
                <svg className="w-3 h-3 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 24 24">
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

                  {/* 除權息管理 */}
                  <button
                    onClick={handleRightsEventManagement}
                    className="w-full mb-3 p-3 text-left text-white hover:bg-slate-700 transition-colors flex items-center rounded-lg bg-slate-700"
                  >
                    <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <rect x="3" y="6" width="6" height="4" strokeWidth={1.5} />
                        <rect x="11" y="6" width="4" height="4" strokeWidth={1.5} />
                        <rect x="17" y="6" width="4" height="4" strokeWidth={1.5} />
                        <circle cx="12" cy="16" r="3" strokeWidth={1} />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 14v4m-1-2h2" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium">除權息管理</span>
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

      {/* 除權息事件管理對話框 - 使用Portal避免DOM結構警告 */}
      {isRightsEventManagerOpen && createPortal(
        <RightsEventManager
          stock={stock}
          onStockUpdate={(updatedStock) => {
            const updates = {
              shares: updatedStock.shares,
              adjustedCostPrice: updatedStock.adjustedCostPrice,
              dividendRecords: updatedStock.dividendRecords,
              lastDividendUpdate: updatedStock.lastDividendUpdate
            };
            // 合併記錄（id 以 merged- 開頭）需要更新所有原始記錄
            const originalRecords = (stock as any).originalRecords as StockRecord[] | undefined;
            if (originalRecords && originalRecords.length > 0) {
              // 只更新第一筆（最早購買）的除權息記錄，避免重複
              onUpdateStock(originalRecords[0].id, updates);
            } else {
              onUpdateStock(stock.id, updates);
            }
          }}
          onClose={() => setIsRightsEventManagerOpen(false)}
        />,
        document.body
      )}

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