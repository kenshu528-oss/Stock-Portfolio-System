#!/usr/bin/env node

/**
 * 測試 CORS 代理服務的可用性
 * 檢查雲端環境下股價獲取的實際效果
 */

console.log('🔍 測試 CORS 代理服務可用性...\n');

const testSymbol = '2330'; // 台積電
const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${testSymbol}.TW`;

const proxyServices = [
  {
    name: 'AllOrigins',
    url: 'https://api.allorigins.win/get?url=',
    format: (url) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
  },
  {
    name: 'CORS Anywhere',
    url: 'https://cors-anywhere.herokuapp.com/',
    format: (url) => `https://cors-anywhere.herokuapp.com/${url}`
  },
  {
    name: 'CodeTabs',
    url: 'https://api.codetabs.com/v1/proxy?quest=',
    format: (url) => `https://api.codetabs.com/v1/proxy?quest=${url}`
  }
];

async function testProxy(proxy) {
  console.log(`📡 測試 ${proxy.name}...`);
  
  try {
    const proxyUrl = proxy.format(yahooUrl);
    console.log(`   URL: ${proxyUrl}`);
    
    const response = await fetch(proxyUrl, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    console.log(`   狀態: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      let data;
      if (proxy.name === 'AllOrigins') {
        const proxyData = await response.json();
        data = JSON.parse(proxyData.contents);
      } else {
        data = await response.json();
      }
      
      const result = data?.chart?.result?.[0];
      if (result?.meta) {
        const price = result.meta.regularMarketPrice || 0;
        console.log(`   ✅ 成功獲取股價: ${price}`);
        return { success: true, price };
      } else {
        console.log(`   ❌ 資料格式錯誤`);
        return { success: false, error: '資料格式錯誤' };
      }
    } else {
      console.log(`   ❌ HTTP 錯誤: ${response.status}`);
      return { success: false, error: `HTTP ${response.status}` };
    }
    
  } catch (error) {
    console.log(`   ❌ 請求失敗: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testFinMindDirect() {
  console.log(`📡 測試 FinMind 直接調用...`);
  
  try {
    const today = new Date();
    const startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const finmindUrl = `https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockPrice&data_id=${testSymbol}&start_date=${startDate.toISOString().split('T')[0]}&end_date=${today.toISOString().split('T')[0]}&token=`;
    
    console.log(`   URL: ${finmindUrl}`);
    
    const response = await fetch(finmindUrl, {
      timeout: 8000
    });
    
    console.log(`   狀態: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      if (data.data && data.data.length > 0) {
        const latestPrice = data.data[data.data.length - 1];
        const price = latestPrice.close || 0;
        console.log(`   ✅ 成功獲取股價: ${price} (${latestPrice.date})`);
        return { success: true, price };
      } else {
        console.log(`   ❌ 無資料`);
        return { success: false, error: '無資料' };
      }
    } else {
      console.log(`   ❌ HTTP 錯誤: ${response.status}`);
      return { success: false, error: `HTTP ${response.status}` };
    }
    
  } catch (error) {
    console.log(`   ❌ 請求失敗: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  const results = [];
  
  // 測試所有 CORS 代理
  for (const proxy of proxyServices) {
    const result = await testProxy(proxy);
    results.push({ name: proxy.name, ...result });
    console.log('');
  }
  
  // 測試 FinMind 直接調用
  const finmindResult = await testFinMindDirect();
  results.push({ name: 'FinMind Direct', ...finmindResult });
  
  // 總結
  console.log('\n📊 測試結果總結:');
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    const info = result.success ? `價格: ${result.price}` : `錯誤: ${result.error}`;
    console.log(`  ${status} ${result.name}: ${info}`);
  });
  
  const successCount = results.filter(r => r.success).length;
  console.log(`\n🎯 可用服務: ${successCount}/${results.length}`);
  
  if (successCount === 0) {
    console.log('\n⚠️ 警告：所有股價 API 都不可用！');
    console.log('💡 建議：');
    console.log('  1. 檢查網路連線');
    console.log('  2. 考慮使用其他股價資料來源');
    console.log('  3. 實作本地快取機制');
  } else {
    console.log('\n✅ 雲端環境股價獲取功能正常');
  }
}

runTests().catch(console.error);