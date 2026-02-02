# GitHub Secret 設定指南

## 🎯 目的
為了讓隱蔽後門功能在雲端環境（GitHub Pages）中正常工作，需要設定 GitHub Secret 來安全地傳遞 Token。

## 📋 設定步驟

### 1. 前往 GitHub 倉庫設定
1. 開啟 GitHub 倉庫：`https://github.com/kenshu528-oss/Stock-Portfolio-System`
2. 點擊 **Settings** 標籤
3. 在左側選單中點擊 **Secrets and variables** → **Actions**

### 2. 新增 Repository Secret
1. 點擊 **New repository secret** 按鈕
2. 填入以下資訊：
   - **Name**: `DEV_GITHUB_TOKEN`（注意：不是 VITE_DEV_TOKEN）
   - **Value**: `your_github_token_here`（與 .env 檔案中相同）
3. 點擊 **Add secret** 儲存

### 3. 驗證設定
設定完成後，下次推送到 `main` 分支時：
1. GitHub Actions 會自動觸發建置
2. 建置過程中會從 Secret `DEV_GITHUB_TOKEN` 載入並映射到 `VITE_DEV_TOKEN`
3. Token 會被注入到建置產物的環境變數中
4. 部署到 GitHub Pages 後，隱蔽後門功能可以自動載入 Token

## 🔧 工作原理

### 本機端
```
.env 檔案 → VITE_DEV_TOKEN → 隱蔽後門自動載入
```

### 雲端環境
```
GitHub Secret (DEV_GITHUB_TOKEN) → 建置時映射到 VITE_DEV_TOKEN → 隱蔽後門自動載入
```

## 🛡️ 安全性
- Token 不會出現在代碼中（避免 GitHub 推送保護阻擋）
- 只有倉庫管理員可以查看和修改 Secrets
- 建置日誌中不會顯示完整的 Token 值
- 符合 GitHub 安全最佳實踐

## 🧪 測試方法
設定完成後，可以通過以下方式測試：

1. **推送代碼觸發部署**
2. **訪問 GitHub Pages**：`https://kenshu528-oss.github.io/Stock-Portfolio-System/`
3. **觸發隱蔽後門**：在雲端同步頁面連續點擊使用說明圖示 5 次
4. **預期結果**：應該自動載入 Token 並連線，不需要手動輸入

## ❗ 注意事項
- 確保 Secret 名稱完全正確：`DEV_GITHUB_TOKEN`（GitHub Secret 命名規則不允許底線開頭）
- Token 值必須以 `ghp_` 開頭
- 設定後需要重新觸發 GitHub Actions 建置
- 如果仍需手動輸入，檢查建置日誌中的環境變數載入情況

## 🔍 故障排除
如果隱蔽後門仍需要手動輸入：

1. **檢查 Secret 設定**：確認名稱和值正確
2. **檢查建置日誌**：查看 "Debug environment variables" 步驟
3. **重新觸發建置**：推送新的 commit 或手動觸發 Actions
4. **清除瀏覽器快取**：確保載入最新的建置產物