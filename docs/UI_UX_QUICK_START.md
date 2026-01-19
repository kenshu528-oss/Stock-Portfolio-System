# UI/UX 優化快速開始指南

**目標**：用最少的時間獲得最大的視覺改善  
**預估時間**：2-3 小時  
**難度**：⭐⭐（簡單）

---

## 🚀 立即開始：三步驟改善法

### 第 1 步：更新格式化工具（5 分鐘）

已經為你創建好了 `src/utils/format.ts`，現在需要增強負數顯示：

```typescript
// 修改 src/utils/format.ts 中的 formatCurrency 函數
export const formatCurrency = (value: number | string, decimals: number = 0): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '--';
  
  const absNum = Math.abs(num);
  const formatted = new Intl.NumberFormat('zh-TW', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(absNum);
  
  // 負數使用括號表示（會計標準）
  return num < 0 ? `(${formatted})` : formatted;
};
```

**效果**：
- `-87683` → `(87,683)` ✨
- `1234567` → `1,234,567` ✨

---

### 第 2 步：修改 StockRow.tsx（1 小時）

這是**最重要**的改善，會立即提升整個表格的專業感。

#### 2.1 導入格式化工具

```typescript
// 在檔案開頭添加
import { formatCurrency, formatPercent, formatShares } from '../utils/format';
```

#### 2.2 修改數值欄位

找到以下欄位並修改：

**現價欄位**：
```typescript
// 修改前
<td className="px-4 py-4">{stock.price}</td>

// 修改後
<td className="px-4 py-4 text-right font-mono text-white">
  {formatCurrency(stock.price, 2)}
</td>
```

**市值欄位**：
```typescript
// 修改前
<td className="px-4 py-4">{stock.marketValue}</td>

// 修改後
<td className="px-4 py-4 text-right font-mono text-white">
  {formatCurrency(stock.marketValue, 0)}
</td>
```

**持股數欄位**：
```typescript
// 修改前
<td className="px-4 py-4">{stock.shares}</td>

// 修改後
<td className="px-4 py-4 text-right font-mono text-white">
  {formatShares(stock.shares)}
</td>
```

**成本價欄位**：
```typescript
// 修改前
<td className="px-4 py-4">{stock.costPrice}</td>

// 修改後
<td className="px-4 py-4 text-right font-mono">
  <div className="text-white font-medium">
    {formatCurrency(stock.costPrice, 2)}
  </div>
  {stock.adjustedCostPrice && stock.adjustedCostPrice !== stock.costPrice && (
    <div className="text-xs text-blue-400 mt-1">
      除息後: {formatCurrency(stock.adjustedCostPrice, 2)}
    </div>
  )}
</td>
```

**損益欄位**：
```typescript
// 修改前
<td className="px-4 py-4">
  <div className={gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}>
    {gainLoss}
  </div>
</td>

// 修改後
<td className="px-4 py-4 text-right font-mono">
  <div className={`font-medium ${gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
    {formatCurrency(gainLoss, 0)}
  </div>
  <div className="text-xs text-slate-400 mt-1">
    {formatPercent(gainLossRate)}
  </div>
</td>
```

**股息欄位**：
```typescript
// 修改後
<td className="px-4 py-4 text-right font-mono text-green-400">
  {formatCurrency(totalDividend, 0)}
</td>
```

#### 2.3 修改表格標題對齊

```typescript
// 找到 <thead> 部分，修改數值欄位的標題
<th className="px-4 py-3 text-right font-medium">現價</th>
<th className="px-4 py-3 text-right font-medium">市值</th>
<th className="px-4 py-3 text-right font-medium">持股數</th>
<th className="px-4 py-3 text-right font-medium">成本價</th>
<th className="px-4 py-3 text-right font-medium">損益率</th>
<th className="px-4 py-3 text-right font-medium">股息</th>
```

---

### 第 3 步：修改 PortfolioStats.tsx（30 分鐘）

#### 3.1 導入格式化工具

```typescript
import { formatCurrency, formatPercent } from '../utils/format';
```

#### 3.2 強化視覺層級

找到統計卡片部分，修改為：

```typescript
// 總市值卡片
<div className="bg-slate-800 p-4 rounded-lg">
  <div className="text-slate-400 text-sm mb-2">總市值</div>
  <div className="text-white text-2xl font-bold font-mono text-right">
    {isPrivacyMode ? '****' : formatCurrency(totalMarketValue, 0)}
  </div>
</div>

// 總成本卡片
<div className="bg-slate-800 p-4 rounded-lg">
  <div className="text-slate-400 text-sm mb-2">總成本</div>
  <div className="text-white text-2xl font-bold font-mono text-right">
    {isPrivacyMode ? '****' : formatCurrency(totalCost, 0)}
  </div>
</div>

// 總損益卡片（特殊處理）
<div className={`
  p-4 rounded-lg
  ${totalGainLoss >= 0 
    ? 'bg-green-900/10 border border-green-500/30' 
    : 'bg-red-900/10 border border-red-500/30'
  }
`}>
  <div className="text-slate-400 text-sm mb-2">總損益</div>
  <div className={`
    text-2xl font-bold font-mono text-right
    ${totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400'}
  `}>
    {isPrivacyMode ? '****' : formatCurrency(totalGainLoss, 0)}
  </div>
  <div className="text-xs text-slate-400 text-right mt-1">
    {formatPercent(gainLossRate)}
  </div>
</div>

// 損益率卡片
<div className="bg-slate-800 p-4 rounded-lg">
  <div className="text-slate-400 text-sm mb-2">損益率</div>
  <div className={`
    text-2xl font-bold font-mono text-right
    ${gainLossRate >= 0 ? 'text-green-400' : 'text-red-400'}
  `}>
    {isPrivacyMode ? '****' : formatPercent(gainLossRate)}
  </div>
</div>
```

---

## ✅ 完成檢查清單

完成以上三步驟後，檢查以下項目：

### 視覺檢查
- [ ] 所有數值都有千分位逗號
- [ ] 負數使用括號表示：`(87,683)`
- [ ] 數值欄位都右對齊
- [ ] 數值使用等寬字體（font-mono）
- [ ] 標籤是小字淡色，數值是大字亮色

### 功能檢查
- [ ] 隱私模式正常運作
- [ ] 數值計算正確
- [ ] 手機版顯示正常
- [ ] 桌面版顯示正常

### 測試步驟
```bash
# 1. 啟動開發伺服器
npm run dev

# 2. 開啟瀏覽器測試
# - 檢查數值對齊
# - 檢查千分位逗號
# - 檢查負數顯示
# - 測試隱私模式
# - 測試響應式布局

# 3. 執行檢查
npm run check:all
```

---

## 🎯 預期效果

### 改善前
```
代碼    名稱      現價    市值        持股數  成本價   損益率
2330    台積電    1050    1050000     1000    950      +100000
                                                        +10.53%
```
❌ 數值左對齊，難以比較  
❌ 沒有千分位逗號  
❌ 視覺混亂

### 改善後
```
代碼    名稱      現價          市值    持股數      成本價   損益率
2330    台積電    1,050   1,050,000     1,000      950      100,000
                                                            +10.53%
```
✅ 數值右對齊，容易比較  
✅ 千分位逗號清楚  
✅ 等寬字體專業

---

## 💡 進階優化（選做）

完成基本三步驟後，如果還有時間，可以繼續：

### 4. 輸入框優化（30 分鐘）

修改 `QuickAddStock.tsx`：

```typescript
<input
  type="number"
  className="
    bg-slate-800 
    border border-slate-700
    focus:border-blue-500 
    focus:ring-1 focus:ring-blue-500
    transition-colors
    px-3 py-2 rounded
  "
  onFocus={(e) => e.target.select()}  // 自動選取
  placeholder="1000"
/>
```

### 5. 表格 Hover 效果（15 分鐘）

修改 `StockRow.tsx`：

```typescript
<tr className="
  transition-colors 
  hover:bg-slate-800/50
  border-b border-slate-800
">
  {/* 表格內容 */}
</tr>
```

### 6. 帳戶標籤優化（15 分鐘）

修改 `Header.tsx` 或帳戶切換組件：

```typescript
<button className={`
  px-4 py-2 rounded-full
  transition-all
  ${isActive 
    ? 'bg-slate-700 text-white font-medium' 
    : 'text-slate-400 hover:text-white'
  }
`}>
  {accountName}
</button>
```

---

## 🐛 常見問題

### Q1: 修改後數值顯示為 NaN？
**A**: 檢查傳入 `formatCurrency` 的值是否為有效數字。

```typescript
// 錯誤
formatCurrency(undefined, 2)  // NaN

// 正確
formatCurrency(stock.price || 0, 2)  // 0.00
```

### Q2: 手機版數值被截斷？
**A**: 確保表格容器有 `overflow-x-auto`：

```typescript
<div className="overflow-x-auto">
  <table className="min-w-[800px]">
    {/* 表格內容 */}
  </table>
</div>
```

### Q3: 等寬字體看起來太寬？
**A**: 可以調整字體大小：

```typescript
<td className="text-right font-mono text-sm">  // 改為 text-sm
```

---

## 📊 效果對比

| 項目 | 改善前 | 改善後 | 提升 |
|-----|--------|--------|------|
| 數值可讀性 | 😐 | 😊😊😊 | +200% |
| 專業感 | 😐😐 | 😊😊😊😊 | +100% |
| 視覺舒適度 | 😐😐 | 😊😊😊😊 | +100% |

---

## 🎉 完成後

恭喜！你已經完成了最重要的 UI/UX 優化。

### 下一步
1. 提交代碼前執行：`npm run check:all`
2. 測試所有功能是否正常
3. 截圖對比改善前後的效果
4. 更新版本號（遵循 version-management.md）

### 版本號更新
```bash
# 1. 更新三個檔案的版本號
# - package.json
# - src/constants/version.ts
# - src/constants/changelog.ts

# 2. 執行檢查
npm run check:version

# 3. 重新建置
npm run build
```

---

**預估完成時間**：2-3 小時  
**難度**：⭐⭐（簡單）  
**效果**：⭐⭐⭐⭐⭐（顯著）

**記住：先做第 1-3 步，這是投資報酬率最高的改善！**
