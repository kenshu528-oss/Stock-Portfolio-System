# Stock Portfolio System 開發指南

## 🚀 快速開始

### 環境要求
- **Node.js**: >= 18.0.0
- **npm**: >= 8.0.0
- **Git**: 最新版本
- **瀏覽器**: Chrome/Firefox/Safari 最新版本

### 安裝與啟動
```bash
# 1. 克隆專案
git clone https://github.com/your-username/Stock-Portfolio-System.git
cd Stock-Portfolio-System

# 2. 安裝依賴
npm install

# 3. 啟動開發服務器
npm run dev

# 4. 開啟瀏覽器
# 訪問 http://localhost:5173
```

---

## 🏗️ 專案結構

### 目錄結構
```
Stock-Portfolio-System/
├── src/                          # 源代碼
│   ├── components/               # React 組件
│   │   ├── ui/                  # 基礎 UI 組件
│   │   ├── AccountManager.tsx   # 帳戶管理
│   │   ├── StockList.tsx       # 股票列表
│   │   └── ...
│   ├── services/                # 業務邏輯服務
│   │   ├── stockPriceService.ts # 股價服務
│   │   ├── dividendApiService.ts # 除權息服務
│   │   └── ...
│   ├── stores/                  # 狀態管理
│   │   ├── appStore.ts         # 主要應用狀態
│   │   └── ...
│   ├── types/                   # TypeScript 類型定義
│   ├── utils/                   # 工具函數
│   ├── hooks/                   # 自定義 Hooks
│   └── constants/               # 常數定義
├── docs/                        # 文檔
├── scripts/                     # 建置腳本
├── backend/                     # 後端服務
└── public/                      # 靜態資源
```

### 核心文件說明
- **App.tsx**: 主應用組件
- **appStore.ts**: Zustand 狀態管理
- **types/index.ts**: 全域類型定義
- **version.ts**: 版本管理
- **changelog.ts**: 變更記錄

---

## 🛠️ 開發工具

### 可用命令
```bash
# 開發
npm run dev              # 啟動開發服務器
npm run dev:assistant    # 啟動開發助手

# 建置
npm run build           # 建置生產版本
npm run preview         # 預覽生產版本

# 測試
npm run test            # 執行測試
npm run test:watch      # 監視模式測試

# 代碼品質
npm run lint            # ESLint 檢查
npm run check:all       # 完整品質檢查
npm run check:svg       # SVG 格式檢查
npm run check:version   # 版本號一致性檢查
npm run check:state     # 狀態管理檢查
npm run check:rights    # 除權息計算檢查
```

### 開發助手
```bash
# 啟動開發助手（推薦）
npm run dev:assistant

# 功能：
# - 自動檢查代碼品質
# - 版本號一致性驗證
# - 開發環境狀態監控
# - 常見問題提示
```

---

## 📋 開發規範

### 1. 代碼風格

#### TypeScript 規範
```typescript
// ✅ 好的範例
interface StockRecord {
  id: string;
  symbol: string;
  name: string;
  shares: number;
  costPrice: number;
}

const updateStock = (id: string, updates: Partial<StockRecord>): void => {
  // 實作邏輯
};

// ❌ 避免的寫法
const updateStock = (id, updates) => {
  // 缺少類型定義
};
```

#### React 組件規範
```typescript
// ✅ 函數組件 + TypeScript
interface StockRowProps {
  stock: StockRecord;
  onUpdate: (id: string, updates: Partial<StockRecord>) => void;
  onDelete: (id: string) => void;
}

export const StockRow: React.FC<StockRowProps> = ({ 
  stock, 
  onUpdate, 
  onDelete 
}) => {
  return (
    <tr className="border-b border-slate-700">
      {/* 組件內容 */}
    </tr>
  );
};
```

### 2. 狀態管理規範

#### Zustand Store 使用
```typescript
// ✅ 正確的 store 使用
const { stocks, addStock, updateStock } = useAppStore();

// 添加股票
const handleAddStock = (stockData: StockFormData) => {
  const newStock: StockRecord = {
    id: generateId(),
    ...stockData,
    // 其他必要欄位
  };
  addStock(newStock);
};

// ❌ 避免直接修改狀態
const handleBadUpdate = () => {
  stocks[0].price = 100; // 不要這樣做
};
```

#### 持久化狀態管理
```typescript
// 需要持久化的狀態
const persistedState = {
  currentAccount: state.currentAccount,
  accounts: state.accounts,
  stocks: state.stocks,
  isPrivacyMode: state.isPrivacyMode,
  rightsAdjustmentMode: state.rightsAdjustmentMode,
};

// 不需要持久化的狀態
const temporaryState = {
  isSidebarOpen: false,
  isLoading: false,
  errorMessage: null,
};
```

### 3. API 服務規範

#### 錯誤處理
```typescript
// ✅ 正確的錯誤處理
async function getStockPrice(symbol: string): Promise<StockPrice | null> {
  try {
    const response = await fetch(API_ENDPOINTS.getStock(symbol));
    
    if (!response.ok) {
      if (response.status === 404) {
        // 404 是正常情況，不輸出警告
        return null;
      }
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    return validateStockPrice(data);
  } catch (error) {
    logger.error('api', `股價查詢失敗: ${symbol}`, error);
    return null; // 不提供虛假資料
  }
}
```

#### API 優先順序
```typescript
// ✅ 多重 API 備援
async function getStockPriceWithFallback(symbol: string): Promise<StockPrice | null> {
  // 1. 主要 API
  try {
    const result = await getStockPriceFromFinMind(symbol);
    if (result) return result;
  } catch (error) {
    logger.warn('api', 'FinMind API 失敗，嘗試備用 API');
  }
  
  // 2. 備用 API
  try {
    const result = await getStockPriceFromYahoo(symbol);
    if (result) return result;
  } catch (error) {
    logger.warn('api', 'Yahoo API 失敗');
  }
  
  // 3. 最後備用
  return await getStockPriceFromTWSE(symbol);
}
```

### 4. 日誌系統規範

#### Logger 使用
```typescript
import { logger } from '../utils/logger';

// ✅ 正確使用 logger
logger.info('stock', '開始更新股價', { count: stocks.length });
logger.success('stock', '股價更新完成', { updated: 5, failed: 1 });
logger.warn('api', 'API 回應慢', { responseTime: 5000 });
logger.error('dividend', '除權息計算失敗', error);
logger.debug('stock', '股票詳細資料', { symbol: '2330', price: 500 });

// ❌ 禁止直接使用 console
console.log('這樣不好'); // 不要這樣做
```

#### 日誌等級控制
```typescript
// 開發時調整日誌等級
if (process.env.NODE_ENV === 'development') {
  // 在瀏覽器 Console 中執行
  window.setLogLevel('dividend', 3); // DEBUG
  window.setLogLevel('api', 1);      // WARN
}
```

---

## 🧪 測試指南

### 1. 測試結構

#### 測試文件命名
```
src/components/StockRow.tsx
src/components/StockRow.test.tsx          # 單元測試
src/components/StockRow.property.test.tsx # 屬性測試
```

#### 基本測試範例
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { StockRow } from './StockRow';

describe('StockRow', () => {
  const mockStock: StockRecord = {
    id: '1',
    symbol: '2330',
    name: '台積電',
    shares: 1000,
    costPrice: 500,
    // ... 其他必要欄位
  };

  it('should display stock information', () => {
    render(
      <StockRow 
        stock={mockStock} 
        onUpdate={jest.fn()} 
        onDelete={jest.fn()} 
      />
    );
    
    expect(screen.getByText('2330')).toBeInTheDocument();
    expect(screen.getByText('台積電')).toBeInTheDocument();
  });

  it('should call onDelete when delete button is clicked', () => {
    const mockOnDelete = jest.fn();
    
    render(
      <StockRow 
        stock={mockStock} 
        onUpdate={jest.fn()} 
        onDelete={mockOnDelete} 
      />
    );
    
    fireEvent.click(screen.getByRole('button', { name: /刪除/i }));
    expect(mockOnDelete).toHaveBeenCalledWith('1');
  });
});
```

### 2. 屬性測試

#### 使用 fast-check
```typescript
import fc from 'fast-check';
import { calculateAdjustedCostPrice } from '../services/rightsAdjustmentService';

describe('RightsAdjustmentService Properties', () => {
  it('should always return positive adjusted cost price', () => {
    fc.assert(fc.property(
      fc.float({ min: 1, max: 1000 }), // costPrice
      fc.integer({ min: 1, max: 10000 }), // shares
      fc.float({ min: 0, max: 10 }), // cashDividend
      fc.integer({ min: 0, max: 100 }), // stockDividendRatio
      (costPrice, shares, cashDividend, stockDividendRatio) => {
        const result = calculateAdjustedCostPrice(
          costPrice, shares, cashDividend, stockDividendRatio
        );
        
        expect(result.adjustedCostPrice).toBeGreaterThan(0);
        expect(result.sharesAfterRight).toBeGreaterThanOrEqual(shares);
      }
    ));
  });
});
```

### 3. 整合測試

#### API 整合測試
```typescript
describe('Stock Price Integration', () => {
  it('should handle API failure gracefully', async () => {
    // 模擬網路錯誤
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));
    
    const result = await getStockPrice('2330');
    expect(result).toBeNull();
  });

  it('should fallback to alternative APIs', async () => {
    // 模擬主要 API 失敗，備用 API 成功
    jest.spyOn(global, 'fetch')
      .mockRejectedValueOnce(new Error('Primary API failed'))
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ price: 500 })
      } as Response);
    
    const result = await getStockPrice('2330');
    expect(result?.price).toBe(500);
  });
});
```

---

## 🔧 除錯指南

### 1. 常見問題

#### 版本號不一致
```bash
# 問題：版本號不一致錯誤
npm run check:version

# 解決：手動同步三個檔案
# - package.json
# - src/constants/version.ts  
# - src/constants/changelog.ts
```

#### SVG 格式錯誤
```bash
# 問題：SVG path 格式錯誤
npm run check:svg

# 解決：確保所有 path 以 M 開頭
# ❌ <path d="9 12l2 2 4-4" />
# ✅ <path d="M9 12l2 2 4-4" />
```

#### 狀態持久化問題
```bash
# 問題：狀態沒有正確持久化
npm run check:state

# 解決：檢查 partialize 函數是否包含所有需要持久化的狀態
```

### 2. 除錯工具

#### 瀏覽器 Console 工具
```javascript
// 在開發環境下可用的除錯工具
window.debugAppStore.getState()           // 獲取當前狀態
window.debugAppStore.getPersistedState()  // 查看持久化狀態
window.debugAppStore.validateState()      // 驗證狀態完整性
window.debugAppStore.clearStorage()       // 清除 localStorage

// 調整日誌等級
window.setLogLevel('dividend', 3)  // 開啟股息模組詳細日誌
window.setLogLevel('api', 1)       // 只顯示 API 警告和錯誤
```

#### React DevTools
```bash
# 安裝 React DevTools 瀏覽器擴展
# 可以檢查組件狀態、props 和性能
```

### 3. 性能除錯

#### 股價更新性能
```typescript
// 監控股價更新性能
const startTime = performance.now();
await updateAllStockPrices();
const endTime = performance.now();
console.log(`股價更新耗時: ${endTime - startTime}ms`);
```

#### 記憶體使用監控
```typescript
// 監控記憶體使用
if (performance.memory) {
  console.log('記憶體使用:', {
    used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB',
    total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + 'MB',
    limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024) + 'MB'
  });
}
```

---

## 🚀 部署指南

### 1. 建置準備

#### 建置前檢查
```bash
# 1. 完整品質檢查
npm run check:all

# 2. 執行測試
npm run test

# 3. 建置生產版本
npm run build

# 4. 預覽建置結果
npm run preview
```

#### 版本更新流程
```bash
# 1. 更新版本號（三個檔案同步）
# - package.json
# - src/constants/version.ts
# - src/constants/changelog.ts

# 2. 驗證版本號一致性
npm run check:version

# 3. 重新建置
npm run build

# 4. 提交變更
git add .
git commit -m "更新版本號 - v1.0.2.XXXX"
```

### 2. Netlify 部署

#### 自動部署設定
```toml
# netlify.toml
[build]
  publish = "dist"
  command = "npm run build"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

#### 手動部署
```bash
# 1. 建置專案
npm run build

# 2. 上傳 dist 資料夾到 Netlify
# 或使用 Netlify CLI
npx netlify deploy --prod --dir=dist
```

### 3. GitHub Pages 部署

#### GitHub Actions 設定
```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm install
      
    - name: Build
      run: npm run build
      
    - name: Deploy
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./dist
```

---

## 🤝 貢獻指南

### 1. 開發流程

#### 功能開發流程
```bash
# 1. 創建功能分支
git checkout -b feature/new-feature

# 2. 開發功能
# - 遵循代碼規範
# - 添加必要測試
# - 更新文檔

# 3. 提交前檢查
npm run check:all
npm run test

# 4. 提交變更
git add .
git commit -m "feat: 添加新功能"

# 5. 推送分支
git push origin feature/new-feature

# 6. 創建 Pull Request
```

#### 提交訊息規範
```bash
# 格式：<type>(<scope>): <description>

# 類型：
feat:     新功能
fix:      修復 bug
docs:     文檔更新
style:    代碼格式調整
refactor: 重構代碼
test:     測試相關
chore:    建置工具、依賴更新

# 範例：
feat(stock): 添加股票搜尋功能
fix(dividend): 修復除權息計算錯誤
docs(api): 更新 API 文檔
```

### 2. 代碼審查

#### 審查重點
- [ ] 代碼符合專案規範
- [ ] 功能正確實作
- [ ] 測試覆蓋充分
- [ ] 文檔更新完整
- [ ] 性能影響評估
- [ ] 安全性考量

#### 審查清單
```markdown
## 功能審查
- [ ] 功能按需求正確實作
- [ ] 邊界情況處理完善
- [ ] 錯誤處理適當

## 代碼品質
- [ ] 代碼風格一致
- [ ] 變數命名清楚
- [ ] 函數職責單一
- [ ] 註解適當

## 測試
- [ ] 單元測試覆蓋
- [ ] 整合測試通過
- [ ] 邊界測試完整

## 文檔
- [ ] API 文檔更新
- [ ] 使用說明完整
- [ ] 變更記錄更新
```

---

## 📚 學習資源

### 1. 技術文檔
- [React 官方文檔](https://react.dev/)
- [TypeScript 手冊](https://www.typescriptlang.org/docs/)
- [Zustand 文檔](https://github.com/pmndrs/zustand)
- [Vite 指南](https://vitejs.dev/guide/)
- [TailwindCSS 文檔](https://tailwindcss.com/docs)

### 2. 專案相關
- [FinMind API 文檔](https://finmind.github.io/)
- [Yahoo Finance API](https://rapidapi.com/apidojo/api/yahoo-finance1/)
- [證交所 OpenAPI](https://openapi.twse.com.tw/)
- [GitHub Gist API](https://docs.github.com/en/rest/gists)

### 3. 最佳實踐
- [React 最佳實踐](https://react.dev/learn/thinking-in-react)
- [TypeScript 最佳實踐](https://typescript-eslint.io/rules/)
- [測試最佳實踐](https://testing-library.com/docs/guiding-principles)

---

## 🆘 獲得幫助

### 1. 問題回報
- **GitHub Issues**: 回報 bug 或功能請求
- **討論區**: 技術討論和問題解答

### 2. 聯絡方式
- **Email**: [your-email@example.com]
- **Discord**: [專案 Discord 頻道]

### 3. 常見問題
請查看 `docs/FAQ.md` 獲取常見問題解答。

---

**開發指南版本**: v1.0.2.0221  
**最後更新**: 2026-01-20  
**相關文檔**: `docs/SPECIFICATION.md`, `docs/API.md`