// 除權息事件管理組件
import React, { useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { RightsEventService } from '../services/rightsEventService';
import type { StockRecord } from '../types';

interface RightsEventManagerProps {
  stock: StockRecord;
  onStockUpdate: (updatedStock: StockRecord) => void;
  onClose: () => void;
}

const RightsEventManager: React.FC<RightsEventManagerProps> = ({
  stock,
  onStockUpdate,
  onClose
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  // 用 local state 追蹤最新的 stock，確保摘要即時更新
  const [currentStock, setCurrentStock] = useState<StockRecord>(stock);
  
  // 移除不存在的 addOperationLog 函數調用
  
  // 獲取除權息摘要（使用 currentStock 確保即時反映）
  const summary = RightsEventService.getRightsEventsSummary(currentStock);
  
  // 處理除權息事件
  const handleProcessRightsEvents = async (forceRecalculate: boolean = false) => {
    console.log('🔄 handleProcessRightsEvents 被調用', { forceRecalculate });
    setIsProcessing(true);
    setLogs([]);
    
    try {
      console.log(`📊 開始處理 ${stock.symbol} 的除權息事件`);
      setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: 開始處理 ${stock.symbol} 的除權息事件`]);
      
      if (forceRecalculate) {
        setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: 🔄 強制重新計算所有除權息`]);
      }
      
      const updatedStock = await RightsEventService.processStockRightsEvents(
        stock,
        (message) => {
          console.log(`📝 處理進度: ${message}`);
          setProcessingMessage(message);
          setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
        },
        forceRecalculate
      );
      
      console.log('✅ 除權息處理完成，更新股票資料:', updatedStock);
      setCurrentStock(updatedStock); // 立即更新本地 state，讓摘要即時反映
      onStockUpdate(updatedStock);
      setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${stock.symbol} 除權息處理完成`]);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知錯誤';
      console.error('❌ 除權息處理失敗:', error);
      setLogs(prev => [...prev, `❌ 處理失敗: ${errorMessage}`]);
    } finally {
      setIsProcessing(false);
      setProcessingMessage('');
    }
  };
  
  // 格式化日期顯示
  const formatDate = (date: Date | string | undefined): string => {
    if (!date) return '無資料';
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleDateString('zh-TW');
  };
  
  // 格式化金額顯示
  const formatCurrency = (amount: number): string => {
    return amount.toLocaleString('zh-TW', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 2 
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">
            除權息事件管理 - {stock.symbol} {stock.name}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
            disabled={isProcessing}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 股票基本資訊 */}
        <div className="bg-slate-900 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">股票資訊</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-slate-400">持股數:</span>
              <span className="text-white ml-2">{stock.shares.toLocaleString()} 股</span>
            </div>
            <div>
              <span className="text-slate-400">成本價:</span>
              <span className="text-white ml-2">${(stock.costPrice || 0).toFixed(2)}</span>
            </div>
            <div>
              <span className="text-slate-400">調整成本價:</span>
              <span className="text-white ml-2">${(stock.adjustedCostPrice || stock.costPrice || 0).toFixed(2)}</span>
            </div>
            <div>
              <span className="text-slate-400">購買日期:</span>
              <span className="text-white ml-2">{formatDate(stock.purchaseDate)}</span>
            </div>
          </div>
        </div>

        {/* 除權息摘要 */}
        <div className="bg-slate-900 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">除權息摘要</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-slate-400">除權息事件:</span>
              <span className="text-white ml-2">{summary.eventsCount} 次</span>
            </div>
            <div>
              <span className="text-slate-400">總現金股利:</span>
              <span className="text-green-400 ml-2">${formatCurrency(summary.totalCashDividend)}</span>
            </div>
            <div>
              <span className="text-slate-400">總配股數:</span>
              <span className="text-blue-400 ml-2">{summary.totalStockDividend} 股</span>
            </div>
            <div>
              <span className="text-slate-400">最後除權息:</span>
              <span className="text-white ml-2">{formatDate(summary.lastEventDate || undefined)}</span>
            </div>
          </div>
        </div>

        {/* 除權息記錄列表 */}
        {stock.dividendRecords && stock.dividendRecords.length > 0 && (
          <div className="bg-slate-900 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-white mb-3">除權息記錄</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-2 text-slate-400">除權息日</th>
                    <th className="text-left py-2 text-slate-400">類型</th>
                    <th className="text-right py-2 text-slate-400">現金股利</th>
                    <th className="text-right py-2 text-slate-400">配股比例</th>
                    <th className="text-right py-2 text-slate-400">配股數</th>
                    <th className="text-right py-2 text-slate-400">持股變化</th>
                  </tr>
                </thead>
                <tbody>
                  {stock.dividendRecords.map((record, index) => (
                    <tr key={record.id || index} className="border-b border-slate-800">
                      <td className="py-2 text-white">
                        {formatDate(record.exRightDate || record.exDividendDate)}
                      </td>
                      <td className="py-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          record.type === 'both' ? 'bg-purple-600 text-white' :
                          record.type === 'stock' ? 'bg-blue-600 text-white' :
                          'bg-green-600 text-white'
                        }`}>
                          {record.type === 'both' ? '除權息' :
                           record.type === 'stock' ? '除權' : '除息'}
                        </span>
                      </td>
                      <td className="py-2 text-right text-green-400">
                        ${(record.cashDividendPerShare || record.dividendPerShare || 0).toFixed(2)}
                      </td>
                      <td className="py-2 text-right text-blue-400">
                        {record.stockDividendRatio ? `${record.stockDividendRatio}‰` : '-'}
                      </td>
                      <td className="py-2 text-right text-blue-400">
                        {record.stockDividendShares || 0}
                      </td>
                      <td className="py-2 text-right text-white">
                        {record.sharesBeforeRight || record.shares || 0} → {record.sharesAfterRight || record.shares || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 操作按鈕 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => {
                console.log('🔄 強制重新計算按鈕被點擊');
                try {
                  handleProcessRightsEvents(true);
                } catch (error) {
                  console.error('❌ 按鈕點擊錯誤:', error);
                }
              }}
              disabled={isProcessing}
              className={`px-4 py-2 rounded font-medium transition-colors ${
                isProcessing
                  ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
              title="清除現有記錄並重新計算所有除權息"
            >
              {isProcessing ? (
                <div className="flex items-center">
                  <svg className="w-4 h-4 animate-spin mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  處理中...
                </div>
              ) : (
                '🔄 更新除權息資料'
              )}
            </button>
            
            {RightsEventService.shouldUpdateRightsData(stock) && (
              <span className="text-yellow-400 text-sm">
                ⚠️ 建議更新除權息資料
              </span>
            )}
          </div>
          
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded font-medium transition-colors disabled:opacity-50"
          >
            關閉
          </button>
        </div>

        {/* 處理進度和日誌 */}
        {(isProcessing || logs.length > 0) && (
          <div className="bg-slate-900 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">處理日誌</h3>
            
            {isProcessing && processingMessage && (
              <div className="mb-3 p-3 bg-blue-600/20 border border-blue-600/30 rounded">
                <div className="flex items-center text-blue-400">
                  <svg className="w-4 h-4 animate-spin mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {processingMessage}
                </div>
              </div>
            )}
            
            <div className="max-h-40 overflow-y-auto bg-slate-800 rounded p-3">
              {logs.length === 0 ? (
                <p className="text-slate-400 text-sm">暫無日誌</p>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="text-sm text-slate-300 mb-1 font-mono">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RightsEventManager;