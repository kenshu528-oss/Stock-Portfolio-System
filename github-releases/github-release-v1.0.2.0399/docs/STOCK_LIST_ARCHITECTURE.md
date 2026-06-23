# 股票清單檔案架構統一化方案

## 🎯 目標：單一真相來源

### 當前問題
- ❌ 檔案重複：根目錄 + public 目錄都有相同檔案
- ❌ 路徑混亂：不同組件使用不同路徑
- ❌ 維護困難：需要同步多個位置的檔案

### 統一化方案

#### 📂 檔案位置標準化
```
專案結構：
├── public/
│   └── stock_list.json          # 唯一的股票清單檔案（前端使用）
├── stock_list_YYYY-MM-DD.json   # 歷史備份檔案（後端生成）
└── ...
```

#### 🔄 檔案流程
```
1. Python 腳本生成 → stock_list_YYYY-MM-DD.json（根目錄）
2. 建置腳本複製 → public/stock_list.json（前端使用）
3. GitHub Actions → 提交 public/stock_list.json 到倉庫
4. 前端統一使用 → ./stock_list.json
```

## 📋 實作計劃

### 階段 1：統一前端路徑
- [ ] 所有前端組件統一使用 `./stock_list.json`
- [ ] 移除對根目錄檔案的直接引用

### 階段 2：清理重複檔案
- [ ] 保留 public/stock_list.json 作為唯一前端資料來源
- [ ] 根目錄的日期檔案僅作為歷史備份

### 階段 3：更新建置流程
- [ ] 確保建置時正確複製檔案到 public 目錄
- [ ] GitHub Actions 只提交 public 目錄的檔案

## 🎯 最終架構

### 檔案職責明確化
- **public/stock_list.json**：前端唯一資料來源
- **stock_list_YYYY-MM-DD.json**：歷史備份，便於追蹤變更
- **後端**：使用最新的日期檔案進行搜尋

### 路徑統一化
- **前端統一使用**：`./stock_list.json`
- **後端統一使用**：`stock_list_${today}.json`