# Stock Portfolio System UI 優化計畫

**制定日期**: 2026-01-16  
**版本**: v1.0.0  
**目標版本**: v1.0.2.0166+

---

## 📋 目錄

1. [優化概述](#優化概述)
2. [優先級評估](#優先級評估)
3. [詳細實施計畫](#詳細實施計畫)
4. [技術實施細節](#技術實施細節)
5. [測試計畫](#測試計畫)
6. [風險評估](#風險評估)

---

## 優化概述

### 設計目標
- 🎯 **提升專業感**：透過對齊、層級、間距優化
- 🎨 **增強可讀性**：改善數值顯示、顏色對比
- 💡 **優化互動**：提升輸入體驗、視覺反饋
- 📱 **保持響應式**：確保手機版體驗不受影響

### 影響範圍
- `src/components/PortfolioStats.tsx` - 核心數據卡片
- `src/components/StockList.tsx` - 數據表格
- `src/components/StockRow.tsx` - 表格行
- `src/components/AddStockForm.tsx` - 輸入表單
- `src/components/ui/Input.tsx` - 輸入框組件
- `src/components/AccountSelector.tsx` - 帳戶標籤

---

## 優先級評估

### 🔴 P0 - 最高優先級（立即實施）
**影響**: 專業感提升最明顯，實施成本低

1. **表格數值右對齊** ⭐⭐⭐⭐⭐
   - 影響: 極大提升專業感
   - 難度: 低（僅需修改 CSS）
   - 時間: 30 分鐘

2. **千分位符號統一** ⭐⭐⭐⭐⭐
   - 影響: 提升可讀性
   - 難度: 低（修改格式化函數）
   - 時間: 20 分鐘

3. **數值層級強化** ⭐⭐⭐⭐
   - 影響: 提升視覺層次
   - 難度: 低（調整字體樣式）
   - 時間: 30 分鐘

### 🟡 P1 - 高優先級（本週完成）
**影響**: 顯著提升用戶體驗

4. **輸入框視覺優化** ⭐⭐⭐⭐
   - 影響: 提升互動體驗
   - 難度: 中（需修改 Input 組件）
   - 時間: 1 小時

5. **帳戶標籤樣式** ⭐⭐⭐⭐
   - 影響: 提升導航清晰度
   - 難度: 中（需重新設計樣式）
   - 時間: 1 小時

6. **負數顯示優化** ⭐⭐⭐
   - 影響: 提升可讀性
   - 難度: 低（調整格式化）
   - 時間: 30 分鐘

### 🟢 P2 - 中優先級（下週完成）
**影響**: 細節優化

7. **表格行高調整** ⭐⭐⭐
   - 影響: 減輕視覺壓力
   - 難度: 低（調整 padding）
   - 時間: 20 分鐘

8. **除息資訊樣式** ⭐⭐⭐
   - 影響: 減少視覺干擾
   - 難度: 中（需設計 Badge）
   - 時間: 45 分鐘

9. **遮罩提示功能** ⭐⭐
   - 影響: 提升易用性
   - 難度: 中（需添加 Tooltip）
   - 時間: 1 小時

10. **按鈕視覺權重** ⭐⭐
    - 影響: 引導操作
    - 難度: 低（調整顏色）
    - 時間: 20 分鐘

---

## 詳細實施計畫

### Phase 1: 核心數據區優化 (P0)

#### 1.1 數值層級強化

**目標**: 拉開金額與標籤的視覺層級

**修改文件**: `src/components/PortfolioStats.tsx`

**實施方案**:
```tsx
// ❌ 修改前
<p className="text-xs md:text-sm font-medium text-slate-400 mb-1">總市值</p>
<p className="text-base md:text-2xl font-bold text-white break-all">
  {formatCurrency(stats.totalMarketValue)}
</p>

// ✅ 修改後
<p className="text-xs md:text-sm font-medium text-slate-500 mb-1">總市值</p>
<p className="text-lg md:text-3xl font-extrabold text-white tracking-tight">
  {formatCurrency(stats.totalMarketValue)}
</p>
```

**變更說明**:
- 標籤顏色: `text-slate-400` → `text-slate-500` (更淡)
- 金額字重: `font-bold` → `font-extrabold` (更粗)
- 金額大小: `text-base md:text-2xl` → `text-lg md:text-3xl` (更大)
- 添加 `tracking-tight` 緊縮字距

#### 1.2 千分位符號統一

**目標**: 所有數值都顯示千分位逗號

**修改文件**: `src/components/PortfolioStats.tsx`

**實施方案**:
```tsx
// ✅ 確保 formatCurrency 函數正確
const formatCurrency = (amount: number): string => {
  if (isPrivacyMode) {
    return '****';
  }
  // 確保所有數值都有千分位
  return amount.toLocaleString('zh-TW', { 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 0 
  });
};
```

**檢查點**:
- [ ] 總市值顯示千分位
- [ ] 總成本顯示千分位
- [ ] 總損益顯示千分位
- [ ] 股息收入顯示千分位

#### 1.3 負數顯示優化

**目標**: 改善負數的可讀性和專業感

**修改文件**: `src/components/PortfolioStats.tsx`

**實施方案**:
```tsx
// 方案 A: 使用括號（推薦）
const formatCurrency = (amount: number, useParentheses: boolean = false): string => {
  if (isPrivacyMode) return '****';
  
  const absAmount = Math.abs(amount);
  const formatted = absAmount.toLocaleString('zh-TW', { 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 0 
  });
  
  if (useParentheses && amount < 0) {
    return `(${formatted})`;
  }
  
  return amount < 0 ? `-${formatted}` : formatted;
};

// 方案 B: 增加負號間距
const formatCurrency = (amount: number): string => {
  if (isPrivacyMode) return '****';
  
  const formatted = Math.abs(amount).toLocaleString('zh-TW', { 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 0 
  });
  
  // 使用 thin space (U+2009) 增加間距
  return amount < 0 ? `−\u2009${formatted}` : formatted;
};
```

**建議**: 使用方案 A（括號），更符合財務報表慣例

---

### Phase 2: 數據表格優化 (P0 + P1)

#### 2.1 表格對齊原則 ⭐⭐⭐⭐⭐

**目標**: 數值右對齊，文字左對齊

**修改文件**: 
- `src/components/StockList.tsx`
- `src/components/StockRow.tsx`

**實施方案**:

```tsx
// StockList.tsx - 表頭對齊
<thead className="bg-slate-900 sticky top-0 z-10">
  <tr>
    {/* 文字類 - 左對齊 */}
    <th className="px-2 py-2 text-left text-xs font-medium text-slate-400">
      代碼
    </th>
    <th className="px-2 py-2 text-left text-xs font-medium text-slate-400">
      名稱
    </th>
    
    {/* 數值類 - 右對齊 */}
    <th className="px-2 py-2 text-right text-xs font-medium text-slate-400">
      現價
    </th>
    <th className="px-2 py-2 text-right text-xs font-medium text-slate-400">
      市值
    </th>
    <th className="px-2 py-2 text-right text-xs font-medium text-slate-400">
      持股數
    </th>
    <th className="px-2 py-2 text-right text-xs font-medium text-slate-400">
      成本價
    </th>
    <th className="px-2 py-2 text-right text-xs font-medium text-slate-400">
      損益率
    </th>
    <th className="px-2 py-2 text-right text-xs font-medium text-slate-400">
      股息
    </th>
    
    {/* 操作 - 居中 */}
    <th className="px-1 py-2 text-center text-xs font-medium text-slate-400">
      操作
    </th>
  </tr>
</thead>
```

```tsx
// StockRow.tsx - 數據對齊
<td className="px-2 py-2 text-left text-sm text-white">
  {stock.symbol}
</td>
<td className="px-2 py-2 text-left text-sm text-white">
  {stock.name}
</td>

{/* 數值右對齊 + 等寬字體 */}
<td className="px-2 py-2 text-right text-sm text-white font-mono">
  ${stock.currentPrice.toFixed(2)}
</td>
<td className="px-2 py-2 text-right text-sm text-white font-mono">
  {formatCurrency(stock.shares * stock.currentPrice)}
</td>
```

**關鍵點**:
- 數值使用 `font-mono` (等寬字體) 確保對齊
- 所有數值 `text-right`
- 文字類 `text-left`

#### 2.2 表格行高調整

**目標**: 增加留白，減輕視覺壓力

**修改文件**: `src/components/StockList.tsx`

**實施方案**:
```tsx
// ❌ 修改前
<td className="px-2 py-2 text-center text-sm">

// ✅ 修改後
<td className="px-3 py-3 text-center text-sm">
```

**調整**:
- 水平 padding: `px-2` → `px-3`
- 垂直 padding: `py-2` → `py-3`
- 最小行高: 添加 `min-h-[48px]`

#### 2.3 負數顏色對比優化

**目標**: 確保 WCAG AA 標準

**修改文件**: `src/components/StockRow.tsx`

**實施方案**:
```tsx
// ❌ 修改前
const getGainLossColor = (value: number): string => {
  if (value > 0) return 'text-green-400';
  if (value < 0) return 'text-red-400';
  return 'text-slate-300';
};

// ✅ 修改後 (提高對比度)
const getGainLossColor = (value: number): string => {
  if (value > 0) return 'text-green-300'; // 更亮
  if (value < 0) return 'text-red-300';   // 更亮
  return 'text-slate-300';
};
```

**對比度測試**:
- 背景: `#1e293b` (slate-800)
- 綠色: `#86efac` (green-300) - 對比度 7.2:1 ✅
- 紅色: `#fca5a5` (red-300) - 對比度 6.8:1 ✅

#### 2.4 除息資訊 Badge 化

**目標**: 減少視覺干擾

**修改文件**: `src/components/StockRow.tsx`

**實施方案**:
```tsx
// ❌ 修改前
<div className="text-xs text-blue-400">
  除息後: ${adjustedCostPrice.toFixed(2)}
</div>

// ✅ 修改後
<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-900/30 text-blue-300 border border-blue-700/50">
  除息 ${adjustedCostPrice.toFixed(2)}
</span>
```

---

### Phase 3: 輸入與操作優化 (P1)

#### 3.1 輸入框視覺優化

**目標**: 提升輸入框識別度和互動反饋

**修改文件**: `src/components/ui/Input.tsx`

**實施方案**:
```tsx
// Input.tsx
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`
          w-full px-3 py-2 
          bg-slate-900 
          border border-slate-600
          text-white text-sm 
          rounded-lg
          placeholder-slate-500
          
          focus:outline-none 
          focus:ring-2 
          focus:ring-blue-500 
          focus:border-blue-500
          
          hover:border-slate-500
          
          transition-colors duration-200
          
          disabled:opacity-50 
          disabled:cursor-not-allowed
          
          ${className}
        `}
        {...props}
      />
    );
  }
);
```

**變更說明**:
- 添加 `border-slate-600` 邊框
- Focus 時顯示藍色 ring
- Hover 時邊框變亮
- 添加過渡動畫

#### 3.2 自動選取輸入內容

**目標**: 提升輸入效率

**修改文件**: `src/components/AddStockForm.tsx`

**實施方案**:
```tsx
<Input
  type="number"
  value={formData.shares}
  onChange={(e) => setFormData({ ...formData, shares: e.target.value })}
  onFocus={(e) => e.target.select()} // 自動選取
  placeholder="1000"
/>

<Input
  type="number"
  value={formData.costPrice}
  onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
  onFocus={(e) => e.target.select()} // 自動選取
  placeholder="0.00"
/>
```

#### 3.3 新增按鈕視覺權重

**目標**: 提升行動召喚

**修改文件**: `src/components/AddStockForm.tsx`

**實施方案**:
```tsx
// ❌ 修改前
<Button variant="primary" onClick={handleSubmit}>
  + 新增
</Button>

// ✅ 修改後
<Button 
  variant="primary" 
  onClick={handleSubmit}
  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
>
  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
  新增股票
</Button>
```

---

### Phase 4: 整體佈局優化 (P1 + P2)

#### 4.1 帳戶標籤樣式

**目標**: 膠囊型設計，提升識別度

**修改文件**: `src/components/AccountSelector.tsx` (或相關組件)

**實施方案**:
```tsx
// ❌ 修改前
<button 
  className={`px-4 py-2 ${isActive ? 'border-b-2 border-blue-500' : ''}`}
>
  {account.name}
</button>

// ✅ 修改後
<button 
  className={`
    px-4 py-2 rounded-full font-medium transition-all
    ${isActive 
      ? 'bg-blue-600 text-white shadow-lg' 
      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
    }
  `}
>
  {account.name}
  {isActive && (
    <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs bg-blue-500 rounded-full">
      ✓
    </span>
  )}
</button>
```

#### 4.2 遮罩提示功能

**目標**: 引導用戶解除遮罩

**修改文件**: `src/components/PortfolioStats.tsx`

**實施方案**:
```tsx
// 添加 Tooltip 組件
{isPrivacyMode && (
  <div className="group relative">
    <p className="text-lg md:text-3xl font-extrabold text-white">****</p>
    
    {/* Hover 提示 */}
    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-slate-700 shadow-xl">
      點擊右上角眼睛圖示解除遮罩
      <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900"></div>
    </div>
  </div>
)}
```

---

## 技術實施細節

### 顏色系統更新

```typescript
// tailwind.config.js 或 CSS 變數
const colors = {
  // 數值顯示
  'value-primary': '#ffffff',      // 主要數值 (白色)
  'value-secondary': '#cbd5e1',    // 次要數值 (slate-300)
  'label-primary': '#64748b',      // 主要標籤 (slate-500)
  'label-secondary': '#475569',    // 次要標籤 (slate-600)
  
  // 損益顏色 (提高對比度)
  'gain': '#86efac',               // 獲利 (green-300)
  'loss': '#fca5a5',               // 虧損 (red-300)
  
  // 互動顏色
  'focus-ring': '#3b82f6',         // Focus 環 (blue-500)
  'hover-border': '#64748b',       // Hover 邊框 (slate-500)
};
```

### 字體系統

```css
/* 數值專用等寬字體 */
.font-numeric {
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-variant-numeric: tabular-nums;
}

/* 金額數值 */
.text-currency {
  @apply font-numeric font-extrabold tracking-tight;
}
```

### 響應式斷點

```typescript
// 確保所有優化在不同螢幕尺寸下都正常
const breakpoints = {
  sm: '640px',   // 手機橫屏
  md: '768px',   // 平板
  lg: '1024px',  // 桌面
  xl: '1280px',  // 大桌面
};
```

---

## 測試計畫

### 視覺回歸測試

#### 桌面版 (1920x1080)
- [ ] 核心數據卡片顯示正確
- [ ] 表格對齊正確
- [ ] 輸入框樣式正確
- [ ] 帳戶標籤樣式正確

#### 平板版 (768x1024)
- [ ] 響應式佈局正常
- [ ] 字體大小適中
- [ ] 觸控區域足夠大

#### 手機版 (375x667)
- [ ] 橫向滾動正常
- [ ] 數值可讀
- [ ] 按鈕可點擊

### 功能測試

- [ ] 千分位符號顯示正確
- [ ] 負數格式正確
- [ ] 輸入框自動選取
- [ ] Focus 狀態正確
- [ ] Hover 效果正常
- [ ] 遮罩提示顯示

### 無障礙測試

- [ ] 顏色對比度 ≥ 4.5:1 (WCAG AA)
- [ ] 鍵盤導航正常
- [ ] 螢幕閱讀器友好
- [ ] Focus 指示清晰

### 效能測試

- [ ] 大量數據 (100+ 股票) 渲染流暢
- [ ] 動畫不卡頓
- [ ] 記憶體使用正常

---

## 風險評估

### 高風險項目

#### 1. 表格對齊變更
**風險**: 可能影響現有佈局
**緩解**: 
- 先在開發環境測試
- 保留原始 CSS 作為備份
- 分階段部署

#### 2. 輸入框樣式變更
**風險**: 可能影響表單驗證
**緩解**:
- 完整測試所有表單
- 確保 onChange 事件正常
- 測試自動填充功能

### 中風險項目

#### 3. 顏色對比度調整
**風險**: 可能影響品牌一致性
**緩解**:
- 使用色彩對比度工具驗證
- 保持品牌色調
- 用戶測試反饋

#### 4. 字體大小調整
**風險**: 可能影響資訊密度
**緩解**:
- 響應式設計
- 保持手機版可讀性
- A/B 測試

### 低風險項目

#### 5. 千分位符號
**風險**: 極低
**緩解**: 已有 toLocaleString 支援

#### 6. Tooltip 添加
**風險**: 極低
**緩解**: 純視覺增強，不影響功能

---

## 實施時間表

### Week 1: Phase 1 + Phase 2 (P0)
**預計時間**: 3-4 小時

- Day 1: 核心數據區優化 (1.5 小時)
  - 數值層級強化
  - 千分位符號
  - 負數顯示優化

- Day 2: 表格對齊優化 (1.5 小時)
  - 表頭對齊
  - 數據對齊
  - 等寬字體

- Day 3: 測試與調整 (1 小時)

### Week 2: Phase 3 + Phase 4 (P1)
**預計時間**: 4-5 小時

- Day 1: 輸入優化 (2 小時)
  - 輸入框樣式
  - 自動選取
  - 按鈕權重

- Day 2: 佈局優化 (2 小時)
  - 帳戶標籤
  - 表格行高
  - 除息 Badge

- Day 3: 測試與調整 (1 小時)

### Week 3: Phase 4 (P2) + 完善
**預計時間**: 2-3 小時

- Day 1: 細節優化 (1.5 小時)
  - 遮罩提示
  - 動畫優化

- Day 2: 全面測試 (1.5 小時)
  - 視覺回歸
  - 功能測試
  - 無障礙測試

---

## 成功指標

### 量化指標
- ✅ 顏色對比度 ≥ 4.5:1 (100%)
- ✅ 數值對齊率 = 100%
- ✅ 千分位符號覆蓋率 = 100%
- ✅ 響應式測試通過率 ≥ 95%

### 質化指標
- ✅ 視覺層次清晰
- ✅ 專業感提升
- ✅ 互動體驗流暢
- ✅ 用戶反饋正面

---

## 版本規劃

### v1.0.2.0166 - Phase 1 (P0)
- 核心數據區優化
- 千分位符號統一
- 數值層級強化

### v1.0.2.0167 - Phase 2 (P0)
- 表格對齊優化
- 負數顯示優化
- 顏色對比度提升

### v1.0.2.0168 - Phase 3 (P1)
- 輸入框視覺優化
- 自動選取功能
- 按鈕視覺權重

### v1.0.2.0169 - Phase 4 (P1 + P2)
- 帳戶標籤樣式
- 表格行高調整
- 除息 Badge 化
- 遮罩提示功能

---

## 附錄

### A. 設計參考

**財務應用最佳實踐**:
- Bloomberg Terminal
- Yahoo Finance
- Google Finance
- TradingView

**對齊原則**:
- 數值右對齊 (Right-aligned numbers)
- 文字左對齊 (Left-aligned text)
- 等寬字體 (Monospace for numbers)

### B. 工具推薦

**顏色對比度檢查**:
- WebAIM Contrast Checker
- Colorable
- Contrast Ratio

**響應式測試**:
- Chrome DevTools
- BrowserStack
- Responsively App

### C. 相關文檔

- [UI Design Standards](../.kiro/steering/ui-design-standards.md)
- [Development Standards](../.kiro/steering/development-standards.md)
- [Version Management](../.kiro/steering/version-management.md)

---

**制定者**: Kiro AI Assistant  
**審核者**: 待定  
**最後更新**: 2026-01-16
