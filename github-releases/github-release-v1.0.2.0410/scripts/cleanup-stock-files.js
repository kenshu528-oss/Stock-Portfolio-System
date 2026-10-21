#!/usr/bin/env node

/**
 * 股票清單檔案清理腳本
 * 統一檔案管理，避免重複和混亂
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧹 開始清理股票清單檔案...');

// 檢查 public 目錄下的檔案
const publicDir = path.join(__dirname, '..', 'public');
const rootDir = path.join(__dirname, '..');

console.log('\n📂 檢查 public 目錄:');
if (fs.existsSync(publicDir)) {
  const publicFiles = fs.readdirSync(publicDir)
    .filter(file => file.includes('stock_list'));
  
  publicFiles.forEach(file => {
    const filePath = path.join(publicDir, file);
    const stats = fs.statSync(filePath);
    console.log(`  ✅ ${file} (${(stats.size / 1024).toFixed(1)} KB)`);
  });
} else {
  console.log('  ❌ public 目錄不存在');
}

console.log('\n📂 檢查根目錄:');
const rootFiles = fs.readdirSync(rootDir)
  .filter(file => file.includes('stock_list') && file.endsWith('.json'));

rootFiles.forEach(file => {
  const filePath = path.join(rootDir, file);
  const stats = fs.statSync(filePath);
  console.log(`  📄 ${file} (${(stats.size / 1024).toFixed(1)} KB)`);
});

// 分析重複檔案
console.log('\n🔍 分析檔案重複情況:');

const publicStockList = path.join(publicDir, 'stock_list.json');
const today = new Date().toISOString().split('T')[0];
const todayFile = path.join(rootDir, `stock_list_${today}.json`);

if (fs.existsSync(publicStockList) && fs.existsSync(todayFile)) {
  const publicContent = fs.readFileSync(publicStockList, 'utf8');
  const todayContent = fs.readFileSync(todayFile, 'utf8');
  
  if (publicContent === todayContent) {
    console.log('  ✅ public/stock_list.json 與今日檔案內容相同');
  } else {
    console.log('  ⚠️ public/stock_list.json 與今日檔案內容不同');
    
    try {
      const publicData = JSON.parse(publicContent);
      const todayData = JSON.parse(todayContent);
      
      console.log(`    public: ${publicData.date} (${publicData.count} 支股票)`);
      console.log(`    today:  ${todayData.date} (${todayData.count} 支股票)`);
    } catch (e) {
      console.log('    無法解析 JSON 內容');
    }
  }
}

// 建議清理方案
console.log('\n💡 建議的檔案管理策略:');
console.log('  1. 保留 public/stock_list.json 作為前端唯一資料來源');
console.log('  2. 根目錄的 stock_list_YYYY-MM-DD.json 作為歷史備份');
console.log('  3. 定期清理超過 7 天的歷史檔案');

// 檢查是否有超過 7 天的舊檔案
const oldFiles = rootFiles.filter(file => {
  const match = file.match(/stock_list_(\d{4}-\d{2}-\d{2})\.json/);
  if (match) {
    const fileDate = new Date(match[1]);
    const daysDiff = (new Date() - fileDate) / (1000 * 60 * 60 * 24);
    return daysDiff > 7;
  }
  return false;
});

if (oldFiles.length > 0) {
  console.log('\n🗑️ 發現可清理的舊檔案:');
  oldFiles.forEach(file => {
    console.log(`  📄 ${file}`);
  });
  
  console.log('\n要清理這些舊檔案嗎？(y/N)');
  // 注意：這裡不實際執行刪除，只是提示
  console.log('💡 提示：可以手動刪除或使用 git clean 命令');
}

console.log('\n✅ 檔案檢查完成');