# 開發規格文件 (Development Specification)

## 📋 專案概述

### 基本資訊
- **專案名稱**: Stock Portfolio System
- **當前版本**: v1.0.2.0072
- **開發語言**: TypeScript + JavaScript
- **前端框架**: React 18
- **後端框架**: Node.js + Express
- **建置工具**: Vite 4
- **狀態管理**: Zustand
- **樣式框架**: Tailwind CSS

### 專案目標
建立一個專為台灣投資人設計的現代化股票投資組合管理系統，提供多帳戶管理、即時股價查詢、股息追蹤、雲端同步等完整功能。

## 🏗️ 系統架構

### 前端架構
```
src/
├── components/          # React 組件
│   ├── ui/             # 基礎 UI 組件
│   ├── AccountManager.tsx
│   ├── AddStockForm.tsx
│   ├── CloudSyncSettings.tsx
│   ├── Header.tsx
│   ├── VersionInfo.tsx
│   └── ...
├── constants/          # 常數定義
│   ├── version.ts      # 版本管理
│   └── changelog.ts    # 改版記錄
├── services/           # API 服務層
├── stores/            # Zustand 狀態管理
├── types/             # TypeScript 類型定義
├── utils/             # 工具函數
│   └── environment.ts  # 環境檢測
└── hooks/             # 自定義 Hooks
```

### 後端架構
```
backend/
├── server.js          # Express 主服務器
├── package.json       # 後端依賴管理
└── node_modules/      # 後端依賴包
```

### 配置文件
```
.kiro/steering/        # 開發規則和指導原則
├── api-data-integrity.md      # API 資料完整性規則
├── backup-recovery.md         # 備援與恢復機制
├── cloud-sync-development.md  # 雲端同步開發規範 ⭐ 新增
├── github-authorization.md    # GitHub 授權規則
├── repository-isolation.md    # 倉庫隔離規則
├── safe-development.md       # 安全開發規則
├── ui-design-standards.md     # UI 設計標準規範
└── version-archival.md        # 版本歸檔規則
```

## 🔧 技術規格

### 前端技術棧
- **React 18**: 主要 UI 框架
- **TypeScript**: 類型安全的 JavaScript
- **Vite 4**: 快速建置工具
- **Tailwind CSS**: 實用優先的 CSS 框架
- **Zustand**: 輕量級狀態管理
- **React Testing Library**: 組件測試
- **Vitest**: 單元測試框架

### 後端技術棧
- **Node.js**: JavaScript 運行環境
- **Express**: Web 應用框架
- **Axios**: HTTP 客戶端
- **CORS**: 跨域資源共享
- **dotenv**: 環境變數管理

### 外部 API 整合 ⭐ 重點更新

#### FinMind API (首選資料源) 🥇
- **官方網站**: https://finmindtrade.com/
- **API文檔**: https://api.finmindtrade.com/docs
- **用途**: 台股專用開源財經數據，資料最準確
- **優勢**: 專為台股設計，資料與官方完全一致
- **限制**: 免費版有請求限制，需要token提升額度

**支援的數據集**:
```typescript
// 股價資料
dataset: 'TaiwanStockPrice'
// 股息資料  
dataset: 'TaiwanStockDividendResult'
```

**API端點規格**:
```typescript
// 股價查詢
GET https://api.finmindtrade.com/api/v4/data
Parameters:
- dataset: 'TaiwanStockPrice'
- data_id: string (股票代碼，如 '2330')
- start_date: string (YYYY-MM-DD格式)
- token?: string (可選，提升請求限制)

// 股息查詢
GET https://api.finmindtrade.com/api/v4/data
Parameters:
- dataset: 'TaiwanStockDividendResult'
- data_id: string (股票代碼)
- start_date: string (查詢起始日期)
- token?: string (可選)
```

**回應格式**:
```json
{
  "msg": "success",
  "status": 200,
  "data": [
    {
      "date": "2026-01-13",
      "stock_id": "2330",
      "open": 1000.0,
      "close": 1010.0,
      // ... 其他欄位
    }
  ]
}
```

#### 台灣證交所 API (備用資料源) 🥈 ⭐ 完整產品支援
- **用途**: 即時股價資料，支援所有證交所產品
- **優勢**: 官方資料，即時性佳，涵蓋範圍最廣
- **限制**: 格式複雜，需要特殊處理

**支援的證交所產品** (v1.0.2.0072更新):
```typescript
// 完整的市場分類支援
上市股票: 1000-2999 (如: 2330台積電)
上櫃股票: 3000-8999 (如: 6188廣明)  
興櫃股票: 7000-7999 (如: 7xxx系列)
ETF基金: 00xxx[A-Z]? (如: 0050、00679B)
債券產品: 5-6位數字 (如: 12345、123456)
權證產品: 5位數字+字母 (如: 12345A)
其他產品: 9000-9999 (特殊代碼)
```

**API端點規格** (完整支援):
```typescript
// 上市股票 (TSE)
GET https://mis.twse.com.tw/stock/api/getStockInfo.jsp
Parameters:
- ex_ch: 'tse_{symbol}.tw'
- json: 1
- delay: 0

// 上櫃股票/興櫃 (OTC)
GET https://mis.twse.com.tw/stock/api/getStockInfo.jsp  
Parameters:
- ex_ch: 'otc_{symbol}.tw'
- json: 1
- delay: 0

// ETF (上市/上櫃自動判斷)
自動嘗試 tse_ 和 otc_ 端點
```

**API調用策略** (v1.0.2.0072優化):
```typescript
// 智能API調用順序
1. 嘗試上市API (tse_)
2. 如果失敗，嘗試上櫃API (otc_)  
3. 如果仍失敗，嘗試興櫃API (otc_，不同解析)
4. 最後回退到其他API (FinMind/Yahoo)
```

**資料欄位解析** (修復上櫃股票問題):
```typescript
// 上市股票欄位
price: stockData.z || stockData.y  // 現價或昨收
name: stockData.n                  // 股票名稱

// 上櫃股票欄位 (特殊處理)
price: stockData.z || stockData.pz || stockData.y  // 多欄位嘗試
name: stockData.n || `${symbol} (上櫃)`            // 編碼問題備用
```

**特殊案例處理** 📋 (v1.0.2.0072修復):

**6188搜尋問題解決** ✅:
- **問題**: 6188(廣明)為上櫃股票，原邏輯只嘗試上市API
- **解決**: 新增上櫃API支援，正確解析pz價格欄位
- **結果**: 成功獲取6188股價資料 `{"symbol":"6188","name":"廣明","price":114}`

**上櫃股票特殊處理** ✅:
- **價格欄位**: 優先z，備用pz，最後y (昨收)
- **名稱編碼**: 處理問號亂碼，提供備用格式
- **市場標識**: 正確標記為"上櫃"市場

#### Yahoo Finance API (最後備用) 🥉
- **用途**: 國際股價資料，台股備用
- **優勢**: 全球覆蓋，資料豐富
- **限制**: 台股資料可能不完整

**API端點**:
```typescript
// 股價查詢
GET https://query1.finance.yahoo.com/v8/finance/chart/{symbol}.TW

// 股息查詢
GET https://query1.finance.yahoo.com/v8/finance/chart/{symbol}.TW?events=div
```

#### API調用優先級策略 🎯
```typescript
// 股價查詢優先級
1. FinMind API (台股專用，最準確)
2. 台灣證交所 API (官方即時資料)  
3. Yahoo Finance API (國際備用)

// 股息查詢優先級
1. FinMind API (台股專用，歷史完整)
2. GoodInfo API (網頁爬蟲，資料豐富)
3. Yahoo Finance API (國際標準格式)
```

#### API資料完整性規則 ⚠️
遵循 `api-data-integrity.md` STEERING規則：
- ✅ **100%使用真實API資料**
- ❌ **絕對禁止本地硬編碼股票對照表**
- ❌ **絕對禁止API失敗時返回預設價格**
- ❌ **絕對禁止混用真實API資料和虛假本地資料**

**錯誤處理原則**:
```typescript
// ✅ 正確的錯誤處理
if (!apiData) {
  return res.status(404).json({
    error: 'Stock not found',
    message: '找不到股票代碼 XXXX 的資訊',
    suggestions: [
      '請確認股票代碼是否正確',
      '檢查是否為有效的台股代碼',
      '稍後再試或聯繫客服'
    ]
  });
}

// ❌ 禁止的錯誤處理
if (!apiData) {
  return { name: '股票名稱', price: 10.0 }; // 虛假資料
}
```

#### 特殊案例處理 📋 (v1.0.2.0072完整更新)

**6188搜尋問題完全解決** ✅:
- **問題**: 6188(廣明)搜尋返回404錯誤
- **根本原因**: 6188為上櫃股票，原API邏輯只嘗試上市端點
- **解決方案**: 
  - 新增完整的上櫃API支援 (otc_端點)
  - 修復價格欄位解析 (z → pz → y)
  - 處理股票名稱編碼問題
- **測試結果**: ✅ `{"symbol":"6188","name":"廣明","price":114,"market":"上櫃"}`

**證交所產品完整支援矩陣** 🎯:
```typescript
產品類型    代碼範圍        API端點    特殊處理
上市股票    1000-2999      tse_      標準解析
上櫃股票    3000-8999      otc_      pz價格欄位
興櫃股票    7000-7999      otc_      備用名稱
ETF基金     00xxx[A-Z]?    tse_+otc_ 雙端點嘗試
債券產品    5-6位數字      智能判斷   特殊格式
權證產品    5位數+字母     智能判斷   特殊格式
其他產品    9000-9999      智能判斷   備用處理
```

**四碼搜尋原則** (已驗證正確):
- **規則**: 要求至少4碼才開始API請求
- **原因**: 台股代碼最少4碼，符合證交所規範
- **效果**: 減少無效請求，提升系統效能
- **狀態**: ✅ 實作正確，無需修改

- **Yahoo Finance API**: 備用股價資料來源
- **台灣證交所 API**: 備用股價資料來源
- **GitHub Gist API**: 雲端資料同步

## 📊 資料模型

### 核心資料結構

#### Account (投資帳戶)
```typescript
interface Account {
  id: string;
  name: string;
  stockCount: number;
  brokerageFee: number;      // 手續費率 (%)
  transactionTax: number;    // 交易稅率 (%)
  createdAt: Date;
}
```

#### StockRecord (股票記錄)
```typescript
interface StockRecord {
  id: string;
  accountId: string;
  symbol: string;            // 股票代碼
  name: string;              // 股票名稱
  shares: number;            // 持股數量
  costPrice: number;         // 成本價
  adjustedCostPrice: number; // 調整後成本價
  purchaseDate: Date;        // 購買日期
  currentPrice: number;      // 當前價格
  lastUpdated: Date;         // 最後更新時間
  priceSource: string;       // 價格來源
  dividendRecords?: DividendRecord[];
  isBondETF?: boolean;       // 是否為債券ETF
  transactionTaxRate?: number; // 特殊交易稅率
}
```

#### DividendRecord (股息記錄)
```typescript
interface DividendRecord {
  id: string;
  stockId: string;
  symbol: string;
  exDividendDate: Date;      // 除息日
  dividendPerShare: number;  // 每股股息
  totalDividend: number;     // 總股息
  year: number;              // 年度
  source: string;            // 資料來源
}
```

### 匯出資料格式
```typescript
interface ExportData {
  version: string;           // 版本號
  exportDate: string;        // 匯出日期
  accounts: Account[];       // 帳戶資料
  stocks: StockRecord[];     // 股票資料
  metadata: {
    totalAccounts: number;
    totalStocks: number;
    exportOptions: object;
    dataVersion: string;
    features: string[];
  };
}
```

## 🎨 UI/UX 設計規範

### 設計原則
- **統一性**: 所有組件使用統一的設計系統
- **一致性**: 相同功能使用相同的視覺元素
- **可用性**: 直觀易用的操作介面
- **響應式**: 支援桌面和行動裝置

### 色彩系統
```css
/* 主要色彩 */
--primary: #3B82F6;        /* 藍色 */
--success: #10B981;        /* 綠色 */
--warning: #F59E0B;        /* 黃色 */
--error: #EF4444;          /* 紅色 */
--neutral: #6B7280;        /* 灰色 */

/* 背景色彩 */
--bg-primary: #0F172A;     /* 深色背景 */
--bg-secondary: #1E293B;   /* 次要背景 */
--bg-tertiary: #334155;    /* 第三背景 */
```

### 圖示系統
- **CheckIcon**: 確認操作 (綠色)
- **XIcon**: 取消操作 (紅色)
- **EditIcon**: 編輯操作 (中性色)
- **DeleteIcon**: 刪除操作 (紅色)
- **ArrowIcon**: 方向操作 (中性色)

## 🔒 安全與品質規範

### 雲端同步開發規範 ⭐ 新增重點
- **統一資料流**: 所有雲端同步使用相同的 `importData` 方法
- **自動容錯**: 不依賴本地狀態，能自動尋找雲端資料
- **多入口一致性**: 初始設定和雲端同步設定使用相同邏輯
- **完整錯誤處理**: 每個異步操作都有 try-catch 和用戶友好提示
- **用戶體驗優先**: 同步後自動切換帳戶和啟用隱私模式

### API 資料完整性
- **禁止使用本地硬編碼股票對照表**
- **100% 使用真實 API 資料**
- **API 失敗時返回明確錯誤，不提供虛假資料**
- **透明的資料來源標示**

### 開發安全規則
- **疊加式開發**: 只能添加功能，不能破壞現有功能
- **版本歸檔**: 每次修改都要創建完整版本歷史
- **GitHub 授權**: 未經明確授權不執行 GitHub 操作
- **倉庫隔離**: 不同倉庫的版本號絕對不能混用

### 備援與恢復
- **自動備份**: 關鍵操作前自動創建備份
- **多層級恢復**: 支援多個恢復點
- **資料完整性檢查**: 確保備份資料的完整性

## 📱 功能規格

### 核心功能

#### 1. 多帳戶管理
- 支援多個券商帳戶分別管理
- 自定義手續費率和交易稅率
- 帳戶間資料隔離
- 帳戶重新排序功能

#### 2. 股票投資組合
- 股票新增、編輯、刪除
- 即時股價更新
- 損益計算和統計
- 持股成本分析

#### 3. 股息管理
- 股息記錄追蹤
- 除息日期管理
- 股息收益統計
- 成本價自動調整

#### 4. 資料同步 ⭐ 重點功能
- **本地匯出/匯入**: JSON 格式資料交換
- **雲端同步**: GitHub Gist 整合，支援多入口同步
- **自動搜尋**: 不依賴本地狀態，自動尋找雲端資料
- **資料備份和恢復**: 操作前自動備份
- **衝突處理**: 智能合併和替換模式
- **用戶體驗優化**: 同步後自動切換帳戶和狀態

#### 5. 用戶體驗 ⭐ 優化重點
- **響應式設計**: 桌面/手機完美適配
- **深色主題**: 護眼的深色介面
- **隱私保護模式**: 預設啟用，保護敏感資料
- **操作日誌記錄**: 詳細的操作追蹤
- **自動化體驗**: 同步後自動切換到合適狀態
- **錯誤處理**: 友好的錯誤提示和恢復建議

### 環境適應性功能

#### 環境檢測
- 自動檢測運行環境 (本機/GitHub Pages/其他)
- 智能功能切換
- 環境限制提示
- 替代方案建議

#### 版本資訊系統
- 可點擊的版本號顯示
- 詳細的改版記錄
- 版本歷史追蹤
- 系統資訊顯示

## 🚀 部署規格

### 開發環境
```bash
# 前端開發服務器
npm run dev          # http://localhost:5173

# 後端 API 服務器
cd backend
npm start           # http://localhost:3001

# 建置生產版本
npm run build

# 預覽生產版本
npm run preview     # http://localhost:4173
```

### 生產環境
- **GitHub Pages**: 靜態部署 (功能受限)
- **Vercel/Netlify**: 完整功能部署 (推薦)
- **自託管**: 完整控制權

### 環境變數
```env
NODE_ENV=production
VITE_API_BASE_URL=http://localhost:3001
```

## 🧪 測試規格

### 測試策略
- **單元測試**: Vitest + React Testing Library
- **整合測試**: API 端點測試
- **E2E 測試**: 主要用戶流程測試
- **手動測試**: UI/UX 驗證

### 測試覆蓋率目標
- **組件測試**: > 80%
- **工具函數**: > 90%
- **API 服務**: > 85%
- **雲端同步功能**: > 95% ⭐ 重點測試

### 雲端同步測試檢查清單 ⭐ 新增
每次雲端同步功能修改後必須測試：
- [ ] 初始設定的雲端下載是否正常
- [ ] 右上角雲端同步是否正常
- [ ] 恢復預設值後是否能正常下載
- [ ] 下載後是否自動切換到第一個帳戶
- [ ] 隱私模式是否正確啟用
- [ ] 錯誤情況是否有友好的提示
- [ ] Console 是否有清楚的調試信息

邊界情況測試：
- [ ] 沒有 GitHub Token 時的處理
- [ ] 網路連線失敗時的處理
- [ ] 雲端沒有資料時的處理
- [ ] 資料格式錯誤時的處理
- [ ] Token 無效時的處理

## 📋 開發流程

### 版本管理
- **版本格式**: `v{MAJOR}.{MINOR}.{RELEASE}.{PATCH}`
- **版本歸檔**: 每次發布前創建完整歷史
- **Changelog**: 詳細記錄每次變更

### 代碼規範
- **ESLint**: 代碼品質檢查
- **TypeScript**: 嚴格類型檢查
- **Prettier**: 代碼格式化
- **Git Hooks**: 提交前檢查

### 發布流程
1. 功能開發和測試
2. 版本號更新
3. 創建版本歷史歸檔
4. 建置和驗證
5. 部署到生產環境

## 📊 效能規格

### 效能目標
- **首次載入**: < 3 秒
- **股價更新**: < 2 秒
- **資料匯出**: < 1 秒
- **頁面切換**: < 500ms

### 優化策略
- **代碼分割**: 按需載入
- **資源壓縮**: Gzip 壓縮
- **快取策略**: 適當的快取設定
- **圖片優化**: WebP 格式支援

## 🔍 監控與維護

### 錯誤監控
- **前端錯誤**: Error Boundary 捕獲
- **API 錯誤**: 統一錯誤處理
- **用戶操作**: 操作日誌記錄

### 維護計劃
- **定期更新**: 依賴包安全更新
- **功能改進**: 基於用戶反饋
- **效能優化**: 持續效能監控
- **安全檢查**: 定期安全審查

---

**文件版本**: v1.0.2.0072  
**最後更新**: 2026-01-13  
**維護者**: Stock Portfolio System Development Team

## 📚 相關文檔

- [雲端同步故障排除指南](./CLOUD_SYNC_TROUBLESHOOTING_GUIDE.md)
- [STEERING 開發規則](./.kiro/steering/)
- [本地開發指南](./LOCAL_DEVELOPMENT_GUIDE.md)