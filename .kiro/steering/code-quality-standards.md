# 代碼質量標準規範 (Code Quality Standards)

## 🎯 核心原則：預防勝於修復

### 絕對要求的規範
- ✅ **提交前必須執行檢查**：使用自動化腳本檢查代碼質量
- ✅ **遵循開發檢查清單**：每個功能開發完成後必須檢查
- ✅ **Code Review 必須通過**：至少檢查關鍵項目
- ✅ **版本更新必須同步**：package.json、version.ts、changelog.ts 必須一致

## ⚡ 何時執行檢查

### 必須執行完整檢查的時機
```bash
npm run check:all
```

**執行時機**：
1. ✅ **提交代碼前**（最重要）
2. ✅ **完成一個功能後**
3. ✅ **修復 bug 後**
4. ✅ **更新版本號後**
5. ✅ **合併分支前**

### 可以執行部分檢查的時機
```bash
# 只檢查 SVG（修改 UI 組件時）
npm run check:svg

# 只檢查版本號（更新版本時）
npm run check:version
```

**執行時機**：
- 🔧 修改 UI 組件時 → `npm run check:svg`
- 🔧 更新版本號時 → `npm run check:version`
- 🔧 開發過程中想快速檢查 → 執行相關檢查

### 不需要執行檢查的時機
- 📝 只修改文檔（.md 檔案）
- 📝 只修改註解
- 📝 只修改 STEERING 規則
- 📝 只修改測試檔案（但提交前仍需執行完整檢查）

## 🔍 針對性檢查策略

### 根據修改內容選擇檢查

| 修改內容 | 必須執行的檢查 | 原因 |
|---------|--------------|------|
| UI 組件（.tsx） | `npm run check:svg` | 可能包含 SVG 圖示 |
| 版本號相關 | `npm run check:version` | 確保版本號一致 |
| 任何代碼修改 | `npm run check:all` | 全面檢查 |
| 提交前 | `npm run check:all` | 最終驗證 |

### 智能檢查建議
```bash
# 修改了 UI 組件
git diff --name-only | grep "\.tsx$"
# 如果有結果 → npm run check:svg

# 修改了版本號
git diff --name-only | grep -E "(package\.json|version\.ts|changelog\.ts)"
# 如果有結果 → npm run check:version

# 提交前（無論修改什麼）
npm run check:all
```

## 📋 自動化檢查腳本

### 1. SVG Path 格式檢查
```bash
# 檢查所有 SVG path 是否符合標準（必須以 M 或 m 開頭）
node scripts/check-svg-paths.js
```

**檢查內容**：
- 掃描所有 `.tsx` 和 `.ts` 檔案
- 檢查 `d="..."` 屬性是否以 M 或 m 開頭
- 自動報告錯誤位置和建議修復方式

### 2. 版本號一致性檢查
```bash
# 檢查版本號是否在所有文件中一致
node scripts/check-version-consistency.js
```

**檢查內容**：
- package.json 的 version
- src/constants/version.ts 的 PATCH
- src/constants/changelog.ts 的最新 version
- 確保三者完全一致

### 3. 提交前完整檢查
```bash
# Windows 版本
scripts\pre-commit-check.bat

# 執行所有檢查：SVG、版本號、TypeScript、測試
```

**檢查項目**：
1. SVG path 格式檢查
2. TypeScript 語法檢查 (npm run lint)
3. 版本號一致性檢查
4. 單元測試 (npm run test)

## 🔍 開發前檢查清單

### 新增功能時必須確認
- [ ] 是否遵循 UI 設計標準？（ui-design-standards.md）
- [ ] 是否使用統一的圖示組件？（src/components/ui/Icons.tsx）
- [ ] 是否使用 logger 而非 console.log？（console-log-management.md）
- [ ] 是否遵循 API 資料完整性規則？（api-data-integrity.md）
- [ ] 是否遵循安全開發規則？（safe-development.md）

### 修改功能時必須確認
- [ ] 是否更新了版本號？（version-consistency.md）
- [ ] 是否更新了 changelog？
- [ ] 是否執行了自動化檢查？
- [ ] 是否測試了所有受影響的功能？
- [ ] 是否更新了相關文檔？

### 提交前必須確認
- [ ] 執行 `npm run check:all` 通過（**必須**）
- [ ] 所有 TypeScript 錯誤已修復
- [ ] 所有測試通過
- [ ] Console 無錯誤和警告（開發環境正常警告除外）
- [ ] 版本號已同步更新

### 開發過程中建議確認
- [ ] 修改 UI 組件後執行 `npm run check:svg`
- [ ] 更新版本號後執行 `npm run check:version`
- [ ] 完成一個功能後執行 `npm run check:all`

## 📝 Code Review 檢查項目

### 1. UI/UX 檢查
- [ ] SVG 圖示格式正確（path 以 M 或 m 開頭）
- [ ] 使用統一的圖示組件和顏色系統
- [ ] 按鈕樣式符合設計標準
- [ ] 無障礙設計（aria-label、title 等）

### 2. 代碼質量檢查
- [ ] 無直接使用 console.log（使用 logger 系統）
- [ ] 錯誤處理完整（try-catch、錯誤訊息）
- [ ] 無重複代碼（DRY 原則）
- [ ] 函數職責單一（Single Responsibility）
- [ ] 變數命名清晰易懂

### 3. API 和資料檢查
- [ ] API 調用遵循優先順序（finmind-api-priority.md）
- [ ] 不提供虛假或預設資料（api-data-integrity.md）
- [ ] 404 錯誤處理正確（不誤報警告）
- [ ] 資料驗證完整

### 4. 版本管理檢查
- [ ] 版本號在所有文件中一致
- [ ] Changelog 記錄完整清楚
- [ ] 版本號格式正確（v1.0.2.XXXX）
- [ ] 提交訊息清楚描述變更

## 🚨 常見問題預防

### 1. SVG Path 格式錯誤
**問題**：`Error: <path> attribute d: Expected moveto path command`

**預防**：
- 使用統一的圖示組件（src/components/ui/Icons.tsx）
- 提交前執行 `node scripts/check-svg-paths.js`
- 複製 SVG 時確保 path 以 M 開頭

**修復**：
```typescript
// ❌ 錯誤
<path d="9 12l2 2 4-4" />

// ✅ 正確
<path d="M9 12l2 2 4-4" />
```

### 2. 版本號不一致
**問題**：package.json、version.ts、changelog.ts 版本號不同

**預防**：
- 使用自動化腳本檢查：`node scripts/check-version-consistency.js`
- 修改功能時同步更新三個文件
- 提交前執行完整檢查

**修復**：
```bash
# 1. 確認當前版本號
node scripts/check-version-consistency.js

# 2. 手動同步三個文件
# - package.json: "version": "1.0.2.0118"
# - version.ts: PATCH: 118
# - changelog.ts: version: '1.0.2.0118'
```

### 3. Console Log 過多
**問題**：開發環境 Console 輸出過多，影響調試

**預防**：
- 遵循 console-log-management.md 規範
- 高頻操作使用註解方式（// console.log）
- 404 錯誤不輸出警告（正常情況）

**修復**：
```typescript
// ❌ 錯誤：高頻操作輸出詳細日誌
for (const item of items) {
  console.log(`處理 ${item.id}...`);
}

// ✅ 正確：註解掉或使用 DEBUG 等級
for (const item of items) {
  // console.log(`處理 ${item.id}...`);
}
```

### 4. API 資料完整性問題
**問題**：使用虛假資料或本地硬編碼

**預防**：
- 遵循 api-data-integrity.md 規範
- API 失敗時返回 null 或 404
- 不提供預設價格或虛假名稱

**修復**：
```typescript
// ❌ 錯誤：提供虛假資料
if (!apiData) {
  return { name: '股票名稱', price: 10.0 };
}

// ✅ 正確：返回 null
if (!apiData) {
  return null;
}
```

## 🛠️ 開發工具整合

### 1. package.json 腳本
```json
{
  "scripts": {
    "check:svg": "node scripts/check-svg-paths.js",
    "check:version": "node scripts/check-version-consistency.js",
    "check:all": "scripts\\pre-commit-check.bat",
    "precommit": "npm run check:all"
  }
}
```

### 2. Git Hooks（可選）
```bash
# .git/hooks/pre-commit
#!/bin/sh
npm run check:all
```

### 3. VS Code 設定（可選）
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

## 📊 質量指標

### 目標
- **SVG 格式錯誤**：0 個
- **版本號不一致**：0 次
- **TypeScript 錯誤**：0 個
- **測試覆蓋率**：> 80%
- **Console 錯誤**：只有真正的錯誤

### 監控
- 每次提交前執行自動化檢查
- 每週檢查代碼質量指標
- 每月 Review STEERING 規則執行情況

## 💡 最佳實踐

### 開發流程
```
1. 開發新功能
   ↓
2. 自我檢查（開發檢查清單）
   ↓
3. 執行自動化檢查
   ↓
4. 修復所有錯誤
   ↓
5. 更新版本號和 Changelog
   ↓
6. 再次執行自動化檢查
   ↓
7. 提交代碼
```

### 問題修復流程
```
1. 發現問題
   ↓
2. 分析根本原因
   ↓
3. 修復問題
   ↓
4. 更新 STEERING 規則（如需要）
   ↓
5. 更新自動化檢查腳本（如需要）
   ↓
6. 記錄到 Changelog
```

## 🎯 持續改進

### 定期檢討
- **每週**：檢查本週發現的問題類型
- **每月**：更新 STEERING 規則和檢查腳本
- **每季**：Review 整體代碼質量趨勢

### 規則更新
- 發現新問題類型時，立即更新 STEERING 規則
- 更新自動化檢查腳本，預防問題再次發生
- 記錄到文檔，供團隊參考

---

**記住：預防勝於修復！使用自動化工具確保代碼質量，遵循 STEERING 規則避免重複問題！**
