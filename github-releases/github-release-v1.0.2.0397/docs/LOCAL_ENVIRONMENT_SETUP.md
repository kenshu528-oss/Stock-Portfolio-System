# 本地環境設定指南 (Local Environment Setup)

## 🔑 環境變數配置

### 必要的環境變數

#### 1. FinMind Token
```bash
# Windows (PowerShell)
$env:FINMIND_TOKEN="your_finmind_token_here"

# Windows (CMD)
set FINMIND_TOKEN=your_finmind_token_here

# Linux/macOS
export FINMIND_TOKEN="your_finmind_token_here"
```

#### 2. 前端環境變數 (.env 檔案)
在專案根目錄創建 `.env` 檔案：
```env
VITE_FINMIND_TOKEN=your_finmind_token_here
VITE_DEV_TOKEN=your_github_token_here
```

## 🚀 啟動步驟

### 1. 安裝依賴
```bash
npm install
```

### 2. 安裝 Python 依賴
```bash
pip install FinMind tqdm pandas
```

### 3. 設定環境變數
- 複製 `.env.example` 為 `.env`
- 填入正確的 Token 值

### 4. 啟動服務
```bash
# 啟動前端
npm run dev

# 啟動後端 (另一個終端)
cd backend
node server.js
```

## 🔒 安全注意事項

### Token 管理
- ✅ **使用環境變數**：所有 Token 都通過環境變數管理
- ❌ **禁止硬編碼**：絕不在代碼中直接寫入 Token
- ❌ **禁止提交 .env**：.env 檔案已在 .gitignore 中

### GitHub 安全
- 使用 GitHub Secrets 管理雲端環境的 Token
- 定期更新 Token 避免過期
- 監控 GitHub 安全警告

## 🌐 雲端環境

### GitHub Secrets 設定
在 GitHub 倉庫設定中添加以下 Secrets：
- `VITE_FINMIND_TOKEN`: FinMind API Token
- `DEV_GITHUB_TOKEN`: GitHub Personal Access Token
- `FINMIND_TOKEN`: 用於 GitHub Actions 的 FinMind Token

### 自動部署
- GitHub Actions 會自動從 Secrets 讀取 Token
- 建置時注入到環境變數中
- 部署到 GitHub Pages

## 🔧 故障排除

### Token 相關問題
1. **本機端無法使用後門**
   - 檢查 `.env` 檔案是否存在
   - 確認 `VITE_DEV_TOKEN` 是否正確設定

2. **雲端無法使用後門**
   - 檢查 GitHub Secrets 是否正確設定
   - 確認 `DEV_GITHUB_TOKEN` 是否有效

3. **股票清單更新失敗**
   - 檢查 `FINMIND_TOKEN` 環境變數
   - 確認 Token 是否過期

### 常見錯誤
```bash
# 錯誤：找不到 FINMIND_TOKEN
[ERROR] 找不到 FINMIND_TOKEN 環境變數

# 解決：設定環境變數
export FINMIND_TOKEN="your_token_here"
```

## 📋 檢查清單

### 開發前確認
- [ ] `.env` 檔案已創建並填入正確 Token
- [ ] Python 環境已安裝 FinMind 套件
- [ ] Node.js 依賴已安裝
- [ ] 環境變數已正確設定

### 部署前確認
- [ ] GitHub Secrets 已正確設定
- [ ] 代碼中無硬編碼 Token
- [ ] .env 檔案未被提交到 Git
- [ ] 版本號已更新

## 💡 最佳實踐

### 開發環境
1. 使用 `.env` 檔案管理本地 Token
2. 定期更新 Token 避免過期
3. 不要在代碼中硬編碼敏感信息

### 生產環境
1. 使用 GitHub Secrets 管理 Token
2. 監控 Token 使用量和有效期
3. 定期檢查安全警告

---

**重要提醒**：絕不要將 Token 直接寫在代碼中或提交到 Git 倉庫！