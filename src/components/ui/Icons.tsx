import React from 'react';

// 統一的圖示組件定義

interface IconProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5', 
  lg: 'w-6 h-6'
};

// 確認圖示 (勾勾)
export const CheckIcon: React.FC<IconProps> = ({ className = '', size = 'md' }) => (
  <svg 
    className={`${sizeClasses[size]} ${className}`} 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24"
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth={3} 
      d="M5 13l4 4L19 7" 
    />
  </svg>
);

// 取消圖示 (X)
export const XIcon: React.FC<IconProps> = ({ className = '', size = 'md' }) => (
  <svg 
    className={`${sizeClasses[size]} ${className}`} 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24"
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth={3} 
      d="M6 18L18 6M6 6l12 12" 
    />
  </svg>
);

// 編輯圖示
export const EditIcon: React.FC<IconProps> = ({ className = '', size = 'md' }) => (
  <svg 
    className={`${sizeClasses[size]} ${className}`} 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24"
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth={2} 
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" 
    />
  </svg>
);

// 刪除圖示
export const DeleteIcon: React.FC<IconProps> = ({ className = '', size = 'md' }) => (
  <svg 
    className={`${sizeClasses[size]} ${className}`} 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24"
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth={2} 
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
    />
  </svg>
);

// 向上箭頭
export const ArrowUpIcon: React.FC<IconProps> = ({ className = '', size = 'md' }) => (
  <svg 
    className={`${sizeClasses[size]} ${className}`} 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24"
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth={2} 
      d="M5 15l7-7 7 7" 
    />
  </svg>
);

// 向下箭頭
export const ArrowDownIcon: React.FC<IconProps> = ({ className = '', size = 'md' }) => (
  <svg 
    className={`${sizeClasses[size]} ${className}`} 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24"
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth={2} 
      d="M19 9l-7 7-7-7" 
    />
  </svg>
);

// 關閉圖示 (Modal 用)
export const CloseIcon: React.FC<IconProps> = ({ className = '', size = 'md' }) => (
  <svg 
    className={`${sizeClasses[size]} ${className}`} 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24"
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth={2} 
      d="M6 18L18 6M6 6l12 12" 
    />
  </svg>
);

// 搜尋圖示
export const SearchIcon: React.FC<IconProps> = ({ className = '', size = 'md' }) => (
  <svg 
    className={`${sizeClasses[size]} ${className}`} 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24"
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth={2} 
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
    />
  </svg>
);

// 連線狀態圖示 - 已連線 (WiFi 圖示)
export const ConnectedIcon: React.FC<IconProps> = ({ className = '', size = 'md' }) => (
  <svg 
    className={`${sizeClasses[size]} ${className}`} 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24"
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth={2} 
      d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" 
    />
  </svg>
);

// 連線狀態圖示 - 未連線 (WiFi 關閉圖示)
export const DisconnectedIcon: React.FC<IconProps> = ({ className = '', size = 'md' }) => (
  <svg 
    className={`${sizeClasses[size]} ${className}`} 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24"
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth={2} 
      d="M3 3l18 18M10.584 10.587a4.5 4.5 0 00-1.897 1.73M16.5 16.5c-.75-.75-2.5-2.5-4.5-2.5s-3.75 1.75-4.5 2.5M12 20h.01M8.111 16.404a5.5 5.5 0 011.897-1.73m2.992-.001a5.5 5.5 0 011.897 1.73" 
    />
  </svg>
);

// 連線狀態圖示 - 錯誤 (警告圖示)
export const ErrorIcon: React.FC<IconProps> = ({ className = '', size = 'md' }) => (
  <svg 
    className={`${sizeClasses[size]} ${className}`} 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24"
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth={2} 
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
    />
  </svg>
);

// 資訊圖示 (幫助/提示圖示)
export const InfoIcon: React.FC<IconProps> = ({ className = '', size = 'md' }) => (
  <svg 
    className={`${sizeClasses[size]} ${className}`} 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24"
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth={2} 
      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
    />
  </svg>
);

// 警告三角形圖示 (警告提示)
export const AlertTriangleIcon: React.FC<IconProps> = ({ className = '', size = 'md' }) => (
  <svg 
    className={`${sizeClasses[size]} ${className}`} 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24"
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth={2} 
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
    />
  </svg>
);

// 上傳圖示 (雲端上傳)
export const UploadIcon: React.FC<IconProps> = ({ className = '', size = 'md' }) => (
  <svg 
    className={`${sizeClasses[size]} ${className}`} 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24"
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth={2} 
      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
    />
  </svg>
);