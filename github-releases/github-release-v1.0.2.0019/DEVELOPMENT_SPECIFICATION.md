# 開發規格文件 (Development Specification)

## 📋 專案概述

### 基本資訊
- **專案名稱**: Stock Portfolio System
- **當前版本**: v1.0.2.0016
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
├── api-data-integrity.md
├── backup-recovery.md
├── github-authorization.md
├── repository-isolation.md
├── safe-development.md
├── ui-design-standards.md
└── version-archival.md
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

### 外部 API 整合
- **Yahoo Finance API**: 主要股價資料來源
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

#### 4. 資料同步
- 本地匯出/匯入 (JSON 格式)
- 雲端同步 (GitHub Gist)
- 資料備份和恢復
- 衝突處理機制

#### 5. 用戶體驗
- 響應式設計 (桌面/手機)
- 深色主題
- 隱私保護模式
- 操作日誌記錄

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

**文件版本**: v1.0.2.0016  
**最後更新**: 2026-01-12  
**維護者**: Stock Portfolio System Development Team