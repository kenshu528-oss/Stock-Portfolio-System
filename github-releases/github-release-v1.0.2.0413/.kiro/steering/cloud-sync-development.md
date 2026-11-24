# 雲端同步開發規範 (Cloud Sync Development Standards)

## 🎯 核心原則：簡化與一致性

### 絕對要求的設計原則
- ✅ **單一資料流**：所有雲端同步都使用相同的資料導入邏輯
- ✅ **自動容錯**：不依賴本地狀態，能自動尋找雲端資料
- ✅ **用戶體驗優先**：同步後自動切換到合適的狀態
- ✅ **錯誤處理完整**：每個步驟都有 try-catch 和用戶友好的錯誤信息

## 📋 雲端同步架構規範

### 1. 統一的資料導入方法
```typescript
// ✅ 正確：使用統一的 importData 方法
const { importData, setCurrentAccount } = useAppStore.getState();
importData(cloudData.accounts, cloudData.stocks || [], 'replace');

// 自動切換到第一個帳戶
if (cloudData.accounts.length > 0) {
  setCurrentAccount(cloudData.accounts[0].name);
}

// ❌ 錯誤：手動逐一添加資料
cloudData.accounts.forEach(account => addAccount(account));
```

### 2. 自動搜尋機制
```typescript
// ✅ 正確：使用自動搜尋，不依賴本地 gistId
const result = await GitHubGistService.downloadData(githubToken);

// ❌ 錯誤：依賴本地儲存的 gistId
const savedGistId = localStorage.getItem('gistId');
if (!savedGistId) throw new Error('找不到雲端資料');
```

### 3. 多入口統一邏輯
```typescript
// ✅ 所有雲端同步入口都使用相同的處理函數
const handleCloudDataSync = (cloudData: any) => {
  // 統一的處理邏輯
};

// 初始設定使用
<InitialSetup onDataSync={handleDataSync} />

// 雲端同步設定使用
<CloudSyncSettings onDataSync={handleCloudDataSync} />
```

## 🛡️ 錯誤處理標準

### 必須實作的錯誤處理
```typescript
try {
  // 雲端操作
  const result = await cloudOperation();
  
  if (!result.success) {
    throw new Error(result.error || '操作失敗');
  }
  
  // 成功處理
  handleSuccess(result.data);
  
} catch (error) {
  // 用戶友好的錯誤信息
  const message = error instanceof Error ? error.message : '未知錯誤';
  setStatusMessage(`❌ 操作失敗: ${message}`);
  addOperationLog('error', `操作失敗: ${message}`);
}
```

### 狀態管理規範
- **loading 狀態**：每個異步操作都要有 loading 指示
- **錯誤狀態**：清楚的錯誤信息和恢復建議
- **成功狀態**：明確的成功反饋和後續操作指引

## 🔄 用戶體驗規範

### 同步後的自動化操作
1. **自動切換帳戶**：切換到第一個有資料的帳戶
2. **隱私模式**：預設啟用隱私模式保護用戶資料
3. **頁面重載**：確保 React 狀態正確更新
4. **操作日誌**：記錄詳細的操作過程

### 用戶確認機制
```typescript
// ✅ 清楚的確認對話框
const confirmed = confirm(
  `發現雲端資料：\n\n` +
  `帳戶: ${cloudData.accounts?.length || 0} 個\n` +
  `股票: ${cloudData.stocks?.length || 0} 筆\n` +
  `更新時間: ${new Date(cloudData.gistInfo.updated_at).toLocaleString()}\n\n` +
  '是否要用雲端資料覆蓋本地資料？'
);
```

## 🚫 禁止的做法

### 絕對禁止
- ❌ **依賴本地狀態**：不能依賴 localStorage 中的 gistId 等
- ❌ **手動資料操作**：不能繞過 importData 方法
- ❌ **不一致的邏輯**：不同入口使用不同的處理邏輯
- ❌ **缺少錯誤處理**：任何異步操作都必須有錯誤處理
- ❌ **忽略用戶體驗**：同步後不自動切換狀態

### 常見錯誤範例
```typescript
// ❌ 錯誤：依賴本地狀態
const gistId = localStorage.getItem('gistId');
if (!gistId) throw new Error('找不到資料');

// ❌ 錯誤：手動添加資料
data.accounts.forEach(account => store.addAccount(account));

// ❌ 錯誤：缺少錯誤處理
const result = await cloudOperation(); // 沒有 try-catch
```

## 📊 測試檢查清單

### 每次雲端同步功能修改後必須測試
- [ ] 初始設定的雲端下載是否正常
- [ ] 右上角雲端同步是否正常
- [ ] 恢復預設值後是否能正常下載
- [ ] 下載後是否自動切換到第一個帳戶
- [ ] 隱私模式是否正確啟用
- [ ] 錯誤情況是否有友好的提示
- [ ] Console 是否有清楚的調試信息

### 邊界情況測試
- [ ] 沒有 GitHub Token 時的處理
- [ ] 網路連線失敗時的處理
- [ ] 雲端沒有資料時的處理
- [ ] 資料格式錯誤時的處理
- [ ] Token 無效時的處理

## 💡 最佳實踐

### 開發流程
1. **先設計統一的資料流**
2. **實作完整的錯誤處理**
3. **確保多入口邏輯一致**
4. **測試所有邊界情況**
5. **優化用戶體驗**

### 調試策略
- 使用詳細的 Console 日誌
- 每個步驟都有狀態反饋
- 錯誤信息要具體且可操作
- 提供恢復建議

## 🎯 設計目標

### 可靠性
- **100%** 的異步操作都有錯誤處理
- **自動恢復** 機制，不依賴本地狀態
- **一致性** 保證，所有入口邏輯相同

### 用戶體驗
- **零配置** 的雲端資料恢復
- **自動化** 的狀態切換
- **友好** 的錯誤提示和恢復指引

---

**記住：雲端同步是用戶最重要的功能之一，必須確保穩定可靠且用戶體驗良好！**