# UI 設計標準規範 (UI Design Standards)

## 🎨 核心原則：統一性與一致性

### 絕對要求的標準
- ✅ **所有圖示必須使用統一的組件系統**
- ✅ **所有互動元素必須遵循統一的視覺規範**
- ✅ **所有顏色和尺寸必須符合設計標準**
- ✅ **所有動畫和過渡效果必須一致**

## 📦 圖示組件系統

### 1. 統一圖示組件位置
```typescript
// 所有圖示組件統一放置於
src/components/ui/Icons.tsx
```

### 2. 標準圖示定義

#### ✅ 確認操作圖示
```typescript
<CheckIcon size="sm|md|lg" className="..." />
```
- **用途**: 確認、保存、同意操作
- **設計**: 勾勾符號，strokeWidth=3
- **顏色**: 綠色系 (text-green-300, bg-green-600)
- **尺寸**: sm(16px), md(20px), lg(24px)

#### ❌ 取消操作圖示
```typescript
<XIcon size="sm|md|lg" className="..." />
```
- **用途**: 取消、刪除、拒絕操作
- **設計**: X 符號，strokeWidth=3
- **顏色**: 紅色系 (text-red-300, bg-red-600)
- **尺寸**: sm(16px), md(20px), lg(24px)

#### ✏️ 編輯操作圖示
```typescript
<EditIcon size="sm|md|lg" className="..." />
```
- **用途**: 編輯、修改操作
- **設計**: 筆形圖示，strokeWidth=2
- **顏色**: 中性色系 (text-slate-400, hover:text-white)
- **尺寸**: sm(16px), md(20px), lg(24px)

#### 🗑️ 刪除操作圖示
```typescript
<DeleteIcon size="sm|md|lg" className="..." />
```
- **用途**: 刪除、移除操作
- **設計**: 垃圾桶圖示，strokeWidth=2
- **顏色**: 紅色系 (text-red-400, hover:text-red-300)
- **尺寸**: sm(16px), md(20px), lg(24px)

#### ⬆️⬇️ 方向操作圖示
```typescript
<ArrowUpIcon size="sm|md|lg" className="..." />
<ArrowDownIcon size="sm|md|lg" className="..." />
```
- **用途**: 排序、移動操作
- **設計**: 箭頭圖示，strokeWidth=2
- **顏色**: 中性色系 (text-slate-400, hover:text-white)
- **尺寸**: sm(16px), md(20px), lg(24px)

#### ✖️ 關閉操作圖示
```typescript
<CloseIcon size="sm|md|lg" className="..." />
```
- **用途**: 關閉 Modal、對話框
- **設計**: X 符號，strokeWidth=2
- **顏色**: 中性色系 (text-slate-400, hover:text-white)
- **尺寸**: sm(16px), md(20px), lg(24px)

#### 🔍 搜尋操作圖示
```typescript
<SearchIcon size="sm|md|lg" className="..." />
```
- **用途**: 搜尋、查找操作
- **設計**: 放大鏡圖示，strokeWidth=2
- **顏色**: 中性色系 (text-slate-400, hover:text-blue-400)
- **尺寸**: sm(16px), md(20px), lg(24px)

## 🎯 按鈕設計規範

### 1. 確認按鈕標準
```typescript
<Button className="bg-green-600 hover:bg-green-700 text-white">
  <CheckIcon size="sm" />
</Button>
```
- **背景色**: bg-green-600 → hover:bg-green-700
- **文字色**: text-white
- **圖示**: CheckIcon
- **用途**: 保存、確認、提交

### 2. 取消按鈕標準
```typescript
<Button className="bg-red-600 hover:bg-red-700 text-white">
  <XIcon size="sm" />
</Button>
```
- **背景色**: bg-red-600 → hover:bg-red-700
- **文字色**: text-white
- **圖示**: XIcon
- **用途**: 取消、拒絕、關閉

### 3. 中性按鈕標準
```typescript
<Button className="bg-slate-600 hover:bg-slate-700 text-white">
  <EditIcon size="sm" />
</Button>
```
- **背景色**: bg-slate-600 → hover:bg-slate-700
- **文字色**: text-white
- **圖示**: 根據功能選擇
- **用途**: 編輯、一般操作

## 📏 尺寸標準

### 圖示尺寸規範
```typescript
const sizeClasses = {
  sm: 'w-4 h-4',   // 16px - 小按鈕、內嵌圖示
  md: 'w-5 h-5',   // 20px - 標準按鈕、一般圖示
  lg: 'w-6 h-6'    // 24px - 大按鈕、標題圖示
};
```

### 按鈕尺寸規範
- **小按鈕**: h-6 px-2 text-xs (24px 高度)
- **標準按鈕**: h-8 px-3 text-sm (32px 高度)
- **大按鈕**: h-10 px-4 text-base (40px 高度)

## 🎨 顏色系統

### 主要顏色定義
```css
/* 成功/確認色系 */
--success-light: text-green-300
--success-normal: bg-green-600
--success-dark: bg-green-700

/* 錯誤/取消色系 */
--error-light: text-red-300
--error-normal: bg-red-600
--error-dark: bg-red-700

/* 中性色系 */
--neutral-light: text-slate-400
--neutral-normal: bg-slate-600
--neutral-dark: bg-slate-700

/* 警告色系 */
--warning-light: text-yellow-300
--warning-normal: bg-yellow-600
--warning-dark: bg-yellow-700
```

## 🔄 動畫與過渡

### 標準過渡效果
```css
/* 按鈕懸停 */
transition-colors duration-200

/* 背景變化 */
hover:bg-slate-600 transition-colors

/* 縮放效果 */
transform hover:scale-105 transition-all duration-200
```

## 📋 實作檢查清單

### 新增 UI 元素時必須確認
- [ ] 是否使用了統一的圖示組件？
- [ ] 是否遵循了顏色規範？
- [ ] 是否使用了標準的尺寸？
- [ ] 是否添加了適當的過渡效果？
- [ ] 是否符合無障礙設計要求？

### 圖示使用檢查
- [ ] 確認操作使用 CheckIcon + 綠色
- [ ] 取消操作使用 XIcon + 紅色
- [ ] 編輯操作使用 EditIcon + 中性色
- [ ] 刪除操作使用 DeleteIcon + 紅色
- [ ] 方向操作使用 ArrowIcon + 中性色

## 🚫 禁止的做法

### 絕對禁止
- ❌ 直接在組件中寫 SVG 代碼
- ❌ 使用文字符號 (✓, ✕, ←, →)
- ❌ 不一致的顏色搭配
- ❌ 隨意的尺寸設定
- ❌ 缺少過渡效果的按鈕

### 錯誤範例
```typescript
// ❌ 錯誤：直接使用文字符號
<Button>✓</Button>

// ❌ 錯誤：直接寫 SVG
<svg className="w-4 h-4">...</svg>

// ❌ 錯誤：不一致的顏色
<Button className="bg-blue-500">確認</Button>
```

### 正確範例
```typescript
// ✅ 正確：使用統一圖示組件
<Button className="bg-green-600 hover:bg-green-700 text-white">
  <CheckIcon size="sm" />
</Button>
```

## 💡 最佳實踐

### 圖示選擇原則
1. **語義明確**: 圖示含義要清楚易懂
2. **視覺一致**: 同類操作使用相同圖示
3. **尺寸適當**: 根據使用場景選擇合適尺寸
4. **顏色合理**: 根據操作類型選擇對應顏色

### 按鈕設計原則
1. **功能明確**: 按鈕用途要清楚
2. **視覺層次**: 重要操作使用醒目顏色
3. **狀態反饋**: 提供懸停和點擊反饋
4. **無障礙**: 確保足夠的對比度和可點擊區域

## 🔧 維護與更新

### 圖示組件更新流程
1. **評估需求**: 確認是否需要新圖示
2. **設計規範**: 遵循現有設計標準
3. **組件實作**: 在 Icons.tsx 中添加
4. **文檔更新**: 更新此規範文檔
5. **全域檢查**: 確保一致性應用

### 定期檢查項目
- [ ] 所有圖示是否符合最新規範
- [ ] 顏色使用是否一致
- [ ] 尺寸設定是否標準
- [ ] 動畫效果是否統一

---

**記住：UI 的一致性是用戶體驗的基礎！每個圖示和按鈕都代表品牌形象！**