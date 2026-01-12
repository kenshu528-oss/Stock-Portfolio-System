# Stock Portfolio System

## 📊 台灣股票投資組合管理系統

一個專為台灣投資人設計的現代化股票投資組合管理系統，支援多帳戶管理、即時股價查詢、股息追蹤等功能。

### ✨ 主要功能

- **🏦 多帳戶管理** - 支援多個券商帳戶分別管理
- **📈 即時股價** - 整合Yahoo Finance API，支援台股即時報價
- **💰 股息追蹤** - 自動計算股息收入，支援成本價調整
- **📱 響應式設計** - 完美支援桌面和手機版本
- **🔒 隱私保護** - 一鍵隱藏敏感金額資訊
- **📊 投資統計** - 詳細的投資績效分析
- **💾 資料匯出** - 支援JSON、CSV格式匯出
- **🌙 深色主題** - 專業的深色介面設計

### 🚀 快速開始

#### 線上版本
訪問：[https://kenshu528-oss.github.io/stock-portfolio-system/](https://kenshu528-oss.github.io/stock-portfolio-system/)

#### 本地開發

```bash
# 克隆專案
git clone https://github.com/kenshu528-oss/stock-portfolio-system.git
cd stock-portfolio-system

# 安裝依賴
npm install

# 啟動開發伺服器
npm run dev

# 啟動後端API（另開終端）
cd backend
npm install
npm start
```

### 🛠 技術架構

- **前端**: React 18 + TypeScript + Vite
- **狀態管理**: Zustand
- **樣式**: Tailwind CSS
- **後端**: Node.js + Express
- **資料來源**: Yahoo Finance API
- **測試**: Vitest + React Testing Library

### 📋 系統需求

- Node.js 16+
- 現代瀏覽器（Chrome、Firefox、Safari、Edge）
- 網路連線（用於股價查詢）

### 🔧 開發指南

#### 專案結構
```
src/
├── components/          # React組件
│   ├── ui/             # 基礎UI組件
│   └── ...             # 功能組件
├── types/              # TypeScript類型定義
├── constants/          # 常數定義
└── App.tsx            # 主應用程式
```

#### 版本管理
採用四碼版本控制：`v{MAJOR}.{MINOR}.{RELEASE}.{PATCH}`

### 📊 功能截圖

#### 桌面版
- 完整功能介面，支援多視窗操作
- 詳細的投資組合統計
- 即時股價更新

#### 手機版
- 優化的觸控介面
- 側邊選單設計
- 完整功能支援

### 🤝 貢獻指南

1. Fork 專案
2. 建立功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交變更 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

### 📝 更新日誌

#### v1.0.2.0016 (2026-01-12)
- 🆕 新增版本資訊系統
- ✅ 可點擊的版本號顯示詳細資訊
- ✅ 完整的改版記錄管理
- ✅ 版本歷史追蹤功能
- ✅ 系統技術資訊顯示

#### v1.0.2.0015 (2026-01-12)
- 🔧 環境檢測與智能適應
- ✅ 解決 GitHub Pages 雲端同步問題
- ✅ 智能環境檢測功能
- ✅ 環境限制提示和替代方案

#### v1.0.1.0001 (2024-01-10)
- 🎉 首次GitHub正式發布
- ✅ 完整的多帳戶股票管理功能
- ✅ 響應式UI設計（桌面+手機）
- ✅ 即時股價查詢整合
- ✅ 股息管理與統計
- ✅ 資料匯入匯出功能
- ✅ 隱私保護模式

### 📄 授權條款

MIT License - 詳見 [LICENSE](LICENSE) 文件

### 🐛 問題回報

如果發現問題或有功能建議，請在 [Issues](https://github.com/kenshu528-oss/stock-portfolio-system/issues) 頁面提出。

### 📞 聯絡資訊

- GitHub: [@kenshu528-oss](https://github.com/kenshu528-oss)
- 專案連結: [https://github.com/kenshu528-oss/stock-portfolio-system](https://github.com/kenshu528-oss/stock-portfolio-system)

---

**⚠️ 免責聲明**: 本系統僅供個人投資記錄使用，不構成投資建議。投資有風險，請謹慎評估。