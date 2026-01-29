import React, { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { useAppStore } from '../stores/appStore';
import { addOperationLog } from './OperationLog';
import { getCloudSyncAvailability, getEnvironmentInfo } from '../utils/environment';
import { CloudDisconnectDialog } from './CloudDisconnectDialog'; // 疊加式新功能
import { CloudUploadWarningDialog } from './CloudUploadWarningDialog'; // 遵循 STEERING 規則新增
import { CloudDownloadWarningDialog } from './CloudDownloadWarningDialog'; // 遵循 STEERING 規則新增
import { logger } from '../utils/logger';

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
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false); // 疊加式新功能
  const [showUploadWarning, setShowUploadWarning] = useState(false); // 遵循 STEERING 規則新增
  const [showDownloadWarning, setShowDownloadWarning] = useState(false); // 遵循 STEERING 規則新增
  const [downloadData, setDownloadData] = useState<any>(null); // 儲存下載資料
  const [clickCount, setClickCount] = useState(0); // 隱蔽後門計數器

  const { accounts, stocks } = useAppStore();

  // 檢查雲端同步可用性
  const cloudSyncAvailability = getCloudSyncAvailability();
  const environmentInfo = getEnvironmentInfo();

  // 載入設定
  useEffect(() => {
    if (isOpen) {
      const savedToken = localStorage.getItem('githubToken');
      const savedAutoSync = localStorage.getItem('autoSyncEnabled') === 'true';
      const savedInterval = parseInt(localStorage.getItem('syncInterval') || '5');
      const savedLastSync = localStorage.getItem('lastSyncTime');
      
      if (savedToken) {
        setGithubToken(savedToken);
      } else {
        // 如果沒有保存的 Token，重置所有相關狀態
        setGithubToken('');
        setConnectionStatus('idle');
        setUserInfo(null);
        setStatusMessage('');
      }
      
      setAutoSyncEnabled(savedAutoSync);
      setSyncInterval(savedInterval);
      setLastSyncTime(savedLastSync);
      
      // 重置隱蔽後門計數器
      setClickCount(0);
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

  // 顯示上傳警告對話框
  const handleUploadToCloud = () => {
    if (!githubToken) {
      setStatusMessage('請先設定 GitHub Token');
      return;
    }
    
    // 遵循 STEERING 規則：上傳前彈出警告視窗
    setShowUploadWarning(true);
  };

  // 確認上傳到雲端（實際執行上傳）
  const handleConfirmUpload = async () => {
    setShowUploadWarning(false);
    setIsUploading(true);
    setStatusMessage('正在上傳資料到雲端...');
    addOperationLog('info', '開始上傳資料到雲端...');
    
    try {
      const exportData = {
        version: '1.0.2.0040',
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
      logger.error('cloud', '上傳失敗', error);
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
      // 使用自動下載方法，會自動尋找投資組合 Gists
      const GitHubGistService = (await import('../services/GitHubGistService')).default;
      
      console.log('開始自動搜尋投資組合 Gists...');
      const result = await GitHubGistService.downloadData(githubToken);
      
      if (!result.success) {
        throw new Error(result.error || '下載失敗');
      }
      
      const cloudData = result.data;
      logger.debug('cloud', '找到雲端資料', { 
        accounts: cloudData.accounts?.length || 0,
        stocks: cloudData.stocks?.length || 0 
      });
      
      setStatusMessage(`📥 發現雲端資料：帳戶 ${cloudData.accounts?.length || 0} 個，股票 ${cloudData.stocks?.length || 0} 筆`);
      
      logger.debug('cloud', 'onDataSync 檢查', { exists: !!onDataSync });
      
      if (onDataSync) {
        // 遵循 STEERING 規則：顯示下載警告對話框
        setDownloadData({
          cloudData,
          gistInfo: cloudData.gistInfo
        });
        setShowDownloadWarning(true);
        return; // 等待用戶確認，不繼續執行後續邏輯
      } else {
        logger.warn('cloud', 'onDataSync 回調不存在，無法同步資料');
        addOperationLog('error', 'onDataSync 回調不存在，無法同步資料');
      }
      
      addOperationLog('success', '✅ 雲端資料下載完成');
      
    } catch (error) {
      logger.error('cloud', '下載失敗', error);
      const errorMessage = error instanceof Error ? error.message : '未知錯誤';
      setStatusMessage(`❌ 下載失敗: ${errorMessage}`);
      addOperationLog('error', `❌ 下載失敗: ${errorMessage}`);
    } finally {
      setIsDownloading(false);
    }
  };

  // 確認下載到本地（實際執行下載同步）
  const handleConfirmDownload = () => {
    setShowDownloadWarning(false);
    
    if (downloadData && onDataSync) {
      logger.debug('cloud', '用戶確認同步，調用 onDataSync');
      
      if (typeof onDataSync === 'function') {
        logger.debug('cloud', '正在調用 onDataSync...');
        try {
          onDataSync(downloadData.cloudData);
          logger.success('cloud', 'onDataSync 調用完成');
          setStatusMessage('✅ 雲端資料已成功同步到本地');
          addOperationLog('success', '✅ 雲端資料已成功同步到本地');
        } catch (syncError) {
          logger.error('cloud', 'onDataSync 執行失敗', syncError);
          setStatusMessage('❌ 資料同步失敗');
          addOperationLog('error', `資料同步失敗: ${syncError instanceof Error ? syncError.message : '未知錯誤'}`);
        }
      } else {
        logger.error('cloud', 'onDataSync 不是函數', { type: typeof onDataSync });
        setStatusMessage('❌ 同步功能不可用');
        addOperationLog('error', 'onDataSync 回調函數不可用');
      }
    } else {
      logger.debug('cloud', '用戶取消同步');
      setStatusMessage('📥 雲端資料下載完成，但未同步到本地');
    }
    
    // 清除下載資料
    setDownloadData(null);
    setIsDownloading(false);
  };

  // 儲存設定
  const handleSaveSettings = () => {
    localStorage.setItem('githubToken', githubToken);
    localStorage.setItem('autoSyncEnabled', autoSyncEnabled.toString());
    localStorage.setItem('syncInterval', syncInterval.toString());
    
    addOperationLog('success', '雲端同步設定已儲存');
    onClose();
  };

  // 清除 Token
  const handleClearToken = () => {
    const confirmed = confirm(
      '確定要清除 GitHub Token 嗎？\n\n' +
      '這將會：\n' +
      '• 移除已儲存的 Token\n' +
      '• 停用雲端同步功能\n' +
      '• 清除連線狀態\n\n' +
      '您可以稍後重新設定 Token。'
    );
    
    if (confirmed) {
      // 清除 localStorage 中的相關資料
      localStorage.removeItem('githubToken');
      localStorage.removeItem('gistId');
      localStorage.removeItem('lastSyncTime');
      localStorage.removeItem('hasSkippedInitialSetup');
      
      // 重置組件狀態
      setGithubToken('');
      setConnectionStatus('idle'); // 重置為 idle 狀態
      setUserInfo(null);
      setStatusMessage('');
      setLastSyncTime(null);
      
      addOperationLog('info', 'GitHub Token 已清除，雲端同步功能已停用');
      addOperationLog('info', '重新整理頁面後將顯示初始設定對話框');
    }
  };

  const getStatusText = () => {
    if (githubToken) {
      switch (connectionStatus) {
        case 'connected': 
          return userInfo ? `已連線至 ${userInfo.login}` : '已連線';
        case 'error': 
          return '連線失敗';
        default: 
          return '已設定 Token，點擊測試連線';
      }
    } else {
      return '尚未連線';
    }
  };

  // 隱蔽後門：連續點擊觸發快速連線（僅未連線時可用）
  const handleHiddenTrigger = () => {
    // 已連線狀態下不允許觸發後門
    if (connectionStatus === 'connected') {
      logger.debug('cloud', '已連線狀態，隱蔽後門不可用');
      return;
    }
    
    const newCount = clickCount + 1;
    setClickCount(newCount);
    
    logger.debug('cloud', `隱蔽後門點擊: ${newCount}/5`);
    
    if (newCount >= 5) {
      // 連續點擊 5 次觸發隱蔽功能
      logger.info('cloud', '隱蔽後門觸發！');
      setClickCount(0); // 重置計數器
      
      // 隱蔽後門：自動填入預設 Token 並測試連線
      const hiddenToken = (() => {
        try {
          // 首先嘗試從環境變數讀取
          const envToken = import.meta.env?.VITE_DEV_TOKEN;
          if (envToken && envToken !== 'ghp_PLACEHOLDER_TOKEN_FOR_DEVELOPMENT') {
            logger.debug('cloud', '隱蔽後門：使用環境變數 Token');
            return envToken;
          }
          
          // 如果環境變數不可用，嘗試從 localStorage 讀取之前保存的 Token
          const savedToken = localStorage.getItem('dev_github_token');
          if (savedToken && savedToken !== 'ghp_PLACEHOLDER_TOKEN_FOR_DEVELOPMENT') {
            logger.debug('cloud', '隱蔽後門：使用 localStorage Token');
            return savedToken;
          }
          
          // 生產環境：提示用戶輸入並保存
          logger.warn('cloud', '隱蔽後門：環境變數未載入，請手動輸入 Token');
          const userToken = prompt(
            '🔐 隱蔽後門觸發\n\n' +
            '環境變數未載入，請輸入 GitHub Token：\n' +
            '(Token 會保存在 localStorage 中供下次使用)'
          );
          
          if (userToken && userToken.trim() && userToken !== 'ghp_PLACEHOLDER_TOKEN_FOR_DEVELOPMENT') {
            // 保存到 localStorage 供下次使用
            localStorage.setItem('dev_github_token', userToken.trim());
            logger.info('cloud', '隱蔽後門：Token 已保存到 localStorage');
            return userToken.trim();
          }
          
          // 最後使用佔位符
          return 'ghp_PLACEHOLDER_TOKEN_FOR_DEVELOPMENT';
        } catch (e) {
          console.error('🔧 讀取開發 Token 時發生錯誤:', e);
          return 'ghp_PLACEHOLDER_TOKEN_FOR_DEVELOPMENT';
        }
      })();
      
      // 自動填入隱蔽 Token
      setGithubToken(hiddenToken);
      localStorage.setItem('githubToken', hiddenToken);
      
      // 如果是佔位符，提示用戶並嘗試手動設定
      if (hiddenToken === 'ghp_PLACEHOLDER_TOKEN_FOR_DEVELOPMENT') {
        logger.warn('cloud', '隱蔽後門：環境變數未載入，請檢查 .env 檔案');
        setStatusMessage('⚠️ 開發 Token 未載入，請重新啟動開發服務器或手動設定');
        
        // 提供手動設定選項
        const manualToken = prompt(
          '🔧 開發模式：環境變數未正確載入\n\n' +
          '請手動輸入開發用的 GitHub Token：\n' +
          '(這個 Token 會暫時保存在 localStorage 中)'
        );
        
        if (manualToken && manualToken.startsWith('ghp_')) {
          setGithubToken(manualToken);
          localStorage.setItem('githubToken', manualToken);
          localStorage.setItem('dev_github_token', manualToken); // 保存供下次使用
          setStatusMessage('🔐 手動設定的 Token 已設定，正在連線...');
        } else {
          setStatusMessage('❌ 無效的 Token 或用戶取消');
          return;
        }
      } else {
        logger.debug('cloud', '隱蔽後門：自動填入 Token 並開始連線');
        setStatusMessage('🔐 隱蔽 Token 已設定，正在連線...');
      }
      
      // 自動觸發連線測試
      setTimeout(async () => {
        try {
          setIsConnecting(true);
          setConnectionStatus('idle');
          
          // 真實的 GitHub API 測試
          const GitHubGistService = (await import('../services/GitHubGistService')).default;
          const result = await GitHubGistService.testToken(hiddenToken);
          
          if (result.valid && result.user) {
            setConnectionStatus('connected');
            setUserInfo(result.user);
            setStatusMessage(`✅ 隱蔽連線成功！使用者: ${result.user.login}`);
            addOperationLog('success', `✅ 隱蔽後門連線成功！使用者: ${result.user.login}`);
          } else {
            setConnectionStatus('error');
            setStatusMessage('❌ 隱蔽連線失敗');
            addOperationLog('error', '❌ 隱蔽後門連線失敗');
          }
        } catch (error) {
          setConnectionStatus('error');
          const errorMessage = error instanceof Error ? error.message : '未知錯誤';
          setStatusMessage(`❌ 隱蔽連線失敗: ${errorMessage}`);
          addOperationLog('error', `❌ 隱蔽後門連線失敗: ${errorMessage}`);
        } finally {
          setIsConnecting(false);
        }
      }, 500);
    }
    
    // 3秒後重置計數器
    setTimeout(() => {
      setClickCount(0);
    }, 3000);
  };

  const getStatusColor = () => {
    if (githubToken) {
      switch (connectionStatus) {
        case 'connected': return 'text-green-400';
        case 'error': return 'text-red-400';
        default: return 'text-blue-400';
      }
    } else {
      return 'text-slate-400';
    }
  };

  return (
    <>
      <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        title="雲端同步"
        statusInfo={cloudSyncAvailability.available ? {
          icon: ({ className, size }: { className?: string; size?: string }) => (
            <div className={`flex items-center ${size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'}`}>
              {connectionStatus === 'connected' && (
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              )}
              {connectionStatus === 'error' && (
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              )}
              {connectionStatus === 'idle' && (
                <div className="w-2 h-2 bg-slate-500 rounded-full"></div>
              )}
            </div>
          ),
          color: getStatusColor(),
          text: getStatusText()
        } : undefined}
        className="max-w-lg"
      >
      <div className="space-y-4">
        {/* 簡化的環境警告 */}
        {!cloudSyncAvailability.available && (
          <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <p className="text-yellow-300 text-sm">雲端同步功能不可用</p>
                <p className="text-yellow-400 text-xs">{cloudSyncAvailability.reason}</p>
              </div>
            </div>
          </div>
        )}

        {/* 只有在支援的環境下才顯示完整功能 */}
        {cloudSyncAvailability.available ? (
          <>
            {/* 只在有狀態訊息時顯示 */}
            {statusMessage && (
              <div className="p-2 bg-slate-700 rounded text-xs text-slate-200">
                {statusMessage}
              </div>
            )}

            {/* GitHub 設定 */}
            <div>
              <h3 className="text-white font-medium mb-3 text-sm">GitHub Token</h3>
              
              <div className="space-y-3">
                <div className="flex space-x-2">
                  <div className="flex-1 relative">
                    <input
                      type={showToken ? 'text' : 'password'}
                      value={githubToken}
                      onChange={(e) => {
                        const newToken = e.target.value;
                        setGithubToken(newToken);
                        // 自動保存到 localStorage，實現持久化
                        if (newToken.trim()) {
                          localStorage.setItem('githubToken', newToken);
                        } else {
                          localStorage.removeItem('githubToken');
                        }
                      }}
                      placeholder="請輸入 GitHub Token"
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => setShowToken(!showToken)}
                    className="px-3 py-2 text-slate-400 hover:text-white text-sm"
                  >
                    {showToken ? '隱藏' : '顯示'}
                  </Button>
                </div>

                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    onClick={handleTestConnection}
                    disabled={isConnecting || !githubToken}
                    className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.102m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <span>{isConnecting ? '測試中...' : '測試連線'}</span>
                  </Button>

                  <Button
                    variant="ghost"
                    onClick={handleGetToken}
                    className="flex items-center space-x-2 text-yellow-400 hover:text-yellow-300 text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-3.586l4.293-4.293A6 6 0 0119 9z" />
                    </svg>
                    <span>取得 Token</span>
                  </Button>
                </div>

                <div className="text-xs text-yellow-400 flex items-center space-x-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span>需要具有 'gist' 權限的 GitHub Token</span>
                </div>
              </div>
            </div>

            {/* 同步操作 */}
            <div>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={handleUploadToCloud}
                  disabled={isUploading || !githubToken}
                  className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white py-2 text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span>{isUploading ? '上傳中...' : '上傳到雲端'}</span>
                </Button>

                <Button
                  onClick={handleDownloadFromCloud}
                  disabled={isDownloading || !githubToken}
                  variant="ghost"
                  className="flex items-center justify-center space-x-2 border border-slate-600 text-slate-300 hover:text-white py-2 text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                  <span>{isDownloading ? '下載中...' : '從雲端下載'}</span>
                </Button>
              </div>
            </div>

            {/* 簡化的使用說明 - 隱蔽後門觸發點（快速連線） */}
            <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <svg 
                  className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  onClick={handleHiddenTrigger}
                  style={{ cursor: 'default' }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-blue-300">
                  <p className="font-medium mb-1">使用說明</p>
                  <ul className="space-y-1 text-xs">
                    <li>• 資料以私人 Gist 形式安全儲存</li>
                    <li>• 可在多裝置間同步投資組合資料</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Token 管理區域 */}
            <div className="flex justify-center">
              <Button
                variant="ghost"
                onClick={handleClearToken}
                className="flex items-center space-x-2 text-red-400 hover:text-red-300 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>{githubToken ? '清除 Token' : '重置設定'}</span>
              </Button>
            </div>
          </>
        ) : (
          /* 不支援環境的簡化替代方案 */
          <div className="bg-slate-800 rounded-lg p-3">
            <h3 className="text-white font-medium mb-2 text-sm">替代方案</h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                <span className="text-slate-300">使用側邊欄的「匯出/匯入資料」功能</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                <span className="text-slate-300">本機開發：npm run dev</span>
              </div>
            </div>
          </div>
        )}

        {/* 操作按鈕 */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            {cloudSyncAvailability.available ? '取消' : '關閉'}
          </Button>
          {cloudSyncAvailability.available && (
            <Button
              onClick={handleSaveSettings}
              className="bg-green-600 hover:bg-green-700 text-white flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              <span>儲存設定</span>
            </Button>
          )}
        </div>
      </div>
    </Modal>
    
    {/* 疊加式新功能：斷開連線對話框 */}
    <CloudDisconnectDialog
      isOpen={showDisconnectDialog}
      onClose={() => setShowDisconnectDialog(false)}
      githubToken={githubToken}
    />
    
    {/* 遵循 STEERING 規則：雲端上傳警告對話框 */}
    <CloudUploadWarningDialog
      isOpen={showUploadWarning}
      onClose={() => setShowUploadWarning(false)}
      onConfirm={handleConfirmUpload}
      accountCount={accounts.length}
      stockCount={stocks.length}
      isUploading={isUploading}
    />
    
    {/* 遵循 STEERING 規則：雲端下載警告對話框 */}
    <CloudDownloadWarningDialog
      isOpen={showDownloadWarning}
      onClose={() => {
        setShowDownloadWarning(false);
        setDownloadData(null);
        setIsDownloading(false);
      }}
      onConfirm={handleConfirmDownload}
      accountCount={downloadData?.cloudData?.accounts?.length || 0}
      stockCount={downloadData?.cloudData?.stocks?.length || 0}
      updateTime={downloadData?.gistInfo ? new Date(downloadData.gistInfo.updated_at).toLocaleString() : ''}
      isDownloading={isDownloading}
    />
    </>
  );
};