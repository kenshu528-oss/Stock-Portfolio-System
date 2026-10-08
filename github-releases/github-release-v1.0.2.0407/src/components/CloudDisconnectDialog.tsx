// 雲端斷開連線對話框 - 疊加式新功能
// 遵循 STEERING 規則：不修改現有 CloudSyncSettings，創建新組件

import React, { useState } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { useAppStore } from '../stores/appStore';
import { addOperationLog } from './OperationLog';
import CloudDisconnectService from '../services/CloudDisconnectService';
import { logger } from '../utils/logger';

interface CloudDisconnectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  githubToken: string;
}

export const CloudDisconnectDialog: React.FC<CloudDisconnectDialogProps> = ({
  isOpen,
  onClose,
  githubToken
}) => {
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [clearLocalData, setClearLocalData] = useState(true); // 預設選擇清除本地資料
  const { clearCloudSyncData } = useAppStore();

  const handleDisconnect = async () => {
    if (!githubToken) {
      setStatusMessage('沒有連線需要斷開');
      return;
    }

    setIsDisconnecting(true);
    setStatusMessage('正在斷開連線...');
    
    try {
      // 使用新的斷開連線服務
      const result = await CloudDisconnectService.safeDisconnect(githubToken);
      
      // 根據用戶選擇決定是否清除本地資料
      if (clearLocalData) {
        clearCloudSyncData();
        addOperationLog('success', '✅ 雲端連線已安全斷開，本地資料已清除');
        setStatusMessage('✅ 連線已斷開，本地資料已清除');
      } else {
        // 只清除 Token，保留其他資料
        localStorage.removeItem('githubToken');
        localStorage.removeItem('gistId');
        addOperationLog('success', '✅ 雲端連線已安全斷開，本地資料已保留');
        setStatusMessage('✅ 連線已斷開，本地資料已保留');
      }
      
      if (result.success) {
        // 1秒後自動關閉對話框
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        addOperationLog('warning', `⚠️ ${result.message}`);
        setStatusMessage(`⚠️ ${result.message}`);
      }
    } catch (error) {
      logger.error('cloud', '斷開連線時發生錯誤', error);
      
      // 發生錯誤時根據用戶選擇處理
      if (clearLocalData) {
        clearCloudSyncData();
      } else {
        localStorage.removeItem('githubToken');
        localStorage.removeItem('gistId');
      }
      
      const errorMessage = error instanceof Error ? error.message : '未知錯誤';
      const dataStatus = clearLocalData ? '本地資料已清除' : '本地資料已保留';
      addOperationLog('error', `❌ 斷開連線時發生錯誤: ${errorMessage}（${dataStatus}）`);
      setStatusMessage(`❌ 發生錯誤: ${errorMessage}`);
    } finally {
      setIsDisconnecting(false);
    }
  };

  const securityRecommendations = CloudDisconnectService.getSecurityRecommendations();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="斷開雲端連線">
      <div className="space-y-4">
        {/* 簡化的確認訊息 */}
        <div className="bg-slate-700 rounded-md p-4">
          <p className="text-sm text-slate-300 mb-3">
            確定要斷開雲端連線嗎？
          </p>
          
          {/* 本地資料處理選項 */}
          <div className="space-y-3">
            <p className="text-xs text-slate-400 font-medium">本地資料處理：</p>
            
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="radio"
                name="dataHandling"
                checked={clearLocalData}
                onChange={() => setClearLocalData(true)}
                className="mt-0.5 text-red-600 focus:ring-red-500"
              />
              <div>
                <p className="text-sm text-slate-300">清除所有本地雲端資料</p>
                <p className="text-xs text-slate-400">移除 Token、Gist ID、同步設定等</p>
              </div>
            </label>
            
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="radio"
                name="dataHandling"
                checked={!clearLocalData}
                onChange={() => setClearLocalData(false)}
                className="mt-0.5 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <p className="text-sm text-slate-300">僅移除 Token 連線</p>
                <p className="text-xs text-slate-400">保留其他設定，可快速重新連線</p>
              </div>
            </label>
          </div>
        </div>

        {/* 狀態訊息 */}
        {statusMessage && (
          <div className="bg-slate-700 rounded-md p-3">
            <p className="text-sm text-slate-200">{statusMessage}</p>
          </div>
        )}

        {/* 操作按鈕 */}
        <div className="flex space-x-3">
          <Button
            onClick={handleDisconnect}
            disabled={isDisconnecting}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
          >
            {isDisconnecting ? '正在斷開...' : '確認斷開'}
          </Button>
          <Button
            onClick={onClose}
            disabled={isDisconnecting}
            variant="ghost"
            className="flex-1 border border-slate-600 text-slate-300 hover:text-white"
          >
            取消
          </Button>
        </div>
      </div>
    </Modal>
  );
};