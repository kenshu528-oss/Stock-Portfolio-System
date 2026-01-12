import React from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import AccountManager from './components/AccountManager';
import AddStockForm from './components/AddStockForm';
import QuickAddStock from './components/QuickAddStock';
import StockList from './components/StockList';
import PortfolioStats from './components/PortfolioStats';
import ErrorBoundary from './components/ErrorBoundary';
import { CloudSyncSettings } from './components/CloudSyncSettings';
import { addOperationLog } from './components/OperationLog';
import { useAppStore } from './stores/appStore';
import { useEnhancedStock } from './hooks/useEnhancedStock';
  // 移除未使用的導入
  // import DividendApiService from './services/dividendApiService';
  import type { StockRecord, StockFormData } from './types';

function App() {
  // 使用 Zustand store
  const {
    // UI 狀態
    isSidebarOpen,
    isAccountManagerOpen,
    isAddStockFormOpen,
    setSidebarOpen,
    setAccountManagerOpen,
    setAddStockFormOpen,
    
    // 帳戶狀態
    currentAccount,
    accounts,
    setCurrentAccount,
    addAccount,
    updateAccount,
    deleteAccount,
    reorderAccounts,
    updateAccountStockCounts,
    
    // 股票狀態
    stocks,
    addStock,
    updateStock,
    deleteStock,
    
    // 隱私模式
    isPrivacyMode,
    togglePrivacyMode
  } = useAppStore();

  // 增強版股票操作（疊加功能）
  const { addStockWithEnhancements } = useEnhancedStock();

  // 雲端同步狀態
  const [isCloudSyncOpen, setIsCloudSyncOpen] = React.useState(false);

  // 處理雲端同步資料
  const handleCloudDataSync = (cloudData: any) => {
    try {
      if (cloudData.accounts) {
        // 更新帳戶資料
        cloudData.accounts.forEach((account: any) => {
          const existingAccount = accounts.find(a => a.id === account.id);
          if (existingAccount) {
            updateAccount(account.id, account);
          } else {
            // 創建完整的帳戶對象
            const newAccount = {
              id: account.id || Date.now().toString(),
              name: account.name,
              stockCount: account.stockCount || 0,
              brokerageFee: account.brokerageFee ?? 0.1425,
              transactionTax: account.transactionTax ?? 0.3,
              createdAt: account.createdAt ? new Date(account.createdAt) : new Date()
            };
            addAccount(newAccount);
          }
        });
      }
      
      if (cloudData.stocks) {
        // 更新股票資料
        cloudData.stocks.forEach((stock: any) => {
          const existingStock = stocks.find(s => s.id === stock.id);
          if (existingStock) {
            updateStock(stock.id, stock);
          } else {
            addStock(stock);
          }
        });
      }
      
      addOperationLog('success', '雲端資料已成功同步到本地！');
    } catch (error) {
      console.error('同步雲端資料失敗:', error);
      addOperationLog('error', '同步雲端資料失敗，請檢查資料格式。');
    }
  };

  // 匯出功能
  const handleExport = () => {
    try {
      // 確保所有帳戶都有完整的交易成本欄位
      const exportAccounts = accounts.map(account => ({
        ...account,
        brokerageFee: account.brokerageFee ?? 0.1425,
        transactionTax: account.transactionTax ?? 0.3
      }));

      const exportData = {
        version: "1.0.2.0015",  // 環境檢測：雲端同步智能適應
        exportDate: new Date().toISOString(),
        accounts: exportAccounts,
        stocks,
        metadata: {
          totalAccounts: exportAccounts.length,
          totalStocks: stocks.length,
          exportOptions: { format: 'json' },
          dataVersion: "1.0.2.0015",  // 資料結構版本
          features: ["brokerageFee", "transactionTax", "feeAdjustedGainLoss"]  // 支援的功能列表
        }
      };
      
      const content = JSON.stringify(exportData, null, 2);
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `portfolio_${new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')}.json`;
      link.click();
      URL.revokeObjectURL(url);
      
      addOperationLog('success', '資料匯出成功');
    } catch (error) {
      addOperationLog('error', '匯出失敗：' + (error instanceof Error ? error.message : '未知錯誤'));
    }
  };

  // 匯入功能 - 使用簡單的文件選擇器
  const handleImport = () => {
    console.log('開始匯入流程');
    addOperationLog('info', '正在準備匯入檔案...');
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      console.log('檔案選擇事件觸發');
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        console.log('沒有選擇檔案');
        return;
      }
      
      console.log('選擇的檔案:', file.name, file.size);
      addOperationLog('info', `正在處理檔案: ${file.name}`);
      
      try {
        const text = await file.text();
        console.log('檔案內容長度:', text.length);
        const data = JSON.parse(text);
        console.log('解析的資料:', data);
        
        if (data.accounts && data.stocks) {
          console.log('資料格式正確，詢問匯入模式');
          
          // 讓用戶選擇匯入模式
          const useReplaceMode = confirm(
            `檔案包含：帳戶 ${data.accounts.length} 個，股票 ${data.stocks.length} 筆\n\n` +
            '請選擇匯入模式：\n\n' +
            '【確定】= 替換模式（完全替換現有資料）\n' +
            '【取消】= 合併模式（與現有資料合併）'
          );
          
          const mode = useReplaceMode ? 'replace' : 'merge';
          console.log('用戶選擇的模式:', mode);
          
          // 處理帳戶資料 - 轉換日期格式
          const processedAccounts = data.accounts.map((acc: any) => ({
            ...acc,
            createdAt: acc.createdAt ? new Date(acc.createdAt) : new Date()
          }));
          
          // 處理股票資料 - 轉換日期格式
          const processedStocks = data.stocks.map((stock: any) => ({
            ...stock,
            purchaseDate: new Date(stock.purchaseDate),
            lastUpdated: new Date(stock.lastUpdated),
            dividendRecords: stock.dividendRecords?.map((dividend: any) => ({
              ...dividend,
              exDividendDate: new Date(dividend.exDividendDate)
            })) || []
          }));
          
          console.log('資料處理完成，開始匯入');
          
          // 使用 appStore 的 importData 方法
          const { importData } = useAppStore.getState();
          importData(processedAccounts, processedStocks, mode);
          
          const modeText = mode === 'replace' ? '替換' : '合併';
          addOperationLog('success', `${modeText}匯入成功！帳戶：${data.accounts.length} 個，股票：${data.stocks.length} 筆`);
          console.log('匯入完成');
        } else {
          console.log('檔案格式錯誤');
          addOperationLog('error', '檔案格式錯誤：缺少必要的帳戶或股票資料');
        }
      } catch (error) {
        console.error('匯入過程中發生錯誤:', error);
        addOperationLog('error', '匯入失敗：' + (error instanceof Error ? error.message : '未知錯誤'));
      }
    };
    
    console.log('觸發檔案選擇器');
    input.click();
  };

  // 恢復預設值功能
  const handleResetToDefault = () => {
    // 第一層確認
    const firstConfirm = confirm(
      '⚠️ 警告：恢復預設值將會清除所有資料！\n\n' +
      '這將會刪除：\n' +
      '• 所有帳戶和股票資料\n' +
      '• 操作日誌記錄\n' +
      '• 隱私模式設定\n\n' +
      '確定要繼續嗎？'
    );
    
    if (!firstConfirm) return;
    
    // 第二層確認 - 要求輸入確認文字
    const confirmText = prompt(
      '請輸入 "RESET" 來確認此操作：\n\n' +
      '注意：此操作無法復原！'
    );
    
    if (confirmText !== 'RESET') {
      if (confirmText !== null) { // 用戶沒有取消，但輸入錯誤
        alert('輸入錯誤，操作已取消。');
      }
      return;
    }
    
    try {
      // 清除所有 Zustand store 資料
      const store = useAppStore.getState();
      
      // 重置帳戶資料
      store.accounts.forEach(account => {
        store.deleteAccount(account.id);
      });
      
      // 重置股票資料
      store.stocks.forEach(stock => {
        store.deleteStock(stock.id);
      });
      
      // 創建預設帳戶
      const defaultAccount = {
        id: Date.now().toString(),
        name: '帳戶1',
        stockCount: 0,
        brokerageFee: 0.1425,
        transactionTax: 0.3,
        createdAt: new Date()
      };
      store.addAccount(defaultAccount);
      store.setCurrentAccount('帳戶1');
      
      // 重置隱私模式
      if (store.isPrivacyMode) {
        store.togglePrivacyMode();
      }
      
      // 清除本地存儲（如果有的話）
      localStorage.removeItem('portfolioData');
      localStorage.removeItem('appStore');
      
      addOperationLog('success', '已恢復預設值，所有資料已清除');
      console.log('恢復預設值完成');
      
    } catch (error) {
      console.error('恢復預設值失敗:', error);
      addOperationLog('error', '恢復預設值失敗：' + (error instanceof Error ? error.message : '未知錯誤'));
    }
  };

  // 記錄應用程式啟動並更新帳戶股票數量
  React.useEffect(() => {
    addOperationLog('info', '股票投資組合系統已啟動');
    updateAccountStockCounts(); // 確保stockCount正確
  }, []);

  const handleMenuToggle = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  const handleSidebarClose = () => {
    setSidebarOpen(false);
  };

  // 帳戶管理相關函數
  const handleCreateAccount = (name: string, brokerageFee?: number, transactionTax?: number) => {
    const newAccount = {
      id: Date.now().toString(),
      name,
      stockCount: 0,
      brokerageFee: brokerageFee ?? 0.1425,
      transactionTax: transactionTax ?? 0.3,
      createdAt: new Date()
    };
    addAccount(newAccount);
    addOperationLog('success', `成功創建帳戶：${name}`);
  };

  const handleDeleteAccount = (id: string) => {
    const account = accounts.find(acc => acc.id === id);
    deleteAccount(id);
    if (account) {
      addOperationLog('info', `已刪除帳戶：${account.name}`);
    }
  };

  const handleRenameAccount = (id: string, newName: string) => {
    const account = accounts.find(acc => acc.id === id);
    const oldName = account?.name || '未知帳戶';
    updateAccount(id, { name: newName });
    addOperationLog('info', `帳戶重新命名：${oldName} → ${newName}`);
  };

  const handleUpdateBrokerageFee = (id: string, brokerageFee: number) => {
    const account = accounts.find(acc => acc.id === id);
    updateAccount(id, { brokerageFee });
    addOperationLog('info', `更新帳戶 ${account?.name} 手續費率：${brokerageFee}%`);
  };

  const handleUpdateTransactionTax = (id: string, transactionTax: number) => {
    const account = accounts.find(acc => acc.id === id);
    updateAccount(id, { transactionTax });
    addOperationLog('info', `更新帳戶 ${account?.name} 交易稅率：${transactionTax}%`);
  };

  const handleReorderAccount = (fromIndex: number, toIndex: number) => {
    reorderAccounts(fromIndex, toIndex);
  };

  // 帳戶切換
  const handleAccountSwitch = (accountName: string) => {
    setCurrentAccount(accountName);
  };

  // 新增股票相關函數（增強版，支援股息自動計算和債券ETF識別）
  const handleAddStock = async (stockData: StockFormData) => {
    console.log('新增股票:', stockData);
    addOperationLog('info', `開始新增股票 ${stockData.symbol} - ${stockData.name}`);
    
    // 找到對應的帳戶ID
    const account = accounts.find(acc => acc.name === stockData.account);
    if (!account) {
      console.error('找不到對應的帳戶');
      addOperationLog('error', `新增股票失敗：找不到帳戶 ${stockData.account}`);
      return;
    }
    
    // 創建基本股票記錄
    const shares = parseInt(stockData.shares);
    
    const newStock: StockRecord = {
      id: Date.now().toString(),
      accountId: account.id,
      symbol: stockData.symbol,
      name: stockData.name,
      shares: shares,
      costPrice: parseFloat(stockData.costPrice),
      adjustedCostPrice: parseFloat(stockData.costPrice), // 初始等於成本價
      purchaseDate: new Date(stockData.purchaseDate), // 轉換為 Date 對象
      currentPrice: stockData.price,
      lastUpdated: new Date(),
      priceSource: 'TWSE'
    };
    
    try {
      // 使用增強版 addStock（自動計算股息和識別債券ETF）
      console.log('使用增強版新增股票功能...');
      const result = await addStockWithEnhancements(newStock);
      
      if (result.success) {
        console.log('增強版股票記錄已創建:', result.stock);
        addOperationLog('success', `成功新增股票 ${stockData.symbol}，持股 ${shares} 股`);
        
        // 如果有股息資料，記錄日誌
        if (result.stock.dividendRecords && result.stock.dividendRecords.length > 0) {
          addOperationLog('info', `自動獲取到 ${result.stock.dividendRecords.length} 筆股息記錄`);
        }
        
        // 如果是債券ETF，記錄特殊稅率
        if (result.stock.isBondETF) {
          const taxRate = result.stock.transactionTaxRate || 0;
          addOperationLog('info', `識別為債券ETF，證交稅率: ${taxRate}%`);
        }
      } else {
        // 增強功能失敗，但股票已通過原有邏輯添加
        addOperationLog('warning', `股票已新增，但增強功能失敗: ${result.error}`);
      }
    } catch (error) {
      console.error('增強版新增股票失敗:', error);
      addOperationLog('error', `增強功能失敗，已回退到基本功能: ${error instanceof Error ? error.message : '未知錯誤'}`);
      
      // 回退到原有的 addStock（確保功能不會完全失效）
      addStock(newStock);
      addOperationLog('success', `成功新增股票 ${stockData.symbol}（基本模式）`);
    }
  };

  // 更新股票
  const handleUpdateStock = (id: string, updates: Partial<StockRecord>) => {
    updateStock(id, updates);
  };

  // 刪除股票
  const handleDeleteStock = (id: string) => {
    const stock = stocks.find(s => s.id === id);
    deleteStock(id);
    if (stock) {
      addOperationLog('info', `已刪除股票：${stock.symbol} - ${stock.name}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <ErrorBoundary>
        <Header 
          onMenuToggle={handleMenuToggle} 
          isMenuOpen={isSidebarOpen}
          onPrivacyToggle={togglePrivacyMode}
          isPrivacyMode={isPrivacyMode}
        />
      </ErrorBoundary>
      
      <div className="flex">
        {/* Sidebar */}
        <ErrorBoundary>
          <Sidebar 
            isOpen={isSidebarOpen} 
            onClose={handleSidebarClose}
            onOpenAccountManager={() => setAccountManagerOpen(true)}
            onOpenAddStock={() => setAddStockFormOpen(true)}
            onExport={handleExport}
            onImport={() => {
              console.log('App.tsx: 匯入函數被調用');
              handleImport();
            }}
            onOpenCloudSync={() => setIsCloudSyncOpen(true)}
            onResetToDefault={handleResetToDefault}
          />
        </ErrorBoundary>
        
        {/* Main content area - always full width */}
        <main className="flex-1 p-4">
          {/* Content area - 80% of screen space for stock list and portfolio info */}
          <div className="max-w-7xl mx-auto">
            {/* Account tabs */}
            <ErrorBoundary>
              <div className="mb-6">
                <nav className="flex space-x-8 border-b border-slate-700">
                  {accounts.map((account) => (
                    <button
                      key={account.id}
                      onClick={() => handleAccountSwitch(account.name)}
                      className={`border-b-2 py-3 px-1 text-sm font-medium whitespace-nowrap transition-colors ${
                        currentAccount === account.name
                          ? 'border-blue-500 text-blue-400'
                          : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      {account.name}
                    </button>
                  ))}
                  <button 
                    className="border-b-2 border-transparent py-3 px-1 text-sm font-medium text-slate-400 hover:text-slate-300 hover:border-slate-600"
                    onClick={() => setAccountManagerOpen(true)}
                    aria-label="新增帳戶"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </nav>
              </div>
            </ErrorBoundary>

            {/* Portfolio stats */}
            <ErrorBoundary>
              <PortfolioStats
                stocks={stocks}
                currentAccountId={accounts.find(acc => acc.name === currentAccount)?.id || ''}
                isPrivacyMode={isPrivacyMode}
                className="mb-6"
              />
            </ErrorBoundary>
            
            {/* Quick Add Stock - 快速新增股票 */}
            <ErrorBoundary>
              <QuickAddStock
                currentAccount={currentAccount}
                onSubmit={handleAddStock}
                className="mb-6"
              />
            </ErrorBoundary>
            
            {/* Stock list */}
            <ErrorBoundary>
              <StockList
                stocks={stocks}
                currentAccountId={accounts.find(acc => acc.name === currentAccount)?.id || ''}
                onUpdateStock={handleUpdateStock}
                onDeleteStock={handleDeleteStock}
                emptyMessage="尚無股票記錄"
              />
            </ErrorBoundary>
          </div>
        </main>
      </div>

      {/* Modals */}
      <ErrorBoundary>
        <AccountManager
          isOpen={isAccountManagerOpen}
          onClose={() => setAccountManagerOpen(false)}
          accounts={accounts}
          onCreateAccount={handleCreateAccount}
          onDeleteAccount={handleDeleteAccount}
          onRenameAccount={handleRenameAccount}
          onUpdateBrokerageFee={handleUpdateBrokerageFee}
          onUpdateTransactionTax={handleUpdateTransactionTax}
          onReorderAccount={handleReorderAccount}
        />
      </ErrorBoundary>

      <ErrorBoundary>
        <AddStockForm
          isOpen={isAddStockFormOpen}
          onClose={() => setAddStockFormOpen(false)}
          onSubmit={handleAddStock}
          currentAccount={currentAccount}
        />
      </ErrorBoundary>

      {/* 雲端同步設定對話框 */}
      <ErrorBoundary>
        <CloudSyncSettings
          isOpen={isCloudSyncOpen}
          onClose={() => setIsCloudSyncOpen(false)}
          onDataSync={handleCloudDataSync}
        />
      </ErrorBoundary>
    </div>
  );
}

export default App;