// 在瀏覽器控制台中執行此腳本來調試具體錯誤

console.log('🔍 開始調試 Stock List 更新問題...');

// 1. 開啟詳細日誌
if (window.setLogLevel) {
    window.setLogLevel('stock', 4); // TRACE 等級
    console.log('✅ 已開啟 stock 模組的詳細日誌');
} else {
    console.log('⚠️ setLogLevel 函數不可用');
}

// 2. 手動測試每個步驟
async function debugSteps() {
    console.log('📊 開始逐步調試...');
    
    // 步驟 1: 檢查環境
    const isDevelopment = window.location.hostname === 'localhost';
    console.log(`🌍 環境: ${isDevelopment ? '開發環境' : '生產環境'}`);
    
    // 步驟 2: 檢查後端 API
    try {
        console.log('🔍 檢查後端 API...');
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
            
            if (isToday !== 'true') {
                // 步驟 3: 測試更新 API
                console.log('🚀 測試更新 API...');
                try {
                    const updateResponse = await fetch('http://localhost:3001/api/update-stock-list', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ trigger: 'debug-console', timestamp: new Date().toISOString() })
                    });
                    
                    if (updateResponse.ok) {
                        const result = await updateResponse.json();
                        console.log('✅ 更新成功:', result);
                    } else {
                        const errorText = await updateResponse.text();
                        console.error('❌ 更新失敗:', updateResponse.status, errorText);
                    }
                } catch (updateError) {
                    console.error('❌ 更新 API 調用失敗:', updateError);
                }
            }
        } else {
            console.error(`❌ 後端 API 錯誤: ${response.status}`);
        }
    } catch (apiError) {
        console.error('❌ 後端 API 調用失敗:', apiError);
    }
    
    // 步驟 4: 檢查 stockListService
    try {
        console.log('🔍 檢查 stockListService...');
        if (window.stockListService) {
            console.log('✅ stockListService 可用');
            
            const envInfo = window.stockListService.getEnvironmentInfo();
            console.log('🌍 環境資訊:', envInfo);
            
            try {
                console.log('📊 嘗試載入股票清單...');
                const stockListData = await window.stockListService.loadStockList();
                if (stockListData) {
                    console.log('✅ 股票清單載入成功:', {
                        date: stockListData.date,
                        count: stockListData.count
                    });
                } else {
                    console.log('⚠️ 股票清單載入失敗');
                }
            } catch (loadError) {
                console.error('❌ 股票清單載入錯誤:', loadError);
            }
        } else {
            console.log('⚠️ stockListService 不可用');
        }
    } catch (serviceError) {
        console.error('❌ stockListService 檢查失敗:', serviceError);
    }
}

// 3. 手動觸發 stockListUpdateService
async function debugUpdateService() {
    try {
        console.log('🔍 檢查 stockListUpdateService...');
        
        if (window.stockListUpdateService) {
            console.log('✅ stockListUpdateService 可用');
            
            // 檢查狀態
            const status = window.stockListUpdateService.getUpdateStatus();
            console.log('📊 當前狀態:', status);
            
            // 手動調用檢查
            console.log('🔍 手動調用 checkStockListFreshness...');
            try {
                const needsUpdate = await window.stockListUpdateService.checkStockListFreshness();
                console.log(`📊 檢查結果: needsUpdate = ${needsUpdate}`);
                
                if (needsUpdate) {
                    console.log('🚀 手動調用 triggerStockListUpdate...');
                    try {
                        const success = await window.stockListUpdateService.triggerStockListUpdate();
                        console.log(`📊 更新結果: success = ${success}`);
                    } catch (triggerError) {
                        console.error('❌ triggerStockListUpdate 錯誤:', triggerError);
                    }
                }
            } catch (checkError) {
                console.error('❌ checkStockListFreshness 錯誤:', checkError);
            }
        } else {
            console.log('⚠️ stockListUpdateService 不可用');
        }
    } catch (error) {
        console.error('❌ stockListUpdateService 調試失敗:', error);
    }
}

// 執行調試
console.log('⏳ 開始執行調試步驟...');
debugSteps().then(() => {
    console.log('📊 基本調試完成，開始調試更新服務...');
    return debugUpdateService();
}).then(() => {
    console.log('✅ 調試完成');
}).catch(error => {
    console.error('❌ 調試過程中發生錯誤:', error);
});

// 導出調試函數
window.debugStock = {
    debugSteps,
    debugUpdateService
};

console.log('✅ 調試工具已載入，可使用 window.debugStock 手動調用');