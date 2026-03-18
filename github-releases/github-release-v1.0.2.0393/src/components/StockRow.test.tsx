import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import StockRow from './StockRow';
import type { StockRecord } from '../types';

const mockStock: StockRecord = {
  id: '1',
  accountId: 'account1',
  symbol: '2330',
  name: '台積電',
  shares: 1000,
  costPrice: 500,
  adjustedCostPrice: 500,
  purchaseDate: new Date('2023-01-01'),
  currentPrice: 580,
  lastUpdated: new Date('2024-01-08T10:30:00'),
  priceSource: 'TWSE'
};

const mockStockWithDividend: StockRecord = {
  ...mockStock,
  id: '2',
  symbol: '2317',
  name: '鴻海',
  costPrice: 100,
  adjustedCostPrice: 95, // 有股息調整
  shares: 2000,
  currentPrice: 110
};

describe('StockRow Component', () => {
  const mockOnUpdateStock = vi.fn();
  const mockOnDeleteStock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders stock information correctly', () => {
    render(
      <StockRow
        stock={mockStock}
        onUpdateStock={mockOnUpdateStock}
        onDeleteStock={mockOnDeleteStock}
      />
    );

    expect(screen.getByText('2330')).toBeInTheDocument();
    expect(screen.getByText('台積電')).toBeInTheDocument();
    expect(screen.getByText('1,000')).toBeInTheDocument();
    expect(screen.getByText('$500.00')).toBeInTheDocument();
    expect(screen.getByText('$580.00')).toBeInTheDocument();
  });

  it('calculates market value correctly', () => {
    render(
      <StockRow
        stock={mockStock}
        onUpdateStock={mockOnUpdateStock}
        onDeleteStock={mockOnDeleteStock}
      />
    );

    // 市值 = 1000 * 580 = 580,000
    expect(screen.getByText('$580,000')).toBeInTheDocument();
  });

  it('calculates gain/loss correctly', () => {
    render(
      <StockRow
        stock={mockStock}
        onUpdateStock={mockOnUpdateStock}
        onDeleteStock={mockOnDeleteStock}
      />
    );

    // 損益 = (580 - 500) * 1000 = +80,000 (+16.00%)
    expect(screen.getByText('+$80000 (+16.00%)')).toBeInTheDocument();
  });

  it('shows negative gain/loss in red', () => {
    const losingStock = {
      ...mockStock,
      currentPrice: 400 // 低於成本價
    };

    render(
      <StockRow
        stock={losingStock}
        onUpdateStock={mockOnUpdateStock}
        onDeleteStock={mockOnDeleteStock}
      />
    );

    // 損益 = (400 - 500) * 1000 = -100,000 (-20.00%)
    const gainLossElement = screen.getByText('-$100000 (-20.00%)');
    expect(gainLossElement).toHaveClass('text-red-400');
  });

  it('shows positive gain/loss in green', () => {
    render(
      <StockRow
        stock={mockStock}
        onUpdateStock={mockOnUpdateStock}
        onDeleteStock={mockOnDeleteStock}
      />
    );

    const gainLossElement = screen.getByText('+$80000 (+16.00%)');
    expect(gainLossElement).toHaveClass('text-green-400');
  });

  it('uses adjusted cost price when available', () => {
    render(
      <StockRow
        stock={mockStockWithDividend}
        onUpdateStock={mockOnUpdateStock}
        onDeleteStock={mockOnDeleteStock}
      />
    );

    // 應該顯示調整後成本價的提示
    expect(screen.getByText('調整後成本: $95.00')).toBeInTheDocument();
    
    // 損益計算應該使用調整成本價: (110 - 95) * 2000 = +30,000
    expect(screen.getByText('+$30000 (+15.79%)')).toBeInTheDocument();
  });

  it('shows price source and update time', () => {
    render(
      <StockRow
        stock={mockStock}
        onUpdateStock={mockOnUpdateStock}
        onDeleteStock={mockOnDeleteStock}
      />
    );

    expect(screen.getByText('TWSE')).toBeInTheDocument();
    expect(screen.getByText('10:30')).toBeInTheDocument();
  });

  it('handles shares update', () => {
    render(
      <StockRow
        stock={mockStock}
        onUpdateStock={mockOnUpdateStock}
        onDeleteStock={mockOnDeleteStock}
      />
    );

    // 點擊持股數進入編輯模式
    fireEvent.click(screen.getByTitle('點擊編輯'));
    
    const input = screen.getByDisplayValue('1000');
    fireEvent.change(input, { target: { value: '1500' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockOnUpdateStock).toHaveBeenCalledWith('1', { shares: 1500 });
  });

  it('handles cost price update', () => {
    render(
      <StockRow
        stock={mockStock}
        onUpdateStock={mockOnUpdateStock}
        onDeleteStock={mockOnDeleteStock}
      />
    );

    // 找到成本價的編輯按鈕（第二個）
    const editButtons = screen.getAllByTitle('點擊編輯');
    fireEvent.click(editButtons[1]);
    
    const input = screen.getByDisplayValue('500');
    fireEvent.change(input, { target: { value: '520' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockOnUpdateStock).toHaveBeenCalledWith('1', { costPrice: 520 });
  });

  it('handles delete with confirmation', () => {
    // 模擬 window.confirm
    const originalConfirm = window.confirm;
    window.confirm = vi.fn(() => true);

    render(
      <StockRow
        stock={mockStock}
        onUpdateStock={mockOnUpdateStock}
        onDeleteStock={mockOnDeleteStock}
      />
    );

    const deleteButton = screen.getByLabelText('刪除 2330 台積電');
    fireEvent.click(deleteButton);

    expect(window.confirm).toHaveBeenCalledWith(
      '確定要刪除 2330 台積電 嗎？\n此操作無法復原。'
    );
    expect(mockOnDeleteStock).toHaveBeenCalledWith('1');

    // 恢復原始 confirm
    window.confirm = originalConfirm;
  });

  it('cancels delete when confirmation is denied', () => {
    // 模擬 window.confirm 返回 false
    const originalConfirm = window.confirm;
    window.confirm = vi.fn(() => false);

    render(
      <StockRow
        stock={mockStock}
        onUpdateStock={mockOnUpdateStock}
        onDeleteStock={mockOnDeleteStock}
      />
    );

    const deleteButton = screen.getByLabelText('刪除 2330 台積電');
    fireEvent.click(deleteButton);

    expect(mockOnDeleteStock).not.toHaveBeenCalled();

    // 恢復原始 confirm
    window.confirm = originalConfirm;
  });

  it('deletes without confirmation when showDeleteConfirm is false', () => {
    render(
      <StockRow
        stock={mockStock}
        onUpdateStock={mockOnUpdateStock}
        onDeleteStock={mockOnDeleteStock}
        showDeleteConfirm={false}
      />
    );

    const deleteButton = screen.getByLabelText('刪除 2330 台積電');
    fireEvent.click(deleteButton);

    expect(mockOnDeleteStock).toHaveBeenCalledWith('1');
  });

  it('validates shares input range', () => {
    render(
      <StockRow
        stock={mockStock}
        onUpdateStock={mockOnUpdateStock}
        onDeleteStock={mockOnDeleteStock}
      />
    );

    // 點擊持股數進入編輯模式
    fireEvent.click(screen.getByTitle('點擊編輯'));
    
    const input = screen.getByDisplayValue('1000');
    
    // 嘗試輸入無效值（0）
    fireEvent.change(input, { target: { value: '0' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    // 不應該更新，因為低於最小值 1
    expect(mockOnUpdateStock).not.toHaveBeenCalled();
  });

  it('validates cost price input range', () => {
    render(
      <StockRow
        stock={mockStock}
        onUpdateStock={mockOnUpdateStock}
        onDeleteStock={mockOnDeleteStock}
      />
    );

    // 找到成本價的編輯按鈕（第二個）
    const editButtons = screen.getAllByTitle('點擊編輯');
    fireEvent.click(editButtons[1]);
    
    const input = screen.getByDisplayValue('500');
    
    // 嘗試輸入無效值（0）
    fireEvent.change(input, { target: { value: '0' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    // 不應該更新，因為低於最小值 0.01
    expect(mockOnUpdateStock).not.toHaveBeenCalled();
  });
});