import React, { useState, useRef, useEffect } from 'react';

interface EditableCellProps {
  value: number;
  onSave: (newValue: number) => void;
  type?: 'integer' | 'decimal';
  min?: number;
  max?: number;
  className?: string;
  displayFormat?: (value: number) => string;
  align?: 'left' | 'center' | 'right';
}

const EditableCell: React.FC<EditableCellProps> = ({
  value,
  onSave,
  type = 'decimal',
  min = 0,
  max,
  className = '',
  displayFormat,
  align = 'left'
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  // 當進入編輯模式時聚焦輸入框
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // 開始編輯
  const handleStartEdit = () => {
    setIsEditing(true);
    setEditValue(value.toString());
  };

  // 儲存變更
  const handleSave = () => {
    const numValue = parseFloat(editValue);
    
    // 驗證輸入值
    if (isNaN(numValue) || numValue < min || (max !== undefined && numValue > max)) {
      // 如果無效，恢復原值
      setEditValue(value.toString());
      setIsEditing(false);
      return;
    }

    // 根據類型處理數值
    const finalValue = type === 'integer' ? Math.floor(numValue) : numValue;
    
    if (finalValue !== value) {
      onSave(finalValue);
    }
    
    setIsEditing(false);
  };

  // 取消編輯
  const handleCancel = () => {
    setEditValue(value.toString());
    setIsEditing(false);
  };

  // 處理鍵盤事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  // 處理輸入變更
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // 允許空值、負號、小數點和數字
    if (inputValue === '' || /^-?\d*\.?\d*$/.test(inputValue)) {
      setEditValue(inputValue);
    }
  };

  // 格式化顯示值
  const formatDisplayValue = (val: number): string => {
    if (displayFormat) {
      return displayFormat(val);
    }
    
    if (type === 'integer') {
      return val.toLocaleString();
    }
    
    return val.toFixed(2);
  };

  // 獲取對齊樣式
  const getAlignClass = () => {
    switch (align) {
      case 'center': return 'text-center';
      case 'right': return 'text-right';
      default: return 'text-left';
    }
  };

  if (isEditing) {
    return (
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={handleInputChange}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className={`
            w-full px-2 py-1 text-sm
            bg-slate-700 border border-blue-500 rounded
            text-white placeholder-slate-400
            focus:outline-none focus:ring-1 focus:ring-blue-500
            ${getAlignClass()}
            ${className}
          `}
          placeholder={type === 'integer' ? '輸入整數' : '輸入數值'}
        />
        <div className="absolute -bottom-6 left-0 text-xs text-slate-400">
          Enter 儲存 • Esc 取消
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleStartEdit}
      className={`
        group relative w-full
        hover:bg-slate-700 rounded px-2 py-1 transition-colors
        border border-transparent hover:border-slate-600
        ${getAlignClass()}
        ${className}
      `}
      title="點擊編輯"
    >
      <div className={`flex items-center ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'}`}>
        <svg 
          className="w-3 h-3 mr-1 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 group-hover:text-white flex-shrink-0" 
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
        <span className="text-slate-300 text-sm font-medium font-mono group-hover:text-white">
          {formatDisplayValue(value)}
        </span>
      </div>
    </button>
  );
};

export default EditableCell;