// 資料模型屬性測試

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { StockRecord } from '../types';
import { validateStockRecord, validateAccount, validateDividend } from './validation';
import { generateId } from './generators';

// **Feature: stock-portfolio-system, Property 1: 股票記錄創建完整性**
describe('Property 1: 股票記錄創建完整性', () => {
  // 定義有效股票輸入資料的生成器
  const validStockInputArbitrary = fc.record({
    symbol: fc.oneof(
      // 4位數字
      fc.integer({ min: 1000, max: 9999 }).map(n => n.toString()),
      // 4位數字+有效字母
      fc.record({
        digits: fc.integer({ min: 1000, max: 9999 }),
        letter: fc.constantFrom('A', 'B', 'C', 'P', 'U', 'L', 'R', 'F', 'T')
      }).map(({ digits, letter }) => `${digits}${letter}`),
      // ETF格式：00 + 3位數字
      fc.integer({ min: 100, max: 999 }).map(n => `00${n}`),
      // ETF格式：00 + 3位數字 + 字母
      fc.record({
        digits: fc.integer({ min: 100, max: 999 }),
        letter: fc.constantFrom('A', 'B', 'C', 'L', 'U', 'P')
      }).map(({ digits, letter }) => `00${digits}${letter}`)
    ),
    name: fc.string({ minLength: 1, maxLength: 50 })
      .filter(s => s.trim().length > 0),
    shares: fc.integer({ min: 1, max: 1000000 }),
    costPrice: fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true, noDefaultInfinity: true })
      .map(n => Math.round(n * 100) / 100),
    purchaseDate: fc.date({ 
      min: new Date(2000, 0, 1), 
      max: new Date() 
    }),
    accountId: fc.string({ minLength: 1, maxLength: 50 })
      .filter(s => s.trim().length > 0)
  });

  it('對於任何有效的股票輸入資料，創建股票記錄時所有欄位值應與輸入一致', () => {
    fc.assert(
      fc.property(
        validStockInputArbitrary,
        (stockInput) => {
          // 創建完整的股票記錄
          const stockRecord: StockRecord = {
            id: generateId(),
            accountId: stockInput.accountId,
            symbol: stockInput.symbol,
            name: stockInput.name,
            shares: stockInput.shares,
            costPrice: stockInput.costPrice,
            adjustedCostPrice: stockInput.costPrice, // 初始時等於成本價
            purchaseDate: stockInput.purchaseDate,
            currentPrice: stockInput.costPrice, // 初始時等於成本價
            lastUpdated: new Date(),
            priceSource: 'TWSE'
          };

          // 驗證記錄創建的完整性
          expect(stockRecord.symbol).toBe(stockInput.symbol);
          expect(stockRecord.name).toBe(stockInput.name);
          expect(stockRecord.shares).toBe(stockInput.shares);
          expect(stockRecord.costPrice).toBe(stockInput.costPrice);
          expect(stockRecord.purchaseDate).toEqual(stockInput.purchaseDate);
          expect(stockRecord.accountId).toBe(stockInput.accountId);
          
          // 驗證必要欄位存在
          expect(stockRecord.id).toBeDefined();
          expect(stockRecord.id.length).toBeGreaterThan(0);
          expect(stockRecord.adjustedCostPrice).toBe(stockRecord.costPrice);
          expect(stockRecord.currentPrice).toBeDefined();
          expect(stockRecord.lastUpdated).toBeInstanceOf(Date);
          expect(stockRecord.priceSource).toBeDefined();

          // 驗證資料通過驗證函數
          const validationErrors = validateStockRecord(stockRecord);
          expect(validationErrors).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('對於任何有效的股票輸入資料，驗證函數應該返回無錯誤', () => {
    fc.assert(
      fc.property(
        validStockInputArbitrary,
        (stockInput) => {
          // 使用驗證函數檢查輸入資料
          const validationErrors = validateStockRecord(stockInput);
          
          // 有效輸入應該通過驗證
          expect(validationErrors).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('股票記錄的所有必要欄位都應該有值', () => {
    fc.assert(
      fc.property(
        validStockInputArbitrary,
        (stockInput) => {
          const stockRecord: StockRecord = {
            id: generateId(),
            accountId: stockInput.accountId,
            symbol: stockInput.symbol,
            name: stockInput.name,
            shares: stockInput.shares,
            costPrice: stockInput.costPrice,
            adjustedCostPrice: stockInput.costPrice,
            purchaseDate: stockInput.purchaseDate,
            currentPrice: stockInput.costPrice,
            lastUpdated: new Date(),
            priceSource: 'TWSE'
          };

          // 檢查所有必要欄位都有值
          expect(stockRecord.id).toBeTruthy();
          expect(stockRecord.accountId).toBeTruthy();
          expect(stockRecord.symbol).toBeTruthy();
          expect(stockRecord.name).toBeTruthy();
          expect(stockRecord.shares).toBeGreaterThan(0);
          expect(stockRecord.costPrice).toBeGreaterThan(0);
          expect(stockRecord.adjustedCostPrice).toBeGreaterThan(0);
          expect(stockRecord.purchaseDate).toBeInstanceOf(Date);
          expect(stockRecord.currentPrice).toBeGreaterThan(0);
          expect(stockRecord.lastUpdated).toBeInstanceOf(Date);
          expect(['TWSE', 'Yahoo', 'Investing']).toContain(stockRecord.priceSource);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// 資料驗證單元測試 - 測試無效輸入的拒絕和邊界值
describe('資料驗證單元測試', () => {
  
  describe('股票記錄驗證 - 無效輸入拒絕測試', () => {
    
    it('應該拒絕空的股票代碼', () => {
      const stockInput = {
        symbol: '',
        name: '測試股票',
        shares: 100,
        costPrice: 50.0,
        purchaseDate: new Date(),
        accountId: 'test-account'
      };
      
      const errors = validateStockRecord(stockInput);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.field === 'symbol' && e.code === 'REQUIRED')).toBe(true);
    });

    it('應該拒絕只有空格的股票代碼', () => {
      const stockInput = {
        symbol: '   ',
        name: '測試股票',
        shares: 100,
        costPrice: 50.0,
        purchaseDate: new Date(),
        accountId: 'test-account'
      };
      
      const errors = validateStockRecord(stockInput);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.field === 'symbol' && e.code === 'REQUIRED')).toBe(true);
    });

    it('應該拒絕無效格式的股票代碼', () => {
      const invalidSymbols = [
        '123',      // 太短
        'ABCD',     // 全字母
        '12345',    // 5位數字但不是00開頭
        'ABCDEFG',  // 太長
        '12AB!',    // 包含特殊字元
        'ab@12',    // 包含特殊字元和小寫
        '1234X',    // 4位數字+無效字母
        '00123X',   // ETF格式但字母無效
        '1234Z',    // 無效字母
        '00123Z'    // ETF無效字母
      ];
      
      invalidSymbols.forEach(symbol => {
        const stockInput = {
          symbol,
          name: '測試股票',
          shares: 100,
          costPrice: 50.0,
          purchaseDate: new Date(),
          accountId: 'test-account'
        };
        
        const errors = validateStockRecord(stockInput);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(e => e.field === 'symbol' && e.code === 'INVALID_FORMAT')).toBe(true);
      });
    });

    it('應該拒絕空的股票名稱', () => {
      const stockInput = {
        symbol: '2330',
        name: '',
        shares: 100,
        costPrice: 50.0,
        purchaseDate: new Date(),
        accountId: 'test-account'
      };
      
      const errors = validateStockRecord(stockInput);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.field === 'name' && e.code === 'REQUIRED')).toBe(true);
    });

    it('應該拒絕只有空格的股票名稱', () => {
      const stockInput = {
        symbol: '2330',
        name: '   ',
        shares: 100,
        costPrice: 50.0,
        purchaseDate: new Date(),
        accountId: 'test-account'
      };
      
      const errors = validateStockRecord(stockInput);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.field === 'name' && e.code === 'REQUIRED')).toBe(true);
    });

    it('應該拒絕超過50字元的股票名稱', () => {
      const longName = 'A'.repeat(51); // 51個字元
      const stockInput = {
        symbol: '2330',
        name: longName,
        shares: 100,
        costPrice: 50.0,
        purchaseDate: new Date(),
        accountId: 'test-account'
      };
      
      const errors = validateStockRecord(stockInput);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.field === 'name' && e.code === 'TOO_LONG')).toBe(true);
    });

    it('應該拒絕負數持股數', () => {
      const stockInput = {
        symbol: '2330',
        name: '台積電',
        shares: -1,
        costPrice: 50.0,
        purchaseDate: new Date(),
        accountId: 'test-account'
      };
      
      const errors = validateStockRecord(stockInput);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.field === 'shares' && e.code === 'INVALID_VALUE')).toBe(true);
    });

    it('應該拒絕零持股數', () => {
      const stockInput = {
        symbol: '2330',
        name: '台積電',
        shares: 0,
        costPrice: 50.0,
        purchaseDate: new Date(),
        accountId: 'test-account'
      };
      
      const errors = validateStockRecord(stockInput);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.field === 'shares' && e.code === 'INVALID_VALUE')).toBe(true);
    });

    it('應該拒絕小數持股數', () => {
      const stockInput = {
        symbol: '2330',
        name: '台積電',
        shares: 1.5,
        costPrice: 50.0,
        purchaseDate: new Date(),
        accountId: 'test-account'
      };
      
      const errors = validateStockRecord(stockInput);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.field === 'shares' && e.code === 'INVALID_VALUE')).toBe(true);
    });

    it('應該拒絕NaN持股數', () => {
      const stockInput = {
        symbol: '2330',
        name: '台積電',
        shares: NaN,
        costPrice: 50.0,
        purchaseDate: new Date(),
        accountId: 'test-account'
      };
      
      const errors = validateStockRecord(stockInput);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.field === 'shares' && e.code === 'INVALID_VALUE')).toBe(true);
    });

    it('應該拒絕負數成本價', () => {
      const stockInput = {
        symbol: '2330',
        name: '台積電',
        shares: 100,
        costPrice: -1,
        purchaseDate: new Date(),
        accountId: 'test-account'
      };
      
      const errors = validateStockRecord(stockInput);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.field === 'costPrice' && e.code === 'INVALID_VALUE')).toBe(true);
    });

    it('應該拒絕零成本價', () => {
      const stockInput = {
        symbol: '2330',
        name: '台積電',
        shares: 100,
        costPrice: 0,
        purchaseDate: new Date(),
        accountId: 'test-account'
      };
      
      const errors = validateStockRecord(stockInput);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.field === 'costPrice' && e.code === 'INVALID_VALUE')).toBe(true);
    });

    it('應該拒絕NaN成本價', () => {
      const stockInput = {
        symbol: '2330',
        name: '台積電',
        shares: 100,
        costPrice: NaN,
        purchaseDate: new Date(),
        accountId: 'test-account'
      };
      
      const errors = validateStockRecord(stockInput);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.field === 'costPrice' && e.code === 'INVALID_VALUE')).toBe(true);
    });

    it('應該拒絕Infinity成本價', () => {
      const stockInput = {
        symbol: '2330',
        name: '台積電',
        shares: 100,
        costPrice: Infinity,
        purchaseDate: new Date(),
        accountId: 'test-account'
      };
      
      const errors = validateStockRecord(stockInput);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.field === 'costPrice' && e.code === 'INVALID_VALUE')).toBe(true);
    });

    it('應該拒絕未來的購買日期', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      
      const stockInput = {
        symbol: '2330',
        name: '台積電',
        shares: 100,
        costPrice: 50.0,
        purchaseDate: futureDate,
        accountId: 'test-account'
      };
      
      const errors = validateStockRecord(stockInput);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.field === 'purchaseDate' && e.code === 'INVALID_DATE')).toBe(true);
    });

    it('應該拒絕空的帳戶ID', () => {
      const stockInput = {
        symbol: '2330',
        name: '台積電',
        shares: 100,
        costPrice: 50.0,
        purchaseDate: new Date(),
        accountId: ''
      };
      
      const errors = validateStockRecord(stockInput);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.field === 'accountId' && e.code === 'REQUIRED')).toBe(true);
    });

    it('應該拒絕只有空格的帳戶ID', () => {
      const stockInput = {
        symbol: '2330',
        name: '台積電',
        shares: 100,
        costPrice: 50.0,
        purchaseDate: new Date(),
        accountId: '   '
      };
      
      const errors = validateStockRecord(stockInput);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.field === 'accountId' && e.code === 'REQUIRED')).toBe(true);
    });

    it('應該拒絕缺少必要欄位的輸入', () => {
      // 測試缺少各個必要欄位
      const incompleteInputs = [
        { name: '台積電', shares: 100, costPrice: 50.0, purchaseDate: new Date(), accountId: 'test' }, // 缺少symbol
        { symbol: '2330', shares: 100, costPrice: 50.0, purchaseDate: new Date(), accountId: 'test' }, // 缺少name
        { symbol: '2330', name: '台積電', costPrice: 50.0, purchaseDate: new Date(), accountId: 'test' }, // 缺少shares
        { symbol: '2330', name: '台積電', shares: 100, purchaseDate: new Date(), accountId: 'test' }, // 缺少costPrice
        { symbol: '2330', name: '台積電', shares: 100, costPrice: 50.0, accountId: 'test' }, // 缺少purchaseDate
        { symbol: '2330', name: '台積電', shares: 100, costPrice: 50.0, purchaseDate: new Date() } // 缺少accountId
      ];
      
      incompleteInputs.forEach(input => {
        const errors = validateStockRecord(input);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(e => e.code === 'REQUIRED')).toBe(true);
      });
    });
  });

  describe('股票記錄驗證 - 邊界值測試', () => {
    
    it('應該接受有效的股票代碼格式', () => {
      const validSymbols = [
        '2330',    // 4位數字
        '0050',    // 4位數字（以0開頭）
        '1234A',   // 4位數字+有效字母A
        '5678B',   // 4位數字+有效字母B
        '9999C',   // 4位數字+有效字母C
        '1111P',   // 4位數字+有效字母P
        '2222U',   // 4位數字+有效字母U
        '3333L',   // 4位數字+有效字母L
        '4444R',   // 4位數字+有效字母R
        '5555F',   // 4位數字+有效字母F
        '6666T',   // 4位數字+有效字母T
        '00646',   // ETF格式（5位數字）
        '00679B',  // ETF格式+字母B
        '00981A',  // ETF格式+字母A
        '00123C',  // ETF格式+字母C
        '00456L',  // ETF格式+字母L
        '00789U',  // ETF格式+字母U
        '00999P'   // ETF格式+字母P
      ];
      
      validSymbols.forEach(symbol => {
        const stockInput = {
          symbol,
          name: '測試股票',
          shares: 100,
          costPrice: 50.0,
          purchaseDate: new Date(),
          accountId: 'test-account'
        };
        
        const errors = validateStockRecord(stockInput);
        const symbolErrors = errors.filter(e => e.field === 'symbol');
        expect(symbolErrors).toHaveLength(0);
      });
    });

    it('應該接受邊界值的股票名稱長度', () => {
      // 測試1字元（最小值）
      const minName = 'A';
      const stockInputMin = {
        symbol: '2330',
        name: minName,
        shares: 100,
        costPrice: 50.0,
        purchaseDate: new Date(),
        accountId: 'test-account'
      };
      
      const errorsMin = validateStockRecord(stockInputMin);
      const nameErrorsMin = errorsMin.filter(e => e.field === 'name');
      expect(nameErrorsMin).toHaveLength(0);

      // 測試50字元（最大值）
      const maxName = 'A'.repeat(50);
      const stockInputMax = {
        symbol: '2330',
        name: maxName,
        shares: 100,
        costPrice: 50.0,
        purchaseDate: new Date(),
        accountId: 'test-account'
      };
      
      const errorsMax = validateStockRecord(stockInputMax);
      const nameErrorsMax = errorsMax.filter(e => e.field === 'name');
      expect(nameErrorsMax).toHaveLength(0);
    });

    it('應該接受邊界值的持股數', () => {
      // 測試最小值1
      const stockInputMin = {
        symbol: '2330',
        name: '台積電',
        shares: 1,
        costPrice: 50.0,
        purchaseDate: new Date(),
        accountId: 'test-account'
      };
      
      const errorsMin = validateStockRecord(stockInputMin);
      const sharesErrorsMin = errorsMin.filter(e => e.field === 'shares');
      expect(sharesErrorsMin).toHaveLength(0);

      // 測試大數值
      const stockInputMax = {
        symbol: '2330',
        name: '台積電',
        shares: 1000000,
        costPrice: 50.0,
        purchaseDate: new Date(),
        accountId: 'test-account'
      };
      
      const errorsMax = validateStockRecord(stockInputMax);
      const sharesErrorsMax = errorsMax.filter(e => e.field === 'shares');
      expect(sharesErrorsMax).toHaveLength(0);
    });

    it('應該接受邊界值的成本價', () => {
      // 測試最小正值
      const stockInputMin = {
        symbol: '2330',
        name: '台積電',
        shares: 100,
        costPrice: 0.01,
        purchaseDate: new Date(),
        accountId: 'test-account'
      };
      
      const errorsMin = validateStockRecord(stockInputMin);
      const priceErrorsMin = errorsMin.filter(e => e.field === 'costPrice');
      expect(priceErrorsMin).toHaveLength(0);

      // 測試大數值
      const stockInputMax = {
        symbol: '2330',
        name: '台積電',
        shares: 100,
        costPrice: 99999.99,
        purchaseDate: new Date(),
        accountId: 'test-account'
      };
      
      const errorsMax = validateStockRecord(stockInputMax);
      const priceErrorsMax = errorsMax.filter(e => e.field === 'costPrice');
      expect(priceErrorsMax).toHaveLength(0);
    });

    it('應該接受今天的購買日期', () => {
      const today = new Date();
      const stockInput = {
        symbol: '2330',
        name: '台積電',
        shares: 100,
        costPrice: 50.0,
        purchaseDate: today,
        accountId: 'test-account'
      };
      
      const errors = validateStockRecord(stockInput);
      const dateErrors = errors.filter(e => e.field === 'purchaseDate');
      expect(dateErrors).toHaveLength(0);
    });

    it('應該接受過去的購買日期', () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1); // 一年前
      
      const stockInput = {
        symbol: '2330',
        name: '台積電',
        shares: 100,
        costPrice: 50.0,
        purchaseDate: pastDate,
        accountId: 'test-account'
      };
      
      const errors = validateStockRecord(stockInput);
      const dateErrors = errors.filter(e => e.field === 'purchaseDate');
      expect(dateErrors).toHaveLength(0);
    });
  });

  describe('帳戶驗證測試', () => {
    
    it('應該拒絕空的帳戶名稱', () => {
      const account = { name: '' };
      const errors = validateAccount(account);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.field === 'name' && e.code === 'REQUIRED')).toBe(true);
    });

    it('應該拒絕只有空格的帳戶名稱', () => {
      const account = { name: '   ' };
      const errors = validateAccount(account);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.field === 'name' && e.code === 'REQUIRED')).toBe(true);
    });

    it('應該拒絕超過30字元的帳戶名稱', () => {
      const longName = 'A'.repeat(31); // 31個字元
      const account = { name: longName };
      const errors = validateAccount(account);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.field === 'name' && e.code === 'TOO_LONG')).toBe(true);
    });

    it('應該拒絕重複的帳戶名稱', () => {
      const existingAccounts = [
        { id: '1', name: '帳戶1', stockCount: 0 },
        { id: '2', name: '帳戶2', stockCount: 0 }
      ];
      
      const newAccount = { name: '帳戶1' }; // 重複名稱
      const errors = validateAccount(newAccount, existingAccounts);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.field === 'name' && e.code === 'DUPLICATE')).toBe(true);
    });

    it('應該接受邊界值的帳戶名稱長度', () => {
      // 測試1字元（最小值）
      const minName = 'A';
      const accountMin = { name: minName };
      const errorsMin = validateAccount(accountMin);
      const nameErrorsMin = errorsMin.filter(e => e.field === 'name');
      expect(nameErrorsMin).toHaveLength(0);

      // 測試30字元（最大值）
      const maxName = 'A'.repeat(30);
      const accountMax = { name: maxName };
      const errorsMax = validateAccount(accountMax);
      const nameErrorsMax = errorsMax.filter(e => e.field === 'name');
      expect(nameErrorsMax).toHaveLength(0);
    });

    it('應該允許編輯現有帳戶時使用相同名稱', () => {
      const existingAccounts = [
        { id: '1', name: '帳戶1', stockCount: 0 },
        { id: '2', name: '帳戶2', stockCount: 0 }
      ];
      
      // 編輯帳戶1，保持相同名稱
      const editedAccount = { id: '1', name: '帳戶1' };
      const errors = validateAccount(editedAccount, existingAccounts);
      const nameErrors = errors.filter(e => e.field === 'name' && e.code === 'DUPLICATE');
      expect(nameErrors).toHaveLength(0);
    });
  });

  describe('股息記錄驗證測試', () => {
    
    it('應該拒絕空的股票ID', () => {
      const dividend = {
        stockId: '',
        symbol: '2330',
        exDividendDate: new Date(),
        dividendPerShare: 2.5,
        shares: 100
      };
      
      const errors = validateDividend(dividend);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.field === 'stockId' && e.code === 'REQUIRED')).toBe(true);
    });

    it('應該拒絕負數的每股股息', () => {
      const dividend = {
        stockId: 'stock-1',
        symbol: '2330',
        exDividendDate: new Date(),
        dividendPerShare: -1,
        shares: 100
      };
      
      const errors = validateDividend(dividend);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.field === 'dividendPerShare' && e.code === 'INVALID_VALUE')).toBe(true);
    });

    it('應該拒絕零的每股股息', () => {
      const dividend = {
        stockId: 'stock-1',
        symbol: '2330',
        exDividendDate: new Date(),
        dividendPerShare: 0,
        shares: 100
      };
      
      const errors = validateDividend(dividend);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.field === 'dividendPerShare' && e.code === 'INVALID_VALUE')).toBe(true);
    });

    it('應該拒絕未來的除息日期', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      
      const dividend = {
        stockId: 'stock-1',
        symbol: '2330',
        exDividendDate: futureDate,
        dividendPerShare: 2.5,
        shares: 100
      };
      
      const errors = validateDividend(dividend);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.field === 'exDividendDate' && e.code === 'INVALID_DATE')).toBe(true);
    });

    it('應該接受邊界值的每股股息', () => {
      // 測試最小正值
      const dividendMin = {
        stockId: 'stock-1',
        symbol: '2330',
        exDividendDate: new Date(),
        dividendPerShare: 0.0001,
        shares: 100
      };
      
      const errorsMin = validateDividend(dividendMin);
      const dividendErrorsMin = errorsMin.filter(e => e.field === 'dividendPerShare');
      expect(dividendErrorsMin).toHaveLength(0);

      // 測試大數值
      const dividendMax = {
        stockId: 'stock-1',
        symbol: '2330',
        exDividendDate: new Date(),
        dividendPerShare: 999.9999,
        shares: 100
      };
      
      const errorsMax = validateDividend(dividendMax);
      const dividendErrorsMax = errorsMax.filter(e => e.field === 'dividendPerShare');
      expect(dividendErrorsMax).toHaveLength(0);
    });
  });
});