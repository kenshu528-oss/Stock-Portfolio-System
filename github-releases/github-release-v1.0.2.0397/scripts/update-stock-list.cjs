#!/usr/bin/env node
/**
 * 股票清單自動更新腳本
 * 檢測缺失的股票清單檔案並自動生成
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getCurrentDateString() {
  return new Date().toISOString().split('T')[0];
}

function checkStockListExists() {
  const today = getCurrentDateString();
  const stockListFile = `stock_list_${today}.json`;
  const publicStockList = path.join('public', 'stock_list.json');
  
  console.log(`🔍 檢查股票清單檔案...`);
  console.log(`📅 今日日期: ${today}`);
  console.log(`📁 檢查檔案: ${stockListFile}`);
  
  const exists = fs.existsSync(stockListFile);
  const publicExists = fs.existsSync(publicStockList);
  
  console.log(`📊 根目錄檔案存在: ${exists ? '✅' : '❌'}`);
  console.log(`📊 public 目錄檔案存在: ${publicExists ? '✅' : '❌'}`);
  
  return { exists, publicExists, stockListFile, publicStockList, today };
}

function generateStockList() {
  console.log(`🚀 開始生成股票清單...`);
  
  try {
    // 檢查 Python 是否可用
    try {
      execSync('python --version', { stdio: 'pipe' });
      console.log(`✅ Python 環境檢查通過`);
    } catch (error) {
      console.error(`❌ Python 環境不可用，請確保已安裝 Python`);
      return false;
    }
    
    // 執行 Python 腳本生成股票清單
    console.log(`📥 執行 Python 腳本獲取股票資料...`);
    execSync('python backend/fetch_stock_list.py --force', { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    console.log(`✅ 股票資料獲取完成`);
    return true;
    
  } catch (error) {
    console.error(`❌ 生成股票清單失敗:`, error.message);
    return false;
  }
}

function copyToPublic(stockListFile, publicStockList) {
  try {
    console.log(`📋 複製檔案到 public 目錄...`);
    fs.copyFileSync(stockListFile, publicStockList);
    
    // 驗證複製的檔案
    const data = JSON.parse(fs.readFileSync(publicStockList, 'utf8'));
    console.log(`✅ 檔案複製成功`);
    console.log(`📊 股票總數: ${data.count}`);
    console.log(`📅 資料日期: ${data.date}`);
    
    return true;
  } catch (error) {
    console.error(`❌ 複製檔案失敗:`, error.message);
    return false;
  }
}

function updateStockList() {
  console.log(`🔄 股票清單自動更新開始...`);
  
  const { exists, publicExists, stockListFile, publicStockList, today } = checkStockListExists();
  
  // 如果根目錄檔案不存在，嘗試生成
  if (!exists) {
    console.log(`📝 今日股票清單不存在，開始生成...`);
    
    const generated = generateStockList();
    if (!generated) {
      console.error(`❌ 股票清單生成失敗`);
      return false;
    }
    
    // 重新檢查檔案是否生成成功
    if (!fs.existsSync(stockListFile)) {
      console.error(`❌ 股票清單檔案仍然不存在: ${stockListFile}`);
      return false;
    }
  } else {
    console.log(`✅ 今日股票清單已存在: ${stockListFile}`);
  }
  
  // 如果 public 目錄檔案不存在或需要更新，進行複製
  if (!publicExists) {
    console.log(`📁 public 目錄股票清單不存在，開始複製...`);
    return copyToPublic(stockListFile, publicStockList);
  } else {
    // 檢查 public 目錄的檔案是否是今日的
    try {
      const publicData = JSON.parse(fs.readFileSync(publicStockList, 'utf8'));
      if (publicData.date !== today) {
        console.log(`📅 public 目錄股票清單不是今日的 (${publicData.date})，開始更新...`);
        return copyToPublic(stockListFile, publicStockList);
      } else {
        console.log(`✅ public 目錄股票清單已是最新 (${today})`);
        return true;
      }
    } catch (error) {
      console.log(`❌ public 目錄股票清單格式錯誤，重新複製...`);
      return copyToPublic(stockListFile, publicStockList);
    }
  }
}

// 如果直接執行此腳本
if (require.main === module) {
  const success = updateStockList();
  if (success) {
    console.log(`🎉 股票清單更新完成！`);
    process.exit(0);
  } else {
    console.error(`💥 股票清單更新失敗！`);
    process.exit(1);
  }
}

module.exports = { updateStockList, checkStockListExists };