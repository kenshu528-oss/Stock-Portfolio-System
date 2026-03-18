# Stock List 增強提案 - 市場類別支援

## 🎯 目標
在現有的 Stock List 基礎上添加市場類別資訊，以支援正確的 Yahoo Finance 後綴判斷。

## 📊 當前結構 vs 建議結構

### 當前結構
```json
{
  "8112": {
    "name": "至上",
    "industry": "電子通路業",
    "market": "台股"
  },
  "4585": {
    "name": "達明", 
    "industry": "電子工業",
    "market": "台股"
  }
}
```

### 建議的新結構
```json
{
  "8112": {
    "name": "至上",
    "industry": "電子通路業",
    "market": "台股",
    "marketType": "上市",
    "yahooSuffix": ".TW"
  },
  "4585": {
    "name": "達明",
    "industry": "電子工業", 
    "market": "台股",
    "marketType": "上櫃",
    "yahooSuffix": ".TWO"
  }
}
```

## 🔧 實作方案

### 方案 A：後端生成增強版 Stock List
使用您提供的 Python 方法，在生成 Stock List 時添加市場類別：

```python
import pandas as pd
from FinMind.data import DataLoader

def enhance_stock_list():
    # 1. 初始化 FinMind API
    api = DataLoader()
    api.login_by_token(api_token="...")
    
    # 2. 獲取全市場清單
    df_info = api.taiwan_stock_info()
    
    # 3. 生成增強版 Stock List
    enhanced_stocks = {}
    
    for _, row in df_info.iterrows():
        stock_id = row['stock_id']
        market_type = row['industry_category']  # '上市', '上櫃', '興櫃'
        
        # 判斷 Yahoo 後綴
        if market_type == '上市':
            yahoo_suffix = '.TW'
        elif market_type in ['上櫃', '興櫃']:
            yahoo_suffix = '.TWO'
        else:
            yahoo_suffix = '.TW'  # 預設
            
        enhanced_stocks[stock_id] = {
            'name': row['stock_name'],
            'industry': row['industry_category'],
            'market': '台股',
            'marketType': market_type,
            'yahooSuffix': yahoo_suffix
        }
    
    return enhanced_stocks
```

### 方案 B：前端智能判斷增強
修改前端的 Stock List 服務，添加市場類別判斷：

```typescript
// src/services/stockListService.ts
interface EnhancedStockInfo {
  name: string;
  industry: string;
  market: string;
  marketType?: '上市' | '上櫃' | '興櫃';
  yahooSuffix?: '.TW' | '.TWO';
}

class StockListService {
  private enhanceStockInfo(stockId: string, basicInfo: StockInfo): EnhancedStockInfo {
    const code = parseInt(stockId.substring(0, 4));
    const isBondETF = /^00\d{2,3}B$/i.test(stockId);
    
    let marketType: '上市' | '上櫃' | '興櫃';
    let yahooSuffix: '.TW' | '.TWO';
    
    if (isBondETF) {
      marketType = '上櫃';
      yahooSuffix = '.TWO';
    } else if (code >= 3000 && code <= 7999) {
      marketType = '上櫃';
      yahooSuffix = '.TWO';
    } else {
      marketType = '上市';
      yahooSuffix = '.TW';
    }
    
    return {
      ...basicInfo,
      marketType,
      yahooSuffix
    };
  }
}
```

## 🎯 推薦實作順序

1. **短期**：使用方案 B，在前端添加智能判斷
2. **中期**：實作方案 A，生成增強版 Stock List
3. **長期**：整合兩種方案，提供最準確的市場分類

## 📋 優勢比較

| 方案 | 優勢 | 劣勢 |
|------|------|------|
| A (後端增強) | 資料準確，來自官方 API | 需要重新生成 Stock List |
| B (前端判斷) | 快速實作，不需要重新生成資料 | 可能有邊界案例錯誤 |

## 🚀 建議實作

建議先實作方案 B，立即解決 8112 等股票的後綴判斷問題，然後再考慮實作方案 A 以獲得更準確的資料。