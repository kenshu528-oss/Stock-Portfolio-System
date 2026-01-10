import type { Account, StockRecord, DividendRecord } from '../types';

// 匯出選項介面
export interface ExportOptions {
  format: 'json' | 'csv' | 'excel';
  accounts: string[];           // 選擇的帳戶ID
  dateRange?: {                 // 日期範圍
    start: Date;
    end: Date;
  };
  includeHistory: boolean;      // 包含購買歷史
  includeDividends: boolean;    // 包含股息記錄
  includeStats: boolean;        // 包含統計資訊
}

// 匯入結果介面
export interface ImportResult {
  success: boolean;
  accounts: Account[];
  stocks: StockRecord[];
  errors: string[];
  warnings: string[];
  summary: {
    accountsCount: number;
    stocksCount: number;
    dividendsCount: number;
  };
}

// 匯出資料結構
export interface ExportData {
  metadata: {
    version: string;
    exportDate: string;
    source: string;
    totalAccounts: number;
    totalStocks: number;
  };
  accounts: Account[];
  stocks: StockRecord[];
  dividends: DividendRecord[];
}

class ImportExportService {
  
  /**
   * 匯出資料為 JSON 格式
   */
  exportToJSON(
    accounts: Account[], 
    stocks: StockRecord[], 
    options: ExportOptions
  ): string {
    const filteredData = this.filterDataByOptions(accounts, stocks, options);
    
    const exportData: ExportData = {
      metadata: {
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        source: 'Stock Portfolio System',
        totalAccounts: filteredData.accounts.length,
        totalStocks: filteredData.stocks.length
      },
      accounts: filteredData.accounts,
      stocks: filteredData.stocks,
      dividends: filteredData.dividends
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * 匯出資料為 CSV 格式
   */
  exportToCSV(
    accounts: Account[], 
    stocks: StockRecord[], 
    options: ExportOptions
  ): string {
    const filteredData = this.filterDataByOptions(accounts, stocks, options);
    
    // CSV 標頭
    const headers = [
      '帳戶名稱',
      '股票代碼',
      '股票名稱',
      '持股數',
      '成本價',
      '調整成本價',
      '現價',
      '購買日期',
      '市值',
      '投入成本',
      '損益金額',
      '損益率(%)',
      '總股息',
      '最後更新'
    ];

    const rows = [headers.join(',')];

    // 資料列
    filteredData.stocks.forEach(stock => {
      const account = filteredData.accounts.find(acc => acc.id === stock.accountId);
      const marketValue = stock.shares * stock.currentPrice;
      const costBasis = stock.shares * (stock.adjustedCostPrice || stock.costPrice);
      const gainLoss = marketValue - costBasis;
      const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;
      const totalDividend = stock.dividendRecords?.reduce((sum, div) => sum + div.totalDividend, 0) || 0;

      const row = [
        account?.name || '',
        stock.symbol,
        stock.name,
        stock.shares.toString(),
        stock.costPrice.toFixed(2),
        (stock.adjustedCostPrice || stock.costPrice).toFixed(2),
        stock.currentPrice.toFixed(2),
        new Date(stock.purchaseDate).toLocaleDateString('zh-TW'),
        marketValue.toFixed(0),
        costBasis.toFixed(0),
        gainLoss.toFixed(0),
        gainLossPercent.toFixed(2),
        totalDividend.toFixed(0),
        new Date(stock.lastUpdated).toLocaleDateString('zh-TW')
      ];

      rows.push(row.join(','));
    });

    return rows.join('\n');
  }

  /**
   * 匯出購買記錄為 CSV 格式
   */
  exportPurchaseHistoryToCSV(
    accounts: Account[], 
    stocks: StockRecord[], 
    options: ExportOptions
  ): string {
    const filteredData = this.filterDataByOptions(accounts, stocks, options);
    
    const headers = [
      '帳戶名稱',
      '股票代碼',
      '股票名稱',
      '購買日期',
      '股數',
      '成本價',
      '投入金額',
      '現價',
      '現值',
      '損益金額',
      '損益率(%)'
    ];

    const rows = [headers.join(',')];

    filteredData.stocks.forEach(stock => {
      const account = filteredData.accounts.find(acc => acc.id === stock.accountId);
      
      // 如果有合併記錄，展開所有原始記錄
      const records = (stock as any).originalRecords || [stock];
      
      records.forEach((record: StockRecord) => {
        const investment = record.shares * record.costPrice;
        const currentValue = record.shares * stock.currentPrice;
        const gainLoss = currentValue - investment;
        const gainLossPercent = investment > 0 ? (gainLoss / investment) * 100 : 0;

        const row = [
          account?.name || '',
          record.symbol,
          record.name,
          new Date(record.purchaseDate).toLocaleDateString('zh-TW'),
          record.shares.toString(),
          record.costPrice.toFixed(2),
          investment.toFixed(0),
          stock.currentPrice.toFixed(2),
          currentValue.toFixed(0),
          gainLoss.toFixed(0),
          gainLossPercent.toFixed(2)
        ];

        rows.push(row.join(','));
      });
    });

    return rows.join('\n');
  }

  /**
   * 匯出股息記錄為 CSV 格式
   */
  exportDividendsToCSV(
    accounts: Account[], 
    stocks: StockRecord[], 
    options: ExportOptions
  ): string {
    const filteredData = this.filterDataByOptions(accounts, stocks, options);
    
    const headers = [
      '帳戶名稱',
      '股票代碼',
      '股票名稱',
      '除息日期',
      '每股股息',
      '持股數',
      '股息金額',
      '累計股息'
    ];

    const rows = [headers.join(',')];
    
    filteredData.stocks.forEach(stock => {
      const account = filteredData.accounts.find(acc => acc.id === stock.accountId);
      
      if (stock.dividendRecords && stock.dividendRecords.length > 0) {
        let cumulativeDividend = 0;
        
        stock.dividendRecords
          .sort((a, b) => a.exDividendDate.getTime() - b.exDividendDate.getTime())
          .forEach(dividend => {
            const dividendAmount = stock.shares * dividend.dividendPerShare;
            cumulativeDividend += dividendAmount;

            const row = [
              account?.name || '',
              stock.symbol,
              stock.name,
              new Date(dividend.exDividendDate).toLocaleDateString('zh-TW'),
              dividend.dividendPerShare.toFixed(2),
              stock.shares.toString(),
              dividendAmount.toFixed(0),
              cumulativeDividend.toFixed(0)
            ];

            rows.push(row.join(','));
          });
      }
    });

    return rows.join('\n');
  }

  /**
   * 驗證匯入檔案格式
   */
  validateImportFile(file: File): Promise<{ valid: boolean; errors: string[] }> {
    return new Promise((resolve) => {
      const errors: string[] = [];
      
      // 檢查檔案大小 (最大 10MB)
      if (file.size > 10 * 1024 * 1024) {
        errors.push('檔案大小超過 10MB 限制');
      }

      // 檢查檔案類型
      const allowedTypes = [
        'application/json',
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];

      if (!allowedTypes.includes(file.type) && !file.name.match(/\.(json|csv|xlsx?)$/i)) {
        errors.push('不支援的檔案格式，請使用 JSON、CSV 或 Excel 格式');
      }

      resolve({
        valid: errors.length === 0,
        errors
      });
    });
  }

  /**
   * 解析 JSON 匯入檔案
   */
  async parseJSONFile(file: File): Promise<ImportResult> {
    try {
      const text = await file.text();
      const data = JSON.parse(text) as ExportData;

      // 驗證資料結構
      if (!data.metadata || !data.accounts || !data.stocks) {
        throw new Error('無效的 JSON 檔案格式');
      }

      return {
        success: true,
        accounts: data.accounts,
        stocks: data.stocks,
        errors: [],
        warnings: [],
        summary: {
          accountsCount: data.accounts.length,
          stocksCount: data.stocks.length,
          dividendsCount: data.dividends?.length || 0
        }
      };
    } catch (error) {
      return {
        success: false,
        accounts: [],
        stocks: [],
        errors: [`JSON 解析失敗: ${error.message}`],
        warnings: [],
        summary: {
          accountsCount: 0,
          stocksCount: 0,
          dividendsCount: 0
        }
      };
    }
  }

  /**
   * 下載檔案
   */
  downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }

  /**
   * 根據選項篩選資料
   */
  private filterDataByOptions(
    accounts: Account[], 
    stocks: StockRecord[], 
    options: ExportOptions
  ) {
    // 篩選帳戶
    const filteredAccounts = options.accounts.length > 0 
      ? accounts.filter(acc => options.accounts.includes(acc.id))
      : accounts;

    // 篩選股票
    let filteredStocks = stocks.filter(stock => 
      filteredAccounts.some(acc => acc.id === stock.accountId)
    );

    // 日期範圍篩選
    if (options.dateRange) {
      filteredStocks = filteredStocks.filter(stock => {
        const purchaseDate = new Date(stock.purchaseDate);
        return purchaseDate >= options.dateRange!.start && 
               purchaseDate <= options.dateRange!.end;
      });
    }

    // 收集股息記錄
    const dividends: DividendRecord[] = [];
    if (options.includeDividends) {
      filteredStocks.forEach(stock => {
        if (stock.dividendRecords) {
          dividends.push(...stock.dividendRecords);
        }
      });
    }

    return {
      accounts: filteredAccounts,
      stocks: filteredStocks,
      dividends
    };
  }

  /**
   * 生成檔案名稱
   */
  generateFilename(format: string, prefix: string = 'portfolio'): string {
    const timestamp = new Date().toISOString().split('T')[0];
    return `${prefix}_${timestamp}.${format}`;
  }
}

export default new ImportExportService();