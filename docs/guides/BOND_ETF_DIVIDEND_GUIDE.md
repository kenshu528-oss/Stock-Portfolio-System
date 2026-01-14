# 債券 ETF 配息資料獲取指南

## 📊 問題說明

債券 ETF（如 00679B、00687B）的配息資料在各 API 的支援情況：

| API | 支援情況 | 說明 |
|-----|---------|------|
| **FinMind** | ❌ 部分不支援 | 00679B 無資料，00687B 有資料 |
| **Yahoo Finance** | ❌ 不支援 | 台灣債券 ETF 無資料 |
| **GoodInfo** | ⚠️ 有反爬蟲 | 技術上可行，但穩定性低 |
| **證交所** | ✅ 官方資料 | 需要手動查詢 |

## 🎯 推薦解決方案

### 方案 1：手動輸入（最實用）

**步驟**：
1. 前往 [GoodInfo](https://goodinfo.tw/tw/StockDividendPolicy.asp?STOCK_ID=00679B)
2. 查看配息記錄
3. 在系統中手動輸入

**優勢**：
- ✅ 資料準確
- ✅ 不受 API 限制
- ✅ 一次輸入，永久保存

### 方案 2：批量匯入（進階）

**步驟**：
1. 從 GoodInfo 複製配息表格
2. 使用系統的「匯入功能」
3. 自動解析並導入

## 📝 常見債券 ETF 配息資料來源

### 00679B 元大美債20年
- **GoodInfo**: https://goodinfo.tw/tw/StockDividendPolicy.asp?STOCK_ID=00679B
- **元大投信**: https://www.yuantafunds.com/
- **配息頻率**: 月配息

### 00687B 國泰20年美債
- **GoodInfo**: https://goodinfo.tw/tw/StockDividendPolicy.asp?STOCK_ID=00687B
- **國泰投信**: https://www.cathaysite.com.tw/
- **配息頻率**: 月配息
- **FinMind**: ✅ 有資料

### 00720B 元大投資級公司債
- **GoodInfo**: https://goodinfo.tw/tw/StockDividendPolicy.asp?STOCK_ID=00720B
- **元大投信**: https://www.yuantafunds.com/
- **配息頻率**: 月配息

## 🔧 系統改進計畫

### 短期（已完成）
- ✅ 優化 API 調用順序
- ✅ 提供清楚的錯誤訊息
- ✅ 手動輸入介面

### 中期（規劃中）
- 📋 批量匯入功能
- 📋 配息資料模板下載
- 📋 常見 ETF 配息預設值

### 長期（考慮中）
- 🔮 Puppeteer 爬蟲（更穩定）
- 🔮 與投信公司 API 整合
- 🔮 社群共享配息資料庫

## 💡 使用建議

### 對於月配息 ETF（如 00679B）
- **建議**：每月手動輸入一次
- **時間**：配息日後 1-2 天
- **來源**：GoodInfo 或投信官網

### 對於季配息 ETF
- **建議**：每季手動輸入
- **時間**：除息日當天或之後
- **來源**：FinMind API（如有）或 GoodInfo

## 📞 技術支援

如果遇到問題：
1. 檢查 [GoodInfo](https://goodinfo.tw/) 是否有資料
2. 嘗試使用「手動股息管理」功能
3. 參考本指南的資料來源連結

---

**更新日期**: 2026-01-14  
**版本**: v1.0.2.0127
