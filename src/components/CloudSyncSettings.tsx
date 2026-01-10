import React, { useState, useEffect } from 'react';
import { cloudSyncService, CloudSyncConfig, SyncStatus } from '../services/CloudSyncService';
import Button from './ui/Button';
import Input from './ui/Input';
import Modal from './ui/Modal';

interface CloudSyncSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onDataSync?: (data: any) => void;
}

export const CloudSyncSettings: React.FC<CloudSyncSettingsProps> = ({
  isOpen,
  onClose,
  onDataSync
}) => {
  const [config, setConfig] = useState<CloudSyncConfig | null>(null);
  const [status, setStatus] = useState<SyncStatus>({ lastSync: null, status: 'idle', message: '' });
  const [githubToken, setGithubToken] = useState('');
  const [autoSync, setAutoSync] = useState(false);
  const [syncInterval, setSyncInterval] = useState(30);
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
      updateStatus();
      
      // 定期更新狀態
      const interval = setInterval(updateStatus, 2000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const loadSettings = () => {
    const currentConfig = cloudSyncService.getConfig();
    if (currentConfig) {
      setConfig(currentConfig);
      setGithubToken(currentConfig.githubToken);
      setAutoSync(currentConfig.autoSync);
      setSyncInterval(currentConfig.syncInterval);
    }
  };

  const updateStatus = () => {
    setStatus(cloudSyncService.getStatus());
  };

  const handleSaveSettings = () => {
    const newConfig: CloudSyncConfig = {
      githubToken,
      autoSync,
      syncInterval,
      gistId: config?.gistId
    };

    cloudSyncService.initialize(newConfig);
    setConfig(newConfig);
    updateStatus();
  };

  const handleUploadToCloud = async () => {
    const localData = JSON.parse(localStorage.getItem('portfolioData') || '{}');
    await cloudSyncService.uploadToCloud(localData);
    updateStatus();
  };

  const handleDownloadFromCloud = async () => {
    const cloudData = await cloudSyncService.downloadFromCloud();
    if (cloudData && onDataSync) {
      // 詢問使用者是否要覆蓋本地資料
      const confirmed = window.confirm(
        `發現雲端資料（${new Date(cloudData.timestamp).toLocaleString()}）\n` +
        '是否要用雲端資料覆蓋本地資料？\n\n' +
        '⚠️ 這將會覆蓋您目前的所有本地資料！'
      );
      
      if (confirmed) {
        onDataSync(cloudData);
      }
    }
    updateStatus();
  };

  const handleTestConnection = async () => {
    if (!githubToken) {
      alert('請先輸入GitHub Token');
      return;
    }

    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${githubToken}`,
        }
      });

      if (response.ok) {
        const user = await response.json();
        alert(`連線成功！\n使用者: ${user.login}\n名稱: ${user.name || '未設定'}`);
      } else {
        alert('連線失敗！請檢查Token是否正確。');
      }
    } catch (error) {
      alert('網路錯誤，請檢查網路連線。');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-400';
      case 'error': return 'text-red-400';
      case 'syncing': return 'text-blue-400';
      default: return 'text-slate-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'syncing': return '🔄';
      default: return '⏸️';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="雲端同步設定">
      <div className="space-y-6">
        {/* 同步狀態 */}
        <div className="bg-slate-800 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-slate-300 mb-2">同步狀態</h3>
          <div className="flex items-center space-x-2">
            <span className="text-lg">{getStatusIcon(status.status)}</span>
            <span className={`text-sm ${getStatusColor(status.status)}`}>
              {status.message}
            </span>
          </div>
          {status.lastSync && (
            <p className="text-xs text-slate-500 mt-1">
              最後同步: {status.lastSync.toLocaleString()}
            </p>
          )}
        </div>

        {/* GitHub Token 設定 */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            GitHub Personal Access Token
          </label>
          <div className="space-y-2">
            <div className="flex space-x-2">
              <Input
                type={showToken ? 'text' : 'password'}
                value={githubToken}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGithubToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowToken(!showToken)}
              >
                {showToken ? '隱藏' : '顯示'}
              </Button>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleTestConnection}
                disabled={!githubToken}
              >
                測試連線
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open('https://github.com/settings/tokens', '_blank')}
              >
                取得Token
              </Button>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            需要 'gist' 權限的Personal Access Token
          </p>
        </div>

        {/* 自動同步設定 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-slate-300">
              自動同步
            </label>
            <input
              type="checkbox"
              checked={autoSync}
              onChange={(e) => setAutoSync(e.target.checked)}
              className="rounded"
            />
          </div>
          {autoSync && (
            <div>
              <label className="block text-sm text-slate-400 mb-1">
                同步間隔（分鐘）
              </label>
              <Input
                type="number"
                value={syncInterval}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSyncInterval(Number(e.target.value))}
                min="5"
                max="1440"
                className="w-24"
              />
            </div>
          )}
        </div>

        {/* 手動同步按鈕 */}
        <div className="flex space-x-2">
          <Button
            onClick={handleUploadToCloud}
            disabled={!githubToken || status.status === 'syncing'}
            className="flex-1"
          >
            {status.status === 'syncing' ? '同步中...' : '上傳到雲端'}
          </Button>
          <Button
            variant="ghost"
            onClick={handleDownloadFromCloud}
            disabled={!githubToken || status.status === 'syncing'}
            className="flex-1"
          >
            從雲端下載
          </Button>
        </div>

        {/* 操作按鈕 */}
        <div className="flex justify-end space-x-2 pt-4 border-t border-slate-700">
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSaveSettings}>
            儲存設定
          </Button>
        </div>

        {/* 說明文字 */}
        <div className="text-xs text-slate-500 space-y-1">
          <p>• 雲端同步使用GitHub Gist儲存您的投資組合資料</p>
          <p>• 資料會以私人Gist形式儲存，只有您能存取</p>
          <p>• 建議定期手動備份重要資料</p>
        </div>
      </div>
    </Modal>
  );
};