# 本地開發指南 (Local Development Guide)

## 📋 手動開啟應用程式的 SOP

### 🚀 方法一：Vite 開發伺服器 (強烈推薦)

#### 🖥️ Windows 執行環境選擇
**PowerShell (推薦) - 完整啟動**:
```powershell
# 1. 啟動後端服務器 (第一個終端機)
cd "C:\Users\ken.xu\Documents\kiro\Stock Portfolio System_v1.0\backend"
npm install
npm start

# 2. 啟動前端服務器 (第二個終端機)
cd "C:\Users\ken.xu\Documents\kiro\Stock Portfolio System_v1.0"
npm install
npm run dev
```

**簡化啟動 (僅前端)**:
```powershell
# 僅啟動前端 (功能受限)
cd "C:\Users\ken.xu\Documents\kiro\Stock Portfolio System_v1.0"
npm install
npm run dev
```

#### 📊 服務器狀態
- **前端**: `http://localhost:5173` (React 應用程式)
- **後端**: `http://localhost:3001` (API 服務器)
- **優點**: 熱重載、完整功能、股票 API 支援

### 🌐 方法二：建置後預覽
**PowerShell/CMD 執行**:
```powershell
# 1. 建置專案
npm run build

# 2. 預覽建置結果
npm run preview
```
- **開啟**: `http://localhost:4173`
- **用途**: 測試生產版本

### 📁 方法三：直接開啟檔案
**PowerShell/CMD 執行**:
```powershell
# 命令列開啟
start index.html

# 或使用完整路徑
start "C:\Users\ken.xu\Documents\kiro\Stock Portfolio System_v1.0\index.html"
```
- **限制**: 可能有 CORS 問題、模組載入失敗

### 🖱️ 方法四：檔案總管
1. 開啟檔案總管
2. 導航到：`C:\Users\ken.xu\Documents\kiro\Stock Portfolio System_v1.0`
3. 雙擊 `index.html`

## ⚠️ 重要注意事項

### ✅ 推薦做法
- **優先使用** `npm run dev` 進行開發
- **定期執行** `npm run build` 測試建置
- **保持** Node.js 和 npm 版本更新

### ❌ 避免的做法
- 直接開啟 index.html (功能受限)
- 在沒有安裝依賴的情況下執行
- 忽略控制台錯誤訊息

## 🔧 常見問題排除

### 問題：後端服務器無法啟動
**PowerShell 解決方案**:
```powershell
# 檢查端口是否被佔用
netstat -ano | findstr :3001

# 重新安裝後端依賴
cd backend
Remove-Item -Recurse -Force node_modules, package-lock.json
npm install
npm start
```

### 問題：前端無法連接後端 API
**檢查項目**:
- [ ] 後端服務器是否在 `http://localhost:3001` 運行
- [ ] 瀏覽器控制台是否有 CORS 錯誤
- [ ] 防火牆是否阻擋連接

### 問題：股票 API 無法獲取資料
**可能原因**:
- 外部 API 服務暫時不可用
- 網路連接問題
- API 請求頻率限制

### 問題：npm run dev 失敗
**PowerShell/CMD 解決方案**:
```powershell
# 重新安裝依賴
Remove-Item -Recurse -Force node_modules, package-lock.json
npm install
npm run dev
```

### 問題：端口被佔用
```powershell
# Vite 會自動選擇其他端口，或手動指定
npm run dev -- --port 3000
```

### 問題：瀏覽器沒有自動開啟
- 手動開啟 `http://localhost:5173`
- 檢查防火牆設定

## 🖥️ Windows 終端機使用指南

### 推薦使用 PowerShell
**開啟方式**:
- **Win + X** → 選擇 "Windows PowerShell"
- **Win + R** → 輸入 `powershell`
- 在專案資料夾 **Shift + 右鍵** → "在此處開啟 PowerShell 視窗"

### 也可使用 CMD
**開啟方式**:
- **Win + R** → 輸入 `cmd`
- 搜尋 "命令提示字元"

### Git Bash (需先安裝 Git)
**開啟方式**:
- 在專案資料夾右鍵 → "Git Bash Here"

### 📝 重要說明
- 文件中的 `bash` 標記只是 Markdown 語法高亮
- 實際上所有 npm 指令都可以在 PowerShell、CMD 或 Git Bash 中執行
- **推薦使用 PowerShell**，功能更強大且為 Windows 11 預設

## 🌐 完整功能測試

### 前後端整合測試
**當兩個服務器都啟動後，可以測試**:
- ✅ 股票搜尋功能 (前端 → 後端 → 外部 API)
- ✅ 即時股價更新 (Yahoo Finance + 證交所 API)
- ✅ 投資組合管理 (新增、編輯、刪除)
- ✅ 股息計算功能 (基於真實股息資料)
- ✅ 資料匯出/匯入 (JSON 格式)
- ✅ 響應式設計 (手機、平板、桌面)

### API 端點測試
**後端 API 可用端點**:
- `GET http://localhost:3001/api/stock/2330` - 獲取台積電股價
- `GET http://localhost:3001/api/search/台積電` - 搜尋股票
- `GET http://localhost:3001/api/dividend/2330` - 獲取股息資料
- `GET http://localhost:3001/health` - 健康檢查

## 📊 開發環境資訊

### 技術棧
- **前端框架**: React 18
- **建置工具**: Vite 4
- **語言**: TypeScript
- **樣式**: Tailwind CSS
- **狀態管理**: Zustand

### 專案結構
```
Stock Portfolio System_v1.0/
├── src/                 # 源代碼
├── public/             # 靜態資源
├── backend/            # 後端服務
├── dist/               # 建置輸出
├── index.html          # 入口檔案
├── package.json        # 專案配置
└── vite.config.ts      # Vite 配置
```

## 🚀 快速啟動檢查清單

### 首次設定
- [ ] 確認 Node.js 已安裝 (版本 18+)
- [ ] 執行 `npm install`
- [ ] 執行 `npm run dev`
- [ ] 瀏覽器開啟 `http://localhost:5173`

### 日常開發
- [ ] 執行 `npm run dev`
- [ ] 確認熱重載正常運作
- [ ] 檢查控制台無錯誤訊息
- [ ] 測試主要功能正常

## 📝 版本資訊

- **當前版本**: v1.0.2.0012
- **最後更新**: 2026-01-12
- **開發環境**: Windows 11
- **Node.js**: 18+
- **npm**: 最新版本

---

**💡 提示**: 遇到問題時，優先檢查控制台錯誤訊息，大部分問題都能從錯誤訊息中找到解決方案。