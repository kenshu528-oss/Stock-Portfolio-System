import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AddStockForm from './AddStockForm';

// Mock the stock service
vi.mock('../services/stockPriceService', () => ({
  stockService: {
    searchStock: vi.fn()
  }
}));

import { stockService } from '../services/stockPriceService';

describe('AddStockForm Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSubmit: vi.fn(),
    currentAccount: '帳戶1'
  };

  const mockStockResult = {
    symbol: '2330',
    name: '台積電',
    price: 580,
    change: 5,
    changePercent: 0.87,
    market: '台灣'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when open', () => {
    render(<AddStockForm {...defaultProps} />);
    expect(screen.getByText('?��??�票')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/例�?: 2330??050??0646??0679B/)).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<AddStockForm {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('?��??�票')).not.toBeInTheDocument();
  });

  it('focuses on search input when opened', () => {
    render(<AddStockForm {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText(/例�?: 2330??050??0646??0679B/);
    expect(searchInput).toHaveFocus();
  });

  it('searches for stock when valid code is entered', async () => {
    (stockService.searchStock as any).mockResolvedValue(mockStockResult);
    
    render(<AddStockForm {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText(/例�?: 2330??050??0646??0679B/);
    
    fireEvent.change(searchInput, { target: { value: '2330' } });
    
    await waitFor(() => {
      expect(stockService.searchStock).toHaveBeenCalledWith('2330');
    });
  });

  it('displays stock information when search is successful', async () => {
    (stockService.searchStock as any).mockResolvedValue(mockStockResult);
    
    render(<AddStockForm {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText(/例�?: 2330??050??0646??0679B/);
    
    fireEvent.change(searchInput, { target: { value: '2330' } });
    
    await waitFor(() => {
      expect(screen.getByText('2330 - 台積電')).toBeInTheDocument();
      expect(screen.getByText('股價: $580.00')).toBeInTheDocument();
    });
  });

  it('shows error message for invalid stock code format', async () => {
    render(<AddStockForm {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText(/例�?: 2330??050??0646??0679B/);
    
    fireEvent.change(searchInput, { target: { value: 'INVALID' } });
    
    await waitFor(() => {
      expect(screen.getByText(/請輸?��??��??�票�?��?��?/)).toBeInTheDocument();
    });
  });

  it('shows error message when stock is not found', async () => {
    (stockService.searchStock as any).mockResolvedValue(null);
    
    render(<AddStockForm {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText(/例�?: 2330??050??0646??0679B/);
    
    fireEvent.change(searchInput, { target: { value: '9999' } });
    
    await waitFor(() => {
      expect(screen.getByText(/?��??�股票代�?9999 ?��?�?)).toBeInTheDocument();
    });
  });

  it('shows loading indicator during search', async () => {
    (stockService.searchStock as any).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve(mockStockResult), 100))
    );
    
    render(<AddStockForm {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText(/例�?: 2330??050??0646??0679B/);
    
    fireEvent.change(searchInput, { target: { value: '2330' } });
    
    // Should show loading indicator
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
  });

  it('fills form fields when stock is selected', async () => {
    (stockService.searchStock as any).mockResolvedValue(mockStockResult);
    
    render(<AddStockForm {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText(/例�?: 2330??050??0646??0679B/);
    
    fireEvent.change(searchInput, { target: { value: '2330' } });
    
    await waitFor(() => {
      const costPriceInput = screen.getByDisplayValue('580');
      expect(costPriceInput).toBeInTheDocument();
    });
  });

  it('validates required fields before submission', async () => {
    (stockService.searchStock as any).mockResolvedValue(mockStockResult);
    
    render(<AddStockForm {...defaultProps} />);
    
    // Search for stock first
    const searchInput = screen.getByPlaceholderText(/例�?: 2330??050??0646??0679B/);
    fireEvent.change(searchInput, { target: { value: '2330' } });
    
    await waitFor(() => {
      expect(screen.getByText('2330 - ?��???)).toBeInTheDocument();
    });
    
    const submitButton = screen.getByText('?��?');
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when all required fields are filled', async () => {
    (stockService.searchStock as any).mockResolvedValue(mockStockResult);
    
    render(<AddStockForm {...defaultProps} />);
    
    // Search for stock
    const searchInput = screen.getByPlaceholderText(/例�?: 2330??050??0646??0679B/);
    fireEvent.change(searchInput, { target: { value: '2330' } });
    
    await waitFor(() => {
      expect(screen.getByText('2330 - ?��???)).toBeInTheDocument();
    });
    
    // Fill required fields
    const sharesInput = screen.getByPlaceholderText('例�?: 1000');
    fireEvent.change(sharesInput, { target: { value: '1000' } });
    
    const submitButton = screen.getByText('?��?');
    expect(submitButton).not.toBeDisabled();
  });

  it('submits form with correct data', async () => {
    (stockService.searchStock as any).mockResolvedValue(mockStockResult);
    
    render(<AddStockForm {...defaultProps} />);
    
    // Search for stock
    const searchInput = screen.getByPlaceholderText(/例�?: 2330??050??0646??0679B/);
    fireEvent.change(searchInput, { target: { value: '2330' } });
    
    await waitFor(() => {
      expect(screen.getByText('2330 - ?��???)).toBeInTheDocument();
    });
    
    // Fill form
    const sharesInput = screen.getByPlaceholderText('例�?: 1000');
    fireEvent.change(sharesInput, { target: { value: '1000' } });
    
    const costPriceInput = screen.getByDisplayValue('580');
    fireEvent.change(costPriceInput, { target: { value: '575' } });
    
    // Submit form
    const submitButton = screen.getByText('?��?');
    fireEvent.click(submitButton);
    
    expect(defaultProps.onSubmit).toHaveBeenCalledWith({
      symbol: '2330',
      name: '?��???,
      price: 580,
      shares: '1000',
      costPrice: '575',
      purchaseDate: expect.any(String),
      account: '帳戶1'
    });
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('calls onClose when cancel button is clicked', () => {
    render(<AddStockForm {...defaultProps} />);
    
    const cancelButton = screen.getByText('?��?');
    fireEvent.click(cancelButton);
    
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('resets form when modal is reopened', () => {
    const { rerender } = render(<AddStockForm {...defaultProps} isOpen={false} />);
    
    // Open modal and enter some data
    rerender(<AddStockForm {...defaultProps} isOpen={true} />);
    const searchInput = screen.getByPlaceholderText(/例�?: 2330??050??0646??0679B/);
    fireEvent.change(searchInput, { target: { value: '2330' } });
    
    // Close and reopen modal
    rerender(<AddStockForm {...defaultProps} isOpen={false} />);
    rerender(<AddStockForm {...defaultProps} isOpen={true} />);
    
    // Form should be reset
    const newSearchInput = screen.getByPlaceholderText(/例�?: 2330??050??0646??0679B/);
    expect(newSearchInput).toHaveValue('');
  });

  it('supports different stock code formats', async () => {
    const testCases = [
      { code: '2330', valid: true },
      { code: 'ABC', valid: false }
    ];
    
    for (const testCase of testCases) {
      (stockService.searchStock as any).mockResolvedValue(testCase.valid ? mockStockResult : null);
      
      const { unmount } = render(<AddStockForm {...defaultProps} />);
      const searchInput = screen.getByPlaceholderText(/例�?: 2330??050??0646??0679B/);
      
      fireEvent.change(searchInput, { target: { value: testCase.code } });
      
      if (testCase.valid) {
        await waitFor(() => {
          expect(stockService.searchStock).toHaveBeenCalledWith(testCase.code);
        });
      } else {
        await waitFor(() => {
          if (testCase.code.length >= 3) {
            expect(screen.getByText(/請輸?��??��??�票�?��?��?/)).toBeInTheDocument();
          }
        });
      }
      
      // Clean up for next test
      unmount();
    }
  });
});
