// 在瀏覽器控制台中執行此腳本來開啟詳細調試

console.log('🔍 開啟 Stock List 更新調試...');

// 1. 開啟詳細日誌
if (window.setLogLevel) {
    window.setLogLevel('stock', 4); // TRACE 等級
    console.log('✅ 已開啟 stock 模組的 TRACE 等級日誌');
} else {
    console.log('⚠️ setLogLevel 函數不可用');
}

// 2. 手動觸發更新檢查
if (window.stockListUpdateService) {
    console.log('🚀 手動觸發股票清單檢查...');
    
    window.stockListUpdateService.checkAndUpdate()
        .then(() => {
            console.log('✅ checkAndUpdate 完成');
            
            // 檢查狀態
            const status = window.stockListUpdateService.getUpdateStatus();
            console.log('📊 更新狀態:', status);
        })
        .catch(error => {
            console.error('❌ checkAndUpdate 失敗:', error);
        });
} else {
    console.log('⚠️ stockListUpdateService 不可用');
}

console.log('✅ 調試腳本執行完成，請查看詳細日誌輸出');