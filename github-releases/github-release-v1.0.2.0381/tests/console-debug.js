// 在瀏覽器控制台中執行此腳本來調試 Stock List 更新問題

console.log('🔍 開始調試 Stock List 更新問題...');

// 1. 開啟詳細日誌
if (window.setLogLevel) {
    window.setLogLevel('stock', 4); // TRACE
    console.log('✅ 已開啟 stock 模組的詳細日誌');
} else {
    console.log('⚠️ setLogLevel 函數不可用');
}

// 2. 檢查環境
const isDevelopment = window.location.hostname === 'localhost';
console.log(`🌍 環境檢查: ${isDevelopment ? '開發環境' : '生產環境'}`);

// 3. 手動測試後端 API
async function testBackendAPI() {
    try {
        console.log('🔍 測試後端 API...');
        const response = await fetch('http://localhost:3001/api/stock-list', { method: 'HEAD' });
        
        if (response.ok) {
            const date = response.headers.get('X-Stock-List-Date');
            const isToday = response.headers.get('X-Stock-List-Is-Today');
            const today = new Date().toISOString().split('T')[0];
            
            console.log('✅ 後端 API 正常');
            console.log(`📅 股票清單日期: ${date}`);
            console.log(`📅 今日日期: ${today}`);
            console.log(`🔍 是否為今日: ${isToday}`);
            console.log(`⚠️ 需要更新: ${isToday !== 'true'}`);
            
            return { needsUpdate: isToday !== 'true', date };
        } else {
            console.error(`❌ 後端 API 錯誤: ${response.status}`);
            return { needsUpdate: false };
        }
    } catch (error) {
        console.error(`❌ 後端 API 測試失敗:`, error);
        return { needsUpdate: false };
    }
}

// 4. 手動測試更新 API
async function testUpdateAPI() {
    try {
        console.log('🚀 測試更新 API...');
        const response = await fetch('http://localhost:3001/api/update-stock-list', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ trigger: 'console-debug', timestamp: new Date().toISOString() })
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ 更新成功:', result);
            return true;
        } else {
            const errorText = await response.text();
            console.error(`❌ 更新失敗: ${response.status}`, errorText);
            return false;
        }
    } catch (error) {
        console.error(`❌ 更新 API 測試失敗:`, error);
        return false;
    }
}

// 5. 手動觸發 stockListUpdateService
async function testStockListService() {
    try {
        console.log('🔍 測試 stockListUpdateService...');
        
        // 檢查服務是否可用
        if (window.stockListUpdateService) {
            console.log('✅ stockListUpdateService 可用');
            
            // 手動調用檢查
            const needsUpdate = await window.stockListUpdateService.checkStockListFreshness();
            console.log(`📊 檢查結果: needsUpdate = ${needsUpdate}`);
            
            if (needsUpdate) {
                console.log('🚀 開始更新...');
                const success = await window.stockListUpdateService.triggerStockListUpdate();
                console.log(`📊 更新結果: success = ${success}`);
            }
            
            // 檢查狀態
            const status = window.stockListUpdateService.getUpdateStatus();
            console.log('📊 更新狀態:', status);
            
        } else {
            console.log('⚠️ stockListUpdateService 不可用');
        }
    } catch (error) {
        console.error('❌ stockListUpdateService 測試失敗:', error);
    }
}

// 6. 執行完整測試
async function runFullTest() {
    console.log('🚀 開始完整測試...');
    
    const backendResult = await testBackendAPI();
    
    if (backendResult.needsUpdate) {
        console.log('⚠️ 需要更新，測試更新 API...');
        await testUpdateAPI();
        
        // 等待 2 秒後重新檢查
        setTimeout(async () => {
            console.log('🔄 重新檢查...');
            await testBackendAPI();
        }, 2000);
    }
    
    // 測試前端服務
    await testStockListService();
}

// 自動執行測試
console.log('⏳ 3 秒後開始自動測試...');
setTimeout(runFullTest, 3000);

// 導出函數供手動調用
window.debugStockList = {
    testBackendAPI,
    testUpdateAPI,
    testStockListService,
    runFullTest
};

console.log('✅ 調試工具已載入，可使用 window.debugStockList 手動調用測試函數');