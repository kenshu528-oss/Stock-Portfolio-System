import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import StockList from './StockList';
import type { StockRecord } from '../types';

// 模擬股票資料
const mockStocks: StockRecord[] = [
  {
    id: '1',
    accountId: 'account1',
    symbol: '2330',
    name: '台積電',
    shares: 1000,
    costPrice: 500,
    adjustedCostPrice: 500,
    purchaseDate: new Date('2023-01-01'),
    currentPrice: 580,
    lastUpdated: new Date(),
    priceSource: 'TWSE'
  },
  {
    id: '2',
    accountId: 'account1',
    symbol: '2317',
    name: '鴻海',
    shares: 2000,
    costPrice: 100,
    adjustedCostPrice: 95, // 有股息調整
    purchaseDate: new Date('2023-02-01'),
    currentPrice: 110,
    lastUpdated: new Date(),
    priceSource: 'TWSE'
  },
  {
    id: '3',
    accountId: 'account2',
    symbol: '2454',
    name: '聯發科',
    shares: 500,
    costPrice: 800,
    adjustedCostPrice: 800,
    purchaseDate: new Date('2023-03-01'),
    currentPrice: 750,
    lastUpdated: new Date(),
    priceSource: 'Yahoo'
  }
];

describe('StockList Component', () => {
  const mockOnUpdateStock = vi.fn();
  const mockOnDeleteStock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders stock list with correct data', () => {
    render(
      <StockList
        stocks={mockStocks}
        currentAccountId="account1"
        onUpdateStock={mockOnUpdateStock}
        onDeleteStock={mockOnDeleteStock}
      />
    );

    // 檢查表頭
    expect(screen.getByText('股票代碼')).toBeInTheDocument();
    expect(screen.getByText('股票名稱')).toBeInTheDocument();
    expect(screen.getByText('持股數')).toBeInTheDocument();
    expect(screen.getByText('成本價')).toBeInTheDocument();
    expect(screen.getByText('現價')).toBeInTheDocument();
    expect(screen.getByText('市值')).toBeInTheDocument();
    expect(screen.getByText('損益率')).toBeInTheDocument();
    expect(screen.getByText('操作')).toBeInTheDocument();

    // 檢查股票資料（只顯示 account1 的股票）
    expect(screen.getByText('2330')).toBeInTheDocument();
    expect(screen.getByText('台積電')).toBeInTheDocument();
    expect(screen.getByText('2317')).toBeInTheDocument();
    expect(screen.getByText('鴻海')).toBeInTheDocument();
    
    // 不應該顯示 account2 的股票
    expect(screen.queryByText('2454')).not.toBeInTheDocument();
    expect(screen.queryByText('聯發科')).not.toBeInTheDocument();
  });

  it('displays empty message when no stocks', () => {
    render(
      <StockList
        stocks={[]}
        currentAccountId="account1"
        onUpdateStock={mockOnUpdateStock}
        onDeleteStock={mockOnDeleteStock}
        emptyMessage="沒有股票資料"
      />
    );

    expect(screen.getByText('沒有股票資料')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(
      <StockList
        stocks={mockStocks}
        currentAccountId="account1"
        onUpdateStock={mockOnUpdateStock}
        onDeleteStock={mockOnDeleteStock}
        isLoading={true}
      />
    );

    expect(screen.getByText('載入股票資料中...')).toBeInTheDocument();
  });

  it('calculates market value correctly', () => {
    render(
      <StockList
        stocks={mockStocks}
        currentAccountId="account1"
        onUpdateStock={mockOnUpdateStock}
        onDeleteStock={mockOnDeleteStock}
      />
    );

    // 台積電市值: 1000 * 580 = 580,000
    expect(screen.getByText('$580,000')).toBeInTheDocument();
    
    // 鴻海市值: 2000 * 110 = 220,000
    expect(screen.getByText('$220,000')).toBeInTheDocument();
  });

  it('calculates gain/loss correctly', () => {
    render(
      <StockList
        stocks={mockStocks}
        currentAccountId="account1"
        onUpdateStock={mockOnUpdateStock}
        onDeleteStock={mockOnDeleteStock}
      />
    );

    // 台積電損益: (580 - 500) * 1000 = +80,000 (+16.00%)
    expect(screen.getByText('+$80000 (+16.00%)')).toBeInTheDocument();
    
    // 鴻海損益（使用調整成本價）: (110 - 95) * 2000 = +30,000 (+15.79%)
    expect(screen.getByText('+$30000 (+15.79%)')).toBeInTheDocument();
  });

  it('shows adjusted cost price information', () => {
    render(
      <StockList
        stocks={mockStocks}
        currentAccountId="account1"
        onUpdateStock={mockOnUpdateStock}
        onDeleteStock={mockOnDeleteStock}
      />
    );

    // 鴻海有調整成本價，應該顯示提示
    expect(screen.getByText('調整後成本: $95.00')).toBeInTheDocument();
  });

  it('displays portfolio statistics', () => {
    render(
      <StockList
        stocks={mockStocks}
        currentAccountId="account1"
        onUpdateStock={mockOnUpdateStock}
        onDeleteStock={mockOnDeleteStock}
      />
    );

    // 檢查統計資訊
    expect(screen.getByText('共 2 支股票')).toBeInTheDocument();
    
    // 總市值: 580,000 + 220,000 = 800,000
    expect(screen.getByText('$800,000')).toBeInTheDocument();
    
    // 總成本: (500 * 1000) + (95 * 2000) = 690,000
    expect(screen.getByText('$690,000')).toBeInTheDocument();
    
    // 總損益: 800,000 - 690,000 = +110,000
    expect(screen.getByText('+$110000')).toBeInTheDocument();
  });

  it('handles delete stock action', () => {
    render(
      <StockList
        stocks={mockStocks}
        currentAccountId="account1"
        onUpdateStock={mockOnUpdateStock}
        onDeleteStock={mockOnDeleteStock}
      />
    );

    // 模擬 window.confirm
    const originalConfirm = window.confirm;
    window.confirm = vi.fn(() => true);

    // 點擊刪除按鈕
    const deleteButtons = screen.getAllByLabelText(/刪除/);
    fireEvent.click(deleteButtons[0]);

    expect(mockOnDeleteStock).toHaveBeenCalledWith('1');

    // 恢復原始 confirm
    window.confirm = originalConfirm;
  });

  it('filters stocks by account correctly', () => {
    render(
      <StockList
        stocks={mockStocks}
        currentAccountId="account2"
        onUpdateStock={mockOnUpdateStock}
        onDeleteStock={mockOnDeleteStock}
      />
    );

    // 應該只顯示 account2 的股票
    expect(screen.getByText('2454')).toBeInTheDocument();
    expect(screen.getByText('聯發科')).toBeInTheDocument();
    
    // 不應該顯示 account1 的股票
    expect(screen.queryByText('2330')).not.toBeInTheDocument();
    expect(screen.queryByText('台積電')).not.toBeInTheDocument();
  });

  it('shows price source and update time', () => {
    render(
      <StockList
        stocks={mockStocks}
        currentAccountId="account1"
        onUpdateStock={mockOnUpdateStock}
        onDeleteStock={mockOnDeleteStock}
      />
    );

    // 檢查價格來源顯示
    expect(screen.getAllByText('TWSE')).toHaveLength(2);
  });
});