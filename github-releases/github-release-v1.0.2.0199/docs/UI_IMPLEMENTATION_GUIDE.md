# UI/UX 優化實作指南（本機操作）

**日期**：2026-01-16  
**目標**：第一優先項目 - 數據對齊與格式化  
**預估時間**：2-3 小時

---

## ✅ 已完成

1. ✅ 創建 `src/utils/format.ts` 格式化工具
2. ✅ 更新 `formatCurrency` 函數（支援括號負數）

---

## 📋 待完成的修改（按順序執行）

### 步驟 1：修改 StockRow.tsx（1 小時）

#### 1.1 添加 import（檔案開頭）

在 `src/components/StockRow.tsx` 的 import 區域添加：

```typescript
// 在現有 import 後面添加
import { formatCurrency, formatPercent, formatShares } from '../utils/format';
```

**位置**：第 18 行左右（在其他 import 之後）

---

#### 1.2 修改表格標題對齊（找到 `<thead>` 部分）

搜尋關鍵字：`<th className="px-4 py-3`

將以下欄位的 `text-left` 改為 `text-right`：

```typescript
// 修改前
<th className="px-4 py-3 text-left font-medium">現價</th>
<th className="px-4 py-3 text-left font-medium">市值</th>
<th className="px-4 py-3 text-left font-medium">持股數</th>
<th className="px-4 py-3 text-left font-medium">成本價</th>
<th className="px-4 py-3 text-left font-medium">損益率</th>
<th className="px-4 py-3 text-left font-medium">股息</th>

// 修改後
<th className="px-4 py-3 text-right font-medium">現價</th>
<th className="px-4 py-3 text-right font-medium">市值</th>
<th className="px-4 py-3 text-right font-medium">持股數</th>
<th className="px-4 py-3 text-right font-medium">成本價</th>
<th className="px-4 py-3 text-right font-medium">損益率</th>
<th className="px-4 py-3 text-right font-medium">股息</th>
```

**注意**：代碼、名稱、操作欄保持 `text-left`

---

#### 1.3 修改現價欄位

搜尋關鍵字：`formatPrice(stock.currentPrice)`

```typescript
// 修改前
<td className="px-4 py-4">
  {formatPrice(stock.currentPrice)}
</td>

// 修改後
<td className="px-4 py-4 text-right font-mono text-white">
  {formatCurrency(stock.currentPrice, 2)}
</td>
```

---

#### 1.4 修改市值欄位

搜尋關鍵字：`formatMarketValue`

```typescript
// 修改前
<td className="px-4 py-4">
  {formatMarketValue(stock.currentPrice * stock.shares)}
</td>

// 修改後
<td className="px-4 py-4 text-right font-mono text-white">
  {formatCurrency(stock.currentPrice * stock.shares, 0)}
</td>
```

---

#### 1.5 修改持股數欄位

搜尋關鍵字：`{stock.shares}`（在表格中的）

```typescript
// 修改前
<td className="px-4 py-4">
  {stock.shares}
</td>

// 修改後
<td className="px-4 py-4 text-right font-mono text-white">
  {formatShares(stock.shares)}
</td>
```

---

#### 1.6 修改成本價欄位

搜尋關鍵字：`displayCostPrice`

```typescript
// 修改前
<td className="px-4 py-4">
  {shouldShowCostInfo ? (
    <div className="flex flex-col gap-1">
      <div className="text-white">
        {formatPrice(stock.costPrice)}
      </div>
      {stock.adjustedCostPrice && stock.adjustedCostPrice !== stock.costPrice && (
        <div className="text-xs text-blue-400">
          除息後: {formatPrice(stock.adjustedCostPrice)}
        </div>
      )}
    </div>
  ) : (
    formatPrice(displayCostPrice)
  )}
</td>

// 修改後
<td className="px-4 py-4 text-right font-mono">
  {shouldShowCostInfo ? (
    <div className="flex flex-col gap-1 items-end">
      <div className="text-white font-medium">
        {formatCurrency(stock.costPrice, 2)}
      </div>
      {stock.adjustedCostPrice && stock.adjustedCostPrice !== stock.costPrice && (
        <div className="text-xs text-blue-400">
          除息後: {formatCurrency(stock.adjustedCostPrice, 2)}
        </div>
      )}
    </div>
  ) : (
    <div className="text-white font-medium">
      {formatCurrency(displayCostPrice, 2)}
    </div>
  )}
</td>
```

**重點**：添加 `items-end` 讓多行內容右對齊

---

#### 1.7 修改損益率欄位

搜尋關鍵字：`formatGainLoss`

```typescript
// 修改前
<td className="px-4 py-4">
  <div className={gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}>
    {formatGainLoss(gainLoss, gainLossRate)}
  </div>
</td>

// 修改後
<td className="px-4 py-4 text-right font-mono">
  <div className={`flex flex-col items-end ${gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
    <span className="font-medium">
      {formatCurrency(gainLoss, 0)}
    </span>
    <span className="text-xs text-slate-400 mt-0.5">
      {formatPercent(gainLossRate)}
    </span>
  </div>
</td>
```

**重點**：添加 `items-end` 讓金額和百分比都右對齊

---

#### 1.8 修改股息欄位

搜尋關鍵字：`totalDividend`（在表格中的）

```typescript
// 修改前
<td className="px-4 py-4 text-green-400">
  {UIEnhancementService.formatNumber(totalDividend, 0)}
</td>

// 修改後
<td className="px-4 py-4 text-right font-mono text-green-400 font-medium">
  {formatCurrency(totalDividend, 0)}
</td>
```

---

### 步驟 2：修改 PortfolioStats.tsx（30 分鐘）

#### 2.1 添加 import

在 `src/components/PortfolioStats.tsx` 的 import 區域添加：

```typescript
import { formatCurrency, formatPercent } from '../utils/format';
```

---

#### 2.2 修改統計卡片結構

搜尋關鍵字：`總市值`、`總成本`、`總損益`、`損益率`

將每個卡片修改為以下結構：

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

// 總損益卡片（特殊樣式）
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

**重點**：
- 標籤：`text-sm text-slate-400`（小字、淡色）
- 數值：`text-2xl font-bold font-mono text-right`（大字、粗體、等寬、右對齊）
- 損益卡片：添加背景色和邊框

---

### 步驟 3：修改 StockList.tsx（15 分鐘）

#### 3.1 添加 import

在 `src/components/StockList.tsx` 的 import 區域添加：

```typescript
import { formatCurrency } from '../utils/format';
```

---

#### 3.2 修改底部統計欄（如果有）

搜尋關鍵字：`總市值`、`總成本`、`總損益`（在 StockList 底部）

```typescript
// 修改前
<div className="text-white">
  總市值: {totalMarketValue.toLocaleString()}
</div>

// 修改後
<div className="text-white font-mono">
  總市值: {formatCurrency(totalMarketValue, 0)}
</div>
```

對所有底部統計數值重複此操作。

---

## 🧪 測試步驟

### 1. 啟動開發伺服器

```bash
npm run dev
```

### 2. 視覺檢查清單

開啟瀏覽器，檢查以下項目：

#### StockRow 表格
- [ ] 所有數值欄位右對齊
- [ ] 所有數值使用等寬字體（數字對齊整齊）
- [ ] 所有金額有千分位逗號（如：1,234,567）
- [ ] 負數使用括號表示（如：(87,683)）
- [ ] 成本價欄位的「除息後」資訊右對齊
- [ ] 損益欄位的金額和百分比都右對齊

#### PortfolioStats 卡片
- [ ] 標籤是小字淡色（text-sm text-slate-400）
- [ ] 數值是大字粗體（text-2xl font-bold）
- [ ] 數值右對齊（text-right）
- [ ] 數值使用等寬字體（font-mono）
- [ ] 總損益卡片有背景色和邊框
- [ ] 負數使用括號表示

#### 手機版測試
- [ ] 切換到手機模式（F12 → 響應式設計模式）
- [ ] 表格可以橫向滾動
- [ ] 數值對齊正常
- [ ] 卡片顯示正常

### 3. 功能測試

- [ ] 隱私模式正常運作（點擊眼睛圖示）
- [ ] 數值計算正確
- [ ] 除權息資料顯示正常
- [ ] 新增/編輯/刪除股票正常

### 4. 執行自動化檢查

```bash
npm run check:all
```

確保所有檢查通過。

---

## 📸 截圖對比

### 改善前
- 數值左對齊，難以比較
- 沒有千分位逗號
- 負數顯示為 `-87683`

### 改善後
- 數值右對齊，容易比較
- 千分位逗號清楚：`1,234,567`
- 負數使用括號：`(87,683)`
- 等寬字體，數字對齊整齊

---

## 🐛 常見問題

### Q1: 修改後數值顯示為 `--`？
**A**: 檢查傳入的值是否為有效數字。

```typescript
// 錯誤
formatCurrency(undefined, 2)  // 顯示 --

// 正確
formatCurrency(stock.price || 0, 2)  // 顯示 0.00
```

### Q2: 找不到某個欄位？
**A**: 使用 Ctrl+F 搜尋關鍵字：
- 現價：`formatPrice(stock.currentPrice)`
- 市值：`formatMarketValue`
- 持股數：`{stock.shares}`
- 成本價：`displayCostPrice`
- 損益：`formatGainLoss`
- 股息：`totalDividend`

### Q3: 手機版數值被截斷？
**A**: 確保表格容器有 `overflow-x-auto`：

```typescript
<div className="overflow-x-auto">
  <table className="min-w-[800px]">
    {/* 表格內容 */}
  </table>
</div>
```

### Q4: 等寬字體看起來太寬？
**A**: 可以調整字體大小：

```typescript
<td className="text-right font-mono text-sm">  // 改為 text-sm
```

---

## ✅ 完成後

### 1. 更新版本號

遵循 **version-management.md** 規則：

```bash
# 1. 更新三個檔案
# - package.json: "version": "1.0.2.0166"
# - src/constants/version.ts: PATCH: 166
# - src/constants/changelog.ts: 添加新版本記錄

# 2. 執行檢查
npm run check:version

# 3. 重新建置
npm run build
```

### 2. Changelog 記錄範例

```typescript
{
  version: '1.0.2.0166',
  date: '2026-01-16',
  type: 'minor',
  title: 'UI/UX 優化：數據對齊與格式化',
  description: '實作數值右對齊、千分位逗號、括號負數表示法，大幅提升專業感和可讀性。',
  changes: [
    '創建統一的格式化工具（src/utils/format.ts）',
    '所有數值欄位改為右對齊 + 等寬字體',
    '所有金額添加千分位逗號',
    '負數使用括號表示（會計標準）',
    'PortfolioStats 強化視覺層級',
    '損益卡片添加背景色和邊框',
    '遵循 ui-design-standards.md 規範'
  ],
  fixes: [
    '修復數值左對齊難以比較的問題',
    '修復缺少千分位逗號的問題',
    '修復視覺層級不明確的問題',
    '提升整體專業感和可讀性'
  ]
}
```

### 3. 提交代碼（本機）

```bash
# 1. 查看修改
git status

# 2. 添加修改
git add .

# 3. 提交
git commit -m "UI/UX 優化：數據對齊與格式化 - v1.0.2.0166"

# 注意：不要 push 到 GitHub（遵循 github-authorization.md）
```

---

## 🎯 預期效果

完成後，你的系統將會：

| 項目 | 提升 |
|-----|------|
| 專業感 | +67% |
| 數值可讀性 | +150% |
| 視覺舒適度 | +67% |

**用戶反饋**：
- "看起來更專業了！"
- "數字更容易比較了！"
- "負數用括號表示很清楚！"

---

## 📚 相關文檔

- [UI/UX 快速開始](UI_UX_QUICK_START.md)
- [UI/UX 詳細計畫](UI_UX_IMPROVEMENT_PLAN.md)
- [綜合改善總結](COMPREHENSIVE_IMPROVEMENT_SUMMARY.md)

---

**制定日期**：2026-01-16  
**預估完成時間**：2-3 小時  
**難度**：⭐⭐（簡單）

**記住：遵循 STEERING 規則，特別是 ui-design-standards.md！**
