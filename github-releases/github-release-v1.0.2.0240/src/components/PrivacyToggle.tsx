import React, { useState, useEffect } from 'react';
import Button from './ui/Button';

interface PrivacyToggleProps {
  isPrivacyMode: boolean;
  onToggle: () => void;
  showTooltip?: boolean;
  className?: string;
}

const PrivacyToggle: React.FC<PrivacyToggleProps> = ({
  isPrivacyMode,
  onToggle,
  showTooltip = true,
  className = ''
}) => {
  const [showMessage, setShowMessage] = useState(false);
  const [messageText, setMessageText] = useState('');

  // 處理隱私模式切換
  const handleToggle = () => {
    onToggle();
    
    // 顯示提示訊息
    const newMessage = !isPrivacyMode ? '隱私模式已啟用' : '隱私模式已關閉';
    setMessageText(newMessage);
    setShowMessage(true);
  };

  // 3秒後自動隱藏提示訊息
  useEffect(() => {
    if (showMessage) {
      const timer = setTimeout(() => {
        setShowMessage(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [showMessage]);

  return (
    <div className={`relative ${className}`}>
      {/* 隱私切換按鈕 */}
      <Button
        variant="ghost"
        size="sm"
        className="text-white hover:bg-slate-700 transition-colors duration-200"
        aria-label={isPrivacyMode ? '顯示金額' : '隱藏金額'}
        onClick={handleToggle}
        title={showTooltip ? (isPrivacyMode ? '點擊顯示金額' : '點擊隱藏金額') : undefined}
      >
        {isPrivacyMode ? (
          // 隱藏狀態 - 眼睛斜線圖示
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" 
            />
          </svg>
        ) : (
          // 顯示狀態 - 眼睛圖示
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
            />
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" 
            />
          </svg>
        )}
      </Button>

      {/* 隱私提示訊息 */}
      {showMessage && (
        <div className="absolute top-full right-0 mt-2 z-50">
          <div className="bg-slate-700 text-white text-sm px-3 py-2 rounded-lg shadow-lg border border-slate-600 whitespace-nowrap animate-fade-in">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isPrivacyMode ? 'bg-orange-400' : 'bg-green-400'}`}></div>
              <span>{messageText}</span>
            </div>
            {/* 箭頭指示器 */}
            <div className="absolute -top-1 right-4 w-2 h-2 bg-slate-700 border-l border-t border-slate-600 transform rotate-45"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrivacyToggle;