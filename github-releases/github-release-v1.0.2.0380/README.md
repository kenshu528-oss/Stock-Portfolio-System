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
├── services/           # API服務層
├── stores/             # Zustand狀態管理
├── types/              # TypeScript類型定義
├── constants/          # 常數定義
└── App.tsx            # 主應用程式

backend/
├── server.js           # Express後端服務器
└── services/           # 後端服務

docs/
├── guides/             # 使用指南
├── specifications/     # 技術規範
├── research/           # 研究文檔
└── checklists/         # 開發檢查清單

.kiro/steering/         # STEERING開發規則
scripts/                # 自動化腳本
```

#### 版本管理
採用四碼版本控制：`v{MAJOR}.{MINOR}.{RELEASE}.{PATCH}`

#### 📚 文檔導航

**🚀 快速開始**
- [綜合改善總結](docs/COMPREHENSIVE_IMPROVEMENT_SUMMARY.md) - 專案現況與改善計畫總覽
- [UI/UX 快速開始](docs/UI_UX_QUICK_START.md) - 2-3 小時立即提升專業感
- [UI/UX 詳細計畫](docs/UI_UX_IMPROVEMENT_PLAN.md) - 完整優化改善計畫

**📊 專案狀態**
- [專案健康檢查報告](docs/PROJECT_HEALTH_CHECK_REPORT.md) - 當前狀態評估（7.3/10）
- [最終改善總結](docs/FINAL_IMPROVEMENT_SUMMARY.md) - 已完成的改進措施

**使用指南** (`docs/guides/`)
- [快速設定指南](docs/guides/QUICK_SETUP_GUIDE.md) - 新手入門
- [本地開發指南](docs/guides/LOCAL_DEVELOPMENT_GUIDE.md) - 開發環境設定
- [開發流程指南](docs/guides/DEVELOPMENT_WORKFLOW.md) - 完整開發流程
- [快速參考卡片](docs/guides/QUICK_REFERENCE.md) - 3 分鐘快速查詢
- [簡單使用說明](docs/guides/簡單使用說明.md) - 中文使用說明
- [FinMind API 指南](docs/guides/FINMIND_API_GUIDE.md) - API 使用說明
- [Logger 使用指南](docs/guides/LOGGER_USAGE_GUIDE.md) - 日誌系統
- [債券 ETF 指南](docs/guides/BOND_ETF_DIVIDEND_GUIDE.md) - 債券 ETF 配息

**技術規範** (`docs/specifications/`)
- [開發規範](docs/specifications/DEVELOPMENT_SPECIFICATION.md)
- [雲端同步標準](docs/specifications/UNIVERSAL_CLOUD_SYNC_STANDARDS.md)

**開發檢查清單** (`docs/checklists/`)
- [開發檢查清單](docs/checklists/DEVELOPMENT_CHECKLIST.md)
- [雙 API 實作檢查清單](docs/checklists/DUAL_API_IMPLEMENTATION_CHECKLIST.md)

**研究文檔** (`docs/research/`)
- [OpenAPI 評估](docs/research/OPENAPI_EVALUATION.md)
- [證交所 OpenAPI 研究](docs/research/TWSE_OPENAPI_RESEARCH.md)

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

#### v1.0.2.0380 (2026-02-02) - 最新版本
- 🔧 **關鍵修復：除權息處理失敗導致股價更新中斷**
  - 修復 2208、4585、00981A 等無股息資料股票導致更新中斷的問題
  - 除權息處理失敗時使用警告而非錯誤，不中斷股價更新流程
  - 確保股價更新優先，除權息處理失敗不影響結果
  - 新增專門的除權息修復驗證測試頁面
  - 保持向後相容：有股息資料的股票仍正常處理除權息

#### v1.0.2.0200 (2026-01-19)
- 🚀 **GitHub Pages 股票搜尋效能優化**
  - 調整 API 優先順序，FinMind 優先，Yahoo Finance 備用
  - 添加超時控制，快速失敗機制
  - 搜尋時間從 17秒 縮短到 2秒
- 🔧 **股票代碼分析器標準化**（Task 1.1 完成）
  - 智能後綴判斷邏輯，支援所有股票類型
  - 22個測試案例全部通過
  - 遵循 STEERING 規則，使用 logger 系統
- 📚 **專案資料夾整理**
  - 移除 25+ 個重複和過時文檔
  - 整合任務完成總結到規格文檔
  - 建立清晰的文檔結構

#### v1.0.2.0137 (2026-01-14)
- 🔧 **修復除權息計算問題**（v1.0.2.0130-0132）
  - 簡化重複檢查邏輯，只檢查日期和代碼
  - 修復強制重新計算時的累積問題
  - 統一 Header 批量更新和個股更新邏輯
- 🔧 **修復損益模式切換無效**（v1.0.2.0133）
  - 移除已廢棄的 includeDividendInGainLoss
  - 統一使用 rightsAdjustmentMode
- 🔧 **修復總損益顯示不一致**（v1.0.2.0134-0135）
  - 統一使用 RightsAdjustmentService 計算
  - 考慮交易成本（手續費 + 證交稅）
  - 移除重複的統計欄
- 🎨 **修復 UI 滾動問題**（v1.0.2.0136）
  - Sidebar 選單支援垂直滾動
  - 改善小螢幕設備體驗
- 📚 **更新文檔和授權**（v1.0.2.0137）
  - 更新 README 到最新版本
  - 修改 LICENSE 為僅供個人使用，禁止商業用途
  - 新增 unified-rights-calculation.md（統一除權息計算規範）
  - 新增 gain-loss-calculation-explained.md（損益計算說明）

#### v1.0.2.0016 (2026-01-12)
- 🆕 新增版本資訊系統
- ✅ 可點擊的版本號顯示詳細資訊
- ✅ 完整的改版記錄管理

#### v1.0.2.0015 (2026-01-12)
- 🔧 環境檢測與智能適應
- ✅ 解決 GitHub Pages 雲端同步問題

#### v1.0.1.0001 (2024-01-10)
- 🎉 首次GitHub正式發布
- ✅ 完整的多帳戶股票管理功能

### 📄 授權條款

**僅供個人使用 - 禁止商業用途**

本軟體僅供個人學習、研究和非商業用途使用。未經作者明確書面許可，禁止將本軟體用於任何商業目的。

詳見 [LICENSE](LICENSE) 文件

### ⚠️ 使用限制

- ✅ **允許**：個人使用、學習、研究
- ✅ **允許**：修改代碼供個人使用
- ✅ **允許**：分享給朋友個人使用
- ❌ **禁止**：商業使用、販售、出租
- ❌ **禁止**：作為商業服務的一部分
- ❌ **禁止**：移除版權聲明

### 🐛 問題回報

如果發現問題或有功能建議，請在 [Issues](https://github.com/kenshu528-oss/stock-portfolio-system/issues) 頁面提出。

### 📞 聯絡資訊

- GitHub: [@kenshu528-oss](https://github.com/kenshu528-oss)
- 專案連結: [https://github.com/kenshu528-oss/stock-portfolio-system](https://github.com/kenshu528-oss/stock-portfolio-system)

---

**⚠️ 免責聲明**: 本系統僅供個人投資記錄使用，不構成投資建議。投資有風險，請謹慎評估。

##
 🔍 代碼質量檢查

本專案使用自動化檢查腳本確保代碼質量。

### 快速檢查命令

```bash
# 檢查 SVG path 格式
npm run check:svg

# 檢查版本號一致性
npm run check:version

# 執行所有檢查（提交前必須執行）
npm run check:all
```

### 開發流程

1. **開發功能** → 修改代碼
2. **執行檢查** → `npm run check:all`
3. **修復錯誤** → 根據提示修復
4. **提交代碼** → git commit

### 詳細說明

- 📋 **開發檢查清單**：參考 `DEVELOPMENT_CHECKLIST.md`
- 📚 **代碼質量標準**：參考 `.kiro/steering/code-quality-standards.md`
- 🎯 **STEERING 規則**：參考 `.kiro/steering/` 目錄下的所有規範

---

**重要**：提交代碼前必須執行 `npm run check:all` 並確保所有檢查通過！
