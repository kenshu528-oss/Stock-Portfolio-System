import React, { useState, useEffect, useRef } from 'react';
import Button from './ui/Button';

// 日誌條目介面
export interface LogEntry {
  id: number;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  timestamp: string;
}

// 操作日誌組件Props
interface OperationLogProps {
  className?: string;
}

// 全域日誌管理
class LogManager {
  private static instance: LogManager;
  private logs: LogEntry[] = [];
  private listeners: ((logs: LogEntry[]) => void)[] = [];

  static getInstance(): LogManager {
    if (!LogManager.instance) {
      LogManager.instance = new LogManager();
    }
    return LogManager.instance;
  }

  addLog(level: LogEntry['level'], message: string) {
    const timestamp = new Date().toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    const newLog: LogEntry = {
      id: Date.now(),
      level,
      message,
      timestamp
    };

    this.logs = [newLog, ...this.logs.slice(0, 9)]; // 保持最新10條記錄
    this.notifyListeners();
  }

  getLogs(): LogEntry[] {
    return this.logs;
  }

  clearLogs() {
    this.logs = [];
    this.notifyListeners();
  }

  subscribe(listener: (logs: LogEntry[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.logs));
  }
}

// 全域日誌函數
export const addOperationLog = (level: LogEntry['level'], message: string) => {
  LogManager.getInstance().addLog(level, message);
};

// 日誌條目組件
const LogEntryComponent: React.FC<{ log: LogEntry }> = ({ log }) => (
  <div className="flex items-start space-x-2 p-2 rounded hover:bg-slate-700/50 transition-colors">
    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
      log.level === 'success' ? 'bg-green-400' :
      log.level === 'warning' ? 'bg-yellow-400' :
      log.level === 'error' ? 'bg-red-400' : 'bg-blue-400'
    }`} />
    <div className="flex-1 min-w-0">
      <div className="text-xs text-slate-400 font-mono">
        {log.timestamp}
      </div>
      <div className="text-sm text-slate-300 break-words">
        {log.message}
      </div>
    </div>
  </div>
);

// 操作日誌組件
const OperationLog: React.FC<OperationLogProps> = ({ className = '' }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewLogs, setHasNewLogs] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // 訂閱日誌更新
  useEffect(() => {
    const logManager = LogManager.getInstance();
    setLogs(logManager.getLogs());
    
    const unsubscribe = logManager.subscribe((newLogs) => {
      const hadLogs = logs.length > 0;
      setLogs(newLogs);
      
      // 如果有新日誌且面板未開啟，顯示新日誌指示器
      if (newLogs.length > logs.length && !isOpen) {
        setHasNewLogs(true);
      }
    });

    return unsubscribe;
  }, [logs.length, isOpen]);

  // 點擊外部關閉面板
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        panelRef.current &&
        buttonRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // ESC鍵關閉面板
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setHasNewLogs(false); // 開啟面板時清除新日誌指示器
    }
  };

  const handleClearLogs = () => {
    LogManager.getInstance().clearLogs();
    setHasNewLogs(false);
  };

  return (
    <div className={`relative ${className}`}>
      {/* 操作日誌按鈕 */}
      <Button
        ref={buttonRef}
        variant="ghost"
        size="sm"
        onClick={handleToggle}
        className="text-white hover:bg-slate-700 relative"
        aria-label="操作日誌"
      >
        {/* 文件圖示 */}
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        
        {/* 新日誌指示器 */}
        {hasNewLogs && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
        )}
      </Button>
      
      {/* 操作日誌面板 */}
      {isOpen && (
        <div 
          ref={panelRef}
          className="absolute right-0 top-full mt-2 w-80 max-h-96 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden"
        >
          {/* 面板標題 */}
          <div className="p-3 border-b border-slate-700 flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-300">操作日誌</h3>
            {logs.length > 0 && (
              <button
                onClick={handleClearLogs}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                清除
              </button>
            )}
          </div>
          
          {/* 日誌內容 */}
          <div className="max-h-80 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="p-4 text-center text-slate-500 text-sm">
                暫無操作記錄
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {logs.map((log) => (
                  <LogEntryComponent key={log.id} log={log} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OperationLog;