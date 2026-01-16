# 切換損益模式失效問題分析與修復 - v1.0.2.0142

## 🔍 問題分析

### 問題現象
用戶點擊除權息模式切換按鈕後，損益數字沒有變化，切換功能失效。

### 根本原因
**localStorage 持久化問題**：

1. **舊版本遺留狀態**：v1.0.2.0133 已移除 `includeDividendInGainLoss`，但 localStorage 中仍保存著舊狀態
2. **persist 配置未更新**：`partialize` 函數沒有包含 `rightsAdjustmentMode`，導致切換後狀態無法持久化
3. **狀態恢復衝突**：頁面重載時，localStorage 恢復舊狀態，覆蓋了新的 `rightsAdjustmentMode`

### 為什麼相同問題一再發生？

#### 1. **缺少持久化配置檢查**
每次修改狀態結構時，沒有檢查 `partialize` 函數是否需要更新。

#### 2. **缺少 localStorage 版本管理**
`storage-v6` 版本號沒有在移除 `includeDividendInGainLoss` 時更新為 `v7`，導致舊資料殘留。

#### 3. **缺少狀態遷移機制**
沒有實作 `migrate` 函數來處理舊版本狀態到新版本的轉換。

## 🔧 修復方案

### 修復 1：更新 persist 配置

```typescript
// appStore.ts
persist(
  (set, get) => ({ ...actions }),
  {
    name: 'stock-portfolio-storage-v7', // ⚠️ 更新版本號
    partialize: (state) => ({
      currentAccount: state.currentAccount,
      accounts: state.accounts,
      stocks: state.stocks,
      isPrivacyMode: state.isPrivacyMode,
      rightsAdjustmentMode: state.rightsAdjustmentMode, // ⚠️ 添加此行
      lastPriceUpdate: state.lastPriceUpdate,
    }),
    migrate: (persistedState: any, version: number) => {
      // 移除舊的 includeDividendInGainLoss
      if (persistedState.includeDividendInGainLoss !== undefined) {
        delete persistedState.includeDividendInGainLoss;
      }
      // 確保有 rightsAdjustmentMode
      if (!persistedState.rightsAdjustmentMode) {
        persistedState.rightsAdjustmentMode = 'excluding_rights';
      }
      return persistedState;
    },
  }
)
```

### 修復 2：清理舊 localStorage

```typescript
// 在 onRehydrateStorage 中添加清理邏輯
onRehydrateStorage: () => (state, error) => {
  if (error) {
    // 清除損壞的數據
    localStorage.removeItem('stock-portfolio-storage-v6');
    localStorage.removeItem('stock-portfolio-storage-v7');
    return;
  }
  
  if (state) {
    // 清理舊版本遺留的狀態
    if ((state as any).includeDividendInGainLoss !== undefined) {
      delete (state as any).includeDividendInGainLoss;
    }
    
    // 確保有正確的 rightsAdjustmentMode
    if (!state.rightsAdjustmentMode) {
      state.rightsAdjustmentMode = 'excluding_rights';
    }
  }
}
```

## 📋 預防措施

### 1. 建立狀態變更檢查清單

每次修改 AppState 時必須檢查：
- [ ] 是否更新了 `partialize` 函數？
- [ ] 是否更新了 localStorage 版本號？
- [ ] 是否添加了 `migrate` 函數？
- [ ] 是否測試了頁面重載後的狀態恢復？

### 2. 建立 STEERING 規則

創建 `state-management.md` 規範：
- 狀態變更流程
- persist 配置規範
- localStorage 版本管理
- 狀態遷移最佳實踐

### 3. 添加自動化測試

```typescript
// tests/appStore.test.ts
describe('AppStore persist', () => {
  it('should persist rightsAdjustmentMode', () => {
    const { result } = renderHook(() => useAppStore());
    
    act(() => {
      result.current.toggleRightsAdjustmentMode();
    });
    
    // 模擬頁面重載
    const persistedState = JSON.parse(
      localStorage.getItem('stock-portfolio-storage-v7') || '{}'
    );
    
    expect(persistedState.state.rightsAdjustmentMode).toBe('including_rights');
  });
});
```

## 🎯 長期解決方案

### 1. 實作狀態版本管理系統

```typescript
const STATE_VERSION = 7;

interface PersistedState {
  version: number;
  state: AppState;
}

const migrations = {
  6: (state: any) => {
    // v6 → v7: 移除 includeDividendInGainLoss
    delete state.includeDividendInGainLoss;
    if (!state.rightsAdjustmentMode) {
      state.rightsAdjustmentMode = 'excluding_rights';
    }
    return state;
  },
  // 未來的遷移...
};
```

### 2. 建立狀態健康檢查

```typescript
function validateState(state: any): boolean {
  // 檢查必要欄位
  if (!state.accounts || !Array.isArray(state.accounts)) return false;
  if (!state.stocks || !Array.isArray(state.stocks)) return false;
  if (!state.rightsAdjustmentMode) return false;
  
  // 檢查不應該存在的舊欄位
  if (state.includeDividendInGainLoss !== undefined) return false;
  
  return true;
}
```

### 3. 添加開發工具

```typescript
// 開發環境下暴露狀態管理工具
if (process.env.NODE_ENV === 'development') {
  (window as any).debugAppStore = {
    getState: () => useAppStore.getState(),
    clearStorage: () => {
      localStorage.removeItem('stock-portfolio-storage-v7');
      window.location.reload();
    },
    validateState: () => validateState(useAppStore.getState()),
  };
}
```

## 📊 修復驗證

### 測試步驟
1. 清除 localStorage
2. 重新載入頁面
3. 點擊除權息模式切換按鈕
4. 確認損益數字有變化
5. 重新載入頁面
6. 確認模式狀態正確保存

### 預期結果
- ✅ 切換按鈕立即生效
- ✅ 損益數字正確變化
- ✅ 頁面重載後狀態正確恢復
- ✅ 無 localStorage 錯誤

---

**制定日期**: 2026-01-15  
**版本**: v1.0.2.0142  
**問題類型**: Critical - 功能失效  
**根本原因**: localStorage 持久化配置缺失
