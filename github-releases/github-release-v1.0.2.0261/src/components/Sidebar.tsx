import React, { useEffect } from 'react';
import Button from './ui/Button';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAccountManager: () => void;
  onOpenAddStock: () => void;
  onExport?: () => void;
  onImport?: () => void;
  onOpenCloudSync?: () => void;
  onResetToDefault?: () => void;
  onRefreshDividends?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  onClose, 
  onOpenAccountManager, 
  onOpenAddStock,
  onExport,
  onImport,
  onOpenCloudSync,
  onResetToDefault,
  onRefreshDividends
}) => {
  // Handle ESC key press and click outside
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop overlay - visible when sidebar is open */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar - always fixed and overlays content */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-slate-800 shadow-lg transform transition-transform duration-300 ease-in-out z-50
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Sidebar header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">功能選單</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-slate-700"
            aria-label="關閉選單"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>

        {/* Sidebar content - 添加滾動支援 */}
        <nav className="p-4 space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 80px)' }}>
          <Button
            variant="ghost"
            className="w-full justify-start text-left h-12 px-4 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg"
            onClick={() => {
              onOpenAddStock();
              onClose(); // 關閉側邊選單
            }}
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新增股票
          </Button>

          <Button
            variant="ghost"
            className="w-full justify-start text-left h-12 px-4 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg"
            onClick={() => {
              onOpenAccountManager();
              onClose(); // 關閉側邊選單
            }}
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            帳戶管理
          </Button>

          <Button
            variant="ghost"
            className="w-full justify-start text-left h-12 px-4 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg"
            onClick={() => {
              onRefreshDividends?.();
              onClose(); // 關閉側邊選單
            }}
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
            刷新股息資料
          </Button>

          {/* 批次處理除權息功能已移至 Header 右上角的更新按鈕，避免重複 */}

          <Button
            variant="ghost"
            className="w-full justify-start text-left h-12 px-4 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg"
            onClick={() => {
              onExport?.();
              onClose(); // 關閉側邊選單
            }}
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            匯出資料
          </Button>
          
          <Button
            variant="ghost"
            className="w-full justify-start text-left h-12 px-4 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg"
            onClick={() => {
              console.log('側邊欄匯入按鈕被點擊，onImport:', onImport);
              onImport?.();
              onClose(); // 關閉側邊選單
            }}
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
            匯入資料
          </Button>

          <Button
            variant="ghost"
            className="w-full justify-start text-left h-12 px-4 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg"
            onClick={() => {
              onOpenCloudSync?.();
              onClose(); // 關閉側邊選單
            }}
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            雲端同步
          </Button>

          <Button
            variant="ghost"
            className="w-full justify-start text-left h-12 px-4 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg"
            onClick={() => {
              // TODO: Open settings
              console.log('設定');
            }}
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            設定
          </Button>

          {/* 恢復預設值按鈕 - 紅色警告 */}
          <Button
            variant="ghost"
            className="w-full justify-start text-left h-12 px-4 text-red-400 hover:bg-red-900 hover:text-red-300 rounded-lg border border-red-800"
            onClick={() => {
              onResetToDefault?.();
              onClose(); // 關閉側邊選單
            }}
          >
            <svg className="w-5 h-5 mr-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            恢復預設值
          </Button>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;