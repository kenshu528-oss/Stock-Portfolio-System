import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StockSearch from './StockSearch';

describe('StockSearch Component', () => {
  const mockOnSelect = vi.fn();
  
  const defaultProps = {
    onSelect: mockOnSelect,
    placeholder: '搜尋台股美股代號/名稱',
    className: ''
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with default placeholder', () => {
    render(<StockSearch onSelect={mockOnSelect} />);
    expect(screen.getByPlaceholderText('搜尋台股美股代號/名稱')).toBeInTheDocument();
  });

  it('renders with custom placeholder', () => {
    render(<StockSearch {...defaultProps} placeholder="自訂提示文字" />);
    expect(screen.getByPlaceholderText('自訂提示文字')).toBeInTheDocument();
  });

  it('shows search results when typing', async () => {
    render(<StockSearch {...defaultProps} />);
    const input = screen.getByPlaceholderText('搜尋台股美股代號/名稱');
    
    fireEvent.change(input, { target: { value: '2330' } });
    
    await waitFor(() => {
      expect(screen.getByText('台積電')).toBeInTheDocument();
      expect(screen.getByText('2330')).toBeInTheDocument();
    });
  });

  it('shows loading indicator during search', async () => {
    render(<StockSearch {...defaultProps} />);
    const input = screen.getByPlaceholderText('搜尋台股美股代號/名稱');
    
    fireEvent.change(input, { target: { value: '2330' } });
    
    // Should show loading indicator briefly
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
  });

  it('filters results by stock symbol', async () => {
    render(<StockSearch {...defaultProps} />);
    const input = screen.getByPlaceholderText('搜尋台股美股代號/名稱');
    
    fireEvent.change(input, { target: { value: '2330' } });
    
    await waitFor(() => {
      expect(screen.getByText('台積電')).toBeInTheDocument();
      expect(screen.queryByText('鴻海')).not.toBeInTheDocument();
    });
  });

  it('filters results by stock name', async () => {
    render(<StockSearch {...defaultProps} />);
    const input = screen.getByPlaceholderText('搜尋台股美股代號/名稱');
    
    fireEvent.change(input, { target: { value: '台積' } });
    
    await waitFor(() => {
      expect(screen.getByText('台積電')).toBeInTheDocument();
      expect(screen.getByText('2330')).toBeInTheDocument();
    });
  });

  it('shows no results message when no matches found', async () => {
    render(<StockSearch {...defaultProps} />);
    const input = screen.getByPlaceholderText('搜尋台股美股代號/名稱');
    
    fireEvent.change(input, { target: { value: 'NOTFOUND' } });
    
    await waitFor(() => {
      expect(screen.getByText('找不到相關股票，請嘗試其他關鍵字')).toBeInTheDocument();
    });
  });

  it('calls onSelect when result is clicked', async () => {
    render(<StockSearch {...defaultProps} />);
    const input = screen.getByPlaceholderText('搜尋台股美股代號/名稱');
    
    fireEvent.change(input, { target: { value: '2330' } });
    
    await waitFor(() => {
      const result = screen.getByText('台積電');
      fireEvent.click(result.closest('div')!);
    });
    
    expect(mockOnSelect).toHaveBeenCalledWith({
      symbol: '2330',
      name: '台積電',
      market: '台灣',
      price: 580,
      change: 5,
      changePercent: 0.87
    });
  });

  it('supports keyboard navigation', async () => {
    render(<StockSearch {...defaultProps} />);
    const input = screen.getByPlaceholderText('搜尋台股美股代號/名稱');
    
    fireEvent.change(input, { target: { value: '23' } });
    
    await waitFor(() => {
      expect(screen.getByText('台積電')).toBeInTheDocument();
    });
    
    // Navigate down
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    
    // Navigate up
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    
    // Select with Enter
    fireEvent.keyDown(input, { key: 'Enter' });
    
    expect(mockOnSelect).toHaveBeenCalled();
  });

  it('closes results when Escape is pressed', async () => {
    render(<StockSearch {...defaultProps} />);
    const input = screen.getByPlaceholderText('搜尋台股美股代號/名稱');
    
    fireEvent.change(input, { target: { value: '2330' } });
    
    await waitFor(() => {
      expect(screen.getByText('台積電')).toBeInTheDocument();
    });
    
    fireEvent.keyDown(input, { key: 'Escape' });
    
    expect(screen.queryByText('台積電')).not.toBeInTheDocument();
  });

  it('shows clear button when input has value', () => {
    render(<StockSearch {...defaultProps} />);
    const input = screen.getByPlaceholderText('搜尋台股美股代號/名稱');
    
    fireEvent.change(input, { target: { value: '2330' } });
    
    const clearButton = document.querySelector('button');
    expect(clearButton).toBeInTheDocument();
  });

  it('clears input when clear button is clicked', () => {
    render(<StockSearch {...defaultProps} />);
    const input = screen.getByPlaceholderText('搜尋台股美股代號/名稱');
    
    fireEvent.change(input, { target: { value: '2330' } });
    
    const clearButton = document.querySelector('button')!;
    fireEvent.click(clearButton);
    
    expect(input).toHaveValue('');
  });

  it('closes results when clicking outside', async () => {
    render(
      <div>
        <StockSearch {...defaultProps} />
        <div data-testid="outside">Outside element</div>
      </div>
    );
    
    const input = screen.getByPlaceholderText('搜尋台股美股代號/名稱');
    
    fireEvent.change(input, { target: { value: '2330' } });
    
    await waitFor(() => {
      expect(screen.getByText('台積電')).toBeInTheDocument();
    });
    
    const outsideElement = screen.getByTestId('outside');
    fireEvent.mouseDown(outsideElement);
    
    expect(screen.queryByText('台積電')).not.toBeInTheDocument();
  });

  it('displays stock price and change information', async () => {
    render(<StockSearch {...defaultProps} />);
    const input = screen.getByPlaceholderText('搜尋台股美股代號/名稱');
    
    fireEvent.change(input, { target: { value: '2330' } });
    
    await waitFor(() => {
      expect(screen.getByText('$580.00')).toBeInTheDocument();
      expect(screen.getByText('+5.00 (+0.87%)')).toBeInTheDocument();
    });
  });

  it('shows different colors for positive and negative changes', async () => {
    render(<StockSearch {...defaultProps} />);
    const input = screen.getByPlaceholderText('搜尋台股美股代號/名稱');
    
    // Test positive change (台積電)
    fireEvent.change(input, { target: { value: '2330' } });
    
    await waitFor(() => {
      const positiveChange = screen.getByText('+5.00 (+0.87%)');
      expect(positiveChange).toHaveClass('text-green-400');
    });
    
    // Test negative change (鴻海)
    fireEvent.change(input, { target: { value: '2317' } });
    
    await waitFor(() => {
      const negativeChange = screen.getByText('-1.00 (-0.94%)');
      expect(negativeChange).toHaveClass('text-red-400');
    });
  });

  it('limits results to maximum 8 items', async () => {
    render(<StockSearch {...defaultProps} />);
    const input = screen.getByPlaceholderText('搜尋台股美股代號/名稱');
    
    // Search for a broad term that would match many results
    fireEvent.change(input, { target: { value: '2' } });
    
    await waitFor(() => {
      const results = document.querySelectorAll('[class*="cursor-pointer"]');
      expect(results.length).toBeLessThanOrEqual(8);
    });
  });

  it('applies custom className', () => {
    render(<StockSearch {...defaultProps} className="custom-class" />);
    const container = document.querySelector('.custom-class');
    expect(container).toBeInTheDocument();
  });

  it('clears query and results when stock is selected', async () => {
    render(<StockSearch {...defaultProps} />);
    const input = screen.getByPlaceholderText('搜尋台股美股代號/名稱');
    
    fireEvent.change(input, { target: { value: '2330' } });
    
    await waitFor(() => {
      const result = screen.getByText('台積電');
      fireEvent.click(result.closest('div')!);
    });
    
    expect(input).toHaveValue('');
    expect(screen.queryByText('台積電')).not.toBeInTheDocument();
  });
});