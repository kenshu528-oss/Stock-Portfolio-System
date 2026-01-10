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
  
  // 股票操作
  addStock: (stock: StockRecord) => void;
  updateStock: (id: string, updates: Partial<StockRecord>) => void;
  deleteStock: (id: string) => void;
  
  // 隱私模式操作
  togglePrivacyMode: () => void;
  
  // 股價更新操作
  updateAllStockPrices: () => Promise<void>;
  setUpdatingPrices: (isUpdating: boolean) => void;
  setPriceUpdateProgress: (current: number, total: number) => void;
  setLastPriceUpdate: (date: Date) => void;
  
  // 重置狀態
  resetState: () => void;
}

// 初始狀態
const initialState: AppState = {
  // UI 狀態
  isSidebarOpen: false,
  isAccountManagerOpen: false,
  isAddStockFormOpen: false,
  
  // 帳戶狀態
  currentAccount: '帳戶1',
  accounts: [
    { id: '1', name: '帳戶1', stockCount: 2 }, // 更新股票數量：00878 + 00919
    { id: '2', name: '帳戶2', stockCount: 0 }
  ],
  
  // 股票狀態
  stocks: [
    // 測試用股票資料 - 00878 國泰永續高股息
    {
      id: 'test-00878-1',
      accountId: '1',
      symbol: '00878',
      name: '國泰永續高股息',
      shares: 1000,
      costPrice: 21.48,
      adjustedCostPrice: 21.48,
      purchaseDate: new Date('2023-06-01'),
      currentPrice: 22.12,
      lastUpdated: new Date(),
      priceSource: 'Yahoo' as const,
      dividendRecords: [
        {
          id: 'div-00878-1',
          stockId: 'test-00878-1',
          symbol: '00878',
          exDividendDate: new Date('2025-05-19'), // 2025 Q1
          dividendPerShare: 0.47,
          totalDividend: 470, // 1000股 × 0.47元
          shares: 1000
        },
        {
          id: 'div-00878-2',
          stockId: 'test-00878-1',
          symbol: '00878',
          exDividendDate: new Date('2025-08-18'), // 2025 Q2
          dividendPerShare: 0.4,
          totalDividend: 400, // 1000股 × 0.4元
          shares: 1000
        },
        {
          id: 'div-00878-3',
          stockId: 'test-00878-1',
          symbol: '00878',
          exDividendDate: new Date('2025-11-18'), // 2025 Q3
          dividendPerShare: 0.4,
          totalDividend: 400, // 1000股 × 0.4元
          shares: 1000
        }
      ]
    },
    // 測試用股票資料 - 00919 群益台灣精選高息
    {
      id: 'test-00919-1',
      accountId: '1',
      symbol: '00919',
      name: '群益台灣精選高息',
      shares: 500,
      costPrice: 18.25,
      adjustedCostPrice: 18.25,
      purchaseDate: new Date('2024-01-15'),
      currentPrice: 18.50,
      lastUpdated: new Date(),
      priceSource: 'Yahoo' as const,
      dividendRecords: [
        {
          id: 'div-00919-1',
          stockId: 'test-00919-1',
          symbol: '00919',
          exDividendDate: new Date('2024-06-17'),
          dividendPerShare: 0.35,
          totalDividend: 175, // 500股 × 0.35元
          shares: 500
        },
        {
          id: 'div-00919-2',
          stockId: 'test-00919-1',
          symbol: '00919',
          exDividendDate: new Date('2024-12-16'),
          dividendPerShare: 0.38,
          totalDividend: 190, // 500股 × 0.38元
          shares: 500
        }
      ]
    }
  ],
  
  // 隱私模式（預設啟用）
  isPrivacyMode: true,
  
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
      (set) => ({
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
          accounts: state.accounts.map(account =>
            account.id === id ? { ...account, ...updates } : account
          )
        })),
        
        deleteAccount: (id) => set((state) => ({
          accounts: state.accounts.filter(account => account.id !== id),
          stocks: state.stocks.filter(stock => stock.accountId !== id)
        })),
        
        reorderAccounts: (fromIndex, toIndex) => set((state) => {
          const newAccounts = [...state.accounts];
          const [movedAccount] = newAccounts.splice(fromIndex, 1);
          newAccounts.splice(toIndex, 0, movedAccount);
          return { accounts: newAccounts };
        }),
        
        // 股票操作
        addStock: (stock) => set((state) => ({
          stocks: [...state.stocks, stock],
          accounts: state.accounts.map(account =>
            account.id === stock.accountId
              ? { ...account, stockCount: account.stockCount + 1 }
              : account
          )
        })),
        
        updateStock: (id, updates) => set((state) => ({
          stocks: state.stocks.map(stock =>
            stock.id === id ? { ...stock, ...updates } : stock
          )
        })),
        
        deleteStock: (id) => set((state) => {
          const stockToDelete = state.stocks.find(stock => stock.id === id);
          return {
            stocks: state.stocks.filter(stock => stock.id !== id),
            accounts: stockToDelete
              ? state.accounts.map(account =>
                  account.id === stockToDelete.accountId
                    ? { ...account, stockCount: Math.max(0, account.stockCount - 1) }
                    : account
                )
              : state.accounts
          };
        }),
        
        // 隱私模式操作
        togglePrivacyMode: () => set((state) => ({
          isPrivacyMode: !state.isPrivacyMode
        })),
        
        // 股價更新操作
        setUpdatingPrices: (isUpdating) => set({ isUpdatingPrices: isUpdating }),
        
        setPriceUpdateProgress: (current, total) => set({
          priceUpdateProgress: { current, total }
        }),
        
        setLastPriceUpdate: (date) => set({ lastPriceUpdate: date }),
        
        updateAllStockPrices: async () => {
          const state = useAppStore.getState();
          const stocks = state.stocks;
          
          if (stocks.length === 0) return;
          
          // 設定更新狀態
          state.setUpdatingPrices(true);
          state.setPriceUpdateProgress(0, stocks.length);
          
          try {
            // 批次更新所有股票價格
            for (let i = 0; i < stocks.length; i++) {
              const stock = stocks[i];
              
              try {
                // 調用後端API更新股價
                const response = await fetch(`http://localhost:3001/api/stock/${stock.symbol}`);
                if (response.ok) {
                  const data = await response.json();
                  
                  // 更新股票價格
                  state.updateStock(stock.id, {
                    currentPrice: data.price,
                    lastUpdated: new Date(),
                    priceSource: data.source === 'Yahoo Finance' ? 'Yahoo' : 'TWSE'
                  });
                }
              } catch (error) {
                console.error(`更新 ${stock.symbol} 股價失敗:`, error);
                // 繼續更新其他股票，不中斷整個流程
              }
              
              // 更新進度
              state.setPriceUpdateProgress(i + 1, stocks.length);
              
              // 添加小延遲避免API請求過於頻繁
              if (i < stocks.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 200));
              }
            }
            
            // 設定最後更新時間
            state.setLastPriceUpdate(new Date());
            
          } catch (error) {
            console.error('批次更新股價失敗:', error);
          } finally {
            // 重置更新狀態
            state.setUpdatingPrices(false);
            state.setPriceUpdateProgress(0, 0);
          }
        },
        
        // 重置狀態
        resetState: () => set(initialState),
      }),
      {
        name: 'stock-portfolio-storage-v5', // localStorage key - 新增00919測試資料
        partialize: (state) => ({
          // 只持久化需要的狀態，不包含 UI 狀態
          currentAccount: state.currentAccount,
          accounts: state.accounts,
          stocks: state.stocks,
          isPrivacyMode: state.isPrivacyMode,
          lastPriceUpdate: state.lastPriceUpdate,
        }),
      }
    ),
    {
      name: 'stock-portfolio-store', // DevTools 名稱
    }
  )
);