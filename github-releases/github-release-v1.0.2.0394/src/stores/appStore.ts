import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { Account, StockRecord, DividendRecord } from '../types';
import { logger } from '../utils/logger';
import { API_ENDPOINTS, shouldUseBackendProxy } from '../config/api';
import { RightsEventService } from '../services/rightsEventService';

// 除權息資料更新函數（統一使用 RightsEventService，確保與個股內更新邏輯完全一致）
const updateStockDividendData = async (stock: StockRecord, state: any, forceRecalculate: boolean = false) => {
  try {
    // 🔧 修復：添加詳細的錯誤處理，避免除權息處理失敗影響股價更新
    logger.debug('dividend', `開始處理 ${stock.symbol} 的除權息資料`);
    
    // 使用靜態導入的服務
    const updatedStock = await RightsEventService.processStockRightsEvents(
      stock,
      (message) => {
        logger.debug('dividend', `${stock.symbol}: ${message}`);
      },
      forceRecalculate // 傳入 forceRecalculate 參數
    );
    
    // 更新股票記錄
    state.updateStock(stock.id, {
      shares: updatedStock.shares,
      dividendRecords: updatedStock.dividendRecords,
      adjustedCostPrice: updatedStock.adjustedCostPrice,
      lastDividendUpdate: updatedStock.lastDividendUpdate
    });
    
    logger.info('dividend', `${stock.symbol} 除權息更新完成`, {
      records: updatedStock.dividendRecords?.length || 0,
      shares: updatedStock.shares,
      adjustedCost: updatedStock.adjustedCostPrice?.toFixed(2)
    });
  } catch (error) {
    // 🔧 關鍵修復：除權息處理失敗不應該影響股價更新
    logger.warn('dividend', `${stock.symbol} 除權息處理失敗，但不影響股價更新`, error.message);
    // 不要拋出錯誤，讓股價更新繼續進行
  }
};

// 定義應用程式狀態介面
import { API_ENDPOINTS } from '../config/api';

export interface AppState {
  // UI 狀態
  isSidebarOpen: boolean;
  isAccountManagerOpen: boolean;
  isAddStockFormOpen: boolean;
  
  // 帳戶狀態
  currentAccount: string;
  accounts: Account[];
  
  // 股票狀態
  stocks: StockRecord[];
  
  // 隱私模式
  isPrivacyMode: boolean;
  
  // 成本價顯示模式
  showAdjustedCost: boolean;
  
  // 除權息計算模式（簡化為2種）
  rightsAdjustmentMode: 'excluding_rights' | 'including_rights';
  
  // 雲端同步設定
  cloudSync: {
    githubToken: string;
    autoSyncEnabled: boolean;
    syncInterval: number;
    lastSyncTime: string | null;
    gistId: string | null;
  };
  
  // 股價更新狀態
  isUpdatingPrices: boolean;
  lastPriceUpdate: Date | null;
  priceUpdateProgress: {
    current: number;
    total: number;
  };
  
  // 強制重新渲染標記
  forceRender?: number;
}

// 定義操作介面
export interface AppActions {
  // UI 操作
  setSidebarOpen: (isOpen: boolean) => void;
  setAccountManagerOpen: (isOpen: boolean) => void;
  setAddStockFormOpen: (isOpen: boolean) => void;
  
  // 帳戶操作
  setCurrentAccount: (accountId: string) => void;
  addAccount: (account: Account) => void;
  updateAccount: (id: string, updates: Partial<Account>) => void;
  deleteAccount: (id: string) => void;
  reorderAccounts: (fromIndex: number, toIndex: number) => void;
  updateAccountStockCounts: () => void;
  
  // 股票操作
  addStock: (stock: StockRecord) => void;
  updateStock: (id: string, updates: Partial<StockRecord>) => void;
  deleteStock: (id: string) => void;
  
  // 匯入匯出操作
  importData: (accounts: Account[], stocks: StockRecord[], mergeMode?: 'replace' | 'merge') => void;
  
  // 隱私模式操作
  togglePrivacyMode: () => void;
  
  // 成本價顯示模式操作
  toggleCostDisplayMode: () => void;
  
  // 除權息模式操作
  setRightsAdjustmentMode: (mode: 'excluding_rights' | 'including_rights') => void;
  toggleRightsAdjustmentMode: () => void;
  
  // 雲端同步操作
  updateCloudSyncSettings: (settings: Partial<AppState['cloudSync']>) => void;
  clearCloudSyncData: () => void;
  
  // 股價更新操作
  setUpdatingPrices: (isUpdating: boolean) => void;
  setPriceUpdateProgress: (current: number, total: number) => void;
  updateAllStockPrices: () => Promise<void>;
  
  // 重置狀態
  resetState: () => void;
}

// 簡化的初始狀態 - 移除複雜的測試數據
const initialState: AppState = {
  // UI 狀態
  isSidebarOpen: false,
  isAccountManagerOpen: false,
  isAddStockFormOpen: false,
  
  // 帳戶狀態
  currentAccount: '帳戶1',
  accounts: [
    { id: '1', name: '帳戶1', stockCount: 0, brokerageFee: 0.1425, transactionTax: 0.3, createdAt: new Date() },
    { id: '2', name: '帳戶2', stockCount: 0, brokerageFee: 0.1425, transactionTax: 0.3, createdAt: new Date() }
  ],
  
  // 股票狀態 - 先用空陣列
  stocks: [],
  
  // 隱私模式 - 預設啟用
  isPrivacyMode: true,
  
  // 成本價顯示模式 - 預設顯示原始成本價
  showAdjustedCost: false,
  
  // 除權息計算模式 - 預設使用原始損益（更直觀）
  rightsAdjustmentMode: 'excluding_rights' as const,
  
  // 雲端同步設定
  cloudSync: {
    githubToken: '',
    autoSyncEnabled: false,
    syncInterval: 30,
    lastSyncTime: null,
    gistId: null,
  },
  
  // 股價更新狀態
  isUpdatingPrices: false,
  lastPriceUpdate: null,
  priceUpdateProgress: {
    current: 0,
    total: 0
  },
};

// 創建 Zustand store
export const useAppStore = create<AppState & AppActions>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        
        // UI 操作
        setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
        setAccountManagerOpen: (isOpen) => set({ isAccountManagerOpen: isOpen }),
        setAddStockFormOpen: (isOpen) => set({ isAddStockFormOpen: isOpen }),
        
        // 帳戶操作
        setCurrentAccount: (accountId) => set({ currentAccount: accountId }),
        addAccount: (account) => set((state) => ({
          accounts: [...state.accounts, account]
        })),
        updateAccount: (id, updates) => set((state) => ({
          accounts: state.accounts.map(acc => 
            acc.id === id ? { ...acc, ...updates } : acc
          )
        })),
        deleteAccount: (id) => set((state) => ({
          accounts: state.accounts.filter(acc => acc.id !== id),
          stocks: state.stocks.filter(stock => stock.accountId !== id)
        })),
        reorderAccounts: (fromIndex, toIndex) => set((state) => {
          const newAccounts = [...state.accounts];
          const [removed] = newAccounts.splice(fromIndex, 1);
          newAccounts.splice(toIndex, 0, removed);
          return { accounts: newAccounts };
        }),
        
        // 更新帳戶股票數量的輔助函數
        updateAccountStockCounts: () => set((state) => {
          const updatedAccounts = state.accounts.map(account => ({
            ...account,
            stockCount: state.stocks.filter(stock => stock.accountId === account.id).length
          }));
          return { accounts: updatedAccounts };
        }),
        
        // 股票操作
        addStock: (stock) => set((state) => {
          const newState = {
            stocks: [...state.stocks, stock]
          };
          // 更新對應帳戶的股票數量
          const updatedAccounts = state.accounts.map(account => ({
            ...account,
            stockCount: account.id === stock.accountId 
              ? account.stockCount + 1 
              : newState.stocks.filter(s => s.accountId === account.id).length
          }));
          return { ...newState, accounts: updatedAccounts };
        }),
        updateStock: (id, updates) => {
          logger.trace('stock', `updateStock 調用`, { id, updates });
          set((state) => {
            const oldStock = state.stocks.find(s => s.id === id);
            logger.trace('stock', `更新前股票`, oldStock);
            
            const newStocks = state.stocks.map(stock => 
              stock.id === id ? { ...stock, ...updates } : stock
            );
            
            const updatedStock = newStocks.find(s => s.id === id);
            logger.trace('stock', `更新後股票`, updatedStock);
            
            // 🔧 確保觸發重新渲染
            return { 
              ...state, 
              stocks: newStocks,
              lastPriceUpdate: new Date(),
              forceRender: Math.random()
            };
          });
        },
        deleteStock: (id) => set((state) => {
          const stockToDelete = state.stocks.find(s => s.id === id);
          const newStocks = state.stocks.filter(stock => stock.id !== id);
          
          // 更新對應帳戶的股票數量
          const updatedAccounts = state.accounts.map(account => ({
            ...account,
            stockCount: stockToDelete && account.id === stockToDelete.accountId
              ? Math.max(0, account.stockCount - 1)
              : newStocks.filter(s => s.accountId === account.id).length
          }));
          
          return { stocks: newStocks, accounts: updatedAccounts };
        }),
        
        // 匯入匯出操作
        importData: (importedAccounts, importedStocks, mergeMode = 'merge') => set((state) => {
          let finalAccounts: Account[];
          let finalStocks: StockRecord[];
          
          if (mergeMode === 'replace') {
            // 替換模式：完全替換現有資料
            finalAccounts = importedAccounts;
            finalStocks = importedStocks;
          } else {
            // 合併模式：智能合併資料
            const accountMap = new Map<string, Account>();
            
            // 先加入現有帳戶
            state.accounts.forEach(acc => accountMap.set(acc.name, acc));
            
            // 處理匯入的帳戶
            importedAccounts.forEach(importedAcc => {
              const existingAcc = accountMap.get(importedAcc.name);
              if (existingAcc) {
                // 帳戶已存在，保持現有ID但更新其他資訊
                accountMap.set(importedAcc.name, {
                  ...existingAcc,
                  ...importedAcc,
                  id: existingAcc.id, // 保持現有ID
                });
              } else {
                // 新帳戶，生成新ID
                const newId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
                accountMap.set(importedAcc.name, {
                  ...importedAcc,
                  id: newId,
                });
              }
            });
            
            finalAccounts = Array.from(accountMap.values());
            
            // 處理股票資料
            const stockMap = new Map<string, StockRecord>();
            
            // 先加入現有股票
            state.stocks.forEach(stock => {
              const key = `${stock.accountId}-${stock.symbol}`;
              stockMap.set(key, stock);
            });
            
            // 處理匯入的股票
            importedStocks.forEach(importedStock => {
              // 找到對應的帳戶ID
              const targetAccount = finalAccounts.find(acc => acc.name === importedAccounts.find(ia => ia.id === importedStock.accountId)?.name);
              
              if (targetAccount) {
                const key = `${targetAccount.id}-${importedStock.symbol}`;
                const existingStock = stockMap.get(key);
                
                if (existingStock) {
                  // 股票已存在，合併持股數量和股息記錄
                  const mergedStock: StockRecord = {
                    ...existingStock,
                    shares: existingStock.shares + importedStock.shares,
                    // 重新計算加權平均成本價
                    costPrice: (
                      (existingStock.shares * existingStock.costPrice + 
                       importedStock.shares * importedStock.costPrice) /
                      (existingStock.shares + importedStock.shares)
                    ),
                    // 合併股息記錄
                    dividendRecords: [
                      ...(existingStock.dividendRecords || []),
                      ...(importedStock.dividendRecords || [])
                    ].filter((dividend, index, arr) => 
                      // 去除重複的股息記錄
                      arr.findIndex(d => 
                        d.symbol === dividend.symbol && 
                        d.exDividendDate.getTime() === dividend.exDividendDate.getTime()
                      ) === index
                    ),
                    lastUpdated: new Date(),
                  };
                  
                  stockMap.set(key, mergedStock);
                } else {
                  // 新股票，生成新ID並設定正確的帳戶ID
                  const newId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
                  stockMap.set(key, {
                    ...importedStock,
                    id: newId,
                    accountId: targetAccount.id,
                    lastUpdated: new Date(),
                  });
                }
              }
            });
            
            finalStocks = Array.from(stockMap.values());
          }
          
          // 更新帳戶的股票數量
          const updatedAccounts = finalAccounts.map(account => ({
            ...account,
            stockCount: finalStocks.filter(stock => stock.accountId === account.id).length
          }));
          
          logger.success('import', `匯入完成`, {
            accounts: updatedAccounts.length,
            stocks: finalStocks.length
          });
          
          return {
            accounts: updatedAccounts,
            stocks: finalStocks
          };
        }),
        
        // 隱私模式操作
        togglePrivacyMode: () => set((state) => ({ 
          isPrivacyMode: !state.isPrivacyMode 
        })),
        
        // 成本價顯示模式操作
        toggleCostDisplayMode: () => set((state) => ({
          showAdjustedCost: !state.showAdjustedCost
        })),
        
        // 除權息模式操作
        setRightsAdjustmentMode: (mode) => set((state) => ({
          ...state,
          rightsAdjustmentMode: mode
        })),
        
        toggleRightsAdjustmentMode: () => set((state) => {
          logger.debug('global', `當前除權息模式: ${state.rightsAdjustmentMode}`);
          
          // 簡化為2種模式切換
          const nextMode = state.rightsAdjustmentMode === 'excluding_rights' 
            ? 'including_rights' 
            : 'excluding_rights';
          
          logger.info('global', `切換到新模式: ${nextMode}`);
          
          return {
            ...state,
            rightsAdjustmentMode: nextMode
          };
        }),
        
        // 雲端同步操作
        updateCloudSyncSettings: (settings) => set((state) => ({
          cloudSync: {
            ...state.cloudSync,
            ...settings
          }
        })),
        
        clearCloudSyncData: () => set((state) => ({
          cloudSync: {
            githubToken: '',
            autoSyncEnabled: false,
            syncInterval: 30,
            lastSyncTime: null,
            gistId: null,
          }
        })),
        
        // 股價更新操作
        setUpdatingPrices: (isUpdating) => set({ isUpdatingPrices: isUpdating }),
        setPriceUpdateProgress: (current, total) => set({ 
          priceUpdateProgress: { current, total } 
        }),
        
        updateAllStockPrices: async () => {
          const state = get();
          const stocks = state.stocks;
          
          console.log('🔍 updateAllStockPrices 被調用');
          console.log('📊 股票數量:', stocks.length);
          
          if (stocks.length === 0) {
            console.log('⚠️ 沒有股票需要更新');
            return;
          }
          
          state.setUpdatingPrices(true);
          state.setPriceUpdateProgress(0, stocks.length);
          
          let successCount = 0;
          let failCount = 0;
          
          try {
            console.log('🚀 開始批量更新股價:', stocks.length, '支股票');
            logger.info('stock', `開始批量更新股價: ${stocks.length} 支股票`);
            
            // 🚀 使用批量更新服務
            console.log('📦 準備載入批量更新服務...');
            const { batchUpdateService } = await import('../services/batchUpdateService');
            console.log('✅ 批量更新服務載入成功');
            
            console.log('🔄 開始執行批量更新...');
            const result = await batchUpdateService.batchUpdateStockPrices(
              stocks,
              (progress) => {
                // 更新進度
                state.setPriceUpdateProgress(progress.current, progress.total);
                
                console.log(`📊 批量更新進度: ${progress.current}/${progress.total}`, {
                  batch: `${progress.currentBatch}/${progress.totalBatches}`,
                  success: progress.successCount,
                  fail: progress.failCount
                });
                
                logger.debug('stock', `批量更新進度: ${progress.current}/${progress.total}`, {
                  batch: `${progress.currentBatch}/${progress.totalBatches}`,
                  success: progress.successCount,
                  fail: progress.failCount
                });
              }
            );
            
            console.log('✅ 批量更新執行完成');
            console.log('📊 批量更新結果:', {
              successCount: result.successCount,
              failCount: result.failCount,
              total: stocks.length
            });
            
            // 處理批量更新結果
            successCount = result.successCount;
            failCount = result.failCount;
            
            // 更新股價資料（同一 symbol 的所有記錄都要更新）
            result.results.forEach((priceData, symbol) => {
              if (priceData.price > 0) {
                const matchingStocks = stocks.filter(s => s.symbol === symbol);
                matchingStocks.forEach(stock => {
                  state.updateStock(stock.id, {
                    currentPrice: priceData.price,
                    lastUpdated: new Date(),
                    priceSource: priceData.source || 'API'
                  });
                });
              }
            });
            
            // 🔧 批量處理除權息（減少 API 調用）
            logger.info('dividend', `開始批量處理除權息: ${stocks.length} 支股票`);
            
            for (let i = 0; i < stocks.length; i++) {
              const stock = stocks[i];
              
              try {
                await updateStockDividendData(stock, state, true);
              } catch (dividendError) {
                logger.warn('dividend', `${stock.symbol} 除權息處理失敗`, dividendError.message);
              }
              
              // 除權息處理之間稍微延遲
              if (i < stocks.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 100));
              }
            }
            
            logger.info('stock', `批量更新完成`, { 
              success: successCount, 
              fail: failCount,
              total: stocks.length 
            });
            
          } catch (error) {
            logger.error('stock', '批量更新失敗', error);
          } finally {
            state.setUpdatingPrices(false);
            state.setPriceUpdateProgress(0, 0);
          }
        },
        
        // 重置狀態
        resetState: () => set(initialState),
      }),
      {
        name: 'stock-portfolio-storage-v7', // ⚠️ 版本號更新：添加雲端同步設定持久化
        partialize: (state) => ({
          // 只持久化需要的狀態，不包含 UI 狀態和更新狀態
          currentAccount: state.currentAccount,
          accounts: state.accounts,
          stocks: state.stocks.map(stock => ({
            ...stock,
            // 確保日期對象正確序列化
            purchaseDate: stock.purchaseDate instanceof Date ? stock.purchaseDate.toISOString() : stock.purchaseDate,
            lastUpdated: stock.lastUpdated instanceof Date ? stock.lastUpdated.toISOString() : stock.lastUpdated,
            dividendRecords: stock.dividendRecords?.map(dividend => ({
              ...dividend,
              exDividendDate: dividend.exDividendDate instanceof Date ? dividend.exDividendDate.toISOString() : dividend.exDividendDate
            }))
          })),
          isPrivacyMode: state.isPrivacyMode,
          rightsAdjustmentMode: state.rightsAdjustmentMode, // ⚠️ 關鍵：必須持久化除權息模式
          cloudSync: state.cloudSync, // ⚠️ 關鍵：持久化雲端同步設定，包含 GitHub Token
          lastPriceUpdate: state.lastPriceUpdate instanceof Date ? state.lastPriceUpdate.toISOString() : state.lastPriceUpdate,
        }),
        // 添加錯誤處理和數據恢復
        onRehydrateStorage: () => (state, error) => {
          if (error) {
            logger.error('global', '數據恢復失敗', error);
            // 清除損壞的數據
            localStorage.removeItem('stock-portfolio-storage-v6');
            localStorage.removeItem('stock-portfolio-storage-v7');
            logger.warn('global', '已清除損壞的 localStorage 數據');
            return;
          }
          
          if (state) {
            // 🔧 清理舊版本遺留的狀態
            if ((state as any).includeDividendInGainLoss !== undefined) {
              logger.warn('global', '檢測到舊版本狀態 includeDividendInGainLoss，已移除');
              delete (state as any).includeDividendInGainLoss;
            }
            
            // 🔧 確保有正確的 rightsAdjustmentMode
            if (!state.rightsAdjustmentMode) {
              logger.warn('global', '缺少 rightsAdjustmentMode，設定為預設值');
              state.rightsAdjustmentMode = 'excluding_rights';
            }
            
            // 恢復日期對象
            if (state.lastPriceUpdate && typeof state.lastPriceUpdate === 'string') {
              state.lastPriceUpdate = new Date(state.lastPriceUpdate);
            }
            
            if (state.stocks) {
              state.stocks = state.stocks.map(stock => ({
                ...stock,
                purchaseDate: typeof stock.purchaseDate === 'string' ? new Date(stock.purchaseDate) : stock.purchaseDate,
                lastUpdated: typeof stock.lastUpdated === 'string' ? new Date(stock.lastUpdated) : stock.lastUpdated,
                dividendRecords: stock.dividendRecords?.map(dividend => ({
                  ...dividend,
                  exDividendDate: typeof dividend.exDividendDate === 'string' ? new Date(dividend.exDividendDate) : dividend.exDividendDate
                }))
              }));
            }
            
            logger.info('global', '數據恢復成功', {
              accounts: state.accounts?.length || 0,
              stocks: state.stocks?.length || 0,
              rightsAdjustmentMode: state.rightsAdjustmentMode
            });
          }
        },
      }
    ),
    {
      name: 'stock-portfolio-store', // DevTools 名稱
    }
  )
);

// Expose to window for debugging in development
if (typeof window !== 'undefined') {
  (window as any).useAppStore = useAppStore;
  
  // 🔧 開發工具：狀態管理調試（v1.0.2.0142 新增）
  if (process.env.NODE_ENV === 'development') {
    (window as any).debugAppStore = {
      // 獲取當前狀態
      getState: () => useAppStore.getState(),
      
      // 清除 localStorage
      clearStorage: () => {
        localStorage.removeItem('stock-portfolio-storage-v7');
        logger.warn('global', 'localStorage 已清除，即將重新載入...');
        setTimeout(() => window.location.reload(), 500);
      },
      
      // 查看持久化的狀態
      getPersistedState: () => {
        const data = localStorage.getItem('stock-portfolio-storage-v7');
        return data ? JSON.parse(data) : null;
      },
      
      // 驗證狀態完整性
      validateState: () => {
        const state = useAppStore.getState();
        const issues = [];
        
        // 檢查必要欄位
        if (!state.accounts) issues.push('❌ 缺少 accounts');
        if (!state.stocks) issues.push('❌ 缺少 stocks');
        if (!state.rightsAdjustmentMode) issues.push('❌ 缺少 rightsAdjustmentMode');
        
        // 檢查不應該存在的舊欄位
        if ((state as any).includeDividendInGainLoss !== undefined) {
          issues.push('❌ 存在舊欄位 includeDividendInGainLoss');
        }
        
        if (issues.length === 0) {
          logger.success('global', '✅ 狀態驗證通過');
          console.log('✅ 狀態正常');
          return true;
        } else {
          logger.error('global', '❌ 狀態驗證失敗', { issues });
          logger.error('global', '❌ 發現問題', issues);
          return false;
        }
      },
      
      // 顯示幫助資訊
      help: () => {
        console.log(`
🔧 debugAppStore 開發工具 (v1.0.2.0142)

可用命令：
  debugAppStore.getState()          - 查看當前狀態
  debugAppStore.getPersistedState() - 查看持久化的狀態
  debugAppStore.validateState()     - 驗證狀態完整性
  debugAppStore.clearStorage()      - 清除 localStorage 並重載
  debugAppStore.help()              - 顯示此幫助資訊

範例：
  > debugAppStore.validateState()
  ✅ 狀態正常
  
  > debugAppStore.getState().rightsAdjustmentMode
  "excluding_rights"
  
  > debugAppStore.getPersistedState()
  { state: { accounts: [...], stocks: [...], ... } }

詳細文檔：docs/IMPROVEMENT_IMPLEMENTATION_PLAN.md
        `);
      }
    };
    
    logger.info('global', '🔧 開發工具已載入：debugAppStore');
    console.log('🔧 開發工具已載入：debugAppStore');
    console.log('   輸入 debugAppStore.help() 查看可用命令');
  }
}
