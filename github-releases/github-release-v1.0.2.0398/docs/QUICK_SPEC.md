# Stock Portfolio System 快速規格參考

## 🎯 專案概述
- **名稱**: Stock Portfolio System v1.0.2.0221
- **類型**: 現代化股票投資組合管理系統
- **技術**: React + TypeScript + Vite + Zustand + TailwindCSS

## 🏗️ 核心功能

### 1. 帳戶管理
- ✅ 多帳戶支援（預設：帳戶1、帳戶2）
- ✅ 帳戶新增/編輯/刪除/排序
- ✅ 獨立的手續費和稅率設定

### 2. 股票管理
- ✅ 股票新增/編輯/刪除
- ✅ 即時股價更新（多重API）
- ✅ 智能股票代碼後綴判斷
- ✅ 批次更新功能

### 3. 除權息計算
- ✅ 自動除權息資料獲取
- ✅ 配股計算和成本價調整
- ✅ 含權息/不含權息模式切換
- ✅ 時間順序累積計算

### 4. 投資組合統計
- ✅ 總市值、總成本、總損益
- ✅ 損益率、股息收入統計
- ✅ 分帳戶和總體統計
- ✅ 即時計算更新

### 5. 雲端同步
- ✅ GitHub Gist 整合
- ✅ 資料上傳/下載
- ✅ 自動搜尋功能
- ✅ 隱蔽後門快速連線

### 6. 資料管理
- ✅ JSON/Excel 匯出
- ✅ 資料匯入功能
- ✅ 自動備份機制
- ✅ 恢復預設值

### 7. 用戶介面
- ✅ 響應式深色主題
- ✅ 隱私模式保護
- ✅ 統一圖示系統
- ✅ 直觀操作介面

## 🔧 技術架構

### 狀態管理
```typescript
// Zustand Store
interface AppState {
  // UI 狀態
  isSidebarOpen: boolean;
  isAccountManagerOpen: boolean;
  isAddStockFormOpen: boolean;
  
  // 核心資料
  currentAccount: string;
  accounts: Account[];
  stocks: StockRecord[];
  
  // 設定
  isPrivacyMode: boolean;
  showAdjustedCost: boolean;
  rightsAdjustmentMode: 'excluding_rights' | 'including_rights';
}
```

### API 整合
```
股價API優先順序：
一般股票: Yahoo Finance → FinMind → 證交所
債券ETF: Yahoo Finance → FinMind

智能後綴判斷：
上市股票(1000-2999): .TW 優先
上櫃股票(3000-8999): .TWO 優先
債券ETF(00XXXB): .TWO 優先
```

### 除權息計算
```typescript
// 配股計算公式
配股數量 = Math.floor(除權前持股數 × 配股比例 / 1000)

// 成本價調整公式
調整後成本價 = (除權前成本價 × 除權前股數 - 現金股利總額) / 除權後股數
```

## 🛡️ 開發規範

### 版本管理
- **格式**: v1.0.2.XXXX
- **同步**: package.json + version.ts + changelog.ts
- **檢查**: `npm run check:version`

### 代碼品質
```bash
npm run check:all      # 完整檢查
npm run check:svg      # SVG格式檢查
npm run check:state    # 狀態管理檢查
npm run check:rights   # 除權息計算檢查
```

### 安全開發
- ✅ 疊加式開發（不破壞現有功能）
- ✅ 功能開關設計
- ✅ 快速回滾機制
- ✅ 完整錯誤處理

## 🚀 部署環境

### 開發環境
```bash
npm run dev          # 開發服務器
npm run build        # 建置生產版本
npm run test         # 執行測試
npm run lint         # 代碼檢查
```

### 生產環境
- **主要平台**: Netlify
- **備用平台**: GitHub Pages
- **建置工具**: Vite
- **CDN**: 自動配置

## 📊 性能指標
- **首次載入**: < 1.5s
- **股價更新**: < 3s
- **批次更新**: 10支股票 < 10s
- **雲端同步**: < 5s

## 🔮 未來規劃
- **v1.1.x**: 技術分析、報表系統
- **v1.2.x**: 多幣別支援、API擴展
- **v2.0.x**: AI分析、社群功能

---

**快速參考版本**: v1.0.2.0221  
**完整規格**: 請參考 `docs/SPECIFICATION.md`