# UI 對齊標準規範 (UI Alignment Standards)

**制定日期**：2026-01-16  
**版本**：v1.0.2.0171  
**狀態**：✅ 正式規範

---

## 🎯 核心原則

### 對齊的重要性
- **數值靠右**：方便比較大小，符合財務軟體標準
- **文字靠左**：符合閱讀習慣
- **標識置中**：代碼、操作按鈕等
- **一致性**：表頭和內容對齊方式必須一致

---

## 📏 標準對齊規則

### 財務軟體對齊標準

| 內容類型 | 對齊方式 | 原因 | 範例 |
|----------|----------|------|------|
| **數值** | **靠右** | 方便比較大小，小數點對齊 | 股價、市值、損益 |
| **文字** | **靠左** | 符合閱讀習慣 | 股票名稱、說明 |
| **代碼** | **置中** | 視覺平衡 | 股票代碼 |
| **操作** | **置中** | 視覺平衡 | 按鈕、選單 |

---

## 🔍 StockList 表格對齊規範

### 當前問題分析

根據截圖：
- ❌ **現價欄位**：靠右（正確）但表頭置中（不一致）
- ❌ **持股數欄位**：靠右（正確）但表頭置中（不一致）
- ❌ **市值欄位**：靠右（正確）但表頭置中（不一致）
- ❌ **成本價欄位**：靠右（正確）但表頭置中（不一致）
- ❌ **損益率欄位**：靠右（正確）但表頭置中（不一致）
- ❌ **股息欄位**：靠右（正確）但表頭置中（不一致）

### 標準對齊方案

| 欄位 | 內容類型 | 表頭對齊 | 內容對齊 | 說明 |
|------|----------|----------|----------|------|
| 代碼 | 標識 | `text-center` | `text-center` | ✅ 置中 |
| 名稱 | 文字 | `text-left` | `text-left` | ✅ 靠左 |
| **現價** | **數值** | **`text-right`** | **`text-right`** | ⭐ 靠右 |
| **市值** | **數值** | **`text-right`** | **`text-right`** | ⭐ 靠右 |
| **持股數** | **數值** | **`text-right`** | **`text-right`** | ⭐ 靠右 |
| **成本價** | **數值** | **`text-right`** | **`text-right`** | ⭐ 靠右 |
| **損益率** | **數值** | **`text-right`** | **`text-right`** | ⭐ 靠右 |
| **股息** | **數值** | **`text-right`** | **`text-right`** | ⭐ 靠右 |
| 操作 | 按鈕 | `text-center` | `text-center` | ✅ 置中 |

---

## 💡 為什麼數值要靠右對齊？

### 1. 方便比較大小

```
❌ 置中對齊（難以比較）
  2,284,160
    21,500
   318,988

✅ 靠右對齊（容易比較）
  2,284,160
     21,500
    318,988
```

### 2. 小數點對齊

```
❌ 置中對齊（小數點不對齊）
  27.52
  21.50
   7.78

✅ 靠右對齊（小數點對齊）
  27.52
  21.50
   7.78
```

### 3. 符合財務軟體標準

所有專業財務軟體（Excel、會計軟體、股票軟體）都使用靠右對齊：
- Microsoft Excel - 數值預設靠右
- Google Sheets - 數值預設靠右
- Bloomberg Terminal - 數值靠右
- Yahoo Finance - 數值靠右

---

## 🔧 實作方式

### StockList.tsx 表頭修正

```typescript
// ❌ 錯誤：數值欄位表頭置中
<th className="px-2 py-2 text-center text-xs font-medium">
  現價
</th>

// ✅ 正確：數值欄位表頭靠右
<th className="px-2 py-2 text-right text-xs font-medium">
  現價
</th>
```

### 完整的表頭對齊設定

```typescript
<thead className="bg-slate-900 sticky top-0 z-10">
  <tr>
    {/* 代碼 - 置中 */}
    <th className="px-2 py-2 text-center text-xs font-medium text-slate-400 uppercase">
      代碼
    </th>
    
    {/* 名稱 - 靠左 */}
    <th className="px-2 py-2 text-left text-xs font-medium text-slate-400 uppercase">
      名稱
    </th>
    
    {/* 現價 - 靠右 ⭐ */}
    <th className="px-2 py-2 text-right text-xs font-medium text-slate-400 uppercase">
      現價
    </th>
    
    {/* 市值 - 靠右 ⭐ */}
    <th className="px-2 py-2 text-right text-xs font-medium text-slate-400 uppercase">
      市值
    </th>
    
    {/* 持股數 - 靠右 ⭐ */}
    <th className="px-2 py-2 text-right text-xs font-medium text-slate-400 uppercase">
      持股數
    </th>
    
    {/* 成本價 - 靠右 ⭐ */}
    <th className="px-2 py-2 text-right text-xs font-medium text-slate-400 uppercase">
      成本價
    </th>
    
    {/* 損益率 - 靠右 ⭐ */}
    <th className="px-2 py-2 text-right text-xs font-medium text-slate-400 uppercase">
      損益率
    </th>
    
    {/* 股息 - 靠右 ⭐ */}
    <th className="px-2 py-2 text-right text-xs font-medium text-slate-400 uppercase">
      股息
    </th>
    
    {/* 操作 - 置中 */}
    <th className="px-1 py-2 text-center text-xs font-medium text-slate-400 uppercase">
      操作
    </th>
  </tr>
</thead>
```

---

## 📊 對齊效果對比

### 優化前（置中對齊）

```
代碼    名稱      現價      市值        持股數
00679B  元大寶來   27.52   2,284,160   83,000
2208    台船      21.50     21,500     1,000
2867    三商壽     7.78    318,988    41,000
```

**問題**：
- 😞 數值大小難以比較
- 😞 小數點不對齊
- 😞 不符合財務軟體標準

### 優化後（靠右對齊）

```
代碼    名稱          現價        市值    持股數
00679B  元大寶來     27.52  2,284,160    83,000
2208    台船         21.50     21,500     1,000
2867    三商壽        7.78    318,988    41,000
```

**改善**：
- 😊 數值大小一目了然
- 😊 小數點整齊對齊
- 😊 符合財務軟體標準

---

## 🎨 其他組件的對齊規範

### PortfolioStats 統計卡片

```typescript
// ✅ 正確：數值靠右
<div className="text-white text-lg md:text-xl font-bold font-mono text-right">
  {formatCurrency(stats.totalMarketValue, 0)}
</div>
```

### QuickAddStock 表單

```typescript
// ✅ 正確：標籤靠左，輸入框內容靠右
<label className="block text-sm font-medium text-slate-400 text-left">
  持股數
</label>
<input 
  type="number" 
  className="text-right"  // 數值輸入靠右
/>
```

### DividendManager 表格

```typescript
// ✅ 正確：數值欄位靠右
<td className="px-4 py-3 text-right">
  {formatCurrency(dividend.amount, 2)}
</td>
```

---

## 📋 實作檢查清單

### 表格對齊檢查
- [ ] 代碼欄位：表頭和內容都置中
- [ ] 名稱欄位：表頭和內容都靠左
- [ ] 現價欄位：表頭和內容都靠右 ⭐
- [ ] 市值欄位：表頭和內容都靠右 ⭐
- [ ] 持股數欄位：表頭和內容都靠右 ⭐
- [ ] 成本價欄位：表頭和內容都靠右 ⭐
- [ ] 損益率欄位：表頭和內容都靠右 ⭐
- [ ] 股息欄位：表頭和內容都靠右 ⭐
- [ ] 操作欄位：表頭和內容都置中

### 統計卡片檢查
- [ ] 標籤靠左
- [ ] 數值靠右

### 表單檢查
- [ ] 標籤靠左
- [ ] 數值輸入框內容靠右

---

## 🎯 預期改善效果

### 視覺效果

| 指標 | 優化前 | 優化後 | 提升 |
|-----|--------|--------|------|
| 數值可比性 | ⭐⭐ | ⭐⭐⭐⭐⭐ | +150% |
| 視覺整齊度 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | +67% |
| 專業感 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | +67% |
| 符合標準 | ⭐⭐ | ⭐⭐⭐⭐⭐ | +150% |

### 用戶體驗

**優化前**：
- 😞 "數值對齊很亂，難以比較"
- 😞 "為什麼有的靠左有的靠右？"
- 😞 "看起來不專業"

**優化後**：
- 😊 "數值整齊對齊，容易比較"
- 😊 "對齊方式一致，看起來舒服"
- 😊 "很專業，像真正的財務軟體"

---

## 💡 最佳實踐

### 1. 表頭和內容對齊必須一致

```typescript
// ❌ 錯誤：表頭置中，內容靠右
<th className="text-center">現價</th>
<td className="text-right">{price}</td>

// ✅ 正確：表頭和內容都靠右
<th className="text-right">現價</th>
<td className="text-right">{price}</td>
```

### 2. 數值欄位使用等寬字體

```typescript
// ✅ 正確：數值使用 font-mono
<span className="text-sm font-mono text-right">
  {formatCurrency(value)}
</span>
```

### 3. 考慮內邊距

```typescript
// ✅ 正確：靠右對齊時右側內邊距
<td className="px-3 py-3 text-right">
  {value}
</td>
```

---

## 🔍 參考範例

### Excel 對齊方式
- 文字：預設靠左
- 數值：預設靠右
- 日期：預設靠右

### Bloomberg Terminal
- 股票代碼：置中
- 股票名稱：靠左
- 所有數值：靠右

### Yahoo Finance
- 股票代碼：靠左
- 股票名稱：靠左
- 所有數值：靠右

---

**制定日期**：2026-01-16  
**版本**：v1.0.2.0171  
**狀態**：✅ 正式規範

**記住：正確的對齊方式是專業財務軟體的基本要求！數值靠右對齊是行業標準！**
