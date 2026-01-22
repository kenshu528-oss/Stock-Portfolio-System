// 統一的數據格式化工具
// 遵循 UI 設計標準規範

/**
 * 格式化貨幣數值
 * @param value 數值
 * @param decimals 小數位數（預設 0）
 * @returns 格式化後的字串（如：1,234,567.89 或 (87,683) 表示負數）
 */
export const formatCurrency = (value: number | string, decimals: number = 0): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '--';
  
  // 使用絕對值格式化
  const absNum = Math.abs(num);
  const formatted = new Intl.NumberFormat('zh-TW', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(absNum);
  
  // 負數使用括號表示（會計標準）
  return num < 0 ? `(${formatted})` : formatted;
};

/**
 * 格式化百分比
 * @param value 數值
 * @returns 格式化後的字串（如：+12.34%）
 */
export const formatPercent = (value: number): string => {
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
};

/**
 * 格式化股數
 * @param value 股數
 * @returns 格式化後的字串（如：1,000）
 */
export const formatShares = (value: number): string => {
  return formatCurrency(value, 0);
};

/**
 * 格式化日期
 * @param date 日期
 * @returns 格式化後的字串（如：2026-01-15）
 */
export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};
