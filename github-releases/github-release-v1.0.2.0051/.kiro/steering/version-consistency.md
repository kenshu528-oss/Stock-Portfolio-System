# 版本號一致性規則 (Version Consistency Rules)

## 🎯 核心原則：多處版本號必須同步

### 絕對要求的操作
- ✅ **修改功能時必須同步更新所有版本號**
- ✅ **package.json、version.ts、changelog.ts 必須一致**
- ✅ **版本號更新後必須重新建置**
- ✅ **提交前必須驗證版本號一致性**

## 📂 版本號存在的位置

### 必須同步更新的文件
```
package.json                    - "version": "1.0.2.XXXX"
src/constants/version.ts        - PATCH: XX
src/constants/changelog.ts      - version: '1.0.2.XXXX'
src/services/GitHubGistService.ts - version: data.version || '1.0.2.XXXX'
```

### 版本號格式規範
```
Stock-Portfolio-System 倉庫: v1.0.2.XXXX
其他倉庫: v1.2.2.XXXX (絕對禁止混用)
```

## 🔄 版本更新流程

### 每次功能修改必須執行
1. **更新 package.json 版本號**
2. **更新 src/constants/version.ts 的 PATCH 值**
3. **在 src/constants/changelog.ts 添加更新記錄**
4. **更新 GitHubGistService.ts 中的預設版本號**
5. **重新執行 npm run build**
6. **驗證所有版本號一致**

### 版本號更新檢查清單
- [ ] package.json 版本號已更新？
- [ ] version.ts PATCH 值已更新？
- [ ] changelog.ts 已添加新版本記錄？
- [ ] GitHubGistService.ts 預設版本號已更新？
- [ ] 所有版本號格式正確（v1.0.2.XXXX）？
- [ ] 已重新建置專案？

## 🚨 常見錯誤

### 絕對禁止的做法
- ❌ **只更新 package.json 忘記其他文件**
- ❌ **修改功能但不更新版本號**
- ❌ **版本號不一致就提交代碼**
- ❌ **忘記添加 changelog 記錄**
- ❌ **使用錯誤的版本號範圍**

### 錯誤範例
```javascript
// ❌ 錯誤：版本號不一致
package.json: "1.0.2.0036"
version.ts: PATCH: 35  // 忘記更新
changelog.ts: "1.0.2.0035"  // 沒有新記錄
```

### 正確範例
```javascript
// ✅ 正確：所有版本號一致
package.json: "1.0.2.0036"
version.ts: PATCH: 36
changelog.ts: "1.0.2.0036" (有新記錄)
GitHubGistService.ts: '1.0.2.0036'
```

## 🛠️ 自動化檢查

### 建議的檢查腳本
```bash
# 檢查版本號一致性
npm run version-check

# 或手動檢查
grep -r "1.0.2" package.json src/constants/ src/services/
```

### 提交前驗證
```bash
# 確保版本號一致後再提交
git add .
git commit -m "功能更新 - v1.0.2.XXXX"
```

## 💡 最佳實踐

### 版本號管理原則
1. **功能修改必須進版**：任何功能變更都要更新版本號
2. **多處同步更新**：不能只改一個地方
3. **記錄變更內容**：changelog 必須詳細記錄
4. **格式嚴格遵循**：版本號格式不能錯誤

### 開發流程整合
- 開發完成 → 更新版本號 → 更新 changelog → 建置 → 測試 → 提交

## 🎯 版本號管理目標

### 一致性保證
- **100%** 的版本號在所有文件中一致
- **即時** 的版本號同步更新
- **完整** 的變更記錄追蹤
- **標準** 的版本號格式

### 開發效率
- **自動化** 的版本號檢查
- **標準化** 的更新流程
- **一致性** 的命名規則
- **可追溯** 的版本歷史

---

**記住：版本號不一致會導致混亂和錯誤！每次修改功能都必須同步更新所有相關文件的版本號！**