# GitHub 推送標準作業程序 (GitHub Push SOP)

## 🎯 目的

建立標準化的 GitHub 推送流程，確保每次推送都能順利完成，避免常見問題和時間浪費。

## 📋 推送前檢查清單

### 1. 版本號檢查（必須）
```bash
# 檢查版本號一致性
npm run check:version
```

**必須確認**：
- [ ] package.json 版本號已更新
- [ ] src/constants/version.ts PATCH 值已更新
- [ ] src/constants/changelog.ts 已添加新版本記錄
- [ ] 三處版本號完全一致

### 2. 代碼質量檢查（必須）
```bash
# 執行所有質量檢查
npm run check:svg      # SVG 格式檢查
npm run check:state    # 狀態管理檢查
npm run check:rights   # 除權息計算檢查
```

**必須通過**：
- [ ] ✅ SVG path 格式正確
- [ ] ✅ 狀態管理配置正確
- [ ] ✅ 除權息計算一致性正確

### 3. 建置檢查（必須）
```bash
# 確保代碼能正常建置
npm run build
```

**必須確認**：
- [ ] ✅ 建置成功，無錯誤
- [ ] 警告可接受（如代碼分割建議）

### 4. 功能測試（建議）
- [ ] 主要功能正常運作
- [ ] 新增功能測試通過
- [ ] 沒有破壞現有功能

## 🗂️ 版本歸檔流程

### 1. 創建版本歸檔資料夾
```bash
# 創建歸檔資料夾（替換 XXXX 為實際版本號）
mkdir github-releases/github-release-v1.0.2.XXXX
```

### 2. 複製專案檔案
```bash
# 使用 robocopy 複製檔案（Windows）
robocopy . github-releases/github-release-v1.0.2.XXXX /E /XD node_modules dist .git export github-releases
```

**排除的目錄**：
- `node_modules/` - 依賴套件
- `dist/` - 建置輸出
- `.git/` - Git 版本控制
- `export/` - 匯出檔案
- `github-releases/` - 避免遞歸複製

### 3. 驗證歸檔完整性
```bash
# 檢查歸檔資料夾內容
dir github-releases/github-release-v1.0.2.XXXX
```

**必須包含**：
- [ ] `src/` 目錄（源代碼）
- [ ] `package.json`（專案配置）
- [ ] `README.md`（說明文檔）
- [ ] `LICENSE`（授權檔案）
- [ ] 其他重要配置檔案

## 🚀 Git 推送流程

### 1. 檢查 Git 狀態
```bash
# 檢查當前狀態
git status
```

### 2. 添加變更檔案
```bash
# 添加所有變更
git add .

# 或選擇性添加
git add package.json src/constants/version.ts src/constants/changelog.ts
```

### 3. 提交變更
```bash
# 提交變更（使用標準格式）
git commit -m "版本更新 - v1.0.2.XXXX: [功能描述]"
```

**提交訊息格式**：
```
版本更新 - v1.0.2.XXXX: [簡短功能描述]

- 主要變更1
- 主要變更2
- 修復問題描述
```

### 4. 創建 Git 標籤
```bash
# 創建版本標籤
git tag v1.0.2.XXXX

# 或創建帶註釋的標籤
git tag -a v1.0.2.XXXX -m "版本 v1.0.2.XXXX: [功能描述]"
```

### 5. 推送到 GitHub
```bash
# 推送代碼
git push origin main

# 推送標籤
git push --tags
```

**如果測試失敗**：
```bash
# 跳過測試推送（僅在測試不相關時使用）
git push origin main --no-verify
git push --tags --no-verify
```

## 🔧 常見問題解決

### 問題 1：版本號不一致
**症狀**：`npm run check:version` 失敗
**解決**：
1. 檢查三個檔案的版本號
2. 手動同步版本號
3. 重新執行檢查

### 問題 2：建置失敗
**症狀**：`npm run build` 出現錯誤
**解決**：
1. 檢查 TypeScript 錯誤
2. 修復語法錯誤
3. 確認所有導入正確

### 問題 3：Git 推送被拒絕
**症狀**：推送時出現權限或衝突錯誤
**解決**：
1. 檢查 GitHub 權限
2. 拉取最新變更：`git pull origin main`
3. 解決衝突後重新推送

### 問題 4：測試失敗阻止推送
**症狀**：Git hooks 阻止推送
**解決**：
1. 修復相關測試
2. 或使用 `--no-verify` 跳過（謹慎使用）

## 📊 推送後驗證

### 1. GitHub 檢查
- [ ] 代碼已成功推送到 main 分支
- [ ] 標籤已正確創建
- [ ] GitHub Actions（如有）正常執行

### 2. 版本歸檔檢查
- [ ] 歸檔資料夾已創建
- [ ] 檔案完整複製
- [ ] 版本號正確

### 3. 功能驗證
- [ ] GitHub Pages（如有）正常更新
- [ ] 線上版本功能正常

## 🎯 最佳實踐

### 版本管理
1. **小步快跑**：頻繁的小版本更新比大版本更安全
2. **功能完整**：每個版本都應該是功能完整的
3. **測試充分**：推送前充分測試新功能

### 提交習慣
1. **清楚描述**：提交訊息要清楚描述變更內容
2. **邏輯分組**：相關變更放在同一個提交中
3. **避免混合**：不要在同一個提交中混合不相關的變更

### 錯誤預防
1. **檢查清單**：每次都執行完整的檢查清單
2. **自動化**：使用腳本自動化重複性檢查
3. **備份重要**：推送前確保重要變更已備份

## 🚨 緊急情況處理

### 推送後發現問題
1. **立即評估**：問題嚴重程度
2. **快速修復**：如果是小問題，立即修復並推送新版本
3. **回滾考慮**：如果是嚴重問題，考慮回滾到上一個穩定版本

### 回滾流程
```bash
# 回滾到上一個提交
git reset --hard HEAD~1
git push origin main --force

# 或回滾到特定標籤
git reset --hard v1.0.2.XXXX
git push origin main --force
```

**⚠️ 注意**：強制推送會覆蓋遠端歷史，請謹慎使用。

## 📝 檢查清單模板

```
□ 版本號檢查通過 (npm run check:version)
□ SVG 格式檢查通過 (npm run check:svg)
□ 狀態管理檢查通過 (npm run check:state)
□ 除權息計算檢查通過 (npm run check:rights)
□ 建置檢查通過 (npm run build)
□ 功能測試完成
□ 版本歸檔完成
□ Git 提交完成
□ Git 標籤創建
□ 推送到 GitHub 完成
□ 推送後驗證完成
```

---

**制定日期**：2026-01-31  
**版本**：1.0.0  
**適用範圍**：Stock Portfolio System 專案  
**更新頻率**：根據實際經驗持續改進

**記住**：標準化流程是為了提高效率和減少錯誤，但不應該成為創新的障礙。根據實際情況靈活調整！