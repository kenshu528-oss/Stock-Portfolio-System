import { Component, ErrorInfo, ReactNode } from 'react';
import { VERSION } from '../constants/version';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    // 更新 state 以顯示錯誤 UI
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('應用程式錯誤:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  private handleReset = () => {
    // 清除 localStorage 中可能損壞的數據
    const storageKeys = Object.keys(localStorage).filter(key => 
      key.includes('stock-portfolio') || key.includes('zustand')
    );
    
    storageKeys.forEach(key => {
      localStorage.removeItem(key);
      console.log(`已清除 localStorage: ${key}`);
    });

    // 重新載入頁面
    window.location.reload();
  };

  private handleReportError = () => {
    const errorReport = {
      version: VERSION.DISPLAY,
      timestamp: new Date().toISOString(),
      error: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    console.log('錯誤報告:', errorReport);
    
    // 複製錯誤報告到剪貼板
    navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2))
      .then(() => alert('錯誤報告已複製到剪貼板'))
      .catch(() => console.log('無法複製到剪貼板'));
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-slate-800 rounded-lg p-8 text-center">
            <div className="mb-6">
              <svg className="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <h1 className="text-2xl font-bold text-white mb-2">應用程式載入失敗</h1>
              <p className="text-slate-300 mb-4">
                股票投資組合系統遇到了未預期的錯誤
              </p>
            </div>

            <div className="bg-slate-700 rounded-lg p-4 mb-6 text-left">
              <h3 className="text-white font-medium mb-2">錯誤詳情：</h3>
              <p className="text-red-300 text-sm font-mono mb-2">
                {this.state.error?.message || '未知錯誤'}
              </p>
              <p className="text-slate-400 text-xs">
                版本: {VERSION.DISPLAY} | 時間: {new Date().toLocaleString('zh-TW')}
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={this.handleReset}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                清除數據並重新載入
              </button>
              
              <button
                onClick={this.handleReportError}
                className="w-full bg-slate-600 hover:bg-slate-500 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                複製錯誤報告
              </button>
              
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium py-3 px-4 rounded-lg transition-colors"
              >
                僅重新載入
              </button>
            </div>

            <div className="mt-6 text-xs text-slate-500">
              <p>如果問題持續發生，請聯繫技術支援並提供錯誤報告</p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;