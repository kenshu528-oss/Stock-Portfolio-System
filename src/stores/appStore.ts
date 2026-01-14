import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { Account, StockRecord, DividendRecord } from '../types';
import { logger } from '../utils/logger';

// 除權息資料更新函數（統一使用 RightsEventService，確保與個股內更新邏輯完全一致）
const updateStockDividendData = async (stock: StockRecord, state: any) => {
  try {
    logger.debug('dividend', `批量更新: 開始處理 ${stock.symbol} 的除權息資料`);
    
    // 動態導入服務（避免循環依賴）
    const RightsEventService = (await import('../services/rightsEventService')).RightsEventService;
    
    // 使用與個股內更新完全相同的邏輯處理除權息
    const updatedStock = await RightsEventService.processStockRightsEvents(
      stock,
      (message) => {
        logger.debug('dividend', `${stock.symbol}: ${message}`);
      }
    );
    
    // 更新股票記錄
    state.updateStock(stock.id, {
      shares: updatedStock.shares,
      dividendRecords: updatedStock.dividendRecords,
      adjustedCostPrice: updatedStock.adjustedCostPrice,
      lastDividendUpdate: updatedStock.lastDividendUpdate
    });
    
    logger.success('dividend', `${stock.symbol} 除權息更新完成`, {
      records: updatedStock.dividendRecords?.length || 0,
      shares: updatedStock.shares,
      adjustedCost: updatedStock.adjustedCostPrice?.toFixed(2)
    });
  } catch (error) {
    logger.error('dividend', `${stock.symbol} 除權息更新失敗`, error);
  }
};

// 定義應用程式狀態介面
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
  
  // 損益顯示模式（含息/不含息）
  includeDividendInGainLoss: boolean;
  
  // 除權息計算模式（簡化為2種）
  rightsAdjustmentMode: 'excluding_rights' | 'including_rights';
  
  // 股價更新狀態
  isUpdatingPrices: boolean;
  lastPriceUpdate: Date | null;
  priceUpdateProgress: {
    current: number;
    total: number;
  };
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
  
  // 損益顯示模式操作
  toggleDividendInGainLoss: () => void;
  
  // 除權息模式操作
  setRightsAdjustmentMode: (mode: 'excluding_rights' | 'including_rights') => void;
  toggleRightsAdjustmentMode: () => void;
  
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
  
  // 損益顯示模式 - 預設包含股息收入
  includeDividendInGainLoss: true,
  
  // 除權息計算模式 - 預設使用原始損益（更直觀）
  rightsAdjustmentMode: 'excluding_rights' as const,
  
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
            
            return { ...state, stocks: newStocks };
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
        
        // 損益顯示模式操作
        toggleDividendInGainLoss: () => set((state) => {
          logger.debug('global', `切換損益模式: ${!state.includeDividendInGainLoss}`);
          const newState = {
            ...state,
            includeDividendInGainLoss: !state.includeDividendInGainLoss
          };
          return newState;
        }),
        
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
        
        // 股價更新操作
        setUpdatingPrices: (isUpdating) => set({ isUpdatingPrices: isUpdating }),
        setPriceUpdateProgress: (current, total) => set({ 
          priceUpdateProgress: { current, total } 
        }),
        
        updateAllStockPrices: async () => {
          const state = get();
          const stocks = state.stocks;
          
          if (stocks.length === 0) return;
          
          state.setUpdatingPrices(true);
          state.setPriceUpdateProgress(0, stocks.length);
          
          let successCount = 0;
          let failCount = 0;
          
          try {
            for (let i = 0; i < stocks.length; i++) {
              const stock = stocks[i];
              state.setPriceUpdateProgress(i + 1, stocks.length);
              
              try {
                logger.debug('stock', `開始更新 ${stock.symbol} 股價和除權息`);
                
                // 1. 更新股價（添加超時處理）
                const priceController = new AbortController();
                const priceTimeout = setTimeout(() => priceController.abort(), 10000); // 10秒超時
                
                const priceResponse = await fetch(`http://localhost:3001/api/stock/${stock.symbol}`, {
                  signal: priceController.signal
                });
                clearTimeout(priceTimeout);
                
                if (priceResponse.ok) {
                  const priceData = await priceResponse.json();
                  
                  // 2. 同時更新除權息資料（添加超時處理）
                  try {
                    const dividendPromise = updateStockDividendData(stock, state);
                    const dividendTimeout = new Promise((_, reject) => 
                      setTimeout(() => reject(new Error('除權息更新超時')), 15000)
                    );
                    
                    await Promise.race([dividendPromise, dividendTimeout]);
                    logger.debug('dividend', `${stock.symbol} 除權息處理完成`);
                  } catch (dividendError) {
                    logger.warn('dividend', `${stock.symbol} 除權息更新失敗，股價更新繼續`, dividendError.message);
                  }
                  
                  // 3. 更新股價資料
                  state.updateStock(stock.id, {
                    currentPrice: priceData.price,
                    lastUpdated: new Date(),
                    priceSource: priceData.source === 'Yahoo Finance' ? 'Yahoo' : 'TWSE'
                  });
                  
                  logger.success('stock', `${stock.symbol} 更新成功: ${priceData.price}`);
                  successCount++;
                } else {
                  logger.warn('stock', `${stock.symbol} 股價更新失敗: ${priceResponse.status}`);
                  failCount++;
                }
                
              } catch (error) {
                if (error.name === 'AbortError') {
                  logger.error('stock', `${stock.symbol} 更新超時`);
                } else {
                  logger.error('stock', `${stock.symbol} 更新失敗`, error);
                }
                failCount++;
              }
              
              // 避免請求過於頻繁
              if (i < stocks.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 300));
              }
            }
            
            set({ lastPriceUpdate: new Date() });
            logger.info('stock', `批量更新完成`, { success: successCount, fail: failCount });
            
          } finally {
            state.setUpdatingPrices(false);
            state.setPriceUpdateProgress(0, 0);
          }
        },
        
        // 重置狀態
        resetState: () => set(initialState),
      }),
      {
        name: 'stock-portfolio-storage-v6', // 版本化的 localStorage key
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
          lastPriceUpdate: state.lastPriceUpdate instanceof Date ? state.lastPriceUpdate.toISOString() : state.lastPriceUpdate,
        }),
        // 添加錯誤處理和數據恢復
        onRehydrateStorage: () => (state, error) => {
          if (error) {
            logger.error('global', '數據恢復失敗', error);
            // 清除損壞的數據
            localStorage.removeItem('stock-portfolio-storage-v6');
            logger.warn('global', '已清除損壞的 localStorage 數據');
            return;
          }
          
          if (state) {
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
            
            logger.info('global', '數據恢復成功');
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
}
