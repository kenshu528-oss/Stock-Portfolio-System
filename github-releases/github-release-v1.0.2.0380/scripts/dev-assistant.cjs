#!/usr/bin/env node

/**
 * 開發助手 - 根據修改的檔案自動提示相關 STEERING 規則
 * 使用方式：node scripts/dev-assistant.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// STEERING 規則對應表
const RULE_MAP = {
  // UI 相關
  'src/components/ui/Icons.tsx': ['ui-design-standards.md'],
  'src/components/*.tsx': ['ui-design-standards.md', 'console-log-management.md'],
  
  // 狀態管理
  'src/stores/appStore.ts': ['state-management.md', 'console-log-management.md'],
  
  // 除權息相關
  'src/services/rightsEventService.ts': ['unified-rights-calculation.md', 'stock-dividend-calculation.md'],
  'src/services/dividendApiService.ts': ['finmind-api-usage.md', 'api-data-integrity.md'],
  'src/components/RightsEventManager.tsx': ['unified-rights-calculation.md'],
  
  // API 相關
  'src/services/*ApiService.ts': ['finmind-api-priority.md', 'api-data-integrity.md', 'dual-api-strategy.md'],
  'backend/services/*.js': ['finmind-api-usage.md', 'api-data-integrity.md'],
  
  // 版本相關
  'package.json': ['version-consistency.md', 'version-archival.md'],
  'src/constants/version.ts': ['version-consistency.md'],
  'src/constants/changelog.ts': ['version-consistency.md'],
  
  // 雲端同步
  'src/services/githubGistService.ts': ['cloud-sync-development.md'],
  'src/components/CloudSyncSettings.tsx': ['cloud-sync-development.md'],
};

// 常見問題檢查清單
const COMMON_ISSUES = {
  'state-management.md': [
    '❓ 新增/移除狀態變數時，是否更新了 partialize？',
    '❓ 是否需要更新 localStorage 版本號？',
    '❓ 是否測試了頁面重載？'
  ],
  'unified-rights-calculation.md': [
    '❓ 是否所有除權息更新入口都傳入 forceRecalculate 參數？',
    '❓ 是否使用 RightsEventService.processStockRightsEvents？',
    '❓ 是否測試了 Header 批量更新和個股更新的一致性？'
  ],
  'stock-dividend-calculation.md': [
    '❓ 是否按時間從舊到新排序除權息記錄？',
    '❓ 是否使用累積的 currentShares 而非原始 stock.shares？',
    '❓ 是否使用最後一筆記錄的 sharesAfterRight？'
  ],
  'version-consistency.md': [
    '❓ package.json、version.ts、changelog.ts 版本號是否一致？',
    '❓ 是否添加了 changelog 記錄？',
    '❓ 是否執行了 npm run build？'
  ],
  'ui-design-standards.md': [
    '❓ 是否使用統一的圖示組件（Icons.tsx）？',
    '❓ SVG path 是否以 M 或 m 開頭？',
    '❓ 是否遵循顏色和尺寸規範？'
  ]
};

console.log('🔍 開發助手 - 檢查需要注意的 STEERING 規則\n');

try {
  // 獲取已修改但未提交的檔案
  const modifiedFiles = execSync('git diff --name-only HEAD', { encoding: 'utf-8' })
    .split('\n')
    .filter(f => f.trim());
  
  // 獲取已暫存的檔案
  const stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf-8' })
    .split('\n')
    .filter(f => f.trim());
  
  const allFiles = [...new Set([...modifiedFiles, ...stagedFiles])];
  
  if (allFiles.length === 0) {
    console.log('✅ 沒有檢測到修改的檔案');
    process.exit(0);
  }
  
  console.log('📝 檢測到以下修改的檔案：');
  allFiles.forEach(file => console.log(`   - ${file}`));
  console.log('');
  
  // 收集相關的 STEERING 規則
  const relevantRules = new Set();
  
  allFiles.forEach(file => {
    Object.keys(RULE_MAP).forEach(pattern => {
      // 簡單的模式匹配
      const regex = new RegExp(pattern.replace('*', '.*'));
      if (regex.test(file)) {
        RULE_MAP[pattern].forEach(rule => relevantRules.add(rule));
      }
    });
  });
  
  if (relevantRules.size === 0) {
    console.log('ℹ️  沒有檢測到需要特別注意的 STEERING 規則');
    process.exit(0);
  }
  
  console.log('⚠️  請注意以下 STEERING 規則：\n');
  
  relevantRules.forEach(rule => {
    console.log(`📋 ${rule}`);
    
    if (COMMON_ISSUES[rule]) {
      COMMON_ISSUES[rule].forEach(issue => {
        console.log(`   ${issue}`);
      });
    }
    console.log('');
  });
  
  console.log('💡 提示：');
  console.log('   - 開發前請先閱讀相關 STEERING 規則');
  console.log('   - 開發後執行 npm run check:all 檢查');
  console.log('   - 提交前再次確認檢查清單\n');
  
} catch (error) {
  console.error('❌ 執行失敗:', error.message);
  process.exit(1);
}
