# 版本管理規範 (Version Management)

> 合併自：version-consistency.md, version-archival.md

## 🎯 核心原則

### 版本號一致性
- ✅ **四處必須同步**：package.json、package-lock.json、version.ts、changelog.ts
- ✅ **修改功能必須進版**：任何功能變更都要更新版本號
- ✅ **重新建置**：版本號更新後必須執行 npm run build

### 版本歸檔
- ✅ **GitHub 上傳前必須歸檔**：創建完整的版本資料夾
- ✅ **保留歷史版本**：所有發布版本都要完整保存
- ✅ **命名規則統一**：github-release-v1.0.2.XXXX

---

## 🚨 已知問題與防範（血淚教訓）

### 問題一：changelog.ts 插入新版本語法錯誤
**症狀**：build 失敗，`Expected "]" but found ":"`
**根本原因**：str_replace 用 `{version: '1.0.2.XXXX',` 當 oldStr，把下一個版本物件的 `{` 一起吃掉

**正確插入方式**：
```typescript
// ✅ oldStr 包含完整的前一版本結尾 + 下一版本開頭
oldStr:  `  },\n  {\n    version: '1.0.2.0412',`
newStr:  `  },\n  {\n    version: '1.0.2.0413',\n    ...\n  },\n  {\n    version: '1.0.2.0412',`
```

**或使用更安全的 anchor（建議）**：
```typescript
// ✅ 在陣列第一個 { 前插入
oldStr:  `export const CHANGELOG: ChangelogEntry[] = [\n  {`
newStr:  `export const CHANGELOG: ChangelogEntry[] = [\n  {\n    version: 'NEW',...\n  },\n  {`
```

**插入後必須確認**：
```bash
node -e "require('./src/constants/changelog.ts')"  # 語法錯誤會立即報錯
npm run check:version  # 確認版本號一致
npm run build          # 確認能正常 build
```

### 問題二：VITE_ 前綴環境變數被打包進 bundle
**症狀**：GitHub Push Protection 擋住推送，提示 `GH013: Repository rule violations`
**根本原因**：Vite 會將所有 `VITE_` 前綴的變數注入前端 bundle，`.env` 裡的真實 token 因此洩漏

**規則**：
- ❌ `.env` 裡的 `VITE_` 變數不能放真實 token
- ✅ 真實 token 只能存在 localStorage（使用者 UI 輸入）或 GitHub Secrets（CI 用）
- ✅ `.env` 裡的 `VITE_DEV_TOKEN` 必須留空：`VITE_DEV_TOKEN=`

### 問題三：package-lock.json 未同步導致 CI npm ci 失敗
**症狀**：GitHub Actions build 失敗，時間約 1m 16s（比正常的 1m 35s 短）
**根本原因**：更新 `package.json` 版本號後沒有同步 `package-lock.json`

**正確做法**：每次更新版本號後執行以下指令更新 lock 檔：
```bash
node -e "
const fs = require('fs');
const p = JSON.parse(fs.readFileSync('package.json'));
const l = JSON.parse(fs.readFileSync('package-lock.json'));
l.version = p.version;
if (l.packages && l.packages['']) l.packages[''].version = p.version;
fs.writeFileSync('package-lock.json', JSON.stringify(l, null, 2));
console.log('package-lock.json 已同步至', p.version);
"
```

### 問題四：誤操作 gh-pages 分支
**症狀**：手動推 gh-pages 沒有效果，GitHub Pages 顯示舊版本
**根本原因**：本 repo 用 GitHub Actions（actions/deploy-pages）部署，不是直接從 gh-pages 分支讀檔

**規則**：
- ❌ 不要手動操作 gh-pages 分支
- ✅ 只要推 main，GitHub Actions 會自動 build 並部署
- ✅ 部署失敗時看 Actions log，不是看 gh-pages 分支內容

---

## 📂 版本號存在的位置

### 必須同步更新的三個檔案

```
package.json                    - "version": "1.0.2.XXXX"
src/constants/version.ts        - PATCH: XXX
src/constants/changelog.ts      - version: '1.0.2.XXXX'
```

### 版本號格式規範
```
Stock-Portfolio-System 倉庫: v1.0.2.XXXX
其他倉庫: v1.2.2.XXXX (絕對禁止混用)
```

---

## 🔄 版本更新流程

### 每次功能修改必須執行

```bash
# 1. 更新 package.json
"version": "1.0.2.0315"

# 2. 更新 src/constants/version.ts
export const PATCH = 315;

# 3. 更新 src/constants/changelog.ts（注意：用安全的 anchor 插入，避免破壞語法）
# oldStr 必須包含完整的前版本結尾 + 下一版本的 {，確保不吃掉任何 {

# 4. 同步 package-lock.json（避免 CI npm ci 失敗）
node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json'));const l=JSON.parse(fs.readFileSync('package-lock.json'));l.version=p.version;if(l.packages&&l.packages[''])l.packages[''].version=p.version;fs.writeFileSync('package-lock.json',JSON.stringify(l,null,2));console.log('已同步至',p.version);"

# 5. 驗證版本號一致
npm run check:version

# 6. 重新建置（確認 build 成功後再 commit）
npm run build
```

### 股價專精版本更新要求 (v1.0.2.0315)

#### 股價相關修改必須更新版本號
- ✅ **修改股價獲取邏輯**：更新 PATCH 版本號
- ✅ **添加新的股價來源**：更新 PATCH 版本號
- ✅ **修改股價來源顯示**：更新 PATCH 版本號
- ✅ **優化股價獲取性能**：更新 PATCH 版本號

#### Changelog 必須記錄的內容
- 股價來源的變更（如新增 Vercel）
- 股價獲取邏輯的簡化
- UI 顯示的改善
- 性能優化的細節

---

## 📋 版本更新檢查清單

### 必須確認的項目
- [ ] package.json 版本號已更新
- [ ] version.ts PATCH 值已更新
- [ ] changelog.ts 已添加新版本記錄
- [ ] 所有版本號格式正確（v1.0.2.XXXX）
- [ ] 執行 `npm run check:version` 通過
- [ ] 執行 `npm run build` 成功

---

## 🗂️ 版本歸檔規範

### 標準歸檔位置
```
github-releases/
├── github-release-v1.0.2.0001/
├── github-release-v1.0.2.0011/
├── github-release-v1.0.2.0012/
└── github-release-v1.0.2.XXXX/
```

### 版本資料夾命名規則
```
格式: github-release-v{MAJOR}.{MINOR}.{PATCH}.{BUILD}
範例: github-release-v1.0.2.0147
```

### GitHub 上傳前必須執行

```bash
# 1. 檢查當前版本號
npm run check:version

# 2. 創建版本資料夾
mkdir github-releases/github-release-v1.0.2.XXXX

# 3. 複製專案檔案（排除不需要的目錄）
robocopy . github-releases/github-release-v1.0.2.XXXX /E /XD node_modules dist .git export github-releases

# 4. 驗證歸檔完整性
dir github-releases/github-release-v1.0.2.XXXX

# 5. 才能執行 GitHub 上傳
```

### 必須歸檔的檔案
- ✅ 所有源代碼 (`src/` 目錄)
- ✅ 配置檔案 (`package.json`, `vite.config.ts` 等)
- ✅ 後端代碼 (`backend/` 目錄)
- ✅ 文檔檔案 (`README.md`, `LICENSE` 等)
- ✅ 建置配置 (`tsconfig.json`, `tailwind.config.js` 等)

### 不需要歸檔的檔案
- ❌ `node_modules/` 目錄
- ❌ `dist/` 目錄
- ❌ `.git/` 目錄
- ❌ 臨時檔案和快取

---

## 🚨 常見錯誤

### 錯誤 1：版本號不一致
```javascript
// ❌ 錯誤：版本號不一致
package.json: "1.0.2.0147"
version.ts: PATCH: 146  // 忘記更新
changelog.ts: "1.0.2.0146"  // 沒有新記錄
```

**修復**：
```bash
npm run check:version  # 找出不一致的地方
# 手動同步三個檔案
```

### 錯誤 2：未歸檔就上傳
```bash
# ❌ 錯誤：直接上傳到 GitHub
git push origin main

# ✅ 正確：先歸檔再上傳
mkdir github-releases/github-release-v1.0.2.XXXX
robocopy . github-releases/github-release-v1.0.2.XXXX /E /XD node_modules dist .git
git push origin main
```

### 錯誤 3：忘記重新建置
```bash
# ❌ 錯誤：更新版本號後沒有建置
# 修改 package.json
# 直接提交

# ✅ 正確：更新後重新建置
npm run build
git add .
git commit -m "更新版本號 - v1.0.2.0147"
```

---

## 💡 最佳實踐

### 版本號管理原則
1. **功能修改必須進版**：任何功能變更都要更新版本號
2. **多處同步更新**：不能只改一個地方
3. **記錄變更內容**：changelog 必須詳細記錄
4. **格式嚴格遵循**：版本號格式不能錯誤

### 歸檔管理原則
1. **上傳前必須歸檔**：每個上傳到 GitHub 的版本都要歸檔
2. **保留重要版本**：所有發布版本都要完整保存
3. **定期檢查**：確保歷史版本完整性
4. **清理舊版本**：保留重要里程碑，清理過舊的開發版本

### 開發流程整合
```
開發完成 
  → 更新版本號（三個檔案）
  → 執行 npm run check:version
  → 執行 npm run build
  → 測試
  → 創建版本歸檔
  → 提交到 GitHub
```

---

## 🎯 自動化檢查

### 版本號一致性檢查
```bash
npm run check:version
```

**檢查內容**：
- package.json 的 version
- src/constants/version.ts 的 PATCH
- src/constants/changelog.ts 的最新 version
- 確保三者完全一致

---

**記住：版本號不一致會導致混亂和錯誤！每次修改功能都必須同步更新所有相關檔案的版本號！每個上傳到 GitHub 的版本都是重要的里程碑，必須完整保存！**
