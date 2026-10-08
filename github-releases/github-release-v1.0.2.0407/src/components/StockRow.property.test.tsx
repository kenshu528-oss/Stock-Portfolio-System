import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import StockRow from './StockRow';
import type { StockRecord } from '../types';

// 生成器：股票記錄
const stockRecordArbitrary = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  accountId: fc.string({ minLength: 1, maxLength: 20 }),
  symbol: fc.string({ minLength: 4, maxLength: 6 }).filter(s => /^[A-Z0-9]+$/.test(s)),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  shares: fc.integer({ min: 1, max: 1000000 }),
  costPrice: fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true }).map(n => Math.round(n * 100) / 100),
  adjustedCostPrice: fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true }).map(n => Math.round(n * 100) / 100),
  purchaseDate: fc.date({ max: new Date() }),
  currentPrice: fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true }).map(n => Math.round(n * 100) / 100),
  lastUpdated: fc.date({ max: new Date() }),
  priceSource: fc.constantFrom('TWSE', 'Yahoo', 'Investing')
}) as fc.Arbitrary<StockRecord>;

describe('StockRow Delete Property-Based Tests', () => {
  const mockOnUpdateStock = vi.fn();
  const mockOnDeleteStock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * **Feature: stock-portfolio-system, Property 3: 刪除操作的不變性**
   * **Validates: Requirements 1.3**
   * 
   * 對於任何股票記錄，當執行刪除並確認後，該記錄不應再存在於帳戶的股票清單中
   */
  it('Property 3: 刪除操作的不變性', () => {
    fc.assert(
      fc.property(
        stockRecordArbitrary,
        (stock) => {
          // 渲染 StockRow 元件在表格結構中
          const { container } = render(
            <table>
              <tbody>
                <StockRow
                  stock={stock}
                  onUpdateStock={mockOnUpdateStock}
                  onDeleteStock={mockOnDeleteStock}
                  showDeleteConfirm={true}
                />
              </tbody>
            </table>
          );

          // 查找刪除按鈕
          const deleteButton = container.querySelector('button[title="刪除股票"]');
          expect(deleteButton).toBeTruthy();

          // 點擊刪除按鈕
          fireEvent.click(deleteButton!);

          // 應該顯示刪除確認對話框
          const dialogElements = screen.queryAllByText('確認刪除股票');
          expect(dialogElements.length).toBeGreaterThan(0);
          
          // 查找確定刪除按鈕
          const confirmButton = screen.getByText('確定刪除');
          expect(confirmButton).toBeInTheDocument();

          // 點擊確定刪除
          fireEvent.click(confirmButton);

          // 驗證 onDeleteStock 被調用且參數正確
          expect(mockOnDeleteStock).toHaveBeenCalledWith(stock.id);

          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * 測試不顯示確認對話框的直接刪除
   */
  it('Property 3c: 直接刪除模式', () => {
    fc.assert(
      fc.property(
        stockRecordArbitrary,
        (stock) => {
          // 渲染 StockRow 元件，設定不顯示確認對話框
          const { container } = render(
            <table>
              <tbody>
                <StockRow
                  stock={stock}
                  onUpdateStock={mockOnUpdateStock}
                  onDeleteStock={mockOnDeleteStock}
                  showDeleteConfirm={false}
                />
              </tbody>
            </table>
          );

          // 查找刪除按鈕
          const deleteButton = container.querySelector('button[title="刪除股票"]');
          
          // 點擊刪除按鈕
          fireEvent.click(deleteButton!);

          // 不應該顯示確認對話框
          expect(screen.queryByText('確認刪除股票')).not.toBeInTheDocument();

          // 驗證 onDeleteStock 被直接調用
          expect(mockOnDeleteStock).toHaveBeenCalledWith(stock.id);

          return true;
        }
      ),
      { numRuns: 20 }
    );
  });
});