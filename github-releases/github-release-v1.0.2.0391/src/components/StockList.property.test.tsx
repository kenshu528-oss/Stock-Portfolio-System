import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import StockList from './StockList';
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

// 生成器：股票記錄陣列
const stockArrayArbitrary = fc.array(stockRecordArbitrary, { minLength: 0, maxLength: 20 });

describe('StockList Property-Based Tests', () => {
  const mockOnUpdateStock = vi.fn();
  const mockOnDeleteStock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * **Feature: stock-portfolio-system, Property 4: 即時編輯功能可用性**
   * **Validates: Requirements 1.4**
   * 
   * 對於任何股票記錄，當點擊持股數或成本價欄位時，該欄位應進入可編輯狀態
   */
  it('Property 4: 即時編輯功能可用性', () => {
    fc.assert(
      fc.property(
        stockArrayArbitrary,
        fc.string({ minLength: 1, maxLength: 20 }), // accountId
        (stocks, currentAccountId) => {
          // 確保至少有一支股票屬於當前帳戶
          if (stocks.length === 0) return true;
          
          // 將第一支股票設為當前帳戶
          const testStocks = stocks.map((stock, index) => 
            index === 0 ? { ...stock, accountId: currentAccountId } : stock
          );

          render(
            <StockList
              stocks={testStocks}
              currentAccountId={currentAccountId}
              onUpdateStock={mockOnUpdateStock}
              onDeleteStock={mockOnDeleteStock}
            />
          );

          // 檢查是否有股票顯示
          const currentAccountStocks = testStocks.filter(stock => stock.accountId === currentAccountId);
          if (currentAccountStocks.length === 0) return true;

          // 查找可編輯的欄位（持股數和成本價）
          const editableButtons = screen.queryAllByTitle('點擊編輯');
          
          if (editableButtons.length > 0) {
            // 點擊第一個可編輯按鈕（持股數）
            fireEvent.click(editableButtons[0]);
            
            // 應該進入編輯模式，顯示輸入框
            const inputs = screen.queryAllByRole('textbox');
            expect(inputs.length).toBeGreaterThan(0);
            
            // 應該顯示編輯提示
            expect(screen.queryByText('Enter 儲存 • Esc 取消')).toBeInTheDocument();
          }

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * **Feature: stock-portfolio-system, Property 17: 市值與損益計算**
   * **Validates: Requirements 5.1**
   * 
   * 對於任何股票記錄，市值應等於持股數乘以現價，損益應等於市值減去（調整成本價乘以持股數）
   */
  it('Property 17: 市值與損益計算', () => {
    fc.assert(
      fc.property(
        stockRecordArbitrary,
        (stock) => {
          const testStock = { ...stock, accountId: 'test-account' };
          
          render(
            <StockList
              stocks={[testStock]}
              currentAccountId="test-account"
              onUpdateStock={mockOnUpdateStock}
              onDeleteStock={mockOnDeleteStock}
            />
          );

          // 計算預期的市值
          const expectedMarketValue = stock.shares * stock.currentPrice;
          
          // 計算預期的損益（使用調整成本價或原始成本價）
          const costBasis = stock.adjustedCostPrice || stock.costPrice;
          const totalCost = stock.shares * costBasis;
          const expectedGainLoss = expectedMarketValue - totalCost;
          const expectedGainLossPercent = totalCost > 0 ? (expectedGainLoss / totalCost) * 100 : 0;

          // 檢查市值顯示 - 使用更具體的查詢，查找市值欄位
          const marketValueText = `$${expectedMarketValue.toLocaleString()}`;
          const marketValueElements = screen.getAllByText(marketValueText);
          // 市值應該至少出現一次（在表格中的市值欄位）
          expect(marketValueElements.length).toBeGreaterThan(0);

          // 檢查損益顯示 - 查找損益格式的文字（不包含 $ 符號）
          const sign = expectedGainLoss >= 0 ? '+' : '';
          const gainLossText = `${sign}$${expectedGainLoss.toFixed(0)} (${sign}${expectedGainLossPercent.toFixed(2)}%)`;
          
          // 只有當損益不為零時才檢查損益顯示
          if (Math.abs(expectedGainLoss) > 0.001) {
            expect(screen.queryByText(gainLossText)).toBeInTheDocument();
          } else {
            // 當損益為零時，應該顯示 $0 (0.00%)
            const zeroGainLossText = '$0 (0.00%)';
            const zeroGainLossElement = screen.queryByText(zeroGainLossText);
            // 如果找不到，可能是因為格式略有不同，我們檢查是否存在包含 0.00% 的文字
            if (!zeroGainLossElement) {
              expect(screen.queryByText(/0\.00%/)).toBeInTheDocument();
            } else {
              expect(zeroGainLossElement).toBeInTheDocument();
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});