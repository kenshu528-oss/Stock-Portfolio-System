# 服務狀態管理規範 (Service State Management Standards)

> 基於 v1.0.2.0348 Stock List 自動更新問題修復經驗制定

## 🎯 核心原則

### 狀態持久化安全性
- ✅ **載入時重置臨時狀態**：`isUpdating`, `isLoading` 等臨時狀態必須在載入時重置
- ✅ **異常恢復機制**：服務必須能從異常中斷中自動恢復
- ✅ **狀態驗證**：載入持久化狀態時必須驗證合理性

## 🚨 常見問題與解決方案

### 問題 1：服務狀態永久卡住
**症狀**：
- 服務顯示"正在進行中"但實際沒有執行
- 所有後續操作被跳過
- 重新載入頁面問題依然存在

**根本原因**：
- 臨時狀態（如 `isUpdating: true`）被錯誤地持久化
- 異常中斷時 `finally` 區塊未執行，狀態未重置
- 載入時沒有驗證狀態合理性

**解決方案**：
```typescript
// ✅ 正確：載入時重置臨時狀態
private loadStatus(): void {
  try {
    const saved = localStorage.getItem(this.STATUS_KEY);
    if (saved) {
      const savedStatus = JSON.parse(saved);
      // 🔧 關鍵：強制重置臨時狀態
      savedStatus.isUpdating = false;
      savedStatus.isLoading = false;
      this.status = { ...this.status, ...savedStatus };
    }
  } catch (error) {
    logger.debug('service', '載入狀態失敗', error);
  }
}
```

### 問題 2：API 成功但邏輯判斷錯誤
**症狀**：
- API 返回 200 OK 且數據正確
- 但服務仍報告操作失敗
- 後續邏輯未正確執行

**根本原因**：
- 成功分支後繼續執行失敗邏輯
- 缺少正確的 `return` 語句
- 錯誤的控制流程設計

**解決方案**：
```typescript
// ✅ 正確：明確的控制流程
async function apiOperation(): Promise<boolean> {
  try {
    const response = await fetch(url, options);
    
    if (response.ok) {
      const result = await response.json();
      logger.success('service', '操作成功', result);
      return true; // 🔧 關鍵：成功時立即返回
    } else {
      logger.warn('service', '操作失敗', { status: response.status });
      return false; // 🔧 關鍵：失敗時立即返回
    }
  } catch (error) {
    logger.error('service', '操作異常', error);
    return false; // 🔧 關鍵：異常時返回失敗
  }
  // 🚫 不應該有無條件執行的代碼
}
```

## 📋 開發檢查清單

### 每次實作服務狀態管理時必須確認
- [ ] 臨時狀態（isUpdating, isLoading）不會被持久化
- [ ] 載入狀態時重置所有臨時狀態
- [ ] 異常處理有完整的 try-catch-finally
- [ ] 控制流程有明確的 return 語句
- [ ] 提供狀態重置的調試方法

### 測試檢查
- [ ] 模擬異常中斷，確保服務能恢復
- [ ] 測試 localStorage 損壞情況
- [ ] 驗證 API 成功和失敗的不同路徑
- [ ] 確認狀態持久化不包含臨時狀態

## 🛠️ 調試工具標準

### 開發環境必須提供
```typescript
// 開發環境下暴露調試工具
if (process.env.NODE_ENV === 'development') {
  (window as any).serviceDebugTools = {
    // 獲取當前狀態
    getStatus: () => this.getStatus(),
    
    // 重置狀態
    resetStatus: () => {
      this.status.isUpdating = false;
      this.status.isLoading = false;
      this.saveStatus();
    },
    
    // 清除持久化狀態
    clearStorage: () => {
      localStorage.removeItem(this.STATUS_KEY);
      this.loadStatus();
    }
  };
}
```

## 💡 最佳實踐

### 狀態設計原則
1. **分離持久化和臨時狀態**：只持久化需要跨會話保存的狀態
2. **載入時驗證**：檢查載入的狀態是否合理
3. **異常恢復**：設計自動恢復機制
4. **調試友好**：提供狀態檢查和重置工具

### 錯誤處理原則
1. **明確的控制流程**：每個分支都有明確的返回值
2. **完整的異常處理**：try-catch-finally 覆蓋所有可能
3. **狀態一致性**：確保異常時狀態能正確重置
4. **用戶友好**：提供清楚的錯誤信息和恢復建議

---

**制定日期**: 2026-01-27  
**版本**: 1.0.0  
**觸發原因**: v1.0.2.0348 修復 Stock List 自動更新狀態卡住問題  
**目標**: 預防服務狀態管理相關問題
