# GitHub 股票清單自動更新失敗修復指南

## 🚨 問題診斷

根據你提供的截圖，GitHub Actions 的 "Update Stock List" workflow 顯示 "All jobs have failed"。

## 🔍 根本原因

GitHub Actions 無法訪問 `.env` 文件中的 `FINMIND_TOKEN`，因為：

1. `.env` 文件在 `.gitignore` 中，不會上傳到 GitHub
2. GitHub Actions 需要使用 GitHub Secrets 來存儲敏感資訊
3. 當前 workflow 配置期望從 `secrets.FINMIND_TOKEN` 讀取 Token

## ✅ 解決方案

### 方案 1：在 GitHub 設定 Secret（推薦）

1. **前往 GitHub 倉庫設定**
   - 打開你的 GitHub 倉庫：https://github.com/kenshu528-oss/Stock-Portfolio-System
   - 點擊 `Settings` 標籤
   - 在左側選單找到 `Secrets and variables` → `Actions`

2. **新增 Repository Secret**
   - 點擊 `New repository secret`
   - Name: `FINMIND_TOKEN`
   - Secret: 貼上你的 FinMind Token
   ```
   eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJkYXRlIjoiMjAyNi0wMS0yNiAwODowMToyNSIsInVzZXJfaWQiOiJrZW5zaHU1MjgiLCJlbWFpbCI6ImtlbnNodTUyOEBnbWFpbC5jb20iLCJpcCI6IjYxLjIxOC4xMTMuMTk0In0.uRKsSxZst5hgCJJYx7K5wNWlKL90z5YkBc2yHfauiiY
   ```
   - 點擊 `Add secret`

3. **手動觸發 Workflow 測試**
   - 前往 `Actions` 標籤
   - 選擇 `Update Stock List` workflow
   - 點擊 `Run workflow` → `Run workflow`
   - 等待執行完成，檢查是否成功

### 方案 2：修改 Workflow 使用內建 Token（臨時方案）

如果你不想在 GitHub 設定 Secret，可以修改 workflow 直接在腳本中使用 Token：

```yaml
# .github/workflows/update-stock-list.yml
- name: Fetch stock list
  if: env.SKIP_UPDATE != 'true'
  env:
    FINMIND_TOKEN: "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJkYXRlIjoiMjAyNi0wMS0yNiAwODowMToyNSIsInVzZXJfaWQiOiJrZW5zaHU1MjgiLCJlbWFpbCI6ImtlbnNodTUyOEBnbWFpbC5jb20iLCJpcCI6IjYxLjIxOC4xMTMuMTk0In0.uRKsSxZst5hgCJJYx7K5wNWlKL90z5YkBc2yHfauiiY"
  run: |
    echo "🚀 開始執行股票清單更新..."
    cd backend
    python fetch_stock_list.py --force
```

⚠️ **注意**：此方案會將 Token 暴露在公開的 GitHub 倉庫中，不建議用於生產環境。

## 🧪 驗證修復

### 1. 檢查 Secret 是否設定成功

前往 GitHub Actions 頁面，查看最新的 workflow 執行日誌：

```
✅ 使用 GitHub secret 中的 FINMIND_TOKEN
🚀 開始執行股票清單更新...
[OK] Token 驗證成功
[INFO] 正在下載股票資訊...
[OK] 成功下載 XXXX 筆股票資料
```

### 2. 檢查股票清單是否生成

在倉庫中應該看到：
- `public/stock_list.json` - 最新的股票清單
- 新的 commit：`🤖 自動更新股票清單 YYYY-MM-DD`

### 3. 本地測試

你也可以在本地測試 Python 腳本是否正常工作：

```bash
# 在專案根目錄執行
cd backend
python fetch_stock_list.py --force
```

應該看到：
```
[OK] 使用環境變數中的 FINMIND_TOKEN
[OK] Token 驗證成功
[INFO] 正在下載股票資訊...
[OK] 成功下載 XXXX 筆股票資料
[INFO] 統一檔案已存為: ../public/stock_list.json
```

## 📋 常見問題

### Q1: 為什麼需要設定 GitHub Secret？

A: `.env` 文件包含敏感資訊，不應該上傳到 GitHub。GitHub Actions 使用 Secrets 來安全地存儲這些資訊。

### Q2: Token 會過期嗎？

A: FinMind 的 Token 通常不會過期，但如果遇到認證失敗，可能需要重新申請。

### Q3: 如何查看 workflow 失敗的詳細原因？

A: 
1. 前往 GitHub 倉庫的 `Actions` 標籤
2. 點擊失敗的 workflow run
3. 展開失敗的 step，查看詳細日誌

### Q4: 可以手動觸發更新嗎？

A: 可以！前往 `Actions` → `Update Stock List` → `Run workflow`

## 🎯 預期結果

設定完成後，系統會：

1. **每日自動更新**：台灣時間早上 6:00 自動執行
2. **生成股票清單**：`public/stock_list.json`
3. **自動提交**：推送到 GitHub 倉庫
4. **觸發部署**：GitHub Pages 自動更新

## 📞 需要協助？

如果按照以上步驟仍然失敗，請提供：
1. GitHub Actions 的完整日誌
2. 失敗的具體錯誤訊息
3. 是否已正確設定 Secret

---

**更新日期**: 2026-02-23  
**適用版本**: v1.0.2.0387+
