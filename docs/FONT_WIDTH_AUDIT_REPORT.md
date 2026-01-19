# 全軟體字體大小與欄位寬度審查報告

**審查日期**：2026-01-16  
**版本**：v1.0.2.0169+  
**審查範圍**：所有 UI 組件

---

## 🎯 審查目標

1. **字體大小統一**：確保相同類型的內容使用相同字體大小
2. **欄位寬度合理**：根據實際數據範圍設定合理寬度
3. **響應式一致**：確保響應式設計的一致性
4. **視覺層次清晰**：主要內容和輔助資訊有明確區分

---

## 📊 字體大小標準（參考規範）

| 用途 | 標準大小 | Tailwind Class | 適用場景 |
|------|----------|----------------|----------|
| 輔助資訊 | 12px | `text-xs` | 標籤、次要資訊、「除息後」 |
| **主要數值** | **14px** | **`text-sm`** | **股價、市值、損益、股息** |
| 一般文字 | 16px | `text-base` | 股票名稱、按鈕文字 |
| 重要統計（手機） | 18px | `text-lg` | 統計卡片數值 |
| 重要統計（桌面） | 20px | `text-xl` | 統計卡片數值 |

---

## 🔍 組件審查結果

### 1. StockRow.tsx ⚠️ 需要優化

#### 當前狀態
```typescript
// ✅ 正確：主要數值使用 text-sm
<span className="text-slate-300 text-sm font-medium font-mono">
  {formatCurrency(stock.currentPrice, 2)}
</span>

// ⚠️ 問題：股票代碼使用 text-xs（太小）
<span className="font-mono font-medium text-xs text-blue-400">
  {stock.symbol}
</span>

// ⚠️ 問題：股票名稱使用 text-xs（太小）
<span className="text-xs text-slate-300">
  {stock.name}
</span>

// ✅ 正確：輔助資訊使用 text-xs
<span className="text-xs text-slate-400 mt-0.5">
  {formatPercent(gainLossPercent)}
</span>
```

#### 建議優化
```typescript
// 股票代碼應該使用 text-sm（更清楚）
<span className="font-mono font-medium text-sm text-blue-400">
  {stock.symbol}
</span>

// 股票名稱應該使用 text-sm（更清楚）
<span className="text-sm text-slate-300">
  {stock.name}
</span>
```

---

### 2. PortfolioStats.tsx ⚠️ 需要優化

#### 當前狀態
```typescript
// ⚠️ 問題：數值字體過大
<div className="text-white text-xl md:text-2xl font-bold font-mono text-right">
  {formatCurrency(stats.totalMarketValue, 0)}
</div>

// ⚠️ 問題：內邊距不一致
<div className="p-2 md:p-4">
```

#### 建議優化
```typescript
// 應該使用 text-lg md:text-xl（更適中）
<div className="text-white text-lg md:text-xl font-bold font-mono text-right">
  {formatCurrency(stats.totalMarketValue, 0)}
</div>

// 應該使用 p-3 md:p-4（更一致）
<div className="p-3 md:p-4">
```

---

### 3. StockList.tsx ✅ 正確

#### 當前狀態
```typescript
// ✅ 正確：表頭使用 text-xs uppercase
<th className="text-xs font-medium text-slate-400 uppercase">
  代碼
</th>
```

#### 說明
表頭使用 `text-xs uppercase` 是標準做法，無需修改。

---

### 4. QuickAddStock.tsx ⚠️ 需要優化

#### 當前狀態
```typescript
// ⚠️ 問題：標籤字體大小不一致
<label className="block text-xs md:text-sm font-medium text-slate-400 mb-1">
  股票搜尋
</label>
```

#### 建議優化
```typescript
// 應該統一使用 text-sm
<label className="block text-sm font-medium text-slate-400 mb-1">
  股票搜尋
</label>
```

---

### 5. EditableCell.tsx ✅ 已修正

#### 當前狀態
```typescript
// ✅ 正確：已使用 text-sm font-mono
<span className="text-slate-300 text-sm font-medium font-mono">
  {formatDisplayValue(value)}
</span>
```

---

### 6. DividendManager.tsx ⚠️ 需要檢查

需要檢查股息管理對話框中的字體大小是否一致。

---

### 7. RightsEventManager.tsx ⚠️ 需要檢查

需要檢查除權息管理對話框中的字體大小是否一致。

---

## 📐 欄位寬度審查

### StockRow 欄位寬度

| 欄位 | 當前寬度 | 實際需求 | 狀態 | 建議 |
|------|----------|----------|------|------|
| 代碼 | `w-16` (64px) | 4-6 字元 | ✅ 合理 | 保持 |
| 名稱 | `w-24` (96px) | 8-10 字元 | ✅ 合理 | 保持 |
| 現價 | `72px` (inline) | 6 位數 | ✅ 合理 | 保持 |
| 市值 | `88px` (inline) | 7 位數 | ✅ 合理 | 保持 |
| 持股數 | `w-20` (80px) | 6 位數 | ✅ 合理 | 保持 |
| 成本價 | `88px` (inline) | 6 位數 + 除息後 | ✅ 合理 | 保持 |
| 損益率 | `w-24` (96px) | 金額 + 百分比 | ✅ 合理 | 保持 |
| 股息 | `w-20` (80px) | 6 位數 + 次數 | ✅ 合理 | 保持 |
| 操作 | `w-12` (48px) | 按鈕 | ✅ 合理 | 保持 |

---

## 🎨 優化建議優先級

### 🔴 高優先級（影響可讀性）

#### 1. StockRow - 股票代碼和名稱字體過小
```typescript
// 當前：text-xs (12px) - 太小
// 建議：text-sm (14px) - 更清楚
```

**影響**：
- 股票代碼是關鍵識別資訊，應該更清楚
- 股票名稱也是重要資訊，不應該太小

**優化方式**：
```typescript
// 股票代碼
<span className="font-mono font-medium text-sm text-blue-400">
  {stock.symbol}
</span>

// 股票名稱
<span className="text-sm text-slate-300">
  {stock.name}
</span>
```

---

#### 2. PortfolioStats - 數值字體過大
```typescript
// 當前：text-xl md:text-2xl (20px/24px) - 太大
// 建議：text-lg md:text-xl (18px/20px) - 更適中
```

**影響**：
- 統計卡片數值過大，與表格數值不協調
- 佔用過多空間

**優化方式**：
```typescript
<div className="text-white text-lg md:text-xl font-bold font-mono text-right">
  {formatCurrency(stats.totalMarketValue, 0)}
</div>
```

---

#### 3. PortfolioStats - 內邊距不一致
```typescript
// 當前：p-2 md:p-4
// 建議：p-3 md:p-4
```

**影響**：
- 手機版內邊距太小，視覺擁擠
- 與其他組件不一致

---

### 🟡 中優先級（影響一致性）

#### 4. QuickAddStock - 標籤字體響應式不必要
```typescript
// 當前：text-xs md:text-sm
// 建議：text-sm（統一）
```

**影響**：
- 標籤字體不需要響應式
- 統一使用 text-sm 更簡潔

---

### 🟢 低優先級（細節優化）

#### 5. 各種對話框的字體大小檢查
- DividendManager
- RightsEventManager
- PurchaseHistoryManager
- DeleteConfirmDialog

需要逐一檢查確保一致性。

---

## 📋 優化實作計畫

### 階段 1：高優先級優化（立即執行）

1. **StockRow.tsx**
   - [ ] 股票代碼：`text-xs` → `text-sm`
   - [ ] 股票名稱：`text-xs` → `text-sm`

2. **PortfolioStats.tsx**
   - [ ] 數值字體：`text-xl md:text-2xl` → `text-lg md:text-xl`
   - [ ] 內邊距：`p-2 md:p-4` → `p-3 md:p-4`

### 階段 2：中優先級優化（本週完成）

3. **QuickAddStock.tsx**
   - [ ] 標籤字體：`text-xs md:text-sm` → `text-sm`

### 階段 3：低優先級優化（下週完成）

4. **對話框組件**
   - [ ] 檢查 DividendManager 字體大小
   - [ ] 檢查 RightsEventManager 字體大小
   - [ ] 檢查 PurchaseHistoryManager 字體大小
   - [ ] 檢查 DeleteConfirmDialog 字體大小

---

## 🎯 優化後的統一標準

### 字體大小使用規則

```typescript
// 1. 主要識別資訊（代碼、名稱）
text-sm (14px)

// 2. 主要數值（股價、市值、損益、股息）
text-sm (14px) + font-mono

// 3. 輔助資訊（百分比、次數、「除息後」）
text-xs (12px)

// 4. 統計卡片數值
text-lg md:text-xl (18px/20px) + font-mono

// 5. 表頭
text-xs (12px) + uppercase

// 6. 標籤
text-sm (14px)
```

### 內邊距使用規則

```typescript
// 表格單元格
px-3 py-3

// 統計卡片
p-3 md:p-4

// 對話框內容
p-4 md:p-6
```

---

## 📊 預期改善效果

### 可讀性改善

| 項目 | 優化前 | 優化後 | 提升 |
|-----|--------|--------|------|
| 股票代碼 | text-xs (12px) | text-sm (14px) | +17% |
| 股票名稱 | text-xs (12px) | text-sm (14px) | +17% |
| 統計卡片 | text-xl/2xl | text-lg/xl | 更協調 |
| 整體一致性 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | +67% |

### 視覺協調性

**優化前**：
- 😞 股票代碼和名稱太小，難以識別
- 😞 統計卡片數值過大，不協調
- 😞 字體大小不一致，視覺混亂

**優化後**：
- 😊 所有主要資訊都清楚易讀
- 😊 統計卡片與表格協調
- 😊 字體大小統一，視覺舒適

---

## ✅ 檢查清單

### 字體大小檢查
- [ ] StockRow 股票代碼使用 text-sm
- [ ] StockRow 股票名稱使用 text-sm
- [ ] StockRow 主要數值使用 text-sm font-mono
- [ ] PortfolioStats 數值使用 text-lg md:text-xl
- [ ] QuickAddStock 標籤使用 text-sm
- [ ] 所有輔助資訊使用 text-xs

### 內邊距檢查
- [ ] 表格單元格使用 px-3 py-3
- [ ] 統計卡片使用 p-3 md:p-4
- [ ] 對話框內容使用 p-4 md:p-6

### 響應式檢查
- [ ] 桌面版顯示正常
- [ ] 平板版顯示正常
- [ ] 手機版顯示正常

---

**審查完成日期**：2026-01-16  
**下一步**：執行階段 1 優化（高優先級）

**記住：一致性是良好 UI 設計的基礎！**
