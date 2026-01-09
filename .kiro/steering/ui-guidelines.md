---
inclusion: always
---

# UI設計指南

## 設計原則

### 1. 深色主題優先
- 採用專業的深色主題設計
- 適合長時間使用，減少眼部疲勞
- 符合現代金融應用程式的視覺風格

### 2. 滿版面設計
- 主內容區域始終佔滿整個視窗
- 最大化資訊顯示空間
- 側邊選單採用覆蓋式設計，不擠壓主內容

### 3. 響應式設計
- 支援桌面和行動裝置
- 使用 Tailwind CSS 響應式斷點
- 觸控友善的按鈕尺寸和間距

## 色彩系統

### 主要色彩

```css
/* 背景色 */
--bg-primary: #0f172a;      /* slate-900 - 主背景 */
--bg-secondary: #1e293b;    /* slate-800 - 卡片背景 */
--bg-tertiary: #334155;     /* slate-700 - 懸停背景 */

/* 文字色 */
--text-primary: #ffffff;    /* white - 主要文字 */
--text-secondary: #cbd5e1;  /* slate-300 - 次要文字 */
--text-tertiary: #94a3b8;   /* slate-400 - 輔助文字 */
--text-muted: #64748b;      /* slate-500 - 淡化文字 */

/* 邊框色 */
--border-primary: #334155;  /* slate-700 - 主要邊框 */

/* 強調色 */
--accent-success: #4ade80;  /* green-400 - 成功/獲利 */
--accent-primary: #60a5fa;  /* blue-400 - 主要操作 */
```

### 色彩使用規範

**背景色使用**：
- `bg-slate-900`：主要背景色
- `bg-slate-800`：卡片、側邊欄背景
- `bg-slate-700`：懸停狀態背景

**文字色使用**：
- `text-white`：標題、重要數值
- `text-slate-300`：一般內容文字
- `text-slate-400`：標籤、說明文字
- `text-slate-500`：版本號、次要資訊

**強調色使用**：
- `text-green-400`：獲利、正值顯示
- `text-blue-400`：連結、主要操作按鈕

## 間距系統

### 標準間距

```css
/* Tailwind 間距對應 */
--spacing-1: 0.25rem;   /* 4px */
--spacing-2: 0.5rem;    /* 8px */
--spacing-3: 0.75rem;   /* 12px */
--spacing-4: 1rem;      /* 16px */
--spacing-6: 1.5rem;    /* 24px */
--spacing-8: 2rem;      /* 32px */
```

### 間距使用規範

- **元件內邊距**：`p-4` (16px) 或 `p-6` (24px)
- **元件間距**：`space-y-4` (16px) 或 `gap-4` (16px)
- **按鈕內邊距**：`px-4 py-2` (水平16px，垂直8px)
- **卡片內邊距**：`p-6` (24px)

## 字體系統

### 字體大小

```css
--text-xs: 0.75rem;     /* 12px - 表頭、標籤 */
--text-sm: 0.875rem;    /* 14px - 次要文字、版本號 */
--text-base: 1rem;      /* 16px - 一般文字 */
--text-lg: 1.125rem;    /* 18px - 選單標題 */
--text-xl: 1.25rem;     /* 20px - 頁面標題 */
--text-2xl: 1.5rem;     /* 24px - 統計數值 */
```

### 字重使用

- `font-medium`：標籤、次要標題
- `font-semibold`：選單標題
- `font-bold`：主標題、重要數值

## 元件設計規範

### 按鈕設計

**基礎按鈕**：
```tsx
<Button
  variant="ghost"
  size="sm"
  className="text-white hover:bg-slate-700"
>
  按鈕文字
</Button>
```

**尺寸規範**：
- `size="sm"`：高度32px，適用於工具列按鈕
- `size="md"`：高度40px，適用於一般按鈕
- `size="lg"`：高度48px，適用於主要操作按鈕

### 卡片設計

**統計卡片**：
```tsx
<div className="bg-slate-800 border border-slate-700 p-6 rounded-lg">
  <h3 className="text-sm font-medium text-slate-400 mb-2">標題</h3>
  <p className="text-2xl font-bold text-white">數值</p>
</div>
```

### 表格設計

**表格結構**：
```tsx
<table className="min-w-full divide-y divide-slate-700">
  <thead className="bg-slate-900">
    <tr>
      <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
        欄位標題
      </th>
    </tr>
  </thead>
  <tbody className="bg-slate-800 divide-y divide-slate-700">
    <tr>
      <td className="px-6 py-4 text-slate-300">內容</td>
    </tr>
  </tbody>
</table>
```

## 互動設計規範

### 懸停效果

- **按鈕懸停**：`hover:bg-slate-700`
- **連結懸停**：`hover:text-slate-300`
- **卡片懸停**：可選擇性添加 `hover:bg-slate-700`

### 過渡動畫

- **標準過渡**：`transition-colors duration-200`
- **滑動動畫**：`transition-transform duration-300 ease-in-out`
- **透明度變化**：`transition-opacity duration-200`

### 焦點狀態

- **鍵盤焦點**：`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`
- **焦點顏色**：使用藍色 (`ring-blue-500`)

## 響應式設計規範

### 斷點定義

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      screens: {
        'mobile': {'max': '767px'},
        'desktop': '768px',
      },
    },
  },
}
```

### 響應式使用

- **網格佈局**：`grid-cols-1 md:grid-cols-2 lg:grid-cols-4`
- **隱藏/顯示**：`hidden desktop:block` 或 `desktop:hidden`
- **間距調整**：`p-4 desktop:p-6`

## 無障礙設計

### ARIA 標籤

- 所有按鈕必須有 `aria-label`
- 表格必須有適當的表頭標籤
- 模態框必須有 `role="dialog"`

### 鍵盤導航

- 支援 Tab 鍵導航
- 支援 ESC 鍵關閉模態框和選單
- 支援 Enter 和 Space 鍵觸發按鈕

### 色彩對比

- 確保文字與背景的對比度符合 WCAG 2.1 AA 標準
- 主要文字對比度至少 4.5:1
- 大文字對比度至少 3:1

## 開發規範

### 類別命名

- 使用 Tailwind CSS 原子類別
- 避免自定義 CSS，優先使用 Tailwind 類別
- 複雜樣式可使用 `@apply` 指令

### 元件結構

```tsx
// 標準元件結構
interface ComponentProps {
  // 定義 props 介面
}

const Component: React.FC<ComponentProps> = ({ ...props }) => {
  return (
    <div className="基礎樣式類別">
      {/* 元件內容 */}
    </div>
  );
};

export default Component;
```

### 樣式一致性

- 使用設計系統中定義的色彩和間距
- 保持元件間的視覺一致性
- 遵循既定的設計模式