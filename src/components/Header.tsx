import React from 'react';
import Button from './ui/Button';
import PrivacyToggle from './PrivacyToggle';
import { useAppStore } from '../stores/appStore';

interface HeaderProps {
  onMenuToggle: () => void;
  isMenuOpen: boolean;
  onPrivacyToggle?: () => void;
  isPrivacyMode?: boolean;
}

const Header: React.FC<HeaderProps> = ({ 
  onMenuToggle, 
  isMenuOpen, 
  onPrivacyToggle,
  isPrivacyMode = false 
}) => {
  const { 
    updateAllStockPrices, 
    isUpdatingPrices, 
    priceUpdateProgress,
    lastPriceUpdate 
  } = useAppStore();

  const handleRefreshPrices = async () => {
    await updateAllStockPrices();
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
  return (
    <header className="bg-slate-800 shadow-sm border-b border-slate-700 px-4 py-3 sticky top-0 z-50">
      <div className="flex items-center justify-between">
        {/* Left side - Menu button and title */}
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
          
          <h1 className="text-xl font-bold text-white">
            Stock Portfolio System
          </h1>
        </div>

        {/* Right side - Privacy, Settings, Refresh buttons */}
        <div className="flex items-center space-x-2">
          {/* Privacy Toggle Button */}
          <PrivacyToggle
            isPrivacyMode={isPrivacyMode}
            onToggle={onPrivacyToggle || (() => {})}
          />

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
      </div>
    </header>
  );
};

export default Header;