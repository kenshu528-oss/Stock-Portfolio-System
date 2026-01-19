import React, { useState } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { getCloudSyncAvailability } from '../utils/environment';
import { addOperationLog } from './OperationLog';

interface InitialSetupProps {
  isOpen: boolean;
  onClose: () => void;
  onTokenSaved: (token: string) => void;
  onDataSync?: (data: any) => void;
}

type SetupStep = 'input' | 'connect' | 'download' | 'complete';

export const InitialSetup: React.FC<InitialSetupProps> = ({
  isOpen,
  onClose,
  onTokenSaved,
  onDataSync
}) => {
  const [githubToken, setGithubToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [currentStep, setCurrentStep] = useState<SetupStep>('input');
  const [isValidating, setIsValidating] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [validationError, setValidationError] = useState<string>('');
  const [connectionResult, setConnectionResult] = useState<{success: boolean, message: string} | null>(null);

  const cloudSyncAvailability = getCloudSyncAvailability();

  // 驗證 GitHub Token
  const validateToken = async (token: string): Promise<boolean> => {
    if (!token.trim()) {
      setValidationError('請輸入 GitHub Token');
      return false;
    }

    // 檢查 Token 格式 (GitHub Personal Access Token 通常以 ghp_ 開頭)
    if (!token.startsWith('ghp_') && !token.startsWith('github_pat_')) {
      setValidationError('Token 格式可能不正確，請確認是否為有效的 GitHub Personal Access Token');
      return false;
    }

    try {
      setIsValidating(true);
      setValidationError('');

      // 基本格式驗證通過，進入下一步
      return true;
    } catch (error) {
      setValidationError('Token 驗證失敗');
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  // 測試連線
  const testConnection = async (): Promise<void> => {
    try {
      setIsConnecting(true);
      setConnectionResult(null);

      if (!cloudSyncAvailability.available) {
        setConnectionResult({
          success: false,
          message: `連線失敗：${cloudSyncAvailability.reason}`
        });
        return;
      }

      // 測試 Token 有效性
      const GitHubGistService = (await import('../services/GitHubGistService')).default;
      const result = await GitHubGistService.testToken(githubToken);
      
      if (result.valid) {
        setConnectionResult({
          success: true,
          message: '連線成功！GitHub Token 驗證通過'
        });
        addOperationLog('success', 'GitHub 連線測試成功');
      } else {
        setConnectionResult({
          success: false,
          message: result.error || '連線失敗，請檢查 Token 是否正確'
        });
      }
    } catch (error) {
      setConnectionResult({
        success: false,
        message: '連線失敗，請檢查網路連線或 Token 是否正確'
      });
    } finally {
      setIsConnecting(false);
    }
  };

  // 下載雲端資料
  const downloadCloudData = async (): Promise<void> => {
    try {
      setIsDownloading(true);
      
      // 在下載前創建備份
      try {
        const currentData = localStorage.getItem('portfolioData');
        if (currentData) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const backupKey = `backup_pre_download_${timestamp}`;
          localStorage.setItem(backupKey, currentData);
          addOperationLog('info', '已創建本地資料備份');
        }
      } catch (backupError) {
        console.warn('創建備份失敗:', backupError);
      }
      
      const GitHubGistService = (await import('../services/GitHubGistService')).default;
      const result = await GitHubGistService.downloadData(githubToken);
      
      if (result.success && result.data) {
        console.log('下載的雲端資料:', result.data);
        
        // 整合到主要的資料管理系統
        if (onDataSync) {
          console.log('調用 onDataSync 回調函數');
          onDataSync(result.data);
        } else {
          console.warn('onDataSync 回調函數不存在');
        }
        
        addOperationLog('success', `成功下載雲端資料，包含 ${result.data.stocks?.length || 0} 筆股票記錄`);
        setCurrentStep('complete');
      } else {
        console.log('雲端下載結果:', result);
        addOperationLog('info', '雲端沒有找到資料，將使用本地資料');
        setCurrentStep('complete');
      }
    } catch (error) {
      addOperationLog('error', '下載雲端資料失敗，將使用本地資料');
      setCurrentStep('complete');
    } finally {
      setIsDownloading(false);
    }
  };

  // 處理 Token 輸入完成
  const handleTokenSubmit = async () => {
    const isValid = await validateToken(githubToken);
    if (isValid) {
      localStorage.setItem('githubToken', githubToken);
      setCurrentStep('connect');
    }
  };

  // 處理連線確認
  const handleConnectConfirm = () => {
    testConnection();
  };

  // 處理連線成功後的下一步
  const handleConnectionNext = () => {
    if (connectionResult?.success) {
      setCurrentStep('download');
    } else {
      // 連線失敗，但用戶可以選擇繼續
      setCurrentStep('complete');
    }
  };

  // 處理下載確認
  const handleDownloadConfirm = () => {
    downloadCloudData();
  };

  // 跳過下載
  const handleSkipDownload = () => {
    addOperationLog('info', '已跳過雲端資料下載');
    setCurrentStep('complete');
  };

  // 完成設定
  const handleComplete = () => {
    onTokenSaved(githubToken);
    onClose();
  };

  // 稍後設定
  const handleSkip = () => {
    addOperationLog('info', '已跳過 GitHub Token 設定，可稍後在雲端同步設定中配置');
    onClose();
  };

  // 獲取 Token 說明
  const handleGetToken = () => {
    window.open('https://github.com/settings/tokens/new?scopes=gist&description=Stock%20Portfolio%20System', '_blank');
  };

  // 渲染不同步驟的內容
  const renderStepContent = () => {
    switch (currentStep) {
      case 'input':
        return renderTokenInput();
      case 'connect':
        return renderConnectionTest();
      case 'download':
        return renderDataDownload();
      case 'complete':
        return renderComplete();
      default:
        return renderTokenInput();
    }
  };

  // Token 輸入步驟
  const renderTokenInput = () => (
    <div className="space-y-6">
      {/* 歡迎訊息 */}
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-white mb-2">歡迎使用股票投資組合系統！</h3>
        <p className="text-slate-300 text-sm">
          為了使用雲端同步功能，請設定您的 GitHub Token
        </p>
      </div>

      {/* 環境檢查 */}
      {!cloudSyncAvailability.available && (
        <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <svg className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <p className="text-yellow-300 text-sm font-medium">注意</p>
              <p className="text-yellow-200 text-xs">{cloudSyncAvailability.reason}</p>
              <p className="text-yellow-200 text-xs mt-1">您仍可設定 Token，但雲端同步功能將在支援的環境中才能使用。</p>
            </div>
          </div>
        </div>
      )}

      {/* Token 輸入 */}
      <div>
        <label className="block text-sm text-slate-300 mb-2">
          GitHub Personal Access Token
        </label>
        <div className="flex space-x-2">
          <div className="flex-1 relative">
            <input
              type={showToken ? 'text' : 'password'}
              value={githubToken}
              onChange={(e) => {
                setGithubToken(e.target.value);
                setValidationError('');
              }}
              placeholder="請輸入您的 GitHub Token"
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
        
        {/* 驗證錯誤 */}
        {validationError && (
          <div className="mt-2 p-2 bg-red-900/20 border border-red-800 rounded-md">
            <p className="text-red-300 text-xs">{validationError}</p>
          </div>
        )}
      </div>

      {/* 取得 Token 說明 */}
      <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-3">
        <div className="flex items-start space-x-2">
          <svg className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-300">
            <p className="font-medium mb-1">如何取得 GitHub Token？</p>
            <ol className="space-y-1 text-xs list-decimal list-inside">
              <li>點擊下方「取得 Token」按鈕</li>
              <li>登入您的 GitHub 帳號</li>
              <li>設定 Token 名稱和權限 (需要 gist 權限)</li>
              <li>複製生成的 Token 並貼上</li>
            </ol>
          </div>
        </div>
      </div>

      {/* 操作按鈕 */}
      <div className="space-y-3">
        <Button
          onClick={handleGetToken}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-3.586l4.293-4.293A6 6 0 0119 9z" />
          </svg>
          <span>取得 GitHub Token</span>
        </Button>

        <div className="flex space-x-3">
          <Button
            onClick={handleTokenSubmit}
            disabled={!githubToken.trim() || isValidating}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white flex items-center justify-center space-x-2"
          >
            {isValidating ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>驗證中...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                </svg>
                <span>下一步</span>
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            onClick={handleSkip}
            className="flex-1 border border-slate-600 text-slate-300 hover:text-white hover:border-slate-500"
          >
            稍後設定
          </Button>
        </div>
      </div>

      {/* 提示訊息 */}
      <div className="text-center">
        <p className="text-slate-400 text-xs">
          您可以隨時在「雲端同步」設定中修改 Token
        </p>
      </div>
    </div>
  );

  // 連線測試步驟
  const renderConnectionTest = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-white mb-2">測試 GitHub 連線</h3>
        <p className="text-slate-300 text-sm">
          Token 已保存，是否要測試與 GitHub 的連線？
        </p>
      </div>

      {/* 連線結果 */}
      {connectionResult && (
        <div className={`p-4 rounded-lg border ${
          connectionResult.success 
            ? 'bg-green-900/20 border-green-800' 
            : 'bg-red-900/20 border-red-800'
        }`}>
          <div className="flex items-start space-x-2">
            {connectionResult.success ? (
              <svg className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <div>
              <p className={`text-sm font-medium ${
                connectionResult.success ? 'text-green-300' : 'text-red-300'
              }`}>
                {connectionResult.success ? '連線成功' : '連線失敗'}
              </p>
              <p className={`text-xs ${
                connectionResult.success ? 'text-green-200' : 'text-red-200'
              }`}>
                {connectionResult.message}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 操作按鈕 */}
      <div className="space-y-3">
        {!connectionResult && (
          <Button
            onClick={handleConnectConfirm}
            disabled={isConnecting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white flex items-center justify-center space-x-2"
          >
            {isConnecting ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>連線中...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                </svg>
                <span>測試連線</span>
              </>
            )}
          </Button>
        )}

        {connectionResult && (
          <div className="flex space-x-3">
            <Button
              onClick={handleConnectionNext}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white flex items-center justify-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
              </svg>
              <span>{connectionResult.success ? '下一步' : '繼續'}</span>
            </Button>

            <Button
              variant="ghost"
              onClick={() => setCurrentStep('input')}
              className="flex-1 border border-slate-600 text-slate-300 hover:text-white hover:border-slate-500"
            >
              返回
            </Button>
          </div>
        )}

        <Button
          variant="ghost"
          onClick={handleSkip}
          className="w-full text-slate-400 hover:text-white"
        >
          跳過連線測試
        </Button>
      </div>
    </div>
  );

  // 資料下載步驟
  const renderDataDownload = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-white mb-2">下載雲端資料</h3>
        <p className="text-slate-300 text-sm">
          連線成功！是否要下載雲端上的投資組合資料？
        </p>
      </div>

      <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <svg className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-300">
            <p className="font-medium mb-1">關於雲端資料下載</p>
            <ul className="space-y-1 text-xs list-disc list-inside">
              <li>如果雲端有資料，將會覆蓋本地資料</li>
              <li>如果雲端沒有資料，將保持本地資料不變</li>
              <li>您可以稍後在雲端同步設定中手動下載</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 操作按鈕 */}
      <div className="space-y-3">
        <Button
          onClick={handleDownloadConfirm}
          disabled={isDownloading}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 text-white flex items-center justify-center space-x-2"
        >
          {isDownloading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>下載中...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              <span>下載雲端資料</span>
            </>
          )}
        </Button>

        <div className="flex space-x-3">
          <Button
            onClick={handleSkipDownload}
            className="flex-1 bg-slate-600 hover:bg-slate-700 text-white"
          >
            跳過下載
          </Button>

          <Button
            variant="ghost"
            onClick={() => setCurrentStep('connect')}
            className="flex-1 border border-slate-600 text-slate-300 hover:text-white hover:border-slate-500"
          >
            返回
          </Button>
        </div>
      </div>
    </div>
  );

  // 完成步驟
  const renderComplete = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-white mb-2">設定完成！</h3>
        <p className="text-slate-300 text-sm">
          GitHub Token 已設定完成，您現在可以使用雲端同步功能了
        </p>
      </div>

      <div className="bg-green-900/20 border border-green-800 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <svg className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
          </svg>
          <div className="text-sm text-green-300">
            <p className="font-medium mb-1">設定成功</p>
            <ul className="space-y-1 text-xs list-disc list-inside">
              <li>GitHub Token 已保存</li>
              <li>雲端同步功能已啟用</li>
              <li>您可以在設定中管理雲端同步</li>
            </ul>
          </div>
        </div>
      </div>

      <Button
        onClick={handleComplete}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center space-x-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <span>開始使用</span>
      </Button>
    </div>
  );

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={currentStep === 'input' ? handleSkip : undefined}
      title={`初始設定 - ${
        currentStep === 'input' ? 'GitHub Token' :
        currentStep === 'connect' ? '連線測試' :
        currentStep === 'download' ? '資料下載' :
        '設定完成'
      }`}
      className="max-w-md"
    >
      {renderStepContent()}
    </Modal>
  );
};