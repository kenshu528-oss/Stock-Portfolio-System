# UI 字體大小與欄位寬度標準規範

**制定日期**：2026-01-16  
**版本**：v1.0.2.0168  
**狀態**：✅ 正式規範

---

## 🎯 核心原則

### 設計目標
- **可讀性優先**：確保在各種螢幕尺寸下都能清楚閱讀
- **空間效率**：合理利用螢幕空間，避免過度浪費
- **一致性**：相同類型的內容使用相同的字體和寬度
- **實用性**：根據實際數據範圍設定合理寬度

---

## 📏 字體大小標準

### Tailwind 字體大小對照表

| Class | 實際大小 | 用途 | 適用場景 |
|-------|----------|------|----------|
| `text-xs` | 12px | 輔助資訊 | 「除息後」、「X次」、標籤 |
| `text-sm` | 14px | **主要數值** | 股價、市值、損益、股息 |
| `text-base` | 16px | 一般文字 | 股票名稱、按鈕文字 |
| `text-lg` | 18px | 重要數值（手機） | 統計卡片 |
| `text-xl` | 20px | 重要數值（桌面） | 統計卡片 |

### 字體大小使用規則

```typescript
// ✅ 推薦：主要數值使用 text-sm
<span className="text-sm font-medium font-mono">
  {formatCurrency(value)}
</span>

// ✅ 推薦：輔助資訊使用 text-xs
<div className="text-xs text-slate-400">
  除息後: {formatCurrency(adjustedPrice, 2)}
</div>

// ✅ 推薦：響應式統計卡片
<div className="text-lg md:text-xl font-bold">
  {formatCurrency(totalValue)}
</div>
```

---

## 📐 StockRow 欄位寬度標準

### 欄位寬度設計原則

1. **根據實際數據範圍**：分析最大可能值
2. **考慮千分位逗號**：增加 10-15% 空間
3. **預留緩衝空間**：避免數值被截斷
4. **平衡整體布局**：不過度浪費空間

### 標準欄位寬度定義

| 欄位 | 寬度 | Tailwind | 最大容納 | 實際範例 | 說明 |
|------|------|----------|----------|----------|------|
| 代碼 | 64px | `w-16` | 6位數 | 00679B | 股票代碼 + 展開按鈕 |
| 名稱 | 96px | `w-24` | 8-10字 | 元大寶來20年 | 中文名稱 |
| 現價 | 72px | `w-18` | 6位數 | 999.99 | 最多到千元 |
| **市值** | **88px** | **`w-22`** | **7位數** | **2,284,160** | **百萬級市值** |
| **持股數** | **80px** | **`w-20`** | **6位數** | **83,000** | **最多到十萬股** |
| **成本價** | **88px** | **`w-22`** | **含除息後** | **31.39 + 除息後** | **雙行顯示** |
| **損益率** | **96px** | **`w-24`** | **金額+百分比** | **(168,304) -6.87%** | **雙行顯示** |
| **股息** | **80px** | **`w-20`** | **6位數+次數** | **154,795 6次** | **雙行顯示** |
| 操作 | 48px | `w-12` | 按鈕 | ⋮ | 操作選單 |

### 寬度計算邏輯

```typescript
// 數字位數 → 建議寬度（14px 字體）
// 3-4 位數：w-14 (56px)   - 如：1,234
// 4-5 位數：w-16 (64px)   - 如：12,345
// 5-6 位數：w-18 (72px)   - 如：123,456
// 6-7 位數：w-20 (80px)   - 如：1,234,567
// 7-8 位數：w-22 (88px)   - 如：12,345,678
// 8-9 位數：w-24 (96px)   - 如：123,456,789
```

---

## 🎨 實際應用範例

### 1. 代碼欄位（w-16 = 64px）

```typescript
<td className="px-2 py-2 text-center whitespace-nowrap w-16">
  <div className="flex flex-col items-center">
    {/* 展開按鈕 + 代碼 */}
    <span className="font-mono font-medium text-xs text-blue-400">
      {stock.symbol}
    </span>
    {/* 多筆記錄指示 */}
    {hasMultipleRecords && (
      <span className="text-xs px-1 py-0.5 bg-blue-600 rounded">
        {count}筆
      </span>
    )}
  </div>
</td>
```

**容納內容**：
- 股票代碼：4-6 位（如：2330、00679B）
- 展開按鈕：12px
- 多筆指示：「2筆」標籤

---

### 2. 名稱欄位（w-24 = 96px）

```typescript
<td className="px-2 py-2 text-center w-24">
  <div className="truncate">
    <span className="text-xs text-slate-300">
      {stock.name}
    </span>
  </div>
</td>
```

**容納內容**：
- 中文名稱：8-10 字（如：元大寶來20年、台積電）
- 超長名稱會被截斷並顯示 `...`

---

### 3. 現價欄位（w-18 = 72px）

```typescript
<td className="px-3 py-3 text-right whitespace-nowrap w-18">
  <span className="text-slate-300 text-sm font-medium font-mono">
    {formatCurrency(stock.currentPrice, 2)}
  </span>
</td>
```

**容納內容**：
- 最大值：999.99（6 位數含小數點）
- 實際範例：27.52、21.50、7.78

---

### 4. 市值欄位（w-22 = 88px）⭐ 優化重點

```typescript
<td className="px-3 py-3 text-right whitespace-nowrap w-22">
  <span className="text-slate-300 font-medium text-sm font-mono">
    {formatCurrency(marketValue, 0)}
  </span>
</td>
```

**容納內容**：
- 最大值：9,999,999（7 位數 = 千萬級）
- 實際範例：2,284,160、21,500、318,988

**優化說明**：
- 從 `w-28` (112px) 縮減到 `w-22` (88px)
- 節省 24px 空間（-21%）
- 仍能完整顯示百萬級市值

---

### 5. 持股數欄位（w-20 = 80px）⭐ 優化重點

```typescript
<td className="px-3 py-3 text-right whitespace-nowrap w-20">
  <EditableCell
    value={stock.shares}
    onSave={handleSharesUpdate}
    type="integer"
    displayFormat={(value) => formatShares(value)}
  />
</td>
```

**容納內容**：
- 最大值：999,999（6 位數 = 十萬股）
- 實際範例：83,000、1,000、41,000

**優化說明**：
- 從 `w-24` (96px) 縮減到 `w-20` (80px)
- 節省 16px 空間（-17%）
- 仍能完整顯示十萬股以內

---

### 6. 成本價欄位（w-22 = 88px）⭐ 優化重點

```typescript
<td className="px-3 py-3 text-right w-22">
  <div className="flex flex-col items-end">
    {/* 主要成本價 */}
    <EditableCell
      value={displayCostPrice}
      onSave={handleCostPriceUpdate}
      type="decimal"
      displayFormat={(value) => formatCurrency(value, 2)}
    />
    {/* 除息後資訊 */}
    {shouldShowCostInfo && (
      <div className="text-xs text-blue-400 font-mono mt-1">
        除息後: {formatCurrency(stock.adjustedCostPrice, 2)}
      </div>
    )}
  </div>
</td>
```

**容納內容**：
- 主要成本價：999.99（6 位數）
- 除息後資訊：「除息後: 28.53」（12 字元）

**優化說明**：
- 從 `w-24` (96px) 縮減到 `w-22` (88px)
- 節省 8px 空間（-8%）
- 雙行顯示，上下排列

---

### 7. 損益率欄位（w-24 = 96px）

```typescript
<td className="px-3 py-3 text-right w-24">
  <div className="flex flex-col items-end">
    {/* 損益金額 */}
    <span className="font-medium text-sm font-mono text-green-400">
      {formatCurrency(gainLoss, 0)}
    </span>
    {/* 損益百分比 */}
    <span className="text-xs text-slate-400 mt-0.5">
      {formatPercent(gainLossPercent)}
    </span>
  </div>
</td>
```

**容納內容**：
- 損益金額：(999,999)（8 位數含括號）
- 損益百分比：+123.45%（8 字元）

**說明**：
- 維持 `w-24` (96px)
- 需要容納負數括號：`(168,304)`
- 雙行顯示，上下排列

---

### 8. 股息欄位（w-20 = 80px）⭐ 優化重點

```typescript
<td className="px-3 py-3 text-right w-20">
  {totalDividend > 0 ? (
    <div className="flex flex-col items-end">
      {/* 股息金額 */}
      <span className="text-green-400 font-medium text-sm font-mono">
        {formatCurrency(totalDividend, 0)}
      </span>
      {/* 股息次數 */}
      {stock.dividendRecords?.length > 0 && (
        <div className="text-xs text-slate-500 mt-1">
          {stock.dividendRecords.length} 次
        </div>
      )}
    </div>
  ) : (
    <span className="text-slate-500 text-sm">-</span>
  )}
</td>
```

**容納內容**：
- 股息金額：999,999（6 位數）
- 股息次數：「6 次」（3 字元）

**優化說明**：
- 從 `w-24` (96px) 縮減到 `w-20` (80px)
- 節省 16px 空間（-17%）
- 雙行顯示，上下排列

---

## 📊 優化效果對比

### 空間節省統計

| 欄位 | 優化前 | 優化後 | 節省 | 節省率 |
|------|--------|--------|------|--------|
| 市值 | w-28 (112px) | w-22 (88px) | 24px | -21% |
| 持股數 | w-24 (96px) | w-20 (80px) | 16px | -17% |
| 成本價 | w-24 (96px) | w-22 (88px) | 8px | -8% |
| 損益率 | w-28 (112px) | w-24 (96px) | 16px | -14% |
| 股息 | w-24 (96px) | w-20 (80px) | 16px | -17% |
| **總計** | **484px** | **404px** | **80px** | **-17%** |

### 視覺效果改善

**優化前**：
- ❌ 欄位過寬，浪費空間
- ❌ 表格整體過寬，需要橫向滾動
- ❌ 數據密度低，視覺效率差

**優化後**：
- ✅ 欄位寬度合理，空間利用高效
- ✅ 表格更緊湊，減少滾動需求
- ✅ 數據密度適中，視覺舒適

---

## 🎯 實作檢查清單

### 字體大小檢查
- [ ] 主要數值使用 `text-sm` (14px)
- [ ] 輔助資訊使用 `text-xs` (12px)
- [ ] 統計卡片使用響應式 `text-lg md:text-xl`
- [ ] 所有數值使用等寬字體 `font-mono`

### 欄位寬度檢查
- [ ] 代碼欄位 `w-16` (64px)
- [ ] 名稱欄位 `w-24` (96px)
- [ ] 現價欄位 `w-18` (72px)
- [ ] 市值欄位 `w-22` (88px) ⭐
- [ ] 持股數欄位 `w-20` (80px) ⭐
- [ ] 成本價欄位 `w-22` (88px) ⭐
- [ ] 損益率欄位 `w-24` (96px)
- [ ] 股息欄位 `w-20` (80px) ⭐
- [ ] 操作欄位 `w-12` (48px)

### 響應式檢查
- [ ] 桌面版（1920px+）顯示正常
- [ ] 平板版（768px-1024px）可橫向滾動
- [ ] 手機版（320px-768px）可橫向滾動
- [ ] 所有數值不會被截斷

---

## 🔍 測試建議

### 1. 極端值測試

```typescript
// 測試最大值
const testData = {
  marketValue: 9999999,      // 7位數
  shares: 999999,            // 6位數
  costPrice: 999.99,         // 6位數
  gainLoss: -999999,         // 負數 6位數
  dividend: 999999           // 6位數
};
```

### 2. 實際數據測試

根據截圖中的實際數據：
- 市值：2,284,160 ✅ 可完整顯示
- 持股數：83,000 ✅ 可完整顯示
- 成本價：31.39 + 除息後 ✅ 可完整顯示
- 損益：(168,304) -6.87% ✅ 可完整顯示
- 股息：154,795 6次 ✅ 可完整顯示

### 3. 視覺測試

```bash
npm run dev
# 訪問 http://localhost:5173
```

**檢查項目**：
- 所有欄位寬度是否合理
- 數值是否完整顯示（無截斷）
- 整體布局是否協調
- 橫向滾動是否流暢

---

## 💡 最佳實踐

### 1. 寬度設定原則

```typescript
// ✅ 正確：根據實際數據範圍設定
<td className="w-20">  // 容納 6 位數

// ❌ 錯誤：過度預留空間
<td className="w-32">  // 浪費空間
```

### 2. 字體大小原則

```typescript
// ✅ 正確：主要數值 text-sm
<span className="text-sm font-mono">
  {formatCurrency(value)}
</span>

// ❌ 錯誤：主要數值 text-xs（太小）
<span className="text-xs font-mono">
  {formatCurrency(value)}
</span>
```

### 3. 雙行顯示原則

```typescript
// ✅ 正確：主要資訊在上，輔助資訊在下
<div className="flex flex-col items-end">
  <span className="text-sm">{mainValue}</span>
  <span className="text-xs text-slate-400">{subValue}</span>
</div>
```

---

## 📈 預期改善效果

### 空間利用率
- **節省 80px 寬度**（-17%）
- **減少橫向滾動需求**
- **提升數據密度**

### 可讀性
- **字體大小適中**（14px）
- **數值完整顯示**（無截斷）
- **視覺層次清晰**（主次分明）

### 用戶體驗
- **更緊湊的布局**
- **更高效的空間利用**
- **更舒適的視覺體驗**

---

**制定日期**：2026-01-16  
**版本**：v1.0.2.0168  
**狀態**：✅ 正式規範

**記住：合理的寬度設定是空間效率和可讀性的平衡！**
