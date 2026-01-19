# 改進措施實施計畫

## 📋 總覽

本文檔說明如何導入 v1.0.2.0142 提出的四項改進措施，確保類似問題不再發生。

## 🎯 四項改進措施

### ✅ 1. 建立 state-management.md 規範
**狀態**: 已完成  
**位置**: `.kiro/steering/state-management.md`  
**內容**: 
- 狀態變更檢查清單
- persist 配置規範
- localStorage 版本管理
- 測試規範

**後續行動**: 無需額外操作，已納入 STEERING 規則

---

### 🔄 2. 添加狀態變更檢查清單
**狀態**: 部分完成（文檔已建立，需整合到開發流程）  
**優先級**: 高

#### 實施步驟

##### 步驟 1: 創建檢查清單文件（立即執行）
```bash
# 創建 .github/PULL_REQUEST_TEMPLATE.md
```

**內容**:
```markdown
## 變更類型
- [ ] 新功能
- [ ] Bug 修復
- [ ] 重構
- [ ] 文檔更新

## 狀態管理檢查（如有修改 AppState）
- [ ] 是否更新了 `partialize` 函數？
- [ ] 是否更新了 localStorage 版本號（如需要）？
- [ ] 是否添加了狀態遷移邏輯？
- [ ] 是否測試了頁面重載？
- [ ] 是否更新了 state-management.md 文檔？

## 測試
- [ ] 執行 `npm run check:all` 通過
- [ ] 手動測試通過
- [ ] 頁面重載測試通過

## 相關 Issue
關聯 Issue #
```

##### 步驟 2: 創建開發前檢查腳本（本週完成）
```bash
# 創建 scripts/check-state-changes.js
```

**功能**:
- 檢測 appStore.ts 是否有變更
- 自動提醒檢查 partialize
- 驗證版本號是否需要更新

##### 步驟 3: 整合到 Git Hooks（本週完成）
```bash
# 創建 .husky/pre-commit
```

**內容**:
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# 檢查狀態管理變更
node scripts/check-state-changes.js

# 執行完整檢查
npm run check:all
```

#### 預期效果
- ✅ 每次 PR 都有檢查清單提醒
- ✅ 提交前自動檢查狀態變更
- ✅ 減少人為疏忽

---

### 🛠️ 3. 提供開發工具（debugAppStore）
**狀態**: 未實作（文檔已完成）  
**優先級**: 中

#### 實施步驟

##### 步驟 1: 實作 debugAppStore 工具（本週完成）

**修改文件**: `src/stores/appStore.ts`

**添加位置**: 文件末尾，`export` 之後

```typescript
// Expose to window for debugging in development
if (typeof window !== 'undefined') {
  (window as any).useAppStore = useAppStore;
  
  // 🔧 開發工具：狀態管理調試
  if (process.env.NODE_ENV === 'development') {
    (window as any).debugAppStore = {
      // 獲取當前狀態
      getState: () => useAppStore.getState(),
      
      // 清除 localStorage
      clearStorage: () => {
        localStorage.removeItem('stock-portfolio-storage-v7');
        console.log('✅ localStorage 已清除，即將重新載入...');
        setTimeout(() => window.location.reload(), 500);
      },
      
      // 查看持久化的狀態
      getPersistedState: () => {
        const data = localStorage.getItem('stock-portfolio-storage-v7');
        return data ? JSON.parse(data) : null;
      },
      
      // 驗證狀態完整性
      validateState: () => {
        const state = useAppStore.getState();
        const issues = [];
        
        // 檢查必要欄位
        if (!state.accounts) issues.push('❌ 缺少 accounts');
        if (!state.stocks) issues.push('❌ 缺少 stocks');
        if (!state.rightsAdjustmentMode) issues.push('❌ 缺少 rightsAdjustmentMode');
        
        // 檢查不應該存在的舊欄位
        if ((state as any).includeDividendInGainLoss !== undefined) {
          issues.push('❌ 存在舊欄位 includeDividendInGainLoss');
        }
        
        if (issues.length === 0) {
          console.log('✅ 狀態正常');
          return true;
        } else {
          console.error('❌ 發現問題:');
          issues.forEach(issue => console.error('  ' + issue));
          return false;
        }
      },
      
      // 顯示幫助資訊
      help: () => {
        console.log(`
🔧 debugAppStore 開發工具

可用命令：
  debugAppStore.getState()          - 查看當前狀態
  debugAppStore.getPersistedState() - 查看持久化的狀態
  debugAppStore.validateState()     - 驗證狀態完整性
  debugAppStore.clearStorage()      - 清除 localStorage 並重載
  debugAppStore.help()              - 顯示此幫助資訊

範例：
  > debugAppStore.validateState()
  ✅ 狀態正常
  
  > debugAppStore.getState().rightsAdjustmentMode
  "excluding_rights"
        `);
      }
    };
    
    console.log('🔧 開發工具已載入：debugAppStore');
    console.log('   輸入 debugAppStore.help() 查看可用命令');
  }
}
```

##### 步驟 2: 創建使用指南（本週完成）

**創建文件**: `docs/DEV_TOOLS_GUIDE.md`

**內容**: 開發工具使用說明、常見問題排查

##### 步驟 3: 測試驗證（本週完成）

**測試項目**:
- [ ] 開發環境下 `debugAppStore` 可用
- [ ] 生產環境下不暴露工具
- [ ] 所有命令正常運作
- [ ] 幫助資訊清楚易懂

#### 預期效果
- ✅ 開發時快速檢查狀態
- ✅ 問題排查更容易
- ✅ 減少調試時間

---

### 📚 4. 記錄歷史問題和解決方案
**狀態**: 已完成  
**位置**: 
- `docs/TOGGLE_RIGHTS_MODE_FIX_v1.0.2.0142.md`
- `.kiro/steering/state-management.md`

**後續行動**: 持續更新

#### 維護計畫

##### 每次遇到問題時
1. 創建問題分析文檔（`docs/PROBLEM_FIX_vX.X.X.XXXX.md`）
2. 更新 STEERING 規則（如需要）
3. 在 changelog 中記錄

##### 每月檢討
1. 回顧本月問題
2. 分析共同模式
3. 更新預防措施

##### 每季總結
1. 統計問題類型
2. 評估改進效果
3. 調整開發流程

---

## 🗓️ 實施時間表

### 第1週（本週）- 高優先級
- [x] ✅ 建立 state-management.md 規範
- [ ] 🔄 實作 debugAppStore 工具
- [ ] 🔄 創建 PR 檢查清單模板
- [ ] 🔄 創建開發工具使用指南

### 第2週 - 中優先級
- [ ] 創建狀態變更檢查腳本
- [ ] 整合 Git Hooks
- [ ] 編寫自動化測試

### 第3-4週 - 低優先級
- [ ] 完善開發工具功能
- [ ] 建立問題追蹤系統
- [ ] 編寫最佳實踐文檔

---

## 📊 成功指標

### 短期（1個月）
- [ ] debugAppStore 工具投入使用
- [ ] PR 檢查清單 100% 執行
- [ ] 0 次狀態管理相關問題

### 中期（3個月）
- [ ] 自動化測試覆蓋率 > 80%
- [ ] 開發效率提升 20%
- [ ] 問題修復時間減少 50%

### 長期（6個月）
- [ ] 建立完整的狀態管理框架
- [ ] 形成團隊開發規範
- [ ] 問題預防率 > 95%

---

## 🎯 立即可執行的行動

### 1. 實作 debugAppStore（30分鐘）
```bash
# 1. 打開 src/stores/appStore.ts
# 2. 在文件末尾添加開發工具代碼（見上方）
# 3. 測試驗證
npm run dev
# 在瀏覽器 Console 輸入：debugAppStore.help()
```

### 2. 創建 PR 模板（10分鐘）
```bash
# 1. 創建 .github 目錄
mkdir -p .github

# 2. 創建 PULL_REQUEST_TEMPLATE.md
# （內容見上方）

# 3. 提交
git add .github/PULL_REQUEST_TEMPLATE.md
git commit -m "添加 PR 檢查清單模板"
```

### 3. 創建開發工具指南（20分鐘）
```bash
# 1. 創建 docs/DEV_TOOLS_GUIDE.md
# 2. 記錄 debugAppStore 使用方法
# 3. 添加常見問題排查步驟
```

---

## 💡 建議優先順序

### 🔥 立即執行（今天）
1. **實作 debugAppStore 工具** - 最實用，立即提升開發效率
2. **創建 PR 檢查清單** - 最簡單，立即預防問題

### ⚡ 本週完成
3. **創建開發工具指南** - 確保團隊會使用
4. **測試驗證** - 確保工具正常運作

### 📅 本月完成
5. **整合 Git Hooks** - 自動化檢查
6. **編寫自動化測試** - 長期保障

---

## 🤝 團隊協作

### 開發者職責
- 遵循 state-management.md 規範
- 使用 debugAppStore 工具調試
- 填寫 PR 檢查清單

### Code Reviewer 職責
- 檢查 PR 清單是否完整
- 驗證狀態管理變更
- 確保測試覆蓋

### 維護者職責
- 定期更新 STEERING 規則
- 收集問題和反饋
- 改進開發工具

---

## 📞 需要幫助？

### 問題排查
1. 查看 `state-management.md` 規範
2. 使用 `debugAppStore.validateState()` 檢查
3. 查看 `docs/TOGGLE_RIGHTS_MODE_FIX_v1.0.2.0142.md`

### 聯繫方式
- 查看 STEERING 規則文檔
- 查看歷史問題修復記錄
- 使用開發工具自助排查

---

**制定日期**: 2026-01-15  
**版本**: 1.0.0  
**狀態**: 實施中  
**預計完成**: 2026-02-15
