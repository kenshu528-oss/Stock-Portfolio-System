# 開發檢查清單 (Development Checklist)

## 🚀 快速參考

### 提交前必做（強制）
```bash
npm run check:all
```
✅ 所有檢查通過才能提交！

---

## 📋 根據修改內容執行檢查

### 修改了 UI 組件（.tsx 檔案）
```bash
npm run check:svg
```
**檢查內容**：SVG path 格式是否正確

### 更新了版本號
```bash
npm run check:version
```
**檢查內容**：package.json、version.ts、changelog.ts 是否一致

### 完成一個功能
```bash
npm run check:all
```
**檢查內容**：SVG + 版本號 + TypeScript + 測試

---

## 🔍 開發流程

### 1. 開發新功能
```
開發代碼
  ↓
自我檢查（參考 STEERING 規則）
  ↓
執行相關檢查（npm run check:svg 或 check:version）
  ↓
修復錯誤
```

### 2. 更新版本號
```
同步更新三個文件：
  - package.json: "version": "1.0.2.XXXX"
  - version.ts: PATCH: XXX
  - changelog.ts: version: '1.0.2.XXXX'
  ↓
執行檢查：npm run check:version
  ↓
確認一致
```

### 3. 提交代碼
```
執行完整檢查：npm run check:all
  ↓
所有檢查通過
  ↓
git add .
  ↓
git commit -m "..."
  ↓
git push
```

---

## ⚠️ 常見錯誤快速修復

### SVG Path 格式錯誤
```typescript
// ❌ 錯誤
<path d="9 12l2 2 4-4" />

// ✅ 正確
<path d="M9 12l2 2 4-4" />
```

### 版本號不一致
```bash
# 檢查哪裡不一致
npm run check:version

# 手動同步三個文件
# 1. package.json
# 2. src/constants/version.ts
# 3. src/constants/changelog.ts
```

---

## 📚 詳細規範參考

- **代碼質量標準**：`.kiro/steering/code-quality-standards.md`
- **UI 設計標準**：`.kiro/steering/ui-design-standards.md`
- **版本一致性規則**：`.kiro/steering/version-consistency.md`
- **Console Log 管理**：`.kiro/steering/console-log-management.md`
- **API 資料完整性**：`.kiro/steering/api-data-integrity.md`

---

## 🎯 記住

1. **提交前必須執行** `npm run check:all`
2. **修改 UI 後執行** `npm run check:svg`
3. **更新版本後執行** `npm run check:version`
4. **遇到錯誤先看** STEERING 規則
5. **預防勝於修復**！

---

**快捷鍵提示**：
- 檢查 SVG：`npm run check:svg`
- 檢查版本：`npm run check:version`
- 完整檢查：`npm run check:all`
