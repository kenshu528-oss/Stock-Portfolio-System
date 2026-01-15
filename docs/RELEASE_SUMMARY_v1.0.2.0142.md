# 版本發布摘要 v1.0.2.0142

## 📋 版本資訊

- **版本號**: v1.0.2.0142
- **發布日期**: 2026-01-15
- **類型**: Critical Fix（嚴重錯誤修復）
- **主要修復**: 切換損益模式失效問題（第3次）

## 🔥 關鍵修復

### 問題：切換損益模式按鈕失效

**現象**：
- 用戶點擊除權息模式切換按鈕
- 損益數字沒有變化
- 頁面重載後切換狀態丟失

**根本原因**：
```typescript
// ❌ 問題：partialize 沒有包含 rightsAdjustmentMode
partialize: (state) => ({
  currentAccount: state.currentAccount,
  accounts: state.accounts,
  stocks: state.stocks,
  isPrivacyMode: state.isPrivacyMode,
  // ❌ 缺少 rightsAdjustmentMode
})
```

**修復方案**：
```typescript
// ✅ 修復：添加 rightsAdjustmentMode 到 partialize
partialize: (state) => ({
  currentAccount: state.currentAccount,
  accounts: state.accounts,
  stocks: state.stocks,
  isPrivacyMode: state.isPrivacyMode,
  rightsAdjustmentMode: state.rightsAdjustmentMode, // ✅ 添加
})
```

## 🔧 技術改進

### 1. 更新 localStorage 版本號

```typescript
// v6 → v7
name: 'stock-portfolio-storage-v7'
```

### 2. 添加狀態清理邏輯

```typescript
onRehydrateStorage: () => (state, error) => {
  if (state) {
    // 清理舊版本遺留狀態
    if ((state as any).includeDividendInGainLoss !== undefined) {
      delete (state as any).includeDividendInGainLoss;
    }
    
    // 確保新狀態存在
    if (!state.rightsAdjustmentMode) {
      state.rightsAdjustmentMode = 'excluding_rights';
    }
  }
}
```

### 3. 改進狀態恢復日誌

```typescript
logger.info('global', '數據恢復成功', {
  accounts: state.accounts?.length || 0,
  stocks: state.stocks?.length || 0,
  rightsAdjustmentMode: state.rightsAdjustmentMode
});
```

## 📊 問題檢討

### 為什麼相同問題一再發生？

#### 歷史記錄
1. **v1.0.2.0133** - 第1次：移除 `includeDividendInGainLoss` 但未清理 localStorage
2. **v1.0.2.0142** - 第2次：`partialize` 沒有包含 `rightsAdjustmentMode`

#### 根本原因
- ❌ 缺少狀態變更檢查清單
- ❌ 缺少 localStorage 版本管理規範
- ❌ 缺少狀態遷移機制
- ❌ 缺少自動化測試

### 預防措施

#### 1. 建立 STEERING 規則
創建 `state-management.md` 規範：
- 狀態變更檢查清單
- persist 配置規範
- localStorage 版本管理
- 測試規範

#### 2. 開發工具
添加瀏覽器 Console 調試工具：
```javascript
window.debugAppStore.getState()
window.debugAppStore.validateState()
window.debugAppStore.clearStorage()
```

#### 3. 檢查清單
每次修改 AppState 時必須確認：
- [ ] 是否更新了 `partialize` 函數？
- [ ] 是否更新了 localStorage 版本號？
- [ ] 是否添加了狀態遷移邏輯？
- [ ] 是否測試了頁面重載？

## 📝 相關文件

### 新增文件
1. `docs/TOGGLE_RIGHTS_MODE_FIX_v1.0.2.0142.md` - 問題分析與修復方案
2. `.kiro/steering/state-management.md` - 狀態管理規範（新 STEERING 規則）

### 修改文件
1. `src/stores/appStore.ts` - 更新 persist 配置
2. `src/constants/version.ts` - 版本號 141 → 142
3. `src/constants/changelog.ts` - 添加 v1.0.2.0142 記錄
4. `package.json` - 版本號 1.0.2.0141 → 1.0.2.0142

## ✅ 驗證步驟

### 自動化檢查
```bash
npm run check:all
```
- ✅ SVG path 格式檢查通過
- ✅ 版本號一致性檢查通過

### 手動測試
1. ✅ 清除 localStorage
2. ✅ 重新載入頁面
3. ✅ 點擊除權息模式切換按鈕
4. ✅ 確認損益數字有變化
5. ✅ 重新載入頁面
6. ✅ 確認模式狀態正確保存

## 🎯 影響範圍

### 用戶影響
- **正面影響**: 切換損益模式功能恢復正常
- **負面影響**: 首次載入會清理舊版本狀態（自動遷移）

### 開發影響
- **新增規範**: 必須遵循 state-management.md 規則
- **新增工具**: 開發環境下可使用 debugAppStore 工具
- **新增檢查**: 狀態變更必須執行檢查清單

## 📚 學習要點

### 1. Zustand persist 機制
- `partialize` 決定哪些狀態需要持久化
- 遺漏欄位會導致狀態無法保存
- 頁面重載時會從 localStorage 恢復狀態

### 2. localStorage 版本管理
- 重大變更必須更新版本號
- 需要提供遷移邏輯處理舊版本
- 錯誤處理要優雅降級

### 3. 狀態管理最佳實踐
- 最小化持久化：只保存必要狀態
- 扁平化結構：避免深層嵌套
- 向後相容：新增欄位提供預設值
- 完整測試：包含頁面重載測試

## 🔗 相關版本

- **v1.0.2.0133** - 第1次修復：移除 includeDividendInGainLoss
- **v1.0.2.0141** - 改進債券 ETF 識別邏輯
- **v1.0.2.0142** - 第2次修復：persist 配置缺失（本版本）

## 📞 後續行動

### 短期（本週）
- [ ] 監控用戶反饋
- [ ] 檢查 Console 錯誤日誌
- [ ] 驗證狀態遷移是否順利

### 中期（本月）
- [ ] 實作自動化測試
- [ ] 添加狀態健康檢查
- [ ] 完善開發工具

### 長期（本季）
- [ ] 建立狀態版本管理系統
- [ ] 實作狀態遷移框架
- [ ] 完善 STEERING 規則體系

---

**遵循 STEERING 規則**：
- ✅ version-consistency.md - 版本號同步更新
- ✅ code-quality-standards.md - 執行完整檢查
- ✅ safe-development.md - 疊加式改進
- ✅ state-management.md - 新增狀態管理規範（本版本創建）
