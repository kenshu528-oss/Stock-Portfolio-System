#!/usr/bin/env node
/**
 * 建置時生成股票清單
 * 在 GitHub Actions 或本地建置時執行
 */

const fs = require('fs');
const path = require('path');

// 將現有的股票清單複製到 public 目錄，供前端使用
function buildStockListForProduction() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const sourceFile = `stock_list_${today}.json`;
    const targetFile = path.join('public', 'stock_list.json');
    
    if (fs.existsSync(sourceFile)) {
      // 複製檔案到 public 目錄
      fs.copyFileSync(sourceFile, targetFile);
      console.log(`✅ 股票清單已複製到 public/stock_list.json`);
      
      // 讀取並驗證檔案
      const data = JSON.parse(fs.readFileSync(targetFile, 'utf8'));
      console.log(`📊 股票總數: ${data.count}`);
      console.log(`📅 資料日期: ${data.date}`);
      
    } else {
      console.error(`❌ 找不到今日股票清單: ${sourceFile}`);
      console.log(`💡 請先執行: python backend/fetch_stock_list.py`);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ 建置股票清單失敗:', error.message);
    process.exit(1);
  }
}

// 如果直接執行此腳本
if (require.main === module) {
  buildStockListForProduction();
}

module.exports = { buildStockListForProduction };