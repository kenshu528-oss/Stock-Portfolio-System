// 簡單的股票搜尋測試

// 模擬測試各種股票代碼格式
const testCodes = [
  // 上市股票 (4位數字)
  '2330', '2317', '2303', '1301', '2881',
  
  // ETF (4位數字，0開頭)
  '0050', '0056',
  
  // ETF (5位數字)
  '00646', '00662',
  
  // 債券ETF (6位數字+字母)
  '00679B', '00687B',
  
  // 上櫃股票 (4位數字，3-8開頭)
  '3006', '4102', '6411',
  
  // 興櫃股票
  '4966', '6508'
];

// 測試股票代碼格式驗證
function testStockCodeFormat(code) {
  // 複製股價服務中的驗證邏輯（最終版）
  const isValid = /^(\d{4}[A-Z]?|00\d{3}[A-Z]?)$/.test(code.toUpperCase());
  return isValid;
}

// 判斷股票市場
function getStockMarket(symbol) {
  // ETF判斷
  if (/^00\d{2,3}[A-Z]?$/.test(symbol)) {
    return 'ETF';
  }
  
  // 上市股票（1000-2999, 部分3000-3999）
  const code = parseInt(symbol.substring(0, 4));
  if ((code >= 1000 && code <= 2999) || 
      (code >= 3000 && code <= 3099)) {
    return '上市';
  }
  
  // 上櫃股票（主要是3000-8999）
  if (code >= 3000 && code <= 8999) {
    return '上櫃';
  }
  
  return '未知';
}

console.log('🧪 股票代碼格式驗證測試\n');
console.log('代碼\t\t格式驗證\t市場判斷');
console.log('-'.repeat(40));

testCodes.forEach(code => {
  const isValid = testStockCodeFormat(code);
  const market = getStockMarket(code);
  const status = isValid ? '✅' : '❌';
  
  console.log(`${code}\t\t${status}\t\t${market}`);
});

console.log('\n📊 測試結果:');
const validCount = testCodes.filter(code => testStockCodeFormat(code)).length;
console.log(`有效代碼: ${validCount}/${testCodes.length}`);

// 測試無效代碼
const invalidCodes = ['123', '12345', 'AAAA', '2330X', '123456'];
console.log('\n❌ 無效代碼測試:');
invalidCodes.forEach(code => {
  const isValid = testStockCodeFormat(code);
  const status = isValid ? '⚠️ 意外通過' : '✅ 正確拒絕';
  console.log(`${code}\t\t${status}`);
});

console.log('\n✅ 格式驗證測試完成！');