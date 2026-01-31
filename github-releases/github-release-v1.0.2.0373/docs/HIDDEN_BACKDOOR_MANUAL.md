# 隱蔽後門功能操作手冊

> **重要**：此文檔記錄隱蔽後門功能的完整操作方式，避免日後忘記如何使用和維護。

## 🎯 功能概述

隱蔽後門是一個開發和維護專用的快速 GitHub 連線功能，允許知道觸發方式的人快速建立雲端同步連線，無需手動輸入 Token。

## 🔧 使用方法

### 觸發方式
1. 開啟「雲端同步」設定頁面
2. **連續點擊「使用說明」圖示 5 次**（ℹ️ 圖示）
3. 系統會自動載入 Token 並嘗試連線

### 觸發條件
- ✅ 僅在**未連線狀態**下可觸發
- ❌ 已連線狀態下點擊無效（避免誤操作）

## 🏗️ 技術架構

### Token 載入優先順序
```
1. 環境變數 (VITE_DEV_TOKEN)
   ├─ 本機端：.env 檔案
   └─ 雲端：GitHub Actions 建置時注入
   
2. localStorage (dev_github_token)
   └─ 之前用戶手動輸入並保存的 Token
   
3. 用戶手動輸入
   └─ 前兩步都失敗時提示用戶輸入
```

### 環境差異
| 環境 | Token 來源 | 載入方式 |
|------|------------|----------|
| 本機端 | `.env` 檔案 | 直接讀取 `VITE_DEV_TOKEN` |
| 雲端 | GitHub Secret | 建置時從 `DEV_GITHUB_TOKEN` 映射到 `VITE_DEV_TOKEN` |

## ⚙️ 配置設定

### 本機端配置
1. **編輯 `.env` 檔案**：
   ```bash
   VITE_DEV_TOKEN=your_github_token_here
   ```

2. **重新啟動開發服務器**：
   ```bash
   npm run dev
   ```

### 雲端環境配置

#### 步驟 1：設定 GitHub Secret
1. 前往：`https://github.com/kenshu528-oss/Stock-Portfolio-System/settings/secrets/actions`
2. 點擊「New repository secret」
3. 填入資訊：
   - **Name**: `DEV_GITHUB_TOKEN`
   - **Value**: `your_github_token_here`
4. 點擊「Add secret」

#### 步驟 2：GitHub Actions 配置
`.github/workflows/deploy.yml` 中的關鍵配置：
```yaml
- name: Build
  run: npm run build
  env:
    NODE_ENV: production
    VITE_FINMIND_TOKEN: ${{ secrets.VITE_FINMIND_TOKEN }}
    VITE_DEV_TOKEN: ${{ secrets.DEV_GITHUB_TOKEN }}  # 關鍵映射
```

#### 步驟 3：觸發部署
推送代碼到 `main` 分支，GitHub Actions 會自動建置並部署。

## 🧪 測試驗證

### 本機端測試
1. 啟動開發服務器：`npm run dev`
2. 開啟雲端同步頁面
3. 連續點擊使用說明圖示 5 次
4. **預期結果**：自動載入 Token 並連線成功

### 雲端測試
1. 訪問：`https://kenshu528-oss.github.io/Stock-Portfolio-System/`
2. 開啟雲端同步頁面
3. 連續點擊使用說明圖示 5 次
4. **預期結果**：自動載入 Token 並連線成功（不需手動輸入）

## 🚨 故障排除

### 問題 1：本機端需要手動輸入 Token
**可能原因**：
- `.env` 檔案中的 `VITE_DEV_TOKEN` 未設定或格式錯誤
- 開發服務器未重新啟動

**解決方案**：
1. 檢查 `.env` 檔案內容
2. 確認 Token 以 `ghp_` 開頭
3. 重新啟動：`npm run dev`

### 問題 2：雲端環境需要手動輸入 Token
**可能原因**：
- GitHub Secret `DEV_GITHUB_TOKEN` 未設定
- GitHub Actions 建置失敗
- 瀏覽器快取問題

**解決方案**：
1. 檢查 GitHub Secrets 設定
2. 查看 GitHub Actions 建置日誌
3. 清除瀏覽器快取並重新載入
4. 重新觸發建置（推送新 commit）

### 問題 3：Token 無效或權限不足
**可能原因**：
- Token 已過期
- Token 權限不包含 `repo` 和 `gist`

**解決方案**：
1. 前往 GitHub 重新生成 Token
2. 確保勾選 `repo` 和 `gist` 權限
3. 更新 `.env` 檔案和 GitHub Secret

## 🔐 安全注意事項

### 隱蔽性
- ✅ 無任何視覺提示，完全隱蔽
- ✅ 只有知道觸發方式的人才能使用
- ✅ 已連線狀態下自動禁用

### Token 安全
- ✅ 不在代碼中硬編碼（符合 GitHub 安全規範）
- ✅ 本機端使用 `.env` 檔案（不提交到 Git）
- ✅ 雲端使用 GitHub Secrets（加密存儲）

### 權限控制
- ✅ Token 僅具備必要權限（`repo`, `gist`）
- ✅ 僅在未連線狀態下可觸發
- ✅ 自動保存到 localStorage 供重複使用

## 📝 維護清單

### 定期檢查（每月）
- [ ] 檢查 Token 是否即將過期
- [ ] 測試本機端隱蔽後門功能
- [ ] 測試雲端隱蔽後門功能
- [ ] 檢查 GitHub Actions 建置狀態

### Token 更新時
- [ ] 更新 `.env` 檔案中的 `VITE_DEV_TOKEN`
- [ ] 更新 GitHub Secret `DEV_GITHUB_TOKEN`
- [ ] 測試本機和雲端功能
- [ ] 清除舊的 localStorage 快取

### 代碼變更時
- [ ] 確保隱蔽後門邏輯未被破壞
- [ ] 檢查環境變數載入邏輯
- [ ] 更新相關文檔
- [ ] 執行完整測試

## 📚 相關文檔
- [完整規格文檔](./SPECIFICATION.md#74--隱蔽後門功能規格)
- [GitHub Secret 設定指南](./GITHUB_SECRET_SETUP.md)
- [版本管理規範](../.kiro/steering/version-management.md)

---

**最後更新**：2026-01-29 (v1.0.2.0371)  
**維護者**：開發團隊  
**重要性**：🔴 高（開發和維護必備功能）