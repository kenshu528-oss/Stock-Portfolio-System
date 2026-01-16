# 通用雲端同步開發標準 (Universal Cloud Sync Development Standards)

## 🎯 適用範圍

本規範適用於所有需要整合外部 API 進行資料同步的 KIRO 專案，包括但不限於：
- 雲端儲存服務整合 (Google Drive, Dropbox, GitHub Gist)
- 資料庫同步功能
- 第三方 API 資料導入
- 跨平台資料同步

## 📋 核心原則

### 1. 統一資料流原則
```typescript
// ✅ 正確：使用統一的資料導入方法
const importData = (data: any[], mode: 'replace' | 'merge' = 'replace') => {
  // 統一的資料處理邏輯
};

// ❌ 錯誤：多個入口使用不同的處理邏輯
data.forEach(item => addItem(item)); // 入口 A
store.bulkInsert(data);              // 入口 B
```

### 2. 自動容錯原則
```typescript
// ✅ 正確：不依賴本地狀態，能自動恢復
const syncData = async (apiToken: string) => {
  const result = await apiService.autoDiscoverData(apiToken);
  return result;
};

// ❌ 錯誤：依賴本地狀態
const localId = localStorage.getItem('syncId');
if (!localId) throw new Error('找不到同步資料');
```

### 3. 多入口一致性原則
```typescript
// ✅ 正確：所有同步入口使用相同的處理函數
const handleDataSync = (data: any) => {
  // 統一的同步邏輯
};

// 初始設定使用
<InitialSetup onDataSync={handleDataSync} />

// 設定頁面使用  
<SyncSettings onDataSync={handleDataSync} />
```

## 🛡️ 錯誤處理標準

### 必須實作的錯誤處理模式
```typescript
const syncOperation = async () => {
  try {
    setLoading(true);
    setError(null);
    
    const result = await externalApiCall();
    
    if (!result.success) {
      throw new Error(result.error || '操作失敗');
    }
    
    // 成功處理
    await handleSuccess(result.data);
    setStatus('success');
    
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知錯誤';
    setError(message);
    setStatus('error');
    
    // 用戶友好的錯誤處理
    showUserFriendlyError(message);
    
  } finally {
    setLoading(false);
  }
};
```

### 狀態管理要求
- **Loading 狀態**：每個異步操作必須有載入指示
- **錯誤狀態**：提供具體的錯誤信息和恢復建議
- **成功狀態**：明確的成功反饋和後續操作指引

## 🔄 用戶體驗標準

### 同步後的自動化操作
1. **狀態重置**：自動切換到合適的初始狀態
2. **資料驗證**：確保同步的資料完整性
3. **UI 更新**：確保介面正確反映新狀態
4. **操作記錄**：記錄同步操作的詳細日誌

### 用戶確認機制
```typescript
const confirmSync = (syncData: any) => {
  const message = `
    發現外部資料：
    
    項目數量: ${syncData.items?.length || 0}
    最後更新: ${new Date(syncData.lastModified).toLocaleString()}
    
    是否要同步這些資料？
  `;
  
  return confirm(message);
};
```

## 🚫 禁止的做法

### 絕對禁止
- ❌ **依賴本地狀態**：不能依賴 localStorage 或其他本地狀態
- ❌ **手動資料操作**：不能繞過統一的資料處理方法
- ❌ **不一致的邏輯**：不同入口使用不同的處理邏輯
- ❌ **缺少錯誤處理**：任何異步操作都必須有錯誤處理
- ❌ **忽略用戶體驗**：同步後不自動更新狀態

### 常見錯誤模式
```typescript
// ❌ 錯誤：依賴本地狀態
const localConfig = localStorage.getItem('syncConfig');
if (!localConfig) throw new Error('找不到配置');

// ❌ 錯誤：手動逐一處理
data.forEach(item => store.addItem(item));

// ❌ 錯誤：缺少錯誤處理
const result = await apiCall(); // 沒有 try-catch

// ❌ 錯誤：不一致的處理
// 入口 A
items.forEach(item => processItemA(item));
// 入口 B  
processAllItemsB(items);
```

## 📊 測試標準

### 必須測試的場景
- [ ] 正常同步流程
- [ ] 網路連線失敗
- [ ] API Token 無效
- [ ] 外部服務無資料
- [ ] 資料格式錯誤
- [ ] 部分同步失敗
- [ ] 用戶取消操作

### 測試檢查清單
```typescript
describe('Data Sync', () => {
  it('should handle successful sync', async () => {
    // 測試正常同步
  });
  
  it('should handle network errors gracefully', async () => {
    // 測試網路錯誤處理
  });
  
  it('should validate data format', async () => {
    // 測試資料格式驗證
  });
  
  it('should provide user-friendly error messages', async () => {
    // 測試錯誤信息友好性
  });
});
```

## 💡 實作模板

### 基本同步服務模板
```typescript
interface SyncService<T> {
  // 自動搜尋和下載資料
  downloadData(token: string): Promise<SyncResult<T>>;
  
  // 上傳資料到外部服務
  uploadData(token: string, data: T): Promise<SyncResult<void>>;
  
  // 測試連線和權限
  testConnection(token: string): Promise<ConnectionResult>;
}

interface SyncResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface ConnectionResult {
  valid: boolean;
  user?: any;
  error?: string;
}
```

### 統一同步處理函數模板
```typescript
const createSyncHandler = <T>(
  importData: (data: T[], mode: 'replace' | 'merge') => void,
  onStateChange?: (newState: any) => void
) => {
  return async (syncData: any) => {
    console.log('=== 開始資料同步 ===');
    
    try {
      if (!syncData || !Array.isArray(syncData.items)) {
        throw new Error('資料格式不正確');
      }
      
      // 使用統一的資料導入方法
      importData(syncData.items, 'replace');
      
      // 自動狀態切換
      if (onStateChange && syncData.items.length > 0) {
        onStateChange(syncData.items[0]);
      }
      
      console.log('=== 資料同步完成 ===');
      
      // 確保 UI 更新
      setTimeout(() => {
        window.location.reload();
      }, 500);
      
    } catch (error) {
      console.error('資料同步錯誤:', error);
      throw error;
    }
  };
};
```

## 🎯 適配指南

### 針對不同專案的適配
1. **替換 API 服務**：將 GitHub Gist 替換為專案需要的外部服務
2. **調整資料結構**：根據專案的資料模型調整介面定義
3. **自定義狀態切換**：根據專案需求實作狀態切換邏輯
4. **整合現有錯誤處理**：與專案現有的錯誤處理系統整合

### 配置範例
```typescript
// 專案 A：Google Drive 同步
const googleDriveSync = createSyncService({
  apiEndpoint: 'https://www.googleapis.com/drive/v3',
  authMethod: 'oauth2',
  dataFormat: 'json'
});

// 專案 B：自建 API 同步  
const customApiSync = createSyncService({
  apiEndpoint: 'https://api.myproject.com/sync',
  authMethod: 'bearer',
  dataFormat: 'json'
});
```

## 📋 實作檢查清單

### 開發階段
- [ ] 設計統一的資料流架構
- [ ] 實作完整的錯誤處理
- [ ] 確保多入口邏輯一致
- [ ] 添加詳細的調試日誌

### 測試階段  
- [ ] 測試所有正常和異常情況
- [ ] 驗證用戶體驗流程
- [ ] 確認錯誤信息友好性
- [ ] 檢查狀態管理正確性

### 部署階段
- [ ] 驗證在生產環境的穩定性
- [ ] 監控同步操作的成功率
- [ ] 收集用戶反饋
- [ ] 持續優化和改進

---

**版本**: v1.0  
**適用於**: 所有 KIRO 專案  
**維護**: 根據實際使用經驗持續更新