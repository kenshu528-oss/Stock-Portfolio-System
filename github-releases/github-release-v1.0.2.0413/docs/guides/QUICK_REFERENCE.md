# 快速參考卡片 (Quick Reference Card)

## 🚀 開發三步驟

```bash
# 1️⃣ 開發前：查看相關規則
npm run dev:assistant

# 2️⃣ 開發中：遵循規則，使用 logger

# 3️⃣ 提交前：執行完整檢查
npm run check:all
```

---

## 📋 常用命令

```bash
# 開發助手（查看需要注意的規則）
npm run dev:assistant

# 完整檢查（提交前必須執行）
npm run check:all

# 針對性檢查
npm run check:svg        # SVG 格式
npm run check:version    # 版本號一致性
npm run check:state      # 狀態管理
npm run check:rights     # 除權息計算
```

---

## ⚡ 快速檢查清單

### 修改 UI 組件
- [ ] 使用 `Icons.tsx` 中的圖示組件
- [ ] SVG path 以 `M` 開頭
- [ ] 遵循顏色規範（綠色確認、紅色取消）

### 修改狀態管理
- [ ] 更新 `partialize` 包含新狀態
- [ ] 考慮 localStorage 版本遷移
- [ ] 測試頁面重載（F5）

### 修改除權息
- [ ] 使用 `RightsEventService.processStockRightsEvents`
- [ ] 傳入 `forceRecalculate` 參數
- [ ] 除權息記錄按時間從舊到新排序

### 修改 API
- [ ] 優先使用 FinMind API（一般股票）
- [ ] 優先使用 Yahoo Finance（債券 ETF）
- [ ] 不提供虛假資料，404 返回 null

### 更新版本
- [ ] 同步更新三個檔案（package.json, version.ts, changelog.ts）
- [ ] 執行 `npm run check:version`
- [ ] 執行 `npm run build`

---

## 🚨 常見錯誤快速修復

| 錯誤 | 快速修復 |
|-----|---------|
| SVG path 格式錯誤 | 確保 path 以 `M` 開頭 |
| 版本號不一致 | 執行 `npm run check:version` 找出差異 |
| 狀態無法持久化 | 檢查 `partialize` 是否包含該狀態 |
| 除權息計算不一致 | 確保傳入 `forceRecalculate: true` |
| Console log 過多 | 使用 logger 系統，註解掉高頻日誌 |

---

## 💡 記住這些原則

1. **使用 logger 而非 console.log**
   ```typescript
   logger.debug('module', 'message', { data });
   ```

2. **疊加式開發，不破壞現有功能**
   ```typescript
   const enhanced = () => {
     const result = existing(); // 保留
     return enhance(result);    // 添加
   };
   ```

3. **完整的錯誤處理**
   ```typescript
   try {
     const result = await operation();
     if (!result) throw new Error('失敗');
     return result;
   } catch (error) {
     logger.error('module', '失敗', error);
     return null;
   }
   ```

4. **API 資料完整性**
   ```typescript
   // ✅ 正確：API 失敗返回 null
   if (!apiData) return null;
   
   // ❌ 錯誤：提供虛假資料
   if (!apiData) return { name: '預設', price: 0 };
   ```

---

## 📚 詳細文檔

### 開發指南
- **完整開發流程**：`docs/guides/DEVELOPMENT_WORKFLOW.md`
- **開發檢查清單**：`docs/checklists/DEVELOPMENT_CHECKLIST.md`
- **BUG 預防流程**：`docs/guides/BUG_PREVENTION_WORKFLOW.md`

### STEERING 規則（10 個）

#### 核心規則（4 個）
- **API 標準**：`.kiro/steering/api-standards.md`
- **版本管理**：`.kiro/steering/version-management.md`
- **除權息計算**：`.kiro/steering/rights-calculation.md`
- **開發標準**：`.kiro/steering/development-standards.md`

#### 專項規則（6 個）
- **UI 設計**：`.kiro/steering/ui-design-standards.md`
- **狀態管理**：`.kiro/steering/state-management.md`
- **雲端同步**：`.kiro/steering/cloud-sync-development.md`
- **GitHub 授權**：`.kiro/steering/github-authorization.md`
- **倉庫隔離**：`.kiro/steering/repository-isolation.md`
- **備援恢復**：`.kiro/steering/backup-recovery.md`

---

**預防勝於修復！花 5 分鐘檢查，省下 50 分鐘修 BUG！**
