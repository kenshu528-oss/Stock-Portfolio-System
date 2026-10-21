import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from './Sidebar';

describe('Sidebar Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onOpenAccountManager: vi.fn(),
    onOpenAddStock: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders navigation items', () => {
    render(<Sidebar {...defaultProps} />);
    
    expect(screen.getByText('新增股票')).toBeInTheDocument();
    expect(screen.getByText('帳戶管理')).toBeInTheDocument();
    expect(screen.getByText('股息管理')).toBeInTheDocument();
    expect(screen.getByText('匯出資料')).toBeInTheDocument();
    expect(screen.getByText('匯入資料')).toBeInTheDocument();
    expect(screen.getByText('設定')).toBeInTheDocument();
  });

  it('has correct responsive classes when open', () => {
    const { container } = render(<Sidebar {...defaultProps} />);
    const sidebar = container.querySelector('aside');
    expect(sidebar).toHaveClass('translate-x-0');
  });

  it('has correct responsive classes when closed', () => {
    const { container } = render(<Sidebar {...defaultProps} isOpen={false} />);
    const sidebar = container.querySelector('aside');
    expect(sidebar).toHaveClass('-translate-x-full');
  });

  it('calls onClose when backdrop is clicked', () => {
    render(<Sidebar {...defaultProps} />);
    const backdrop = document.querySelector('.bg-black.bg-opacity-50');
    expect(backdrop).toBeInTheDocument();
    
    fireEvent.click(backdrop!);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close button is clicked', () => {
    render(<Sidebar {...defaultProps} />);
    const closeButton = screen.getByLabelText('關閉選單');
    
    fireEvent.click(closeButton);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onOpenAddStock when add stock button is clicked', () => {
    render(<Sidebar {...defaultProps} />);
    const addStockButton = screen.getByText('新增股票');
    
    fireEvent.click(addStockButton);
    expect(defaultProps.onOpenAddStock).toHaveBeenCalledTimes(1);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1); // 應該自動關閉選單
  });

  it('calls onOpenAccountManager when account manager button is clicked', () => {
    render(<Sidebar {...defaultProps} />);
    const accountManagerButton = screen.getByText('帳戶管理');
    
    fireEvent.click(accountManagerButton);
    expect(defaultProps.onOpenAccountManager).toHaveBeenCalledTimes(1);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1); // 應該自動關閉選單
  });

  it('handles ESC key press to close sidebar', () => {
    render(<Sidebar {...defaultProps} />);
    
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('does not render backdrop when closed', () => {
    render(<Sidebar {...defaultProps} isOpen={false} />);
    const backdrop = document.querySelector('.bg-black.bg-opacity-50');
    expect(backdrop).not.toBeInTheDocument();
  });

  it('renders sidebar header with title and close button', () => {
    render(<Sidebar {...defaultProps} />);
    
    expect(screen.getByText('功能選單')).toBeInTheDocument();
    expect(screen.getByLabelText('關閉選單')).toBeInTheDocument();
  });
});