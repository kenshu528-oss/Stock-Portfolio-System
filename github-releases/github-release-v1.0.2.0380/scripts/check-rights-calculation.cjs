#!/usr/bin/env node

/**
 * 除權息計算一致性檢查 - 確保所有入口都使用統一的計算邏輯
 * 防止 v1.0.2.0132 類型的問題再次發生
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 檢查除權息計算一致性...\n');

// 需要檢查的檔案和必須包含的模式
const FILES_TO_CHECK = [
  {
    path: 'src/stores/appStore.ts',
    patterns: [
      {
        name: 'updateStockDividendData 接受 forceRecalculate 參數',
        regex: /updateStockDividendData.*?forceRecalculate.*?boolean/s,
        required: true
      },
      {
        name: 'updateStockDividendData 傳入 forceRecalculate',
        regex: /processStockRightsEvents[\s\S]{0,200}forceRecalculate\s*\/\//,
        required: true
      },
      {
        name: 'updateAllStockPrices 傳入 forceRecalculate: true',
        regex: /updateStockDividendData\([^)]*,\s*true\)/,
        required: true
      }
    ]
  },
  {
    path: 'src/components/RightsEventManager.tsx',
    patterns: [
      {
        name: 'handleProcessRightsEvents 接受 forceRecalculate 參數',
        regex: /handleProcessRightsEvents.*?forceRecalculate.*?boolean/s,
        required: true
      },
      {
        name: 'handleProcessRightsEvents 傳入 forceRecalculate',
        regex: /RightsEventService\.processStockRightsEvents/,
        required: true
      }
    ]
  },
  {
    path: 'src/services/rightsEventService.ts',
    patterns: [
      {
        name: '除權息記錄按時間排序（從舊到新）',
        regex: /sortedApiRecords.*=.*apiRecords\.sort.*exDividendDate.*getTime/s,
        required: true
      },
      {
        name: '使用累積的 currentShares',
        regex: /currentShares\s*=\s*dividendRecord\.sharesAfterRight/,
        required: true
      }
    ]
  }
];

let hasError = false;
let warningCount = 0;

FILES_TO_CHECK.forEach(({ path: filePath, patterns }) => {
  const fullPath = path.join(__dirname, '..', filePath);
  
  console.log(`📄 檢查 ${filePath}:`);
  
  if (!fs.existsSync(fullPath)) {
    console.error(`   ❌ 檔案不存在\n`);
    hasError = true;
    return;
  }
  
  const content = fs.readFileSync(fullPath, 'utf-8');
  
  patterns.forEach(({ name, regex, required }) => {
    const found = regex.test(content);
    
    if (required && !found) {
      console.error(`   ❌ ${name}`);
      hasError = true;
    } else if (!required && !found) {
      console.warn(`   ⚠️  ${name}`);
      warningCount++;
    } else {
      console.log(`   ✅ ${name}`);
    }
  });
  
  console.log('');
});

// 🔍 搜尋所有 processStockRightsEvents 調用
console.log('🔍 搜尋所有 processStockRightsEvents 調用...\n');

const filesToScan = [
  'src/stores/appStore.ts',
  'src/components/RightsEventManager.tsx',
  'src/App.tsx'
];

let callCheckPassed = true;

filesToScan.forEach(filePath => {
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (!fs.existsSync(fullPath)) return;
  
  const content = fs.readFileSync(fullPath, 'utf-8');
  const lines = content.split('\n');
  
  // 找到所有 processStockRightsEvents 調用的起始行
  lines.forEach((line, index) => {
    if (line.includes('processStockRightsEvents(') && 
        !line.trim().startsWith('//') && 
        !line.includes('static async processStockRightsEvents') &&
        !line.includes('this.processStockRightsEvents')) {
      
      // 向下查找直到找到函數調用結束（遇到 ); 且括號平衡）
      let foundForceRecalculate = false;
      let bracketCount = 0;
      let started = false;
      
      for (let i = index; i < Math.min(index + 20, lines.length); i++) {
        const currentLine = lines[i];
        
        // 計算括號數量
        for (const char of currentLine) {
          if (char === '(') {
            bracketCount++;
            started = true;
          } else if (char === ')') {
            bracketCount--;
          }
        }
        
        // 檢查是否包含 forceRecalculate 或 true/false（作為第三個參數）
        if (currentLine.includes('forceRecalculate') || 
            (currentLine.includes('true') && currentLine.includes('//')) ||
            (currentLine.includes('false') && currentLine.includes('//'))) {
          foundForceRecalculate = true;
        }
        
        // 如果括號平衡且已開始，表示函數調用結束
        if (started && bracketCount === 0) {
          break;
        }
      }
      
      if (!foundForceRecalculate) {
        console.error(`❌ ${filePath}:${index + 1}`);
        console.error(`   未傳入 forceRecalculate 參數\n`);
        callCheckPassed = false;
      } else {
        console.log(`✅ ${filePath}:${index + 1} - 正確傳入 forceRecalculate`);
      }
    }
  });
});

if (!callCheckPassed) {
  hasError = true;
}

if (warningCount > 0) {
  console.warn(`⚠️  發現 ${warningCount} 個警告\n`);
}

if (hasError) {
  console.error('❌ 除權息計算一致性檢查失敗！\n');
  console.error('修復建議：');
  console.error('1. 確保所有 processStockRightsEvents 調用都傳入 forceRecalculate 參數');
  console.error('2. 確保 updateStockDividendData 接受並傳遞 forceRecalculate 參數');
  console.error('3. 確保除權息記錄按時間從舊到新排序');
  console.error('4. 參考 STEERING 規則：unified-rights-calculation.md\n');
  process.exit(1);
}

console.log('✅ 除權息計算一致性檢查通過\n');
process.exit(0);
