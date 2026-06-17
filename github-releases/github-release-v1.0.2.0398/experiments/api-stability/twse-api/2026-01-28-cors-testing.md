# 證交所 API CORS 限制測試記錄

## 📅 測試日期
2026-01-28

## 🎯 測試目標
驗證證交所 MIS API 在不同環境下的可用性

## 🧪 測試環境

### Python 環境 (服務器端)
- **環境**: 本機 Python 腳本
- **測試股票**: 5314 (世紀)
- **API URL**: `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=otc_5314.tw&json=1`
- **結果**: ✅ 成功
- **數據**:
  ```
  股票名稱: 世紀
  成交價: 103.0000
  成交量: 17001
  時間: 13:30:00
  ```

### 瀏覽器環境 (本機端)
- **環境**: file:// 協議
- **結果**: ❌ CORS 阻擋
- **錯誤**: `Access to fetch at 'https://mis.twse.com.tw/...' from origin 'null' has been blocked by CORS policy`

### 瀏覽器環境 (GitHub Pages)
- **環境**: https://kenshu528-oss.github.io
- **結果**: ❌ CORS 阻擋
- **錯誤**: `Access to fetch at 'https://mis.twse.com.tw/...' from origin 'https://kenshu528-oss.github.io' has been blocked by CORS policy`
- **HTTP 狀態**: 200 (OK) - API 本身正常，但被 CORS 阻擋

## 📊 測試結果總結

| 環境類型 | 協議 | CORS 限制 | 可用性 | 備註 |
|---------|------|-----------|--------|------|
| Python 腳本 | HTTPS | 無 | ✅ | 服務器端調用正常 |
| 本機檔案 | file:// | 有 | ❌ | 瀏覽器 CORS 阻擋 |
| GitHub Pages | https:// | 有 | ❌ | 瀏覽器 CORS 阻擋 |

## 🔍 技術分析

### CORS 政策
證交所 API 沒有設定 `Access-Control-Allow-Origin` 標頭，因此：
- ✅ **服務器端調用**: 無 CORS 限制，可正常使用
- ❌ **瀏覽器調用**: 被 CORS 政策阻擋

### 買進價格式發現
用戶 Python 實驗發現 `b` 欄位格式為 "價格_張數_"，需要 `split('_')[0]` 提取價格。

## 💡 架構建議

### 正確的使用方式
1. **服務器端**: Python/Node.js 等後端服務可直接調用
2. **瀏覽器端**: 必須通過代理服務器調用

### 推薦架構
- **本機端**: 前端 → 後端代理 (localhost:3001) → 證交所 API
- **雲端**: 需要實作 Netlify Functions 或其他代理服務

## 📝 結論
證交所 API 本身穩定可靠，但有嚴格的 CORS 限制。不能直接在瀏覽器中調用，必須通過服務器端代理。

## 🔄 後續行動
1. 考慮在 Netlify Functions 中實作證交所 API 代理
2. 評估其他無 CORS 限制的股價 API
3. 維持本機端使用後端代理的架構