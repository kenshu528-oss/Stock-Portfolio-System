# 股票搜尋防抖修復測試

## 修復內容
- **版本**: v1.0.2.0145
- **問題**: 006208 等有效股票代碼在前端顯示 404 錯誤
- **原因**: 沒有防抖機制，並發請求導致時序混亂
- **修復**: 添加 300ms 防抖機制

## 測試步驟

### 1. 測試 006208（富邦台50）
- 在股票搜尋框輸入 "006208"
- **預期結果**: 顯示 "富邦台50" 股票資訊，價格約 160.35
- **修復前**: 顯示 404 錯誤
- **修復後**: 正常顯示股票資訊

### 2. 測試無效代碼
- 輸入 "0062" - 應該顯示 "找不到相關股票"
- 輸入 "00620" - 應該顯示 "找不到相關股票"

### 3. 測試防抖效果
- 快速輸入 "006208"
- **預期**: Console 只顯示一次 API 請求
- **修復前**: 顯示多次 404 請求
- **修復後**: 只有一次成功請求

## 技術細節

### 防抖機制實作
```typescript
const handleSearch = useCallback((query: string) => {
  setSearchQuery(query);
  
  // 清除之前的定時器
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }
  
  // 設置新的定時器（300ms 防抖）
  const newTimeout = setTimeout(() => {
    performSearch(query);
  }, 300);
  
  setSearchTimeout(newTimeout);
}, [searchTimeout]);
```

### 後端驗證
```bash
# 後端 API 實際能正常返回 006208 資料
curl http://localhost:3001/api/stock/006208
# 返回: {"symbol":"006208","name":"富邦台50","price":160.35,...}
```

## 遵循的 STEERING 規則
- ✅ **safe-development.md**: 疊加式開發，不破壞現有功能
- ✅ **code-quality-standards.md**: 添加防抖機制提升代碼質量
- ✅ **api-data-integrity.md**: 確保 API 請求的正確性
- ✅ **version-consistency.md**: 同步更新版本號

## 預期效果
- 解決 006208 等有效股票代碼的 404 錯誤
- 減少不必要的 API 請求
- 改善用戶搜尋體驗
- 降低伺服器負載