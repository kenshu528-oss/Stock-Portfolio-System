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
      <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4 border border-slate-600">
        {/* 標題 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <AlertTriangleIcon size="md" className="text-yellow-400" />
            <h3 className="text-lg font-semibold text-white">
              雲端上傳警告
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="text-slate-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <XIcon size="sm" />
          </button>
        </div>

        {/* 警告內容 */}
        <div className="mb-6 space-y-4">
          <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangleIcon size="sm" className="text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="text-yellow-100">
                <p className="font-medium mb-2">⚠️ 重要提醒</p>
                <p className="text-sm">
                  此操作將會<strong className="text-yellow-300">覆蓋雲端現有的所有資料</strong>，
                  包括帳戶設定、股票記錄和除權息資料。
                </p>
              </div>
            </div>
          </div>

          {/* 上傳資料摘要 */}
          <div className="bg-slate-700/50 rounded-lg p-4">
            <h4 className="text-white font-medium mb-2">📤 準備上傳的資料：</h4>
            <div className="space-y-1 text-sm text-slate-300">
              <div className="flex justify-between">
                <span>帳戶數量：</span>
                <span className="text-blue-400 font-medium">{accountCount} 個</span>
              </div>
              <div className="flex justify-between">
                <span>股票記錄：</span>
                <span className="text-green-400 font-medium">{stockCount} 筆</span>
              </div>
              <div className="flex justify-between">
                <span>上傳時間：</span>
                <span className="text-slate-400">{new Date().toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* 建議 */}
          <div className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-3">
            <p className="text-blue-100 text-sm">
              💡 <strong>建議：</strong>如果您不確定雲端是否有重要資料，
              請先使用「從雲端下載」功能檢查現有資料。
            </p>
          </div>
        </div>

        {/* 按鈕 */}
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            disabled={isUploading}
            className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            disabled={isUploading}
            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>上傳中...</span>
              </>
            ) : (
              <>
                <UploadIcon size="sm" />
                <span>確認上傳</span>
              </>
            )}
          </button>
        </div>

        {/* 底部提示 */}
        <div className="mt-4 pt-4 border-t border-slate-600">
          <p className="text-xs text-slate-400 text-center">
            上傳後的資料將儲存在您的 GitHub Gist 中，可隨時下載恢復
          </p>
        </div>
      </div>
    </div>
  );
};

export default CloudUploadWarningDialog;