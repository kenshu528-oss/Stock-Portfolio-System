# 開發檢查清單 (Development Checklist)

## 📋 使用說明

複製對應的檢查清單到你的開發筆記中，完成一項就打勾 ✅

---

## 🎨 UI 組件開發檢查清單

### 開發前
- [ ] 執行 `npm run dev:assistant` 查看相關規則
- [ ] 閱讀 `ui-design-standards.md`
- [ ] 確認要使用的圖示和顏色

### 開發中
- [ ] 使用 `src/components/ui/Icons.tsx` 中的圖示組件
- [ ] SVG path 以 `M` 或 `m` 開頭
- [ ] 確認按鈕使用正確的顏色（綠色確認、紅色取消）
- [ ] 確認按鈕尺寸符合規範（sm/md/lg）
- [ ] 添加適當的 hover 效果
- [ ] 使用 logger 而非 console.log

### 開發後
- [ ] 執行 `npm run check:svg`
- [ ] 測試所有互動效果
- [ ] 檢查 Console 無錯誤
- [ ] 截圖記錄 UI 變更

### 提交前
- [ ] 執行 `npm run check:all`
- [ ] 更新版本號（如需要）
- [ ] 更新 changelog

---

## 🔄 狀態管理修改檢查清單

### 開發前
- [ ] 執行 `npm run dev:assistant` 查看相關規則
- [ ] 閱讀 `state-management.md`
- [ ] 確認要新增/修改的狀態變數

### 新增狀態變數
- [ ] 在 `AppState` 介面中定義
- [ ] 設定合理的初始值
- [ ] 添加到 `partialize` 函數（如需持久化）
- [ ] 添加對應的 action 函數
- [ ] 考慮是否需要更新 localStorage 版本號

### 移除狀態變數
- [ ] 從 `AppState` 介面移除
- [ ] 從 `partialize` 函數移除
- [ ] 更新 localStorage 版本號
- [ ] 添加 `onRehydrateStorage` 清理邏輯
- [ ] 移除相關的 action 函數

### 開發後
- [ ] 執行 `npm run check:state`
- [ ] 測試頁面重載（F5）
- [ ] 確認狀態正確恢復
- [ ] 檢查 localStorage 內容
- [ ] 測試清除 localStorage 後的行為

### 提交前
- [ ] 執行 `npm run check:all`
- [ ] 更新版本號
- [ ] 在 changelog 記錄狀態變更

---

## 💰 除權息功能修改檢查清單

### 開發前
- [ ] 執行 `npm run dev:assistant` 查看相關規則
- [ ] 閱讀 `unified-rights-calculation.md`
- [ ] 閱讀 `stock-dividend-calculation.md`
- [ ] 確認要修改的入口點

### 開發中
- [ ] 使用 `RightsEventService.processStockRightsEvents`
- [ ] 明確傳入 `forceRecalculate` 參數
- [ ] 除權息記錄按時間從舊到新排序
- [ ] 使用累積的 `currentShares` 而非原始值
- [ ] 使用最後一筆記錄的 `sharesAfterRight`
- [ ] 添加詳細的 logger 記錄

### 測試
- [ ] 測試 Header 批量更新
- [ ] 測試個股內更新
- [ ] 確認兩者結果完全一致
- [ ] 測試多年配股的累積計算
- [ ] 與 GoodInfo 等網站對比驗證

### 開發後
- [ ] 執行 `npm run check:rights`
- [ ] 檢查 Console 日誌
- [ ] 記錄測試結果

### 提交前
- [ ] 執行 `npm run check:all`
- [ ] 更新版本號
- [ ] 在 changelog 詳細記錄變更

---

## 🌐 API 功能修改檢查清單

### 開發前
- [ ] 執行 `npm run dev:assistant` 查看相關規則
- [ ] 閱讀 `finmind-api-usage.md`
- [ ] 閱讀 `api-data-integrity.md`
- [ ] 確認 API 優先順序

### 開發中
- [ ] 一般股票優先使用 FinMind API
- [ ] 債券 ETF 優先使用 Yahoo Finance API
- [ ] 不提供虛假或預設資料
- [ ] API 失敗時返回 null 或 404
- [ ] 完整的錯誤處理（try-catch）
- [ ] 添加 API 調用日誌

### 測試
- [ ] 測試正常情況
- [ ] 測試 404 情況
- [ ] 測試網路錯誤情況
- [ ] 測試超時情況
- [ ] 檢查錯誤訊息是否友好

### 開發後
- [ ] 檢查 Console 無誤報
- [ ] 驗證資料準確性
- [ ] 記錄 API 回應時間

### 提交前
- [ ] 執行 `npm run check:all`
- [ ] 更新版本號
- [ ] 在 changelog 記錄 API 變更

---

## 🔢 版本號更新檢查清單

### 必須同步更新的三個檔案
- [ ] `package.json` - "version": "1.0.2.XXXX"
- [ ] `src/constants/version.ts` - PATCH: XXX
- [ ] `src/constants/changelog.ts` - 添加新版本記錄

### 版本號更新步驟
1. [ ] 確定新版本號（遞增 PATCH）
2. [ ] 更新 `package.json`
3. [ ] 更新 `version.ts`
4. [ ] 在 `changelog.ts` 添加新記錄
5. [ ] 執行 `npm run check:version`
6. [ ] 執行 `npm run build`
7. [ ] 測試建置結果

### Changelog 記錄內容
- [ ] 版本號正確
- [ ] 日期正確
- [ ] 變更類型明確（功能/修復/優化）
- [ ] 變更描述清楚
- [ ] 影響範圍說明

### 提交前
- [ ] 執行 `npm run check:all`
- [ ] 確認版本號一致
- [ ] 確認 changelog 完整

---

## 🚀 提交前最終檢查清單

### 自動化檢查
- [ ] 執行 `npm run check:all` 通過
- [ ] 所有 TypeScript 錯誤已修復
- [ ] 所有測試通過
- [ ] SVG 格式正確
- [ ] 版本號一致

### 手動檢查
- [ ] Console 無錯誤（開發環境正常警告除外）
- [ ] 功能測試通過
- [ ] UI 顯示正確
- [ ] 沒有破壞現有功能

### 文檔更新
- [ ] 版本號已更新（如需要）
- [ ] Changelog 已更新（如需要）
- [ ] README 已更新（如需要）
- [ ] STEERING 規則已更新（如需要）

### Git 提交
- [ ] Commit 訊息清楚描述變更
- [ ] 格式：`功能描述 - v1.0.2.XXXX`
- [ ] 沒有包含不相關的檔案

---

## 🐛 BUG 修復檢查清單

### 分析階段
- [ ] 重現問題
- [ ] 記錄錯誤訊息和步驟
- [ ] 分析根本原因
- [ ] 檢查是否有相關 STEERING 規則

### 修復階段
- [ ] 執行 `npm run dev:assistant`
- [ ] 遵循相關 STEERING 規則
- [ ] 使用疊加式開發（不破壞現有功能）
- [ ] 添加錯誤處理
- [ ] 添加日誌記錄

### 測試階段
- [ ] 驗證問題已修復
- [ ] 測試相關功能
- [ ] 測試邊界情況
- [ ] 確認沒有引入新問題

### 預防階段
- [ ] 更新 STEERING 規則（如需要）
- [ ] 更新自動化檢查腳本（如需要）
- [ ] 記錄到 changelog
- [ ] 分享經驗給團隊

### 提交前
- [ ] 執行 `npm run check:all`
- [ ] 更新版本號
- [ ] 詳細記錄修復內容

---

## 💡 使用技巧

### 1. 複製到開發筆記
將相關檢查清單複製到你的開發筆記中，邊開發邊打勾。

### 2. 使用 VS Code 任務
在 `.vscode/tasks.json` 中配置快捷任務：
```json
{
  "label": "開發檢查",
  "type": "shell",
  "command": "npm run check:all"
}
```

### 3. 打印出來
將常用的檢查清單打印出來，貼在螢幕旁邊。

### 4. 定期檢討
每週檢討哪些檢查項目經常遺漏，持續改進。

---

**記住：檢查清單是你的好朋友，不是負擔！養成習慣後，開發會更順暢！**
