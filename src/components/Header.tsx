import React, { useState } from 'react';
import Button from './ui/Button';
import PrivacyToggle from './PrivacyToggle';
import OperationLog from './OperationLog';
import { VersionInfo } from './VersionInfo';
import { useAppStore } from '../stores/appStore';
import { VERSION } from '../constants/version';
import { logger } from '../utils/logger';

interface HeaderProps {
  onMenuToggle: () => void;
  isMenuOpen: boolean;
  onPrivacyToggle?: () => void;
  isPrivacyMode?: boolean;
  onOpenCloudSync?: () => void;
  onBatchProcessRights?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  onMenuToggle, 
  isMenuOpen, 
  onPrivacyToggle,
  isPrivacyMode = false,
  onOpenCloudSync,
  onBatchProcessRights
}) => {
  const [showImportExport, setShowImportExport] = useState(false);
  const [showVersionInfo, setShowVersionInfo] = useState(false);
  
  const { 
    updateAllStockPrices, 
    isUpdatingPrices, 
    priceUpdateProgress,
    lastPriceUpdate,
    rightsAdjustmentMode,
    toggleRightsAdjustmentMode
  } = useAppStore();

  const handleRefreshPrices = async () => {
    logger.info('stock', '開始批量更新：股價 + 除權息');
    
    // updateAllStockPrices 已經包含了完整的更新邏輯：
    // 1. 更新股價
    // 2. 同時處理除權息資料（使用與StockRow相同的邏輯）
    // 3. 計算調整後成本價
    await updateAllStockPrices();
    
    logger.success('stock', '批量更新完成');
  };

  // 匯出功能
  const handleExport = () => {
    try {
      const { accounts, stocks } = useAppStore.getState();
      const exportData = {
        version: "1.0.2.0023",
        exportDate: new Date().toISOString(),
        accounts,
        stocks,
        metadata: {
          totalAccounts: accounts.length,
          totalStocks: stocks.length,
          exportOptions: { format: 'json' }
        }
      };
      
      const content = JSON.stringify(exportData, null, 2);
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `portfolio_${new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')}.json`;
      link.click();
      URL.revokeObjectURL(url);
      
      alert('匯出成功！檔案已下載。');
    } catch (error) {
      alert('匯出失敗：' + (error instanceof Error ? error.message : '未知錯誤'));
    }
  };

  // 匯入功能
  const handleImport = () => {
    logger.debug('import', '開始匯入流程');
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        if (data.accounts && data.stocks) {
          // 讓用戶選擇匯入模式
          const useReplaceMode = confirm(
            `檔案包含：帳戶 ${data.accounts.length} 個，股票 ${data.stocks.length} 筆\n\n` +
            '請選擇匯入模式：\n\n' +
            '【確定】= 替換模式（完全替換現有資料）\n' +
            '【取消】= 合併模式（與現有資料合併）'
          );
          
          const mode = useReplaceMode ? 'replace' : 'merge';
          
          // 處理帳戶資料 - 轉換日期格式
          const processedAccounts = data.accounts.map((acc: any) => ({
            ...acc,
            createdAt: acc.createdAt ? new Date(acc.createdAt) : new Date()
          }));
          
          // 處理股票資料 - 轉換日期格式
          const processedStocks = data.stocks.map((stock: any) => ({
            ...stock,
            purchaseDate: new Date(stock.purchaseDate),
            lastUpdated: new Date(stock.lastUpdated),
            dividendRecords: stock.dividendRecords?.map((dividend: any) => ({
              ...dividend,
              exDividendDate: new Date(dividend.exDividendDate)
            })) || []
          }));
          
          // 使用 appStore 的 importData 方法
          const { importData, setCurrentAccount } = useAppStore.getState();
          importData(processedAccounts, processedStocks, mode);
          
          // 自動切換到第一個帳戶（遵循 cloud-sync-development.md 規範）
          if (processedAccounts.length > 0) {
            const firstAccountName = processedAccounts[0].name;
            setCurrentAccount(firstAccountName);
            logger.info('import', `自動切換到帳戶: ${firstAccountName}`);
          }
          
          logger.success('import', '匯入完成');
        } else {
          alert('檔案格式錯誤：缺少必要的帳戶或股票資料');
        }
      } catch (error) {
        alert('匯入失敗：' + (error instanceof Error ? error.message : '未知錯誤'));
      }
    };
    input.click();
  };

  const formatLastUpdateTime = (date: Date | null): string => {
    if (!date) return '尚未更新';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return '剛剛更新';
    if (diffMins < 60) return `${diffMins}分鐘前`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}小時前`;
    
    return date.toLocaleDateString('zh-TW');
  };

  // 除權息模式文字說明 - 更清楚的描述
  const getRightsAdjustmentModeText = (mode: typeof rightsAdjustmentMode): string => {
    switch (mode) {
      case 'excluding_rights': return '原始損益';
      case 'including_rights': return '含除權息';
      default: return '未知模式';
    }
  };

  // 除權息模式圖示 - 簡化設計
  const getRightsAdjustmentModeIcon = (mode: typeof rightsAdjustmentMode) => {
    switch (mode) {
      case 'excluding_rights':
        // 原始損益圖示 - 簡單的柱狀圖
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
      case 'including_rights':
        // 含除權息圖示 - 錢幣 + 股票符號
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="9" cy="9" r="4" strokeWidth={1.5} />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7v4m-1.5-2h3" />
            <rect x="14" y="14" width="7" height="7" strokeWidth={1.5} />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 17.5h3M17.5 16v3" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  // 雲端同步按鈕點擊處理
  const handleCloudSyncClick = () => {
    if (onOpenCloudSync) {
      onOpenCloudSync();
    }
  };

  return (
    <header className="bg-slate-800 shadow-sm border-b border-slate-700 px-2 md:px-3 py-2 sticky top-0 z-50">
      <div className="flex items-center justify-between gap-2">
        {/* Left side - Menu button, title and version */}
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMenuToggle}
            className="text-white hover:bg-slate-700 flex-shrink-0"
            aria-label={isMenuOpen ? '關閉選單' : '開啟選單'}
          >
            {/* Hamburger menu icon - always show hamburger, not X */}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </Button>
          
          <div className="flex items-baseline space-x-1 md:space-x-2 min-w-0 flex-1">
            <h1 className="text-sm md:text-lg font-bold text-white truncate">
              Stock Portfolio System
            </h1>
            <button
              onClick={() => setShowVersionInfo(true)}
              className="text-xs text-slate-500 hover:text-blue-400 transition-colors cursor-pointer flex-shrink-0 hidden sm:block"
              title="點擊查看版本資訊和更新記錄"
            >
              {VERSION.DISPLAY}
            </button>
          </div>
        </div>

        {/* Right side - Action buttons */}
        <div className="flex items-center space-x-1 flex-shrink-0">
          {/* 手機版：只顯示更新按鈕和選單 */}
          <div className="flex md:hidden items-center space-x-1">
            {/* 股價更新按鈕 */}
            <Button
              variant="ghost"
              size="sm"
              className={`text-white hover:bg-slate-700 p-1 ${isUpdatingPrices ? 'opacity-75' : ''}`}
              aria-label="更新股價"
              onClick={handleRefreshPrices}
              disabled={isUpdatingPrices}
            >
              <svg 
                className={`w-5 h-5 ${isUpdatingPrices ? 'animate-spin' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </Button>
            
            {/* 新增股票按鈕 - 手機版 */}
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-slate-700 p-1"
              aria-label="新增股票"
              onClick={() => {
                // 觸發 Sidebar 的新增股票功能
                onMenuToggle();
                setTimeout(() => {
                  const addStockBtn = document.querySelector('[data-action="add-stock"]') as HTMLElement;
                  addStockBtn?.click();
                }, 100);
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </Button>
          </div>

          {/* 桌面版：完整功能按鈕 */}
          <div className="hidden md:flex items-center space-x-1">
            {/* Operation Log Button */}
            <OperationLog />

            {/* Privacy Toggle Button */}
            <PrivacyToggle
              isPrivacyMode={isPrivacyMode}
              onToggle={onPrivacyToggle || (() => {})}
            />

            {/* Rights Adjustment Mode Toggle Button */}
            <Button
              variant="ghost"
              size="sm"
              className={`text-white hover:bg-slate-700 ${
                rightsAdjustmentMode === 'including_rights' ? 'bg-green-600 hover:bg-green-700' : ''
              }`}
              aria-label={`損益模式: ${getRightsAdjustmentModeText(rightsAdjustmentMode)}`}
              onClick={() => {
                logger.trace('global', '除權息模式切換');
                toggleRightsAdjustmentMode();
              }}
              title={
                rightsAdjustmentMode === 'excluding_rights'
                  ? '原始損益：只看股價漲跌（點擊切換為含除權息）'
                  : '含除權息：包含股息和配股的總報酬（點擊切換為原始損益）'
              }
            >
              {getRightsAdjustmentModeIcon(rightsAdjustmentMode)}
            </Button>

            {/* 匯入匯出按鈕 - 僅桌面版 */}
            <div className="relative">
              <button
                onClick={() => setShowImportExport(!showImportExport)}
                className="text-white hover:bg-slate-700 p-2 rounded flex items-center"
                title="資料匯入匯出"
              >
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {/* 下拉選單 */}
              {showImportExport && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowImportExport(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 bg-slate-800 border border-slate-600 rounded-lg shadow-lg z-20 min-w-[150px]">
                    <button
                      onClick={() => {
                        handleExport();
                        setShowImportExport(false);
                      }}
                      className="w-full text-left px-4 py-2 text-white hover:bg-slate-700 rounded-t-lg flex items-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      匯出資料
                    </button>
                    <button
                      onClick={() => {
                        handleImport();
                        setShowImportExport(false);
                      }}
                      className="w-full text-left px-4 py-2 text-white hover:bg-slate-700 rounded-b-lg flex items-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                      </svg>
                      匯入資料
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* 雲端同步按鈕 - 僅桌面版 */}
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-slate-700"
              aria-label="雲端同步"
              onClick={handleCloudSyncClick}
              title="雲端同步設定"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </Button>

            {/* Settings Button */}
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-slate-700"
              aria-label="設定"
              onClick={() => {
                // TODO: Open settings
                logger.debug('global', '開啟設定');
              }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Button>

            {/* Refresh Button */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className={`text-white hover:bg-slate-700 ${isUpdatingPrices ? 'opacity-75' : ''}`}
                aria-label="更新股價和除權息"
                onClick={handleRefreshPrices}
                disabled={isUpdatingPrices}
                title="更新所有股票的股價和除權息資料"
              >
                <svg 
                  className={`w-5 h-5 ${isUpdatingPrices ? 'animate-spin' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </Button>
              
              {/* 更新進度提示 */}
              {isUpdatingPrices && priceUpdateProgress.total > 0 && (
                <div className="absolute top-full right-0 mt-2 bg-slate-800 border border-slate-600 rounded-lg p-2 text-xs text-white whitespace-nowrap z-50">
                  更新中... {priceUpdateProgress.current}/{priceUpdateProgress.total}
                </div>
              )}
              
              {/* 最後更新時間提示 */}
              {!isUpdatingPrices && lastPriceUpdate && (
                <div className="absolute top-full right-0 mt-2 bg-slate-800 border border-slate-600 rounded-lg p-2 text-xs text-slate-300 whitespace-nowrap z-50 opacity-0 hover:opacity-100 transition-opacity">
                  最後更新: {formatLastUpdateTime(lastPriceUpdate)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* 版本資訊對話框 */}
      <VersionInfo
        isOpen={showVersionInfo}
        onClose={() => setShowVersionInfo(false)}
      />
    </header>
  );
};

export default Header;