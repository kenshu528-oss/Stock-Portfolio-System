# 開發安全檢查清單

## 🔴 修改前必須執行 (BEFORE)

### 1. 建立備份點
```bash
# 建立 Git 備份點
git add .
git commit -m "Backup before: [修改描述]"
git tag "backup-v$(node -p "require('./src/constants/version.ts').VERSION.FULL")-$(date +%Y%m%d-%H%M%S)"

# 建立檔案備份（重要檔案）
cp src/stores/appStore.ts src/stores/appStore.backup.ts
cp src/App.tsx src/App.backup.tsx
```

### 2. 確認當前狀態
- [ ] 應用程式正常運行
- [ ] 無 TypeScript 錯誤
- [ ] 無 ESLint 警告
- [ ] 開發服務器正常啟動

### 3. 記錄修改計劃
- [ ] 明確修改範圍
- [ ] 識別風險點
- [ ] 準備回滾方案

## 🟡 修改過程中 (DURING)

### 4. 分階段修改
- [ ] 最小化修改範圍
- [ ] 避免同時修改多個核心檔案
- [ ] 每個小步驟後立即測試

### 5. 避免危險操作
- [ ] ❌ 不要在初始狀態中添加複雜測試數據
- [ ] ❌ 不要修改 persist 配置和業務邏輯同時進行
- [ ] ❌ 不要在 localStorage 中存儲函數或循環引用
- [ ] ❌ 不要忽略 TypeScript 錯誤

### 6. 安全的修改模式
```typescript
// ✅ 安全：簡化的初始狀態
const initialState = {
  accounts: [{ id: '1', name: '帳戶1', stockCount: 0 }],
  stocks: [], // 空陣列，避免複雜數據
  isPrivacyMode: false
};

// ❌ 危險：複雜的測試數據
const initialState = {
  stocks: [{
    dividendRecords: [{ exDividendDate: new Date() }] // 複雜嵌套
  }]
};
```

## 🟢 修改後必須驗證 (AFTER)

### 7. 自動化檢查
```bash
# 執行完整檢查
.\scripts\dev-check.ps1

# 或手動執行
npm run lint
npx tsc --noEmit
npm test
npm run build
```

### 8. 功能驗證
- [ ] 應用程式正常載入（無空白頁面）
- [ ] 基本功能正常運作
- [ ] 無瀏覽器控制台錯誤
- [ ] localStorage 數據格式正確

### 9. 版本更新
```typescript
// 更新版本號
export const VERSION = {
  PATCH: 61, // 遞增 PATCH 版本
  // 添加修改說明
};
```

## 🚨 緊急回滾程序

### 當出現以下情況時立即回滾：
- ⚠️ 瀏覽器顯示空白頁面
- ⚠️ 控制台出現 "Cannot read property" 錯誤
- ⚠️ 應用程式載入超過 5 秒
- ⚠️ Zustand persist 相關錯誤

### 回滾步驟：
```bash
# 1. 立即停止修改
# 2. 回滾到上一個穩定版本
git reset --hard HEAD~1

# 3. 清除可能損壞的 localStorage
# 在瀏覽器控制台執行：
localStorage.clear();

# 4. 重新啟動開發服務器
npm run dev

# 5. 確認回滾成功
.\scripts\dev-check.ps1 -SkipBuild
```

## 📋 常見問題預防

### Store 相關
- ✅ 使用版本化的 localStorage key
- ✅ 添加 onRehydrateStorage 錯誤處理
- ✅ 正確序列化日期對象
- ✅ 避免存儲複雜嵌套對象

### 組件相關
- ✅ 使用 ErrorBoundary 包裝應用程式
- ✅ 添加適當的錯誤處理
- ✅ 避免在 render 中執行副作用

### 開發流程
- ✅ 每次修改前建立備份
- ✅ 分階段測試修改
- ✅ 保持修改範圍最小化
- ✅ 及時更新版本號

## 🎯 成功指標

修改完成後，以下所有項目都應該 ✅：
- [ ] 應用程式正常載入
- [ ] 所有功能正常運作
- [ ] 無 TypeScript 錯誤
- [ ] 無 ESLint 警告
- [ ] 無瀏覽器控制台錯誤
- [ ] 版本號已更新
- [ ] Git 提交已完成

---

**記住：安全第一，寧可多花時間備份和測試，也不要冒險破壞穩定的系統！**