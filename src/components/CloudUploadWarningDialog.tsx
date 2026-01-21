import React from 'react';
import { XIcon, AlertTriangleIcon, UploadIcon } from './ui/Icons';

interface CloudUploadWarningDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  accountCount: number;
  stockCount: number;
  isUploading: boolean;
}

export const CloudUploadWarningDialog: React.FC<CloudUploadWarningDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  accountCount,
  stockCount,
  isUploading
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div className="bg-slate-800 rounded-lg p-6 max-w-sm w-full mx-4 border border-slate-600 shadow-2xl">
        {/* 標題 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <AlertTriangleIcon size="md" className="text-yellow-400" />
            <h3 className="text-lg font-semibold text-slate-100">
              雲端上傳警告
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50 p-1 rounded-full hover:bg-slate-700/50"
          >
            <XIcon size="sm" />
          </button>
        </div>

        {/* 簡化的警告內容 */}
        <div className="mb-6 text-center">
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 mb-4">
            <AlertTriangleIcon size="lg" className="text-yellow-400 mx-auto mb-2" />
            <p className="text-slate-200 text-sm">
              此操作會<strong className="text-yellow-200">覆蓋雲端現有的所有資料</strong>
            </p>
          </div>
          
          <div className="text-slate-300 text-sm space-y-1">
            <p>帳戶: {accountCount} 個</p>
            <p>股票: {stockCount} 筆</p>
            <p className="text-xs text-slate-400">更新時間: {new Date().toLocaleString()}</p>
          </div>
          
          <p className="text-slate-400 text-xs mt-3">
            是否要用本地資料覆蓋雲端資料？
          </p>
        </div>

        {/* 簡化的按鈕 */}
        <div className="flex space-x-3">
          <button
            onClick={onConfirm}
            disabled={isUploading}
            className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>上傳中...</span>
              </>
            ) : (
              <span>確定</span>
            )}
          </button>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="flex-1 px-4 py-2.5 bg-slate-600 hover:bg-slate-500 text-slate-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
};

export default CloudUploadWarningDialog;