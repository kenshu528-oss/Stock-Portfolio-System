# API 資料完整性規則 (API Data Integrity Rules)

## 🎯 核心原則：真實資料優先

### 絕對禁止的操作
- ❌ **使用本地硬編碼股票名稱對照表**
- ❌ **提供虛假或過時的股票資料**
- ❌ **在API失敗時返回預設價格**
- ❌ **混用真實API資料和虛假本地資料**

## ✅ 強制要求

### 1. 資料來源限制
```javascript
// ✅ 允許的資料來源
- Yahoo Finance API
- 台灣證交所 API
- 其他官方金融API

// ❌ 禁止的資料來源
- 本地硬編碼對照表
- 預設虛假價格
- 過時的靜態資料
```

### 2. API 失敗處理
```javascript
// ✅ 正確的失敗處理
if (!apiData) {
  return res.status(404).json({
    error: 'Stock not found',
    message: '找不到股票資訊，請確認股票代碼是否正確'
  });
}

// ❌ 錯誤的失敗處理
if (!apiData) {
  return {
    name: '股票名稱',  // 虛假資料
    price: 10.0       // 虛假價格
  };
}
```

### 3. 資料驗證原則
- ✅ 所有股票資料必須來自官方API
- ✅ API失敗時明確告知用戶
- ✅ 不提供任何虛假或預設資料
- ✅ 保持資料的時效性和準確性

## 🚨 錯誤處理策略

### 當API無法獲取資料時
1. **立即返回404錯誤**
2. **提供清楚的錯誤訊息**
3. **建議用戶檢查股票代碼**
4. **絕不提供虛假資料**

### 用戶體驗考量
```javascript
// ✅ 誠實的錯誤訊息
"找不到股票代碼 XXXX 的資訊，請確認代碼是否正確"

// ❌ 誤導性的虛假資料
"股票XXXX, 價格: $10.00" (虛假資料)
```

## 📋 實作檢查清單

### API服務必須確認
- [ ] 移除所有本地股票名稱對照表
- [ ] 移除所有預設價格設定
- [ ] API失敗時返回明確的404錯誤
- [ ] 錯誤訊息清楚說明問題
- [ ] 不提供任何虛假的備用資料

### 前端處理必須確認
- [ ] 正確處理API 404錯誤
- [ ] 向用戶顯示清楚的錯誤訊息
- [ ] 不顯示任何虛假的股票資料
- [ ] 提供重新搜尋的建議

## 🔍 資料品質保證

### 每次API調用必須
1. **驗證API回應的完整性**
2. **確認資料的時效性**
3. **檢查必要欄位是否存在**
4. **記錄資料來源和時間戳**

### 禁止的備用機制
- ❌ 本地股票名稱對照表
- ❌ 預設股票價格
- ❌ 過時的快取資料
- ❌ 任何形式的虛假資料

## 💡 最佳實踐

### API整合原則
```javascript
// ✅ 正確的API整合
async function getStockData(symbol) {
  try {
    // 嘗試Yahoo Finance
    const yahooData = await getYahooStockPrice(symbol);
    if (yahooData && yahooData.name && yahooData.price > 0) {
      return yahooData;
    }
    
    // 嘗試證交所API
    const twseData = await getTWSEStockPrice(symbol);
    if (twseData && twseData.name && twseData.price > 0) {
      return twseData;
    }
    
    // 兩個API都失敗，返回null
    return null;
  } catch (error) {
    console.error('API錯誤:', error);
    return null;
  }
}
```

### 錯誤回應標準
```javascript
// ✅ 標準錯誤回應
{
  "error": "Stock not found",
  "message": "找不到股票代碼 XXXX 的資訊",
  "suggestions": [
    "請確認股票代碼是否正確",
    "檢查是否為有效的台股代碼",
    "稍後再試或聯繫客服"
  ]
}
```

## 🎯 品質目標

### 資料準確性
- **100%** 的股票資料來自官方API
- **0%** 的虛假或預設資料
- **即時** 的價格和名稱資訊
- **透明** 的資料來源標示

### 用戶體驗
- **誠實** 的錯誤訊息
- **清楚** 的問題說明
- **有用** 的解決建議
- **一致** 的錯誤處理

---

**記住：寧願誠實地說「找不到」，也不要提供虛假資料！用戶信任比功能完整性更重要！**