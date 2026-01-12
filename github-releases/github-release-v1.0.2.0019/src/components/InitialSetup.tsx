import React, { useState } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { getCloudSyncAvailability } from '../utils/environment';
import { addOperationLog } from './OperationLog';

interface InitialSetupProps {
  isOpen: boolean;
  onClose: () => void;
  onTokenSaved: (token: string) => void;
}

export const InitialSetup: React.FC<InitialSetupProps> = ({
  isOpen,
  onClose,
  onTokenSaved
}) => {
  const [githubToken, setGithubToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string>('');

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

      // 如果環境支援，測試 Token 有效性
      if (cloudSyncAvailability.available) {
        const GitHubGistService = (await import('../services/GitHubGistService')).default;
        const result = await GitHubGistService.testToken(token);
        
        if (!result.valid) {
          setValidationError(result.error || 'Token 驗證失敗，請檢查 Token 是否正確');
          return false;
        }
      }

      return true;
    } catch (error) {
      setValidationError('Token 驗證失敗，請檢查網路連線或 Token 是否正確');
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  // 保存 Token
  const handleSaveToken = async () => {
    const isValid = await validateToken(githubToken);
    if (isValid) {
      localStorage.setItem('githubToken', githubToken);
      onTokenSaved(githubToken);
      addOperationLog('success', 'GitHub Token 已設定完成');
      onClose();
    }
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

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleSkip} 
      title="初始設定 - GitHub Token"
      className="max-w-md"
    >
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-3.586l4.293-4.293A6 6 0 0119 9z" />
            </svg>
            <span>取得 GitHub Token</span>
          </Button>

          <div className="flex space-x-3">
            <Button
              onClick={handleSaveToken}
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  <span>保存設定</span>
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
    </Modal>
  );
};