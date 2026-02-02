import React, { useEffect } from 'react';
import { StatusInfo, getStatusInfo } from '../../utils/statusConfig';
import StatusErrorBoundary from './StatusErrorBoundary';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  statusInfo?: StatusInfo;
  children: React.ReactNode;
  className?: string;
  autoHeight?: boolean; // 新增：是否自動調整高度
}

const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  statusInfo,
  children, 
  className = '',
  autoHeight = false 
}) => {
  // Handle ESC key press
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop with semi-transparent overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal content */}
      <div className={`relative bg-slate-800 rounded-lg shadow-xl w-full mx-4 border border-slate-700 flex flex-col ${
        autoHeight ? 'max-h-[85vh]' : 'max-h-[90vh]'
      } ${className || 'max-w-md'}`}>
        {/* Header - 固定在頂部 */}
        {title && (
          <div className="flex items-center justify-between p-6 border-b border-slate-700 flex-shrink-0">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-white truncate">{title}</h2>
              {statusInfo && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <statusInfo.icon className={`${statusInfo.color}`} size="sm" />
                  <span className={`text-sm ${statusInfo.color} whitespace-nowrap`}>
                    {statusInfo.text}
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors flex-shrink-0 ml-3"
              aria-label="關閉"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        
        {/* Content - 可滾動區域 */}
        <div className="p-6 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;