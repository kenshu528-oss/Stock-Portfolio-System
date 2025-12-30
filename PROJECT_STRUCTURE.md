# 專案結構說明

```
存股紀錄系統/
├── index.html              # 主要應用程式入口
├── README.md               # 專案說明文件
├── LICENSE                 # MIT 授權條款
├── .gitignore             # Git 忽略檔案設定
├── PROJECT_STRUCTURE.md   # 專案結構說明 (本檔案)
│
├── src/                   # 原始碼目錄
│   ├── script.js          # 主要應用程式邏輯
│   ├── styles.css         # CSS 樣式檔案
│   ├── stock-api.js       # 股價 API 模組
│   ├── cloud-sync.js      # 雲端同步模組
│   └── version.js         # 版本管理模組
│
├── docs/                  # 文檔目錄
│   ├── COPYRIGHT.md       # 版權聲明
│   ├── DEPLOYMENT.md      # 部署指南
│   └── SHARING_TEMPLATE.md # 分享模板
│
└── tests/                 # 測試和示例檔案
    ├── dividend-test.html                    # 股息管理功能測試
    ├── ui-improvements-test.html             # UI 改進測試
    ├── privacy-controls-test.html            # 雙隱私開關測試
    ├── purchase-tracking-test.html           # 購買追蹤測試
    ├── privacy-fix-test.html                 # 隱私開關修復測試
    ├── privacy-star-fix.html                 # 星號顯示修復測試
    ├── action-menu-fix.html                  # 操作選單修復測試
    ├── account-reset-improvements.html       # 帳戶重置改進測試
    └── clean-start-improvement.html          # 乾淨啟動改進測試
```

## 檔案說明

### 核心檔案
- **index.html** - 主要的 HTML 檔案，包含完整的使用者介面
- **src/script.js** - 主要的 JavaScript 邏輯，包含所有功能實作
- **src/styles.css** - 完整的 CSS 樣式，包含響應式設計和深色模式

### 功能模組
- **src/stock-api.js** - 股價 API 整合模組，支援多重資料源
- **src/cloud-sync.js** - 雲端同步功能，使用 GitHub Gist
- **src/version.js** - 版本管理系統，自動更新和資料遷移

### 文檔檔案
- **README.md** - 完整的專案說明和使用指南
- **LICENSE** - MIT 授權條款
- **docs/COPYRIGHT.md** - 詳細的版權聲明
- **docs/DEPLOYMENT.md** - GitHub Pages 部署指南
- **docs/SHARING_TEMPLATE.md** - 專案分享模板

### 測試檔案
- **tests/** 目錄包含各種功能的測試和示例頁面
- 每個測試檔案都有詳細的功能說明和使用指南
- 可以獨立開啟測試特定功能

## 使用方式

1. **直接使用**：開啟 `index.html` 即可使用完整系統
2. **功能測試**：開啟 `tests/` 目錄中的測試檔案
3. **部署指南**：參考 `docs/DEPLOYMENT.md`
4. **版權資訊**：查看 `docs/COPYRIGHT.md`

## 開發資訊

- **版本**：v1.2.1.0
- **作者**：徐國洲
- **授權**：MIT License
- **更新日期**：2025-12-30