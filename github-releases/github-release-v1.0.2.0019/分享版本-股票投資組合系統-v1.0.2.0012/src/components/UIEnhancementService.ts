// UI 增強服務 - 安全的疊加式改進
export class UIEnhancementService {
  
  /**
   * 檢查並修復股票名稱顯示問題
   */
  static fixStockNameDisplay(stock: any): string {
    // 安全檢查：確保股票名稱不為空
    if (!stock.name || stock.name.trim() === '') {
      // 回退方案：使用股票代碼
      return stock.symbol || '未知股票';
    }
    
    // 檢查名稱長度，過長時截斷
    if (stock.name.length > 30) {
      return stock.name.substring(0, 27) + '...';
    }
    
    return stock.name;
  }
  
  /**
   * 格式化數字顯示
   */
  static formatNumber(value: number | undefined | null, decimals: number = 2): string {
    if (value === undefined || value === null || isNaN(value)) {
      return '--';
    }
    
    return value.toLocaleString('zh-TW', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }
  
  /**
   * 格式化百分比顯示
   */
  static formatPercentage(value: number | undefined | null): string {
    if (value === undefined || value === null || isNaN(value)) {
      return '--';
    }
    
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  }
  
  /**
   * 獲取損益顏色類別
   */
  static getGainLossColor(value: number | undefined | null): string {
    if (value === undefined || value === null || isNaN(value)) {
      return 'text-slate-400';
    }
    
    if (value > 0) return 'text-green-400';
    if (value < 0) return 'text-red-400';
    return 'text-slate-300';
  }
  
  /**
   * 檢查資料完整性
   */
  static validateStockData(stock: any): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    if (!stock.symbol) issues.push('缺少股票代碼');
    if (!stock.name || stock.name.trim() === '') issues.push('缺少股票名稱');
    if (stock.shares === undefined || stock.shares === null) issues.push('缺少持股數');
    if (stock.costPrice === undefined || stock.costPrice === null) issues.push('缺少成本價');
    if (stock.currentPrice === undefined || stock.currentPrice === null) issues.push('缺少現價');
    
    return {
      isValid: issues.length === 0,
      issues
    };
  }
  
  /**
   * 生成狀態指示器
   */
  static getStatusIndicator(status: 'success' | 'warning' | 'error' | 'info'): string {
    const indicators = {
      success: '✅',
      warning: '⚠️',
      error: '❌',
      info: 'ℹ️'
    };
    
    return indicators[status] || 'ℹ️';
  }
}

export default UIEnhancementService;