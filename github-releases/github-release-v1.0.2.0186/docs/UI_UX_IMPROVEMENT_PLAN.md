# Stock Portfolio System UI/UX 優化改善計畫

**制定日期**：2026-01-16  
**基於**：專業 UI/UX 顧問建議 + 現有專案狀況  
**目標**：提升專業感、可讀性、用戶體驗

---

## 📊 現況評估

### 已完成的優化 ✅
- ✅ 手機版 RWD 全面優化（v1.0.2.0157-0165）
- ✅ 響應式布局（flex-col sm:flex-row）
- ✅ 隱私模式功能（遮罩敏感資訊）
- ✅ 統一的圖示組件系統（Icons.tsx）
- ✅ 深色主題設計

### 待改進的問題 ⚠️
- ❌ 數值未右對齊，難以快速比較大小
- ❌ 缺少千分位逗號（如：-87683 應為 -87,683）
- ❌ 視覺層級不明確（標籤與數值權重相近）
- ❌ 輸入框邊框不明顯，缺少 focus 狀態
- ❌ 負數顯示不夠專業（無括號或間距）
- ❌ 表格資訊密度過高，缺少留白

---

## 🎯 優先改善順序

### 🔴 第一優先：數據對齊與格式化（最高投資報酬率）

**影響範圍**：整個系統的數據顯示  
**預估工時**：2-3 小時  
**專業感提升**：⭐⭐⭐⭐⭐

#### 1.1 數值右對齊 + 等寬字體
**問題**：數值左對齊導致無法快速比較大小  
**解決方案**：
```typescript
// 所有數值欄位統一使用
<td className="px-4 py-4 text-right font-mono">
  {formatCurrency(value)}
</td>
```

**影響組件**：
- `StockRow.tsx` - 股票列表的所有數值欄位
- `PortfolioStats.tsx` - 投資組合統計卡片
- `StockList.tsx` - 底部統計欄

---

#### 1.2 統一千分位格式化
**問題**：-87683 缺少千分位逗號  
**解決方案**：使用已創建的 `src/utils/format.ts`

```typescript
import { formatCurrency, formatPercent } from '../utils/format';

// 金額（整數）
formatCurrency(87683, 0)  // "87,683"

// 金額（小數）
formatCurrency(18.65, 2)  // "18.65"

// 百分比
formatPercent(12.34)      // "+12.34%"
```

**需要更新的檔案**：
- `src/components/StockRow.tsx`
- `src/components/PortfolioStats.tsx`
- `src/components/StockList.tsx`
- `src/components/QuickAddStock.tsx`

---

#### 1.3 負數顯示優化
**問題**：-87683 不夠專業  
**解決方案**：

**選項 A：括號表示法（會計標準）**
```typescript
export const formatCurrency = (value: number, decimals: number = 0): string => {
  const num = Math.abs(value);
  const formatted = new Intl.NumberFormat('zh-TW', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
  
  return value < 0 ? `(${formatted})` : formatted;
};
```
結果：`(87,683)` 而非 `-87,683`

**選項 B：負號加間距**
```typescript
return value < 0 ? `- ${formatted}` : formatted;
```
結果：`- 87,683` 而非 `-87,683`

**建議**：使用選項 A（括號），更符合財務報表標準

---

### 🟡 第二優先：視覺層級優化

**影響範圍**：投資組合統計卡片  
**預估工時**：1-2 小時  
**專業感提升**：⭐⭐⭐⭐

#### 2.1 強化數值與標籤對比
**問題**：標籤與數值字體大小相近，層級不明確  
**解決方案**：

```typescript
// PortfolioStats.tsx 修改
<div className="text-slate-400 text-sm">總市值</div>  {/* 標籤：小字、淡色 */}
<div className="text-white text-2xl font-bold">    {/* 數值：大字、粗體、亮色 */}
  {formatCurrency(totalMarketValue)}
</div>
```

**修改前**：
```
總市值  $1,234,567  （字體大小相近）
```

**修改後**：
```
總市值              （小字、淡灰色）
$1,234,567          （大字、粗體、純白色）
```

---

#### 2.2 損益卡片特殊處理
**問題**：損益卡片需要更強的視覺反饋  
**解決方案**：

```typescript
// 根據損益正負添加微弱背景色
<div className={`
  p-4 rounded-lg
  ${totalGainLoss >= 0 
    ? 'bg-green-900/10 border border-green-500/30' 
    : 'bg-red-900/10 border border-red-500/30'
  }
`}>
  <div className="text-slate-400 text-sm">總損益</div>
  <div className={`text-2xl font-bold ${
    totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400'
  }`}>
    {formatCurrency(totalGainLoss)}
  </div>
</div>
```

---

#### 2.3 遮罩狀態提示
**問題**：用戶不知道如何解除遮罩  
**解決方案**：

```typescript
// 添加 tooltip 提示
<div 
  className="relative group"
  title="點擊右上角眼睛圖示解除遮罩"
>
  <div className="text-2xl font-bold">****</div>
  
  {/* Hover 時顯示提示 */}
  <div className="
    absolute inset-0 
    flex items-center justify-center
    bg-slate-800/90 
    opacity-0 group-hover:opacity-100
    transition-opacity
    text-xs text-slate-300
    pointer-events-none
  ">
    點擊右上角 👁️ 解除遮罩
  </div>
</div>
```

---

### 🟢 第三優先：輸入與操作優化

**影響範圍**：QuickAddStock 組件  
**預估工時**：1 小時  
**用戶體驗提升**：⭐⭐⭐⭐

#### 3.1 輸入框邊框強化
**問題**：輸入框與背景色太接近，不明顯  
**解決方案**：

```typescript
<input
  className="
    bg-slate-800 
    border border-slate-700          {/* 預設：深灰邊框 */}
    focus:border-blue-500            {/* Focus：藍色邊框 */}
    focus:ring-1 focus:ring-blue-500 {/* Focus：藍色光暈 */}
    transition-colors
    px-3 py-2 rounded
  "
  onFocus={(e) => e.target.select()}  {/* 自動選取內容 */}
/>
```

---

#### 3.2 新增按鈕視覺強化
**問題**：「+ 新增」按鈕視覺權重太低  
**解決方案**：

```typescript
// 從透明線條改為實色按鈕
<button className="
  bg-blue-600              {/* 實色背景 */}
  hover:bg-blue-500        {/* Hover 變亮 */}
  text-white font-medium
  px-4 py-2 rounded
  transition-colors
  flex items-center gap-2
">
  <PlusIcon size="sm" />
  新增股票
</button>
```

---

#### 3.3 自動選取輸入內容
**問題**：修改預設值需要手動刪除  
**解決方案**：

```typescript
// 所有數值輸入框添加
<input
  type="number"
  defaultValue={1000}
  onFocus={(e) => e.target.select()}  {/* 點擊時自動全選 */}
/>
```

**影響組件**：
- `QuickAddStock.tsx` - 持股數、成本價輸入框
- `StockRow.tsx` - 編輯模式的輸入框

---

### 🔵 第四優先：表格細節優化

**影響範圍**：StockList 和 StockRow  
**預估工時**：1-2 小時  
**可讀性提升**：⭐⭐⭐

#### 4.1 表格 Hover 效果
**問題**：長表格橫向閱讀容易跳行  
**解決方案**：

```typescript
<tr className="
  transition-colors 
  hover:bg-slate-800/50  {/* Hover 時背景變亮 */}
">
  {/* 表格內容 */}
</tr>
```

---

#### 4.2 增加行高與留白
**問題**：表格資訊密度過高，視覺壓迫  
**解決方案**：

```typescript
// 表格標題
<th className="px-6 py-4 text-left">  {/* 從 py-3 改為 py-4 */}

// 表格內容
<td className="px-6 py-5">            {/* 從 py-4 改為 py-5 */}
```

---

#### 4.3 除息資訊樣式優化
**問題**：「除息後」資訊干擾主要成本價閱讀  
**解決方案**：

```typescript
// 使用 Badge 樣式區分
<div className="flex flex-col gap-1">
  <div className="text-white font-medium">
    {formatCurrency(stock.costPrice, 2)}
  </div>
  {stock.adjustedCostPrice && (
    <div className="
      inline-flex items-center gap-1
      text-xs text-blue-400
      bg-blue-900/20 
      px-2 py-0.5 rounded
      w-fit
    ">
      除息後: {formatCurrency(stock.adjustedCostPrice, 2)}
    </div>
  )}
</div>
```

---

### 🟣 第五優先：整體佈局優化

**影響範圍**：Header 和 Sidebar  
**預估工時**：1 小時  
**用戶體驗提升**：⭐⭐⭐

#### 5.1 標籤頁樣式強化
**問題**：帳戶標籤只用底線區分，不夠明顯  
**解決方案**：

```typescript
// 膠囊型背景
<button className={`
  px-4 py-2 rounded-full
  transition-all
  ${isActive 
    ? 'bg-slate-700 text-white font-medium'  {/* 選中：深色背景 */}
    : 'text-slate-400 hover:text-white'      {/* 未選中：淡色 */}
  }
`}>
  {accountName}
</button>
```

---

## 📋 實作檢查清單

### Phase 1：數據對齊與格式化（第一優先）

#### 步驟 1：更新格式化工具
- [ ] 修改 `src/utils/format.ts`
  - [ ] 實作括號負數顯示
  - [ ] 添加單元測試

#### 步驟 2：更新 StockRow.tsx
- [ ] 所有數值欄位改為 `text-right font-mono`
- [ ] 使用 `formatCurrency` 格式化所有金額
- [ ] 使用 `formatPercent` 格式化百分比
- [ ] 測試桌面版和手機版顯示

#### 步驟 3：更新 PortfolioStats.tsx
- [ ] 所有數值改為 `text-right font-mono`
- [ ] 使用 `formatCurrency` 格式化
- [ ] 強化標籤與數值對比
- [ ] 添加損益卡片特殊樣式

#### 步驟 4：更新 StockList.tsx
- [ ] 底部統計欄數值右對齊
- [ ] 使用 `formatCurrency` 格式化

---

### Phase 2：視覺層級優化（第二優先）

- [ ] PortfolioStats 標籤改為 `text-sm text-slate-400`
- [ ] PortfolioStats 數值改為 `text-2xl font-bold text-white`
- [ ] 損益卡片添加背景色和邊框
- [ ] 遮罩狀態添加 hover 提示

---

### Phase 3：輸入與操作優化（第三優先）

- [ ] QuickAddStock 輸入框添加邊框和 focus 狀態
- [ ] 所有數值輸入框添加 `onFocus={(e) => e.target.select()}`
- [ ] 新增按鈕改為實色背景
- [ ] 測試鍵盤導航和無障礙性

---

### Phase 4：表格細節優化（第四優先）

- [ ] 表格行添加 hover 效果
- [ ] 增加行高（py-4 → py-5）
- [ ] 除息資訊改為 Badge 樣式
- [ ] 測試長表格滾動體驗

---

### Phase 5：整體佈局優化（第五優先）

- [ ] 帳戶標籤改為膠囊型背景
- [ ] 測試標籤切換動畫
- [ ] 確保響應式布局正常

---

## 🎨 設計系統規範

### 顏色系統
```typescript
// 文字顏色
--text-primary: text-white           // 主要內容
--text-secondary: text-slate-400     // 次要內容（標籤）
--text-tertiary: text-slate-500      // 三級內容

// 數值顏色
--number-positive: text-green-400    // 正數（獲利）
--number-negative: text-red-400      // 負數（虧損）
--number-neutral: text-white         // 中性數值

// 背景顏色
--bg-primary: bg-slate-900           // 主背景
--bg-secondary: bg-slate-800         // 次背景（卡片）
--bg-tertiary: bg-slate-700          // 三級背景（輸入框）

// 邊框顏色
--border-default: border-slate-700   // 預設邊框
--border-focus: border-blue-500      // Focus 邊框
--border-success: border-green-500   // 成功邊框
--border-error: border-red-500       // 錯誤邊框
```

### 字體系統
```typescript
// 字體大小
--text-xs: text-xs       // 12px - 輔助資訊
--text-sm: text-sm       // 14px - 標籤
--text-base: text-base   // 16px - 一般內容
--text-lg: text-lg       // 18px - 小標題
--text-xl: text-xl       // 20px - 大數值
--text-2xl: text-2xl     // 24px - 重要數值

// 字體粗細
--font-normal: font-normal   // 400 - 一般文字
--font-medium: font-medium   // 500 - 標籤
--font-bold: font-bold       // 700 - 數值

// 特殊字體
--font-mono: font-mono       // 等寬字體（數值專用）
```

### 間距系統
```typescript
// Padding
--p-2: p-2    // 8px  - 緊湊
--p-3: p-3    // 12px - 標準
--p-4: p-4    // 16px - 舒適
--p-6: p-6    // 24px - 寬鬆

// Gap
--gap-1: gap-1   // 4px  - 極小間距
--gap-2: gap-2   // 8px  - 小間距
--gap-3: gap-3   // 12px - 標準間距
--gap-4: gap-4   // 16px - 大間距
```

---

## 📊 預期效果

### 改善前 vs 改善後

| 項目 | 改善前 | 改善後 | 提升 |
|-----|--------|--------|------|
| 數值可讀性 | ⭐⭐ | ⭐⭐⭐⭐⭐ | +150% |
| 專業感 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | +67% |
| 視覺層級 | ⭐⭐ | ⭐⭐⭐⭐ | +100% |
| 操作便利性 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | +67% |
| 整體用戶體驗 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | +67% |

---

## 🎯 成功指標

### 量化指標
- [ ] 所有數值欄位 100% 右對齊
- [ ] 所有金額 100% 有千分位逗號
- [ ] 所有輸入框有明確的 focus 狀態
- [ ] 表格行高增加 20%（py-4 → py-5）
- [ ] 標籤與數值字體大小比例 1:1.5

### 質化指標
- [ ] 用戶能快速比較數值大小
- [ ] 負數顯示符合財務報表標準
- [ ] 輸入框操作更流暢
- [ ] 整體視覺更專業、更舒適

---

## 💡 技術實作建議

### 使用 Tailwind CSS 工具類
```typescript
// ✅ 好的做法：使用工具類
<td className="px-4 py-4 text-right font-mono">

// ❌ 避免：內聯樣式
<td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
```

### 使用 Intl.NumberFormat
```typescript
// ✅ 好的做法：使用標準 API
new Intl.NumberFormat('zh-TW', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(value);

// ❌ 避免：手動字串處理
value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
```

### 組件化思維
```typescript
// ✅ 好的做法：創建可重用組件
<CurrencyDisplay value={totalValue} decimals={0} />

// ❌ 避免：到處重複格式化邏輯
{formatCurrency(totalValue, 0)}
```

---

## 🔄 持續改進

### 每週檢查
- [ ] 收集用戶反饋
- [ ] 檢查新增功能是否遵循設計系統
- [ ] 統計數值格式化覆蓋率

### 每月檢查
- [ ] Review 設計系統是否需要更新
- [ ] 評估用戶體驗改善效果
- [ ] 規劃下一階段優化

---

## 📚 參考資源

### 設計規範
- [Material Design - Data Tables](https://material.io/components/data-tables)
- [Apple Human Interface Guidelines - Tables](https://developer.apple.com/design/human-interface-guidelines/tables)
- [WCAG 2.1 無障礙標準](https://www.w3.org/WAI/WCAG21/quickref/)

### 技術文檔
- [Tailwind CSS Typography](https://tailwindcss.com/docs/font-family)
- [Intl.NumberFormat MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat)
- [React onFocus Event](https://react.dev/reference/react-dom/components/input#onfocus)

---

**制定日期**：2026-01-16  
**版本**：1.0.0  
**狀態**：待實作  
**預估總工時**：6-9 小時  
**預期完成日期**：2026-01-17

**記住：數據對齊是提升專業感最快的方法！先做第一優先項目！**
