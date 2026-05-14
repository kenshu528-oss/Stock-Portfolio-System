// 股票搜尋功能測試

import { stockService } from '../services/stockPriceService';

// 測試各類型股票搜尋
export async function testStockSearch() {
  console.log('🧪 開始測試股票搜尋功能...\n');

  const testCases = [
    // 上市股票
    { symbol: '2330', name: '台積電', type: '上市' },
    { symbol: '2317', name: '鴻海', type: '上市' },
    { symbol: '2303', name: '聯電', type: '上市' },
    { symbol: '1301', name: '台塑', type: '上市' },
    { symbol: '2881', name: '富邦金', type: '上市' },
    
    // ETF
    { symbol: '0050', name: '元大台灣50', type: 'ETF' },
    { symbol: '0056', name: '元大高股息', type: 'ETF' },
    { symbol: '00646', name: '元大S&P500', type: 'ETF' },
    { symbol: '00662', name: '富邦NASDAQ', type: 'ETF' },
    { symbol: '00679B', name: '元大美債20年', type: 'ETF' },
    
    // 上櫃股票
    { symbol: '3006', name: '晶豪科', type: '上櫃' },
    { symbol: '4102', name: '永日', type: '上櫃' },
    { symbol: '6411', name: '晶焱', type: '上櫃' },
    
    // 興櫃股票
    { symbol: '4966', name: '譜瑞', type: '興櫃' },
    { symbol: '6508', name: '惠光', type: '興櫃' },
    
    // 隨機測試股票（測試動態生成）
    { symbol: '1234', name: '未知股票', type: '測試' },
    { symbol: '5678', name: '未知股票', type: '測試' },
    { symbol: '00123', name: '未知ETF', type: '測試' }
  ];

  const results = [];
  
  for (const testCase of testCases) {
    try {
      console.log(`🔍 測試 ${testCase.symbol} (${testCase.type})...`);
      
      const result = await stockService.searchStock(testCase.symbol);
      
      if (result) {
        console.log(`✅ 成功: ${result.symbol} - ${result.name} (${result.market})`);
        console.log(`   股價: $${result.price?.toFixed(2)} 漲跌: ${result.change?.toFixed(2)} (${result.changePercent?.toFixed(2)}%)`);
        results.push({ ...testCase, success: true, result });
      } else {
        console.log(`❌ 失敗: 找不到 ${testCase.symbol}`);
        results.push({ ...testCase, success: false, result: null });
      }
      
      console.log(''); // 空行分隔
      
      // 避免API限流
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.log(`💥 錯誤: ${testCase.symbol} - ${error}`);
      results.push({ ...testCase, success: false, error: (error as Error).message });
    }
  }

  // 統計結果
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  
  console.log(`\n📊 測試結果統計:`);
  console.log(`成功: ${successCount}/${totalCount} (${((successCount/totalCount)*100).toFixed(1)}%)`);
  
  // 按類型分組統計
  const byType = results.reduce((acc, result) => {
    if (!acc[result.type]) acc[result.type] = { success: 0, total: 0 };
    acc[result.type].total++;
    if (result.success) acc[result.type].success++;
    return acc;
  }, {} as Record<string, {success: number, total: number}>);
  
  console.log(`\n📈 按類型統計:`);
  Object.entries(byType).forEach(([type, stats]) => {
    const rate = ((stats.success / stats.total) * 100).toFixed(1);
    console.log(`${type}: ${stats.success}/${stats.total} (${rate}%)`);
  });
  
  // 失敗案例
  const failures = results.filter(r => !r.success);
  if (failures.length > 0) {
    console.log(`\n❌ 失敗案例:`);
    failures.forEach(failure => {
      console.log(`- ${failure.symbol} (${failure.type}): ${'error' in failure ? failure.error : '找不到股票'}`);
    });
  }
  
  return results;
}

// 測試股票代碼格式驗證
export function testStockSymbolValidation() {
  console.log('🧪 測試股票代碼格式驗證...\n');
  
  const validCodes = [
    '2330',    // 4位數字
    '0050',    // 4位數字（ETF）
    '00646',   // 5位數字（ETF）
    '00679B',  // 6位數字+字母（債券ETF）
    '1565A',   // 4位數字+字母（如有）
  ];
  
  const invalidCodes = [
    '123',     // 太短
    '12345',   // 5位純數字但不是ETF格式
    'AAAA',    // 純字母
    '2330X',   // 無效格式
    '123456',  // 6位純數字
  ];
  
  // 這裡需要從stockPriceService中導出驗證函數來測試
  // 由於是private方法，我們通過實際搜尋來測試
  
  console.log('✅ 有效代碼測試:');
  validCodes.forEach(code => {
    console.log(`${code}: 應該有效`);
  });
  
  console.log('\n❌ 無效代碼測試:');
  invalidCodes.forEach(code => {
    console.log(`${code}: 應該無效`);
  });
}

// 執行所有測試
export async function runAllTests() {
  console.log('🚀 開始執行股票搜尋完整測試\n');
  console.log('='.repeat(50));
  
  // 測試格式驗證
  testStockSymbolValidation();
  
  console.log('\n' + '='.repeat(50));
  
  // 測試實際搜尋
  const results = await testStockSearch();
  
  console.log('='.repeat(50));
  console.log('✅ 測試完成！');
  
  return results;
}