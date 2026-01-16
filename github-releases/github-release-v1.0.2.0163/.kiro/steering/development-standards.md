# 開發標準規範 (Development Standards)

> 合併自：safe-development.md, code-quality-standards.md, console-log-management.md

## 🎯 核心原則

### 安全開發（疊加式）
- ✅ **疊加式開發**：只添加，不破壞現有功能
- ✅ **功能開關**：新功能可以安全地開啟/關閉
- ✅ **快速回滾**：出問題能立即恢復

### 代碼質量
- ✅ **提交前必須檢查**：執行 `npm run check:all`
- ✅ **自動化檢查**：使用腳本預防問題
- ✅ **遵循檢查清單**：每個功能開發完成後必須檢查

### 日誌管理
- ✅ **使用 logger 系統**：禁止直接使用 console.log
- ✅ **分級控制**：不同模組可設定不同 log 等級
- ✅ **預設簡潔**：平常只顯示重要訊息（INFO 等級）

---

## 🛡️ 安全開發規範

### 絕對禁止的操作
- ❌ **直接修改核心功能**：不能破壞現有的工作功能
- ❌ **大幅重構主程式**：避免影響穩定運行的代碼
- ❌ **刪除現有功能**：只能添加，不能移除
- ❌ **修改關鍵介面**：不能改變已穩定的 API 或組件介面

### 推薦的開發方式

#### 1. 疊加式功能添加
```typescript
// ✅ 好的方式：添加新功能
const existingFunction = () => {
  // 保持原有邏輯不變
  return originalLogic();
};

// 添加新的增強功能
const enhancedFunction = () => {
  const result = existingFunction();
  // 添加新功能
  return enhanceResult(result);
};
```

#### 2. 安全的功能整合
```typescript
// ✅ 安全的功能整合
const SafeComponent = () => {
  const [useNewFeature, setUseNewFeature] = useState(false);
  
  return (
    <div>
      {/* 保留原有功能 */}
      <OriginalFeature />
      
      {/* 可選的新功能 */}
      {useNewFeature && <NewFeature />}
      
      {/* 功能切換開關 */}
      <FeatureToggle onChange={setUseNewFeature} />
    </div>
  );
};
```

#### 3. 安全的錯誤處理
```typescript
// ✅ 安全的功能添加
const EnhancedImportFunction = () => {
  try {
    // 嘗試使用新功能
    return newImportLogic();
  } catch (error) {
    logger.warn('import', '新功能失敗，回退到原有功能');
    // 自動回退到原有功能
    return OriginalImportFunction();
  }
};
```

---

## 📋 代碼質量檢查

### 何時執行檢查

#### 必須執行完整檢查
```bash
npm run check:all
```

**執行時機**：
1. ✅ **提交代碼前**（最重要）
2. ✅ **完成一個功能後**
3. ✅ **修復 bug 後**
4. ✅ **更新版本號後**
5. ✅ **合併分支前**

#### 可以執行部分檢查
```bash
npm run check:svg      # 修改 UI 組件時
npm run check:version  # 更新版本時
npm run check:state    # 修改狀態管理時
npm run check:rights   # 修改除權息時
```

### 提交前檢查清單

#### 自動化檢查
- [ ] 執行 `npm run check:all` 通過
- [ ] 所有 TypeScript 錯誤已修復
- [ ] 所有測試通過
- [ ] SVG 格式正確
- [ ] 版本號一致

#### 手動檢查
- [ ] Console 無錯誤（開發環境正常警告除外）
- [ ] 功能測試通過
- [ ] UI 顯示正確
- [ ] 沒有破壞現有功能

#### 文檔更新
- [ ] 版本號已更新（如需要）
- [ ] Changelog 已更新（如需要）
- [ ] README 已更新（如需要）
- [ ] STEERING 規則已更新（如需要）

---

## 📊 Logger 系統使用規範

### Log 等級定義
```typescript
LogLevel.ERROR = 0   // 錯誤：必須顯示
LogLevel.WARN = 1    // 警告：重要提示
LogLevel.INFO = 2    // 資訊：一般訊息（預設）
LogLevel.DEBUG = 3   // 調試：詳細資訊
LogLevel.TRACE = 4   // 追蹤：超詳細資訊
```

### 模組分類
```typescript
'global'    // 全域通用
'dividend'  // 股息相關
'stock'     // 股票相關
'api'       // API 調用
'cloud'     // 雲端同步
'import'    // 匯入功能
'export'    // 匯出功能
'rights'    // 配股處理
```

### Logger 使用方式
```typescript
import { logger } from '../utils/logger';

// 錯誤訊息（總是顯示）
logger.error('dividend', '更新失敗', error);

// 警告訊息
logger.warn('api', 'API 回應慢', { time: 5000 });

// 一般訊息（預設顯示）
logger.info('stock', '股價更新完成', { count: 10 });

// 調試訊息（需開啟 DEBUG 等級）
logger.debug('dividend', '計算配股', { shares: 100 });

// 追蹤訊息（需開啟 TRACE 等級）
logger.trace('stock', '詳細資料', { fullData });

// 成功訊息
logger.success('import', '匯入完成', { accounts: 5 });
```

### 禁止的做法
```typescript
// ❌ 錯誤：直接使用 console.log
console.log('🔍 開始處理...', fullData);

// ❌ 錯誤：過度詳細
console.log('步驟1', data1);
console.log('步驟2', data2);
console.log('步驟3', data3);

// ❌ 錯誤：輸出完整物件
console.log('股票資料:', stock); // 物件太大

// ✅ 正確：使用 logger 系統
logger.info('stock', '開始處理', { symbol: stock.symbol });
logger.info('stock', '處理完成', { count: 3 });
logger.debug('stock', '股票資料', { 
  symbol: stock.symbol, 
  price: stock.price 
});
```

### 高頻操作的日誌處理
```typescript
// ✅ 正確：對於高頻操作，直接註解掉詳細日誌
export async function processItems(items: Item[]) {
  // console.log(`開始處理 ${items.length} 個項目...`); // 註解掉
  
  for (const item of items) {
    // console.log(`處理項目: ${item.id}`); // 註解掉
    await processItem(item);
  }
  
  // console.log(`處理完成`); // 註解掉
  return items;
}

// 需要調試時，取消註解即可
```

### 開發時調整 Log 等級

#### 方法 1：在瀏覽器 Console 中調整
```javascript
// 開啟股息模組的詳細 log
window.setLogLevel('dividend', 3); // DEBUG

// 開啟所有模組的超詳細 log
window.setLogLevel('global', 4); // TRACE

// 關閉 API 模組的 log（只顯示錯誤）
window.setLogLevel('api', 0); // ERROR
```

#### 方法 2：修改 logger.ts 設定
```typescript
// src/utils/logger.ts
const LOG_CONFIG: Record<LogModule, number> = {
  global: LogLevel.INFO,
  dividend: LogLevel.DEBUG,  // 臨時開啟詳細 log
  stock: LogLevel.INFO,
  // ...
};
```

---

## 🚫 常見問題預防

### 問題 1：SVG Path 格式錯誤
**預防**：
- 使用統一的圖示組件（src/components/ui/Icons.tsx）
- 提交前執行 `npm run check:svg`

**修復**：
```typescript
// ❌ 錯誤
<path d="9 12l2 2 4-4" />

// ✅ 正確
<path d="M9 12l2 2 4-4" />
```

### 問題 2：版本號不一致
**預防**：
- 使用自動化腳本檢查：`npm run check:version`
- 修改功能時同步更新三個文件

**修復**：
```bash
npm run check:version  # 找出不一致的地方
# 手動同步三個檔案
```

### 問題 3：Console Log 過多
**預防**：
- 遵循 logger 系統規範
- 高頻操作使用註解方式
- 404 錯誤不輸出警告

**修復**：
```typescript
// ❌ 錯誤：高頻操作輸出詳細日誌
for (const item of items) {
  console.log(`處理 ${item.id}...`);
}

// ✅ 正確：註解掉或使用 DEBUG 等級
for (const item of items) {
  // console.log(`處理 ${item.id}...`);
}
```

---

## 💡 最佳實踐

### 開發流程
```
1. 開發前執行 npm run dev:assistant
   ↓
2. 遵循 STEERING 規則開發
   ↓
3. 使用 logger 而非 console.log
   ↓
4. 疊加式開發，不破壞現有功能
   ↓
5. 完整的錯誤處理
   ↓
6. 開發後執行對應檢查
   ↓
7. 提交前執行 npm run check:all
```

### 代碼審查重點
- [ ] 沒有直接使用 console.log
- [ ] Log 等級使用合理
- [ ] 預設輸出量適中
- [ ] 關鍵操作有 log 記錄
- [ ] 錯誤處理有 error log
- [ ] 沒有破壞現有功能
- [ ] 有適當的回退機制

---

## 🎯 質量指標

### 目標
- **重複 BUG 率**：< 5%
- **提交前檢查通過率**：100%
- **版本號一致性**：100%
- **自動化檢查覆蓋率**：> 80%
- **Console log 減少**：80-95%

### 監控
- 每週檢查本週發現的問題類型
- 每月更新 STEERING 規則
- 每季 Review 開發流程效率

---

**記住：安全開發、代碼質量、日誌管理是開發的三大支柱！疊加式開發不破壞現有功能，自動化檢查確保質量，logger 系統保持 Console 簡潔！**
