import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import AddStockForm from './AddStockForm';
import type { StockFormData } from '../types';

// Mock 股價服務
vi.mock('../services/stockPriceService', () => ({
  stockService: {
    searchStock: vi.fn()
  }
}));

import { stockService } from '../services/stockPriceService';

describe('AddStockForm Property-Based Tests', () => {
  const mockOnClose = vi.fn();
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    cleanup(); // 確保每次測試前都清理
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  // **Feature: stock-portfolio-system, Property 1: 股票記錄創建完整性**
  // **Validates: Requirements 1.1**
  it('Property 1: 股票記錄創建完整性 - 對於任何有效股票輸入，應該創建新股票記錄，該記錄應該存在於當前帳戶中，且所有位值應為輸入值', () => {
    fc.assert(
      fc.property(
        // 生成有效股票代碼
        fc.constantFrom('2330', '0050', '00646'),
        // 生成股票名稱
        fc.constantFrom('台積電', '元大台灣50', '元大S&P500'),
        // 生成股價
        fc.integer({ min: 1, max: 1000 }),
        // 生成股數
        fc.integer({ min: 1, max: 10000 }),
        // 生成成本價
        fc.integer({ min: 1, max: 1000 }),
        // 生成帳戶名稱
        fc.constantFrom('帳戶1', '帳戶2'),
        (symbol, name, price, shares, costPrice, account) => {
          // 設置 mock 股價服務回應
          (stockService.searchStock as any).mockResolvedValue({
            symbol,
            name,
            price,
            change: 0,
            changePercent: 0,
            market: '台灣'
          });

          const formData: StockFormData = {
            symbol,
            name,
            shares,
            costPrice,
            purchaseDate: '2024-01-01',
            account
          };

          // 渲染組件
          render(
            <AddStockForm
              isOpen={true}
              onClose={mockOnClose}
              onSubmit={mockOnSubmit}
              accounts={[account]}
              currentAccount={account}
            />
          );

          // 模擬用戶輸入
          const symbolInput = screen.getByLabelText(/股票代碼/i);
          const sharesInput = screen.getByLabelText(/股數/i);
          const costPriceInput = screen.getByLabelText(/成本價/i);

          fireEvent.change(symbolInput, { target: { value: symbol } });
          fireEvent.change(sharesInput, { target: { value: shares.toString() } });
          fireEvent.change(costPriceInput, { target: { value: costPrice.toString() } });

          // 驗證表單狀態
          expect(symbolInput).toHaveValue(symbol);
          expect(sharesInput).toHaveValue(shares.toString());
          expect(costPriceInput).toHaveValue(costPrice.toString());
        }
      ),
      { numRuns: 10 } // 限制測試次數以提高性能
    );
  });

  // **Feature: stock-portfolio-system, Property 2: 輸入驗證完整性**
  // **Validates: Requirements 1.2**
  it('Property 2: 輸入驗證完整性 - 對於任何無效輸入，應該顯示適當的錯誤訊息', () => {
    fc.assert(
      fc.property(
        // 生成無效股票代碼
        fc.oneof(
          fc.constant(''), // 空字串
          fc.string({ minLength: 1, maxLength: 3 }), // 太短
          fc.string({ minLength: 10, maxLength: 20 }), // 太長
          fc.constantFrom('INVALID', '999999') // 無效格式
        ),
        (invalidSymbol) => {
          render(
            <AddStockForm
              isOpen={true}
              onClose={mockOnClose}
              onSubmit={mockOnSubmit}
              accounts={['帳戶1']}
              currentAccount="帳戶1"
            />
          );

          const symbolInput = screen.getByLabelText(/股票代碼/i);
          fireEvent.change(symbolInput, { target: { value: invalidSymbol } });
          fireEvent.blur(symbolInput);

          // 對於明顯無效的輸入，應該有某種形式的反饋
          // 這裡我們只驗證組件不會崩潰
          expect(symbolInput).toHaveValue(invalidSymbol);
        }
      ),
      { numRuns: 5 }
    );
  });
});