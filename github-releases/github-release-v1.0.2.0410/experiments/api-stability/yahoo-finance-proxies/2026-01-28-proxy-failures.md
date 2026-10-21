# Yahoo Finance 代理服務失敗記錄

## 📅 測試日期
2026-01-28

## 🌐 測試環境
- **本機端**: localhost (file://) - CORS 阻擋
- **雲端**: GitHub Pages (https://kenshu528-oss.github.io) - 代理服務失敗

## 🔍 測試結果

### AllOrigins 代理
- **URL**: `https://api.allorigins.win/raw?url=`
- **狀態**: ❌ 失敗
- **錯誤**: CORS policy blocked + 500 Internal Server Error
- **測試股票**: 2330, 2881, 2886, 2317
- **結論**: 不穩定，經常返回 500 錯誤

### CodeTabs 代理
- **URL**: `https://api.codetabs.com/v1/proxy?quest=`
- **狀態**: ❌ 失敗
- **錯誤**: 連線失敗
- **結論**: 服務可能已停止或不穩定

### ThingProxy 代理
- **URL**: `https://thingproxy.freeboard.io/fetch/`
- **狀態**: ❌ 失敗
- **錯誤**: ERR_NAME_NOT_RESOLVED
- **結論**: DNS 解析失敗，服務可能已停止

## 📊 穩定性評估
| 代理服務 | 可用性 | 穩定性 | 推薦度 |
|---------|--------|--------|--------|
| AllOrigins | 低 | 差 | ❌ |
| CodeTabs | 無 | 無 | ❌ |
| ThingProxy | 無 | 無 | ❌ |

## 💡 結論
Yahoo Finance 代理服務極不穩定，不適合作為生產環境的主要股價來源。

## 🔄 建議方案
1. **本機端**: 繼續使用後端代理 (localhost:3001) → Yahoo Finance
2. **雲端**: 需要尋找更穩定的解決方案
   - 考慮使用 Netlify Functions 作為代理
   - 考慮使用其他穩定的股價 API
   - 考慮實作自己的代理服務

## 📝 備註
用戶反饋："Yahoo Finance 代理服務很不穩定，如果有實驗記錄你就會知道。"
這個反饋非常準確，證實了我們的測試結果。