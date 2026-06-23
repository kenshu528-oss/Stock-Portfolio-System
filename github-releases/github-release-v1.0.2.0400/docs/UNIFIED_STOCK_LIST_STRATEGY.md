# 統一股票清單管理策略

## 🎯 設計原則

### 單一真相來源
- **前端統一使用**：`stockListService` 服務
- **環境自動適應**：本機端和雲端環境自動切換策略
- **路徑統一化**：所有前端組件使用相同的載入邏輯

## 📂 檔案架構

### 當前檔案分佈
```
專案根目錄/
├── public/
│   ├── stock_list.json              # 前端主要資料來源（338.5 KB）
│   └── stock_list_2026-01-23.json   # 今日備份（338.5 KB）
├── stock_list_2026-01-22.json       # 昨日歷史檔案（338.2 KB）
├── stock_list_2026-01-23.json       # 今日歷史檔案（338.5 KB）
└── ...
```

### 檔案職責定義
- **public/stock_list.json**：前端唯一資料來源，由建置流程維護
- **stock_list_YYYY-MM-DD.json**：歷史備份，便於版本追蹤和回滾
- **後端使用**：直接讀取根目錄的日期檔案

## 🔄 資料流程

### 生成流程
```
1. Python 腳本 → stock_list_YYYY-MM-DD.json（根目錄）
2. 建置腳本 → 複製到 public/stock_list.json
3. GitHub Actions → 提交 public/ 目錄檔案
4. 前端載入 → 使用 stockListService 統一載入
```

### 環境適應策略

#### 本機環境（Development）
```
1. 嘗試後端 API（3秒超時）
   ↓ 失敗
2. 載入 public/stock_list.json
   ↓ 失敗
3. 嘗試備用路徑
```

#### 雲端環境（GitHub Pages）
```
1. 載入 ./stock_list.json（public 目錄）
   ↓ 失敗
2. 嘗試備用路徑
   ↓ 失敗
3. 返回 null（不提供虛假資料）
```

## 🛠️ 技術實作

### 統一服務：stockListService

#### 核心功能
- **環境檢測**：自動識別本機/雲端環境
- **智能載入**：根據環境選擇最佳載入策略
- **快取機制**：5分鐘快取，避免重複載入
- **錯誤處理**：完整的錯誤處理和日誌記錄

#### 使用方式
```typescript
import { stockListService } from '../services/stockListService';

// 載入股票清單
const stockListData = await stockListService.loadStockList();

// 檢查環境
const envInfo = stockListService.getEnvironmentInfo();

// 檢查資料新鮮度
const isFresh = stockListService.isDataFresh(stockListData);
```

### 已更新的組件
- ✅ **StockSearch.tsx**：使用統一環境檢測
- ✅ **QuickAddStock.tsx**：使用統一股票清單服務
- ✅ **stockListUpdateService.ts**：使用統一環境檢測

## 📋 檔案管理規範

### 保留策略
- **public/stock_list.json**：永久保留（前端資料來源）
- **今日檔案**：保留（當日備份）
- **7天內檔案**：保留（近期歷史）
- **7天外檔案**：可清理（長期歷史）

### 清理建議
```bash
# 檢查檔案狀況
node scripts/cleanup-stock-files.js

# 手動清理舊檔案（7天外）
find . -name "stock_list_*.json" -mtime +7 -delete
```

## 🔍 驗證檢查

### 功能驗證
- [ ] 本機環境搜尋功能正常
- [ ] 雲端環境搜尋功能正常
- [ ] 環境切換自動適應
- [ ] 快取機制運作正常
- [ ] 錯誤處理完整

### 檔案驗證
- [x] public/stock_list.json 存在且有效
- [x] 檔案內容與今日檔案一致
- [x] 檔案大小合理（~338KB）
- [x] JSON 格式正確

## 🎯 優勢總結

### 解決的問題
1. **路徑混亂**：統一使用 stockListService
2. **重複載入**：5分鐘快取機制
3. **環境差異**：自動適應本機/雲端
4. **錯誤處理**：完整的錯誤處理和日誌

### 性能提升
1. **快取機制**：減少重複載入
2. **智能路徑**：優先使用最佳路徑
3. **超時控制**：避免長時間等待
4. **環境優化**：針對不同環境優化策略

### 維護性提升
1. **單一入口**：所有組件使用相同服務
2. **統一日誌**：便於調試和監控
3. **類型安全**：完整的 TypeScript 支援
4. **文檔完整**：清楚的使用說明

---

**實施狀態**：✅ 已完成
**測試狀態**：🔄 待驗證
**版本**：v1.0.2.0268