import React, { useState, useEffect } from 'react';
import { getFrontendUrl, API_ENDPOINTS } from '../config/api';

interface ServerStatus {
  name: string;
  url: string;
  status: 'online' | 'offline' | 'checking';
  lastCheck: Date | null;
  responseTime?: number;
}

// 內建圖示組件
const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ArrowPathIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
);

interface ServerStatus {
  name: string;
  url: string;
  status: 'online' | 'offline' | 'checking';
  lastCheck: Date | null;
  responseTime?: number;
}

export const ServerStatusPanel: React.FC = () => {
  // 只在開發環境中顯示
  const isDevelopment = import.meta.env.DEV;
  
  const [servers, setServers] = useState<ServerStatus[]>(() => {
    const servers = [
      {
        name: '前端服務器',
        url: getFrontendUrl(),
        status: 'checking' as const,
        lastCheck: null
      }
    ];
    
    // 只有在有後端支援時才添加後端服務器檢查
    const healthEndpoint = API_ENDPOINTS.health();
    if (healthEndpoint) {
      servers.push({
        name: '後端服務器',
        url: healthEndpoint,
        status: 'checking' as const,
        lastCheck: null
      });
    }
    
    return servers;
  });

  const [isVisible, setIsVisible] = useState(false);
  const [restartingServers, setRestartingServers] = useState<Set<string>>(new Set());

  // 檢查服務器狀態
  const checkServerStatus = async (server: ServerStatus): Promise<ServerStatus> => {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(server.url, {
        method: 'GET',
        signal: controller.signal,
        mode: 'cors'
      });
      
      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;
      
      return {
        ...server,
        status: response.ok ? 'online' : 'offline',
        lastCheck: new Date(),
        responseTime
      };
    } catch (error) {
      return {
        ...server,
        status: 'offline',
        lastCheck: new Date(),
        responseTime: Date.now() - startTime
      };
    }
  };

  // 檢查所有服務器
  const checkAllServers = async () => {
    const updatedServers = await Promise.all(
      servers.map(server => checkServerStatus(server))
    );
    setServers(updatedServers);
  };

  // 重啟服務器（通過API調用）
  const restartServer = async (serverName: string) => {
    try {
      // 添加到重啟中的服務器列表
      setRestartingServers(prev => new Set([...prev, serverName]));

      if (serverName === '後端API服務器') {
        console.log('🔄 正在重啟後端服務器...');
        
        // 調用後端重啟API
        const response = await fetch('http://localhost:3001/api/restart', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          console.log('✅ 後端重啟請求已發送');
          
          // 等待5秒後開始檢查狀態（給服務器重啟時間）
          setTimeout(() => {
            console.log('🔍 開始檢查後端服務器狀態...');
            
            // 移除重啟狀態並開始檢查
            setRestartingServers(prev => {
              const newSet = new Set(prev);
              newSet.delete(serverName);
              return newSet;
            });
            
            checkAllServers();
            
            // 每2秒檢查一次，最多檢查10次
            let checkCount = 0;
            const checkInterval = setInterval(() => {
              checkCount++;
              console.log(`🔍 第 ${checkCount} 次檢查後端狀態...`);
              checkAllServers();
              
              if (checkCount >= 10) {
                clearInterval(checkInterval);
                console.log('⏰ 停止檢查後端狀態');
              }
            }, 2000);
          }, 5000);
        } else {
          throw new Error(`重啟請求失敗: ${response.status}`);
        }
        
      } else if (serverName === '前端服務器') {
        console.log('🔄 正在重啟前端服務器...');
        
        // 顯示重啟提示
        if (confirm('重啟前端服務器將刷新頁面，確定要繼續嗎？')) {
          // 前端重啟需要刷新頁面
          window.location.reload();
        } else {
          // 用戶取消，移除重啟狀態
          setRestartingServers(prev => {
            const newSet = new Set(prev);
            newSet.delete(serverName);
            return newSet;
          });
        }
      }
      
    } catch (error) {
      console.error(`❌ 重啟 ${serverName} 失敗:`, error);
      
      // 重啟失敗，移除重啟狀態並恢復檢查
      setRestartingServers(prev => {
        const newSet = new Set(prev);
        newSet.delete(serverName);
        return newSet;
      });
      
      setTimeout(() => {
        checkAllServers();
      }, 1000);
    }
  };

  // 定期檢查狀態（只在開發環境）
  useEffect(() => {
    if (!isDevelopment) return;
    
    checkAllServers();
    const interval = setInterval(checkAllServers, 30000); // 每30秒檢查一次
    return () => clearInterval(interval);
  }, [isDevelopment]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // 生產環境不顯示
  if (!isDevelopment) {
    return null;
  }

  // 獲取狀態圖示和顏色
  const getStatusDisplay = (status: ServerStatus['status']) => {
    switch (status) {
      case 'online':
        return {
          icon: <CheckIcon className="w-4 h-4" />,
          color: 'text-green-400',
          bgColor: 'bg-green-600/20',
          text: '運行中'
        };
      case 'offline':
        return {
          icon: <XIcon className="w-4 h-4" />,
          color: 'text-red-400',
          bgColor: 'bg-red-600/20',
          text: '離線'
        };
      case 'checking':
        return {
          icon: <ArrowPathIcon className="w-4 h-4 animate-spin" />,
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-600/20',
          text: '檢查中'
        };
    }
  };

  const getServerDisplayStatus = (server: ServerStatus) => {
    if (restartingServers.has(server.name)) {
      return {
        icon: <ArrowPathIcon className="w-4 h-4 animate-spin" />,
        color: 'text-blue-400',
        bgColor: 'bg-blue-600/20',
        text: '重啟中'
      };
    }
    return getStatusDisplay(server.status);
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-slate-700 hover:bg-slate-600 text-white p-3 rounded-full shadow-lg transition-colors z-50"
        title="服務器狀態"
      >
        <div className="flex items-center space-x-1">
          {servers.map((server, index) => {
            const display = getStatusDisplay(server.status);
            return (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  server.status === 'online' ? 'bg-green-400' :
                  server.status === 'offline' ? 'bg-red-400' : 'bg-yellow-400'
                }`}
              />
            );
          })}
        </div>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-slate-800 border border-slate-600 rounded-lg shadow-xl p-4 min-w-80 z-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-medium">服務器狀態</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-slate-400 hover:text-white"
        >
          <XIcon className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3">
        {servers.map((server, index) => {
          const display = getServerDisplayStatus(server);
          const isRestarting = restartingServers.has(server.name);
          
          return (
            <div
              key={index}
              className={`flex items-center justify-between p-3 rounded-lg ${display.bgColor}`}
            >
              <div className="flex items-center space-x-3">
                <div className={display.color}>
                  {display.icon}
                </div>
                <div>
                  <div className="text-white text-sm font-medium">
                    {server.name}
                  </div>
                  <div className="text-slate-400 text-xs">
                    {display.text}
                    {server.responseTime && !isRestarting && (
                      <span className="ml-2">({server.responseTime}ms)</span>
                    )}
                  </div>
                  {server.lastCheck && !isRestarting && (
                    <div className="text-slate-500 text-xs">
                      最後檢查: {server.lastCheck.toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => checkServerStatus(server).then(updated => {
                    setServers(prev => prev.map((s, i) => i === index ? updated : s));
                  })}
                  className="text-slate-400 hover:text-white p-1 rounded"
                  title="重新檢查"
                  disabled={server.status === 'checking' || isRestarting}
                >
                  <ArrowPathIcon className={`w-4 h-4 ${(server.status === 'checking' || isRestarting) ? 'animate-spin' : ''}`} />
                </button>
                
                <button
                  onClick={() => restartServer(server.name)}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    isRestarting
                      ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-not-allowed'
                      : server.status === 'checking' 
                      ? 'bg-yellow-600 hover:bg-yellow-700 text-white cursor-not-allowed'
                      : server.status === 'offline'
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                  title={isRestarting ? '重啟中...' : server.status === 'checking' ? '檢查中...' : '重啟服務器'}
                  disabled={server.status === 'checking' || isRestarting}
                >
                  {isRestarting ? '重啟中' : server.status === 'checking' ? '檢查中' : '重啟'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-slate-600 space-y-2">
        <button
          onClick={checkAllServers}
          className="w-full bg-slate-700 hover:bg-slate-600 text-white py-2 px-3 rounded text-sm transition-colors"
        >
          刷新所有狀態
        </button>
        
        <div className="flex space-x-2">
          <button
            onClick={() => {
              if (confirm('確定要重啟所有服務器嗎？這將會刷新頁面。')) {
                // 先重啟後端
                restartServer('後端API服務器');
                // 延遲3秒後重啟前端
                setTimeout(() => {
                  restartServer('前端服務器');
                }, 3000);
              }
            }}
            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-2 px-3 rounded text-sm transition-colors"
            title="重啟所有服務器"
          >
            🔄 重啟全部
          </button>
          
          <button
            onClick={() => {
              // 清除所有快取
              if ('caches' in window) {
                caches.keys().then(names => {
                  names.forEach(name => caches.delete(name));
                });
              }
              
              // 清除 localStorage
              localStorage.clear();
              
              // 刷新頁面
              window.location.reload();
            }}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 px-3 rounded text-sm transition-colors"
            title="清除快取並重啟"
          >
            🧹 清除快取
          </button>
        </div>
      </div>
    </div>
  );
};