import React, { useState } from 'react';
import Button from './ui/Button';
import PrivacyToggle from './PrivacyToggle';
import OperationLog from './OperationLog';
import { VersionInfo } from './VersionInfo';
import { useAppStore } from '../stores/appStore';
import { VERSION } from '../constants/version';

interface HeaderProps {
  onMenuToggle: () => void;
  isMenuOpen: boolean;
  onPrivacyToggle?: () => void;
  isPrivacyMode?: boolean;
  onOpenCloudSync?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  onMenuToggle, 
  isMenuOpen, 
  onPrivacyToggle,
  isPrivacyMode = false,
  onOpenCloudSync
}) => {
  const [showImportExport, setShowImportExport] = useState(false);
  const [showVersionInfo, setShowVersionInfo] = useState(false);
  
  const { 
    updateAllStockPrices, 
    isUpdatingPrices, 
    priceUpdateProgress,
    lastPriceUpdate,
    showAdjustedCost,
    toggleCostDisplayMode
  } = useAppStore();

  const handleRefreshPrices = async () => {
    await updateAllStockPrices();
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
    console.log('Header: 開始匯入流程');
    
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
          const { importData } = useAppStore.getState();
          importData(processedAccounts, processedStocks, mode);
          
          console.log('Header: 匯入完成');
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

  // 雲端同步按鈕點擊處理
  const handleCloudSyncClick = () => {
    if (onOpenCloudSync) {
      onOpenCloudSync();
    }
  };

  return (
    <header className="bg-slate-800 shadow-sm border-b border-slate-700 px-4 py-3 sticky top-0 z-50">
      <div className="flex items-center justify-between">
        {/* Left side - Menu button, title and version */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMenuToggle}
            className="text-white hover:bg-slate-700"
            aria-label={isMenuOpen ? '關閉選單' : '開啟選單'}
          >
            {/* Hamburger menu icon - always show hamburger, not X */}
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </Button>
          
          <div className="flex items-baseline space-x-3">
            <h1 className="text-xl font-bold text-white">
              Stock Portfolio System
            </h1>
            <button
              onClick={() => setShowVersionInfo(true)}
              className="text-sm text-slate-500 hover:text-blue-400 transition-colors cursor-pointer"
              title="點擊查看版本資訊和更新記錄"
            >
              {VERSION.DISPLAY}
            </button>
          </div>
        </div>

          {/* 桌面版功能按鈕 - 手機版隱藏 */}
          <div className="hidden md:flex items-center space-x-2">
            {/* Operation Log Button */}
            <OperationLog />

            {/* Privacy Toggle Button */}
            <PrivacyToggle
              isPrivacyMode={isPrivacyMode}
              onToggle={onPrivacyToggle || (() => {})}
            />

            {/* Cost Display Mode Toggle Button */}
            <Button
              variant="ghost"
              size="sm"
              className={`text-white hover:bg-slate-700 ${
                showAdjustedCost ? 'bg-slate-700' : ''
              }`}
              aria-label={showAdjustedCost ? '顯示原始成本' : '顯示調整成本'}
              onClick={toggleCostDisplayMode}
              title={showAdjustedCost ? '目前顯示調整成本，點擊切換為原始成本' : '目前顯示原始成本，點擊切換為調整成本'}
            >
              {showAdjustedCost ? (
                // 調整成本圖示 - 計算機圖示
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              ) : (
                // 原始成本圖示 - 標籤圖示
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              )}
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
                console.log('開啟設定');
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
                aria-label="重新整理股價"
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

          {/* 手機版簡化按鈕 */}
          <div className="flex md:hidden items-center space-x-2">
            {/* 股價更新按鈕 - 手機版保留 */}
            <Button
              variant="ghost"
              size="sm"
              className={`text-white hover:bg-slate-700 ${isUpdatingPrices ? 'opacity-75' : ''}`}
              aria-label="重新整理股價"
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