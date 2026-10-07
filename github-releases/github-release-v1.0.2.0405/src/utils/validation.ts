// 資料驗證函數

import { StockRecord, Account, DividendRecord, ValidationError } from '../types';

// 驗證股票記錄
export function validateStockRecord(stock: Partial<StockRecord>): ValidationError[] {
  const errors: ValidationError[] = [];

  // 驗證股票代碼
  if (!stock.symbol || !stock.symbol.trim()) {
    errors.push({
      field: 'symbol',
      message: '請輸入股票代碼',
      code: 'REQUIRED'
    });
  } else if (!isValidStockSymbol(stock.symbol)) {
    errors.push({
      field: 'symbol',
      message: '股票代碼格式錯誤（支援格式：2330、0050、00646、00679B等）',
      code: 'INVALID_FORMAT'
    });
  }

  // 驗證股票名稱
  if (!stock.name || !stock.name.trim()) {
    errors.push({
      field: 'name',
      message: '請輸入股票名稱',
      code: 'REQUIRED'
    });
  } else if (stock.name.trim().length > 50) {
    errors.push({
      field: 'name',
      message: '股票名稱不能超過50個字元',
      code: 'TOO_LONG'
    });
  }

  // 驗證持股數
  if (stock.shares === undefined || stock.shares === null) {
    errors.push({
      field: 'shares',
      message: '請輸入持股數',
      code: 'REQUIRED'
    });
  } else if (!Number.isInteger(stock.shares) || stock.shares <= 0) {
    errors.push({
      field: 'shares',
      message: '持股數必須為正整數',
      code: 'INVALID_VALUE'
    });
  }

  // 驗證成本價
  if (stock.costPrice === undefined || stock.costPrice === null) {
    errors.push({
      field: 'costPrice',
      message: '請輸入成本價',
      code: 'REQUIRED'
    });
  } else if (isNaN(stock.costPrice) || stock.costPrice <= 0 || !isFinite(stock.costPrice)) {
    errors.push({
      field: 'costPrice',
      message: '成本價必須為正數',
      code: 'INVALID_VALUE'
    });
  }

  // 驗證購買日期
  if (!stock.purchaseDate) {
    errors.push({
      field: 'purchaseDate',
      message: '請選擇購買日期',
      code: 'REQUIRED'
    });
  } else {
    const purchaseDate = new Date(stock.purchaseDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // 設定為今天結束
    
    if (purchaseDate > today) {
      errors.push({
        field: 'purchaseDate',
        message: '購買日期不能晚於今日',
        code: 'INVALID_DATE'
      });
    }
  }

  // 驗證帳戶ID
  if (!stock.accountId || !stock.accountId.trim()) {
    errors.push({
      field: 'accountId',
      message: '請選擇帳戶',
      code: 'REQUIRED'
    });
  }

  return errors;
}

// 驗證帳戶
export function validateAccount(account: Partial<Account>, existingAccounts: Account[] = []): ValidationError[] {
  const errors: ValidationError[] = [];

  // 驗證帳戶名稱
  if (!account.name || !account.name.trim()) {
    errors.push({
      field: 'name',
      message: '請輸入帳戶名稱',
      code: 'REQUIRED'
    });
  } else {
    const trimmedName = account.name.trim();
    
    if (trimmedName.length > 30) {
      errors.push({
        field: 'name',
        message: '帳戶名稱不能超過30個字元',
        code: 'TOO_LONG'
      });
    }

    // 檢查名稱是否重複（排除自己）
    const isDuplicate = existingAccounts.some(existing => 
      existing.id !== account.id && existing.name.trim() === trimmedName
    );
    
    if (isDuplicate) {
      errors.push({
        field: 'name',
        message: '帳戶名稱已存在',
        code: 'DUPLICATE'
      });
    }
  }

  return errors;
}

// 驗證股息記錄
export function validateDividend(dividend: Partial<DividendRecord>): ValidationError[] {
  const errors: ValidationError[] = [];

  // 驗證股票ID
  if (!dividend.stockId || !dividend.stockId.trim()) {
    errors.push({
      field: 'stockId',
      message: '請選擇股票',
      code: 'REQUIRED'
    });
  }

  // 驗證股票代碼
  if (!dividend.symbol || !dividend.symbol.trim()) {
    errors.push({
      field: 'symbol',
      message: '請輸入股票代碼',
      code: 'REQUIRED'
    });
  }

  // 驗證除息日期
  if (!dividend.exDividendDate) {
    errors.push({
      field: 'exDividendDate',
      message: '請選擇除息日期',
      code: 'REQUIRED'
    });
  } else {
    const exDate = new Date(dividend.exDividendDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    if (exDate > today) {
      errors.push({
        field: 'exDividendDate',
        message: '除息日期不能晚於今日',
        code: 'INVALID_DATE'
      });
    }
  }

  // 驗證每股股息
  if (dividend.dividendPerShare === undefined || dividend.dividendPerShare === null) {
    errors.push({
      field: 'dividendPerShare',
      message: '請輸入每股股息',
      code: 'REQUIRED'
    });
  } else if (isNaN(dividend.dividendPerShare) || dividend.dividendPerShare <= 0) {
    errors.push({
      field: 'dividendPerShare',
      message: '每股股息必須為正數',
      code: 'INVALID_VALUE'
    });
  }

  // 驗證持股數
  if (dividend.shares === undefined || dividend.shares === null) {
    errors.push({
      field: 'shares',
      message: '請輸入持股數',
      code: 'REQUIRED'
    });
  } else if (!Number.isInteger(dividend.shares) || dividend.shares <= 0) {
    errors.push({
      field: 'shares',
      message: '持股數必須為正整數',
      code: 'INVALID_VALUE'
    });
  }

  return errors;
}

// 驗證股票代碼格式
export function isValidStockSymbol(symbol: string): boolean {
  const upperSymbol = symbol.trim().toUpperCase();
  
  // 4位數字，可選1個字母
  if (/^\d{4}[A-Z]?$/.test(upperSymbol)) {
    // 如果有字母，必須是特定的有效字母
    if (upperSymbol.length === 5) {
      const letter = upperSymbol[4];
      return ['A', 'B', 'C', 'P', 'U', 'L', 'R', 'F', 'T'].includes(letter);
    }
    return true;
  }
  
  // 00開頭的ETF格式：00646 或 00679B 或 00981A
  if (/^00\d{3}[A-Z]?$/.test(upperSymbol)) {
    // 如果有字母，必須是特定的有效字母
    if (upperSymbol.length === 6) {
      const letter = upperSymbol[5];
      return ['A', 'B', 'C', 'L', 'U', 'P'].includes(letter);
    }
    return true;
  }
  
  return false;
}

// 驗證電子郵件格式
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// 驗證日期範圍
export function isValidDateRange(startDate: Date, endDate: Date): boolean {
  return startDate <= endDate;
}

// 驗證數字範圍
export function isValidNumberRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

// 格式化驗證錯誤訊息
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) return '';
  
  return errors.map(error => error.message).join('\n');
}

// 檢查是否有特定欄位的錯誤
export function hasFieldError(errors: ValidationError[], field: string): boolean {
  return errors.some(error => error.field === field);
}

// 取得特定欄位的錯誤訊息
export function getFieldError(errors: ValidationError[], field: string): string | undefined {
  const error = errors.find(error => error.field === field);
  return error?.message;
}