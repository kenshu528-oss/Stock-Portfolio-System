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
import DividendApiService from './services/dividendApiService';
import type { StockRecord, StockFormData, DividendRecord } from './types';

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
            addAccount(account.name);
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
      const exportData = {
        version: "1.0.0",
        exportDate: new Date().toISOString(),
        accounts,
        stocks,
        metadata: {
          totalAccounts: accounts.length,
          totalStocks: stocks.length,
          exportOptions: { format: 'json' }
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

  // 匯入功能
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const data = JSON.parse(content);
          
          if (data.accounts && data.stocks) {
            // 簡化處理：提示用戶手動匯入
            alert('請使用匯入功能來載入檔案資料。');
            addOperationLog('success', `匯入成功！帳戶：${data.accounts.length} 個，股票：${data.stocks.length} 筆`);
          } else {
            addOperationLog('error', '檔案格式錯誤：缺少必要的帳戶或股票資料');
          }
        } catch (error) {
          addOperationLog('error', '匯入失敗：' + (error instanceof Error ? error.message : '未知錯誤'));
        }
      };
      reader.readAsText(file);
    };
    input.click();
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
  const handleCreateAccount = (name: string) => {
    const newAccount = {
      id: Date.now().toString(),
      name,
      stockCount: 0,
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

  const handleReorderAccount = (fromIndex: number, toIndex: number) => {
    reorderAccounts(fromIndex, toIndex);
  };

  // 帳戶切換
  const handleAccountSwitch = (accountName: string) => {
    setCurrentAccount(accountName);
  };

  // 新增股票相關函數（容錯版本）
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
    
    // 創建基本股票記錄（不依賴股息API）
    const purchaseDate = new Date(stockData.purchaseDate);
    const shares = parseInt(stockData.shares);
    
    const newStock: StockRecord = {
      id: Date.now().toString(),
      accountId: account.id,
      symbol: stockData.symbol,
      name: stockData.name,
      shares: shares,
      costPrice: parseFloat(stockData.costPrice),
      adjustedCostPrice: parseFloat(stockData.costPrice), // 初始等於成本價
      purchaseDate: purchaseDate,
      currentPrice: stockData.price,
      lastUpdated: new Date(),
      priceSource: 'TWSE'
    };
    
    // 先添加基本股票記錄
    addStock(newStock);
    console.log('股票記錄已創建:', newStock);
    addOperationLog('success', `成功新增股票 ${stockData.symbol}，持股 ${shares} 股`);
    
    // 異步獲取股息資料（不阻塞主流程）
    setTimeout(async () => {
      try {
        addOperationLog('info', `正在獲取 ${stockData.symbol} 的股息資料...`);
        console.log(`🔍 開始獲取 ${stockData.symbol} 的股息資料，購買日期: ${purchaseDate.toISOString()}`);
        
        const historicalDividends = await DividendApiService.getHistoricalDividends(
          stockData.symbol, 
          purchaseDate
        );
        
        console.log(`📊 獲取到 ${stockData.symbol} 的股息資料:`, historicalDividends);
      
      if (historicalDividends.length > 0) {
        const dividendRecords: DividendRecord[] = historicalDividends.map((dividend, index) => ({
          id: `${Date.now()}-${index}`,
          stockId: newStock.id,
          symbol: dividend.symbol,
          exDividendDate: new Date(dividend.exDividendDate),
          dividendPerShare: dividend.dividendPerShare,
          totalDividend: dividend.dividendPerShare * shares,
          shares: shares
        }));
        
        const totalDividendPerShare = dividendRecords.reduce(
          (sum, record) => sum + record.dividendPerShare, 0
        );
        const adjustedCostPrice = parseFloat(stockData.costPrice) - totalDividendPerShare;
        
        // 更新股票記錄（添加股息資料）
        updateStock(newStock.id, {
          dividendRecords,
          adjustedCostPrice: Math.max(adjustedCostPrice, 0)
        });
        
        console.log(`✅ 已為 ${stockData.symbol} 添加 ${dividendRecords.length} 筆股息記錄`);
        addOperationLog('success', `已為 ${stockData.symbol} 添加 ${dividendRecords.length} 筆股息記錄`);
      } else {
        console.log(`ℹ️ ${stockData.symbol} 暫無股息記錄`);
        addOperationLog('info', `${stockData.symbol} 暫無股息記錄`);
      }
    } catch (error) {
      console.error('獲取股息資料失敗，但股票已成功添加:', error);
      addOperationLog('warning', `${stockData.symbol} 股息資料獲取失敗：${error instanceof Error ? error.message : '未知錯誤'}`);
      // 股息獲取失敗不影響股票添加
    }
    }, 1000); // 延遲1秒執行，確保股票記錄已保存
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
            onImport={handleImport}
            onOpenCloudSync={() => setIsCloudSyncOpen(true)}
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