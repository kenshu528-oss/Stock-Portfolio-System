#!/usr/bin/env node

/**
 * 狀態管理檢查 - 確保 partialize 包含所有需要持久化的狀態
 * 防止 v1.0.2.0142 類型的問題再次發生
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 檢查狀態管理配置...\n');

const appStorePath = path.join(__dirname, '../src/stores/appStore.ts');

if (!fs.existsSync(appStorePath)) {
  console.error('❌ 找不到 appStore.ts');
  process.exit(1);
}

const content = fs.readFileSync(appStorePath, 'utf-8');

// 需要檢查的關鍵狀態變數
const CRITICAL_STATES = [
  'currentAccount',
  'accounts',
  'stocks',
  'isPrivacyMode',
  'rightsAdjustmentMode',
];

// 提取 AppState 介面定義
const appStateMatch = content.match(/interface AppState \{([\s\S]*?)\n\}/);
if (!appStateMatch) {
  console.error('❌ 找不到 AppState 介面定義');
  process.exit(1);
}

const appStateContent = appStateMatch[1];

// 提取 persist 配置區塊（包含 partialize）
const persistMatch = content.match(/persist\(([\s\S]*?)\n\);/);
if (!persistMatch) {
  console.error('❌ 找不到 persist 配置');
  process.exit(1);
}

const persistContent = persistMatch[1];

let hasError = false;

console.log('📋 檢查關鍵狀態變數是否在 partialize 中：\n');

CRITICAL_STATES.forEach(stateName => {
  // 檢查是否在 AppState 中定義
  const stateRegex = new RegExp(`\\b${stateName}\\s*[?:]`, 'g');
  const inAppState = stateRegex.test(appStateContent);
  
  // 檢查是否在 persist 配置中（更簡單的匹配）
  const inPersist = persistContent.includes(`${stateName}: state.${stateName}`);
  
  if (inAppState && !inPersist) {
    console.error(`❌ ${stateName}: 在 AppState 中定義但未包含在 partialize 中`);
    hasError = true;
  } else if (inAppState && inPersist) {
    console.log(`✅ ${stateName}: 正確包含在 partialize 中`);
  }
});

console.log('');

// 檢查是否有 onRehydrateStorage
const hasOnRehydrate = content.includes('onRehydrateStorage');
if (!hasOnRehydrate) {
  console.warn('⚠️  警告：沒有 onRehydrateStorage 處理舊版本遷移');
}

if (hasError) {
  console.error('\n❌ 狀態管理檢查失敗！');
  console.error('\n修復建議：');
  console.error('1. 在 partialize 函數中添加缺失的狀態變數');
  console.error('2. 參考 STEERING 規則：state-management.md');
  console.error('3. 測試頁面重載後狀態是否正確恢復\n');
  process.exit(1);
}

console.log('✅ 狀態管理配置正確\n');
process.exit(0);
