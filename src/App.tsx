import Header from './components/Header';
import Sidebar from './components/Sidebar';
import AccountManager from './components/AccountManager';
import AddStockForm from './components/AddStockForm';
import StockList from './components/StockList';
import PortfolioStats from './components/PortfolioStats';
import { useAppStore } from './stores/appStore';
import { VERSION } from './constants/version';
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
    
    // 股票狀態
    stocks,
    addStock,
    updateStock,
    deleteStock,
    
    // 隱私模式
    isPrivacyMode,
    togglePrivacyMode
  } = useAppStore();

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
  };

  const handleDeleteAccount = (id: string) => {
    deleteAccount(id);
  };

  const handleRenameAccount = (id: string, newName: string) => {
    updateAccount(id, { name: newName });
  };

  const handleReorderAccount = (fromIndex: number, toIndex: number) => {
    reorderAccounts(fromIndex, toIndex);
  };

  // 帳戶切換
  const handleAccountSwitch = (accountName: string) => {
    setCurrentAccount(accountName);
  };

  // 新增股票相關函數
  const handleAddStock = (stockData: StockFormData) => {
    console.log('新增股票:', stockData);
    
    // 找到對應的帳戶ID
    const account = accounts.find(acc => acc.name === stockData.account);
    if (!account) {
      console.error('找不到對應的帳戶');
      return;
    }
    
    // 創建新的股票記錄
    const newStock: StockRecord = {
      id: Date.now().toString(),
      accountId: account.id,
      symbol: stockData.symbol,
      name: stockData.name,
      shares: parseInt(stockData.shares),
      costPrice: parseFloat(stockData.costPrice),
      adjustedCostPrice: parseFloat(stockData.costPrice), // 初始時等於成本價
      purchaseDate: new Date(stockData.purchaseDate),
      currentPrice: stockData.price,
      lastUpdated: new Date(),
      priceSource: 'TWSE' // 預設使用台灣證交所
    };
    
    // 加入股票記錄
    addStock(newStock);
    
    console.log('新股票記錄已創建:', newStock);
  };

  // 更新股票
  const handleUpdateStock = (id: string, updates: Partial<StockRecord>) => {
    updateStock(id, updates);
  };

  // 刪除股票
  const handleDeleteStock = (id: string) => {
    deleteStock(id);
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <Header 
        onMenuToggle={handleMenuToggle} 
        isMenuOpen={isSidebarOpen}
        onPrivacyToggle={togglePrivacyMode}
        isPrivacyMode={isPrivacyMode}
      />
      
      <div className="flex">
        {/* Sidebar */}
        <Sidebar 
          isOpen={isSidebarOpen} 
          onClose={handleSidebarClose}
          onOpenAccountManager={() => setAccountManagerOpen(true)}
          onOpenAddStock={() => setAddStockFormOpen(true)}
        />
        
        {/* Main content area - always full width */}
        <main className="flex-1 p-4">
          {/* Content area - 80% of screen space for stock list and portfolio info */}
          <div className="max-w-7xl mx-auto">
            {/* Account tabs */}
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

            {/* Portfolio stats */}
            <PortfolioStats
              stocks={stocks}
              currentAccountId={accounts.find(acc => acc.name === currentAccount)?.id || ''}
              isPrivacyMode={isPrivacyMode}
              className="mb-6"
            />
            
            {/* Stock list */}
            <StockList
              stocks={stocks}
              currentAccountId={accounts.find(acc => acc.name === currentAccount)?.id || ''}
              onUpdateStock={handleUpdateStock}
              onDeleteStock={handleDeleteStock}
              emptyMessage="尚無股票記錄"
            />
            
            {/* Version info at bottom */}
            <div className="mt-8 text-center">
              <p className="text-sm text-slate-500">
                Stock Portfolio System {VERSION.DISPLAY}
              </p>
            </div>
          </div>
        </main>
      </div>

      {/* Modals */}
      <AccountManager
        isOpen={isAccountManagerOpen}
        onClose={() => setAccountManagerOpen(false)}
        accounts={accounts}
        onCreateAccount={handleCreateAccount}
        onDeleteAccount={handleDeleteAccount}
        onRenameAccount={handleRenameAccount}
        onReorderAccount={handleReorderAccount}
      />

      <AddStockForm
        isOpen={isAddStockFormOpen}
        onClose={() => setAddStockFormOpen(false)}
        onSubmit={handleAddStock}
        currentAccount={currentAccount}
      />
    </div>
  );
}

export default App;