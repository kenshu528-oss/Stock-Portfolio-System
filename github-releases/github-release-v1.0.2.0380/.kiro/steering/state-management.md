# 狀態管理規範 (State Management Standards)

## 🎯 核心原則：狀態變更必須同步更新持久化配置

### 絕對要求的規範
- ✅ **修改 AppState 必須更新 partialize**：新增或移除狀態變數時必須同步更新
- ✅ **重大變更必須更新版本號**：localStorage key 版本號必須遞增
- ✅ **必須實作狀態遷移**：提供 migrate 或 onRehydrateStorage 處理舊版本
- ✅ **必須測試頁面重載**：確保狀態正確持久化和恢復

## 🚨 歷史問題回顧

### 問題 1：切換損益模式失效（v1.0.2.0133）
**原因**：移除 `includeDividendInGainLoss` 但未清理 localStorage  
**影響**：舊狀態殘留，導致邏輯混亂  
**修復**：v1.0.2.0133 移除相關代碼

### 問題 2：切換損益模式失效（v1.0.2.0142）
**原因**：`partialize` 沒有包含 `rightsAdjustmentMode`  
**影響**：切換後狀態無法持久化，頁面重載後丟失  
**修復**：v1.0.2.0142 更新 persist 配置

### 根本原因
❌ **缺少狀態變更檢查清單**  
❌ **缺少 localStorage 版本管理**  
❌ **缺少狀態遷移機制**  
❌ **缺少自動化測試**

## 📋 狀態變更檢查清單

### 每次修改 AppState 時必須確認

#### 1. 新增狀態變數
- [ ] 是否需要持久化？
- [ ] 是否添加到 `partialize` 函數？
- [ ] 是否設定了合理的初始值？
- [ ] 是否添加了對應的 action？
- [ ] 是否測試了頁面重載？

#### 2. 移除狀態變數
- [ ] 是否從 `partialize` 移除？
- [ ] 是否更新了 localStorage 版本號？
- [ ] 是否添加了清理邏輯（onRehydrateStorage）？
- [ ] 是否移除了相關的 action？
- [ ] 是否測試了舊資料遷移？

#### 3. 修改狀態變數
- [ ] 是否影響持久化格式？
- [ ] 是否需要資料遷移？
- [ ] 是否更新了初始值？
- [ ] 是否測試了向後相容性？

## 🔧 persist 配置規範

### 標準配置結構

```typescript
persist(
  (set, get) => ({ ...actions }),
  {
    name: 'stock-portfolio-storage-v7', // ⚠️ 版本號管理
    
    // ⚠️ 關鍵：只持久化需要的狀態
    partialize: (state) => ({
      // 帳戶相關
      currentAccount: state.currentAccount,
      accounts: state.accounts,
      
      // 股票相關
      stocks: state.stocks,
      
      // UI 設定
      isPrivacyMode: state.isPrivacyMode,
      rightsAdjustmentMode: state.rightsAdjustmentMode, // ⚠️ 必須包含
      
      // 其他需要持久化的狀態...
    }),
    
    // ⚠️ 關鍵：處理舊版本狀態
    onRehydrateStorage: () => (state, error) => {
      if (error) {
        // 清除損壞的數據
        localStorage.removeItem('stock-portfolio-storage-v6');
        localStorage.removeItem('stock-portfolio-storage-v7');
        return;
      }
      
      if (state) {
        // 清理舊版本遺留狀態
        if ((state as any).oldField !== undefined) {
          delete (state as any).oldField;
        }
        
        // 確保新狀態存在
        if (!state.newField) {
          state.newField = defaultValue;
        }
        
        // 恢復日期對象等特殊類型...
      }
    },
  }
)
```

### partialize 規則

#### ✅ 應該持久化的狀態
- 用戶資料（accounts, stocks）
- 用戶設定（isPrivacyMode, rightsAdjustmentMode）
- 重要的應用狀態（currentAccount）

#### ❌ 不應該持久化的狀態
- UI 臨時狀態（isSidebarOpen, isMenuOpen）
- 載入狀態（isUpdatingPrices, isLoading）
- 計算結果（可以從其他狀態計算得出）
- 快取資料（應該重新獲取）

## 📊 localStorage 版本管理

### 版本號命名規則

```
stock-portfolio-storage-v{VERSION}
```

**範例**：
- `stock-portfolio-storage-v6` - 舊版本
- `stock-portfolio-storage-v7` - 當前版本

### 何時更新版本號

#### 必須更新（Breaking Changes）
- ✅ 移除狀態變數
- ✅ 修改狀態結構（如物件改為陣列）
- ✅ 修改資料格式（如日期格式變更）

#### 可以不更新（Non-Breaking Changes）
- ✅ 新增狀態變數（有預設值）
- ✅ 新增 action（不影響狀態結構）
- ✅ 修改計算邏輯（不影響持久化）

### 版本遷移策略

```typescript
// 方法 1：在 onRehydrateStorage 中處理
onRehydrateStorage: () => (state, error) => {
  if (state) {
    // v6 → v7: 移除 includeDividendInGainLoss
    if ((state as any).includeDividendInGainLoss !== undefined) {
      delete (state as any).includeDividendInGainLoss;
    }
    
    // 確保新欄位存在
    if (!state.rightsAdjustmentMode) {
      state.rightsAdjustmentMode = 'excluding_rights';
    }
  }
}

// 方法 2：使用 migrate 函數（更進階）
migrate: (persistedState: any, version: number) => {
  if (version < 7) {
    // v6 → v7 遷移邏輯
    delete persistedState.includeDividendInGainLoss;
    if (!persistedState.rightsAdjustmentMode) {
      persistedState.rightsAdjustmentMode = 'excluding_rights';
    }
  }
  return persistedState;
}
```

## 🧪 測試規範

### 單元測試

```typescript
describe('AppStore persist', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  
  it('should persist rightsAdjustmentMode', () => {
    const { result } = renderHook(() => useAppStore());
    
    // 切換模式
    act(() => {
      result.current.toggleRightsAdjustmentMode();
    });
    
    // 驗證狀態
    expect(result.current.rightsAdjustmentMode).toBe('including_rights');
    
    // 模擬頁面重載
    const persistedState = JSON.parse(
      localStorage.getItem('stock-portfolio-storage-v7') || '{}'
    );
    
    // 驗證持久化
    expect(persistedState.state.rightsAdjustmentMode).toBe('including_rights');
  });
  
  it('should migrate from v6 to v7', () => {
    // 設定舊版本資料
    const oldState = {
      state: {
        accounts: [],
        stocks: [],
        includeDividendInGainLoss: true, // 舊欄位
      },
      version: 6
    };
    localStorage.setItem('stock-portfolio-storage-v6', JSON.stringify(oldState));
    
    // 載入 store
    const { result } = renderHook(() => useAppStore());
    
    // 驗證遷移
    expect((result.current as any).includeDividendInGainLoss).toBeUndefined();
    expect(result.current.rightsAdjustmentMode).toBe('excluding_rights');
  });
});
```

### 手動測試步驟

#### 測試 1：狀態持久化
1. 修改狀態（如切換除權息模式）
2. 重新載入頁面（F5）
3. 確認狀態正確恢復

#### 測試 2：舊版本遷移
1. 清除 localStorage
2. 手動設定舊版本資料
3. 重新載入頁面
4. 確認資料正確遷移

#### 測試 3：錯誤處理
1. 手動破壞 localStorage 資料
2. 重新載入頁面
3. 確認自動清除並使用預設值

## 🛠️ 開發工具

### 瀏覽器 Console 工具

```typescript
// 開發環境下暴露狀態管理工具
if (process.env.NODE_ENV === 'development') {
  (window as any).debugAppStore = {
    // 獲取當前狀態
    getState: () => useAppStore.getState(),
    
    // 清除 localStorage
    clearStorage: () => {
      localStorage.removeItem('stock-portfolio-storage-v7');
      window.location.reload();
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
      
      if (!state.accounts) issues.push('缺少 accounts');
      if (!state.stocks) issues.push('缺少 stocks');
      if (!state.rightsAdjustmentMode) issues.push('缺少 rightsAdjustmentMode');
      if ((state as any).includeDividendInGainLoss !== undefined) {
        issues.push('存在舊欄位 includeDividendInGainLoss');
      }
      
      return issues.length === 0 ? '✅ 狀態正常' : `❌ 發現問題: ${issues.join(', ')}`;
    },
  };
  
  console.log('🔧 開發工具已載入：window.debugAppStore');
}
```

### 使用範例

```javascript
// 在瀏覽器 Console 中執行

// 查看當前狀態
window.debugAppStore.getState()

// 查看持久化的狀態
window.debugAppStore.getPersistedState()

// 驗證狀態
window.debugAppStore.validateState()

// 清除 localStorage 並重載
window.debugAppStore.clearStorage()
```

## 📚 最佳實踐

### 1. 狀態設計原則
- **最小化持久化**：只持久化必要的狀態
- **扁平化結構**：避免深層嵌套
- **可序列化**：避免使用 Function、Symbol 等不可序列化類型
- **向後相容**：新增欄位提供預設值

### 2. 版本管理原則
- **語義化版本**：重大變更遞增版本號
- **保留舊版本**：至少保留一個版本的遷移邏輯
- **文檔化變更**：在 changelog 記錄版本變更

### 3. 錯誤處理原則
- **優雅降級**：localStorage 失敗時使用記憶體狀態
- **自動恢復**：損壞資料自動清除並使用預設值
- **日誌記錄**：記錄遷移和錯誤資訊

## 🎯 檢討與改進

### 為什麼相同問題一再發生？

#### 根本原因
1. **缺少系統化流程**：沒有強制執行的檢查清單
2. **缺少自動化檢查**：沒有測試覆蓋持久化邏輯
3. **缺少文檔規範**：沒有明確的狀態管理指南

#### 改進措施
1. **建立此 STEERING 規則**：明確規範和流程
2. **添加檢查清單**：每次變更必須檢查
3. **實作自動化測試**：覆蓋持久化邏輯
4. **Code Review 重點**：檢查 persist 配置

### 預防未來問題

#### 開發階段
- [ ] 遵循狀態變更檢查清單
- [ ] 執行手動測試步驟
- [ ] 使用開發工具驗證

#### Code Review 階段
- [ ] 檢查 partialize 是否更新
- [ ] 檢查版本號是否需要更新
- [ ] 檢查是否有遷移邏輯
- [ ] 檢查是否有測試覆蓋

#### 發布階段
- [ ] 在 changelog 記錄狀態變更
- [ ] 提醒用戶可能需要清除快取
- [ ] 監控錯誤日誌

---

**制定日期**: 2026-01-15  
**版本**: 1.0.0  
**觸發原因**: v1.0.2.0142 修復切換損益模式失效問題（第3次）  
**目標**: 預防狀態管理相關問題再次發生
