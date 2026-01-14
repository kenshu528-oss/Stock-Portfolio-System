import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { Account, StockRecord } from '../types';

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
          console.log(`🔄 updateStock 被調用: ID=${id}, updates=`, updates);
          set((state) => {
            const oldStock = state.stocks.find(s => s.id === id);
            console.log(`📊 更新前股票資料:`, oldStock);
            
            const newStocks = state.stocks.map(stock => 
              stock.id === id ? { ...stock, ...updates } : stock
            );
            
            const updatedStock = newStocks.find(s => s.id === id);
            console.log(`📈 更新後股票資料:`, updatedStock);
            
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
          
          console.log(`✅ 匯入完成: ${updatedAccounts.length} 個帳戶, ${finalStocks.length} 筆股票`);
          
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
                // 只更新股價，移除股息更新避免404錯誤
                const priceResponse = await fetch(`http://localhost:3001/api/stock/${stock.symbol}`);
                if (priceResponse.ok) {
                  const priceData = await priceResponse.json();
                  state.updateStock(stock.id, {
                    currentPrice: priceData.price,
                    lastUpdated: new Date(),
                    priceSource: priceData.source === 'Yahoo Finance' ? 'Yahoo' : 'TWSE'
                  });
                  console.log(`✅ ${stock.symbol} 股價更新成功: ${priceData.price}`);
                  successCount++;
                } else {
                  console.warn(`❌ ${stock.symbol} 股價更新失敗: ${priceResponse.status}`);
                  failCount++;
                }
                
              } catch (error) {
                console.error(`❌ ${stock.symbol} 股價更新錯誤:`, error);
                failCount++;
              }
              
              // 避免請求過於頻繁
              if (i < stocks.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 200));
              }
            }
            
            set({ lastPriceUpdate: new Date() });
            console.log(`📊 股價批量更新完成：成功 ${successCount} 支，失敗 ${failCount} 支`);
            
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
            console.error('數據恢復失敗:', error);
            // 清除損壞的數據
            localStorage.removeItem('stock-portfolio-storage-v6');
            console.log('已清除損壞的 localStorage 數據');
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
            
            console.log('數據恢復成功');
          }
        },
      }
    ),
    {
      name: 'stock-portfolio-store', // DevTools 名稱
    }
  )
);