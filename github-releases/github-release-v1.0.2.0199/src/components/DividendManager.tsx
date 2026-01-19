import React, { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';
import { useAppStore } from '../stores/appStore';
import DividendDatabaseService from '../services/dividendDatabase';
import DividendApiService from '../services/dividendApiService';
import type { StockRecord, DividendRecord } from '../types';

interface DividendManagerProps {
  isOpen: boolean;
  onClose: () => void;
  stock: StockRecord;
}

const DividendManager: React.FC<DividendManagerProps> = ({
  isOpen,
  onClose,
  stock
}) => {
  const { updateStock } = useAppStore();
  const [isAddingDividend, setIsAddingDividend] = useState(false);
  const [showHistoricalSuggestions, setShowHistoricalSuggestions] = useState(false);
  const [newDividend, setNewDividend] = useState({
    exDividendDate: '',
    dividendPerShare: '',
    shares: stock.shares.toString()
  });

  // 檢查是否有歷史股息資料可以自動添加
  useEffect(() => {
    if (isOpen) {
      // 優先使用 FinMind API 獲取真實股息資料
      loadDividendsFromAPI();
      
      // 備用：檢查本地資料庫
      if (DividendDatabaseService.hasDividendData(stock.symbol)) {
        const historicalDividends = DividendDatabaseService.getHistoricalDividends(
          stock.symbol, 
          stock.purchaseDate
        );
        
        // 檢查是否有未記錄的歷史股息
        const existingDates = new Set(
          (stock.dividendRecords || []).map(d => {
            const date = d.exDividendDate instanceof Date ? d.exDividendDate : new Date(d.exDividendDate);
            return date.toISOString().split('T')[0];
          })
        );
        
        const missingDividends = historicalDividends.filter(
          d => !existingDates.has(d.exDividendDate)
        );
        
        if (missingDividends.length > 0) {
          setShowHistoricalSuggestions(true);
        }
      }
    }
  }, [isOpen, stock.symbol, stock.purchaseDate]); // 移除 stock.dividendRecords 避免無限循環

  // 從 FinMind API 載入股息資料
  const loadDividendsFromAPI = async () => {
    try {
      console.log(`🔍 DividendManager: 載入 ${stock.symbol} 的 API 股息資料`);
      const apiDividends = await DividendApiService.getHistoricalDividends(
        stock.symbol,
        stock.purchaseDate
      );
      
      if (apiDividends.length > 0) {
        console.log(`✅ DividendManager: 獲取到 ${apiDividends.length} 筆 API 股息資料`);
        
        // 檢查是否有未記錄的 API 股息
        const existingDates = new Set(
          (stock.dividendRecords || []).map(d => {
            const date = d.exDividendDate instanceof Date ? d.exDividendDate : new Date(d.exDividendDate);
            return date.toISOString().split('T')[0];
          })
        );
        
        const missingApiDividends = apiDividends.filter(
          d => !existingDates.has(d.exDividendDate)
        );
        
        if (missingApiDividends.length > 0) {
          console.log(`📊 DividendManager: 發現 ${missingApiDividends.length} 筆未記錄的 API 股息`);
          // 自動添加 API 股息資料
          await addApiDividends(missingApiDividends);
        }
      } else {
        console.log(`ℹ️ DividendManager: ${stock.symbol} 無 API 股息資料`);
      }
    } catch (error) {
      console.error(`❌ DividendManager: 載入 ${stock.symbol} API 股息失敗:`, error);
    }
  };

  // 自動添加 API 股息資料
  const addApiDividends = async (apiDividends: any[]) => {
    try {
      // 清除現有的股息記錄，避免重複
      console.log(`🔄 DividendManager: 清除 ${stock.symbol} 現有股息記錄，使用 API 資料`);
      
      const newDividendRecords: DividendRecord[] = apiDividends.map((dividend, index) => ({
        id: `api-${Date.now()}-${index}-${stock.id}`,
        stockId: stock.id,
        symbol: dividend.symbol,
        exDividendDate: new Date(dividend.exDividendDate),
        dividendPerShare: dividend.dividendPerShare,
        totalDividend: dividend.dividendPerShare * stock.shares,
        shares: stock.shares
      }));

      // 直接使用 API 資料，不合併現有記錄
      const totalDividendPerShare = newDividendRecords.reduce(
        (sum, record) => sum + record.dividendPerShare, 0
      );
      const adjustedCostPrice = Math.max(stock.costPrice - totalDividendPerShare, 0);

      // 更新股票記錄
      updateStock(stock.id, {
        dividendRecords: newDividendRecords, // 直接替換，不合併
        adjustedCostPrice
      });

      console.log(`✅ DividendManager: 替換為 ${newDividendRecords.length} 筆 API 股息記錄`);
    } catch (error) {
      console.error('❌ DividendManager: 自動添加 API 股息失敗:', error);
    }
  };

  // 自動添加歷史股息
  const handleAddHistoricalDividends = () => {
    const historicalDividends = DividendDatabaseService.getHistoricalDividends(
      stock.symbol, 
      stock.purchaseDate
    );
    
    const existingDates = new Set(
      (stock.dividendRecords || []).map(d => {
        const date = d.exDividendDate instanceof Date ? d.exDividendDate : new Date(d.exDividendDate);
        return date.toISOString().split('T')[0];
      })
    );
    
    const newDividendRecords = historicalDividends
      .filter(d => !existingDates.has(d.exDividendDate))
      .map(d => ({
        id: `hist-${Date.now()}-${Math.random()}`,
        stockId: stock.id,
        symbol: stock.symbol,
        exDividendDate: new Date(d.exDividendDate),
        dividendPerShare: d.dividendPerShare,
        totalDividend: stock.shares * d.dividendPerShare,
        shares: stock.shares
      }));

    if (newDividendRecords.length > 0) {
      const updatedDividendRecords = [...(stock.dividendRecords || []), ...newDividendRecords];
      
      // 重新計算調整成本價
      const totalDividendPerShare = updatedDividendRecords.reduce((sum, dividend) => 
        sum + dividend.dividendPerShare, 0
      );
      const adjustedCostPrice = Math.max(0, stock.costPrice - totalDividendPerShare);

      updateStock(stock.id, {
        dividendRecords: updatedDividendRecords,
        adjustedCostPrice
      });
    }
    
    setShowHistoricalSuggestions(false);
  };

  // 計算股息統計
  const calculateDividendStats = () => {
    if (!stock.dividendRecords || stock.dividendRecords.length === 0) {
      return {
        totalDividend: 0,
        yearlyDividend: 0,
        averageYield: 0,
        dividendCount: 0
      };
    }

    const totalDividend = stock.dividendRecords.reduce((sum, dividend) => 
      sum + (stock.shares * dividend.dividendPerShare), 0
    );

    // 計算年度股息（最近12個月）
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    const yearlyDividend = stock.dividendRecords
      .filter(dividend => {
        const dividendDate = dividend.exDividendDate instanceof Date ? dividend.exDividendDate : new Date(dividend.exDividendDate);
        return dividendDate >= oneYearAgo;
      })
      .reduce((sum, dividend) => sum + (stock.shares * dividend.dividendPerShare), 0);

    // 計算平均殖利率
    const averageYield = stock.currentPrice > 0 ? (yearlyDividend / (stock.shares * stock.currentPrice)) * 100 : 0;

    return {
      totalDividend,
      yearlyDividend,
      averageYield,
      dividendCount: stock.dividendRecords.length
    };
  };

  const stats = calculateDividendStats();

  // 處理新增股息
  const handleAddDividend = () => {
    if (!newDividend.exDividendDate || !newDividend.dividendPerShare) {
      alert('請填寫完整的股息資訊');
      return;
    }

    const dividendPerShare = parseFloat(newDividend.dividendPerShare);
    const shares = parseInt(newDividend.shares);

    if (dividendPerShare <= 0 || shares <= 0) {
      alert('股息金額和持股數必須大於0');
      return;
    }

    const newDividendRecord: DividendRecord = {
      id: Date.now().toString(),
      stockId: stock.id,
      symbol: stock.symbol,
      exDividendDate: new Date(newDividend.exDividendDate),
      dividendPerShare,
      totalDividend: shares * dividendPerShare,
      shares
    };

    // 更新股票記錄，添加新的股息記錄
    const updatedDividendRecords = [...(stock.dividendRecords || []), newDividendRecord];
    
    // 重新計算調整成本價
    const totalDividendPerShare = updatedDividendRecords.reduce((sum, dividend) => 
      sum + dividend.dividendPerShare, 0
    );
    const adjustedCostPrice = Math.max(0, stock.costPrice - totalDividendPerShare);

    updateStock(stock.id, {
      dividendRecords: updatedDividendRecords,
      adjustedCostPrice
    });

    // 重置表單
    setNewDividend({
      exDividendDate: '',
      dividendPerShare: '',
      shares: stock.shares.toString()
    });
    setIsAddingDividend(false);
  };

  // 處理刪除股息記錄
  const handleDeleteDividend = (dividendId: string) => {
    if (!confirm('確定要刪除這筆股息記錄嗎？')) return;

    const updatedDividendRecords = (stock.dividendRecords || []).filter(
      dividend => dividend.id !== dividendId
    );

    // 重新計算調整成本價
    const totalDividendPerShare = updatedDividendRecords.reduce((sum, dividend) => 
      sum + dividend.dividendPerShare, 0
    );
    const adjustedCostPrice = Math.max(0, stock.costPrice - totalDividendPerShare);

    updateStock(stock.id, {
      dividendRecords: updatedDividendRecords,
      adjustedCostPrice
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${stock.symbol} - 股息管理`}>
      <div className="space-y-6">
        {/* 股息統計 */}
        <div className="bg-slate-900 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-white mb-4">股息統計</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-sm text-slate-400">總股息收入</p>
              <p className="text-xl font-bold text-green-400">
                +{stats.totalDividend.toFixed(0)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-slate-400">年度股息</p>
              <p className="text-xl font-bold text-green-400">
                +{stats.yearlyDividend.toFixed(0)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-slate-400">平均殖利率</p>
              <p className="text-xl font-bold text-blue-400">
                {stats.averageYield.toFixed(2)}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-slate-400">配息次數</p>
              <p className="text-xl font-bold text-white">
                {stats.dividendCount}
              </p>
            </div>
          </div>
        </div>

        {/* 歷史股息建議 */}
        {showHistoricalSuggestions && (
          <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h5 className="text-blue-400 font-semibold">發現歷史股息資料</h5>
                <p className="text-sm text-slate-400">
                  系統發現 {stock.symbol} 有未記錄的歷史股息，是否要自動添加？
                </p>
              </div>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  onClick={handleAddHistoricalDividends}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  自動添加
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHistoricalSuggestions(false)}
                  className="text-slate-400 hover:text-white"
                >
                  忽略
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 股息記錄列表 */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-white">股息記錄</h4>
            <Button
              onClick={() => setIsAddingDividend(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              新增股息
            </Button>
          </div>

          {stock.dividendRecords && stock.dividendRecords.length > 0 ? (
            <div className="space-y-2">
              {stock.dividendRecords
                .sort((a, b) => {
                  const dateA = a.exDividendDate instanceof Date ? a.exDividendDate : new Date(a.exDividendDate);
                  const dateB = b.exDividendDate instanceof Date ? b.exDividendDate : new Date(b.exDividendDate);
                  return dateB.getTime() - dateA.getTime();
                })
                .map((dividend) => (
                  <div
                    key={dividend.id}
                    className="bg-slate-700 rounded-lg p-4 flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <div>
                          <p className="text-white font-medium">
                            {(dividend.exDividendDate instanceof Date ? dividend.exDividendDate : new Date(dividend.exDividendDate)).toLocaleDateString('zh-TW')}
                          </p>
                          <p className="text-sm text-slate-400">除息日期</p>
                        </div>
                        <div>
                          <p className="text-white font-medium">
                            ${dividend.dividendPerShare.toFixed(2)}
                          </p>
                          <p className="text-sm text-slate-400">每股股息</p>
                        </div>
                        <div>
                          <p className="text-white font-medium">
                            {dividend.shares.toLocaleString()} 股
                          </p>
                          <p className="text-sm text-slate-400">持股數</p>
                        </div>
                        <div>
                          <p className="text-green-400 font-medium">
                            +${(stock.shares * dividend.dividendPerShare).toFixed(0)}
                          </p>
                          <p className="text-sm text-slate-400">目前股息</p>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteDividend(dividend.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </Button>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <svg className="mx-auto h-12 w-12 text-slate-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              <p>尚無股息記錄</p>
              <p className="text-sm">點擊「新增股息」開始記錄配息資訊</p>
            </div>
          )}
        </div>

        {/* 新增股息表單 */}
        {isAddingDividend && (
          <div className="bg-slate-700 rounded-lg p-4">
            <h5 className="text-white font-semibold mb-4">新增股息記錄</h5>
            <div className="space-y-4">
              <Input
                label="除息日期"
                type="date"
                value={newDividend.exDividendDate}
                onChange={(e) => setNewDividend(prev => ({ ...prev, exDividendDate: e.target.value }))}
                required
              />
              <Input
                label="每股股息 (元)"
                type="number"
                step="0.01"
                min="0"
                value={newDividend.dividendPerShare}
                onChange={(e) => setNewDividend(prev => ({ ...prev, dividendPerShare: e.target.value }))}
                placeholder="0.00"
                required
              />
              <Input
                label="持股數 (股)"
                type="number"
                min="1"
                value={newDividend.shares}
                onChange={(e) => setNewDividend(prev => ({ ...prev, shares: e.target.value }))}
                required
              />
              
              {/* 預覽計算 */}
              {newDividend.dividendPerShare && newDividend.shares && (
                <div className="bg-slate-800 rounded p-3">
                  <p className="text-sm text-slate-400">股息預覽</p>
                  <p className="text-white font-medium">
                    總股息: ${(parseFloat(newDividend.dividendPerShare || '0') * parseInt(newDividend.shares || '0')).toFixed(0)}
                  </p>
                </div>
              )}

              <div className="flex space-x-2">
                <Button
                  onClick={handleAddDividend}
                  className="bg-green-600 hover:bg-green-700 text-white flex-1"
                >
                  確認新增
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setIsAddingDividend(false);
                    setNewDividend({
                      exDividendDate: '',
                      dividendPerShare: '',
                      shares: stock.shares.toString()
                    });
                  }}
                  className="text-slate-400 hover:text-white flex-1"
                >
                  取消
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 調整成本價資訊 */}
        {stock.adjustedCostPrice !== stock.costPrice && (
          <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
            <h5 className="text-blue-400 font-semibold mb-2">成本價調整</h5>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-400">原始成本價</p>
                <p className="text-white font-medium">${stock.costPrice.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-slate-400">調整後成本價</p>
                <p className="text-blue-400 font-medium">${stock.adjustedCostPrice.toFixed(2)}</p>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              調整成本價 = 原始成本價 - 每股累計股息
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default DividendManager;