# 統一 Vercel 架構規範

## 🎯 概述

將本機端和雲端環境統一使用 Vercel Edge Functions，移除本機端後端服務器依賴。

## 📋 實作計劃

### 階段 1: 配置統一化
```typescript
// src/config/api.ts - 簡化版
export const shouldUseBackendProxy = (): boolean => {
  // 統一返回 false，所有環境都使用 Vercel Edge Functions
  return false;
};

export const API_CONFIG = {
  VERCEL_EDGE: {
    baseUrl: 'https://vercel-stock-api.vercel.app/api',
    timeout: 10000
  }
};
```

### 階段 2: 服務層統一
```typescript
// src/services/unifiedStockPriceService.ts
export class UnifiedStockPriceService {
  async getStockPrice(symbol: string): Promise<StockPrice | null> {
    // 統一使用 Vercel Edge Functions
    return await VercelStockPriceService.getStockPrice(symbol);
  }
  
  async getBatchStockPrices(symbols: string[]): Promise<Map<string, StockPrice>> {
    // 批量獲取實作
    return await VercelStockPriceService.getBatchStockPrices(symbols);
  }
}
```

### 階段 3: 移除後端依賴
- 移除 `backend/` 資料夾
- 更新 `package.json` scripts
- 修改開發文檔

## ⚖️ 權衡考量

### 適合統一的情況
- 團隊規模較小，維護成本敏感
- Vercel Edge Functions 穩定性滿足需求
- 不需要複雜的本機端調試

### 保留後端的情況
- 需要本機端離線開發
- 有複雜的 API 邏輯需要調試
- 對外部服務依賴有顧慮

## 🚀 推薦方案

**漸進式遷移**：
1. 先實作統一架構
2. 保留後端服務器作為可選項
3. 根據實際使用情況決定是否完全移除