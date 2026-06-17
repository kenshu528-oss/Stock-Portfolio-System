# GitHub 推送快速檢查清單

## 🚀 推送前必做檢查

### ✅ 版本管理
```bash
npm run check:version
```
- [ ] package.json 版本號已更新
- [ ] version.ts PATCH 值已更新  
- [ ] changelog.ts 已添加新版本記錄
- [ ] 三處版本號完全一致

### ✅ 代碼質量
```bash
npm run check:svg
npm run check:state
npm run check:rights
npm run build
```
- [ ] SVG 格式檢查通過
- [ ] 狀態管理檢查通過
- [ ] 除權息計算檢查通過
- [ ] 建置成功無錯誤

### ✅ 版本歸檔
```bash
mkdir github-releases/github-release-v1.0.2.XXXX
robocopy . github-releases/github-release-v1.0.2.XXXX /E /XD node_modules dist .git export github-releases
```
- [ ] 歸檔資料夾已創建
- [ ] 檔案完整複製（排除 node_modules, dist, .git）

### ✅ Git 操作
```bash
git add .
git commit -m "版本更新 - v1.0.2.XXXX: [功能描述]"
git tag v1.0.2.XXXX
git push origin main
git push --tags
```
- [ ] 變更已提交
- [ ] 標籤已創建
- [ ] 推送到 GitHub 完成

### ✅ 推送後驗證
- [ ] GitHub 上代碼已更新
- [ ] 標籤正確顯示
- [ ] GitHub Actions（如有）正常執行

---

## 🔧 常用命令

**完整檢查**：
```bash
npm run check:version && npm run check:svg && npm run check:state && npm run check:rights && npm run build
```

**快速推送**（測試失敗時）：
```bash
git push origin main --no-verify && git push --tags --no-verify
```

**版本歸檔**：
```bash
robocopy . github-releases/github-release-v1.0.2.XXXX /E /XD node_modules dist .git export github-releases
```

---

**💡 提示**：將此檢查清單加入書籤，每次推送前快速確認！