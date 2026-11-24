# GitHub Pages 雲端同步解決方案

## 🚨 問題分析

### 當前狀況
- **本機環境** (`localhost:5173`): 雲端同步正常 ✅
- **GitHub Pages** (`https://kenshu528-oss.github.io/Stock-Portfolio-System/`): 雲端同步失敗 ❌

### 根本原因
GitHub Pages 是**靜態網站託管**，無法運行 Node.js 後端服務器，因此：
- ❌ 無法處理 GitHub API 請求
- ❌ 無法執行服務器端的雲端同步邏輯
- ❌ 受到瀏覽器 CORS 安全限制

## 🛠️ 解決方案

### 方案一：Vercel 部署 (推薦)
將整個應用部署到 Vercel，支援全端功能：

```bash
# 1. 安裝 Vercel CLI
npm i -g vercel

# 2. 部署到 Vercel
vercel

# 3. 配置環境變數
vercel env add GITHUB_TOKEN
```

**優點**:
- ✅ 支援前後端完整功能
- ✅ 自動 HTTPS 和 CDN
- ✅ 零配置部署
- ✅ 免費額度充足

### 方案二：Netlify Functions
使用 Netlify 的 Serverless Functions：

```javascript
// netlify/functions/github-sync.js
exports.handler = async (event, context) => {
  // GitHub API 處理邏輯
  return {
    statusCode: 200,
    body: JSON.stringify({ success: true })
  };
};
```

### 方案三：GitHub Actions API
直接使用 GitHub Actions 作為 API：

```yaml
# .github/workflows/sync-data.yml
name: Sync Portfolio Data
on:
  repository_dispatch:
    types: [sync-portfolio]
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Update portfolio data
        run: echo "${{ github.event.client_payload.data }}" > portfolio.json
```

### 方案四：本機專用功能
在 GitHub Pages 版本中禁用雲端同步：

```typescript
// 檢測是否為 GitHub Pages 環境
const isGitHubPages = window.location.hostname.includes('github.io');

if (isGitHubPages) {
  // 隱藏雲端同步功能
  setCloudSyncEnabled(false);
  showNotification('雲端同步功能僅在本機環境可用');
}
```

## 🎯 推薦實作

### 立即解決方案：環境檢測
修改前端代碼，在 GitHub Pages 環境中禁用雲端同步：

```typescript
// src/utils/environment.ts
export const isGitHubPages = () => {
  return window.location.hostname.includes('github.io');
};

export const isLocalDevelopment = () => {
  return window.location.hostname === 'localhost';
};

// src/components/CloudSync.tsx
import { isGitHubPages } from '../utils/environment';

export const CloudSync = () => {
  if (isGitHubPages()) {
    return (
      <div className="text-yellow-400 p-4 rounded bg-yellow-900/20">
        ⚠️ 雲端同步功能僅在本機開發環境可用
        <br />
        請使用 npm run dev 啟動本機版本以使用完整功能
      </div>
    );
  }
  
  // 原有的雲端同步組件
  return <OriginalCloudSyncComponent />;
};
```

### 長期解決方案：Vercel 部署
1. 將專案部署到 Vercel
2. 配置環境變數
3. 更新 GitHub Pages 為重定向頁面

## 📋 實作步驟

### 步驟一：環境檢測 (立即實作)
1. 添加環境檢測工具
2. 修改雲端同步組件
3. 顯示適當的提示訊息

### 步驟二：Vercel 部署 (推薦)
1. 註冊 Vercel 帳號
2. 連接 GitHub 倉庫
3. 配置建置設定
4. 部署完整應用

### 步驟三：更新文檔
1. 更新 README.md
2. 添加部署說明
3. 說明功能差異

## 🔍 技術細節

### GitHub Pages 限制
- 只能託管靜態檔案 (HTML, CSS, JS)
- 無法運行服務器端代碼
- 無法處理 API 請求
- 受到 CORS 限制

### Vercel 優勢
- 支援 Serverless Functions
- 自動建置和部署
- 支援環境變數
- 全球 CDN 加速

## 💡 用戶指引

### 完整功能使用
```bash
# 本機開發 (完整功能)
npm run dev
# 開啟: http://localhost:5173
```

### 展示版本
```
# GitHub Pages (展示用)
https://kenshu528-oss.github.io/Stock-Portfolio-System/
# 功能: 基本投資組合管理 (無雲端同步)
```

### 生產版本 (未來)
```
# Vercel 部署 (完整功能)
https://your-app.vercel.app
# 功能: 完整功能 + 雲端同步
```

---

**總結**: GitHub Pages 適合展示，但完整功能需要支援後端的平台如 Vercel 或 Netlify。