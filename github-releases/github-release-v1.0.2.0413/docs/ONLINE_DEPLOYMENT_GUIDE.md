# 線上版部署指南

## 🚨 **線上版的挑戰**

當前的股票搜尋系統在線上版（GitHub Pages、Netlify）會遇到以下問題：

### **GitHub Pages 限制**
- ❌ **無後端支援**：只能託管靜態檔案
- ❌ **無 Python 執行**：無法執行 `fetch_stock_list.py`
- ❌ **無檔案寫入**：無法動態生成 JSON 檔案
- ❌ **無定時任務**：無法設定每日自動抓取

### **Netlify 限制**
- ❌ **Serverless Functions 限制**：有執行時間和頻率限制
- ❌ **檔案系統唯讀**：無法寫入持久化檔案

## 🔧 **推薦解決方案**

### **方案 A：GitHub Actions + 靜態檔案（推薦）**

#### 1. 創建 GitHub Actions 工作流程

```yaml
# .github/workflows/update-stock-list.yml
name: Update Stock List

on:
  schedule:
    # 每日台灣時間 8:00 執行（UTC 0:00）
    - cron: '0 0 * * *'
  workflow_dispatch: # 允許手動觸發

jobs:
  update-stock-list:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout repository
      uses: actions/checkout@v4
      
    - name: Setup Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.9'
        
    - name: Install Python dependencies
      run: |
        pip install FinMind tqdm pandas
        
    - name: Fetch stock list
      run: |
        python backend/fetch_stock_list.py
        
    - name: Copy to public directory
      run: |
        mkdir -p public
        cp stock_list_$(date +%Y-%m-%d).json public/stock_list.json
        
    - name: Commit and push changes
      run: |
        git config --local user.email "action@github.com"
        git config --local user.name "GitHub Action"
        git add public/stock_list.json
        git commit -m "Update stock list $(date +%Y-%m-%d)" || exit 0
        git push
```

#### 2. 修改建置腳本

```json
// package.json
{
  "scripts": {
    "build": "npm run build:stock-list && vite build",
    "build:stock-list": "node scripts/build_stock_list.js",
    "dev": "vite",
    "preview": "vite preview"
  }
}
```

#### 3. 前端使用靜態檔案

前端會自動偵測環境：
- **本地開發**：使用後端 API
- **線上版**：使用靜態 JSON 檔案

### **方案 B：Netlify Functions（進階）**

#### 1. 創建 Netlify Function

```javascript
// netlify/functions/stock-search.js
const axios = require('axios');

exports.handler = async (event, context) => {
  const { query } = event.queryStringParameters;
  
  if (!query || query.length < 2) {
    return {
      statusCode: 200,
      body: JSON.stringify([])
    };
  }
  
  try {
    // 使用 FinMind API（注意額度限制）
    const response = await axios.get(
      `https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockInfo&token=`
    );
    
    // 搜尋邏輯...
    const results = filterAndGetPrices(response.data, query);
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(results)
    };
    
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Search failed' })
    };
  }
};
```

#### 2. 配置 Netlify

```toml
# netlify.toml
[build]
  functions = "netlify/functions"
  
[[redirects]]
  from = "/api/stock-search"
  to = "/.netlify/functions/stock-search"
  status = 200
```

### **方案 C：混合模式（最佳）**

#### 1. 環境偵測

```typescript
// src/config/environment.ts
export const isGitHubPages = window.location.hostname.includes('github.io');
export const isNetlify = window.location.hostname.includes('netlify.app');
export const isProduction = process.env.NODE_ENV === 'production';
export const hasBackend = !isGitHubPages && !isProduction;

export const getApiStrategy = () => {
  if (hasBackend) return 'backend';
  if (isNetlify) return 'netlify-functions';
  return 'static';
};
```

#### 2. 統一搜尋介面

```typescript
// src/services/stockSearchService.ts
import { getApiStrategy } from '../config/environment';
import { staticStockSearchService } from './staticStockSearch';
import { backendStockSearchService } from './backendStockSearch';
import { netlifyStockSearchService } from './netlifyStockSearch';

export class UnifiedStockSearchService {
  async searchStocks(query: string): Promise<StockSearchResult[]> {
    const strategy = getApiStrategy();
    
    switch (strategy) {
      case 'backend':
        return await backendStockSearchService.searchStocks(query);
        
      case 'netlify-functions':
        return await netlifyStockSearchService.searchStocks(query);
        
      case 'static':
      default:
        return await staticStockSearchService.searchStocks(query);
    }
  }
}
```

## 📋 **部署檢查清單**

### **GitHub Pages 部署**
- [ ] 設定 GitHub Actions 工作流程
- [ ] 確保 FinMind Token 在 GitHub Secrets 中
- [ ] 測試 Actions 是否正常執行
- [ ] 驗證 `public/stock_list.json` 是否生成
- [ ] 測試前端搜尋功能

### **Netlify 部署**
- [ ] 配置 Netlify Functions
- [ ] 設定環境變數（FinMind Token）
- [ ] 測試 Functions 是否正常運作
- [ ] 配置重定向規則
- [ ] 監控 API 使用量

### **本地開發**
- [ ] 確保後端 API 正常運作
- [ ] 測試股票清單抓取腳本
- [ ] 驗證前端環境偵測邏輯
- [ ] 測試所有搜尋模式

## 🎯 **推薦策略**

### **短期解決方案**
1. **使用方案 A**：GitHub Actions + 靜態檔案
2. **每日自動更新**：透過 GitHub Actions
3. **前端自動偵測**：本地用後端，線上用靜態檔案

### **長期解決方案**
1. **考慮付費 FinMind**：解除 API 額度限制
2. **自建股票資料庫**：定期同步更新
3. **使用其他免費 API**：如 Alpha Vantage、IEX Cloud

## 💡 **最佳實踐**

### **效能優化**
- 壓縮 JSON 檔案大小
- 使用 CDN 加速檔案載入
- 實作前端快取機制

### **錯誤處理**
- 優雅降級：靜態檔案失敗時使用 FinMind 備用
- 用戶提示：清楚告知搜尋狀態
- 監控告警：追蹤 API 使用量和錯誤率

### **維護性**
- 自動化部署流程
- 版本控制股票清單
- 定期檢查 API 可用性

**結論：推薦使用 GitHub Actions + 靜態檔案的方案，既解決了線上版的限制，又保持了良好的用戶體驗。** 🎯✨