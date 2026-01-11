import React, { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { useAppStore } from '../stores/appStore';
import { addOperationLog } from './OperationLog';

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
  const [githubToken, setGithubToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connected' | 'error'>('idle');
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [syncInterval, setSyncInterval] = useState(5);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [userInfo, setUserInfo] = useState<any>(null);

  const { accounts, stocks } = useAppStore();

  // 載入設定
  useEffect(() => {
    if (isOpen) {
      const savedToken = localStorage.getItem('githubToken');
      const savedAutoSync = localStorage.getItem('autoSyncEnabled') === 'true';
      const savedInterval = parseInt(localStorage.getItem('syncInterval') || '5');
      const savedLastSync = localStorage.getItem('lastSyncTime');
      
      if (savedToken) setGithubToken(savedToken);
      setAutoSyncEnabled(savedAutoSync);
      setSyncInterval(savedInterval);
      setLastSyncTime(savedLastSync);
    }
  }, [isOpen]);

  // 測試連線
  const handleTestConnection = async () => {
    if (!githubToken) {
      setStatusMessage('請先輸入 GitHub Token');
      return;
    }

    setIsConnecting(true);
    setConnectionStatus('idle');
    setStatusMessage('正在測試 GitHub 連線...');
    addOperationLog('info', '正在測試 GitHub 連線...');

    try {
      // 真實的 GitHub API 測試
      const GitHubGistService = (await import('../services/GitHubGistService')).default;
      const result = await GitHubGistService.testToken(githubToken);
      
      if (result.valid && result.user) {
        setConnectionStatus('connected');
        setUserInfo(result.user);
        setStatusMessage(`連線成功！使用者: ${result.user.login}`);
        addOperationLog('success', `✅ GitHub 連線成功！使用者: ${result.user.login}`);
      } else {
        setConnectionStatus('error');
        setStatusMessage(result.error || '連線失敗');
        addOperationLog('error', `❌ ${result.error}`);
      }
      
    } catch (error) {
      setConnectionStatus('error');
      const errorMessage = error instanceof Error ? error.message : '未知錯誤';
      setStatusMessage(`連線失敗: ${errorMessage}`);
      addOperationLog('error', `❌ 連線失敗: ${errorMessage}`);
    } finally {
      setIsConnecting(false);
    }
  };

  // 獲取 Token 連結
  const handleGetToken = () => {
    window.open('https://github.com/settings/tokens/new?scopes=gist&description=Stock%20Portfolio%20System', '_blank');
  };

  // 上傳到雲端
  const handleUploadToCloud = async () => {
    if (!githubToken) {
      setStatusMessage('請先設定 GitHub Token');
      return;
    }

    setIsUploading(true);
    setStatusMessage('正在上傳資料到雲端...');
    addOperationLog('info', '開始上傳資料到雲端...');
    
    try {
      const exportData = {
        version: '1.0.1.0059',
        exportDate: new Date().toISOString(),
        accounts,
        stocks,
        metadata: {
          totalAccounts: accounts.length,
          totalStocks: stocks.length,
          source: 'Stock Portfolio System'
        }
      };

      // 真實的 GitHub Gist 上傳
      const GitHubGistService = (await import('../services/GitHubGistService')).default;
      const savedGistId = localStorage.getItem('gistId');
      
      const result = await GitHubGistService.uploadToGist({
        token: githubToken,
        gistId: savedGistId || undefined,
        description: 'Stock Portfolio System - 投資組合資料'
      }, exportData);
      
      // 保存 Gist ID 供下次更新使用
      localStorage.setItem('gistId', result.id);
      
      setLastSyncTime(new Date().toISOString());
      localStorage.setItem('lastSyncTime', new Date().toISOString());
      
      setStatusMessage(`✅ 上傳成功！帳戶: ${accounts.length} 個，股票: ${stocks.length} 筆`);
      addOperationLog('success', `✅ 資料已成功上傳到雲端！帳戶: ${accounts.length} 個，股票: ${stocks.length} 筆`);
      addOperationLog('info', `🔗 Gist URL: ${result.html_url}`);
      
    } catch (error) {
      console.error('上傳失敗:', error);
      const errorMessage = error instanceof Error ? error.message : '未知錯誤';
      setStatusMessage(`❌ 上傳失敗: ${errorMessage}`);
      addOperationLog('error', `❌ 上傳失敗: ${errorMessage}`);
    } finally {
      setIsUploading(false);
    }
  };

  // 從雲端下載
  const handleDownloadFromCloud = async () => {
    if (!githubToken) {
      setStatusMessage('請先設定 GitHub Token');
      return;
    }

    setIsDownloading(true);
    setStatusMessage('正在從雲端下載資料...');
    addOperationLog('info', '開始從雲端下載資料...');
    
    try {
      // 真實的 GitHub Gist 下載
      const GitHubGistService = (await import('../services/GitHubGistService')).default;
      const savedGistId = localStorage.getItem('gistId');
      
      if (!savedGistId) {
        throw new Error('找不到雲端資料，請先上傳資料到雲端');
      }
      
      const cloudData = await GitHubGistService.downloadFromGist({
        token: githubToken,
        gistId: savedGistId
      });
      
      setStatusMessage(`📥 發現雲端資料：帳戶 ${cloudData.accounts?.length || 0} 個，股票 ${cloudData.stocks?.length || 0} 筆`);
      
      if (onDataSync) {
        const confirmed = confirm(
          `發現雲端資料：\n\n` +
          `帳戶: ${cloudData.accounts?.length || 0} 個\n` +
          `股票: ${cloudData.stocks?.length || 0} 筆\n` +
          `更新時間: ${new Date(cloudData.gistInfo.updated_at).toLocaleString()}\n\n` +
          '是否要用雲端資料覆蓋本地資料？'
        );
        
        if (confirmed) {
          onDataSync(cloudData);
          setStatusMessage('✅ 雲端資料已成功同步到本地');
          addOperationLog('success', '✅ 雲端資料已成功同步到本地');
        } else {
          setStatusMessage('📥 雲端資料下載完成，但未同步到本地');
        }
      }
      
      addOperationLog('success', '✅ 雲端資料下載完成');
      
    } catch (error) {
      console.error('下載失敗:', error);
      const errorMessage = error instanceof Error ? error.message : '未知錯誤';
      setStatusMessage(`❌ 下載失敗: ${errorMessage}`);
      addOperationLog('error', `❌ 下載失敗: ${errorMessage}`);
    } finally {
      setIsDownloading(false);
    }
  };

  // 儲存設定
  const handleSaveSettings = () => {
    localStorage.setItem('githubToken', githubToken);
    localStorage.setItem('autoSyncEnabled', autoSyncEnabled.toString());
    localStorage.setItem('syncInterval', syncInterval.toString());
    
    addOperationLog('success', '雲端同步設定已儲存');
    onClose();
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return '已連線';
      case 'error': return '連線失敗';
      default: return '尚未設定雲端同步';
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-400';
      case 'error': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="雲端同步"
      className="max-w-lg"
    >
      <div className="space-y-6">
        {/* 同步狀態 */}
        <div className="bg-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-white font-medium">同步狀態</h3>
              <p className={`text-sm ${getStatusColor()}`}>{getStatusText()}</p>
            </div>
            <div className="flex items-center">
              {connectionStatus === 'connected' && (
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              )}
              {connectionStatus === 'error' && (
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              )}
              {connectionStatus === 'idle' && (
                <div className="w-3 h-3 bg-slate-500 rounded-full"></div>
              )}
            </div>
          </div>
          
          {/* 狀態訊息區域 */}
          {statusMessage && (
            <div className="mt-3 p-3 bg-slate-700 rounded-md">
              <p className="text-sm text-slate-200">{statusMessage}</p>
            </div>
          )}
          
          {/* 用戶資訊 */}
          {userInfo && connectionStatus === 'connected' && (
            <div className="mt-3 p-3 bg-green-900/20 border border-green-800 rounded-md">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-300">
                  已連線至 GitHub - {userInfo.login}
                  {userInfo.name && ` (${userInfo.name})`}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* GitHub 設定 */}
        <div>
          <h3 className="text-white font-medium mb-4">GitHub 設定</h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-slate-300 mb-2">
                Personal Access Token
              </label>
              <div className="flex space-x-2">
                <div className="flex-1 relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    placeholder="請輸入 GitHub Token"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setShowToken(!showToken)}
                  className="px-3 py-2 text-slate-400 hover:text-white"
                >
                  {showToken ? '隱藏' : '顯示'}
                </Button>
              </div>
            </div>

            <div className="flex space-x-2">
              <Button
                variant="ghost"
                onClick={handleTestConnection}
                disabled={isConnecting || !githubToken}
                className="flex items-center space-x-2 text-blue-400 hover:text-blue-300"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.102m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <span>{isConnecting ? '測試中...' : '測試連線'}</span>
              </Button>

              <Button
                variant="ghost"
                onClick={handleGetToken}
                className="flex items-center space-x-2 text-yellow-400 hover:text-yellow-300"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-3.586l4.293-4.293A6 6 0 0119 9z" />
                </svg>
                <span>取得 Token</span>
              </Button>
            </div>

            <div className="text-xs text-yellow-400 flex items-start space-x-2">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span>需要具有 'gist' 權限的 Personal Access Token</span>
            </div>
          </div>
        </div>

        {/* 自動同步設定 */}
        <div>
          <h3 className="text-white font-medium mb-4">自動同步設定</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">啟用自動同步</span>
              <button
                onClick={() => setAutoSyncEnabled(!autoSyncEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  autoSyncEnabled ? 'bg-blue-600' : 'bg-slate-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoSyncEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {autoSyncEnabled && (
              <div>
                <label className="block text-sm text-slate-300 mb-2">
                  同步間隔（分鐘）
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={syncInterval}
                  onChange={(e) => setSyncInterval(parseInt(e.target.value) || 5)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-400 mt-1">建議設定 30-60 分鐘</p>
              </div>
            )}
          </div>
        </div>

        {/* 同步操作 */}
        <div>
          <h3 className="text-white font-medium mb-4">同步操作</h3>
          
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleUploadToCloud}
              disabled={isUploading || !githubToken}
              className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white py-3"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span>{isUploading ? '上傳中...' : '上傳到雲端'}</span>
            </Button>

            <Button
              onClick={handleDownloadFromCloud}
              disabled={isDownloading || !githubToken}
              variant="ghost"
              className="flex items-center justify-center space-x-2 border border-slate-600 text-slate-300 hover:text-white py-3"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              <span>{isDownloading ? '下載中...' : '從雲端下載'}</span>
            </Button>
          </div>
        </div>

        {/* 操作按鈕 */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            取消
          </Button>
          <Button
            onClick={handleSaveSettings}
            className="bg-green-600 hover:bg-green-700 text-white flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            <span>儲存設定</span>
          </Button>
        </div>

        {/* 使用說明 */}
        <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <svg className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-300">
              <p className="font-medium mb-1">使用說明</p>
              <ul className="space-y-1 text-xs">
                <li>• 雲端同步使用 GitHub Gist 安全儲存投資組合資料</li>
                <li>• 資料以私人 Gist 形式存儲，只有您能夠存取</li>
                <li>• 建議定期手動備份重要資料</li>
                <li>• 多裝置間可透過雲端同步保持資料一致</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};