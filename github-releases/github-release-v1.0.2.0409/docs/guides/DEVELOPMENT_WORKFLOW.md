# 開發流程指南 (Development Workflow Guide)

## 🎯 目標：預防重複 BUG，提升開發質量

這份指南整合了所有 STEERING 規則，提供簡單易行的開發流程。

---

## 📋 開發前檢查（5 分鐘）

### 1. 執行開發助手
```bash
node scripts/dev-assistant.js
```

這會自動提示你需要注意的 STEERING 規則。

### 2. 快速檢查清單

根據你要修改的內容，快速檢查：

| 修改內容 | 必讀規則 | 關鍵檢查點 |
|---------|---------|-----------|
| **UI 組件** | ui-design-standards.md | ✓ 使用 Icons.tsx<br>✓ SVG path 以 M 開頭<br>✓ 遵循顏色規範 |
| **狀態管理** | state-management.md | ✓ 更新 partialize<br>✓ 考慮版本遷移<br>✓ 測試頁面重載 |
| **除權息** | unified-rights-calculation.md<br>stock-dividend-calculation.md | ✓ 使用 RightsEventService<br>✓ 傳入 forceRecalculate<br>✓ 按時間排序 |
| **API 調用** | finmind-api-usage.md<br>api-data-integrity.md | ✓ 優先 FinMind<br>✓ 不提供虛假資料<br>✓ 正確處理 404 |
| **版本更新** | version-consistency.md | ✓ 同步三個檔案<br>✓ 更新 changelog<br>✓ 執行 build |

---

## 💻 開發中注意（持續）

### 使用 Logger 而非 console.log
```typescript
// ❌ 錯誤
console.log('處理中...', data);

// ✅ 正確
logger.debug('stock', '處理中', { symbol: data.symbol });
```

### 遵循疊加式開發
```typescript
// ✅ 正確：保留舊功能，添加新功能
const enhancedFunction = () => {
  const result = existingFunction(); // 保留
  return enhanceResult(result);      // 添加
};

// ❌ 錯誤：直接修改核心邏輯
const existingFunction = () => {
  return completelyNewLogic(); // 危險！
};
```

### 完整的錯誤處理
```typescript
// ✅ 正確
try {
  const result = await apiCall();
  if (!result) throw new Error('無資料');
  return result;
} catch (error) {
  logger.error('api', '調用失敗', error);
  return null;
}
```

---

## ✅ 開發後檢查（10 分鐘）

### 1. 執行自動化檢查
```bash
# 完整檢查（推薦）
npm run check:all

# 或針對性檢查
npm run check:svg        # 修改 UI 時
npm run check:version    # 更新版本時
```

### 2. 手動驗證

根據修改內容，執行對應測試：

#### 修改狀態管理
- [ ] 重新載入頁面（F5）
- [ ] 確認狀態正確恢復
- [ ] 檢查 localStorage

#### 修改除權息
- [ ] 測試 Header 批量更新
- [ ] 測試個股內更新
- [ ] 確認兩者結果一致

#### 修改 API
- [ ] 測試正常情況
- [ ] 測試 404 情況
- [ ] 檢查 Console 無誤報

#### 修改 UI
- [ ] 檢查圖示顯示正確
- [ ] 檢查顏色符合規範
- [ ] 測試互動效果

### 3. 更新版本號（如需要）

如果是功能修改或 BUG 修復：

```bash
# 1. 更新三個檔案的版本號
# - package.json: "version": "1.0.2.XXXX"
# - src/constants/version.ts: PATCH: XXX
# - src/constants/changelog.ts: 添加新記錄

# 2. 驗證版本號一致
npm run check:version

# 3. 重新建置
npm run build
```

---

## 📤 提交前檢查（5 分鐘）

### 1. 最終檢查
```bash
npm run check:all
```

### 2. 檢查清單

- [ ] 所有自動化檢查通過
- [ ] Console 無錯誤（開發環境正常警告除外）
- [ ] 功能測試通過
- [ ] 版本號已更新（如需要）
- [ ] Changelog 已更新（如需要）

### 3. 提交代碼
```bash
git add .
git commit -m "功能描述 - v1.0.2.XXXX"
```

---

## 🚨 常見問題快速修復

### 問題 1：SVG Path 格式錯誤
```typescript
// 修復：確保 path 以 M 開頭
<path d="M9 12l2 2 4-4" />
```

### 問題 2：版本號不一致
```bash
# 執行檢查找出不一致的地方
node scripts/check-version-consistency.js

# 手動同步三個檔案
```

### 問題 3：狀態無法持久化
```typescript
// 檢查 partialize 是否包含該狀態
partialize: (state) => ({
  currentAccount: state.currentAccount,
  rightsAdjustmentMode: state.rightsAdjustmentMode, // 確保包含
  // ...
})
```

### 問題 4：除權息計算不一致
```typescript
// 確保所有入口都傳入 forceRecalculate
await RightsEventService.processStockRightsEvents(
  stock, 
  onProgress, 
  true  // ⚠️ 必須明確傳入
);
```

---

## 💡 效率提升技巧

### 1. 使用 VS Code 任務
在 `.vscode/tasks.json` 中配置快捷任務：
```json
{
  "label": "開發助手",
  "type": "shell",
  "command": "node scripts/dev-assistant.js"
}
```

### 2. Git Hooks（可選）
自動在提交前執行檢查：
```bash
# .git/hooks/pre-commit
npm run check:all
```

### 3. 快速命令別名
在 `package.json` 中添加：
```json
{
  "scripts": {
    "dev:check": "node scripts/dev-assistant.js",
    "dev:test": "npm run check:all"
  }
}
```

---

## 📊 質量指標

### 目標
- **重複 BUG 率**：< 5%
- **提交前檢查通過率**：100%
- **版本號一致性**：100%
- **自動化檢查覆蓋率**：> 80%

### 監控
- 每週檢查本週發現的問題類型
- 每月更新 STEERING 規則
- 每季 Review 開發流程效率

---

## 🎯 記住這三點

1. **開發前**：執行 `node scripts/dev-assistant.js` 查看相關規則
2. **開發中**：遵循 STEERING 規則，使用 logger，疊加式開發
3. **提交前**：執行 `npm run check:all` 確保質量

**預防勝於修復！花 5 分鐘檢查，省下 50 分鐘修 BUG！**
