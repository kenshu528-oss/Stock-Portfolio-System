import React from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import AccountManager from './components/AccountManager';
import AddStockForm from './components/AddStockForm';
import QuickAddStock from './components/QuickAddStock';
import StockList from './components/StockList';
import PortfolioStats from './components/PortfolioStats';
import RealizedGainLossPanel from './components/RealizedGainLossPanel';
import ErrorBoundary from './components/ErrorBoundary';
import { ServerStatusPanel } from './components/ServerStatusPanel';
import { stockListUpdateService } from './services/stockListUpdateService';
import { CloudSyncSettings } from './components/CloudSyncSettings';
import { InitialSetup } from './components/InitialSetup';
import { addOperationLog } from './components/OperationLog';
import { useAppStore } from './stores/appStore';
import { useEnhancedStock } from './hooks/useEnhancedStock';
import { getCloudSyncAvailability } from './utils/environment';
import { autoUpdateDividends, shouldUpdateDividends } from './services/dividendAutoService';
import { RightsEventService } from './services/rightsEventService';
import { logger } from './utils/logger';
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
    togglePrivacyMode,
    
    // 雲端同步設定
    cloudSync,
    
    // 🔧 添加強制重新渲染的狀態
    lastPriceUpdate,
    forceRender
  } = useAppStore();

  // 增強版股票操作（疊加功能）
  const { addStockWithEnhancements } = useEnhancedStock();

  // 雲端同步狀態
  const [isCloudSyncOpen, setIsCloudSyncOpen] = React.useState(false);
  
  // 初始設定狀態
  const [showInitialSetup, setShowInitialSetup] = React.useState(false);
  const [hasCheckedToken, setHasCheckedToken] = React.useState(false);

  // 處理雲端同步資料 - 重新定義確保更新
  const handleCloudDataSync = React.useCallback((cloudData: any) => {
    console.log('=== handleCloudDataSync 開始執行 ===');
    console.log('接收到的雲端資料:', cloudData);
    
    try {
      if (cloudData.accounts && Array.isArray(cloudData.accounts)) {
        console.log('開始處理帳戶資料:', cloudData.accounts.length, '個帳戶');
        console.log('開始處理股票資料:', cloudData.stocks?.length || 0, '筆股票');
        console.log('開始處理賣出記錄:', cloudData.sellTransactions?.length || 0, '筆');
        
        // 直接使用 importData 方法，這個方法已經正確實現了資料導入邏輯
        const { importData, setCurrentAccount, togglePrivacyMode, isPrivacyMode } = useAppStore.getState();
        importData(cloudData.accounts, cloudData.stocks || [], 'replace');
        
        // 還原賣出交易記錄
        if (cloudData.sellTransactions && Array.isArray(cloudData.sellTransactions)) {
          const state = useAppStore.getState();
          // 直接設定 sellTransactions（date 字串轉 Date 物件）
          const restoredTxs = cloudData.sellTransactions.map((tx: any) => ({
            ...tx,
            sellDate: typeof tx.sellDate === 'string' ? new Date(tx.sellDate) : tx.sellDate,
          }));
          useAppStore.setState({ sellTransactions: restoredTxs });
          console.log('已還原賣出記錄:', restoredTxs.length, '筆');
        }
        
        // 自動切換到第一個帳戶
        if (cloudData.accounts.length > 0) {
          const firstAccountName = cloudData.accounts[0].name;
          setCurrentAccount(firstAccountName);
          console.log('自動切換到第一個帳戶:', firstAccountName);
        }
        
        // 雲端下載後自動啟用隱私模式（根據雲端同步開發規範）
        if (!isPrivacyMode) {
          togglePrivacyMode();
          console.log('自動啟用隱私模式保護用戶資料');
          addOperationLog('info', '已自動啟用隱私模式保護資料');
        }
        
        addOperationLog('success', `已同步雲端資料：${cloudData.accounts.length} 個帳戶，${cloudData.stocks?.length || 0} 筆股票，${cloudData.sellTransactions?.length || 0} 筆賣出記錄`);
        console.log('=== 雲端資料同步完成 ===');
        
        // 強制觸發 React 重新渲染
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        console.warn('雲端資料格式不正確，缺少 accounts 陣列');
        addOperationLog('warning', '雲端資料格式不正確');
      }
    } catch (error) {
      addOperationLog('error', '雲端資料同步失敗');
      logger.error('cloud', '雲端資料同步錯誤', error);
    }
  }, []);

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
        version: "1.0.2.0040",  // 修復股價更新功能：移除股息API調用，解決404錯誤和更新失敗問題
        exportDate: new Date().toISOString(),
        accounts: exportAccounts,
        stocks,
        metadata: {
          totalAccounts: exportAccounts.length,
          totalStocks: stocks.length,
          exportOptions: { format: 'json' },
          dataVersion: "1.0.2.0040",  // 資料結構版本
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
        logger.error('import', '匯入過程中發生錯誤', error);
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
      '• 隱私模式設定\n' +
      '• GitHub Token 和雲端同步設定\n' +
      '• 所有應用程式設定\n\n' +
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
      
      // 根據規格文件恢復預設狀態：創建兩個預設帳戶
      const defaultAccount1 = {
        id: '1',
        name: '帳戶1',
        stockCount: 0,
        brokerageFee: 0.1425,
        transactionTax: 0.3,
        createdAt: new Date()
      };
      const defaultAccount2 = {
        id: '2',
        name: '帳戶2',
        stockCount: 0,
        brokerageFee: 0.1425,
        transactionTax: 0.3,
        createdAt: new Date()
      };
      
      store.addAccount(defaultAccount1);
      store.addAccount(defaultAccount2);
      store.setCurrentAccount('帳戶1');
      
      // 確保隱私模式啟用（根據規格：預設啟用，保護敏感資料）
      if (!store.isPrivacyMode) {
        store.togglePrivacyMode();
        console.log('RESET 後自動啟用隱私模式（符合規格要求）');
      }
      
      // 確保成本價顯示模式為預設值（顯示原始成本價）
      if (store.showAdjustedCost) {
        store.toggleCostDisplayMode();
        console.log('RESET 後恢復預設成本價顯示模式（原始成本價）');
      }
      
      // 重置 UI 狀態到預設值
      store.setSidebarOpen(false);
      store.setAccountManagerOpen(false);
      store.setAddStockFormOpen(false);
      
      // 重置股價更新狀態
      // 注意：isUpdatingPrices, lastPriceUpdate, priceUpdateProgress 通常由系統管理，不需要手動重置
      
      // 清除所有本地存儲資料
      localStorage.removeItem('portfolioData');
      localStorage.removeItem('appStore');
      
      // 清除雲端同步相關設定（CloudSyncSettings 組件使用的 localStorage）
      localStorage.removeItem('githubToken');
      localStorage.removeItem('autoSyncEnabled');
      localStorage.removeItem('syncInterval');
      localStorage.removeItem('lastSyncTime');
      localStorage.removeItem('gistId');
      localStorage.removeItem('cloudSyncConfig');
      
      // 清除其他可能的設定
      localStorage.removeItem('operationLogs');
      localStorage.removeItem('userPreferences');
      localStorage.removeItem('hasSkippedInitialSetup');
      
      // 重置初始設定檢查狀態，讓 RESET 後能重新顯示初始設定
      setHasCheckedToken(false);
      
      addOperationLog('success', '已恢復預設值，所有資料和設定已清除');
      addOperationLog('info', '重新整理頁面後將顯示初始設定對話框');
      console.log('恢復預設值完成');
      
      // RESET 後立即檢查是否需要顯示初始設定
      setTimeout(() => {
        checkInitialSetup();
      }, 100);
      
    } catch (error) {
      logger.error('global', '恢復預設值失敗', error);
      addOperationLog('error', '恢復預設值失敗：' + (error instanceof Error ? error.message : '未知錯誤'));
    }
  };

  // 記錄應用程式啟動並更新帳戶股票數量
  React.useEffect(() => {
    addOperationLog('info', '股票投資組合系統已啟動');
    updateAccountStockCounts(); // 確保stockCount正確
    
    // 檢查是否需要顯示初始設定
    checkInitialSetup();
    
    // 🔧 初始化股票清單更新服務並檢查
    initializeStockListService();
    
    // 🚫 禁用股息自動載入，避免不必要的 404 錯誤和 Console 輸出
    // 用戶可以通過「更新除權息資料」按鈕手動更新
    // setTimeout(() => {
    //   loadDividendsForExistingStocks();
    // }, 3000);
  }, []);

  // 🔧 初始化股票清單更新服務
  const initializeStockListService = React.useCallback(async () => {
    try {
      // 防止重複初始化
      if (stockListUpdateService.getUpdateStatus().isUpdating) {
        logger.debug('stock', '股票清單服務已在初始化中，跳過重複執行');
        return;
      }

      // 檢查是否已經初始化過（避免 React 嚴格模式重複執行）
      const hasInitialized = localStorage.getItem('stock-service-initialized');
      const now = Date.now();
      
      if (hasInitialized) {
        const lastInit = parseInt(hasInitialized);
        if (now - lastInit < 5000) { // 5秒內不重複初始化
          logger.debug('stock', '股票清單服務最近已初始化，跳過重複執行');
          return;
        }
      }

      // 標記初始化時間
      localStorage.setItem('stock-service-initialized', now.toString());

      // 初始化服務
      stockListUpdateService.init();
      
      // 🔧 開發環境下暴露服務到 window
      if (process.env.NODE_ENV === 'development') {
        (window as any).stockListUpdateService = stockListUpdateService;
        console.log('🔧 開發工具已載入：window.stockListUpdateService');
        console.log('   可用方法：');
        console.log('   - checkStockListFreshness()');
        console.log('   - triggerStockListUpdate()');
        console.log('   - getUpdateStatus()');
        console.log('   - checkAndUpdate()');
      }
      
      // 延遲檢查，避免與其他初始化衝突
      setTimeout(async () => {
        try {
          await stockListUpdateService.checkAndUpdate();
          addOperationLog('info', '股票清單檢查完成');
        } catch (error) {
          logger.warn('stock', '股票清單檢查失敗', error);
          addOperationLog('warn', '股票清單檢查失敗，請手動更新');
        }
      }, 1000);
      
    } catch (error) {
      logger.error('stock', '初始化股票清單服務失敗', error);
      addOperationLog('warn', '股票清單檢查失敗，請手動更新');
    }
  }, [addOperationLog]);

  // 檢查初始設定
  const checkInitialSetup = () => {
    console.log('檢查初始設定...', { hasCheckedToken });
    
    const cloudSyncAvailability = getCloudSyncAvailability();
    const savedToken = cloudSync.githubToken; // 從 Zustand store 獲取
    const hasSkippedSetup = localStorage.getItem('hasSkippedInitialSetup') === 'true';
    
    console.log('初始設定檢查狀態:', {
      available: cloudSyncAvailability.available,
      savedToken: !!savedToken,
      hasSkippedSetup,
      hasCheckedToken
    });
    
    // 如果環境支援雲端同步且沒有 Token 且沒有跳過設定，則顯示初始設定
    if (cloudSyncAvailability.available && !savedToken && !hasSkippedSetup) {
      console.log('顯示初始設定對話框');
      setShowInitialSetup(true);
    }
    
    setHasCheckedToken(true);
  };

  // 處理初始設定完成
  const handleInitialSetupComplete = (token?: string) => {
    setShowInitialSetup(false);
    if (token) {
      addOperationLog('success', 'GitHub Token 設定完成，雲端同步功能已啟用');
    } else {
      // 記錄用戶選擇稍後設定
      localStorage.setItem('hasSkippedInitialSetup', 'true');
      addOperationLog('info', '已跳過初始設定，可稍後在雲端同步中配置');
    }
  };

  // 處理雲端資料同步
  const handleDataSync = (data: any) => {
    console.log('=== handleDataSync 開始執行 ===');
    console.log('接收到的資料:', data);
    
    try {
      if (data.accounts && Array.isArray(data.accounts)) {
        console.log('開始處理帳戶資料:', data.accounts.length, '個帳戶');
        console.log('開始處理股票資料:', data.stocks?.length || 0, '筆股票');
        console.log('開始處理賣出記錄:', data.sellTransactions?.length || 0, '筆');
        
        // 直接使用 importData 方法，這個方法已經正確實現了資料導入邏輯
        const { importData, setCurrentAccount, togglePrivacyMode, isPrivacyMode } = useAppStore.getState();
        importData(data.accounts, data.stocks || [], 'replace');
        
        // 還原賣出交易記錄
        if (data.sellTransactions && Array.isArray(data.sellTransactions)) {
          const restoredTxs = data.sellTransactions.map((tx: any) => ({
            ...tx,
            sellDate: typeof tx.sellDate === 'string' ? new Date(tx.sellDate) : tx.sellDate,
          }));
          useAppStore.setState({ sellTransactions: restoredTxs });
          console.log('已還原賣出記錄:', restoredTxs.length, '筆');
        }
        
        // 自動切換到第一個帳戶
        if (data.accounts.length > 0) {
          const firstAccountName = data.accounts[0].name;
          setCurrentAccount(firstAccountName);
          console.log('自動切換到第一個帳戶:', firstAccountName);
        }
        
        // 雲端下載後自動啟用隱私模式（根據雲端同步開發規範）
        if (!isPrivacyMode) {
          togglePrivacyMode();
          console.log('自動啟用隱私模式保護用戶資料');
          addOperationLog('info', '已自動啟用隱私模式保護資料');
        }
        
        addOperationLog('success', `已同步雲端資料：${data.accounts.length} 個帳戶，${data.stocks?.length || 0} 筆股票，${data.sellTransactions?.length || 0} 筆賣出記錄`);
        console.log('=== 資料同步完成 ===');
        
        // 強制觸發 React 重新渲染
        window.location.reload();
      } else {
        console.warn('資料格式不正確，缺少 accounts 陣列');
        addOperationLog('warning', '雲端資料格式不正確');
      }
    } catch (error) {
      addOperationLog('error', '雲端資料同步失敗');
      logger.error('cloud', '資料同步錯誤', error);
    }
  };

  const handleMenuToggle = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  const handleSidebarClose = () => {
    setSidebarOpen(false);
  };

  // 手動刷新股息資料功能
  const handleRefreshDividends = async () => {
    try {
      addOperationLog('info', '開始手動刷新股息資料...');
      
      const stocksNeedingDividends = stocks.filter(stock => 
        shouldUpdateDividends(stock) || 
        !stock.dividendRecords || 
        stock.dividendRecords.length === 0
      );
      
      if (stocksNeedingDividends.length === 0) {
        addOperationLog('info', '所有股票的股息資料都是最新的');
        return;
      }
      
      addOperationLog('info', `正在為 ${stocksNeedingDividends.length} 支股票刷新股息資料...`);
      
      let successCount = 0;
      let errorCount = 0;
      
      // 逐一處理，避免API請求過於頻繁
      for (const stock of stocksNeedingDividends) {
        try {
          const updatedStock = await autoUpdateDividends(stock);
          if (updatedStock.dividendRecords && updatedStock.dividendRecords.length > 0) {
            updateStock(stock.id, {
              dividendRecords: updatedStock.dividendRecords,
              adjustedCostPrice: updatedStock.adjustedCostPrice,
              lastDividendUpdate: updatedStock.lastDividendUpdate
            });
            console.log(`✅ ${stock.symbol}: 刷新 ${updatedStock.dividendRecords.length} 筆股息記錄`);
            successCount++;
          } else {
            console.log(`ℹ️ ${stock.symbol}: 無股息資料`);
          }
          
          // 避免API請求過於頻繁
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
          console.warn(`❌ ${stock.symbol} 股息刷新失敗:`, error);
          errorCount++;
        }
      }
      
      if (successCount > 0) {
        addOperationLog('success', `股息資料刷新完成：成功 ${successCount} 支，無資料 ${errorCount} 支`);
      } else {
        addOperationLog('info', '所有股票都無股息資料，建議使用手動股息管理功能');
        addOperationLog('info', '💡 使用方法：點擊股票右側操作選單 → 選擇「股息記錄」→ 手動添加股息');
      }
      
    } catch (error) {
      logger.error('dividend', '手動刷新股息資料失敗', error);
      addOperationLog('error', '股息資料刷新失敗：' + (error instanceof Error ? error.message : '未知錯誤'));
    }
  };

  // 批次處理除權息事件
  const handleBatchProcessRights = async () => {
    try {
      console.log('🚀 handleBatchProcessRights 開始執行');
      console.log('📋 當前帳戶ID:', currentAccount);
      console.log('📋 所有股票:', stocks.map(s => ({ symbol: s.symbol, accountId: s.accountId })));
      addOperationLog('info', '開始批次處理除權息事件...');
      
      // 過濾當前帳戶的股票
      // currentAccount 是帳戶名稱，需要轉換為帳戶ID
      const currentAccountObj = accounts.find(acc => acc.name === currentAccount);
      const currentAccountId = currentAccountObj?.id || '';
      
      console.log(`📋 當前帳戶名稱: ${currentAccount}`);
      console.log(`📋 當前帳戶ID: ${currentAccountId}`);
      
      const currentAccountStocks = stocks.filter(stock => stock.accountId === currentAccountId);
      console.log(`📊 當前帳戶股票數量: ${currentAccountStocks.length}`);
      console.log('📊 當前帳戶股票詳情:', currentAccountStocks.map(s => ({ symbol: s.symbol, accountId: s.accountId })));
      
      if (currentAccountStocks.length === 0) {
        addOperationLog('info', '當前帳戶沒有股票，無需處理除權息');
        console.warn('⚠️ 當前帳戶沒有股票，請檢查帳戶ID是否正確');
        return;
      }
      
      // 檢查哪些股票需要更新除權息資料
      // 對於批次更新，我們使用更寬鬆的條件
      const stocksNeedingUpdate = currentAccountStocks.filter(stock => 
        RightsEventService.shouldUpdateRightsData(stock, false) // 不強制，但使用1天限制
      );
      
      console.log(`🔍 需要更新除權息的股票:`, stocksNeedingUpdate.map(s => `${s.symbol}(${s.lastDividendUpdate ? '已更新過' : '未更新'})`));
      
      if (stocksNeedingUpdate.length === 0) {
        // 如果沒有股票需要更新，嘗試強制更新有配股的股票
        const stocksWithDividends = currentAccountStocks.filter(stock => 
          ['2886', '2890'].includes(stock.symbol) // 已知有配股的股票
        );
        
        if (stocksWithDividends.length > 0) {
          addOperationLog('info', `強制更新已知有配股的股票: ${stocksWithDividends.map(s => s.symbol).join(', ')}`);
          console.log('🔄 強制更新有配股的股票:', stocksWithDividends.map(s => s.symbol));
          
          // 強制處理這些股票
          for (const stock of stocksWithDividends) {
            try {
              console.log(`🔄 開始處理 ${stock.symbol}，當前持股: ${stock.shares}`);
              
              const updatedStock = await RightsEventService.processStockRightsEvents(
                stock,
                (message) => {
                  addOperationLog('info', message);
                  console.log(message);
                },
                false // 自動載入使用增量更新
              );
              
              // 確保更新股票資料
              if (updatedStock && (updatedStock.shares !== stock.shares || updatedStock.dividendRecords)) {
                console.log(`🔄 強制更新股票資料: ${stock.symbol}`);
                console.log(`📊 原始持股: ${stock.shares}, 新持股: ${updatedStock.shares}`);
                
                updateStock(stock.id, {
                  shares: updatedStock.shares,
                  adjustedCostPrice: updatedStock.adjustedCostPrice,
                  dividendRecords: updatedStock.dividendRecords,
                  lastDividendUpdate: updatedStock.lastDividendUpdate
                });
                
                // 強制重新渲染
                setTimeout(() => {
                  window.location.reload();
                }, 1000);
                
                console.log(`✅ ${stock.symbol} 配股處理完成: ${stock.shares} → ${updatedStock.shares} 股`);
                addOperationLog('success', `${stock.symbol} 配股處理完成: ${stock.shares} → ${updatedStock.shares} 股`);
              } else {
                console.log(`ℹ️ ${stock.symbol} 無需更新持股數量`);
              }
            } catch (error) {
              logger.warn('stock', `${stock.symbol} 處理失敗`, error);
              addOperationLog('error', `${stock.symbol} 處理失敗: ${error.message}`);
            }
          }
          
          addOperationLog('success', `強制配股處理完成: ${stocksWithDividends.length} 支股票`);
          return;
        }
        
        // 如果沒有已知配股股票，檢查有股息記錄的股票
        const stocksWithDividendRecords = currentAccountStocks.filter(stock => 
          stock.dividendRecords && stock.dividendRecords.length > 0
        );
        
        // 同時檢查有股息收入但可能沒有dividendRecords的股票
        const stocksWithDividendIncome = currentAccountStocks.filter(stock => {
          const totalDividend = stock.dividendRecords?.reduce((sum, dividend) => {
            return sum + dividend.totalDividend;
          }, 0) || 0;
          return totalDividend > 0;
        });
        
        const allStocksWithDividends = [...new Set([...stocksWithDividendRecords, ...stocksWithDividendIncome])];
        
        if (allStocksWithDividends.length > 0) {
          addOperationLog('info', `強制重新計算有股息的股票調整成本: ${allStocksWithDividends.map(s => s.symbol).join(', ')}`);
          console.log('🔄 強制重新計算調整成本:', allStocksWithDividends.map(s => s.symbol));
          
          // 為有股息的股票重新計算adjustedCostPrice
          for (const stock of allStocksWithDividends) {
            try {
              const totalCashDividend = stock.dividendRecords?.reduce((sum, dividend) => 
                sum + (dividend.cashDividendPerShare || dividend.dividendPerShare || dividend.totalDividend || 0), 0
              ) || 0;
              
              if (totalCashDividend > 0) {
                const adjustedCostPrice = Math.max(0.01, stock.costPrice - totalCashDividend);
                
                console.log(`🔄 重新計算 ${stock.symbol} 調整成本:`, {
                  原始成本: stock.costPrice,
                  總股息: totalCashDividend,
                  調整後成本: adjustedCostPrice,
                  股息記錄數: stock.dividendRecords?.length || 0
                });
                
                updateStock(stock.id, {
                  adjustedCostPrice: adjustedCostPrice
                });
                
                addOperationLog('success', `${stock.symbol} 調整成本重新計算: ${stock.costPrice} → ${adjustedCostPrice}`);
              } else {
                // 如果沒有現金股利記錄，嘗試通過API獲取
                console.log(`🔄 ${stock.symbol} 沒有現金股利記錄，嘗試通過API獲取`);
                try {
                  const updatedStock = await RightsEventService.processStockRightsEvents(
                    stock,
                    (message) => {
                      console.log(`${stock.symbol}: ${message}`);
                    },
                    false // 自動載入使用增量更新
                  );
                  
                  if (updatedStock.adjustedCostPrice && updatedStock.adjustedCostPrice !== stock.costPrice) {
                    updateStock(stock.id, {
                      adjustedCostPrice: updatedStock.adjustedCostPrice,
                      dividendRecords: updatedStock.dividendRecords,
                      lastDividendUpdate: updatedStock.lastDividendUpdate
                    });
                    
                    addOperationLog('success', `${stock.symbol} 通過API更新調整成本: ${stock.costPrice} → ${updatedStock.adjustedCostPrice}`);
                  }
                } catch (apiError) {
                  console.error(`❌ ${stock.symbol} API更新失敗:`, apiError);
                }
              }
            } catch (error) {
              console.error(`❌ ${stock.symbol} 調整成本計算失敗:`, error);
            }
          }
          
          addOperationLog('success', `調整成本重新計算完成: ${allStocksWithDividends.length} 支股票`);
          return;
        }
        
        addOperationLog('info', '所有股票的除權息資料都是最新的（1天內已更新）');
        console.log('💡 提示：如需強制更新，請使用個股的除權息管理功能');
        return;
      }
      
      addOperationLog('info', `正在為 ${stocksNeedingUpdate.length} 支股票處理除權息事件...`);
      
      // 使用批次處理服務
      const updatedStocks = await RightsEventService.processBatchRightsEvents(
        stocksNeedingUpdate,
        (current, total, message) => {
          console.log(`[${current}/${total}] ${message}`);
          if (message.includes('✅') || message.includes('❌')) {
            addOperationLog(message.includes('✅') ? 'success' : 'error', message);
          }
        },
        3, // 每批3支股票
        1500 // 批次間延遲1.5秒
      );
      
      // 更新股票資料
      let successCount = 0;
      let errorCount = 0;
      
      for (const updatedStock of updatedStocks) {
        try {
          const originalStock = stocksNeedingUpdate.find(s => s.id === updatedStock.id);
          if (originalStock && updatedStock.dividendRecords && updatedStock.dividendRecords.length > 0) {
            updateStock(updatedStock.id, {
              dividendRecords: updatedStock.dividendRecords,
              shares: updatedStock.shares,
              adjustedCostPrice: updatedStock.adjustedCostPrice,
              lastDividendUpdate: updatedStock.lastDividendUpdate
            });
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          console.error(`更新股票 ${updatedStock.symbol} 失敗:`, error);
          errorCount++;
        }
      }
      
      if (successCount > 0) {
        addOperationLog('success', `除權息處理完成：成功 ${successCount} 支，失敗 ${errorCount} 支`);
        addOperationLog('info', '💡 提示：除權息處理會自動調整持股數和成本價，請檢查結果是否正確');
      } else {
        addOperationLog('warning', '所有股票除權息處理都失敗，請檢查網路連線或稍後再試');
      }
      
    } catch (error) {
      console.error('批次處理除權息失敗:', error);
      addOperationLog('error', '批次處理除權息失敗：' + (error instanceof Error ? error.message : '未知錯誤'));
    }
  };

  // 為現有股票自動載入股息資料（已禁用，避免 404 錯誤）
  const loadDividendsForExistingStocks = async () => {
    // 🚫 已禁用自動載入股息功能，避免不必要的 404 錯誤和 Console 輸出
    // 用戶可以通過以下方式手動更新股息：
    // 1. 點擊右上角的「更新股價和除權息」按鈕
    // 2. 點擊個股的「更新除權息資料」按鈕
    // 3. 使用「手動股息管理」功能
    
    console.log('📝 自動載入股息功能已禁用，請使用手動更新功能');
    return;
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
    console.log(`🎯 handleUpdateStock 被調用: ID=${id}, updates=`, updates);
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
      {/* Header - 必須在 overflow 容器外才能 sticky */}
      <ErrorBoundary>
        <Header 
          onMenuToggle={handleMenuToggle} 
          isMenuOpen={isSidebarOpen}
          onPrivacyToggle={togglePrivacyMode}
          isPrivacyMode={isPrivacyMode}
          onOpenCloudSync={() => setIsCloudSyncOpen(true)}
          onBatchProcessRights={handleBatchProcessRights}
        />
      </ErrorBoundary>
      
      {/* Body 容器 - 移除 overflow-x-hidden，讓內部元素可以水平滾動 */}
      <div>
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
              onRefreshDividends={handleRefreshDividends}
            />
          </ErrorBoundary>
          
          {/* Main content area - optimized spacing */}
          <main className="flex-1 p-2 max-w-full">
            {/* Content area - full width */}
            <div className="w-full max-w-full">
            {/* Account tabs */}
            <ErrorBoundary>
              <div className="mb-3">
                <nav className="flex space-x-2 md:space-x-8 border-b border-slate-700 overflow-x-auto">
                  {accounts.map((account) => (
                    <button
                      key={account.id}
                      onClick={() => handleAccountSwitch(account.name)}
                      className={`border-b-2 py-2 px-1 text-xs md:text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                        currentAccount === account.name
                          ? 'border-blue-500 text-blue-400'
                          : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      {account.name}
                    </button>
                  ))}
                  <button 
                    className="border-b-2 border-transparent py-2 px-1 text-xs md:text-sm font-medium text-slate-400 hover:text-slate-300 hover:border-slate-600 flex-shrink-0"
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

            {/* Portfolio stats - 手機模式摺疊顯示 */}
            <ErrorBoundary>
              <PortfolioStats
                stocks={stocks}
                currentAccountId={accounts.find(acc => acc.name === currentAccount)?.id || ''}
                isPrivacyMode={isPrivacyMode}
                className="mb-3"
              />
            </ErrorBoundary>

            {/* 已實現損益面板 */}
            <ErrorBoundary>
              <RealizedGainLossPanel />
            </ErrorBoundary>
            
            {/* Quick Add Stock - 手機模式摺疊顯示 */}
            <ErrorBoundary>
              <QuickAddStock
                currentAccount={currentAccount}
                onSubmit={handleAddStock}
                className="mb-3"
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

      {/* 初始設定對話框 */}
      <ErrorBoundary>
        <InitialSetup
          isOpen={showInitialSetup}
          onClose={() => handleInitialSetupComplete()}
          onTokenSaved={(token) => handleInitialSetupComplete(token)}
          onDataSync={handleDataSync}
        />
      </ErrorBoundary>

      {/* 服務器狀態監控面板 */}
      <ErrorBoundary>
        <ServerStatusPanel />
      </ErrorBoundary>
      </div>
    </div>
  );
}

export default App;