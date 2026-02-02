# 測試文件資料夾

## 📁 資料夾結構

此資料夾包含所有測試、調試和驗證相關的文件。

## 🧪 測試文件分類

### 股價獲取測試
- `test-stock-price-service.html` - 股價服務測試
- `test-00981a-stock-price.html` - 00981A ETF 股價獲取測試
- `test-00981a-fix.html` - 00981A 後綴修復驗證

### API 驗證測試
- `test-cloud-api-validation.html` - 雲端 API 驗證
- `test-twse-api.html` - 證交所 API 測試
- `test-twse-standalone.html` - 證交所獨立測試
- `test-twse-daily-validation.html` - 證交所每日驗證

### 股票搜尋測試
- `test-cloud-stock-search.html` - 雲端股票搜尋測試

### Stock List 相關測試
- `test-stock-list-update.html` - Stock List 更新測試
- `test-stock-list-enhancement.html` - Stock List 強化機制測試

### 環境和配置測試
- `test-environment-detection.html` - 環境檢測測試
- `test-env.html` - 環境變數測試
- `test-token.html` - API Token 測試

### 功能測試
- `test-component.html` - 組件測試
- `test-fix.html` - 修復驗證測試
- `test-task1.html` - 任務測試

### 調試工具
- `simple-debug.html` - 簡單調試工具
- `diagnose-github-api.html` - GitHub API 診斷
- `console-debug.js` - Console 調試腳本
- `debug-console.js` - 調試 Console 工具
- `enable-debug.js` - 啟用調試模式
- `enable-debug-logs.js` - 啟用調試日誌

## 🎯 使用指南

### 1. 股價問題調試
如果遇到股價獲取問題：
1. 先使用 `test-environment-detection.html` 檢測環境
2. 使用 `test-stock-price-service.html` 測試股價服務
3. 針對特定股票使用對應的測試文件

### 2. API 問題調試
如果遇到 API 調用問題：
1. 使用 `test-cloud-api-validation.html` 驗證雲端 API
2. 使用 `test-twse-api.html` 測試證交所 API
3. 檢查 `test-token.html` 確認 API Token 有效性

### 3. 搜尋功能調試
如果遇到股票搜尋問題：
1. 使用 `test-cloud-stock-search.html` 測試搜尋功能
2. 檢查 Stock List 相關測試文件

### 4. 環境配置調試
如果遇到環境相關問題：
1. 使用 `test-environment-detection.html` 檢測環境
2. 使用 `test-env.html` 檢查環境變數
3. 確認本機端和雲端機制選擇正確

## 📋 測試最佳實踐

### 1. 測試順序
1. **環境檢測** → 確認當前環境和服務選擇
2. **基礎 API** → 測試基本的 API 連通性
3. **股價服務** → 測試股價獲取功能
4. **特定問題** → 使用針對性測試文件

### 2. 問題排查
1. **查看 Console 日誌** → 了解詳細錯誤信息
2. **使用對應測試文件** → 隔離問題範圍
3. **檢查環境配置** → 確認服務選擇正確
4. **驗證修復效果** → 使用測試文件確認

### 3. 新增測試
當添加新功能或修復問題時：
1. 創建對應的測試文件
2. 放置在此資料夾中
3. 更新此 README 文件
4. 在相關文檔中引用測試文件

## 🔧 調試工具使用

### Console 調試
```javascript
// 載入調試腳本
<script src="tests/console-debug.js"></script>

// 啟用調試模式
<script src="tests/enable-debug.js"></script>
```

### 環境檢測
```javascript
// 在瀏覽器 Console 中執行
console.log('環境資訊:', getEnvironmentInfo());
```

## 📈 維護指南

### 定期檢查
- 每週檢查測試文件是否正常工作
- 每月更新過時的測試案例
- 每季整理和歸檔舊的測試文件

### 文件命名規範
- `test-{功能名稱}.html` - 功能測試
- `debug-{問題描述}.html` - 調試工具
- `diagnose-{系統名稱}.html` - 診斷工具

---

**建立日期**: 2026-01-28  
**版本**: v1.0.0  
**維護者**: Stock Portfolio System 開發團隊