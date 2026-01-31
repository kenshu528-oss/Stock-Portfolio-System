// 在瀏覽器控制台中執行此腳本來開啟詳細日誌

// 1. 開啟 stock 模組的詳細日誌
window.setLogLevel('stock', 4); // TRACE 等級

// 2. 開啟 global 模組的詳細日誌  
window.setLogLevel('global', 3); // DEBUG 等級

// 3. 檢查當前日誌等級
console.log('📊 當前日誌等級設定:');
console.log('stock 模組:', window.getLogLevel ? window.getLogLevel('stock') : '未知');
console.log('global 模組:', window.getLogLevel ? window.getLogLevel('global') : '未知');

// 4. 手動觸發股票清單檢查
if (window.debugAppStore && window.debugAppStore.triggerStockListCheck) {
    console.log('🔍 手動觸發股票清單檢查...');
    window.debugAppStore.triggerStockListCheck();
} else {
    console.log('⚠️ debugAppStore 不可用，請在主應用頁面執行');
}

console.log('✅ 調試日誌已開啟，請查看後續的詳細日誌輸出');