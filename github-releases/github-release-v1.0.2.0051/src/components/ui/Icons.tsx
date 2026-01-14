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